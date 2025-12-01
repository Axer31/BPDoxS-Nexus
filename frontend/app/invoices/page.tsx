"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, Printer, MoreHorizontal, CheckCircle, Send, FileEdit, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Invoice {
  id: number;
  invoice_number: string;
  issue_date: string;
  grand_total: string;
  status: string;
  client: {
    company_name: string;
    email?: string;
  };
}

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await api.get('/invoices');
        setInvoices(res.data);
      } catch (err) {
        console.error("Failed to load invoices", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      setInvoices(prev => prev.map(inv => 
        inv.id === id ? { ...inv, status: newStatus } : inv
      ));
      await api.patch(`/invoices/${id}/status`, { status: newStatus });
    } catch (e) {
      alert("Failed to update status");
      window.location.reload();
    }
  };

  const handleDownloadPdf = async (id: number, invoiceNumber: string) => {
    try {
      setDownloadingId(id);
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = invoiceNumber.replace(/\//g, '-');
      link.setAttribute('download', `invoice-${safeName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert("Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  // --- NEW: Send Email Handler ---
  const handleSendEmail = async (invoice: Invoice) => {
    const clientEmail = invoice.client.email || "";
    const emailToUse = prompt("Send invoice to:", clientEmail);
    
    if (!emailToUse) return;

    setSendingId(invoice.id);
    try {
      await api.post(`/mail/invoice/${invoice.id}`, { email: emailToUse });
      alert("Email sent successfully!");
      handleStatusChange(invoice.id, 'SENT'); // Auto-update status
    } catch (e: any) {
      alert("Failed to send email: " + (e.response?.data?.error || e.message));
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">Manage your billing history</p>
        </div>
        <Link href="/invoices/new">
          <Button className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" /> Create New
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-10 text-center text-slate-400 flex justify-center">
                <Loader2 className="animate-spin mr-2" /> Loading records...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 && (
                   <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-500">No invoices found.</TableCell></TableRow>
                )}
                
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium font-mono text-slate-700">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.client?.company_name || "Unknown"}</TableCell>
                    <TableCell>{format(new Date(inv.issue_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(inv.grand_total))}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : ''}
                        ${inv.status === 'SENT' ? 'bg-blue-100 text-blue-700' : ''}
                        ${inv.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' : ''}
                      `}>
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                       
                       {/* Send Email Button */}
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         title="Send Email"
                         onClick={() => handleSendEmail(inv)}
                         disabled={sendingId === inv.id}
                       >
                         {sendingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Mail className="w-4 h-4 text-slate-500 hover:text-blue-600" />}
                       </Button>

                       <Button 
                         variant="ghost" 
                         size="icon" 
                         title="Download PDF"
                         onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                         disabled={downloadingId === inv.id}
                       >
                         {downloadingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 text-slate-500 hover:text-slate-900" />}
                       </Button>

                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4 text-slate-500" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusChange(inv.id, 'PAID')}><CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Mark Paid</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(inv.id, 'SENT')}><Send className="w-4 h-4 mr-2 text-blue-600" /> Mark Sent</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(inv.id, 'DRAFT')}><FileEdit className="w-4 h-4 mr-2 text-gray-500" /> Mark Draft</DropdownMenuItem>
                          </DropdownMenuContent>
                       </DropdownMenu>

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