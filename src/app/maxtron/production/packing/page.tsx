'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Plus, Search, Edit, Trash2, X, Save, 
  Archive, Calendar, Hash, User, 
  Package, Boxes, Activity, ArrowRightLeft, Clock
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const PACKING_API = `${API_BASE}/api/maxtron/production/packing`;
const CONVERSION_API = `${API_BASE}/api/maxtron/production/conversions`;

export default function PackingDetailsPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('prod_packing_view', 'create');
  const canEdit = hasPermission('prod_packing_view', 'edit');
  const canDelete = hasPermission('prod_packing_view', 'delete');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [packingRecords, setPackingRecords] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { success, error, info } = useToast();
  const { confirm } = useConfirm();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    conversion_id: '',
    bundle_count: 0,
    qty_per_bundle: 0,
    total_packed_qty: 0,
    date: new Date().toISOString().split('T')[0],
    company_id: ''
  });

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
      let coId = '';
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
          setFormData(prev => ({ ...prev, company_id: coId }));
        }
      }

      const convRes = await fetch(`${CONVERSION_API}?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const convData = await convRes.json();
      if (convData.success) setConversions(convData.data);

      fetchPacking(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPacking = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${PACKING_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPackingRecords(data.data);
      }
    } catch (err) {
      console.error('Error fetching packing:', err);
    }
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setFormData({
      conversion_id: p.conversion_id,
      bundle_count: parseFloat(p.bundle_count) || 0,
      qty_per_bundle: parseFloat(p.qty_per_bundle) || 0,
      total_packed_qty: parseFloat(p.total_packed_qty) || 0,
      date: p.date.split('T')[0],
      company_id: p.company_id
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this packing record? This action cannot be undone.',
      type: 'danger'
    });

    if (!isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${PACKING_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Record deleted successfully');
        fetchPacking();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error deleting record');
    }
  };

  const savePacking = async () => {
    if (!formData.conversion_id || formData.bundle_count <= 0) {
      error('Please select conversion record and enter bundle count.');
      return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${PACKING_API}/${editingId}` : PACKING_API;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Packing record updated' : 'Packing record saved');
        setShowForm(false);
        setEditingId(null);
        setFormData({
            ...formData,
            bundle_count: 0,
            qty_per_bundle: 0,
            total_packed_qty: 0
        });
        fetchPacking();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error saving packing record');
    }
  };

  const filteredPacking = packingRecords.filter(p => 
    p.production_conversions?.production_batches?.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.production_conversions?.production_batches?.finished_products?.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { key: 'date', label: 'Date', icon: Calendar },
    { key: 'production_conversions.production_batches.batch_number', label: 'Batch #', icon: Hash },
    { key: 'production_conversions.production_batches.finished_products.product_name', label: 'Product', icon: Package },
    { key: 'bundle_count', label: 'Bundles', icon: Boxes },
    { key: 'qty_per_bundle', label: 'Qty/Bundle', icon: Activity },
    { key: 'total_packed_qty', label: 'Total Packed', icon: Archive }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Package className="w-8 h-8 md:w-10 md:h-10 text-emerald-600 shrink-0" /> <span className="truncate">Packing Details</span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">Record bundling of finished goods into units.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {!showForm && canCreate && (
            <Button 
                onClick={() => {
                   setEditingId(null);
                   setFormData({
                     ...formData,
                     bundle_count: 0,
                     qty_per_bundle: 0,
                     total_packed_qty: 0,
                     date: new Date().toISOString().split('T')[0]
                   });
                   setShowForm(true);
                }} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-full shadow-lg shadow-emerald-200 h-10 md:h-11 transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" /> Record New Packing
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-emerald-200 shadow-lg animate-in slide-in-from-top duration-500 overflow-hidden">
          <CardHeader className="bg-emerald-50 border-b border-emerald-100 py-4">
            <CardTitle className="text-xl flex items-center gap-2 text-emerald-900">
              <Archive className="w-5 h-5" /> {editingId ? 'Edit Packing Entry' : 'Final Packing Entry'}
            </CardTitle>
            <CardDescription className="text-emerald-700/70">{editingId ? 'Update details for the existing packing record.' : 'Bundling conversion output into finished units.'}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Calendar className="w-4 h-4 text-emerald-600" /> Date</label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><ArrowRightLeft className="w-4 h-4 text-emerald-600" /> Select Conversion Record</label>
                <Select value={formData.conversion_id} onValueChange={(val) => setFormData({ ...formData, conversion_id: val })}>
                  <SelectTrigger className="h-10 w-full border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select Cutting/Sealing Output" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-input">
                    {conversions.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        Batch: {c.production_batches?.batch_number} - {c.production_batches?.finished_products?.product_name} ({c.output_qty} Kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Boxes className="w-4 h-4 text-emerald-600" /> Bundle Count</label>
                <Input type="number" min={0} placeholder="0" value={formData.bundle_count === 0 ? '' : formData.bundle_count} onChange={e => {
                    const cnt = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, bundle_count: cnt, total_packed_qty: cnt * formData.qty_per_bundle });
                }} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Activity className="w-4 h-4 text-emerald-600" /> Qty per Bundle (Kg/Pcs)</label>
                <Input type="number" min={0} placeholder="0.00" value={formData.qty_per_bundle === 0 ? '' : formData.qty_per_bundle} onChange={e => {
                    const check = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, qty_per_bundle: check, total_packed_qty: check * formData.bundle_count });
                }} />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Archive className="w-4 h-4 text-emerald-600" /> Total Packed Quantity</label>
                <Input type="number" value={formData.total_packed_qty} readOnly className="bg-emerald-50 text-emerald-700 font-bold text-lg h-10" />
                <p className="text-[10px] text-emerald-400 italic mt-1">Calculated: Bundles × Qty per Bundle</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col md:flex-row justify-end gap-3 border-t pt-6 px-4 md:px-0">
               <Button 
                 variant="outline" 
                 onClick={() => setShowForm(false)} 
                 className="flex-1 md:flex-none px-8 rounded-full h-12 order-2 md:order-1"
               >
                 Cancel Entry
               </Button>
               <Button 
                 onClick={savePacking} 
                 className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-10 rounded-full shadow-lg shadow-emerald-200 h-12 transition-all hover:scale-105 active:scale-95 order-1 md:order-2"
               >
                 <Save className="w-4 h-4 mr-2" /> Save Final Packing
               </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Packed Unit Explorer"
          description="History of bundled finished products."
          headers={['Date', 'Batch #', 'Product', 'Bundles', 'Qty / Bundle', 'Total Packed', 'Actions']}
          data={packingRecords}
          loading={loading}
          searchFields={['production_conversions.production_batches.batch_number', 'production_conversions.production_batches.finished_products.product_name']}
          searchPlaceholder="Search packing records..."
          renderRow={(p: any) => {
            const batch = p.production_conversions?.production_batches;
            return (
              <tr key={p.id} className="hover:bg-emerald-50/50 border-b last:border-none transition-all">
                <td className="px-6 py-4 text-xs">{new Date(p.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-mono font-bold text-emerald-700">{batch?.batch_number}</td>
                <td className="px-6 py-4 font-bold">{batch?.finished_products?.product_name}</td>
                <td className="px-6 py-4 font-black">{p.bundle_count}</td>
                <td className="px-6 py-4">{p.qty_per_bundle} Kg</td>
                <td className="px-6 py-4 font-bold text-emerald-600">{p.total_packed_qty} Kg</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(p)}
                        className="h-8 w-8 rounded-full hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(p.id)}
                        className="h-8 w-8 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"
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
      )}
    </div>
  );
}
