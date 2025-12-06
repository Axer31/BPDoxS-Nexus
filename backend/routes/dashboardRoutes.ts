import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const router = Router();
const prisma = new PrismaClient();

router.get('/stats', async (req, res) => {
  try {
    const { from, to } = req.query;

    // 1. Define Dates
    const fromDate = from ? new Date(from as string) : undefined;
    const toDate = to ? new Date(to as string) : undefined;

    // 2. AGGREGATES
    // A. Revenue (PAID)
    const revenueAgg = await prisma.invoice.aggregate({
        _sum: { grand_total: true },
        where: {
            status: { in: ['PAID', 'Paid'] },
            payment_date: { gte: fromDate, lte: toDate }
        }
    });

    // B. Pending
    const pendingAgg = await prisma.invoice.aggregate({
        _sum: { grand_total: true },
        where: {
            status: { in: ['SENT', 'Sent', 'OVERDUE', 'Overdue', 'PARTIAL', 'Partial'] },
            issue_date: { gte: fromDate, lte: toDate }
        }
    });

    // C. Expenses
    const expenseAgg = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
            date: { gte: fromDate, lte: toDate }
        }
    });

    const totalRevenue = Number(revenueAgg._sum.grand_total?.toString() || 0);
    const totalPending = Number(pendingAgg._sum.grand_total?.toString() || 0);
    const totalExpense = Number(expenseAgg._sum.amount?.toString() || 0);
    const netProfit = totalRevenue - totalExpense;

    // 3. MONTHLY CHARTS
    const paidInvoices = await prisma.invoice.findMany({
        where: {
            status: { in: ['PAID', 'Paid'] },
            payment_date: { gte: fromDate, lte: toDate }
        },
        select: { payment_date: true, grand_total: true }
    });

    const allExpenses = await prisma.expense.findMany({
        where: { date: { gte: fromDate, lte: toDate } },
        select: { date: true, amount: true }
    });

    // FIXED: Track 'count' to calculate Average Sale
    const statsMap = new Map<string, { revenue: number; expense: number; count: number }>();

    // Process Revenue
    paidInvoices.forEach(inv => {
        const d = inv.payment_date || new Date(); 
        const month = format(d, 'MMM yyyy');
        
        // Initialize if not exists
        const existing = statsMap.get(month) || { revenue: 0, expense: 0, count: 0 };
        
        existing.revenue += Number(inv.grand_total?.toString() || 0);
        existing.count += 1; // Increment invoice count
        
        statsMap.set(month, existing);
    });

    // Process Expenses
    allExpenses.forEach(exp => {
        const month = format(new Date(exp.date), 'MMM yyyy');
        // Ensure we preserve existing revenue/count if expense comes later
        const existing = statsMap.get(month) || { revenue: 0, expense: 0, count: 0 };
        
        existing.expense += Number(exp.amount?.toString() || 0);
        
        statsMap.set(month, existing);
    });

    // Sort chronologically & Calculate Avg Sale
    const monthlyStats = Array.from(statsMap.entries())
        .map(([month, val]) => ({
            month,
            revenue: val.revenue,
            expense: val.expense,
            balance: val.revenue - val.expense,
            // FIX: Calculate Average Sale (Avoid division by zero)
            avgSale: val.count > 0 ? val.revenue / val.count : 0,
            sortDate: new Date(month) 
        }))
        .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

    // 4. TOP UNPAID
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