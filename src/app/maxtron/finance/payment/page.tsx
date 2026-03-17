'use client';

import { useState, useEffect } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    Plus, 
    Calendar, 
    DollarSign, 
    Truck, 
    CreditCard,
    ArrowUpRight,
    Trash2,
    FileText,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SupplierPaymentPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [pendingBills, setPendingBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [formData, setFormData] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        amount: '',
        payment_mode: 'CASH',
        reference_no: '',
        remarks: ''
    });

    const [allocations, setAllocations] = useState<any>({}); // { bill_id: amount }

    const { success: toastSuccess, error: toastError } = useToast();
    const { confirm } = useConfirm();
    const companyId = localStorage.getItem('companyId') || '24ea3bef-1e0c-4490-9d40-7063fb9067e9';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [payRes, supRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/payments?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/suppliers?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            const payData = await payRes.json();
            const supData = await supRes.json();

            if (payData.success) setPayments(payData.data);
            if (supData.success) setSuppliers(supData.data);
        } catch (error) {
            toastError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingBills = async (supplierId: string) => {
        if (!supplierId) {
            setPendingBills([]);
            return;
        }
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/pending-bills?supplierId=${supplierId}&companyId=${companyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setPendingBills(data.data);
                // Reset allocations when supplier changes
                setAllocations({});
            }
        } catch (error) {
            toastError('Failed to fetch pending bills');
        }
    };

    const handleSupplierChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setFormData({ ...formData, supplier_id: id });
        fetchPendingBills(id);
        fetchSupplierBalance(id);
    };

    const [supplierBalance, setSupplierBalance] = useState<number | null>(null);

    const fetchSupplierBalance = async (supplierId: string) => {
        if (!supplierId) return;
        try {
            const [purRes, payRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/purchase-entries?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/payments?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);
            const purData = await purRes.json();
            const payData = await payRes.json();
            
            const totalPurchases = (purData.data || []).filter((p: any) => p.supplier_id === supplierId).reduce((sum: number, p: any) => sum + Number(p.total_amount), 0);
            const totalPayments = (payData.data || []).filter((pm: any) => pm.supplier_id === supplierId).reduce((sum: number, pm: any) => sum + Number(pm.amount), 0);
            
            setSupplierBalance(totalPurchases - totalPayments);
        } catch (error) {
            console.error('Balance fetch failed');
        }
    };

    const autoAllocate = (totalAmount: number, bills: any[]) => {
        let remaining = totalAmount;
        const newAllocations: any = {};
        
        // Sort bills by date (FIFO)
        const sortedBills = [...bills].sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
        
        for (const bill of sortedBills) {
            if (remaining <= 0) break;
            const canPay = Math.min(Number(bill.pending_amount), remaining);
            newAllocations[bill.id] = canPay;
            remaining -= canPay;
        }
        setAllocations(newAllocations);
    };

    useEffect(() => {
        if (formData.amount && pendingBills.length > 0) {
            autoAllocate(Number(formData.amount), pendingBills);
        }
    }, [formData.amount, pendingBills]);

    const handleAllocationChange = (billId: string, amount: string, max: number) => {
        const val = Math.max(0, Math.min(Number(amount), max));
        setAllocations({ ...allocations, [billId]: val });
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

        setSubmitting(true);
        try {
            // Prepare allocation list for backend
            const allocationList = Object.entries(allocations)
                .filter(([_, amt]) => Number(amt) > 0)
                .map(([billId, amt]) => ({
                    purchase_entry_id: billId,
                    allocated_amount: amt
                }));

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    ...formData, 
                    company_id: companyId,
                    allocations: allocationList
                })
            });

            const data = await res.json();
            if (data.success) {
                toastSuccess('Payment recorded successfully');
                setIsModalOpen(false);
                setFormData({
                    payment_date: new Date().toISOString().split('T')[0],
                    supplier_id: '',
                    amount: '',
                    payment_mode: 'CASH',
                    reference_no: '',
                    remarks: ''
                });
                setAllocations({});
                setPendingBills([]);
                fetchData();
            } else {
                toastError(data.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            message: 'Are you sure you want to delete this payment record?',
            type: 'danger'
        });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/payments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                toastSuccess('Record deleted');
                fetchData();
            }
        } catch (error) {
            toastError('Delete failed');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ArrowUpRight className="text-destructive w-8 h-8 p-1.5 bg-destructive/10 rounded-lg" />
                        Supplier Payments
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage disbursements and bill allocations</p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    New Bill Payment
                </Button>
            </div>

            {!isModalOpen && (
                <TableView
                    title="Recent Payments"
                    headers={['Voucher No', 'Date', 'Supplier', 'Mode', 'Amount', 'Actions']}
                    data={payments}
                    loading={loading}
                    searchFields={['voucher_no', 'supplier_master.supplier_name']}
                    searchPlaceholder="Search voucher or supplier..."
                    renderRow={(row: any) => (
                        <tr key={row.id} className="hover:bg-primary/5 transition-all border-b border-slate-50 last:border-none">
                            <td className="px-6 py-4 font-mono text-xs">{row.voucher_no}</td>
                            <td className="px-6 py-4">{new Date(row.payment_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-bold">{row.supplier_master?.supplier_name}</td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold uppercase">{row.payment_mode}</span>
                            </td>
                            <td className="px-6 py-4 font-black text-red-600">₹{Number(row.amount).toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} className="text-red-500 hover:bg-red-50 rounded-full h-8 w-8">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </td>
                        </tr>
                    )}
                />
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in duration-300 flex flex-col">
                        <div className="bg-primary p-6 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ArrowUpRight className="w-6 h-6" />
                                    Post Supplier Payment
                                </h2>
                                <p className="text-white/60 text-xs">Record payment and allocate against pending invoices</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white font-black p-2">✕</button>
                        </div>
                        
                        <div className="overflow-y-auto p-8 custom-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Basic Info Section */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Payment Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="date"
                                                required
                                                value={formData.payment_date}
                                                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-slate-700">Select Supplier</label>
                                            {supplierBalance !== null && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${supplierBalance > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                    {supplierBalance > 0 ? `To Pay: ₹${supplierBalance.toLocaleString()}` : `Advance: ₹${Math.abs(supplierBalance).toLocaleString()}`}
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <select
                                                required
                                                value={formData.supplier_id}
                                                onChange={handleSupplierChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                                            >
                                                <option value="">Choose Supplier</option>
                                                {suppliers.map((s: any) => (
                                                    <option key={s.id} value={s.id}>{s.supplier_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Payment Amount (₹)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                placeholder="0.00"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: String(Math.max(0, Number(e.target.value))) })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-primary/20 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-lg font-black"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Outstanding Section */}
                                {formData.supplier_id && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                Pending Invoices
                                            </h3>
                                            <div className="text-[10px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-widest">
                                                Total Outstanding: ₹{pendingBills.reduce((s, b) => s + Number(b.pending_amount), 0).toLocaleString()}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-6 py-3">Bill Details</th>
                                                        <th className="px-6 py-3">Date</th>
                                                        <th className="px-6 py-3 text-right">Bill Amount</th>
                                                        <th className="px-6 py-3 text-right">Pending</th>
                                                        <th className="px-6 py-3 text-center">Payment Allocation</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pendingBills.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium italic">
                                                                No pending invoices found for this supplier.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        pendingBills.map((bill) => (
                                                            <tr key={bill.id} className="border-b border-slate-100 last:border-none">
                                                                <td className="px-6 py-4">
                                                                    <div className="font-bold text-slate-900">{bill.invoice_number || bill.entry_number}</div>
                                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">{bill.entry_number}</div>
                                                                </td>
                                                                <td className="px-6 py-4">{new Date(bill.entry_date).toLocaleDateString()}</td>
                                                                <td className="px-6 py-4 text-right font-medium">₹{Number(bill.bill_amount).toLocaleString()}</td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className="text-amber-600 font-black">₹{Number(bill.pending_amount).toLocaleString()}</span>
                                                                </td>
                                                                <td className="px-6 py-4 w-48">
                                                                    <div className="relative">
                                                                        <input 
                                                                            type="number"
                                                                            min="0"
                                                                            placeholder="Amount"
                                                                            value={allocations[bill.id] || ''}
                                                                            onChange={(e) => handleAllocationChange(bill.id, e.target.value, bill.pending_amount)}
                                                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-right text-xs font-bold outline-none focus:border-primary"
                                                                        />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Summary Bar */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-tight">Allocated against Bills</span>
                                        </div>
                                        <span className="font-black text-emerald-600">₹{totalAllocated.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-blue-600" />
                                            <span className="text-xs font-bold text-blue-800 uppercase tracking-tight">Advance Payment</span>
                                        </div>
                                        <span className="font-black text-blue-600">₹{advanceAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest text-white/60">Total Payment</span>
                                        <span className="text-xl font-black">₹{totalPaymentAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Mode & Remarks */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                                    <div className="space-y-4">
                                        <label className="text-sm font-bold text-slate-700">Payment Configuration</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <select
                                                    value={formData.payment_mode}
                                                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none outline-none text-sm"
                                                >
                                                    <option value="CASH">Cash</option>
                                                    <option value="BANK">Bank Transfer</option>
                                                    <option value="UPI">UPI / Digital</option>
                                                    <option value="CHECK">Check / DD</option>
                                                </select>
                                            </div>
                                            <Input
                                                placeholder="Ref / UTR No"
                                                value={formData.reference_no}
                                                onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm h-11"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Remarks</label>
                                        <textarea
                                            rows={2}
                                            maxLength={50}
                                            placeholder="Notes about this transaction..."
                                            value={formData.remarks}
                                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 sticky bottom-0 bg-white pt-4 pb-2 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        variant="outline"
                                        className="flex-1 py-7 rounded-2xl font-black text-slate-500 hover:bg-slate-50"
                                    >
                                        DISCARD
                                    </Button>
                                    <Button
                                        type="submit"
                                        loading={submitting}
                                        className="flex-1 py-7 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black shadow-2xl shadow-primary/20 transition-all uppercase tracking-widest"
                                    >
                                        Confirm & Post Entry
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
