'use client';

import { useState, useEffect, useRef } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    Plus, 
    Calendar, 
    IndianRupee, 
    Tag,
    User,
    Wallet,
    Trash2,
    Edit,
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

export default function PettyCashPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
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
            const url = editingId 
                ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/petty-cash/${editingId}`
                : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/petty-cash`;
            
            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ...formData, company_id: companyId })
            });

            const data = await res.json();
            if (data.success) {
                toastSuccess(editingId ? 'Record updated' : 'Expense recorded');
                setIsModalOpen(false);
                setEditingId(null);
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

    const handleEdit = (row: any) => {
        setFormData({
            date: new Date(row.date).toISOString().split('T')[0],
            category: row.category,
            paid_to: row.paid_to,
            amount: String(row.amount),
            remarks: row.remarks || ''
        });
        setEditingId(row.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            category: 'Tea/Snacks',
            paid_to: '',
            amount: '',
            remarks: ''
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Wallet className="text-primary w-8 h-8 md:w-10 md:h-10 p-1.5 bg-primary/10 rounded-lg shrink-0" />
                        <span className="truncate">Petty Cash Management</span>
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm font-medium">Daily tracking of small operational expenditures</p>
                </div>
                <Button
                    onClick={() => { handleCloseModal(); setIsModalOpen(true); }}
                    className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg shadow-primary/20 h-10 md:h-11 transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none"
                >
                    <Plus className="w-5 h-5 mr-2" />
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
                            <td className="px-6 py-4 font-black text-primary">₹{Number(row.amount).toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="text-primary hover:bg-primary/5 rounded-lg font-bold">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="text-destructive hover:bg-destructive/5 rounded-lg font-bold">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
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
                                {editingId ? 'Edit Petty Cash Voucher' : 'New Petty Cash Voucher'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-white/80 hover:text-white font-black">✕</button>
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
                                        <label className="text-sm font-semibold text-slate-700">Amount {!formData.amount && <span className="text-[10px] font-medium lowercase">(₹)</span>}</label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1-2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="number"
                                                required
                                                placeholder="0.00"
                                                value={formData.amount === '0' ? '' : formData.amount}
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
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                            <Select
                                                value={formData.category}
                                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                                            >
                                                <SelectTrigger className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm h-11">
                                                    <SelectValue placeholder="Category" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-slate-200">
                                                    <SelectItem value="Tea/Snacks">Tea/Snacks</SelectItem>
                                                    <SelectItem value="Stationery">Stationery</SelectItem>
                                                    <SelectItem value="Travel">Travel</SelectItem>
                                                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                                                    <SelectItem value="Others">Others</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Paid To</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="text"
                                                required
                                                maxLength={20}
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

                                <div className="flex flex-col md:flex-row items-center gap-3 pt-4 sticky bottom-0 bg-white">
                                    <Button
                                        type="button"
                                        onClick={handleCloseModal}
                                        variant="outline"
                                        className="w-full md:flex-1 h-12 md:h-14 border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-50 transition-colors order-2 md:order-1"
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="w-full md:flex-1 h-12 md:h-14 bg-primary hover:bg-primary/95 text-white rounded-full font-black transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 order-1 md:order-2"
                                    >
                                        {editingId ? 'Update Record' : 'Record Expense'}
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
