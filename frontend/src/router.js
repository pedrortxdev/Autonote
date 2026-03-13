/**
 * Router Configuration
 * 
 * Define todas as rotas da aplicação com metadados de autenticação
 */

import { createRouter, createWebHistory } from 'vue-router'

// Views
import Login from '@/views/Login.vue'
import Dashboard from '@/views/Dashboard.vue'
import Upload from '@/views/Upload.vue'
import DocumentDetail from '@/views/DocumentDetail.vue'
import Settings from '@/views/Settings.vue'

// Rotas da aplicação
const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      requiresAuth: false,
      title: 'Login',
      hideNavbar: true,
      hideToolbar: true
    }
  },
  {
    path: '/dashboard/',
    name: 'dashboard',
    component: Dashboard,
    meta: {
      requiresAuth: true,
      title: 'Dashboard',
      icon: 'square_grid',
      badge: null
    }
  },
  {
    path: '/upload/',
    name: 'upload',
    component: Upload,
    meta: {
      requiresAuth: true,
      title: 'Novo Documento',
      icon: 'cloud_upload',
      hideToolbar: false
    }
  },
  {
    path: '/document/:id/',
    name: 'document-detail',
    component: DocumentDetail,
    props: true,
    meta: {
      requiresAuth: true,
      title: 'Detalhes do Documento',
      icon: 'description',
      parent: 'dashboard'
    }
  },
  {
    path: '/settings/',
    name: 'settings',
    component: Settings,
    meta: {
      requiresAuth: true,
      title: 'Configurações',
      icon: 'settings',
      hideToolbar: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/dashboard'
  }
]

// Criar router
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Guard de navegação para autenticação
router.beforeEach((to, from, next) => {
  // Obter estado de autenticação do localStorage
  const token = localStorage.getItem('pxd-auth-token')
  const isAuthenticated = !!token
  
  // Verificar se a rota requer autenticação
  const requiresAuth = to.meta.requiresAuth ?? true
  
  if (requiresAuth && !isAuthenticated) {
    // Redirecionar para login
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    // Se já está logado e tenta acessar login, redirecionar para dashboard
    next('/dashboard')
  } else {
    next()
  }
})

// Guard para atualizar título da página
router.afterEach((to, from) => {
  const title = to.meta.title ?? 'PXD Solutions'
  document.title = `${title} - PXD Solutions`
  
  // Atualizar navbar se existir
  const navbar = document.querySelector('.navbar .title')
  if (navbar) {
    navbar.textContent = title
  }
})

export default router
