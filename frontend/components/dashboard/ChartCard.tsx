"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode; // For filters like Year Select
  className?: string;
}

export function ChartCard({ title, description, children, action, className }: ChartCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className={`shadow-horizon border-none bg-card ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Custom Action (e.g. Filter) */}
          {action && <div>{action}</div>}

          {/* Full Screen Trigger */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-6">
               <div className="flex justify-between items-center mb-4">
                  <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
                  {/* We can duplicate the action in modal if needed, or leave it main view */}
               </div>
               <div className="flex-1 w-full h-full min-h-0">
                 {children}
               </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="h-[300px]">
        {children}
      </CardContent>
    </Card>
  );
}