<template>
  <f7-page name="upload">
    <f7-navbar large transparent>
      <f7-nav-left>
        <f7-link icon-f7="chevron_left" back />
      </f7-nav-left>
      <f7-nav-title>Novo Documento</f7-nav-title>
    </f7-navbar>

    <f7-page-content class="upload-content">
      <!-- Instruções -->
      <div class="upload-instructions">
        <h2>Enviar Documento</h2>
        <p>Selecione um documento para extração automática de dados</p>
      </div>

      <!-- Área de Upload -->
      <div
        class="upload-area"
        :class="{ 'drag-over': isDragOver }"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
        @click="triggerFileInput"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.xml"
          multiple
          @change="onFileSelect"
          style="display: none"
        />

        <div class="upload-icon">
          <f7-icon size="64" color="primary">cloud_upload</f7-icon>
        </div>

        <h3 class="upload-title">
          Arraste e solte arquivos aqui
        </h3>
        <p class="upload-subtitle">
          ou clique para selecionar
        </p>

        <div class="upload-formats">
          <f7-chip outline text="PDF" />
          <f7-chip outline text="PNG" />
          <f7-chip outline text="JPG" />
          <f7-chip outline text="XML" />
        </div>

        <p class="upload-max-size">
          Tamanho máximo: 10MB por arquivo
        </p>
      </div>

      <!-- Opções de Captura -->
      <div class="capture-options">
        <f7-button
          large
          fill="outline"
          round
          color="primary"
          @click="captureFromCamera"
        >
          <f7-icon slot="icon" f7="camera" />
          Usar Câmera
        </f7-button>

        <f7-button
          large
          fill="outline"
          round
          color="primary"
          @click="captureFromGallery"
        >
          <f7-icon slot="icon" f7="photo" />
          Galeria
        </f7-button>
      </div>

      <!-- Lista de Arquivos Selecionados -->
      <div v-if="selectedFiles.length > 0" class="selected-files">
        <div class="files-header">
          <h3>Arquivos Selecionados ({{ selectedFiles.length }})</h3>
          <f7-button
            fill="clear"
            size="small"
            color="red"
            @click="clearAllFiles"
          >
            Limpar Tudo
          </f7-button>
        </div>

        <div class="files-list">
          <div
            v-for="(file, index) in selectedFiles"
            :key="file.id"
            class="file-item"
          >
            <div class="file-icon">
              <f7-icon 
                size="32" 
                :color="getFileIconColor(file.type)"
              >
                {{ getFileIcon(file.type) }}
              </f7-icon>
            </div>

            <div class="file-info">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </div>

            <div class="file-actions">
              <f7-button
                icon-f7="xmark_circle"
                icon-color="red"
                fill="clear"
                small
                @click="removeFile(index)"
              />
            </div>

            <!-- Progresso de Upload -->
            <div v-if="file.uploading" class="file-progress">
              <f7-progressbar :progress="file.progress" color="primary" />
            </div>
          </div>
        </div>
      </div>

      <!-- Tipo de Documento -->
      <div v-if="selectedFiles.length > 0" class="document-type-section">
        <f7-list>
          <f7-list-item
            title="Tipo de Documento"
            :subtitle="documentType || 'Selecione...'"
            @click="showDocumentTypePicker"
          >
            <template #after>
              <f7-icon color="gray">chevron_down</f7-icon>
            </template>
          </f7-list-item>
        </f7-list>
      </div>

      <!-- Botão de Enviar -->
      <div class="upload-actions">
        <f7-button
          large
          fill
          round
          color="primary"
          :disabled="selectedFiles.length === 0 || isUploading"
          @click="uploadFiles"
        >
          <span v-if="!isUploading">
            <f7-icon slot="icon" f7="cloud_upload" />
            Enviar {{ selectedFiles.length > 1 ? `${selectedFiles.length} Arquivos` : 'Arquivo' }}
          </span>
          <span v-else>
            <f7-preloader color="white" :size="20" />
            Enviando...
          </span>
        </f7-button>
      </div>

      <!-- Dicas -->
      <div class="upload-tips">
        <f7-accordion-list>
          <f7-accordion-item>
            <f7-list-item
              title="Dicas para melhor resultado"
              accordion-item-toggle
            >
              <template #after>
                <f7-icon f7="chevron_down" />
              </template>
            </f7-list-item>
            <f7-accordion-content>
              <div class="tips-content">
                <ul>
                  <li>
                    <f7-icon color="success" size="16">checkmark_circle</f7-icon>
                    Use documentos com boa qualidade de imagem
                  </li>
                  <li>
                    <f7-icon color="success" size="16">checkmark_circle</f7-icon>
                    Certifique-se que o texto está legível
                  </li>
                  <li>
                    <f7-icon color="success" size="16">checkmark_circle</f7-icon>
                    Evite documentos amassados ou com sombras
                  </li>
                  <li>
                    <f7-icon color="success" size="16">checkmark_circle</f7-icon>
                    PDFs nativos têm melhor taxa de extração
                  </li>
                </ul>
              </div>
            </f7-accordion-content>
          </f7-accordion-item>
        </f7-accordion-list>
      </div>
    </f7-page-content>
  </f7-page>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import api from '@/services/api'

