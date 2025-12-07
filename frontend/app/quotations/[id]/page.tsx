"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Save, Loader2, ArrowLeft } from "lucide-react";
import { QuotationItemsTable, QuoteItem } from "../new/quotation-items"; 
import api from "@/lib/api"; 
import Link from "next/link";
import { useRouter, useParams } from 'next/navigation';
import { AVAILABLE_CURRENCIES } from "@/lib/currencies";

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Data State
  const [quoteNumber, setQuoteNumber] = useState("");
  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date());
  
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [currency, setCurrency] = useState<string>("INR"); // Default currency
  
  const [items, setItems] = useState<QuoteItem[]>([]);
  
  // Text Fields
  const [servicesOffered, setServicesOffered] = useState("");
  const [contractTerms, setContractTerms] = useState("");
  const [remarks, setRemarks] = useState("");

  const [grandTotal, setGrandTotal] = useState(0);

  // --- 1. Initial Data Load ---
  useEffect(() => {
    const loadAll = async () => {
        try {
            const [quoteRes, clientsRes] = await Promise.all([
                api.get(`/quotations/${id}`),
                api.get('/clients')
            ]);

            const quote = quoteRes.data;
            setClients(clientsRes.data);

            // Populate Form
            setQuoteNumber(quote.quotation_number);
            setIssueDate(new Date(quote.issue_date));
            setSelectedClientId(quote.client_id.toString());
            setCurrency(quote.currency || "INR"); // Load saved currency
            
            // Populate Items (Ensure type compatibility)
            const loadedItems = typeof quote.line_items === 'string' 
                ? JSON.parse(quote.line_items) 
                : quote.line_items;
                
            setItems(loadedItems || []);
            
            setServicesOffered(quote.services_offered || "");
            setContractTerms(quote.contract_terms || "");
            setRemarks(quote.remarks || "");
            
        } catch (e) {
            console.error(e);
            alert("Failed to load quotation details");
            router.push('/quotations');
        } finally {
            setLoading(false);
        }
    };
    if (id) loadAll();
  }, [id, router]);

  // --- 2. Recalculate Totals ---
  useEffect(() => {
    const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
    setGrandTotal(total);
  }, [items]);

  // Helper to format currency for display
  const formatCurrency = (amount: number) => {
    const selectedCurr = AVAILABLE_CURRENCIES.find(c => c.code === currency);
    return new Intl.NumberFormat(selectedCurr?.locale || 'en-IN', { 
        style: 'currency', 
        currency: currency 
    }).format(amount);
  };

  // --- 3. Update Handler ---
  const handleUpdate = async () => {
    setIsSaving(true);
    try {
        await api.put(`/quotations/${id}`, {
            clientId: Number(selectedClientId),
            issueDate: issueDate?.toISOString(),
            currency, // Send updated currency
            items,
            subtotal: grandTotal, 
            grandTotal,
            servicesOffered,
            contractTerms,
            remarks
        });
        alert("Quotation Updated Successfully");
        router.push('/quotations');
    } catch (e: any) {
        console.error(e);
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
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Link href="/quotations">
                <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4"/></Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-foreground">Edit Quotation</h1>
                <p className="text-muted-foreground text-sm font-mono">{quoteNumber}</p>
            </div>
        </div>
        <Button onClick={handleUpdate} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} 
            Update Quote
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Sidebar: Meta Data */}
         <Card className="md:col-span-1 shadow-sm border-none bg-white">
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

                {/* Currency Selector */}
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
            </CardContent>
         </Card>

         {/* Main Content: Items */}
         <Card className="md:col-span-2 shadow-sm border-none bg-white">
            <CardContent className="p-6 space-y-6">
                
                {/* ITEMS TABLE */}
                <Label className="text-base font-semibold">Bill of Quantities</Label>
                {/* Pass currency to table for row formatting */}
                <QuotationItemsTable items={items} setItems={setItems} currency={currency} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Services Offered</Label>
                        <Textarea 
                            value={servicesOffered} 
                            onChange={(e) => setServicesOffered(e.target.value)} 
                            className="bg-background min-h-[100px]" 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Contract Terms</Label>
                        <Textarea 
                            value={contractTerms} 
                            onChange={(e) => setContractTerms(e.target.value)} 
                            className="bg-background min-h-[100px]" 
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border mt-4">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between font-bold text-lg text-primary">
                            <span>Total Estimate</span>
                            <span>
                                {formatCurrency(grandTotal)}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}