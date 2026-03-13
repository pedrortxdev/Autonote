# Autonote Frontend

NextJS 14+ PWA frontend for document capture and processing. Built with a "Dumb Client" architecture - handles only UI and sends files to the Go backend.

## 🚀 Features

- **NextJS 14+ App Router** - Modern React framework with server components
- **PWA Ready** - Installable on mobile devices, works offline-capable structure
- **Mobile-First Design** - Optimized for touch, feels like a native app
- **Camera Integration** - Uses `capture="environment"` to force rear camera
- **Native FormData Uploads** - Files sent as multipart/form-data (NOT Base64)
- **Silent Polling** - 3-second interval status checks without UI noise
- **Anti-Stress Design** - Calming colors, smooth animations, reduced eye strain
- **Accessibility** - WCAG 2.1 AA compliant, keyboard navigation, ARIA labels
- **TypeScript** - Full type safety throughout

## 📁 Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout with PWA meta tags
│   ├── page.tsx            # Login page
│   ├── globals.css         # Global styles with Tailwind
│   └── dashboard/
│       └── page.tsx        # Main capture interface
├── components/
│   ├── CaptureButton.tsx   # Large camera button (50% screen)
│   ├── StatusPoller.tsx    # Silent polling logic + status display
│   ├── ResultDisplay.tsx   # Extracted data with confirmation
│   └── Header.tsx          # App header with logout
├── lib/
│   └── api.ts              # API client (FormData uploads)
├── types/
│   └── index.ts            # TypeScript definitions
├── public/
│   ├── manifest.json       # PWA manifest
│   └── icon-*.png          # App icons (generate these)
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── postcss.config.js
```

## 🛠️ Setup

### Prerequisites

- Node.js 18.17 or later
- Go backend running (see `/backend` directory)

### Installation

```bash
cd frontend

# Install dependencies
npm install

# Copy environment example
cp .env.local.example .env.local
```

### Environment Variables

Create `.env.local`:

```env
# Backend API URL
# For local development:
NEXT_PUBLIC_API_URL=http://localhost:8080

# For production (Vercel):
# NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

### Development

```bash
# Run development server
npm run dev

# Open http://localhost:3000
```

### Build

```bash
# Production build
npm run build

# Start production server
npm start
```

## 🔌 Backend Integration

### Required Backend Endpoints

The frontend expects these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/login` | Authenticate with company code |
| `POST` | `/api/documents/upload` | Upload document (multipart/form-data) |
| `GET` | `/api/tasks/:taskId` | Get task status for polling |
| `POST` | `/api/tasks/:taskId/confirm` | Confirm and send to system |

### Expected Request/Response Formats

#### Login
```json
// POST /api/login
{ "codigoEmpresa": "ABC123" }

// Response
{
  "success": true,
  "token": "jwt_token_here",
  "empresaId": "ABC123"
}
```

#### Upload
```
// POST /api/documents/upload (multipart/form-data)
FormData {
  file: File (image/* or application/pdf),
  empresaId: string
}

// Response
{
  "success": true,
  "taskId": "uuid_here",
  "documentId": "uuid_here",
  "message": "Upload successful"
}
```

#### Task Status
```
// GET /api/tasks/:taskId

// Response
{
  "id": "uuid",
  "status": "pending" | "processing" | "completed" | "failed",
  "progress": 0-100,
  "result": {
    "summary": "Fornecedor: Bosch, Valor: R$ 450",
    "extractedData": {
      "fornecedor": "Bosch",
      "valor": "R$ 450,00",
      "data": "2024-01-15"
    },
    "confidence": 0.95
  },
  "error": "error message if failed"
}
```

#### Confirm
```
// POST /api/tasks/:taskId/confirm

// Response
{ "success": true }
```

### CORS Configuration

Ensure your Go backend allows CORS from your frontend origin:

```go
// Example for Go backend
func enableCors(w *http.ResponseWriter, req *http.Request) {
    (*w).Header().Set("Access-Control-Allow-Origin", "*")
    (*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    (*w).Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}
```

## 📱 PWA Configuration

### manifest.json

Already configured in `/public/manifest.json`. Customize:
- `name` and `short_name` for your app
- `theme_color` to match your brand
- Icons for home screen

### Icons

Generate PWA icons (required for installation):

```bash
# Recommended: Use https://realfavicongenerator.net/
# Or use any icon generator to create:
# - icon-192.png (192x192)
# - icon-512.png (512x512)
```

Place generated icons in `/public/`.

### Service Worker

For full offline support, create `/public/sw.js`:

```javascript
// Basic service worker for caching
const CACHE_NAME = 'autonote-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/dashboard',
        '/manifest.json',
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
```

## 🚢 Deployment to Vercel

### 1. Push to Git

```bash
git add frontend/
git commit -m "Add NextJS frontend"
git push
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Set **Root Directory** to `frontend`
5. Configure environment variables:
   - `NEXT_PUBLIC_API_URL` = Your backend API URL

### 3. Deploy

Click "Deploy" - Vercel will automatically:
- Detect NextJS
- Install dependencies
- Build the app
- Deploy globally

### 4. Custom Domain (Optional)

In Vercel dashboard:
1. Go to project settings
2. Add custom domain
3. Configure DNS as instructed

### Environment Variables for Vercel

| Variable | Development | Production |
|----------|-------------|------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | `https://api.yourdomain.com` |

## 🎨 Design System

### Colors (Anti-Stress Palette)

```javascript
// tailwind.config.js
colors: {
  primary: { /* Trustworthy blue */ },
  success: { /* Calm green */ },
  neutral: { /* Soft grays */ },
}
```

### Typography

- Font: Inter (optimized for screens)
- Base size: 16px (1rem)
- Scale: 1rem → 1.125rem → 1.25rem → 1.5rem → 1.875rem

### Spacing

- 8px grid system
- Touch targets: minimum 44x44px (WCAG)
- Consistent padding: 4, 6, 8, 12, 16, 24, 32

### Animations

- Duration: 200-400ms
- Easing: `ease-out` for natural feel
- Purpose: Only animate meaningful state changes

## ♿ Accessibility

- ✅ Semantic HTML throughout
- ✅ ARIA labels on interactive elements
- ✅ Focus visible states
- ✅ Color contrast WCAG AA
- ✅ Keyboard navigation
- ✅ Screen reader announcements (`aria-live`)
- ✅ Touch targets 44x44px minimum

## 📊 Performance

- Code splitting via NextJS App Router
- Lazy loading for heavy components
- Optimized font loading (no FOUT)
- Minimal JavaScript bundle
- CSS purging via Tailwind

## 🔧 Troubleshooting

### Camera not opening on mobile

Ensure:
1. Using HTTPS (required for camera access)
2. `capture="environment"` attribute is present
3. Browser supports media capture

### Upload fails

Check:
1. CORS configuration on backend
2. File size limits (frontend: 10MB, backend: configure accordingly)
3. FormData is being used (not Base64)

### PWA not installable

Verify:
1. `manifest.json` is accessible at `/manifest.json`
2. Icons exist and are correctly sized
3. HTTPS is enabled
4. Service worker is registered

## 📝 License

MIT

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test on mobile device
4. Submit PR

---

**Built with ❤️ using NextJS 14+ and Tailwind CSS**
