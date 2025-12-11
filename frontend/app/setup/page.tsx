// frontend/app/setup/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { Loader2, Database, Key, CheckCircle, UserPlus, AlertCircle, ArrowLeft } from "lucide-react";
import axios from 'axios';
import Link from 'next/link';

// Use raw axios as the regular API client relies on a pre-existing token
const rawApi = axios.create({ baseURL: '/api' });

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Form State
  const [dbConfig, setDbConfig] = useState({
    dbHost: 'localhost', dbPort: '3306', dbUser: 'root', dbPassword: '', dbName: 'invoice_core_db'
  });
  const [adminConfig, setAdminConfig] = useState({
    adminEmail: 'owner@company.com', adminPassword: ''
  });

const handleSetup = async () => {
    // UPDATED VALIDATION: Added check for dbPort, dbUser, and dbName
    if (!dbConfig.dbHost || !dbConfig.dbPort || !dbConfig.dbUser || !dbConfig.dbName || !adminConfig.adminPassword || !adminConfig.adminEmail) {
      return setError("Please fill in all required fields.");
    }
    if (adminConfig.adminPassword.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    setLoading(true);
    setError("");

    try {
      const payload = { ...dbConfig, ...adminConfig };
      
      const res = await rawApi.post('/auth/setup', payload);
      
      setSuccessMsg(`System initialized! Sudo Admin User created with email: ${adminConfig.adminEmail}`);

      
    } catch (err: any) {
        console.error("Setup Error:", err);
        if (err.response?.status === 403) {
            setError("System is already installed. Redirecting to Login...");
            setTimeout(() => router.push('/login'), 3000);
        } else {
            setError(err.response?.data?.error || "Installation failed. Check MySQL details and folder write permissions.");
        }
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> 1. Database Connection</h3>
            <p className="text-sm text-slate-400">These details will be saved to the <code>.env</code> file.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Host</Label><Input value={dbConfig.dbHost} onChange={e => setDbConfig({...dbConfig, dbHost: e.target.value})} /></div>
              <div className="space-y-2"><Label>Port</Label><Input type="number" value={dbConfig.dbPort} onChange={e => setDbConfig({...dbConfig, dbPort: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Database Name</Label><Input value={dbConfig.dbName} onChange={e => setDbConfig({...dbConfig, dbName: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>User</Label><Input value={dbConfig.dbUser} onChange={e => setDbConfig({...dbConfig, dbUser: e.target.value})} /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={dbConfig.dbPassword} onChange={e => setDbConfig({...dbConfig, dbPassword: e.target.value})} /></div>
            </div>
            <Button onClick={() => setStep(2)} className="w-full mt-6">Next: Create Admin User</Button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="lg:text-lg font-semibold flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> 2. Create System Owner (Sudo)</h3>
            <p className="text-sm text-slate-400">This account will have full access and control.</p>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={adminConfig.adminEmail} onChange={e => setAdminConfig({...adminConfig, adminEmail: e.target.value})} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={adminConfig.adminPassword} onChange={e => setAdminConfig({...adminConfig, adminPassword: e.target.value})} /></div>
            <Button onClick={handleSetup} disabled={loading} className="w-full mt-6 bg-green-600 hover:bg-green-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Run Final Setup
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-slate-400 hover:text-white">
                <ArrowLeft className="w-3 h-3 mr-1"/> Back to DB Config
            </Button>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-lg shadow-2xl border-slate-800 bg-slate-950 text-slate-200">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2"><Key className="w-10 h-10 text-primary" /></div>
          <CardTitle className="text-3xl font-bold text-white">InvoiceCore Setup</CardTitle>
          <CardDescription className="text-slate-400">Initialize your self-hosted system.</CardDescription>
        </CardHeader>
        <CardContent>
          {successMsg ? (
            <div className="p-6 space-y-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                <p className="font-bold">Installation Successful!</p>
                <p className="text-sm">{successMsg}</p>
                <p className="text-sm mt-4 p-3 bg-slate-800 rounded-md">
                    <span className="flex items-center gap-1 font-bold text-white"><AlertCircle className="w-4 h-4"/> NEXT STEPS (Manual Terminal Commands)</span>
                    <ol className="list-decimal list-inside mt-2 space-y-1 font-mono text-xs text-slate-300">
                        <li>Run Database Migration (In <code>backend/</code> directory):<br/><code className="bg-slate-700 p-0.5 rounded">npx prisma migrate dev --name init</code></li>
                        <li>Run Seed Script to load States/Countries:<br/><code className="bg-slate-700 p-0.5 rounded">npx prisma db seed</code></li>
                        <li>**Restart your Node.js backend server.**</li>
                    </ol>
                </p>
                <Link href="/login"><Button className="mt-4 bg-primary hover:bg-primary/90 w-full">Go to Login</Button></Link>
            </div>
          ) : (
            <>
              {error && (
                  <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm text-center">
                      {error}
                  </div>
              )}
              {getStepContent()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}