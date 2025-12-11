'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api'; 

interface MarkAsPaidProps {
  invoiceId: number;
  outstandingBalance: number;
  currencySymbol: string;
  onSuccess?: () => void;
}

export default function MarkAsPaidDialog({ 
  invoiceId, 
  outstandingBalance, 
  currencySymbol,
  onSuccess 
}: MarkAsPaidProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { register, handleSubmit, formState: { errors } } = useForm();
  const queryClient = useQueryClient();

  // Show manual INR field if currency is NOT INR
  const isInternational = currencySymbol !== '₹' && currencySymbol !== 'INR';

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post(`/invoices/${invoiceId}/payment`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (onSuccess) onSuccess();
    },
  });

  const onSubmit = (data: any) => {
    if (!date) return;
    
    const payload = {
      amount_received: parseFloat(data.amount),
      // SEND THE MANUAL AMOUNT
      received_amount_inr: data.received_amount_inr ? parseFloat(data.received_amount_inr) : null,
      payment_date: date.toISOString(),
      notes: data.notes
    };
    
    mutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Date Selection */}
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
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        {/* Invoice Amount (Display Only or Confirmation) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">
            Invoice Amount ({currencySymbol})
          </label>
          <Input 
            type="number" 
            step="0.01"
            defaultValue={outstandingBalance}
            {...register("amount", { required: true })}
          />
        </div>

        {/* MANUAL INR OVERRIDE - The "Received Amount System" */}
        {isInternational && (
           <div className="flex flex-col gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-900">
             <label className="text-xs font-bold text-blue-700 dark:text-blue-400">
               Actual Credited Amount (INR)
             </label>
             <Input 
               type="number" 
               step="0.01"
               placeholder="e.g. 84500.00"
               className="bg-white dark:bg-black"
               {...register("received_amount_inr", { required: true })}
             />
             <p className="text-[10px] text-blue-600 dark:text-blue-400/80">
               Enter the exact INR amount credited to your bank. This will be used for Ledger & Stats.
             </p>
           </div>
        )}

        <div className="flex flex-col gap-2">
           <Input placeholder="Notes (Optional)" {...register("notes")} />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm Payment'}
        </Button>
      </form>
    </div>
  );
}