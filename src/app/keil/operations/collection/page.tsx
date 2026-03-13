'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Save, 
    Truck, 
    User, 
    Calendar, 
    Search,
    Clock,
    CheckCircle2,
    X,
    ClipboardList,
    AlertCircle,
    Check,
    Dna,
    Activity,
    Navigation,
    ArrowRight,
    ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const ROUTE_API = `${API_BASE}/api/keil/operations/routes`;
const ASSIGN_API = `${API_BASE}/api/keil/operations/assignments`;
const COLLECTION_API = `${API_BASE}/api/keil/operations/collections`;

export default function DailyCollectionEntryPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    
    const [loading, setLoading] = useState(false);
    const [routes, setRoutes] = useState<any[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState('');
    const [assignedHces, setAssignedHces] = useState<any[]>([]);
    const [currentCompanyId, setCurrentCompanyId] = useState('');

    // Header Data
    const [headerData, setHeaderData] = useState({
        collection_date: new Date().toISOString().split('T')[0],
        route_id: '',
        registration_number: '',
        driver_name: '',
        supervisor_name: '',
        remarks: ''
    });

    // Entries state: Map of HCE ID -> Entry Details
    const [entries, setEntries] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchRoutes();
    }, []);

    const fetchRoutes = async () => {
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
                const res = await fetch(`${ROUTE_API}?company_id=${coId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) setRoutes(data.data);
            }
        } catch (err) {
            console.error('Error fetching routes:', err);
        }
    };

    const fetchHcesForRoute = async (routeId: string) => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${ASSIGN_API}?route_id=${routeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAssignedHces(data.data);
                // Initialize entries map
                const initialEntries: Record<string, any> = {};
                data.data.forEach((a: any) => {
                    initialEntries[a.hce_id] = {
                        hce_id: a.hce_id,
                        is_visited: false,
                        start_time: '',
                        end_time: '',
                        yellow_bags: 0,
                        red_bags: 0,
                        white_containers: 0,
                        bottle_containers: 0,
                        remarks: ''
                    };
                });
                setEntries(initialEntries);
            }
        } catch (err) {
            console.error('Error loading HCEs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRouteChange = (routeId: string) => {
        setSelectedRouteId(routeId);
        setHeaderData(prev => ({ ...prev, route_id: routeId }));
        if (routeId) {
            fetchHcesForRoute(routeId);
        } else {
            setAssignedHces([]);
            setEntries({});
        }
    };

    const updateEntry = (hceId: string, field: string, value: any) => {
        setEntries(prev => ({
            ...prev,
            [hceId]: { ...prev[hceId], [field]: value }
        }));
    };

    const calculateTotals = () => {
        const visitedList = Object.values(entries).filter(e => e.is_visited);
        let yellow = 0, red = 0, white = 0, bottle = 0;
        visitedList.forEach(e => {
            yellow += (e.yellow_bags || 0);
            red += (e.red_bags || 0);
            white += (e.white_containers || 0);
            bottle += (e.bottle_containers || 0);
        });
        return {
            total_assigned: assignedHces.length,
            total_visited: visitedList.length,
            yellow, red, white, bottle
        };
    };

    const handleSave = async () => {
        const { total_assigned, total_visited } = calculateTotals();
        if (total_visited === 0) {
            error("Please mark at least one HCE as visited.");
            return;
        }

        if (await confirm({ message: "Confirm saving today's collection data?" })) {
            const token = localStorage.getItem('token');
            try {
                const payload = {
                    header: {
                        ...headerData,
                        total_hce_assigned: total_assigned,
                        total_visited: total_visited,
                        company_id: currentCompanyId
                    },
                    entries: Object.values(entries)
                };

                const res = await fetch(COLLECTION_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    success("Daily collection report saved successfully.");
                    window.location.reload();
                } else {
                    error(data.message);
                }
            } catch (err: any) {
                error(err.message);
            }
        }
    };

    const totals = calculateTotals();

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700 bg-slate-50/50 min-h-screen">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary rounded-lg text-white">
                            <Truck className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-bold text-primary tracking-tight">
                            Collection Terminal
                        </h1>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Navigation className="w-3 h-3" /> Real-time Logistics Management & Waste Serialization.
                    </p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex gap-4">
                        <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-primary/60">Coverage</p>
                                <p className="text-sm font-bold text-primary">{totals.total_visited} / {totals.total_assigned}</p>
                            </div>
                        </div>
                        {selectedRouteId && (
                            <Button size="lg" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-12 shadow-lg shadow-primary/20 font-bold uppercase tracking-wider transition-all duration-300">
                                <Save className="w-5 h-5 mr-3" /> Commit Batch
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Header Form */}
            <Card className="border-primary/20 shadow-xl overflow-hidden rounded-xl">
                <CardHeader className="bg-primary/5 border-b border-primary/10 py-4 px-8">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-bold text-primary">Session Manifest Details</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <Calendar className="w-3 h-3 text-primary" /> Effective Date
                            </label>
                            <Input type="date" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" value={headerData.collection_date} onChange={e => setHeaderData({ ...headerData, collection_date: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <Search className="w-3 h-3 text-primary" /> Logistical Route
                            </label>
                            <select 
                                className="flex h-10 w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                value={selectedRouteId}
                                onChange={e => handleRouteChange(e.target.value)}
                            >
                                <option value="">Switch to specific route</option>
                                {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <Truck className="w-3 h-3 text-primary" /> Vehicle Reference
                            </label>
                            <Input placeholder="Registration Code" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" value={headerData.registration_number} onChange={e => setHeaderData({ ...headerData, registration_number: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <User className="w-3 h-3 text-primary" /> Pilot / Driver
                            </label>
                            <Input placeholder="Enter handle" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" value={headerData.driver_name} onChange={e => setHeaderData({ ...headerData, driver_name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <User className="w-3 h-3 text-primary" /> Field Supervisor
                            </label>
                            <Input placeholder="Enter supervisor" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" value={headerData.supervisor_name} onChange={e => setHeaderData({ ...headerData, supervisor_name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <Dna className="w-3 h-3 text-primary" /> Execution Remarks
                            </label>
                            <Input placeholder="Notes regarding session" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" value={headerData.remarks} onChange={e => setHeaderData({ ...headerData, remarks: e.target.value })} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* HCE Entries Table */}
            {selectedRouteId ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-yellow-500/10 border border-yellow-200 p-4 rounded-2xl flex flex-col gap-1 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-yellow-700 tracking-widest">Yellow Vol.</span>
                            <span className="text-2xl font-black text-yellow-800">{totals.yellow} Bags</span>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-200 p-4 rounded-2xl flex flex-col gap-1 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-rose-700 tracking-widest">Red Vol.</span>
                            <span className="text-2xl font-black text-rose-800">{totals.red} Bags</span>
                        </div>
                        <div className="bg-slate-500/10 border border-slate-200 p-4 rounded-2xl flex flex-col gap-1 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-slate-700 tracking-widest">White Vol.</span>
                            <span className="text-2xl font-black text-slate-800">{totals.white} Boxes</span>
                        </div>
                        <div className="bg-indigo-500/10 border border-indigo-200 p-4 rounded-2xl flex flex-col gap-1 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-indigo-700 tracking-widest">Bottle Vol.</span>
                            <span className="text-2xl font-black text-indigo-800">{totals.bottle} Units</span>
                        </div>
                    </div>

                    <Card className="border-primary/10 shadow-sm overflow-hidden bg-white rounded-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="text-[10px] font-bold uppercase bg-primary text-primary-foreground">
                                    <tr>
                                        <th className="px-6 py-4 text-center">Visit</th>
                                        <th className="px-6 py-4">Managed Facility Detail</th>
                                        <th className="px-6 py-4 text-center">Timestamps (In/Out)</th>
                                        <th className="px-6 py-4 text-center">Categories (Y / R / W / B)</th>
                                        <th className="px-6 py-4">Observation Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignedHces.map(a => {
                                        const isVisited = entries[a.hce_id]?.is_visited;
                                        return (
                                            <tr key={a.id} className={`group border-b border-slate-50 transition-all ${isVisited ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                                                <td className="px-6 py-6 text-center">
                                                    <div 
                                                        onClick={() => updateEntry(a.hce_id, 'is_visited', !isVisited)}
                                                        className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all border-2 ${
                                                            isVisited 
                                                            ? 'bg-primary border-primary shadow-lg shadow-primary/20 text-white scale-105' 
                                                            : 'bg-white border-primary/20 text-primary/20 hover:border-primary/40 hover:text-primary/40'
                                                        }`}
                                                    >
                                                        <Check className={`w-6 h-6 stroke-[3] ${isVisited ? 'animate-in zoom-in-50 duration-300' : ''}`} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className={`font-bold text-sm transition-colors ${isVisited ? 'text-primary' : 'text-foreground'}`}>{a.keil_hces?.hce_name}</span>
                                                        <div className="flex items-center gap-2">
                                                           <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wider">{a.keil_hces?.hce_code}</span>
                                                           <span className="text-[10px] font-medium text-muted-foreground uppercase">{a.keil_hces?.hce_place}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="relative">
                                                                <Clock className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                                <Input type="time" disabled={!isVisited} className="pl-6 w-24 h-8 text-[11px] font-bold bg-background border-primary/20 rounded-md focus:ring-1 ring-primary" value={entries[a.hce_id]?.start_time} onChange={e => updateEntry(a.hce_id, 'start_time', e.target.value)} />
                                                            </div>
                                                            <div className="relative">
                                                                <Clock className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                                <Input type="time" disabled={!isVisited} className="pl-6 w-24 h-8 text-[11px] font-bold bg-background border-primary/20 rounded-md focus:ring-1 ring-primary" value={entries[a.hce_id]?.end_time} onChange={e => updateEntry(a.hce_id, 'end_time', e.target.value)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-8 h-1 bg-yellow-400 rounded-full" />
                                                            <Input type="number" disabled={!isVisited} className="w-14 h-8 text-center text-xs font-bold border-primary/10 bg-background rounded-md focus:border-yellow-400" value={entries[a.hce_id]?.yellow_bags} onChange={e => updateEntry(a.hce_id, 'yellow_bags', parseInt(e.target.value) || 0)} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-8 h-1 bg-rose-400 rounded-full" />
                                                            <Input type="number" disabled={!isVisited} className="w-14 h-8 text-center text-xs font-bold border-primary/10 bg-background rounded-md focus:border-rose-400" value={entries[a.hce_id]?.red_bags} onChange={e => updateEntry(a.hce_id, 'red_bags', parseInt(e.target.value) || 0)} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-8 h-1 bg-slate-400 rounded-full" />
                                                            <Input type="number" disabled={!isVisited} className="w-14 h-8 text-center text-xs font-bold border-primary/10 bg-background rounded-md focus:border-slate-400" value={entries[a.hce_id]?.white_containers} onChange={e => updateEntry(a.hce_id, 'white_containers', parseInt(e.target.value) || 0)} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-8 h-1 bg-primary/40 rounded-full" />
                                                            <Input type="number" disabled={!isVisited} className="w-14 h-8 text-center text-xs font-bold border-primary/10 bg-background rounded-md focus:border-primary" value={entries[a.hce_id]?.bottle_containers} onChange={e => updateEntry(a.hce_id, 'bottle_containers', parseInt(e.target.value) || 0)} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Input disabled={!isVisited} placeholder="Observations..." className="w-full h-8 text-[11px] font-medium bg-background border-primary/20 rounded-md" value={entries[a.hce_id]?.remarks} onChange={e => updateEntry(a.hce_id, 'remarks', e.target.value)} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-96 bg-white/50 rounded-[40px] border-4 border-dashed border-slate-100 animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                        <Truck className="w-12 h-12 text-slate-200" />
                    </div>
                    <p className="text-xl font-black text-slate-300 uppercase tracking-widest">Awaiting Route Protocol</p>
                    <p className="text-xs font-bold text-slate-300 mt-2">Initialize the session by selecting an active logistical route.</p>
                </div>
            )}
        </div>
    );
}
