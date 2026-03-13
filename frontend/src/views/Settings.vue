<template>
  <f7-page name="settings">
    <f7-navbar large transparent>
      <f7-nav-left>
        <f7-link icon-f7="chevron_left" back />
      </f7-nav-left>
      <f7-nav-title>Configurações</f7-nav-title>
    </f7-navbar>

    <f7-page-content class="settings-content">
      <!-- Perfil do Usuário -->
      <div class="profile-header">
        <div class="avatar-container">
          <div class="avatar" @click="changeAvatar">
            <span v-if="user?.avatar">
              <img :src="user.avatar" alt="Avatar" />
            </span>
            <span v-else>{{ userInitials }}</span>
          </div>
          <f7-button
            class="edit-avatar-btn"
            icon-f7="camera"
            small
            round
            fill
            color="primary"
            @click="changeAvatar"
          />
        </div>
        <h2 class="user-name">{{ user?.name || 'Carregando...' }}</h2>
        <p class="user-email">{{ user?.email }}</p>
        <p class="user-company">{{ user?.company }}</p>
      </div>

      <!-- Lista de Configurações -->
      <f7-list inset outline>
        <f7-list-item divider title="Conta" />
        
        <f7-list-item
          title="Editar Perfil"
          subtitle="Nome, email, telefone"
          link
          @click="editProfile"
        >
          <template #after>
            <f7-icon color="gray">chevron_right</f7-icon>
          </template>
        </f7-list-item>

        <f7-list-item
          title="Alterar Senha"
          link
          @click="changePassword"
        >
          <template #after>
            <f7-icon color="gray">chevron_right</f7-icon>
          </template>
        </f7-list-item>

        <f7-list-item
          title="Plano e Assinatura"
          :subtitle="planName"
          link
          @click="viewPlan"
        >
          <template #after>
            <f7-icon color="gray">chevron_right</f7-icon>
          </template>
        </f7-list-item>
      </f7-list>

      <f7-list inset outline>
        <f7-list-item divider title="Aparência" />
        
        <f7-list-item
          title="Tema Escuro"
          @change="toggleDarkTheme"
        >
          <template #after>
            <f7-toggle :checked="isDarkTheme" />
          </template>
        </f7-list-item>

        <f7-list-item
          title="Idioma"
          :subtitle="currentLanguage"
          link
          @click="changeLanguage"
        >
          <template #after>
            <f7-icon color="gray">chevron_right</f7-icon>
          </template>
        </f7-list-item>
      </f7-list>

      <f7-list inset outline>
        <f7-list-item divider title="Notificações" />
        
        <f7-list-item
          title="Notificações Push"
          subtitle="Receber alertas de processamento"
          @change="togglePushNotifications"
        >
          <template #after>
            <f7-toggle :checked="pushNotifications" />
          </template>
        </f7-list-item>

        <f7-list-item
          title="Email de Resumo"
          subtitle="Receber resumo semanal"
          @change="toggleEmailSummary"
        >
          <template #after>
            <f7-toggle :checked="emailSummary" />
          </template>
        </f7-list-item>
      </f7-list>

      <f7-list inset outline>
        <f7-list-item divider title="Sobre" />
        
        <f7-list-item
          title="Versão do App"
          :subtitle="appVersion"
        />

        <f7-list-item
          title="Termos de Uso"
          link
          @click="openTerms"
        >
          <template #after>
            <f7-icon color="gray">chevron_right</f7-icon>
          </template>
        </f7-list-item>

        <f7-list-item
          title="Política de Privacidade"
          link
          @click="openPrivacy"
        >
          <template #after>
            <f7-icon color="gray">chevron_right</f7-icon>
          </template>
        </f7-list-item>

        <f7-list-item
          title="Ajuda e Suporte"
          link
          @click="openSupport"
        >
          <template #after>
            <f7-icon color="gray">chevron_right</f7-icon>
          </template>
        </f7-list-item>
      </f7-list>

      <!-- Botão de Logout -->
      <div class="logout-section">
        <f7-button
          large
          fill="outline"
          round
          color="red"
          @click="confirmLogout"
        >
          <f7-icon slot="icon" f7="square_arrow_right" />
          Sair da Conta
        </f7-button>
      </div>

      <!-- Footer -->
      <div class="settings-footer">
        <p>© 2024 PXD Solutions</p>
        <p class="footer-subtitle">Extração Inteligente de Documentos</p>
      </div>
    </f7-page-content>

    <!-- Toolbar Inferior -->
    <f7-toolbar tabbar labels bottom>
      <f7-link
        tab-link="#dashboard"
        icon-f7="square_grid"
        text="Dashboard"
        @click="$router.push('/dashboard')"
      />
      <f7-link
        tab-link="#upload"
        icon-f7="cloud_upload"
        text="Enviar"
        @click="$router.push('/upload')"
      />
      <f7-link
        active
        tab-link="#settings"
        icon-f7="person_circle"
        text="Perfil"
      />
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

