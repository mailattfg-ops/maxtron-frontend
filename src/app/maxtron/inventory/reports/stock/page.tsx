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
import { exportToExcel } from '@/utils/export';
import { usePermission } from '@/hooks/usePermission';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Edit } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function StockListPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error, info } = useToast();
  const { user } = usePermission();
  const isAdmin = user?.role_name?.toLowerCase() === 'admin' || user?.email?.toLowerCase() === 'admin@maxtron.com';

  // Modal states
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [newOpeningStock, setNewOpeningStock] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
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

  const downloadStockReport = async () => {
    if (stock.length === 0) return;
    const headers = ['RM Code', 'Material Name', 'Grade', 'Total Purchased', 'Total Consumed', 'Balance Stock', 'Unit'];
    const rows = stock.map(s => [
      s.rm_code || '',
      s.rm_name || '',
      s.grade || '',
      Number(s.purchased || 0),
      Number(s.consumed || 0),
      Number(s.balance || 0),
      s.unit_type || ''
    ]);
    
    await exportToExcel({
        headers,
        rows,
        filename: `stock_report_${activeTenant.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Stock List'
    });
    info('Stock report exported successfully.');
  };

  const handleEditClick = (s: any) => {
    setSelectedMaterial(s);
    setAdminPassword('');
    setIsVerifyModalOpen(true);
  };

  const handleVerifyPassword = async () => {
    if (!adminPassword) return;
    setIsVerifying(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-admin-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await res.json();
      if (data.success) {
        setIsVerifyModalOpen(false);
        setNewOpeningStock(String(selectedMaterial?.opening_stock || 0));
        setIsEditModalOpen(true);
      } else {
        error('Invalid admin password.');
      }
    } catch (err) {
      error('Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateOpeningStock = async () => {
    if (newOpeningStock === '') return;
    setIsUpdating(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/maxtron/raw-materials/${selectedMaterial.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ opening_stock: Number(newOpeningStock) })
      });
      const data = await res.json();
      if (data.success) {
        success('Opening stock updated successfully.');
        setIsEditModalOpen(false);
        window.location.reload();
      } else {
        error(data.message || 'Update failed.');
      }
    } catch (err) {
      error('Update failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Stock Registry</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Real-time inventory levels and floor issuance.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Button onClick={downloadStockReport} className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold h-11 transition-all active:scale-95">
             <Download className="w-4 h-4 mr-2" /> Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-500">
        <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all group">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unique SKUs</p>
                <h3 className="text-2xl md:text-3xl font-black text-primary mt-1">{stock.length}</h3>
              </div>
              <div className="bg-primary/10 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                <Warehouse className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all group">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Low Stock</p>
                <h3 className="text-2xl md:text-3xl font-black text-rose-500 mt-1">{stock.filter(s => s.balance < (s.stock_threshold || 100)).length}</h3>
              </div>
              <div className="bg-rose-50 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                <AlertCircle className="w-5 h-5 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>
 
        <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all group">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Stock</p>
                <h3 className="text-2xl md:text-3xl font-black text-emerald-600 mt-1">{stock.filter(s => s.balance > 0).length}</h3>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                <ArrowRightLeft className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
 
        <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all group">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Valuation</p>
                <h3 className="text-xl md:text-2xl font-black text-blue-600 mt-1">₹ {stock.reduce((acc, s) => acc + (Number(s.balance) * Number(s.rate_per_unit || 0)), 0).toLocaleString()}</h3>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
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
               <div className="font-bold text-slate-800">
                {s.rm_name?.length > 20 ? s.rm_name.slice(0, 20) + "..." : s.rm_name}
               </div>
               <div className="flex items-center mt-1">
                 <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase">{s.rm_code}</span>
                 <span className="ml-2 text-[9px] font-bold text-primary uppercase tracking-widest">{s.grade} GRADE</span>
               </div>
            </td>
            <td className="px-6 py-4">
               <div className="flex items-center justify-between group/edit">
                 <div className="flex items-center text-emerald-600 font-bold">
                   <TrendingUp className="w-3 h-3 mr-1" /> {Number(s.purchased).toLocaleString()}
                 </div>
                 {isAdmin && (
                   <button 
                    onClick={() => handleEditClick(s)}
                    className="p-1.5 hover:bg-emerald-100 rounded-full text-emerald-600 transition-all shadow-sm border border-emerald-100 bg-white ml-2"
                    title="Edit Opening Stock"
                   >
                     <Edit className="w-3.5 h-3.5" />
                   </button>
                 )}
               </div>
               <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                 {s.opening_stock > 0 ? `Incl. ${Number(s.opening_stock).toLocaleString()} Opening` : 'TOTAL ARRIVALS'}
               </div>
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
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-[9px] font-bold text-slate-500">Threshold: {s.stock_threshold || 100} {s.unit_type}</span>
               </div>
               <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${s.balance < (s.stock_threshold || 100) ? 'bg-rose-500 animate-pulse' : 'bg-primary'}`} style={{ width: `${Math.min((s.balance/s.purchased)*100 || 0, 100)}%` }}></div>
               </div>
            </td>
            <td className="px-3 md:px-0 py-4 flex justify-end">
               <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest ${
                 s.balance < (s.stock_threshold || 100) ? 'bg-rose-100 text-rose-700 border border-rose-200' : 
                 'bg-emerald-100 text-emerald-700 border border-emerald-200'
               }`}>
                 <span className="hidden md:inline">{s.balance < (s.stock_threshold || 100) ? 'LOW STOCK' : 'AVAILABLE'}</span>
                 <span className="md:hidden">{s.balance < (s.stock_threshold || 100) ? 'LOW' : 'AVBL'}</span>
               </span>
            </td>
          </tr>
        )}
      />

      {/* Password Verification Modal */}
      <Dialog open={isVerifyModalOpen} onOpenChange={setIsVerifyModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Security Verification
            </DialogTitle>
          </DialogHeader>
          <div className="p-2 space-y-4">
            <p className="text-sm text-muted-foreground font-medium">
              You are attempting to modify sensitive inventory records. Please enter your administrator password to proceed.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Admin Password</label>
              <Input 
                type="password" 
                value={adminPassword} 
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                placeholder="••••••••"
                className="h-11 border-slate-200 focus:border-primary/50 transition-all"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-4 -m-6 mt-4 border-t border-slate-100">
            <Button onClick={() => setIsVerifyModalOpen(false)} variant="ghost" className="rounded-full font-bold text-slate-500">
              Cancel
            </Button>
            <Button 
              onClick={handleVerifyPassword} 
              disabled={isVerifying || !adminPassword}
              className="bg-primary hover:bg-primary/95 text-white rounded-full px-8 font-bold shadow-lg shadow-primary/20"
            >
              {isVerifying ? 'Verifying...' : 'Unlock Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Opening Stock Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-500" />
              Adjust Opening Stock
            </DialogTitle>
          </DialogHeader>
          <div className="p-2 space-y-4">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
               <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Current Material</p>
               <h4 className="text-lg font-black text-emerald-900">{selectedMaterial?.rm_name}</h4>
               <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-tighter">Code: {selectedMaterial?.rm_code} | Grade: {selectedMaterial?.grade}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">New Opening Balance ({selectedMaterial?.unit_type})</label>
              <Input 
                type="number" 
                value={newOpeningStock} 
                onChange={(e) => setNewOpeningStock(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateOpeningStock()}
                placeholder="0.00"
                className="h-12 text-2xl font-black text-primary border-slate-200 focus:border-emerald-500 transition-all text-right pr-4"
              />
              <p className="text-[10px] text-muted-foreground font-medium mt-2 italic px-1">
                * Changing this value will recalculate the "Total Arrivals" and "Balance Stock" for this material across all reports.
              </p>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-4 -m-6 mt-4 border-t border-slate-100">
            <Button onClick={() => setIsEditModalOpen(false)} variant="ghost" className="rounded-full font-bold text-slate-500">
              Discard Changes
            </Button>
            <Button 
              onClick={handleUpdateOpeningStock} 
              disabled={isUpdating || newOpeningStock === ''}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 font-bold shadow-lg shadow-emerald-200"
            >
              {isUpdating ? 'Saving...' : 'Update Balance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
