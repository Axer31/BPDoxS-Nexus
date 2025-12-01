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
import { CalendarIcon, Save, Loader2, PlusCircle, AlertCircle } from "lucide-react";
import { InvoiceItemsTable, LineItem } from "./invoice-items";
import api from "@/lib/api"; 
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Switch } from "@/components/ui/switch";

export default function NewInvoicePage() {
  const router = useRouter();

  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  
  const [isManual, setIsManual] = useState(false);
  const [manualNumber, setManualNumber] = useState("");
  const [remarks, setRemarks] = useState("");

  const [clients, setClients] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]); // Bank Accounts
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedBankId, setSelectedBankId] = useState<string>(""); // Selected Bank

  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: "Service Charge", hsn: "", quantity: 1, rate: 0, amount: 0 }
  ]);
  const [subtotal, setSubtotal] = useState(0);
  const [taxData, setTaxData] = useState({
    taxType: "NONE", gstRate: 0, breakdown: { cgst: 0, sgst: 0, igst: 0 }
  });
  const [grandTotal, setGrandTotal] = useState(0);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
        try {
            const [clientsRes, banksRes] = await Promise.all([
                api.get('/clients'),
                api.get('/banks')
            ]);
            setClients(clientsRes.data);
            setBanks(banksRes.data);
            
            // Auto-select default bank
            const defaultBank = banksRes.data.find((b:any) => b.is_default);
            if (defaultBank) setSelectedBankId(defaultBank.id);
        } catch (e) {
            console.error(e);
        }
    };
    fetchData();
  }, []);

  // --- Calculations ---
  useEffect(() => {
    const newSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    setSubtotal(newSubtotal);
  }, [items]);

  useEffect(() => {
    const fetchTaxLogic = async () => {
      if (!selectedClientId) return;
      const client = clients.find(c => c.id.toString() === selectedClientId);
      if (!client) return;

      setIsCalculating(true);
      try {
        const response = await api.post('/invoices/calculate-tax', {
          clientStateCode: client.state_code,
          clientCountry: client.country
        });
        const backendTax = response.data; 
        
        setTaxData({
            ...backendTax,
            breakdown: {
                cgst: (subtotal * backendTax.breakdown.cgst) / 100,
                sgst: (subtotal * backendTax.breakdown.sgst) / 100,
                igst: (subtotal * backendTax.breakdown.igst) / 100,
            }
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIsCalculating(false);
      }
    };
    fetchTaxLogic();
  }, [selectedClientId, subtotal, clients]);

  useEffect(() => {
    const totalTax = taxData.breakdown.cgst + taxData.breakdown.sgst + taxData.breakdown.igst;
    setGrandTotal(subtotal + totalTax);
  }, [subtotal, taxData]);

  // --- Save Handler ---
  const handleSave = async () => {
    if (!selectedClientId) return alert("Select a client");
    if (!selectedBankId) return alert("Select a bank account for payment details");
    if (items.length === 0 || subtotal === 0) return alert("Add items");

    try {
      setIsSaving(true);
      const payload = {
        clientId: Number(selectedClientId),
        bankAccountId: Number(selectedBankId),
        issueDate: issueDate?.toISOString(),
        dueDate: dueDate?.toISOString(),
        items: items,
        taxSummary: taxData,
        subtotal: subtotal,
        grandTotal: grandTotal,
        isManual: isManual,
        manualNumber: isManual ? manualNumber : undefined,
        remarks: remarks
      };

      const response = await api.post('/invoices', payload);
      alert(`Success! Invoice ${response.data.invoice_number} Created`);
      router.push('/invoices');

    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
        <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Settings Column */}
        <Card className="md:col-span-1 shadow-sm">
          <CardContent className="p-6 space-y-4">
            
            {/* FIXED: Manual Override Switch */}
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-md">
                <div className="flex items-center space-x-2" title="Enable to backdate or use custom invoice numbers">
                    <Label htmlFor="manual-mode" className="cursor-pointer">Manual Override</Label>
                    <AlertCircle className="w-3 h-3 text-slate-400" />
                </div>
                <Switch id="manual-mode" checked={isManual} onCheckedChange={setIsManual} />
            </div>

            <div className="space-y-2">
              <Label>Invoice #</Label>
              <Input 
                value={isManual ? manualNumber : "Auto-generated"} 
                onChange={(e) => setManualNumber(e.target.value)}
                disabled={!isManual}
                className={!isManual ? "font-mono bg-slate-50 text-slate-400" : "font-mono border-blue-200 bg-blue-50"}
              />
            </div>

            {/* Bank Selection */}
            <div className="space-y-2">
                <Label>Receiving Bank Account</Label>
                <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                >
                    <option value="">Select Bank...</option>
                    {banks.map(bank => (
                        <option key={bank.id} value={bank.id}>
                            {bank.label} ({bank.currency}) - {bank.bank_name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Dates */}
            <div className="space-y-2 flex flex-col">
              <Label>Invoice Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-full pl-3 text-left font-normal">
                    {issueDate ? format(issueDate, "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={issueDate} onSelect={setIssueDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2 flex flex-col">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-full pl-3 text-left font-normal">
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

          </CardContent>
        </Card>

        {/* Client & Items Column */}
        <Card className="md:col-span-2 shadow-sm">
          <CardContent className="p-6 space-y-6">
            
            {/* Client Select */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Client</Label>
                <Link href="/clients/new" className="text-xs text-blue-600 hover:underline flex items-center">
                    <PlusCircle className="w-3 h-3 mr-1" /> New Client
                </Link>
              </div>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">Select Client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.company_name} ({client.state_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Items Table */}
            <InvoiceItemsTable items={items} setItems={setItems} />

            {/* Remarks */}
            <div className="space-y-2">
                <Label>Remarks / Payment Terms</Label>
                <Textarea 
                    placeholder="E.g. Payment due within 15 days. Thank you for your business."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="h-20"
                />
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-4 border-t">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span>{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Tax ({taxData.taxType})</span>
                        <span>{(grandTotal - subtotal).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>₹{grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}