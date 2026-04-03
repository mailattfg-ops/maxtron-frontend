'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Truck, 
    User, 
    Calendar, 
    Clock, 
    Map, 
    ArrowLeft, 
    FileText, 
    Activity, 
    Package, 
    Navigation,
    Printer,
    CheckCircle2,
    CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const COLLECTION_API = `${API_BASE}/api/keil/operations/collections`;

export default function BatchDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { error } = useToast();
    const [batch, setBatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchBatchDetails();
    }, [id]);

    const fetchBatchDetails = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${COLLECTION_API}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setBatch(data.data);
            } else {
                error(data.message);
            }
        } catch (err) {
            console.error('Error fetching batch:', err);
            error('Failed to load batch details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Activity className="w-10 h-10 animate-spin text-primary" /></div>;
    if (!batch) return <div className="p-10 text-center text-slate-400">Batch details not found.</div>;

    const totals = batch.entries.reduce((acc: any, curr: any) => ({
        yellow: acc.yellow + (curr.yellow_bags || 0),
        red: acc.red + (curr.red_bags || 0),
        white: acc.white + (curr.white_containers || 0),
        bottle: acc.bottle + (curr.bottle_containers || 0),
        weight: acc.weight + (parseFloat(curr.total_weight_kg) || 0)
    }), { yellow: 0, red: 0, white: 0, bottle: 0, weight: 0 });

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-top-4 duration-700 max-w-7xl mx-auto">
            {/* Header Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-4 w-full md:w-auto">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-primary hover:text-primary/80 -ml-2 h-8">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary rounded-xl text-white shadow-xl shadow-primary/20">
                            <FileText className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-primary tracking-tight leading-none uppercase">Session Manifest</h1>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2">Manifest ID: {batch.id?.slice(0, 8)}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                        variant="outline" 
                        className="rounded-full px-8 border-primary/20 text-primary hover:bg-primary/5 font-bold uppercase tracking-wider text-xs h-10 w-full md:w-auto shadow-sm" 
                        onClick={() => window.print()}
                    >
                        <Printer className="w-4 h-4 mr-2" /> Print Manifest
                    </Button>
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <Card className="border-none shadow-lg bg-white rounded-xl overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                    <div className="bg-primary h-1 w-full" />
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-3 w-full">
                                <div className="p-2 bg-primary/5 rounded-lg w-fit text-primary">
                                    <Map className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Logistical Loop</p>
                                    <p className="text-lg font-bold text-foreground truncate">{batch.route?.route_name}</p>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{batch.route?.route_code}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                 </Card>
                 <Card className="border-none shadow-lg bg-white rounded-xl overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                    <div className="bg-secondary h-1 w-full" />
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-3 w-full">
                                <div className="p-2 bg-secondary/5 rounded-lg w-fit text-secondary">
                                    <CalendarDays className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Execution Date</p>
                                    <p className="text-lg font-bold text-foreground">{new Date(batch.collection_date).toLocaleDateString()}</p>
                                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Session Active</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                 </Card>
                 <Card className="border-none shadow-lg bg-white rounded-xl overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                    <div className="bg-primary/60 h-1 w-full" />
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-3 w-full">
                                <div className="p-2 bg-primary/5 rounded-lg w-fit text-primary">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mobile Resource</p>
                                    <p className="text-lg font-bold text-foreground">{batch.registration_number}</p>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Fleet Registry Verified</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                 </Card>
                  <Card className="border-none shadow-lg bg-white rounded-xl overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                    <div className="bg-secondary/60 h-1 w-full" />
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-3 w-full">
                                <div className="p-2 bg-secondary/5 rounded-lg w-fit text-secondary">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Session Performance</p>
                                    <p className="text-lg font-bold text-foreground truncate">{batch.start_time || '--'} - {batch.end_time || '--'}</p>
                                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">{batch.km_run || 0} KM Traversed</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                  </Card>
            </div>

            {/* Waste Summary Counters */}
            <div className="bg-foreground rounded-2xl p-10 text-background shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-700" />
                <div className="relative z-10 grid grid-cols-2 lg:grid-cols-6 gap-10">
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Coverage Loop</p>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-bold tracking-tight">{batch.total_visited} / {batch.total_hce_assigned}</p>
                                <span className="text-sm font-bold text-secondary">{Math.round((batch.total_visited / (batch.total_hce_assigned || 1)) * 100)}%</span>
                            </div>
                            <div className="flex gap-2 text-[9px] font-bold uppercase text-muted-foreground">
                                <span>B: {batch.visited_bedded || 0}/{batch.assigned_bedded || 0}</span>
                                <span>O: {batch.visited_others || 0}/{batch.assigned_others || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Yellow Vol.</p>
                        <p className="text-4xl font-bold tracking-tight">{totals.yellow} <span className="text-xs font-medium text-muted-foreground/60">Bags</span></p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Red Vol.</p>
                        <p className="text-4xl font-bold tracking-tight">{totals.red} <span className="text-xs font-medium text-muted-foreground/60">Bags</span></p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">White Vol.</p>
                        <p className="text-4xl font-bold tracking-tight">{totals.white} <span className="text-xs font-medium text-muted-foreground/60">Units</span></p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">Operational Metric</p>
                        <div className="flex gap-4">
                            <div>
                                <p className="text-[9px] font-bold uppercase text-primary/60">DC</p>
                                <p className="text-2xl font-bold text-white">{batch.dc_qty || 0}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase text-primary/60">NW</p>
                                <p className="text-2xl font-bold text-white">{batch.nw_qty || 0}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase text-secondary/60">RD</p>
                                <p className="text-2xl font-bold text-white">{batch.rd_qty || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Collection Qty</p>
                        <p className="text-4xl font-bold tracking-tight text-white">{batch.collection_qty || 0}</p>
                    </div>
                </div>
            </div>

            {/* Detailed Transaction Log */}
            <Card className="border-primary/10 shadow-2xl overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl">
                <div className="bg-primary/5 px-10 py-6 border-b border-primary/10 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-primary tracking-tight">Transaction Protocol</h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Granular serialization data per facility.</p>
                    </div>
                    <Activity className="w-6 h-6 text-primary/20" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-bold uppercase bg-primary/[0.02] text-primary/60 border-b border-primary/10">
                            <tr>
                                <th className="px-10 py-5">Managed Facility Detail</th>
                                <th className="px-10 py-5 text-center">Timestamps</th>
                                <th className="px-10 py-5 text-center">Categories (Y / R / W / B)</th>
                                <th className="px-10 py-5">Observation Notes</th>
                                <th className="px-10 py-5 text-right">Verification</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batch.entries.map((entry: any) => (
                                <tr key={entry.id} className="border-b last:border-0 border-slate-50 hover:bg-white transition-all group">
                                    <td className="px-10 py-7">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-foreground text-base group-hover:text-primary transition-colors flex items-center gap-2">
                                                {entry.hce?.hce_name}
                                                {entry.hce?.hce_category && (
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                                        entry.hce.hce_category?.toUpperCase() === 'BEDDED' 
                                                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                    }`}>
                                                        {entry.hce.hce_category}
                                                    </span>
                                                )}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">{entry.hce?.hce_code}</span>
                                                <span className="w-px h-3 bg-primary/20" />
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{entry.hce?.hce_place}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-5">
                                        <div className="flex flex-col items-center">
                                            {entry.is_visited ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-foreground bg-primary/5 px-3 py-1 rounded-lg">
                                                        <Clock className="w-3 h-3 text-primary/60" /> {entry.start_time} <span className="opacity-30">→</span> {entry.end_time}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground/30 tracking-widest">Marked Absent</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-10 py-5">
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] font-bold text-amber-600/70">Y</span>
                                                <span className={`text-sm font-bold ${entry.yellow_bags > 0 ? 'text-foreground' : 'text-muted-foreground/20'}`}>{entry.yellow_bags || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] font-bold text-secondary/70">R</span>
                                                <span className={`text-sm font-bold ${entry.red_bags > 0 ? 'text-foreground' : 'text-muted-foreground/20'}`}>{entry.red_bags || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] font-bold text-primary/40">W</span>
                                                <span className={`text-sm font-bold ${entry.white_containers > 0 ? 'text-foreground' : 'text-muted-foreground/20'}`}>{entry.white_containers || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] font-bold text-secondary/40">B</span>
                                                <span className={`text-sm font-bold ${entry.bottle_containers > 0 ? 'text-foreground' : 'text-muted-foreground/20'}`}>{entry.bottle_containers || 0}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-5 text-xs font-medium text-muted-foreground italic max-w-[200px]">
                                        {entry.remarks || <span className="opacity-20 text-foreground">No field notes</span>}
                                    </td>
                                    <td className="px-10 py-5 text-right">
                                        {entry.is_visited ? (
                                            <div className="flex items-center justify-end gap-2 text-secondary">
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Verified</span>
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2 text-muted-foreground/30">
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Bypassed</span>
                                               <div className="w-5 h-5 rounded-full border-2 border-primary/5" />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="text-center py-10 opacity-40">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em]">End of Logistical Manifest</p>
                <div className="w-10 h-0.5 bg-primary/20 mx-auto mt-4 rounded-full" />
            </div>
        </div>
    );
}
