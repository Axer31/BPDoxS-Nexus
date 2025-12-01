// frontend/app/expenses/page.tsx
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
import { Plus, Trash2, Wallet, TrendingDown, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: new Date(),
    description: ''
  });

  // Load Expenses
  const loadExpenses = async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) {
      console.error("Failed to load expenses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // Handlers
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
        setFormData({ category: '', amount: '', date: new Date(), description: '' }); // Reset
        loadExpenses(); // Refresh List
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
        loadExpenses();
    } catch (e) {
        alert("Delete failed");
    }
  };

  // Calculate Total
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expense Tracker</h1>
          <p className="text-slate-500">Track company spending and overheads</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800">
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

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-red-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Expenses</CardTitle>
                <Wallet className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalExpense)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Lifetime total</p>
            </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="p-8 text-center text-slate-400">Loading...</div>
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
                        {expenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    No expenses recorded yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {expenses.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell>{format(new Date(expense.date), "dd MMM yyyy")}</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                        {expense.category}
                                    </span>
                                </TableCell>
                                <TableCell className="text-slate-500 max-w-[300px] truncate" title={expense.description}>
                                    {expense.description || "-"}
                                </TableCell>
                                <TableCell className="text-right font-medium text-red-600">
                                    - {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(expense.amount))}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
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