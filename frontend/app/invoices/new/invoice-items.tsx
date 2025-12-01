// frontend/app/invoices/new/invoice-items.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

export interface LineItem {
  id: number;
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceItemsProps {
  items: LineItem[];
  setItems: (items: LineItem[]) => void;
  currency?: string;
}

// HSN Codes as per Requirement 9
const HSN_CODES = ["998313", "998314", "998315", "998316", "998319"];

export function InvoiceItemsTable({ items, setItems, currency = "INR" }: InvoiceItemsProps) {

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: number, field: keyof LineItem, value: string | number) => {
    const newItems = items.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === "quantity" || field === "rate") {
            updatedItem.amount = Number(updatedItem.quantity) * Number(updatedItem.rate);
        }
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-md">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[35%]">Description</TableHead>
              <TableHead className="w-[15%]">HSN / SAC</TableHead>
              <TableHead className="w-[10%]">Qty</TableHead>
              <TableHead className="w-[20%]">Rate</TableHead>
              <TableHead className="w-[15%] text-right">Amount</TableHead>
              <TableHead className="w-[5%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Input 
                    placeholder="Item description" 
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  {/* HSN Dropdown */}
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={item.hsn}
                    onChange={(e) => updateItem(item.id, "hsn", e.target.value)}
                  >
                    <option value="">Select HSN...</option>
                    {HSN_CODES.map(code => (
                        <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" min="1" value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" min="0" value={item.rate}
                    onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                  />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency }).format(item.amount)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" onClick={addItem} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" /> Add Item
      </Button>
    </div>
  );
}