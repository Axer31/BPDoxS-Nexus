import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

// --- Helper: Convert Number to Words (Indian Numbering System) ---
const numberToWords = (n: number): string => {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (n === 0) return '';

  const convert = (num: number): string => {
    if (num < 20) return units[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + units[num % 10] : '');
    if (num < 1000) return units[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + convert(num % 100) : '');
    if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
    if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '');
    return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '');
  };

  return convert(n);
};

const getAmountInWords = (amount: number, currency: string = 'INR') => {
  const whole = Math.floor(amount);
  const fraction = Math.round((amount - whole) * 100);
  
  let currencyName = "Rupees";
  let fractionName = "Paise";
  
  if (currency === 'USD') { currencyName = "Dollars"; fractionName = "Cents"; }
  if (currency === 'EUR') { currencyName = "Euros"; fractionName = "Cents"; }
  
  let str = numberToWords(whole) + " " + currencyName;
  if (fraction > 0) {
      str += " and " + numberToWords(fraction) + " " + fractionName;
  }
  return str + " Only";
};

export const generateInvoiceHTML = (invoice: any, ownerProfile: any): string => {
  try {
    // 1. Data Setup
    const items = Array.isArray(invoice.line_items) ? invoice.line_items : [];
    const tax = invoice.tax_summary || { taxType: 'IGST', breakdown: { cgst: 0, sgst: 0, igst: 0 } };
    const profile = ownerProfile?.json_value || {};
    const currency = invoice.currency || 'INR';
    const amountInWords = getAmountInWords(Number(invoice.grand_total), currency);

    // 2. Formatters
    const formatCurrency = (amount: any) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(Number(amount) || 0);
    };
    

    const formatDate = (dateString: any) => {
      try {
        return dateString ? format(new Date(dateString), "dd MMM yyyy") : '-';
      } catch (e) { return '-'; }
    };

    // 3. Image Loader
    const getBase64Image = (webPath: string) => {
      if (!webPath) return null;
      try {
        const cleanPath = webPath.startsWith('/') ? webPath.slice(1) : webPath;
        const systemPath = path.resolve(process.cwd(), '../frontend/public', cleanPath);
        if (fs.existsSync(systemPath)) {
          const bitmap = fs.readFileSync(systemPath);
          const ext = path.extname(systemPath).slice(1);
          const mimeType = ext === 'svg' ? 'svg+xml' : ext;
          return `data:image/${mimeType};base64,${bitmap.toString('base64')}`;
        }
        return null;
      } catch (e) { return null; }
    };

    const logoSrc = getBase64Image(profile.logo);
    const signatureSrc = getBase64Image(profile.signature);
    const stampSrc = getBase64Image(profile.stamp);

    // 4. Tax Logic
    let taxRows = '';
    const cgst = tax.breakdown?.cgst || 0;
    const sgst = tax.breakdown?.sgst || 0;
    const igst = tax.breakdown?.igst || 0;
    const rate = tax.gstRate || 18;

    if (tax.taxType === 'CGST_SGST' || (cgst > 0)) {
        taxRows += `
          <tr><td>SGST (${rate/2}%)</td><td>${formatCurrency(sgst)}</td></tr>
          <tr><td>CGST (${rate/2}%)</td><td>${formatCurrency(cgst)}</td></tr>
          <tr><td>IGST </td><td> — </td></tr>
          
        `;
    } else {
        taxRows += `
            <tr><td>SGST</td><td> — </td></tr>
            <tr><td>CGST </td><td> — </td></tr>
            <tr><td>IGST (${rate}%)</td><td>${formatCurrency(igst)}</td></tr>
        `;
    }

    // 5. HTML Template
    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${invoice.invoice_number}</title>
<style>
    @page { margin: 0; size: A4; }
    :root {
        --accent: #3A6EF3; /* Horizon Blue */
        --border: #dadada;
        --text: #222;
    }

    * { box-sizing: border-box; }

    body {
        font-family: Calibri;
        font-size: 12pt;
        color: var(--text);
        margin: 0;
        padding: 40px 50px;
        background: #fff;
    }

    /* Wrapper */
    .invoice-wrapper {
        max-width: 800px;
        margin: 0 auto;
    }

    /* HEADER */
    .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 25px;
        margin-bottom: 28px;
        font-family: Helvetica;
    }

    .company-name {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 6px;
        color: #000;
        font-family: Helvetica;
    }

    .company-name-divider {
        width: 150px;
        height: 2px;
        background: #000;
        margin-bottom: 10px;
    }

    .company-meta-line,
    .company-address-line {
        font-size: 11px;
        line-height: 1.4;
    }

    #company-logo {
        max-width: 150px;
        max-height: 80px;
        object-fit: contain;
    }

    /* INVOICE META */
    .invoice-meta {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 22px;
        padding-bottom: 10px;
    }

    .invoice-meta div { margin-right: 20px; }
    .invoice-meta-label { font-weight: 600; color: #000; }

    /* CLIENT CARD */
    #client-card {
        border: 1px solid var(--border);
        background: #fafafa;
        padding: 14px 16px;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 26px;
    }

    #client-card-title {
        font-weight: 600;
        font-size: 12px;
        margin-bottom: 7px;
        text-transform: uppercase;
        color: #000;
    }

    /* PRODUCT TABLE */
    #product-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 12px;
        overflow: hidden;
    }

    #product-table thead th {
        background: var(--accent);
        color: #fff;
        padding: 10px;
        border: 1px solid var(--border);
        font-weight: 600;
        text-align: center;
        overflow: hidden;
    }

    #product-table tbody td {
        border: 1px solid var(--border);
        padding: 8px 10px;
        vertical-align: middle;
    }

    .col-sno { width: 5%; text-align: center; }
    .col-desc { width: 45%; }
    .col-hsn { width: 10%; text-align: center; }
    .col-qty { width: 10%; text-align: center; }
    .col-rate { width: 15%; text-align: center; }
    .col-total { width: 15%; text-align: center; }
    
    /* BOTTOM SECTION (Split Layout) */
    .bottom-split {
        display: flex;
        justify-content: space-between;
        align-items: stretch;      /* Makes both columns equal height */
        gap: 20px;                 /* Optional, cleaner spacing */
        margin-top: 10px;
    }

    .bottom-left { 
        width: 55%;
        display: flex;
    }

    .bottom-right { 
        width: 40%;
        display: flex;
    }

    /* Make inner boxes stretch FULL HEIGHT */
    .bottom-left .bank-info,
    .bottom-right #table-totals {
        flex: 1;                   /* <- This is the key line */
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
    }

    /* BANK INFO BOX */
    .bank-info {
        font-size: 12px;
        background: #f9fafb;
        padding: 10px;
        border: 1px solid var(--border);
        border-radius: 4px;
        margin: 0;                 /* Important: prevents mismatched heights */
    }

    .bank-title { 
        font-weight: bold; 
        color: #000; 
        margin-bottom: 5px; 
    }

    /* TOTALS BOX */
    #table-totals {
        width: 100%;
        border: 1px solid var(--border);
        background: #fafafa;
        padding: 10px;
        border-radius: 4px;
        font-size: 12px;
        margin: 0;                 /* Important */
        box-sizing: border-box;
    }

    #table-totals-row { 
        width: 100%; 
        border-collapse: collapse; 
    }

    #table-totals-row td { 
        padding: 4px 3px; 
    }

    #table-totals-row td:first-child { 
        text-align: left; 
        font-size: 12px; 
        color: #000; 
    }

    #table-totals-row td:last-child { 
        text-align: right; 
        font-size: 12px;  
    }

    .grand-total-label, 
    .grand-total-value {
        font-weight: 700 !important;
        font-size: 12px !important;
        color: #000;
        padding-top: 8px !important;
    }
    /* SIGNATURE SECTION */

    /* SIGNATURE BLOCK (Separated) */
    .sign-container {
        margin-top: 30px;
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .for-company {
        font-size: 9pt;
        font-weight: 700;
        margin-bottom: 5px;
    }

    /* --- FLEX CONTAINER TO PREVENT OVERLAP --- */
    .sign-wrapper {
        display: flex;
        align-items: flex-end; /* Bottom align both images */
        justify-content: flex-end; /* Align to right */
        gap: 15px; /* Space between stamp and signature */
        margin-bottom: 5px;
        min-height: 70px; /* Ensure height for images */
    }

    .stamp-img {
        height: 40px;
        width: auto;
        object-fit: contain;
        opacity: 0.9;
        margin-right: -30px;
        transform: rotate(-7deg);
    }

    .sign-img {
        height: 40px;
        width: auto;
        margin-right: 20px;
        object-fit: contain;
    }

    .auth-text {
        font-size: 9pt;
        font-weight: 600;
        padding-top: 5px;
        width: 200px;
        text-align: center;
    }

    /* FOOTER */
    #footer {
        max-width: 800px;
        margin: 40px auto 0 auto;
        padding: 0 35px 10px 35px;
        text-align: center;
        font-size: 11px;
    }
    #footer-line {
        width: 100%;
        height: 1px;
        background: var(--accent);
        margin-bottom: 10px;
    }
