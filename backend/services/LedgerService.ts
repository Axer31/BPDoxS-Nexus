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
        
        // Ensure inclusive filtering
        paymentDateFilter.gte = fromDate;
        paymentDateFilter.lte = toDate;

        expenseDateFilter.gte = fromDate;
        expenseDateFilter.lte = toDate;
    }

    // 2. Fetch Income (Strictly 'PAID' and uses payment_date)
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
        received_amount: true, // <--- FETCH THIS, NO EXCHANGE RATE
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

    // 4. Normalize
    const creditEntries = invoices.map(inv => {
      const originalAmount = Number(inv.grand_total?.toString() || 0);
      
      // LOGIC: Use Manual INR Amount if exists, else fallback to grand_total
      const amountInBase = inv.received_amount 
          ? Number(inv.received_amount) 
          : originalAmount;

      // Use payment_date if available, fallback to issue_date
      const actualDate = inv.payment_date || inv.issue_date; 
      
      // Enhance description to show original foreign amount for audit trail
      let desc = `Invoice #${inv.invoice_number} - ${inv.client.company_name}`;
      
      if (inv.currency && inv.currency !== 'INR') {
          if (inv.received_amount) {
              // Case: Foreign Currency with Manual INR Entry
              desc += ` (${inv.currency} ${originalAmount.toFixed(2)} -> INR ${amountInBase.toFixed(2)})`;
          } else {
              // Case: Foreign Currency without Manual Entry (displayed as-is)
              desc += ` (${inv.currency} ${originalAmount.toFixed(2)})`;
          }
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