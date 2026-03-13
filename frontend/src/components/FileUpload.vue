<template>
  <div class="file-upload-component">
    <!-- Área de Upload -->
    <div
      class="upload-zone"
      :class="{ 
        'drag-over': isDragOver,
        'has-files': files.length > 0,
        'disabled': disabled
      }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="!disabled && triggerFileInput()"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        @change="onFileSelect"
        style="display: none"
      />

      <!-- Ícone e Texto -->
      <div class="upload-content">
        <div class="upload-icon-wrapper">
          <f7-icon 
            :size="iconSize" 
            :color="isDragOver ? 'primary' : iconColor"
          >
            {{ isDragOver ? 'arrow_down_doc' : 'cloud_upload' }}
          </f7-icon>
        </div>

        <h3 class="upload-title">{{ title }}</h3>
        <p class="upload-subtitle">{{ subtitle }}</p>

        <!-- Formatos Suportados -->
        <div v-if="showFormats" class="supported-formats">
          <f7-chip
            v-for="format in formats"
            :key="format"
            :text="format"
            outline
            small
          />
        </div>

        <!-- Tamanho Máximo -->
        <p v-if="maxSize" class="max-size">
          Máximo: {{ formatMaxSize(maxSize) }}
        </p>
      </div>
    </div>

    <!-- Lista de Arquivos -->
    <div v-if="files.length > 0 && showFileList" class="file-list">
      <div class="file-list-header">
        <span class="file-count">{{ files.length }} arquivo(s)</span>
        <f7-button
          v-if="allowRemoveAll"
          fill="clear"
          size="small"
          color="red"
          @click="clearAll"
        >
          Limpar Tudo
        </f7-button>
      </div>

      <div class="files">
        <div
          v-for="(file, index) in files"
          :key="file.id"
          class="file-item"
        >
          <div class="file-icon">
            <f7-icon 
              size="28" 
              :color="getFileIconColor(file.type)"
            >
              {{ getFileIcon(file.type) }}
            </f7-icon>
          </div>

          <div class="file-info">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-meta">
              {{ formatFileSize(file.size) }}
              <span v-if="file.progress !== undefined">
                • {{ file.progress }}%
              </span>
            </span>
          </div>

          <div class="file-status">
            <f7-icon
              v-if="file.error"
              size="20"
              color="red"
            >
              exclamationmark_circle
            </f7-icon>
            <f7-icon
              v-else-if="file.uploaded"
              size="20"
              color="green"
            >
              checkmark_circle
            </f7-icon>
            <f7-preloader
              v-else-if="file.uploading"
              :size="20"
              color="primary"
            />
          </div>

          <div v-if="allowRemove" class="file-actions">
            <f7-button
              icon-f7="xmark_circle"
              icon-color="red"
              fill="clear"
              small
              @click.stop="removeFile(index)"
            />
          </div>

          <!-- Barra de Progresso -->
          <div v-if="file.uploading" class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${file.progress}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Mensagem de Erro -->
    <div v-if="errorMessage" class="error-message">
      <f7-icon size="16" color="red">exclamationmark_triangle</f7-icon>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'

// Props
const props = defineProps({
  // Configurações básicas
  title: {
    type: String,
    default: 'Arraste e solte arquivos aqui'
  },
  subtitle: {
    type: String,
    default: 'ou clique para selecionar'
  },
  accept: {
    type: String,
    default: '.pdf,.png,.jpg,.jpeg,.webp,.xml'
  },
  multiple: {
    type: Boolean,
    default: true
  },
  maxSize: {
    type: Number,
    default: 10485760 // 10MB
  },
  maxFiles: {
    type: Number,
    default: 10
  },
  
  // Aparência
  iconSize: {
    type: Number,
    default: 48
  },
  iconColor: {
    type: String,
    default: 'primary'
  },
  showFormats: {
    type: Boolean,
    default: true
  },
  showFileList: {
    type: Boolean,
    default: true
  },
  
  // Funcionalidades
  disabled: {
    type: Boolean,
    default: false
  },
  allowRemove: {
    type: Boolean,
    default: true
  },
  allowRemoveAll: {
    type: Boolean,
    default: true
  },
  
  // Model value para v-model
  modelValue: {
    type: Array,
    default: () => []
  }
})

// Emit
const emit = defineEmits(['update:modelValue', 'change', 'upload', 'error'])

// Estado
const fileInput = ref(null)
const files = ref(props.modelValue || [])
const isDragOver = ref(false)
const errorMessage = ref('')

// Computed
const formats = computed(() => {
  const acceptMap = {
    '.pdf': 'PDF',
    '.png': 'PNG',
    '.jpg': 'JPG',
    '.jpeg': 'JPG',
    '.webp': 'WEBP',
    '.xml': 'XML',
    'image/*': 'IMG',
    'application/pdf': 'PDF',
    'application/xml': 'XML'
  }
  
  return props.accept
    .split(',')
    .map(a => a.trim())
    .map(a => acceptMap[a] || a.replace('.', '').toUpperCase())
    .slice(0, 5)
})