// Store
const authStore = useAuthStore()

// Injeções
const showToast = inject('showToast')
const showLoading = inject('showLoading')
const showDialog = inject('showDialog')

// Estado
const user = ref(authStore.user)
const isDarkTheme = ref(false)
const pushNotifications = ref(true)
const emailSummary = ref(false)

// Computed
const userInitials = computed(() => authStore.userInitials)
const planName = computed(() => 'Plano Profissional')
const appVersion = computed(() => '1.0.0')
const currentLanguage = computed(() => 'Português (Brasil)')

// Toggle tema escuro
const toggleDarkTheme = () => {
  isDarkTheme.value = !isDarkTheme.value
  
  const f7 = window.framework7
  f7.darkTheme = isDarkTheme.value
  
  // Salvar preferência
  localStorage.setItem('pxd-theme', isDarkTheme.value ? 'dark' : 'light')
  
  showToast(isDarkTheme.value ? 'Tema escuro ativado' : 'Tema claro ativado')
}

// Toggle notificações push
const togglePushNotifications = () => {
  pushNotifications.value = !pushNotifications.value
  
  if (pushNotifications.value && 'Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showToast('Notificações ativadas')
      } else {
        pushNotifications.value = false
        showToast('Permissão de notificação negada')
      }
    })
  }
}

// Toggle resumo por email
const toggleEmailSummary = () => {
  emailSummary.value = !emailSummary.value
  showToast(emailSummary.value ? 'Resumo semanal ativado' : 'Resumo semanal desativado')
}

// Editar perfil
const editProfile = () => {
  const f7 = window.framework7
  
  f7.dialog.prompt(
    'Digite seu nome completo:',
    'Editar Perfil',
    async (name) => {
      if (name && name !== user.value?.name) {
        showLoading(true)
        try {
          await authStore.updateProfile({ name })
          user.value = authStore.user
          showToast('Perfil atualizado')
        } catch (error) {
          showToast('Erro ao atualizar perfil')
        } finally {
          showLoading(false)
        }
      }
    },
    null,
    user.value?.name
  )
}

// Alterar senha
const changePassword = () => {
  const f7 = window.framework7
  
  f7.dialog.prompt(
    'Digite sua nova senha:',
    'Alterar Senha',
    async (newPassword) => {
      if (newPassword && newPassword.length >= 6) {
        showLoading(true)
        try {
          const result = await authStore.updatePassword({
            currentPassword: '', // Em produção, pedir senha atual
            newPassword
          })
          
          if (result.success) {
            showToast('Senha alterada com sucesso')
          } else {
            showToast(result.error || 'Erro ao alterar senha')
          }
        } catch (error) {
          showToast('Erro ao alterar senha')
        } finally {
          showLoading(false)
        }
      } else if (newPassword) {
        showToast('Senha deve ter pelo menos 6 caracteres')
      }
    }
  )
}

// Ver plano
const viewPlan = () => {
  const f7 = window.framework7
  
  f7.alert(
    `
    <div style="text-align: center; padding: 20px;">
      <h3 style="margin: 0 0 16px;">Plano Profissional</h3>
      <p style="color: var(--f7-label-color); margin: 0 0 24px;">
        500 documentos/mês<br>
        Extração ilimitada<br>
        Suporte prioritário
      </p>
      <f7-button fill round color="primary">
        Upgrade para Enterprise
      </f7-button>
    </div>
    `,
    () => {}
  )
}

