'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Archive, Search, Download, Calendar, 
  Boxes, Package, Hash, Weight, CheckCircle, Activity
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { exportToExcel } from '@/utils/export';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const PACKING_API = `${API_BASE}/api/maxtron/production/packing`;

export default function PackingSummaryReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentCompanyId, setCurrentCompanyId] = useState('');

  const { info, error } = useToast();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          setCurrentCompanyId(activeCo.id);
          fetchReport(activeCo.id);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${PACKING_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      error('Failed to fetch report');
    }
  };

  const downloadCSV = async () => {
    if (data.length === 0) { info('No data to export.'); return; }
    const headers = ['Date', 'Batch No', 'Product', 'Bundle Count', 'Qty / Bundle', 'Total Packed'];
    const rows = data.map(p => {
      const batch = p.production_conversions?.production_batches;
      return [
        p.date || '',
        batch?.batch_number || 'N/A',
        batch?.finished_products?.product_name || 'N/A',
        Number(p.bundle_count || 0),
        Number(p.qty_per_bundle || 0),
        Number(p.total_packed_qty || 0)
      ];
    });
    
    await exportToExcel({
      headers,
      rows,
      filename: `packing_summary_${activeTenant.toLowerCase()}.xlsx`,
      sheetName: 'Packing Summary'
    });
  };

  const filtered = data.filter(item => {
    const date = item.date;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950">Packing Summary</h1>
          <p className="text-muted-foreground mt-1 text-emerald-700/60">Report on finished goods bundling and inventory readiness.</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" className="gap-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700 shadow-sm transition-all">
          <Download className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      <Card className="border-emerald-100 shadow-sm overflow-hidden bg-emerald-50/50">
        <CardHeader className="pb-6 border-b border-emerald-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-700/70 flex items-center gap-2 px-1">
                <Calendar className="w-3 h-3" /> From Date
              </label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border-emerald-200 focus:border-emerald-500" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-700/70 flex items-center gap-2 px-1">
                <Calendar className="w-3 h-3" /> To Date
              </label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border-emerald-200 focus:border-emerald-500" />
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <div className="bg-emerald-600 rounded-lg px-6 py-3 shadow-md flex items-center gap-8 text-emerald-50">
                <div className="text-right border-r border-emerald-500/30 pr-8">
                  <p className="text-[10px] uppercase font-bold tracking-widest leading-tight">Total Units Packed</p>
                  <p className="text-2xl font-black leading-none mt-1">
                    {filtered.reduce((sum, item) => sum + (parseFloat(item.total_packed_qty) || 0), 0).toFixed(2)}
                    <span className="text-xs font-medium ml-1">Kg</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold tracking-widest leading-tight">Total Bundles</p>
                  <p className="text-2xl font-black leading-none mt-1">
                    {filtered.reduce((sum, item) => sum + (parseInt(item.bundle_count) || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <TableView
        title="Packing Activity Log"
        description="Historical data for packed units."
        headers={['Date', 'Batch No', 'Product', 'Bundles', 'Qty/Bundle', 'Total Packed']}
        data={filtered}
        loading={loading}
        searchFields={['production_conversions.production_batches.batch_number', 'production_conversions.production_batches.finished_products.product_name']}
        renderRow={(p: any) => {
          const batch = p.production_conversions?.production_batches;
          return (
            <tr key={p.id} className="hover:bg-emerald-50 border-b last:border-none">
              <td className="px-6 py-4 text-xs">{new Date(p.date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-mono font-bold text-emerald-800">{batch?.batch_number}</td>
              <td className="px-6 py-4">{batch?.finished_products?.product_name}</td>
              <td className="px-6 py-4 font-black">{p.bundle_count}</td>
              <td className="px-6 py-4 text-xs">{p.qty_per_bundle}</td>
              <td className="px-6 py-4 font-bold text-emerald-600">{p.total_packed_qty} Kg</td>
            </tr>
          );
        }}
      />
    </div>
  );
}
