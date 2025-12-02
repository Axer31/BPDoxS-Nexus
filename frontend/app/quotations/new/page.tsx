"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Save, Loader2, ArrowLeft, User, Mail, Phone } from "lucide-react";
import { QuotationItemsTable, QuoteItem } from "./quotation-items";
import api from "@/lib/api"; 
import Link from "next/link";
import { useRouter } from 'next/navigation';

export default function NewQuotationPage() {
  const router = useRouter();

  // --- State ---
  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date());
  
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<any>(null); // Store full client obj
  
  const [isSaving, setIsSaving] = useState(false);

  // BOQ (Items)
  const [items, setItems] = useState<QuoteItem[]>([
    { id: 1, description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }
  ]);
  const [subtotal, setSubtotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  // Text Fields
  const [servicesOffered, setServicesOffered] = useState("");
  const [contractTenure, setContractTenure] = useState("");
  const [remarks, setRemarks] = useState("");

  // --- Data Fetching ---
  useEffect(() => {
    api.get('/clients').then(res => setClients(res.data)).catch(console.error);
  }, []);

  // Handle Client Selection (Auto-fill Contact/Email)
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedClientId(id);
    const client = clients.find(c => c.id.toString() === id);
    setSelectedClient(client || null);
  };

  // --- Calculations ---
  useEffect(() => {
    const newSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    setSubtotal(newSubtotal);
    setGrandTotal(newSubtotal); // Simple total for now (Tax logic applied later if needed)
  }, [items]);

  // --- Save Handler ---
  const handleSave = async () => {
    if (!selectedClientId) return alert("Please select a Client.");
    if (items.length === 0 || subtotal === 0) return alert("Please add items to the BOQ.");

    try {
      setIsSaving(true);
      const payload = {
        clientId: Number(selectedClientId),
        issueDate: issueDate?.toISOString(),
        items: items,
        subtotal: subtotal,
        grandTotal: grandTotal,
        
        // Mapped Fields
        servicesOffered: servicesOffered,
        contractTerms: contractTenure, // Mapping Tenure to Terms
        remarks: remarks,
      };

      const response = await api.post('/quotations', payload);
      alert(`Success! Quotation ${response.data.quotation_number} Created`);
      router.push('/quotations');

    } catch (error: any) {
      console.error(error);
      alert("Failed to create quotation");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Link href="/quotations">
                <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4"/></Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-foreground">New Quotation</h1>
                <p className="text-sm text-muted-foreground">Create a new proposal</p>
            </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-white hover:bg-primary/90">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Quote
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Client & Basic Info */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* 1. Client Details */}
            <Card className="shadow-horizon border-none bg-card">
                <CardHeader><CardTitle className="text-base">Client Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Client Name</Label>
                        <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={selectedClientId}
                            onChange={handleClientChange}
                        >
                            <option value="">Select Client...</option>
                            {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.company_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Auto-filled Fields */}
                    <div className="space-y-2">
                        <Label>Contact Person / Phone</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input disabled value={selectedClient?.phone || "—"} className="pl-9 bg-slate-50 dark:bg-slate-900/50" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input disabled value={selectedClient?.email || "—"} className="pl-9 bg-slate-50 dark:bg-slate-900/50" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Quote Details */}
            <Card className="shadow-horizon border-none bg-card">
                <CardHeader><CardTitle className="text-base">Quote Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Quotation No</Label>
                        <Input value="Auto-generated" disabled className="bg-slate-50 dark:bg-slate-900/50 font-mono text-muted-foreground" />
                    </div>
                    <div className="space-y-2 flex flex-col">
                        <Label>Issue Date</Label>
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
                    <div className="space-y-2">
                        <Label>Contract Tenure</Label>
                        <Input 
                            placeholder="e.g. 12 Months" 
                            value={contractTenure}
                            onChange={(e) => setContractTenure(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* RIGHT COLUMN: BOQ & Scope */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 3. BOQ (Bill of Quantities) */}
            <Card className="shadow-horizon border-none bg-card">
                <CardHeader><CardTitle className="text-base">BOQ (Bill of Quantities)</CardTitle></CardHeader>
                <CardContent className="p-6">
                    <QuotationItemsTable items={items} setItems={setItems} />
                    <div className="flex justify-end mt-4 pt-4 border-t">
                        <div className="text-right">
                            <span className="text-muted-foreground mr-4">Total Amount:</span>
                            <span className="text-xl font-bold text-primary">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandTotal)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Scope & Remarks */}
            <Card className="shadow-horizon border-none bg-card">
                <CardHeader><CardTitle className="text-base">Additional Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Services Offered (Scope of Work)</Label>
                        <Textarea 
                            placeholder="Describe the services in detail..."
                            value={servicesOffered}
                            onChange={(e) => setServicesOffered(e.target.value)}
                            className="h-24"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Remarks / Notes</Label>
                        <Textarea 
                            placeholder="Any other internal notes..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="h-20"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}