// Mudar avatar
const changeAvatar = () => {
  const f7 = window.framework7
  
  f7.actions.open({
    buttons: [
      [
        {
          text: 'Selecionar Foto',
          onClick: () => {
            // Em produção, abrir seletor de imagem
            showToast('Funcionalidade em desenvolvimento')
          }
        },
        {
          text: 'Tirar Foto',
          onClick: () => {
            showToast('Funcionalidade em desenvolvimento')
          }
        }
      ],
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

// Mudar idioma
const changeLanguage = () => {
  const f7 = window.framework7
  
  f7.actions.open({
    buttons: [
      [
        {
          text: 'Português (Brasil)',
          onClick: () => showToast('Idioma já está em Português')
        },
        {
          text: 'English',
          onClick: () => showToast('Inglês em breve')
        },
        {
          text: 'Español',
          onClick: () => showToast('Espanhol em breve')
        }
      ],
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

// Abrir termos
const openTerms = () => {
  const f7 = window.framework7
  
  f7.popup.create({
    content: `
      <div class="popup-inner">
        <div class="block">
          <h2>Termos de Uso</h2>
          <p>Última atualização: 01/01/2024</p>
          <p>Bem-vindo à PXD Solutions. Ao usar nosso serviço, você concorda com estes termos...</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        </div>
      </div>
    `,
    swipeToClose: true
  }).open()
}

// Abrir privacidade
const openPrivacy = () => {
  const f7 = window.framework7
  
  f7.popup.create({
    content: `
      <div class="popup-inner">
        <div class="block">
          <h2>Política de Privacidade</h2>
          <p>Última atualização: 01/01/2024</p>
          <p>Sua privacidade é importante para nós. Esta política explica como coletamos e usamos seus dados...</p>
          <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>
      </div>
    `,
    swipeToClose: true
  }).open()
}

// Abrir suporte
const openSupport = () => {
  const f7 = window.framework7
  
  f7.dialog.prompt(
    'Descreva sua dúvida ou problema:',
    'Fale Conosco',
    (message) => {
      if (message) {
        // Em produção, enviar para backend
        showToast('Mensagem enviada! Respondemos em até 24h.')
      }
    }
  )
}

// Confirmar logout
const confirmLogout = () => {
  const f7 = window.framework7
  
  f7.dialog.confirm(
    'Tem certeza que deseja sair?',
    'Sair da Conta',
    async () => {
      showLoading(true)
      try {
        await authStore.logout()
        f7.router.navigate('/login/', { reloadAll: true })
      } catch (error) {
        showToast('Erro ao sair')
        showLoading(false)
      }
    }
  )
}

// Lifecycle
onMounted(() => {
  // Carregar preferências salvas
  const savedTheme = localStorage.getItem('pxd-theme')
  isDarkTheme.value = savedTheme === 'dark' || 
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  // Carregar preferências de notificação
  const savedNotifications = localStorage.getItem('pxd-push-notifications')
  if (savedNotifications !== null) {
    pushNotifications.value = savedNotifications === 'true'
  }
  
  const savedEmail = localStorage.getItem('pxd-email-summary')
  if (savedEmail !== null) {
    emailSummary.value = savedEmail === 'true'
  }
})
</script>

<style scoped>
.settings-content {
  padding: 16px;
  padding-bottom: 80px; /* Espaço para toolbar */
}

/* Profile Header */
.profile-header {
  text-align: center;
  padding: 32px 16px;
  background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);
  border-radius: 16px;
  margin-bottom: 24px;
  color: white;
}

.avatar-container {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 600;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.edit-avatar-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
}

.user-name {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.user-email {
  font-size: 14px;
  opacity: 0.9;
  margin: 0 0 4px 0;
}

.user-company {
  font-size: 13px;
  opacity: 0.7;
  margin: 0;
}

/* Lists */
:deep(.list) {
  margin: 16px 0;
}

/* Logout Section */
.logout-section {
  margin: 32px 0;
}

/* Footer */
.settings-footer {
  text-align: center;
  padding: 24px 16px;
  color: var(--f7-label-color);
  font-size: 12px;
}

.settings-footer p {
  margin: 4px 0;
}

.footer-subtitle {
  opacity: 0.7;
}

/* Popup Inner */
:deep(.popup-inner) {
  height: 100%;
  overflow-y: auto;
}

:deep(.popup-inner .block) {
  padding: 20px;
}

:deep(.popup-inner h2) {
  margin-top: 0;
}
</style>
