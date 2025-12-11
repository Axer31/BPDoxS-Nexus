"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
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
    <Card className={`shadow-horizon border-none bg-card flex flex-col ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 shrink-0">
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            
            {/* FIX APPLIED HERE:
               1. "sm:max-w-[95vw]" -> Overrides the default "sm:max-w-lg" from dialog.tsx
               2. "w-[95vw]" -> Ensures it takes up the width
               3. "h-[90vh]" -> Forces height
            */}
            <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-6 sm:p-8">
              <DialogHeader className="mb-4 shrink-0 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                  <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
                  {description && (
                    <DialogDescription>{description}</DialogDescription>
                  )}
                </div>
              </DialogHeader>

              {/* key="fullscreen-mode" forces the chart to re-render completely 
                 so it detects the new 95vw width.
              */}
              <div className="flex-1 w-full h-full min-h-0 relative" key="fullscreen-mode">
                {children}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="h-[300px] min-h-[300px] w-full relative">
        {children}
      </CardContent>
    </Card>
  );
}