"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useConfigurator } from "@/hooks/use-configurator";
import { useRole } from "@/hooks/use-role";
import { 
  LayoutDashboard, FileText, Users, Settings, Wallet, 
  ChevronLeft, ChevronRight, Search, BookOpen, LogOut, User, MoreVertical, Activity 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api from "@/lib/api"; // Added API import

interface SidebarProps {
  className?: string;
  hideLogo?: boolean;
  forceExpand?: boolean;
}

export function Sidebar({ className, hideLogo = false, forceExpand = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarType, setSidebarType } = useConfigurator();
  const { role, isAdmin, isSudo } = useRole(); 
  
  // START: Dynamic Software Name Logic
  const [softwareName, setSoftwareName] = useState('InvoiceCore'); // Default fallback
  const [loadingName, setLoadingName] = useState(true);

  useEffect(() => {
    api.get('/settings/software-name')
      .then(res => {
        if (res.data?.software_name) {
          setSoftwareName(res.data.software_name);
        }
      })
      .catch(e => console.error("Failed to fetch software name", e))
      .finally(() => setLoadingName(false));
  }, []);

  const getSoftwareNameParts = () => {
    // Splits the name by capital letters for coloring, e.g., "InvoiceCore" -> ["Invoice", "Core"]
    const parts = softwareName.split(/([A-Z][a-z]+)/).filter(Boolean);
    
    return parts.map((part, index) => {
        // Apply primary color only to the last part (e.g., "Core") or if it matches the style
        if (index === parts.length - 1 && part.toLowerCase().endsWith('core')) {
            return <span key={index} className="text-primary">{part}</span>;
        }
        return part;
    });
  };
  // END: Dynamic Software Name Logic
  
  const isMini = forceExpand ? false : sidebarType === 'mini';

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, visible: true },
    { href: "/invoices", label: "Invoices", icon: FileText, visible: true },
    { href: "/quotations", label: "Quotations", icon: FileText, visible: true },
    { href: "/clients", label: "Clients", icon: Users, visible: true },
    { href: "/expenses", label: "Expenses", icon: Wallet, visible: true },
    
    // Admin & Sudo Only
    { href: "/ledger", label: "Ledger", icon: BookOpen, visible: isAdmin }, 
    { href: "/activity", label: "Activity Log", icon: Activity, visible: isAdmin }, 
    { href: "/settings", label: "Settings", icon: Settings, visible: isAdmin }, 
  ];

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <aside 
      className={cn(
        "flex flex-col bg-card border-r border-border/50 transition-all duration-300 ease-in-out z-40",
        "h-full md:h-screen sticky top-0",
        isMini ? "w-[80px]" : "w-[290px]",
        className
      )}
    >
      {/* --- 1. LOGO HEADER --- */}
      {!hideLogo && (
        <div className={cn("h-20 flex items-center px-6 shrink-0", isMini && "justify-center px-0")}>
           <div className="flex items-center gap-3">
              {/* CHANGE: text-white -> text-primary-foreground */}
              <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 text-primary-foreground font-black text-xl shrink-0">
                  {softwareName.charAt(0).toUpperCase()}
              </div>
              
              {!isMini && (
                <h2 className="text-2xl font-bold tracking-tight text-foreground whitespace-nowrap overflow-hidden">
                  {getSoftwareNameParts()}
                </h2>
              )}
           </div>
        </div>
      )}

      {!hideLogo && (
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4 mx-6 shrink-0" />
      )}
      
      {/* --- 2. NAVIGATION (Unchanged) --- */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-2 scrollbar-thin scrollbar-thumb-muted">
        {navItems.filter(item => item.visible).map((item) => {
            const active = isLinkActive(item.href);
            return (
                <Link 
                    key={item.href}
                    href={item.href} 
                    className={cn(
                        "flex items-center relative group transition-all duration-200 rounded-xl",
                        isMini ? "justify-center py-3" : "px-4 py-3",
                        active 
                            ? "bg-primary text-white shadow-md shadow-primary/25 font-semibold" 
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    title={isMini ? item.label : undefined}
                >
                    <item.icon className={cn(
                        "shrink-0 transition-transform duration-200", 
                        isMini ? "h-6 w-6" : "h-5 w-5 mr-3",
                        active && !isMini && "scale-105"
                    )} />
                    
                    {!isMini && (
                      <span className="truncate text-sm">{item.label}</span>
                    )}
                </Link>
            );
        })}
      </nav>

      {/* --- 3. BOTTOM SECTION (Unchanged) --- */}
      <div className="mt-auto border-t border-border/50 bg-card/50 backdrop-blur-sm p-4 flex flex-col gap-4 shrink-0">
        
        {/* Search (Hidden in Mini) */}
        {!isMini && (
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-9 h-10 bg-background border-border/50 focus-visible:ring-primary/20 rounded-xl text-sm shadow-sm" 
              />
          </div>
        )}

        {/* Profile Card (Unchanged) */}
        <div className={cn(
            "flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200",
            !isMini ? "bg-background border border-border/50 shadow-sm hover:border-primary/30" : "justify-center"
        )}>
            <Avatar className="h-9 w-9 border border-border shadow-sm cursor-pointer">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold text-xs">
                    {role ? role.charAt(0) : 'U'}
                </AvatarFallback>
            </Avatar>

            {!isMini && (
                <div className="flex-1 overflow-hidden min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                        {isSudo ? "Owner" : (isAdmin ? "Administrator" : "Staff Member")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate capitalize">
                        {role?.toLowerCase().replace('_', ' ')}
                    </p>
                </div>
            )}

            {!isMini && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto hover:bg-muted rounded-lg shrink-0">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mb-2 bg-popover border-border shadow-xl">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" /> Profile & Security
                        </DropdownMenuItem>
                        
                        {/* Only Admins see Settings link here too */}
                        {isAdmin && (
                            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" /> System Settings
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" /> Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>

        {/* Collapse Button (Desktop Only) */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-center text-muted-foreground hover:text-primary hidden md:flex h-8"
          onClick={() => setSidebarType(isMini ? 'default' : 'mini')}
        >
          {isMini ? <ChevronRight className="h-4 w-4" /> : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Collapse Sidebar</span>
            </div>
          )}
        </Button>
      </div>
    </aside>
  );
}