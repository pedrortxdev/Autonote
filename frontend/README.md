# PXD Solutions - Frontend

Plataforma SaaS de extração automática de documentos para empresas brasileiras.

## 🚀 Deploy na Vercel

### Passo a passo:

1. **Faça push do código para o GitHub**
   ```bash
   git add .
   git commit -m "Initial commit - PXD Solutions Frontend"
   git push origin main
   ```

2. **Conecte na Vercel**
   - Acesse https://vercel.com
   - Clique em "Add New Project"
   - Importe seu repositório do GitHub

3. **Configure as variáveis de ambiente** (opcional)
   - `VITE_API_URL`: URL do seu backend
   - `VITE_USE_MOCK`: `true` para usar mocks, `false` para backend real

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde o build (~2-3 minutos)
   - Seu site estará online!

### URL de produção:
```
https://pxd-solutions-frontend.vercel.app
```

## 🛠️ Desenvolvimento Local

### Instalar dependências:
```bash
npm install
```

### Rodar em desenvolvimento:
```bash
npm run dev
```

Acesse: `http://localhost:3000`

### Build de produção:
```bash
npm run build
npm run preview
```

## 📱 Credenciais de Demo

- **Email:** demo@pxdsolutions.com
- **Senha:** demo123

## 📁 Estrutura do Projeto

```
frontend/
├── public/              # Assets estáticos
├── src/
│   ├── components/      # Componentes Vue reutilizáveis
│   ├── views/           # Páginas da aplicação
│   ├── stores/          # Estado global (Pinia)
│   ├── services/        # API e serviços externos
│   ├── styles/          # Estilos globais
│   ├── App.vue          # Componente raiz
│   ├── main.js          # Entry point
│   └── router.js        # Rotas da aplicação
├── index.html
├── package.json
├── vite.config.js
└── vercel.json          # Configuração Vercel
```

## 🧰 Tech Stack

- **Vue.js 3** - Framework progressivo
- **Framework7** - UI nativa para mobile
- **Pinia** - Gerenciamento de estado
- **Vue Router** - Navegação
- **Axios** - Cliente HTTP
- **Vite** - Build tool
- **PWA** - Progressive Web App

## ✨ Features

- ✅ UI nativa para iOS e Android
- ✅ PWA (funciona offline)
- ✅ Dark/Light mode automático
- ✅ Upload de documentos com progresso
- ✅ Extração de dados com OCR
- ✅ Export para Excel/CSV
- ✅ WebSocket para atualizações em tempo real
- ✅ Totalmente em Português (BR)

## 📄 Licença

MIT - PXD Solutions © 2024
