'use client';

import { useState, useEffect, useRef } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    Plus, 
    Calendar, 
    Truck, 
    Trash2,
    Edit,
    ChevronDown,
    IndianRupee, 
    CreditCard,
    ArrowUpRight,
    FileText,
    CheckCircle2,
    AlertCircle,
    X,
    Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Card } from '@/components/ui/card';
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

export default function KeilSupplierPaymentPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [pendingBills, setPendingBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [supplierBalance, setSupplierBalance] = useState<number | null>(null);
    const [showScrollArrow, setShowScrollArrow] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    
    const [formData, setFormData] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        amount: '',
        payment_mode: 'CASH',
        reference_no: '',
        remarks: '',
        company_id: ''
    });

    const [allocations, setAllocations] = useState<Record<string, any>>({}); // { bill_id: amount }

    const { success: toastSuccess, error: toastError } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            // Find the Keil company ID
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
                    fetchPayments(coId),
                    fetchSuppliers(coId)
                ]);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
            toastError('Failed to initialize Keil finance data');
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/keil/finance/payments?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setPayments(data.data);
        } catch (error) {
            toastError('Failed to fetch payments');
        }
    };

    const fetchSuppliers = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/keil/suppliers?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setSuppliers(data.data);
        } catch (error) {
            toastError('Failed to fetch suppliers');
        }
    };

    const fetchPendingBills = async (supplierId: string) => {
        if (!supplierId) {
            setPendingBills([]);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/keil/finance/pending-bills?supplier_id=${supplierId}&company_id=${currentCompanyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setPendingBills(data.data);
                setAllocations({});
            }
        } catch (error) {
            toastError('Failed to fetch pending bills');
        }
    };

    const fetchSupplierBalance = async (supplierId: string) => {
        if (!supplierId) return;
        try {
            const [purRes, payRes] = await Promise.all([
                fetch(`${API_BASE}/api/keil/purchase_entries?company_id=${currentCompanyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${API_BASE}/api/keil/finance/payments?company_id=${currentCompanyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);
            const purData = await purRes.json();
            const payData = await payRes.json();
            
            const activePurchases = (purData.data || []).filter((p: any) => p.supplier_id === supplierId);
            const activePayments = (payData.data || []).filter((pm: any) => pm.supplier_id === supplierId);

            const totalPurchases = activePurchases.reduce((sum: number, p: any) => sum + Number(p.total_amount || p.bill_amount || 0), 0);
            const totalPayments = activePayments.reduce((sum: number, pm: any) => sum + Number(pm.amount || 0), 0);
            
            const bal = (totalPurchases - totalPayments);
            setSupplierBalance(Number(bal.toFixed(2)));
        } catch (error) {
            console.error('Balance fetch failed');
        }
    };

    const handleSupplierChange = (id: string) => {
        setFormData({ ...formData, supplier_id: id });
        fetchPendingBills(id);
        fetchSupplierBalance(id);
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
    }, [isModalOpen, pendingBills]);

    const autoAllocate = (totalAmount: number, bills: any[]) => {
        let remaining = totalAmount;
        const newAllocations: any = {};
        
        const sortedBills = [...bills].sort((a, b) => new Date(a.entry_date || a.bill_date).getTime() - new Date(b.entry_date || b.bill_date).getTime());
        
        for (const bill of sortedBills) {
            if (remaining <= 0) break;
            const canPay = Math.min(Number(bill.pending_amount), remaining);
            if (canPay > 0) {
                newAllocations[bill.id] = String(canPay);
                remaining -= canPay;
            } else {
                newAllocations[bill.id] = '';
            }
        }
        setAllocations(newAllocations);
    };

    useEffect(() => {
        if (formData.amount && pendingBills.length > 0) {
            autoAllocate(Number(formData.amount), pendingBills);
        }
    }, [formData.amount, pendingBills]);

    const handleAllocationChange = (billId: string, amount: string, max: number) => {
        const numVal = Number(amount);
        if (numVal > max) {
            setAllocations({ ...allocations, [billId]: String(max) });
        } else {
            setAllocations({ ...allocations, [billId]: amount });
        }
    };

    const totalAllocated = Object.values(allocations).reduce((sum: number, val: any) => sum + Number(val || 0), 0);
    const totalPaymentAmount = Number(formData.amount || 0);
    const advanceAmount = Math.max(0, totalPaymentAmount - totalAllocated);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (totalPaymentAmount <= 0) {
            toastError('Please enter a valid payment amount');
            return;
        }

        const allocationList = Object.entries(allocations)
            .filter(([_, amt]) => Number(amt) > 0)
            .map(([billId, amt]) => ({
                purchase_entry_id: billId,
                allocated_amount: amt
            }));

        const payload = { 
            ...formData, 
            company_id: currentCompanyId,
            allocations: allocationList
        };

        try {
            const url = editingId 
                ? `${API_BASE}/api/keil/finance/payments/${editingId}`
                : `${API_BASE}/api/keil/finance/payments`;

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
                toastSuccess(editingId ? 'Payment updated' : 'Payment recorded successfully');
                handleCloseModal();
                fetchPayments(currentCompanyId);
            } else {
                toastError(data.message);
            }
        } catch (error) {
            toastError('Failed to save payment');
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({
            payment_date: new Date().toISOString().split('T')[0],
            supplier_id: '',
            amount: '',
            payment_mode: 'CASH',
            reference_no: '',
            remarks: '',
            company_id: currentCompanyId
        });
        setAllocations({});
        setPendingBills([]);
        setSupplierBalance(null);
    };

    const handleEdit = (row: any) => {
        setFormData({
            payment_date: row.payment_date.split('T')[0],
            supplier_id: row.supplier_id,
            amount: String(row.amount),
            payment_mode: row.payment_mode,
            reference_no: row.reference_no || '',
            remarks: row.remarks || '',
            company_id: currentCompanyId
        });
        setEditingId(row.id);
        setAllocations({});
        setIsModalOpen(true);
        fetchSupplierBalance(row.supplier_id);
        fetchPendingBills(row.supplier_id);
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: 'Delete Payment?',
            message: 'Are you sure you want to remove this transaction record? This cannot be undone.',
            type: 'danger'
        });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`${API_BASE}/api/keil/finance/payments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                toastSuccess('Record deleted');
                fetchPayments(currentCompanyId);
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
                        <ArrowUpRight className="text-rose-500 w-8 h-8 md:w-10 md:h-10 p-1.5 bg-rose-50 rounded-xl shrink-0" />
                        <span className="truncate">Supplier Payments</span>
                    </h1>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Disbursement Ledger</p>
                </div>
                <Button
                    onClick={() => { setIsModalOpen(true); setEditingId(null); }}
                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs h-12 px-8 shadow-lg shadow-rose-100 transition-all hover:scale-105 active:scale-95 w-full md:w-auto"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Bill Payment
                </Button>
            </div>

            <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                <TableView
                    title="Recent Payments"
                    headers={['Voucher No', 'Date', 'Supplier', 'Mode', 'Amount', 'Actions']}
                    data={payments}
                    loading={loading}
                    searchFields={['voucher_no', 'suppliers.supplier_name']}
                    searchPlaceholder="Search voucher or supplier..."
                    renderRow={(row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-all border-b border-slate-50 last:border-none">
                            <td className="px-8 py-6 font-mono text-xs">{row.voucher_no}</td>
                            <td className="px-8 py-6">{new Date(row.payment_date).toLocaleDateString()}</td>
                            <td className="px-8 py-6 font-bold">{row.suppliers?.supplier_name}</td>
                            <td className="px-8 py-6 text-sm font-bold text-slate-500">
                                {row.payment_mode}
                            </td>
                            <td className="px-8 py-6 font-black text-rose-600">₹{Number(row.amount).toLocaleString()}</td>
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
                        <div className="bg-rose-600 p-8 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                                    <ArrowUpRight className="w-8 h-8" />
                                    {editingId ? 'Modify Payment' : 'Post Supplier Payment'}
                                </h2>
                                <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Financial Outflow Record</p>
                            </div>
                            <button onClick={handleCloseModal} className="text-white/80 hover:text-white font-black p-2">
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
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Payment Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                                            <Input
                                                type="date"
                                                required
                                                value={formData.payment_date}
                                                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                                className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Select Supplier</label>
                                            {supplierBalance !== null && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${supplierBalance > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {supplierBalance > 0 ? `To Pay: ₹${supplierBalance.toLocaleString()}` : `Balance: ₹${Math.abs(supplierBalance).toLocaleString()}`}
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 z-10" />
                                            <Select
                                                required
                                                value={formData.supplier_id}
                                                onValueChange={(val) => handleSupplierChange(val)}
                                            >
                                                <SelectTrigger className="w-full pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold">
                                                    <SelectValue placeholder="Choose Supplier" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-slate-200">
                                                    {suppliers.map((s: any) => (
                                                        <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-rose-600">Amount Paid (₹)</label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-600" />
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
                                                className="pl-12 h-14 bg-white border-2 border-rose-500/20 rounded-2xl text-xl font-black text-rose-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {formData.supplier_id && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Reconciliation</h3>
                                            <div className="text-[10px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-widest">
                                                Total Due: ₹{pendingBills.reduce((s, b) => s + Number(b.pending_amount), 0).toLocaleString()}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-8 py-4">Bill No</th>
                                                        <th className="px-8 py-4 text-right">Bill Amount</th>
                                                        <th className="px-8 py-4 text-right text-rose-600">Pending</th>
                                                        <th className="px-8 py-4 text-center">Payment Allocation</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pendingBills.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold uppercase text-[10px]">
                                                                No outstanding bills.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        pendingBills.map((bill) => (
                                                            <tr key={bill.id} className="border-b border-slate-100 last:border-none">
                                                                <td className="px-8 py-4">
                                                                    <div className="font-black text-slate-800">{bill.invoice_number || bill.entry_number}</div>
                                                                    <div className="text-[10px] font-bold text-slate-400">{new Date(bill.entry_date || bill.bill_date).toLocaleDateString()}</div>
                                                                </td>
                                                                <td className="px-8 py-4 text-right font-bold">₹{Number(bill.bill_amount || bill.total_amount).toLocaleString()}</td>
                                                                <td className="px-8 py-4 text-right font-black text-rose-600">₹{Number(bill.pending_amount).toLocaleString()}</td>
                                                                <td className="px-8 py-4 w-48 text-center">
                                                                    <Input 
                                                                        type="number"
                                                                        placeholder="0.00"
                                                                        value={allocations[bill.id] || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                                handleAllocationChange(bill.id, val, bill.pending_amount)
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
                                    <div className="bg-rose-50 p-6 rounded-[1.5rem] border border-rose-100 flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase text-rose-800 opacity-60">Allocated</span>
                                        <span className="text-xl font-black text-rose-600">₹{totalAllocated.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-amber-50 p-6 rounded-[1.5rem] border border-amber-100 flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase text-amber-800 opacity-60">Advance Payment</span>
                                        <span className="text-xl font-black text-amber-600">₹{advanceAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-slate-900 p-6 rounded-[1.5rem] flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase text-white/50">Total Paid</span>
                                        <span className="text-xl font-black text-white">₹{totalPaymentAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Payment Configuration</label>
                                        <div className="grid grid-cols-2 gap-4 h-14">
                                            <div className="relative">
                                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 z-10" />
                                                <Select
                                                    value={formData.payment_mode}
                                                    onValueChange={(val) => setFormData({ ...formData, payment_mode: val })}
                                                >
                                                    <SelectTrigger className="w-full pl-12 h-full bg-slate-50 border-slate-200 rounded-2xl font-bold">
                                                        <SelectValue placeholder="Mode" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white border-slate-200">
                                                        <SelectItem value="CASH">Cash Payment</SelectItem>
                                                        <SelectItem value="BANK">Bank Transfer</SelectItem>
                                                        <SelectItem value="UPI">UPI / Digital</SelectItem>
                                                        <SelectItem value="CHECK">Check / DD</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Input
                                                type="text"
                                                placeholder="Ref / UTR"
                                                value={formData.reference_no}
                                                onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                                                className="h-full bg-slate-50 border-slate-200 rounded-2xl font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Remarks</label>
                                        <Input
                                            placeholder="Transaction notes..."
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
                                        onClick={handleCloseModal}
                                        className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs"
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="h-14 px-12 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-600 transition-colors shadow-xl"
                                    >
                                        {editingId ? 'Update Record' : 'Confirm & Post'}
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
