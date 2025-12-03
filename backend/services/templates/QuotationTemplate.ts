import fs from 'fs';
import path from 'path';

export const generateQuotationHTML = (quotation: any, ownerProfile: any) => {
  const items = quotation.line_items;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: quotation.currency || 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getBase64Image = (webPath: string) => {
    if (!webPath) return null;
    try {
      const cleanPath = webPath.startsWith('/') ? webPath.slice(1) : webPath;
      const systemPath = path.join(process.cwd(), '../frontend/public', cleanPath);
      if (fs.existsSync(systemPath)) {
        const bitmap = fs.readFileSync(systemPath);
        const ext = path.extname(systemPath).slice(1);
        return `data:image/${ext};base64,${bitmap.toString('base64')}`;
      }
      return null;
    } catch (e) { return null; }
  };

  const logoSrc = getBase64Image(ownerProfile?.json_value?.logo);
  const signatureSrc = getBase64Image(ownerProfile?.json_value?.signature);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; padding: 40px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; color: #0f172a; }
        .doc-title { font-size: 32px; font-weight: bold; text-align: right; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; padding: 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .totals { margin-top: 30px; display: flex; justify-content: flex-end; }
        .row { display: flex; justify-content: space-between; width: 300px; padding: 5px 0; }
        .grand-total { font-weight: bold; border-top: 2px solid #0f172a; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          ${logoSrc ? `<img src="${logoSrc}" style="height: 60px;" />` : ''}
          <div class="company-name">${ownerProfile?.value || 'Company Name'}</div>
        </div>
        <div>
          <div class="doc-title">QUOTATION</div>
          <div style="text-align: right; margin-top: 10px;"># ${quotation.quotation_number}</div>
        </div>
      </div>

      <div style="margin-top: 30px;">
        <strong>To:</strong> ${quotation.client.company_name}
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Qty</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td>${item.description}</td>
              <td style="text-align: right;">${item.quantity}</td>
              <td style="text-align: right;">${formatCurrency(item.rate)}</td>
              <td style="text-align: right;">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div>
          <div class="row"><span>Subtotal</span><span>${formatCurrency(Number(quotation.subtotal))}</span></div>
          <div class="row grand-total"><span>Total</span><span>${formatCurrency(Number(quotation.grand_total))}</span></div>
        </div>
      </div>
      
      ${quotation.contract_terms ? `
        <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <strong>Terms & Conditions:</strong><br>
            <div style="white-space: pre-wrap; font-size: 12px; color: #64748b;">${quotation.contract_terms}</div>
        </div>
      ` : ''}

      <div style="margin-top: 60px;">
        ${signatureSrc ? `<img src="${signatureSrc}" style="height: 60px;" />` : ''}
        <div style="border-top: 1px solid #333; width: 200px; padding-top: 5px;">Authorized Signatory</div>
      </div>
    </body>
    </html>
  `;
};