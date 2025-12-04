"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Wallet, Upload, Mail, Users, FileText, Shield, Code } from "lucide-react";
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { DocumentSettings } from '@/components/settings/DocumentSettings';
import { BankSettings } from '@/components/settings/BankSettings';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { TeamSettings } from '@/components/settings/TeamSettings';
import { BackupSettings } from '@/components/settings/BackupSettings';
import { TemplateSettings } from '@/components/settings/TemplateSettings';
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/components/ui/toast-context";

// Defines the main Settings Page component
export default function SettingsPage() {
  const { isSudo } = useRole(); // True only if SUDO_ADMIN (Owner)
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // Load Core Profile
  useEffect(() => {
    api.get('/settings/company').then(res => {
        if (res.data) setProfile(res.data);
    });
  }, []);

  // Handle Inputs (Blocked for non-Sudo)
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!isSudo) return; 
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Handle Save (Blocked for non-Sudo)
  const handleSaveProfile = async () => {
    // Show a toast error for non-Sudo attempts
    if (!isSudo) return toast("Access Denied: Only the Owner can edit settings.", "error");
    
    setLoading(true);
    try { 
      await api.put('/settings/company', profile); 
      toast("Profile updated successfully!", "success");
    } catch (e) { 
      toast("Failed to update profile.", "error");
    } finally { 
      setLoading(false); 
    }
  };

  // Handle Uploads (Blocked for non-Sudo)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    // Show a toast error for non-Sudo attempts
    if (!isSudo) return toast("Access Denied: Only the Owner can upload files.", "error");
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData(); 
    formData.append('file', file);
    
    try {
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile((prev: any) => ({ ...prev, [field]: res.data.filePath }));
      toast("File uploaded successfully", "success");
    } catch (err) { 
      toast("Upload failed", "error");
    }
  };

  // Read-Only Flag (True for Admins/Users, False for Owner)
  const isReadOnly = !isSudo;

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage company profile and system configurations.</p>
        {isReadOnly && (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 w-fit mt-2">
            View Only Mode
          </div>
        )}
      </div>

      <Tabs defaultValue="general" className="w-full space-y-6">
        
        <div className="bg-card p-1 rounded-xl border border-border inline-flex shadow-sm overflow-x-auto max-w-full">
          <TabsList className="bg-transparent h-auto p-0 gap-1 flex">
            <TabItem value="general" icon={<Building2 className="w-4 h-4"/>} label="Profile" />
            <TabItem value="branding" icon={<Upload className="w-4 h-4"/>} label="Branding" />
            <TabItem value="templates" icon={<Code className="w-4 h-4"/>} label="Templates" />
            <TabItem value="documents" icon={<FileText className="w-4 h-4"/>} label="Documents" />
            <TabItem value="bank" icon={<Wallet className="w-4 h-4"/>} label="Banking" />
            <TabItem value="email" icon={<Mail className="w-4 h-4"/>} label="Email" />
            <TabItem value="team" icon={<Users className="w-4 h-4"/>} label="Team" />
            {/* Backup/Data tab is strictly hidden for non-Owners */}
            {isSudo && <TabItem value="backup" icon={<Shield className="w-4 h-4"/>} label="Data" />}
          </TabsList>
        </div>

        {/* CONTENT TABS (Passing disabled={isReadOnly} to all) */}
        
        <TabsContent value="general">
           <GeneralSettings profile={profile} handleChange={handleProfileChange} handleSave={handleSaveProfile} loading={loading} disabled={isReadOnly} />
        </TabsContent>
        
        <TabsContent value="branding">
           {/* BrandingSettings will contain the SoftwareNameSetting component */}
           <BrandingSettings profile={profile} handleFileUpload={handleFileUpload} handleSave={handleSaveProfile} loading={loading} disabled={isReadOnly} />
        </TabsContent>
        
        <TabsContent value="templates" className="mt-0 h-full">
          <TemplateSettings disabled={isReadOnly} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentSettings disabled={isReadOnly} />
        </TabsContent>

        <TabsContent value="bank">
          <BankSettings disabled={isReadOnly} />
        </TabsContent>

        <TabsContent value="email">
          <EmailSettings disabled={isReadOnly} />
        </TabsContent>

        <TabsContent value="team">
          <TeamSettings disabled={isReadOnly} />
        </TabsContent>

        {isSudo && (
          <TabsContent value="backup">
            <BackupSettings />
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}

// Helper component for Tab triggers
function TabItem({ value, icon, label }: { value: string, icon: React.ReactNode, label: string }) {
    return (
        <TabsTrigger 
            value={value} 
            className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
        >
            {icon} <span>{label}</span>
        </TabsTrigger>
    )
}