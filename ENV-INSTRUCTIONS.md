# AmritManage — Deployment Instructions

---

## About Port 5000

The backend runs on port **5000 internally** — this is correct for production.
Hostinger's reverse proxy handles public HTTPS (port 443) and forwards traffic to your app's internal port.
You never expose port 5000 directly to the internet. Do not change it.

---

## Deployment 1 — App + Backend (`amritmanage-app.eurekai.in`)

### Step 1 — Upload the zip

Upload `amritmanage-deploy.zip` to Hostinger and extract it.
The extracted folder structure must be:

```
amritmanage-deploy/
  backend/
    server.js
    .env          ← already filled in the zip
    package.json
    ...
  frontend/
    src/
    .env          ← already filled in the zip
    package.json
    ...
  package.json    ← root build/start scripts
```

### Step 2 — Hostinger Settings

| Setting          | Value                        |
|------------------|------------------------------|
| Framework preset | Other                        |
| Node version     | 22.x                         |
| Root directory   | `./`                         |
| Build command    | `npm run build`              |
| Output directory | `frontend/dist`              |
| Entry file       | `backend/server.js`          |
| Start command    | `npm run start`              |

### Step 3 — Environment Variables in Hostinger Panel

> ⚠️ IMPORTANT: Hostinger's env panel takes priority over the `.env` file.
> You MUST add these in the Hostinger → Environment Variables panel,
> otherwise MONGO_URI will be undefined and the server will crash.

```
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://brandkrittechnologies_db_user:G7CsYvYxoTKEY3sO@dhavalmaincluster.vy6dsbs.mongodb.net/amrit-dairy-saas?appName=DhavalMainCluster
JWT_SECRET=452fb86871c81719d695eb349da0425195a78fa4ea0d3d31189cc41a8be839f0
JWT_EXPIRE=7d
FRONTEND_URL=https://amritmanage-app.eurekai.in
VITE_API_URL=https://amritmanage-app.eurekai.in/api
VITE_APP_NAME=Amrit Manage
VITE_APP_URL=https://amritmanage-app.eurekai.in
```

### Step 4 — MongoDB Atlas: Whitelist Hostinger Server IP

1. Go to MongoDB Atlas → Security → Network Access
2. Add your Hostinger server's IP address
3. Or add `0.0.0.0/0` temporarily to test (restrict it after)

---

## Deployment 2 — Marketing Site (`amritmanage.eurekai.in`)

### Hostinger Settings

| Setting          | Value                        |
|------------------|------------------------------|
| Framework preset | Other                        |
| Node version     | 22.x                         |
| Root directory   | `./`                         |
| Build command    | `npm run build`              |
| Output directory | `frontend/dist`              |
| Entry file       | *(none — static site)*       |
| Start command    | *(none)*                     |

### Environment Variables in Hostinger Panel

```
VITE_API_URL=https://amritmanage-app.eurekai.in/api
VITE_APP_NAME=Amrit Manage
VITE_APP_URL=https://amritmanage-app.eurekai.in
```

---

## One-Time Superadmin Setup (run AFTER Deployment 1 is live)

Superadmin credentials are NOT stored in `.env`. They are written to MongoDB
via a secure localhost-only setup page. Run this once after first deploy.

### Step 1 — Temporarily enable the setup page

In Hostinger env panel, add:
```
ENABLE_SETUP=true
```
Then restart the server.

### Step 2 — Open an SSH tunnel

```bash
ssh -L 9000:localhost:5000 u947024924@amritmanage-app.eurekai.in
```
Keep this terminal open. This tunnels your local port 9000 → server port 5000.

### Step 3 — Open the setup page

In your browser (on your local machine):
```
http://localhost:9000/setup
```

### Step 4 — Fill in the form

- **Full Name** — superadmin's display name
- **Phone** — 10-digit number (used to log in)
- **Email** — superadmin email
- **Username** — lowercase, letters/numbers/dots/dashes only
- **Password** — minimum 8 characters (stored as bcrypt hash)
- **3 Verification Codes** — one each for Superadmin / Owner / Staff
  - Must be 6 digits each, all three must be different
  - Use the "Auto-generate" button or pick your own
  - **Write these down** — owners and staff will need their code on every login

Click **Save to Database**.

### Step 5 — Disable setup page

Remove `ENABLE_SETUP=true` from Hostinger env panel and restart.
The `/setup` route returns 404 again.

### Re-running setup later

You can repeat steps 1–5 any time to update credentials.
The form does an upsert — it updates the existing superadmin record.

---

## Production Login URLs

| Role       | URL |
|------------|-----|
| Owner      | `https://amritmanage-app.eurekai.in/securelogin/ownerlogin` |
| Staff      | `https://amritmanage-app.eurekai.in/loginto/staffaccess` |
| Superadmin | `https://amritmanage-app.eurekai.in/loginto/lockedaccess/app/secure/adminaccounts/superadmin/login` |

---

## What Goes Where

| Thing              | Where it lives                        |
|--------------------|---------------------------------------|
| MONGO_URI          | Hostinger env panel + backend/.env    |
| JWT_SECRET         | Hostinger env panel + backend/.env    |
| Superadmin password| MongoDB (bcrypt hash via setup page)  |
| Owner OTP code     | MongoDB (bcrypt hash via setup page)  |
| Staff OTP code     | MongoDB (bcrypt hash via setup page)  |
| Superadmin OTP     | MongoDB (bcrypt hash via setup page)  |
