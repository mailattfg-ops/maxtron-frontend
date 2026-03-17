'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Truck, Search, Download, Calendar, 
  MapPin, User, CheckCircle2, Navigation2
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function DeliveryReport() {
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
        const res = await fetch(`${API_BASE}/api/maxtron/sales/deliveries?company_id=${activeCo.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
            const filtered = result.data.filter((item: any) => {
                const date = item.delivery_date.split('T')[0];
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
      item.delivery_number.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.vehicles?.registration_number.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.driver_name?.toLowerCase().includes(filters.search.toLowerCase())
    );
  }, [data, filters.search]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Truck className="w-10 h-10 text-emerald-600" /> Delivery Track Record
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Monitoring dispatch logs, vehicle logistics, and delivery fulfillment.</p>
        </div>
        <Button variant="outline" className="gap-2 border-emerald-200 text-emerald-600 rounded-xl">
          <Download className="w-4 h-4" /> Export Dispatch Log
        </Button>
      </div>

      <div className="flex gap-4 p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex-wrap">
          <div className="space-y-1.5 flex-1 min-w-[300px]">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 ml-2">Quick Search</label>
              <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Search Vehicle, Driver, or Dispatch No..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="pl-12 h-12 rounded-[1.25rem] border-slate-100 bg-slate-50 focus:bg-white transition-all" />
              </div>
          </div>
          <div className="space-y-1.5 min-w-[150px]">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 ml-2">From</label>
              <Input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="h-12 rounded-[1.25rem] border-slate-100 bg-slate-50" />
          </div>
          <div className="space-y-1.5 min-w-[150px]">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 ml-2">To</label>
              <Input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="h-12 rounded-[1.25rem] border-slate-100 bg-slate-50" />
          </div>
      </div>

      <TableView
        headers={['Dispatch ID', 'Date', 'Vehicle Reg.', 'Driver Name', 'Status', 'Line Items']}
        data={filteredData}
        loading={loading}
        searchFields={['delivery_number', 'vehicles.registration_number', 'driver_name']}
        renderRow={(row: any) => (
          <tr key={row.id} className="hover:bg-slate-50 border-b last:border-0 transition-all">
            <td className="px-6 py-5 font-mono font-black text-slate-700">{row.delivery_number}</td>
            <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(row.delivery_date).toLocaleDateString()}
                </div>
            </td>
            <td className="px-6 py-5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Navigation2 className="w-4 h-4" /></div>
                    <span className="font-black text-slate-800 tracking-tight">{row.vehicles?.registration_number}</span>
                </div>
            </td>
            <td className="px-6 py-5">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                    <User className="w-4 h-4 text-slate-400" />
                    {row.driver_name || 'Not Assigned'}
                </div>
            </td>
            <td className="px-6 py-5">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    row.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                    row.status === 'OUT_FOR_DELIVERY' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                }`}>
                    {row.status.replace(/_/g, ' ')}
                </span>
            </td>
            <td className="px-6 py-5 text-center">
                <div className="flex flex-wrap gap-1 justify-center">
                  {row.items?.slice(0, 2).map((item: any, idx: number) => (
                      <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">{item.finished_products?.product_code} ({item.quantity})</span>
                  ))}
                  {row.items?.length > 2 && <span className="text-[10px] font-bold text-slate-300">+{row.items.length - 2} more</span>}
                </div>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
