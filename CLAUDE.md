# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LipaKodi is a rental management platform for the Kenyan market with M-Pesa payment integration and SMS reminders. Built with Next.js 14 (App Router), PostgreSQL via Prisma, and NextAuth.js v5.

## Commands

```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npx prisma db push # Push schema changes to database
npx prisma studio  # Visual database browser
```

No test framework is configured.

## Architecture

### Route Groups & Role Separation

The app uses Next.js route groups to separate landlord and tenant experiences:

- `src/app/(dashboard)/` — Landlord pages (properties, units, tenants, invoices, payments, maintenance, analytics, late-fees)
- `src/app/(tenant)/tenant/` — Tenant portal (dashboard, payments, maintenance)
- `src/app/onboard/` — Public tenant onboarding flow (token-based registration)

### Middleware (`src/middleware.ts`)

Auth middleware uses NextAuth's `auth()` wrapper. Key routing rules:
- Public paths: `/login`, `/register`, `/onboard`
- Auth-exempt API paths: `/api/mpesa/*` (Safaricom callbacks), `/api/cron/*` (secret-based auth)
- The matcher `/((?!api|_next/static|_next/image|favicon.ico).*)` excludes all `/api/` routes from middleware
- Landlord paths redirect tenants to `/tenant/dashboard`; tenant paths redirect non-tenants to `/dashboard`

### M-Pesa Payment Flow

M-Pesa credentials are stored **per-property** in the `MpesaConfig` table (not env vars). Two payment flows:

**STK Push**: Tenant initiates → `/api/mpesa/stk-push` → Safaricom API → callback to `/api/payments/stk-callback` → `reconcileStkCallback()` → `reconcileC2BPayment()`

**C2B (Pay Bill)**: Tenant pays via M-Pesa menu → Safaricom validates at `/api/payments/c2b-validation` → confirms at `/api/payments/c2b-confirmation` → `reconcileC2BPayment()`

Reconciliation (`src/lib/reconciliation.ts`) matches payments to tenants by unit `accountNumber` first, then falls back to phone number matching. Unmatched transactions are still recorded as `MpesaTransaction` with `isReconciled: false`.

**Important**: C2B URLs must be registered with Safaricom via `POST /api/mpesa/register-urls` whenever `NEXT_PUBLIC_APP_URL` changes. For local dev, requires ngrok and updating the env var.

### SMS/Messaging

Multi-channel messaging via Africa's Talking (`src/lib/messaging.ts`):
- `src/lib/sms.ts` — SMS sending
- `src/lib/whatsapp.ts` — WhatsApp with automatic SMS fallback
- Tenant `channelPreference` (SMS or WHATSAPP) determines routing

### Cron Endpoints

Both require `x-cron-secret` header matching `CRON_SECRET` env var:
- `/api/cron/rent-reminders` — Sends reminders (3 days before, on due date, weekly while overdue). Deduplicates via `SmsLog` by type per invoice.
- `/api/cron/late-fees` — Applies late fees based on per-property config (percentage or fixed, grace period, escalation).

### Database

PostgreSQL with Prisma. Path alias `@/*` maps to `./src/*`. Prisma client singleton at `src/lib/prisma.ts`.

Key relationships:
- `User` → `Property[]` (landlord) or `Tenant` (one-to-one)
- `Property` → `Unit[]` → `Tenant` (one-to-one per unit)
- `Tenant` → `Invoice[]` → `Payment[]`
- `MpesaTransaction` → `Payment` (one-to-one, nullable for unmatched)
- Late fee config lives on `Property` model (not a separate table)

### Auth

NextAuth.js v5 with JWT strategy. Providers: Credentials (email/password with bcrypt) and Google OAuth. User role is embedded in JWT token via callbacks. Session includes `user.role` and `user.id`.

### UI

Radix UI primitives in `src/components/ui/`, Tailwind CSS, Lucide icons. Forms use React Hook Form with Zod validation. Charts use Recharts (`src/components/charts/`).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing |
| `NEXTAUTH_URL` | Yes | App URL for auth callbacks |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL for M-Pesa callbacks (ngrok for local dev) |
| `AT_API_KEY` | Yes | Africa's Talking API key |
| `AT_USERNAME` | Yes | Africa's Talking username (`sandbox` for testing) |
| `CRON_SECRET` | Yes | Secret for cron endpoint authentication |
| `AT_SENDER_ID` | No | SMS sender ID |
| `GOOGLE_CLIENT_ID` | No | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
