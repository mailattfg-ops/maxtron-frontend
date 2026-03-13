'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  RotateCcw, Plus, Search, Edit, Trash2, X, Save, 
  Truck, Calendar, Hash, User, AlertTriangle, 
  Download, FileText, Undo2, Ban
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const RETURN_API = `${API_BASE}/api/maxtron/purchase-returns`;
const PURCHASE_API = `${API_BASE}/api/maxtron/purchase-entries`;
const SUPPLIER_API = `${API_BASE}/api/maxtron/suppliers`;

export default function PurchaseReturnPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('inv_purchase_view', 'create');
  const canEdit = hasPermission('inv_purchase_view', 'edit');
  const canDelete = hasPermission('inv_purchase_view', 'delete');
  const [showForm, setShowForm] = useState(false);
  const [returns, setReturns] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    return_no: `DN-${Date.now().toString().slice(-6)}`,
    return_date: new Date().toISOString().split('T')[0],
    purchase_entry_id: '',
    supplier_id: '',
    quantity_returned: 0,
    reason: '',
    dispatch_details: '',
    status: 'PENDING',
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

      const [pRes, supRes] = await Promise.all([
        fetch(`${PURCHASE_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${SUPPLIER_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const pData = await pRes.json();
      const supData = await supRes.json();
      
      if (pData.success) setEntries(pData.data);
      if (supData.success) setSuppliers(supData.data);

      fetchReturns(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${RETURN_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReturns(data.data);
      }
    } catch (err) {
      console.error('Error fetching returns:', err);
    }
  };

  const saveReturn = async () => {
    if (!formData.purchase_entry_id || formData.quantity_returned <= 0) {
      error('Please select GRN Entry and Quantity.');
      return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${RETURN_API}/${editingId}` : RETURN_API;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Return record updated!' : 'Debit Note created successfully!');
        setShowForm(false);
        setEditingId(null);
        fetchReturns();
        resetForm();
      } else {
        error(data.message || 'Error occurred');
      }
    } catch (err) {
      error('Network failure.');
    }
  };

  const resetForm = () => {
    setFormData({
      return_no: `DN-${Date.now().toString().slice(-6)}`,
      return_date: new Date().toISOString().split('T')[0],
      purchase_entry_id: '',
      supplier_id: '',
      quantity_returned: 0,
      reason: '',
      dispatch_details: '',
      status: 'PENDING',
      company_id: currentCompanyId
    });
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      return_no: rec.return_no,
      return_date: rec.return_date.split('T')[0],
      purchase_entry_id: rec.purchase_entry_id,
      supplier_id: rec.supplier_id,
      quantity_returned: Number(rec.quantity_returned),
      reason: rec.reason || '',
      dispatch_details: rec.dispatch_details || '',
      status: rec.status,
      company_id: rec.company_id
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Remove this return record? This will delete the Debit Note entry.',
      type: 'danger'
    });
    if (!isConfirmed) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${RETURN_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Record deleted.');
        fetchReturns();
      }
    } catch (err) {
      error('Deletion failed.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Purchase Returns</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Issue debit notes and track materials sent back to vendors due to quality issues.</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
              className="w-full md:w-auto bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg h-10 md:h-11 transition-all font-bold whitespace-nowrap"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              {showForm ? 'Cancel Return' : 'New Purchase Return'}
            </Button>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 animate-in slide-in-from-right-4 duration-500">
          <Card className="bg-white border-primary/10 shadow-sm border-r-4 border-r-rose-400">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rejections MTD</p>
                  <h3 className="text-2xl md:text-3xl font-black text-rose-600 mt-1">{returns.length}</h3>
                </div>
                <div className="bg-rose-50 p-3 rounded-2xl shrink-0">
                  <Undo2 className="w-6 h-6 text-rose-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-primary/10 shadow-sm border-r-4 border-r-orange-400">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending Dispatch</p>
                  <h3 className="text-2xl md:text-3xl font-black text-orange-600 mt-1">
                    {returns.filter(r => r.status === 'PENDING').length}
                  </h3>
                </div>
                <div className="bg-orange-50 p-3 rounded-2xl shrink-0">
                  <Truck className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hidden lg:block bg-white border-primary/10 shadow-sm border-r-4 border-r-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Top Reason</p>
                  <h3 className="text-xl font-black text-primary mt-1">Quality Mismatch</h3>
                </div>
                <div className="bg-primary/5 p-3 rounded-2xl shrink-0">
                  <AlertTriangle className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card className="border-primary/20 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
            <CardTitle className="text-xl font-bold text-primary flex items-center">
              <Undo2 className="w-5 h-5 mr-3 text-secondary" />
              {editingId ? 'Edit Return Details' : 'Purchase Return (Debit Note)'}
            </CardTitle>
            <CardDescription>Link return to a specific GRN entry and specify rejection reason.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Debit Note No</label>
                <Input value={formData.return_no} readOnly className="h-11 bg-slate-50 font-mono text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Return Date</label>
                <Input 
                  type="date"
                  value={formData.return_date}
                  onChange={(e) => setFormData({...formData, return_date: e.target.value})}
                  className="h-11"
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Link to GRN Entry</label>
                <select 
                  value={formData.purchase_entry_id}
                  onChange={(e) => {
                    const sel = entries.find(p => p.id === e.target.value);
                    if (sel) {
                      setFormData({...formData, purchase_entry_id: e.target.value, supplier_id: sel.supplier_id});
                    } else {
                      setFormData({...formData, purchase_entry_id: e.target.value});
                    }
                  }}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 text-sm font-semibold"
                >
                  <option value="">-- Choose Arrival Entry --</option>
                  {entries.map(e => (
                    <option key={e.id} value={e.id}>{e.entry_number} - {e.supplier_master?.supplier_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Supplier</label>
                <select 
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 text-sm"
                  disabled={!!formData.purchase_entry_id}
                >
                  <option value="">Select vendor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.supplier_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Quantity Returned</label>
                <Input 
                  type="number"
                  placeholder="Items going back"
                  value={formData.quantity_returned}
                  onChange={(e) => setFormData({...formData, quantity_returned: Number(e.target.value)})}
                  className="h-11 text-lg font-black text-rose-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Return Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 text-sm"
                >
                  <option value="PENDING">Pending (QC Rejected)</option>
                  <option value="DISPATCHED">Dispatched to Vendor</option>
                  <option value="CREDITED">Credit Received</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Dispatch / Vehicle Details</label>
                <Input 
                  placeholder="Courier info or vehicle no"
                  value={formData.dispatch_details}
                  onChange={(e) => setFormData({...formData, dispatch_details: e.target.value})}
                  className="h-11 uppercase"
                />
              </div>

              <div className="md:col-span-full space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Rejection Reason</label>
                <textarea 
                  className="w-full h-24 p-3 rounded-md border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-500/20 transition-all resize-none"
                  value={formData.reason}
                  maxLength={50}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Specific quality defects, color mismatch, chemical imbalance..."
                />
              </div>
            </div>

            <div className="mt-10 flex justify-end space-x-4">
              <Button onClick={() => setShowForm(false)} variant="ghost" className="px-8 h-11 rounded-full text-slate-500">
                Discard
              </Button>
              <Button onClick={saveReturn} className="bg-rose-600 hover:bg-rose-700 text-white px-10 h-11 rounded-full shadow-lg shadow-rose-200 flex items-center font-bold">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Debit Note' : 'Generate Debit Note'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Material Return Log"
          description="History of raw materials rejected and returned to suppliers."
          headers={['Debit / Date', 'Source GRN', 'Supplier Partner', 'Returned Qty', 'Reason', 'Status', 'Actions']}
          data={returns}
          loading={loading}
          searchFields={['return_no', 'suppliers.supplier_name', 'purchase_entries.entry_number']}
          searchPlaceholder="Find DN or vendor..."
          renderRow={(r: any) => (
            <tr key={r.id} className="hover:bg-rose-50 transition-all group border-b border-slate-50 last:border-none">
              <td className="px-6 py-4">
                 <div className="font-black text-rose-500 text-[13px]">{r.return_no}</div>
                 <div className="text-[10px] text-muted-foreground flex items-center mt-0.5">
                  <Calendar className="w-2.5 h-2.5 mr-1" /> {new Date(r.return_date).toLocaleDateString()}
                 </div>
              </td>
              <td className="px-6 py-4">
                 <div className="font-bold text-slate-700">{r.purchase_entries?.entry_number || 'Manual'}</div>
              </td>
              <td className="px-6 py-4">
                 <div className="font-bold text-slate-700">{r.supplier_master?.supplier_name}</div>
              </td>
              <td className="px-6 py-4">
                 <div className="text-lg font-black text-rose-600">{Number(r.quantity_returned).toLocaleString()}</div>
                 <div className="text-[10px] text-slate-400 font-bold uppercase">UNITS RETURNED</div>
              </td>
              <td className="px-6 py-4">
                 <div className="text-[11px] text-slate-500 italic max-w-[200px] truncate">{r.reason || 'No reason specified'}</div>
              </td>
              <td className="px-6 py-4">
                 <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest ${
                   r.status === 'CREDITED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                   r.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                   'bg-amber-100 text-amber-700 border border-amber-200'
                 }`}>
                   {r.status}
                 </span>
              </td>
              <td className="md:px-6 py-4 text-right space-x-1">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}
