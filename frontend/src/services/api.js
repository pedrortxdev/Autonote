/**
 * API Service
 * 
 * Configuração do Axios com interceptors e mocks para desenvolvimento
 * 
 * @description
 * Este serviço gerencia todas as comunicações com o backend.
 * Em desenvolvimento, usa mocks para simular respostas da API.
 * Em produção, conecta-se ao backend real.
 */

import axios from 'axios'
import dayjs from 'dayjs'

// ========================================
// Configuração do Axios
// ========================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.pxdsolutions.com'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// ========================================
// Mock Data para Desenvolvimento
// ========================================

const MOCK_DELAY = 800 // ms para simular latência de rede

// Dados mock de documentos
const mockDocuments = [
  {
    id: 'doc-001',
    filename: 'nota_fiscal_001.pdf',
    fileType: 'pdf',
    fileSize: 245678,
    status: 'completed',
    uploadedAt: dayjs().subtract(2, 'days').toISOString(),
    processedAt: dayjs().subtract(2, 'days').add(5, 'minutes').toISOString(),
    documentType: 'nfe',
    extractedData: {
      numero: '001.234',
      serie: '1',
      dataEmissao: '2024-03-10',
      valorTotal: '1.250,00',
      fornecedor: 'Empresa ABC Ltda',
      cnpj: '12.345.678/0001-90'
    }
  },
  {
    id: 'doc-002',
    filename: 'conhecimento_transportes.png',
    fileType: 'image',
    fileSize: 1567890,
    status: 'completed',
    uploadedAt: dayjs().subtract(1, 'day').toISOString(),
    processedAt: dayjs().subtract(1, 'day').add(3, 'minutes').toISOString(),
    documentType: 'cte',
    extractedData: {
      numero: '12345',
      serie: '001',
      dataEmissao: '2024-03-11',
      valorFrete: '850,00',
      remetente: 'Transportadora XYZ',
      destinatario: 'Comércio Silva ME'
    }
  },
  {
    id: 'doc-003',
    filename: 'danfe_003.pdf',
    fileType: 'pdf',
    fileSize: 189234,
    status: 'processing',
    uploadedAt: dayjs().subtract(30, 'minutes').toISOString(),
    processedAt: null,
    documentType: 'nfe',
    extractedData: null
  },
  {
    id: 'doc-004',
    filename: 'boleto_bancario.jpg',
    fileType: 'image',
    fileSize: 456123,
    status: 'pending',
    uploadedAt: dayjs().subtract(10, 'minutes').toISOString(),
    processedAt: null,
    documentType: 'boleto',
    extractedData: null
  },
  {
    id: 'doc-005',
    filename: 'xml_nfe_005.xml',
    fileType: 'xml',
    fileSize: 34567,
    status: 'error',
    uploadedAt: dayjs().subtract(3, 'days').toISOString(),
    processedAt: dayjs().subtract(3, 'days').add(1, 'minute').toISOString(),
    documentType: 'nfe',
    extractedData: null,
    errorMessage: 'Arquivo XML inválido ou corrompido'
  }
]

// Dados mock de usuário
const mockUser = {
  id: 'user-001',
  name: 'João Silva',
  email: 'joao.silva@empresa.com.br',
  company: 'Silva Contabilidade',
  cnpj: '12.345.678/0001-90',
  phone: '(11) 99999-9999',
  avatar: null,
  role: 'admin',
  createdAt: '2024-01-15T10:00:00Z'
}

// ========================================
// Funções Mock
// ========================================

