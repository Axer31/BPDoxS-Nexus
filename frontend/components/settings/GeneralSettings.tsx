"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";

interface GeneralSettingsProps {
  profile: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSave: () => void;
  loading: boolean;
}

export function GeneralSettings({ profile, handleChange, handleSave, loading }: GeneralSettingsProps) {
  const [states, setStates] = useState<any[]>([]);

  // Fetch States for Dropdown
  useEffect(() => {
    api.get('/utils/states')
       .then(res => setStates(res.data))
       .catch(err => console.error("Failed to load states", err));
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <Card className="shadow-horizon border-none bg-card">
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>Legal information used on invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Two Column Grid for Top Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  name="company_name" 
                  value={profile.company_name || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label>GSTIN / Tax ID</Label>
                <Input 
                  name="gstin" 
                  value={profile.gstin || ''} 
                  onChange={handleChange} 
                />
              </div>
              {/* NEW: CIN Input */}
              <div className="space-y-2">
                <Label>CIN Number</Label>
                <Input 
                  name="cin" 
                  value={profile.cin || ''} 
                  onChange={handleChange} 
                  placeholder="U12345MH2024PTC123456"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Office Address</Label>
              <Textarea 
                name="address" 
                value={profile.address || ''} 
                onChange={handleChange} 
                className="min-h-[100px]" 
              />
            </div>

            {/* Three Column Grid for Contact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>State (Place of Supply)</Label>
                {/* FIXED: Dropdown for States */}
                <select
                  name="state_code"
                  value={profile.state_code || ''}
                  onChange={handleChange}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <option value="">Select State...</option>
                  {states.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  name="phone" 
                  value={profile.phone || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  name="email" 
                  value={profile.email || ''} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSave} disabled={loading} className="bg-primary text-white min-w-[140px]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Sidebar Help Panel */}
      <div className="xl:col-span-1">
        <Card className="shadow-horizon border-none bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Tax Setup</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p><strong>State Code:</strong> Crucial for GST calculation.</p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>Intra-State (Same Code) = CGST + SGST</li>
              <li>Inter-State (Diff Code) = IGST</li>
            </ul>
            <div className="mt-4 p-3 bg-white dark:bg-card rounded-lg border border-border">
               <span className="text-xs font-semibold block mb-1">Common Codes:</span>
               <div className="grid grid-cols-2 gap-2 text-xs">
                  <span>19 - West Bengal</span>
                  <span>27 - Maharashtra</span>
                  <span>29 - Karnataka</span>
                  <span>07 - Delhi</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}