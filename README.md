# 🥛 Dairy Management System

A comprehensive, multi-tenant SaaS application built for Dairy Owners, Milk Suppliers, and their Staff to seamlessly manage daily milk collections, customer deliveries, billing, and farmer payouts.

Designed and Developed by **[Anmol Patil](https://anmol-patil-portfolio.vercel.app/)**

![Dairy Management UI Preview](https://dairymanagementanmol.vercel.app/favicon.ico)

---

## 🌟 Key Features

### 🏢 Super Admin Portal
- **Global Overview:** Bird's eye view of all registered Dairy Owners and active subscriptions.
- **Plan Management:** Create, edit, and control pricing limits for `Silver`, `Gold`, and `Platinum` plans.
- **Impersonation:** Instantly login as any owner/staff member for rapid debugging and support.
- **Recycle Bin:** 90-day soft-delete cascade retention policy to prevent accidental data loss.

### 🐄 Dairy Owner Dashboard (Multi-Tenant)
- **Role-Based Workflows:** Tailored interfaces for `Dairy Owners` (Farmer collections) and `Milk Suppliers` (Customer deliveries).
- **Daily Logging:** Ultra-fast bulk data entry for morning/evening shifts (Fat, SNF, Quantity).
- **Automated Billing:** Dynamic date-range invoice generation with automatic PDF exports.
- **WhatsApp Integration:** 1-click billing and daily receipt alerts sent directly to clients.
- **Staff Accounts:** Delegated, scoped access for delivery agents to log deliveries on the go.

### 👥 Staff Mobile App
- **Delivery Mode:** Streamlined, mobile-first interface optimized for rapid data entry during delivery routes.
- **Restricted Access:** Cannot access billing, sensitive metrics, or owner settings.

---

## 🛠 Tech Stack

- **Frontend:** React 18, Vite, React Router v6, Lucide Icons, Context API
- **Backend:** Node.js, Express, REST APIs, JSON Web Tokens (JWT)
- **Database:** PostgreSQL (via Supabase)
- **Deployment:** Vercel (Frontend), Render (Backend)

---

## 🚀 Quick Start & Installation

### 1. Clone the repository
```bash
git clone https://github.com/1anmol1/Dairy-Management.git
cd Dairy-Management
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
JWT_SECRET=your_secure_random_string
```
Start the backend:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```
Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:5000/api
```
Start the frontend:
```bash
npm run dev
```

---

## 🔗 Live Demo
- **App URL:** [https://dairymanagementanmol.vercel.app/](https://dairymanagementanmol.vercel.app/)
- **Test Credentials:** Accessible via the "Quick Demo" buttons on the login page.

---

## 🧑‍💻 Author
**Anmol Patil**
- Portfolio: [https://anmol-patil-portfolio.vercel.app/](https://anmol-patil-portfolio.vercel.app/)
- GitHub: [1anmol1](https://github.com/1anmol1)

_Built with ❤️ for modern dairy management._
