"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { Configurator } from "@/components/Configurator";
import { Loader2 } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // Define routes that should NOT have the Sidebar/Navbar
  const isAuthPage = pathname === "/login" || 
                     pathname?.startsWith("/forgot-password") || 
                     pathname?.startsWith("/reset-password");

  useEffect(() => {
    // Check for token in LocalStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!isAuthPage) {
        if (!token) {
            // Accessing protected route without token -> Redirect to Login
            router.replace('/login');
        } else {
            // Has token -> Allow access
            setIsChecking(false);
        }
    } else {
        // On auth page -> Allow access immediately
        setIsChecking(false);
    }
  }, [pathname, isAuthPage, router]);

  // Show a simple spinner while verifying auth state to prevent UI flash
  if (isChecking) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      );
  }

  // 1. Auth Page Layout (Clean, Centered Content)
  if (isAuthPage) {
    return (
        <div className="flex-1 flex flex-col h-screen w-full overflow-hidden relative z-10">
            <main className="flex-1 overflow-y-auto scroll-smooth">
                {children}
            </main>
        </div>
    );
  }

  // 2. Protected Dashboard Layout (Sidebar + Navbar + Configurator)
  return (
    <>
      <Sidebar className="hidden md:flex" />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <TopNavbar />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 scroll-smooth">
            {children}
        </main>
        
        <Configurator />
      </div>
    </>
  );
}