import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

export const generateInvoiceHTML = (invoice: any, ownerProfile: any): string => {
  try {
    // 1. Safety Checks & Defaults
    const items = Array.isArray(invoice.line_items) ? invoice.line_items : [];
    const tax = invoice.tax_summary || { taxType: 'NONE', breakdown: { cgst: 0, sgst: 0, igst: 0 } };
    const profile = ownerProfile?.json_value || {};
    const currency = invoice.currency || 'INR';

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
      } catch (e) {
        return '-';
      }
    };

    // 3. Image Loader (Robust Path Handling)
    const getBase64Image = (webPath: string) => {
      if (!webPath) return null;
      try {
        // Handle paths whether they start with / or not
        const cleanPath = webPath.startsWith('/') ? webPath.slice(1) : webPath;
        
        // Construct path relative to backend execution
        // Assuming structure: /root/backend and /root/frontend
        const systemPath = path.join(process.cwd(), '../frontend/public', cleanPath);
        
        if (fs.existsSync(systemPath)) {
          const bitmap = fs.readFileSync(systemPath);
          const ext = path.extname(systemPath).slice(1);
          return `data:image/${ext};base64,${bitmap.toString('base64')}`;
        } else {
          console.warn(`[InvoiceTemplate] Image not found at: ${systemPath}`);
          return null;
        }
      } catch (e) {
        console.error("[InvoiceTemplate] Image loading error:", e);
        return null; 
      }
    };

    const logoSrc = getBase64Image(profile.logo);
    const signatureSrc = getBase64Image(profile.signature);

    // 4. Tax Logic
    let taxRows = '';
    if (tax.taxType === 'IGST') {
        taxRows = `<div class="row"><strong>IGST (${tax.gstRate || 18}%):</strong> <span>${formatCurrency(tax.breakdown?.igst)}</span></div>`;
    } else if (tax.taxType === 'CGST_SGST') {
        taxRows = `
          <div class="row"><strong>CGST (${(tax.gstRate || 18)/2}%):</strong> <span>${formatCurrency(tax.breakdown?.cgst)}</span></div>
          <div class="row"><strong>SGST (${(tax.gstRate || 18)/2}%):</strong> <span>${formatCurrency(tax.breakdown?.sgst)}</span></div>
        `;
    }

    // 5. Generate Line Items
    const lineItemsHTML = items.map((item: any, index: number) => `
      <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${index + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
              <div style="font-weight:bold;">${item.description}</div>
              <div style="font-size: 9pt; color: #666;">HSN: ${item.hsn || 'N/A'}</div>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.rate)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.amount)}</td>
      </tr>
    `).join('');

    // 6. Return HTML String
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8">
  <style>
      @page { margin: 0; size: A4; }
      body { font-family: 'Helvetica', Arial, sans-serif; font-size: 10pt; color: #333; margin: 0; padding: 40px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
      .company-name { font-size: 20pt; font-weight: bold; color: #2563eb; }
      .invoice-title { font-size: 24pt; font-weight: bold; text-align: right; color: #ccc; }
      .meta-table td { padding: 4px 0; }
      .bill-to { margin-top: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 30px; }
      th { background: #1e293b; color: white; padding: 10px; text-align: left; font-size: 9pt; }
      .totals { float: right; width: 250px; margin-top: 20px; }
      .row { display: flex; justify-content: space-between; padding: 5px 0; }
      .grand-total { border-top: 2px solid #333; padding-top: 5px; font-weight: bold; font-size: 12pt; margin-top: 5px; }
      .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  </style>
  </head>
  <body>
  
      <div class="header">
          <div>
              ${logoSrc ? `<img src="${logoSrc}" style="height: 60px; margin-bottom: 10px;" />` : ''}
              <div class="company-name">${profile.company_name || 'Your Company'}</div>
              <div>${profile.address || ''}</div>
              <div>GSTIN: ${profile.gstin || 'N/A'}</div>
              <div>${profile.email || ''} | ${profile.phone || ''}</div>
          </div>
          <div style="text-align: right;">
              <div class="invoice-title">INVOICE</div>
              <table class="meta-table" align="right">
                  <tr><td style="padding-right: 15px;">Invoice #:</td><td><strong>${invoice.invoice_number}</strong></td></tr>
                  <tr><td style="padding-right: 15px;">Date:</td><td>${formatDate(invoice.issue_date)}</td></tr>
                  <tr><td style="padding-right: 15px;">Due Date:</td><td>${formatDate(invoice.due_date)}</td></tr>
              </table>
          </div>
      </div>
  
      <div class="bill-to">
          <div style="font-size: 8pt; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">Bill To</div>
          <div style="font-size: 12pt; font-weight: bold;">${invoice.client.company_name}</div>
          <div>${invoice.client.addresses?.billing?.street || ''}</div>
          <div>
            ${invoice.client.addresses?.billing?.city || ''}, 
            ${invoice.client.addresses?.billing?.zip || ''}
          </div>
          ${invoice.client.tax_id ? `<div>GSTIN: ${invoice.client.tax_id}</div>` : ''}
      </div>
  
      <table>
          <thead>
              <tr>
                  <th style="width: 5%;">#</th>
                  <th style="width: 45%;">Item Description</th>
                  <th style="width: 10%; text-align: center;">Qty</th>
                  <th style="width: 20%; text-align: right;">Rate</th>
                  <th style="width: 20%; text-align: right;">Total</th>
              </tr>
          </thead>
          <tbody>
              ${lineItemsHTML}
          </tbody>
      </table>
  
      <div class="totals">
          <div class="row"><strong>Subtotal:</strong> <span>${formatCurrency(invoice.subtotal)}</span></div>
          ${taxRows}
          <div class="row grand-total"><strong>Grand Total:</strong> <span>${formatCurrency(invoice.grand_total)}</span></div>
      </div>
  
      <div style="clear: both; margin-top: 60px;">
          ${signatureSrc ? `<img src="${signatureSrc}" style="height: 50px;" /><br>` : ''}
          <strong>Authorized Signatory</strong>
      </div>
  
      <div class="footer">
          This is a computer-generated invoice.
      </div>
  
  </body>
  </html>
    `;

  } catch (error) {
    console.error("CRITICAL ERROR GENERATING INVOICE HTML:", error);
    // Return an error page so PDF generation doesn't crash the server
    return `<html><body><h1>System Error</h1><p>Failed to generate invoice template.</p><pre>${error}</pre></body></html>`;
  }
};