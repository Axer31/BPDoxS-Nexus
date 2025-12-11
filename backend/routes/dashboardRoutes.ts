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
    
    const requestedSections = sections ? (sections as string).split(',') : ['ALL'];
    const shouldFetch = (section: string) => requestedSections.includes('ALL') || requestedSections.includes(section);

    // --- FIX: DEFAULT TO FINANCIAL YEAR (April 1 - March 31) ---
    // If dates are missing, calculate the current active Financial Year.
    let fromDate: Date;
    let toDate: Date;

    if (from && to) {
        fromDate = new Date(from as string);
        toDate = new Date(to as string);
    } else {
        const now = new Date();
        const currentMonth = now.getMonth(); 
        // If Jan-Mar (0-2), start year is previous year. Else current year.
        const startYear = currentMonth < 3 ? now.getFullYear() - 1 : now.getFullYear();
        
        // Force April 1st to March 31st
        fromDate = new Date(startYear, 3, 1); // April 1st
        toDate = new Date(startYear + 1, 2, 31); // March 31st next year
    }

    const response: any = { summary: {}, charts: {}, tables: {}, availableYears: [] };

    // ==================================================================================
    // 1. AVAILABLE YEARS (Dynamic Filter Logic)
    // ==================================================================================
    if (shouldFetch('availableYears')) {
        // A. Get Min/Max dates from Invoices, Expenses, AND OtherIncome
        const [invBounds, expBounds, incBounds] = await Promise.all([
            prisma.invoice.aggregate({ _min: { issue_date: true }, _max: { issue_date: true } }),
            prisma.expense.aggregate({ _min: { date: true }, _max: { date: true } }),
            // @ts-ignore
            prisma.otherIncome ? prisma.otherIncome.aggregate({ _min: { date: true }, _max: { date: true } }) : { _min: { date: null }, _max: { date: null } }
        ]);

        // B. Consolidate bounds to find global Min and Max
        const minDates = [invBounds._min.issue_date, expBounds._min.date, incBounds?._min?.date].filter(d => d != null) as Date[];
        const maxDates = [invBounds._max.issue_date, expBounds._max.date, incBounds?._max?.date].filter(d => d != null) as Date[];

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

        // B. FETCH OTHER INCOME REVENUE
        let otherRevenue = 0;
        // @ts-ignore
        if (prisma.otherIncome) {
            // @ts-ignore
            const otherIncomeAgg = await prisma.otherIncome.aggregate({
                _sum: { amount: true },
                where: { date: { gte: fromDate, lte: toDate } }
            });
            otherRevenue = Number(otherIncomeAgg._sum.amount || 0);
        }

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
            invoiceRevenue, 
            otherRevenue
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
        // A. Invoices (Current Period)
        const paidInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['PAID', 'Paid'] },
                payment_date: { gte: fromDate, lte: toDate }
            },
            select: { payment_date: true, grand_total: true, received_amount: true }
        });

        // B. Other Income (Current Period)
        let otherIncomes: any[] = [];
        // @ts-ignore
        if (prisma.otherIncome) {
            // @ts-ignore
            otherIncomes = await prisma.otherIncome.findMany({
                where: { date: { gte: fromDate, lte: toDate } },
                select: { date: true, amount: true }
            });
        }

        // C. Expenses (Current Period)
        const allExpenses = await prisma.expense.findMany({
            where: { date: { gte: fromDate, lte: toDate } },
            select: { date: true, amount: true }
        });

        // --- D. CALCULATE OPENING BALANCE (Previous Years/Periods) ---
        // Fetch sums of everything BEFORE the fromDate
        const [prevInv, prevExp, prevInc] = await Promise.all([
            prisma.invoice.findMany({
                where: { 
                    status: { in: ['PAID', 'Paid'] },
                    payment_date: { lt: fromDate } 
                },
                select: { received_amount: true, grand_total: true }
            }),
            prisma.expense.aggregate({
                _sum: { amount: true },
                where: { date: { lt: fromDate } }
            }),
            // @ts-ignore
            prisma.otherIncome ? prisma.otherIncome.aggregate({
                _sum: { amount: true },
                where: { date: { lt: fromDate } }
            }) : { _sum: { amount: 0 } }
        ]);

        const prevInvTotal = prevInv.reduce((sum, inv) => sum + (Number(inv.received_amount) || Number(inv.grand_total)), 0);
        const prevExpTotal = Number(prevExp._sum.amount || 0);
        // @ts-ignore
        const prevIncTotal = Number(prevInc?._sum?.amount || 0);

        // INITIALIZE BALANCE WITH HISTORICAL NET
        let cumulativeBalance = (prevInvTotal + prevIncTotal) - prevExpTotal;

        // --- E. Process Current Period Data ---
        const statsMap = new Map<string, { revenue: number; expense: number; count: number }>();

        // Pre-fill Map with ALL months in the selected range
        if (fromDate && toDate) {
            let cursor = new Date(fromDate);
            cursor.setDate(1); // Force to 1st
            const end = new Date(toDate);
            
            while (cursor <= end) {
                const monthKey = format(cursor, 'MMM yyyy');
                if (!statsMap.has(monthKey)) {
                    statsMap.set(monthKey, { revenue: 0, expense: 0, count: 0 });
                }
                cursor.setMonth(cursor.getMonth() + 1);
            }
        }

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

        // Aggregate Other Income
        otherIncomes.forEach(inc => {
            const month = format(inc.date, 'MMM yyyy');
            const existing = statsMap.get(month) || { revenue: 0, expense: 0, count: 0 };
            existing.revenue += Number(inc.amount);
            statsMap.set(month, existing);
        });

        // Aggregate Expenses
        allExpenses.forEach(exp => {
            const month = format(new Date(exp.date), 'MMM yyyy');
            const existing = statsMap.get(month) || { revenue: 0, expense: 0, count: 0 };
            existing.expense += Number(exp.amount?.toString() || 0);
            statsMap.set(month, existing);
        });

        // Flatten, Sort, and Apply Opening Balance
        const rawStats = Array.from(statsMap.entries()).map(([month, val]) => ({
            month,
            revenue: val.revenue,
            expense: val.expense,
            net: val.revenue - val.expense,
            count: val.count,
            sortDate: new Date(month)
        }));

        rawStats.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

        response.charts.monthlyStats = rawStats.map(stat => {
            cumulativeBalance += stat.net; // Add current month's net to the running total (which includes opening balance)
            return {
                month: stat.month,
                revenue: stat.revenue,
                expense: stat.expense,
                net: stat.net,
                balance: cumulativeBalance, 
                avgSale: stat.count > 0 ? stat.revenue / stat.count : 0,
                sortDate: stat.sortDate
            };
        });
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

            // B. Fetch Other Income
            let historicalIncome: any[] = [];
            // @ts-ignore
            if (prisma.otherIncome) {
                // @ts-ignore
                historicalIncome = await prisma.otherIncome.findMany({
                    where: { date: { gte: rangeStart, lte: rangeEnd } },
                    select: { date: true, amount: true }
                });
            }

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

            // Sum Other Income
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
    // 5. EXPENSE TABLE
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