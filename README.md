# LipaKodi

A rental management platform built for the Kenyan market with integrated M-Pesa payments and SMS reminders.

## Features

- **Property & Unit Management** — Create properties, manage individual units with rent rates and occupancy tracking
- **Tenant Management** — Track leases, contact info, and tenant status
- **Invoicing** — Generate and send invoices with multiple line items (rent, water, electricity, service charges, late fees)
- **M-Pesa Payments** — STK Push, C2B confirmation, automatic reconciliation
- **SMS Rent Reminders** — Automated reminders via Africa's Talking (3 days before, on due date, weekly while overdue)
- **Maintenance Requests** — Tenants submit and track repair requests with priority levels
- **Notifications** — In-app alerts for payments, invoices, and overdue reminders
- **Role-Based Access** — Separate dashboards for landlords and tenants

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma
- **Auth**: NextAuth.js v5
- **Payments**: M-Pesa (Safaricom)
- **SMS**: Africa's Talking
- **UI**: Radix UI + Tailwind CSS
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# Push database schema
npx prisma db push

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for NextAuth sessions |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `AT_API_KEY` | Africa's Talking API key |
| `AT_USERNAME` | Africa's Talking username (`sandbox` for testing) |
| `AT_SENDER_ID` | Optional sender ID for SMS |
| `CRON_SECRET` | Secret for authenticating cron endpoint requests |

### SMS Reminders

The `/api/cron/rent-reminders` endpoint processes and sends SMS reminders. Trigger it with a scheduled job:

```bash
curl -H "x-cron-secret: YOUR_SECRET" https://your-app.com/api/cron/rent-reminders
```

## Scripts

```bash
npm run dev    # Start dev server
npm run build  # Production build
npm run start  # Start production server
npm run lint   # Run ESLint
```

## License

Private
