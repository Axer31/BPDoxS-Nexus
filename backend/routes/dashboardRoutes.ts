import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Helper: Handle BigInt serialization for JSON
const serialize = (data: any) => {
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

router.get('/stats', async (req, res) => {
  try {
    // 1. Revenue & Expense (Raw SQL for speed)
    const revenueData: any[] = await prisma.$queryRaw`
      SELECT DATE_FORMAT(issue_date, '%Y-%m') as month, SUM(grand_total) as amount, COUNT(id) as count 
      FROM Invoice WHERE status != 'DRAFT' 
      GROUP BY month ORDER BY month ASC LIMIT 12
    `;

    const expenseData: any[] = await prisma.$queryRaw`
      SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as amount, COUNT(id) as count 
      FROM Expense 
      GROUP BY month ORDER BY month ASC LIMIT 12
    `;

    // 2. Yearly Totals
    const totalRevenue = await prisma.invoice.aggregate({ 
        _sum: { grand_total: true },
        where: { status: { not: 'DRAFT' } } 
    });
    
    const totalExpense = await prisma.expense.aggregate({ 
        _sum: { amount: true } 
    });

    const totalInvoicesCount = await prisma.invoice.count();

    // 3. Top 5 Unpaid Invoices
    const topUnpaid = await prisma.invoice.findMany({
        where: { status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] } },
        orderBy: { grand_total: 'desc' },
        take: 5,
        include: { client: true }
    });

    // 4. Merge Monthly Data
    const allMonths = new Set([
        ...(revenueData || []).map(r => r.month), 
        ...(expenseData || []).map(e => e.month)
    ].sort());

    const monthlyStats = Array.from(allMonths).map(month => {
        const rev = revenueData?.find(r => r.month === month);
        const exp = expenseData?.find(e => e.month === month);
        
        const revAmount = Number(rev?.amount || 0);
        const expAmount = Number(exp?.amount || 0);
        const revCount = Number(rev?.count || 0);
        
        return {
            month,
            revenue: revAmount,
            expense: expAmount,
            balance: revAmount - expAmount,
            avgSale: revCount > 0 ? revAmount / revCount : 0
        };
    });

    res.json(serialize({
      summary: {
        totalRevenue: totalRevenue._sum.grand_total || 0,
        totalExpense: totalExpense._sum.amount || 0,
        netProfit: (Number(totalRevenue._sum.grand_total || 0) - Number(totalExpense._sum.amount || 0)),
        totalInvoices: totalInvoicesCount
      },
      charts: { monthlyStats },
      tables: { topUnpaid }
    }));

  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

export default router;