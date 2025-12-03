"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, FileText, Loader2, Trash2, Eye, Pencil, Search, Filter, Calendar as CalendarIcon, Save, X 
} from "lucide-react";
import Link from "next/link";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { QuotationItemsTable, QuoteItem } from "./new/quotation-items";

interface Quotation {
  id: number;
  quotation_number: string;
  issue_date: string;
  expiry_date?: string;
  grand_total: string;
  subtotal: string;
  status: string;
  client: { 
    company_name: string;
    email?: string;
    phone?: string;
  };
  line_items: QuoteItem[];
  services_offered?: string;
  contract_terms?: string;
  remarks?: string;
}

export default function QuotationListPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // --- VIEWPORT STATE ---
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // --- CREATE MODAL STATE ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Create Form Data
  const [newIssueDate, setNewIssueDate] = useState<Date | undefined>(new Date());
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [newItems, setNewItems] = useState<QuoteItem[]>([{ id: 1, description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }]);
  const [newServices, setNewServices] = useState("");
  const [newTerms, setNewTerms] = useState("");
  const [newRemarks, setNewRemarks] = useState("");
  const [newSubtotal, setNewSubtotal] = useState(0);
  const [newGrandTotal, setNewGrandTotal] = useState(0);

  // --- FILTER STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // --- 1. FETCH DATA ---
  const fetchData = async () => {
    try {
      const [quotesRes, clientsRes] = await Promise.all([
          api.get('/quotations'),
          api.get('/clients')
      ]);
      setQuotes(quotesRes.data);
      setFilteredQuotes(quotesRes.data);
      setClients(clientsRes.data);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- 2. CALCULATIONS (For Create Modal) ---
  useEffect(() => {
    const sub = newItems.reduce((sum, item) => sum + item.amount, 0);
    setNewSubtotal(sub);
    setNewGrandTotal(sub); 
  }, [newItems]);

  // --- 3. FILTER LOGIC ---
  useEffect(() => {
    let temp = quotes;

    // Search
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        temp = temp.filter(q => 
            q.quotation_number.toLowerCase().includes(lower) || 
            q.client.company_name.toLowerCase().includes(lower)
        );
    }

    // Status
    if (statusFilter !== "ALL") {
        temp = temp.filter(q => q.status === statusFilter);
    }

    // Date Range (Calendar)
    if (dateRange?.from) {
        temp = temp.filter(q => {
            const date = new Date(q.issue_date);
            const start = startOfDay(dateRange.from!);
            const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
            return isWithinInterval(date, { start, end });
        });
    }

    setFilteredQuotes(temp);
  }, [quotes, searchTerm, statusFilter, dateRange]);

  // --- 4. ACTION HANDLERS ---

  const handleCreate = async () => {
      if (!selectedClientId) return alert("Please select a Client");
      if (newItems.length === 0 || newSubtotal === 0) return alert("Please add items");

      setIsSaving(true);
      try {
          const payload = {
              clientId: Number(selectedClientId),
              issueDate: newIssueDate?.toISOString(),
              items: newItems,
              subtotal: newSubtotal,
              grandTotal: newGrandTotal,
              servicesOffered: newServices,
              contractTerms: newTerms,
              remarks: newRemarks
          };
          await api.post('/quotations', payload);
          setIsCreateOpen(false);
          // Reset Form
          setNewItems([{ id: Date.now(), description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }]);
          setSelectedClientId("");
          setNewServices(""); setNewTerms(""); setNewRemarks("");
          fetchData(); // Refresh List
      } catch (e) {
          alert("Failed to create quotation");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: number) => {
      if (!confirm("Delete this quotation?")) return;
      try {
          await api.delete(`/quotations/${id}`);
          setQuotes(prev => prev.filter(q => q.id !== id));
      } catch (e) {
          alert("Failed to delete");
      }
  };

  const openView = (quote: Quotation) => {
      setSelectedQuote(quote);
      setIsViewOpen(true);
  };

  const formatCurrency = (amount: number | string) => {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount));
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotations</h1>
          <p className="text-muted-foreground">Manage estimates and proposals</p>
        </div>
        
        {/* CREATE MODAL TRIGGER */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" /> Create Quote
                </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Quotation</DialogTitle>
                    <DialogDescription>Create a new proposal for your client.</DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Client</Label>
                            <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                            >
                                <option value="">Select Client...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <Label>Issue Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full pl-3 text-left font-normal">
                                        {newIssueDate ? format(newIssueDate, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={newIssueDate} onSelect={setNewIssueDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* ITEMS TABLE */}
                    <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
                        <Label className="mb-2 block">Bill of Quantities</Label>
                        <QuotationItemsTable items={newItems} setItems={setNewItems} />
                        <div className="flex justify-end mt-4 text-lg font-bold text-primary">
                            Total: {formatCurrency(newGrandTotal)}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Services Offered</Label>
                            <Textarea placeholder="Scope of work..." value={newServices} onChange={e => setNewServices(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Terms / Duration</Label>
                            <Textarea placeholder="e.g. 12 Months" value={newTerms} onChange={e => setNewTerms(e.target.value)} />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleCreate} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Quote
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      {/* FILTERS BAR */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
          {/* Search */}
          <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search Quote # or Client..." 
                className="pl-9" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
          </div>

          {/* Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground"/> 
                  <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
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
             {dateRange && (
                 <Button variant="ghost" size="icon" onClick={() => setDateRange(undefined)} title="Clear Date Filter">
                     <X className="w-4 h-4" />
                 </Button>
             )}
         </div>
      </div>

      {/* TABLE */}
      <Card className="shadow-horizon border-none bg-card">
        <CardHeader><CardTitle>All Quotations</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-10 text-center text-muted-foreground flex justify-center">
                <Loader2 className="animate-spin mr-2" /> Loading...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.length === 0 && (
                   <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No quotations match your filters.</TableCell></TableRow>
                )}
                
                {filteredQuotes.map((q) => (
                  <TableRow key={q.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-foreground font-mono">{q.quotation_number}</TableCell>
                    <TableCell className="font-medium text-muted-foreground">{q.client?.company_name}</TableCell>
                    <TableCell>{format(new Date(q.issue_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-bold text-foreground">{formatCurrency(q.grand_total)}</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                        ${q.status === 'ACCEPTED' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${q.status === 'SENT' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                        ${q.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400' : ''}
                      `}>{q.status}</span>
                    </TableCell>
                    
                    {/* RESTRICTED ACTIONS: VIEW, EDIT, DELETE ONLY */}
                    <TableCell className="text-right">
                       <div className="flex justify-end items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary rounded-full" onClick={() => openView(q)} title="View Details">
                            <Eye className="w-4 h-4"/>
                          </Button>
                          <Link href={`/quotations/${q.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-500 rounded-full" title="Edit">
                                <Pencil className="w-4 h-4"/>
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-500 rounded-full" onClick={() => handleDelete(q.id)} title="Delete">
                              <Trash2 className="w-4 h-4"/>
                          </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* === VIEWPORT MODAL === */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border shadow-2xl">
            <DialogHeader>
                <div className="flex justify-between items-start pr-8">
                    <div>
                        <DialogTitle className="text-2xl font-bold text-primary">
                            {selectedQuote?.quotation_number}
                        </DialogTitle>
                        <DialogDescription>
                            Issued on {selectedQuote && format(new Date(selectedQuote.issue_date), "dd MMMM yyyy")}
                        </DialogDescription>
                    </div>
                    <Badge variant="outline" className="text-sm px-3 py-1 uppercase">
                        {selectedQuote?.status}
                    </Badge>
                </div>
            </DialogHeader>

            {selectedQuote && (
                <div className="space-y-8 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                        <div><p className="text-xs font-semibold text-muted-foreground uppercase">Client</p><p className="text-sm font-bold mt-1">{selectedQuote.client.company_name}</p></div>
                        <div><p className="text-xs font-semibold text-muted-foreground uppercase">Contact</p><p className="text-sm mt-1">{selectedQuote.client.phone || "—"}</p></div>
                        <div><p className="text-xs font-semibold text-muted-foreground uppercase">Total</p><p className="text-sm mt-1 font-bold text-primary">{formatCurrency(selectedQuote.grand_total)}</p></div>
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Items</h3>
                        <div className="rounded-lg border border-border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50%]">Description</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Rate</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedQuote.line_items.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{item.description}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(item.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><h4 className="text-sm font-bold">Services</h4><div className="p-3 bg-muted/20 rounded-lg text-sm min-h-[80px]">{selectedQuote.services_offered || "N/A"}</div></div>
                        <div className="space-y-2"><h4 className="text-sm font-bold">Terms</h4><div className="p-3 bg-muted/20 rounded-lg text-sm min-h-[80px]">{selectedQuote.contract_terms || "N/A"}</div></div>
                    </div>
                </div>
            )}
            <DialogFooter className="sm:justify-start">
                <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}