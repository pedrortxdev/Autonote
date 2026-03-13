<template>
  <f7-page name="document-detail" @page:beforein="loadDocument">
    <f7-navbar large transparent>
      <f7-nav-left>
        <f7-link icon-f7="chevron_left" back />
      </f7-nav-left>
      <f7-nav-title>Detalhes do Documento</f7-nav-title>
      <f7-nav-right>
        <f7-link icon-f7="ellipsis" @click="showActions" />
      </f7-nav-right>
    </f7-navbar>

    <f7-page-content v-if="document" class="document-detail-content">
      <!-- Header com Status -->
      <div class="document-header">
        <div class="document-icon">
          <f7-icon 
            size="48" 
            :color="getStatusColor(document.status)"
          >
            {{ getStatusIcon(document.status) }}
          </f7-icon>
        </div>
        <div class="document-info">
          <h2 class="document-filename">{{ document.filename }}</h2>
          <p class="document-meta">
            {{ formatFileSize(document.fileSize) }} • {{ formatDate(document.uploadedAt) }}
          </p>
          <StatusBar :status="document.status" />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <f7-preloader :size="40" />
        <p>Carregando dados...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <f7-icon size="48" color="red">exclamationmark_triangle</f7-icon>
        <h3>Erro ao carregar</h3>
        <p>{{ error }}</p>
        <f7-button fill="outline" @click="loadDocument">
          Tentar Novamente
        </f7-button>
      </div>

      <!-- Dados Extraídos -->
      <template v-else-if="document.extractedData">
        <!-- Informações do Documento -->
        <f7-list inset outline>
          <f7-list-item divider title="Informações do Documento" />
          
          <f7-list-input
            label="Tipo"
            :value="getDocumentTypeName(document.documentType)"
            readonly
          />
          
          <f7-list-input
            label="Número"
            :value="document.extractedData.numero"
            readonly
          />
          
          <f7-list-input
            label="Série"
            :value="document.extractedData.serie"
            readonly
          />
          
          <f7-list-input
            label="Data de Emissão"
            :value="formatDate(document.extractedData.dataEmissao)"
            readonly
          />
        </f7-list>

        <!-- Dados do Fornecedor -->
        <f7-list inset outline>
          <f7-list-item divider title="Fornecedor" />
          
          <f7-list-input
            label="Nome/Razão Social"
            :value="document.extractedData.fornecedor"
            readonly
          />
          
          <f7-list-input
            label="CNPJ"
            :value="document.extractedData.cnpj"
            readonly
          />
        </f7-list>

        <!-- Valores -->
        <f7-list inset outline>
          <f7-list-item divider title="Valores" />
          
          <f7-list-input
            label="Valor Total"
            :value="formatCurrency(document.extractedData.valorTotal)"
            readonly
          >
            <template #after>
              <f7-icon color="success">checkmark_circle</f7-icon>
            </template>
          </f7-list-input>
          
          <f7-list-input
            v-if="document.extractedData.valorFrete"
            label="Valor do Frete"
            :value="formatCurrency(document.extractedData.valorFrete)"
            readonly
          />
        </f7-list>

        <!-- Informações Adicionais -->
        <f7-list inset outline>
          <f7-list-item divider title="Informações Adicionais" />
          
          <f7-list-input
            v-if="document.extractedData.remetente"
            label="Remetente"
            :value="document.extractedData.remetente"
            readonly
          />
          
          <f7-list-input
            v-if="document.extractedData.destinatario"
            label="Destinatário"
            :value="document.extractedData.destinatario"
            readonly
          />
        </f7-list>

        <!-- Ações -->
        <div class="actions-section">
          <f7-button
            large
            fill
            round
            color="primary"
            @click="downloadDocument"
          >
            <f7-icon slot="icon" f7="arrow_down_doc" />
            Baixar PDF
          </f7-button>

          <f7-button
            large
            fill="outline"
            round
            color="primary"
            @click="exportData"
          >
            <f7-icon slot="icon" f7="square_arrow_out" />
            Exportar Dados
          </f7-button>
        </div>
      </template>

      <!-- Processando -->
      <template v-else-if="document.status === 'processing'">
        <div class="processing-state">
          <f7-preloader :size="60" color="primary" />
          <h3>Processando Documento</h3>
          <p>Estamos extraindo os dados do seu documento. Isso pode levar alguns instantes.</p>
          
          <div class="processing-steps">
            <div class="processing-step completed">
              <f7-icon color="success">checkmark_circle_fill</f7-icon>
              <span>Upload concluído</span>
            </div>
            <div class="processing-step active">
              <f7-icon color="primary">arrow_clockwise</f7-icon>
              <span>Extraindo dados...</span>
            </div>
            <div class="processing-step">
              <f7-icon color="gray">doc_text</f7-icon>
              <span>Validação</span>
            </div>
            <div class="processing-step">
              <f7-icon color="gray">checkmark</f7-icon>
              <span>Concluído</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Pendente -->
      <template v-else-if="document.status === 'pending'">
        <div class="pending-state">
          <f7-icon size="64" color="warning">clock</f7-icon>
          <h3>Aguardando Processamento</h3>
          <p>Seu documento está na fila para processamento.</p>
        </div>
      </template>

      <!-- Erro no Processamento -->
      <template v-else-if="document.status === 'error'">
        <div class="error-processing-state">
          <f7-icon size="64" color="red">xmark_circle</f7-icon>
          <h3>Erro no Processamento</h3>
          <p>{{ document.errorMessage || 'Não foi possível processar este documento.' }}</p>
          <f7-button fill="outline" @click="retryProcessing">
            Tentar Novamente
          </f7-button>
        </div>
      </template>
    </f7-page-content>

    <!-- Sheet Modal para Exportação -->
    <f7-sheet-modal
      id="export-sheet"
      :backdrop="true"
      @sheet:closed="onExportSheetClosed"
    >
      <f7-toolbar>
        <f7-link sheet-close>Cancelar</f7-link>
        <f7-toolbar-title>Exportar Dados</f7-toolbar-title>
        <f7-link @click="confirmExport">Exportar</f7-link>
      </f7-toolbar>
      <f7-block>
        <f7-list>
          <f7-list-item
            radio
            name="export-format"
            value="csv"
            title="CSV"
            subtitle="Planilha compatível com Excel"
            :checked="exportFormat === 'csv'"
            @change="exportFormat = 'csv'"
          />
          <f7-list-item
            radio
            name="export-format"
            value="xlsx"
            title="Excel (XLSX)"
            subtitle="Formato nativo do Excel"
            :checked="exportFormat === 'xlsx'"
            @change="exportFormat = 'xlsx'"
          />
          <f7-list-item
            radio
            name="export-format"
            value="json"
            title="JSON"
            subtitle="Formato estruturado para sistemas"
            :checked="exportFormat === 'json'"
            @change="exportFormat = 'json'"
          />
        </f7-list>
      </f7-block>
    </f7-sheet-modal>
  </f7-page>
