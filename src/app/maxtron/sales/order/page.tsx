'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  FileBox, 
  Save, 
  Plus, 
  X, 
  Trash2, 
  Edit, 
  Calendar, 
  Search, 
  User, 
  Hash, 
  Scale, 
  Layers, 
  CheckCircle2, 
  ChevronRight,
  ShoppingCart
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';

const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/orders`;
const CUST_API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/customers`;

const materialTypes = ['LDPE', 'HDPE', 'PP', 'LLDPE', 'Bio-Degradable', 'Other'];

export default function OrderEntryPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');

  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('sales_orders_view', 'create');
  const canEdit = hasPermission('sales_orders_view', 'edit');
  const canDelete = hasPermission('sales_orders_view', 'delete');
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    order_no: '',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    customer_id: '',
    lpo_no: '',
    status: 'PENDING',
    total_quantity: 0,
    total_amount: 0,
    company_id: '',
    items: [
      { 
        product_description: '', 
        width: 0, 
        height: 0, 
        gusset: 0, 
        thickness_micron: 0, 
        material_type: 'LDPE', 
        printing_specs: 'None', 
        quantity_kg: 0, 
        quantity_pcs: 0, 
        unit_price: 0, 
        total_price: 0 
      }
    ]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      // 1. Fetch Companies to get current ID
      const compRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          setCurrentCompanyId(activeCo.id);
          setFormData(prev => ({ ...prev, company_id: activeCo.id }));
          fetchOrders(activeCo.id);
          fetchCustomers(activeCo.id);
        }
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${API_URL}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {}
  };

  const fetchCustomers = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${CUST_API_URL}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (err) {}
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newItems = [...formData.items];
    let finalValue: any = value;
    
    if (type === 'number') finalValue = parseFloat(value) || 0;
    
    newItems[index] = { ...newItems[index], [name]: finalValue };

    // Calculate item total
    if (name === 'quantity_kg' || name === 'unit_price') {
      newItems[index].total_price = Number(newItems[index].quantity_kg) * Number(newItems[index].unit_price);
    }

    setFormData({ ...formData, items: newItems });
    updateTotals(newItems);
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { 
          product_description: '', 
          width: 0, 
          height: 0, 
          gusset: 0, 
          thickness_micron: 0, 
          material_type: 'LDPE', 
          printing_specs: 'None', 
          quantity_kg: 0, 
          quantity_pcs: 0, 
          unit_price: 0, 
          total_price: 0 
        }
      ]
    });
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    updateTotals(newItems);
  };

  const updateTotals = (items: any[]) => {
    const q = items.reduce((sum, item) => sum + (item.quantity_kg || 0), 0);
    const a = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    setFormData(prev => ({ ...prev, total_quantity: q, total_amount: a }));
  };

  const saveOrder = async () => {
    if (!formData.order_no || !formData.customer_id) {
      error('Order number and Customer are required.');
      return;
    }
    if (formData.items.some(i => !i.product_description || i.quantity_kg === 0)) {
       error('Item description and quantity are required for all rows.');
       return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/${editingId}` : API_URL;

    // Clean up empty date strings
    const cleanData = {
      ...formData,
      delivery_date: formData.delivery_date || null
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cleanData)
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Order updated!' : 'Customer order confirmed!');
        setShowForm(false);
        setEditingId(null);
        fetchOrders();
        resetForm();
      } else {
        error(data.message || 'Something went wrong');
      }
    } catch (err) {}
  };

  const resetForm = () => {
    setFormData({
      order_no: `ORD-${Date.now().toString().slice(-6)}`,
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: '',
      customer_id: '',
      lpo_no: '',
      status: 'PENDING',
      total_quantity: 0,
      total_amount: 0,
      company_id: currentCompanyId,
      items: [
        { 
          product_description: '', 
          width: 0, 
          height: 0, 
          gusset: 0, 
          thickness_micron: 0, 
          material_type: 'LDPE', 
          printing_specs: 'None', 
          quantity_kg: 0, 
          quantity_pcs: 0, 
          unit_price: 0, 
          total_price: 0 
        }
      ]
    });
  };

  const handleEdit = (ord: any) => {
    setEditingId(ord.id);
    setFormData({
      ...ord,
      order_date: ord.order_date?.split('T')[0] || '',
      delivery_date: ord.delivery_date?.split('T')[0] || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      message: 'Delete this order permanently?',
      confirmLabel: 'Delete Order',
      type: 'danger'
    });
    if (!ok) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if ((await res.json()).success) {
        success('Order erased.');
        fetchOrders();
      }
    } catch (err) {}
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center">
            <ShoppingCart className="w-6 h-6 mr-2" /> Customer Order Entry
          </h1>
          <p className="text-muted-foreground text-sm font-medium tracking-wide">Register new sales orders and manufacturing requirements.</p>
        </div>
        {canCreate && (
          <Button 
            onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
            className="bg-primary hover:bg-primary/90 text-white px-6 rounded-full shadow-lg"
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Cancel' : 'New Sales Order'}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-xl overflow-visible animate-in zoom-in duration-300">
           <CardHeader className="bg-primary/5 border-b py-6">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-primary">{editingId ? 'Modify Sales Order' : 'Create Manufacturing Order'}</CardTitle>
                <CardDescription>Header information and manufacturing specifications.</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-extrawide">Estimated Total</div>
                <div className="text-2xl font-black text-primary">₹ {formData.total_amount.toLocaleString()}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {/* Header Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-8 border-b">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center"><Hash className="w-3 h-3 mr-1" /> Order Number</label>
                <Input name="order_no" value={formData.order_no} onChange={handleHeaderChange} className="font-mono text-primary font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center"><User className="w-3 h-3 mr-1" /> Select Customer *</label>
                <select 
                  name="customer_id" 
                  value={formData.customer_id} 
                  onChange={handleHeaderChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm ring-offset-background focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Choose Client --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name} ({c.customer_code})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center"><Calendar className="w-3 h-3 mr-1" /> Order Date</label>
                <Input type="date" name="order_date" value={formData.order_date} onChange={handleHeaderChange} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center"><Calendar className="w-3 h-3 mr-1" /> Target Delivery</label>
                <Input type="date" name="delivery_date" value={formData.delivery_date} onChange={handleHeaderChange} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center"><Plus className="w-3 h-3 mr-1" /> Customer LPO No</label>
                <Input name="lpo_no" value={formData.lpo_no} onChange={handleHeaderChange} placeholder="e.g. PO-8876" />
              </div>
            </div>

            {/* Items Section */}
            <div className="mt-8 space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center">
                    <FileBox className="w-4 h-4 mr-2" /> Manufacturing Specs & Quantity
                  </h3>
                  <Button variant="outline" size="sm" onClick={addItemRow} className="rounded-full h-8 text-xs border-primary text-primary hover:bg-primary hover:text-white">
                    <Plus className="w-3 h-3 mr-1" /> Add Specification
                  </Button>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full min-w-[1000px] border-collapse">
                   <thead className="bg-slate-50 border-b border-primary/10">
                     <tr className="text-[10px] uppercase font-bold text-muted-foreground">
                       <th className="px-3 py-3 text-left w-64">Item Description / Size</th>
                       <th className="px-3 py-3 text-left">Spec (W x H x G)</th>
                       <th className="px-3 py-3 text-left">Micron</th>
                       <th className="px-3 py-3 text-left">Material / Print</th>
                       <th className="px-3 py-3 text-right">Qty (KG)</th>
                       <th className="px-3 py-3 text-right">Unit Price</th>
                       <th className="px-3 py-3 text-right">Row Total</th>
                       <th className="px-3 py-3 text-center"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-primary/5">
                     {formData.items.map((item, idx) => (
                       <tr key={idx} className="group hover:bg-slate-50/50">
                         <td className="p-2">
                           <Input 
                              placeholder="e.g. Plain LDPE Gusset Bag" 
                              name="product_description" 
                              value={item.product_description} 
                              onChange={(e) => handleItemChange(idx, e)}
                              className="text-xs h-9"
                           />
                         </td>
                         <td className="p-2">
                           <div className="flex gap-1">
                             <Input type="number" name="width" value={item.width} onChange={(e) => handleItemChange(idx, e)} className="text-xs h-9 px-1 text-center" placeholder="W" />
                             <Input type="number" name="height" value={item.height} onChange={(e) => handleItemChange(idx, e)} className="text-xs h-9 px-1 text-center" placeholder="H" />
                             <Input type="number" name="gusset" value={item.gusset} onChange={(e) => handleItemChange(idx, e)} className="text-xs h-9 px-1 text-center" placeholder="G" />
                           </div>
                         </td>
                         <td className="p-2 w-20">
                           <Input type="number" name="thickness_micron" value={item.thickness_micron} onChange={(e) => handleItemChange(idx, e)} className="text-xs h-9 text-center" />
                         </td>
                         <td className="p-2 space-y-1">
                            <select 
                              name="material_type" 
                              value={item.material_type} 
                              onChange={(e) => handleItemChange(idx, e)}
                              className="w-full h-9 rounded-md border text-xs px-2"
                            >
                              {materialTypes.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <Input name="printing_specs" value={item.printing_specs} onChange={(e) => handleItemChange(idx, e)} className="text-[10px] h-6 px-2" placeholder="Printing details" />
                         </td>
                         <td className="p-2 w-24">
                           <Input type="number" name="quantity_kg" value={item.quantity_kg} onChange={(e) => handleItemChange(idx, e)} className="text-xs h-9 text-right font-bold text-primary" />
                         </td>
                         <td className="p-2 w-24">
                           <Input type="number" name="unit_price" value={item.unit_price} onChange={(e) => handleItemChange(idx, e)} className="text-xs h-9 text-right" />
                         </td>
                         <td className="p-2 w-28 text-right font-black text-xs text-primary">
                           ₹ {item.total_price.toLocaleString()}
                         </td>
                         <td className="p-2 text-center">
                           <Button variant="ghost" size="icon" onClick={() => removeItemRow(idx)} className="h-8 w-8 text-muted-foreground hover:text-rose-600 rounded-full">
                             <Trash2 className="w-3.5 h-3.5" />
                           </Button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>

            <div className="mt-10 pt-6 border-t flex justify-between items-end">
               <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-6">
                  <div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Total Weight</div>
                    <div className="text-lg font-black text-primary">{formData.total_quantity} <span className="text-xs font-normal">KG</span></div>
                  </div>
                  <div className="w-px h-10 bg-primary/20"></div>
                  <div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Order Status</div>
                    <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 uppercase">DRAFT</div>
                  </div>
               </div>
               <Button onClick={saveOrder} className="bg-primary hover:bg-primary/95 text-white px-12 h-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Confirm Updates' : 'Confirm Order'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Sales Pipeline"
          description={`Track active manufacturing orders for ${activeTenant}.`}
          headers={['Order No', 'Customer', 'Date / Delivery', 'Quantity', 'Status', 'Total Value', 'Actions']}
          data={orders}
          loading={loading}
          searchFields={['order_no', 'customer_name']}
          renderRow={(o: any) => (
            <tr key={o.id} className="hover:bg-primary/5 transition-colors group">
              <td className="px-4 py-4 font-mono text-sm font-bold text-secondary uppercase">{o.order_no}</td>
              <td className="px-4 py-4">
                <div className="font-bold text-foreground">{o.customers?.customer_name || 'Lost Client'}</div>
                <div className="text-[10px] text-muted-foreground font-semibold">LPO: {o.lpo_no || 'None'}</div>
              </td>
              <td className="px-4 py-4">
                <div className="text-xs font-semibold">{new Date(o.order_date).toLocaleDateString()}</div>
                <div className="text-[10px] text-rose-500 font-bold uppercase">Exp: {new Date(o.delivery_date).toLocaleDateString()}</div>
              </td>
              <td className="px-4 py-4 text-xs font-bold">{o.total_quantity} KG</td>
              <td className="px-4 py-4">
                 <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                    o.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    o.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                    'bg-amber-50 text-amber-600 border-amber-200'
                 }`}>
                   {o.status}
                 </span>
              </td>
              <td className="px-4 py-4 font-black font-mono text-xs text-primary">₹ {o.total_amount.toLocaleString()}</td>
              <td className="px-4 py-4 text-right space-x-1">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(o)} className="hover:text-primary rounded-full h-8 w-8">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(o.id)} className="hover:text-rose-600 rounded-full h-8 w-8">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <ChevronRight className="inline w-4 h-4 text-muted-foreground/30" />
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}
