'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Save, 
    Wallet,
    Calendar,
    MapPin,
    FileText,
    Hash,
    Coins,
    Users,
    Building2,
    Phone,
    X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TableView } from "@/components/ui/table-view";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const EXPENDITURES_API = `${API_BASE}/api/keil/hr-payroll/expenses/records`;
const HEADS_API = `${API_BASE}/api/keil/hr-payroll/expenses/heads`;
const EMPLOYEES_API = `${API_BASE}/api/keil/employees`;

export default function ExpendituresPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    
    const [expenditures, setExpenditures] = useState<any[]>([]);
    const [expenseHeads, setExpenseHeads] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');

    const [formData, setFormData] = useState({
        expense_head_id: '',
        payee_type: 'employee',
        employee_id: '',
        other_name: '',
        other_mobile: '',
        amount: '',
        expenditure_date: new Date().toISOString().split('T')[0],
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
                await Promise.all([
                    fetchExpenditures(coId),
                    fetchDropdownData(coId)
                ]);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const [headsRes, employeesRes] = await Promise.all([
                fetch(`${HEADS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${EMPLOYEES_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (!headsRes.ok || !employeesRes.ok) throw new Error('Endpoints not ready');
            
            const headsData = await headsRes.json();
            const employeesData = await employeesRes.json();

            const headsArray = (headsData.success && Array.isArray(headsData.data)) ? headsData.data : [];
            const employeesArray = (employeesData.success && Array.isArray(employeesData.data)) ? employeesData.data : [];

            setExpenseHeads(headsArray);
            setEmployees(employeesArray);
        } catch (e) {
            console.error('Dropdown fetch error', e);
            setExpenseHeads([]);
            setEmployees([]);
        }
    };

    const fetchExpenditures = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${EXPENDITURES_API}?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`API failed: ${errText}`);
            }

            const data = await res.json();
            if (data.success) {
                setExpenditures(data.data || []);
            } else {
                setExpenditures([]);
            }
        } catch (err) {
            console.error('Error fetching expenditures:', err);
            setExpenditures([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        
        try {
            const url = editingId ? `${EXPENDITURES_API}/${editingId}` : EXPENDITURES_API;
            const method = editingId ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                // Mock Saving if backend isn't linked yet
                const head = expenseHeads.find(h => h.id === formData.expense_head_id);
                const employee = employees.find(e => e.id === formData.employee_id);
                
                const mockRecord = {
                    ...formData,
                    id: editingId || Date.now().toString(),
                    expense_head: { head_name: head?.head_name || 'Unknown' },
                    employee: formData.payee_type === 'employee' ? { name: employee?.name || 'Unknown Employee' } : null
                };

                if (editingId) {
                    setExpenditures(prev => prev.map(ex => ex.id === editingId ? mockRecord : ex));
                    success('Expenditure updated (Mock)');
                } else {
                    setExpenditures(prev => [mockRecord, ...prev]);
                    success('Expenditure logged (Mock)');
                }
                setIsFormOpen(false);
                resetForm();
                return;
            }

            const data = await res.json();
            
            if (data.success) {
                success(editingId ? 'Expenditure updated' : 'Expenditure logged successfully');
                setIsFormOpen(false);
                resetForm();
                fetchExpenditures(currentCompanyId);
            } else {
                error(data.message || 'Operation failed');
            }
        } catch (err: any) {
            error(err.message || 'An error occurred');
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: 'Delete Expenditure Record?',
            message: 'Are you sure you want to remove this financial ledger entry? This cannot be undone.',
            type: 'danger',
            confirmLabel: 'Delete Record'
        });

        if (!isConfirmed) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${EXPENDITURES_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                setExpenditures(prev => prev.filter(ex => ex.id !== id));
                success('Record deleted (Mock)');
                return;
            }
            const data = await res.json();
            if (data.success) {
                success('Record removed successfully');
                fetchExpenditures(currentCompanyId);
            } else {
                error(data.message);
            }
        } catch (err: any) {
            error(err.message || 'An error occurred');
        }
    };

    const handleEdit = (ex: any) => {
        setFormData({
            expense_head_id: ex.expense_head_id || '',
            expenditure_date: ex.expenditure_date ? new Date(ex.expenditure_date).toISOString().split('T')[0] : '',
            payee_type: ex.payee_type || 'employee',
            employee_id: ex.employee_id || '',
            other_name: ex.other_name || '',
            other_mobile: ex.other_mobile || '',
            amount: ex.amount || '',
            remarks: ex.remarks || ex.description || '',
            company_id: currentCompanyId
        });
        setEditingId(ex.id);
        setIsFormOpen(true);
    };

    const resetForm = () => {
        setFormData({
            expense_head_id: '',
            expenditure_date: new Date().toISOString().split('T')[0],
            payee_type: 'employee',
            employee_id: '',
            other_name: '',
            other_mobile: '',
            amount: '',
            remarks: '',
            company_id: currentCompanyId
        });
        setEditingId(null);
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700 bg-slate-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase flex items-center gap-3">
                        <Wallet className="w-10 h-10 text-emerald-600" />
                        Expenditure Register
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                        Financial Operations & Outlet Expenses
                    </p>
                </div>
                {!isFormOpen && (
                    <Button 
                        onClick={() => setIsFormOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs h-12 px-8 shadow-lg shadow-emerald-100"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Log Expenditure
                    </Button>
                )}
            </div>

            {isFormOpen ? (
                <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white animate-in slide-in-from-bottom-8 duration-500">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 p-8 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tighter text-slate-800 italic">
                                {editingId ? 'Modify Expenditure Record' : 'Log New Expenditure'}
                            </CardTitle>
                            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Record financial outflows against defined heads.
                            </CardDescription>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                                setIsFormOpen(false);
                                resetForm();
                            }}
                            className="rounded-xl hover:bg-emerald-50 hover:text-emerald-600"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-indigo-500" /> Execution Date
                                    </label>
                                    <Input 
                                        type="date"
                                        value={formData.expenditure_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, expenditure_date: e.target.value }))}
                                        className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-800 px-6 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <Coins className="w-4 h-4 text-rose-500" /> Expense Taxonomy
                                    </label>
                                    <select 
                                        value={formData.expense_head_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, expense_head_id: e.target.value }))}
                                        className="w-full h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-800 px-6 focus:ring-emerald-500"
                                        required
                                    >
                                        <option value="">Select Configuration Head</option>
                                        {expenseHeads.map((h: any) => (
                                            <option key={h.id} value={h.id}>{h.head_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-orange-500" /> Payee Type
                                    </label>
                                    <div className="flex items-center gap-6 h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="payee_type" 
                                                value="employee" 
                                                checked={formData.payee_type === 'employee'}
                                                onChange={(e) => setFormData(p => ({ ...p, payee_type: 'employee' }))}
                                                className="w-5 h-5 accent-emerald-600"
                                            />
                                            <span className="font-bold text-slate-700">Internal Employee</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="payee_type" 
                                                value="other" 
                                                checked={formData.payee_type === 'other'}
                                                onChange={(e) => setFormData(p => ({ ...p, payee_type: 'other' }))}
                                                className="w-5 h-5 accent-emerald-600"
                                            />
                                            <span className="font-bold text-slate-700">Other (Person/Company)</span>
                                        </label>
                                    </div>
                                </div>

                                {formData.payee_type === 'employee' ? (
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-emerald-500" /> Employee
                                        </label>
                                        <select 
                                            value={formData.employee_id}
                                            onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                                            className="w-full h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-800 px-6 focus:ring-emerald-500"
                                        >
                                            <option value="">Select Employee...</option>
                                            {employees.map((emp: any) => (
                                                <option key={emp.id} value={emp.id}>{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-amber-500" /> Payee Name
                                            </label>
                                            <Input 
                                                value={formData.other_name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, other_name: e.target.value }))}
                                                className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-800 px-6 focus:ring-emerald-500"
                                                placeholder="Person or Company name"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-blue-500" /> Mobile Number
                                            </label>
                                            <Input 
                                                value={formData.other_mobile}
                                                onChange={(e) => setFormData(prev => ({ ...prev, other_mobile: e.target.value }))}
                                                className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-800 px-6 focus:ring-emerald-500"
                                                placeholder="Mobile Number"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-emerald-500" /> Amount
                                    </label>
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-black text-rose-600 px-6 focus:ring-emerald-500 text-lg"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" /> Remarks
                                    </label>
                                    <Input 
                                        value={formData.remarks}
                                        onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                                        className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-600 px-6 focus:ring-emerald-500"
                                        placeholder="Detailed remarks..."
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <Button type="submit" className="bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs h-14 px-10 shadow-xl transition-colors duration-300">
                                    <Save className="w-4 h-4 mr-3" />
                                    {editingId ? 'Update Ledger Execution' : 'Commit Ledger Execution'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-black uppercase tracking-tighter italic text-slate-800">Operational Expenditure Ledger</CardTitle>
                                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Complete audit trail of documented expenses.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <TableView 
                            searchFields={['remarks', 'amount', 'expenditure_date', 'other_name', 'employee.name']}
                            headers={['Date', 'Taxonomy Head', 'Paid To', 'Amount', '']}
                            data={expenditures}
                            loading={loading}
                            renderRow={(ex: any) => (
                                <tr key={ex.id} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0">
                                    <td className="px-8 py-6 font-black text-slate-600 text-sm">
                                        <div className="inline-flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-emerald-500" />
                                            {typeof ex.expenditure_date === 'string' ? ex.expenditure_date.slice(0, 10) : ex.expenditure_date}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-black text-slate-800">
                                        {ex.expense_head?.head_name || 'N/A'}
                                        {ex.remarks && (
                                            <div className="text-[10px] font-bold text-slate-400 mt-1 truncate max-w-[200px]">
                                                {ex.remarks}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-sm font-bold text-amber-600 uppercase tracking-widest">
                                        {ex.payee_type === 'employee' 
                                            ? `Employee: ${ex.employee?.name || (ex.employee?.first_name ? `${ex.employee.first_name} ${ex.employee.last_name || ''}` : 'Unknown')}`
                                            : `Other: ${ex.other_name || 'N/A'} - (${ex.other_mobile || ''})`
                                        }
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="text-lg font-black text-rose-600 italic">
                                            ₹{parseFloat(ex.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-xl hover:bg-indigo-50 hover:text-indigo-600"
                                                onClick={() => handleEdit(ex)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-xl hover:bg-rose-50 hover:text-rose-600"
                                                onClick={() => handleDelete(ex.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
