// backend/routes/dashboardRoutes.ts

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const router = Router();
const prisma = new PrismaClient();

// Helper: Get Financial Year String (e.g., "FY 2024-25")
const getFinancialYear = (date: Date) => {
    const month = date.getMonth(); 
    // If Jan-Mar, start year is previous year. Else current year.
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

    const response: any = { summary: {}, charts: {}, tables: {}, availableYears: [] };

    // ==================================================================================
    // 1. AVAILABLE YEARS (Dynamic Filter Logic)
    // ==================================================================================
    if (shouldFetch('availableYears')) {
        // A. Get Min/Max dates from Invoices, Expenses, AND OtherIncome
        const [invBounds, expBounds, incBounds] = await Promise.all([
            prisma.invoice.aggregate({ _min: { issue_date: true }, _max: { issue_date: true } }),
            prisma.expense.aggregate({ _min: { date: true }, _max: { date: true } }),
            prisma.otherIncome.aggregate({ _min: { date: true }, _max: { date: true } }) // [NEW]
        ]);

        // B. Consolidate bounds to find global Min and Max
        const minDates = [invBounds._min.issue_date, expBounds._min.date, incBounds._min.date].filter(d => d !== null) as Date[];
        const maxDates = [invBounds._max.issue_date, expBounds._max.date, incBounds._max.date].filter(d => d !== null) as Date[];

        // C. Default to current FY if no data exists
        const currentMonth = new Date().getMonth();
        const currentFyStart = currentMonth < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear();
        
        let startYear = currentFyStart;
        let endYear = currentFyStart;

        // D. Calculate Global FY Range based on data
        if (minDates.length > 0) {
            const minDate = new Date(Math.min(...minDates.map(d => d.getTime())));
            startYear = minDate.getMonth() < 3 ? minDate.getFullYear() - 1 : minDate.getFullYear();
        }
        if (maxDates.length > 0) {
             const maxDate = new Date(Math.max(...maxDates.map(d => d.getTime())));
             endYear = maxDate.getMonth() < 3 ? maxDate.getFullYear() - 1 : maxDate.getFullYear();
        }

        // E. Generate Array (Descending order: 2025, 2024, 2023...)
        const activeYears = [];
        for (let y = endYear; y >= startYear; y--) {
            activeYears.push(y);
        }
        response.availableYears = activeYears;
    }

    // ==================================================================================
    // 2. SUMMARY & TOP METRICS
    // ==================================================================================
    if (shouldFetch('summary')) {
        // A. FETCH INVOICE REVENUE
        const paidInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['PAID', 'Paid'] },
                payment_date: { gte: fromDate, lte: toDate }
            },
            select: { 
                grand_total: true, 
                received_amount: true 
            }
        });

        // B. [NEW] FETCH OTHER INCOME REVENUE
        const otherIncomeAgg = await prisma.otherIncome.aggregate({
            _sum: { amount: true },
            where: { date: { gte: fromDate, lte: toDate } }
        });

        // C. FETCH PENDING
        const pendingInvoices = await prisma.invoice.aggregate({
            _sum: { grand_total: true },
            where: {
                status: { in: ['SENT', 'Sent', 'OVERDUE', 'Overdue', 'PARTIAL', 'Partial'] },
                issue_date: { gte: fromDate, lte: toDate }
            }
        });

        // CALCULATE TOTAL REVENUE (Invoices + Other Income)
        const invoiceRevenue = paidInvoices.reduce((sum, inv) => {
            const actual = inv.received_amount ? Number(inv.received_amount) : Number(inv.grand_total);
            return sum + actual;
        }, 0);

        const otherRevenue = Number(otherIncomeAgg._sum.amount || 0);
        const totalRevenue = invoiceRevenue + otherRevenue;

        // CALCULATE AVG SALE (Only based on Invoices for business accuracy)
        const paidCount = paidInvoices.length;
        const avgSale = paidCount > 0 ? invoiceRevenue / paidCount : 0;

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
            totalPending,
            avgSale,
            invoiceRevenue, // Optional: useful if frontend wants to split it
            otherRevenue    // Optional
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
    // 3. MONTHLY STATS (Charts)
    // ==================================================================================
    if (shouldFetch('monthlyStats')) {
        // A. Invoices
        const paidInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['PAID', 'Paid'] },
                payment_date: { gte: fromDate, lte: toDate }
            },
            select: { payment_date: true, grand_total: true, received_amount: true }
        });

        // B. [NEW] Other Income
        const otherIncomes = await prisma.otherIncome.findMany({
            where: { date: { gte: fromDate, lte: toDate } },
            select: { date: true, amount: true }
        });

        // C. Expenses
        const allExpenses = await prisma.expense.findMany({
            where: { date: { gte: fromDate, lte: toDate } },
            select: { date: true, amount: true }
        });

        const statsMap = new Map<string, { revenue: number; expense: number; count: number }>();

        // Aggregate Invoices
        paidInvoices.forEach(inv => {
            const d = inv.payment_date || new Date(); 
            const month = format(d, 'MMM yyyy');
            const existing = statsMap.get(month) || { revenue: 0, expense: 0, count: 0 };
            
            const amount = inv.received_amount ? Number(inv.received_amount) : Number(inv.grand_total);

            existing.revenue += amount;
            existing.count += 1;
            statsMap.set(month, existing);
        });

        // [NEW] Aggregate Other Income
        otherIncomes.forEach(inc => {
            const month = format(inc.date, 'MMM yyyy');
            const existing = statsMap.get(month) || { revenue: 0, expense: 0, count: 0 };
            existing.revenue += Number(inc.amount);
            // We don't increment 'count' here to keep avgSale metric purely invoice-based
            statsMap.set(month, existing);
        });

        // Aggregate Expenses
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
                    avgSale: val.count > 0 ? val.revenue / val.count : 0, // Note: this avg is skewed if we add other income to revenue but not count. Ideally avgSale should use invoiceRevenue.
                    sortDate: new Date(month) 
                };
            })
            .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    }

    // ==================================================================================
    // 4. YEARLY COMPARISON
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
            const rangeStart = new Date(minStartYear, 3, 1);
            const rangeEnd = new Date(maxStartYear + 1, 2, 31);
            
            // A. Fetch Invoices
            const historicalInvoices = await prisma.invoice.findMany({
                where: {
                    status: { in: ['PAID', 'Paid'] },
                    payment_date: { gte: rangeStart, lte: rangeEnd }
                },
                select: { payment_date: true, grand_total: true, received_amount: true }
            });

            // B. [NEW] Fetch Other Income
            const historicalIncome = await prisma.otherIncome.findMany({
                where: { date: { gte: rangeStart, lte: rangeEnd } },
                select: { date: true, amount: true }
            });

            const fyMap = new Map<string, number>();
            requestedStartYears.forEach(y => {
                const fyStr = `FY ${y}-${(y + 1).toString().slice(-2)}`;
                fyMap.set(fyStr, 0);
            });

            // Sum Invoices
            historicalInvoices.forEach(inv => {
                if (!inv.payment_date) return;
                const fyStr = getFinancialYear(inv.payment_date);
                if (fyMap.has(fyStr)) {
                    const amount = inv.received_amount ? Number(inv.received_amount) : Number(inv.grand_total);
                    fyMap.set(fyStr, (fyMap.get(fyStr) || 0) + amount);
                }
            });

            // [NEW] Sum Other Income
            historicalIncome.forEach(inc => {
                const fyStr = getFinancialYear(inc.date);
                if (fyMap.has(fyStr)) {
                    fyMap.set(fyStr, (fyMap.get(fyStr) || 0) + Number(inc.amount));
                }
            });

            yearlyComparison = Array.from(fyMap.entries())
                .map(([year, total]) => ({ year, total }))
                .sort((a, b) => a.year.localeCompare(b.year));
        }
        response.charts.yearlyComparison = yearlyComparison;
    }

    // ==================================================================================
    // 5. EXPENSE TABLE (Unchanged)
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