<template>
  <f7-page name="login" class="login-page">
    <f7-page-content class="no-padding">
      <div class="login-container">
        <!-- Logo e Header -->
        <div class="login-header">
          <div class="logo-container">
            <div class="logo-icon">
              <f7-icon size="48" color="white">doc_text</f7-icon>
            </div>
            <h1 class="logo-title">PXD Solutions</h1>
            <p class="logo-subtitle">Extração Inteligente de Documentos</p>
          </div>
        </div>

        <!-- Formulário de Login -->
        <div class="login-form">
          <f7-list no-hairlines-md>
            <f7-list-input
              type="email"
              name="email"
              label="Email"
              floating-label
              placeholder="seu@email.com.br"
              v-model="form.email"
              :error="errors.email"
              @input="clearError('email')"
              clear-button
            >
              <template #start>
                <f7-icon color="gray">email</f7-icon>
              </template>
            </f7-list-input>

            <f7-list-input
              type="password"
              name="password"
              label="Senha"
              floating-label
              placeholder="Sua senha"
              v-model="form.password"
              :error="errors.password"
              @input="clearError('password')"
              clear-button
              @keyup.enter="handleLogin"
            >
              <template #start>
                <f7-icon color="gray">lock</f7-icon>
              </template>
              <template #end>
                <f7-button
                  icon-f7="eye_slash"
                  icon-color="gray"
                  small
                  @click="togglePassword"
                />
              </template>
            </f7-list-input>
          </f7-list>

          <!-- Opções de Login -->
          <div class="login-options">
            <f7-checkbox
              name="remember"
              label="Lembrar de mim"
              v-model="form.remember"
            />
            <f7-button
              class="forgot-password"
              fill="clear"
              size="small"
              color="primary"
              @click="showForgotPassword"
            >
              Esqueceu a senha?
            </f7-button>
          </div>

          <!-- Botão de Login -->
          <f7-button
            large
            fill
            round
            color="primary"
            class="login-button"
            :disabled="isLoading || !isFormValid"
            @click="handleLogin"
          >
            <span v-if="!isLoading">Entrar</span>
            <span v-else>
              <f7-preloader color="white" :size="20" />
            </span>
          </f7-button>

          <!-- Mensagem de Erro -->
          <div v-if="loginError" class="error-message">
            <f7-icon>exclamationmark_triangle</f7-icon>
            <span>{{ loginError }}</span>
          </div>

          <!-- Informações de Demo -->
          <div class="demo-info">
            <p class="demo-title">Credenciais de Demonstração:</p>
            <p class="demo-credentials">
              Email: <strong>demo@pxdsolutions.com</strong><br>
              Senha: <strong>demo123</strong>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="login-footer">
          <p class="footer-text">
            © 2024 PXD Solutions. Todos os direitos reservados.
          </p>
          <div class="footer-links">
            <f7-button fill="clear" size="small" color="gray" @click="openTerms">
              Termos de Uso
            </f7-button>
            <f7-button fill="clear" size="small" color="gray" @click="openPrivacy">
              Privacidade
            </f7-button>
          </div>
        </div>
      </div>
    </f7-page-content>
  </f7-page>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Router
const router = useRouter()

// Store
const authStore = useAuthStore()

// Injeções globais
const showToast = inject('showToast')
const showLoading = inject('showLoading')

// Estado do formulário
const form = ref({
  email: '',
  password: '',
  remember: false
})

const showPassword = ref(false)
const isLoading = ref(false)
const loginError = ref('')
const errors = ref({
  email: '',
  password: ''
})

// Validação do formulário
const isFormValid = computed(() => {
  return form.value.email && form.value.password
})

// Toggle visibilidade da senha
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

// Limpar erro de campo
const clearError = (field) => {
  errors.value[field] = ''
  loginError.value = ''
}

