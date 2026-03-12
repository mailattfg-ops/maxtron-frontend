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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const WASTAGE_API = `${API_BASE}/api/maxtron/production/wastage`;

export default function WastageAnalysisReport() {
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
      const res = await fetch(`${WASTAGE_API}?company_id=${targetCoId}`, {
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-rose-950">Wastage Analysis</h1>
          <p className="text-muted-foreground mt-1 text-rose-700/60">Report on material loss and scrap generation during production phases.</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" className="gap-2 border-rose-200 hover:bg-rose-50 text-rose-700 shadow-sm transition-all hover:border-rose-300">
          <Download className="w-4 h-4 text-rose-600" /> Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-rose-100 bg-white/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Scrap</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">{totalWaste.toFixed(2)} <span className="text-sm font-medium">Kg</span></p>
                </div>
                <div className="bg-rose-100 p-3 rounded-full">
                    <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
            </CardContent>
          </Card>
          <Card className="border-rose-100 bg-white/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Extrusion Loss</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">
                        {filtered.filter(w=>w.stage==='Extrusion').reduce((s,i)=>s+(parseFloat(i.wastage_qty)||0),0).toFixed(2)} <span className="text-sm font-medium">Kg</span>
                    </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                    <Activity className="w-6 h-6 text-amber-600" />
                </div>
            </CardContent>
          </Card>
          <Card className="border-rose-100 bg-white/50 backdrop-blur-sm lg:col-span-2">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conversion Loss (Cutting/Sealing)</p>
                    <p className="text-2xl font-black text-indigo-600 mt-1">
                        {filtered.filter(w=>w.stage==='Cutting').reduce((s,i)=>s+(parseFloat(i.wastage_qty)||0),0).toFixed(2)} <span className="text-sm font-medium">Kg</span>
                    </p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                    <TrendingDown className="w-6 h-6 text-indigo-600" />
                </div>
            </CardContent>
          </Card>
      </div>

      <Card className="border-rose-100 shadow-sm overflow-hidden bg-muted/10">
        <CardHeader className="pb-6 border-b border-rose-100/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-700/70 flex items-center gap-2 px-1">
                <Calendar className="w-3 h-3" /> Date Range Filter
              </label>
              <div className="flex gap-2">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border-rose-100 focus:border-rose-300 transition-all" />
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border-rose-100 focus:border-rose-300 transition-all" />
              </div>
            </div>
            <div className="flex justify-end italic text-[11px] text-muted-foreground pb-2">
                Showing {filtered.length} wastage incidents recorded across all production stages
            </div>
          </div>
        </CardHeader>
      </Card>

      <TableView
        title="Scrap Analytics"
        description="Incidents of material loss across stages."
        headers={['Date', 'Stage', 'Wasted Item', 'Waste (Kg)', 'Reason', 'Remarks']}
        data={filtered}
        loading={loading}
        searchFields={['stage', 'reason_code', 'remarks', 'raw_materials.rm_name', 'finished_products.product_name']}
        renderRow={(w: any) => (
          <tr key={w.id} className="hover:bg-rose-50 border-b last:border-none text-xs">
              <td className="px-6 py-4">{new Date(w.date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-bold text-rose-800">{w.stage}</td>
              <td className="px-6 py-4 font-medium">
                {w.raw_materials?.rm_name || w.finished_products?.product_name || 'N/A'}
              </td>
              <td className="px-6 py-4 font-mono font-black">{w.wastage_qty} Kg</td>
              <td className="px-6 py-4 text-rose-600 underline underline-offset-4">{w.reason_code}</td>
              <td className="px-6 py-4 text-muted-foreground italic truncate max-w-[200px]">{w.remarks}</td>
          </tr>
        )}
      />
    </div>
  );
}
