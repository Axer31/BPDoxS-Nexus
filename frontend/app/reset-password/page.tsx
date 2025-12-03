"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { Loader2, CheckCircle } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPass) return setError("Passwords do not match");
    if (!token) return setError("Invalid or missing token");

    setLoading(true);
    setError("");

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reset password. Token may be expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
      return (
        <Card className="w-full max-w-md text-center p-8 bg-slate-950 border-slate-800 text-slate-200">
            <div className="flex justify-center mb-4"><CheckCircle className="w-16 h-16 text-green-500" /></div>
            <h2 className="text-xl font-bold text-white mb-2">Password Updated!</h2>
            <p className="text-slate-400">Redirecting you to the login page...</p>
        </Card>
      )
  }

  return (
    <Card className="w-full max-w-md bg-slate-950 border-slate-800 text-slate-200">
      <CardHeader>
        <CardTitle className="text-white">Set New Password</CardTitle>
        <CardDescription className="text-slate-400">Create a strong password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">New Password</Label>
            <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="bg-slate-900 border-slate-800 text-white"
                required 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Confirm Password</Label>
            <Input 
                type="password" 
                value={confirmPass} 
                onChange={e => setConfirmPass(e.target.value)} 
                className="bg-slate-900 border-slate-800 text-white"
                required 
            />
          </div>
          
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={loading}>
            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Reset Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    )
}