// Estado
const fileInput = ref(null)
const selectedFiles = ref([])
const documentType = ref('')
const isDragOver = ref(false)
const isUploading = ref(false)

// Tipos de documento suportados
const documentTypes = [
  { id: 'nfe', name: 'Nota Fiscal Eletrônica (NF-e)' },
  { id: 'nfce', name: 'Nota Fiscal ao Consumidor (NFC-e)' },
  { id: 'cte', name: 'Conhecimento de Transporte (CT-e)' },
  { id: 'mdfe', name: 'Manifesto de Carga (MDF-e)' },
  { id: 'boleto', name: 'Boleto Bancário' },
  { id: 'danfe', name: 'DANFE' },
  { id: 'xml', name: 'XML' },
  { id: 'outro', name: 'Outro' }
]

// Trigger input de arquivo
const triggerFileInput = () => {
  fileInput.value?.click()
}

// Selecionar arquivo
const onFileSelect = (event) => {
  const files = Array.from(event.target.files)
  addFiles(files)
  event.target.value = '' // Reset para permitir selecionar mesmo arquivo
}

// Drag and Drop
const onDragOver = () => {
  isDragOver.value = true
}

const onDragLeave = () => {
  isDragOver.value = false
}

const onDrop = (event) => {
  isDragOver.value = false
  const files = Array.from(event.dataTransfer.files)
  addFiles(files)
}

