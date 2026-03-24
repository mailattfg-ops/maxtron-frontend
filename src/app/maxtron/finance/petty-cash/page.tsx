'use client';

import { useState, useEffect, useRef } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    Plus, 
    Calendar, 
    DollarSign, 
    Tag,
    User,
    Wallet,
    Trash2,
    ChevronDown
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PettyCashPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showScrollArrow, setShowScrollArrow] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Tea/Snacks',
        paid_to: '',
        amount: '',
        remarks: ''
    });

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
    }, [isModalOpen]);

    const { success: toastSuccess, error: toastError } = useToast();
    const { confirm } = useConfirm();
    const companyId = localStorage.getItem('companyId') || '24ea3bef-1e0c-4490-9d40-7063fb9067e9';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/petty-cash?companyId=${companyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setRecords(data.data);
        } catch (error) {
            toastError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/petty-cash`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ...formData, company_id: companyId })
            });

            const data = await res.json();
            if (data.success) {
                toastSuccess('Expense recorded');
                setIsModalOpen(false);
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    category: 'Tea/Snacks',
                    paid_to: '',
                    amount: '',
                    remarks: ''
                });
                fetchData();
            } else {
                toastError(data.message);
            }
        } catch (error) {
            toastError('Failed to save record');
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            message: 'Remove this petty cash entry?',
            type: 'danger'
        });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/petty-cash/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                toastSuccess('Entry removed');
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
                        <Wallet className="text-amber-500 w-8 h-8 p-1.5 bg-amber-500/10 rounded-lg" />
                        Petty Cash Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Daily tracking of small operational expenditures</p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5" />
                    New Expense
                </Button>
            </div>

            {!isModalOpen && (
                <TableView
                    title="Daily Expenses"
                    headers={['Voucher No', 'Date', 'Category', 'Paid To', 'Amount', 'Actions']}
                    data={records}
                    loading={loading}
                    searchFields={['category', 'paid_to']}
                    searchPlaceholder="Search category or recipient..."
                    renderRow={(row: any) => (
                        <tr key={row.id} className="hover:bg-primary/5 transition-all border-b border-slate-50 last:border-none">
                            <td className="px-6 py-4 font-mono text-xs">{row.voucher_no}</td>
                            <td className="px-6 py-4">{new Date(row.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black tracking-widest uppercase">
                                    {row.category}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-bold">{row.paid_to}</td>
                            <td className="px-6 py-4 font-black text-orange-600">₹{Number(row.amount).toLocaleString()}</td>
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in duration-300 flex flex-col">
                        <div className="bg-primary p-6 text-white flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Plus className="w-6 h-6" />
                                New Petty Cash Voucher
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white font-black">✕</button>
                        </div>
                        <div 
                            ref={scrollRef}
                            onScroll={handleScroll}
                            className="overflow-y-auto p-8 custom-scrollbar relative"
                        >
                            {showScrollArrow && (
                                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 animate-bounce md:hidden z-[60] bg-primary text-white p-2 rounded-full shadow-lg">
                                    <ChevronDown className="w-6 h-6" />
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="date"
                                                required
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                className="pl-10 h-10 bg-slate-50 border border-slate-200 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Amount (₹)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="number"
                                                required
                                                placeholder="0.00"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                className="pl-10 h-10 bg-slate-50 border border-slate-200 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Category</label>
                                        <div className="relative">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                                            >
                                                <option value="Tea/Snacks">Tea/Snacks</option>
                                                <option value="Stationery">Stationery</option>
                                                <option value="Travel">Travel</option>
                                                <option value="Maintenance">Maintenance</option>
                                                <option value="Others">Others</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Paid To</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="text"
                                                required
                                                placeholder="Recipient name"
                                                value={formData.paid_to}
                                                onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
                                                className="pl-10 h-10 bg-slate-50 border border-slate-200 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Description / Remarks</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Enter details of expense..."
                                        value={formData.remarks}
                                        maxLength={50}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        variant="outline"
                                        className="flex-1 py-6 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 py-6 bg-secondary hover:bg-secondary/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-secondary/20"
                                    >
                                        Record Expense
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
