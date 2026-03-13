'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, Plus, Trash2, Save, X, Search, 
  User, Calendar, DollarSign, Package, Briefcase, 
  Info, Edit2, CheckCircle2, AlertCircle, AlertTriangle, XCircle,
  Truck, ArrowRight
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const INVOICES_API = `${API_BASE}/api/maxtron/sales/invoices`;
const ORDERS_API = `${API_BASE}/api/maxtron/sales/orders`;
const CUSTOMERS_API = `${API_BASE}/api/maxtron/customers`;
const PRODUCTS_API = `${API_BASE}/api/maxtron/products`;
const EMPLOYEES_API = `${API_BASE}/api/maxtron/employees`;

export default function SalesInvoiceEntry() {
  const [invoices, setInvoices] = useState<any[]>([]);
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

  const { success, error } = useToast();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    customer_id: '',
    order_id: '',
    executive_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    scheduled_delivery_date: '',
    remarks: '',
    tax_amount: 0,
    discount_amount: 0,
    company_id: '',
    items: [
      { product_id: '', quantity: 0, rate: 0, amount: 0 }
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

      const [custRes, prodRes, empRes, orderRes] = await Promise.all([
        fetch(`${CUSTOMERS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${PRODUCTS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${EMPLOYEES_API}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${ORDERS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const custData = await custRes.json();
      const prodData = await prodRes.json();
      const empData = await empRes.json();
      const orderData = await orderRes.json();
      
      if (custData.success) setCustomers(custData.data);
      if (prodData.success) setProducts(prodData.data);
      if (orderData.success) setOrders(orderData.data);
      if (empData.success) {
        setExecutives(empData.data.filter((e: any) => 
            e.companies?.company_name?.toUpperCase() === activeTenant &&
            (e.user_types?.name === 'sales' || e.user_types?.name === 'admin' || e.user_types?.name === 'production')
        ));
      }

      if (coId) fetchInvoices(coId);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${INVOICES_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setInvoices(data.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleOrderSelect = (orderId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (order) {
          setFormData({
              ...formData,
              order_id: orderId,
              customer_id: order.customer_id,
              executive_id: order.executive_id || '',
              items: order.items.map((i: any) => ({
                  product_id: i.product_id,
                  quantity: i.quantity,
                  rate: i.rate,
                  amount: i.value
              }))
          });
      }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 0, rate: 0, amount: 0 }]
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
    
    if (field === 'quantity' || field === 'rate') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
      const rate = field === 'rate' ? parseFloat(value) || 0 : item.rate;
      item.amount = qty * rate;
    }

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const totals = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = formData.tax_amount || 0;
    const discount = formData.discount_amount || 0;
    const net = subtotal + tax - discount;
    return { subtotal, tax, discount, net };
  }, [formData.items, formData.tax_amount, formData.discount_amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) { 
        setAlert({ show: true, type: 'error', title: 'Missing Data', message: 'Please select a customer.' });
        return; 
    }


    setSubmitting(true);
    try {
      const url = editingId ? `${INVOICES_API}/${editingId}` : INVOICES_API;
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          total_amount: totals.subtotal,
          net_amount: totals.net
        })
      });

      const result = await res.json();
      if (result.success) {
        setAlert({
            show: true,
            type: 'success',
            title: editingId ? 'Invoice Updated' : 'Invoice Generated',
            message: editingId ? 'Changes saved.' : 'Sales invoice has been posted.'
        });
        setShowForm(false);
        setEditingId(null);
        setFormData({
            customer_id: '',
            order_id: '',
            executive_id: '',
            invoice_date: new Date().toISOString().split('T')[0],
            scheduled_delivery_date: '',
            remarks: '',
            tax_amount: 0,
            discount_amount: 0,
            company_id: currentCompanyId,
            items: [{ product_id: '', quantity: 0, rate: 0, amount: 0 }]
        });
        fetchInvoices();
      } else {
        setAlert({ show: true, type: 'error', title: 'Error', message: result.message });
      }
    } catch (err) {
        setAlert({ show: true, type: 'error', title: 'System Error', message: 'Something went wrong.' });
    } finally {
        setSubmitting(false);
    }
  };

  const handleEdit = (inv: any) => {
    setEditingId(inv.id);
    setFormData({
      customer_id: inv.customer_id,
      order_id: inv.order_id || '',
      executive_id: inv.executive_id || '',
      invoice_date: inv.invoice_date.split('T')[0],
      scheduled_delivery_date: inv.scheduled_delivery_date ? inv.scheduled_delivery_date.split('T')[0] : '',
      remarks: inv.remarks || '',
      tax_amount: Number(inv.tax_amount) || 0,
      discount_amount: Number(inv.discount_amount) || 0,
      company_id: inv.company_id,
      items: inv.items.map((i: any) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        rate: i.rate,
        amount: i.amount
      }))
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    setAlert({
        show: true,
        type: 'confirm',
        title: 'Delete Invoice?',
        message: 'This will permanently remove the invoice.',
        onConfirm: async () => {
            const res = await fetch(`${INVOICES_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            if (result.success) {
                setAlert({ show: true, type: 'success', title: 'Deleted', message: 'Invoice removed.' });
                fetchInvoices();
            }
        }
    });
  };

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Custom Alert Modal */}
      {alert.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" 
                 onClick={() => setAlert({...alert, show: false})} />
            <Card className="relative w-full max-w-[440px] shadow-2xl border-none bg-white rounded-3xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-300">
                <div className={`h-2 w-full ${alert.type === 'success' ? 'bg-emerald-500' : alert.type === 'error' ? 'bg-rose-500' : 'bg-primary'}`} />
                <CardContent className="p-10 text-center">
                    <div className="flex justify-center mb-6">
                        <div className={`p-5 rounded-full ${alert.type === 'success' ? 'bg-emerald-50 text-emerald-500' : alert.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-primary/5 text-primary'}`}>
                            {alert.type === 'success' && <CheckCircle2 className="w-12 h-12" />}
                            {alert.type === 'error' && <XCircle className="w-12 h-12" />}
                            {alert.type === 'confirm' && <AlertCircle className="w-12 h-12" />}
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">{alert.title}</h3>
                    <p className="text-slate-500 font-medium">{alert.message}</p>
                    <div className="mt-10 flex gap-3 justify-center">
                        {alert.type === 'confirm' ? (
                            <>
                                <Button variant="outline" onClick={() => setAlert({...alert, show: false})} className="rounded-2xl px-8 h-12 border-slate-200 font-bold">Cancel</Button>
                                <Button onClick={() => { alert.onConfirm?.(); setAlert({...alert, show: false}); }} className="rounded-2xl px-10 h-12 bg-rose-600 hover:bg-rose-700 font-black shadow-lg">Yes, Delete</Button>
                            </>
                        ) : (
                            <Button onClick={() => setAlert({...alert, show: false})} className="rounded-2xl px-12 h-12 font-black shadow-lg">Got it</Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" /> Sales / Invoice Entry
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Generate tax invoices and link to customer orders.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"} className="gap-2 shadow-lg transition-all hover:scale-105">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel Entry" : "New Sales Invoice"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-2xl overflow-hidden bg-white animate-in slide-in-from-top duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-primary flex items-center gap-2">
              <Plus className="w-5 h-5" /> {editingId ? "Edit Invoice" : "Create New Invoice"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                    <Calendar className="w-3 h-3" /> Date of Sale
                  </label>
                  <Input type="date" value={formData.invoice_date} onChange={e => setFormData({...formData, invoice_date: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                    <Search className="w-3 h-3" /> Link Order (Optional)
                  </label>
                  <select value={formData.order_id} onChange={e => handleOrderSelect(e.target.value)} className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm">
                    <option value="">Manual Entry (No Order)</option>
                    {orders.filter(o => !invoices.find(inv => inv.order_id === o.id) || o.id === formData.order_id).map(o => (
                      <option key={o.id} value={o.id}>{o.order_number} | {new Date(o.order_date).toLocaleDateString()} | {o.items?.length || 0} items</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                    <User className="w-3 h-3" /> Customer
                  </label>
                  <select value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})} className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm">
                    <option value="">Select Customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name} ({c.customer_code})</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                    <Briefcase className="w-3 h-3" /> Executive Name
                  </label>
                  <div className="w-full flex items-center h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-sm cursor-not-allowed">
                    {executives.find(e => e.id === formData.executive_id)?.name || 'N/A (Auto-filled from order)'}
                  </div>
                </div>
              </div>

              {selectedCustomer && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-6">
                    <Info className="w-6 h-6 text-blue-600" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-1 flex-1">
                         <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-400 uppercase">GST No</span><span className="text-sm font-bold">{selectedCustomer.gst_no || 'N/A'}</span></div>
                         <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-400 uppercase">Limit</span><span className="text-sm font-bold">₹ {selectedCustomer.credit_limit || 0}</span></div>
                    </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black uppercase text-slate-500 border-l-4 border-primary pl-3">Line Items</label>
                    <Button type="button" onClick={handleAddItem} size="sm" className="bg-primary/10 text-primary h-8"><Plus className="w-3 h-3 mr-1" /> Add Row</Button>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-sm">
                    <table className="w-full">
                        <thead className="bg-slate-100/80 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left">Select Product</th>
                                <th className="px-4 py-3 text-center w-32">Quantity Sold</th>
                                <th className="px-4 py-3 text-center w-32">Rate (₹)</th>
                                <th className="px-4 py-3 text-right w-40">Value (₹)</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {formData.items.map((item, index) => (
                                <tr key={index} className="bg-white hover:bg-slate-50 group">
                                    <td className="p-4">
                                        <select value={item.product_id} onChange={e => handleItemChange(index, 'product_id', e.target.value)} className="w-full bg-transparent border-none">
                                            <option value="">Select Product...</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.product_code} - {p.product_name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-4"><Input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="text-center font-bold border-none" /></td>
                                    <td className="p-4"><Input type="number" value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className="text-center font-bold border-none" /></td>
                                    <td className="p-4 text-right font-black text-slate-500">₹ {(item.amount || 0).toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Scheduled Delivery Date</label>
                            <Input type="date" value={formData.scheduled_delivery_date} onChange={e => setFormData({...formData, scheduled_delivery_date: e.target.value})} className="border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Remarks</label>
                            <Input placeholder="Invoice notes..." value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="italic" />
                        </div>
                    </div>
                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex justify-between text-sm font-medium text-slate-500"><span>Subtotal</span><span>₹ {totals.subtotal.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm items-center gap-4">
                            <span className="text-slate-500">Tax (GST) (+)</span>
                            <Input type="number" value={formData.tax_amount} onChange={e => setFormData({...formData, tax_amount: parseFloat(e.target.value) || 0})} className="w-32 h-8 text-right font-bold" />
                        </div>
                        <div className="flex justify-between text-sm items-center gap-4">
                            <span className="text-slate-500">Discount (-)</span>
                            <Input type="number" value={formData.discount_amount} onChange={e => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})} className="w-32 h-8 text-right font-bold" />
                        </div>
                        <div className="h-px bg-slate-200 my-2" />
                        <div className="flex justify-between text-xl font-black text-primary"><span>Total Value</span><span>₹ {totals.net.toLocaleString()}</span></div>
                    </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  type="submit" 
                  loading={submitting}
                  className="gap-2 px-10 h-12 text-base font-bold shadow-xl"
                >
                  <Save className="w-5 h-5" /> {editingId ? "Update Invoice" : "Generate Invoice"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white/80 backdrop-blur-md">
          <TableView
            title="Posted Invoices"
            description="History of all sales invoices generated."
            headers={['Inv No', 'Date', 'Customer', 'Linked Order', 'Net Amount', 'Actions']}
            data={invoices}
            loading={loading}
            searchFields={['invoice_number', 'customers.customer_name']}
            renderRow={(inv: any) => (
              <tr key={inv.id} className="hover:bg-primary/5 transition-all group">
                <td className="px-6 py-4 font-mono font-black text-primary">{inv.invoice_number}</td>
                <td className="px-6 py-4 text-xs font-semibold">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-bold">{inv.customers?.customer_name}</td>
                <td className="px-6 py-4 text-xs italic text-slate-500">{inv.order_id ? inv.invoices?.order_number || 'Linked' : 'Manual Entry'}</td>
                <td className="px-6 py-4 font-black">₹ {inv.net_amount?.toLocaleString()}</td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(inv)} className="h-8 w-8 p-0 text-primary border border-primary/10"><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)} className="h-8 w-8 p-0 text-rose-600 border border-rose-100"><Trash2 className="w-4 h-4" /></Button>
                   </div>
                </td>
              </tr>
            )}
          />
        </Card>
      )}
    </div>
  );
}
