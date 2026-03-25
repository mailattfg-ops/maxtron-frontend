'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ShoppingBag, Plus, Trash2, Save, X, Search, 
  User, Calendar, DollarSign, Package, Briefcase, 
  ChevronRight, Info, AlertCircle, Edit2, CheckCircle2,
  AlertTriangle, XCircle
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const ORDERS_API = `${API_BASE}/api/maxtron/sales/orders`;
const CUSTOMERS_API = `${API_BASE}/api/maxtron/customers`;
const PRODUCTS_API = `${API_BASE}/api/maxtron/products`;
const STOCK_API = `${API_BASE}/api/maxtron/inventory/fg-stock-summary`;
const EMPLOYEES_API = `${API_BASE}/api/maxtron/employees`;

export default function CustomerOrderEntry() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Custom Alert State
  const [alert, setAlert] = useState<{
    show: boolean, 
    type: 'success' | 'error' | 'warning' | 'confirm',
    title: string,
    message: string,
    onConfirm?: () => void
  }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  const { success, error, info } = useToast();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    customer_id: '',
    executive_id: '',
    order_date: new Date().toISOString().split('T')[0],
    remarks: '',
    company_id: '',
    items: [
      { product_id: '', quantity: 0, rate: 0, value: 0 }
    ]
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

      const [custRes, prodRes, empRes] = await Promise.all([
        fetch(`${CUSTOMERS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${STOCK_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${EMPLOYEES_API}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const custData = await custRes.json();
      const prodData = await prodRes.json();
      const empData = await empRes.json();
      
      if (custData.success) setCustomers(custData.data);
      if (prodData.success) setProducts(prodData.data);
      if (empData.success) {
        // Filter executives (e.g., sales role or management)
        setExecutives(empData.data.filter((e: any) => 
            e.companies?.company_name?.toUpperCase() === activeTenant &&
            (e.user_types?.name === 'sales' || e.user_types?.name === 'admin' || e.user_types?.name === 'production')
        ));
      }

      if (coId) fetchOrders(coId);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${ORDERS_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 0, rate: 0, value: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length === 1) return;
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };
    
    // Auto-calculate value and enforce stock limit
    if (field === 'quantity' || field === 'rate') {
      let qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
      const rate = field === 'rate' ? parseFloat(value) || 0 : item.rate;
      
      // Force limit if quantity is being changed
      if (field === 'quantity') {
        const prod = products.find(p => p.id === item.product_id);
        if (prod && qty > Number(prod.balance)) {
            qty = Number(prod.balance);
            item.quantity = qty;
            info(`Quantity capped at available stock: ${qty} Kg`);
        }
      }
      
      item.value = qty * rate;
    }

    // Auto-set rate if product selected
    if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        if (prod) {
            // Rate logic could be here if product master has price
            // For now keep manual entry
        }
    }

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const handleEdit = (order: any) => {
    setEditingId(order.id);
    setFormData({
      customer_id: order.customer_id,
      executive_id: order.executive_id || '',
      order_date: order.order_date.split('T')[0],
      remarks: order.remarks || '',
      company_id: order.company_id,
      items: order.items.map((i: any) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        rate: i.rate,
        value: i.value
      }))
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    setAlert({
        show: true,
        type: 'confirm',
        title: 'Confirm Deletion',
        message: 'Are you sure you want to permanently delete this customer order? This action cannot be undone.',
        onConfirm: async () => {
            try {
                const res = await fetch(`${ORDERS_API}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const result = await res.json();
                if (result.success) {
                    setAlert({
                        show: true,
                        type: 'success',
                        title: 'Deleted!',
                        message: 'The order has been removed from the system.'
                    });
                    fetchOrders();
                } else {
                    setAlert({
                        show: true,
                        type: 'error',
                        title: 'Error',
                        message: result.message
                    });
                }
            } catch (err) {
                error('Failed to delete order');
            }
        }
    });
  };

  const totalOrderValue = useMemo(() => {
    return formData.items.reduce((sum, item) => sum + (item.value || 0), 0);
  }, [formData.items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) { error('Please select a customer.'); return; }
    if (formData.items.some(i => !i.product_id || i.quantity <= 0)) {
      error('Please complete all product entries with valid quantities.');
      return;
    }

    // Double check stock before submission
    for (const item of formData.items) {
      const prod = products.find(p => p.id === item.product_id);
      if (prod && item.quantity > Number(prod.balance)) {
        error(`Stock insufficient for ${prod.product_name}. Available: ${prod.balance} Kg`);
        return;
      }
    }


    setSubmitting(true);
    try {
      const url = editingId ? `${ORDERS_API}/${editingId}` : ORDERS_API;
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          total_value: totalOrderValue
        })
      });

      const result = await res.json();
      if (result.success) {
        setAlert({
            show: true,
            type: 'success',
            title: editingId ? 'Order Updated' : 'Order Created',
            message: editingId ? 'The changes have been saved successfully.' : 'A new sales order has been generated.'
        });
        setShowForm(false);
        setEditingId(null);
        setFormData({
            customer_id: '',
            executive_id: '',
            order_date: new Date().toISOString().split('T')[0],
            remarks: '',
            company_id: currentCompanyId,
            items: [{ product_id: '', quantity: 0, rate: 0, value: 0 }]
        });
        fetchOrders();
      } else {
        setAlert({
            show: true,
            type: 'error',
            title: 'Submission Failed',
            message: result.message || 'There was an issue processing your request.'
        });
      }
    } catch (err) {
      setAlert({
        show: true,
        type: 'error',
        title: 'System Error',
        message: 'A network or server error occurred. Please try again later.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Custom Alert Modal */}
      {alert.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" 
                 onClick={() => setAlert({...alert, show: false})} />
            
            <Card className="relative w-full max-w-[440px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border-none bg-white rounded-3xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-300">
                <div className={`h-2 w-full ${
                    alert.type === 'success' ? 'bg-emerald-500' : 
                    alert.type === 'error' ? 'bg-rose-500' : 
                    alert.type === 'warning' ? 'bg-amber-500' : 'bg-primary'
                }`} />
                
                <CardContent className="p-10 text-center">
                    <div className="flex justify-center mb-6">
                        <div className={`p-5 rounded-full ${
                            alert.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 
                            alert.type === 'error' ? 'bg-rose-50 text-rose-500' : 
                            alert.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-primary/5 text-primary'
                        }`}>
                            {alert.type === 'success' && <CheckCircle2 className="w-12 h-12" />}
                            {alert.type === 'error' && <XCircle className="w-12 h-12" />}
                            {alert.type === 'warning' && <AlertTriangle className="w-12 h-12" />}
                            {alert.type === 'confirm' && <AlertCircle className="w-12 h-12" />}
                        </div>
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-900 mb-2">{alert.title}</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">{alert.message}</p>
                    
                    <div className="mt-10 flex gap-3 justify-center">
                        {alert.type === 'confirm' ? (
                            <>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setAlert({...alert, show: false})}
                                    className="rounded-2xl px-8 h-12 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    No, Keep it
                                </Button>
                                <Button 
                                    onClick={() => {
                                        alert.onConfirm?.();
                                        setAlert({...alert, show: false});
                                    }}
                                    className="rounded-2xl px-10 h-12 bg-rose-600 hover:bg-rose-700 font-black shadow-lg shadow-rose-200 transition-all active:scale-95"
                                >
                                    Yes, Delete
                                </Button>
                            </>
                        ) : (
                            <Button 
                                onClick={() => setAlert({...alert, show: false})}
                                className={`rounded-2xl px-12 h-12 font-black shadow-lg transition-all active:scale-95 ${
                                    alert.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 
                                    alert.type === 'error' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' : 
                                    'bg-primary hover:bg-primary-hover shadow-primary/20'
                                }`}
                            >
                                Got it
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 md:w-10 md:h-10 p-1.5 bg-primary/10 text-primary rounded-lg shrink-0" />
            <span className="truncate">Customer Order Entry</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Create and manage sales orders from customers.</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          className={`h-11 px-6 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none font-bold ${showForm ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"}`}
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? "Cancel Entry" : "New Customer Order"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-2xl overflow-hidden bg-white animate-in slide-in-from-top duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 py-6">
            <CardTitle className="text-primary flex items-center gap-2">
              {editingId ? <ShoppingBag className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? "Edit Customer Order" : "New Order Form"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 md:px-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                    <Calendar className="w-3 h-3" /> Order Date
                  </label>
                  <Input 
                    type="date" 
                    value={formData.order_date} 
                    onChange={e => setFormData({...formData, order_date: e.target.value})}
                    className="focus:ring-2 focus:ring-primary/20 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                    <User className="w-3 h-3" /> Select Customer
                  </label>
                  <Select value={formData.customer_id} onValueChange={(val) => setFormData({...formData, customer_id: val})}>
                    <SelectTrigger className="w-full border-slate-200 bg-white shadow-sm">
                      <SelectValue placeholder="Choose Customer..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.customer_name} ({c.customer_code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                    <Briefcase className="w-3 h-3" /> Sales Executive
                  </label>
                  <Select value={formData.executive_id} onValueChange={(val) => setFormData({...formData, executive_id: val})}>
                    <SelectTrigger className="w-full border-slate-200 bg-white shadow-sm">
                      <SelectValue placeholder="Choose Executive..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {executives.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedCustomer && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-12 h-12 rounded-full bg-blue-200/50 flex items-center justify-center">
                        <Info className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-1 flex-1">
                         <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-blue-400">GST No</span>
                            <span className="text-sm font-bold text-blue-900">{selectedCustomer.gst_no || 'N/A'}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-blue-400">Credit Limit</span>
                            <span className="text-sm font-bold text-blue-900">₹ {selectedCustomer.credit_limit || 0}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-blue-400">Delivery Period</span>
                            <span className="text-sm font-bold text-blue-900">{selectedCustomer.delivery_period || 'N/A'}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-blue-400 italic">Outstanding Amt</span>
                            <span className="text-sm font-black text-rose-600">₹ {selectedCustomer.opening_balance || 0}</span>
                         </div>
                    </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 border-l-4 border-primary pl-3">Order Items</label>
                    <Button type="button" onClick={handleAddItem} size="sm" className="bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-sm h-8">
                        <Plus className="w-3 h-3 mr-1" /> Add Product
                    </Button>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-slate-100/80 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-left">Product Details</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-32">Quantity</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-32">Rate (₹)</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-right w-40">Value (₹)</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {formData.items.map((item, index) => (
                                <tr key={index} className="bg-white hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4">
                                        <Select value={item.product_id} onValueChange={(val) => handleItemChange(index, 'product_id', val)}>
                                            <SelectTrigger className="w-full border-none bg-transparent shadow-none focus:ring-0 text-[10px] md:text-sm font-medium">
                                                <SelectValue placeholder="Select Product..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200">
                                                {products.filter(p => (Number(p.balance) > 0 || item.product_id === p.id)).map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.product_name} [{p.product_code}] - Available: {p.balance} Kg
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="p-4">
                                        <Input 
                                            type="number" 
                                            min={0}
                                            max={products.find(p => p.id === item.product_id)?.balance || 0}
                                            value={item.quantity} 
                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                            className="text-center font-bold border-none bg-transparent focus:ring-0 text-xs md:text-sm"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <Input 
                                            type="number" 
                                            min={0}
                                            value={item.rate} 
                                            onChange={e => handleItemChange(index, 'rate', e.target.value)}
                                            className="text-center font-bold border-none bg-transparent focus:ring-0 text-xs md:text-sm"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="text-xs md:text-sm font-black text-slate-700">₹ {item.value.toLocaleString()}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveItem(index)}
                                            className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white font-black">
                            <tr>
                                <td colSpan={3} className="px-4 py-4 text-right uppercase tracking-widest text-[10px]">Grand Total</td>
                                <td className="px-4 py-4 text-right text-lg">₹ {totalOrderValue.toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Additional Remarks</label>
                  <Input 
                    placeholder="Enter any special instructions or notes here..." 
                    value={formData.remarks}
                    onChange={e => setFormData({...formData, remarks: e.target.value})}
                    className="italic border-slate-200"
                  />
              </div>

              <div className="flex justify-end pt-4 gap-3 px-4 md:px-0">
                <Button 
                  type="submit" 
                  loading={submitting}
                  className="gap-2 px-10 h-12 text-base font-bold shadow-xl animate-pulse hover:animate-none hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none"
                >
                  <Save className="w-5 h-5" /> {editingId ? "Update Order Details" : "Confirm & Post Order"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Recent Orders"
          description="Log of latest customer orders and their status."
          headers={['Order No', 'Date', 'Customer', 'Executive', 'Total Value', 'Items', 'Actions']}
          data={orders}
          loading={loading}
          searchFields={['order_number', 'customers.customer_name', 'executive.name', 'remarks']}
          renderRow={(o: any) => (
            <tr key={o.id} className="hover:bg-primary/5 border-b last:border-none transition-all group cursor-pointer">
              <td className="px-6 py-4 font-mono font-black text-primary">{o.order_number}</td>
              <td className="px-6 py-4 text-xs font-semibold text-slate-600">{new Date(o.order_date).toLocaleDateString()}</td>
              <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{o.customers?.customer_name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{o.customers?.customer_code}</span>
                  </div>
              </td>
              <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-600 border">
                        {o.executive?.name?.charAt(0) || '?'}
                    </div>
                    <span className="text-xs font-medium">{o.executive?.name || 'N/A'}</span>
                  </div>
              </td>
              <td className="px-6 py-4 font-black text-slate-900">₹ {o.total_value?.toLocaleString()}</td>
              <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 border">
                        {o.items?.length || 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Products</span>
                  </div>
              </td>
              <td className="px-6 py-4">
                  <div className="flex items-center gap-2 transition-opacity">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleEdit(o); }}
                        className="h-8 w-8 p-0 text-primary hover:bg-primary/10 border border-primary/10"
                        title="Edit Order"
                    >
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleDelete(o.id); }}
                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 border border-rose-100"
                        title="Delete Order"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}
