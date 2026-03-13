# PXD Solutions - Frontend

Plataforma SaaS de extração automática de documentos para empresas brasileiras.

## 📋 Visão Geral

Este é o frontend da aplicação PXD Solutions, desenvolvido com Vue.js 3 e Framework7 para proporcionar uma experiência nativa em dispositivos móveis. A aplicação permite que empresas de contabilidade, logística e outros setores enviem documentos para extração automática de dados.

### Funcionalidades

- ✅ **Autenticação** - Login seguro com JWT
- ✅ **Dashboard** - Visão geral de documentos processados
- ✅ **Upload** - Envio de documentos via drag-drop ou câmera
- ✅ **Extração** - Visualização de dados extraídos
- ✅ **Exportação** - Download em PDF, CSV, Excel
- ✅ **PWA** - Funciona offline e instalável
- ✅ **Tema Escuro** - Suporte a dark/light mode
- ✅ **Responsivo** - Otimizado para mobile

## 🚀 Tecnologias

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| Vue.js | 3.4+ | Framework progressivo |
| Framework7 | 8.3+ | UI mobile nativa |
| Vite | 5.2+ | Build tool rápido |
| Pinia | 2.1+ | Gerenciamento de estado |
| Vue Router | 4.3+ | Roteamento |
| Axios | 1.6+ | Cliente HTTP |
| Day.js | 1.11+ | Manipulação de datas |
| Vite PWA | 0.19+ | Progressive Web App |

## 📦 Instalação

### Pré-requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0

### Passos

1. **Clone o repositório** (ou navegue até a pasta):

```bash
cd frontend
```

2. **Instale as dependências**:

```bash
npm install
```

3. **Configure as variáveis de ambiente** (opcional):

Crie um arquivo `.env` na raiz do projeto:

```env
# URL da API (produção)
VITE_API_URL=https://api.pxdsolutions.com

# Usar mock API em desenvolvimento
VITE_USE_MOCK=true

# Base path para deploy
BASE_URL=/
```

4. **Inicie o servidor de desenvolvimento**:

```bash
npm run dev
```

5. **Acesse a aplicação**:

Abra seu navegador em `http://localhost:3000`

## 📱 Credenciais de Demo

Use as seguintes credenciais para testar a aplicação:

```
Email: demo@pxdsolutions.com
Senha: demo123
```

## 🛠️ Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Executa ESLint |

## 📁 Estrutura do Projeto

```
frontend/
├── index.html              # HTML principal
├── package.json            # Dependências e scripts
├── vite.config.js          # Configuração do Vite
├── public/
│   ├── manifest.json       # Manifesto PWA
│   └── *.png               # Ícones PWA
├── src/
│   ├── main.js             # Entry point da aplicação
│   ├── App.vue             # Componente raiz
│   ├── router.js           # Configuração de rotas
│   ├── styles/
│   │   └── app.css         # Estilos globais
│   ├── stores/
│   │   └── auth.js         # Pinia store de autenticação
│   ├── views/
│   │   ├── Login.vue       # Página de login
│   │   ├── Dashboard.vue   # Dashboard principal
│   │   ├── Upload.vue      # Upload de documentos
│   │   ├── DocumentDetail.vue  # Detalhes do documento
│   │   └── Settings.vue    # Configurações
│   ├── components/
│   │   ├── DocumentCard.vue    # Card de documento
│   │   ├── FileUpload.vue      # Componente de upload
│   │   └── StatusBar.vue       # Badge de status
│   └── services/
│       └── api.js          # Cliente API com mocks
└── README.md
```

## 🎨 Design System

### Cores da Marca

```css
--pxd-primary: #1976D2      /* Azul principal */
--pxd-primary-dark: #1565C0 /* Azul escuro */
--pxd-primary-light: #BBDEFB /* Azul claro */

--pxd-success: #4CAF50      /* Verde */
--pxd-warning: #FF9800      /* Laranja */
--pxd-danger: #F44336       /* Vermelho */
```

