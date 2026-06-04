# Panel Bazaar BD

বাংলাদেশের ডিজিটাল প্রোডাক্ট মার্কেটপ্লেস — Bangladesh's Digital Product Marketplace.

## Features

- 🌐 Bilingual UI — Bangla & English (toggle anytime)
- 🎨 Dark theme (#080808), neon green (#00FF94) accent
- 📱 Mobile-first with bottom navigation
- 🔐 JWT auth via HttpOnly cookie (no JS access)
- 💳 MFS payments — bKash, Nagad, Rocket
- 📦 Product catalog with category filtering
- 🔑 License key delivery with live countdown
- 👤 User profile & wallet management
- ⚙️ Full admin panel: products, keys, orders, users, audit log

## Stack

- React 18 + Vite 6
- Tailwind CSS 3
- React Router v6
- Zustand (state)
- Cloudflare Worker backend (Hono)

## Setup

```bash
# Install
npm install

# Configure API
cp .env.example .env
# Edit VITE_API_BASE in .env

# Development
npm run dev

# Production build
npm run build
```

## Deploy to Cloudflare Pages

1. Push to GitHub
2. Connect repo in Cloudflare Pages dashboard
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_BASE=https://marketplace-backend.sor2127061.workers.dev`

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_BASE` | Cloudflare Worker base URL |

## Project Structure

```
src/
├── main.jsx
├── App.jsx              # Routes + auth guard
├── index.css
├── lib/
│   ├── api.js           # apiFetch wrapper
│   ├── store.js         # Zustand global state
│   ├── i18n.js          # Bangla/English translations
│   └── utils.js         # Formatting helpers
├── components/
│   ├── Toast.jsx
│   ├── Skeleton.jsx
│   ├── Modal.jsx
│   ├── BottomNav.jsx
│   ├── CountUp.jsx
│   └── LangToggle.jsx
└── pages/
    ├── Login.jsx
    ├── Register.jsx
    ├── Home.jsx
    ├── ProductDetail.jsx
    ├── Wallet.jsx
    ├── TopupSuccess.jsx
    ├── Orders.jsx
    ├── Profile.jsx
    └── admin/
        ├── AdminLayout.jsx
        ├── Dashboard.jsx
        ├── Products.jsx
        ├── Keys.jsx
        ├── Orders.jsx
        ├── Users.jsx
        └── AuditLog.jsx
```

## API

All requests use `credentials: 'include'` for HttpOnly cookie auth.

Base endpoints: `/api/auth/*`, `/api/products/*`, `/api/orders/*`, `/api/wallet/*`, `/api/admin/*`
