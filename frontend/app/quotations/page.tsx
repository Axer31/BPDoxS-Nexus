"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, FileText, Loader2, MoreHorizontal, Send, CheckCircle, Trash2, Eye, Pencil, Download, X
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface QuoteItem {
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  amount: number;
}

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
    addresses?: any;
  };
  line_items: QuoteItem[];
  services_offered?: string;
  contract_terms?: string;
  remarks?: string;
}

export default function QuotationListPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Viewport State
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Load Data
  const fetchQuotes = async () => {
    try {
      const res = await api.get('/quotations');
      setQuotes(res.data);
    } catch (err) {
      console.error("Failed to load quotations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  // Handlers
  const handleStatusChange = async (id: number, status: string) => {
      alert(`Mark as ${status} (Functionality pending in backend)`);
  };

  const handleDelete = async (id: number) => {
      if (!confirm("Are you sure you want to delete this quotation?")) return;
      try {
          await api.delete(`/quotations/${id}`);
          // Remove from UI instantly
          setQuotes(prev => prev.filter(q => q.id !== id));
      } catch (e) {
          alert("Failed to delete quotation");
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
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotations</h1>
          <p className="text-muted-foreground">Manage estimates and proposals</p>
        </div>
        <Link href="/quotations/new">
          <Button className="bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Create Quote
          </Button>
        </Link>
      </div>

      <Card className="shadow-horizon border-none bg-card">
        <CardHeader>
          <CardTitle>Recent Quotations</CardTitle>
        </CardHeader>
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
                {quotes.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No quotations found.
                     </TableCell>
                   </TableRow>
                )}
                
                {quotes.map((q) => (
                  <TableRow key={q.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-foreground font-mono">{q.quotation_number}</TableCell>
                    <TableCell className="font-medium text-muted-foreground">{q.client?.company_name || "Unknown"}</TableCell>
                    <TableCell>{format(new Date(q.issue_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-bold text-foreground">
                      {formatCurrency(q.grand_total)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                        ${q.status === 'ACCEPTED' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : ''}
                        ${q.status === 'SENT' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : ''}
                        ${q.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' : ''}
                      `}>
                        {q.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end items-center gap-1">
                          
                          {/* 1. VIEW (Modal) */}
                          <Button 
                            variant="ghost" size="icon" 
                            className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-full"
                            onClick={() => openView(q)}
                            title="Quick View"
                          >
                            <Eye className="w-4 h-4"/>
                          </Button>

                          {/* 2. EDIT (Navigate to Edit Page) */}
                          <Link href={`/quotations/${q.id}`}>
                            <Button 
                              variant="ghost" size="icon" 
                              className="h-8 w-8 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full"
                              title="Edit Quotation"
                            >
                                <Pencil className="w-4 h-4"/>
                            </Button>
                          </Link>

                          {/* 3. MORE ACTIONS */}
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted rounded-full"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-popover">
                                <DropdownMenuItem onClick={() => window.open(`http://localhost:5000/api/quotations/${q.id}/pdf?download=true`, '_self')}>
                                    <Download className="w-4 h-4 mr-2"/> Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(q.id, 'SENT')}><Send className="w-4 h-4 mr-2 text-blue-500"/> Mark Sent</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(q.id, 'ACCEPTED')}><CheckCircle className="w-4 h-4 mr-2 text-green-500"/> Convert to Invoice</DropdownMenuItem>
                                
                                {/* DELETE ACTION */}
                                <DropdownMenuItem className="text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10" onClick={() => handleDelete(q.id)}>
                                    <Trash2 className="w-4 h-4 mr-2"/> Delete
                                </DropdownMenuItem>
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

      {/* === VIEWPORT MODAL (DETAILS) === */}
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
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Client Name</p>
                            <p className="text-sm font-bold text-foreground mt-1">{selectedQuote.client.company_name}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Contact</p>
                            <p className="text-sm text-foreground mt-1">{selectedQuote.client.phone || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                            <p className="text-sm text-foreground mt-1 truncate" title={selectedQuote.client.email}>{selectedQuote.client.email || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Valid Until</p>
                            <p className="text-sm text-foreground mt-1">
                                {selectedQuote.expiry_date ? format(new Date(selectedQuote.expiry_date), "dd MMM yyyy") : "—"}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" /> Bill of Quantities (BOQ)
                        </h3>
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
                        <div className="flex justify-end mt-4">
                            <div className="w-1/2 md:w-1/3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{formatCurrency(selectedQuote.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-primary border-t border-border pt-2">
                                    <span>Total</span>
                                    <span>{formatCurrency(selectedQuote.grand_total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-foreground">Services Offered</h4>
                            <div className="p-3 bg-muted/20 rounded-lg text-sm text-muted-foreground min-h-[80px] whitespace-pre-wrap border border-border/50">
                                {selectedQuote.services_offered || "No services specified."}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-foreground">Contract Tenure / Terms</h4>
                            <div className="p-3 bg-muted/20 rounded-lg text-sm text-muted-foreground min-h-[80px] whitespace-pre-wrap border border-border/50">
                                {selectedQuote.contract_terms || "No tenure specified."}
                            </div>
                        </div>
                    </div>
                    
                    {selectedQuote.remarks && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-foreground">Remarks</h4>
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm border border-yellow-200 dark:border-yellow-800/50">
                                {selectedQuote.remarks}
                            </div>
                        </div>
                    )}

                </div>
            )}

            <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}