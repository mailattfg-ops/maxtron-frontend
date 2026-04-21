'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  FileCheck, Plus, Search, Edit, Trash2, X, Save, 
  Truck, Calendar, Hash, User, IndianRupee, 
  Warehouse, ClipboardList, Trash, Package, AlertCircle, Info
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
const PURCHASE_API = `${API_BASE}/api/maxtron/purchase-entries`;
const ORDER_API = `${API_BASE}/api/maxtron/rm-orders`;
const STOCK_API = `${API_BASE}/api/maxtron/inventory/stock-summary`;
const SUPPLIER_API = `${API_BASE}/api/maxtron/suppliers`;

export default function PurchaseEntryPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('inv_purchase_view', 'create');
  const canEdit = hasPermission('inv_purchase_view', 'edit');
  const canDelete = hasPermission('inv_purchase_view', 'delete');
  const [showForm, setShowForm] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    entry_number: 'GENERATING...',
    entry_date: new Date().toISOString().split('T')[0],
    order_id: '',
    supplier_id: '',
    invoice_number: '',
    invoice_date: '',
    remarks: '',
    vehicle_number: '',
    unloading_charges: 0 as number | string,
    company_id: '',
    reorder_missing: false,
    items: [] as any[]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!showForm || editingId) return;
    resetForm();
  }, [entries, showForm]);

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

      const [ordRes, supRes, stockRes] = await Promise.all([
        fetch(`${ORDER_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${SUPPLIER_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${STOCK_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const ordData = await ordRes.json();
      const supData = await supRes.json();
      const stockData = await stockRes.json();
      
      if (ordData.success) {
        // Filter for orders not yet fully received
        setPendingOrders(ordData.data.filter((o: any) => o.status === 'PENDING' || o.status === 'ORDERED'));
      }
      if (supData.success) setSuppliers(supData.data);
      if (stockData.success) setMaterials(stockData.data);

      fetchEntries(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${PURCHASE_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
    }
  };

  const handleOrderSelection = (orderId: string) => {
    const selectedOrder = pendingOrders.find(o => o.id === orderId);
    if (selectedOrder) {
      setFormData({
        ...formData,
        order_id: orderId,
        supplier_id: selectedOrder.supplier_id,
        items: selectedOrder.rm_order_items.map((i: any) => {
            const baseAmount = Number(i.quantity) * Number(i.rate);
            const gstPercent = 18; // Defaulting to 18% or you can default to 0
            const gstAmount = (baseAmount * gstPercent) / 100;
            return {
                rm_id: i.rm_id,
                ordered_quantity: Number(i.quantity),
                received_quantity: Number(i.quantity),
                rate: Number(i.rate),
                gst_percent: gstPercent,
                gst_amount: gstAmount,
                amount: baseAmount + gstAmount
            };
        })
      });
    } else {
        setFormData({ ...formData, order_id: '', reorder_missing: false, items: [] });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { 
        rm_id: '', 
        ordered_quantity: 0, 
        received_quantity: 0, 
        rate: 0, 
        gst_percent: 18, 
        gst_amount: 0, 
        amount: 0 
      }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'rm_id') {
        const mat = materials.find(m => m.id === value);
        if (mat) {
            newItems[index].rate = Number(mat.rate_per_unit || 0);
        }
    }
    
    if (field !== 'amount') {
        const qty = Number(newItems[index].received_quantity || 0);
        const rate = Number(newItems[index].rate || 0);
        const gstPerc = Number(newItems[index].gst_percent || 0);
        
        const baseAmount = qty * rate;
        const gstAmount = (baseAmount * gstPerc) / 100;
        
        newItems[index].gst_amount = gstAmount;
        newItems[index].amount = baseAmount + gstAmount;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const validateGRN = () => {
    const newErrors: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];

    if (!formData.supplier_id) newErrors.supplier_id = 'Supplier selection is strictly required';
    if (!formData.entry_date) newErrors.entry_date = 'Intake date is required';
    else if (formData.entry_date > today) newErrors.entry_date = 'Intake date cannot be in the future';

    if (!formData.invoice_number?.trim()) newErrors.invoice_number = 'Invoice / Bill Number is required for audit';
    else if (!/^[a-zA-Z0-9-/ ]+$/.test(formData.invoice_number)) newErrors.invoice_number = 'Invalid characters in bill number';

    if (!formData.invoice_date) newErrors.invoice_date = 'Invoice date is required';
    else if (formData.invoice_date > today) newErrors.invoice_date = 'Invoice date cannot be in the future';

    if (!formData.vehicle_number?.trim()) newErrors.vehicle_number = 'Vehicle Number is mandatory for logistics tracking';
    else {
      // Standard Indian Vehicle Number Format: KA 01 AB 1234
      const vehicleRegex = /^[A-Z]{2}[ -]?[0-9]{2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}$/i;
      if (!vehicleRegex.test(formData.vehicle_number.trim())) {
        newErrors.vehicle_number = 'Invalid vehicle registration format (e.g. KA-01-AB-1234)';
      }
    }

    if (formData.items.length === 0) {
      error('Goods receipt must contain at least one material entry.');
      return false;
    }

    if (formData.items.some(i => !i.rm_id)) {
      error('All rows must have a valid material item selected.');
      return false;
    }

    if (formData.items.some(i => i.received_quantity <= 0)) {
      error('Receipt quantity must be strictly greater than zero.');
      return false;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      error('Please correct the validation errors before authorizing receipt.');
      return false;
    }
    return true;
  };

  const saveEntry = async () => {
    if (!validateGRN()) return;

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${PURCHASE_API}/${editingId}` : PURCHASE_API;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        total_amount: formData.items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) + (Number(formData.unloading_charges) || 0)
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Purchase entry updated!' : 'Material received successfully!');
        setShowForm(false);
        setEditingId(null);
        fetchEntries();
        resetForm();
      } else {
        error(data.error || data.message || 'Operation failed.');
      }
    } catch (err: any) {
      error(err.message || 'Network connectivity issue or server error.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = (latestEntries: any[] = entries) => {
    let nextNo = 'GRN-000001';
    if (latestEntries && latestEntries.length > 0) {
      let max = 0;
      latestEntries.forEach(e => {
        if (e.entry_number && e.entry_number.startsWith('GRN-')) {
          const numStr = e.entry_number.substring(4);
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > max) {
            max = num;
          }
        }
      });
      nextNo = `GRN-${String(max + 1).padStart(6, '0')}`;
    }

    setFormData({
      entry_number: nextNo,
      entry_date: new Date().toISOString().split('T')[0],
      order_id: '',
      supplier_id: '',
      invoice_number: '',
      invoice_date: '',
      remarks: '',
      vehicle_number: '',
      unloading_charges: 0 as number | string,
      company_id: currentCompanyId,
      reorder_missing: false,
      items: []
    });
    setErrors({});
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      entry_number: rec.entry_number || '',
      entry_date: rec.entry_date ? rec.entry_date.split('T')[0] : '',
      order_id: rec.order_id || '',
      supplier_id: rec.supplier_id || '',
      invoice_number: rec.invoice_number || '',
      invoice_date: rec.invoice_date ? rec.invoice_date.split('T')[0] : '',
      remarks: rec.remarks || '',
      vehicle_number: rec.vehicle_number || '',
      unloading_charges: Number(rec.unloading_charges || 0),
      company_id: rec.company_id || '',
      reorder_missing: false,
      items: (rec.purchase_entry_items || []).map((i: any) => {
        const qty = Number(i.received_quantity || 0);
        const rate = Number(i.rate || 0);
        const gstPerc = Number(i.gst_percent || 0);
        const base = qty * rate;
        const gstAmt = Number(i.gst_amount || (base * gstPerc / 100));
        return {
          rm_id: i.rm_id || '',
          ordered_quantity: Number(i.ordered_quantity || 0),
          received_quantity: qty,
          rate: rate,
          gst_percent: gstPerc,
          gst_amount: gstAmt,
          amount: base + gstAmt
        };
      })
    });
    setErrors({});
    setShowForm(true);
  };

  const deleteEntry = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to remove this Goods Receipt entry? This action will reverse the inventory update for these items.',
      type: 'danger',
      confirmLabel: 'Confirm Delete'
    });
    if (!isConfirmed) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${PURCHASE_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Purchase entry removed successfully.');
        fetchEntries();
      } else {
        error(data.message || 'Deletion failed.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      error('An error occurred during deletion.');
    }
  };

  return (
    <div className="md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Purchase Registry</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Record material intake against pending orders with multi-item support.</p>
        </div>
        <div className="flex items-center w-full md:w-auto">
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) { resetForm(); addItem(); } setEditingId(null); }}
              className="w-full md:w-auto h-10 md:h-11 bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold transition-all whitespace-nowrap"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Cancel Receipt' : 'Register Intake'}
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl font-bold text-primary flex items-center">
              <ClipboardList className="w-5 h-5 mr-3 text-secondary" />
              {editingId ? 'Modify Goods Receipt' : 'Goods Receipt Note (GRN)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 border-b border-slate-100 pb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Pending Order Selection</label>
                <Select value={formData.order_id} onValueChange={handleOrderSelection}>
                  <SelectTrigger className="w-full h-11 border-primary/20 bg-primary/5 text-xs font-black shadow-sm">
                    <SelectValue placeholder="-- Select Pending PO --" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-primary/20">
                    <SelectItem value="manual">-- Select Pending PO --</SelectItem>
                    {pendingOrders.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.order_number} | {o.supplier_master?.supplier_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Intake Date</label>
                <Input type="date" max={new Date().toISOString().split('T')[0]} value={formData.entry_date} onChange={(e) => setFormData({...formData, entry_date: e.target.value})} className="h-11 font-bold" />
              </div>
 
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 text-primary italic font-black">Vendor Identity</label>
                <Select 
                  value={formData.supplier_id} 
                  onValueChange={(val) => {
                     setFormData({...formData, supplier_id: val});
                     if(errors.supplier_id) setErrors(prev => { const n = {...prev}; delete n.supplier_id; return n; });
                  }}
                  disabled={!!formData.order_id}
                >
                  <SelectTrigger className={`w-full h-11 text-xs font-black bg-slate-50 border ${errors.supplier_id ? 'border-destructive bg-amber-50' : 'border-slate-200'}`}>
                     <SelectValue placeholder="Choose Supplier..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.supplier_name.toUpperCase()} ({s.supplier_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.supplier_id && <p className="text-[10px] font-bold text-destructive mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.supplier_id}</p>}
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Invoice / Bill No</label>
                <Input 
                  value={formData.invoice_number} 
                  onChange={(e) => {
                     setFormData({...formData, invoice_number: e.target.value});
                     if(errors.invoice_number) setErrors(prev => { const n = {...prev}; delete n.invoice_number; return n; });
                  }} 
                  className={`h-11 font-bold ${errors.invoice_number ? 'border-destructive bg-amber-50' : ''}`} 
                  placeholder="Bill Number" 
                />
                {errors.invoice_number && <p className="text-[10px] font-bold text-destructive mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.invoice_number}</p>}
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Invoice Date</label>
                <Input 
                  type="date" 
                  max={new Date().toISOString().split('T')[0]} 
                  value={formData.invoice_date} 
                  onChange={(e) => {
                     setFormData({...formData, invoice_date: e.target.value});
                     if(errors.invoice_date) setErrors(prev => { const n = {...prev}; delete n.invoice_date; return n; });
                  }} 
                  className={`h-11 font-bold ${errors.invoice_date ? 'border-destructive bg-amber-50' : ''}`} 
                />
                {errors.invoice_date && <p className="text-[10px] font-bold text-destructive mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.invoice_date}</p>}
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Truck className="w-3 h-3 text-primary" /> Vehicle Number</label>
                <Input 
                  value={formData.vehicle_number} 
                  onChange={(e) => {
                     setFormData({...formData, vehicle_number: e.target.value});
                     if(errors.vehicle_number) setErrors(prev => { const n = {...prev}; delete n.vehicle_number; return n; });
                  }} 
                  className={`h-11 uppercase font-black ${errors.vehicle_number ? 'border-destructive bg-amber-50' : ''}`} 
                  placeholder="KA-00-XX-0000" 
                />
                {errors.vehicle_number && <p className="text-[10px] font-bold text-destructive mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.vehicle_number}</p>}
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Unloading Fees {!formData.unloading_charges && <span className="text-[10px] font-medium lowercase">(₹)</span>}</label>
                <Input type="number" min="0" value={formData.unloading_charges === 0 ? '' : formData.unloading_charges} onChange={(e) => setFormData({...formData, unloading_charges: e.target.value})} className="h-11 font-black text-primary" />
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                    <Warehouse className="hidden md:inline w-4 h-4 mr-2 text-primary" /> Multi-Item Receipt Entry
                  </h3>
                  {!formData.order_id && (
                    <Button onClick={addItem} variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/10 rounded-full h-8">
                      <Plus className="w-3.5 h-3.5 mr-1" /> <span className="hidden md:inline">Add Manual Row</span>
                    </Button>
                  )}
               </div>

               <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[750px]">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase">Material Item / Current Stock</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32">Qty Ordered</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32">Qty Delivered</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-24">Rate</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-24">GST %</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32">Amount</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-4">
                            <Select 
                              value={item.rm_id}
                              onValueChange={(val) => updateItem(idx, 'rm_id', val)}
                              disabled={!!formData.order_id}
                            >
                              <SelectTrigger className="w-full h-10 border border-slate-200 text-sm font-medium">
                                <SelectValue placeholder="Select Material..." />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                {materials.map(m => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.rm_name} (Global Stock: {Number(m.balance).toLocaleString()} {m.unit_type})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <Input 
                              type="number" 
                              min="0"
                              value={item.ordered_quantity === 0 ? '' : item.ordered_quantity} 
                              onChange={(e) => updateItem(idx, 'ordered_quantity', e.target.value)}
                              className="h-10 text-center font-bold text-slate-500 bg-slate-50"
                            />
                          </td>
                          <td className="p-4">
                            <Input 
                              type="number" 
                              min="0"
                              max={item.ordered_quantity || undefined}
                              value={item.received_quantity === 0 ? '' : item.received_quantity} 
                              onChange={(e) => {
                                const val = e.target.value;
                                const maxAllowed = item.ordered_quantity > 0 ? item.ordered_quantity : Infinity;
                                if (val !== '' && Number(val) > maxAllowed) {
                                  updateItem(idx, 'received_quantity', maxAllowed);
                                } else {
                                  updateItem(idx, 'received_quantity', val);
                                }
                              }}
                              className={`h-10 text-right font-black ${Number(item.received_quantity) < item.ordered_quantity ? 'text-slate-500' : 'text-primary'}`}
                            />
                          </td>
                          <td className="p-4">
                            <Input 
                              type="number" 
                              min="0"
                              value={item.rate === 0 ? '' : item.rate} 
                              onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                              className="h-10 text-right font-bold text-slate-600 bg-slate-50"
                            />
                          </td>
                          <td className="p-4">
                            <Select 
                              value={String(item.gst_percent)}
                              onValueChange={(val) => updateItem(idx, 'gst_percent', Number(val))}
                            >
                              <SelectTrigger className="w-full h-10 border border-slate-200 text-xs font-bold">
                                <SelectValue placeholder="GST" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                {[0, 5, 12, 18, 28].map(p => (
                                  <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <Input 
                              type="number" 
                              min="0"
                              value={item.amount === 0 ? '' : item.amount} 
                              onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                              className="h-10 text-right font-mono font-black text-slate-900 bg-slate-100"
                            />
                             {item.gst_amount > 0 && (
                               <div className="text-[10px] text-right font-bold text-slate-400 mt-1">Incl. ₹{Number(item.gst_amount).toLocaleString()} GST</div>
                             )}
                          </td>
                          <td className="p-4 text-center">
                             {!formData.order_id && (
                               <Button onClick={() => removeItem(idx)} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 rounded-full">
                                 <Trash className="w-3.5 h-3.5" />
                               </Button>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>

            <div className="mt-8 flex flex-col lg:flex-row justify-between items-stretch lg:items-start gap-6">
               <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Receipt Comments</label>
                  <textarea 
                    className="w-full h-20 p-3 mt-2 rounded-md border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    value={formData.remarks}
                    maxLength={50}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    placeholder="Shortage, damage or delay notes..."
                  />
               </div>
                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 text-right relative">
                   {formData.order_id && formData.items.some(i => Number(i.ordered_quantity || 0) > Number(i.received_quantity)) && (
                     <div className="absolute -top-12 right-0 flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl animate-bounce shadow-sm">
                       <AlertCircle className="w-4 h-4 text-slate-500 font-black" />
                       <label className="text-[10px] font-black text-slate-800 uppercase flex items-center gap-2 cursor-pointer tracking-widest">
                         <Checkbox 
                           checked={formData.reorder_missing}
                           onCheckedChange={(checked: boolean) => setFormData({...formData, reorder_missing: !!checked})}
                         />
                         <span className="hidden sm:inline">Re-order Missing Qty?</span>
                         <span className="sm:hidden">Re-order?</span>
                       </label>
                     </div>
                   )}
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Receipt Valuation</p>
                   <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tighter">₹ {(formData.items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) + (Number(formData.unloading_charges) || 0)).toLocaleString()}</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Includes GST & Labor charges</p>
                </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3">
              <Button onClick={() => setShowForm(false)} variant="ghost" className="w-full sm:w-auto px-8 h-11 rounded-full text-slate-500 font-bold">
                Cancel Receipt
              </Button>
              <Button 
                onClick={saveEntry} 
                loading={submitting}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg font-bold flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update GRN' : 'Authorize Receipt'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Material Intake Log"
          description="Verify incoming shipments and audit quantities delivered against orders."
          headers={['GRN / Date', 'Procurement Context', 'Qty Delivered', 'Valuation', 'Vehicle / Bill', 'Actions']}
          data={entries}
          loading={loading}
          searchFields={['entry_number', 'suppliers.supplier_name', 'invoice_number']}
          renderRow={(e: any) => (
            <tr key={e.id} className="hover:bg-emerald-50 transition-all border-b border-slate-50 last:border-none">
              <td className="px-6 py-4">
                 <div className="font-black text-slate-800 text-[13px]">{e.entry_number}</div>
                 <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(e.entry_date).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4">
                 <div className="font-bold text-slate-700">{e.supplier_master?.supplier_name}</div>
                 {e.rm_orders?.order_number && (
                   <div className="text-[10px] font-black text-primary uppercase mt-0.5 tracking-tighter">Order: {e.rm_orders.order_number}</div>
                 )}
              </td>
              <td className="px-6 py-4">
                 <div className="text-lg font-black text-primary">{e.purchase_entry_items?.reduce((acc: any, i: any) => acc + Number(i.received_quantity), 0).toLocaleString()}</div>
                 <div className="text-[9px] font-bold text-slate-400 uppercase">{e.purchase_entry_items?.length || 0} ITEMS</div>
              </td>
              <td className="px-6 py-4">
                 <div className="font-black text-slate-900 tracking-tight text-base">₹ {Number(e.total_amount || 0).toLocaleString()}</div>
                 {Number(e.unloading_charges || 0) > 0 && (
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Incl. ₹{e.unloading_charges} labor</div>
                 )}
              </td>
              <td className="px-6 py-4">
                 <div className="text-xs font-semibold text-slate-600 flex items-center capitalize"><Truck className="w-3 h-3 mr-1 opacity-50" /> {e.vehicle_number || '---'}</div>
                 <div className="text-[10px] text-slate-400 font-bold mt-1">Invoice: {e.invoice_number || '---'}</div>
              </td>
              <td className="md:px-4 py-4 text-right space-x-1">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(e)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => deleteEntry(e.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
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
