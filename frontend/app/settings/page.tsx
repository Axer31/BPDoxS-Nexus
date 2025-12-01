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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Save, Loader2, Building2, Wallet, Upload, Download, AlertTriangle, 
  Globe, Users, Trash2, Plus, Star, Banknote, Pencil 
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  
  // --- Profile State ---
  const [profile, setProfile] = useState({
    company_name: '', address: '', state_code: '', gstin: '', phone: '', email: '', currency: 'INR',
  });

  // --- Bank Accounts State ---
  const [banks, setBanks] = useState<any[]>([]);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<number | null>(null); // Track edit mode

  const [newBank, setNewBank] = useState({
    label: '',
    bank_name: '',
    account_holder: '',
    account_number: '',
    currency: 'USD',
    ifsc_code: '',
    swift_code: '',
    iban: '',
    routing_number: '',
    sort_code: '', // Added Sort Code
    branch_address: '',
    is_default: false
  });

  // --- Users State ---
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', password: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
    loadSettings();
    loadBanks();
    loadUsers();
  }, []);

  const loadSettings = async () => {
    try {
        const res = await api.get('/settings/company');
        if (res.data) setProfile(prev => ({ ...prev, ...res.data }));
    } catch (err) { console.error(err); }
  };

  const loadBanks = async () => {
    try {
        const res = await api.get('/banks');
        setBanks(res.data);
    } catch (err) { console.error(err); }
  };

  const loadUsers = async () => {
    try {
        const res = await api.get('/users');
        setUsers(res.data);
    } catch (err) { console.error(err); }
  };

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
            // Update Existing
            await api.put(`/banks/${editingBankId}`, newBank);
            alert("Bank Account Updated");
        } else {
            // Create New
            await api.post('/banks', newBank);
            alert("Bank Account Added");
        }
        setIsBankDialogOpen(false);
        loadBanks();
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
        loadBanks();
    } catch (e) { alert("Failed to delete"); }
  };

  const handleSetDefaultBank = async (id: number) => {
    try {
        await api.patch(`/banks/${id}/default`);
        loadBanks();
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
        loadUsers(); 
    } catch (e) {
        alert("Failed to create user");
    } finally {
        setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try { await api.delete(`/users/${id}`); loadUsers(); } 
    catch (e) { alert("Failed to delete user"); }
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

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500">Manage your company profile and configurations</p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="bg-slate-900 hover:bg-slate-800">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-white border">
          <TabsTrigger value="general" className="data-[state=active]:bg-slate-100">
             <Building2 className="w-4 h-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-slate-100">
             <Wallet className="w-4 h-4 mr-2" /> Bank Accounts
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-slate-100">
             <Users className="w-4 h-4 mr-2" /> Team
          </TabsTrigger>
          <TabsTrigger value="backup" className="data-[state=active]:bg-slate-100 text-blue-600">
             <Upload className="w-4 h-4 mr-2" /> Backup & Restore
          </TabsTrigger>
        </TabsList>

        {/* --- TAB 1: GENERAL INFO --- */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>These details will appear on your PDF invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input name="company_name" value={profile.company_name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input name="gstin" value={profile.gstin} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address (Full)</Label>
                <Input name="address" value={profile.address} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>State Code</Label>
                  <Input name="state_code" type="number" placeholder="19" value={profile.state_code} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input name="phone" value={profile.phone} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" value={profile.email} onChange={handleChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: BANK ACCOUNTS (Updated) --- */}
        <TabsContent value="bank">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bank Accounts</CardTitle>
                <CardDescription>Manage multiple accounts for different currencies.</CardDescription>
              </div>
              
              <Button onClick={openAddBankDialog}>
                <Plus className="w-4 h-4 mr-2" /> Add Account
              </Button>

              <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>{editingBankId ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Label (Internal Name)</Label>
                            <Input name="label" placeholder="e.g. Primary USD" value={newBank.label} onChange={handleBankInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <select name="currency" className="w-full h-9 border rounded-md px-3 text-sm bg-background" value={newBank.currency} onChange={handleBankInputChange}>
                                <option value="INR">INR</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="CAD">CAD</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input name="bank_name" value={newBank.bank_name} onChange={handleBankInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input name="account_number" value={newBank.account_number} onChange={handleBankInputChange} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input name="account_holder" value={newBank.account_holder} onChange={handleBankInputChange} />
                    </div>
                    
                    {/* International Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>IFSC (India)</Label>
                            <Input name="ifsc_code" placeholder="Optional" value={newBank.ifsc_code} onChange={handleBankInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>SWIFT / BIC</Label>
                            <Input name="swift_code" placeholder="Optional" value={newBank.swift_code} onChange={handleBankInputChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Routing / ACH</Label>
                            <Input name="routing_number" placeholder="Optional" value={newBank.routing_number} onChange={handleBankInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Sort Code (UK)</Label>
                            <Input name="sort_code" placeholder="Optional" value={newBank.sort_code} onChange={handleBankInputChange} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>IBAN (Europe)</Label>
                        <Input name="iban" placeholder="Optional" value={newBank.iban} onChange={handleBankInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label>Branch Address</Label>
                        <Textarea name="branch_address" placeholder="Bank address details..." value={newBank.branch_address} onChange={handleBankInputChange} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveBank} disabled={isAddingBank}>
                        {isAddingBank ? "Saving..." : "Save Account"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    {banks.map((bank) => (
                        <div key={bank.id} className={`p-4 rounded-lg border ${bank.is_default ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold flex items-center gap-2">
                                        {bank.label} 
                                        <span className="text-xs font-normal bg-slate-200 px-2 py-0.5 rounded-full">{bank.currency}</span>
                                    </h3>
                                    <p className="text-sm text-slate-500">{bank.bank_name} - {bank.account_number}</p>
                                </div>
                                {bank.is_default && <Star className="w-4 h-4 text-blue-500 fill-blue-500" />}
                            </div>
                            
                            {/* Details Display */}
                            <div className="text-xs text-slate-400 space-y-1 mt-3">
                                {bank.ifsc_code && <p>IFSC: {bank.ifsc_code}</p>}
                                {bank.swift_code && <p>SWIFT: {bank.swift_code}</p>}
                                {bank.routing_number && <p>Routing: {bank.routing_number}</p>}
                                {bank.sort_code && <p>Sort: {bank.sort_code}</p>}
                                {bank.iban && <p>IBAN: {bank.iban}</p>}
                            </div>

                            <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                                <Button variant="ghost" size="sm" onClick={() => openEditBankDialog(bank)}>
                                    <Pencil className="w-4 h-4 mr-1" /> Edit
                                </Button>
                                {!bank.is_default && (
                                    <Button variant="ghost" size="sm" onClick={() => handleSetDefaultBank(bank.id)}>
                                        Set Default
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteBank(bank.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 3: TEAM --- */}
        <TabsContent value="team">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Admins</CardTitle>
                <CardDescription>Manage who has access to InvoiceCore.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell><span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{u.role}</span></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add New Admin</CardTitle>
                <CardDescription>Create a new login credential.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" placeholder="user@company.com" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" placeholder="••••••••" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} />
                </div>
                <Button onClick={handleCreateUser} disabled={isAddingUser} className="w-full">
                  {isAddingUser ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- TAB 4: BACKUP --- */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Export/Import your system data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                <div>
                  <h3 className="font-medium text-slate-900">Export Data</h3>
                  <p className="text-sm text-slate-500">Download .iec backup file.</p>
                </div>
                <Button variant="outline" onClick={handleBackupDownload}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-100">
                <div className="w-2/3">
                  <h3 className="font-medium text-red-900 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" /> Import Data
                  </h3>
                  <p className="text-sm text-red-700 mt-1">Warning: This will overwrite data.</p>
                </div>
                <div className="w-1/3 flex justify-end">
                    {isBackupLoading ? (
                        <Button disabled variant="destructive"><Loader2 className="w-4 h-4 animate-spin" /></Button>
                    ) : (
                        <div className="relative">
                            <input type="file" accept=".iec" onChange={handleRestore} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <Button variant="destructive"><Upload className="w-4 h-4 mr-2" /> Restore</Button>
                        </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}