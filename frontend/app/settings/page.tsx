"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Save, Loader2, Building2, Wallet, Upload, Download, AlertTriangle, 
  Users, Trash2, Plus, Star, Pencil, Mail
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false); // <--- FIXED: Added missing state

  // --- Profile State ---
  const [profile, setProfile] = useState({
    company_name: '', address: '', state_code: '', gstin: '', phone: '', email: '', currency: 'INR',
    logo: '', signature: ''
  });

  // --- Templates State ---
  const [templates, setTemplates] = useState({
    invoice: { subject: '', body: '' },
    quotation: { subject: '', body: '' }
  });

  // --- SMTP State ---
  const [smtp, setSmtp] = useState({
    host: '', port: '', user: '', password: '', fromEmail: ''
  });
  const [isTestEmailSending, setIsTestEmailSending] = useState(false);

  // --- Bank Accounts State ---
  const [banks, setBanks] = useState<any[]>([]);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<number | null>(null);

  const [newBank, setNewBank] = useState({
    label: '', bank_name: '', account_holder: '', account_number: '', 
    currency: 'USD', ifsc_code: '', swift_code: '', iban: '', 
    routing_number: '', sort_code: '', branch_address: '', is_default: false
  });

  // --- Users State ---
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', password: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const loadAll = async () => {
        try {
            const [companyRes, smtpRes, banksRes, usersRes, templatesRes] = await Promise.all([
                api.get('/settings/company'),
                api.get('/mail/config'),
                api.get('/banks'),
                api.get('/users'),
                api.get('/mail/templates')
            ]);
            
            if (companyRes.data) setProfile(prev => ({ ...prev, ...companyRes.data }));
            setSmtp(smtpRes.data);
            setBanks(banksRes.data);
            setUsers(usersRes.data);
            setTemplates(templatesRes.data);
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    };
    loadAll();
  }, []);

  // --- HANDLERS: General ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/settings/company', profile);
      alert("Settings updated successfully!");
    } catch (error) {
      alert("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS: Branding Upload ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => ({ ...prev, [field]: res.data.filePath }));
    } catch (err) {
      alert("Upload failed");
    }
  };

  // --- HANDLERS: Templates ---
  const handleSaveTemplates = async () => {
    setLoading(true);
    try {
        await api.post('/mail/templates', templates);
        alert("Templates saved successfully!");
    } catch (e) {
        alert("Failed to save templates");
    } finally {
        setLoading(false);
    }
  };

  // --- HANDLERS: SMTP ---
  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSmtp({ ...smtp, [e.target.name]: e.target.value });
  };

  const handleSaveSmtp = async () => {
    setLoading(true);
    try {
        await api.post('/mail/config', smtp);
        alert("SMTP Configuration Saved");
    } catch (e) {
        alert("Failed to save SMTP settings");
    } finally {
        setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    const email = prompt("Enter an email address to receive the test:");
    if (!email) return;
    
    setIsTestEmailSending(true);
    try {
        await api.post('/mail/test', { email });
        alert("Test email sent successfully!");
    } catch (e: any) {
        alert("Failed to send email: " + (e.response?.data?.error || e.message));
    } finally {
        setIsTestEmailSending(false);
    }
  };

  // --- HANDLERS: Banking ---
  const handleBankInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setNewBank({ ...newBank, [e.target.name]: e.target.value });
  };

  const openAddBankDialog = () => {
    setEditingBankId(null);
    setNewBank({
        label: '', bank_name: '', account_holder: '', account_number: '', 
        currency: 'USD', ifsc_code: '', swift_code: '', iban: '', 
        routing_number: '', sort_code: '', branch_address: '', is_default: false
    });
    setIsBankDialogOpen(true);
  };

  const openEditBankDialog = (bank: any) => {
    setEditingBankId(bank.id);
    setNewBank({
        label: bank.label || '',
        bank_name: bank.bank_name || '',
        account_holder: bank.account_holder || '',
        account_number: bank.account_number || '',
        currency: bank.currency || 'USD',
        ifsc_code: bank.ifsc_code || '',
        swift_code: bank.swift_code || '',
        iban: bank.iban || '',
        routing_number: bank.routing_number || '',
        sort_code: bank.sort_code || '',
        branch_address: bank.branch_address || '',
        is_default: bank.is_default
    });
    setIsBankDialogOpen(true);
  };

  const handleSaveBank = async () => {
    if (!newBank.label || !newBank.bank_name || !newBank.account_number) {
        return alert("Label, Bank Name, and Account Number are required.");
    }
    setIsAddingBank(true);
    try {
        if (editingBankId) {
            await api.put(`/banks/${editingBankId}`, newBank);
            alert("Bank Account Updated");
        } else {
            await api.post('/banks', newBank);
            alert("Bank Account Added");
        }
        setIsBankDialogOpen(false);
        const res = await api.get('/banks');
        setBanks(res.data);
    } catch (e) {
        alert("Failed to save bank account");
    } finally {
        setIsAddingBank(false);
    }
  };

  const handleDeleteBank = async (id: number) => {
    if (!confirm("Delete this bank account?")) return;
    try { 
        await api.delete(`/banks/${id}`);
        const res = await api.get('/banks');
        setBanks(res.data);
    } catch (e) { alert("Failed to delete"); }
  };

  const handleSetDefaultBank = async (id: number) => {
    try { 
        await api.patch(`/banks/${id}/default`);
        const res = await api.get('/banks');
        setBanks(res.data);
    } catch (e) { alert("Failed to set default"); }
  };

  // --- HANDLERS: Users ---
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) return alert("Email and Password required");
    setIsAddingUser(true);
    try {
        await api.post('/users', newUser);
        alert("User added!");
        setNewUser({ email: '', password: '' }); 
        const res = await api.get('/users');
        setUsers(res.data); 
    } catch (e) { alert("Failed to create user"); } 
    finally { setIsAddingUser(false); }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try { 
        await api.delete(`/users/${id}`);
        const res = await api.get('/users');
        setUsers(res.data);
    } catch (e) { alert("Failed to delete user"); }
  };

  // --- HANDLERS: Backup ---
  const handleBackupDownload = async () => {
    try {
        const response = await api.get('/backup/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoicecore-backup-${new Date().toISOString().slice(0,10)}.iec`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (e) { console.error(e); }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("WARNING: This will merge/overwrite data. Continue?")) return;
    const formData = new FormData();
    formData.append('file', file);
    setIsBackupLoading(true);
    try {
        await api.post('/backup/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert("Restore Successful!");
        window.location.reload();
    } catch (err) { alert("Restore Failed."); } finally { setIsBackupLoading(false); }
  };

  // --- HANDLER: CSV Import ---
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!confirm(`Import clients from ${file.name}?`)) return;

    const formData = new FormData();
    formData.append('file', file);
    setIsImporting(true);

    try {
        const res = await api.post('/import/clients', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert(`Import Successful! Added ${res.data.imported} clients.`);
    } catch (e) {
        alert("Import Failed. Check CSV format.");
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500">Manage your company profile and configurations</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-white border">
          <TabsTrigger value="general" className="data-[state=active]:bg-slate-100">
             <Building2 className="w-4 h-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-slate-100">
             <Star className="w-4 h-4 mr-2" /> Branding
          </TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-slate-100">
             <Wallet className="w-4 h-4 mr-2" /> Bank Accounts
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-slate-100">
             <Mail className="w-4 h-4 mr-2" /> Email (SMTP)
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-slate-100">
             <Users className="w-4 h-4 mr-2" /> Team
          </TabsTrigger>
          <TabsTrigger value="backup" className="data-[state=active]:bg-slate-100 text-blue-600">
             <Upload className="w-4 h-4 mr-2" /> Backup & Import
          </TabsTrigger>
        </TabsList>

        {/* --- TAB 1: GENERAL --- */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>Details for your PDF invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Company Name</Label><Input name="company_name" value={profile.company_name} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>GSTIN</Label><Input name="gstin" value={profile.gstin} onChange={handleChange} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" value={profile.address} onChange={handleChange} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>State Code</Label><Input name="state_code" value={profile.state_code} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" value={profile.phone} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Email</Label><Input name="email" value={profile.email} onChange={handleChange} /></div>
              </div>
              <div className="pt-4"><Button onClick={handleSave} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : "Save Profile"}</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: BRANDING --- */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding & Customization</CardTitle>
              <CardDescription>Upload assets to professionalize your documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Logo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                    <h3 className="font-medium text-sm mb-1">Company Logo</h3>
                    <p className="text-xs text-slate-500 mb-3">Appears at the top-left of invoices. Recommended: 300x100px PNG.</p>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                </div>
                <div className="border border-dashed rounded-lg h-32 flex items-center justify-center bg-slate-50 relative overflow-hidden">
                    {profile.logo ? (
                        <img src={`http://localhost:5000${profile.logo}`} alt="Logo Preview" className="max-h-full object-contain" />
                    ) : (
                        <span className="text-xs text-slate-400">No Logo</span>
                    )}
                </div>
              </div>
              {/* Signature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-t pt-6">
                <div>
                    <h3 className="font-medium text-sm mb-1">Authorised Signatory / Stamp</h3>
                    <p className="text-xs text-slate-500 mb-3">Appears at the bottom-right. Recommended: 200x100px Transparent PNG.</p>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'signature')} />
                </div>
                <div className="border border-dashed rounded-lg h-32 flex items-center justify-center bg-slate-50 relative overflow-hidden">
                    {profile.signature ? (
                        <img src={`http://localhost:5000${profile.signature}`} alt="Sign Preview" className="max-h-full object-contain" />
                    ) : (
                        <span className="text-xs text-slate-400">No Signature</span>
                    )}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                 <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Branding"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 3: BANK ACCOUNTS --- */}
        <TabsContent value="bank">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Bank Accounts</CardTitle><CardDescription>Manage multiple accounts.</CardDescription></div>
              <Button onClick={openAddBankDialog}><Plus className="w-4 h-4 mr-2" /> Add Account</Button>
              <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader><DialogTitle>{editingBankId ? "Edit Bank" : "Add Bank"}</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Label</Label><Input name="label" value={newBank.label} onChange={handleBankInputChange} /></div>
                        <div className="space-y-2"><Label>Currency</Label><select name="currency" className="w-full h-9 border rounded-md px-3 text-sm bg-background" value={newBank.currency} onChange={handleBankInputChange}><option value="USD">USD</option><option value="INR">INR</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="CAD">CAD</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Bank Name</Label><Input name="bank_name" value={newBank.bank_name} onChange={handleBankInputChange} /></div>
                        <div className="space-y-2"><Label>Account Number</Label><Input name="account_number" value={newBank.account_number} onChange={handleBankInputChange} /></div>
                    </div>
                    <div className="space-y-2"><Label>Account Holder</Label><Input name="account_holder" value={newBank.account_holder} onChange={handleBankInputChange} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>IFSC</Label><Input name="ifsc_code" value={newBank.ifsc_code} onChange={handleBankInputChange} /></div>
                        <div className="space-y-2"><Label>SWIFT</Label><Input name="swift_code" value={newBank.swift_code} onChange={handleBankInputChange} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Routing</Label><Input name="routing_number" value={newBank.routing_number} onChange={handleBankInputChange} /></div>
                        <div className="space-y-2"><Label>Sort Code</Label><Input name="sort_code" value={newBank.sort_code} onChange={handleBankInputChange} /></div>
                    </div>
                    <div className="space-y-2"><Label>IBAN</Label><Input name="iban" value={newBank.iban} onChange={handleBankInputChange} /></div>
                    <div className="space-y-2"><Label>Branch Address</Label><Textarea name="branch_address" value={newBank.branch_address} onChange={handleBankInputChange} /></div>
                  </div>
                  <DialogFooter><Button onClick={handleSaveBank} disabled={isAddingBank}>{isAddingBank ? "Saving..." : "Save Account"}</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    {banks.map((bank) => (
                        <div key={bank.id} className={`p-4 rounded-lg border ${bank.is_default ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div><h3 className="font-bold flex items-center gap-2">{bank.label} <span className="text-xs font-normal bg-slate-200 px-2 py-0.5 rounded-full">{bank.currency}</span></h3><p className="text-sm text-slate-500">{bank.bank_name} - {bank.account_number}</p></div>
                                {bank.is_default && <Star className="w-4 h-4 text-blue-500 fill-blue-500" />}
                            </div>
                            <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                                <Button variant="ghost" size="sm" onClick={() => openEditBankDialog(bank)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
                                {!bank.is_default && <Button variant="ghost" size="sm" onClick={() => handleSetDefaultBank(bank.id)}>Set Default</Button>}
                                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteBank(bank.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 4: EMAIL CONFIG & TEMPLATES --- */}
        <TabsContent value="email">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader><CardTitle>SMTP Configuration</CardTitle><CardDescription>Configure your email provider.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>SMTP Host</Label><Input name="host" placeholder="smtp.gmail.com" value={smtp.host} onChange={handleSmtpChange} /></div>
                  <div className="space-y-2"><Label>SMTP Port</Label><Input name="port" placeholder="587" value={smtp.port} onChange={handleSmtpChange} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>User / Email</Label><Input name="user" value={smtp.user} onChange={handleSmtpChange} /></div>
                  <div className="space-y-2"><Label>Password</Label><Input type="password" name="password" placeholder="••••••••" value={smtp.password} onChange={handleSmtpChange} /></div>
                </div>
                <div className="space-y-2"><Label>Sender Email (From)</Label><Input name="fromEmail" value={smtp.fromEmail} onChange={handleSmtpChange} /></div>
                <div className="pt-4 border-t flex justify-between">
                   <Button variant="outline" onClick={handleSendTestEmail} disabled={isTestEmailSending}>{isTestEmailSending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Mail className="w-4 h-4 mr-2"/>} Send Test Email</Button>
                   <Button onClick={handleSaveSmtp} disabled={loading}>{loading ? "Saving..." : "Save Config"}</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Email Templates</CardTitle><CardDescription>Customize the subject and body of your emails.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 border p-4 rounded-md bg-slate-50/50">
                    <h3 className="font-semibold text-sm">Invoice Email</h3>
                    <div className="space-y-2"><Label>Subject</Label><Input value={templates.invoice.subject} onChange={(e) => setTemplates({...templates, invoice: {...templates.invoice, subject: e.target.value}})} /></div>
                    <div className="space-y-2"><Label>Body</Label><Textarea className="h-32 font-mono text-xs" value={templates.invoice.body} onChange={(e) => setTemplates({...templates, invoice: {...templates.invoice, body: e.target.value}})} /></div>
                </div>
                <div className="space-y-3 border p-4 rounded-md bg-slate-50/50">
                    <h3 className="font-semibold text-sm">Quotation Email</h3>
                    <div className="space-y-2"><Label>Subject</Label><Input value={templates.quotation.subject} onChange={(e) => setTemplates({...templates, quotation: {...templates.quotation, subject: e.target.value}})} /></div>
                    <div className="space-y-2"><Label>Body</Label><Textarea className="h-32 font-mono text-xs" value={templates.quotation.body} onChange={(e) => setTemplates({...templates, quotation: {...templates.quotation, body: e.target.value}})} /></div>
                </div>
                <div className="flex justify-end"><Button onClick={handleSaveTemplates} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} Save Templates</Button></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- TAB 5: TEAM --- */}
        <TabsContent value="team">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>System Admins</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>{users.map((u) => (<TableRow key={u.id}><TableCell className="font-medium">{u.email}</TableCell><TableCell><span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{u.role}</span></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell></TableRow>))}</TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Add New Admin</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} /></div>
                <Button onClick={handleCreateUser} disabled={isAddingUser} className="w-full">{isAddingUser ? <Loader2 className="w-4 h-4 animate-spin"/> : "Create Account"}</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- TAB 6: BACKUP & IMPORT --- */}
        <TabsContent value="backup">
          <Card>
            <CardHeader><CardTitle>Data Management</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* Export */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                <div><h3 className="font-medium text-slate-900">Export System Data</h3><p className="text-sm text-slate-500">Download encrypted .iec backup file.</p></div>
                <Button variant="outline" onClick={handleBackupDownload}><Download className="w-4 h-4 mr-2" /> Download Backup</Button>
              </div>
              
              {/* Import IEC */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-100">
                <div className="w-2/3"><h3 className="font-medium text-red-900 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Restore System</h3><p className="text-sm text-red-700 mt-1">Warning: This will overwrite current data.</p></div>
                <div className="w-1/3 flex justify-end">
                    {isBackupLoading ? <Button disabled variant="destructive"><Loader2 className="w-4 h-4 animate-spin" /></Button> : <div className="relative"><input type="file" accept=".iec" onChange={handleRestore} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /><Button variant="destructive"><Upload className="w-4 h-4 mr-2" /> Restore .IEC</Button></div>}
                </div>
              </div>

              {/* Import CSV */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium text-slate-900 mb-2">Legacy Migration (CSV)</h3>
                <div className="flex items-center justify-between p-4 border border-dashed rounded-lg bg-slate-50">
                    <div>
                        <h4 className="font-medium text-sm">Import Clients from CSV</h4>
                        <p className="text-xs text-slate-500 mt-1">
                            Required Headers: <span className="font-mono bg-slate-200 px-1 rounded">company_name</span>, <span className="font-mono bg-slate-200 px-1 rounded">email</span>, <span className="font-mono bg-slate-200 px-1 rounded">gst</span>, <span className="font-mono bg-slate-200 px-1 rounded">state_code</span>
                        </p>
                    </div>
                    <div className="relative">
                        {isImporting ? (
                            <Button disabled variant="outline"><Loader2 className="w-4 h-4 animate-spin mr-2"/> Importing...</Button>
                        ) : (
                            <>
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    onChange={handleCsvImport} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                                <Button variant="outline"><Upload className="w-4 h-4 mr-2" /> Select CSV</Button>
                            </>
                        )}
                    </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}