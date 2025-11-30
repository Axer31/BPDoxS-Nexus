"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Save, Loader2 } from "lucide-react";
import { InvoiceItemsTable, LineItem } from "./invoice-items";
import api from "@/lib/api"; // Import our API bridge

// --- Mock Data for Testing ---
// In the real app, we will fetch this from the database
const MOCK_CLIENTS = [
  { id: 1, name: "Local Customer (WB)", state_code: 19, country: "India" }, // Same as Owner
  { id: 2, name: "Interstate Customer (Mumbai)", state_code: 27, country: "India" }, // Different State
  { id: 3, name: "International Client (US)", state_code: 99, country: "USA" } // Export
];

export default function NewInvoicePage() {
  // --- Form State ---
  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date());
  const [invoiceNumber, setInvoiceNumber] = useState("DDP/24-25/001");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isCalculating, setIsCalculating] = useState(false);

  // --- Line Items State ---
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: "Car Detailing - Premium", quantity: 1, rate: 5000, amount: 5000 }
  ]);

  // --- Financial State ---
  const [subtotal, setSubtotal] = useState(0);
  const [taxData, setTaxData] = useState({
    taxType: "NONE", // 'IGST' | 'CGST_SGST' | 'NONE'
    gstRate: 0,
    breakdown: { cgst: 0, sgst: 0, igst: 0 }
  });
  const [grandTotal, setGrandTotal] = useState(0);

  // 1. Calculate Subtotal when items change
  useEffect(() => {
    const newSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    setSubtotal(newSubtotal);
  }, [items]);

  // 2. Fetch Tax Logic from Backend when Client or Subtotal changes
  useEffect(() => {
    const fetchTaxLogic = async () => {
      if (!selectedClientId) return;

      const client = MOCK_CLIENTS.find(c => c.id.toString() === selectedClientId);
      if (!client) return;

      setIsCalculating(true);
      try {
        // CALL THE BACKEND
        const response = await api.post('/invoices/calculate-tax', {
          clientStateCode: client.state_code,
          clientCountry: client.country
        });

        const backendTax = response.data; // { taxType, breakdown: { cgst, ... } }
        
        // Apply the rate to the current subtotal
        const calculatedTax = {
            ...backendTax,
            breakdown: {
                cgst: (subtotal * backendTax.breakdown.cgst) / 100,
                sgst: (subtotal * backendTax.breakdown.sgst) / 100,
                igst: (subtotal * backendTax.breakdown.igst) / 100,
            }
        };

        setTaxData(calculatedTax);

      } catch (error) {
        console.error("Failed to calculate tax", error);
      } finally {
        setIsCalculating(false);
      }
    };

    fetchTaxLogic();
  }, [selectedClientId, subtotal]); // Re-run if client switches or amounts change

  // 3. Update Grand Total
  useEffect(() => {
    const totalTax = taxData.breakdown.cgst + taxData.breakdown.sgst + taxData.breakdown.igst;
    setGrandTotal(subtotal + totalTax);
  }, [subtotal, taxData]);

  // --- Actions ---
  const handleSave = async () => {
    if (!selectedClientId) {
      alert("Please select a client first.");
      return;
    }

    try {
      setIsCalculating(true); // Reuse loading state
      
      const payload = {
        clientId: Number(selectedClientId),
        issueDate: issueDate?.toISOString(),
        dueDate: null, // We can add a due date picker later
        items: items,
        taxSummary: taxData,
        subtotal: subtotal,
        grandTotal: grandTotal
      };

      console.log("Sending Payload:", payload);

      const response = await api.post('/invoices', payload);
      
      alert(`Success! Invoice Saved: ${response.data.invoice_number}`);
      
      // Optional: Redirect to dashboard or clear form
      // window.location.href = '/dashboard';

    } catch (error) {
      console.error(error);
      alert("Failed to save invoice. Check console.");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
          <p className="text-sm text-slate-500">Create a new invoice for a client</p>
        </div>
        <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800">
          {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Client Selector */}
        <Card className="md:col-span-1 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">Select Client...</option>
                {MOCK_CLIENTS.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                *Select "Local" or "Interstate" to test Tax Engine
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Date Picker */}
        <Card className="md:col-span-1 shadow-sm">
          <CardContent className="p-6 space-y-4">
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
          </CardContent>
        </Card>

        {/* Invoice Number */}
        <Card className="md:col-span-1 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Invoice #</Label>
              <Input value={invoiceNumber} readOnly className="font-mono bg-slate-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <InvoiceItemsTable items={items} setItems={setItems} />
          
          {/* --- TOTALS SECTION --- */}
          <div className="flex justify-end mt-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{subtotal.toFixed(2)}</span>
              </div>

              {/* Dynamic Tax Rendering */}
              {isCalculating ? (
                <div className="flex items-center justify-end text-xs text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin mr-1" /> Calculating Tax...
                </div>
              ) : (
                <>
                  {/* Scenario 1: IGST */}
                  {taxData.taxType === 'IGST' && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>IGST (18%)</span>
                      <span>{taxData.breakdown.igst.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Scenario 2: CGST + SGST */}
                  {taxData.taxType === 'CGST_SGST' && (
                    <>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>CGST (9%)</span>
                        <span>{taxData.breakdown.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>SGST (9%)</span>
                        <span>{taxData.breakdown.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {/* Scenario 3: Export */}
                  {taxData.taxType === 'NONE' && selectedClientId && (
                     <div className="flex justify-between text-sm text-green-600">
                        <span>Tax (Export)</span>
                        <span>0.00</span>
                     </div>
                  )}
                </>
              )}

              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}