"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Activity, TrendingUp, Wallet, Loader2, Check, ChevronsUpDown, BadgePercent } from "lucide-react";
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

// 1. Helper for specific Financial Year (Used for charts/tables that are strictly FY based)
const getFinancialYearDates = (startYear: number) => {
    const from = new Date(startYear, 3, 1); // April 1st
    const to = new Date(startYear + 1, 2, 31, 23, 59, 59); // March 31st next year
    return { from, to };
};

// 2. New Helper for Overview Filter (Handles Daily, Monthly, Quarterly, Yearly, All Time, FY)
const getOverviewDates = (filter: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Handle Financial Year Format: "FY-2024"
    if (filter.startsWith('FY-')) {
        const startYear = parseInt(filter.split('-')[1]);
        return getFinancialYearDates(startYear);
    }

    switch (filter) {
        case 'daily': // Today 00:00 - 23:59
            return { 
                from: new Date(currentYear, currentMonth, now.getDate(), 0, 0, 0),
                to: new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59)
            };
        case 'monthly': // This Month
            return { 
                from: new Date(currentYear, currentMonth, 1), 
                to: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59) 
            };
        case 'quarterly': // This Quarter
            const qStartMonth = Math.floor(currentMonth / 3) * 3;
            return { 
                from: new Date(currentYear, qStartMonth, 1), 
                to: new Date(currentYear, qStartMonth + 3, 0, 23, 59, 59) 
            };
        case 'yearly': // Calendar Year (Jan - Dec)
            return { 
                from: new Date(currentYear, 0, 1), 
                to: new Date(currentYear, 11, 31, 23, 59, 59) 
            };
        case 'all': // All Time (from 2000 to Now)
            return { 
                from: new Date(2000, 0, 1), 
                to: new Date() 
            };
        default: // Default to Month
            return { 
                from: new Date(currentYear, currentMonth, 1), 
                to: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59) 
            };
    }
};

export default function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const initialFyStart = currentMonth < 3 ? currentYear - 1 : currentYear;
  
  // --- STATE MANAGEMENT ---
  
  // 0. Dynamic Years State
  const [activeYears, setActiveYears] = useState<number[]>([initialFyStart]); 

  // 1. Overview Filter State (Changed from strictly FY to generic filter)
  const [overviewFilter, setOverviewFilter] = useState<string>("monthly"); // Default: This Month
  const [summary, setSummary] = useState<any>({});

  // 2. Comparison Chart State
  const [comparisonYears, setComparisonYears] = useState<number[]>([
    initialFyStart, initialFyStart - 1, initialFyStart - 2, initialFyStart - 3
  ]);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [yearlyData, setYearlyData] = useState<any[]>([]);

  // 3. Net Balance State
  const [netBalanceFy, setNetBalanceFy] = useState<string>(initialFyStart.toString());
  const [netBalanceData, setNetBalanceData] = useState<any[]>([]);

  // 4. Monthly Performance State
  const [monthlyFy, setMonthlyFy] = useState<string>(initialFyStart.toString());
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  // 5. Expense Table State
  const [expenseFy, setExpenseFy] = useState<string>(initialFyStart.toString());
  const [expenseTable, setExpenseTable] = useState<any[]>([]);
  const [expenseColumns, setExpenseColumns] = useState<string[]>([]);

  // 6. Recent Balances State
  const [recentFy, setRecentFy] = useState<string>(initialFyStart.toString());
  const [recentData, setRecentData] = useState<any[]>([]);

  // 7. Shared Data State
  const [sharedInvoices, setSharedInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- DATA FETCHING ---

  // A. Fetch Initial Static Data (Shared Invoices & Available Years)
  useEffect(() => {
    const fetchInit = async () => {
        // Initial summary fetch uses the default 'overviewFilter' state (monthly)
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

            // Update Active Years List if data exists
            if (statsRes.data.availableYears && statsRes.data.availableYears.length > 0) {
                setActiveYears(statsRes.data.availableYears);
            }
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };
    fetchInit();
  }, []);

  // B. Fetch Summary ONLY when Overview Dropdown Changes (Reactive)
  useEffect(() => {
    if (loading) return; // Skip on initial load (handled by fetchInit)
    const fetchSummary = async () => {
        const dates = getOverviewDates(overviewFilter); // Use new helper
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
  }, [overviewFilter]); // Listen to overviewFilter

  // C. Fetch Yearly Comparison
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

  // D. Fetch Net Balance
  useEffect(() => {
    const fetchNet = async () => {
        const fyDates = getFinancialYearDates(parseInt(netBalanceFy));
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

  // E. Fetch Monthly Performance
  useEffect(() => {
    const fetchMonthly = async () => {
        const fyDates = getFinancialYearDates(parseInt(monthlyFy));
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

  // F. Fetch Expenses
  useEffect(() => {
    const fetchExpenses = async () => {
        const fyDates = getFinancialYearDates(parseInt(expenseFy));
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

  // G. Fetch Recent Balances
  useEffect(() => {
    const fetchRecent = async () => {
        const fyDates = getFinancialYearDates(parseInt(recentFy));
        const params = new URLSearchParams({
            from: fyDates.from.toISOString(),
            to: fyDates.to.toISOString(),
            sections: 'monthlyStats'
        });
        const res = await api.get(`/dashboard/stats?${params}`);
        setRecentData(res.data.charts.monthlyStats);
    };
    fetchRecent();
  }, [recentFy]);


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

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;

  return (
    <div className="p-6 space-y-6">
      
      {/* HEADER WITH FILTER */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Financial Overview</p>
        </div>

        {/* OVERVIEW FILTER: NEW IMPLEMENTATION */}
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
                            {/* DYNAMICALLY RENDERED FYs */}
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
            <ResponsiveContainer width="100%" height="100%">
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
            <ResponsiveContainer width="100%" height="100%">
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
            <ResponsiveContainer width="100%" height="100%">
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
                        {recentData.slice(-5).reverse().map((m: any) => (
                            <TableRow key={m.month}>
                                <TableCell className="font-medium text-foreground">{m.month}</TableCell>
                                <TableCell className="text-right text-green-600">+{formatCurrency(m.revenue)}</TableCell>
                                <TableCell className="text-right text-red-600">-{formatCurrency(m.expense)}</TableCell>
                                <TableCell className={`text-right font-bold ${m.net >= 0 ? 'text-primary' : 'text-orange-600'}`}>
                                    {formatCurrency(m.net)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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

// Reusable Metric Card (Unchanged)
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