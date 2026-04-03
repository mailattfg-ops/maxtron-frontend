'use client';

import React, { useState, useEffect } from 'react';
import { 
    Truck, 
    Calendar,
    BarChart3,
    TrendingUp,
    Fuel,
    Wrench,
    Download,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Clock,
    Lock,
    Loader2
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableView } from "@/components/ui/table-view";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export default function FleetReportsPage() {
    const { hasPermission, loading: permissionLoading } = usePermission();
    const canView = hasPermission('fleet_report_view', 'view');

    const [loading, setLoading] = useState(true);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    const [intelligence, setIntelligence] = useState<any>({
        summary: { totalDistance: '0', totalFuel: '0', totalMaintenance: '0', activeVehicles: 0, uptime: '98.2%' },
        vehicleMatrix: [],
        upcoming: []
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
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
                const intRes = await fetch(`${API_BASE}/api/keil/fleet/intelligence?company_id=${coId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const intData = await intRes.json();
                if (intData.success) setIntelligence(intData.data);
            }
        } catch (err) {
            console.error('Error fetching intelligence data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!canView) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="p-6 rounded-full bg-primary/5 text-primary">
                <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground font-medium">You do not have permission to view Fleet Intelligence Reports.</p>
        </div>
    );

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700 bg-slate-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-xl md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 font-heading">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase flex items-center gap-3">
                        <BarChart3 className="w-10 h-10 text-primary" />
                        Fleet Intelligence
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                        <TrendingUp className="w-3 h-3 text-emerald-500" /> Predictive Analytics & Resource Utilization
                    </p>
                </div>
                {/* <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
                    <Button variant="outline" className="flex-1 md:flex-none rounded-full border-slate-200 font-bold uppercase tracking-widest text-xs h-11 px-6 active:scale-95 transition-all">
                        <Download className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">PDF Protocol</span><span className="sm:hidden">PDF</span>
                    </Button>
                    <Button className="flex-1 md:flex-none bg-primary hover:bg-primary text-white rounded-full font-black uppercase tracking-widest text-xs h-11 px-8 shadow-lg shadow-primary/15 active:scale-95 transition-all">
                        <span className="hidden sm:inline">Export Dataset</span><span className="sm:hidden">Export</span>
                    </Button>
                </div> */}
            </div>


            {/* Matrix Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Cumulative Distance', val: intelligence.summary.totalDistance, unit: 'KM', color: 'indigo', icon: Truck, trend: '+12%' },
                    { label: 'Fuel Consumption', val: intelligence.summary.totalFuel, unit: 'Liters', color: 'amber', icon: Fuel, trend: '-4%' },
                    { label: 'Maintenance Spend', val: intelligence.summary.totalMaintenance, unit: 'INR', color: 'rose', icon: Wrench, trend: '+8%' },
                    { label: 'Fleet Integration', val: intelligence.summary.activeVehicles, unit: 'Assets', color: 'emerald', icon: TrendingUp, trend: '+0.5%' }
                ].map((item, i) => (
                    <Card key={i} className="border-none shadow-xl rounded-[2rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className={`p-4 bg-${item.color}-50 text-${item.color}-600 rounded-2xl group-hover:scale-110 transition-transform`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${item.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {item.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {item.trend}
                                </div>
                            </div>
                            <div className="mt-6 flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-800 tracking-tighter italic">
                                        {item.color === 'rose' ? `₹${parseFloat(item.val).toLocaleString()}` : parseFloat(item.val).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.unit}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <Card className="lg:col-span-2 border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 p-8 rounded-[3rem] ">
                        <div className="grid md:flex justify-between items-center gap-4 md:gap-0">
                            <div>
                                <CardTitle className="text-lg font-black uppercase tracking-tighter italic text-slate-800">Fleet Performance Table</CardTitle>
                                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Granular analysis per logistical unit.</CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <Input placeholder="Search Vehicle..." className="pl-9 h-11 w-48 rounded-xl border-slate-200 text-xs font-bold" />
                                </div>
                                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl">
                                    <Filter className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-muted-foreground font-bold uppercase text-[10px] tracking-widest border-b">
                                    <tr>
                                        <th className="px-6 py-4">Vehicle ID</th>
                                        <th className="px-6 py-4 text-center">Fuel Efficiency</th>
                                        <th className="px-6 py-4 text-center">Maintenance Cost</th>
                                        <th className="px-6 py-4 text-center">Distance Clout</th>
                                        <th className="px-6 py-4 text-right">Performance Index</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {intelligence.vehicleMatrix.map((v: any) => (
                                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-8 py-6 font-black text-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    {v.registration_number}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <span className="text-sm font-black text-slate-800">{v.efficiency}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 italic">KM/L</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center text-sm font-black text-rose-600 italic">₹{v.maintenance_cost.toLocaleString()}</td>
                                            <td className="px-8 py-6 text-center font-bold text-slate-600 text-xs uppercase tracking-widest">
                                                {v.total_distance.toLocaleString()} KM
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary/80 rounded-full" style={{ width: '85%' }} />
                                                    </div>
                                                    <span className="text-xs font-black text-primary">85%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {intelligence.vehicleMatrix.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest">No Intelligence Data Available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                 </Card>

                 <div className="space-y-8">
                     <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-slate-900 text-white p-8 group relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/80/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Next Maintenance Window
                        </h3>
                        <div className="space-y-6">
                            {intelligence.upcoming.map((u: any) => {
                                const d = new Date(u.date);
                                const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                                const day = d.getDate();
                                return (
                                    <div key={u.id} className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/10">
                                            <span className="text-xs font-black opacity-40">{month}</span>
                                            <span className="text-2xl font-black italic">{day}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-base font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">{u.vehicle}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{u.work}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {intelligence.upcoming.length === 0 && (
                                <div className="py-10 text-center">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No Maintenance Scheduled</p>
                                </div>
                            )}
                        </div>
                        <Button className="w-full mt-10 h-14 rounded-2xl bg-white text-slate-900 hover:bg-primary/10 font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-primary/80/10">
                            Schedule Technical Audit
                        </Button>
                     </Card>

                     <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-primary text-white p-8 relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mb-24" />
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Environmental Impact</h3>
                            <h2 className="text-4xl font-black italic mb-6">Carbon Prot.</h2>
                            <div className="space-y-2">
                                <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden p-1">
                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '64%' }} />
                                </div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="opacity-60 text-emerald-100 italic">Net Emissions Reduction</span>
                                    <span className="text-emerald-300">64% / Level 3</span>
                                </div>
                            </div>
                            <p className="text-[9px] font-bold opacity-50 mt-8 leading-relaxed">System calculating historical biodiesel integration metrics and route optimization efficiency.</p>
                        </div>
                     </Card>
                 </div>
            </div>
        </div>
    );
}
