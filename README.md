# InvoiceCore – Comprehensive Documentation

**Version:** 1.1.0  
**License:** Proprietary / Internal Use Only  
**Architect:** Anirban Guha  
**Stack:** Next.js, Node.js, MySQL, Prisma

-----

## 1\. Project Overview

**InvoiceCore** is a self-hosted, lightweight Enterprise Resource Planning (ERP) and Invoicing system. Unlike SaaS solutions that store financial data on third-party cloud servers, InvoiceCore is designed for **data sovereignty**. It runs entirely on your local hardware (Windows/Linux) or private VPS, ensuring that sensitive financial client data never leaves your infrastructure.

It is specifically engineered to handle **Indian GST compliance** automatically while remaining flexible enough for international multi-currency banking.

### Target Audience

  * **Freelancers & Agencies:** Who need professional invoicing without monthly subscriptions.
  * **Small Businesses:** Requiring GST-compliant billing and inventory tracking.
  * **Data-Conscious Enterprises:** Who require total control over their financial database.

-----

## 2\. Key Features

### A. Financial & Invoicing

  * **Smart Tax Engine:**
      * **Logic:** The system compares the Company's State vs. the Client's State.
      * **Automation:** Automatically applies **CGST + SGST** for intra-state transactions or **IGST** for inter-state transactions.
      * **Export Mode:** Supports Zero-rated invoices for international clients (LUT bonds).
  * **Document Sequencing:**
      * Fiscal Year support (e.g., `INV/24-25/0001`).
      * Manual overrides allow for backdating invoices when migrating legacy data.
  * **Quotation System:** Generate estimates that can be converted to invoices with a single click.

### B. PDF & Rendering Engine

  * **Local Chromium Rendering:** Unlike standard libraries that generate poor HTML-to-PDF results, InvoiceCore connects to the host machine's installed Chrome/Chromium browser via `puppeteer-core`.
  * **Result:** Pixel-perfect PDFs that look exactly like the web preview.
  * **Asset Handling:** Logos, signatures, and stamps are fetched via a local reverse proxy to ensure high-resolution rendering in the final PDF.

### C. Banking & Multi-Currency

  * **Global Banking:** Supports SWIFT, IBAN, and Routing Numbers (ACH/Fedwire) for international clients.
  * **Local Banking:** Specialized fields for Indian UPI and IFSC codes.
  * **Ledger Management:** Tracks payments against invoices to calculate pending dues automatically.

### D. Security & System

  * **Role-Based Access Control (RBAC):**
      * **Sudo Admin:** System owner, full database access.
      * **Admin:** Can manage finances but cannot delete system logs.
      * **Staff:** Restricted access (view-only or create-only based on config).
  * **Two-Factor Authentication (2FA):** Integrated TOTP (Time-based One-Time Password) compatible with Google Authenticator or Authy.
  * **Encrypted Backups:** Generates `.iec` (Invoice Encrypted Core) system snapshots for disaster recovery.

-----

## 3\. Technical Architecture

The application follows a **Client-Server** architecture separated into two distinct sub-systems.

### Frontend (`/frontend`)

  * **Framework:** Next.js 15+ (App Router).
  * **UI Library:** Shadcn UI (Radix Primitives) + Tailwind CSS.
  * **State Management:** Zustand (for global store) and React Query (for server state/caching).
  * **Optimization:** Uses `next/font` and strict TypeScript typing.
  * **Communication:** Communicates with the backend via REST API (Axios). Next.js acts as a proxy in development to avoid CORS issues.

### Backend (`/backend`)

  * **Runtime:** Node.js v20 (LTS).
  * **Framework:** Express.js (handling API routing and middleware).
  * **Database ORM:** Prisma Client (Strictly typed database access).
  * **Database:** MySQL 8.0.
  * **PDF Service:** Uses `puppeteer-core` to control a headless Chrome instance.
  * **Security layer:** `helmet` for headers, `bcrypt` for password hashing, and `jsonwebtoken` (JWT) for session management.

-----

## 4\. Prerequisite Requirements

Before installation, ensure the host machine meets the following criteria:

| Component | Requirement | Reason |
| :--- | :--- | :--- |
| **OS** | Windows 10/11, Ubuntu 20.04+, or Debian (RPi) | Cross-platform support. |
| **Node.js** | Version 20.x (LTS) or higher | Required for Next.js 15 and Backend. |
| **Database** | MySQL 8.0 | Native JSON support and strict schema compliance. |
| **Browser** | Chrome, Brave, or Chromium | **Critical:** The backend does not bundle a browser to save space. It uses the one installed on the OS. |
| **Git** | Latest Version | For version control. |

-----

## 5\. Installation Guide: Developer (Source Code)

Use this method if you intend to modify the code or contribute.

### Step 1: Clone the Repository

```bash
git clone <repository_url>
cd InvoiceCore
```

### Step 2: Backend Setup

