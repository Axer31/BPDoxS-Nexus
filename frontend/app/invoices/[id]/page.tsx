"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Save, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { InvoiceItemsTable } from "../new/invoice-items"; 
import api from "@/lib/api"; 
import Link from "next/link";
import { useRouter, useParams } from 'next/navigation';

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Data State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [remarks, setRemarks] = useState("");
  
  const [clients, setClients] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  
  // NEW: Currency & Exchange Rate State
  const [currency, setCurrency] = useState("INR");
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  const [items, setItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [taxData, setTaxData] = useState<any>({ taxType: "NONE", gstRate: 0, breakdown: { cgst: 0, sgst: 0, igst: 0 } });

  // --- 1. Initial Data Load ---
  useEffect(() => {
    const loadAll = async () => {
        try {
            const [invRes, clientsRes, banksRes] = await Promise.all([
                api.get(`/invoices/${id}`),
                api.get('/clients'),
                api.get('/banks')
            ]);

            const inv = invRes.data;
            setClients(clientsRes.data);
            setBanks(banksRes.data);

            // Pre-fill Form
            setInvoiceNumber(inv.invoice_number);
            setIssueDate(new Date(inv.issue_date));
            if(inv.due_date) setDueDate(new Date(inv.due_date));
            setRemarks(inv.remarks || "");
            setSelectedClientId(inv.client_id.toString());
            
            // Set Bank, Currency & Exchange Rate
            setSelectedBankId(inv.bank_account_id?.toString() || "");
            setCurrency(inv.currency || "INR");
            // Load existing rate or default to 1
            setExchangeRate(inv.exchange_rate ? Number(inv.exchange_rate) : 1);

            setItems(inv.line_items);
            setTaxData(inv.tax_summary);
            
        } catch (e) {
            console.error(e);
            alert("Failed to load invoice details");
            router.push('/invoices');
        } finally {
            setLoading(false);
        }
    };
    if (id) loadAll();
  }, [id, router]);

  // --- 2. Handle Bank Change (Update Currency) ---
  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bankId = e.target.value;
    setSelectedBankId(bankId);
    
    // Find bank and set currency
    const bank = banks.find(b => b.id.toString() === bankId);
    if (bank) {
        setCurrency(bank.currency);
        // Reset exchange rate to 1 if we switch back to Base Currency (INR)
        if (bank.currency === 'INR') {
            setExchangeRate(1);
        }
    }
  };

  // --- 3. Recalculate Totals ---
  useEffect(() => {
    const newSub = items.reduce((sum, i) => sum + Number(i.amount), 0);
    setSubtotal(newSub);
  }, [items]);

  // --- 4. Recalculate Tax Logic ---
  useEffect(() => {
    if (!selectedClientId || subtotal === 0) return;
    
    const client = clients.find(c => c.id.toString() === selectedClientId);
    if (!client) return;

    api.post('/invoices/calculate-tax', {
        clientStateCode: client.state_code,
        clientCountry: client.country
    }).then(res => {
        const backendTax = res.data;
        setTaxData({
            ...backendTax,
            breakdown: {
                cgst: (subtotal * backendTax.breakdown.cgst) / 100,
                sgst: (subtotal * backendTax.breakdown.sgst) / 100,
                igst: (subtotal * backendTax.breakdown.igst) / 100,
            }
        });
    });
  }, [selectedClientId, subtotal, clients]);

  useEffect(() => {
    const taxTotal = taxData.breakdown.cgst + taxData.breakdown.sgst + taxData.breakdown.igst;
    setGrandTotal(subtotal + taxTotal);
  }, [subtotal, taxData]);

  // --- 5. Update Handler ---
  const handleUpdate = async () => {
    if (currency !== 'INR' && exchangeRate <= 0) return alert("Please enter a valid Exchange Rate");
    
    setIsSaving(true);
    try {
        await api.put(`/invoices/${id}`, {
            clientId: Number(selectedClientId),
            bankAccountId: Number(selectedBankId),
            issueDate: issueDate?.toISOString(),
            dueDate: dueDate?.toISOString(),
            items,
            taxSummary: taxData,
            subtotal,
            grandTotal,
            remarks,
            currency, // Send updated currency
            exchange_rate: exchangeRate // Send updated rate
        });
        alert("Invoice Updated Successfully");
        router.push('/invoices');
    } catch (e: any) {
        alert(e.response?.data?.error || "Update failed");
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Link href="/invoices">
                <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4"/></Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-foreground">Edit Invoice</h1>
                <p className="text-muted-foreground text-sm font-mono">{invoiceNumber}</p>
            </div>
        </div>
        <Button onClick={handleUpdate} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} 
            Update Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Sidebar: Meta Data */}
         <Card className="md:col-span-1 shadow-horizon border-none bg-card h-fit">
            <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                    <Label>Client</Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}
                    >
                        {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                </div>
                
                <div className="space-y-2">
                    <Label>Bank Account</Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedBankId} onChange={handleBankChange}
                    >
                        <option value="">Select Bank...</option>
                        {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.currency}</option>)}
                    </select>
                </div>

                {/* NEW: Exchange Rate Input (Conditional) */}
                {currency !== 'INR' && (
                    <div className="space-y-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-md">
                        <div className="flex justify-between items-center">
                            <Label className="text-yellow-800 dark:text-yellow-500">Exchange Rate</Label>
                            <span className="text-xs text-yellow-700 dark:text-yellow-400 font-mono">1 {currency} = ? INR</span>
                        </div>
                        <div className="relative">
                            <Input 
                                type="number" 
                                step="0.01"
                                value={exchangeRate}
                                onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                                className="bg-white dark:bg-black border-yellow-200"
                            />
                            <RefreshCw className="w-3 h-3 absolute right-3 top-3.5 text-slate-400" />
                        </div>
                        <p className="text-[10px] text-yellow-700 dark:text-yellow-500/80 leading-tight">
                            Update the conversion rate for accurate Ledger reporting in INR.
                        </p>
                    </div>
                )}

                <div className="space-y-2 flex flex-col">
                    <Label>Issue Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                {issueDate ? format(issueDate, "PPP") : "Pick a date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={issueDate} onSelect={setIssueDate} />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2 flex flex-col">
                    <Label>Due Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                        </PopoverContent>
                    </Popover>
                </div>
            </CardContent>
         </Card>

         {/* Main Content: Items */}
         <Card className="md:col-span-2 shadow-horizon border-none bg-card">
            <CardContent className="p-6 space-y-6">
                {/* Pass Currency to Table so rows render $ or ₹ */}
                <InvoiceItemsTable items={items} setItems={setItems} currency={currency} />
                
                <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="bg-background" />
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Tax ({taxData.taxType})</span>
                            <span>{(grandTotal - subtotal).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-border pt-2 flex justify-between font-bold text-lg text-primary">
                            <span>Total</span>
                            {/* DYNAMIC CURRENCY FORMATTING */}
                            <span>
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency }).format(grandTotal)}
                            </span>
                        </div>
                        {currency !== 'INR' && (
                             <div className="text-xs text-right text-muted-foreground">
                                (≈ {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandTotal * exchangeRate)})
                             </div>
                        )}
                    </div>
                </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}