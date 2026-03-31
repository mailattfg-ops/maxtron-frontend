'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  FileText, Search, Download, Calendar, 
  BarChart, Activity, Layers, Package, Hash, Zap
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { exportToExcel } from '@/utils/export';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';
import { Edit, Trash2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const BATCH_API = `${API_BASE}/api/maxtron/production/batches`;

export default function ProductionSummaryReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const router = useRouter();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('prod_extrusion_view', 'edit');
  const canDelete = hasPermission('prod_extrusion_view', 'delete');

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
      const res = await fetch(`${BATCH_API}?company_id=${targetCoId}`, {
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
    router.push(`/maxtron/production/extrusion?editId=${id}`);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this production batch?',
      type: 'danger'
    });
    if (!isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${BATCH_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        success('Batch deleted successfully');
        fetchReport();
      } else {
        error(result.message);
      }
    } catch (err) {
      error('Error deleting batch');
    }
  };

  const downloadCSV = async () => {
    if (data.length === 0) { info('No data to export.'); return; }
    const headers = ['Date', 'Batch No', 'Product', 'Shift', 'Machine', 'RM Consumed', 'Extrusion Output'];
    const rows = data.map(b => [
      b.date || '',
      b.batch_number || '',
      b.finished_products?.product_name || 'N/A',
      b.shift || '',
      b.machine_no || '',
      Number(b.raw_material_consumed_qty || 0),
      Number(b.extrusion_output_qty || 0)
    ]);
    
    await exportToExcel({
      headers,
      rows,
      filename: `production_summary_${activeTenant.toLowerCase()}.xlsx`,
      sheetName: 'Production Summary'
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
          <h1 className="text-3xl font-bold tracking-tight text-primary">Production Summary</h1>
          <p className="text-muted-foreground mt-1 font-medium">Detailed view of extrusion output and batch efficiency.</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 shadow-sm transition-all duration-300">
          <Download className="w-4 h-4 text-primary" /> Export Excel
        </Button>
      </div>

      <Card className="border-border/40 shadow-sm overflow-hidden bg-muted/30">
        <CardHeader className="pb-6 border-b border-border/40">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="w-full grid grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                  <Calendar className="w-3 h-3 text-primary" /> From Date
                </label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-background shadow-none border-border/60 focus:border-primary/50 transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                  <Calendar className="w-3 h-3 text-primary" /> To Date
                </label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-background shadow-none border-border/60 focus:border-primary/50 transition-colors" />
              </div>
            </div>
            <div className="w-full lg:col-span-2 flex justify-center md:justify-end">
              <div className="bg-primary/5 rounded-lg px-4 py-2 border border-primary/10 flex items-center gap-4">
                <div className="text-right border-r border-primary/20 pr-4">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Total Batches</p>
                  <p className="text-xl font-black text-primary leading-none">{filtered.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Total Output</p>
                  <p className="text-xl font-black text-primary leading-none">
                    {filtered.reduce((sum, item) => sum + (parseFloat(item.extrusion_output_qty) || 0), 0).toFixed(2)} <span className="text-xs font-medium">Kg</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <TableView
        title="Production Report"
        description="Filtered view of production efficiency."
        headers={['Date', 'Batch No', 'Product', 'Shift', 'Machine', 'RM Con (Kg)', 'Output (Kg)', 'Actions']}
        data={filtered}
        loading={loading}
        searchFields={['batch_number', 'finished_products.product_name']}
        renderRow={(b: any) => (
          <tr key={b.id} className="hover:bg-primary/5 border-b last:border-none transition-all group">
            <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{new Date(b.date).toLocaleDateString()}</td>
            <td className="px-6 py-4 font-mono font-bold text-primary min-w-[150px] whitespace-nowrap">{b.batch_number}</td>
            <td className="px-6 py-4 font-bold">{b.finished_products?.product_name || 'N/A'}</td>
            <td className="px-6 py-4 text-xs font-bold uppercase text-slate-500">{b.shift}</td>
            <td className="px-6 py-4 text-xs font-semibold text-slate-500">{b.machine_no}</td>
            <td className="px-6 py-4 text-slate-600 font-medium">{b.raw_material_consumed_qty}</td>
            <td className="px-6 py-4 font-black text-primary">{b.extrusion_output_qty}</td>
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                {canEdit && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEdit(b.id)}
                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(b.id)}
                    className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
