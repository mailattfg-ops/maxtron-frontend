'use client';

import { useState, useEffect, useRef } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    Plus, 
    Calendar, 
    User, 
    Trash2,
    Edit,
    ChevronDown,
    IndianRupee, 
    CreditCard,
    ArrowDownLeft,
    FileText,
    CheckCircle2,
    AlertCircle,
    X,
    Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export default function KeilCustomerCollectionPage() {
    const [collections, setCollections] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [customerBalance, setCustomerBalance] = useState<number | null>(null);
    const [showScrollArrow, setShowScrollArrow] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    
    const [formData, setFormData] = useState({
        collection_date: new Date().toISOString().split('T')[0],
        customer_id: '',
        amount: '',
        payment_mode: 'CASH',
        reference_no: '',
        remarks: '',
        company_id: ''
    });

    const [allocations, setAllocations] = useState<Record<string, any>>({}); // { invoice_id: amount }

    const { success: toastSuccess, error: toastError } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            // Find the Keil company ID first
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
                    fetchCollections(coId),
                    fetchCustomers(coId)
                ]);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
            toastError('Failed to initialize Keil finance data');
        } finally {
            setLoading(false);
        }
    };

    const fetchCollections = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/keil/finance/collections?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setCollections(data.data);
        } catch (error) {
            toastError('Failed to fetch collections');
        }
    };

    const fetchCustomers = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/keil/customers?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setCustomers(data.data);
        } catch (error) {
            toastError('Failed to fetch customers');
        }
    };

    const fetchPendingInvoices = async (customerId: string) => {
        if (!customerId) {
            setPendingInvoices([]);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/keil/finance/pending-invoices?customer_id=${customerId}&company_id=${currentCompanyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setPendingInvoices(data.data);
                setAllocations({});
            }
        } catch (error) {
            toastError('Failed to fetch pending invoices');
        }
    };

    const fetchCustomerBalance = async (customerId: string) => {
        if (!customerId) return;
        try {
            const [invRes, collRes] = await Promise.all([
                fetch(`${API_BASE}/api/keil/invoices?company_id=${currentCompanyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${API_BASE}/api/keil/finance/collections?company_id=${currentCompanyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);
            const invData = await invRes.json();
            const collData = await collRes.json();
            
            const activeInvoices = (invData.data || []).filter((i: any) => i.customer_id === customerId);
            const activeCollections = (collData.data || []).filter((c: any) => c.customer_id === customerId);

            const totalInvoices = activeInvoices.reduce((sum: number, i: any) => sum + Number(i.net_amount || i.bill_amount || 0), 0);
            const totalCollections = activeCollections.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
            
            const bal = (totalInvoices - totalCollections);
            setCustomerBalance(Number(bal.toFixed(2)));
        } catch (error) {
            console.error('Balance fetch failed');
        }
    };

    const handleCustomerChange = (id: string) => {
        setFormData({ ...formData, customer_id: id });
        fetchPendingInvoices(id);
        fetchCustomerBalance(id);
    };

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 30) {
                setShowScrollArrow(false);
            } else {
                setShowScrollArrow(true);
            }
        }
    };

    useEffect(() => {
        if (isModalOpen) {
            setTimeout(handleScroll, 200);
        }
    }, [isModalOpen, pendingInvoices]);

    const autoAllocate = (totalAmount: number, invoices: any[]) => {
        let remaining = totalAmount;
        const newAllocations: any = {};
        
        const sortedInvoices = [...invoices].sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());
        
        for (const inv of sortedInvoices) {
            if (remaining <= 0) break;
            const canCollect = Math.min(Number(inv.pending_amount), remaining);
            if (canCollect > 0) {
                newAllocations[inv.id] = String(canCollect);
                remaining -= canCollect;
            } else {
                newAllocations[inv.id] = '';
            }
        }
        setAllocations(newAllocations);
    };

    useEffect(() => {
        if (formData.amount && pendingInvoices.length > 0) {
            autoAllocate(Number(formData.amount), pendingInvoices);
        }
    }, [formData.amount, pendingInvoices]);

    const handleAllocationChange = (invId: string, amount: string, max: number) => {
        const numVal = Number(amount);
        if (numVal > max) {
            setAllocations({ ...allocations, [invId]: String(max) });
        } else {
            setAllocations({ ...allocations, [invId]: amount });
        }
    };

    const totalAllocated = Object.values(allocations).reduce((sum: number, val: any) => sum + Number(val || 0), 0);
    const totalCollectionAmount = Number(formData.amount || 0);
    const advanceAmount = Math.max(0, totalCollectionAmount - totalAllocated);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (totalCollectionAmount <= 0) {
            toastError('Please enter a valid collection amount');
            return;
        }

        const allocationList = Object.entries(allocations)
            .filter(([_, amt]) => Number(amt) > 0)
            .map(([invId, amt]) => ({
                invoice_id: invId,
                allocated_amount: amt
            }));

        const payload = { 
            ...formData, 
            company_id: currentCompanyId,
            allocations: allocationList
        };

        try {
            const url = editingId 
                ? `${API_BASE}/api/keil/finance/collections/${editingId}`
                : `${API_BASE}/api/keil/finance/collections`;

            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                toastSuccess(editingId ? 'Collection updated' : 'Collection recorded successfully');
                setIsModalOpen(false);
                setEditingId(null);
                setFormData({
                    collection_date: new Date().toISOString().split('T')[0],
                    customer_id: '',
                    amount: '',
                    payment_mode: 'CASH',
                    reference_no: '',
                    remarks: '',
                    company_id: currentCompanyId
                });
                setAllocations({});
                setPendingInvoices([]);
                setCustomerBalance(null);
                fetchCollections(currentCompanyId);
            } else {
                toastError(data.message);
            }
        } catch (error) {
            toastError('Failed to save collection');
        }
    };

    const handleEdit = (row: any) => {
        setFormData({
            collection_date: row.collection_date.split('T')[0],
            customer_id: row.customer_id,
            amount: String(row.amount),
            payment_mode: row.payment_mode,
            reference_no: row.reference_no || '',
            remarks: row.remarks || '',
            company_id: currentCompanyId
        });
        setEditingId(row.id);
        setAllocations({});
        setIsModalOpen(true);
        fetchCustomerBalance(row.customer_id);
        fetchPendingInvoices(row.customer_id);
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: 'Delete Collection?',
            message: 'Are you sure you want to remove this financial record? This action cannot be undone.',
            type: 'danger'
        });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`${API_BASE}/api/keil/finance/collections/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                toastSuccess('Record deleted');
                fetchCollections(currentCompanyId);
            }
        } catch (error) {
            toastError('Delete failed');
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 bg-slate-50/50 min-h-screen p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-8 rounded-[2.5rem] shadow-xl border border-primary/5">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase flex items-center gap-2 md:gap-3">
                        <ArrowDownLeft className="text-emerald-500 w-8 h-8 md:w-10 md:h-10 p-1.5 bg-emerald-50 rounded-xl shrink-0" />
                        <span className="truncate">HCE Collections</span>
                    </h1>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Reconciliation Ledger</p>
                </div>
                <Button
                    onClick={() => { setIsModalOpen(true); setEditingId(null); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs h-12 px-8 shadow-lg shadow-emerald-100 transition-all hover:scale-105 active:scale-95 w-full md:w-auto"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Collection
                </Button>
            </div>

            <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                <TableView
                    title="Recent Collections"
                    headers={['Voucher No', 'Date', 'Customer', 'Mode', 'Amount', 'Actions']}
                    data={collections}
                    loading={loading}
                    searchFields={['voucher_no', 'customers.customer_name']}
                    searchPlaceholder="Search voucher or customer..."
                    renderRow={(row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-all border-b border-slate-50 last:border-none">
                            <td className="px-8 py-6 font-mono text-xs">{row.voucher_no}</td>
                            <td className="px-8 py-6">{new Date(row.collection_date).toLocaleDateString()}</td>
                            <td className="px-8 py-6 font-bold">{row.customers?.customer_name}</td>
                            <td className="px-8 py-6 text-sm font-bold text-slate-500">
                                {row.payment_mode}
                            </td>
                            <td className="px-8 py-6 font-black text-emerald-600">₹{Number(row.amount).toLocaleString()}</td>
                            <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="text-blue-600 hover:bg-blue-50 rounded-lg font-bold">
                                        Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="text-rose-600 hover:bg-rose-50 rounded-lg font-bold">
                                        Delete
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    )}
                />
            </Card>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in duration-300 flex flex-col">
                        <div className="bg-emerald-600 p-8 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                                    <Plus className="w-8 h-8" />
                                    {editingId ? 'Modify Collection' : 'Log Collection'}
                                </h2>
                                <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Financial Inflow Record</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-white/80 hover:text-white font-black p-2">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div 
                            ref={scrollRef}
                            onScroll={handleScroll}
                            className="overflow-y-auto p-8 custom-scrollbar"
                        >
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Collection Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                            <Input
                                                type="date"
                                                required
                                                value={formData.collection_date}
                                                onChange={(e) => setFormData({ ...formData, collection_date: e.target.value })}
                                                className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Select Customer</label>
                                            {customerBalance !== null && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${customerBalance > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {customerBalance > 0 ? `To Collect: ₹${customerBalance.toLocaleString()}` : `Credit: ₹${Math.abs(customerBalance).toLocaleString()}`}
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 z-10" />
                                            <Select
                                                required
                                                value={formData.customer_id}
                                                onValueChange={(val) => handleCustomerChange(val)}
                                            >
                                                <SelectTrigger className="w-full pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold">
                                                    <SelectValue placeholder="Choose Customer" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-slate-200">
                                                    {customers.map((c: any) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 text-emerald-600">Amount Received (₹)</label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                                            <Input
                                                type="number"
                                                required
                                                placeholder="0.00"
                                                value={formData.amount}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                        setFormData({ ...formData, amount: val });
                                                    }
                                                }}
                                                className="pl-12 h-14 bg-white border-2 border-emerald-500/20 rounded-2xl text-xl font-black text-emerald-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {formData.customer_id && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Reconciliation</h3>
                                            <div className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">
                                                Outstanding: ₹{pendingInvoices.reduce((s, si) => s + Number(si.pending_amount), 0).toLocaleString()}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-8 py-4">Invoice</th>
                                                        <th className="px-8 py-4 text-right">Amount</th>
                                                        <th className="px-8 py-4 text-right text-blue-600">Pending</th>
                                                        <th className="px-8 py-4 text-center">Allocation</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pendingInvoices.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold uppercase text-[10px]">
                                                                No outstanding records.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        pendingInvoices.map((inv) => (
                                                            <tr key={inv.id} className="border-b border-slate-100 last:border-none">
                                                                <td className="px-8 py-4">
                                                                    <div className="font-black text-slate-800">{inv.invoice_number}</div>
                                                                    <div className="text-[10px] font-bold text-slate-400">{new Date(inv.invoice_date).toLocaleDateString()}</div>
                                                                </td>
                                                                <td className="px-8 py-4 text-right font-bold">₹{Number(inv.bill_amount).toLocaleString()}</td>
                                                                <td className="px-8 py-4 text-right font-black text-blue-600">₹{Number(inv.pending_amount).toLocaleString()}</td>
                                                                <td className="px-8 py-4 w-48 text-center">
                                                                    <Input 
                                                                        type="number"
                                                                        placeholder="0.00"
                                                                        value={allocations[inv.id] || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                                handleAllocationChange(inv.id, val, inv.pending_amount)
                                                                            }
                                                                        }}
                                                                        className="w-full h-10 px-4 bg-white border-slate-200 rounded-xl text-right font-black text-xs"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-emerald-50 p-6 rounded-[1.5rem] border border-emerald-100 flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase text-emerald-800 opacity-60">Allocated</span>
                                        <span className="text-xl font-black text-emerald-600">₹{totalAllocated.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-blue-50 p-6 rounded-[1.5rem] border border-blue-100 flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase text-blue-800 opacity-60">Advance Credit</span>
                                        <span className="text-xl font-black text-blue-600">₹{advanceAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-slate-900 p-6 rounded-[1.5rem] flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase text-white/50">Total Received</span>
                                        <span className="text-xl font-black text-white">₹{totalCollectionAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Payment Config</label>
                                        <div className="grid grid-cols-2 gap-4 h-14">
                                            <div className="relative">
                                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 z-10" />
                                                <Select
                                                    value={formData.payment_mode}
                                                    onValueChange={(val) => setFormData({ ...formData, payment_mode: val })}
                                                >
                                                    <SelectTrigger className="w-full pl-12 h-full bg-slate-50 border-slate-200 rounded-2xl font-bold">
                                                        <SelectValue placeholder="Mode" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white border-slate-200">
                                                        <SelectItem value="CASH">Cash</SelectItem>
                                                        <SelectItem value="BANK">IMPS/RTGS</SelectItem>
                                                        <SelectItem value="UPI">UPI/Digital</SelectItem>
                                                        <SelectItem value="CHECK">Check/DD</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Input
                                                type="text"
                                                placeholder="Ref No"
                                                value={formData.reference_no}
                                                onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                                                className="h-full bg-slate-50 border-slate-200 rounded-2xl font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Remarks</label>
                                        <Input
                                            placeholder="Collection notes..."
                                            value={formData.remarks}
                                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                            className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                                        className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs"
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="h-14 px-12 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-colors shadow-xl"
                                    >
                                        {editingId ? 'Update Record' : 'Post Ledger'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
