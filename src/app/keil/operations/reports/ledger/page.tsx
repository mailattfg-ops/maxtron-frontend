'use client';

import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Calendar, 
    Activity,
    Building2,
    History,
    FileText,
    FileSpreadsheet,
    MapPin,
    Truck,
    User,
    Lock,
    Loader2
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { exportToExcel } from '@/utils/export';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { TableView } from "@/components/ui/table-view";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const LEDGER_API = `${API_BASE}/api/keil/operations/ledger`;
const HCE_API = `${API_BASE}/api/keil/operations/hces`;

export default function HCEServiceLedgerPage() {
    const { hasPermission, loading: permissionLoading } = usePermission();
    const canView = hasPermission('prod_ledger_report_view', 'view');

    const [hces, setHces] = useState<any[]>([]);
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    
    const [filters, setFilters] = useState({
        hce_id: '',
        from_date: '',
        to_date: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setInitialLoading(true);
        const token = localStorage.getItem('token');
        try {
            const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const compData = await compRes.json();
            
            let coId = '';
            if (compData.success && Array.isArray(compData.data)) {
                const activeCo = compData.data.find((c: any) => 
                    c.company_name?.toUpperCase().includes('KEIL')
                );
                if (activeCo) {
                    coId = activeCo.id;
                    setCurrentCompanyId(coId);
                }
            }

            if (coId) {
                const hRes = await fetch(`${HCE_API}?company_id=${coId}`, { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                const hData = await hRes.json();
                if (hData.success) setHces(hData.data);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setInitialLoading(false);
        }
    };

    const fetchLedger = async (hceId: string, from: string, to: string) => {
        if (!hceId) return;
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            let url = `${LEDGER_API}/${hceId}?from=${from}&to=${to}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setEntries(data.data);
            }
        } catch (err) {
            console.error('Error fetching ledger:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        if (newFilters.hce_id) {
            fetchLedger(newFilters.hce_id, newFilters.from_date, newFilters.to_date);
        }
    };

    const selectedHce = hces.find(h => h.id === filters.hce_id);
    const totalBags = entries.reduce((acc, curr) => acc + (curr.yellow_bags || 0) + (curr.red_bags || 0) + (curr.white_containers || 0) + (curr.bottle_containers || 0), 0);

    const handleExport = async () => {
        if (entries.length === 0) return;
        
        const headers = [
            'Service Date', 
            'Yellow Bags', 
            'Red Bags', 
            'White Containers', 
            'Bottle Containers',
            'Total Bags',
            'Registration Number',
            'Driver Name',
            'Supervisor Name',
            'Start Time',
            'End Time',
            'Remarks'
        ];

        const rows = entries.map(ent => {
            const total = (ent.yellow_bags || 0) + (ent.red_bags || 0) + (ent.white_containers || 0) + (ent.bottle_containers || 0);
            const dateStr = ent.header?.collection_date 
                ? new Date(ent.header.collection_date).toLocaleDateString() 
                : 'N/A';
                
            return [
                dateStr,
                ent.yellow_bags || 0,
                ent.red_bags || 0,
                ent.white_containers || 0,
                ent.bottle_containers || 0,
                total,
                ent.header?.registration_number || 'N/A',
                ent.header?.driver_name || 'N/A',
                ent.header?.supervisor_name || 'N/A',
                ent.start_time || '00:00',
                ent.end_time || '00:00',
                ent.remarks || 'N/A'
            ];
        });

        await exportToExcel({
            headers,
            rows,
            filename: `HCE_Ledger_${selectedHce?.hce_code || 'export'}_${filters.from_date || 'full'}.xlsx`,
            sheetName: 'Service History'
        });
    };

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!canView) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="p-6 rounded-full bg-primary/5 text-primary">
                <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground font-medium">You do not have permission to view the Service Ledger.</p>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-primary tracking-tight">HCE Service Ledger</h1>
                    <p className="text-sm font-medium text-muted-foreground">Full collection history and waste volume analysis.</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleExport}
                        disabled={entries.length === 0}
                        className="rounded-full px-6 border-primary/20 text-primary hover:bg-primary/5 font-bold uppercase tracking-wider text-xs h-10"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel Export
                    </Button>
                    <Button 
                        variant="outline" 
                        className="rounded-full px-6 border-primary/20 text-primary hover:bg-primary/5 font-bold uppercase tracking-wider text-xs h-10" 
                        onClick={() => window.print()}
                    >
                        <FileText className="w-4 h-4 mr-2" /> Print Ledger
                    </Button>
                </div>
            </div>

            <Card className="border-primary/20 shadow-sm rounded-xl overflow-hidden bg-primary/[0.02]">
                <CardHeader className="bg-primary/5 border-b border-primary/10 py-4 px-6">
                    <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Facility Lookup
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium text-xs mt-1">Select a Health Care Establishment to view its full collection history.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider pl-1">HCE Facility</label>
                            <div className="relative group">
                                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors" />
                                <Select value={filters.hce_id} onValueChange={(val) => handleFilterChange('hce_id', val)}>
                                    <SelectTrigger className="pl-9 h-10 w-full border-primary/20 bg-background shadow-sm font-bold">
                                        <SelectValue placeholder="Choose Hospital / Clinic" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-primary/20">
                                        {hces.map(h => (
                                            <SelectItem key={h.id} value={h.id}>{h.hce_name} ({h.hce_code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider pl-1">Period From</label>
                            <Input 
                                type="date" 
                                className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm"
                                value={filters.from_date}
                                onChange={e => handleFilterChange('from_date', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider pl-1">Period To</label>
                            <Input 
                                type="date" 
                                className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm"
                                value={filters.to_date}
                                onChange={e => handleFilterChange('to_date', e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedHce && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                        <Card className="shadow-lg border-primary/10 bg-white rounded-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                            <CardContent className="pt-6 relative">
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                                        <Building2 className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xl font-bold text-foreground tracking-tight">{selectedHce.hce_name}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded uppercase tracking-wider">{selectedHce.hce_code}</span>
                                            <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                                <MapPin className="w-3 h-3 text-primary/60" />
                                                <span className="max-w-[200px] truncate">{selectedHce.hce_place}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-lg border-secondary/20 bg-secondary rounded-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                            <CardContent className="pt-6 flex items-center justify-between relative">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold uppercase text-white/70 tracking-widest">Aggregate Services</p>
                                    <p className="text-3xl font-bold text-white tracking-tight">{entries.length} <span className="text-sm font-medium opacity-80">Visits</span></p>
                                </div>
                                <Activity className="w-12 h-12 text-white/20" />
                            </CardContent>
                        </Card>
                        <Card className="shadow-lg border-primary/10 bg-white rounded-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                            <CardContent className="pt-6 flex items-center justify-between relative">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold uppercase text-primary/60 tracking-widest">Total Waste Vol.</p>
                                    <p className="text-3xl font-bold text-primary tracking-tight">{totalBags} <span className="text-sm font-medium text-muted-foreground">Bags</span></p>
                                </div>
                                <History className="w-12 h-12 text-primary/10" />
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-primary/10 shadow-sm rounded-xl overflow-hidden bg-white">
                        <TableView
                            title="Facility Service Log"
                            description={`Full collection history for ${selectedHce.hce_name}`}
                            headers={['Service Date', 'Bags (Y-R-W-B)', 'Vehicle/Crew', 'Time Log', 'Internal Remarks']}
                            data={entries}
                            loading={loading}
                            searchFields={['header.collection_date', 'header.registration_number']}
                            renderRow={(ent: any) => (
                                    <tr key={ent.id} className="hover:bg-primary/[0.02] transition-colors border-b last:border-0 border-primary/5">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground">{new Date(ent.header?.collection_date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Logged: {new Date(ent.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] font-bold text-amber-600/70">Y</span>
                                                    <div className="w-7 h-7 flex items-center justify-center bg-amber-50 text-amber-600 text-xs font-bold rounded-md border border-amber-100">{ent.yellow_bags}</div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] font-bold text-secondary/70">R</span>
                                                    <div className="w-7 h-7 flex items-center justify-center bg-secondary/10 text-secondary text-xs font-bold rounded-md border border-secondary/10">{ent.red_bags}</div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] font-bold text-primary/40">W</span>
                                                    <div className="w-7 h-7 flex items-center justify-center bg-primary/5 text-primary text-xs font-bold rounded-md border border-primary/10">{ent.white_containers}</div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] font-bold text-secondary/40">B</span>
                                                    <div className="w-7 h-7 flex items-center justify-center bg-secondary/10 text-secondary text-xs font-bold rounded-md border border-secondary/10">{ent.bottle_containers}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                                    <Truck className="w-3.5 h-3.5 text-primary/40" /> {ent.header?.registration_number}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                                    <User className="w-3 h-3" /> {ent.header?.driver_name} (D) | {ent.header?.supervisor_name} (S)
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground">{ent.start_time || '00:00'} - {ent.end_time || '00:00'}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Station Time</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[10px] font-medium text-muted-foreground italic max-w-[150px] truncate">
                                            {ent.remarks || '--'}
                                        </td>
                                </tr>
                            )}
                        />
                        {entries.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40 space-y-4">
                                <History className="w-16 h-16 opacity-20" />
                                <div className="text-center">
                                    <p className="font-bold text-muted-foreground uppercase tracking-widest">No service record</p>
                                    <p className="text-[10px] font-medium mt-1">Visit logs will appear here once field collection begins.</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {!selectedHce && !initialLoading && (
                <div className="h-80 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Building2 className="w-16 h-16 text-slate-200 mb-4" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Please select a facility to begin</p>
                    <p className="text-[10px] text-slate-400 mt-1">Searching across all medical centers and diagnostic labs...</p>
                </div>
            )}
        </div>
    );
}