1.  **Install Dependencies:**
    ```bash
    cd backend
    npm install
    ```
2.  **Environment Configuration:**
    Create a file named `.env` in the `backend/` folder:
    ```env
    PORT=5000
    DATABASE_URL="mysql://root:PASSWORD@localhost:3306/invoice_core_db"
    JWT_SECRET="super_secret_random_string"
    # PATH TO YOUR BROWSER (CRITICAL FOR PDF)
    # Windows: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    # Linux: "/usr/bin/chromium-browser"
    PUPPETEER_EXECUTABLE_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    ```
3.  **Database Initialization:**
    ```bash
    npx prisma db push  # Pushes schema to MySQL
    npx prisma db seed  # Seeds Countries, Currencies, and States
    ```
4.  **Start Backend:**
    ```bash
    npm run dev
    ```

### Step 3: Frontend Setup

1.  **Open a new terminal** and navigate to frontend:
    ```bash
    cd frontend
    npm install
    ```
2.  **Start Frontend:**
    ```bash
    npm run dev
    ```
3.  **Access:** Open `http://localhost:3000`.

-----

## 6\. Installation Guide: Consumer (Production / Self-Hosting)

Use this method for deploying on a Raspberry Pi, VPS, or Office Server.

### Step 1: Build the Backend

```bash
cd backend
npm run build
# This creates a /dist folder with the compiled JavaScript
```

### Step 2: Build the Frontend

```bash
cd ../frontend
npm run build
```

*Post-build Action:* To run Next.js in standalone mode (lighter on resources), copy the public assets:

```bash
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```

### Step 3: Process Management (PM2)

We use PM2 to ensure the application restarts automatically if the server reboots.

1.  **Install PM2 Global:**
    ```bash
    npm install -g pm2
    ```
2.  **Start Backend:**
    ```bash
    # From project root
    pm2 start backend/dist/index.js --name "ic-backend"
    ```
3.  **Start Frontend:**
    ```bash
    # From project root
    pm2 start frontend/.next/standalone/server.js --name "ic-frontend" -- start
    ```
4.  **Persist Processes:**
    ```bash
    pm2 save
    pm2 startup
    ```
5. **Setup Program**
   ```bash
   Now vist https://yourdomain.com/setup to complete the setup of your software.
   ```

-----

## 7\. Troubleshooting & Common Issues

### Issue 1: PDF Generation 500 Error

  * **Symptoms:** Clicking "Download PDF" spins for a while and fails, or returns a 500 error.
  * **Cause:** The backend cannot find the Chrome executable on the host machine.
  * **Solution:** Open `backend/.env` and verify the `PUPPETEER_EXECUTABLE_PATH`. Copy the path directly from your file explorer. On Windows, ensure you use double backslashes `\\`.

### Issue 2: Images/Logos Missing in PDF

  * **Symptoms:** Logos appear on the website but show as broken icons in the downloaded PDF.
  * **Cause:** The PDF engine (Puppeteer) is headless and might not resolve relative paths (e.g., `/uploads/logo.png`) correctly locally.
  * **Solution:** The system expects the backend to be running on Port 5000. Ensure the image URLs in the database are fully qualified or that the backend is serving static files correctly via `express.static`.

### Issue 3: "Client Not Found" in Dropdowns

  * **Symptoms:** When creating an invoice, the State or Country dropdowns are empty.
  * **Cause:** The database seeding script was skipped.
  * **Solution:** Run `npx prisma db seed` inside the backend folder.

### Issue 4: Image Uploads Fail (404) in Production

  * **Symptoms:** Uploading a logo works in Dev, but fails in Production build.
  * **Cause:** Next.js optimizes the `public` folder at build time. Dynamic uploads after the build are not automatically served by Next.js.
  * **Solution:** The `next.config.ts` includes a rewrite rule. It directs all traffic from `/uploads/*` to the Backend (`http://localhost:5000/uploads/*`). Ensure the backend is running.

-----

## 8\. Directory Structure Overview

```text
InvoiceCore/
├── backend/
│   ├── dist/                 # Compiled JS (Production)
│   ├── middleware/           # Auth & Security checks
│   ├── prisma/
│   │   ├── schema.prisma     # Database Schema
│   │   └── seed.ts           # Initial Data script
│   ├── routes/               # API Endpoints (invoices, clients, auth)
│   ├── services/             # Business Logic (Tax, PDF, Email services)
│   │   └── templates/        # HTML Templates for PDF generation
│   ├── index.ts              # Entry Point
│   └── .env                  # Environment Variables
├── frontend/
│   ├── app/                  # Next.js App Router Pages
│   ├── components/
│   │   ├── ui/               # Shadcn UI components
│   │   └── settings/         # Configuration forms
│   ├── lib/                  # Utilities (currency formatters, API clients)
│   ├── public/               # Static assets
│   └── next.config.ts        # Proxy & Rewrite rules
└── README.md
```