const mockApi = {
  // Autenticação
  async login(credentials) {
    await delay(MOCK_DELAY)
    
    // Validar credenciais mock
    if (credentials.email === 'demo@pxdsolutions.com' && credentials.password === 'demo123') {
      return {
        data: {
          access_token: 'mock-jwt-token-xyz123',
          refresh_token: 'mock-refresh-token-abc456',
          expires_in: 3600, // 1 hora
          user: mockUser
        }
      }
    }
    
    throw createMockError('Credenciais inválidas. Use demo@pxdsolutions.com / demo123', 401)
  },

  async logout() {
    await delay(MOCK_DELAY)
    return { data: { success: true } }
  },

  async getProfile() {
    await delay(MOCK_DELAY)
    return { data: mockUser }
  },

  async updateProfile(data) {
    await delay(MOCK_DELAY)
    mockUser.name = data.name || mockUser.name
    mockUser.phone = data.phone || mockUser.phone
    mockUser.company = data.company || mockUser.company
    return { data: mockUser }
  },

  async updatePassword(data) {
    await delay(MOCK_DELAY)
    if (data.currentPassword !== 'demo123') {
      throw createMockError('Senha atual incorreta', 400)
    }
    return { data: { success: true } }
  },

  // Documentos
  async getDocuments(params = {}) {
    await delay(MOCK_DELAY)
    
    let filtered = [...mockDocuments]
    
    // Filtros
    if (params.status) {
      filtered = filtered.filter(doc => doc.status === params.status)
    }
    if (params.type) {
      filtered = filtered.filter(doc => doc.documentType === params.type)
    }
    if (params.search) {
      const search = params.search.toLowerCase()
      filtered = filtered.filter(doc => 
        doc.filename.toLowerCase().includes(search) ||
        doc.extractedData?.fornecedor?.toLowerCase().includes(search)
      )
    }
    
    // Paginação
    const page = params.page || 1
    const limit = params.limit || 10
    const start = (page - 1) * limit
    const end = start + limit
    
    return {
      data: {
        documents: filtered.slice(start, end),
        pagination: {
          total: filtered.length,
          page,
          limit,
          totalPages: Math.ceil(filtered.length / limit)
        }
      }
    }
  },

  async getDocument(id) {
    await delay(MOCK_DELAY)
    
    const doc = mockDocuments.find(d => d.id === id)
    if (!doc) {
      throw createMockError('Documento não encontrado', 404)
    }
    
    return { data: doc }
  },

  async uploadDocument(formData, onProgress) {
    // Simular upload com progresso
    return new Promise((resolve, reject) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        if (onProgress) {
          onProgress({ loaded: progress, total: 100 })
        }
        
        if (progress >= 100) {
          clearInterval(interval)
          
          // Criar documento mock
          const newDoc = {
            id: `doc-${Date.now()}`,
            filename: formData.get('file')?.name || 'documento.pdf',
            fileType: formData.get('file')?.type?.split('/')[1] || 'pdf',
            fileSize: formData.get('file')?.size || 100000,
            status: 'pending',
            uploadedAt: new Date().toISOString(),
            processedAt: null,
            documentType: 'unknown',
            extractedData: null
          }
          
          mockDocuments.unshift(newDoc)
          resolve({ data: newDoc })
        }
      }, 200)
    })
  },

  async deleteDocument(id) {
    await delay(MOCK_DELAY)
    
    const index = mockDocuments.findIndex(d => d.id === id)
    if (index === -1) {
      throw createMockError('Documento não encontrado', 404)
    }
    
    mockDocuments.splice(index, 1)
    return { data: { success: true } }
  },

  async downloadDocument(id, format = 'pdf') {
    await delay(MOCK_DELAY)
    
    const doc = mockDocuments.find(d => d.id === id)
    if (!doc) {
      throw createMockError('Documento não encontrado', 404)
    }
    
    // Retornar blob mock
    return {
      data: new Blob(['Mock document content'], { type: `application/${format}` }),
      headers: {
        'content-disposition': `attachment; filename="${doc.filename}"`
      }
    }
  },

  async exportDocuments(format = 'csv', ids = []) {
    await delay(MOCK_DELAY)
    
    const docsToExport = ids.length > 0 
      ? mockDocuments.filter(d => ids.includes(d.id))
      : mockDocuments.filter(d => d.status === 'completed')
    
    // Criar conteúdo mock baseado no formato
    let content = ''
    if (format === 'csv') {
      content = 'ID,Nome,Tipo,Status,Data\n'
      docsToExport.forEach(doc => {
        content += `${doc.id},${doc.filename},${doc.documentType},${doc.status},${doc.uploadedAt}\n`
      })
    } else if (format === 'xlsx') {
      content = 'Mock Excel content'
    }
    
    return {
      data: new Blob([content], { type: `application/${format}` }),
      headers: {
        'content-disposition': `attachment; filename="export-${format}.${format}"`
      }
    }
  },

  // Estatísticas
  async getStats() {
    await delay(MOCK_DELAY)
    
    const total = mockDocuments.length
    const completed = mockDocuments.filter(d => d.status === 'completed').length
    const processing = mockDocuments.filter(d => d.status === 'processing').length
    const pending = mockDocuments.filter(d => d.status === 'pending').length
    const error = mockDocuments.filter(d => d.status === 'error').length
    
    return {
      data: {
        total,
        completed,
        processing,
        pending,
        error,
        thisMonth: mockDocuments.filter(d => 
          dayjs(d.uploadedAt).isSame(dayjs(), 'month')
        ).length
      }
    }
  },

  // WebSocket mock (para atualizações em tempo real)
  subscribeToDocumentUpdates(callback) {
    // Simular atualizações via WebSocket
    const interval = setInterval(() => {
      const processingDoc = mockDocuments.find(d => d.status === 'processing')
      if (processingDoc && Math.random() > 0.7) {
        // 30% de chance de atualizar documento em processamento
        processingDoc.status = 'completed'
        processingDoc.processedAt = new Date().toISOString()
        processingDoc.extractedData = {
          numero: '001.789',
          serie: '1',
          dataEmissao: dayjs().format('YYYY-MM-DD'),
          valorTotal: '2.500,00',
          fornecedor: 'Fornecedor Mock Ltda',
          cnpj: '98.765.432/0001-10'
        }
        callback({ type: 'update', document: processingDoc })
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }
}

// ========================================
// Funções Auxiliares
// ========================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function createMockError(message, status) {
  const error = new Error(message)
  error.response = {
    status,
    data: { message }
  }
  return error
}

// ========================================
// Interceptors
// ========================================

// Request interceptor - adiciona token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('pxd-auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor - trata erros
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('pxd-auth-token')
      localStorage.removeItem('pxd-user-data')
      localStorage.removeItem('pxd-auth-expires')
      
      // Redirecionar para login
      if (window.framework7?.router) {
        window.framework7.router.navigate('/login/')
      }
    }
    return Promise.reject(error)
  }
)

