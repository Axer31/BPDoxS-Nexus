"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Loader2, MoreHorizontal, Mail, Phone, MapPin, Filter } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useRouter } from 'next/navigation';

// --- Static Map for Indian States (GST Codes) ---
const STATE_MAP: Record<number, string> = {
  1: "Jammu & Kashmir", 2: "Himachal Pradesh", 3: "Punjab", 4: "Chandigarh",
  5: "Uttarakhand", 6: "Haryana", 7: "Delhi", 8: "Rajasthan", 9: "Uttar Pradesh",
  10: "Bihar", 11: "Sikkim", 12: "Arunachal Pradesh", 13: "Nagaland", 14: "Manipur",
  15: "Mizoram", 16: "Tripura", 17: "Meghalaya", 18: "Assam", 19: "West Bengal",
  20: "Jharkhand", 21: "Odisha", 22: "Chhattisgarh", 23: "Madhya Pradesh",
  24: "Gujarat", 25: "Daman & Diu", 26: "Dadra & Nagar Haveli", 27: "Maharashtra",
  29: "Karnataka", 30: "Goa", 31: "Lakshadweep", 32: "Kerala", 33: "Tamil Nadu",
  34: "Puducherry", 35: "Andaman & Nicobar", 36: "Telangana", 37: "Andhra Pradesh",
  38: "Ladakh", 97: "Other Territory", 99: "International"
};

export default function ClientListPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
      setFilteredClients(res.data);
    } catch (err) {
      console.error("Failed to load clients", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Filter Logic
  useEffect(() => {
    let temp = clients;

    // 1. Search
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        temp = temp.filter(c => 
            c.company_name.toLowerCase().includes(lower) || 
            (c.email && c.email.toLowerCase().includes(lower))
        );
    }

    // 2. Location
    if (locationFilter !== "ALL") {
        temp = temp.filter(c => {
            if (locationFilter === 'DOMESTIC') return c.country === 'India';
            if (locationFilter === 'INTERNATIONAL') return c.country !== 'India';
            return true;
        });
    }

    setFilteredClients(temp);
  }, [clients, searchTerm, locationFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure? This will delete the client and unlink their invoices.")) return;
    try {
        await api.delete(`/clients/${id}`);
        fetchClients(); // Refresh list
    } catch (e) {
        alert("Failed to delete client");
    }
  };

  // Helper to format location display
  const getLocationDisplay = (client: any) => {
    // 1. Try City + Country
    if (client.addresses?.billing?.city) {
        return `${client.addresses.billing.city}, ${client.country}`;
    }
    
    // 2. If India, try State Name
    if (client.country === 'India' && client.state_code) {
        return `${STATE_MAP[client.state_code] || client.state_code} - India`;
    }

    // 3. Fallback to Country only
    return client.country;
  };

  return (
    <div className="p-6 space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <Link href="/clients/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search clients..." 
                className="pl-9 bg-background" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="ALL">All Locations</SelectItem>
                  <SelectItem value="DOMESTIC">Domestic (India)</SelectItem>
                  <SelectItem value="INTERNATIONAL">International</SelectItem>
              </SelectContent>
          </Select>
      </div>

      <Card className="shadow-horizon border-none bg-card">
        <CardHeader className="pb-3">
            <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-10 text-center text-muted-foreground flex justify-center">
                <Loader2 className="animate-spin mr-2" /> Loading records...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Tax ID / GSTIN</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No clients match your search.
                     </TableCell>
                   </TableRow>
                )}
                
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="group hover:bg-muted/50">
                    <TableCell className="font-medium text-foreground">
                        {client.company_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                        {client.tax_id || "N/A"}
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center text-muted-foreground text-sm">
                            <MapPin className="w-3 h-3 mr-1 text-primary" />
                            {getLocationDisplay(client)}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            {client.email && <span className="flex items-center"><Mail className="w-3 h-3 mr-1"/> {client.email}</span>}
                            {client.phone && <span className="flex items-center"><Phone className="w-3 h-3 mr-1"/> {client.phone}</span>}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted rounded-full">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
                                Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDelete(client.id)}>
                                Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}