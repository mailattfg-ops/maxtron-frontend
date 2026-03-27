'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, Search, Download, Calendar, 
  BarChart3, PiggyBank, Receipt, ArrowUpRight
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { exportToExcel } from '@/utils/export';
import { useToast } from '@/components/ui/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function BillingSummary() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    search: ''
  });

  const { info } = useToast();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  useEffect(() => {
    fetchReport();
  }, [filters.startDate, filters.endDate]);

  const fetchReport = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      const activeCo = compData.data?.find((c: any) => c.company_name.toUpperCase() === activeTenant);
      
      if (activeCo) {
        const res = await fetch(`${API_BASE}/api/maxtron/sales/invoices?company_id=${activeCo.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
            const filtered = result.data.filter((item: any) => {
                const date = item.invoice_date.split('T')[0];
                return date >= filters.startDate && date <= filters.endDate;
            });
            setData(filtered);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => 
      item.customers?.customer_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.invoice_number.toLowerCase().includes(filters.search.toLowerCase())
    );
  }, [data, filters.search]);

  const stats = useMemo(() => {
    const totalAmount = filteredData.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
    const totalTax = filteredData.reduce((sum, item) => sum + (parseFloat(item.tax_amount) || 0), 0);
    const totalNet = filteredData.reduce((sum, item) => sum + (parseFloat(item.net_amount) || 0), 0);
    return { totalAmount, totalTax, totalNet };
  }, [filteredData]);

  const downloadExcel = async () => {
    if (filteredData.length === 0) {
      info('No billing records to export.');
      return;
    }
    const headers = ['Inv No', 'Date', 'Customer', 'Taxable Amt', 'GST', 'Total Net'];
    const rows = filteredData.map(row => [
      row.invoice_number,
      new Date(row.invoice_date).toLocaleDateString(),
      row.customers?.customer_name || 'N/A',
      Number(row.total_amount || 0),
      Number(row.tax_amount || 0),
      Number(row.net_amount || 0)
    ]);

    await exportToExcel({
      headers,
      rows,
      filename: `billing_summary_${activeTenant.toLowerCase()}_${filters.startDate}_to_${filters.endDate}.xlsx`,
      sheetName: 'Sales Billing'
    });
    info('Billing summary exported successfully!');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" /> Billing Summary
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Monthly revenue analysis and tax breakdown.</p>
        </div>
        <Button onClick={downloadExcel} variant="outline" className="gap-2 border-primary/20 text-primary font-bold hover:bg-primary/5 px-6 rounded-full shadow-sm h-11 transition-all active:scale-95">
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white border-primary/10 shadow-lg rounded-3xl p-6 relative overflow-hidden group">
              <div className="flex flex-col z-10 relative">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Total Taxable</span>
                  <span className="text-2xl font-black mt-1 text-slate-900">₹ {stats.totalAmount.toLocaleString()}</span>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><PiggyBank className="w-12 h-12" /></div>
          </Card>
          <Card className="bg-white border-primary/10 shadow-lg rounded-3xl p-6 relative overflow-hidden group">
              <div className="flex flex-col z-10 relative">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Total GST</span>
                  <span className="text-2xl font-black mt-1 text-primary">₹ {stats.totalTax.toLocaleString()}</span>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Receipt className="w-12 h-12" /></div>
          </Card>
          <Card className="bg-primary border-none shadow-xl rounded-3xl p-6 relative overflow-hidden group col-span-1 md:col-span-2">
              <div className="flex flex-col z-10 relative text-white">
                  <span className="text-[10px] font-bold uppercase opacity-60">Grand Total Revenue (Net)</span>
                  <span className="text-4xl font-black mt-1">₹ {stats.totalNet.toLocaleString()}</span>
              </div>
              <div className="absolute bottom-0 right-0 p-6 opacity-20 filter blur-sm"><ArrowUpRight className="w-24 h-24 text-white" /></div>
          </Card>
      </div>

      <Card className="bg-white rounded-3xl p-8 shadow-sm border-slate-100">
          <div className="flex flex-wrap gap-6 items-end">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Date Range</label>
                  <div className="flex gap-3">
                      <Input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="rounded-xl font-bold" />
                      <Input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="rounded-xl font-bold" />
                  </div>
              </div>
              <div className="space-y-1.5 flex-[1.5] min-w-[300px]">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Filter by Customer / Invoice</label>
                  <Input placeholder="Search..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="rounded-xl font-bold" />
              </div>
          </div>
      </Card>

      <TableView
        headers={['Inv No', 'Date', 'Customer', 'Taxable Amt', 'GST', 'Total Amt']}
        data={filteredData}
        loading={loading}
        searchFields={['invoice_number', 'customers.customer_name']}
        renderRow={(row: any) => (
          <tr key={row.id} className="hover:bg-primary/5 border-b last:border-0 transition-colors group">
            <td className="px-6 py-4 font-mono font-bold text-primary">{row.invoice_number}</td>
            <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{new Date(row.invoice_date).toLocaleDateString()}</td>
            <td className="px-6 py-4 font-bold text-slate-800">{row.customers?.customer_name}</td>
            <td className="px-6 py-4 text-right tabular-nums">₹ {parseFloat(row.total_amount).toLocaleString()}</td>
            <td className="px-6 py-4 text-right tabular-nums text-primary/70 font-semibold">₹ {parseFloat(row.tax_amount).toLocaleString()}</td>
            <td className="px-6 py-4 text-right tabular-nums font-black text-slate-900 border-l border-primary/5">₹ {parseFloat(row.net_amount).toLocaleString()}</td>
          </tr>
        )}
      />
    </div>
  );
}
