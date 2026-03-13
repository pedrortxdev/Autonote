<template>
  <f7-page name="dashboard" @page:beforein="loadData">
    <f7-navbar large transparent>
      <f7-nav-left>
        <f7-nav-title>Dashboard</f7-nav-title>
      </f7-nav-left>
      <f7-nav-right>
        <f7-link icon-f7="bell" badge-color="red" :badge="notificationsCount" />
      </f7-nav-right>
    </f7-navbar>

    <f7-page-content class="dashboard-content">
      <!-- Cards de Estatísticas -->
      <div class="stats-container">
        <f7-card class="stat-card stat-total">
          <f7-card-content>
            <div class="stat-icon">
              <f7-icon size="24" color="white">doc_text_fill</f7-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.total }}</span>
              <span class="stat-label">Total</span>
            </div>
          </f7-card-content>
        </f7-card>

        <f7-card class="stat-card stat-completed">
          <f7-card-content>
            <div class="stat-icon">
              <f7-icon size="24" color="white">checkmark_circle_fill</f7-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.completed }}</span>
              <span class="stat-label">Processados</span>
            </div>
          </f7-card-content>
        </f7-card>

        <f7-card class="stat-card stat-processing">
          <f7-card-content>
            <div class="stat-icon">
              <f7-icon size="24" color="white">arrow_clockwise</f7-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.processing }}</span>
              <span class="stat-label">Em Análise</span>
            </div>
          </f7-card-content>
        </f7-card>

        <f7-card class="stat-card stat-error">
          <f7-card-content>
            <div class="stat-icon">
              <f7-icon size="24" color="white">exclamationmark_triangle_fill</f7-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.error }}</span>
              <span class="stat-label">Erros</span>
            </div>
          </f7-card-content>
        </f7-card>
      </div>

      <!-- Barra de Busca e Filtros -->
      <div class="filters-container">
        <f7-searchbar
          id="documents-search"
          :value="searchQuery"
          placeholder="Buscar documentos..."
          @searchbar:search="onSearch"
          @searchbar:clear="onSearchClear"
        />

        <div class="filter-chips">
          <f7-chip
            :text="'Todos'"
            :selected="activeFilter === 'all'"
            @click="setFilter('all')"
          />
          <f7-chip
            :text="'Processados'"
            :selected="activeFilter === 'completed'"
            @click="setFilter('completed')"
          />
          <f7-chip
            :text="'Em Análise'"
            :selected="activeFilter === 'processing'"
            @click="setFilter('processing')"
          />
          <f7-chip
            :text="'Pendentes'"
            :selected="activeFilter === 'pending'"
            @click="setFilter('pending')"
          />
        </div>
      </div>

      <!-- Lista de Documentos -->
      <div class="documents-section">
        <div class="section-header">
          <h2 class="section-title">Documentos Recentes</h2>
          <f7-button
            fill="clear"
            size="small"
            color="primary"
            @click="refreshData"
            :disabled="isLoading"
          >
            <f7-icon 
              slot="icon" 
              f7="arrow_clockwise" 
              :class="{ 'spinning': isLoading }"
            />
          </f7-button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading && documents.length === 0" class="loading-state">
          <f7-preloader :size="40" />
          <p class="loading-text">Carregando documentos...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="documents.length === 0" class="empty-state">
          <div class="empty-icon">
            <f7-icon size="64" color="gray">doc_text</f7-icon>
          </div>
          <h3>Nenhum documento encontrado</h3>
          <p>Envie seu primeiro documento para começar</p>
          <f7-button
            large
            fill
            round
            color="primary"
            @click="$router.push('/upload')"
          >
            <f7-icon slot="icon" f7="cloud_upload" />
            Enviar Documento
          </f7-button>
        </div>

        <!-- Lista de Documentos -->
        <div v-else class="documents-list">
          <DocumentCard
            v-for="doc in documents"
            :key="doc.id"
            :document="doc"
            @click="openDocument(doc)"
          />
        </div>

        <!-- Carregar Mais -->
        <div v-if="hasMore && documents.length > 0" class="load-more">
          <f7-button
            large
            fill="outline"
            round
            color="primary"
            @click="loadMore"
            :disabled="isLoadingMore"
          >
            <span v-if="!isLoadingMore">Carregar Mais</span>
            <f7-preloader v-else :size="20" color="primary" />
          </f7-button>
        </div>
      </div>
    </f7-page-content>

    <!-- Toolbar Inferior -->
    <f7-toolbar tabbar labels bottom>
      <f7-link
        active
        tab-link="#dashboard"
        icon-f7="square_grid"
        text="Dashboard"
      />
      <f7-link
        tab-link="#upload"
        icon-f7="cloud_upload"
        text="Enviar"
        @click="$router.push('/upload')"
      />
      <f7-link
        tab-link="#settings"
        icon-f7="person_circle"
        text="Perfil"
        @click="$router.push('/settings')"
      />
    </f7-toolbar>

    <!-- Floating Action Button -->
    <f7-fab
      position="right-bottom"
      color="primary"
      @click="$router.push('/upload')"
    >
      <f7-icon f7="plus" />
    </f7-fab>
  </f7-page>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import DocumentCard from '@/components/DocumentCard.vue'

