'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tag, Plus, Edit, Trash2, X, Save, Search, Code, FileText } from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const RM_TYPE_API = `${API_BASE}/api/maxtron/rm-type-codes`;

export default function RMTypeCodePage() {
    const { hasPermission } = usePermission();
    const canManage = hasPermission('admin_permissions', 'view'); // Using admin permission for this section
    
    const [codes, setCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    const { success, error, info } = useToast();
    const { confirm } = useConfirm();
    
    const pathname = usePathname();
    const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

    const [formData, setFormData] = useState({
        code: '',
        name: '',
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
            if (compData.success) {
                const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
                if (activeCo) {
                    coId = activeCo.id;
                    setCurrentCompanyId(coId);
                    setFormData(prev => ({ ...prev, company_id: coId }));
                }
            }
            fetchCodes(coId);
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCodes = async (coId?: string) => {
        const token = localStorage.getItem('token');
        const targetCoId = coId || currentCompanyId;
        try {
            const res = await fetch(`${RM_TYPE_API}?company_id=${targetCoId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCodes(data.data);
            }
        } catch (err) {
            console.error('Error fetching RM type codes:', err);
        }
    };

    const saveCode = async () => {
        const normalizedCode = (formData.code || '').trim().toUpperCase();
        const normalizedName = (formData.name || '').trim();

        if (!normalizedCode || !normalizedName) {
            error('Please fill both Code and Name.');
            return;
        }

        if (normalizedCode.length < 2 || normalizedCode.length > 10) {
            error('Code must be 2-10 characters long.');
            return;
        }
        if (normalizedName.length < 3 || normalizedName.length > 50) {
            error('Name must be 3-50 characters long.');
            return;
        }

        const nameRegex = /^[a-zA-Z0-9\s-]+$/;
        if (!nameRegex.test(normalizedCode) || !nameRegex.test(normalizedName)) {
            error('Only letters, numbers, spaces, and hyphens are allowed.');
            return;
        }

        setSubmitting(true);
        const token = localStorage.getItem('token');
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${RM_TYPE_API}/${editingId}` : RM_TYPE_API;

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
                success(editingId ? 'RM code updated!' : 'RM code added!');
                setShowForm(false);
                setEditingId(null);
                fetchCodes();
                resetForm();
            } else {
                error(data.error || data.message || 'Error occurred');
            }
        } catch (err: any) {
            error(err.message || 'Network error.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            company_id: currentCompanyId
        });
    };

    const handleEdit = (rec: any) => {
        setEditingId(rec.id);
        setFormData({
            code: rec.code,
            name: rec.name,
            company_id: rec.company_id
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            message: 'Are you sure you want to delete this RM type code?',
            type: 'danger'
        });
        if (!isConfirmed) return;
        
        const token = localStorage.getItem('token');
        setSubmitting(true);
        try {
            const res = await fetch(`${RM_TYPE_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                success('RM code deleted.');
                fetchCodes();
            } else {
                error(data.message || 'Deletion failed.');
            }
        } catch (err) {
            error('Network failure.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Raw Material Type Codes</h1>
                    <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Define standardized codes for raw material classification.</p>
                </div>
                <div>
                    <Button 
                        onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
                        className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold transition-all"
                    >
                        {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {showForm ? 'Cancel' : 'Add New Type Code'}
                    </Button>
                </div>
            </div>

            {showForm && (
                <Card className="border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300 max-w-2xl mx-auto">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <CardTitle className="text-lg font-bold text-primary">{editingId ? 'Edit Type Code' : 'Create New Type Code'}</CardTitle>
                        <CardDescription>Define a unique code and descriptive name.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                <Code className="w-3 h-3 mr-2 text-primary" /> Type Code
                            </label>
                            <Input 
                                placeholder="e.g. GR-01"
                                value={formData.code}
                                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                className="h-11 font-black"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                <FileText className="w-3 h-3 mr-2 text-primary" /> Type Name
                            </label>
                            <Input 
                                placeholder="e.g. Granules"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="h-11 font-bold"
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button onClick={() => setShowForm(false)} variant="outline" className="rounded-full px-8">Discard</Button>
                            <Button 
                                onClick={saveCode} 
                                loading={submitting}
                                className="bg-primary hover:bg-primary/95 text-white px-10 rounded-full shadow-lg font-bold"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {editingId ? 'Update' : 'Save Code'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!showForm && (
                <TableView
                    title="System Type Codes"
                    description="Standardized classification codes for inventory items."
                    headers={['Code', 'Name', 'Created At', 'Actions']}
                    data={codes}
                    loading={loading}
                    searchFields={['code', 'name']}
                    searchPlaceholder="Search by code or name..."
                    renderRow={(item: any) => (
                        <tr key={item.id} className="hover:bg-primary/5 transition-all group border-b border-slate-50 last:border-none">
                            <td className="px-6 py-4">
                                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-bold">{item.code}</span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                            <td className="px-6 py-4 text-xs text-slate-400">
                                {new Date(item.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1.5">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8 rounded-full hover:bg-primary/10 transition-all">
                                    <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </td>
                        </tr>
                    )}
                />
            )}
        </div>
    );
}