</template>

<script setup>
import { ref, inject } from 'vue'
import api from '@/services/api'
import dayjs from 'dayjs'
import ptBr from 'dayjs/locale/pt-br'
import StatusBar from '@/components/StatusBar.vue'

// Configurar locale do dayjs
dayjs.locale(ptBr)

// Props
const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

// Injeções
const showToast = inject('showToast')
const showLoading = inject('showLoading')

// Estado
const document = ref(null)
const isLoading = ref(true)
const error = ref(null)
const exportFormat = ref('csv')

// Carregar documento
const loadDocument = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await api.get(`/documents/${props.id}`)
    document.value = response.data
  } catch (err) {
    console.error('Erro ao carregar documento:', err)
    error.value = err.response?.data?.message || 'Erro ao carregar documento'
  } finally {
    isLoading.value = false
  }
}

// Mostrar ações
const showActions = () => {
  const f7 = window.framework7
  
  const buttons = [
    {
      text: 'Baixar PDF',
      icon: 'arrow_down_doc',
      onClick: downloadDocument
    },
    {
      text: 'Exportar Dados',
      icon: 'square_arrow_out',
      onClick: () => {
        f7.sheet.open('#export-sheet')
      }
    },
    {
      text: 'Compartilhar',
      icon: 'square_arrow_up',
      onClick: shareDocument
    },
    {
      text: 'Excluir',
      icon: 'trash',
      color: 'red',
      onClick: confirmDelete
    }
  ]
  
  f7.actions.open({
    buttons: [
      [
        {
          text: 'Ações',
          label: true
        }
      ],
      buttons,
      [
        {
          text: 'Cancelar',
          color: 'red',
          bold: true
        }
      ]
    ]
  })
}

// Baixar documento
const downloadDocument = async () => {
  showLoading(true)
  
  try {
    const response = await api.get(`/documents/${props.id}/download`, {
      params: { format: 'pdf' },
      responseType: 'blob'
    })
    
    // Criar link de download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', document.value.filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    showToast('Download iniciado!')
  } catch (err) {
    console.error('Erro ao baixar:', err)
    showToast('Erro ao baixar documento')
  } finally {
    showLoading(false)
  }
}

// Exportar dados
const exportData = () => {
  const f7 = window.framework7
  f7.sheet.open('#export-sheet')
}

