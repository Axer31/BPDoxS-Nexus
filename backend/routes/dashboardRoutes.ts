import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const router = Router();
const prisma = new PrismaClient();

router.get('/stats', async (req, res) => {
  try {
    const { from, to } = req.query;

    // 1. Date Filter
    const dateFilter: any = {};
    if (from && to) {
        dateFilter.issue_date = {
            gte: new Date(from as string),
            lte: new Date(to as string)
        };
    }

    // 2. AGGREGATES
    
    // A. Revenue (PAID only)
    const revenueAgg = await prisma.invoice.aggregate({
        _sum: { grand_total: true },
        where: {
            ...dateFilter,
            status: { in: ['PAID', 'Paid'] }
        }
    });

    // B. Pending (Sent/Overdue/Partial)
    const pendingAgg = await prisma.invoice.aggregate({
        _sum: { grand_total: true },
        where: {
            ...dateFilter,
            status: { in: ['SENT', 'Sent', 'OVERDUE', 'Overdue', 'PARTIAL', 'Partial'] }
        }
    });

    // C. Expenses
    const expenseAgg = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
            date: dateFilter.issue_date 
        }
    });

    // FIX: Safely convert Decimal Aggregates
    const totalRevenue = Number(revenueAgg._sum.grand_total?.toString() || 0);
    const totalPending = Number(pendingAgg._sum.grand_total?.toString() || 0);
    const totalExpense = Number(expenseAgg._sum.amount?.toString() || 0);
    const netProfit = totalRevenue - totalExpense;

    // 3. MONTHLY CHARTS
    const allInvoices = await prisma.invoice.findMany({
        where: {
            ...dateFilter,
            status: { not: 'DRAFT' }
        },
        select: { issue_date: true, grand_total: true, status: true }
    });

    const allExpenses = await prisma.expense.findMany({
        where: { date: dateFilter.issue_date },
        select: { date: true, amount: true }
    });

    // Updated Map to track count for Avg Sale calculation
    const statsMap = new Map<string, { revenue: number; expense: number; pending: number; count: number }>();

    allInvoices.forEach(inv => {
        const month = format(new Date(inv.issue_date), 'MMM yyyy');
        // Initialize with count: 0
        const existing = statsMap.get(month) || { revenue: 0, expense: 0, pending: 0, count: 0 };
        
        // FIX: Handle Decimal Conversion inside loop
        const amount = Number(inv.grand_total?.toString() || 0);
        const status = inv.status.toUpperCase(); 

        if (status === 'PAID') {
            existing.revenue += amount;
            existing.count += 1; // Increment paid invoice count
        } else {
            existing.pending += amount;
        }
        statsMap.set(month, existing);
    });

    allExpenses.forEach(exp => {
        const month = format(new Date(exp.date), 'MMM yyyy');
        // Initialize with count: 0
        const existing = statsMap.get(month) || { revenue: 0, expense: 0, pending: 0, count: 0 };
        // FIX: Handle Decimal Conversion
        existing.expense += Number(exp.amount?.toString() || 0);
        statsMap.set(month, existing);
    });

    const monthlyStats = Array.from(statsMap.entries()).map(([month, val]) => ({
        month,
        revenue: val.revenue,
        expense: val.expense,
        pending: val.pending,
        balance: val.revenue - val.expense,
        // Calculate Avg Sale (Revenue / Count of Paid Invoices), prevent div by zero
        avgSale: val.count > 0 ? (val.revenue / val.count) : 0 
    }));

    // 4. TOP UNPAID (Tables)
    const topUnpaid = await prisma.invoice.findMany({
        where: {
            status: { in: ['SENT', 'OVERDUE', 'Sent', 'Overdue'] }
        },
        orderBy: { due_date: 'asc' },
        take: 5,
        include: { client: true }
    });

    res.json({
        summary: { totalRevenue, totalExpense, netProfit, totalPending },
        charts: { monthlyStats },
        tables: { topUnpaid }
    });

  } catch (e) {
    console.error("Dashboard Stats Error:", e);
    res.status(500).json({ error: "Failed to fetch dashboard analytics" });
  }
});

export default router;