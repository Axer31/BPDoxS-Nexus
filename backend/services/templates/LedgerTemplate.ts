import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

export const generateLedgerHTML = (transactions: any[], dateRange: string, ownerProfile: any) => {
  const profile = ownerProfile?.json_value || {};
  
  // Totals
  const totalIncome = transactions.filter(t => t.credit > 0).reduce((sum, t) => sum + t.credit, 0);
  const totalExpense = transactions.filter(t => t.debit > 0).reduce((sum, t) => sum + t.debit, 0);
  const netBalance = totalIncome - totalExpense;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; color: #4318FF; }
        .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
        .meta { text-align: right; font-size: 12px; line-height: 1.5; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th { background: #f8fafc; padding: 10px; text-align: left; border-bottom: 1px solid #ddd; font-weight: bold; }
        td { padding: 8px 10px; border-bottom: 1px solid #eee; }
        .text-right { text-align: right; }
        .text-green { color: #16a34a; }
        .text-red { color: #dc2626; }
        
        .summary-box { display: flex; gap: 20px; margin-bottom: 30px; justify-content: flex-end; }
        .box { background: #f8fafc; padding: 15px; border-radius: 5px; width: 150px; }
        .box-label { font-size: 10px; text-transform: uppercase; color: #666; }
        .box-value { font-size: 16px; font-weight: bold; margin-top: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">Financial Ledger</div>
          <div class="subtitle">Report Range: ${dateRange}</div>
        </div>
        <div class="meta">
          <strong>${profile.company_name || 'Company Name'}</strong><br>
          Generated on: ${format(new Date(), "dd MMM yyyy HH:mm")}
        </div>
      </div>

      <div class="summary-box">
        <div class="box">
            <div class="box-label">Total Income</div>
            <div class="box-value text-green">${formatCurrency(totalIncome)}</div>
        </div>
        <div class="box">
            <div class="box-label">Total Expenses</div>
            <div class="box-value text-red">${formatCurrency(totalExpense)}</div>
        </div>
        <div class="box" style="background: #eff6ff;">
            <div class="box-label">Net Balance</div>
            <div class="box-value">${formatCurrency(netBalance)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Ref #</th>
            <th class="text-right">Credit (In)</th>
            <th class="text-right">Debit (Out)</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr>
              <td>${format(new Date(t.date), "dd MMM yyyy")}</td>
              <td>
                <div style="font-weight:500;">${t.description}</div>
                <div style="font-size:10px; color:#888;">${t.type}</div>
              </td>
              <td>${t.ref}</td>
              <td class="text-right text-green">${t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
              <td class="text-right text-red">${t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
};