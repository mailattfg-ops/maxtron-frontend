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
  Truck, ArrowRight, Check, Copy
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
import { Checkbox } from '@/components/ui/checkbox';

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
  const [roundOff, setRoundOff] = useState(false);
  
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

  const [activeSection, setActiveSection] = useState<'ALL' | 'B2B' | 'B2C'>('ALL');

  // Cancellation Modal States
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; type: 'EINVOICE' | 'EWB'; docNo: string } | null>(null);
  const [cancelReasonCode, setCancelReasonCode] = useState('2');
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    order_id: '',
    executive_id: '',
    invoice_type: 'B2B',
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

  const handleCustomerChange = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    const autoType = cust?.gst_no ? 'B2B' : 'B2C';
    setFormData(prev => ({ ...prev, customer_id: customerId, invoice_type: autoType }));
  };

  const handleOrderSelect = (orderId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (order) {
          const cust = customers.find(c => c.id === order.customer_id);
          const autoType = cust?.gst_no ? 'B2B' : 'B2C';
          setFormData({
              ...formData,
              order_id: orderId,
              customer_id: order.customer_id,
              invoice_type: autoType,
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
      const qty = field === 'quantity' ? Math.max(0, parseFloat(value) || 0) : item.quantity;
      const rate = field === 'rate' ? Math.max(0, parseFloat(value) || 0) : item.rate;
      item.amount = qty * rate;
      item[field] = field === 'quantity' ? qty : rate;
    }

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const totals = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = formData.tax_amount || 0;
    const discount = formData.discount_amount || 0;
    const netBeforeRound = subtotal + tax - discount;
    const net = roundOff ? Math.round(netBeforeRound) : netBeforeRound;
    const roundoffAmount = roundOff ? (net - netBeforeRound) : 0;
    return { subtotal, tax, discount, net, roundoffAmount };
  }, [formData.items, formData.tax_amount, formData.discount_amount, roundOff]);

  const filteredInvoices = useMemo(() => {
    if (activeSection === 'B2B') {
      return invoices.filter(i => (i.invoice_type || (i.customers?.gst_no ? 'B2B' : 'B2C')).toUpperCase() === 'B2B');
    }
    if (activeSection === 'B2C') {
      return invoices.filter(i => (i.invoice_type || (i.customers?.gst_no ? 'B2B' : 'B2C')).toUpperCase() === 'B2C');
    }
    return invoices;
  }, [invoices, activeSection]);

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
          order_id: formData.order_id === '' || formData.order_id === 'manual' ? null : formData.order_id,
          executive_id: formData.executive_id === '' ? null : formData.executive_id,
          scheduled_delivery_date: formData.scheduled_delivery_date === '' ? null : formData.scheduled_delivery_date,
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
            invoice_type: 'B2B',
            invoice_date: new Date().toISOString().split('T')[0],
            scheduled_delivery_date: '',
            remarks: '',
            tax_amount: 0,
            discount_amount: 0,
            company_id: currentCompanyId,
            items: [{ product_id: '', quantity: 0, rate: 0, amount: 0 }]
        });
        setRoundOff(false);
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
    const cust = customers.find(c => c.id === inv.customer_id);
    const resolvedType = inv.invoice_type || (cust?.gst_no ? 'B2B' : 'B2C');
    setEditingId(inv.id);
    setFormData({
      customer_id: inv.customer_id,
      order_id: inv.order_id || '',
      executive_id: inv.executive_id || '',
      invoice_type: resolvedType,
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
    const subtotal = inv.items?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;
    const tax = Number(inv.tax_amount) || 0;
    const discount = Number(inv.discount_amount) || 0;
    const netBeforeRound = subtotal + tax - discount;
    const netActual = Number(inv.net_amount) || 0;
    const isRounded = Math.abs(netActual - Math.round(netBeforeRound)) < 0.01 && Math.abs(netActual - netBeforeRound) > 0.001;
    setRoundOff(isRounded);

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

  const handleGenerateEInvoice = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${INVOICES_API}/${id}/einvoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await res.json();
      if (result.success) {
        setAlert({
          show: true,
          type: 'success',
          title: 'E-Invoice Generated',
          message: `IRN successfully registered. Ack No: ${result.data?.einvoice_ack_no || 'N/A'}`
        });
        fetchInvoices();
      } else {
        setAlert({
          show: true,
          type: 'error',
          title: 'E-Invoice Failed',
          message: result.message || 'Could not generate E-Invoice.'
        });
        fetchInvoices();
      }
    } catch (err) {
      setAlert({ show: true, type: 'error', title: 'System Error', message: 'Could not connect to server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEwb = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${INVOICES_API}/${id}/ewaybill`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await res.json();
      if (result.success) {
        setAlert({
          show: true,
          type: 'success',
          title: 'E-Way Bill Generated',
          message: `EWB successfully registered: ${result.data?.ewb_no || 'N/A'}`
        });
        fetchInvoices();
      } else {
        setAlert({
          show: true,
          type: 'error',
          title: 'E-Way Bill Failed',
          message: result.message || 'Could not generate E-Way Bill.'
        });
        fetchInvoices();
      }
    } catch (err) {
      setAlert({ show: true, type: 'error', title: 'System Error', message: 'Could not connect to server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;

    setCancelling(true);
    try {
      const endpoint = cancelTarget.type === 'EINVOICE' ? 'einvoice/cancel' : 'ewaybill/cancel';
      const res = await fetch(`${INVOICES_API}/${cancelTarget.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reasonCode: cancelReasonCode,
          remarks: cancelRemarks || 'Cancelled from ERP'
        })
      });
      const result = await res.json();
      if (result.success) {
        setAlert({
          show: true,
          type: 'success',
          title: `${cancelTarget.type === 'EINVOICE' ? 'E-Invoice' : 'E-Way Bill'} Cancelled`,
          message: 'Cancellation reported successfully.'
        });
        setShowCancelDialog(false);
        setCancelTarget(null);
        setCancelRemarks('');
        fetchInvoices();
      } else {
        setAlert({
          show: true,
          type: 'error',
          title: 'Cancellation Failed',
          message: result.message || 'Could not process cancellation.'
        });
      }
    } catch (err) {
      setAlert({ show: true, type: 'error', title: 'System Error', message: 'Something went wrong.' });
    } finally {
      setCancelling(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 min-w-0">
      {/* Custom Alert Modal */}
      {alert.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" 
                 onClick={() => setAlert({...alert, show: false})} />
            <Card className="relative w-full max-w-[440px] shadow-2xl border-none bg-white rounded-3xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-300">
                <div className={`h-2 w-full ${alert.type === 'success' ? 'bg-primary' : alert.type === 'error' ? 'bg-destructive' : 'bg-primary'}`} />
                <CardContent className="p-10 text-center">
                    <div className="flex justify-center mb-6">
                        <div className={`p-5 rounded-full ${alert.type === 'success' ? 'bg-primary/5 text-primary' : alert.type === 'error' ? 'bg-destructive/5 text-destructive' : 'bg-primary/5 text-primary'}`}>
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
                                <Button onClick={() => { alert.onConfirm?.(); setAlert({...alert, show: false}); }} className="rounded-2xl px-10 h-12 bg-primary hover:bg-primary/90 font-black shadow-lg shadow-primary/20">Yes, Delete</Button>
                            </>
                        ) : (
                            <Button onClick={() => setAlert({...alert, show: false})} className="rounded-2xl px-12 h-12 font-black shadow-lg">Got it</Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-8 h-8 md:w-10 md:h-10 p-1.5 bg-primary/10 text-primary rounded-lg shrink-0" />
            <span className="truncate">Sales / Invoice Entry</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Generate tax invoices and link to customer orders.</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          className={`h-11 px-6 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none font-bold ${showForm ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"}`}
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? "Cancel Entry" : "New Sales Invoice"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-2xl overflow-hidden bg-white animate-in slide-in-from-top duration-300 w-full max-w-full min-w-0">
          <CardHeader className="bg-primary/5 border-b border-primary/10 py-6">
            <CardTitle className="text-primary flex items-center gap-2">
              <Plus className="w-5 h-5" /> {editingId ? "Edit Invoice" : "Create New Invoice"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 md:px-6 md:p-8 w-full max-w-full min-w-0 overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-full min-w-0 overflow-hidden">
              <div className="space-y-6">
                {/* Row 1: Date of Sale, Link Order, Customer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <Select value={formData.order_id || "manual"} onValueChange={handleOrderSelect}>
                      <SelectTrigger className="w-full h-10 font-bold bg-white border-slate-200">
                        <SelectValue placeholder="Manual Entry (No Order)" />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[1000] max-h-60 overflow-y-auto">
                        <SelectItem value="manual">Manual Entry (No Order)</SelectItem>
                        {orders.filter(o => !invoices.find(inv => inv.order_id === o.id) || o.id === formData.order_id).map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.order_number} | {new Date(o.order_date).toLocaleDateString()} | {o.items?.length || 0} items
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                      <User className="w-3 h-3" /> Customer
                    </label>
                    <Select value={formData.customer_id || ""} onValueChange={handleCustomerChange}>
                      <SelectTrigger className="w-full h-10 font-bold bg-white border-slate-200">
                        <SelectValue placeholder="Select Customer..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[1000] max-h-60 overflow-y-auto">
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.customer_name} ({c.customer_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Business Type, Executive Name */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                      <Briefcase className="w-3 h-3" /> Business Type
                    </label>
                    <Select value={formData.invoice_type || "B2B"} onValueChange={val => setFormData({...formData, invoice_type: val})}>
                      <SelectTrigger className="w-full h-10 font-bold bg-white border-slate-200">
                        <SelectValue placeholder="Select Business Type..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[1000]">
                        <SelectItem value="B2B">B2B Invoice</SelectItem>
                        <SelectItem value="B2C">B2C Invoice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                      <Briefcase className="w-3 h-3" /> Executive Name
                    </label>
                    <div className="w-full flex items-center h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-sm cursor-not-allowed font-semibold truncate">
                      {executives.find(e => e.id === formData.executive_id)?.name || 'N/A (Auto-filled)'}
                    </div>
                  </div>
                </div>
              </div>

              {selectedCustomer && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-6">
                    <Info className="w-6 h-6 text-primary" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-1 flex-1">
                         <div className="flex flex-col"><span className="text-[10px] font-bold text-primary/60 uppercase">GST No</span><span className="text-sm font-bold">{selectedCustomer.gst_no || 'N/A'}</span></div>
                         <div className="flex flex-col"><span className="text-[10px] font-bold text-primary/60 uppercase">Limit</span><span className="text-sm font-bold">₹ {selectedCustomer.credit_limit || 0}</span></div>
                    </div>
                </div>
              )}

              <div className="space-y-4 w-full max-w-full min-w-0">
                <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black uppercase text-slate-500 border-l-4 border-primary pl-3">Line Items</label>
                    <Button type="button" onClick={handleAddItem} size="sm" className="bg-primary/10 text-primary h-8"><Plus className="w-3 h-3 mr-1" /> Add Row</Button>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto text-sm w-full max-w-full">
                    <table className="w-full min-w-[600px]">
                        <thead className="bg-slate-100/80 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-left">Select Product</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-32">HSN Code</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-32">Quantity</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-32">Rate (₹)</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-right w-40">Value (₹)</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {formData.items.map((item, index) => (
                                <tr key={index} className="bg-white hover:bg-slate-50 group">
                                    <td className="p-4">
                                        <Select 
                                          value={item.product_id || ""} 
                                          onValueChange={val => handleItemChange(index, 'product_id', val)}
                                        >
                                          <SelectTrigger className="w-full h-9 font-bold bg-transparent border-none text-sm shadow-none focus:ring-0">
                                            <SelectValue placeholder="Select Product..." />
                                          </SelectTrigger>
                                          <SelectContent className="bg-white z-[1000] max-h-60 overflow-y-auto">
                                            {products.map(p => (
                                              <SelectItem key={p.id} value={p.id}>{p.product_code} - {p.product_name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="p-4 text-center font-mono text-xs font-bold text-slate-500">
                                        {products.find(p => p.id === item.product_id)?.hsn_code || '-'}
                                    </td>
                                    <td className="p-4"><Input type="number" min="0" placeholder='₹ 0' value={item.quantity === 0 ? '' : item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="text-center font-bold border-none text-xs md:text-sm" /></td>
                                    <td className="p-4"><Input type="number" min="0" placeholder='₹ 0' value={item.rate === 0 ? '' : item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className="text-center font-bold border-none text-xs md:text-sm" /></td>
                                    <td className="p-4 text-right font-black text-slate-500 text-xs md:text-sm">₹ {(item.amount || 0).toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
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
                            <span className="text-slate-500">Tax (GST) (+) {!formData.tax_amount && <span className="text-[10px] font-medium lowercase">(₹)</span>}</span>
                            <Input type="number" placeholder='₹ 0' min="0" value={formData.tax_amount === 0 ? '' : formData.tax_amount} onChange={e => setFormData({...formData, tax_amount: Math.max(0, parseFloat(e.target.value) || 0)})} className="w-32 h-8 text-right font-bold" />
                        </div>
                        <div className="flex justify-between text-sm items-center gap-4">
                            <span className="text-slate-500">Discount (-) {!formData.discount_amount && <span className="text-[10px] font-medium lowercase">(₹)</span>}</span>
                            <Input type="number" placeholder='₹ 0' min="0" value={formData.discount_amount === 0 ? '' : formData.discount_amount} onChange={e => setFormData({...formData, discount_amount: Math.max(0, parseFloat(e.target.value) || 0)})} className="w-32 h-8 text-right font-bold" />
                        </div>
                        <div className="flex justify-between text-sm items-center gap-4">
                            <span className="text-slate-500 flex items-center gap-2 cursor-pointer select-none">
                              <Checkbox 
                                id="roundoff-toggle" 
                                checked={roundOff} 
                                onCheckedChange={(checked) => setRoundOff(!!checked)} 
                              />
                              <label htmlFor="roundoff-toggle" className="cursor-pointer">Round Off Fraction</label>
                            </span>
                            <span className="font-mono text-slate-600 font-bold">
                              ₹ {totals.roundoffAmount.toFixed(2)}
                            </span>
                        </div>
                        <div className="h-px bg-slate-200 my-2" />
                        <div className="flex justify-between text-xl font-black text-primary"><span>Total Value</span><span>₹ {totals.net.toLocaleString()}</span></div>
                    </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-4 md:px-0">
                <Button 
                  type="submit" 
                  loading={submitting}
                  className="gap-2 px-10 h-12 text-base font-bold shadow-xl hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none"
                >
                  <Save className="w-5 h-5" /> {editingId ? "Update Invoice" : "Generate Invoice"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveSection('ALL')}
              className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all ${
                activeSection === 'ALL' 
                  ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              All Invoices ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('B2B')}
              className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all ${
                activeSection === 'B2B' 
                  ? 'bg-white text-primary shadow-md shadow-primary/10' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              B2B Invoices ({invoices.filter(i => (i.invoice_type || (i.customers?.gst_no ? 'B2B' : 'B2C')).toUpperCase() === 'B2B').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('B2C')}
              className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all ${
                activeSection === 'B2C' 
                  ? 'bg-white text-amber-700 shadow-md shadow-amber-200/50' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              B2C Invoices ({invoices.filter(i => (i.invoice_type || (i.customers?.gst_no ? 'B2B' : 'B2C')).toUpperCase() === 'B2C').length})
            </button>
          </div>

          <TableView
            title={`${activeSection === 'B2B' ? 'B2B' : activeSection === 'B2C' ? 'B2C' : 'All'} Posted Invoices`}
            description="History of sales invoices generated."
            headers={['Inv No', 'Date', 'Type', 'Customer', 'Linked Order', 'Net Amount', 'E-Invoice', 'E-Way Bill', 'Actions']}
            data={filteredInvoices}
            loading={loading}
            searchFields={['invoice_number', 'customers.customer_name']}
            renderRow={(inv: any) => {
              const invType = (inv.invoice_type || (inv.customers?.gst_no ? 'B2B' : 'B2C')).toUpperCase();
              return (
                <tr key={inv.id} className="hover:bg-primary/5 transition-all group">
                  <td className="px-6 py-4 font-mono font-black text-primary">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-xs font-semibold">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      invType === 'B2B' 
                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {invType}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold">{inv.customers?.customer_name}</td>
                  <td className="px-6 py-4 text-xs italic text-slate-500">{inv.order_id ? inv.invoices?.order_number || 'Linked' : 'Manual Entry'}</td>
                  <td className="px-6 py-4 font-black">₹ {inv.net_amount?.toLocaleString()}</td>
                  
                  {/* E-Invoice Column */}
                  <td className="px-6 py-4">
                      {invType === 'B2C' ? (
                          <span className="text-xs text-slate-400 font-semibold italic">Not Req (B2C)</span>
                      ) : (
                          <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                              {inv.einvoice_status === 'GENERATED' ? (
                                  <>
                                      <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          <Check className="w-3 h-3 text-emerald-600 font-bold" />
                                          Generated
                                      </span>
                                      {inv.einvoice_ack_no && (
                                          <div className="flex flex-col gap-1 items-start">
                                              <div className="flex items-center gap-1 group/copy select-all">
                                                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title={`IRN: ${inv.einvoice_irn}`}>
                                                      Ack: {inv.einvoice_ack_no}
                                                  </span>
                                                  <button
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          navigator.clipboard.writeText(inv.einvoice_irn);
                                                          success('E-Invoice IRN copied!');
                                                      }}
                                                      className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-all"
                                                      title="Copy IRN"
                                                  >
                                                      <Copy className="w-3 h-3" />
                                                  </button>
                                              </div>
                                              <Button
                                                  onClick={() => {
                                                      setCancelTarget({ id: inv.id, type: 'EINVOICE', docNo: inv.einvoice_ack_no });
                                                      setCancelReasonCode('2');
                                                      setShowCancelDialog(true);
                                                  }}
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 text-[10px] px-2 py-0.5 rounded border-rose-200 hover:bg-rose-50 text-rose-600 font-bold mt-0.5"
                                              >
                                                  Cancel IRN
                                              </Button>
                                          </div>
                                      )}
                                  </>
                              ) : inv.einvoice_status === 'CANCELLED' ? (
                                  <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 italic">
                                      Cancelled
                                  </span>
                              ) : inv.einvoice_status === 'FAILED' ? (
                                  <div className="flex flex-col gap-1 items-start">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200" title={inv.einvoice_error}>
                                          <XCircle className="w-3 h-3 text-rose-600" />
                                          Failed
                                      </span>
                                      <Button 
                                          onClick={() => handleGenerateEInvoice(inv.id)}
                                          size="sm" 
                                          variant="outline" 
                                          className="h-6 text-[10px] px-2 py-0.5 rounded border-rose-200 hover:bg-rose-50 text-rose-600"
                                      >
                                          Retry
                                      </Button>
                                  </div>
                              ) : (
                                  <Button 
                                      onClick={() => handleGenerateEInvoice(inv.id)}
                                      size="sm" 
                                      variant="outline" 
                                      className="h-7 text-[10px] px-3 py-1 bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 rounded-full font-bold"
                                  >
                                      Generate IRN
                                  </Button>
                              )}
                          </div>
                      )}
                  </td>

                  {/* E-Way Bill Column */}
                  <td className="px-6 py-4">
                      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                          {inv.ewb_status === 'GENERATED' ? (
                              <>
                                  <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <Check className="w-3 h-3 text-emerald-600 font-bold" />
                                      EWB Active
                                  </span>
                                  {inv.ewb_no && (
                                      <div className="flex flex-col gap-1 items-start">
                                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                              EWB: {inv.ewb_no}
                                          </span>
                                          <Button
                                              onClick={() => {
                                                  setCancelTarget({ id: inv.id, type: 'EWB', docNo: inv.ewb_no });
                                                  setCancelReasonCode('3');
                                                  setShowCancelDialog(true);
                                              }}
                                              size="sm"
                                              variant="outline"
                                              className="h-6 text-[10px] px-2 py-0.5 rounded border-rose-200 hover:bg-rose-50 text-rose-600 font-bold mt-0.5"
                                          >
                                              Cancel EWB
                                          </Button>
                                      </div>
                                  )}
                              </>
                          ) : inv.ewb_status === 'CANCELLED' ? (
                              <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 italic">
                                  Cancelled
                              </span>
                          ) : inv.ewb_status === 'FAILED' ? (
                              <div className="flex flex-col gap-1 items-start">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200" title={inv.ewb_error}>
                                      <XCircle className="w-3 h-3 text-rose-600" />
                                      EWB Failed
                                  </span>
                                  <Button 
                                      onClick={() => handleGenerateEwb(inv.id)}
                                      size="sm" 
                                      variant="outline" 
                                      className="h-6 text-[10px] px-2 py-0.5 rounded border-rose-200 hover:bg-rose-50 text-rose-600"
                                  >
                                      Retry
                                  </Button>
                              </div>
                          ) : (
                              <Button 
                                  onClick={() => handleGenerateEwb(inv.id)}
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-[10px] px-3 py-1 bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 rounded-full font-bold"
                              >
                                  Generate EWB
                              </Button>
                          )}
                      </div>
                  </td>

                  <td className="px-2 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(inv)} className="h-8 w-8 p-0 text-primary border border-primary/10 font-bold"><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)} className="h-8 w-8 p-0 text-destructive border border-destructive/10 font-bold"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                  </td>
                </tr>
              );
            }}
          />
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {showCancelDialog && cancelTarget && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" 
               onClick={() => setShowCancelDialog(false)} />
          <Card className="relative w-full max-w-[460px] shadow-2xl border-none bg-white rounded-3xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-300">
            <div className="h-2 w-full bg-destructive" />
            <CardContent className="p-8">
              <h3 className="text-xl font-black text-slate-900 mb-2">Cancel {cancelTarget.type === 'EINVOICE' ? 'E-Invoice (IRN)' : 'E-Way Bill'}</h3>
              <p className="text-slate-500 text-xs font-semibold mb-6">
                Are you sure you want to cancel {cancelTarget.type === 'EINVOICE' ? 'IRN Ack' : 'E-Way Bill'} #{cancelTarget.docNo}? This action is reported to the GST system.
              </p>
              
              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Reason Code</label>
                  {cancelTarget.type === 'EINVOICE' ? (
                    <select
                      value={cancelReasonCode}
                      onChange={e => setCancelReasonCode(e.target.value)}
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:ring-1 focus:ring-primary font-bold"
                    >
                      <option value="1">1 - Duplicate</option>
                      <option value="2">2 - Data Entry Error</option>
                      <option value="3">3 - Order Cancelled</option>
                      <option value="4">4 - Others</option>
                    </select>
                  ) : (
                    <select
                      value={cancelReasonCode}
                      onChange={e => setCancelReasonCode(e.target.value)}
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:ring-1 focus:ring-primary font-bold"
                    >
                      <option value="1">1 - Duplicate</option>
                      <option value="2">2 - Order Cancelled</option>
                      <option value="3">3 - Data Entry Error</option>
                      <option value="4">4 - Others</option>
                    </select>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Remarks / Explanation</label>
                  <Input 
                    placeholder="Enter reason details..." 
                    value={cancelRemarks} 
                    onChange={e => setCancelRemarks(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mt-8 flex gap-3 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCancelDialog(false)} className="rounded-xl px-6 h-11 border-slate-200 font-bold">Cancel</Button>
                  <Button type="submit" loading={cancelling} className="rounded-xl px-8 h-11 bg-destructive hover:bg-destructive/90 text-white font-black shadow-lg shadow-destructive/20">Confirm Cancellation</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
