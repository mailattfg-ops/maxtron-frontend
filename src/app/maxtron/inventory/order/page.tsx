'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  FileBox, Plus, Search, Edit, Trash2, X, Save, 
  ShoppingCart, Calendar, Truck, User, IndianRupee, 
  Clock, CheckCircle, Package, Download, Trash, AlertCircle
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const ORDER_API = `${API_BASE}/api/maxtron/rm-orders`;
const SUPPLIER_API = `${API_BASE}/api/maxtron/suppliers`;
const STOCK_API = `${API_BASE}/api/maxtron/inventory/stock-summary`;

export default function RMOrderPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('inv_order_view', 'create');
  const canEdit = hasPermission('inv_order_view', 'edit');
  const canDelete = hasPermission('inv_order_view', 'delete');
  const [showForm, setShowForm] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    order_number: `PO-${Date.now().toString().slice(-6)}`,
    order_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    expected_delivery_date: '',
    remarks: '',
    total_amount: 0,
    company_id: '',
    status: 'PENDING',
    items: [] as any[]
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

      const [supRes, stockRes] = await Promise.all([
        fetch(`${SUPPLIER_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${STOCK_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const supData = await supRes.json();
      const stockData = await stockRes.json();
      
      if (supData.success) {
          setSuppliers(supData.data);
      }
      if (stockData.success) setMaterials(stockData.data);

      fetchOrders(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${ORDER_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        console.log("RM Order Page - Orders List:", data.data);
        setOrders(data.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { rm_id: '', quantity: 0, rate: 0, amount: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    const total = newItems.reduce((acc, curr) => acc + curr.amount, 0);
    setFormData({ ...formData, items: newItems, total_amount: total });
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
    
    newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    const total = newItems.reduce((acc, curr) => acc + curr.amount, 0);
    setFormData({ ...formData, items: newItems, total_amount: total });
  };

  const saveOrder = async () => {
    if (!formData.supplier_id || formData.items.length === 0 || formData.items.some(i => !i.rm_id || i.quantity <= 0)) {
      error('Please select Supplier and add items with valid quantities.');
      return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${ORDER_API}/${editingId}` : ORDER_API;

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
        success(editingId ? 'Purchase order updated!' : 'Purchase order released!');
        setShowForm(false);
        setEditingId(null);
        fetchOrders();
        resetForm();
      } else {
        error(data.message || 'Error occurred');
      }
    } catch (err) {
      error('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      order_number: `PO-${Date.now().toString().slice(-6)}`,
      order_date: new Date().toISOString().split('T')[0],
      supplier_id: '',
      expected_delivery_date: '',
      remarks: '',
      total_amount: 0,
      company_id: currentCompanyId,
      status: 'PENDING',
      items: []
    });
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      order_number: rec.order_number,
      order_date: rec.order_date.split('T')[0],
      supplier_id: rec.supplier_id,
      expected_delivery_date: rec.expected_delivery_date ? rec.expected_delivery_date.split('T')[0] : '',
      remarks: rec.remarks || '',
      total_amount: Number(rec.total_amount),
      company_id: rec.company_id,
      status: rec.status,
      items: rec.rm_order_items.map((i: any) => ({
        rm_id: i.rm_id,
        quantity: Number(i.quantity),
        rate: Number(i.rate),
        amount: Number(i.amount)
      }))
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Cancel this purchase order? Items will be removed from tracking.',
      type: 'danger'
    });
    if (!isConfirmed) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${ORDER_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Order cancelled.');
        fetchOrders();
      }
    } catch (err) {
      error('Cancellation failed.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Raw Material Order</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Release multi-item purchase orders to suppliers with automatic stock visibility.</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) { resetForm(); addItem(); } setEditingId(null); }}
              className="w-full md:w-auto bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg h-10 md:h-11 transition-all font-bold whitespace-nowrap"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Discard Draft' : 'New Purchase Order'}
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
            <CardTitle className="text-lg font-bold text-primary flex items-center">
               <FileBox className="w-5 h-5 mr-3 text-secondary" />
               Purchase Order: {formData.order_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 border-b border-slate-100 pb-8">
              <div className="space-y-2 text-sm">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Order Date</label>
                <Input type="date" max={new Date().toISOString().split('T')[0]} value={formData.order_date} onChange={(e) => setFormData({...formData, order_date: e.target.value})} className="h-11" />
              </div>
 
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Supplier Details</label>
                <select 
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Vendor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.supplier_name} ({s.supplier_code})</option>
                  ))}
                </select>
              </div>
 
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Expected Delivery</label>
                <Input type="date" value={formData.expected_delivery_date} onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})} className="h-11 border-amber-200 bg-amber-50/10" />
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                    <Package className="w-4 h-4 mr-2 text-primary" /> Order Line Items
                  </h3>
                  <Button onClick={addItem} variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/10 rounded-full h-8">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                  </Button>
               </div>

                <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase">Material (Name / Stock)</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32">Qty Purchased</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32">Rate (₹)</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32">Amount</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, idx) => (
                        <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <select 
                              value={item.rm_id}
                              onChange={(e) => updateItem(idx, 'rm_id', e.target.value)}
                              className="w-full h-10 px-2 rounded border border-slate-200 text-sm font-medium outline-none focus:border-primary"
                              disabled={!formData.supplier_id}
                            >
                              <option value="" disabled>
                                {!formData.supplier_id ? 'Select Supplier First...' : 'Select Material...'}
                              </option>
                              {(() => {
                                 if (!formData.supplier_id) return null;
                                 const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);
                                 if (!selectedSupplier || !selectedSupplier.supplied_materials || selectedSupplier.supplied_materials.length === 0) {
                                     return <option disabled>No materials assigned to this vendor.</option>;
                                 }
                                 
                                 return materials.filter(m => selectedSupplier.supplied_materials.some((sm: any) => sm.rm_id === m.id)).map(m => (
                                   <option key={m.id} value={m.id}>
                                     {m.rm_name} (Stock: {Number(m.balance).toLocaleString()} {m.unit_type})
                                   </option>
                                 ));
                              })()}
                            </select>
                          </td>
                          <td className="p-4">
                            <Input 
                              type="number" 
                              required
                              min="0"
                              value={item.quantity === 0 ? '' : item.quantity} 
                              onChange={(e) => updateItem(idx, 'quantity', Math.max(0, Number(e.target.value)))}
                              className="h-10 text-right font-black text-primary"
                            />
                          </td>
                          <td className="p-4">
                            <Input 
                              type="number" 
                              min="0"
                              value={item.rate} 
                              onChange={(e) => updateItem(idx, 'rate', Math.max(0, Number(e.target.value)))}
                              className="h-10 text-right"
                            />
                          </td>
                          <td className="p-4">
                             <div className="h-10 flex items-center justify-end px-3 font-mono font-black text-slate-900 bg-slate-50 rounded">
                               ₹ {Number(item.amount).toLocaleString()}
                             </div>
                          </td>
                          <td className="p-4 text-center">
                             <Button onClick={() => removeItem(idx)} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full">
                               <Trash className="w-3.5 h-3.5" />
                             </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Order Remarks</label>
                  <textarea 
                    className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    value={formData.remarks}
                    maxLength={50}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    placeholder="Specific instructions for vendor..."
                  />
               </div>
               <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col justify-center text-center md:text-right">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total Order Value</p>
                  <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tighter">₹ {formData.total_amount.toLocaleString()}</h2>
               </div>
            </div>
 
            <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3">
              <Button onClick={() => setShowForm(false)} variant="ghost" className="w-full sm:w-auto px-8 h-11 rounded-full text-slate-500 text-sm">
                Cancel Order
              </Button>
              <Button 
                onClick={saveOrder} 
                loading={submitting}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg shadow-primary/20 flex items-center justify-center font-bold"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update PO' : 'Release PO'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Procurement History"
          description="Release and track purchase orders with current stock visibility."
          headers={['PO Details', 'Supplier Partner', 'Total Items', 'Order Value', 'Status', 'Action']}
          data={orders}
          loading={loading}
          searchFields={['order_number', 'suppliers.supplier_name']}
          renderRow={(o: any) => (
            <tr key={o.id} className="hover:bg-primary/5 transition-all group border-b border-slate-50 last:border-none">
              <td className="px-6 py-4">
                <div className="font-black text-slate-800 text-[13px]">{o.order_number}</div>
                <div className="text-[10px] text-muted-foreground flex items-center font-bold mt-0.5">
                  <Calendar className="w-2.5 h-2.5 mr-1" /> {new Date(o.order_date).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4">
                 <div className="font-bold text-slate-700">{o.supplier_master?.supplier_name}</div>
              </td>
              <td className="px-6 py-4">
                 <div className="text-sm font-black text-primary">{o.rm_order_items?.length || 0} {o.rm_order_items?.length === 1 ? 'Item' : 'Items'}</div>
              </td>
              <td className="px-6 py-4">
                 <div className="font-black text-slate-900 tracking-tight">₹ {Number(o.total_amount).toLocaleString()}</div>
              </td>
              <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest ${
                   o.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                   o.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                   'bg-amber-100 text-amber-700 border border-amber-200'
                 }`}>
                   <span className="hidden md:inline">{o.status}</span>
                   <span className="md:hidden">{o.status.charAt(0)}</span>
                 </span>
              </td>
              <td className="md:px-6 py-4 text-right space-x-1">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(o)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(o.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
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
