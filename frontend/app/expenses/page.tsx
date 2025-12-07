"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Wallet, Calendar as CalendarIcon, Loader2, Search, X } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- FILTER STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // --- CREATE FORM STATE ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: new Date(),
    description: ''
  });

  // --- 1. LOAD DATA ---
  const loadExpenses = async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
      setFilteredExpenses(res.data);
    } catch (err) {
      console.error("Failed to load expenses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // --- 2. FILTER LOGIC ---
  useEffect(() => {
    let temp = expenses;

    // Search
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        temp = temp.filter(e => 
            e.category.toLowerCase().includes(lower) || 
            e.description?.toLowerCase().includes(lower)
        );
    }

    // Date Range Filter
    if (dateRange?.from) {
        temp = temp.filter(e => {
            const date = new Date(e.date);
            const start = startOfDay(dateRange.from!);
            const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
            return isWithinInterval(date, { start, end });
        });
    }

    setFilteredExpenses(temp);
  }, [expenses, searchTerm, dateRange]);

  // --- 3. ACTIONS ---
  const handleSubmit = async () => {
    if (!formData.category || !formData.amount) return alert("Category and Amount are required");
    
    setIsSaving(true);
    try {
        await api.post('/expenses', {
            ...formData,
            amount: Number(formData.amount),
            date: formData.date.toISOString()
        });
        setIsDialogOpen(false);
        // Reset Form
        setFormData({ category: '', amount: '', date: new Date(), description: '' }); 
        loadExpenses(); 
    } catch (e) {
        alert("Failed to save expense");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
        await api.delete(`/expenses/${id}`);
        // Optimistic UI Update
        setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) {
        alert("Delete failed");
    }
  };

  // Dynamic Total
  const totalExpense = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="p-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground">Track company spending and overheads</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4 mr-2" /> Record Expense
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Input 
                                placeholder="e.g. Server, Rent" 
                                value={formData.category} 
                                onChange={(e) => setFormData({...formData, category: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                value={formData.amount} 
                                onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2 flex flex-col">
                        <Label>Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className="w-full pl-3 text-left font-normal">
                                    {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                    mode="single" 
                                    selected={formData.date} 
                                    onSelect={(date) => date && setFormData({...formData, date})} 
                                    initialFocus 
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                            placeholder="Optional notes..." 
                            value={formData.description} 
                            onChange={(e) => setFormData({...formData, description: e.target.value})} 
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Expense"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      {/* METRICS & FILTERS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Dynamic Metric */}
        <Card className="border-l-4 border-l-red-500 shadow-sm md:col-span-1 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                <Wallet className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalExpense)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                   {dateRange ? 'Selected Period' : 'All Time'}
                </p>
            </CardContent>
        </Card>

        {/* Filters */}
        <div className="md:col-span-2 bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-center gap-4">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search category or description..." 
                        className="pl-9 bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Date Range Picker */}
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                                    ) : format(dateRange.from, "LLL dd, y")
                                ) : <span>Pick a date range</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    {dateRange && (
                        <Button variant="ghost" size="icon" onClick={() => setDateRange(undefined)} title="Clear Date Filter">
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <Card className="shadow-horizon border-none bg-card">
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardContent>
            {loading ? (
                <div className="p-10 text-center text-muted-foreground flex justify-center">
                    <Loader2 className="animate-spin mr-2"/> Loading...
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredExpenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No expenses found for this period.
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredExpenses.map((expense) => (
                            <TableRow key={expense.id} className="group hover:bg-muted/50 transition-colors">
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                    {format(new Date(expense.date), "dd MMM yyyy")}
                                </TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {expense.category}
                                    </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground max-w-[300px] truncate text-sm" title={expense.description}>
                                    {expense.description || "-"}
                                </TableCell>
                                <TableCell className="text-right font-bold text-red-600">
                                    - {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(expense.amount))}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

    </div>
  );
}