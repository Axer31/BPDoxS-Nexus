"use client";

import React, { useState, useEffect } from 'react';
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

  // FORCE MIDNIGHT BLACK THEME ON MOUNT
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.setAttribute('data-style', 'midnight');
    
    // Optional: Cleanup if you want to revert when leaving (commented out to persist)
    // return () => root.removeAttribute('data-style');
  }, []);

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
          localStorage.setItem('user', JSON.stringify(res.data.user));
          router.push('/');
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    // changed bg-slate-900 to bg-background (Pure Black in Midnight)
    <div className="min-h-screen flex items-center justify-center bg-background p-4 transition-colors duration-500">
      
      {/* Card Changes:
        - bg-slate-950 -> bg-card (Dark Gray/Black)
        - border-slate-800 -> border-border
        - text-slate-200 -> text-foreground
      */}
      <Card className="w-full max-w-sm shadow-2xl border-border bg-card text-foreground">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
             {/* Primary color remains standardized */}
             <div className="bg-primary/10 p-4 rounded-full ring-1 ring-primary/50">
                <Lock className="w-8 h-8 text-primary" />
             </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
              {show2fa ? "Two-Factor Authentication" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
              {show2fa ? "Enter the code from your authenticator app." : "Sign in to access your dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Step 1: Email & Password */}
            <div className={show2fa ? "hidden" : "space-y-4"}>
                <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <Input 
                    type="email" 
                    placeholder="admin@invoicecore.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    // Changed inputs to use secondary/input colors
                    className="bg-secondary/20 border-input text-foreground focus-visible:ring-primary placeholder:text-muted-foreground/50"
                />
                </div>
                <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors">
                    Forgot password?
                    </Link>
                </div>
                <Input 
                    type="password" 
                    placeholder="••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="bg-secondary/20 border-input text-foreground focus-visible:ring-primary placeholder:text-muted-foreground/50"
                />
                </div>
            </div>

            {/* Step 2: TOTP Input */}
            {show2fa && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <Label className="text-muted-foreground">Authenticator Code</Label>
                    <Input 
                        type="text" 
                        placeholder="000 000" 
                        value={totpToken} 
                        onChange={(e) => setTotpToken(e.target.value)} 
                        className="bg-secondary/20 border-input text-foreground text-center text-lg tracking-[0.5em] font-mono focus-visible:ring-primary"
                        maxLength={6}
                        autoFocus
                    />
                </div>
            )}
            
            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs text-center font-medium">
                    {error}
                </div>
            )}
            
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={loading}>
                {loading ? "Processing..." : (show2fa ? "Verify & Login" : "Sign In")}
                {!loading && !show2fa && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        </CardContent>
        
        {show2fa && (
            <CardFooter>
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={() => setShow2fa(false)}>
                    Back to Login
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}