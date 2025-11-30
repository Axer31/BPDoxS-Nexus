// backend/src/services/templates/InvoiceTemplate.ts

export const generateInvoiceHTML = (invoice: any, ownerProfile: any) => {
  const items = invoice.line_items; // JSON array
  const tax = invoice.tax_summary;  // JSON object

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica', sans-serif; color: #333; padding: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .company-name { font-size: 24px; font-weight: bold; color: #0f172a; }
        .invoice-title { font-size: 32px; font-weight: bold; text-align: right; color: #64748b; }
        
        .details-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .box { width: 45%; }
        .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 4px; }
        .value { font-size: 14px; line-height: 1.5; }

        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; padding: 12px; background: #f1f5f9; font-size: 12px; text-transform: uppercase; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .text-right { text-align: right; }
        
        .totals { margin-top: 30px; display: flex; justify-content: flex-end; }
        .totals-box { width: 300px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; }
        .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
      </style>
    </head>
    <body>

      <div class="header">
        <div>
          <div class="company-name">${ownerProfile.value}</div>
          <div class="value" style="white-space: pre-line;">${ownerProfile.json_value.address}</div>
          <div class="value">GSTIN: ${ownerProfile.json_value.gstin}</div>
        </div>
        <div>
          <div class="invoice-title">INVOICE</div>
          <div class="text-right value"># ${invoice.invoice_number}</div>
          <div class="text-right value">Date: ${new Date(invoice.issue_date).toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      <div class="details-grid">
        <div class="box">
          <div class="label">Bill To</div>
          <div class="company-name" style="font-size: 16px;">${invoice.client.company_name}</div>
          <div class="value">GSTIN: ${invoice.client.gst_number || 'N/A'}</div>
          <div class="value">State Code: ${invoice.client.state_code}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td>${item.description}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">${item.rate.toFixed(2)}</td>
              <td class="text-right">${item.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          <div class="row">
            <span>Subtotal</span>
            <span>${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          
          ${tax.taxType === 'IGST' ? `
            <div class="row">
              <span>IGST (18%)</span>
              <span>${tax.breakdown.igst.toFixed(2)}</span>
            </div>
          ` : ''}

          ${tax.taxType === 'CGST_SGST' ? `
            <div class="row">
              <span>CGST (9%)</span>
              <span>${tax.breakdown.cgst.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>SGST (9%)</span>
              <span>${tax.breakdown.sgst.toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="row grand-total">
            <span>Total</span>
            <span>₹${Number(invoice.grand_total).toFixed(2)}</span>
          </div>
        </div>
      </div>

    </body>
    </html>
  `;
};