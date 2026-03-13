'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableView } from '@/components/ui/table-view';
import { 
  Warehouse, Package, TrendingDown, TrendingUp, 
  ArrowRightLeft, AlertCircle, Download, FileText, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { exportToExcel } from '@/utils/export';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function FGStockListPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { info } = useToast();
  
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
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

      const res = await fetch(`${API_BASE}/api/maxtron/inventory/fg-stock-summary?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStock(data.data);
      }
    } catch (err) {
      console.error('Error fetching FG stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadStockReport = async () => {
    if (stock.length === 0) return;
    const headers = ['Product Code', 'Product Name', 'Size', 'Color', 'Total Produced', 'Total Sold', 'Balance Stock', 'Unit'];
    const rows = stock.map(s => [
      s.product_code || '',
      s.product_name || '',
      s.size || '',
      s.color || '',
      Number(s.produced || 0),
      Number(s.sold || 0),
      Number(s.balance || 0),
      'Kg'
    ]);
    
    await exportToExcel({
      headers,
      rows,
      filename: `fg_stock_report_${activeTenant.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'FG Stock'
    });
    info('FG Stock report exported successfully.');
  };

  return (
    <div className="md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Finished Good Stock List</h1>
          <p className="text-muted-foreground text-sm font-medium">Real-time inventory levels, production tracking, and billed shipment balance.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={downloadStockReport} className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold h-11 transition-all active:scale-95">
             <Download className="w-4 h-4 mr-2" /> Download Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-primary/10 overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total SKU items</p>
                <h3 className="text-3xl font-black text-primary mt-1">{stock.length}</h3>
              </div>
              <Package className="w-8 h-8 text-primary/20 group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-primary/10 overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Low Stock Alerts</p>
                <h3 className="text-3xl font-black text-rose-500 mt-1">{stock.filter(s => s.balance < (s.stock_threshold || 50)).length}</h3>
              </div>
              <AlertCircle className="w-8 h-8 text-rose-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-primary/10 overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Available Stock</p>
                <h3 className="text-3xl font-black text-emerald-600 mt-1">
                    {stock.reduce((acc, curr) => acc + Number(curr.balance), 0).toLocaleString()} <span className="text-[10px]">Kg</span>
                </h3>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-primary/10 overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Produced</p>
                <h3 className="text-3xl font-black text-blue-600 mt-1">
                    {stock.reduce((acc, curr) => acc + Number(curr.produced), 0).toLocaleString()} <span className="text-[10px]">Kg</span>
                </h3>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <TableView
        title="Live Finished Goods Dashboard"
        description="Consolidated view of production, sales, and closing stock balance."
        headers={['Product Specification', 'Produced Qty', 'Invoiced Qty', 'Net Opening Stock', 'Stock Status']}
        data={stock}
        loading={loading}
        searchFields={['product_name', 'product_code']}
        renderRow={(s: any) => (
          <tr key={s.id} className="hover:bg-slate-50 transition-all group border-b border-indigo-50 last:border-none">
            <td className="px-6 py-4">
               <div className="font-extrabold text-indigo-950">{s.product_name}</div>
               <div className="flex items-center mt-1.5 gap-2">
                 <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 uppercase">{s.product_code}</span>
                 <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                    <ArrowRightLeft className="w-2 h-2" /> {s.size} | {s.color}
                 </span>
               </div>
            </td>
            <td className="px-6 py-4">
               <div className="flex items-center text-emerald-600 font-black">
                 <TrendingUp className="w-3.5 h-3.5 mr-1" /> {Number(s.produced).toLocaleString()} <span className="text-[10px] ml-1">Kg</span>
               </div>
               <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">TOTAL PRODUCTION</div>
            </td>
            <td className="px-6 py-4 text-rose-500 font-black">
               <div className="flex items-center">
                 <TrendingDown className="w-3.5 h-3.5 mr-1" /> {Number(s.sold).toLocaleString()} <span className="text-[10px] ml-1">Kg</span>
               </div>
               <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">ISSUED / INVOICED</div>
            </td>
            <td className="px-6 py-4">
               <div className="text-2xl font-black text-slate-900 leading-none tracking-tighter">
                 {Number(s.balance).toLocaleString()}
                 <span className="text-[10px] font-black text-slate-400 ml-1">KG</span>
               </div>
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-[9px] font-bold text-slate-500">Threshold: {s.stock_threshold || 50} Kg</span>
               </div>
               <div className="mt-1.5 w-full bg-slate-100/50 rounded-full h-2 overflow-hidden border border-slate-100">
                  <div className={`h-full ${s.balance < (s.stock_threshold || 50) ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'} transition-all duration-1000`} style={{ width: `${Math.min((s.balance/s.produced)*100 || 0, 100)}%` }}></div>
               </div>
            </td>
            <td className="px-6 py-4">
               <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border-2 ${
                 s.balance < (s.stock_threshold || 50) ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                 'bg-emerald-50 text-emerald-700 border-emerald-200'
               }`}>
                 {s.balance < (s.stock_threshold || 50) ? 'REORDER' : 'AVAIL'}
               </span>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
