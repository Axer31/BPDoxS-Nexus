import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LedgerService {

  static async getLedger(from?: string, to?: string) {
    // 1. Build Date Filter for INCOME (Uses payment_date)
    const paymentDateFilter: any = {};
    // 2. Build Date Filter for EXPENSES (Uses date)
    const expenseDateFilter: any = {};

    if (from && to) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        
        paymentDateFilter.gte = fromDate;
        paymentDateFilter.lte = toDate;

        expenseDateFilter.gte = fromDate;
        expenseDateFilter.lte = toDate;
    }

    // 2. Fetch Income (Strictly 'PAID' and uses payment_date)
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PAID', 'Paid'] }, 
        payment_date: paymentDateFilter // <--- Changed from issue_date
      },
      select: {
        id: true,
        invoice_number: true,
        issue_date: true,
        payment_date: true, // <--- Fetch this
        grand_total: true,
        client: { select: { company_name: true } }
      }
    });

    // 3. Fetch Expenses
    const expenses = await prisma.expense.findMany({
      where: { date: expenseDateFilter },
      select: {
        id: true,
        date: true,
        category: true,
        amount: true,
        description: true
      }
    });

    // 4. Normalize & Fix Decimal Conversion
    const creditEntries = invoices.map(inv => {
      const amount = Number(inv.grand_total?.toString() || 0);
      // Use payment_date if available, fallback to issue_date (for old data)
      const actualDate = inv.payment_date || inv.issue_date; 

      return {
        id: `INV-${inv.id}`,
        date: actualDate, 
        description: `Invoice #${inv.invoice_number} - ${inv.client.company_name}`,
        ref: inv.invoice_number,
        category: 'Sales / Revenue',
        type: 'CREDIT',
        amount: amount,
        credit: amount, 
        debit: 0        
      };
    });

    const debitEntries = expenses.map(exp => {
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

    // 5. Combine & Sort
    const ledger = [...creditEntries, ...debitEntries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return ledger;
  }
}