"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { Configurator } from "@/components/Configurator";
import { Loader2 } from "lucide-react";
import axios from "axios"; // Direct axios usage to bypass interceptors

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // Define routes that should NOT have the Sidebar/Navbar
  const isAuthPage = pathname === "/login" || 
                     pathname?.startsWith("/forgot-password") || 
                     pathname?.startsWith("/reset-password") ||
                     pathname === "/setup";

  useEffect(() => {
    const initCheck = async () => {
        try {
            // 1. Check System Status First
            // We use a raw request to avoid any existing interceptors redirecting us blindly
            const res = await axios.get('/api/auth/status');
            const isInstalled = res.data.initialized;

            if (!isInstalled) {
                // Case A: Not Installed -> Force user to Setup
                if (pathname !== '/setup') {
                    router.replace('/setup');
                }
            } else {
                // Case B: Installed
                
                // If user is on Setup page but system IS installed -> Force Login
                if (pathname === '/setup') {
                    router.replace('/login');
                    return;
                }

                // 2. Check Token for Protected Routes
                const token = localStorage.getItem('token');
                
                // If accessing a protected page without a token -> Force Login
                if (!token && !isAuthPage) {
                    router.replace('/login');
                    return;
                }
            }
        } catch (e) {
            console.error("System check failed - API likely unreachable", e);
            
            // CRITICAL FIX:
            // If the API fails (404/500), we DO NOT redirect to Login.
            // We assume the system is broken or setting up.
            // If we are not on a valid page, we might just stay put to avoid loops.
        } finally {
            // Always stop loading so the UI renders (even if it's an error state)
            setIsChecking(false);
        }
    };

    initCheck();
  }, [pathname, isAuthPage, router]);

  // Show a simple spinner while verifying auth state to prevent UI flash
  if (isChecking) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="sr-only">Loading System...</span>
        </div>
      );
  }

  // 1. Auth/Setup Page Layout (Clean, Centered Content)
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