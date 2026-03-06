'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { TableView } from '@/components/ui/table-view';
import {
  ShoppingCart, TrendingUp, Download, Calendar,
  IndianRupee, Package, Truck, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function PurchaseReportPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { info } = useToast();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      let coId = '';
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        coId = activeCo?.id || '';
      }

      const res = await fetch(`${API_BASE}/api/maxtron/purchase-entries?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setPurchases(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = purchases.filter(p => {
    if (dateFrom && new Date(p.entry_date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(p.entry_date) > new Date(dateTo)) return false;
    return true;
  });

  const totalValue = filtered.reduce((acc, p) => {
    const items = p.purchase_entry_items || [];
    return acc + items.reduce((a: number, i: any) => a + Number(i.amount || 0), 0);
  }, 0);

  const totalQty = filtered.reduce((acc, p) => {
    const items = p.purchase_entry_items || [];
    return acc + items.reduce((a: number, i: any) => a + Number(i.received_quantity || 0), 0);
  }, 0);

  const downloadCSV = () => {
    if (filtered.length === 0) { info('No data to export.'); return; }
    const rows: string[][] = [['GRN No', 'Date', 'Supplier', 'Invoice No', 'Material', 'Ordered Qty', 'Received Qty', 'Rate', 'Amount']];
    filtered.forEach(p => {
      (p.purchase_entry_items || []).forEach((item: any) => {
        rows.push([
          p.entry_number, p.entry_date, p.supplier_master?.supplier_name || '',
          p.invoice_number || '', item.raw_materials?.rm_name || '',
          item.ordered_quantity, item.received_quantity, item.rate, item.amount
        ]);
      });
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `purchase_report_${activeTenant.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    info('Purchase report exported.');
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Purchase Report</h1>
          <p className="text-muted-foreground text-sm font-medium">Detailed breakdown of all raw material purchases and GRN entries.</p>
        </div>
        <Button onClick={downloadCSV} className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="bg-white border-primary/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total GRNs</p>
              <h3 className="text-3xl font-black text-primary mt-1">{filtered.length}</h3>
            </div>
            <ShoppingCart className="w-8 h-8 text-primary/20" />
          </CardContent>
        </Card>
        <Card className="bg-white border-primary/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Qty Received</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{totalQty.toLocaleString()}</h3>
            </div>
            <Package className="w-8 h-8 text-emerald-500/20" />
          </CardContent>
        </Card>
        <Card className="bg-white border-primary/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Purchase Value</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">₹ {totalValue.toLocaleString()}</h3>
            </div>
            <IndianRupee className="w-8 h-8 text-slate-400/40" />
          </CardContent>
        </Card>
        <Card className="bg-white border-primary/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unique Suppliers</p>
              <h3 className="text-3xl font-black text-blue-600 mt-1">
                {new Set(filtered.map(p => p.supplier_id)).size}
              </h3>
            </div>
            <Truck className="w-8 h-8 text-blue-500/20" />
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-primary/10 p-4 flex flex-wrap gap-4 items-end shadow-sm">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">From Date</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 w-44" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Date</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 w-44" />
        </div>
        <Button variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); }} className="h-10 rounded-full px-5 text-sm">
          Clear Filter
        </Button>
      </div>

      {/* Table */}
      <TableView
        title="Purchase Entry Log"
        description="All GRN entries with itemised material breakdown."
        headers={['GRN / Date', 'Supplier', 'Invoice', 'Materials', 'Total Value', 'Details']}
        data={filtered}
        loading={loading}
        searchFields={['entry_number', 'invoice_number']}
        searchPlaceholder="Search GRN or Invoice..."
        renderRow={(p: any) => (
          <>
            <tr key={p.id} className="hover:bg-primary/5 transition-all border-b border-slate-50 last:border-none">
              <td className="px-6 py-4">
                <div className="font-black text-slate-800 text-[13px]">{p.entry_number}</div>
                <div className="text-[10px] text-muted-foreground flex items-center mt-0.5">
                  <Calendar className="w-2.5 h-2.5 mr-1" /> {new Date(p.entry_date).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="font-bold text-slate-700">{p.supplier_master?.supplier_name}</div>
                <div className="text-[10px] font-mono text-slate-400">{p.supplier_master?.supplier_code}</div>
              </td>
              <td className="px-6 py-4">
                <div className="font-medium text-slate-600">{p.invoice_number || '—'}</div>
                {p.invoice_date && <div className="text-[10px] text-slate-400">{new Date(p.invoice_date).toLocaleDateString()}</div>}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-black text-primary">{p.purchase_entry_items?.length || 0} {p.purchase_entry_items?.length === 1 ? 'Item' : 'Items'}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {p.purchase_entry_items?.map((i: any) => i.raw_materials?.rm_name).filter(Boolean).join(', ')}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="font-black text-slate-900">
                  ₹ {(p.purchase_entry_items || []).reduce((a: number, i: any) => a + Number(i.amount || 0), 0).toLocaleString()}
                </div>
              </td>
              <td className="px-6 py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  className="h-8 rounded-full text-xs font-bold text-primary hover:bg-primary/10"
                >
                  {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {expandedId === p.id ? 'Hide' : 'Expand'}
                </Button>
              </td>
            </tr>
            {expandedId === p.id && (
              <tr key={`${p.id}-details`} className="bg-primary/2">
                <td colSpan={6} className="px-6 py-4">
                  <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase">Material</th>
                          <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Ordered Qty</th>
                          <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Received Qty</th>
                          <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Rate (₹)</th>
                          <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(p.purchase_entry_items || []).map((item: any, idx: number) => (
                          <tr key={idx} className="bg-white hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-semibold text-slate-700">
                              {item.raw_materials?.rm_name}
                              <span className="ml-2 text-[10px] font-mono text-slate-400">{item.raw_materials?.rm_code}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{Number(item.ordered_quantity || 0).toLocaleString()} {item.raw_materials?.unit_type}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{Number(item.received_quantity || 0).toLocaleString()} {item.raw_materials?.unit_type}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">₹ {Number(item.rate || 0).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-black text-slate-900">₹ {Number(item.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {p.remarks && (
                      <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 font-medium italic">
                        Remarks: {p.remarks}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </>
        )}
      />
    </div>
  );
}
