"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Plus, MoreHorizontal, CheckCircle, Send, 
  Loader2, Eye, Pencil, Search, Filter, Calendar as CalendarIcon, X, Share2, Trash2
} from "lucide-react";
import Link from "next/link";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useRouter } from 'next/navigation';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog"; // <--- Added Dialog Imports
import { Label } from "@/components/ui/label"; // <--- Added Label Import
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { useToast } from "@/components/ui/toast-context";

interface Invoice {
  id: number;
  invoice_number: string;
  issue_date: string;
  grand_total: string;
  status: string;
  // --- ADDED CURRENCY FIELDS ---
  currency?: string;
  exchange_rate?: number;
  // -----------------------------
  client: {
    company_name: string;
    email?: string;
  };
}

export default function InvoiceListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // --- NEW: Payment Date Dialog State ---
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [payDate, setPayDate] = useState<Date | undefined>(new Date());
  const [invoiceToPay, setInvoiceToPay] = useState<number | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await api.get('/invoices');
        setInvoices(res.data);
        setFilteredInvoices(res.data);
      } catch (err) {
        console.error("Failed to load invoices", err);
        toast("Failed to load invoices", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  // Filtering Logic
  useEffect(() => {
    let temp = invoices;

    // 1. Search
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        temp = temp.filter(inv => 
            inv.invoice_number.toLowerCase().includes(lower) || 
            inv.client.company_name.toLowerCase().includes(lower)
        );
    }

    // 2. Status
    if (statusFilter !== "ALL") {
        temp = temp.filter(inv => inv.status === statusFilter);
    }

    // 3. Date Range (Calendar)
    if (dateRange?.from) {
        temp = temp.filter(inv => {
            const date = new Date(inv.issue_date);
            const start = startOfDay(dateRange.from!);
            const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
            return isWithinInterval(date, { start, end });
        });
    }

    setFilteredInvoices(temp);
  }, [invoices, searchTerm, statusFilter, dateRange]);

  // --- HANDLERS ---

  const handleViewPdf = async (id: number) => {
    try {
      setActionLoadingId(id);
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const pdfUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(pdfUrl, '_blank');
    } catch (e) { 
        toast("Failed to load PDF.", "error"); 
    } finally { 
        setActionLoadingId(null); 
    }
  };

  const handleDownloadPdf = async (id: number, num: string) => {
    try {
      setActionLoadingId(id);
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${num}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) { 
        toast("Failed to download PDF", "error"); 
    } finally { 
        setActionLoadingId(null); 
    }
  };

  const handleSendEmail = async (inv: Invoice) => {
    if (!inv.client.email) {
        return toast("Client has no registered email address.", "error");
    }

    setActionLoadingId(inv.id);
    try { 
        await api.post(`/mail/invoice/${inv.id}`, { email: inv.client.email }); 
        toast(`Email sent to ${inv.client.email}`, "success");
        if (inv.status === 'DRAFT') handleStatusChange(inv.id, 'SENT');
    } 
    catch (e) { 
        toast("Failed to send email", "error"); 
    } finally { 
        setActionLoadingId(null); 
    }
  };

  // Generic Status Change
  const handleStatusChange = async (id: number, status: string) => {
    try { 
        await api.patch(`/invoices/${id}/status`, { status }); 
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
        toast(`Status updated to ${status}`, "success");
    } 
    catch (e) { 
        toast("Failed to update status", "error"); 
    }
  };

  // --- NEW: Open Mark Paid Dialog ---
  const openPayDialog = (id: number) => {
      setInvoiceToPay(id);
      setPayDate(new Date()); // Default to today
      setIsPayDialogOpen(true);
  };

  // --- NEW: Confirm Payment with Date ---
  const handleConfirmPaid = async () => {
      if (!invoiceToPay) return;
      try {
          // Pass the selected date to the backend
          await api.patch(`/invoices/${invoiceToPay}/status`, { 
              status: 'PAID',
              paymentDate: payDate 
          });
          
          setInvoices(prev => prev.map(inv => inv.id === invoiceToPay ? { ...inv, status: 'PAID' } : inv));
          toast("Invoice marked as Paid", "success");
      } catch (e) {
          toast("Failed to update status", "error");
      } finally {
          setIsPayDialogOpen(false);
          setInvoiceToPay(null);
      }
  };

  const handleDelete = async (id: number) => {
      if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) return;
      try {
          await api.delete(`/invoices/${id}`);
          setInvoices(prev => prev.filter(inv => inv.id !== id));
          toast("Invoice deleted successfully", "success");
      } catch (e) {
          toast("Failed to delete invoice", "error");
      }
  };

  return (
    <div className="p-6 space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage your billing history</p>
        </div>
        <Link href="/invoices/new">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" /> Create New
          </Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search Invoice # or Client..." 
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         
         <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="SHARED">Shared</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
            </SelectContent>
         </Select>

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
             {dateRange && <Button variant="ghost" size="icon" onClick={() => setDateRange(undefined)}><X className="w-4 h-4" /></Button>}
         </div>
      </div>

      <Card className="shadow-horizon border-none bg-card">
        <CardHeader><CardTitle>Invoice List</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-10 text-center text-muted-foreground flex justify-center">
                <Loader2 className="animate-spin mr-2" /> Loading records...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 && (
                   <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No invoices match your filters.</TableCell></TableRow>
                )}
                
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="font-bold text-foreground font-mono">{inv.invoice_number}</TableCell>
                    <TableCell className="text-muted-foreground font-medium">{inv.client?.company_name}</TableCell>
                    <TableCell>{format(new Date(inv.issue_date), "dd MMM yyyy")}</TableCell>
                    
                    {/* --- CURRENCY AWARE AMOUNT COLUMN --- */}
                    <TableCell className="text-right">
                       <div className="flex flex-col items-end">
                           <span className="font-bold text-foreground">
                               {formatMoney(Number(inv.grand_total), inv.currency || 'INR')}
                           </span>
                           {/* Show Approximate Ledger Value if Foreign Currency */}
                           {inv.currency && inv.currency !== 'INR' && inv.exchange_rate && (
                               <span className="text-[10px] text-muted-foreground font-normal">
                                   ≈ {formatMoney(Number(inv.grand_total) * Number(inv.exchange_rate), 'INR')}
                               </span>
                           )}
                       </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                        ${inv.status === 'PAID' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : ''}
                        ${inv.status === 'SENT' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : ''}
                        ${inv.status === 'SHARED' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800' : ''}
                        ${inv.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' : ''}
                        ${inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : ''}
                      `}>
                        {inv.status}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary rounded-full" onClick={() => handleViewPdf(inv.id)}>
                             {actionLoadingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Link href={`/invoices/${inv.id}`}>
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Pencil className="w-4 h-4" /></Button>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}>Download PDF</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendEmail(inv)}>Send Email</DropdownMenuItem>
                                {/* UPDATED: Trigger Dialog instead of direct call */}
                                <DropdownMenuItem onClick={() => openPayDialog(inv.id)}>Mark Paid</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(inv.id, 'SHARED')}>Mark Shared</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(inv.id, 'DRAFT')}>Mark Draft</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10" onClick={() => handleDelete(inv.id)}> Delete </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MARK AS PAID DIALOG */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Select the date the payment was received.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col space-y-2">
                <Label>Payment Date</Label>
                <div className="border rounded-md p-2 flex justify-center">
                    <Calendar
                        mode="single"
                        selected={payDate}
                        onSelect={setPayDate}
                        initialFocus
                    />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmPaid}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}