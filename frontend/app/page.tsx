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

// ROBUST DATE PARSER: Handles "Mar24", "Mar 24", "Mar-24" formats
const parseFlexibleDate = (dateStr: string) => {
    if (!dateStr) return new Date(NaN);
    
    // Regex to match "Mar", "24" in various combinations
    // Matches 3+ letters (Month) ... optional separator ... 2 or 4 digits (Year)
    const match = String(dateStr).match(/([a-zA-Z]{3,})[\s\-'"]*(\d{2,4})/);
    
    if (match) {
        const monthPart = match[1];
        let yearPart = match[2];
        
        // Convert 2-digit year "24" to "2024"
        if (yearPart.length === 2) {
            yearPart = "20" + yearPart;
        }
        
        const d = new Date(`${monthPart} 1, ${yearPart}`);
        if (!isNaN(d.getTime())) return d;
    }
    
    // Fallback to standard parsing (e.g. for ISO strings)
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? new Date(NaN) : fallback;
};

export default function DashboardPage() {
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
                // Ensure years are stored as Numbers to prevent math errors later
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

  // G. Fetch Recent Balances (ALL HISTORY for Cumulative Calculation)
  // Use AbortController + mounted guard + no-cache header to avoid race/caching issues
  useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();

    const fetchRecent = async () => {
        if (!mounted) return;
        if (activeYears.length === 0) return;

        // Start from the earliest available year
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
              // If your api client supports passing fetch options / headers,
              // ensure these are forwarded to the underlying fetch to avoid cache.
              // Axios doesn't use this signature; for axios you can instead set headers in config.
              signal: (ctrl as any).signal
            } as any);
            // If using axios, res is as before.
            // Log payload to make it easier to debug timing-dependent empty responses.
            if (!mounted) return;
            console.log('recentData fetched', res?.data?.charts?.monthlyStats);
            setRecentData(res.data.charts.monthlyStats || []);
        } catch (e: any) {
            if (e && e.name === 'AbortError') return;
            console.error('fetchRecent failed', e);
            if (mounted) setRecentData([]);
        }
    };
    fetchRecent();

    return () => {
      mounted = false;
      try { ctrl.abort(); } catch (e) {}
    };
  }, [activeYears]);


  // --- HELPERS ---
  const toggleComparisonYear = (year: number) => {
      setComparisonYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

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

    // 1. Sort Chronologically (Oldest -> Newest) using Robust Parser
    const sortedHistory = [...recentData].sort((a, b) => {
        const dateA = parseFlexibleDate(a.date || a.month);
        const dateB = parseFlexibleDate(b.date || b.month);

        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();

        return timeA - timeB;
    });

    // 2. Calculate Cumulative Balance
    const fullHistory = sortedHistory.map((month: any) => {
        const netForMonth = (Number(month.revenue) || 0) - (Number(month.expense) || 0);
        runningBalance += netForMonth;
        return {
            ...month,
            netForMonth,
            runningBalance // Carries forward
        };
    });

    // 3. Filter for the Selected View (recentFy)
    const targetYear = parseInt(recentFy, 10);

    // helper: try to produce a sensible Date for an item even if month string lacks year
    const inferDateForItem = (item: any) => {
      const raw = item.date || item.month || "";
      const parsed = parseFlexibleDate(raw);

      if (!isNaN(parsed.getTime())) return parsed;

      // If parse fails, try to infer from short month name (e.g. "Apr", "May")
      const shortMatch = String(raw).match(/^([A-Za-z]{3})$/);
      if (shortMatch) {
        const monthName = shortMatch[1];
        const monthIndex = new Date(`${monthName} 1, ${targetYear}`).getMonth(); // 0-11
        // If month is April (3) or later, it's in targetYear, otherwise it's in targetYear+1 (FY logic)
        const inferredYear = monthIndex >= 3 ? targetYear : targetYear + 1;
        const inferredDate = new Date(inferredYear, monthIndex, 1, 12, 0, 0); // noon to avoid TZ issues
        return inferredDate;
      }

      // Last resort: return an invalid date so it will be excluded by the filter
      return new Date(NaN);
    };

    return fullHistory.filter((item: any) => {
        const itemDate = inferDateForItem(item);
        if (isNaN(itemDate.getTime())) return false;

        // Add 12 hours buffer to handle timezone rollovers
        const adjustedDate = new Date(itemDate.getTime() + 1000 * 60 * 60 * 12);

        const month = adjustedDate.getMonth(); // 0-11
        const year = adjustedDate.getFullYear();

        // Financial Year Logic: Apr(3) of Year -> Mar(2) of Year+1
        if (year === targetYear && month >= 3) return true;
        if (year === targetYear + 1 && month <= 2) return true;

        return false;
    });

  }, [recentData, recentFy]);


  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;

  return (
    <div className="p-6 space-y-6">
      
      {/* HEADER WITH FILTER */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Financial Overview</p>
        </div>

        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Overview for:</span>
            <Select value={overviewFilter} onValueChange={setOverviewFilter}>
                <SelectTrigger className="h-9 w-[180px] bg-background border-input shadow-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <ScrollArea className="h-[300px]">
                        <div className="p-1">
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
                    </ScrollArea>
                </SelectContent>
            </Select>
        </div>
      </div>
      
      {/* 1. TOP METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* YEARLY COMPARISON */}
        <ChartCard 
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
                                <ScrollArea className="max-h-[300px]">
                                    {activeYears.map((year) => (
                                        <CommandItem key={year} value={year.toString()} onSelect={() => toggleComparisonYear(year)}>
                                            <Check className={cn("mr-2 h-4 w-4", comparisonYears.includes(year) ? "opacity-100" : "opacity-0")} />
                                            FY {year}-{year.toString().slice(-2) === '99' ? '00' : (year+1).toString().slice(-2)}
                                        </CommandItem>
                                    ))}
                                </ScrollArea>
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
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `₹${val/1000}k`} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} contentStyle={tooltipStyle} formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="total" name="Revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>

        {/* NET BALANCE TREND */}
        <ChartCard 
            title="Net Balance Trend" 
            description={`Cumulative for FY ${netBalanceFy}-${parseInt(netBalanceFy)+1}`}
            action={
                <Select value={netBalanceFy} onValueChange={setNetBalanceFy}>
                    <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="max-h-[300px]">
                         {activeYears.map(y => (
                            <SelectItem key={y} value={y.toString()}>FY {y}-{y.toString().slice(-2) === '99' ? '00' : (y+1).toString().slice(-2)}</SelectItem>
                         ))}
                        </ScrollArea>
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
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="balance" name="Net Balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 3. MONTHLY PERFORMANCE */}
      <div className="grid grid-cols-1 gap-6">
        <ChartCard 
            title="Monthly Performance" 
            description={`Revenue vs Expenses (FY ${monthlyFy}-${parseInt(monthlyFy)+1})`}
            action={
                <Select value={monthlyFy} onValueChange={setMonthlyFy}>
                    <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="max-h-[300px]">
                        {activeYears.map(y => (
                            <SelectItem key={y} value={y.toString()}>FY {y}-{y.toString().slice(-2) === '99' ? '00' : (y+1).toString().slice(-2)}</SelectItem>
                        ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            }
        >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} dy={10} />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `₹${val/1000}k`} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.2)'}} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                    <Bar dataKey="revenue" name="Sales" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="expense" name="Expenses" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 4. EXPENSE TABLE */}
      <Card className="shadow-horizon border-none bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>FY {expenseFy}-{parseInt(expenseFy)+1}</CardDescription>
            </div>
            <Select value={expenseFy} onValueChange={setExpenseFy}>
                <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <ScrollArea className="max-h-[300px]">
                     {activeYears.map(y => (
                        <SelectItem key={y} value={y.toString()}>FY {y}-{y.toString().slice(-2) === '99' ? '00' : (y+1).toString().slice(-2)}</SelectItem>
                     ))}
                    </ScrollArea>
                </SelectContent>
            </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[200px] font-bold">Category</TableHead>
                        {expenseColumns.map((col: string) => <TableHead key={col} className="text-right whitespace-nowrap">{col}</TableHead>)}
                        <TableHead className="text-right font-bold text-foreground">Total</TableHead>
                        <TableHead className="text-right font-bold text-foreground">Average</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenseTable.length === 0 ? (
                        <TableRow><TableCell colSpan={expenseColumns.length + 3} className="text-center py-8">No expense data found.</TableCell></TableRow>
                    ) : expenseTable.map((row: any, i: number) => (
                        <TableRow key={i}>
                            <TableCell className="font-medium">{row.category}</TableCell>
                            {expenseColumns.map((col: string) => (
                                <TableCell key={col} className="text-right text-muted-foreground">{row[col] ? formatCurrency(row[col]) : '-'}</TableCell>
                            ))}
                            <TableCell className="text-right font-bold text-foreground bg-muted/20">{formatCurrency(row.total)}</TableCell>
                            <TableCell className="text-right font-medium text-muted-foreground bg-muted/20">{formatCurrency(row.average)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                {expenseFooter && (
                    <TableFooter className="bg-muted/50 font-bold border-t-2 border-primary/20">
                        <TableRow>
                            <TableCell>Total</TableCell>
                            {expenseColumns.map(col => (
                                <TableCell key={col} className="text-right text-foreground">
                                    {formatCurrency(expenseFooter[col] || 0)}
                                </TableCell>
                            ))}
                            <TableCell className="text-right text-primary">
                                {formatCurrency(expenseFooter.grandTotal)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                {formatCurrency(expenseFooter.averageTotal)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
        </CardContent>
      </Card>
      
      {/* 5. BOTTOM TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-horizon border-none bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Balances History</CardTitle>
                <Select value={recentFy} onValueChange={setRecentFy}>
                    <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="max-h-[300px]">
                        {activeYears.slice(0, 20).map(y => (
                            <SelectItem key={y} value={y.toString()}>FY {y}-{y.toString().slice(-2) === '99' ? '00' : (y+1).toString().slice(-2)}</SelectItem>
                        ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                {/* ScrollArea allows viewing the full year history */}
                <ScrollArea className="h-[350px] pr-4">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Month</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Expense</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Display newest first, but data includes cumulative balance from past */}
                            {[...recentHistoryWithBalance].reverse().map((m: any, index: number) => (
                                <TableRow key={`${m.month}-${m.runningBalance || 0}-${m.id || index}`}>
                                    <TableCell className="font-medium text-foreground">{m.month}</TableCell>
                                    <TableCell className="text-right text-green-600">+{formatCurrency(m.revenue)}</TableCell>
                                    <TableCell className="text-right text-red-600">-{formatCurrency(m.expense)}</TableCell>
                                    <TableCell className={`text-right font-bold ${m.runningBalance >= 0 ? 'text-primary' : 'text-orange-600'}`}>
                                        {formatCurrency(m.runningBalance)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>

        {/* SHARED INVOICES */}
        <Card className="shadow-horizon border-none bg-card">
            <CardHeader>
                <CardTitle>Pending Invoices</CardTitle>
                <CardDescription>All invoices issued to clients.</CardDescription>
            </CardHeader>
            <CardContent>
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
                                <TableCell className="font-mono text-xs text-foreground font-medium">{inv.invoice_number}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{inv.client?.company_name || "Unknown"}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn(
                                        inv.status === 'PAID' && 'bg-green-50 text-green-700 border-green-200',
                                        inv.status === 'SENT' && 'bg-blue-50 text-blue-700 border-blue-200',
                                        inv.status === 'OVERDUE' && 'bg-red-50 text-red-700 border-red-200',
                                        inv.status === 'PARTIAL' && 'bg-orange-50 text-orange-700 border-orange-200'
                                    )}>{inv.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-foreground">
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
        <Card className="shadow-horizon border-none bg-card hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">{formatCurrency(Number(value))}</h3>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${bg} ${color}`}>
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
