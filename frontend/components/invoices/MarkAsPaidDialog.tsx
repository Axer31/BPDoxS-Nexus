// components/invoices/MarkAsPaidDialog.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface MarkAsPaidProps {
  invoiceId: number;
  outstandingBalance: number;
  currencySymbol: string;
}

export default function MarkAsPaidDialog({ invoiceId, outstandingBalance, currencySymbol }: MarkAsPaidProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { register, handleSubmit, formState: { errors } } = useForm();
  const queryClient = useQueryClient();

  // Mutation to call backend
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return axios.post(`/api/invoices/${invoiceId}/payment`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Close modal logic here
    },
  });

  const onSubmit = (data: any) => {
    if (!date) return;
    
    // Payload matches the user requirement: Date + Amount
    const payload = {
      amount_received: parseFloat(data.amount),
      payment_date: date.toISOString(), // ISO format for Prisma
      notes: data.notes
    };
    
    mutation.mutate(payload);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border mt-4">
      <h3 className="text-sm font-semibold mb-3">Record Payment</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Date Selection - "Below the Calendar" style logic */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">Payment Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Amount Received Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">
            Amount Received ({currencySymbol})
          </label>
          <Input 
            type="number" 
            step="0.01"
            placeholder="0.00"
            defaultValue={outstandingBalance} // Auto-fill with balance for convenience
            {...register("amount", { required: true, min: 0.01 })}
          />
          {errors.amount && <span className="text-red-500 text-xs">Amount is required</span>}
        </div>

        {/* Notes (Optional) */}
        <div className="flex flex-col gap-2">
           <Input 
            placeholder="Transaction ID / Notes (Optional)" 
            {...register("notes")}
          />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm Payment'}
        </Button>
      </form>
    </div>
  );
}