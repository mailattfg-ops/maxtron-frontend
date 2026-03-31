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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
  const [submitting, setSubmitting] = useState(false);
  
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
    rm_id: '',
    quantity_returned: 0 as number | string,
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
    if (!formData.purchase_entry_id || Number(formData.quantity_returned) <= 0) {
      error('Please select GRN Entry and Quantity.');
      return;
    }

    const linkedEntry = entries.find(e => e.id === formData.purchase_entry_id);
    const maxQty = linkedEntry 
      ? linkedEntry.purchase_entry_items?.reduce((acc: any, i: any) => acc + Number(i.received_quantity), 0) || 0 
      : 0;

    if (maxQty > 0 && Number(formData.quantity_returned) > maxQty) {
      error(`Cannot return more than the received quantity (${maxQty}).`);
      return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${RETURN_API}/${editingId}` : RETURN_API;

    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      return_no: `DN-${Date.now().toString().slice(-6)}`,
      return_date: new Date().toISOString().split('T')[0],
      purchase_entry_id: '',
      supplier_id: '',
      rm_id: '',
      quantity_returned: 0 as number | string,
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
      rm_id: rec.rm_id || '',
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
          <Card className="bg-white border-primary/10 shadow-sm border-r-4 border-r-primary">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rejections MTD</p>
                  <h3 className="text-2xl md:text-3xl font-black text-primary mt-1">{returns.length}</h3>
                </div>
                <div className="bg-primary/5 p-3 rounded-2xl shrink-0">
                  <Undo2 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-primary/10 shadow-sm border-r-4 border-r-slate-400">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending Dispatch</p>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-600 mt-1">
                    {returns.filter(r => r.status === 'PENDING').length}
                  </h3>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl shrink-0">
                  <Truck className="w-6 h-6 text-slate-400" />
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
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.return_date}
                  onChange={(e) => setFormData({...formData, return_date: e.target.value})}
                  className="h-11"
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Link to GRN Entry</label>
                <Select 
                  value={formData.purchase_entry_id} 
                  onValueChange={(val) => {
                    const sel = entries.find(p => p.id === val);
                    if (sel) {
                      setFormData({...formData, purchase_entry_id: val, supplier_id: sel.supplier_id});
                    } else {
                      setFormData({...formData, purchase_entry_id: val});
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-11 border border-slate-200 text-sm font-semibold shadow-sm">
                    <SelectValue placeholder="-- Choose Arrival Entry --" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {entries.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.entry_number} - {e.supplier_master?.supplier_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Supplier</label>
                <Select 
                  value={formData.supplier_id} 
                  onValueChange={(val) => setFormData({...formData, supplier_id: val})}
                  disabled={!!formData.purchase_entry_id}
                >
                  <SelectTrigger className="w-full h-11 border border-slate-200 text-sm shadow-sm">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-full space-y-4">
                <div className="flex items-center space-x-2 text-primary-foreground bg-primary/10">
                   <AlertTriangle className="w-4 h-4" />
                   <h3 className="text-sm font-black uppercase tracking-widest">Return Item Details</h3>
                </div>
                
                {formData.purchase_entry_id ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Raw Material</th>
                          <th className="px-4 py-3 text-center">Received Qty</th>
                          <th className="px-4 py-3 text-right">Return Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entries.find(e => e.id === formData.purchase_entry_id)?.purchase_entry_items?.map((item: any, idx: number) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-4 py-3 font-bold text-slate-700">{item.raw_materials?.rm_name || 'N/A'}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-500">{Number(item.received_quantity).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right w-32">
                              <Input 
                                type="number"
                                min="0"
                                max={item.received_quantity}
                                placeholder="0"
                                className="h-8 text-right font-black text-primary border-primary/10 focus:ring-primary/20"
                                value={formData.rm_id === item.rm_id ? (formData.quantity_returned === 0 ? '' : formData.quantity_returned) : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const numVal = Math.max(0, Number(val) || 0);
                                  if (numVal > item.received_quantity) {
                                      error(`Cannot return more than ${item.received_quantity} for ${item.raw_materials?.rm_name}`);
                                      setFormData({...formData, quantity_returned: item.received_quantity, rm_id: item.rm_id});
                                  } else {
                                      setFormData({...formData, quantity_returned: val, rm_id: item.rm_id});
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Undo2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select a GRN Entry above to view items</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Total Returned</label>
                <Input 
                  type="number"
                  min="0"
                  readOnly
                  placeholder="Items going back"
                  value={formData.quantity_returned || ''}
                  className="h-11 text-lg font-black text-primary bg-primary/5 border-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Return Status</label>
                <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                  <SelectTrigger className="w-full h-11 border border-slate-200 text-sm shadow-sm">
                    <SelectValue placeholder="Return Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="PENDING">Pending (QC Rejected)</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched to Vendor</SelectItem>
                    <SelectItem value="Credit Received">Credit Received</SelectItem>
                    <SelectItem value="CREDITED">Credited to Account</SelectItem>
                  </SelectContent>
                </Select>
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
                  className="w-full h-24 p-3 rounded-md border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
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
              <Button 
                onClick={saveReturn} 
                loading={submitting}
                className="bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg shadow-primary/10 flex items-center font-bold"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update' : 'Generate'}
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
            <tr key={r.id} className="hover:bg-primary/5 transition-all group border-b border-slate-50 last:border-none">
              <td className="px-6 py-4">
                 <div className="font-black text-primary text-[13px]">{r.return_no}</div>
                 <div className="text-[10px] text-muted-foreground flex items-center mt-0.5">
                  <Calendar className="w-2.5 h-2.5 mr-1" /> {new Date(r.return_date).toLocaleDateString()}
                 </div>
              </td>
              <td className="px-6 py-4">
                 <div className="font-bold text-slate-700">{r.purchase_entries?.entry_number || 'Manual'}</div>
                 {r.raw_materials?.rm_name && (
                   <div className="text-[10px] font-black text-primary/70 uppercase mt-0.5 tracking-tighter">{r.raw_materials.rm_name}</div>
                 )}
              </td>
              <td className="px-6 py-4">
                 <div className="font-bold text-slate-700">{r.supplier_master?.supplier_name}</div>
              </td>
              <td className="px-6 py-4">
                 <div className="text-lg font-black text-primary">
                   {Number(r.quantity_returned) > 0 ? Number(r.quantity_returned).toLocaleString() : ''}
                 </div>
                 {Number(r.quantity_returned) > 0 && (
                   <div className="text-[10px] text-slate-400 font-bold uppercase">UNITS RETURNED</div>
                 )}
              </td>
              <td className="px-6 py-4">
                 <div className="text-[11px] text-slate-500 italic max-w-[200px] truncate">{r.reason || 'No reason specified'}</div>
              </td>
              <td className="px-6 py-4 text-center">
                 <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-slate-100 text-slate-600 border border-slate-200`}>
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
