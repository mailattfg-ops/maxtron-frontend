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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function BillingSummary() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    search: ''
  });

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" /> Billing Summary
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Monthly revenue analysis and tax breakdown.</p>
        </div>
        <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-600">
          <Download className="w-4 h-4" /> Download Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white border-slate-100 shadow-lg rounded-3xl p-6 relative overflow-hidden group">
              <div className="flex flex-col z-10 relative">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Total Taxable</span>
                  <span className="text-2xl font-black mt-1">₹ {stats.totalAmount.toLocaleString()}</span>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><PiggyBank className="w-12 h-12" /></div>
          </Card>
          <Card className="bg-white border-slate-100 shadow-lg rounded-3xl p-6 relative overflow-hidden group">
              <div className="flex flex-col z-10 relative">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Total GST</span>
                  <span className="text-2xl font-black mt-1 text-indigo-600">₹ {stats.totalTax.toLocaleString()}</span>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Receipt className="w-12 h-12" /></div>
          </Card>
          <Card className="bg-indigo-600 border-none shadow-xl rounded-3xl p-6 relative overflow-hidden group col-span-1 md:col-span-2">
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
                      <Input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="rounded-xl" />
                      <Input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="rounded-xl" />
                  </div>
              </div>
              <div className="space-y-1.5 flex-[1.5] min-w-[300px]">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Filter by Customer / Invoice</label>
                  <Input placeholder="Search..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="rounded-xl" />
              </div>
          </div>
      </Card>

      <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
        <TableView
          headers={['Inv No', 'Date', 'Customer', 'Taxable Amt', 'GST', 'Total Amt']}
          data={filteredData}
          loading={loading}
          searchFields={['invoice_number', 'customers.customer_name']}
          renderRow={(row: any) => (
            <tr key={row.id} className="hover:bg-indigo-50/30 border-b last:border-0 transition-colors">
              <td className="px-6 py-4 font-mono font-bold text-indigo-700">{row.invoice_number}</td>
              <td className="px-6 py-4 text-sm font-medium">{new Date(row.invoice_date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-bold text-slate-800">{row.customers?.customer_name}</td>
              <td className="px-6 py-4 text-right tabular-nums">₹ {parseFloat(row.total_amount).toLocaleString()}</td>
              <td className="px-6 py-4 text-right tabular-nums text-indigo-500 font-semibold">₹ {parseFloat(row.tax_amount).toLocaleString()}</td>
              <td className="px-6 py-4 text-right tabular-nums font-black text-slate-900 border-l border-slate-50">₹ {parseFloat(row.net_amount).toLocaleString()}</td>
            </tr>
          )}
        />
      </Card>
    </div>
  );
}
