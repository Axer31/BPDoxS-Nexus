"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch"; // Import Switch
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Save, Loader2, ArrowLeft, Mail, Phone, Lock, Unlock } from "lucide-react";
import { QuotationItemsTable, QuoteItem } from "./quotation-items";
import api from "@/lib/api"; 
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { AVAILABLE_CURRENCIES } from "@/lib/currencies";

export default function NewQuotationPage() {
  const router = useRouter();

  // --- State ---
  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date());
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  const [currency, setCurrency] = useState<string>("INR");
  const [isSaving, setIsSaving] = useState(false);

  // Manual Override State
  const [isManual, setIsManual] = useState(false);
  const [manualNumber, setManualNumber] = useState("");

  // BOQ (Items)
  const [items, setItems] = useState<QuoteItem[]>([
    { id: 1, description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }
  ]);
  const [subtotal, setSubtotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  // Text Fields
  const [servicesOffered, setServicesOffered] = useState("");
  const [contractTerms, setContractTerms] = useState("");
  const [remarks, setRemarks] = useState("");

  // --- Data Fetching ---
  useEffect(() => {
    api.get('/clients').then(res => setClients(res.data)).catch(console.error);
  }, []);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedClientId(id);
    const client = clients.find(c => c.id.toString() === id);
    setSelectedClient(client || null);
  };

  useEffect(() => {
    const newSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    setSubtotal(newSubtotal);
    setGrandTotal(newSubtotal); 
  }, [items]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount);
  };

  // --- Save Handler ---
  const handleSave = async () => {
    if (!selectedClientId) return alert("Please select a Client.");
    if (items.length === 0 || subtotal === 0) return alert("Please add items to the BOQ.");
    if (isManual && !manualNumber.trim()) return alert("Please enter the Manual Quotation Number.");

    try {
      setIsSaving(true);
      const payload = {
        clientId: Number(selectedClientId),
        issueDate: issueDate?.toISOString(),
        expiryDate: expiryDate?.toISOString(), 
        currency: currency,
        items: items,
        subtotal: subtotal,
        grandTotal: grandTotal,
        servicesOffered: servicesOffered,
        contractTerms: contractTerms,
        remarks: remarks,
        
        // Manual Override Fields
        isManual: isManual,
        manualNumber: isManual ? manualNumber : undefined
      };

      const response = await api.post('/quotations', payload);
      alert(`Success! Quotation ${response.data.quotation_number} Created`);
      router.push('/quotations');

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Failed to create quotation.";
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      
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
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Quote
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Client & Meta Data */}
        <div className="xl:col-span-1 space-y-6">
            
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

                    <div className="space-y-2">
                        <Label>Contact Phone</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input disabled value={selectedClient?.phone || "—"} className="pl-9 bg-slate-50 dark:bg-slate-900/50" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input disabled value={selectedClient?.email || "—"} className="pl-9 bg-slate-50 dark:bg-slate-900/50" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Quote Meta */}
            <Card className="shadow-horizon border-none bg-card">
                <CardHeader><CardTitle className="text-base">Quote Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    
                    {/* Manual Override Toggle */}
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Manual Override</Label>
                            <p className="text-xs text-muted-foreground">Set number manually</p>
                        </div>
                        <Switch 
                            checked={isManual} 
                            onCheckedChange={setIsManual} 
                            className="data-[state=checked]:bg-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Quotation No</Label>
                        {isManual ? (
                            <div className="relative">
                                <Unlock className="absolute left-3 top-2.5 h-4 w-4 text-amber-500" />
                                <Input 
                                    value={manualNumber} 
                                    onChange={(e) => setManualNumber(e.target.value)}
                                    placeholder="e.g. Q-CUSTOM-001"
                                    className="pl-9 font-mono border-amber-200 focus-visible:ring-amber-500" 
                                />
                            </div>
                        ) : (
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    value="Auto-generated" 
                                    disabled 
                                    className="pl-9 bg-slate-50 dark:bg-slate-900/50 font-mono text-muted-foreground" 
                                />
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_CURRENCIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.code} - {c.name} ({c.symbol})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    
                    <div className="space-y-2 flex flex-col">
                        <Label>Valid Until (Optional)</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant={"outline"} className="w-full pl-3 text-left font-normal">
                                {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* RIGHT COLUMN: BOQ & Scope (Unchanged logic, just keeping structure) */}
        <div className="xl:col-span-2 space-y-6">
            <Card className="shadow-horizon border-none bg-card">
                <CardHeader><CardTitle className="text-base">Bill of Quantities</CardTitle></CardHeader>
                <CardContent className="p-6">
                    <QuotationItemsTable items={items} setItems={setItems} currency={currency} />
                    <div className="flex justify-end mt-6 pt-4 border-t">
                        <div className="text-right w-64">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-muted-foreground text-sm">Subtotal</span>
                                <span className="font-medium">{formatMoney(subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center border-t pt-2 mt-2">
                                <span className="font-bold text-lg text-foreground">Total Estimate</span>
                                <span className="text-xl font-bold text-primary">{formatMoney(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-horizon border-none bg-card">
                <CardHeader><CardTitle className="text-base">Scope & Terms</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Services Offered (Scope)</Label>
                            <Textarea 
                                placeholder="Describe the scope of work..."
                                value={servicesOffered}
                                onChange={(e) => setServicesOffered(e.target.value)}
                                className="h-32 bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Contract Terms</Label>
                            <Textarea 
                                placeholder="e.g. 50% Advance, Balance on Delivery..."
                                value={contractTerms}
                                onChange={(e) => setContractTerms(e.target.value)}
                                className="h-32 bg-background"
                            />
                        </div>
                    </div>
                    <div className="space-y-2 pt-2">
                        <Label>Internal Remarks (Not visible to client)</Label>
                        <Input 
                            placeholder="Notes for team..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="bg-background"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}