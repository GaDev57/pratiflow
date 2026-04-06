# PratiFlow — Architecture & Conventions

## Overview
SaaS platform for health & wellness practitioners (psychologists, therapists, physiotherapists, osteopaths, GPs, wellness coaches). Equivalent to Calendly + collaborative patient records with teleconsultation.

**HDS-compliant** (French Health Data Hosting regulation), GDPR-compliant, deployed on Supabase EU region.

## Tech Stack
- **Framework**: Next.js 16 (App Router, TypeScript strict, no `any`)
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Auth**: Supabase Auth (email/password + email confirmation)
- **Payments**: Stripe (practitioner subscriptions + patient booking payments)
- **Video**: Jitsi Meet (per-appointment rooms)
- **SMS**: Twilio
- **Email**: Resend
- **Rich Text**: Tiptap
- **UI**: Tailwind CSS v4 + shadcn/ui components
- **Deployment**: Netlify (front) + Supabase Cloud EU

## Project Structure
```
src/
├── app/
│   ├── (auth)/               # Auth pages (login, register, onboarding)
│   ├── (dashboard)/          # Protected dashboard (all role-based pages)
│   │   └── dashboard/
│   │       ├── access-logs/  # HDS audit trail viewer (practitioner)
│   │       ├── account/      # RGPD: consent, data export, account deletion
│   │       ├── appointments/ # Patient appointment list
│   │       ├── calendar/     # Practitioner week view
│   │       ├── documents/    # Patient shared notes & media
│   │       ├── messages/     # Patient messaging
│   │       ├── patients/     # Practitioner patient list + [id] dossier
│   │       └── settings/     # Availability, Google Cal, subscription
│   ├── api/
│   │   ├── booking/confirm/  # Email + SMS notification
│   │   ├── gdpr/             # export/ + anonymize/
│   │   ├── google-calendar/  # authorize/ + callback/
│   │   ├── push/subscribe/   # Web Push subscription
│   │   └── stripe/           # checkout/ + subscription/ + webhook/
│   ├── auth/                 # Auth callbacks (confirm, callback)
│   ├── book/[slug]/          # Public booking page
│   ├── privacy/              # RGPD privacy policy
│   └── room/[id]/            # Jitsi video consultation
├── components/
│   ├── ui/                   # Button, Input, Label, Card, Select, Textarea
│   ├── rich-text-editor.tsx  # Tiptap editor + viewer
│   ├── push-notification-prompt.tsx
│   └── sign-out-button.tsx
├── lib/
│   ├── supabase/             # client, server, middleware, types
│   ├── access-log.ts         # HDS access logging (service role)
│   ├── google-calendar.ts    # Google Calendar API helpers
│   ├── notifications.ts      # Email (Resend) + SMS (Twilio)
│   ├── push-notifications.ts # Web Push stubs
│   ├── slots.ts              # Availability slot computation engine
│   ├── stripe.ts             # Stripe config + subscription plans
│   └── utils.ts              # cn() utility
├── middleware.ts              # Route protection + session refresh
supabase/
└── migrations/
    ├── 00001_initial_schema.sql    # Full schema + RLS + triggers
    └── 00002_rls_hardening.sql     # Storage policies + overlap check
public/
└── sw.js                     # Service Worker for push notifications
```

## Commands
```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

## Key Conventions
- **Server Components by default**; Client Components only when interactivity needed (`"use client"`)
- **RLS on all tables** — never bypass; use service role only in API routes
- **Signed URLs** for all file access (1h max expiration)
- **HDS access logs** — every access to patient data is logged via `logAccess()`
- **No health data in console logs** — use access_logs table for audit trail
- **Mobile-first** design — patients book from phones
- **French UI** — all user-facing text in French
- **Env vars**: copy `.env.local.example` → `.env.local`, never expose secrets client-side

## Database
- Full schema in `supabase/migrations/00001_initial_schema.sql` (11 tables + enums)
- RLS hardening in `supabase/migrations/00002_rls_hardening.sql` (storage + overlap)
- Trigger `handle_new_user` auto-creates profile on signup
- Trigger `update_updated_at` auto-updates timestamps
- Trigger `check_overlap` prevents double-booking
- Types in `src/lib/supabase/types.ts` (manual; generate with Supabase CLI for strict typing)

## Auth Flow
1. User registers → Supabase creates auth.users row → trigger creates profile
2. Email confirmation sent → user clicks link → `/auth/confirm` verifies OTP
3. Redirected to `/onboarding` → creates practitioner or patient record
4. Middleware protects all routes except public ones (/, /login, /register, /book/*, /privacy)

## Roles
- `practitioner`: manages calendar, patients, notes, receives payments, views access logs
- `patient`: books appointments, views shared notes/media, messages practitioner, manages RGPD rights

## Modules (all complete)
1. Auth & Onboarding ✅
2. Availability & Calendar ✅
3. Booking Flow ✅
4. Stripe Payments ✅ (checkout, subscriptions Free/Pro/Premium, webhooks)
5. Consultation & Video ✅ (Jitsi Meet, split view, push notifications)
6. Patient Records ✅ (Tiptap editor, private/shared notes, media upload, real-time messaging)
7. Practitioner Dashboard ✅ (stats, calendar, patients list, access logs)
8. Patient Dashboard ✅ (appointments, documents, messages, account/RGPD)

## RGPD / HDS Compliance
- Timestamped GDPR consent at registration + renewal/withdrawal in account settings
- Data export endpoint (`GET /api/gdpr/export`) — full JSON export
- Right to be forgotten (`POST /api/gdpr/anonymize`) — anonymizes personal data, deletes media
- Privacy policy page at `/privacy`
- HDS access logging via `src/lib/access-log.ts` — append-only audit trail
- Access logs viewer at `/dashboard/access-logs`
- Storage: signed URLs only (1h expiry), encrypted at rest (AES-256), TLS 1.3 in transit
- RLS on all 11 tables + storage bucket policies

## Deployment
- **NEVER** deploy via `npx netlify-cli deploy --build --prod` — local Node version (v24) is incompatible with Netlify runtime (Node 22), causing 502 errors
- **ALWAYS** deploy via `git push origin master` → Netlify auto-builds from GitHub with Node 22
- To trigger a rebuild without a new commit: `npx netlify-cli api createSiteBuild --data '{"site_id":"81a50187-3817-4360-86ee-e94d3f7f3619"}'`
- Env vars managed via Netlify dashboard or `npx netlify-cli env:set`

## Règle de vérification

Après CHAQUE modification (code, DB, API), vérifier que ça fonctionne AVANT de passer à la suite :
1. Code modifié → `npm run build` doit passer
2. Migration DB → requête SQL de vérification
3. Fix API → tester l'endpoint
Ne jamais enchaîner plusieurs modifications sans vérification intermédiaire.
