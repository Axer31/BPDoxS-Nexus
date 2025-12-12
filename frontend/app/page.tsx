"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DollarSign, Activity, Wallet, Loader2, Check, ChevronsUpDown, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area
} from "recharts";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- DATE HELPERS ---

const getFinancialYearDates = (startYear: number) => {
    // Strictly use 12:00 PM to avoid timezone rollback issues in API calls
    const from = new Date(startYear, 3, 1, 12, 0, 0); // April 1st, 12:00 PM
    const to = new Date(startYear + 1, 2, 31, 23, 59, 59); // March 31st next year
    return { from, to };
};

const getOverviewDates = (filter: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (filter.startsWith('FY-')) {
        const startYear = parseInt(filter.split('-')[1]);
        return getFinancialYearDates(startYear);
    }

    switch (filter) {
        case 'daily': 
            return { 
                from: new Date(currentYear, currentMonth, now.getDate(), 0, 0, 0),
                to: new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59)
            };
        case 'monthly': 
            return { 
                from: new Date(currentYear, currentMonth, 1), 
                to: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59) 
            };
        case 'quarterly': 
            const qStartMonth = Math.floor(currentMonth / 3) * 3;
            return { 
                from: new Date(currentYear, qStartMonth, 1), 
                to: new Date(currentYear, qStartMonth + 3, 0, 23, 59, 59) 
            };
        case 'yearly': 
            return { 
                from: new Date(currentYear, 0, 1), 
                to: new Date(currentYear, 11, 31, 23, 59, 59) 
            };
        case 'all': 
            return { 
                from: new Date(2000, 0, 1), 
                to: new Date() 
            };
        default: 
            return { 
                from: new Date(currentYear, currentMonth, 1), 
                to: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59) 
            };
    }
};