// Métodos
const triggerFileInput = () => {
  fileInput.value?.click()
}

const onDragOver = () => {
  if (!props.disabled) {
    isDragOver.value = true
  }
}

const onDragLeave = () => {
  isDragOver.value = false
}

const onDrop = (event) => {
  isDragOver.value = false
  
  if (props.disabled) return
  
  const droppedFiles = Array.from(event.dataTransfer.files)
  handleFiles(droppedFiles)
}

const onFileSelect = (event) => {
  const selectedFiles = Array.from(event.target.files)
  handleFiles(selectedFiles)
  
  // Reset input para permitir selecionar mesmo arquivo novamente
  event.target.value = ''
}

const handleFiles = (newFiles) => {
  errorMessage.value = ''
  
  // Validar quantidade máxima
  if (files.value.length + newFiles.length > props.maxFiles) {
    errorMessage.value = `Máximo de ${props.maxFiles} arquivos permitidos`
    emit('error', { type: 'max_files', message: errorMessage.value })
    return
  }
  
  const validFiles = []
  
  newFiles.forEach(file => {
    // Validar tamanho
    if (file.size > props.maxSize) {
      errorMessage.value = `Arquivo "${file.name}" excede o tamanho máximo de ${formatMaxSize(props.maxSize)}`
      emit('error', { 
        type: 'max_size', 
        message: errorMessage.value,
        file: file.name 
      })
      return
    }
    
    // Validar tipo
    if (!isValidType(file)) {
      errorMessage.value = `Tipo de arquivo "${file.name}" não é permitido`
      emit('error', { 
        type: 'invalid_type', 
        message: errorMessage.value,
        file: file.name 
      })
      return
    }
    
    validFiles.push({
      id: uuidv4(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      uploading: false,
      progress: 0,
      uploaded: false,
      error: false
    })
  })
  
  if (validFiles.length > 0) {
    files.value = [...files.value, ...validFiles]
    emit('update:modelValue', files.value)
    emit('change', files.value)
  }
}

const isValidType = (file) => {
  const acceptTypes = props.accept.split(',').map(a => a.trim())
  
  return acceptTypes.some(type => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase())
    }
    if (type.endsWith('/*')) {
      const baseType = type.split('/')[0]
      return file.type.startsWith(baseType)
    }
    return file.type === type
  })
}

const removeFile = (index) => {
  files.value.splice(index, 1)
  emit('update:modelValue', files.value)
  emit('change', files.value)
}

const clearAll = () => {
  files.value = []
  emit('update:modelValue', [])
  emit('change', [])
}

// Utilitários
const getFileIcon = (type) => {
  if (type?.includes('pdf')) return 'doc_text'
  if (type?.includes('image')) return 'photo'
  if (type?.includes('xml')) return 'doc_text'
  return 'doc'
}

const getFileIconColor = (type) => {
  if (type?.includes('pdf')) return 'red'
  if (type?.includes('image')) return 'green'
  if (type?.includes('xml')) return 'blue'
  return 'gray'
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatMaxSize = (bytes) => {
  return formatFileSize(bytes)
}

// Watch para modelValue externo
defineExpose({
  files,
  clearAll,
  removeFile,
  triggerFileInput
})
</script>

<style scoped>
.file-upload-component {
  width: 100%;
}

/* Upload Zone */
.upload-zone {
  border: 2px dashed var(--f7-gray-color);
  border-radius: 16px;
  padding: 32px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--f7-card-bg-color);
}

.upload-zone:hover {
  border-color: var(--f7-theme-color);
}

.upload-zone.drag-over {
  border-color: var(--f7-theme-color);
  background: var(--f7-theme-color-bg);
  transform: scale(1.02);
}

.upload-zone.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-zone.has-files {
  border-style: solid;
}

/* Upload Content */
.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-icon-wrapper {
  margin-bottom: 16px;
}

.upload-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--f7-text-color);
  margin: 0 0 8px 0;
}

.upload-subtitle {
  font-size: 14px;
  color: var(--f7-label-color);
  margin: 0 0 16px 0;
}

/* Supported Formats */
.supported-formats {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

/* Max Size */
.max-size {
  font-size: 12px;
  color: var(--f7-label-color);
  margin: 0;
}

/* File List */
.file-list {
  margin-top: 16px;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.file-count {
  font-size: 14px;
  font-weight: 500;
  color: var(--f7-text-color);
}

.files {
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
  position: relative;
  overflow: hidden;
}

.file-icon {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--f7-gray-color);
  border-radius: 8px;
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

.file-meta {
  font-size: 12px;
  color: var(--f7-label-color);
}

.file-status {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
}

.file-actions {
  flex: 0 0 auto;
}

/* Progress Bar */
.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--f7-gray-color);
}

.progress-fill {
  height: 100%;
  background: var(--f7-theme-color);
  transition: width 0.3s ease;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-top: 12px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #F44336;
}
</style>
