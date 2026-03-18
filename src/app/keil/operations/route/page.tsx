'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Code, 
    Activity, 
    ArrowRight,
    Map as MapIcon,
    Building2,
    X,
    Save,
    Lock,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TableView } from "@/components/ui/table-view";
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const ROUTE_API = `${API_BASE}/api/keil/operations/routes`;
const BRANCH_API = `${API_BASE}/api/keil/operations/branches`;

export default function RouteRegistryPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const { hasPermission, loading: permissionLoading } = usePermission();

    const canView = hasPermission('prod_product_view', 'view');
    const canCreate = hasPermission('prod_product_view', 'create');
    const canEdit = hasPermission('prod_product_view', 'edit');
    const canDelete = hasPermission('prod_product_view', 'delete');
    
    const [routes, setRoutes] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');

    const [formData, setFormData] = useState({
        route_name: '',
        route_code: '',
        route_type: '',
        branch_id: '',
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
                const [rRes, bRes] = await Promise.all([
                    fetch(`${ROUTE_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${BRANCH_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                const rData = await rRes.json();
                const bData = await bRes.json();
                if (rData.success) setRoutes(rData.data);
                if (bData.success) setBranches(bData.data);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoutes = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${ROUTE_API}?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRoutes(data.data);
            }
        } catch (err) {
            console.error('Error fetching routes:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.branch_id) {
            error("Please select a branch for this route.");
            return;
        }

        const token = localStorage.getItem('token');
        
        try {
            const url = editingId ? `${ROUTE_API}/${editingId}` : ROUTE_API;
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
                success(`Route ${editingId ? 'updated' : 'created'} successfully.`);
                setIsFormOpen(false);
                resetForm();
                fetchRoutes(currentCompanyId);
            } else {
                error(data.message);
            }
        } catch (err: any) {
            error(err.message);
        }
    };

    const handleEdit = (route: any) => {
        setEditingId(route.id);
        setFormData({
            route_name: route.route_name,
            route_code: route.route_code,
            route_type: route.route_type || '',
            branch_id: route.branch_id || '',
            company_id: route.company_id
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (await confirm({ message: "Are you sure you want to delete this route?" })) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${ROUTE_API}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    success("Route deleted.");
                    fetchRoutes(currentCompanyId);
                }
            } catch (err: any) {
                error(err.message);
            }
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            route_name: '',
            route_code: '',
            route_type: '',
            branch_id: '',
            company_id: currentCompanyId
        });
    };

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!canView) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="p-6 rounded-full bg-primary/5 text-primary">
                <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground font-medium">You do not have permission to view the Route Registry module.</p>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-primary tracking-tight">Route Registry</h1>
                    <p className="text-muted-foreground text-sm font-medium">Define and Manage Logistical Collection Routes</p>
                </div>
                {!isFormOpen && canCreate && (
                    <Button 
                        onClick={() => setIsFormOpen(true)} 
                        className="bg-primary hover:bg-primary/90 text-white px-8 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-10 font-bold uppercase tracking-wider"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Define New Route
                    </Button>
                )}
            </div>

            {isFormOpen ? (
                <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-300">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                                {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                {editingId ? 'Edit Collection Route' : 'Define New Collection Route'}
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => { setIsFormOpen(false); resetForm(); }} className="text-primary/60 hover:text-primary">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <CardDescription className="text-muted-foreground font-medium mt-1">Determine the structural details for this logistical route.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 px-8 pb-8">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Code className="w-4 h-4 text-primary" /> Route Code</label>
                                <Input required className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" placeholder="RT-A1" value={formData.route_code} onChange={e => setFormData({ ...formData, route_code: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><MapIcon className="w-4 h-4 text-primary" /> Route Name</label>
                                <Input required className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" placeholder="Main Highway Route" value={formData.route_name} onChange={e => setFormData({ ...formData, route_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Activity className="w-4 h-4 text-primary" /> Route Type</label>
                                <Input className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" placeholder="Urban / Rural / Industrial" value={formData.route_type} onChange={e => setFormData({ ...formData, route_type: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Building2 className="w-4 h-4 text-primary" /> Branch Name</label>
                                <select 
                                    required
                                    className="flex h-10 w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.branch_id}
                                    onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-full pt-4 flex justify-end gap-3 border-t border-primary/10">
                                <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => { setIsFormOpen(false); resetForm(); }}>Cancel</Button>
                                <Button type="submit" className="px-8 bg-primary hover:bg-primary/90 text-white rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-10 font-bold uppercase tracking-wider"><Save className="w-4 h-4 mr-2" /> {editingId ? 'Update Route' : 'Create Route'}</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-primary/10 shadow-sm rounded-xl overflow-hidden bg-white animate-in fade-in duration-500">
                    <TableView
                        title="Defined Routes"
                        description="List of all logistics routes mapped by branch and type."
                        headers={['Route Code', 'Route Name', 'Type', 'Branch', 'Actions']}
                        data={routes}
                        loading={loading}
                        searchFields={['route_name', 'route_code', 'route_type', 'branch_name']}
                        renderRow={(r: any) => (
                            <tr key={r.id} className="hover:bg-indigo-50/50 transition-colors group border-b last:border-0 border-slate-100">
                                <td className="px-6 py-4">
                                    <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg uppercase tracking-wider">{r.route_code}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-bold text-slate-700">{r.route_name}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">{r.route_type}</td>
                                <td className="px-6 py-4 font-medium text-indigo-600">{r.branch_name}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {canEdit && (
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} className="h-8 w-8 text-indigo-500 hover:text-indigo-700">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="h-8 w-8 text-rose-500 hover:text-rose-700">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {canEdit && (
                                            <Button variant="outline" size="sm" className="h-8 gap-1 ml-2 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => window.location.href = `/keil/operations/assignments?route_id=${r.id}`}>
                                                Manage HCEs <ArrowRight className="w-3 h-3" />
                                            </Button>
                                        )}
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
