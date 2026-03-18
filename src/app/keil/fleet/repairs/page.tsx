'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Trash2, 
    Truck, 
    Calendar,
    Settings,
    Wrench,
    User,
    Clock,
    X,
    Save,
    CreditCard,
    CheckCircle2,
    PlayCircle,
    MapPin,
    ArrowRight,
    Edit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableView } from "@/components/ui/table-view";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const REPAIRS_API = `${API_BASE}/api/keil/fleet/repairs`;
const VEHICLE_API = `${API_BASE}/api/keil/fleet/vehicles`;

export default function VehicleRepairLogPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    
    const [repairs, setRepairs] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');

    const [formData, setFormData] = useState({
        vehicle_id: '',
        driver_id: '',
        route_id: '',
        log_date: new Date().toISOString().split('T')[0],
        entry_date: new Date().toISOString().substring(0, 16),
        exit_date: '',
        repair_description: '',
        cost: '0',
        status: 'Pending',
        remarks: '',
        workshop_name: '',
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

                // Fetch Employees
                const eRes = await fetch(`${API_BASE}/api/maxtron/employees?company_id=${coId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const eData = await eRes.json();
                if (eData.success) setEmployees(eData.data);

                // Fetch Routes
                const rRes = await fetch(`${API_BASE}/api/keil/operations/routes?company_id=${coId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const rData = await rRes.json();
                if (rData.success) setRoutes(rData.data);

                fetchRepairs(coId);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRepairs = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${REPAIRS_API}?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setRepairs(data.data);
        } catch (err) {
            console.error('Error fetching repairs:', err);
        }
    };

    const handleSave = async () => {
        // Validation Suite
        if (!formData.log_date) {
            error("Main Log Date is required.");
            return;
        }
        if (!formData.vehicle_id) {
            error("Target Vehicle is required.");
            return;
        }
        if (!formData.driver_id) {
            error("Driver assignment is required.");
            return;
        }
        if (!formData.route_id) {
            error("Route identification is required.");
            return;
        }
        if (!formData.entry_date) {
            error("Repair Start (From) Date is required.");
            return;
        }
        if (!formData.repair_description) {
            error("Repair Description is required.");
            return;
        }

        // Logical checks
        if (formData.exit_date && new Date(formData.exit_date) < new Date(formData.entry_date)) {
            error("Repair 'To' Date cannot be earlier than 'From' Date.");
            return;
        }

        // Non-negative check
        if (parseFloat(formData.cost) < 0) {
            error("Maintenance Cost cannot be negative.");
            return;
        }

        const token = localStorage.getItem('token');
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${REPAIRS_API}/${editingId}` : REPAIRS_API;

        try {
            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                success(editingId ? "Repair log updated!" : "Repair record saved!");
                setShowForm(false);
                setEditingId(null);
                fetchRepairs(currentCompanyId);
                resetForm();
            } else {
                error(data.message);
            }
        } catch (err: any) {
            error(err.message);
        }
    };

    const handleEdit = (r: any) => {
        setEditingId(r.id);
        setFormData({
            ...r,
            log_date: r.log_date || new Date().toISOString().split('T')[0],
            entry_date: r.entry_date ? new Date(r.entry_date).toISOString().substring(0, 16) : '',
            exit_date: r.exit_date ? new Date(r.exit_date).toISOString().substring(0, 16) : '',
            company_id: currentCompanyId
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (await confirm({ message: "Delete this repair entry?" })) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${REPAIRS_API}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    success("Record deleted.");
                    fetchRepairs(currentCompanyId);
                }
            } catch (err: any) {
                error(err.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            vehicle_id: '',
            driver_id: '',
            route_id: '',
            log_date: new Date().toISOString().split('T')[0],
            entry_date: new Date().toISOString().substring(0, 16),
            exit_date: '',
            repair_description: '',
            cost: '0',
            status: 'Pending',
            remarks: '',
            workshop_name: '',
            company_id: currentCompanyId
        });
    };

    return (
        <div className="md:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
                        <Wrench className="w-8 h-8 text-rose-600" />
                        Maintenance Protocol
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workshop Registry & Repair Lifecycle Management</p>
                </div>
                <Button 
                    onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl px-6 h-12 shadow-lg shadow-rose-100 font-black uppercase tracking-widest"
                >
                    {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {showForm ? 'Cancel Operation' : 'Log Workshop Visit'}
                </Button>
            </div>

            {showForm ? (
                <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <CardHeader className="bg-rose-50 border-b border-rose-100 px-8 py-6">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-rose-600">
                            Maintenance Execution Module
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                             <div className="space-y-1.5 flex flex-col">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Date *</label>
                                <Input required type="date" className="h-12 rounded-xl font-bold border-slate-100 bg-slate-50/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-400 focus:outline-none" value={formData.log_date} onChange={e => setFormData({ ...formData, log_date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Vehicle No *</label>
                                <select 
                                    required
                                    className="w-full h-12 px-4 rounded-xl font-bold border-slate-100 bg-slate-50/50 outline-none shadow-inner focus:border-rose-400" 
                                    value={formData.vehicle_id} 
                                    onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                                >
                                    <option value="">Select Asset</option>
                                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Driver Name *</label>
                                <select 
                                    required
                                    className="w-full h-12 px-4 rounded-xl font-bold border-slate-100 bg-slate-50/50 outline-none shadow-inner focus:border-rose-400" 
                                    value={formData.driver_id} 
                                    onChange={e => setFormData({ ...formData, driver_id: e.target.value })}
                                >
                                    <option value="">Select Driver</option>
                                    {employees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Route Name *</label>
                                <select 
                                    required
                                    className="w-full h-12 px-4 rounded-xl font-bold border-slate-100 bg-slate-50/50 outline-none shadow-inner focus:border-rose-400" 
                                    value={formData.route_id} 
                                    onChange={e => setFormData({ ...formData, route_id: e.target.value })}
                                >
                                    <option value="">Select Route</option>
                                    {routes.map(r => <option key={r.id} value={r.id}>{r.route_name} ({r.company?.company_name})</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 pl-1">Repair From Date *</label>
                                <Input required type="datetime-local" className="h-12 rounded-xl font-bold border-rose-100 bg-rose-50/20 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-400 focus:outline-none" value={formData.entry_date} onChange={e => setFormData({ ...formData, entry_date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 pl-1">Repair To Date</label>
                                <Input type="datetime-local" className="h-12 rounded-xl font-bold border-rose-100 bg-rose-50/20 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-400 focus:outline-none" value={formData.exit_date} onChange={e => setFormData({ ...formData, exit_date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Repair Status</label>
                                <select 
                                    className="w-full h-12 px-4 rounded-xl font-bold border-slate-100 bg-slate-50/50 outline-none shadow-inner focus:border-rose-400" 
                                    value={formData.status} 
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                            <div className="space-y-1.5 bg-rose-50/30 p-4 rounded-2xl border border-rose-100">
                                <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                                    <CreditCard className="w-3 h-3" /> Amount (₹)
                                </label>
                                <Input type="number" min={0} className="h-12 rounded-xl font-black text-xl border-none bg-white shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-400 focus:outline-none" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} />
                            </div>

                            <div className="lg:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Description of repair works *</label>
                                <Input required placeholder="Describe the job in detail..." className="h-12 rounded-xl font-bold border-slate-100 bg-white shadow-inner focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-400 focus:outline-none" value={formData.repair_description} onChange={e => setFormData({ ...formData, repair_description: e.target.value })} />
                            </div>
                            <div className="lg:col-span-1 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Remarks</label>
                                <Input placeholder="Additional notes..." className="h-12 rounded-xl font-bold border-slate-100 bg-white shadow-inner focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-400 focus:outline-none" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
                            </div>
                        </div>

                        <div className="mt-10 flex justify-end">
                            <Button onClick={handleSave} className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl px-10 h-14 shadow-xl shadow-rose-100 font-black uppercase tracking-widest">
                                <Save className="w-5 h-5 mr-3" />
                                {editingId ? 'Update Record' : 'Log Maintenance Session'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white p-4 animate-in fade-in duration-500">
                    <TableView 
                        title="Active Workshop Registry"
                        description="Current and historical repair logs for transport assets."
                        searchFields={['vehicle.registration_number', 'repair_description', 'workshop']}
                        headers={['Vehicle / Route / Date', 'Operational Details', 'Repair Log', 'Financial Impact', 'Actions']}
                        data={repairs}
                        loading={loading}
                        renderRow={(r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
                                <td className="px-6 py-8">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-lg">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <span className="text-base font-black text-slate-700 tracking-tight">{r.vehicle?.registration_number}</span>
                                        </div>
                                        {r.route?.route_name && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                    {r.route.route_name}
                                                    {r.route.company?.company_name && (
                                                        <span className="text-slate-300 border-l border-slate-200 ml-2 pl-2 font-bold">{r.route.company.company_name}</span>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 pl-1 opacity-50">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(r.log_date || r.entry_date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 w-fit">
                                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                                <User className="w-3 h-3" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Driver</span>
                                                <span className="text-[10px] font-bold text-slate-600">{r.driver?.name || 'Unassigned'}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 px-3 py-2 bg-rose-50/30 rounded-xl border border-rose-50 w-fit">
                                            <span className={`text-[8px] font-black uppercase tracking-widest ${
                                                r.status === 'Completed' ? 'text-emerald-500' :
                                                r.status === 'In Progress' ? 'text-amber-500' :
                                                'text-rose-500'
                                            }`}>
                                                {r.status}
                                            </span>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                                <Clock className="w-3 h-3 opacity-30" />
                                                {new Date(r.entry_date).getHours()}:{String(new Date(r.entry_date).getMinutes()).padStart(2,'0')} 
                                                <ArrowRight className="w-2.5 h-2.5 opacity-20" />
                                                {r.exit_date ? `${new Date(r.exit_date).getHours()}:${String(new Date(r.exit_date).getMinutes()).padStart(2,'0')}` : '??'}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="max-w-[250px] space-y-2">
                                        <p className="text-[11px] font-bold text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                                            "{r.repair_description}"
                                        </p>
                                        {r.remarks && (
                                            <div className="flex items-start gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60 pl-1">
                                                <Save className="w-2.5 h-2.5 rotate-180" /> 
                                                {r.remarks}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-xl group-hover:scale-105 transition-transform">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Financial Impact</span>
                                        <span className="text-lg font-black text-white tracking-tight">₹{parseFloat(r.cost).toLocaleString()}</span>
                                        <div className="w-8 h-1 bg-rose-600 rounded-full mt-2" />
                                    </div>
                                </td>
                                <td className="px-6 py-6 text-right">
                                    <div className="flex justify-end gap-2 transition-all">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} className="hover:bg-indigo-50 text-indigo-600 rounded-xl h-10 w-10 border border-transparent hover:border-indigo-100">
                                            <Edit className="w-5 h-5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="hover:bg-rose-50 text-rose-600 rounded-xl h-10 w-10 border border-transparent hover:border-rose-100">
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    />
                </Card>
            )}
        </div>
    );
}
