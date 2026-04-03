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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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

    const canView = hasPermission('prod_route_view', 'view');
    const canCreate = hasPermission('prod_route_view', 'create');
    const canEdit = hasPermission('prod_route_view', 'edit');
    const canDelete = hasPermission('prod_route_view', 'delete');
    
    const [routes, setRoutes] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        
        if (name === 'route_name') {
            // Letters, Numbers, Spaces, Hyphen (Max 50)
            value = value.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 50);
        } else if (name === 'route_code') {
            // Uppercase Alphanumeric, Hyphen (Max 10)
            value = value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
        } else if (name === 'route_type') {
            // Letters, Spaces (Max 50)
            value = value.replace(/[^a-zA-Z\s]/g, '').slice(0, 50);
        }
        
        setFormData(prev => ({ ...prev, [name]: value }));
    };

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
        
        const routeName = (formData.route_name || '').trim();
        const routeCode = (formData.route_code || '').trim().toUpperCase();

        if (!routeName || !routeCode) {
            error("Route Name and Code are required.");
            return;
        }

        if (routeCode.length < 2) {
            error("Route Code must be at least 2 characters.");
            return;
        }

        if (routeName.length < 3) {
            error("Route Name must be at least 3 characters.");
            return;
        }

        if (!formData.branch_id) {
            error("Please select an organization Branch for this logistical route.");
            return;
        }

        const token = localStorage.getItem('token');
        setSubmitting(true);
        
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
                // Meaningful Toast interception
                if (data.message?.includes('duplicate key value violates unique constraint') || data.message?.includes('keil_routes_route_code_company_id_key')) {
                    error("Duplicate Route Code: This code is already registered for your branch. Please use a unique route code.");
                } else {
                    error(data.message || "An unexpected error occurred while saving the route.");
                }
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setSubmitting(false);
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
                } else {
                    error(data.message || "Failed to delete route. It may have active assignments.");
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
        <div className="md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Route Registry</h1>
                    <p className="text-muted-foreground text-xs md:text-sm font-medium">Define and Manage Logistical Collection Routes</p>
                </div>
                {!isFormOpen && canCreate && (
                    <Button 
                        onClick={() => setIsFormOpen(true)} 
                        className="flex-1 md:flex-none h-10 md:h-11 bg-primary hover:bg-primary/90 text-white px-4 md:px-8 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 font-bold uppercase tracking-wider text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> 
                        <span className="hidden md:inline">Define New Route</span>
                        <span className="md:hidden">Define Route</span>
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
                                <Input 
                                    name="route_code"
                                    required 
                                    className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" 
                                    placeholder="RT-A1" 
                                    maxLength={10}
                                    value={formData.route_code} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><MapIcon className="w-4 h-4 text-primary" /> Route Name</label>
                                <Input 
                                    name="route_name"
                                    required 
                                    className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" 
                                    placeholder="Main Highway Route" 
                                    maxLength={30}
                                    value={formData.route_name} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Activity className="w-4 h-4 text-primary" /> Route Type</label>
                                <Input 
                                    name="route_type"
                                    className="h-10 rounded-md border-primary/20 bg-background text-sm font-bold" 
                                    placeholder="Urban / Rural / Industrial" 
                                    maxLength={50}
                                    value={formData.route_type} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Building2 className="w-4 h-4 text-primary" /> Branch Name</label>
                                <Select value={formData.branch_id} onValueChange={(val) => setFormData({ ...formData, branch_id: val })}>
                                    <SelectTrigger className="h-10 w-full border-primary/20 bg-background shadow-sm font-bold">
                                        <SelectValue placeholder="Select Branch" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-primary/20">
                                        {branches.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-full pt-4 flex justify-end gap-3 border-t border-primary/10">
                                <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => { setIsFormOpen(false); resetForm(); }}>Cancel</Button>
                                <Button type="submit" disabled={submitting} className="px-8 bg-primary hover:bg-primary/90 text-white rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-10 font-bold uppercase tracking-wider">
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            SAVING...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" /> 
                                            {editingId ? 'Update Route' : 'Create Route'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <TableView
                    title="Defined Routes"
                    description="List of all logistics routes mapped by branch and type."
                    headers={['Route Code', 'Route Name', 'Type', 'Branch', 'Actions']}
                    data={routes}
                    loading={loading}
                    searchFields={['route_name', 'route_code', 'route_type', 'branch_name']}
                    renderRow={(r: any) => (
                        <tr key={r.id} className="hover:bg-primary/5 transition-colors group border-b last:border-0 border-slate-100">
                            <td className="px-6 py-4">
                                <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-wider">{r.route_code}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-bold text-slate-700">{r.route_name}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">{r.route_type}</td>
                            <td className="px-6 py-4 font-medium text-primary">{r.branch_name}</td>
                            <td className="px-6 py-4">
                                <div className="flex md:justify-end items-center gap-2">
                                    {canEdit && (
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} className="h-8 w-8 text-primary hover:text-primary/80">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="h-8 w-8 text-rose-500 hover:text-rose-700">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {canEdit && (
                                        <Button variant="outline" size="sm" className="h-8 gap-1 ml-2 text-xs border-primary/20 text-primary hover:bg-primary/5" onClick={() => window.location.href = `/keil/operations/assignments?route_id=${r.id}`}>
                                            Manage HCEs <ArrowRight className="w-3 h-3" />
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
