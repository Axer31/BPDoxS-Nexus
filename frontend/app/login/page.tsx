"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  
  // State to track if 2FA is required
  const [show2fa, setShow2fa] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Payload changes based on whether we are in step 1 or step 2
      const payload = show2fa 
        ? { email, password, totpToken } 
        : { email, password };

      const res = await api.post('/auth/login', payload);
      
      // Case A: 2FA Required
      if (res.data.require2fa) {
          setShow2fa(true);
          setLoading(false);
          return;
      }

      // Case B: Success (JWT Received)
      if (res.data.token) {
          localStorage.setItem('token', res.data.token);
          // Optional: Store user info if needed
          localStorage.setItem('user', JSON.stringify(res.data.user));
          router.push('/');
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Invalid credentials");
      // If 2FA fails, we might want to keep them on the 2FA screen or reset. 
      // Here we keep them there to retry the code.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-sm shadow-2xl border-slate-800 bg-slate-950 text-slate-200">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
             <div className="bg-primary/10 p-4 rounded-full ring-1 ring-primary/50">
                <Lock className="w-8 h-8 text-primary" />
             </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
              {show2fa ? "Two-Factor Authentication" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-slate-400">
              {show2fa ? "Enter the code from your authenticator app." : "Sign in to access your dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Step 1: Email & Password (Hidden visually in Step 2, but kept in DOM for submission) */}
            <div className={show2fa ? "hidden" : "space-y-4"}>
                <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input 
                    type="email" 
                    placeholder="admin@invoicecore.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="bg-slate-900 border-slate-800 text-white focus-visible:ring-primary"
                />
                </div>
                <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors">
                    Forgot password?
                    </Link>
                </div>
                <Input 
                    type="password" 
                    placeholder="••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="bg-slate-900 border-slate-800 text-white focus-visible:ring-primary"
                />
                </div>
            </div>

            {/* Step 2: TOTP Input */}
            {show2fa && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <Label className="text-slate-300">Authenticator Code</Label>
                    <Input 
                        type="text" 
                        placeholder="000 000" 
                        value={totpToken} 
                        onChange={(e) => setTotpToken(e.target.value)} 
                        className="bg-slate-900 border-slate-800 text-white text-center text-lg tracking-[0.5em] font-mono focus-visible:ring-primary"
                        maxLength={6}
                        autoFocus
                    />
                </div>
            )}
            
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs text-center">
                    {error}
                </div>
            )}
            
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold" disabled={loading}>
                {loading ? "Processing..." : (show2fa ? "Verify & Login" : "Sign In")}
                {!loading && !show2fa && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        </CardContent>
        
        {show2fa && (
            <CardFooter>
                <Button variant="ghost" className="w-full text-slate-400 hover:text-white" onClick={() => setShow2fa(false)}>
                    Back to Login
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}