# Amrit Manage — SaaS Dairy Management Platform

Multi-tenant dairy delivery management with RBAC, WhatsApp automation, and mobile-first UI.

## Architecture

```
/
├── backend/          Express.js API + MongoDB + whatsapp-web.js
└── frontend/         React + Vite (SPA)
```

## Roles

| Role | Access |
|------|--------|
| `superadmin` | Platform control — manage owners, subscriptions, feature flags |
| `owner` | Full control over their dairy business — customers, staff, billing |
| `staff` | Delivery screen only — mark deliveries, add extra liters |

## Quick Start

### 1. Backend

```bash
cd backend
npm install
# Copy .env and fill in your values
node scripts/seedSuperAdmin.js   # Create superadmin (run once)
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Login

- Superadmin: phone `9999999999`, password from `.env`
- Owner: created by superadmin via `/app/superadmin/owners`
- Staff: created by owner via `/app/owner/staff`

## App Routes

| Path | Role |
|------|------|
| `/app/login` | All |
| `/app/superadmin` | Superadmin |
| `/app/superadmin/owners` | Superadmin |
| `/app/owner` | Owner |
| `/app/owner/customers` | Owner |
| `/app/owner/staff` | Owner |
| `/app/owner/logs` | Owner |
| `/app/owner/billing` | Owner |
| `/app/owner/whatsapp` | Owner (if feature enabled) |
| `/app/staff` | Staff |

## WhatsApp Setup (per owner)

1. Owner goes to `/app/owner/whatsapp`
2. Clicks "Load QR Code"
3. Scans with WhatsApp → Linked Devices
4. Session is saved — no re-scan needed after restarts
5. Delivery notifications fire automatically when staff marks a delivery

## API Endpoints

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`

### Superadmin
- `GET /api/superadmin/owners`
- `POST /api/superadmin/owners`
- `PATCH /api/superadmin/owners/:id/subscription`
- `PATCH /api/superadmin/owners/:id/features`
- `PATCH /api/superadmin/owners/:id/toggle`
- `GET /api/superadmin/stats`

### Owner
- `GET /api/owner/dashboard`
- `GET/POST /api/owner/customers`
- `PUT/DELETE /api/owner/customers/:id`
- `GET/POST /api/owner/staff`
- `DELETE /api/owner/staff/:id`
- `GET /api/owner/logs`
- `POST /api/owner/bills/generate`
- `GET /api/owner/bills`
- `POST /api/owner/bills/:id/payment`
- `GET /api/owner/reports/monthly-summary`

### Staff
- `GET /api/staff/today`
- `POST /api/staff/deliver`
- `GET /api/staff/history`

### WhatsApp
- `GET /api/whatsapp/qr`
- `GET /api/whatsapp/status`
- `POST /api/whatsapp/disconnect`
- `POST /api/whatsapp/send-bulk`

## Performance Notes

- MongoDB connection pool: 50 max connections
- Rate limiting: 200 req/min for API, 20 req/15min for auth
- WhatsApp sessions stored in memory + disk (LocalAuth)
- All tenant queries use compound indexes on `ownerId`
- JWT expiry: 7 days (configurable via `JWT_EXPIRE`)
