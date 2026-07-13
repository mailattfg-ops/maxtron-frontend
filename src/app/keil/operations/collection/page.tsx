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
    ArrowDown,
    Download,
    Lock,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { exportToExcel } from '@/utils/export';
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const ROUTE_API = `${API_BASE}/api/keil/operations/routes`;
const ASSIGN_API = `${API_BASE}/api/keil/operations/assignments`;
const COLLECTION_API = `${API_BASE}/api/keil/operations/collections`;
const VEHICLE_API = `${API_BASE}/api/keil/fleet/vehicles`;

export default function DailyCollectionEntryPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const { hasPermission, loading: permissionLoading } = usePermission();

    const canView = hasPermission('prod_collection_view', 'view');
    const canCreate = hasPermission('prod_collection_view', 'create');
    
    const [loading, setLoading] = useState(false);
    const [routes, setRoutes] = useState<any[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState('');
    const [assignedHces, setAssignedHces] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [currentCompanyId, setCurrentCompanyId] = useState('');

    // Header Data
    const [headerData, setHeaderData] = useState({
        collection_date: new Date().toISOString().split('T')[0],
        route_id: '',
        registration_number: '',
        driver_name: '',
        supervisor_name: '',
        remarks: '',
        start_time: '',
        end_time: '',
        km_run: 0,
        collection_qty: 0,
        dc_qty: 0,
        nw_qty: 0,
        rd_qty: 0
    });

    // Entries state: Map of HCE ID -> Entry Details
    const [entries, setEntries] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
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

            // Fetch Routes
            const routeUrl = coId ? `${ROUTE_API}?company_id=${coId}` : ROUTE_API;
            const rRes = await fetch(routeUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const rData = await rRes.json();
            if (rData.success) setRoutes(rData.data || []);

            // Fetch Employees
            const employeeUrl = coId ? `${API_BASE}/api/keil/employees?company_id=${coId}` : `${API_BASE}/api/keil/employees`;
            const eRes = await fetch(employeeUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const eData = await eRes.json();
            if (eData.success && eData.data?.length > 0) {
                setEmployees(eData.data || []);
            } else {
                // Fallback to maxtron pool
                const mERes = await fetch(`${API_BASE}/api/maxtron/employees`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const mEData = await mERes.json();
                if (mEData.success) setEmployees(mEData.data || []);
            }

            // Fetch Vehicles
            const vehicleUrl = coId ? `${VEHICLE_API}?company_id=${coId}` : VEHICLE_API;
            const vRes = await fetch(vehicleUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const vData = await vRes.json();
            if (vData.success) setVehicles(vData.data || []);
        } catch (err) {
            console.error('Error fetching initial data:', err);
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
                const initialEntries: Record<string, any> = {};
                data.data.forEach((a: any) => {
                    initialEntries[a.hce_id] = {
                        hce_id: a.hce_id,
                        is_visited: false,
                        collection_amount: '',
                        note: '',
                        remark: '',
                        visit_status: 'Not Visited'
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
        
        let totalAmount = 0;
        visitedList.forEach(e => {
            totalAmount += (parseFloat(e.collection_amount) || 0);
        });

        const total_assigned = assignedHces.length;
        const total_visited = visitedList.length;

        // Breakdown
        const assigned_bedded = assignedHces.filter(a => a.keil_hces?.hce_category === 'Bedded').length;
        const assigned_others = total_assigned - assigned_bedded;

        const visited_bedded = visitedList.filter(e => {
            const h = assignedHces.find(a => a.hce_id === e.hce_id);
            return h?.keil_hces?.hce_category === 'Bedded';
        }).length;
        const visited_others = total_visited - visited_bedded;

        const missed_bedded = assigned_bedded - visited_bedded;
        const missed_others = assigned_others - visited_others;

        return {
            total_assigned,
            total_visited,
            assigned_bedded,
            assigned_others,
            visited_bedded,
            visited_others,
            missed_bedded,
            missed_others,
            totalAmount
        };
    };

    const handleSave = async () => {
        if (!headerData.route_id) {
            error("Please select a Logistical Route before committing high-volume data.");
            return;
        }
        if (!headerData.driver_name) {
            error("Please designate the Employee responsible for assigning / verifying the session.");
            return;
        }

        // Session Duration Validation
        if (headerData.start_time && headerData.end_time) {
            if (headerData.end_time <= headerData.start_time) {
                error("Overall Session 'End Time' must be later than its 'Start Time'.");
                return;
            }
        }

        const stats = calculateTotals();
        if (stats.total_visited === 0) {
            error("Please mark at least one HCE as visited.");
            return;
        }

        // Detailed Validation for visited HCEs
        const visitedEntries = Object.values(entries).filter(e => e.is_visited);

        if (await confirm({ message: "Confirm saving today's collection data?" })) {
            const token = localStorage.getItem('token');
            try {
                const payload = {
                    header: {
                        ...headerData,
                        total_hce_assigned: stats.total_assigned,
                        total_visited: stats.total_visited,
                        assigned_bedded: stats.assigned_bedded,
                        assigned_others: stats.assigned_others,
                        visited_bedded: stats.visited_bedded,
                        visited_others: stats.visited_others,
                        missed_bedded: stats.missed_bedded,
                        missed_others: stats.missed_others,
                        collection_qty: (stats.total_visited / (stats.total_assigned || 1)) * 100,
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

    const handleExport = async () => {
        if (assignedHces.length === 0) {
            error("No facility data available for export.");
            return;
        }

        const routeData = routes.find(r => r.id === selectedRouteId);
        const headers = ['Facility Name', 'Facility Code', 'Place', 'Visited', 'Visit Status', 'Collection Amount', 'Remark'];
        
        const rows = assignedHces.map(a => {
            const entry = entries[a.hce_id] || {};
            return [
                a.keil_hces?.hce_name || 'N/A',
                a.keil_hces?.hce_code || 'N/A',
                a.keil_hces?.hce_place || 'N/A',
                entry.is_visited ? 'YES' : 'NO',
                entry.visit_status || 'Not Visited',
                entry.collection_amount || 0,
                entry.remark || '-'
            ];
        });

        await exportToExcel({
            headers,
            rows,
            filename: `collection_manifest_${routeData?.route_name?.toLowerCase().replace(/\s+/g, '_')}_${headerData.collection_date}.xlsx`,
            sheetName: 'Session Manifest'
        });
        success("Collection manifest exported successfully.");
    };

    const totals = calculateTotals();

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!canView) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="p-6 rounded-full bg-primary/5 text-primary">
                <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground font-medium">You do not have permission to view the Collection Terminal.</p>
        </div>
    );

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700 bg-slate-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10 font-heading">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary rounded-lg text-white">
                            <Truck className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                            Collection Terminal
                        </h1>
                    </div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2 italic">
                        <Navigation className="w-3 h-3" /> Real-time Logistics Management & Waste Serialization.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
                    {selectedRouteId && (
                        <Button 
                            variant="outline" 
                            onClick={handleExport} 
                            className="flex-1 md:flex-none border-primary/20 text-primary hover:bg-primary/5 rounded-full px-6 h-11 font-bold uppercase tracking-wider active:scale-95 transition-all text-sm"
                        >
                            <Download className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Export Report</span><span className="sm:hidden">Export</span>
                        </Button>
                    )}
                    <div className="flex-1 md:flex-none bg-primary/5 px-4 py-2 rounded-full border border-primary/10 flex items-center justify-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Activity className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-primary/60 leading-none">Coverage</p>
                            <p className="text-xs font-black text-primary">{totals.total_visited} / {totals.total_assigned}</p>
                        </div>
                    </div>
                    {selectedRouteId && canCreate && (
                        <Button 
                            onClick={handleSave} 
                            className="flex-1 md:flex-none bg-primary hover:bg-primary/95 text-white rounded-full px-8 h-11 shadow-lg shadow-primary/20 font-bold uppercase tracking-wider active:scale-95 transition-all text-sm"
                        >
                            <Save className="w-4 h-4 mr-2" /> Commit Batch
                        </Button>
                    )}
                </div>
            </div>


            {/* Header Form */}
            <Card className="border-primary/20 shadow-xl overflow-hidden rounded-xl">
                <CardHeader className="bg-primary/5 border-b border-primary/10 py-6 px-8">
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
                            <Select value={selectedRouteId} onValueChange={(val) => handleRouteChange(val)}>
                                <SelectTrigger className="h-10 w-full border-primary/20 bg-background shadow-sm font-bold">
                                    <SelectValue placeholder="Switch to specific route" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-primary/20">
                                    {routes.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.route_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <Truck className="w-3 h-3 text-primary" /> Vehicle Registry
                            </label>
                            <Select value={headerData.registration_number} onValueChange={(val) => setHeaderData({ ...headerData, registration_number: val })}>
                                <SelectTrigger className="h-10 w-full border-primary/20 bg-background shadow-sm font-bold">
                                    <SelectValue placeholder="Select Vehicle" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-primary/20">
                                    {vehicles.map(v => (
                                        <SelectItem key={v.id} value={v.registration_number}>{v.registration_number}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <User className="w-3 h-3 text-primary" /> Employee Assigning
                            </label>
                            <Select value={headerData.driver_name} onValueChange={(val) => setHeaderData({ ...headerData, driver_name: val })}>
                                <SelectTrigger className="h-10 w-full border-primary/20 bg-background shadow-sm font-bold">
                                    <SelectValue placeholder="Select Employee" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-primary/20">
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.name}>{emp.name} ({emp.employee_code})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <User className="w-3 h-3 text-primary" /> Field Supervisor
                            </label>
                            <Select value={headerData.supervisor_name} onValueChange={(val) => setHeaderData({ ...headerData, supervisor_name: val })}>
                                <SelectTrigger className="h-10 w-full border-primary/20 bg-background shadow-sm font-bold">
                                    <SelectValue placeholder="Select Supervisor" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-primary/20">
                                    {employees.map(emp => (
                                        <SelectItem key={`sup-${emp.id}`} value={emp.name}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <Dna className="w-3 h-3 text-primary" /> Execution Remarks
                            </label>
                            <Input placeholder="Notes regarding session" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" value={headerData.remarks} onChange={e => setHeaderData({ ...headerData, remarks: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <Clock className="w-3 h-3 text-primary" /> Session Duration (Start - End)
                            </label>
                            <div className="flex gap-2">
                                <Input type="time" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" value={headerData.start_time} onChange={e => setHeaderData({ ...headerData, start_time: e.target.value })} />
                                <Input type="time" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" value={headerData.end_time} onChange={e => setHeaderData({ ...headerData, end_time: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <Navigation className="w-3 h-3 text-primary" /> Distance (KM Run)
                            </label>
                            <Input type="number" placeholder="KM" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" value={headerData.km_run || ''} onChange={e => setHeaderData({ ...headerData, km_run: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pl-1">
                                <Activity className="w-3 h-3 text-primary" /> Coverage / Completion
                            </label>
                            <div className="h-10 rounded-md border border-primary/20 bg-primary/5 flex items-center px-3 font-black text-primary text-sm">
                                {Math.round((totals.total_visited / (totals.total_assigned || 1)) * 100)}% Verified
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 lg:col-span-1">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">DC</label>
                                <Input type="number" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm text-center" value={headerData.dc_qty || ''} onChange={e => setHeaderData({ ...headerData, dc_qty: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">NW</label>
                                <Input type="number" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm text-center" value={headerData.nw_qty || ''} onChange={e => setHeaderData({ ...headerData, nw_qty: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">RB</label>
                                <Input type="number" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm text-center" value={headerData.rd_qty || ''} onChange={e => setHeaderData({ ...headerData, rd_qty: parseInt(e.target.value) || 0 })} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* HCE Entries Table */}
            {selectedRouteId ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                            <div>
                                <span className="text-[10px] font-black uppercase text-primary/60 tracking-wider">Gross Collection Amount</span>
                                <h3 className="text-2xl font-black text-primary mt-1">₹ {totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">₹</div>
                        </div>
                    </div>

                    <Card className="border-primary/10 shadow-sm overflow-hidden bg-white rounded-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="text-[10px] font-bold uppercase bg-primary text-primary-foreground">
                                    <tr>
                                        <th className="px-6 py-4 text-center">Visit</th>
                                        <th className="px-6 py-4">Managed Facility Detail</th>
                                        <th className="px-6 py-4">Visit Status</th>
                                        <th className="px-6 py-4">Collection Amount</th>
                                        <th className="px-6 py-4">Remark</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignedHces.map(a => {
                                        const isVisited = entries[a.hce_id]?.is_visited;
                                        const visitStatus = entries[a.hce_id]?.visit_status || 'Not Visited';
                                        return (
                                            <tr key={a.id} className={`group border-b border-slate-50 transition-all ${isVisited ? 'bg-primary/10/30' : 'hover:bg-slate-50'}`}>
                                                <td className="px-6 py-6 text-center">
                                                    <div 
                                                        onClick={() => {
                                                            const newVisited = !isVisited;
                                                            updateEntry(a.hce_id, 'is_visited', newVisited);
                                                            updateEntry(a.hce_id, 'visit_status', newVisited ? 'Visited' : 'Not Visited');
                                                        }}
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
                                                <td className="px-6 py-4 min-w-[200px]">
                                                    <Select 
                                                        value={visitStatus} 
                                                        onValueChange={(val) => {
                                                            updateEntry(a.hce_id, 'visit_status', val);
                                                            updateEntry(a.hce_id, 'is_visited', val !== 'Not Visited');
                                                        }}
                                                        disabled={!isVisited} 
                                                    >
                                                        <SelectTrigger className="h-8 w-full border-primary/20 bg-background shadow-sm font-bold text-xs">
                                                            <SelectValue placeholder="Visit Status" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white border-primary/20">
                                                            <SelectItem value="Visited">Visited</SelectItem>
                                                            <SelectItem value="Not Visited">Not Visited</SelectItem>
                                                            <SelectItem value="Visited – Door Closed">Visited – Door Closed</SelectItem>
                                                            <SelectItem value="Visited – No Waste">Visited – No Waste</SelectItem>
                                                            <SelectItem value="Visited – Road Block">Visited – Road Block</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Input 
                                                        type="number" 
                                                        min={0} 
                                                        step="0.01" 
                                                        disabled={!isVisited} 
                                                        placeholder="Amount (₹)" 
                                                        className="w-full h-8 text-xs font-bold bg-background border-primary/20 rounded-md focus:ring-1 ring-primary" 
                                                        value={entries[a.hce_id]?.collection_amount ?? ''} 
                                                        onChange={e => updateEntry(a.hce_id, 'collection_amount', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <textarea 
                                                        disabled={!isVisited} 
                                                        placeholder="Remark..." 
                                                        className="w-full h-12 text-[11px] font-medium bg-background border border-primary/20 rounded-md p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" 
                                                        value={entries[a.hce_id]?.remark || ''} 
                                                        onChange={e => updateEntry(a.hce_id, 'remark', e.target.value)} 
                                                    />
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
