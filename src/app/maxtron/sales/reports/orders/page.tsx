'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ClipboardList, Search, FileDown, Calendar, 
  User, Package, Filter, Download, ArrowRight
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function OrderReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    customer: ''
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
        const res = await fetch(`${API_BASE}/api/maxtron/sales/orders?company_id=${activeCo.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
            // Client side filter for date range
            const filtered = result.data.filter((item: any) => {
                const date = item.order_date.split('T')[0];
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
      item.customers?.customer_name.toLowerCase().includes(filters.customer.toLowerCase()) ||
      item.order_number.toLowerCase().includes(filters.customer.toLowerCase())
    );
  }, [data, filters.customer]);

  const totalValue = filteredData.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" /> Sales Order Report
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Detailed analysis of customer orders and quantities.</p>
        </div>
        <Button variant="outline" className="gap-2 shadow-sm border-primary/20 text-primary">
          <Download className="w-4 h-4" /> Export PDF
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
        <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> From Date
                    </label>
                    <Input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="rounded-xl border-slate-100 bg-slate-50/50" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> To Date
                    </label>
                    <Input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="rounded-xl border-slate-100 bg-slate-50/50" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 flex items-center gap-1.5">
                        <Search className="w-3 h-3" /> Search Customer / Order
                    </label>
                    <Input placeholder="Type to filter..." value={filters.customer} onChange={e => setFilters({...filters, customer: e.target.value})} className="rounded-xl border-slate-100 bg-slate-50/50" />
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary text-white border-none shadow-lg rounded-3xl p-6">
              <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-70">Total Orders</span>
                  <span className="text-4xl font-black mt-2">{filteredData.length}</span>
              </div>
          </Card>
          <Card className="bg-emerald-500 text-white border-none shadow-lg rounded-3xl p-6">
              <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-70">Total Order Value</span>
                  <span className="text-4xl font-black mt-2">₹ {totalValue.toLocaleString()}</span>
              </div>
          </Card>
          <Card className="bg-slate-900 text-white border-none shadow-lg rounded-3xl p-6">
              <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-70">Average Order Size</span>
                  <span className="text-4xl font-black mt-2">₹ {filteredData.length ? (totalValue / filteredData.length).toLocaleString(undefined, {maximumFractionDigits: 0}) : 0}</span>
              </div>
          </Card>
      </div>

      <TableView
        headers={['Order No', 'Date', 'Customer', 'Sales Executive', 'Items Count', 'Value (₹)']}
        data={filteredData}
        loading={loading}
        searchFields={['order_number', 'customers.customer_name']}
        renderRow={(row: any) => (
          <tr key={row.id} className="hover:bg-slate-50 border-b last:border-0 group">
            <td className="px-6 py-4 font-mono font-bold text-primary">{row.order_number}</td>
            <td className="px-6 py-4 text-sm">{new Date(row.order_date).toLocaleDateString()}</td>
            <td className="px-6 py-4 font-semibold text-slate-700">{row.customers?.customer_name}</td>
            <td className="px-6 py-4 text-slate-500">{row.executive?.name || 'N/A'}</td>
            <td className="px-6 py-4 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-xs">{row.items?.length || 0}</span></td>
            <td className="px-6 py-4 text-right font-black">₹ {parseFloat(row.total_value).toLocaleString()}</td>
          </tr>
        )}
      />
    </div>
  );
}
