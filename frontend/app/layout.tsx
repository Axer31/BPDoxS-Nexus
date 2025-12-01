// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Ensure you have this CSS file
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileText, Users, Settings, Wallet } from "lucide-react";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InvoiceCore",
  description: "Self-Hosted Invoicing System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "min-h-screen bg-slate-50 flex")}>
        
        {/* --- SIDEBAR START --- */}
        <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col hidden md:flex">
          <div className="mb-10 px-2">
             <h2 className="text-xl font-bold tracking-tight text-white">InvoiceCore</h2>
             <p className="text-xs text-slate-400">Enterprise Edition</p>
          </div>
          
          <nav className="space-y-2 flex-1">
            <Link href="/" className="flex items-center px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
              <LayoutDashboard className="h-5 w-5 mr-3" />
              Dashboard
            </Link>
            
            <Link href="/invoices" className="flex items-center px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
              <FileText className="h-5 w-5 mr-3" />
              Invoices
            </Link>

            <Link href="/clients/new" className="flex items-center px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
              <Users className="h-5 w-5 mr-3" />
              Clients
            </Link>

            <Link href="/expenses" className="flex items-center px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
              <Wallet className="h-5 w-5 mr-3" /> {/* Ensure Wallet is imported from lucide-react */}
              Expenses
            </Link>

          </nav>

          <div className="mt-auto">
             <Link href="/settings" className="flex items-center px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
               <Settings className="h-5 w-5 mr-3" />
               Settings
             </Link>
          </div>
        </aside>
        {/* --- SIDEBAR END --- */}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto max-h-screen">
            {children}
        </main>

      </body>
    </html>
  );
}