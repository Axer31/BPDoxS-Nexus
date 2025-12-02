import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { ThemeProvider } from "@/components/theme-provider";
import { Configurator } from "@/components/Configurator";
import { DynamicBackground } from "@/components/DynamicBackground";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InvoiceCore",
  description: "Self-Hosted Invoicing System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen flex bg-background text-foreground antialiased overflow-hidden")}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          
          {/* Background Orbs */}
          <DynamicBackground />

          {/* FIX: Sidebar is now HIDDEN on mobile, and FLEX on Desktop (md:flex) */}
          <Sidebar className="hidden md:flex" />
          
          <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
            {/* TopNavbar contains the Hamburger menu for Mobile */}
            <TopNavbar />
            
            <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 scroll-smooth">
                {children}
            </main>
            
            <Configurator />
          </div>
          
        </ThemeProvider>
      </body>
    </html>
  );
}