/**
 * Auth Store - Pinia
 * 
 * Gerencia o estado de autenticação do usuário
 * incluindo login, logout, e dados do perfil
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

// Chaves de armazenamento local
const STORAGE_KEYS = {
  TOKEN: 'pxd-auth-token',
  USER: 'pxd-user-data',
  EXPIRES: 'pxd-auth-expires'
}

export const useAuthStore = defineStore('auth', () => {
  // ========================================
  // Estado
  // ========================================
  
  const token = ref(localStorage.getItem(STORAGE_KEYS.TOKEN) || null)
  const user = ref(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null'))
  const expiresAt = ref(parseInt(localStorage.getItem(STORAGE_KEYS.EXPIRES) || '0'))
  const isLoading = ref(false)
  const error = ref(null)

  // ========================================
  // Getters
  // ========================================
  
  const isAuthenticated = computed(() => {
    if (!token.value || !expiresAt.value) return false
    return Date.now() < expiresAt.value
  })

  const userName = computed(() => {
    return user.value?.name || user.value?.email || 'Usuário'
  })

  const userInitials = computed(() => {
    if (!user.value?.name) return 'U'
    return user.value.name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  })

  const hasExpired = computed(() => {
    if (!expiresAt.value) return true
    return Date.now() >= expiresAt.value
  })

  // ========================================
  // Actions
  // ========================================
  
  /**
   * Realiza login do usuário
   * @param {Object} credentials - Credenciais de login
   * @param {string} credentials.email - Email do usuário
   * @param {string} credentials.password - Senha do usuário
   */
  async function login(credentials) {
    isLoading.value = true
    error.value = null

    try {
      // Chamada API mock - substituir por chamada real
      const response = await api.post('/auth/login', credentials)
      
      // Extrair dados da resposta
      const { access_token, refresh_token, user: userData, expires_in } = response.data
      
      // Armazenar token e dados
      setAuthData(access_token, refresh_token, userData, expires_in)
      
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.'
      return { 
        success: false, 
        error: error.value 
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Realiza logout do usuário
   */
  async function logout() {
    try {
      // Notificar backend do logout (opcional)
      if (token.value) {
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token.value}` }
        }).catch(() => {
          // Ignorar erros no logout do backend
        })
      }
    } finally {
      // Limpar dados locais
      clearAuthData()
    }
  }

  /**
   * Atualiza o token usando refresh token
   */
  async function refreshToken() {
    const refreshToken = localStorage.getItem('pxd-refresh-token')
    
    if (!refreshToken) {
      clearAuthData()
      return false
    }

    try {
      const response = await api.post('/auth/refresh', {
        refresh_token: refreshToken
      })
      
      const { access_token, expires_in } = response.data
      setAuthData(access_token, refreshToken, user.value, expires_in)
      
      return true
    } catch (err) {
      clearAuthData()
      return false
    }
  }

  /**
   * Atualiza dados do perfil do usuário
   */
  async function fetchUserProfile() {
    if (!token.value) return

    try {
      const response = await api.get('/auth/profile')
      user.value = response.data
      persistUserData(response.data)
    } catch (err) {
      console.error('Erro ao buscar perfil:', err)
    }
  }

  /**
   * Atualiza senha do usuário
   * @param {Object} passwords - Objetos com senhas
   * @param {string} passwords.currentPassword - Senha atual
   * @param {string} passwords.newPassword - Nova senha
   */
  async function updatePassword(passwords) {
    isLoading.value = true
    error.value = null

    try {
      await api.put('/auth/password', passwords)
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar senha'
      return { 
        success: false, 
        error: error.value 
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Atualiza dados do perfil
   * @param {Object} profileData - Dados do perfil para atualizar
   */
  async function updateProfile(profileData) {
    isLoading.value = true
    error.value = null

    try {
      const response = await api.put('/auth/profile', profileData)
      user.value = { ...user.value, ...response.data }
      persistUserData(user.value)
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar perfil'
      return { 
        success: false, 
        error: error.value 
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Solicita redefinição de senha
   * @param {string} email - Email do usuário
   */
  async function requestPasswordReset(email) {
    try {
      await api.post('/auth/password-reset', { email })
      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.message || 'Erro ao solicitar redefinição' 
      }
    }
  }

  // ========================================
  // Funções Auxiliares Internas
  // ========================================
  
  /**
   * Armazena dados de autenticação
   */
  function setAuthData(accessToken, refreshToken, userData, expiresIn) {
    token.value = accessToken
    user.value = userData
    
    // Calcular data de expiração (em segundos para milissegundos)
    const expiresAtValue = Date.now() + (expiresIn * 1000)
    expiresAt.value = expiresAtValue

    // Persistir no localStorage
    localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
    localStorage.setItem(STORAGE_KEYS.EXPIRES, expiresAtValue.toString())
    
    if (refreshToken) {
      localStorage.setItem('pxd-refresh-token', refreshToken)
    }

    // Configurar interceptor para incluir token nas requisições
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
  }

  /**
   * Limpa dados de autenticação
   */
  function clearAuthData() {
    token.value = null
    user.value = null
    expiresAt.value = 0
    error.value = null

    // Remover do localStorage
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    localStorage.removeItem(STORAGE_KEYS.EXPIRES)
    localStorage.removeItem('pxd-refresh-token')

    // Remover header de autorização
    delete api.defaults.headers.common['Authorization']
  }

  /**
   * Persiste dados do usuário no localStorage
   */
  function persistUserData(userData) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
  }

  /**
   * Inicializa o store ao carregar a aplicação
   */
  function initialize() {
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
    const storedExpires = localStorage.getItem(STORAGE_KEYS.EXPIRES)
    
    if (storedToken && storedExpires) {
      token.value = storedToken
      expiresAt.value = parseInt(storedExpires)
      user.value = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null')
      
      // Se token ainda é válido, configurar no axios
      if (isAuthenticated.value) {
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      } else {
        // Token expirado, tentar refresh
        refreshToken()
      }
    }
  }

  // ========================================
  // Inicialização
  // ========================================
  
  // Inicializar store quando criado
  initialize()

  // ========================================
  // Exportar
  // ========================================
  
  return {
    // Estado
    token,
    user,
    expiresAt,
    isLoading,
    error,
    
    // Getters
    isAuthenticated,
    userName,
    userInitials,
    hasExpired,
    
    // Actions
    login,
    logout,
    refreshToken,
    fetchUserProfile,
    updatePassword,
    updateProfile,
    requestPasswordReset,
    
    // Utilitários internos (exportados para testes)
    initialize,
    clearAuthData
  }
})

export default useAuthStore
