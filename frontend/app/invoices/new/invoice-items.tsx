"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

// Define the shape of a single line item
export interface LineItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceItemsProps {
  items: LineItem[];
  setItems: (items: LineItem[]) => void;
  currency?: string;
}

export function InvoiceItemsTable({ items, setItems, currency = "INR" }: InvoiceItemsProps) {

  // --- Actions ---

  const addItem = () => {
    const newItem: LineItem = {
      id: Date.now(), // Simple unique ID
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: number, field: keyof LineItem, value: string | number) => {
    const newItems = items.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto-calculate amount if qty or rate changes
        if (field === "quantity" || field === "rate") {
            updatedItem.amount = Number(updatedItem.quantity) * Number(updatedItem.rate);
        }
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
  };

  // --- Render ---

  return (
    <div className="space-y-4">
      <div className="border rounded-md">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[40%]">Description</TableHead>
              <TableHead className="w-[15%]">Qty</TableHead>
              <TableHead className="w-[20%]">Rate</TableHead>
              <TableHead className="w-[20%] text-right">Amount</TableHead>
              <TableHead className="w-[5%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Input 
                    placeholder="Item name / Service" 
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    min="0"
                    value={item.rate}
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