// Adicionar arquivos
const addFiles = (files) => {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/xml', 'text/xml']

  files.forEach(file => {
    // Validar tipo
    if (!allowedTypes.some(type => file.type.includes(type.split('/')[1]))) {
      showToast(`Tipo de arquivo não suportado: ${file.name}`)
      return
    }

    // Validar tamanho
    if (file.size > maxSize) {
      showToast(`Arquivo muito grande: ${file.name} (máx. 10MB)`)
      return
    }

    // Adicionar à lista
    selectedFiles.value.push({
      id: uuidv4(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      uploading: false,
      progress: 0
    })
  })

  if (selectedFiles.value.length > 0) {
    showToast(`${files.length} arquivo(s) adicionado(s)`)
  }
}

// Remover arquivo
const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

// Limpar todos os arquivos
const clearAllFiles = () => {
  selectedFiles.value = []
  documentType.value = ''
}

// Capturar da câmera
const captureFromCamera = () => {
  const f7 = window.framework7
  
  f7.photoBrowser.create({
    photos: [],
    type: 'popup',
    swipeToClose: true
  }).open()
  
  // Em produção, usar API de câmera nativa
  showToast('Funcionalidade de câmera será implementada')
}

// Capturar da galeria
const captureFromGallery = () => {
  triggerFileInput()
}

// Mostrar seletor de tipo de documento
const showDocumentTypePicker = () => {
  const f7 = window.framework7
  
  const buttons = documentTypes.map(type => ({
    text: type.name,
    onClick: () => {
      documentType.value = type.id
    }
  }))
  
  buttons.push({
    text: 'Cancelar',
    color: 'red',
    bold: true
  })
  
  f7.actions.open({
    buttons: [
      [
        {
          text: 'Selecione o Tipo',
          label: true
        }
      ],
      buttons
    ]
  })
}

// Upload de arquivos
const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) return

  isUploading.value = true

  try {
    // Upload sequencial
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const fileItem = selectedFiles.value[i]
      fileItem.uploading = true

      const formData = new FormData()
      formData.append('file', fileItem.file)
      formData.append('documentType', documentType.value || 'auto')

      try {
        const response = await api.upload('/documents', formData, (progress) => {
          fileItem.progress = progress.percentage || 0
        })

        fileItem.uploading = false
        fileItem.uploaded = true
        fileItem.documentId = response.data.id

        showToast(`${fileItem.name} enviado com sucesso!`)
      } catch (error) {
        fileItem.uploading = false
        fileItem.error = true
        showToast(`Erro ao enviar ${fileItem.name}`)
      }
    }

    // Redirecionar para dashboard após upload
    setTimeout(() => {
      window.framework7.router.navigate('/dashboard/')
    }, 1000)
  } catch (error) {
    console.error('Upload error:', error)
    showToast('Erro ao enviar arquivos')
  } finally {
    isUploading.value = false
  }
}

// Utilitários
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (type) => {
  if (type.includes('pdf')) return 'doc_text'
  if (type.includes('image')) return 'photo'
  if (type.includes('xml')) return 'doc_text'
  return 'doc'
}

const getFileIconColor = (type) => {
  if (type.includes('pdf')) return 'red'
  if (type.includes('image')) return 'green'
  if (type.includes('xml')) return 'blue'
  return 'gray'
}

const showToast = (message) => {
  const f7 = window.framework7
  f7.toast.show({
    text: message,
    position: 'bottom',
    closeTimeout: 2000
  })
}
</script>

<style scoped>
.upload-content {
  padding: 16px;
}

/* Instructions */
.upload-instructions {
  text-align: center;
  margin-bottom: 24px;
}

.upload-instructions h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--f7-text-color);
  margin: 0 0 8px 0;
}

.upload-instructions p {
  font-size: 14px;
  color: var(--f7-label-color);
  margin: 0;
}

/* Upload Area */
.upload-area {
  border: 2px dashed var(--f7-gray-color);
  border-radius: 16px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--f7-card-bg-color);
}

.upload-area.drag-over {
  border-color: var(--f7-theme-color);
  background: var(--f7-theme-color-bg);
}

.upload-icon {
  margin-bottom: 16px;
}

.upload-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--f7-text-color);
  margin: 0 0 8px 0;
}

.upload-subtitle {
  font-size: 14px;
  color: var(--f7-label-color);
  margin: 0 0 16px 0;
}

.upload-formats {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.upload-max-size {
  font-size: 12px;
  color: var(--f7-label-color);
  margin: 0;
}

/* Capture Options */
.capture-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 24px 0;
}

/* Selected Files */
.selected-files {
  margin: 24px 0;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.files-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--f7-text-color);
  margin: 0;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--f7-card-bg-color);
  border-radius: 12px;
}

.file-icon {
  flex: 0 0 auto;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--f7-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: var(--f7-label-color);
}

.file-actions {
  flex: 0 0 auto;
}

.file-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
}

.file-item {
  position: relative;
  overflow: hidden;
}

/* Document Type Section */
.document-type-section {
  margin: 24px 0;
}

/* Upload Actions */
.upload-actions {
  margin: 24px 0;
}

/* Upload Tips */
.upload-tips {
  margin-top: 24px;
}

.tips-content {
  padding: 16px;
}

.tips-content ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-content li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  color: var(--f7-text-color);
}

.tips-content li:first-child {
  padding-top: 0;
}

.tips-content li:last-child {
  padding-bottom: 0;
}
</style>
