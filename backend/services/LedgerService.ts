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
        currency: true,       // <--- Fetch Currency
        exchange_rate: true,  // <--- Fetch the locked conversion rate
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
      // Get the rate used at time of invoice creation (Default to 1 if missing)
      const rate = inv.exchange_rate ? Number(inv.exchange_rate) : 1;
      const originalAmount = Number(inv.grand_total?.toString() || 0);
      
      // VITAL: Convert Foreign Currency to Base Currency (INR)
      const amountInBase = originalAmount * rate;

      // Use payment_date if available, fallback to issue_date
      const actualDate = inv.payment_date || inv.issue_date; 
      
      // Enhance description to show original foreign amount for audit trail
      let desc = `Invoice #${inv.invoice_number} - ${inv.client.company_name}`;
      if (inv.currency && inv.currency !== 'INR') {
          // e.g. "Invoice #001 - Google (USD 100.00 @ 84.5)"
          desc += ` (${inv.currency} ${originalAmount.toFixed(2)} @ ${rate})`;
      }

      return {
        id: `INV-${inv.id}`,
        date: actualDate, 
        description: desc,
        ref: inv.invoice_number,
        category: 'Sales / Revenue',
        type: 'CREDIT',
        amount: amountInBase, // <--- Value is now strictly INR
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