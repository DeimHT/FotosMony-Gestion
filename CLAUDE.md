# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server at http://localhost:3000
pnpm build        # production build
pnpm lint         # ESLint

# Mobile app (apps/admin-mobile)
cd apps/admin-mobile
npx expo start    # Expo dev server
```

## Architecture

This is a Next.js 16 (App Router) backoffice for FotosMony, a photography business. It connects to the **same Supabase instance** as fotosmony.cl — any writes to shared tables affect the live website.

### Auth & Route Protection

Route protection lives in `proxy.ts` (not `middleware.ts` — intentional). It exports a `proxy` function that enforces:
1. Authenticated Supabase session
2. `role = 'admin'` in the `profiles` table

The OAuth callback at `app/auth/callback/route.ts` also validates the admin role and signs out non-admin users.

### Data Layer

- **`lib/supabase/client.ts`** — browser client (use in Client Components)
- **`lib/supabase/server.ts`** — server client (use in Server Components and API routes)
- **`lib/r2.ts`** — Cloudflare R2 storage via AWS S3 SDK (`uploadToR2`, `deleteFromR2`, `keyFromUrl`)
- **`POST /api/upload`** — server-side upload to R2 with admin auth check; accepts `file`, `folder`, and optional `old_url` (auto-deletes previous image)

### Supabase Tables

**Shared with fotosmony.cl** (writes affect the live site):
`eventos`, `sub_eventos`, `fotos`, `carpetas`, `orders`, `order_items`, `services`, `profiles`, `contact_messages`, `home_sections`, `portfolio_items`

**Gestión-only** (safe to write freely):
`agenda`, `ventas_presenciales`, `venta_presencial_items`, `clientes`, `sugerencias`, `egresos`

New tables must be created via SQL in Supabase SQL Editor. Migration scripts live in `supabase/migrations/`.

### Key Utilities

- **`lib/utils.ts`**: `cn()` (Tailwind class merging), `formatCLP()` (Chilean peso), `formatDate()` / `formatDateTime()` (es-CL locale)
- **`types/index.ts`**: all TypeScript types — add new entity types here

### UI Components

Radix UI primitives in `components/ui/`. Layout (Sidebar, Header) in `components/layout/`. Feature-specific components co-located under `components/<module>/`.

### Mobile App

`apps/admin-mobile/` is a separate Expo/React Native app with its own dependencies. It shares the same Supabase instance.

## Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
CLOUDFLARE_R2_PUBLIC_URL          # public CDN base URL for R2 objects
```
