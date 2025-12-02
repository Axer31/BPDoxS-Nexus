"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Wallet, Upload, Mail, Users, FileText, Shield } from "lucide-react";
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { DocumentSettings } from '@/components/settings/DocumentSettings';
import { BankSettings } from '@/components/settings/BankSettings';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { TeamSettings } from '@/components/settings/TeamSettings';
import { BackupSettings } from '@/components/settings/BackupSettings';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // Load Core Profile
  useEffect(() => {
    api.get('/settings/company').then(res => {
        if (res.data) setProfile(res.data);
    });
  }, []);

  // Core Handlers
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try { await api.put('/settings/company', profile); alert("Profile updated!"); } 
    catch (e) { alert("Failed."); } finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile((prev: any) => ({ ...prev, [field]: res.data.filePath }));
    } catch (err) { alert("Upload failed"); }
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage company profile and system configurations.</p>
      </div>

      <Tabs defaultValue="general" className="w-full space-y-6">
        
        <div className="bg-card p-1 rounded-xl border border-border inline-flex shadow-sm overflow-x-auto max-w-full">
          <TabsList className="bg-transparent h-auto p-0 gap-1 flex">
            <TabItem value="general" icon={<Building2 className="w-4 h-4"/>} label="Profile" />
            <TabItem value="branding" icon={<Upload className="w-4 h-4"/>} label="Branding" />
            <TabItem value="documents" icon={<FileText className="w-4 h-4"/>} label="Documents" />
            <TabItem value="bank" icon={<Wallet className="w-4 h-4"/>} label="Banking" />
            <TabItem value="email" icon={<Mail className="w-4 h-4"/>} label="Email" />
            <TabItem value="team" icon={<Users className="w-4 h-4"/>} label="Team" />
            <TabItem value="backup" icon={<Shield className="w-4 h-4"/>} label="Data" />
          </TabsList>
        </div>

        <TabsContent value="general">
           <GeneralSettings profile={profile} handleChange={handleProfileChange} handleSave={handleSaveProfile} loading={loading} />
        </TabsContent>

        <TabsContent value="branding">
           <BrandingSettings profile={profile} handleFileUpload={handleFileUpload} handleSave={handleSaveProfile} loading={loading} />
        </TabsContent>

        <TabsContent value="documents"><DocumentSettings /></TabsContent>
        <TabsContent value="bank"><BankSettings /></TabsContent>
        <TabsContent value="email"><EmailSettings /></TabsContent>
        <TabsContent value="team"><TeamSettings /></TabsContent>
        <TabsContent value="backup"><BackupSettings /></TabsContent>

      </Tabs>
    </div>
  );
}

function TabItem({ value, icon, label }: any) {
    return (
        <TabsTrigger 
            value={value} 
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md px-4 py-2 rounded-lg transition-all flex items-center gap-2"
        >
            {icon} <span>{label}</span>
        </TabsTrigger>
    )
}