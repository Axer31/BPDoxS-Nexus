"use client";

import React, { useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from "lucide-react";

export function BackupSettings() {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const downloadBackup = async () => {
    try {
        const res = await api.get('/backup/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `backup-${new Date().toISOString().slice(0,10)}.iec`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch(e) { alert("Failed"); }
  };

  const restoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("Overwrite data?")) return;
    const fd = new FormData(); fd.append('file', file);
    setLoading(true);
    try { await api.post('/backup/import', fd, { headers: {'Content-Type': 'multipart/form-data'} }); alert("Restored!"); window.location.reload(); } 
    catch(e) { alert("Failed"); } finally { setLoading(false); }
  };

  const importCsv = async (e: React.ChangeEvent<HTMLInputElement>, url: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    setImporting(true);
    try { const res = await api.post(url, fd, { headers: {'Content-Type': 'multipart/form-data'} }); alert(`Imported ${res.data.imported} records`); } 
    catch(e) { alert("Failed"); } finally { setImporting(false); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-horizon border-none bg-card">
            <CardHeader><CardTitle>System Backup</CardTitle><CardDescription>Encrypted .iec files</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                    <div><h4 className="font-bold text-sm">Export Data</h4></div>
                    <Button variant="outline" onClick={downloadBackup}><Download className="w-4 h-4 mr-2"/> Download</Button>
                </div>
                <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/10 rounded-lg flex justify-between items-center">
                    <div><h4 className="font-bold text-sm text-red-700">Restore Data</h4></div>
                    <div className="relative">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={restoreBackup} />
                        {/* FIX: Manually applied red background classes to ensure visibility */}
                        <Button className="bg-red-600 hover:bg-red-700 text-white shadow-sm" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Select File"}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="shadow-horizon border-none bg-card">
            <CardHeader><CardTitle>Legacy Imports</CardTitle><CardDescription>CSV Migration</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 border border-dashed rounded-lg flex justify-between items-center">
                    <h4 className="text-sm font-medium">Import Clients</h4>
                    <div className="relative">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => importCsv(e, '/import/clients')} />
                        <Button variant="secondary" disabled={importing}><Upload className="w-4 h-4 mr-2"/> Upload CSV</Button>
                    </div>
                </div>
                <div className="p-4 border border-dashed rounded-lg flex justify-between items-center">
                    <h4 className="text-sm font-medium">Import Invoices</h4>
                    <div className="relative">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => importCsv(e, '/import/invoices')} />
                        <Button variant="secondary" disabled={importing}><Upload className="w-4 h-4 mr-2"/> Upload CSV</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}