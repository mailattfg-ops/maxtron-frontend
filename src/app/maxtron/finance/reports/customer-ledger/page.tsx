'use client';

import { useState, useEffect } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    BookOpen, 
    User,
    ArrowDownLeft,
    TrendingUp,
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

export default function CustomerLedgerPage() {
    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(0);

    const { error: toastError } = useToast();
    const companyId = localStorage.getItem('companyId') || '24ea3bef-1e0c-4490-9d40-7063fb9067e9';

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/customers?companyId=${companyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setCustomers(data.data);
        } catch (error) {
            toastError('Failed to fetch customers');
        }
    };

    const fetchLedger = async () => {
        if (!selectedCustomer) return;
        setLoading(true);
        try {
            const [invRes, collRes, retRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/sales/invoices?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/sales/returns?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            const invData = await invRes.json();
            const collData = await collRes.json();
            const retData = await retRes.json();
            const customer = customers.find(c => c.id === selectedCustomer);

            const combined = [
                {
                    id: 'OB',
                    date: '2025-01-01', // Before any current year date
                    ref: 'OP-BAL',
                    type: 'Balance B/F',
                    debit: Number(customer?.opening_balance || 0),
                    credit: 0
                },
                ...(invData.success ? invData.data : [])
                    .filter((i: any) => i.customer_id === selectedCustomer)
                    .map((i: any) => ({
                        id: i.id,
                        date: i.invoice_date,
                        ref: i.invoice_number,
                        type: 'Sales Invoice',
                        debit: Number(i.net_amount),
                        credit: 0
                    })),
                ...(collData.success ? collData.data : [])
                    .filter((c: any) => c.customer_id === selectedCustomer)
                    .map((c: any) => ({
                        id: c.id,
                        date: c.collection_date,
                        ref: c.voucher_no,
                        type: 'Receipt',
                        debit: 0,
                        credit: Number(c.amount)
                    })),
                ...(retData.success ? retData.data : [])
                    .filter((r: any) => r.customer_id === selectedCustomer)
                    .map((r: any) => ({
                        id: r.id,
                        date: r.return_date,
                        ref: r.return_no,
                        type: 'Sales Return',
                        debit: 0,
                        credit: Number(r.total_return_value || 0)
                    }))
            ].sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateA - dateB;
                // If same day, put OB first
                if (a.id === 'OB') return -1;
                if (b.id === 'OB') return 1;
                return 0;
            });

            let currentBalance = 0;
            const finalized = combined.map(item => {
                currentBalance += (item.debit - item.credit);
                return { ...item, balance: currentBalance };
            });

            setLedgerData(finalized);
            setBalance(currentBalance);
        } catch (err) {
            toastError('Failed to generate ledger');
        } finally {
            setLoading(false);
        }
    };

    const downloadLedger = async () => {
        if (ledgerData.length === 0) return;
        const customer = customers.find(c => c.id === selectedCustomer);
        const headers = ['Date', 'Transaction Type', 'Reference', 'Debit (+)', 'Credit (-)', 'Running Balance'];
        const rows = ledgerData.map(item => [
            new Date(item.date).toLocaleDateString(),
            item.type,
            item.ref,
            Number(item.debit || 0),
            Number(item.credit || 0),
            Number(item.balance || 0)
        ]);

        await exportToExcel({
            headers,
            rows,
            filename: `Customer_Ledger_${customer?.customer_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`,
            sheetName: 'Ledger Statement'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <BookOpen className="text-primary w-8 h-8 md:w-10 md:h-10 p-1.5 bg-primary/10 rounded-lg shrink-0" />
                        <span className="truncate">Customer Ledger</span>
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Detailed transaction history and outstanding balance</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                        <Select
                            value={selectedCustomer}
                            onValueChange={(val) => setSelectedCustomer(val)}
                        >
                            <SelectTrigger className="w-full sm:w-[200px] pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm h-11">
                                <SelectValue placeholder="Select Customer" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                                {customers.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>
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
                    {selectedCustomer && ledgerData.length > 0 && (
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

            {selectedCustomer && (
                <>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Ending Balance</p>
                                    <h2 className="text-2xl font-black text-slate-900">₹{Math.abs(balance).toLocaleString()}</h2>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${balance > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {balance > 0 ? 'DEBIT (DUE)' : balance < 0 ? 'CREDIT (ADVANCE)' : 'SETTLED'}
                            </span>
                        </div>
                    </div>

                    <TableView
                        title={`Statement for ${customers.find((c: any) => c.id === selectedCustomer)?.customer_name}`}
                        headers={['Date', 'Type', 'Reference', 'Debit (+)', 'Credit (-)', 'Balance']}
                        data={ledgerData}
                        loading={loading}
                        searchFields={['type', 'ref']}
                        searchPlaceholder="Filter description..."
                        renderRow={(item: any) => (
                            <tr key={`${item.type}-${item.ref}-${item.date}`} className="hover:bg-primary/5 transition-all border-b border-slate-50 last:border-none">
                                <td className="px-6 py-4">{new Date(item.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-medium">{item.type}</td>
                                <td className="px-6 py-4 text-xs font-mono">{item.ref}</td>
                                <td className="px-6 py-4 font-bold text-red-600">{item.debit > 0 ? `₹${item.debit.toLocaleString()}` : '-'}</td>
                                <td className="px-6 py-4 font-bold text-green-600">{item.credit > 0 ? `₹${item.credit.toLocaleString()}` : '-'}</td>
                                <td className="px-6 py-4 font-black">₹{Math.abs(item.balance).toLocaleString()} {item.balance >= 0 ? 'Dr' : 'Cr'}</td>
                            </tr>
                        )}
                    />
                </>
            )}

            {!selectedCustomer && (
                <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center space-y-4">
                    <User className="w-16 h-16 text-slate-200" />
                    <div className="max-w-xs">
                        <h3 className="text-lg font-bold text-slate-400">No Customer Selected</h3>
                        <p className="text-slate-400 text-sm">Please select a customer from the dropdown to see their detailed ledger statement.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