### Status de Documentos

| Status | Cor | Ícone |
|--------|-----|-------|
| Pendente | Laranja | 🕐 clock |
| Em Análise | Azul | 🔄 arrow_clockwise |
| Processado | Verde | ✅ checkmark_circle |
| Erro | Vermelho | ⚠️ exclamationmark_triangle |

## 🔌 Integração com Backend

### Endpoints da API

A aplicação está preparada para se conectar com os seguintes endpoints:

```javascript
// Autenticação
POST   /auth/login          // Login
POST   /auth/logout         // Logout
POST   /auth/refresh        // Refresh token
GET    /auth/profile        // Perfil do usuário
PUT    /auth/profile        // Atualizar perfil
PUT    /auth/password       // Alterar senha

// Documentos
GET    /documents           // Listar documentos
GET    /documents/:id       // Detalhes do documento
POST   /documents           // Upload de documento
DELETE /documents/:id       // Excluir documento
GET    /documents/:id/download  // Baixar documento
GET    /documents/:id/export    // Exportar dados

// Estatísticas
GET    /stats               // Estatísticas do usuário
```

### Substituindo Mocks por API Real

1. Atualize `VITE_API_URL` no arquivo `.env`
2. Defina `VITE_USE_MOCK=false`
3. Implemente os endpoints no backend
4. Ajuste o mapeamento de respostas em `src/services/api.js`

## 📲 PWA (Progressive Web App)

### Instalação como App

A aplicação pode ser instalada como um app nativo:

1. **Android (Chrome)**: Menu → "Adicionar à tela inicial"
2. **iOS (Safari)**: Compartilhar → "Adicionar à Tela de Início"
3. **Desktop**: Ícone de instalação na barra de endereço

### Funcionalidades Offline

- Cache de assets estáticos
- Cache de API responses (1 hora)
- Fila de uploads pendentes
- Sincronização em background

### Ícones PWA

Gere os ícones necessários (192x192 e 512x512) e coloque na pasta `public/`:

- `pwa-192x192.png`
- `pwa-512x512.png`
- `apple-touch-icon.png`
- `favicon.ico`

## 🔒 Segurança

### Autenticação

- JWT tokens com expiração
- Refresh token automático
- Armazenamento seguro no localStorage
- Interceptores para requisições

### Boas Práticas

- Validação de inputs no client e server
- Sanitização de dados
- HTTPS obrigatório em produção
- CORS configurado

## 🧪 Testes

### Testes Manuais

1. Login com credenciais de demo
2. Upload de documento PDF/Imagem
3. Verificação de status em tempo real
4. Download de documento processado
5. Exportação de dados (CSV/Excel)
6. Alternância de tema escuro/claro
7. Funcionalidade offline

### Testes Automatizados (Futuro)

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e
```

## 📊 Performance

### Otimizações Implementadas

- Code splitting por rota
- Lazy loading de componentes
- Cache de imagens e assets
- Compressão gzip/brotli
- Minificação de CSS/JS

### Métricas Alvo

| Métrica | Valor Alvo |
|---------|------------|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| TTI | < 3.5s |

## 🌐 Suporte a Navegadores

| Navegador | Versão Mínima |
|-----------|---------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |
| Samsung Internet | 14+ |

## 📝 Changelog

### v1.0.0 (2024-03-13)

- ✨ Lançamento inicial
- ✅ Login e autenticação
- ✅ Dashboard com estatísticas
- ✅ Upload de documentos
- ✅ Visualização de dados extraídos
- ✅ Configurações de usuário
- ✅ PWA com offline support
- ✅ Tema escuro/claro

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Contato

**PXD Solutions**

- Website: https://pxdsolutions.com
- Email: contato@pxdsolutions.com
- Suporte: suporte@pxdsolutions.com

---

<p align="center">
  © 2024 PXD Solutions. Todos os direitos reservados.
</p>