// ROBUST DATE PARSER
const parseFlexibleDate = (dateStr: string) => {
    if (!dateStr) return new Date(NaN);
    
    const match = String(dateStr).match(/([a-zA-Z]{3,})[\s\-'"]*(\d{2,4})/);
    
    if (match) {
        const monthPart = match[1];
        let yearPart = match[2];
        if (yearPart.length === 2) {
            yearPart = "20" + yearPart;
        }
        const d = new Date(`${monthPart} 1, ${yearPart}`);
        if (!isNaN(d.getTime())) return d;
    }
    
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? new Date(NaN) : fallback;
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const initialFyStart = currentMonth < 3 ? currentYear - 1 : currentYear;
  
  // --- STATE MANAGEMENT ---
  
  const [activeYears, setActiveYears] = useState<number[]>([initialFyStart]); 
  const [overviewFilter, setOverviewFilter] = useState<string>("monthly");
  const [summary, setSummary] = useState<any>({});

  const [comparisonYears, setComparisonYears] = useState<number[]>([
    initialFyStart, initialFyStart - 1, initialFyStart - 2, initialFyStart - 3
  ]);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [yearlyData, setYearlyData] = useState<any[]>([]);

  const [netBalanceFy, setNetBalanceFy] = useState<string>(initialFyStart.toString());
  const [netBalanceData, setNetBalanceData] = useState<any[]>([]);

  const [monthlyFy, setMonthlyFy] = useState<string>(initialFyStart.toString());
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  const [expenseFy, setExpenseFy] = useState<string>(initialFyStart.toString());
  const [expenseTable, setExpenseTable] = useState<any[]>([]);
  const [expenseColumns, setExpenseColumns] = useState<string[]>([]);

  const [recentFy, setRecentFy] = useState<string>(initialFyStart.toString());
  const [recentData, setRecentData] = useState<any[]>([]);

  const [sharedInvoices, setSharedInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Hydration fix
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- DATA FETCHING ---

  useEffect(() => {
    const fetchInit = async () => {
        const dates = getOverviewDates(overviewFilter);
        const params = new URLSearchParams({
            from: dates.from.toISOString(),
            to: dates.to.toISOString(),
            sections: 'summary,availableYears'
        });

        try {
            const [statsRes, sharedRes] = await Promise.all([
                api.get(`/dashboard/stats?${params}`),
                api.get('/invoices/shared')
            ]);
            
            setSummary(statsRes.data.summary);
            setSharedInvoices(sharedRes.data);

            if (statsRes.data.availableYears && statsRes.data.availableYears.length > 0) {
                setActiveYears(statsRes.data.availableYears.map((y: any) => Number(y)));
            }
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };
    fetchInit();
  }, []);

  useEffect(() => {
    if (loading) return;
    const fetchSummary = async () => {
        const dates = getOverviewDates(overviewFilter);
        const params = new URLSearchParams({
            from: dates.from.toISOString(),
            to: dates.to.toISOString(),
            sections: 'summary'
        });
        try {
            const res = await api.get(`/dashboard/stats?${params}`);
            setSummary(res.data.summary);
        } catch (e) { console.error(e); }
    };
    fetchSummary();
  }, [overviewFilter]);

  useEffect(() => {
    const fetchYearly = async () => {
        if (comparisonYears.length === 0) return;
        try {
            const params = new URLSearchParams({
                years: comparisonYears.join(','),
                sections: 'yearlyComparison'
            });
            const res = await api.get(`/dashboard/stats?${params}`);
            setYearlyData(res.data.charts.yearlyComparison);
        } catch (e) { console.error(e); }
    };
    fetchYearly();
  }, [comparisonYears]);

  useEffect(() => {
    const fetchNet = async () => {
        const fyDates = getFinancialYearDates(parseInt(netBalanceFy, 10));
        const params = new URLSearchParams({
            from: fyDates.from.toISOString(),
            to: fyDates.to.toISOString(),
            sections: 'monthlyStats'
        });
        const res = await api.get(`/dashboard/stats?${params}`);
        setNetBalanceData(res.data.charts.monthlyStats);
    };
    fetchNet();
  }, [netBalanceFy]);

  useEffect(() => {
    const fetchMonthly = async () => {
        const fyDates = getFinancialYearDates(parseInt(monthlyFy, 10));
        const params = new URLSearchParams({
            from: fyDates.from.toISOString(),
            to: fyDates.to.toISOString(),
            sections: 'monthlyStats'
        });
        const res = await api.get(`/dashboard/stats?${params}`);
        setMonthlyData(res.data.charts.monthlyStats);
    };
    fetchMonthly();
  }, [monthlyFy]);

  useEffect(() => {
    const fetchExpenses = async () => {
        const fyDates = getFinancialYearDates(parseInt(expenseFy, 10));
        const params = new URLSearchParams({
            from: fyDates.from.toISOString(),
            to: fyDates.to.toISOString(),
            sections: 'expenseTable'
        });
        const res = await api.get(`/dashboard/stats?${params}`);
        setExpenseTable(res.data.tables.expenseTable);
        setExpenseColumns(res.data.tables.expenseColumns);
    };
    fetchExpenses();
  }, [expenseFy]);

  useEffect(() => {
    let isMounted = true;
    const ctrl = new AbortController();

    const fetchRecent = async () => {
        if (!isMounted) return;
        if (activeYears.length === 0) return;

        const minYear = Math.min(...activeYears);
        const maxYear = Math.max(...activeYears);
        
        const start = getFinancialYearDates(minYear).from;
        const end = getFinancialYearDates(maxYear).to;

        const params = new URLSearchParams({
            from: start.toISOString(),
            to: end.toISOString(),
            sections: 'monthlyStats'
        });
        
        try {
            const res = await api.get(`/dashboard/stats?${params}`, {
              signal: ctrl.signal
            } as any);
            if (!isMounted) return;
            setRecentData(res.data.charts.monthlyStats || []);
        } catch (e: any) {
            if (e && e.name === 'AbortError') return;
            console.error('fetchRecent failed', e);
            if (isMounted) setRecentData([]);
        }
    };
    fetchRecent();

    return () => {
      isMounted = false;
      ctrl.abort();
    };
  }, [activeYears]);


  // --- HELPERS ---
  const toggleComparisonYear = (year: number) => {
      setComparisonYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const CustomizedAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform="rotate(-35)" fontSize={12}>{payload.value}</text>
      </g>
    );
  };

  // --- EXPENSE FOOTER CALCULATION ---
  const expenseFooter = useMemo(() => {
    if (!expenseTable || expenseTable.length === 0) return null;
    const totals: Record<string, number> = {};
    expenseColumns.forEach(col => {
        totals[col] = expenseTable.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
    });
    totals.grandTotal = expenseTable.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
    totals.averageTotal = expenseTable.reduce((sum, row) => sum + (Number(row.average) || 0), 0);
    return totals;
  }, [expenseTable, expenseColumns]);

  // --- CUMULATIVE BALANCE CALCULATION ---
  const recentHistoryWithBalance = useMemo(() => {
    if (!recentData || recentData.length === 0) return [];
    
    let runningBalance = 0;

    const sortedHistory = [...recentData].sort((a, b) => {
        const dateA = parseFlexibleDate(a.date || a.month);
        const dateB = parseFlexibleDate(b.date || b.month);
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        return timeA - timeB;
    });

    const fullHistory = sortedHistory.map((month: any) => {
        const netForMonth = (Number(month.revenue) || 0) - (Number(month.expense) || 0);
        runningBalance += netForMonth;
        return {
            ...month,
            netForMonth,
            runningBalance 
        };
    });

    const targetYear = parseInt(recentFy, 10);

    return fullHistory.filter((item: any) => {
        const itemDate = parseFlexibleDate(item.date || item.month || "");
        if (isNaN(itemDate.getTime())) return false;

        // Add 12 hours buffer to handle timezone rollovers
        const adjustedDate = new Date(itemDate.getTime() + 1000 * 60 * 60 * 12);
        const month = adjustedDate.getMonth();
        const year = adjustedDate.getFullYear();

        if (year === targetYear && month >= 3) return true;
        if (year === targetYear + 1 && month <= 2) return true;

        return false;
    });

  }, [recentData, recentFy]);

  if (!mounted) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;

  return (
    // OPTIMIZED: Padding reduced for mobile (p-4) to save width, min-w-0 added to prevent flex child overflow
    <div className="p-4 md:p-6 space-y-6 w-full max-w-[100vw] overflow-x-hidden">
      
      {/* HEADER WITH FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Financial Overview</p>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-sm font-medium text-muted-foreground hidden md:inline">Overview for:</span>
            <Select value={overviewFilter} onValueChange={setOverviewFilter}>
                <SelectTrigger className="h-9 w-[180px] bg-background border-input shadow-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Standard Ranges</p>
                        <SelectItem value="daily">Daily (Today)</SelectItem>
                        <SelectItem value="monthly">This Month</SelectItem>
                        <SelectItem value="quarterly">This Quarter</SelectItem>
                        <SelectItem value="yearly">This Year (Jan-Dec)</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                        
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mt-2">Financial Years</p>
                        {activeYears.map(year => (
                            <SelectItem key={year} value={`FY-${year}`}>
                                FY {year}-{year.toString().slice(-2) === '99' ? '00' : (year+1).toString().slice(-2)}
                            </SelectItem>
                        ))}
                    </div>
                </SelectContent>
            </Select>
        </div>
      </div>
      
      {/* 1. TOP METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 min-w-0">
        <MetricCard 
            title="Total Revenue" 
            value={summary?.totalRevenue || 0} 
            icon={<DollarSign />} 
            color="text-blue-600" 
            bg="bg-blue-50 dark:bg-blue-900/20" 
        />
        <MetricCard 
            title="Total Expenses" 
            value={summary?.totalExpense || 0} 
            icon={<Wallet />} 
            color="text-red-600" 
            bg="bg-red-50 dark:bg-red-900/20" 
        />
        <MetricCard 
            title="Net Profit" 
            value={summary?.netProfit || 0} 
            icon={<Activity />} 
            color="text-green-600" 
            bg="bg-green-50 dark:bg-green-900/20" 
        />
        <MetricCard 
            title="Avg Sale" 
            value={summary?.avgSale || 0} 
            icon={<BadgePercent />} 
            color="text-indigo-600" 
            bg="bg-indigo-50 dark:bg-indigo-900/20" 
        />
      </div>

      {/* 2. TOP CHART ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        
        {/* YEARLY COMPARISON */}
        <ChartCard 
            className="min-w-0 overflow-hidden"
            title="Yearly Comparison" 
            description="Revenue per Financial Year"
            action={
                <Popover open={isYearDropdownOpen} onOpenChange={setIsYearDropdownOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 border-dashed">
                            Select Years <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="end">
                        <Command>
                            <CommandGroup>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {activeYears.map((year) => (
                                        <CommandItem key={year} value={year.toString()} onSelect={() => toggleComparisonYear(year)}>
                                            <Check className={cn("mr-2 h-4 w-4", comparisonYears.includes(year) ? "opacity-100" : "opacity-0")} />
                                            FY {year}-{year.toString().slice(-2) === '99' ? '00' : (year+1).toString().slice(-2)}
                                        </CommandItem>
                                    ))}
                                </div>
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            }
        >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={yearlyData} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" interval={0} tick={<CustomizedAxisTick />} height={60} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `₹${val/1000}k`} tickLine={false} axisLine={false} width={40} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} contentStyle={tooltipStyle} formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="total" name="Revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>

        {/* NET BALANCE TREND */}
        <ChartCard 
            className="min-w-0 overflow-hidden"
            title="Net Balance Trend" 
            description={`Cumulative for FY ${netBalanceFy}-${parseInt(netBalanceFy)+1}`}
            action={
                <Select value={netBalanceFy} onValueChange={setNetBalanceFy}>
                    <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <div className="max-h-[300px] overflow-y-auto">
                         {activeYears.map(y => (
                            <SelectItem key={y} value={y.toString()}>FY {y}-{y.toString().slice(-2) === '99' ? '00' : (y+1).toString().slice(-2)}</SelectItem>
                         ))}
                        </div>
                    </SelectContent>
                </Select>
            }
        >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={netBalanceData}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} dy={10} />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="balance" name="Net Balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 3. MONTHLY PERFORMANCE */}
      <div className="grid grid-cols-1 gap-6 min-w-0">
        <ChartCard 
            className="min-w-0 overflow-hidden"
            title="Monthly Performance" 
            description={`Revenue vs Expenses (FY ${monthlyFy}-${parseInt(monthlyFy)+1})`}
            action={
                <Select value={monthlyFy} onValueChange={setMonthlyFy}>
                    <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <div className="max-h-[300px] overflow-y-auto">
                        {activeYears.map(y => (
                            <SelectItem key={y} value={y.toString()}>FY {y}-{y.toString().slice(-2) === '99' ? '00' : (y+1).toString().slice(-2)}</SelectItem>
                        ))}
                        </div>
                    </SelectContent>
                </Select>
            }
        >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} dy={10} />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `₹${val/1000}k`} tickLine={false} axisLine={false} width={40} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.2)'}} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                    <Bar dataKey="revenue" name="Sales" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="expense" name="Expenses" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 4. EXPENSE TABLE */}
      <Card className="shadow-horizon border-none bg-card overflow-hidden min-w-0">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>FY {expenseFy}-{parseInt(expenseFy)+1}</CardDescription>
            </div>
            <Select value={expenseFy} onValueChange={setExpenseFy}>
                <SelectTrigger className="h-8 w-[120px] md:w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <div className="max-h-[300px] overflow-y-auto">
                     {activeYears.map(y => (
                        <SelectItem key={y} value={y.toString()}>FY {y}-{y.toString().slice(-2) === '99' ? '00' : (y+1).toString().slice(-2)}</SelectItem>
                     ))}
                    </div>
                </SelectContent>
            </Select>
        </CardHeader>
        
        <CardContent className="p-0 overflow-x-auto md:p-6">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[150px] md:w-[200px] font-bold">Category</TableHead>
                        {expenseColumns.map((col: string) => <TableHead key={col} className="text-right whitespace-nowrap px-3">{col}</TableHead>)}
                        <TableHead className="text-right font-bold text-foreground px-3">Total</TableHead>
                        <TableHead className="text-right font-bold text-foreground px-3">Avg</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenseTable.length === 0 ? (
                        <TableRow><TableCell colSpan={expenseColumns.length + 3} className="text-center py-8">No expense data found.</TableCell></TableRow>
                    ) : expenseTable.map((row: any, i: number) => (
                        <TableRow key={i}>
                            <TableCell className="font-medium whitespace-nowrap">{row.category}</TableCell>
                            {expenseColumns.map((col: string) => (
                                <TableCell key={col} className="text-right text-muted-foreground whitespace-nowrap">{row[col] ? formatCurrency(row[col]) : '-'}</TableCell>
                            ))}
                            <TableCell className="text-right font-bold text-foreground bg-muted/20 whitespace-nowrap">{formatCurrency(row.total)}</TableCell>
                            <TableCell className="text-right font-medium text-muted-foreground bg-muted/20 whitespace-nowrap">{formatCurrency(row.average)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                {expenseFooter && (
                    <TableFooter className="bg-muted/50 font-bold border-t-2 border-primary/20">
                        <TableRow>
                            <TableCell>Total</TableCell>
                            {expenseColumns.map(col => (
                                <TableCell key={col} className="text-right text-foreground whitespace-nowrap">
                                    {formatCurrency(expenseFooter[col] || 0)}
                                </TableCell>
                            ))}
                            <TableCell className="text-right text-primary whitespace-nowrap">
                                {formatCurrency(expenseFooter.grandTotal)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                                {formatCurrency(expenseFooter.averageTotal)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
        </CardContent>
      </Card>
      
      {/* 5. BOTTOM TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          <Card className="shadow-horizon border-none bg-card min-w-0">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Balances History</CardTitle>
                <Select value={recentFy} onValueChange={setRecentFy}>
                    <SelectTrigger className="h-8 w-[110px] md:w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <div className="max-h-[300px] overflow-y-auto">
                        {activeYears.slice(0, 20).map(y => (
                            <SelectItem key={y} value={y.toString()}>FY {y}-{y.toString().slice(-2) === '99' ? '00' : (y+1).toString().slice(-2)}</SelectItem>
                        ))}
                        </div>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
                <div className="h-[350px] overflow-y-auto">
                  <div className="min-w-full inline-block align-middle">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[100px]">Month</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Expense</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...recentHistoryWithBalance].reverse().map((m: any, index: number) => (
                                <TableRow key={`${m.month}-${m.runningBalance || 0}-${m.id || index}`}>
                                    <TableCell className="font-medium text-foreground whitespace-nowrap">{m.month}</TableCell>
                                    <TableCell className="text-right text-green-600 whitespace-nowrap">+{formatCurrency(m.revenue)}</TableCell>
                                    <TableCell className="text-right text-red-600 whitespace-nowrap">-{formatCurrency(m.expense)}</TableCell>
                                    <TableCell className={`text-right font-bold whitespace-nowrap ${m.runningBalance >= 0 ? 'text-primary' : 'text-orange-600'}`}>
                                        {formatCurrency(m.runningBalance)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </div>
                </div>
            </CardContent>
        </Card>

        {/* SHARED INVOICES */}
        <Card className="shadow-horizon border-none bg-card min-w-0">
            <CardHeader>
                <CardTitle>Pending Invoices</CardTitle>
                <CardDescription>All invoices issued to clients.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Invoice</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sharedInvoices.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No shared invoices.</TableCell></TableRow>
                        ) : sharedInvoices.map((inv: any) => (
                            <TableRow key={inv.id}>
                                <TableCell className="font-mono text-xs text-foreground font-medium whitespace-nowrap">{inv.invoice_number}</TableCell>
                                <TableCell className="text-muted-foreground text-sm truncate max-w-[120px]" title={inv.client?.company_name}>{inv.client?.company_name || "Unknown"}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn(
                                        inv.status === 'PAID' && 'bg-green-50 text-green-700 border-green-200',
                                        inv.status === 'SENT' && 'bg-blue-50 text-blue-700 border-blue-200',
                                        inv.status === 'OVERDUE' && 'bg-red-50 text-red-700 border-red-200',
                                        inv.status === 'PARTIAL' && 'bg-orange-50 text-orange-700 border-orange-200'
                                    )}>{inv.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-foreground whitespace-nowrap">
                                    {formatCurrency(Number(inv.grand_total))}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reusable Metric Card
function MetricCard({ title, value, icon, color, bg }: any) {
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    return (
        <Card className="shadow-horizon border-none bg-card hover:scale-[1.02] transition-transform duration-200 min-w-0">
            <CardContent className="p-6 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
                    <h3 className="text-2xl font-bold text-foreground mt-1 truncate">{formatCurrency(Number(value))}</h3>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${bg} ${color}`}>
                    {React.isValidElement(icon) 
                      ? React.cloneElement(icon as React.ReactElement<any>, { className: "h-6 w-6" }) 
                      : icon}
                </div>
            </CardContent>
        </Card>
    )
}

const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    color: 'hsl(var(--foreground))',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    padding: '12px',
    border: '1px solid hsl(var(--border))'
};