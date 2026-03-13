/**
 * PXD Solutions - Frontend Principal
 */

import { createApp, nextTick } from 'vue'
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
  theme: 'md',
  colors: {
    primary: '#1976D2',
    secondary: '#424242',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    light: '#F5F5F5',
    dark: '#212121'
  },
  darkTheme: false,
  language: 'pt-BR',
  touch: {
    tapHold: true,
    tapHoldDelay: 750,
    tapHoldPreventClicks: true
  },
  navbar: {
    scrollTopOnEnable: true
  },
  toolbar: {
    position: 'bottom'
  },
  view: {
    router: true,
    pushState: true,
    pushStateRoot: '/',
    pushStateSeparator: ''
  },
  preloader: {
    color: '#1976D2'
  }
}

// Criar instância da aplicação
const app = createApp(App)

// Criar store Pinia
const pinia = createPinia()
app.use(pinia)

// Instalar Framework7 Vue e guardar instância
const f7 = app.use(Framework7Vue, f7params)

// Guardar referência global
window.framework7 = f7

// Instalar router
app.use(router)

// Montar aplicação
app.mount('#app')

// Inicializar tema após mount
nextTick(() => {
  const savedTheme = localStorage.getItem('pxd-theme')
  if (savedTheme === 'dark') {
    f7.darkTheme = true
  } else if (savedTheme === 'light') {
    f7.darkTheme = false
  } else {
    f7.darkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
})

// Detectar modo escuro do sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (window.framework7 && !localStorage.getItem('pxd-theme')) {
    window.framework7.darkTheme = e.matches
  }
})

// Debug
if (import.meta.env.DEV) {
  window.app = app
}
