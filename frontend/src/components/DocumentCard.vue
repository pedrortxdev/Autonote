<template>
  <f7-card
    class="document-card"
    :class="`status-${document.status}`"
    @click="$emit('click', document)"
  >
    <f7-card-content>
      <!-- Header do Card -->
      <div class="card-header">
        <div class="document-icon">
          <f7-icon 
            size="32" 
            :color="getFileIconColor(document.fileType)"
          >
            {{ getFileIcon(document.fileType) }}
          </f7-icon>
        </div>
        
        <div class="document-main">
          <h3 class="document-name">{{ document.filename }}</h3>
          <p class="document-meta">
            <span>{{ formatFileSize(document.fileSize) }}</span>
            <span class="separator">•</span>
            <span>{{ formatDate(document.uploadedAt) }}</span>
          </p>
        </div>
        
        <div class="document-status">
          <StatusBar :status="document.status" compact />
        </div>
      </div>

      <!-- Dados Extraídos (se disponível) -->
      <div v-if="document.extractedData" class="extracted-data">
        <div class="data-row">
          <span class="data-label">Tipo:</span>
          <span class="data-value">{{ getDocumentTypeName(document.documentType) }}</span>
        </div>
        
        <div v-if="document.extractedData.numero" class="data-row">
          <span class="data-label">Número:</span>
          <span class="data-value">{{ document.extractedData.numero }}</span>
        </div>
        
        <div v-if="document.extractedData.fornecedor" class="data-row">
          <span class="data-label">Fornecedor:</span>
          <span class="data-value">{{ document.extractedData.fornecedor }}</span>
        </div>
        
        <div v-if="document.extractedData.valorTotal" class="data-row">
          <span class="data-label">Valor:</span>
          <span class="data-value amount">{{ formatCurrency(document.extractedData.valorTotal) }}</span>
        </div>
      </div>

      <!-- Mensagem de Erro -->
      <div v-if="document.status === 'error' && document.errorMessage" class="error-message">
        <f7-icon size="16" color="red">exclamationmark_triangle</f7-icon>
        <span>{{ document.errorMessage }}</span>
      </div>

      <!-- Ações Rápidas -->
      <div class="card-actions">
        <f7-button
          fill="clear"
          size="small"
          color="primary"
          @click.stop="downloadDocument"
        >
          <f7-icon slot="icon" f7="arrow_down_doc" />
          Baixar
        </f7-button>
        
        <f7-button
          v-if="document.status === 'completed'"
          fill="clear"
          size="small"
          color="primary"
          @click.stop="exportData"
        >
          <f7-icon slot="icon" f7="square_arrow_out" />
          Exportar
        </f7-button>
        
        <f7-button
          fill="clear"
          size="small"
          color="red"
          @click.stop="deleteDocument"
        >
          <f7-icon slot="icon" f7="trash" />
          Excluir
        </f7-button>
      </div>
    </f7-card-content>
  </f7-card>
</template>

<script setup>
import { inject } from 'vue'
import dayjs from 'dayjs'
import ptBr from 'dayjs/locale/pt-br'
import api from '@/services/api'
import StatusBar from './StatusBar.vue'

// Configurar locale
dayjs.locale(ptBr)

// Props
defineProps({
  document: {
    type: Object,
    required: true
  }
})

// Emit
defineEmits(['click'])

// Injeções
const showToast = inject('showToast')
const showLoading = inject('showLoading')
const showDialog = inject('showDialog')

// Utilitários
const getFileIcon = (type) => {
  const icons = {
    pdf: 'doc_text',
    image: 'photo',
    xml: 'doc_text',
    default: 'doc'
  }
  
  if (!type) return icons.default
  if (type.includes('pdf')) return icons.pdf
  if (type.includes('image')) return icons.image
  if (type.includes('xml')) return icons.xml
  return icons.default
}

const getFileIconColor = (type) => {
  const colors = {
    pdf: 'red',
    image: 'green',
    xml: 'blue',
    default: 'gray'
  }
  
  if (!type) return colors.default
  if (type.includes('pdf')) return colors.pdf
  if (type.includes('image')) return colors.image
  if (type.includes('xml')) return colors.xml
  return colors.default
}

const getDocumentTypeName = (type) => {
  const names = {
    nfe: 'NF-e',
    nfce: 'NFC-e',
    cte: 'CT-e',
    mdfe: 'MDF-e',
    boleto: 'Boleto',
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
  const d = dayjs(date)
  const now = dayjs()
  
  if (d.isSame(now, 'day')) {
    return `Hoje às ${d.format('HH:mm')}`
  }
  if (d.isSame(now.subtract(1, 'day'), 'day')) {
    return `Ontem às ${d.format('HH:mm')}`
  }
  return d.format('DD/MM/YYYY')
}

const formatCurrency = (value) => {
  if (!value) return '-'
  const numericValue = parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'))
  if (isNaN(numericValue)) return value
  return numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Ações
const downloadDocument = async () => {
  showLoading(true)
  try {
    const response = await api.get(`/documents/${document.id}/download`, {
      params: { format: 'pdf' },
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', document.filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    showToast('Download iniciado!')
  } catch (error) {
    console.error('Erro ao baixar:', error)
    showToast('Erro ao baixar documento')
  } finally {
    showLoading(false)
  }
}

const exportData = async () => {
  showLoading(true)
  try {
    const response = await api.get(`/documents/${document.id}/export`, {
      params: { format: 'csv' },
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `dados-${document.id}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    showToast('Exportação concluída!')
  } catch (error) {
    console.error('Erro ao exportar:', error)
    showToast('Erro ao exportar dados')
  } finally {
    showLoading(false)
  }
}

const deleteDocument = () => {
  showDialog(
    'Excluir Documento',
    `Tem certeza que deseja excluir "${document.filename}"? Esta ação não pode ser desfeita.`,
    [
      {
        text: 'Cancelar',
        bold: false
      },
      {
        text: 'Excluir',
        bold: true,
        color: 'red',
        onClick: async () => {
          showLoading(true)
          try {
            await api.delete(`/documents/${document.id}`)
            showToast('Documento excluído')
            $emit('deleted', document.id)
          } catch (error) {
            console.error('Erro ao excluir:', error)
            showToast('Erro ao excluir documento')
          } finally {
            showLoading(false)
          }
        }
      }
    ]
  )
}
</script>

<style scoped>
.document-card {
  margin: 0;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.document-card:active {
  transform: scale(0.98);
}

.document-card.status-completed {
  border-left: 4px solid #4CAF50;
}

.document-card.status-processing {
  border-left: 4px solid #2196F3;
}

.document-card.status-pending {
  border-left: 4px solid #FF9800;
}

.document-card.status-error {
  border-left: 4px solid #F44336;
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.document-icon {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--f7-card-bg-color);
  border-radius: 8px;
}

.document-main {
  flex: 1;
  min-width: 0;
}

.document-name {
  font-size: 15px;
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
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.separator {
  opacity: 0.5;
}

.document-status {
  flex: 0 0 auto;
}

/* Extracted Data */
.extracted-data {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--f7-gray-color);
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
}

.data-label {
  color: var(--f7-label-color);
  font-weight: 500;
}

.data-value {
  color: var(--f7-text-color);
  font-weight: 500;
  text-align: right;
}

.data-value.amount {
  color: #4CAF50;
  font-weight: 600;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: #F44336;
}

/* Card Actions */
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--f7-gray-color);
}

.card-actions :deep(.button) {
  padding-left: 8px;
  padding-right: 8px;
}
</style>