// Validar formulário
const validateForm = () => {
  let isValid = true
  errors.value = { email: '', password: '' }

  // Validar email
  if (!form.value.email) {
    errors.value.email = 'Email é obrigatório'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Email inválido'
    isValid = false
  }

  // Validar senha
  if (!form.value.password) {
    errors.value.password = 'Senha é obrigatória'
    isValid = false
  } else if (form.value.password.length < 6) {
    errors.value.password = 'Senha deve ter pelo menos 6 caracteres'
    isValid = false
  }

  return isValid
}

// Handler de login
const handleLogin = async () => {
  // Validar formulário
  if (!validateForm()) {
    return
  }

  isLoading.value = true
  loginError.value = ''

  try {
    const result = await authStore.login({
      email: form.value.email,
      password: form.value.password
    })

    if (result.success) {
      showToast('Login realizado com sucesso!', {
        position: 'top',
        closeButton: false
      })
      
      // Salvar preferência de "lembrar"
      if (form.value.remember) {
        localStorage.setItem('pxd-remember-me', 'true')
      } else {
        localStorage.removeItem('pxd-remember-me')
      }
      
      // Redirecionar para dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } else {
      loginError.value = result.error
    }
  } catch (error) {
    loginError.value = 'Erro ao conectar com o servidor. Tente novamente.'
    console.error('Login error:', error)
  } finally {
    isLoading.value = false
  }
}

// Mostrar modal de recuperação de senha
const showForgotPassword = () => {
  const f7 = window.framework7
  
  f7.dialog.prompt(
    'Digite seu email para receber as instruções de recuperação de senha:',
    'Recuperar Senha',
    async (email) => {
      if (email) {
        showLoading(true)
        try {
          const result = await authStore.requestPasswordReset(email)
          if (result.success) {
            showToast('Instruções enviadas para seu email!', {
              position: 'top',
              closeButton: false
            })
          } else {
            showToast(result.error || 'Erro ao enviar email', {
              position: 'top'
            })
          }
        } catch (error) {
          showToast('Erro ao processar solicitação', { position: 'top' })
        } finally {
          showLoading(false)
        }
      }
    },
    () => {
      // Cancelado
    }
  )
}

// Abrir termos de uso
const openTerms = () => {
  const f7 = window.framework7
  f7.popup.open('.popup-terms', { swipeToClose: true })
}

// Abrir política de privacidade
const openPrivacy = () => {
  const f7 = window.framework7
  f7.popup.open('.popup-privacy', { swipeToClose: true })
}

// Lifecycle
// Pre-fill email se "lembrar" estava marcado
if (localStorage.getItem('pxd-remember-me')) {
  form.value.email = localStorage.getItem('pxd-last-email') || ''
  form.value.remember = true
}
</script>

<style scoped>
.login-page {
  background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);
}

.login-container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

/* Header */
.login-header {
  flex: 0 0 auto;
  padding: 40px 0;
  text-align: center;
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
}

.logo-title {
  color: white;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px 0;
  letter-spacing: -0.5px;
}

.logo-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin: 0;
}

/* Form */
.login-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
}

.login-form :deep(.list) {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  margin: 0 0 16px 0;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 4px;
}

.login-options :deep(.checkbox) {
  color: white;
}

.forgot-password {
  color: white !important;
}

.login-button {
  margin-bottom: 16px;
  --f7-button-bg-color: white;
  --f7-button-text-color: #1976D2;
}

.login-button:disabled {
  opacity: 0.7;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(244, 67, 54, 0.2);
  border-radius: 8px;
  color: #ffcdd2;
  margin-bottom: 16px;
  font-size: 14px;
}

.error-message .f7-icon {
  font-size: 20px;
}

/* Demo Info */
.demo-info {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.demo-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.demo-credentials {
  color: white;
  font-size: 13px;
  margin: 0;
  line-height: 1.6;
}

.demo-credentials strong {
  color: #BBDEFB;
}

/* Footer */
.login-footer {
  flex: 0 0 auto;
  padding: 24px 0;
  text-align: center;
}

.footer-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin: 0 0 12px 0;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 8px;
}

/* Ajustes para tema escuro */
:global(.theme-dark) .login-form :deep(.list) {
  background: #1E1E1E;
}
</style>
