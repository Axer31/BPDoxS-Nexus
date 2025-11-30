"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Printer, FileText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

// Define what an Invoice looks like coming from the API
interface Invoice {
  id: number;
  invoice_number: string;
  issue_date: string;
  grand_total: string; // Decimal comes as string from JSON often
  status: string;
  client: {
    company_name: string;
  };
}

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data on load
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await api.get('/invoices');
        setInvoices(res.data);
      } catch (err) {
        console.error("Failed to load", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">Manage your billing history</p>
        </div>
        <Link href="/invoices/new">
          <Button className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" />
            Create New
          </Button>
        </Link>
      </div>

      {/* The List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading records...</div>
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
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                        No invoices found. Create one!
                     </TableCell>
                   </TableRow>
                )}
                
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium font-mono text-slate-700">
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell>{inv.client?.company_name || "Unknown"}</TableCell>
                    <TableCell>{format(new Date(inv.issue_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(inv.grand_total))}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                      `}>
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                    <a href={`http://localhost:5000/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="icon">
                        <Printer className="w-4 h-4" />
                        </Button>
                    </a>
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