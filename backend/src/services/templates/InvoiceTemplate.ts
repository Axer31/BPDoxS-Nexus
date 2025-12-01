import fs from 'fs';
import path from 'path';

export const generateInvoiceHTML = (invoice: any, ownerProfile: any) => {
  const items = invoice.line_items; 
  const tax = invoice.tax_summary;  

  // --- 1. HELPER: Format Currency ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: invoice.currency || 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // --- 2. HELPER: Get Base64 Image ---
  // Reads files from frontend/public/uploads and converts to Base64
  // so Puppeteer can render them without needing a running web server
  const getBase64Image = (webPath: string) => {
    if (!webPath) return null;
    try {
      // Resolve path: backend/src/services/templates -> root/frontend/public
      const systemPath = path.join(__dirname, '../../../../frontend/public', webPath);
      
      if (fs.existsSync(systemPath)) {
        const bitmap = fs.readFileSync(systemPath);
        const ext = path.extname(systemPath).slice(1);
        return `data:image/${ext};base64,${bitmap.toString('base64')}`;
      }
      return null;
    } catch (e) {
      console.error("Image load failed for:", webPath, e);
      return null;
    }
  };

  // --- 3. PREPARE DATA ---
  
  // Load Branding Images
  const logoSrc = getBase64Image(ownerProfile?.json_value?.logo);
  const signatureSrc = getBase64Image(ownerProfile?.json_value?.signature);

  // Bank Details Logic
  let bankBlock = null;
  if (invoice.bank_account) {
    // A. Priority: Use the Bank Account selected on this specific Invoice
    const b = invoice.bank_account;
    let codeLabel = 'Routing';
    let codeValue = b.routing_number;

    if (b.swift_code) {
        codeLabel = 'SWIFT/BIC';
        codeValue = b.swift_code;
    } else if (b.ifsc_code) {
        codeLabel = 'IFSC';
        codeValue = b.ifsc_code;
    }

    bankBlock = {
      name: b.bank_name,
      account: b.account_number,
      codeLabel: codeLabel,
      codeValue: codeValue || '-',
      iban: b.iban
    };
  } else if (ownerProfile?.json_value?.bank_details) {
    // B. Fallback: Use Global Company Settings
    const b = ownerProfile.json_value.bank_details;
    bankBlock = {
      name: b.bank_name || '-',
      account: b.ac_no || '-',
      codeLabel: 'IFSC',
      codeValue: b.ifsc || '-',
      iban: null
    };
  }

  // --- 4. RENDER HTML ---
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: 'Helvetica', 'Arial', sans-serif; 
          color: #333; 
          padding: 40px; 
          max-width: 800px; 
          margin: 0 auto; 
          font-size: 14px;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 40px; 
          border-bottom: 2px solid #f1f5f9; 
          padding-bottom: 20px; 
        }
        .company-logo {
            max-width: 150px; 
            max-height: 80px; 
            margin-bottom: 15px;
            display: block;
        }
        .company-name { 
          font-size: 24px; 
          font-weight: bold; 
          color: #0f172a; 
          margin-bottom: 5px; 
        }
        .invoice-title { 
          font-size: 32px; 
          font-weight: bold; 
          text-align: right; 
          color: #64748b; 
          letter-spacing: 1px;
        }
        
        .details-grid { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 30px; 
        }
        .box { width: 45%; }
        .label { 
          font-size: 10px; 
          text-transform: uppercase; 
          color: #64748b; 
          font-weight: bold; 
          margin-bottom: 4px; 
          margin-top: 12px; 
        }
        .value { line-height: 1.5; }
        .meta-value { text-align: right; line-height: 1.5; }

        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px; 
        }
        th { 
          text-align: left; 
          padding: 12px; 
          background: #f8fafc; 
          font-size: 11px; 
          text-transform: uppercase; 
          color: #475569; 
          border-bottom: 1px solid #e2e8f0;
        }
        td { 
          padding: 12px; 
          border-bottom: 1px solid #e2e8f0; 
          vertical-align: top;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .totals-section { 
          margin-top: 30px; 
          display: flex; 
          justify-content: flex-end; 
        }
        .totals-box { width: 300px; }
        .row { 
          display: flex; 
          justify-content: space-between; 
          padding: 6px 0; 
        }
        .grand-total { 
          font-size: 16px; 
          font-weight: bold; 
          border-top: 2px solid #0f172a; 
          padding-top: 10px; 
          margin-top: 10px; 
          color: #0f172a;
        }

        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 10px;
          color: #94a3b8;
          text-align: center;
        }
        
        .bank-details {
          margin-top: 40px;
          padding: 15px;
          background-color: #f8fafc;
          border-radius: 4px;
          font-size: 12px;
          width: 60%;
          border: 1px solid #e2e8f0;
        }
        .remarks-box {
          margin-top: 20px;
          font-size: 12px;
          color: #64748b;
          font-style: italic;
          padding: 10px;
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 4px;
          width: 60%;
        }
      </style>
    </head>
    <body>

      <div class="header">
        <div>
          ${logoSrc ? `<img src="${logoSrc}" class="company-logo" />` : ''}
          
          <div class="company-name">${ownerProfile?.value || 'Company Name'}</div>
          <div class="value" style="white-space: pre-line;">${ownerProfile?.json_value?.address || ''}</div>
          <div class="label">GSTIN</div>
          <div class="value">${ownerProfile?.json_value?.gstin || '-'}</div>
          <div class="label">Contact</div>
          <div class="value">${ownerProfile?.json_value?.email || ''} | ${ownerProfile?.json_value?.phone || ''}</div>
        </div>
        <div>
          <div class="invoice-title">INVOICE</div>
          <div class="label" style="text-align: right;">Invoice #</div>
          <div class="meta-value"># ${invoice.invoice_number}</div>
          
          <div class="label" style="text-align: right;">Date</div>
          <div class="meta-value">${new Date(invoice.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          
          ${invoice.due_date ? `
            <div class="label" style="text-align: right;">Due Date</div>
            <div class="meta-value">${new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          ` : ''}
        </div>
      </div>

      <div class="details-grid">
        <div class="box">
          <div class="label">Bill To</div>
          <div class="company-name" style="font-size: 16px;">${invoice.client.company_name}</div>
          
          <div class="value">
             ${invoice.client.addresses?.billing?.street ? invoice.client.addresses.billing.street + ',' : ''}
             ${invoice.client.addresses?.billing?.city || ''} 
             ${invoice.client.addresses?.billing?.zip || ''}
          </div>

          <div class="label">Client GSTIN</div>
          <div class="value">${invoice.client.tax_id || 'N/A'}</div>
          
          <div class="label">Place of Supply</div>
          <div class="value">${invoice.client.country === 'India' ? `State Code: ${invoice.client.state_code}` : 'Export / International'}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40%;">Description</th>
            <th class="text-center" style="width: 15%;">HSN / SAC</th>
            <th class="text-right" style="width: 10%;">Qty</th>
            <th class="text-right" style="width: 15%;">Rate</th>
            <th class="text-right" style="width: 20%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td>
                <div style="font-weight: 500;">${item.description}</div>
              </td>
              <td class="text-center">${item.hsn || '-'}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">${formatCurrency(item.rate).replace(/[^0-9.-]+/g,"")}</td>
              <td class="text-right">${formatCurrency(item.amount).replace(/[^0-9.-]+/g,"")}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="totals-box">
          <div class="row">
            <span>Subtotal</span>
            <span>${formatCurrency(Number(invoice.subtotal))}</span>
          </div>
          
          ${tax.taxType === 'IGST' ? `
            <div class="row">
              <span>IGST (${tax.gstRate}%)</span>
              <span>${formatCurrency(tax.breakdown.igst)}</span>
            </div>
          ` : ''}

          ${tax.taxType === 'CGST_SGST' ? `
            <div class="row">
              <span>CGST (${tax.gstRate/2}%)</span>
              <span>${formatCurrency(tax.breakdown.cgst)}</span>
            </div>
            <div class="row">
              <span>SGST (${tax.gstRate/2}%)</span>
              <span>${formatCurrency(tax.breakdown.sgst)}</span>
            </div>
          ` : ''}

          ${tax.taxType === 'NONE' ? `
             <div class="row" style="color: green;">
              <span>Tax (Export/Exempt)</span>
              <span>0.00</span>
            </div>
          ` : ''}

          <div class="row grand-total">
            <span>Total</span>
            <span>${formatCurrency(Number(invoice.grand_total))}</span>
          </div>
          <div style="font-size: 10px; text-align: right; margin-top: 5px; color: #64748b;">
            All amounts in ${invoice.currency || 'INR'}
          </div>
        </div>
      </div>

      ${invoice.remarks ? `
        <div class="remarks-box">
          <strong>Remarks:</strong><br/>
          ${invoice.remarks.replace(/\n/g, '<br/>')}
        </div>
      ` : ''}

      ${bankBlock ? `
        <div class="bank-details">
          <div class="label" style="margin-top: 0;">Bank Details for Payment</div>
          <div class="row"><span>Bank Name:</span> <strong>${bankBlock.name}</strong></div>
          <div class="row"><span>Account No:</span> <strong>${bankBlock.account}</strong></div>
          
          ${bankBlock.codeValue ? `
            <div class="row"><span>${bankBlock.codeLabel}:</span> <strong>${bankBlock.codeValue}</strong></div>
          ` : ''}
          
          ${bankBlock.iban ? `
            <div class="row"><span>IBAN:</span> <strong>${bankBlock.iban}</strong></div>
          ` : ''}
        </div>
      ` : ''}

      <div class="footer">
        ${signatureSrc ? `
          <div style="text-align: right; margin-bottom: 10px;">
            <img src="${signatureSrc}" style="max-width: 120px; max-height: 60px;" />
            <div style="font-size: 10px; margin-top: 5px; font-weight: bold;">Authorised Signatory</div>
          </div>
        ` : ''}
        
        This is a computer-generated invoice and does not require a physical signature.
      </div>

    </body>
    </html>
  `;
};