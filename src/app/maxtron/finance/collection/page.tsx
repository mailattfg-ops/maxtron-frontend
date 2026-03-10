'use client';

import { useState, useEffect } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    Plus, 
    Calendar, 
    DollarSign, 
    User, 
    CreditCard,
    ArrowDownLeft,
    Trash2,
    FileText,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';

export default function CustomerCollectionPage() {
    const [collections, setCollections] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customerBalance, setCustomerBalance] = useState<number | null>(null);
    
    const [formData, setFormData] = useState({
        collection_date: new Date().toISOString().split('T')[0],
        customer_id: '',
        amount: '',
        payment_mode: 'CASH',
        reference_no: '',
        remarks: ''
    });

    const [allocations, setAllocations] = useState<any>({}); // { invoice_id: amount }

    const { success: toastSuccess, error: toastError } = useToast();
    const { confirm } = useConfirm();
    const companyId = localStorage.getItem('companyId') || '24ea3bef-1e0c-4490-9d40-7063fb9067e9';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [collRes, custRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/customers?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            const collData = await collRes.json();
            const custData = await custRes.json();

            if (collData.success) setCollections(collData.data);
            if (custData.success) setCustomers(custData.data);
        } catch (error) {
            toastError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingInvoices = async (customerId: string) => {
        if (!customerId) {
            setPendingInvoices([]);
            return;
        }
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/pending-invoices?customerId=${customerId}&companyId=${companyId}`, {
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
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/invoices?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);
            const invData = await invRes.json();
            const collData = await collRes.json();
            
            const totalInvoices = (invData.data || []).filter((i: any) => i.customer_id === customerId).reduce((sum: number, i: any) => sum + Number(i.net_amount), 0);
            const totalCollections = (collData.data || []).filter((c: any) => c.customer_id === customerId).reduce((sum: number, c: any) => sum + Number(c.amount), 0);
            
            setCustomerBalance(totalInvoices - totalCollections);
        } catch (error) {
            console.error('Balance fetch failed');
        }
    };

    const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setFormData({ ...formData, customer_id: id });
        fetchPendingInvoices(id);
        fetchCustomerBalance(id);
    };

    const autoAllocate = (totalAmount: number, invoices: any[]) => {
        let remaining = totalAmount;
        const newAllocations: any = {};
        
        // Sort invoices by date (FIFO)
        const sortedInvoices = [...invoices].sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());
        
        for (const inv of sortedInvoices) {
            if (remaining <= 0) break;
            const canCollect = Math.min(Number(inv.pending_amount), remaining);
            newAllocations[inv.id] = canCollect;
            remaining -= canCollect;
        }
        setAllocations(newAllocations);
    };

    useEffect(() => {
        if (formData.amount && pendingInvoices.length > 0) {
            autoAllocate(Number(formData.amount), pendingInvoices);
        }
    }, [formData.amount, pendingInvoices]);

    const handleAllocationChange = (invId: string, amount: string, max: number) => {
        const val = Math.min(Number(amount), max);
        setAllocations({ ...allocations, [invId]: val });
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

        try {
            const allocationList = Object.entries(allocations)
                .filter(([_, amt]) => Number(amt) > 0)
                .map(([invId, amt]) => ({
                    invoice_id: invId,
                    allocated_amount: amt
                }));

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections`, {
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
                toastSuccess('Collection recorded successfully');
                setIsModalOpen(false);
                setFormData({
                    collection_date: new Date().toISOString().split('T')[0],
                    customer_id: '',
                    amount: '',
                    payment_mode: 'CASH',
                    reference_no: '',
                    remarks: ''
                });
                setAllocations({});
                setPendingInvoices([]);
                setCustomerBalance(null);
                fetchData();
            } else {
                toastError(data.message);
            }
        } catch (error) {
            toastError('Failed to save collection');
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            message: 'Are you sure you want to delete this collection record?',
            type: 'danger'
        });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections/${id}`, {
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
                        <ArrowDownLeft className="text-emerald-500 w-8 h-8 p-1.5 bg-emerald-50 rounded-lg" />
                        Customer Collections
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Record payments received and allocate against invoices</p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    New Collection
                </Button>
            </div>

            <TableView
                title="Recent Collections"
                headers={['Voucher No', 'Date', 'Customer', 'Mode', 'Amount', 'Actions']}
                data={collections}
                loading={loading}
                searchFields={['voucher_no', 'customers.customer_name']}
                searchPlaceholder="Search voucher or customer..."
                renderRow={(row: any) => (
                    <tr key={row.id} className="hover:bg-primary/5 transition-all border-b border-slate-50 last:border-none">
                        <td className="px-6 py-4 font-mono text-xs">{row.voucher_no}</td>
                        <td className="px-6 py-4">{new Date(row.collection_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold">{row.customers?.customer_name}</td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold uppercase">{row.payment_mode}</span>
                        </td>
                        <td className="px-6 py-4 font-black text-emerald-600">₹{Number(row.amount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                             <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} className="text-red-500 hover:bg-red-50 rounded-full h-8 w-8">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </td>
                    </tr>
                )}
            />

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in duration-300 flex flex-col">
                        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ArrowDownLeft className="w-6 h-6" />
                                    Post Customer Collection
                                </h2>
                                <p className="text-white/60 text-xs">Record incoming payment and reconcile bills</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white font-black p-2">✕</button>
                        </div>
                        
                        <div className="overflow-y-auto p-8 custom-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Collection Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="date"
                                                required
                                                value={formData.collection_date}
                                                onChange={(e) => setFormData({ ...formData, collection_date: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-slate-700">Select Customer</label>
                                            {customerBalance !== null && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${customerBalance > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {customerBalance > 0 ? `To Collect: ₹${customerBalance.toLocaleString()}` : `Advance: ₹${Math.abs(customerBalance).toLocaleString()}`}
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <select
                                                required
                                                value={formData.customer_id}
                                                onChange={handleCustomerChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                                            >
                                                <option value="">Choose Customer</option>
                                                {customers.map((c: any) => (
                                                    <option key={c.id} value={c.id}>{c.customer_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Amount Received (₹)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                required
                                                placeholder="0.00"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-emerald-500/20 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-lg font-black text-emerald-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {formData.customer_id && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-emerald-500" />
                                                Pending Invoices
                                            </h3>
                                            <div className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">
                                                Total Outstanding: ₹{pendingInvoices.reduce((s, si) => s + Number(si.pending_amount), 0).toLocaleString()}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-6 py-3">Invoice No</th>
                                                        <th className="px-6 py-3">Date</th>
                                                        <th className="px-6 py-3 text-right">Bill Amount</th>
                                                        <th className="px-6 py-3 text-right">Pending</th>
                                                        <th className="px-6 py-3 text-center">Collection Allocation</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pendingInvoices.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium italic">
                                                                No pending invoices found for this customer.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        pendingInvoices.map((inv) => (
                                                            <tr key={inv.id} className="border-b border-slate-100 last:border-none">
                                                                <td className="px-6 py-4 font-bold text-slate-900">{inv.invoice_number}</td>
                                                                <td className="px-6 py-4">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                                                                <td className="px-6 py-4 text-right font-medium">₹{Number(inv.bill_amount).toLocaleString()}</td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className="text-blue-600 font-black">₹{Number(inv.pending_amount).toLocaleString()}</span>
                                                                </td>
                                                                <td className="px-6 py-4 w-48 text-center">
                                                                    <input 
                                                                        type="number"
                                                                        placeholder="Amount"
                                                                        value={allocations[inv.id] || ''}
                                                                        onChange={(e) => handleAllocationChange(inv.id, e.target.value, inv.pending_amount)}
                                                                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-right text-xs font-bold outline-none focus:border-emerald-500"
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
                                            <span className="text-xs font-bold text-blue-800 uppercase tracking-tight">Advance Balance</span>
                                        </div>
                                        <span className="font-black text-blue-600">₹{advanceAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest text-white/60">Total Received</span>
                                        <span className="text-xl font-black">₹{totalCollectionAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                                    <div className="space-y-4">
                                        <label className="text-sm font-bold text-slate-700">Payment Config</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <select
                                                    value={formData.payment_mode}
                                                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none outline-none text-sm"
                                                >
                                                    <option value="CASH">Cash</option>
                                                    <option value="BANK">Bank / IMPS</option>
                                                    <option value="UPI">UPI / Scan</option>
                                                    <option value="CHECK">Check</option>
                                                </select>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Ref / Chq No"
                                                value={formData.reference_no}
                                                onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Remarks</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Collection notes..."
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
                                        className="flex-1 py-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-2xl shadow-emerald-200 transition-all uppercase tracking-widest"
                                    >
                                        Post Collection
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
