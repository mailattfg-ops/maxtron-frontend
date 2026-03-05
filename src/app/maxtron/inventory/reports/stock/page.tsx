'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableView } from '@/components/ui/table-view';
import { 
  Warehouse, Package, TrendingDown, TrendingUp, 
  ArrowRightLeft, AlertCircle, Download, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function StockListPage() {
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

      const res = await fetch(`${API_BASE}/api/maxtron/inventory/stock-summary?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStock(data.data);
      }
    } catch (err) {
      console.error('Error fetching stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadStockReport = () => {
    if (stock.length === 0) return;
    const headers = ['RM Code', 'Material Name', 'Grade', 'Total Purchased', 'Total Consumed', 'Balance Stock', 'Unit'];
    const rows = stock.map(s => [s.rm_code, s.rm_name, s.grade, s.purchased, s.consumed, s.balance, s.unit_type]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock_report_${activeTenant.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    info('Stock report exported successfully.');
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Raw Material Stock List</h1>
          <p className="text-muted-foreground text-sm font-medium">Real-time inventory levels, consumption tracking, and replenishment alerts.</p>
        </div>
        <Button onClick={downloadStockReport} className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold">
           <Download className="w-4 h-4 mr-2" /> Download Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-primary/10 overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total SKU items</p>
                <h3 className="text-3xl font-black text-primary mt-1">{stock.length}</h3>
              </div>
              <Warehouse className="w-8 h-8 text-primary/20 group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-primary/10 overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Low Stock Alerts</p>
                <h3 className="text-3xl font-black text-rose-500 mt-1">{stock.filter(s => s.balance < 500).length}</h3>
              </div>
              <AlertCircle className="w-8 h-8 text-rose-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-primary/10 overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stock Movement</p>
                <h3 className="text-3xl font-black text-emerald-600 mt-1">High</h3>
              </div>
              <ArrowRightLeft className="w-8 h-8 text-emerald-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-primary/10 overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">In-Transit Qty</p>
                <h3 className="text-3xl font-black text-blue-600 mt-1">1.2K</h3>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <TableView
        title="Live Inventory Dashboard"
        description="Consolidated view of procurement, issuance, and closing stock balance."
        headers={['Material Specs', 'Opening/Purchase', 'Consumed', 'Balance Stock', 'Status']}
        data={stock}
        loading={loading}
        searchFields={['rm_name', 'rm_code']}
        renderRow={(s: any) => (
          <tr key={s.id} className="hover:bg-slate-50 transition-all group border-b border-slate-50 last:border-none">
            <td className="px-6 py-4">
               <div className="font-bold text-slate-800">{s.rm_name}</div>
               <div className="flex items-center mt-1">
                 <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase">{s.rm_code}</span>
                 <span className="ml-2 text-[9px] font-bold text-primary uppercase tracking-widest">{s.grade} GRADE</span>
               </div>
            </td>
            <td className="px-6 py-4">
               <div className="flex items-center text-emerald-600 font-bold">
                 <TrendingUp className="w-3 h-3 mr-1" /> {Number(s.purchased).toLocaleString()}
               </div>
               <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">TOTAL ARRIVALS</div>
            </td>
            <td className="px-6 py-4 text-rose-500 font-bold">
               <div className="flex items-center">
                <TrendingDown className="w-3 h-3 mr-1" /> {Number(s.consumed).toLocaleString()}
               </div>
               <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">ISSUED TO FLOOR</div>
            </td>
            <td className="px-6 py-4">
               <div className="text-2xl font-black text-slate-900 leading-none">
                 {Number(s.balance).toLocaleString()}
                 <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{s.unit_type}</span>
               </div>
               <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${s.balance < 500 ? 'bg-rose-500' : 'bg-primary'}`} style={{ width: `${Math.min((s.balance/s.purchased)*100 || 0, 100)}%` }}></div>
               </div>
            </td>
            <td className="px-6 py-4">
               <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest ${
                 s.balance < 500 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 
                 'bg-emerald-100 text-emerald-700 border border-emerald-200'
               }`}>
                 {s.balance < 500 ? 'LOW STOCK' : 'AVAILABLE'}
               </span>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
