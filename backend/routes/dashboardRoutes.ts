import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const router = Router();
const prisma = new PrismaClient();

// Helper: Get Financial Year String
const getFinancialYear = (date: Date) => {
    const month = date.getMonth(); 
    const startYear = month < 3 ? date.getFullYear() - 1 : date.getFullYear();
    const endYear = startYear + 1;
    return `FY ${startYear}-${endYear.toString().slice(-2)}`;
};

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { from, to, years, sections } = req.query;
    
    // Parse sections (comma separated). If empty, fetch ALL (default behavior)
    const requestedSections = sections ? (sections as string).split(',') : ['ALL'];
    const shouldFetch = (section: string) => requestedSections.includes('ALL') || requestedSections.includes(section);

    const fromDate = from ? new Date(from as string) : undefined;
    const toDate = to ? new Date(to as string) : undefined;

    const response: any = { summary: {}, charts: {}, tables: {} };

    // ==================================================================================
    // 1. SUMMARY & TOP UNPAID (Global Stats)
    // ==================================================================================
    if (shouldFetch('summary')) {
        // FETCH REVENUE (PAID) - WITH MANUAL INR SUPPORT
        const paidInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['PAID', 'Paid'] },
                payment_date: { gte: fromDate, lte: toDate }
            },
            select: { 
                grand_total: true, 
                received_amount: true // <--- Fetch Manual Amount
            }
        });

        // FETCH PENDING (SENT/OVERDUE) - Just Sum Grand Total
        const pendingInvoices = await prisma.invoice.aggregate({
            _sum: { grand_total: true },
            where: {
                status: { in: ['SENT', 'Sent', 'OVERDUE', 'Overdue', 'PARTIAL', 'Partial'] },
                issue_date: { gte: fromDate, lte: toDate }
            }
        });

        // LOGIC: Use 'received_amount' if exists (Manual INR), else fallback to 'grand_total'
        const totalRevenue = paidInvoices.reduce((sum, inv) => {
            const actual = inv.received_amount ? Number(inv.received_amount) : Number(inv.grand_total);
            return sum + actual;
        }, 0);

        const totalPending = Number(pendingInvoices._sum.grand_total || 0);

        const expenseAgg = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: { date: { gte: fromDate, lte: toDate } }
        });

        const totalExpense = Number(expenseAgg._sum.amount?.toString() || 0);

        response.summary = { 
            totalRevenue, 
            totalExpense, 
            netProfit: totalRevenue - totalExpense, 
            totalPending 
        };
    }

    if (shouldFetch('topUnpaid')) {
        response.tables.topUnpaid = await prisma.invoice.findMany({
            where: { status: { in: ['SENT', 'OVERDUE', 'Sent', 'Overdue'] } },
            orderBy: { due_date: 'asc' },
            take: 5,
            include: { client: true }
        });
    }

    // ==================================================================================
    // 2. MONTHLY STATS (Charts)
    // ==================================================================================
    if (shouldFetch('monthlyStats')) {
        const paidInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['PAID', 'Paid'] },
                payment_date: { gte: fromDate, lte: toDate }
            },
            select: { 
                payment_date: true, 
                grand_total: true,
                received_amount: true // <--- Fetch Manual Amount
            }
        });

        const allExpenses = await prisma.expense.findMany({
            where: { date: { gte: fromDate, lte: toDate } },
            select: { date: true, amount: true }
        });

        const statsMap = new Map<string, { revenue: number; expense: number; count: number }>();

        paidInvoices.forEach(inv => {
            const d = inv.payment_date || new Date(); 
            const month = format(d, 'MMM yyyy');
            const existing = statsMap.get(month) || { revenue: 0, expense: 0, count: 0 };
            
            // LOGIC: Use 'received_amount' if exists, else 'grand_total'
            const amount = inv.received_amount ? Number(inv.received_amount) : Number(inv.grand_total);

            existing.revenue += amount;
            existing.count += 1;
            statsMap.set(month, existing);
        });

        allExpenses.forEach(exp => {
            const month = format(new Date(exp.date), 'MMM yyyy');
            const existing = statsMap.get(month) || { revenue: 0, expense: 0, count: 0 };
            existing.expense += Number(exp.amount?.toString() || 0);
            statsMap.set(month, existing);
        });

        let cumulativeBalance = 0;
        response.charts.monthlyStats = Array.from(statsMap.entries())
            .map(([month, val]) => {
                const net = val.revenue - val.expense;
                cumulativeBalance += net;
                return {
                    month,
                    revenue: val.revenue,
                    expense: val.expense,
                    net: net,
                    balance: cumulativeBalance,
                    avgSale: val.count > 0 ? val.revenue / val.count : 0,
                    sortDate: new Date(month) 
                };
            })
            .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    }

    // ==================================================================================
    // 3. YEARLY COMPARISON
    // ==================================================================================
    if (shouldFetch('yearlyComparison')) {
        const currentYr = new Date().getFullYear();
        const requestedStartYears = years 
            ? (years as string).split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y)) 
            : [currentYr, currentYr - 1, currentYr - 2, currentYr - 3];
        
        let yearlyComparison: any[] = [];

        if (requestedStartYears.length > 0) {
            const minStartYear = Math.min(...requestedStartYears);
            const maxStartYear = Math.max(...requestedStartYears);
            
            const historicalInvoices = await prisma.invoice.findMany({
                where: {
                    status: { in: ['PAID', 'Paid'] },
                    payment_date: { 
                        gte: new Date(minStartYear, 3, 1), 
                        lte: new Date(maxStartYear + 1, 2, 31) 
                    }
                },
                select: { 
                    payment_date: true, 
                    grand_total: true,
                    received_amount: true // <--- Fetch Manual Amount
                }
            });

            const fyMap = new Map<string, number>();
            requestedStartYears.forEach(y => {
                const fyStr = `FY ${y}-${(y + 1).toString().slice(-2)}`;
                fyMap.set(fyStr, 0);
            });

            historicalInvoices.forEach(inv => {
                if (!inv.payment_date) return;
                const fyStr = getFinancialYear(inv.payment_date);
                if (fyMap.has(fyStr)) {
                    // LOGIC: Use 'received_amount' if exists, else 'grand_total'
                    const amount = inv.received_amount ? Number(inv.received_amount) : Number(inv.grand_total);
                    fyMap.set(fyStr, (fyMap.get(fyStr) || 0) + amount);
                }
            });

            yearlyComparison = Array.from(fyMap.entries())
                .map(([year, total]) => ({ year, total }))
                .sort((a, b) => a.year.localeCompare(b.year));
        }
        response.charts.yearlyComparison = yearlyComparison;
    }

    // ==================================================================================
    // 4. EXPENSE TABLE
    // ==================================================================================
    if (shouldFetch('expenseTable')) {
        const expenseRaw = await prisma.expense.findMany({
            where: { date: { gte: fromDate, lte: toDate } },
            orderBy: { date: 'asc' }
        });
        
        const expenseMonthsSet = new Set<string>();
        expenseRaw.forEach(e => expenseMonthsSet.add(format(e.date, 'MMM yy')));
        const expenseColumns = Array.from(expenseMonthsSet);
        
        const categoryMap = new Map<string, any>();
        expenseRaw.forEach(exp => {
            const monthKey = format(exp.date, 'MMM yy');
            const amount = Number(exp.amount);
            if (!categoryMap.has(exp.category)) {
                categoryMap.set(exp.category, { category: exp.category, total: 0 });
            }
            const row = categoryMap.get(exp.category);
            row[monthKey] = (row[monthKey] || 0) + amount;
            row.total += amount;
        });

        response.tables.expenseTable = Array.from(categoryMap.values()).map(row => {
            row.average = row.total / (expenseColumns.length || 1);
            return row;
        });
        response.tables.expenseColumns = expenseColumns;
    }

    res.json(response);

  } catch (e) {
    console.error("Dashboard Stats Error:", e);
    res.status(500).json({ error: "Failed to fetch dashboard analytics" });
  }
});

export default router;