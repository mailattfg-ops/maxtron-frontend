'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Edit,
    Trash2, 
    Fuel,
    Calendar,
    Truck,
    Hash,
    IndianRupee,
    TrendingUp,
    AlertCircle,
    X,
    Save,
    Users,
    Lock,
    Loader2,
    Download,
    Filter
} from 'lucide-react';
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
const FUEL_API = `${API_BASE}/api/keil/fleet/fuel-fillings`;
const VEHICLE_API = `${API_BASE}/api/keil/fleet/vehicles`;

export default function FuelFillingPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const { hasPermission, loading: permissionLoading } = usePermission();

    const [fillings, setFillings] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
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
        indent_number: '',
        liters: '',
        rate: '',
        amount: '',
        efficiency: '',
        difference: '',
        remarks: '',
        company_id: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (currentCompanyId) {
            fetchFillings();
        }
    }, [filters, currentCompanyId]);

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
                    setFormData(prev => ({ ...prev, company_id: coId }));
                }
            }

            if (coId) {
                const vRes = await fetch(`${VEHICLE_API}?company_id=${coId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const vData = await vRes.json();
                if (vData.success) setVehicles(vData.data);
                
                fetchFillings(coId);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFillings = async (coId?: string) => {
        const token = localStorage.getItem('token');
        const filterParams = new URLSearchParams({
            company_id: coId || currentCompanyId,
            ...filters
        }).toString();

        try {
            const res = await fetch(`${FUEL_API}?${filterParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setFillings(data.data);
        } catch (err) {
            console.error('Error fetching fuel fillings:', err);
        }
    };

    const handleAmountCalc = (l: string, r: string) => {
        const litersNum = parseFloat(l) || 0;
        const rateNum = parseFloat(r) || 0;
        if (litersNum && rateNum) {
            setFormData(prev => ({ ...prev, amount: (litersNum * rateNum).toFixed(2) }));
        }
    };

    const handleSave = async () => {
        if (!formData.vehicle_id || !formData.log_date || !formData.liters) {
            error("Please fill all required fields");
            return;
        }

        const token = localStorage.getItem('token');
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${FUEL_API}/${editingId}` : FUEL_API;

        setSaving(true);
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
                success(editingId ? "Fuel record updated!" : "Fuel record saved!");
                setShowForm(false);
                setEditingId(null);
                fetchFillings();
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

    const resetForm = () => {
        setFormData({
            vehicle_id: '',
            log_date: new Date().toISOString().split('T')[0],
            indent_number: '',
            liters: '',
            rate: '',
            amount: '',
            efficiency: '',
            difference: '',
            remarks: '',
            company_id: currentCompanyId
        });
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        if (await confirm({ message: "Delete this fuel record?" })) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${FUEL_API}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    success("Record deleted.");
                    fetchFillings();
                }
            } catch (err: any) {
                error(err.message);
            }
        }
    };

    const handleExport = async () => {
        if (fillings.length === 0) {
            error("No data available to export.");
            return;
        }

        const ExcelJS = (await import('exceljs')).default;
        const saveAs = (await import('file-saver')).saveAs;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Fuel Filling Report');

        worksheet.addRow(['FUEL FILLING REPORT - LOGISTICS TELEMETRY']).font = { bold: true, size: 14 };
        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            'DATE', 'VEHICLE NO', 'INDENT NO', 'LITERS (LTR)', 'RATE', 'TOTAL AMOUNT', 'EFFICIENCY (EQ)', 'DIFFERENCE (DIFF)', 'REMARKS'
        ]);

        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        fillings.forEach(f => {
            worksheet.addRow([
                new Date(f.log_date).toLocaleDateString(),
                f.vehicle?.registration_number || 'N/A',
                f.indent_number || '-',
                f.liters,
                f.rate,
                f.amount,
                f.efficiency || '-',
                f.difference || '-',
                f.remarks || ''
            ]);
        });
        
        // Add Totals Row
        const totalLiters = fillings.reduce((sum, f) => sum + (parseFloat(f.liters) || 0), 0);
        const totalAmount = fillings.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
        
        worksheet.addRow([]); // Empty row
        const footerRow = worksheet.addRow([
            'TOTAL', '', '', totalLiters, '', totalAmount, '', '', ''
        ]);
        
        footerRow.eachCell((cell: any) => {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // slate-100
        });

        worksheet.columns.forEach(col => { col.width = 15; });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Fuel_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight flex items-center gap-2">
                        <Fuel className="w-8 h-8" />
                        Fuel Filling Management
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium italic">Logistics Telemetry - Fuel Consumption & Efficiency tracking</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); }}
                        className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 font-bold uppercase tracking-wider"
                    >
                        {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {showForm ? 'Cancel' : 'New Fuel Entry'}
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={handleExport}
                        className="border-primary/20 text-primary font-bold uppercase tracking-wider rounded-full px-6"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                </div>
            </div>

            {showForm ? (
                <Card className="border-primary/20 shadow-xl overflow-hidden">
                    <CardHeader className="bg-primary/5 py-4 px-6 border-b border-primary/10">
                        <CardTitle className="text-lg font-bold text-primary">Capture Fuel Telemetry</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Log Date *</label>
                                <Input type="date" value={formData.log_date} onChange={e => setFormData({...formData, log_date: e.target.value})} className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Vehicle Number *</label>
                                <Select value={formData.vehicle_id} onValueChange={v => setFormData({...formData, vehicle_id: v})}>
                                    <SelectTrigger className="h-11 rounded-lg border-primary/20 bg-white font-bold">
                                        <SelectValue placeholder="Select Vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicles.map(v => (
                                            <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Indent Number</label>
                                <Input value={formData.indent_number} onChange={e => setFormData({...formData, indent_number: e.target.value})} placeholder="IND-XXXXX" className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Liters (LTR) *</label>
                                <Input type="number" step="0.01" value={formData.liters} onChange={e => {setFormData({...formData, liters: e.target.value}); handleAmountCalc(e.target.value, formData.rate);}} className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Rate (₹/Ltr)</label>
                                <Input type="number" step="0.01" value={formData.rate} onChange={e => {setFormData({...formData, rate: e.target.value}); handleAmountCalc(formData.liters, e.target.value);}} className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Total Amount (₹)</label>
                                <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Efficiency (EQ)</label>
                                <Input type="number" step="0.01" value={formData.efficiency} onChange={e => setFormData({...formData, efficiency: e.target.value})} className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Difference (DIFF)</label>
                                <Input type="number" step="0.01" value={formData.difference} onChange={e => setFormData({...formData, difference: e.target.value})} className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-full px-8 font-bold uppercase tracking-widest">Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-primary text-white rounded-full px-10 h-11 font-black uppercase tracking-wider shadow-lg shadow-primary/20">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                Synchronize Record
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    <Card className="border-primary/10 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-primary/5 flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[200px] space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Vehicle Filter</label>
                                <Select value={filters.vehicle_id} onValueChange={v => setFilters({...filters, vehicle_id: v})}>
                                    <SelectTrigger className="h-10 rounded-lg bg-white border-primary/10 font-bold text-xs">
                                        <SelectValue placeholder="All Fleet Assets" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Fleet Assets</SelectItem>
                                        {vehicles.map(v => (
                                            <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">From Date</label>
                                <Input type="date" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} className="h-10 rounded-lg bg-white border-primary/10 font-bold text-xs" />
                            </div>
                            <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">To Date</label>
                                <Input type="date" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} className="h-10 rounded-lg bg-white border-primary/10 font-bold text-xs" />
                            </div>
                            <Button variant="ghost" onClick={() => setFilters({vehicle_id: 'all', from: '', to: ''})} className="text-primary font-black uppercase text-[10px] tracking-widest h-10 px-4">
                                <X className="w-3 h-3 mr-1" /> Reset
                            </Button>
                        </div>

                        <TableView 
                            data={fillings}
                            loading={loading}
                            headers={['DATE', 'VEHICLE NO', 'INDENT NO', 'QUANTITY', 'RATE / AMOUNT', 'EFFICIENCY HUB', 'ACTIONS']}
                            searchFields={['indent_number', 'vehicle.registration_number']}
                            renderRow={(f) => (
                                <tr key={f.id} className="hover:bg-primary/[0.02] transition-colors border-b border-primary/5 last:border-0">
                                    <td className="px-6 py-4 font-bold text-sm text-slate-700">
                                        {new Date(f.log_date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <span className="font-black text-slate-800 tracking-tight">{f.vehicle?.registration_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 bg-slate-100 w-fit px-3 py-1 rounded-full border border-slate-200">
                                            <Hash className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{f.indent_number || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-black text-amber-600 leading-none">{f.liters}</span>
                                            <span className="text-[8px] font-bold text-amber-600/60 uppercase tracking-tighter mt-1">LITERS (LTR)</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                                <span>₹{f.rate}</span>
                                                <span className="text-[8px] opacity-40">/ LTR</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm font-black text-slate-800">
                                                <IndianRupee className="w-3 h-3" />
                                                <span>{f.amount}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">EQ</span>
                                                <span className="text-xs font-black text-emerald-600">{f.efficiency || '--'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">DIFF</span>
                                                <span className={`text-xs font-black ${parseFloat(f.difference) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {f.difference || '--'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="w-8 h-8 rounded-full border-primary/10 text-primary hover:bg-primary/5"
                                                onClick={() => {
                                                    setEditingId(f.id);
                                                    setFormData({
                                                        ...f,
                                                        log_date: new Date(f.log_date).toISOString().split('T')[0]
                                                    });
                                                    setShowForm(true);
                                                }}
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="w-8 h-8 rounded-full border-rose-100 text-rose-500 hover:bg-rose-50"
                                                onClick={() => handleDelete(f.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        />
                        
                        {/* Summary Footer */}
                        <div className="p-6 bg-slate-50/50 border-t border-primary/5 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex flex-wrap gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Count</p>
                                    <p className="text-2xl font-black text-slate-800 tracking-tight">{new Set(fillings.map(f => f.vehicle_id)).size} Vehicles</p>
                                </div>
                                <div className="space-y-1 border-l border-slate-200 pl-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fuel Volume</p>
                                    <div className="flex items-baseline gap-1">
                                        <p className="text-2xl font-black text-amber-600 tracking-tight">
                                            {fillings.reduce((sum, f) => sum + (parseFloat(f.liters) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                        </p>
                                        <span className="text-[10px] font-bold text-amber-600/60 uppercase">LTR</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 min-w-[280px] group hover:bg-primary/10 transition-all duration-300">
                                <div className="flex justify-between items-center gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em]">Gross Expenditure</p>
                                        <div className="flex items-center gap-2">
                                            <IndianRupee className="w-5 h-5 text-primary" />
                                            <p className="text-3xl font-black text-primary tracking-tight">
                                                {fillings.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                        <IndianRupee className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
