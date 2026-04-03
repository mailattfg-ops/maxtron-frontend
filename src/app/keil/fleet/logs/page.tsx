'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Edit,
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
    Check,
    Lock,
    Loader2,
    Activity,
    Download
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableView } from "@/components/ui/table-view";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePermission } from '@/hooks/usePermission';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";


const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const LOGS_API = `${API_BASE}/api/keil/fleet/logs`;
const VEHICLE_API = `${API_BASE}/api/keil/fleet/vehicles`;

export default function VehicleDailyLogPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const { hasPermission, loading: permissionLoading } = usePermission();

    const canView = hasPermission('fleet_log_view', 'view');
    const canCreate = hasPermission('fleet_log_view', 'create');
    const canEdit = hasPermission('fleet_log_view', 'edit');
    const canDelete = hasPermission('fleet_log_view', 'delete');
    
    const [logs, setLogs] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    const [saving, setSaving] = useState(false);

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
        fuel_qty: '',
        route_id: '',
        has_complaint: false,
        complaint_type: '',
        workshop_in_time: '',
        workshop_out_time: '',
        bill_amount: '',
        remarks: '',
        company_id: '',
        schedule_time: '',
        start_time: '',
        is_running: true
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (currentCompanyId) {
            fetchLogs(currentCompanyId);
        }
    }, [filters, currentCompanyId]);

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
        // Validation Suite
        if (!formData.vehicle_id) {
            error("Target Vehicle is required.");
            return;
        }
        if (!formData.log_date) {
            error("Date is required.");
            return;
        }
        if (!formData.route_id) {
            error("Logistical Route is required.");
            return;
        }
        if (formData.start_km === '' || parseFloat(formData.start_km) < 0) {
            error("Target Asset's Start Odometer is required.");
            return;
        }
        if (formData.end_km === '' || parseFloat(formData.end_km) < 0) {
            error("Target Asset's End Odometer is required.");
            return;
        }
        
        const start = parseFloat(formData.start_km);
        const end = parseFloat(formData.end_km);
        if (end < start) {
            error("End Odometer cannot be less than Start Odometer.");
            return;
        }

        if (formData.fuel_qty === '' || parseFloat(formData.fuel_qty) < 0) {
            error("Diesel quantity is required (can be 0 if not filled).");
            return;
        }

        if (formData.has_complaint) {
            if (!formData.complaint_type) {
                error("Type of Complaint is required.");
                return;
            }
            if (formData.bill_amount === '' || parseFloat(formData.bill_amount) < 0) {
                error("Workshop Bill Amount is required (can be 0 if zero-cost repair).");
                return;
            }
            if (!formData.workshop_in_time) {
                error("Workshop IN Time is required.");
                return;
            }
            if (!formData.workshop_out_time) {
                error("Workshop OUT Time is required.");
                return;
            }

            if (new Date(formData.workshop_out_time) <= new Date(formData.workshop_in_time)) {
                error("Workshop OUT Time must be later than IN Time.");
                return;
            }
        }

        const payload = {
            ...formData,
            fuel_qty: formData.fuel_qty || 0,
            bill_amount: formData.bill_amount || 0,
            workshop_in_time: formData.workshop_in_time || null,
            workshop_out_time: formData.workshop_out_time || null,
            complaint_type: formData.complaint_type || null,
            schedule_time: formData.schedule_time || null,
            start_time: formData.start_time || null,
            is_running: formData.is_running
        };

        const token = localStorage.getItem('token');
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${LOGS_API}/${editingId}` : LOGS_API;

        setSaving(true);
        try {
            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                success(editingId ? "Log entry updated!" : "Daily log recorded!");
                setShowForm(false);
                setEditingId(null);
                fetchLogs(currentCompanyId);
                resetForm();
            } else {
                error(data.message);
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        if (logs.length === 0) {
            error("No data available to export.");
            return;
        }

        const ExcelJS = (await import('exceljs')).default;
        const saveAs = (await import('file-saver')).saveAs;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Vehicle Daily Logs');

        // Headers
        const headerRow = worksheet.addRow([
            'DATE', 'VEHICLE', 'ROUTE', 'SCHEDULE TIME', 'STARTING TIME', 'RUNNING STATUS',
            'START KM', 'END KM', 'DISTANCE (KM)', 'FUEL (LTR)',
            'COMPLAINT', 'TYPE', 'WORKSHOP IN', 'WORKSHOP OUT', 'BILL AMT', 'REMARKS'
        ]);

        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // slate-800
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Add Data
        logs.forEach(l => {
            const rowData = [
                new Date(l.log_date).toLocaleDateString(),
                l.vehicle?.registration_number || 'N/A',
                l.route?.route_name || 'N/A',
                l.schedule_time || '-',
                l.start_time || '-',
                l.is_running ? 'YES' : 'NO',
                l.start_km,
                l.end_km || '-',
                l.end_km ? (l.end_km - l.start_km).toFixed(2) : '0',
                l.fuel_qty || 0,
                l.has_complaint ? 'YES' : 'NO',
                l.complaint_type || '-',
                l.workshop_in_time ? new Date(l.workshop_in_time).toLocaleString() : '-',
                l.workshop_out_time ? new Date(l.workshop_out_time).toLocaleString() : '-',
                l.bill_amount || 0,
                l.remarks || ''
            ];
            const r = worksheet.addRow(rowData);
            r.eachCell(cell => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Column widths
        worksheet.columns.forEach(col => { col.width = 18; });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `keil_fleet_telemetry_${new Date().toISOString().split('T')[0]}.xlsx`);
        success("Telemetry report exported successfully.");
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

    const handleEdit = (l: any) => {
        setEditingId(l.id);
        setFormData({
            vehicle_id: l.vehicle_id,
            log_date: new Date(l.log_date).toISOString().split('T')[0],
            start_km: l.start_km.toString(),
            end_km: l.end_km ? l.end_km.toString() : '',
            fuel_qty: l.fuel_qty.toString(),
            route_id: l.route_id || '',
            has_complaint: l.has_complaint,
            complaint_type: l.complaint_type || '',
            workshop_in_time: l.workshop_in_time ? new Date(l.workshop_in_time).toISOString().slice(0, 16) : '',
            workshop_out_time: l.workshop_out_time ? new Date(l.workshop_out_time).toISOString().slice(0, 16) : '',
            bill_amount: l.bill_amount ? l.bill_amount.toString() : '',
            remarks: l.remarks || '',
            company_id: l.company_id,
            schedule_time: l.schedule_time || '',
            start_time: l.start_time || '',
            is_running: l.is_running ?? true
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            vehicle_id: '',
            log_date: new Date().toISOString().split('T')[0],
            start_km: '',
            end_km: '',
            fuel_qty: '',
            route_id: '',
            has_complaint: false,
            complaint_type: '',
            workshop_in_time: '',
            workshop_out_time: '',
            bill_amount: '',
            remarks: '',
            company_id: currentCompanyId,
            schedule_time: '',
            start_time: '',
            is_running: true
        });
        setEditingId(null);
    };

    const handleVehicleChange = (vId: string) => {
        const vehicle = vehicles.find(v => v.id === vId);
        setFormData(prev => ({ 
            ...prev, 
            vehicle_id: vId,
            start_km: vehicle ? vehicle.current_km : ''
        }));
    };

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!canView) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="p-6 rounded-full bg-primary/5 text-primary">
                <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground font-medium">You do not have permission to view the Logistics Telemetry module.</p>
        </div>
    );

    return (
        <div className="md:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10 font-heading">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight flex items-center gap-2">
                        <Navigation className="w-8 h-8 text-primary" />
                        Logistics Telemetry
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm font-medium italic">Daily Travel, Fuel & Fleet Health Logging</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
                    {canCreate && (
                        <Button 
                            onClick={() => { 
                                setShowForm(!showForm); 
                                if(!showForm) resetForm(); 
                                else setEditingId(null);
                            }}
                            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white px-8 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-11 font-bold uppercase tracking-wider active:scale-95"
                        >
                            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {showForm ? 'Cancel Entry' : 'Manual Log Entry'}
                        </Button>
                    )}
                    <Button 
                        variant="outline"
                        onClick={handleExport}
                        disabled={logs.length === 0}
                        className="flex-1 md:flex-none border-primary/20 text-primary hover:bg-primary/5 px-8 rounded-full h-11 font-bold uppercase tracking-wider active:scale-95"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                    </Button>
                </div>
            </div>

            {!showForm && (
                <div className="bg-white p-4 rounded-xl border border-primary/10 shadow-sm flex flex-col md:flex-row items-end gap-4 animate-in slide-in-from-top-2 duration-500">
                    <div className="flex-1 w-full space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Filter by Vehicle</label>
                        <Select 
                            value={filters.vehicle_id || 'all'} 
                            onValueChange={val => setFilters(prev => ({ ...prev, vehicle_id: val }))}
                        >
                            <SelectTrigger className="w-full h-10 border-primary/20 bg-background text-sm font-bold focus:ring-0 focus:ring-offset-0 focus:border-primary/20">
                                <SelectValue placeholder="All Assets" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-primary/20">
                                <SelectItem value="all">All Fleet Assets</SelectItem>
                                {vehicles.map(v => (
                                    <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">From Date</label>
                        <Input 
                            type="date" 
                            className="h-10 rounded-md border-primary/20 bg-background font-bold text-xs" 
                            value={filters.from} 
                            onChange={e => setFilters(prev => ({ ...prev, from: e.target.value }))} 
                        />
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">To Date</label>
                        <Input 
                            type="date" 
                            className="h-10 rounded-md border-primary/20 bg-background font-bold text-xs" 
                            value={filters.to} 
                            onChange={e => setFilters(prev => ({ ...prev, to: e.target.value }))} 
                        />
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={() => setFilters({ vehicle_id: 'all', from: '', to: '' })}
                        className="text-muted-foreground hover:text-primary font-bold text-xs uppercase h-10 px-6 rounded-full border border-dashed border-primary/10"
                    >
                        <X className="w-4 h-4 mr-2" /> Reset
                    </Button>
                </div>
            )}

            {showForm ? (
                <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-300">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl py-6">
                        <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                            <Navigation className="w-5 h-5" />
                            {editingId ? 'Modify Field Telemetry' : 'Telemetry Entry Module'}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground font-medium">Capture real-time asset performance data</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground/80 pl-1">Target Vehicle *</label>
                                <Select 
                                    value={formData.vehicle_id} 
                                    onValueChange={val => handleVehicleChange(val)}
                                >
                                    <SelectTrigger className="w-full h-10 border-primary/20 bg-background text-sm font-medium focus:ring-0 focus:ring-offset-0 focus:border-primary/20">
                                        <SelectValue placeholder="Select Fleet Asset" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-primary/20">
                                        {vehicles.map(v => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.registration_number} ({v.current_km} KM)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <label className="text-sm font-semibold text-foreground/80 pl-1">Date *</label>
                                <Input required type="date" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none" value={formData.log_date} onChange={e => setFormData({ ...formData, log_date: e.target.value })} />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground/80 pl-1">Logistical Route *</label>
                                <Select 
                                    value={formData.route_id} 
                                    onValueChange={val => setFormData({ ...formData, route_id: val })}
                                >
                                    <SelectTrigger className="w-full h-10 border-primary/20 bg-background text-sm font-medium focus:ring-0 focus:ring-offset-0 focus:border-primary/20">
                                        <SelectValue placeholder="Select Managed Route" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-primary/20">
                                        {routes.map(r => (
                                            <SelectItem key={r.id} value={r.id}>
                                                {r.route_name} {r.company?.company_name ? `(${r.company.company_name})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                            </div>

                            <div className="space-y-1.5 bg-secondary/5 p-4 rounded-xl border border-secondary/10">
                                <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> Start Odometer <span className="text-rose-500">*</span>
                                </label>
                                <Input required type="number" min={0} step="0.01" className="h-10 rounded-md border-secondary/20 bg-white font-bold text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-secondary/20 focus:outline-none" value={formData.start_km} onChange={e => setFormData({ ...formData, start_km: e.target.value })} />
                            </div>

                            <div className="space-y-1.5 bg-secondary/5 p-4 rounded-xl border border-secondary/10">
                                <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> End Odometer <span className="text-rose-500">*</span>
                                </label>
                                <Input required type="number" min={0} step="0.01" className="h-10 rounded-md border-secondary/20 bg-white font-bold text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-secondary/20 focus:outline-none" value={formData.end_km} onChange={e => setFormData({ ...formData, end_km: e.target.value })} />
                            </div>

                            <div className="space-y-1.5 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Schedule Time
                                </label>
                                <Input type="time" className="h-10 rounded-md border-primary/20 bg-white font-bold text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none" value={formData.schedule_time} onChange={e => setFormData({ ...formData, schedule_time: e.target.value })} />
                            </div>

                            <div className="space-y-1.5 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Starting Time
                                </label>
                                <Input type="time" className="h-10 rounded-md border-primary/20 bg-white font-bold text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                            </div>

                            <div className="space-y-1.5 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Running Status *
                                </label>
                                <Select 
                                    value={formData.is_running ? 'yes' : 'no'} 
                                    onValueChange={val => setFormData({ ...formData, is_running: val === 'yes' })}
                                >
                                    <SelectTrigger className="w-full h-10 border-primary/20 bg-background text-sm font-bold focus:ring-0 focus:ring-offset-0 focus:border-primary/20">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-primary/20">
                                        <SelectItem value="yes">YES (Active)</SelectItem>
                                        <SelectItem value="no">NO (Down)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                                <label className="text-xs font-bold text-amber-700 flex items-center gap-2 uppercase tracking-widest">
                                    <Fuel className="w-3 h-3" /> Diesel Filled (Ltr) <span className="text-rose-500">*</span>
                                </label>
                                <Input type="number" min={0} step="0.01" className="h-10 rounded-md border-amber-200 bg-white font-bold text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-amber-200 focus:outline-none" value={formData.fuel_qty} onChange={e => setFormData({ ...formData, fuel_qty: e.target.value })} />
                            </div>

                            <div className="lg:col-span-3 space-y-1.5">
                                <label className="text-sm font-bold text-destructive flex items-center justify-between gap-2 pl-1">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> Vehicle Complaints
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold">{formData.has_complaint ? 'YES' : 'NO'}</span>
                                        <Checkbox 
                                            checked={formData.has_complaint}
                                            onCheckedChange={(checked: boolean) => setFormData({ ...formData, has_complaint: !!checked })}
                                        />
                                    </div>
                                </label>
                                {formData.has_complaint && (
                                    <div className="mt-4 p-6 bg-rose-50/50 rounded-[2rem] border border-rose-100 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-rose-600">Type of Complaint *</label>
                                                <Input required placeholder="Engine, Suspension, etc." className="bg-white border-rose-100 h-10 rounded-xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-200 focus:outline-none" value={formData.complaint_type} onChange={e => setFormData({ ...formData, complaint_type: e.target.value })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-rose-600">Workshop Bill Amt (₹) <span className="text-rose-500 text-[10px]">*</span></label>
                                                <Input required type="number" min={0} className="bg-white border-rose-100 h-10 rounded-xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-200 focus:outline-none" value={formData.bill_amount} onChange={e => setFormData({ ...formData, bill_amount: e.target.value })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Workshop IN Time *</label>
                                                <Input required type="datetime-local" className="bg-white border-rose-100 h-10 rounded-xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-200 focus:outline-none" value={formData.workshop_in_time} onChange={e => setFormData({ ...formData, workshop_in_time: e.target.value })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Workshop OUT Time *</label>
                                                <Input required type="datetime-local" className="bg-white border-rose-100 h-10 rounded-xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-200 focus:outline-none" value={formData.workshop_out_time} onChange={e => setFormData({ ...formData, workshop_out_time: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                             <div className="lg:col-span-3 space-y-1.5">
                                 <label className="text-sm font-semibold text-foreground/80 pl-1">Execution Remarks</label>
                                 <Input placeholder="Additional field notes..." className="h-10 rounded-md border-primary/20 bg-background text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
                             </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-primary/10 flex justify-end">
                            <Button onClick={handleSave} disabled={saving} className="w-full bg-primary hover:bg-primary/90 text-white rounded-full px-10 h-11 shadow-lg shadow-primary/20 font-bold uppercase tracking-wider disabled:opacity-70 disabled:cursor-not-allowed">
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                                        Synchronizing Data...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-3" />
                                        Synchronize Field Log
                                      </>
                                )}
                              </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <TableView 
                    title="Logitudinal Protocol"
                    description="Daily performance and resource consumption logs for the transport fleet."
                    searchFields={['vehicle.registration_number', 'remarks']}
                    headers={['Vehicle / Route / Date', 'Operational Timing', 'Odometer Matrix', 'Diesel', 'Complaints & Workshop', 'Actions']}
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
                                        <div className={`ml-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${l.is_running ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}`}>
                                            {l.is_running ? 'Running' : 'Not Running'}
                                        </div>
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
                                    <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 w-fit">
                                        <Clock className="w-3.5 h-3.5 text-primary/60" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest leading-none">Schedule Time</span>
                                            <span className="text-xs font-bold text-primary leading-tight">{l.schedule_time ? l.schedule_time.slice(0, 5) : '--:--'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-secondary/5 px-3 py-1.5 rounded-lg border border-secondary/10 w-fit">
                                        <Clock className="w-3.5 h-3.5 text-secondary/60" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-secondary/40 uppercase tracking-widest leading-none">Starting Time</span>
                                            <span className="text-xs font-bold text-secondary leading-tight">{l.start_time ? l.start_time.slice(0, 5) : '--:--'}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-1 md:px-6 py-6">
                                <div className="flex flex-col gap-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Start KM</span>
                                            <div className="px-1 md:px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-lg">
                                                <span className="text-sm font-bold text-primary">{parseFloat(l.start_km).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">End KM</span>
                                            <div className="px-1 md:px-3 py-1.5 bg-secondary/5 border border-secondary/10 rounded-lg">
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
                                <div className="flex items-center justify-end gap-2">
                                    {canEdit && (
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(l)} className="hover:bg-primary/10 text-primary/40 hover:text-primary rounded-xl transition-all h-10 w-10 border border-transparent hover:border-primary/20">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)} className="hover:bg-secondary/10 text-secondary/40 hover:text-secondary rounded-xl transition-all h-10 w-10 border border-transparent hover:border-secondary/20">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                />
            )}
        </div>
    );
}
