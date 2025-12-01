# InvoiceCore - Self-Hosted ERP & Invoicing System

**InvoiceCore** is a lightweight, high-performance invoicing and financial management system designed for self-hosting on Windows (AMD64) or Raspberry Pi (ARM64). It features an automated Indian GST engine, multi-currency support, and local PDF generation without heavy external dependencies.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Stack](https://img.shields.io/badge/stack-Next.js_|_Node_|_MySQL-green.svg)

---

## 🚀 Key Features

* **Smart Tax Engine:** Automatically applies **IGST** vs. **CGST/SGST** based on Client State vs. Owner State.
* **PDF Generation:** Uses the local system browser (Chrome/Edge/Brave) via `puppeteer-core` for pixel-perfect rendering.
* **Dashboard Analytics:** Real-time visualization of Revenue, Expenses, and Net Profit using Recharts.
* **Invoice Management:** Auto-incrementing invoice numbers (e.g., `DDP/24-25/001`), HSN codes, and status tracking (Draft/Sent/Paid).
* **Client Management:** Comprehensive database of 240+ Countries and all Indian States/UTs.
* **Backup & Restore:** Full system backup to encrypted `.iec` files.
* **Security:** JWT Authentication and protected API routes.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 14+ (App Router), Tailwind CSS, Shadcn UI, Axios, Recharts.
* **Backend:** Node.js v20 (LTS), Express.js.
* **Database:** MySQL 8.0 (Native) with Prisma ORM.
* **Process Manager:** PM2 (For production runtime).
* **PDF Engine:** Puppeteer Core (Local Chromium).

---

## 📋 Prerequisites

Before installing, ensure you have:
1.  **Node.js v20+** installed.
2.  **MySQL 8.0** installed and running.
3.  **Google Chrome, Brave, or Edge** installed (for PDF generation).
4.  **Git** installed.

---

## ⚙️ Installation Guide

### 1. Clone the Repository
```bash
git clone <repository-url>
cd InvoiceCore
````

### 2\. Database Setup

1.  Open **phpMyAdmin** or MySQL Workbench.
2.  Create a new database named `invoice_core_db`.
3.  Create a user (optional) or use root.

### 3\. Backend Setup

```bash
cd backend
npm install
```

**Configure Environment:**
Create a `.env` file in `backend/` folder:

```env
PORT=5000
# Update with your DB User/Pass. Ensure no special characters like '@' in password if possible.
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/invoice_core_db"

JWT_SECRET="super_secret_key_change_this"

# Update this path to your local Chrome/Brave browser
# Example for Windows:
PUPPETEER_EXECUTABLE_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

**Initialize Database:**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4\. Frontend Setup

```bash
cd ../frontend
npm install
```

-----

## 🏃‍♂️ Development Mode

To run the project for editing/debugging:

**Terminal 1 (Backend):**

```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**

```bash
cd frontend
npm run dev
```

Access the app at `http://localhost:3000`.

-----

## 📦 Production Deployment (PM2)

For a stable, always-on server (e.g., on a VPS or Office PC).

### 1\. Build the Project

```bash
# Build Backend
cd backend
npm run build

# Build Frontend
cd ../frontend
npm run build
```

### 2\. Copy Static Assets (Crucial Fix)

Next.js Standalone mode requires manual copying of public assets:

1.  Copy `frontend/public` -\> `frontend/.next/standalone/public`
2.  Copy `frontend/.next/static` -\> `frontend/.next/standalone/.next/static`

### 3\. Install PM2 & Start

```bash
npm install -g pm2
cd .. # Go to Root folder
pm2 start ecosystem.config.js
pm2 save
```

The app is now running in the background.

  * **Frontend:** http://localhost:3000
  * **Backend:** http://localhost:5000

-----

## 🔐 First Time Setup

### 1\. Create Admin Account

Since the database is empty, create the first admin user via API:

**PowerShell:**

```powershell
curl -X POST http://localhost:5000/api/auth/register-admin -H "Content-Type: application/json" -d "{\"email\": \"admin@invoicecore.com\", \"password\": \"admin123\"}"
```

### 2\. Login

Go to `/login` and use the credentials created above.

### 3\. Configure Company Profile

Go to **Settings** -\> **General** to set up your Company Name, GSTIN, and Bank Details. This ensures your PDFs look professional.

-----

## 🐛 Troubleshooting

**1. Database Connection Error:**

  * Ensure MySQL service is running.
  * Check `.env` for typos.
  * If using MySQL 8+, ensure the user is set to `mysql_native_password` if Prisma fails to connect.

**2. PDF Generation Failed:**

  * Check the `PUPPETEER_EXECUTABLE_PATH` in `.env`. It must point to a valid `.exe` file.
  * Remove any trailing spaces or extra characters (like "c") from the path.

**3. "Client not found" when saving Invoice:**

  * Ensure you have seeded the `State` and `Country` tables.
  * Go to phpMyAdmin and verify the `Client` table has data.

-----

## 📜 License

Proprietary / Internal Use Only.

```