const confirmExport = async () => {
  showLoading(true)
  
  try {
    const response = await api.get(`/documents/${props.id}/export`, {
      params: { format: exportFormat.value },
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `dados-${props.id}.${exportFormat.value}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    showToast('Exportação concluída!')
    window.framework7.sheet.close('#export-sheet')
  } catch (err) {
    console.error('Erro ao exportar:', err)
    showToast('Erro ao exportar dados')
  } finally {
    showLoading(false)
  }
}

const onExportSheetClosed = () => {
  // Resetar formato se necessário
}

// Compartilhar documento
const shareDocument = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: document.value.filename,
        text: `Documento: ${document.value.filename}`,
        url: window.location.href
      })
    } catch (err) {
      console.error('Erro ao compartilhar:', err)
    }
  } else {
    // Fallback: copiar link
    navigator.clipboard.writeText(window.location.href)
    showToast('Link copiado para a área de transferência')
  }
}

// Confirmar exclusão
const confirmDelete = () => {
  const f7 = window.framework7
  
  f7.dialog.confirm(
    'Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.',
    'Excluir Documento',
    async () => {
      showLoading(true)
      try {
        await api.delete(`/documents/${props.id}`)
        showToast('Documento excluído')
        f7.router.back()
      } catch (err) {
        console.error('Erro ao excluir:', err)
        showToast('Erro ao excluir documento')
      } finally {
        showLoading(false)
      }
    }
  )
}

// Tentar processar novamente
const retryProcessing = async () => {
  showLoading(true)
  try {
    await api.post(`/documents/${props.id}/retry`)
    showToast('Processamento reiniciado')
    loadDocument()
  } catch (err) {
    showToast('Erro ao reiniciar processamento')
  } finally {
    showLoading(false)
  }
}

// Utilitários
const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    processing: 'blue',
    completed: 'green',
    error: 'red'
  }
  return colors[status] || 'gray'
}

const getStatusIcon = (status) => {
  const icons = {
    pending: 'clock',
    processing: 'arrow_clockwise',
    completed: 'checkmark_circle',
    error: 'exclamationmark_triangle'
  }
  return icons[status] || 'doc'
}

const getDocumentTypeName = (type) => {
  const names = {
    nfe: 'Nota Fiscal Eletrônica',
    nfce: 'Nota Fiscal ao Consumidor',
    cte: 'Conhecimento de Transporte',
    mdfe: 'Manifesto de Carga',
    boleto: 'Boleto Bancário',
    danfe: 'DANFE',
    xml: 'XML',
    outro: 'Outro'
  }
  return names[type] || type
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

const formatCurrency = (value) => {
  if (!value) return '-'
  // Remover formatação existente e converter para número
  const numericValue = parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'))
  if (isNaN(numericValue)) return value
  return numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>

<style scoped>
.document-detail-content {
  padding: 16px;
}

/* Document Header */
.document-header {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--f7-card-bg-color);
  border-radius: 12px;
  margin-bottom: 16px;
}

.document-icon {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.document-info {
  flex: 1;
  min-width: 0;
}

.document-filename {
  font-size: 16px;
  font-weight: 600;
  color: var(--f7-text-color);
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-meta {
  font-size: 12px;
  color: var(--f7-label-color);
  margin: 0 0 8px 0;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-state p {
  margin-top: 16px;
  color: var(--f7-label-color);
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.error-state h3 {
  margin: 16px 0 8px;
  color: var(--f7-text-color);
}

.error-state p {
  color: var(--f7-label-color);
  margin-bottom: 24px;
}

/* Processing State */
.processing-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.processing-state h3 {
  margin: 24px 0 8px;
  color: var(--f7-text-color);
}

.processing-state p {
  color: var(--f7-label-color);
  margin-bottom: 32px;
}

.processing-steps {
  width: 100%;
  max-width: 300px;
}

.processing-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  opacity: 0.5;
}

.processing-step.completed {
  opacity: 1;
}

.processing-step.active {
  opacity: 1;
}

.processing-step .f7-icon {
  font-size: 24px;
}

.processing-step span {
  font-size: 14px;
  color: var(--f7-text-color);
}

/* Pending State */
.pending-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  text-align: center;
}

.pending-state h3 {
  margin: 16px 0 8px;
  color: var(--f7-text-color);
}

.pending-state p {
  color: var(--f7-label-color);
}

/* Error Processing State */
.error-processing-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  text-align: center;
}

.error-processing-state h3 {
  margin: 16px 0 8px;
  color: var(--f7-text-color);
}

.error-processing-state p {
  color: var(--f7-label-color);
  margin-bottom: 24px;
}

/* Actions Section */
.actions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

/* Lists */
:deep(.list) {
  margin: 16px 0;
}

:deep(.item-label) {
  width: 140px;
}
</style>
