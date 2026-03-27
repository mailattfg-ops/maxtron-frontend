'use client';

import { useState, useEffect, useRef } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    Plus, 
    Calendar, 
    IndianRupee, 
    Truck, 
    CreditCard,
    ArrowUpRight,
    Trash2,
    Edit,
    FileText,
    CheckCircle2,
    AlertCircle,
    ChevronDown
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

export default function SupplierPaymentPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [pendingBills, setPendingBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showScrollArrow, setShowScrollArrow] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    
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
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const [paymentRes, supplierRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/payments?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/suppliers?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const paymentData = await paymentRes.json();
            const supplierData = await supplierRes.json();

            if (paymentData.success) setPayments(paymentData.data);
            if (supplierData.success) setSuppliers(supplierData.data);
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
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/pending-bills?supplier_id=${supplierId}&company_id=${companyId}`, {
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

    const [supplierBalance, setSupplierBalance] = useState<number | null>(null);

    const fetchSupplierBalance = async (supplierId: string) => {
        if (!supplierId) return;
        try {
            const [purRes, payRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/purchase-entries?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/payments?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);
            const purData = await purRes.json();
            const payData = await payRes.json();
            
            // Strictly filter by company and supplier, ensuring numbers are valid
            const activePurchases = (purData.data || []).filter((p: any) => p.supplier_id === supplierId && p.company_id === companyId);
            const activePayments = (payData.data || []).filter((pm: any) => pm.supplier_id === supplierId && pm.company_id === companyId);

            const totalPurchases = activePurchases.reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0);
            const totalPayments = activePayments.reduce((sum: number, pm: any) => sum + Number(pm.amount || 0), 0);
            
            const bal = (totalPurchases - totalPayments);
            setSupplierBalance(Number(bal.toFixed(2)));
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
            if (canPay > 0) {
                newAllocations[bill.id] = String(canPay); // Store as string for input consistency
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

        setSubmitting(true);
        try {
            // Prepare allocation list for backend
            const allocationList = Object.entries(allocations)
                .filter(([_, amt]) => Number(amt) > 0)
                .map(([billId, amt]) => ({
                    purchase_entry_id: billId,
                    allocated_amount: amt
                }));

            const url = editingId 
                ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/payments/${editingId}`
                : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/payments`;

            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
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
                toastSuccess(editingId ? 'Payment updated successfully' : 'Payment recorded successfully');
                setIsModalOpen(false);
                setEditingId(null);
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
        } catch (error) {
            toastError(editingId ? 'Failed to update payment' : 'Failed to record payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (row: any) => {
        setFormData({
            payment_date: row.payment_date.split('T')[0],
            supplier_id: row.supplier_id,
            amount: String(row.amount),
            payment_mode: row.payment_mode,
            reference_no: row.reference_no || '',
            remarks: row.remarks || ''
        });
        setEditingId(row.id);
        setAllocations({}); // Reset allocations on edit for re-entry
        setIsModalOpen(true);
        fetchSupplierBalance(row.supplier_id);
        fetchPendingBills(row.supplier_id);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <ArrowUpRight className="text-destructive w-8 h-8 md:w-10 md:h-10 p-1.5 bg-destructive/10 rounded-lg shrink-0" />
                        <span className="truncate">Supplier Payments</span>
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm font-medium">Manage disbursements and bill allocations</p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg shadow-primary/20 h-10 md:h-11 transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none"
                >
                    <Plus className="w-5 h-5 mr-2" />
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
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="text-blue-600 hover:bg-blue-50 rounded-lg font-bold">
                                    <Edit className="w-4 h-4" />
                                </Button>
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
                                    {editingId ? 'Edit Supplier Payment' : 'Post Supplier Payment'}
                                </h2>
                                <p className="text-white/60 text-xs">Record payment and allocate against pending invoices</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white font-black p-2">✕</button>
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
                                {/* Basic Info Section */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Payment Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="date"
                                                required
                                                value={formData.payment_date}
                                                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                                className="pl-10 h-11 bg-slate-50 border border-slate-200 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-slate-700">Select Supplier</label>
                                            {supplierBalance !== null && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${supplierBalance > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-500'}`}>
                                                     {supplierBalance > 0 ? `To Pay: ₹${supplierBalance.toLocaleString()}` : `Prepaid Balance: ₹${Math.abs(supplierBalance).toLocaleString()}`}
                                                 </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                            <Select
                                                required
                                                value={formData.supplier_id}
                                                onValueChange={(val) => {
                                                    setFormData({ ...formData, supplier_id: val });
                                                    fetchPendingBills(val);
                                                    fetchSupplierBalance(val);
                                                }}
                                            >
                                                <SelectTrigger className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm h-11">
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

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Payment Amount (₹)</label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="number"
                                                min="0"
                                                required
                                                placeholder="0.00"
                                                value={formData.amount}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                        setFormData({ ...formData, amount: val });
                                                    }
                                                }}
                                                className="pl-10 h-14 bg-white border-2 border-primary/20 rounded-xl text-lg font-black"
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
                                            <div className="text-[10px] font-black bg-slate-50 text-slate-600 px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest">
                                                Total Outstanding: ₹{pendingBills.reduce((s, b) => s + Number(b.pending_amount), 0).toLocaleString()}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-x-auto">
                                            <table className="w-full min-w-[700px] text-left text-sm">
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
                                                                    <span className="text-primary font-black">₹{Number(bill.pending_amount).toLocaleString()}</span>
                                                                </td>
                                                                <td className="px-6 py-4 w-48">
                                                                    <div className="relative">
                                                                        <Input 
                                                                            type="number"
                                                                            min="0"
                                                                            placeholder="Amount"
                                                                            value={allocations[bill.id] || ''}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                                    handleAllocationChange(bill.id, val, bill.pending_amount)
                                                                                }
                                                                            }}
                                                                            className="w-full h-8 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-right text-xs font-bold"
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
                                    <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-primary uppercase tracking-tight">Allocated against Bills</span>
                                        </div>
                                        <span className="font-black text-primary">₹{totalAllocated.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">Advance Payment</span>
                                        </div>
                                        <span className="font-black text-slate-600">₹{advanceAmount.toLocaleString()}</span>
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
                                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                                <Select
                                                    value={formData.payment_mode}
                                                    onValueChange={(val) => setFormData({ ...formData, payment_mode: val })}
                                                >
                                                    <SelectTrigger className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm h-full">
                                                        <SelectValue placeholder="Mode" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white border-slate-200">
                                                        <SelectItem value="CASH">Cash</SelectItem>
                                                        <SelectItem value="BANK">Bank Transfer</SelectItem>
                                                        <SelectItem value="UPI">UPI / Digital</SelectItem>
                                                        <SelectItem value="CHECK">Check / DD</SelectItem>
                                                    </SelectContent>
                                                </Select>
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

                                <div className="flex flex-col md:flex-row items-center gap-3 sticky bottom-0 bg-white pt-4 pb-2 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        variant="outline"
                                        className="w-full md:flex-1 h-12 md:h-14 rounded-full font-black text-slate-500 hover:bg-slate-50 order-2 md:order-1"
                                    >
                                        DISCARD
                                    </Button>
                                    <Button
                                        type="submit"
                                        loading={submitting}
                                        className="w-full md:flex-1 h-12 md:h-14 bg-primary hover:bg-primary/95 text-white rounded-full font-black shadow-lg shadow-primary/20 transition-all uppercase tracking-widest order-1 md:order-2 hover:scale-105 active:scale-95"
                                    >
                                        {editingId ? 'Update Payment' : 'Confirm & Post Entry'}
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
