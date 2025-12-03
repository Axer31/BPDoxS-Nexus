"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "./NotificationCenter"; // <--- Integrated

export function TopNavbar() {
  const pathname = usePathname();
  
  // Format current path for Breadcrumbs (e.g. "/invoices/new" -> "Invoices / New")
  const pageTitle = pathname === "/" 
    ? "Dashboard" 
    : pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ');

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between p-4 md:p-6 bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all duration-200">
      
      {/* Container */}
      <div className="flex items-center gap-4 w-full">
        
        {/* --- MOBILE HAMBURGER MENU (Sheet) --- */}
        <Sheet>
          <SheetTrigger asChild>
            {/* Visible only on Mobile (< 768px) */}
            <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-foreground hover:bg-muted">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          
          {/* Drawer Content */}
          <SheetContent side="left" className="p-0 w-[290px] border-r border-border bg-card flex flex-col h-full">
             
             {/* Accessibility: Hidden Titles (Required by Radix UI) */}
             <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
             <SheetDescription className="sr-only">Main site navigation</SheetDescription>

             {/* 1. Custom Mobile Header (Logo) */}
             <div className="h-20 flex items-center px-6 shrink-0 border-b border-border/50">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 text-white font-black text-xl shrink-0">
                        IC
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Invoice<span className="text-primary">Core</span>
                    </h2>
                 </div>
             </div>

             {/* 2. Embed Sidebar */}
             <div className="flex-1 overflow-hidden">
                <Sidebar 
                  // Remove default sidebar borders/shadows since Sheet handles layout
                  className="w-full border-none h-full static shadow-none" 
                  // Hide the Sidebar's internal logo (we used the custom one above)
                  hideLogo={true} 
                  // Force text labels to show, ignoring "Mini" mode from desktop preference
                  forceExpand={true} 
                />
             </div>

          </SheetContent>
        </Sheet>

        {/* --- BREADCRUMBS / TITLE --- */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-medium">Pages / {pageTitle}</span>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight truncate">
            {pageTitle.split(' / ').pop()}
          </h1>
        </div>

        {/* --- RIGHT SIDE ACTIONS --- */}
        <div className="flex items-center gap-2 ml-auto">
            {/* Notification Center */}
            <NotificationCenter />
        </div>

      </div>
      
    </header>
  );
}