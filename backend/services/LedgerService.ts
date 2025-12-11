import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LedgerService {

  static async getLedger(from?: string, to?: string) {
    const paymentDateFilter: any = {};
    const generalDateFilter: any = {}; // Used for Expenses AND Other Income

    if (from && to) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        
        paymentDateFilter.gte = fromDate;
        paymentDateFilter.lte = toDate;

        generalDateFilter.gte = fromDate;
        generalDateFilter.lte = toDate;
    }

    // 1. Fetch Invoices (Existing Logic)
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PAID', 'Paid'] }, 
        payment_date: paymentDateFilter 
      },
      select: {
        id: true,
        invoice_number: true,
        issue_date: true,
        payment_date: true,
        grand_total: true,
        currency: true,      
        received_amount: true, 
        client: { select: { company_name: true } }
      }
    });

    // 2. [NEW] Fetch Other Income
    const otherIncome = await prisma.otherIncome.findMany({
      where: { date: generalDateFilter },
      orderBy: { date: 'desc' }
    });

    // 3. Fetch Expenses (Existing Logic)
    const expenses = await prisma.expense.findMany({
      where: { date: generalDateFilter },
      select: {
        id: true,
        date: true,
        category: true,
        amount: true,
        description: true
      }
    });

    // 4. Normalize & Map
    const invoiceEntries = invoices.map(inv => {
      const originalAmount = Number(inv.grand_total?.toString() || 0);
      const amountInBase = inv.received_amount ? Number(inv.received_amount) : originalAmount;
      const actualDate = inv.payment_date || inv.issue_date; 
      
      let desc = `Invoice #${inv.invoice_number} - ${inv.client.company_name}`;
      if (inv.currency && inv.currency !== 'INR') {
          desc += inv.received_amount 
            ? ` (${inv.currency} ${originalAmount.toFixed(2)} -> INR ${amountInBase.toFixed(2)})`
            : ` (${inv.currency} ${originalAmount.toFixed(2)})`;
      }

      return {
        id: `INV-${inv.id}`,
        date: actualDate, 
        description: desc,
        ref: inv.invoice_number,
        category: 'Sales / Revenue',
        type: 'CREDIT',
        amount: amountInBase, 
        credit: amountInBase, 
        debit: 0        
      };
    });

    // [NEW] Map Other Income
    const incomeEntries = otherIncome.map(inc => {
      const amount = Number(inc.amount);
      return {
        id: `INC-${inc.id}`,
        date: inc.date,
        description: inc.description || 'Other Income',
        ref: '-',
        category: inc.category, // e.g., "Interest"
        type: 'CREDIT',
        amount: amount,
        credit: amount,
        debit: 0
      };
    });

    const expenseEntries = expenses.map(exp => {
      const amount = Number(exp.amount?.toString() || 0);
      return {
        id: `EXP-${exp.id}`,
        date: exp.date,
        description: exp.description || 'Expense Record',
        ref: '-',
        category: exp.category,
        type: 'DEBIT',
        amount: amount,
        credit: 0,      
        debit: amount   
      };
    });

    // 5. Combine All & Sort
    const ledger = [...invoiceEntries, ...incomeEntries, ...expenseEntries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return ledger;
  }
}