'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  AlertTriangle, Search, Download, Calendar, 
  Trash2, Info, Activity, PieChart, TrendingDown
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { exportToExcel } from '@/utils/export';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';
import { Edit, Trash2 as TrashIcon } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const WASTAGE_API = `${API_BASE}/api/maxtron/production/wastage`;

export default function WastageAnalysisReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const router = useRouter();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('prod_product_view', 'edit');
  const canDelete = hasPermission('prod_product_view', 'delete');

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
      const res = await fetch(`${WASTAGE_API}?company_id=${targetCoId}`, {
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
    router.push(`/maxtron/production/wastage?editId=${id}`);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this wastage record?',
      type: 'danger'
    });
    if (!isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${WASTAGE_API}/${id}`, {
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
    const headers = ['Date', 'Stage', 'Waste Qty', 'Reason', 'Remarks'];
    const rows = data.map(w => [
      w.date || '',
      w.stage || '',
      Number(w.wastage_qty || 0),
      w.reason_code || '',
      w.remarks || ''
    ]);
    
    await exportToExcel({
      headers,
      rows,
      filename: `wastage_analysis_${activeTenant.toLowerCase()}.xlsx`,
      sheetName: 'Wastage Report'
    });
  };

  const filtered = data.filter(item => {
    const date = item.date;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  });

  const totalWaste = filtered.reduce((sum, item) => sum + (parseFloat(item.wastage_qty) || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Wastage Analysis</h1>
          <p className="text-muted-foreground mt-1 font-medium">Report on material loss and scrap generation during production phases.</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary shadow-sm transition-all">
          <Download className="w-4 h-4 text-primary" /> Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/10 bg-white shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Scrap</p>
                    <p className="text-2xl font-black text-primary mt-1">{totalWaste.toFixed(2)} <span className="text-sm font-medium text-slate-400">Kg</span></p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                    <Trash2 className="w-6 h-6 text-primary" />
                </div>
            </CardContent>
          </Card>
          <Card className="border-primary/10 bg-white shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Extrusion Loss</p>
                    <p className="text-2xl font-black text-primary mt-1">
                        {filtered.filter(w=>w.stage==='Extrusion').reduce((s,i)=>s+(parseFloat(i.wastage_qty)||0),0).toFixed(2)} <span className="text-sm font-medium text-slate-400">Kg</span>
                    </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                    <Activity className="w-6 h-6 text-primary" />
                </div>
            </CardContent>
          </Card>
          <Card className="border-primary/10 bg-white shadow-sm lg:col-span-2">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conversion Loss (Cutting/Sealing)</p>
                    <p className="text-2xl font-black text-primary mt-1">
                        {filtered.filter(w=>w.stage==='Cutting').reduce((s,i)=>s+(parseFloat(i.wastage_qty)||0),0).toFixed(2)} <span className="text-sm font-medium text-slate-400">Kg</span>
                    </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                    <TrendingDown className="w-6 h-6 text-primary" />
                </div>
            </CardContent>
          </Card>
      </div>

      <Card className="border-primary/10 shadow-sm overflow-hidden bg-primary/5">
        <CardHeader className="pb-6 border-b border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary/70 flex items-center gap-2 px-1">
                <Calendar className="w-3 h-3" /> Date Range Filter
              </label>
              <div className="flex gap-2">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border-primary/20 focus:border-primary/50 transition-all font-medium" />
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border-primary/20 focus:border-primary/50 transition-all font-medium" />
              </div>
            </div>
            <div className="flex justify-end italic text-[11px] text-primary/60 pb-2 font-medium">
                Showing {filtered.length} wastage incidents recorded across all production stages
            </div>
          </div>
        </CardHeader>
      </Card>

      <TableView
        title="Scrap Analytics"
        description="Incidents of material loss across stages."
        headers={['Date', 'Stage', 'Wasted Item', 'Waste (Kg)', 'Reason', 'Remarks', 'Actions']}
        data={filtered}
        loading={loading}
        searchFields={['stage', 'reason_code', 'remarks', 'raw_materials.rm_name', 'finished_products.product_name']}
        renderRow={(w: any) => (
          <tr key={w.id} className="hover:bg-primary/5 border-b last:border-none text-xs transition-all group">
              <td className="px-6 py-4 font-medium text-muted-foreground">{new Date(w.date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-bold text-primary">{w.stage}</td>
              <td className="px-6 py-4 font-bold">
                {w.raw_materials?.rm_name || w.finished_products?.product_name || 'N/A'}
              </td>
              <td className="px-6 py-4 font-mono font-black text-primary">{w.wastage_qty} Kg</td>
              <td className="px-6 py-4 text-primary font-bold underline underline-offset-4 decoration-primary/20">{w.reason_code}</td>
              <td className="px-6 py-4 text-muted-foreground italic truncate max-w-[200px]">{w.remarks}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {canEdit && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(w.id)}
                      className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(w.id)}
                      className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
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
