# BPDoxS-Nexus – Master Variables & Configuration Reference

**Version:** 1.2.0  
**Last Updated:** 2025-12-10

This document serves as the "source of truth" for all configurable parameters, environment variables, hardcoded constants, and template placeholders within the InvoiceCore system.

-----

## 1\. Backend Environment Variables (`backend/.env`)

These variables control the server's behavior and must be set in the `.env` file before starting the application.

| Variable Name | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| **`PORT`** | No | `5000` | The port the backend server listens on. |
| **`DATABASE_URL`** | **Yes** | - | MySQL connection string. <br> **Format:** `mysql://USER:PASSWORD@HOST:PORT/DATABASE` |
| **`JWT_SECRET`** | **Yes** | - | A long, random string used to sign Session Tokens. Changing this logs out all users. |
| **`PUPPETEER_EXECUTABLE_PATH`** | **Yes** | - | Absolute path to Chrome/Chromium executable. <br> **Win:** `C:\Program Files\Google\Chrome\Application\chrome.exe` <br> **Linux:** `/usr/bin/chromium-browser` |

-----

## 2\. Database System Settings (`SystemSetting` Table)

These settings are stored in the database (`json_value` column) and managed via the UI (`/settings`).

### A. Company Profile (`key: 'COMPANY_PROFILE'`)

These variables are injected into Invoices, Quotations, and Ledgers.

| JSON Key | Type | Description |
| :--- | :--- | :--- |
| `company_name` | `string` | The legal entity name. |
| `address` | `string` | Full multi-line address. |
| `state_code` | `number` | **Critical.** Used for Tax Calculation (IGST vs. CGST). See *State Codes* section. |
| `gstin` | `string` | Tax Identification Number (GSTIN/VAT). |
| `cin` | `string` | Corporate Identity Number. |
| `logo` | `path` | Relative path to uploaded logo (e.g., `/uploads/logo.png`). |
| `signature` | `path` | Relative path to authorized signature image. |
| `stamp` | `path` | Relative path to company stamp image. |

### B. SMTP Configuration (`key: 'SMTP_CONFIG'`)

Variables used by `nodemailer` in `backend/routes/mailRoutes.ts`.

| JSON Key | Type | Description |
| :--- | :--- | :--- |
| `host` | `string` | SMTP Server (e.g., `smtp.gmail.com`). |
| `port` | `number` | Port (usually `587` for TLS or `465` for SSL). |
| `user` | `string` | SMTP Username/Email. |
| `password` | `string` | SMTP App Password. |
| `fromEmail` | `string` | The "From" address seen by clients. |

-----

## 3\. Invoice Template Variables (`backend/services/templates/InvoiceTemplate.ts`)

This file generates the HTML string sent to Puppeteer. If you are editing the design, these are the CSS variables and Data Placeholders available.

### A. CSS Styling Variables

Located in the `<style>:root` block.

| CSS Variable | Default | Usage |
| :--- | :--- | :--- |
| `--accent` | `#3A6EF3` | Main color (Horizon Blue). Used for table headers and footer lines. |
| `--border` | `#dadada` | Color of table borders and client card outlines. |
| `--text` | `#222` | Primary font color. |
| `font-family` | `Calibri` | Main body font. |

### B. Data Placeholders (Handlebars/JS Interpolation)

These JavaScript variables are available inside the `generateInvoiceHTML` function.

#### 1\. Invoice Object (`invoice`)

| Variable | Access | Description |
| :--- | :--- | :--- |
| **Number** | `${invoice.invoice_number}` | The generated sequence (e.g., INV/24-25/001). |
| **Date** | `${invoice.issue_date}` | The invoice creation date. |
| **Due Date** | `${invoice.due_date}` | Payment deadline. |
| **Grand Total** | `${invoice.grand_total}` | Final amount including tax. |
| **Subtotal** | `${invoice.subtotal}` | Amount before tax. |
| **Currency** | `${invoice.currency}` | 3-letter code (e.g., INR, USD). |

#### 2\. Client Object (`invoice.client`)

| Variable | Access | Description |
| :--- | :--- | :--- |
| **Name** | `${invoice.client.company_name}` | Client's company name. |
| **Tax ID** | `${invoice.client.tax_id}` | GSTIN or VAT ID. |
| **Address** | `${invoice.client.addresses.billing...}` | Access `.street`, `.city`, `.zip` inside. |