</style>
</head>
<body>

<div class="invoice-wrapper">

    <div class="invoice-header">
        <div>
            <div class="company-name">${profile.company_name || 'Company Name'}</div>
            <div class="company-name-divider"></div>
            <div class="company-meta-line">Email: ${profile.email || ''} | Phone: ${profile.phone || ''}</div>
            <div class="company-meta-line">
            ${profile.gstin ? `GSTIN: ${profile.gstin}` : ''} 
            ${profile.gstin && profile.cin ? ' | ' : ''} 
            ${profile.cin ? `CIN: ${profile.cin}` : ''}
            </div>
            <div class="company-address-line" style="white-space: pre-line;">${profile.address || ''}</div>
        </div>
        <div>
            ${logoSrc ? `<img id="company-logo" src="${logoSrc}" />` : ''}
        </div>
    </div>

    <div class="invoice-meta">
        <div><span class="invoice-meta-label">Invoice #:</span> ${invoice.invoice_number}</div>
        <div><span class="invoice-meta-label">Date:</span> ${formatDate(invoice.issue_date)}</div>
        <div><span class="invoice-meta-label">Due:</span> ${invoice.due_date ? formatDate(invoice.due_date) : 'On Receipt'}</div>
    </div>

    <div id="client-card">
        <div id="client-card-title">Client Details</div>
        <div>${invoice.client.company_name}</div>
        <div>${invoice.client.phone || ''}</div>
        <div>${invoice.client.email || ''}</div>
        <div>
            ${invoice.client.addresses?.billing?.street || ''}, 
            ${invoice.client.addresses?.billing?.city || ''}, 
            ${invoice.client.addresses?.billing?.zip || ''}
        </div>
        ${invoice.client.tax_id ? `<div>Tax ID: ${invoice.client.tax_id}</div>` : ''}
    </div>

    <table id="product-table" cellspacing="0">
        <thead>
            <tr>
                <th class="col-sno">S.No</th>
                <th class="col-desc" style="text-align: left;">Particulars</th>
                <th class="col-hsn">HSN</th>
                <th class="col-qty">Qty</th>
                <th class="col-rate">Rate</th>
                <th class="col-total">Total</th>
            </tr>
        </thead>
        <tbody>
            ${items.map((item: any, index: number) => `
            <tr>
                <td class="col-sno">${index + 1}</td>
                <td class="col-desc">
                    <div style="font-weight: 400;">${item.description}</div>
                </td>
                <td class="col-hsn">${item.hsn || '-'}</td>
                <td class="col-qty">${item.quantity}</td>
                <td class="col-rate">${formatCurrency(item.rate)}</td>
                <td class="col-total">${formatCurrency(item.amount)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="bottom-split">
        
        <div class="bottom-left">
            <div class="bank-info">
                <div class="bank-title">Bank Details</div>
                <div>Bank: ${invoice.bank_account?.bank_name || profile.bank_details || 'N/A'}</div>
                <div>A/C No: ${invoice.bank_account?.account_number || ''}</div>
                <div>IFSC: ${invoice.bank_account?.ifsc_code || ''}</div>
            </div>
        </div>

        <div class="bottom-right">
            <div id="table-totals">
                <table id="table-totals-row">
                    <tr><td>Subtotal</td><td>${formatCurrency(Number(invoice.subtotal))}</td></tr>
                    ${taxRows}
                    <tr><td class="grand-total-label">Grand Total</td><td class="grand-total-value">${formatCurrency(Number(invoice.grand_total))}</td></tr>
                </table>
            </div>
        </div>

    </div>
        <div style="margin: auto; padding: 8px; font-size: 10pt; display:flex; justify-content:center;">
                <p style="text-align: center;"><strong>Amount in Words:</strong> ${amountInWords}</p>
        </div>
            <div class="sign-container">
                
                <div class="sign-wrapper">
                    ${stampSrc ? `<img src="${stampSrc}" class="stamp-img" />` : ''}
                    ${signatureSrc ? `<img src="${signatureSrc}" class="sign-img" />` : ''}
                </div>

                <div class="auth-text">Authorized Signatory</div>
            </div>
</div>

<div id="footer">
    <div id="footer-line"></div>
    <div><strong>${profile.company_name || ''}</strong></div>
    <div>${profile.address || ''}</div>
    <div>GSTIN: ${profile.gstin || ''} | CIN: ${profile.cin || ''}</div>
    <div style="margin-top:5px; color:#555;">This is a computer-generated invoice and no signature is required.</div>
</div>

</body>
</html>
    `;

  } catch (error) {
    return `<html><body><h1>Error</h1><pre>${error}</pre></body></html>`;
  }
};