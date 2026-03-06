# Talaash — Missing Person Registry

India's open-source missing persons registry. A free, community-run platform to help find missing persons across India.

## Features

- 📋 **Report System** — 3-step verified report submission with photo upload
- 🔍 **Search** — Filter by name, state, gender, age category, status
- 📷 **Photo Match** — AI-assisted histogram image similarity (not facial recognition)
- 🗺 **Live Sightings Map** — Real-time GPS tracking when reporting a sighting (Leaflet + OpenStreetMap, no API key)
- 🔒 **Privacy** — Contact details hidden from unauthenticated users
- ⚙ **Admin Panel** — Approve/reject reports, manage status, view all sightings on map, statistics
- 📱 **Responsive** — Works on all screen sizes

## Tech Stack

- **Next.js 14** — App Router, TypeScript
- **better-sqlite3** — File-based SQLite database (zero config)
- **Leaflet + OpenStreetMap** — Free maps, no API key required
- **JWT + bcrypt** — Secure authentication via HTTP-only cookies
- **Vercel** — One-click deploy

---

## Quick Start (Local)

```bash
# 1. Clone and install
git clone https://github.com/your-username/talaash
cd talaash
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local and set JWT_SECRET to a long random string

# 3. Seed the database with demo data
npm run db:seed

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts
| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@talaash.in | admin123 |
| User  | rahul@example.com | user123 |

---

## Deploy to Vercel

### Option 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables when prompted, or via dashboard:
# JWT_SECRET = (long random string, min 32 chars)
# DB_PATH = /tmp/talaash.db
```

### Option 2: GitHub + Vercel Dashboard

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/talaash.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add environment variables:
   - `JWT_SECRET` = any long random string (e.g. generate with `openssl rand -hex 32`)
   - `DB_PATH` = `/tmp/talaash.db`
4. Click Deploy

> **Note on Vercel database:** Vercel's filesystem is ephemeral (`/tmp`). For production with persistent data, use [Vercel Postgres](https://vercel.com/storage/postgres) or [PlanetScale](https://planetscale.com) and replace `better-sqlite3` with Prisma. The schema in `src/lib/db.ts` makes this straightforward.

### Seed production data

After first deploy, open Vercel's terminal or run locally against production DB:
```bash
DB_PATH=/tmp/talaash.db node scripts/seed.js
```

---

## Project Structure

```
talaash/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/         # login, register, logout, me
│   │   │   ├── reports/      # CRUD for reports
│   │   │   ├── sightings/    # POST sighting with GPS
│   │   │   └── users/        # admin user list
│   │   ├── (home)/           # Browse page
│   │   ├── search/           # Search + photo match
│   │   ├── report/           # File a report (3-step)
│   │   ├── login/            # Auth page
│   │   ├── my-reports/       # User's own reports
│   │   └── admin/            # Admin panel
│   ├── components/
│   │   ├── map/
│   │   │   ├── LiveMap.tsx         # SSR-safe Leaflet map
│   │   │   ├── SightingModal.tsx   # Report sighting + GPS
│   │   │   └── SightingsMapModal.tsx
│   │   └── ui/
│   │       ├── Topbar.tsx, Footer.tsx
│   │       ├── ReportCard.tsx, ReportModal.tsx
│   │       └── StatusBadge.tsx
│   ├── hooks/
│   │   ├── useAuth.tsx    # JWT auth context
│   │   └── useToast.tsx   # Toast notifications
│   ├── lib/
│   │   ├── db.ts          # SQLite singleton
│   │   └── auth.ts        # JWT + bcrypt helpers
│   └── types/index.ts     # TypeScript types
├── scripts/
│   ├── init-db.js         # Schema creation
│   └── seed.js            # Demo data
├── .env.example
├── vercel.json
└── next.config.js
```

---

## Helpline Numbers (India)

- **100** — Police
- **1094** — Child Helpline
- **1091** — Women's Helpline
- **14567** — Senior Citizen Helpline

---

## License

MIT License — Free to use, modify, and distribute.

## Contributing

Pull requests welcome. Please open an issue first to discuss major changes.

## Ethics

- AI photo matching is for assistance only, never for legal identification
- All reports require admin verification before going public
- Contact details protected behind authentication
- GPS location data is voluntary and used only to help locate missing persons
