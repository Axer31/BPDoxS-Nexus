import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { DynamicBackground } from "@/components/DynamicBackground";
import { AppLayout } from "@/components/AppLayout";
import { ToastProvider } from "@/components/ui/toast-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BPDoxS Nexus",
  description: "Self-Hosted Invoicing System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen flex bg-background text-foreground antialiased overflow-hidden")}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ToastProvider>
          {/* Background Orbs persist on Login Page for branding */}
          <DynamicBackground />

          {/* New Client-Side Layout Wrapper */}
          <AppLayout>
             {children}
          </AppLayout>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
