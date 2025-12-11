"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Loader2, ShieldAlert, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/toast-context";
import { useRole } from "@/hooks/use-role";

interface TeamSettingsProps {
  disabled?: boolean;
}

export function TeamSettings({ disabled }: TeamSettingsProps) {
  const { toast } = useToast();
  const { isSudo } = useRole();
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'USER' });
  const [loading, setLoading] = useState(false);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (e) {
      // Silent fail or toast if critical
      console.error("Failed to load users");
    }
  };

  const createUser = async () => {
    if (disabled) return;
    if (!newUser.email || !newUser.password) {
        return toast("Email and Password are required", "warning");
    }
    
    setLoading(true);
    try { 
        await api.post('/users', newUser); 
        setNewUser({ email: '', password: '', role: 'USER' }); 
        loadUsers(); 
        toast("User created successfully!", "success");
    } 
    catch(e: any) { 
        toast(e.response?.data?.error || "Failed to create user", "error"); 
    } 
    finally { 
        setLoading(false); 
    }
  };

  const deleteUser = async (id: number) => {
    if (disabled) return;
    
    // Native confirm is acceptable for destructive actions
    if (!confirm("Are you sure you want to delete this user?")) return;

    try { 
        await api.delete(`/users/${id}`); 
        loadUsers();
        toast("User deleted successfully", "success");
    } catch(e: any) { 
        toast(e.response?.data?.error || "Delete failed", "error"); 
    }
  };

  // Double-check permissions: Must be Sudo AND not disabled by parent
  const canEdit = isSudo && !disabled; 

  return (
    <Card className="shadow-horizon border-none bg-card">
        <CardHeader>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Manage access and roles for your organization.</CardDescription>
        </CardHeader>
        <CardContent>
            
            {/* ADD USER FORM - VISIBLE ONLY IF EDITABLE */}
            {canEdit ? (
                <div className="flex flex-col md:flex-row gap-4 mb-8 items-end border-b border-border pb-8">
                    <div className="space-y-2 flex-1 w-full">
                        <Label>New User Email</Label>
                        <Input 
                            placeholder="staff@company.com" 
                            value={newUser.email} 
                            onChange={e => setNewUser({...newUser, email: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2 flex-1 w-full">
                        <Label>Password</Label>
                        <Input 
                            type="password" 
                            placeholder="••••••" 
                            value={newUser.password} 
                            onChange={e => setNewUser({...newUser, password: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2 w-full md:w-[150px]">
                        <Label>Role</Label>
                        <Select value={newUser.role} onValueChange={val => setNewUser({...newUser, role: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USER">User (Staff)</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={createUser} disabled={loading} className="bg-primary text-primary-foreground">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <><UserPlus className="w-4 h-4 mr-2"/> Add</>}
                    </Button>
                </div>
            ) : (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span>Only the Owner (Sudo Admin) can add or remove team members.</span>
                </div>
            )}

            {/* USER LIST */}
            <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Security</TableHead>
                            <TableHead className="text-right">Joined</TableHead>
                            {canEdit && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(u => (
                            <TableRow key={u.id}>
                                <TableCell className="font-medium text-foreground">{u.email}</TableCell>
                                <TableCell>
                                    <Badge variant={u.role === 'SUDO_ADMIN' ? 'default' : (u.role === 'ADMIN' ? 'secondary' : 'outline')}>
                                        {u.role.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {u.two_factor_enabled 
                                        ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">2FA Active</Badge> 
                                        : <span className="text-muted-foreground text-xs">Unsecured</span>
                                    }
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                    {new Date(u.created_at).toLocaleDateString()}
                                </TableCell>
                                {canEdit && (
                                    <TableCell className="text-right">
                                        {/* Prevent deleting self or Sudo Admin */}
                                        {u.role !== 'SUDO_ADMIN' && (
                                            <Button variant="ghost" size="icon" onClick={() => deleteUser(u.id)} className="hover:bg-red-50 hover:text-red-600 rounded-full">
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  );
}