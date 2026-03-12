'use client';

import React, { useState, useEffect } from 'react';
import { 
    Truck, 
    Building2, 
    Map, 
    Activity, 
    Calendar,
    ArrowUpRight,
    TrendingUp,
    Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export default function KeilDashboard() {
    const [stats, setStats] = useState({
        branches: 0,
        routes: 0,
        hces: 0,
        collectionsToday: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        const token = localStorage.getItem('token');
        try {
            // Find KEIL company ID first
            const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const compData = await compRes.json();
            
            let keilCo = null;
            if (compData.success && Array.isArray(compData.data)) {
                keilCo = compData.data.find((c: any) => 
                    c.company_name?.toUpperCase().includes('KEIL')
                );
            }
            
            if (keilCo) {
                const coId = keilCo.id;
                const [bRes, rRes, hRes, cRes] = await Promise.all([
                    fetch(`${API_BASE}/api/keil/operations/branches?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE}/api/keil/operations/routes?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE}/api/keil/operations/hces?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE}/api/keil/operations/collections?company_id=${coId}&date=${new Date().toISOString().split('T')[0]}`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                const bData = await bRes.json();
                const rData = await rRes.json();
                const hData = await hRes.json();
                const cData = await cRes.json();

                setStats({
                    branches: bData.data?.length || 0,
                    routes: rData.data?.length || 0,
                    hces: hData.data?.length || 0,
                    collectionsToday: cData.data?.length || 0
                });
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">KEIL Control Center</h1>
                    <p className="text-slate-500 font-medium">Monitoring Bio-Medical Waste Logistics & Route Efficiency.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 font-bold" onClick={() => fetchDashboardStats()}>
                        Refresh Real-time
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 font-bold" onClick={() => window.location.href='/keil/operations/collection'}>
                        <Activity className="w-4 h-4 mr-2" /> Log Collection
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Regional Branches</p>
                                <p className="text-4xl font-black">{stats.branches}</p>
                                <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full inline-block font-bold">Operational Zones</div>
                            </div>
                            <Building2 className="w-10 h-10 text-white/20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Enrolled Facilities</p>
                                <p className="text-4xl font-black">{stats.hces}</p>
                                <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full inline-block font-bold">HCE Service Network</div>
                            </div>
                            <Activity className="w-10 h-10 text-white/20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform duration-300">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Active Routes</p>
                                <p className="text-4xl font-black text-slate-800">{stats.routes}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Mapped Collection Loops</p>
                            </div>
                            <Map className="w-10 h-10 text-indigo-50 group-hover:text-indigo-100 transition-colors" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform duration-300">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Daily Sessions</p>
                                <p className="text-4xl font-black text-slate-800">{stats.collectionsToday}</p>
                                <p className="text-[10px] text-slate-400 font-medium font-bold">Today's Batch Entries</p>
                            </div>
                            <Truck className="w-10 h-10 text-rose-50 group-hover:text-rose-100 transition-colors" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-black text-slate-800">Operational Quick Access</CardTitle>
                                <CardDescription className="font-medium">Direct links to critical KEIL workflows.</CardDescription>
                            </div>
                            <TrendingUp className="w-10 h-10 text-slate-200" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center border-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all rounded-2xl group" onClick={() => window.location.href='/keil/operations/branch'}>
                            <Building2 className="w-6 h-6 mb-1 text-slate-400 group-hover:text-indigo-600 mr-0" />
                            <span className="font-black text-xs uppercase tracking-widest">Branch Registry</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center border-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all rounded-2xl group" onClick={() => window.location.href='/keil/operations/hce'}>
                            <Activity className="w-6 h-6 mb-1 text-slate-400 group-hover:text-emerald-600 mr-0" />
                            <span className="font-black text-xs uppercase tracking-widest">HCE Registry</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center border-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all rounded-2xl group" onClick={() => window.location.href='/keil/operations/route'}>
                            <Map className="w-6 h-6 mb-1 text-slate-400 group-hover:text-blue-600 mr-0" />
                            <span className="font-black text-xs uppercase tracking-widest">Route Setup</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center border-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all rounded-2xl group" onClick={() => window.location.href='/keil/operations/reports/route'}>
                            <Calendar className="w-6 h-6 mb-1 text-slate-400 group-hover:text-rose-600 mr-0" />
                            <span className="font-black text-xs uppercase tracking-widest">Daily Reports</span>
                        </Button>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-none shadow-xl bg-white p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-slate-800">Workforce Management</h4>
                                <p className="text-xs text-slate-500">Manage drivers, supervisors and field technicians.</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-slate-300" />
                        </div>
                    </Card>
                    <Card className="border-none shadow-xl bg-white p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Truck className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-slate-800">Fleet Monitoring</h4>
                                <p className="text-xs text-slate-500">Track vehicle assignments and fuel efficiency.</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-slate-300" />
                        </div>
                    </Card>
                    <Card className="border-none shadow-xl bg-white p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-slate-800">Compliance Calendar</h4>
                                <p className="text-xs text-slate-500">View upcoming audit dates and certificate renewals.</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-slate-300" />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
