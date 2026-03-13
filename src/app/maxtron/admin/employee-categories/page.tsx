'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Tags, 
    Plus, 
    Edit2, 
    Trash2, 
    Save, 
    X,
    ShieldCheck
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
export default function EmployeeCategoriesPage() {
    const pathname = usePathname();
    const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';
    const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';
    const CATEGORIES_API = `${API_BASE}/api/${activeEntity}/categories`;
    
    const [categories, setCategories] = useState<any[]>([]);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        category_name: '',
        company_id: ''
    });

    const { success, error } = useToast();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const compRes = await fetch(`${API_BASE}/api/${activeEntity}/companies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const compData = await compRes.json();
            
            let coId = '';
            if (compData.success && Array.isArray(compData.data)) {
                const activeCo = compData.data.find((c: any) => 
                    c.company_name?.toUpperCase().includes(activeTenant)
                );
                if (activeCo) {
                    coId = activeCo.id;
                    setCurrentCompanyId(coId);
                    setFormData(prev => ({ ...prev, company_id: coId }));
                }
            }

            if (coId) {
                await fetchCategories(coId);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async (coId: string) => {
        try {
            const res = await fetch(`${CATEGORIES_API}?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setCategories(data.data);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingId ? `${CATEGORIES_API}/${editingId}` : CATEGORIES_API;
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await res.json();
            if (result.success) {
                success(editingId ? 'Category updated successfully' : 'Category created successfully');
                setShowForm(false);
                setEditingId(null);
                setFormData({ category_name: '', company_id: currentCompanyId });
                fetchCategories(currentCompanyId);
            } else {
                error(result.message || 'Action failed');
            }
        } catch (err) {
            error('Something went wrong');
        }
    };

    const handleEdit = (cat: any) => {
        setEditingId(cat.id);
        setFormData({ category_name: cat.category_name, company_id: currentCompanyId });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            const res = await fetch(`${CATEGORIES_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            if (result.success) {
                success('Category deleted');
                fetchCategories(currentCompanyId);
            } else {
                error(result.message || 'Cannot delete used category');
            }
        } catch (err) {
            error('Failed to delete');
        }
    };

    return (
        <div className="max-w-4xl mx-auto md:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-start gap-3">
                    <Tags className="w-10 h-10 text-indigo-600 p-2 bg-indigo-50 rounded-lg shrink-0" />
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                            Employee Categories
                        </h1>
                        <p className="text-slate-500 text-xs md:text-sm mt-0.5">Configure classification groups for HR and Payroll.</p>
                    </div>
                </div>
                <Button 
                    onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ category_name: '', company_id: currentCompanyId }); }} 
                    className="w-full md:w-auto gap-2 shadow-lg h-10 md:h-11 rounded-full font-bold"
                >
                    {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showForm ? "Cancel" : "Add Category"}
                </Button>
            </div>

            {showForm && (
                <Card className="border-indigo-100 shadow-xl overflow-hidden">
                    <CardHeader className="bg-indigo-50/50 border-b">
                        <CardTitle className="text-indigo-900 text-lg">
                            {editingId ? "Modify Classification" : "New Classification Entry"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-500 px-1">Category Name</label>
                                <Input 
                                    placeholder="E.g. Management, Skilled Worker, Staff..." 
                                    value={formData.category_name} 
                                    onChange={e => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
                                    className="h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                                    required
                                />
                            </div>
                            <Button type="submit" className="h-11 px-8 gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 rounded-full font-bold">
                                <Save className="w-4 h-4" /> {editingId ? "Update" : "Save Category"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

                <TableView
                    title="Available Classifications"
                    description="Standard groupings used across both Maxtron and Keil operations."
                    headers={['Classification Name', 'System Key', 'Actions']}
                    data={categories}
                    loading={loading}
                    searchFields={['category_name']}
                    renderRow={(cat: any) => (
                        <tr key={cat.id} className="hover:bg-indigo-50/30 transition-all border-b last:border-0 group">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{cat.category_name}</div>
                            </td>
                            <td className="px-6 py-4">
                                <code className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">
                                    {cat.id.split('-')[0]}
                                </code>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    {cat.company_id ? (
                                        <>
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)} className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 border border-indigo-100"><Edit2 className="w-3.5 h-3.5" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)} className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 border border-rose-100"><Trash2 className="w-3.5 h-3.5" /></Button>
                                        </>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 font-bold uppercase truncate bg-slate-50 px-2 py-1 rounded">System Default</span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                />

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed font-medium">
                    <p className="font-bold mb-1">System Administration Note:</p>
                    Changing category names will update all linked employees immediately. You cannot delete a category that is currently assigned to one or more employees.
                </div>
            </div>
        </div>
    );
}
