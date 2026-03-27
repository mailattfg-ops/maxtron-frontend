'use client';

import { useState, useEffect, useRef } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    Plus, 
    Save, 
    Calendar, 
    Receipt, 
    User, 
    Wallet, 
    Trash2,
    Edit,
    ChevronDown,
    IndianRupee, 
    CreditCard,
    ArrowDownLeft,
    FileText,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';

export default function CustomerCollectionPage() {
    const [collections, setCollections] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [customerBalance, setCustomerBalance] = useState<number | null>(null);
    const [showScrollArrow, setShowScrollArrow] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const [formData, setFormData] = useState({
        collection_date: new Date().toISOString().split('T')[0],
        customer_id: '',
        amount: '',
        payment_mode: 'CASH',
        reference_no: '',
        remarks: '',
        company_id: '' // Will be set in useEffect or handleSubmit
    });

    const [allocations, setAllocations] = useState<Record<string, any>>({}); // { invoice_id: amount }

    const { success: toastSuccess, error: toastError } = useToast();
    const { confirm } = useConfirm();
    const companyId = localStorage.getItem('companyId') || '24ea3bef-1e0c-4490-9d40-7063fb9067e9';

    useEffect(() => {
       const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const [collRes, custRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/customers?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
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
        fetchData();
        setFormData(prev => ({ ...prev, company_id: companyId }));
    }, [companyId]);

    const fetchPendingInvoices = async (customerId: string) => {
        if (!customerId) {
            setPendingInvoices([]);
            return;
        }
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/pending-invoices?customer_id=${customerId}&company_id=${companyId}`, {
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
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);
            const invData = await invRes.json();
            const collData = await collRes.json();
            
            // Strictly filter by company and customer, ensuring numbers are valid
            const activeInvoices = (invData.data || []).filter((i: any) => i.customer_id === customerId && i.company_id === companyId);
            const activeCollections = (collData.data || []).filter((c: any) => c.customer_id === customerId && c.company_id === companyId);

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
        
        // Sort invoices by date (FIFO)
        const sortedInvoices = [...invoices].sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());
        
        for (const inv of sortedInvoices) {
            if (remaining <= 0) break;
            const canCollect = Math.min(Number(inv.pending_amount), remaining);
            if (canCollect > 0) {
                newAllocations[inv.id] = String(canCollect); // Store as string for input consistency
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
            company_id: companyId,
            allocations: allocationList
        };

        try {
            const url = editingId 
                ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections/${editingId}`
                : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections`;

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
                    company_id: companyId
                });
                setAllocations({});
                setPendingInvoices([]);
                setCustomerBalance(null);
                // Re-fetch data to update the table
                const token = localStorage.getItem('token');
                const collRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const collData = await collRes.json();
                if (collData.success) setCollections(collData.data);
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
            payment_mode: row.payment_mode, // Changed from payment_method to payment_mode
            reference_no: row.reference_no || '',
            remarks: row.remarks || '',
            company_id: row.company_id
        });
        setEditingId(row.id);
        setAllocations({}); // Reset allocations on edit for safe re-entry
        setIsModalOpen(true);
        fetchCustomerBalance(row.customer_id);
        fetchPendingInvoices(row.customer_id);
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
                // Re-fetch data to update the table
                const token = localStorage.getItem('token');
                const collRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const collData = await collRes.json();
                if (collData.success) setCollections(collData.data);
            }
        } catch (error) {
            toastError('Delete failed');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <ArrowDownLeft className="text-primary w-8 h-8 md:w-10 md:h-10 p-1.5 bg-primary/10 rounded-lg shrink-0" />
                        <span className="truncate">Customer Collections</span>
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Record payments received and allocate against invoices</p>
                </div>
                <Button
                    onClick={() => { setIsModalOpen(true); setEditingId(null); }}
                    className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg shadow-primary/20 h-10 md:h-11 transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none"
                >
                    <Plus className="w-5 h-5 mr-2" />
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
                        <td className="px-6 py-4 font-black text-primary">₹{Number(row.amount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="text-blue-600 hover:bg-blue-50 rounded-lg font-bold">
                                <Edit className="w-4 h-4" />
                            </Button>
                            {/* Assuming canDelete is a variable that determines if delete is allowed */}
                            {true && ( 
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDelete(row.id)}
                                    className="text-rose-600 hover:bg-rose-50 rounded-lg font-bold"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </td>
                    </tr>
                )}
            />

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in duration-300 flex flex-col">
                        <div className="bg-primary p-6 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Plus className="w-6 h-6" />
                                    {editingId ? 'Edit Customer Collection' : 'Post Customer Collection'}
                                </h2>
                                <p className="text-white/60 text-xs">Record incoming payment and reconcile bills</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-white/80 hover:text-white font-black p-2">✕</button>
                        </div>
                        
                        <div 
                            ref={scrollRef}
                            onScroll={handleScroll}
                            className="overflow-y-auto p-8 custom-scrollbar relative"
                        >
                            {showScrollArrow && (
                                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 animate-bounce md:hidden z-[60] bg-primary text-white p-2 rounded-full shadow-lg">
                                    <ChevronDown className="w-6 h-6" />
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Collection Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="date"
                                                required
                                                value={formData.collection_date}
                                                onChange={(e) => setFormData({ ...formData, collection_date: e.target.value })}
                                                className="pl-10 h-11 bg-slate-50 border border-slate-200 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-slate-700">Select Customer</label>
                                            {customerBalance !== null && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${customerBalance > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-500'}`}>
                                                    {customerBalance > 0 ? `To Collect: ₹${customerBalance.toLocaleString()}` : `Advance Credit: ₹${Math.abs(customerBalance).toLocaleString()}`}
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                            <Select
                                                required
                                                value={formData.customer_id}
                                                onValueChange={(val) => {
                                                    handleCustomerChange(val);
                                                }}
                                            >
                                                <SelectTrigger className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm h-11">
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

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Amount Received (₹)</label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                                                className="pl-10 h-14 bg-white border-2 border-primary/20 rounded-xl text-lg font-black text-primary"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {formData.customer_id && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                Pending Invoices
                                            </h3>
                                            <div className="text-[10px] font-black bg-slate-50 text-slate-600 px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest">
                                                Total Outstanding: ₹{pendingInvoices.reduce((s, si) => s + Number(si.pending_amount), 0).toLocaleString()}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-x-auto">
                                            <table className="w-full min-w-[700px] text-left text-sm">
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
                                                                    <span className="text-primary font-black">₹{Number(inv.pending_amount).toLocaleString()}</span>
                                                                </td>
                                                                <td className="px-6 py-4 w-48 text-center">
                                                                    <Input 
                                                                        type="number"
                                                                        placeholder="Amount"
                                                                        value={allocations[inv.id] || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                                handleAllocationChange(inv.id, val, inv.pending_amount)
                                                                            }
                                                                        }}
                                                                        className="w-full h-8 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-right text-xs font-bold"
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
                                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-primary uppercase tracking-tight">Allocated against Bills</span>
                                        </div>
                                        <span className="font-black text-primary">₹{totalAllocated.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">Advance Balance</span>
                                        </div>
                                        <span className="font-black text-slate-600">₹{advanceAmount.toLocaleString()}</span>
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
                                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                                <Select
                                                    value={formData.payment_mode}
                                                    onValueChange={(val) => setFormData({ ...formData, payment_mode: val })}
                                                >
                                                    <SelectTrigger className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm h-11">
                                                        <SelectValue placeholder="Mode" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white border-slate-200">
                                                        <SelectItem value="CASH">Cash</SelectItem>
                                                        <SelectItem value="BANK">Bank / IMPS</SelectItem>
                                                        <SelectItem value="UPI">UPI / Scan</SelectItem>
                                                        <SelectItem value="CHECK">Check</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Input
                                                type="text"
                                                placeholder="Ref / Chq No"
                                                value={formData.reference_no}
                                                onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                                                className="h-10 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Remarks</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Collection notes..."
                                            value={formData.remarks}
                                            maxLength={50}
                                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-4 sticky bottom-0 bg-white pt-4 pb-2 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                                        variant="outline"
                                        className="w-full md:flex-1 h-12 md:h-14 rounded-full font-black text-slate-500 hover:bg-slate-50 order-2 md:order-1"
                                    >
                                        DISCARD
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="w-full md:flex-1 h-12 md:h-14 bg-primary hover:bg-primary/90 text-white rounded-full font-black shadow-lg shadow-primary/10 transition-all uppercase tracking-widest order-1 md:order-2 hover:scale-105 active:scale-95"
                                    >
                                        {editingId ? 'Update Collection' : 'Post Collection'}
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