// ========================================
// Wrapper para usar mocks em desenvolvimento
// ========================================

const useMockApi = import.meta.env.DEV || import.meta.env.VITE_USE_MOCK === 'true'

const apiWrapper = {
  // Manter referência ao axios original
  axios: api,
  
  // Defaults do axios
  defaults: api.defaults,
  
  // Métodos HTTP
  async get(url, config = {}) {
    if (useMockApi) {
      return await handleMockCall(url, config)
    }
    return api.get(url, config)
  },
  
  async post(url, data, config = {}) {
    if (useMockApi) {
      return await handleMockCall(url, config, data)
    }
    return api.post(url, data, config)
  },
  
  async put(url, data, config = {}) {
    if (useMockApi) {
      return await handleMockCall(url, config, data)
    }
    return api.put(url, data, config)
  },
  
  async delete(url, config = {}) {
    if (useMockApi) {
      return await handleMockCall(url, config)
    }
    return api.delete(url, config)
  },
  
  async upload(url, formData, onProgress) {
    if (useMockApi) {
      return await mockApi.uploadDocument(formData, onProgress)
    }
    
    return api.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: progressEvent => {
        if (onProgress) {
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded / progressEvent.total) * 100)
          })
        }
      }
    })
  }
}

// Roteador de chamadas mock
async function handleMockCall(url, config, data = null) {
  const method = config.method?.toLowerCase() || 'get'
  const fullPath = url.startsWith('/') ? url : `/${url}`
  
  // Rotas de autenticação
  if (fullPath.includes('/auth/login')) {
    return mockApi.login(data)
  }
  if (fullPath.includes('/auth/logout')) {
    return mockApi.logout()
  }
  if (fullPath.includes('/auth/profile')) {
    if (method === 'get') return mockApi.getProfile()
    if (method === 'put') return mockApi.updateProfile(data)
  }
  if (fullPath.includes('/auth/password')) {
    return mockApi.updatePassword(data)
  }
  
  // Rotas de documentos
  if (fullPath.includes('/documents')) {
    if (method === 'get') {
      // Verificar se é documento específico
      const docId = fullPath.split('/').pop()
      if (docId !== 'documents') {
        return mockApi.getDocument(docId)
      }
      return mockApi.getDocuments(config.params)
    }
    if (method === 'post') {
      return mockApi.uploadDocument(data, config.onUploadProgress)
    }
    if (method === 'delete') {
      const docId = fullPath.split('/').pop()
      return mockApi.deleteDocument(docId)
    }
  }
  
  // Rotas de download
  if (fullPath.includes('/download')) {
    const docId = config.params?.id || fullPath.split('/').pop()
    return mockApi.downloadDocument(docId, config.params?.format || 'pdf')
  }
  
  // Rotas de exportação
  if (fullPath.includes('/export')) {
    return mockApi.exportDocuments(config.params?.format || 'csv', config.params?.ids || [])
  }
  
  // Rotas de estatísticas
  if (fullPath.includes('/stats')) {
    return mockApi.getStats()
  }
  
  throw createMockError(`Endpoint não implementado: ${fullPath}`, 404)
}

// ========================================
// Export
// ========================================

export default apiWrapper

// Exportar funções úteis
export { mockApi }
