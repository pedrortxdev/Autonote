/**
 * PXD Solutions - Frontend Principal
 * 
 * Aplicação Vue.js 3 + Framework7 para extração de documentos
 * 
 * @author PXD Solutions
 * @version 1.0.0
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Framework7 from 'framework7/lite-bundle'
import Framework7Vue from 'framework7-vue/bundle'
import App from './App.vue'
import router from './router'

// Import Framework7 styles
import 'framework7/css/bundle'

// Import custom app styles
import './styles/app.css'

// Configuração do Framework7
const f7params = {
  name: 'PXD Solutions',
  theme: 'md', // Material Design para Android/iOS
  colors: {
    primary: '#1976D2',
    secondary: '#424242',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    light: '#F5F5F5',
    dark: '#212121'
  },
  // Configurações de tema escuro/claro
  darkTheme: false,
  // Configurações de idioma
  language: 'pt-BR',
  // Configurações de touch
  touch: {
    tapHold: true,
    tapHoldDelay: 750,
    tapHoldPreventClicks: true
  },
  // Configurações de navegação
  navbar: {
    scrollTopOnEnable: true
  },
  // Configurações de toolbar
  toolbar: {
    position: 'bottom'
  },
  // Configurações de view
  view: {
    router: true,
    pushState: true,
    pushStateRoot: '/',
    pushStateSeparator: ''
  },
  // Configurações de preloader
  preloader: {
    color: '#1976D2'
  }
}

// Criar instância da aplicação
const app = createApp(App)

// Criar store Pinia
const pinia = createPinia()
app.use(pinia)

// Instalar Framework7 Vue
app.use(Framework7Vue, f7params)

// Instalar router
app.use(router)

// Montar aplicação quando DOM estiver pronto
app.mount('#app')

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('SW registered:', registration.scope)
        
        // Verificar atualizações
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão disponível
              if (confirm('Nova versão disponível! Deseja atualizar?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' })
                window.location.reload()
              }
            }
          })
        })
      })
      .catch(error => {
        console.log('SW registration failed:', error)
      })
  })
}

// Detectar modo escuro do sistema
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
mediaQuery.addEventListener('change', e => {
  const f7 = window.framework7
  if (f7) {
    f7.darkTheme = e.matches
  }
})

// Exportar instância do app para debug
if (import.meta.env.DEV) {
  window.app = app
  window.f7 = window.framework7
}
