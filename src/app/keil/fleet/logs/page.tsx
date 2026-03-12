'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Trash2, 
    Truck, 
    Calendar,
    Fuel,
    Navigation,
    User,
    AlertTriangle,
    AlertCircle,
    X,
    Save,
    MapPin,
    ArrowRight,
    Map,
    Clock,
    Wrench,
    CreditCard,
    Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableView } from "@/components/ui/table-view";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const LOGS_API = `${API_BASE}/api/keil/fleet/logs`;
const VEHICLE_API = `${API_BASE}/api/keil/fleet/vehicles`;

export default function VehicleDailyLogPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    
    const [logs, setLogs] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [currentCompanyId, setCurrentCompanyId] = useState('');

    const [filters, setFilters] = useState({
        vehicle_id: '',
        from: '',
        to: ''
    });

    const [formData, setFormData] = useState({
        vehicle_id: '',
        log_date: new Date().toISOString().split('T')[0],
        start_km: '',
        end_km: '',
        fuel_qty: '0',
        route_id: '',
        has_complaint: false,
        complaint_type: '',
        workshop_in_time: '',
        workshop_out_time: '',
        bill_amount: '0',
        remarks: '',
        company_id: ''
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
                    setFormData(prev => ({ ...prev, company_id: coId }));
                }
            }

            if (coId) {
                // Fetch Vehicles
                const vRes = await fetch(`${VEHICLE_API}?company_id=${coId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const vData = await vRes.json();
                if (vData.success) setVehicles(vData.data);

                // Fetch Routes
                const rRes = await fetch(`${API_BASE}/api/keil/operations/routes?company_id=${coId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const rData = await rRes.json();
                if (rData.success) setRoutes(rData.data);

                fetchLogs(coId);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async (coId: string, f?: any) => {
        const token = localStorage.getItem('token');
        const filterParams = new URLSearchParams({
            company_id: coId,
            ...(f || filters)
        }).toString();

        try {
            const res = await fetch(`${LOGS_API}?${filterParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setLogs(data.data);
        } catch (err) {
            console.error('Error fetching logs:', err);
        }
    };

    const handleSave = async () => {
        if (!formData.vehicle_id || !formData.start_km) {
            error("Vehicle and Start KM are required.");
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(LOGS_API, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                success("Daily log recorded!");
                setShowForm(false);
                fetchLogs(currentCompanyId);
                resetForm();
            } else {
                error(data.message);
            }
        } catch (err: any) {
            error(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (await confirm({ message: "Delete this log entry?" })) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${LOGS_API}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    success("Log deleted.");
                    fetchLogs(currentCompanyId);
                }
            } catch (err: any) {
                error(err.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            vehicle_id: '',
            log_date: new Date().toISOString().split('T')[0],
            start_km: '',
            end_km: '',
            fuel_qty: '0',
            route_id: '',
            has_complaint: false,
            complaint_type: '',
            workshop_in_time: '',
            workshop_out_time: '',
            bill_amount: '0',
            remarks: '',
            company_id: currentCompanyId
        });
    };

    const handleVehicleChange = (vId: string) => {
        const vehicle = vehicles.find(v => v.id === vId);
        setFormData(prev => ({ 
            ...prev, 
            vehicle_id: vId,
            start_km: vehicle ? vehicle.current_km : ''
        }));
    };

    return (
        <div className="md:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-2">
                        <Navigation className="w-8 h-8 text-primary" />
                        Logistics Telemetry
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">Daily Travel, Fuel & Fleet Health Logging</p>
                </div>
                <Button 
                    onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); }}
                    className="bg-primary hover:bg-primary/90 text-white px-8 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-10 font-bold uppercase tracking-wider"
                >
                    {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {showForm ? 'Cancel Entry' : 'Manual Log Entry'}
                </Button>
            </div>

            {showForm ? (
                <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-300">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl">
                        <CardTitle className="text-lg font-bold text-primary">
                            Telemetry Entry Module
                        </CardTitle>
                        <CardDescription className="text-muted-foreground font-medium">Capture real-time asset performance data</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground/80 pl-1">Target Vehicle</label>
                                <select 
                                    className="w-full h-10 px-3 rounded-md border border-primary/20 bg-background text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.vehicle_id} 
                                    onChange={e => handleVehicleChange(e.target.value)}
                                >
                                    <option value="">Select Fleet Asset</option>
                                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} ({v.current_km} KM)</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <label className="text-sm font-semibold text-foreground/80 pl-1">Date</label>
                                <Input type="date" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" value={formData.log_date} onChange={e => setFormData({ ...formData, log_date: e.target.value })} />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground/80 pl-1">Logistical Route</label>
                                <select 
                                    className="w-full h-10 px-3 rounded-md border border-primary/20 bg-background text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.route_id} 
                                    onChange={e => setFormData({ ...formData, route_id: e.target.value })}
                                >
                                    <option value="">Select Managed Route</option>
                                    {routes.map(r => <option key={r.id} value={r.id}>{r.route_name} {r.company?.company_name ? `(${r.company.company_name})` : ''}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5 bg-secondary/5 p-4 rounded-xl border border-secondary/10">
                                <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> Start Odometer
                                </label>
                                <Input type="number" step="0.01" className="h-10 rounded-md border-secondary/20 bg-white font-bold text-sm" value={formData.start_km} onChange={e => setFormData({ ...formData, start_km: e.target.value })} />
                            </div>

                            <div className="space-y-1.5 bg-secondary/5 p-4 rounded-xl border border-secondary/10">
                                <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> End Odometer
                                </label>
                                <Input type="number" step="0.01" className="h-10 rounded-md border-secondary/20 bg-white font-bold text-sm" placeholder="Current Reading" value={formData.end_km} onChange={e => setFormData({ ...formData, end_km: e.target.value })} />
                            </div>

                            <div className="space-y-1.5 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                                <label className="text-xs font-bold text-amber-700 flex items-center gap-2 uppercase tracking-widest">
                                    <Fuel className="w-3 h-3" /> Diesel Filled (Ltr)
                                </label>
                                <Input type="number" step="0.01" className="h-10 rounded-md border-amber-200 bg-white font-bold text-sm" value={formData.fuel_qty} onChange={e => setFormData({ ...formData, fuel_qty: e.target.value })} />
                            </div>

                            <div className="lg:col-span-3 space-y-1.5">
                                <label className="text-sm font-bold text-destructive flex items-center justify-between gap-2 pl-1">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> Vehicle Complaints
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold">{formData.has_complaint ? 'YES' : 'NO'}</span>
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded-md accent-destructive cursor-pointer"
                                            checked={formData.has_complaint}
                                            onChange={e => setFormData({ ...formData, has_complaint: e.target.checked })}
                                        />
                                    </div>
                                </label>
                                {formData.has_complaint && (
                                    <div className="mt-4 p-6 bg-rose-50/50 rounded-[2rem] border border-rose-100 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-rose-600">Type of Complaint</label>
                                                <Input placeholder="Engine, Suspension, etc." className="bg-white border-rose-100 h-10 rounded-xl font-bold" value={formData.complaint_type} onChange={e => setFormData({ ...formData, complaint_type: e.target.value })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-rose-600">Workshop Bill Amt (₹)</label>
                                                <Input type="number" className="bg-white border-rose-100 h-10 rounded-xl font-bold" value={formData.bill_amount} onChange={e => setFormData({ ...formData, bill_amount: e.target.value })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Workshop IN Time</label>
                                                <Input type="datetime-local" className="bg-white border-rose-100 h-10 rounded-xl font-bold" value={formData.workshop_in_time} onChange={e => setFormData({ ...formData, workshop_in_time: e.target.value })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Workshop OUT Time</label>
                                                <Input type="datetime-local" className="bg-white border-rose-100 h-10 rounded-xl font-bold" value={formData.workshop_out_time} onChange={e => setFormData({ ...formData, workshop_out_time: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-3 space-y-1.5">
                                <label className="text-sm font-semibold text-foreground/80 pl-1">Execution Remarks</label>
                                <Input placeholder="Additional field notes..." className="h-10 rounded-md border-primary/20 bg-background text-sm font-medium" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-primary/10 flex justify-end">
                            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white rounded-full px-10 h-11 shadow-lg shadow-primary/20 font-bold uppercase tracking-wider">
                                <Save className="w-4 h-4 mr-3" />
                                Synchronize Field Log
                              </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-primary/10 shadow-sm rounded-xl overflow-hidden bg-white animate-in fade-in duration-500">
                    <TableView 
                        title="Logitudinal Protocol"
                        description="Daily performance and resource consumption logs for the transport fleet."
                        searchFields={['vehicle.registration_number', 'remarks']}
                        headers={['Vehicle / Route / Date', 'Odometer Matrix', 'Diesel', 'Complaints & Workshop', 'Actions']}
                        data={logs}
                        loading={loading}
                        renderRow={(l: any) => (
                            <tr key={l.id} className="hover:bg-primary/[0.02] transition-colors border-b border-primary/5 last:border-0 group">
                                <td className="px-6 py-6 font-bold">
                                    <div className="flex flex-col gap-1.5">
                                         <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <span className="text-base font-bold text-foreground tracking-tight">{l.vehicle?.registration_number}</span>
                                        </div>
                                        {l.route?.route_name && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-secondary/5 rounded-lg w-fit border border-secondary/10">
                                                <MapPin className="w-3 h-3 text-secondary/60" />
                                                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                                                    {l.route.route_name}
                                                    {l.route.company?.company_name && (
                                                        <span className="text-secondary/40 border-l border-secondary/10 ml-2 pl-2 font-medium">{l.route.company.company_name}</span>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 pl-1 opacity-70">
                                            <Calendar className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-[11px] font-bold text-muted-foreground uppercase">{new Date(l.log_date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex flex-col gap-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Start KM</span>
                                                <div className="px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-lg">
                                                    <span className="text-sm font-bold text-primary">{parseFloat(l.start_km).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">End KM</span>
                                                <div className="px-3 py-1.5 bg-secondary/5 border border-secondary/10 rounded-lg">
                                                    <span className="text-sm font-bold text-secondary">{l.end_km ? parseFloat(l.end_km).toLocaleString() : '--'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {l.end_km && (
                                            <div className="flex items-center gap-2 bg-foreground/5 px-2 py-1 rounded-md border border-foreground/5 w-fit">
                                                <Navigation className="w-3 h-3 text-muted-foreground" />
                                                <span className="text-[10px] font-bold text-muted-foreground">Travel: <span className="text-foreground">{(l.end_km - l.start_km).toFixed(1)} KM</span></span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex flex-col items-center justify-center p-3 bg-amber-500/10 rounded-xl border border-amber-500/10 w-[80px]">
                                        <Fuel className="w-4 h-4 text-amber-600 mb-1" />
                                        <span className="text-lg font-bold text-amber-700 leading-none">{l.fuel_qty}</span>
                                        <span className="text-[8px] font-black text-amber-600/60 uppercase tracking-tighter mt-1">LITERS</span>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex flex-col gap-2">
                                        {l.has_complaint ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-1.5 rounded-xl w-fit border border-secondary/10">
                                                    <AlertCircle className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{l.complaint_type || 'Fault Logged'}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div className="flex flex-col p-2 bg-muted/30 rounded-lg border border-primary/5">
                                                        <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40">Timing</span>
                                                        <span className="text-[10px] font-bold opacity-70">
                                                            {l.workshop_in_time ? new Date(l.workshop_in_time).getHours() + ':' + String(new Date(l.workshop_in_time).getMinutes()).padStart(2, '0') : '??'} → {l.workshop_out_time ? new Date(l.workshop_out_time).getHours() + ':' + String(new Date(l.workshop_out_time).getMinutes()).padStart(2, '0') : '??'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col p-2 bg-secondary/10 rounded-lg border border-secondary/5">
                                                        <span className="text-[8px] font-black text-secondary uppercase opacity-70">Bill Amount</span>
                                                        <span className="text-[10px] font-black text-secondary leading-none mt-0.5">₹{l.bill_amount}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-primary/60 px-4 py-1.5 bg-primary/5 border border-primary/5 rounded-xl w-fit">
                                                <Check className="w-3 h-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Optimal Condition</span>
                                            </div>
                                        )}
                                        {l.remarks && (
                                            <div className="flex gap-2 items-start opacity-70 mt-1 pl-1">
                                                <Save className="w-3 h-3 text-muted-foreground mt-0.5 rotate-180" />
                                                <p className="text-[10px] font-bold text-muted-foreground italic leading-tight max-w-[200px]">{l.remarks}</p>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-6 text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)} className="hover:bg-secondary/10 text-secondary/40 hover:text-secondary rounded-xl transition-all h-10 w-10 border border-transparent hover:border-secondary/20">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        )}
                    />
                </Card>
            )}
        </div>
    );
}
