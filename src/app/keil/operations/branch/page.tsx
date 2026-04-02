'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    MapPin, 
    Hash,
    X,
    Save,
    Lock,
    Loader2,
    Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TableView } from "@/components/ui/table-view";
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const BRANCH_API = `${API_BASE}/api/keil/operations/branches`;

export default function BranchRegistryPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const { hasPermission, loading: permissionLoading } = usePermission();

    const canView = hasPermission('hr_branch_view', 'view');
    const canCreate = hasPermission('hr_branch_view', 'create');
    const canEdit = hasPermission('hr_branch_view', 'edit');
    const canDelete = hasPermission('hr_branch_view', 'delete');
    
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');

    const [formData, setFormData] = useState({
        branch_code: '',
        branch_name: '',
        district_name: '',
        company_id: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        
        if (name === 'branch_code') {
            // Uppercase, Alphanumeric + Hyphen/Underscore, Max 20
            value = value.toUpperCase().replace(/[^A-Z0-9-_]/g, '').slice(0, 20);
        } else if (name === 'branch_name') {
            // Alphanumeric + Space/Ampersand/Hyphen, Max 50
            value = value.replace(/[^a-zA-Z0-9\s&\-]/g, '').slice(0, 50);
        } else if (name === 'district_name') {
            // Alphanumeric + Space, Max 40
            value = value.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 40);
        }
        
        setFormData(prev => ({ ...prev, [name]: value }));
    };

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
                await fetchBranches(coId);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${BRANCH_API}?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setBranches(data.data);
            }
        } catch (err) {
            console.error('Error fetching branches:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.branch_code || formData.branch_code.length < 2) {
            error("Branch Code is required (at least 2 characters).");
            return;
        }
        if (!formData.branch_name || formData.branch_name.length < 3) {
            error("Branch Name is required (at least 3 characters).");
            return;
        }
        if (formData.district_name && formData.district_name.length < 3) {
            error("District Name should be at least 3 characters if provided.");
            return;
        }

        const token = localStorage.getItem('token');
        setSubmitting(true);
        
        try {
            const url = editingId ? `${BRANCH_API}/${editingId}` : BRANCH_API;
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
                success(`Branch ${editingId ? 'updated' : 'registered'} successfully.`);
                setIsFormOpen(false);
                resetForm();
                fetchBranches(currentCompanyId);
            } else {
                error(data.message);
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (branch: any) => {
        setEditingId(branch.id);
        setFormData({
            branch_code: branch.branch_code,
            branch_name: branch.branch_name,
            district_name: branch.district_name || '',
            company_id: branch.company_id
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (await confirm({ message: "Are you sure you want to delete this branch? This might affect routes and HCEs associated with it." })) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${BRANCH_API}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    success("Branch deleted.");
                    fetchBranches(currentCompanyId);
                }
            } catch (err: any) {
                error(err.message);
            }
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            branch_code: '',
            branch_name: '',
            district_name: '',
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
            <p className="text-muted-foreground font-medium">You do not have permission to view the Branch Registry module.</p>
        </div>
    );

    return (
        <div className="md:p-6 space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Branch Registry</h1>
                    <p className="text-muted-foreground text-xs md:text-sm font-medium">Define organizational branches for operational zoning.</p>
                </div>
                {!isFormOpen && canCreate && (
                    <Button 
                        onClick={() => setIsFormOpen(true)} 
                        className="flex-1 md:flex-none h-10 md:h-11 bg-primary hover:bg-primary/90 text-white px-4 md:px-8 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 font-bold uppercase tracking-wider text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> 
                        <span className="hidden md:inline">Register New Branch</span>
                        <span className="md:hidden">Register</span>
                    </Button>
                )}
            </div>

            {isFormOpen ? (
                <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-300 overflow-hidden rounded-xl">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 py-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                                {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                {editingId ? 'Edit Branch' : 'Register New Branch'}
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => { setIsFormOpen(false); resetForm(); }} className="text-primary/60 hover:text-primary">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <CardDescription className="text-muted-foreground font-medium mt-1">Define organizational branches for operational zoning.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 px-8 pb-8">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Hash className="w-4 h-4 text-primary" /> Branch Code</label>
                                <Input required name="branch_code" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" placeholder="BR-001" value={formData.branch_code} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Building2 className="w-4 h-4 text-primary" /> Branch Name</label>
                                <Input required name="branch_name" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" placeholder="Main Branch" value={formData.branch_name} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><MapPin className="w-4 h-4 text-primary" /> District Name</label>
                                <Input name="district_name" className="h-10 rounded-md border-primary/20 bg-background font-bold text-sm" placeholder="Central District" value={formData.district_name} onChange={handleInputChange} />
                            </div>
                            <div className="col-span-full pt-4 flex justify-end gap-3 border-t border-primary/10">
                                <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => { setIsFormOpen(false); resetForm(); }}>Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-white px-8 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-10 font-bold uppercase tracking-wider">
                                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    {editingId ? (submitting ? 'Updating...' : 'Update Branch') : (submitting ? 'Registering...' : 'Register Branch')}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <TableView
                    title="Available Branches"
                    description="Organizational units for logistics and facility management."
                    headers={['Code', 'Branch Name', 'District', 'Actions']}
                    data={branches}
                    loading={loading}
                    searchFields={['branch_name', 'branch_code', 'district_name']}
                    renderRow={(b: any) => (
                        <tr key={b.id} className="hover:bg-primary/[0.02] transition-colors group border-b last:border-0 border-slate-100">
                            <td className="px-6 py-6">
                                <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-wider whitespace-nowrap">{b.branch_code}</span>
                            </td>
                            <td className="px-6 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-foreground text-sm">{b.branch_name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-6">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg w-fit border border-muted-foreground/10">
                                    <MapPin className="w-3.5 h-3.5 text-secondary" /> 
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase">{b.district_name || 'Not Defined'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {canEdit && (
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(b)} className="h-10 w-10 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-xl transition-all border border-transparent hover:border-primary/10">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} className="h-10 w-10 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all border border-transparent hover:border-destructive/10">
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
