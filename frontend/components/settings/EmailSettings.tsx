"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/toast-context"; // <--- Hook
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";

export function EmailSettings() {
  const { toast } = useToast();
  const [smtp, setSmtp] = useState<any>({});
  const [templates, setTemplates] = useState<any>({ invoice: {}, quotation: {} });
  const [loading, setLoading] = useState(false);
  
  // Test Email State
  const [sending, setSending] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [isTestOpen, setIsTestOpen] = useState(false);

  useEffect(() => {
    api.get('/mail/config').then(res => setSmtp(res.data || {}));
    api.get('/mail/templates').then(res => setTemplates(res.data || { invoice: {}, quotation: {} }));
  }, []);

  const saveSmtp = async () => {
     setLoading(true);
     try { 
         await api.post('/mail/config', smtp); 
         toast("SMTP Configuration Saved", "success");
     } catch(e) { 
         toast("Failed to save SMTP config", "error");
     } finally { 
         setLoading(false); 
     }
  };

  const saveTemplates = async () => {
     setLoading(true);
     try { 
         await api.post('/mail/templates', templates); 
         toast("Email Templates Saved", "success");
     } catch(e) { 
         toast("Failed to save templates", "error");
     } finally { 
         setLoading(false); 
     }
  };

  const handleTestEmail = async () => {
    if(!testEmailAddr) return toast("Please enter an email address", "warning");
    
    setSending(true);
    try { 
        await api.post('/mail/test', { email: testEmailAddr }); 
        toast("Test email sent successfully!", "success");
        setIsTestOpen(false);
        setTestEmailAddr("");
    } catch(e) { 
        toast("Failed to send test email. Check SMTP settings.", "error");
    } finally { 
        setSending(false); 
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SMTP CONFIG */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-horizon border-none bg-card">
                <CardHeader><CardTitle>SMTP Config</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Host</Label><Input value={smtp.host || ''} onChange={e => setSmtp({...smtp, host: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Port</Label><Input value={smtp.port || ''} onChange={e => setSmtp({...smtp, port: e.target.value})} /></div>
                    <div className="space-y-2"><Label>User</Label><Input value={smtp.user || ''} onChange={e => setSmtp({...smtp, user: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Password</Label><Input type="password" value={smtp.password || ''} onChange={e => setSmtp({...smtp, password: e.target.value})} /></div>
                    <div className="space-y-2"><Label>From Email</Label><Input value={smtp.fromEmail || ''} onChange={e => setSmtp({...smtp, fromEmail: e.target.value})} /></div>
                    
                    <Button className="w-full mt-2" onClick={saveSmtp} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Save Config"}
                    </Button>
                    
                    {/* TEST EMAIL DIALOG */}
                    <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">Test Connection</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle>Send Test Email</DialogTitle>
                                <DialogDescription>Enter a recipient address to verify SMTP settings.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Label>Recipient Email</Label>
                                <Input 
                                    placeholder="you@example.com" 
                                    value={testEmailAddr} 
                                    onChange={e => setTestEmailAddr(e.target.value)} 
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleTestEmail} disabled={sending} className="w-full">
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
                                    Send Test
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </CardContent>
            </Card>
        </div>

        {/* TEMPLATES */}
        <div className="lg:col-span-2">
            <Card className="shadow-horizon border-none bg-card h-full">
                <CardHeader><CardTitle>Email Templates</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label>Invoice Template</Label>
                        <Input placeholder="Subject" value={templates.invoice?.subject || ''} onChange={e => setTemplates({...templates, invoice: {...templates.invoice, subject: e.target.value}})} />
                        <Textarea placeholder="Body..." className="h-32 font-mono text-xs" value={templates.invoice?.body || ''} onChange={e => setTemplates({...templates, invoice: {...templates.invoice, body: e.target.value}})} />
                    </div>
                    <div className="space-y-3 pt-4 border-t">
                        <Label>Quotation Template</Label>
                        <Input placeholder="Subject" value={templates.quotation?.subject || ''} onChange={e => setTemplates({...templates, quotation: {...templates.quotation, subject: e.target.value}})} />
                        <Textarea placeholder="Body..." className="h-32 font-mono text-xs" value={templates.quotation?.body || ''} onChange={e => setTemplates({...templates, quotation: {...templates.quotation, body: e.target.value}})} />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={saveTemplates} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Save Templates"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}