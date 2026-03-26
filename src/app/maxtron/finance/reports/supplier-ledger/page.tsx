'use client';

import { useState, useEffect } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    BookOpen, 
    Truck,
    ArrowUpRight,
    TrendingDown,
    Filter,
    Download
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { exportToExcel } from '@/utils/export';

export default function SupplierLedgerPage() {
    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(0);

    const { error: toastError } = useToast();
    const companyId = localStorage.getItem('companyId') || '24ea3bef-1e0c-4490-9d40-7063fb9067e9';

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/suppliers?companyId=${companyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setSuppliers(data.data);
        } catch (error) {
            toastError('Failed to fetch suppliers');
        }
    };

    const fetchLedger = async () => {
        if (!selectedSupplier) return;
        setLoading(true);
        try {
            const [purRes, payRes, retRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/purchase-entries?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/payments?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/purchase-returns?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            const purData = await purRes.json();
            const payData = await payRes.json();
            const retData = await retRes.json();
            const supplier = suppliers.find(s => s.id === selectedSupplier);

            const combined = [
                {
                    id: 'OB',
                    date: '2025-01-01',
                    ref: 'OP-BAL',
                    type: 'Balance B/F',
                    credit: Number(supplier?.opening_balance || 0),
                    debit: 0
                },
                ...(purData.success ? purData.data : [])
                    .filter((p: any) => p.supplier_id === selectedSupplier)
                    .map((p: any) => ({
                        date: p.entry_date,
                        ref: p.invoice_number || p.entry_number,
                        type: 'Purchase Entry',
                        credit: Number(p.total_amount),
                        debit: 0
                    })),
                ...(payData.success ? payData.data : [])
                    .filter((pm: any) => pm.supplier_id === selectedSupplier)
                    .map((pm: any) => ({
                        date: pm.payment_date,
                        ref: pm.voucher_no,
                        type: 'Payment',
                        credit: 0,
                        debit: Number(pm.amount)
                    })),
                ...(retData.success ? retData.data : [])
                    .filter((r: any) => r.supplier_id === selectedSupplier)
                    .map((r: any) => ({
                        date: r.return_date,
                        ref: r.return_no,
                        type: 'Purchase Return',
                        credit: 0,
                        debit: Number(r.total_return_value || 0) 
                    }))
            ].sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateA - dateB;
                if (a.ref === 'OP-BAL') return -1;
                if (b.ref === 'OP-BAL') return 1;
                return 0;
            });

            let currentBalance = 0;
            const finalized = combined.map(item => {
                currentBalance += (item.credit - item.debit);
                return { ...item, balance: currentBalance };
            });

            setLedgerData(finalized);
            setBalance(currentBalance);
        } catch (error) {
            toastError('Failed to generate ledger');
        } finally {
            setLoading(false);
        }
    };

    const downloadLedger = async () => {
        if (ledgerData.length === 0) return;
        const supplier = suppliers.find(s => s.id === selectedSupplier);
        const headers = ['Date', 'Transaction Type', 'Reference', 'Bill (Credit)', 'Paid (Debit)', 'Running Balance'];
        const rows = ledgerData.map(item => [
            new Date(item.date).toLocaleDateString(),
            item.type,
            item.ref,
            Number(item.credit || 0),
            Number(item.debit || 0),
            Number(item.balance || 0)
        ]);

        await exportToExcel({
            headers,
            rows,
            filename: `Supplier_Ledger_${supplier?.supplier_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`,
            sheetName: 'Ledger Statement'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <BookOpen className="text-destructive w-8 h-8 md:w-10 md:h-10 p-1.5 bg-destructive/10 rounded-lg shrink-0" />
                        <span className="truncate">Supplier Ledger</span>
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Detailed history of purchases and payments</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
                        <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                        <Select
                            value={selectedSupplier}
                            onValueChange={(val) => setSelectedSupplier(val)}
                        >
                            <SelectTrigger className="w-full sm:w-[200px] pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm h-11">
                                <SelectValue placeholder="Select Supplier" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                                {suppliers.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={fetchLedger}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-full shadow-lg h-10 md:h-11 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto flex-1 sm:flex-none"
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        View
                    </Button>
                    {selectedSupplier && ledgerData.length > 0 && (
                        <Button 
                            onClick={downloadLedger}
                            variant="outline"
                            className="bg-white border-primary/20 text-primary hover:bg-primary/5 px-6 rounded-full shadow-sm h-10 md:h-11 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto flex-1 sm:flex-none font-bold"
                        >
                            <Download className="w-4 h-4 mr-2" /> Export
                        </Button>
                    )}
                </div>
            </div>

            {selectedSupplier && (
                <>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <TrendingDown className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Ending Payable</p>
                                    <h2 className="text-2xl font-black text-slate-900">₹{Math.abs(balance).toLocaleString()}</h2>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${balance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {balance > 0 ? 'CREDIT (PAYABLE)' : balance < 0 ? 'DEBIT (ADVANCE)' : 'SETTLED'}
                            </span>
                        </div>
                    </div>

                    <TableView
                        title={`Statement for ${suppliers.find((s: any) => s.id === selectedSupplier)?.supplier_name}`}
                        headers={['Date', 'Type', 'Reference', 'Bill (Credit)', 'Paid (Debit)', 'Balance']}
                        data={ledgerData}
                        loading={loading}
                        searchFields={['type', 'ref']}
                        searchPlaceholder="Filter ref..."
                        renderRow={(item: any) => (
                            <tr key={`${item.type}-${item.ref}`} className="hover:bg-primary/5 transition-all border-b border-slate-50 last:border-none">
                                <td className="px-6 py-4">{new Date(item.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-medium">{item.type}</td>
                                <td className="px-6 py-4 text-xs font-mono">{item.ref}</td>
                                <td className="px-6 py-4 text-blue-600 font-bold">{item.credit > 0 ? `₹${item.credit.toLocaleString()}` : '-'}</td>
                                <td className="px-6 py-4 text-orange-600 font-bold">{item.debit > 0 ? `₹${item.debit.toLocaleString()}` : '-'}</td>
                                <td className="px-6 py-4 font-black">₹{Math.abs(item.balance).toLocaleString()} {item.balance >= 0 ? 'Cr' : 'Dr'}</td>
                            </tr>
                        )}
                    />
                </>
            )}

            {!selectedSupplier && (
                <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center space-y-4">
                    <Truck className="w-16 h-16 text-slate-200" />
                    <div className="max-w-xs">
                        <h3 className="text-lg font-bold text-slate-400">No Supplier Selected</h3>
                        <p className="text-slate-400 text-sm">Select a supplier to generate the ledger statement.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
