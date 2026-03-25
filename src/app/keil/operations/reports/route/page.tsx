'use client';

import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Calendar, 
    User,
    Activity,
    Map,
    TrendingUp,
    ArrowRight,
    Truck,
    Download,
    X,
    Lock,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableView } from "@/components/ui/table-view";
import { exportToExcel } from '@/utils/export';
import { useToast } from "@/components/ui/toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const COLLECTION_API = `${API_BASE}/api/keil/operations/collections`;
const ROUTE_API = `${API_BASE}/api/keil/operations/routes`;

export default function RouteCollectionReportPage() {
    const { error, success } = useToast();
    const { hasPermission, loading: permissionLoading } = usePermission();
    
    const canView = hasPermission('prod_route_report_view', 'view');

    const [routes, setRoutes] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        route_id: 'all'
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
                const rRes = await fetch(`${ROUTE_API}?company_id=${coId}`, { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                const rData = await rRes.json();
                if (rData.success) setRoutes(rData.data);
                
                await fetchReport(coId, filters.date, filters.route_id);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReport = async (coId: string, date: string, routeId: string) => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            let url = `${COLLECTION_API}?company_id=${coId}`;
            if (date) url += `&date=${date}`;
            if (routeId && routeId !== 'all') url += `&route_id=${routeId}`;
            
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setBatches(data.data);
        } catch (err) {
            console.error('Error fetching report:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        fetchReport(currentCompanyId, newFilters.date, newFilters.route_id);
    };

    const handleExport = async () => {
        if (batches.length === 0) {
            error("No collection data available to export.");
            return;
        }

        const headers = [
            'Route Name', 
            'Route Code', 
            'Vehicle No', 
            'Driver Name', 
            'Supervisor', 
            'Assigned HCEs', 
            'Visited', 
            'Coverage %', 
            'Remarks'
        ];

        const rows = batches.map(batch => [
            batch.route?.route_name || 'N/A',
            batch.route?.route_code || 'N/A',
            batch.registration_number || 'N/A',
            batch.driver_name || 'N/A',
            batch.supervisor_name || 'N/A',
            batch.total_hce_assigned || 0,
            batch.total_visited || 0,
            `${((batch.total_visited / (batch.total_hce_assigned || 1)) * 100).toFixed(1)}%`,
            batch.remarks || '-'
        ]);

        await exportToExcel({
            headers,
            rows,
            filename: `route_collection_summary_${filters.date}.xlsx`,
            sheetName: 'Collection Summary'
        });
        success("Report exported to Excel.");
    };

    const totalAssigned = batches.reduce((acc, curr) => acc + (curr.total_hce_assigned || 0), 0);
    const totalVisited = batches.reduce((acc, curr) => acc + (curr.total_visited || 0), 0);
    const coverage = totalAssigned > 0 ? (totalVisited / totalAssigned) * 100 : 0;

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!canView) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="p-6 rounded-full bg-primary/5 text-primary">
                <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground font-medium">You do not have permission to view Route Collection Reports.</p>
        </div>
    );

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight font-heading">Route Collection Map</h1>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Consolidated view of daily route operations for Keil.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                    <Button 
                        variant="outline" 
                        className="flex-1 md:flex-none rounded-full px-4 md:px-6 border-primary/20 text-primary hover:bg-primary/5 font-bold uppercase tracking-wider text-[10px] md:text-xs h-10 shadow-sm" 
                        onClick={handleExport}
                        disabled={batches.length === 0}
                    >
                        <Download className="w-4 h-4 mr-1 md:mr-2" /> 
                        <span className="hidden md:inline">Export Report</span>
                        <span className="md:hidden">Export</span>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary shadow-xl shadow-primary/20 border-none rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                    <CardContent className="pt-8 relative text-white">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Active Sessions</p>
                                <p className="text-3xl md:text-4xl font-bold tracking-tight">{batches.length}</p>
                                <p className="text-[10px] text-white/60 font-medium">Logged Route Batches</p>
                            </div>
                            <Truck className="w-10 h-10 md:w-12 md:h-12 text-white/20" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-secondary shadow-xl shadow-secondary/20 border-none rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                    <CardContent className="pt-8 relative text-white">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Service Coverage</p>
                                <p className="text-3xl md:text-4xl font-bold tracking-tight">{totalVisited} / {totalAssigned}</p>
                                <p className="text-[10px] text-white/60 font-medium">Facilities Visited Today</p>
                            </div>
                            <Map className="w-10 h-10 md:w-12 md:h-12 text-white/20" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-xl shadow-primary/5 border border-primary/10 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                    <CardContent className="pt-8 relative">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Completion rate</p>
                                <p className="text-3xl md:text-4xl font-bold text-primary tracking-tight">{coverage.toFixed(1)}%</p>
                                <p className="text-[10px] text-muted-foreground font-medium">Yield of planned vs actual</p>
                            </div>
                            <TrendingUp className="w-10 h-10 md:w-12 md:h-12 text-primary/10" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-primary/10 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-primary/5 border-b border-primary/10 py-4 px-6 md:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold text-primary">Route Collection Summary</CardTitle>
                            <CardDescription className="text-muted-foreground font-medium text-xs">Analysis of field performance and collection yield.</CardDescription>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative group">
                                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/60" />
                                <Input 
                                    type="date" 
                                    className="pl-9 pr-8 h-10 rounded-md border-primary/20 bg-background font-bold text-xs md:text-sm w-full md:w-44"
                                    value={filters.date}
                                    onChange={e => handleFilterChange('date', e.target.value)}
                                />
                                {filters.date && (
                                    <button 
                                        onClick={() => handleFilterChange('date', '')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Map className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/60" />
                                <Select value={filters.route_id} onValueChange={(val) => handleFilterChange('route_id', val)}>
                                    <SelectTrigger className="pl-9 h-10 w-full lg:min-w-[200px] border-primary/20 bg-background shadow-sm font-bold text-xs md:text-sm">
                                        <SelectValue placeholder="All Collection Routes" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-primary/20">
                                        <SelectItem value="all">All Collection Routes</SelectItem>
                                        {routes.map(r => (
                                            <SelectItem key={r.id} value={r.id}>{r.route_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <TableView
                        title=""
                        headers={['Route / Branch', 'Vehicle & Personnel', 'Coverage', 'Remarks', 'Manage']}
                        data={batches}
                        loading={loading}
                        searchFields={['route.route_name', 'registration_number', 'driver_name']}
                        renderRow={(batch: any) => (
                            <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-0">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700 text-sm">{batch.route?.route_name}</span>
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{batch.route?.route_code}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] md:text-xs font-bold text-slate-600">{batch.registration_number}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] font-medium text-slate-500">{batch.driver_name} (D) | {batch.supervisor_name} (S)</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                                            <span>{batch.total_visited} / {batch.total_hce_assigned}</span>
                                            <span>{Math.round((batch.total_visited / (batch.total_hce_assigned || 1)) * 100)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${
                                                    (batch.total_visited / (batch.total_hce_assigned || 1)) >= 1 ? 'bg-emerald-500' : 'bg-indigo-500'
                                                }`}
                                                style={{ width: `${(batch.total_visited / (batch.total_hce_assigned || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-500 italic max-w-[200px] truncate">
                                    {batch.remarks || 'No remarks logged.'}
                                </td>
                                <td className="px-6 py-4">
                                    <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px] font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => window.location.href = `/keil/operations/reports/batch/${batch.id}`}>
                                        View <ArrowRight className="w-3 h-3" />
                                    </Button>
                                </td>
                            </tr>
                        )}
                    />
                    {batches.length === 0 && !loading && (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                            <Activity className="w-12 h-12 text-slate-200" />
                            <p className="text-sm font-bold">No collections sessions found for this period.</p>
                            <p className="text-[10px] font-medium uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Waiting for field logs...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
