"use client";

import React, { useState, useEffect } from 'react';
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2, ArrowLeft, Globe, MapPin } from "lucide-react";
import { useRouter } from 'next/navigation';
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    company_name: '',
    tax_id: '',
    cin: '',
    state_code: '', 
    country: 'India', // Default
    email: '',
    phone: '',
    address_street: '',
    address_city: '',
    address_zip: ''
  });

  // 1. Load Countries on Mount
  useEffect(() => {
    api.get('/utils/countries').then(res => setCountries(res.data)).catch(console.error);
    // Initial state fetch for default country (India)
    fetchStates('India');
  }, []);

  // Helper: Fetch States for a specific country
  const fetchStates = async (countryName: string) => {
    setStatesLoading(true);
    try {
      const res = await api.get(`/utils/states?country=${encodeURIComponent(countryName)}`);
      setStates(res.data);
    } catch (e) {
      console.error("Failed to load states");
    } finally {
      setStatesLoading(false);
    }
  };

  // 2. Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "country") {
      // Update Country -> Reset State -> Fetch New States
      setFormData(prev => ({ ...prev, country: value, state_code: "" }));
      fetchStates(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.company_name) return alert("Company Name is required.");
    // State is required only if the list is not empty (some small countries might not have states in DB)
    if (states.length > 0 && !formData.state_code) return alert("Please select a State/Province.");

    setLoading(true);
    try {
      await api.post('/clients', {
        ...formData,
        // If no state selected (and none available), send null to avoid DB error
        state_code: formData.state_code ? Number(formData.state_code) : undefined
      });
      alert("Client created successfully!");
      router.push('/clients');
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to create client.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/clients">
             <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
             <h1 className="text-2xl font-bold text-slate-900">Add New Client</h1>
             <p className="text-sm text-slate-500">Create a customer profile</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={loading} className="bg-slate-900 hover:bg-slate-800">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>Legal information for tax & invoicing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input name="company_name" value={formData.company_name} onChange={handleChange} placeholder="e.g. Acme Corp" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                        name="country"
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-slate-900"
                        value={formData.country}
                        onChange={handleChange}
                    >
                        <option value="India">India</option>
                        {countries.filter(c => c.name !== 'India').map(c => (
                            <option key={c.iso_code} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>State / Province {states.length > 0 && "*"}</Label>
                <div className="relative">
                    {statesLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
                    <select 
                        name="state_code" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                        onChange={handleChange}
                        value={formData.state_code}
                        disabled={statesLoading || states.length === 0}
                    >
                        <option value="">{states.length === 0 ? "No states available" : "Select State..."}</option>
                        {states.map((state) => (
                            <option key={state.code} value={state.code}>
                                {state.name}
                            </option>
                        ))}
                    </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Tax ID (GSTIN/VAT)</Label>
                    <Input name="tax_id" value={formData.tax_id} onChange={handleChange} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                    <Label>CIN / Reg No</Label>
                    <Input name="cin" value={formData.cin} onChange={handleChange} placeholder="Optional" />
                </div>
            </div>

          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
            <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" onChange={handleChange} /></div>
                    <div className="space-y-2"><Label>Phone</Label><Input name="phone" type="tel" onChange={handleChange} /></div>
                </div>
                <div className="pt-4 border-t mt-4 space-y-3">
                     <Label className="flex items-center gap-2 text-slate-500"><MapPin className="w-3 h-3"/> Billing Address</Label>
                     <Input name="address_street" placeholder="Street Address" onChange={handleChange} />
                     <div className="grid grid-cols-2 gap-4">
                        <Input name="address_city" placeholder="City" onChange={handleChange} />
                        <Input name="address_zip" placeholder="Postal Code" onChange={handleChange} />
                     </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
