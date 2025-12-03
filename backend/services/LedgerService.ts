import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LedgerService {
  
  static async getGeneralLedger() {
    // 1. Fetch Invoices (Income) - Exclude Drafts
    const invoices = await prisma.invoice.findMany({
      where: { status: { not: 'DRAFT' } },
      select: {
        id: true,
        issue_date: true,
        invoice_number: true,
        client: { select: { company_name: true } },
        grand_total: true,
        status: true
      }
    });

    // 2. Fetch Expenses (Expenditure)
    const expenses = await prisma.expense.findMany({
      select: {
        id: true,
        date: true,
        category: true,
        description: true,
        amount: true
      }
    });

    // 3. Normalize & Merge
    const ledger = [
      ...invoices.map(inv => ({
        id: `INV-${inv.id}`,
        date: inv.issue_date,
        description: `Invoice #${inv.invoice_number} - ${inv.client.company_name}`,
        type: 'INCOME',
        credit: Number(inv.grand_total),
        debit: 0,
        ref: inv.invoice_number,
        status: inv.status
      })),
      ...expenses.map(exp => ({
        id: `EXP-${exp.id}`,
        date: exp.date,
        description: `Expense: ${exp.category} ${exp.description ? `(${exp.description})` : ''}`,
        type: 'EXPENSE',
        credit: 0,
        debit: Number(exp.amount),
        ref: '-',
        status: 'PAID'
      }))
    ];

    // 4. Sort Chronologically (Newest First)
    ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return ledger;
  }
}