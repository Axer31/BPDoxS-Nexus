"use client";

import React, { useEffect, useState, useMemo } from 'react';
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { 
  ArrowDownLeft, ArrowUpRight, Download, Loader2, FileSpreadsheet, Filter, PlusCircle, Trash2, AlertCircle 
} from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, 
  isWithinInterval, endOfDay, startOfDay 
} from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/toast-context"; 

export default function LedgerPage() {
  const { toast } = useToast(); 
  
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [timeRange, setTimeRange] = useState("monthly");

  // State for "Add Income" Modal
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);
  const [newIncome, setNewIncome] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    category: 'Bank Interest',
    description: ''
  });

  // State for "Delete" Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 1. Load Data
  const fetchLedger = () => {
    setLoading(true);
    api.get('/ledger').then(res => {
        setAllTransactions(res.data);
        setLoading(false);
    }).catch(e => {
        console.error("Failed to load ledger");
        setLoading(false);
    });
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  // 2. DYNAMIC FINANCIAL YEARS LOGIC
  const availableFYs = useMemo(() => {
      const years = new Set<number>();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); 
      
      const currentFYStart = currentMonth < 3 ? currentYear - 1 : currentYear;
      years.add(currentFYStart);
      years.add(currentFYStart - 1); 

      allTransactions.forEach(t => {
          const d = new Date(t.date);
          const month = d.getMonth();
          const year = d.getFullYear();
          const fyStart = month < 3 ? year - 1 : year;
          years.add(fyStart);
      });

      return Array.from(years).sort((a, b) => b - a);
  }, [allTransactions]);

  // 3. Helper: Get Date Range
  const getDateRangeForFilter = (filter: string) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null; 

    if (filter.startsWith("FY-")) {
        const startYear = parseInt(filter.split("-")[1]);
        start = new Date(startYear, 3, 1); 
        end = new Date(startYear + 1, 2, 31, 23, 59, 59); 
    } else {
        switch(filter) {
            case 'daily': 
                start = startOfDay(now); 
                end = endOfDay(now);
                break;
            case 'monthly': 
                start = startOfMonth(now); 
                end = endOfMonth(now); 
                break;
            case 'quarterly': 
                start = startOfQuarter(now); 
                end = endOfQuarter(now); 
                break;
            case 'semi-annually': 
                start = subMonths(now, 6); 
                end = endOfDay(now); 
                break;
            case 'yearly': 
                start = startOfYear(now); 
                end = endOfYear(now); 
                break;
            case 'all': 
                start = null; 
                end = null;
                break;
        }
    }
    return { start, end };
  };

  // 4. Filtering Logic
  useEffect(() => {
    if (allTransactions.length === 0) return;

    const { start, end } = getDateRangeForFilter(timeRange);

    const filtered = allTransactions.filter(t => {
        if (!start || !end) return true;
        const d = new Date(t.date);
        return isWithinInterval(d, { start, end });
    });
    setFilteredTransactions(filtered);
  }, [timeRange, allTransactions]);

  // 5. Actions
  const handleExportPdf = async () => {
    setExporting(true);
    try {
        const { start, end } = getDateRangeForFilter(timeRange);
        const params = new URLSearchParams();
        if (start) params.append('from', start.toISOString());
        if (end) params.append('to', end.toISOString());

        const response = await api.get(`/ledger/pdf?${params.toString()}`, { responseType: 'blob' });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ledger-${timeRange}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (e) {
        alert("Failed to export PDF");
    } finally {
        setExporting(false);
    }
  };

  const handleCreateIncome = async () => {
    if (!newIncome.amount || !newIncome.date) {
        alert("Please fill in Date and Amount");
        return;
    }

    setSavingIncome(true);
    try {
        await api.post('/income', newIncome);
        if (toast) toast("Income recorded successfully", "success");
        
        setIsIncomeModalOpen(false);
        setNewIncome({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', category: 'Bank Interest', description: '' });
        fetchLedger(); // Refresh Data
    } catch (e) {
        console.error(e);
        if (toast) toast("Failed to record income", "error");
    } finally {
        setSavingIncome(false);
    }
  };

  // Delete Handlers
  const confirmDelete = (id: string) => {
      setDeleteId(id);
      setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
      if (!deleteId) return;
      setDeleting(true);

      const [type, idStr] = deleteId.split('-'); // e.g., "EXP-5" -> ["EXP", "5"]
      const id = parseInt(idStr);

      try {
          if (type === 'EXP') {
              await api.delete(`/expenses/${id}`);
          } else if (type === 'INC') {
              // Ensure backend route exists for this
              await api.delete(`/income/${id}`);
          } else {
              if (toast) toast("Cannot delete Invoices here. Use Invoice Management.", "error");
              setDeleting(false);
              setIsDeleteModalOpen(false);
              return;
          }

          if (toast) toast("Entry deleted successfully", "success");
          fetchLedger(); // Refresh
      } catch (e) {
          console.error(e);
          if (toast) toast("Failed to delete entry", "error");
      } finally {
          setDeleting(false);
          setIsDeleteModalOpen(false);
          setDeleteId(null);
      }
  };

  // Metrics
  const totalIncome = filteredTransactions.reduce((sum, t) => sum + t.credit, 0);
  const totalExpense = filteredTransactions.reduce((sum, t) => sum + t.debit, 0);
  const netBalance = totalIncome - totalExpense;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="p-6 space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-foreground">Financial Ledger</h1>
            <p className="text-muted-foreground">Consolidated view of Income and Expenses</p>
        </div>
        
        <div className="flex items-center gap-3">
            {/* Filter Dropdown */}
            <div className="w-[180px]">
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Filter" />
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
                                {availableFYs.map(year => (
                                    <SelectItem key={year} value={`FY-${year}`}>
                                        FY {year}-{year.toString().slice(-2) === '99' ? '00' : (year+1).toString().slice(-2)}
                                    </SelectItem>
                                ))}
                            </div>
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </div>

            {/* ADD INCOME BUTTON */}
            <Dialog open={isIncomeModalOpen} onOpenChange={setIsIncomeModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 border-green-200 hover:bg-green-50 hover:text-green-700 dark:border-green-900 dark:hover:bg-green-900/20">
                        <PlusCircle className="w-4 h-4 text-green-600" />
                        Add Income
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Other Income</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Date</Label>
                            <Input 
                                type="date" 
                                value={newIncome.date}
                                onChange={(e) => setNewIncome({...newIncome, date: e.target.value})}
                                className="col-span-3" 
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Amount</Label>
                            <Input 
                                type="number" 
                                placeholder="0.00"
                                value={newIncome.amount}
                                onChange={(e) => setNewIncome({...newIncome, amount: e.target.value})}
                                className="col-span-3" 
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Category</Label>
                            <div className="col-span-3">
                                <Select 
                                    value={newIncome.category} 
                                    onValueChange={(val) => setNewIncome({...newIncome, category: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Bank Interest">Bank Interest</SelectItem>
                                        <SelectItem value="Asset Sale">Asset Sale</SelectItem>
                                        <SelectItem value="Refund">Refund</SelectItem>
                                        <SelectItem value="Capital Injection">Capital Injection</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Description</Label>
                            <Input 
                                placeholder="Optional details..."
                                value={newIncome.description}
                                onChange={(e) => setNewIncome({...newIncome, description: e.target.value})}
                                className="col-span-3" 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateIncome} disabled={savingIncome}>
                            {savingIncome && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Export PDF Button */}
            <Button onClick={handleExportPdf} disabled={exporting} className="bg-primary text-primary-foreground">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Download className="w-4 h-4 mr-2" />}
                Export PDF
            </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900">
            <CardContent className="p-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full text-green-600 dark:text-green-100"><ArrowDownLeft className="w-5 h-5" /></div>
                    <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">Income</p>
                        <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalIncome)}</h3>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900">
            <CardContent className="p-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full text-red-600 dark:text-red-100"><ArrowUpRight className="w-5 h-5" /></div>
                    <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">Expenses</p>
                        <h3 className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(totalExpense)}</h3>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-200"><FileSpreadsheet className="w-5 h-5" /></div>
                    <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Net Balance</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(netBalance)}</h3>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-horizon border-none bg-card">
        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
        <CardContent>
            {loading ? (
                <div className="p-10 text-center flex justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2"/> Loading...</div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[100px]">Ref #</TableHead>
                            <TableHead className="text-right text-green-600">Credit (Income)</TableHead>
                            <TableHead className="text-right text-red-600">Debit (Expense)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No transactions found for this period.</TableCell></TableRow>
                        )}
                        {filteredTransactions.map((t) => (
                            <TableRow key={t.id} className="group">
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                    {format(new Date(t.date), "dd MMM yyyy")}
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium text-sm">{t.description}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.type} • {t.category}</div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{t.ref}</TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                    {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-medium text-red-600">
                                    {t.debit > 0 ? formatCurrency(t.debit) : '-'}
                                </TableCell>
                                <TableCell>
                                    {/* Only Allow Deleting EXP (Expenses) and INC (Other Income) */}
                                    {(t.id.startsWith('EXP') || t.id.startsWith('INC')) && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => confirmDelete(t.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    Confirm Deletion
                </DialogTitle>
                <DialogDescription>
                    Are you sure you want to delete this ledger entry? This action cannot be undone and will affect your financial reports.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={executeDelete} disabled={deleting}>
                    {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Delete Entry
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}