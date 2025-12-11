"use client";

import React, { useState, useEffect } from 'react';
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2, ArrowLeft, Globe, MapPin } from "lucide-react";
import { useRouter, useParams } from 'next/navigation'; 
import Link from "next/link";

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams(); 
  
  const [loading, setLoading] = useState(true); // Page loading
  const [saving, setSaving] = useState(false);  // Save button loading
  const [statesLoading, setStatesLoading] = useState(false);

  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    company_name: '',
    tax_id: '',
    cin: '', 
    state_code: '',
    country: '',
    email: '',
    phone: '',
    address_street: '',
    address_city: '',
    address_zip: ''
  });

  // 1. Fetch Countries & Client Data
  useEffect(() => {
    const init = async () => {
        try {
            // Fetch Countries first
            const countriesRes = await api.get('/utils/countries');
            setCountries(countriesRes.data);

            // Fetch Client
            const clientRes = await api.get(`/clients/${params.id}`);
            const c = clientRes.data;

            // Set Form Data
            setFormData({
                company_name: c.company_name,
                tax_id: c.tax_id || '',
                cin: c.cin || '',
                state_code: c.state_code ? String(c.state_code) : '',
                country: c.country,
                email: c.email || '',
                phone: c.phone || '',
                address_street: c.addresses?.billing?.street || '',
                address_city: c.addresses?.billing?.city || '',
                address_zip: c.addresses?.billing?.zip || ''
            });

            // Fetch States for the saved country immediately
            if (c.country) {
                fetchStates(c.country);
            }

        } catch (e) {
            console.error(e);
            alert("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    if (params.id) init();
  }, [params.id]);

  // Helper: Fetch States
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

  // 2. Handle Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "country") {
        // Country changed -> Reset state -> Fetch new states
        setFormData(prev => ({ ...prev, country: value, state_code: "" }));
        fetchStates(value);
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // 3. Submit
  const handleSubmit = async () => {
    if (!formData.company_name) return alert("Company Name is required.");
    if (states.length > 0 && !formData.state_code) return alert("Please select a State/Province.");

    setSaving(true);
    try {
      await api.put(`/clients/${params.id}`, {
          ...formData,
          state_code: formData.state_code ? Number(formData.state_code) : undefined
      });
      alert("Client updated successfully!");
      router.push('/clients');
    } catch (e) {
      alert("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
      return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/clients">
                <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-primary">Edit Client</h1>
                <p className="text-sm text-slate-500">Update customer information</p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-slate-800">
            {saving ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Save className="w-4 h-4 mr-2" />}
            Update Client
          </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>Legal entity information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input name="company_name" value={formData.company_name} onChange={handleChange} />
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
                            {/* Populate Countries */}
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
                            value={formData.state_code} 
                            onChange={handleChange}
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
                    <Label>Tax ID / GSTIN</Label>
                    <Input name="tax_id" value={formData.tax_id} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>CIN / Reg No</Label>
                    <Input name="cin" value={formData.cin} onChange={handleChange} />
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Address */}
        <Card>
          <CardHeader>
            <CardTitle>Contact & Billing</CardTitle>
            <CardDescription>Communication details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input name="email" value={formData.email} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" value={formData.phone} onChange={handleChange} /></div>
             </div>
             
             <div className="pt-4 border-t mt-4 space-y-3">
                 <Label className="flex items-center gap-2 text-primary"><MapPin className="w-3 h-3"/> Billing Address</Label>
                 <Input name="address_street" placeholder="Street" value={formData.address_street} onChange={handleChange} />
                 <div className="grid grid-cols-2 gap-4">
                   <Input name="address_city" placeholder="City" value={formData.address_city} onChange={handleChange} />
                   <Input name="address_zip" placeholder="Zip / Postal Code" value={formData.address_zip} onChange={handleChange} />
                 </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
