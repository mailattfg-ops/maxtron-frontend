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
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';
import { Edit, Trash2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const PACKING_API = `${API_BASE}/api/maxtron/production/packing`;

export default function PackingSummaryReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const router = useRouter();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('prod_packing_view', 'edit');
  const canDelete = hasPermission('prod_packing_view', 'delete');

  const { info, error, success } = useToast();
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
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/maxtron/production/packing?editId=${id}`);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this packing record?',
      type: 'danger'
    });
    if (!isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${PACKING_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        success('Record deleted successfully');
        fetchReport();
      } else {
        error(result.message);
      }
    } catch (err) {
      error('Error deleting record');
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
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Packing Summary</h1>
          <p className="text-muted-foreground mt-1 font-medium">Report on finished goods bundling and inventory readiness.</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary shadow-sm transition-all">
          <Download className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      <Card className="border-primary/10 shadow-sm overflow-hidden bg-primary/5">
        <CardHeader className="pb-6 border-b border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary/70 flex items-center gap-2 px-1">
                <Calendar className="w-3 h-3" /> From Date
              </label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border-primary/20 focus:border-primary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary/70 flex items-center gap-2 px-1">
                <Calendar className="w-3 h-3" /> To Date
              </label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border-primary/20 focus:border-primary/50" />
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <div className="bg-primary rounded-lg px-6 py-3 shadow-md flex items-center gap-8 text-white">
                <div className="text-right border-r border-white/20 pr-8">
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
        headers={['Date', 'Batch No', 'Product', 'Bundles', 'Qty/Bundle', 'Total Packed', 'Actions']}
        data={filtered}
        loading={loading}
        searchFields={['production_conversions.production_batches.batch_number', 'production_conversions.production_batches.finished_products.product_name']}
        renderRow={(p: any) => {
          const batch = p.production_conversions?.production_batches;
          return (
            <tr key={p.id} className="hover:bg-primary/5 border-b last:border-none transition-all group">
              <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{new Date(p.date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-mono font-bold text-primary">{batch?.batch_number || 'N/A'}</td>
              <td className="px-6 py-4 font-bold">{batch?.finished_products?.product_name || 'N/A'}</td>
              <td className="px-6 py-4 font-black">{p.bundle_count}</td>
              <td className="px-6 py-4 text-xs font-semibold text-slate-500">{p.qty_per_bundle}</td>
              <td className="px-6 py-4 font-black text-primary">{p.total_packed_qty} Kg</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {canEdit && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(p.id)}
                      className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(p.id)}
                      className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          );
        }}
      />
    </div>
  );
}