#### 3\. Bank Account Object (`invoice.bank_account`)

Only available if a bank account was selected during creation.
| Variable | Access | Description |
| :--- | :--- | :--- |
| **Name** | `${invoice.bank_account.bank_name}` | Bank Name. |
| **Account \#** | `${invoice.bank_account.account_number}` | Account Number. |
| **IFSC** | `${invoice.bank_account.ifsc_code}` | Indian Financial System Code. |
| **SWIFT** | `${invoice.bank_account.swift_code}` | International SWIFT/BIC. |
| **IBAN** | `${invoice.bank_account.iban}` | International Bank Account Number. |

### C. Helper Functions

These functions are available inside the template logic.

  * **`formatCurrency(amount)`**: Formats a number into currency (e.g., `₹ 1,500.00`) based on the invoice's currency code.
  * **`amountInWords`**: Automatically converts the Grand Total into words (e.g., *"Five Thousand Rupees Only"*). Logic supports `INR`, `USD`, `EUR`, `GBP`, `AUD`, `CAD`, `AED`.

-----

## 4\. Hardcoded Code Variables (Business Logic)

These values are hardcoded in the TypeScript files. To change them, you must edit the source code and rebuild the backend.

### A. Tax Rates (`backend/services/TaxService.ts`)

The default GST rate is hardcoded as a fallback.

| Location | Variable/Value | Description |
| :--- | :--- | :--- |
| `calculateTaxType` | `gstRate: 18.0` | **Default Tax Rate.** Currently set to 18%. |
| `calculateTaxType` | `cgst: 9.0` | Half of the tax rate for Intra-state. |
| `calculateTaxType` | `sgst: 9.0` | Half of the tax rate for Intra-state. |

*To change the default tax to 5%:* Edit `TaxService.ts` and change `18.0` to `5.0`, and `9.0` to `2.5`.

### B. Currency Support (`frontend/lib/currencies.ts`)

Controls which currencies appear in the dropdown menu.

| Constant Name | Purpose |
| :--- | :--- |
| **`AVAILABLE_CURRENCIES`** | An array of objects defining supported currencies. |

**Structure:**

```typescript
{ 
  code: 'USD',    // stored in DB
  name: 'US Dollar', 
  symbol: 'US$',  // displayed in UI
  locale: 'en-US' // used for Intl.NumberFormat
}
```

### C. PDF Generation Config (`backend/services/PdfService.ts`)

Controls the Puppeteer engine behavior.

| Setting | Value | Description |
| :--- | :--- | :--- |
| `args` | `['--no-sandbox', '--disable-setuid-sandbox', ...]` | Flags to ensure Chrome runs on Linux VPS/ARM64. |
| `viewport` | `width: 794, height: 1123` | **A4 Dimensions** in pixels (at 96 DPI). |
| `deviceScaleFactor` | `2` | Renders PDF at 2x resolution (Retina) for clearer text. |
| `timeout` | `30000` | Max time (ms) to wait for PDF generation before failing. |

-----

## 5\. Frontend Configuration (`frontend/next.config.ts`)

### A. Network Proxies

These rewrite rules bridge the Frontend (Port 3000) and Backend (Port 5000).

| Source | Destination | Purpose |
| :--- | :--- | :--- |
| `/api/:path*` | `http://localhost:5000/api/:path*` | API requests. |
| `/uploads/:path*` | `http://localhost:5000/uploads/:path*` | Static asset serving (Images). |

### B. Server Actions Security

| Setting | Value | Description |
| :--- | :--- | :--- |
| `allowedOrigins` | `["192.168.1.15", "localhost:3000"]` | Whitelist of IPs allowed to trigger Server Actions. **Add your VPS IP here.** |

-----

## 6\. Global Constants

### A. User Roles (`backend/middleware/authMiddleware.ts`)

| Role | Access Level |
| :--- | :--- |
| `SUDO_ADMIN` | Full System Access (Backups, Logs, Owner Settings). |
| `ADMIN` | Finance Management (Invoices, Expenses). |
| `STAFF` | Restricted (implementation dependent). |

### B. State Codes (`backend/prisma/seed.ts`)

Based on Indian GST State Codes. Examples:

  * `19`: West Bengal
  * `27`: Maharashtra
  * `29`: Karnataka
  * `07`: Delhi
