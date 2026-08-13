<div align="center">
  <img src="https://dairymanagementanmol.vercel.app/favicon.ico" alt="Dairy Management Logo" width="100"/>
  <h1>🥛 Dairy Management System</h1>
  <p><strong>A comprehensive, AI-powered multi-tenant SaaS application built for Dairy Owners, Milk Suppliers, and their Staff.</strong></p>
  <p>
    <a href="https://dairymanagementanmol.vercel.app/"><strong>View Live Demo</strong></a> · 
    <a href="https://anmol-patil-portfolio.vercel.app/"><strong>Developer Portfolio</strong></a>
  </p>
  
  <p>
    <img src="https://img.shields.io/badge/React-18.0-blue.svg?logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/Vite-6.0-purple.svg?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Node.js-Backend-green.svg?logo=node.js&logoColor=white" alt="Node" />
    <img src="https://img.shields.io/badge/MongoDB-Database-brightgreen.svg?logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/AI-Gemini_Powered-orange.svg" alt="AI Powered" />
  </p>
</div>

---

## 📖 Overview

The **Dairy Management System** is built to solve the complex daily tracking requirements of modern milk collection centers and dairy farms. It seamlessly bridges the gap between Dairy Owners, their distributed staff, and local farmers. 

Whether you're handling morning/evening shifts for milk collection (tracking Fat, SNF, and Quantity), managing a fleet of delivery agents, or generating automated WhatsApp billing receipts, this platform handles it all in a lightning-fast, mobile-responsive interface.

Designed and Developed by **[Anmol Patil](https://anmol-patil-portfolio.vercel.app/)**

---

## ✨ Core Features

### 🤖 dAIry - Your Personal AI Assistant
- **Context-Aware Assistance:** A floating AI assistant integrated globally across the application powered by Gemini.
- **Persistent Chat History:** Seamlessly remembers your past conversations across devices, tied securely to your account.
- **On-Demand Help:** Instantly answers questions regarding dairy metrics, app navigation, and troubleshooting.

### 🏢 Super Admin Portal
- **Global Overview:** Bird's-eye view of all registered Dairy Owners, system activities, and active subscriptions.
- **Plan Management:** Create, edit, and control pricing tiers for `Silver`, `Gold`, and `Platinum` plans.
- **Impersonation:** Instantly login as any owner or staff member for rapid debugging and direct client support.
- **Recycle Bin:** 90-day soft-delete cascade retention policy to securely prevent accidental data loss.

### 🐄 Dairy Owner Dashboard (Multi-Tenant)
- **Role-Based Workflows:** Tailored interfaces designed specifically for `Dairy Owners` (Farmer collections) and `Milk Suppliers` (Customer deliveries).
- **Daily Logging:** Ultra-fast bulk data entry for morning/evening shifts including Fat, SNF, and Quantity inputs.
- **Automated Billing:** Dynamic date-range invoice generation with automatic PDF exports.
- **WhatsApp Integration:** 1-click billing and daily receipt alerts sent directly to clients' mobile phones.
- **Staff Accounts:** Delegated, scoped access for delivery agents to securely log deliveries on the go.

### 👥 Staff Mobile App
- **Delivery Mode:** Streamlined, mobile-first interface optimized for rapid data entry during fast-paced delivery routes.
- **Restricted Access:** Ensures strict data privacy; staff cannot access billing, sensitive metrics, or owner configuration settings.

---

## 🛠 Tech Stack

- **Frontend Architecture:** React 18, Vite, React Router v6, Lucide Icons, Context API
- **Backend Infrastructure:** Node.js, Express, REST APIs, JSON Web Tokens (JWT)
- **Database Storage:** MongoDB (Mongoose Schema)
- **AI Integration:** Google Gemini GenAI API
- **Cloud Deployment:** Vercel (Frontend Global CDN), Render (Backend Scalable Compute)

---

## 🚀 Quick Start & Installation

Want to run the project locally? Follow these steps:

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
Create a `.env` file in the `backend` directory with the following variables:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_random_string
```
Start the backend server:
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
VITE_GEMINI_API_KEY=your_google_gemini_api_key
```
Start the frontend development server:
```bash
npm run dev
```

---

## 🔗 Live Demo
- **App URL:** [https://dairymanagementanmol.vercel.app/](https://dairymanagementanmol.vercel.app/)
- **Test Credentials:** Accessible via the convenient "Quick Demo" buttons on the Unified Login page.

---

## 🧑‍💻 Author

**Anmol Patil**
- 🌐 **Portfolio:** [anmol-patil-portfolio.vercel.app](https://anmol-patil-portfolio.vercel.app/)
- 🐙 **GitHub:** [1anmol1](https://github.com/1anmol1)

<br/>
<div align="center">
  <i>Built with ❤️ for modern dairy management.</i>
</div>
