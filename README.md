# InvoiceCore - Self-Hosted ERP & Invoicing System

**InvoiceCore** is a lightweight, high-performance invoicing and financial management system designed for self-hosting on Windows (AMD64) or Linux (Ubuntu/Raspberry Pi ARM64). It features an automated Indian GST engine, multi-currency banking support, and local PDF generation without heavy external dependencies.

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Stack](https://img.shields.io/badge/stack-Next.js_|_Node_|_MySQL-green.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)

---

## 🚀 Key Features

* **Smart Tax Engine:** Automatically toggles between **IGST** (Inter-state) and **CGST/SGST** (Intra-state) based on the client's state versus the company's state. Supports Zero-rated exports.
* **PDF Generation:** Uses the local system's Chromium browser (via `puppeteer-core`) for pixel-perfect rendering, ensuring compatibility with ARM64 devices like Raspberry Pi 5.
* **Banking Management:** Supports multiple bank accounts with specialized fields for **SWIFT, IBAN, Routing Numbers (ACH/Fedwire), and UPI**.
* **Data Migration:** Built-in CSV Importer for migrating **Clients, Invoices, and Quotations** from legacy systems.
* **Asset Management:** Persistent storage for branding assets (Logos, Signatures, Stamps), served correctly via a reverse proxy even in production builds.
* **Security:**
    * **Role-Based Access Control:** Sudo Admin (Owner), Admin, and Staff roles.
    * **2FA:** Time-based One-Time Password (TOTP) support for secure logins.
    * **Backups:** Encrypted `.iec` system snapshots for full data restoration.
* **Document Sequencing:** Auto-incrementing numbers with fiscal year support (e.g., `INV/2425/001`). Support for manual overrides (backdating).

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 15+ (App Router), Tailwind CSS, Shadcn UI, Axios, Recharts.
* **Backend:** Node.js v20 (LTS), Express.js.
* **Database:** MySQL 8.0 (Native) with Prisma ORM.
* **PDF Engine:** Puppeteer Core (Connects to local Chrome/Chromium).
* **Process Manager:** PM2 (Recommended for production).

---

## 📋 Prerequisites

Before installing, ensure your host machine has:

1.  **Node.js v20+** installed.
2.  **MySQL 8.0** installed and running.
3.  **Google Chrome, Brave, or Chromium** installed.
    * *This is critical for PDF generation.*
4.  **Git** installed.

---

## ⚙️ Installation Guide

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd InvoiceCore
````

### 2\. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

**Configure Environment:**
Create a `.env` file in the `backend/` folder. You can copy the example below:

```env
PORT=5000
# MySQL Connection String
# Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="mysql://root:your_password@localhost:3306/invoice_core_db"

# Random strong string for JWT encryption
JWT_SECRET="generate_a_strong_random_key_here"

# Path to your local browser executable (Critical for PDF generation)
# Windows Example:
PUPPETEER_EXECUTABLE_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
# Linux/Ubuntu Example:
# PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"
```

**Initialize Database:**
This will create the tables and seed initial data (States, Countries):

```bash
# Push schema structure to DB
npx prisma db push

# Seed initial utility data
npx prisma db seed
```

### 3\. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd ../frontend
npm install
```

**Note on Configuration:**
The frontend is pre-configured in `next.config.ts` to proxy API requests (`/api`) and static uploads (`/uploads`) to `http://localhost:5000`. Ensure your backend is always running on port 5000.

-----

## 🚀 Running the Application

### Option A: Development Mode

Useful for editing code and debugging.

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

### Option B: Production Mode (PM2)

Recommended for always-on servers (VPS, Office PC, Raspberry Pi).

1.  **Build Backend:**

    ```bash
    cd backend
    npm run build
    ```

2.  **Build Frontend:**

    ```bash
    cd ../frontend
    npm run build
    cp -r public .next/standalone/public
    cp -r .next/static .next/standalone/.next/static
    ```

3.  **Start with PM2:**
    Return to the project root and start the services:

    ```bash
    # Start Backend
    pm2 start backend/dist/index.js --name "ic-backend"

    # Start Frontend
    cd frontend
    pm2 start npm --name "ic-frontend" -- start

    # Save process list (ensures restart on reboot)
    pm2 save
    ```

-----

## 🔒 First Time Setup

1.  **Access the App:** Open `http://localhost:3000` (or your server IP).
2.  **Setup Wizard:** You will be redirected to `/setup` if no admin account exists.
3.  **Database Credentials:** Enter your MySQL credentials again to confirm the connection.
4.  **Create Owner:** Create the "Sudo Admin" account (System Owner).
5.  **Login:** Use your new credentials to log in.
6.  **Company Profile:** Go to **Settings -\> Profile** to set your Company Name, GSTIN, and Address.
7.  **Branding:** Go to **Settings -\> Branding** to upload your Logo and Signature.

-----

## 🐛 Troubleshooting

### 1\. PDF Generation Failed / 500 Error

  * **Cause:** The backend cannot find the Chrome/Chromium executable.
  * **Fix:** Check `PUPPETEER_EXECUTABLE_PATH` in `backend/.env`. It must point to a valid `.exe` (Windows) or binary (Linux).

### 2\. Images (Logo/Sign) Missing in PDF

  * **Cause:** The PDF engine cannot resolve relative paths.
  * **Fix:** Ensure you have updated the backend code to serve `http://localhost:5000/uploads/...`. The application uses the local HTTP server to fetch images for PDFs.

### 3\. "Client not found" or Empty Dropdowns

  * **Cause:** Database seed script didn't run, so State/Country lists are empty.
  * **Fix:** Run `cd backend && npx prisma db seed`.

### 4\. 404 on Image Uploads in Production

  * **Cause:** Next.js optimization freezes the `public` folder at build time.
  * **Fix:** We implemented a reverse proxy. Ensure `frontend/next.config.ts` has the `rewrites()` rule pointing `/uploads/:path*` to `http://localhost:5000/uploads/:path*`.

### 5\. Solid Color Blocks on Login Screen

  * **Cause:** Tailwind CSS failed to compile due to a syntax error during build.
  * **Fix:** Check your recent frontend code changes for syntax errors, delete the `.next` folder, and run `npm run build` again.

-----

## 📜 License

Proprietary / Internal Use Only.
