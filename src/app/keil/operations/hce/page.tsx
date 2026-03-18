'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    MapPin, 
    Phone, 
    Clock, 
    Building2,
    Activity,
    Mail,
    X,
    Save,
    User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TableView } from "@/components/ui/table-view";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const HCE_API = `${API_BASE}/api/keil/operations/hces`;
const BRANCH_API = `${API_BASE}/api/keil/operations/branches`;

export default function HCERegistryPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    
    const [hces, setHces] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    const [activeTab, setActiveTab] = useState('basic');

    const [formData, setFormData] = useState({
        hce_name: '',
        hce_code: '',
        branch_id: '',
        hce_place: '',
        address: '',
        contact_person: '',
        contact_mobile: '',
        email_id: '',
        collection_type: 'Daily',
        open_from: '09:00',
        open_to: '18:00',
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
                const [hRes, bRes] = await Promise.all([
                    fetch(`${HCE_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${BRANCH_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                const hData = await hRes.json();
                const bData = await bRes.json();
                if (hData.success) setHces(hData.data);
                if (bData.success) setBranches(bData.data);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHces = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${HCE_API}?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setHces(data.data);
            }
        } catch (err) {
            console.error('Error fetching HCEs:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        
        try {
            const url = editingId ? `${HCE_API}/${editingId}` : HCE_API;
            const method = editingId ? 'PUT' : 'POST';
            
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
                success(`HCE ${editingId ? 'updated' : 'registered'} successfully.`);
                setIsFormOpen(false);
                resetForm();
                fetchHces(currentCompanyId);
            } else {
                error(data.message);
            }
        } catch (err: any) {
            error(err.message);
        }
    };

    const handleEdit = (hce: any) => {
        setEditingId(hce.id);
        setFormData({
            hce_name: hce.hce_name,
            hce_code: hce.hce_code,
            branch_id: hce.branch_id || '',
            hce_place: hce.hce_place || '',
            address: hce.address || '',
            contact_person: hce.contact_person || '',
            contact_mobile: hce.contact_mobile || '',
            email_id: hce.email_id || '',
            collection_type: hce.collection_type || 'Daily',
            open_from: hce.open_from || '09:00',
            open_to: hce.open_to || '18:00',
            company_id: hce.company_id
        });
        setIsFormOpen(true);
        setActiveTab('basic');
    };

    const handleDelete = async (id: string) => {
        if (await confirm({ message: "Are you sure you want to delete this HCE record?" })) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${HCE_API}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    success("HCE record deleted.");
                    fetchHces(currentCompanyId);
                }
            } catch (err: any) {
                error(err.message);
            }
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setActiveTab('basic');
        setFormData({
            hce_name: '',
            hce_code: '',
            branch_id: '',
            hce_place: '',
            address: '',
            contact_person: '',
            contact_mobile: '',
            email_id: '',
            collection_type: 'Daily',
            open_from: '09:00',
            open_to: '18:00',
            company_id: currentCompanyId
        });
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-primary tracking-tight">HCE Registry</h1>
                    <p className="text-muted-foreground text-sm font-medium">Manage Health Care Establishments and Waste Collection Logistics</p>
                </div>
                {!isFormOpen && (
                    <Button 
                        onClick={() => setIsFormOpen(true)} 
                        className="bg-primary hover:bg-primary/90 text-white px-8 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-10 font-bold uppercase tracking-wider"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Register New HCE
                    </Button>
                )}
            </div>

            {isFormOpen ? (
                <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-300">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                                    {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    {editingId ? 'Edit HCE Record' : 'Register New Health Care Establishment'}
                                </CardTitle>
                                <CardDescription className="text-muted-foreground font-medium mt-1">Enter essential details for facility coordination and waste collection logistics.</CardDescription>
                            </div>
                            <div className="flex bg-primary/5 p-1.5 rounded-2xl border border-primary/10 pointer-events-none">
                                {[
                                    { id: 'basic', label: 'Facility Info', icon: Building2 },
                                    { id: 'ops', label: 'Contact & Hours', icon: Clock },
                                ].map(tab => (
                                    <div
                                        key={tab.id}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                            activeTab === tab.id 
                                            ? 'bg-white text-primary shadow-lg scale-105' 
                                            : 'text-primary/60'
                                        }`}
                                    >
                                        <tab.icon className="w-3.5 h-3.5" />
                                        {tab.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 px-8 pb-8">
                        <div className="space-y-8">
                            {activeTab === 'basic' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Activity className="w-4 h-4 text-primary" /> HCE Code</label>
                                        <Input required className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" placeholder="HCE-001" value={formData.hce_code} onChange={e => setFormData({ ...formData, hce_code: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 lg:col-span-2">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Building2 className="w-4 h-4 text-primary" /> HCE Name</label>
                                        <Input required className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" placeholder="City General Hospital" value={formData.hce_name} onChange={e => setFormData({ ...formData, hce_name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><MapPin className="w-4 h-4 text-primary" /> Branch Name</label>
                                        <select 
                                            className="flex h-10 w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                                            value={formData.branch_id}
                                            onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                                        >
                                            <option value="">Select Branch</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><MapPin className="w-4 h-4 text-primary" /> HCE Place</label>
                                        <Input className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" placeholder="Downtown" value={formData.hce_place} onChange={e => setFormData({ ...formData, hce_place: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 lg:col-span-3">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><MapPin className="w-4 h-4 text-primary" /> Full Address</label>
                                        <Input className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" placeholder="123 Medical Road, Area Code" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ops' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-right duration-500">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><User className="w-4 h-4 text-primary" /> Contact Person</label>
                                        <Input className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" placeholder="Admin Head" value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Phone className="w-4 h-4 text-primary" /> Contact Mobile</label>
                                        <Input className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" placeholder="+123 456 7890" value={formData.contact_mobile} onChange={e => setFormData({ ...formData, contact_mobile: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Mail className="w-4 h-4 text-primary" /> Email ID</label>
                                        <Input className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" type="email" placeholder="contact@hce.com" value={formData.email_id} onChange={e => setFormData({ ...formData, email_id: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Clock className="w-4 h-4 text-primary" /> Collection Type</label>
                                        <select 
                                            className="flex h-10 w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                                            value={formData.collection_type}
                                            onChange={e => setFormData({ ...formData, collection_type: e.target.value })}
                                        >
                                            <option value="Daily">Daily</option>
                                            <option value="Alternate days">Alternate days</option>
                                            <option value="Thrice a Week">Thrice a Week</option>
                                            <option value="Once a Week">Once a Week</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Clock className="w-4 h-4 text-primary" /> Open From</label>
                                        <Input className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" type="time" value={formData.open_from} onChange={e => setFormData({ ...formData, open_from: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Clock className="w-4 h-4 text-primary" /> Open To</label>
                                        <Input className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" type="time" value={formData.open_to} onChange={e => setFormData({ ...formData, open_to: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            <div className="pt-8 flex justify-between items-center border-t border-primary/10">
                                <div className="flex gap-3">
                                    {activeTab !== 'basic' && (
                                        <Button 
                                            variant="outline" 
                                            onClick={() => setActiveTab('basic')}
                                            className="rounded-full px-8 h-10 font-bold border-primary/20 hover:bg-primary/5"
                                        >
                                            Back
                                        </Button>
                                    )}
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => { setIsFormOpen(false); resetForm(); }}
                                        className="rounded-full px-4 text-slate-400 hover:text-rose-500 font-medium h-10"
                                    >
                                        Cancel Entry
                                    </Button>
                                </div>

                                <div className="flex gap-3">
                                    {activeTab !== 'ops' ? (
                                        <Button 
                                            onClick={() => {
                                                if (!formData.hce_code || !formData.hce_name) {
                                                    error("HCE Code and Name are required.");
                                                    return;
                                                }
                                                setActiveTab('ops');
                                            }}
                                            className="bg-primary hover:bg-primary/95 text-white rounded-full px-10 h-11 shadow-lg font-bold"
                                        >
                                            Next Section
                                        </Button>
                                    ) : (
                                        <Button 
                                            onClick={handleSubmit} 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 h-11 shadow-lg shadow-emerald-100 font-bold flex items-center transition-all hover:scale-105"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {editingId ? 'Update Record' : 'Register Facility'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <TableView
                    title="Enrolled Facilities"
                    description="Comprehensive directory of health care units and diagnostic centers."
                    headers={['HCE Code', 'Name', 'Branch', 'Place', 'Collection', 'Hours', 'Actions']}
                    data={hces}
                    loading={loading}
                    searchFields={['hce_name', 'hce_code', 'hce_place', 'branch_name']}
                    renderRow={(h: any) => (
                        <tr key={h.id} className="hover:bg-primary/[0.02] transition-colors group border-b last:border-0 border-slate-100">
                            <td className="px-6 py-6">
                                <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-wider whitespace-nowrap">{h.hce_code}</span>
                            </td>
                            <td className="px-6 py-6">
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-foreground text-sm">{h.hce_name}</span>
                                    <span className="text-[10px] text-muted-foreground/70 truncate max-w-[200px] font-medium italic">{h.address}</span>
                                </div>
                            </td>
                            <td className="px-6 py-6 text-sm font-bold text-secondary">{h.branch_name}</td>
                            <td className="px-6 py-6 text-sm font-bold text-secondary">{h.hce_place}</td>
                            <td className="px-6 py-6">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-secondary/10 text-secondary px-3 py-1.5 rounded-full border border-secondary/10">{h.collection_type}</span>
                            </td>
                            <td className="px-6 py-6 text-[11px] font-bold text-muted-foreground">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-lg w-fit border border-muted-foreground/10">
                                    <Clock className="w-3 h-3 " /> {h.open_from} - {h.open_to}
                                </div>
                            </td>
                            <td className="px-6 py-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(h)} className="h-10 w-10 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-xl transition-all border border-transparent hover:border-primary/10">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)} className="h-10 w-10 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all border border-transparent hover:border-destructive/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    )}
                />
            )}
        </div>
    );
}
