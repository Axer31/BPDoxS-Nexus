"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

export interface QuoteItem {
  id: number;
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface QuotationItemsProps {
  items: QuoteItem[];
  setItems: (items: QuoteItem[]) => void;
  currency?: string;
}

const HSN_CODES = ["998313", "998314", "998315", "998316", "998319"];

export function QuotationItemsTable({ items, setItems, currency = "INR" }: QuotationItemsProps) {

  const addItem = () => {
    setItems([
      ...items, 
      { id: Date.now(), description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }
    ]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = items.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate amount if quantity or rate changes
        if (field === "quantity" || field === "rate") {
            updatedItem.amount = Number(updatedItem.quantity) * Number(updatedItem.rate);
        }
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
  };

  // Helper for consistent currency formatting
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      <div className="border rounded-md overflow-hidden">
        {/* table-fixed ensures columns respect the w-[px] classes */}
        <Table className="table-fixed w-full">
          <TableHeader className="bg-background">
            <TableRow>
              {/* Description takes remaining space */}
              <TableHead className="w-auto px-3 text-left">Description</TableHead>
              {/* Strict widths for inputs so they never shrink */}
              <TableHead className="w-[120px] px-2">HSN/SAC</TableHead>
              <TableHead className="w-[90px] px-2 text-center">Qty</TableHead>
              <TableHead className="w-[130px] px-2 text-right">Rate</TableHead>
              <TableHead className="w-[130px] px-3 text-right">Amount</TableHead>
              <TableHead className="w-[50px] px-2"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="hover:bg-transparent">
                <TableCell className="p-2">
                  <Input 
                    placeholder="Item Name" 
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    className="h-9"
                  />
                </TableCell>
                <TableCell className="p-2">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={item.hsn}
                    onChange={(e) => updateItem(item.id, "hsn", e.target.value)}
                  >
                    <option value="">Select...</option>
                    {HSN_CODES.map(code => <option key={code} value={code}>{code}</option>)}
                  </select>
                </TableCell>
                <TableCell className="p-2">
                  <Input 
                    type="number" min="1" value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                    className="h-9 text-center px-1"
                  />
                </TableCell>
                <TableCell className="p-2">
                  <Input 
                    type="number" min="0" value={item.rate}
                    onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                    className="h-9 text-right px-2"
                  />
                </TableCell>
                <TableCell className="p-2 text-right font-bold text-sm text-primary">
                  {formatMoney(item.amount)}
                </TableCell>
                <TableCell className="p-2 text-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed h-9 text-xs font-medium">
        <Plus className="h-3 w-3 mr-2" /> Add Line Item
      </Button>
    </div>
  );
}