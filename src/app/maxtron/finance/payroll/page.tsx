'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TableView } from '@/components/ui/table-view';
import { 
    Plus, 
    Calendar, 
    User, 
    Trash2, 
    DollarSign,
    Briefcase,
    ChevronDown,
    X,
    Save,
    Search,
    Download,
    Eye,
    Edit
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function PayrollPage() {
    const pathname = usePathname();
    const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';
    const activeTenant = activeEntity.toUpperCase();

    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    
    // Filters
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    const [formData, setFormData] = useState({
        employee_id: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        basic_salary: 0,
        allowances: 0,
        deductions: 0,
        incentives: 0,
        net_salary: 0,
        payment_status: 'PENDING',
        payment_date: '',
        payment_mode: 'BANK',
        remarks: '',
        company_id: ''
    });

    const { success, error, info } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const token = localStorage.getItem('token');
        try {
            const compRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/companies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const compData = await compRes.json();
            if (compData.success) {
                const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
                if (activeCo) {
                    setCurrentCompanyId(activeCo.id);
                    setFormData(prev => ({ ...prev, company_id: activeCo.id }));
                }
            }
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    };

    useEffect(() => {
        if (currentCompanyId) {
            fetchPayrolls();
            fetchEmployees();
        }
    }, [filterMonth, filterYear, currentCompanyId]);

    const fetchPayrolls = async () => {
        if (!currentCompanyId) return;
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/payroll?company_id=${currentCompanyId}&month=${filterMonth}&year=${filterYear}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setPayrolls(data.data);
        } catch (err) {
            error('Failed to fetch payroll records');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        if (!currentCompanyId) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/employees?company_id=${currentCompanyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setEmployees(data.data);
        } catch (err) {
            console.error('Failed to fetch employees');
        }
    };

    const calculateNetSalary = (basic: number, allow: number, deduct: number, incent: number) => {
        return (Number(basic) + Number(allow) + Number(incent)) - Number(deduct);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };

        // Auto-fetch basic salary if employee is selected
        if (name === 'employee_id' && value) {
            const selectedEmp = employees.find(emp => emp.id === value);
            if (selectedEmp && selectedEmp.basic_salary) {
                newFormData.basic_salary = Number(selectedEmp.basic_salary);
            }
        }

        if (['basic_salary', 'allowances', 'deductions', 'incentives'].includes(name) || name === 'employee_id') {
            newFormData.net_salary = calculateNetSalary(
                Number(newFormData.basic_salary),
                Number(newFormData.allowances),
                Number(newFormData.deductions),
                Number(newFormData.incentives)
            );
        }

        setFormData(newFormData);
    };

    const resetForm = () => {
        setFormData({
            employee_id: '',
            month: filterMonth,
            year: filterYear,
            basic_salary: 0,
            allowances: 0,
            deductions: 0,
            incentives: 0,
            net_salary: 0,
            payment_status: 'PENDING',
            payment_date: '',
            payment_mode: 'BANK',
            remarks: '',
            company_id: currentCompanyId
        });
        setEditingId(null);
    };

    const handleEdit = (rec: any) => {
        setEditingId(rec.id);
        setFormData({
            employee_id: rec.employee_id,
            month: rec.month,
            year: rec.year,
            basic_salary: Number(rec.basic_salary),
            allowances: Number(rec.allowances),
            deductions: Number(rec.deductions),
            incentives: Number(rec.incentives),
            net_salary: Number(rec.net_salary),
            payment_status: rec.payment_status,
            payment_date: rec.payment_date || '',
            payment_mode: rec.payment_mode || 'BANK',
            remarks: rec.remarks || '',
            company_id: rec.company_id
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = editingId 
                ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/payroll/${editingId}`
                : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/payroll`;
            
            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    ...formData, 
                    basic_salary: Number(formData.basic_salary),
                    allowances: Number(formData.allowances),
                    deductions: Number(formData.deductions),
                    incentives: Number(formData.incentives),
                    net_salary: Number(formData.net_salary),
                    company_id: currentCompanyId 
                })
            });

            const data = await res.json();
            if (data.success) {
                success(editingId ? 'Payroll updated' : 'Payroll recorded');
                setShowForm(false);
                resetForm();
                fetchPayrolls();
            } else {
                error(data.message || 'Operation failed');
            }
        } catch (err) {
            error('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            message: 'Are you sure you want to delete this payroll record?',
            type: 'danger'
        });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/payroll/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                success('Record deleted');
                fetchPayrolls();
            }
        } catch (err) {
            error('Delete failed');
        }
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Payroll Management</h1>
                    <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Manage employee month-wise salary distributions and net payouts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); }}
                        className="h-11 bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold flex items-center gap-2 active:scale-95 transition-all"
                    >
                        {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showForm ? 'Cancel' : 'Generate Entry'}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            {!showForm && (
                <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select 
                            value={filterMonth} 
                            onChange={(e) => setFilterMonth(Number(e.target.value))}
                            className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <select 
                            value={filterYear} 
                            onChange={(e) => setFilterYear(Number(e.target.value))}
                            className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="ml-auto text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Total Payout for {months[filterMonth-1]} {filterYear}: 
                        <span className="ml-2 text-primary text-sm font-black italic">
                            ₹{payrolls.reduce((sum, p) => sum + Number(p.net_salary), 0).toLocaleString()}
                        </span>
                    </div>
                </div>
            )}

            {showForm ? (
                <Card className="border-none shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-primary p-6 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <DollarSign className="w-6 h-6 p-1 bg-white/20 rounded-lg text-white" />
                                    {editingId ? 'Edit Salary Detail' : 'Create Salary Entry'}
                                </h2>
                                <p className="text-white/70 text-xs mt-1">Specify earnings, deductions, and payment status for the employee.</p>
                            </div>
                        </div>
                    </div>
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Primary Info</h3>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Employee</label>
                                        <select
                                            name="employee_id"
                                            value={formData.employee_id}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                                        >
                                            <option value="">Select Employee...</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.name} ({emp.employee_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Period</label>
                                            <select
                                                name="month"
                                                value={formData.month}
                                                onChange={handleInputChange}
                                                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                                            >
                                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2 pt-6">
                                            <select
                                                name="year"
                                                value={formData.year}
                                                onChange={handleInputChange}
                                                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                                            >
                                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Components */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Salary Components</h3>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Basic Salary (₹)</label>
                                            <Input 
                                                type="number" 
                                                name="basic_salary" 
                                                value={formData.basic_salary} 
                                                onChange={handleInputChange} 
                                                className="h-11 font-bold"
                                                min="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Allowances (HRA/DA)</label>
                                            <Input 
                                                type="number" 
                                                name="allowances" 
                                                value={formData.allowances} 
                                                onChange={handleInputChange} 
                                                className="h-11 font-bold"
                                                min="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 text-red-500">Deductions (PT/PF)</label>
                                            <Input 
                                                type="number" 
                                                name="deductions" 
                                                value={formData.deductions} 
                                                onChange={handleInputChange} 
                                                className="h-11 font-bold border-red-100"
                                                min="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 text-emerald-500">Incentives/Bonus</label>
                                            <Input 
                                                type="number" 
                                                name="incentives" 
                                                value={formData.incentives} 
                                                onChange={handleInputChange} 
                                                className="h-11 font-bold border-emerald-100"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Net Payout */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Final Settlement</h3>
                                    
                                    <div className="bg-slate-900 rounded-3xl p-6 text-white text-center shadow-xl shadow-slate-200 border-b-8 border-primary/30 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-8 -mt-8 blur-3xl group-hover:bg-white/10 transition-all duration-500"></div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 block">Net Monthly Payout</label>
                                        <div className="text-4xl font-black font-heading tracking-tighter">
                                            ₹{formData.net_salary.toLocaleString()}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/10 text-[10px] uppercase font-bold text-white/40">
                                            Final calculated amount for disbursement
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 items-end border-t border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Status</label>
                                    <select
                                        name="payment_status"
                                        value={formData.payment_status}
                                        onChange={handleInputChange}
                                        className={`w-full h-11 px-4 rounded-xl border text-sm font-black outline-none transition-all ${formData.payment_status === 'PAID' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}
                                    >
                                        <option value="PENDING">PENDING</option>
                                        <option value="PAID">PAID</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Payment Mode</label>
                                    <select
                                        name="payment_mode"
                                        value={formData.payment_mode}
                                        onChange={handleInputChange}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                                    >
                                        <option value="BANK">Bank Transfer (NEFT/RTGS)</option>
                                        <option value="CASH">Cash Payment</option>
                                        <option value="UPI">UPI Payment</option>
                                        <option value="CHEQUE">Cheque</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Payment Date</label>
                                    <Input 
                                        type="date" 
                                        name="payment_date" 
                                        value={formData.payment_date} 
                                        onChange={handleInputChange} 
                                        className="h-11"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        onClick={() => { setShowForm(false); resetForm(); }}
                                        variant="outline"
                                        className="flex-1 h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50"
                                    >
                                        DISCARD
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 h-12 bg-primary hover:bg-primary/95 text-white rounded-xl font-black shadow-xl shadow-primary/20"
                                    >
                                        {submitting ? 'SAVING...' : (editingId ? 'UPDATE RECORD' : 'POST ENTRY')}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <TableView
                    title={`Payroll Log: ${months[filterMonth-1]} ${filterYear}`}
                    headers={['Employee', 'Category', 'Basic', 'Deductions', 'Net Payout', 'Status', 'Actions']}
                    data={payrolls}
                    loading={loading}
                    searchFields={['users.name', 'users.employee_code']}
                    searchPlaceholder="Search employee name or code..."
                    renderRow={(row: any) => (
                        <tr key={row.id} className="hover:bg-primary/5 transition-all border-b border-slate-50 last:border-none group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {row.users?.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{row.users?.name}</div>
                                        <div className="text-[10px] font-black text-slate-400 font-mono tracking-tighter uppercase">{row.users?.employee_code}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs font-semibold text-slate-500">
                                    {row.users?.employee_categories?.category_name || 'General Staff'}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-600">₹{Number(row.basic_salary).toLocaleString()}</td>
                            <td className="px-6 py-4 font-bold text-red-500">₹{Number(row.deductions).toLocaleString()}</td>
                            <td className="px-6 py-4">
                                <span className="font-black text-primary text-lg tracking-tight">₹{Number(row.net_salary).toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${row.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {row.payment_status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-full">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full">
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