// Route
const route = useRoute()

// Estado
const documents = ref([])
const stats = reactive({
  total: 0,
  completed: 0,
  processing: 0,
  pending: 0,
  error: 0,
  thisMonth: 0
})

const isLoading = ref(false)
const isLoadingMore = ref(false)
const searchQuery = ref('')
const activeFilter = ref('all')
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0
})

const notificationsCount = ref(0)
let wsUnsubscribe = null

// Carregar dados
const loadData = async () => {
  await Promise.all([
    loadDocuments(),
    loadStats()
  ])
  
  // Assinar atualizações em tempo real (preparação para WebSocket)
  subscribeToUpdates()
}

// Carregar documentos
const loadDocuments = async (reset = false) => {
  if (reset) {
    pagination.page = 1
    documents.value = []
  }

  isLoading.value = true

  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }

    if (activeFilter.value !== 'all') {
      params.status = activeFilter.value
    }

    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    const response = await api.get('/documents', { params })
    const { documents: newDocs, pagination: pag } = response.data

    if (reset) {
      documents.value = newDocs
    } else {
      documents.value = [...documents.value, ...newDocs]
    }

    pagination.page = pag.page
    pagination.limit = pag.limit
    pagination.total = pag.total
    pagination.totalPages = pag.totalPages
  } catch (error) {
    console.error('Erro ao carregar documentos:', error)
    showToast('Erro ao carregar documentos')
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// Carregar estatísticas
const loadStats = async () => {
  try {
    const response = await api.get('/stats')
    Object.assign(stats, response.data)
    
    // Atualizar contador de notificações
    notificationsCount.value = stats.processing + stats.pending
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error)
  }
}

// Carregar mais documentos
const loadMore = async () => {
  if (isLoadingMore.value || pagination.page >= pagination.totalPages) return

  isLoadingMore.value = true
  pagination.page++
  await loadDocuments()
}

// Atualizar dados
const refreshData = async () => {
  await loadDocuments(true)
  await loadStats()
  showToast('Dados atualizados')
}

// Buscar documentos
const onSearch = (searchbar, query) => {
  searchQuery.value = query
  loadDocuments(true)
}

// Limpar busca
const onSearchClear = (searchbar) => {
  searchQuery.value = ''
  loadDocuments(true)
}

// Definir filtro
const setFilter = (filter) => {
  if (activeFilter.value === filter) return
  activeFilter.value = filter
  loadDocuments(true)
}

// Abrir documento
const openDocument = (doc) => {
  window.framework7.router.navigate(`/document/${doc.id}/`)
}

// Assinar atualizações em tempo real
const subscribeToUpdates = () => {
  // Mock de WebSocket - será substituído por implementação real
  wsUnsubscribe = api.axios?.subscribeToDocumentUpdates?.((event) => {
    if (event.type === 'update') {
      // Atualizar documento na lista
      const index = documents.value.findIndex(d => d.id === event.document.id)
      if (index !== -1) {
        documents.value[index] = event.document
      }
      
      // Atualizar estatísticas
      loadStats()
      
      // Mostrar notificação
      showToast(`Documento ${event.document.filename} processado!`)
    }
  })
}

// Mostrar toast
const showToast = (message) => {
  const f7 = window.framework7
  f7.toast.show({
    text: message,
    position: 'bottom',
    closeTimeout: 2000
  })
}

// Lifecycle
onMounted(() => {
  loadData()
})

onUnmounted(() => {
  if (wsUnsubscribe) {
    wsUnsubscribe()
  }
})
</script>

<style scoped>
.dashboard-content {
  padding-bottom: 80px; /* Espaço para toolbar */
}

/* Stats Container */
.stats-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  background: var(--f7-page-bg-color);
}

.stat-card {
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
}

.stat-card :deep(.card-content) {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-total .stat-icon {
  background: #1976D2;
}

.stat-completed .stat-icon {
  background: #4CAF50;
}

.stat-processing .stat-icon {
  background: #2196F3;
}

.stat-error .stat-icon {
  background: #F44336;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--f7-text-color);
}

.stat-label {
  font-size: 12px;
  color: var(--f7-label-color);
}

/* Filters Container */
.filters-container {
  padding: 0 16px 16px;
}

.filter-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0;
  -webkit-overflow-scrolling: touch;
}

.filter-chips::-webkit-scrollbar {
  display: none;
}

/* Documents Section */
.documents-section {
  padding: 0 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--f7-text-color);
  margin: 0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-text {
  margin-top: 16px;
  color: var(--f7-label-color);
  font-size: 14px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  color: var(--f7-text-color);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  color: var(--f7-label-color);
  margin: 0 0 24px 0;
}

/* Documents List */
.documents-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Load More */
.load-more {
  margin-top: 24px;
  text-align: center;
}

/* FAB Position */
:deep(.fab) {
  margin-bottom: 70px; /* Acima da toolbar */
}
</style>
