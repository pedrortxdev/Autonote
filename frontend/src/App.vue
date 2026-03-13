<template>
  <div id="app">
    <!-- Views Container -->
    <f7-views>
      <f7-view
        id="main-view"
        main
        :url="'/'"
        :router="true"
      >
        <!-- As rotas são definidas no router.js -->
      </f7-view>
    </f7-views>

    <!-- Toast Global para notificações -->
    <f7-toast
      id="global-toast"
      :opened="toastOpened"
      :text="toastMessage"
      :close-button="toastCloseButton"
      :position="toastPosition"
      @toast:closed="onToastClosed"
    />

    <!-- Preloader Global -->
    <f7-preloader
      v-if="globalLoading"
      id="global-preloader"
      :backdrop="true"
      :color="'primary'"
    />

    <!-- Dialog de Confirmação Global -->
    <f7-dialog
      id="global-dialog"
      :opened="dialogOpened"
      :title="dialogTitle"
      :text="dialogText"
      :buttons="dialogButtons"
      @dialog:closed="onDialogClosed"
    />
  </div>
</template>

<script setup>
import { ref, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Stores
const authStore = useAuthStore()

// Router
const route = useRoute()

// Estado do Toast Global
const toastOpened = ref(false)
const toastMessage = ref('')
const toastCloseButton = ref(true)
const toastPosition = ref('bottom')

// Estado do Preloader Global
const globalLoading = ref(false)

// Estado do Dialog Global
const dialogOpened = ref(false)
const dialogTitle = ref('')
const dialogText = ref('')
const dialogButtons = ref([])

// Prover métodos globais para componentes filhos
provide('showToast', (message, options = {}) => {
  toastMessage.value = message
  toastCloseButton.value = options.closeButton ?? true
  toastPosition.value = options.position ?? 'bottom'
  toastOpened.value = true

  // Auto-fechar após 3 segundos se não tiver botão de fechar
  if (!toastCloseButton.value) {
    setTimeout(() => {
      toastOpened.value = false
    }, 3000)
  }
})

provide('showLoading', (show = true) => {
  globalLoading.value = show
})

provide('showDialog', (title, text, buttons = [{ text: 'OK', bold: true }]) => {
  dialogTitle.value = title
  dialogText.value = text
  dialogButtons.value = buttons.map(btn => ({
    ...btn,
    onClick: () => {
      dialogOpened.value = false
      if (btn.onClick) btn.onClick()
    }
  }))
  dialogOpened.value = true
})

// Handlers de fechamento
const onToastClosed = () => {
  toastMessage.value = ''
}

const onDialogClosed = () => {
  dialogTitle.value = ''
  dialogText.value = ''
  dialogButtons.value = []
}

// Watch para mudanças de rota
watch(route, (to, from) => {
  // Verificar autenticação em rotas protegidas
  const requiresAuth = to.meta.requiresAuth ?? true

  if (requiresAuth && !authStore.isAuthenticated) {
    // Redirecionar para login se não estiver autenticado
    if (to.path !== '/login') {
      if (window.framework7?.router) {
        window.framework7.router.navigate('/login/')
      }
    }
  }

  // Fechar loading ao mudar de rota
  globalLoading.value = false
})
</script>

<style scoped>
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
