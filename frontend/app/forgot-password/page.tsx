"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import Link from "next/link";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.post('/auth/forgot-password', { email });
      setMessage("If that email exists, a reset link has been sent.");
    } catch (err: any) {
      // Security: You might not want to show detailed errors here, but for self-hosted it helps debugging.
      setError(err.response?.data?.error || "Failed to send request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md bg-slate-950 border-slate-800 text-slate-200">
        <CardHeader>
          <CardTitle className="text-white">Recover Password</CardTitle>
          <CardDescription className="text-slate-400">Enter your email to receive a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          {!message ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Email Address</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="email" 
                        placeholder="admin@example.com" 
                        className="pl-9 bg-slate-900 border-slate-800 text-white"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required
                    />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={loading}>
                {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center text-green-400">
                <p>{message}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white flex items-center transition-colors">
                <ArrowLeft className="w-3 h-3 mr-1" /> Back to Login
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}