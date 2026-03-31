'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Truck, Plus, Trash2, Save, X, Search, 
  User, Calendar, Package, Briefcase, 
  Info, Edit2, CheckCircle2, AlertCircle, XCircle,
  FileText, ClipboardList
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { TableView } from '@/components/ui/table-view';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const DELIVERIES_API = `${API_BASE}/api/maxtron/sales/deliveries`;
const INVOICES_API = `${API_BASE}/api/maxtron/sales/invoices`;
const VEHICLES_API = `${API_BASE}/api/maxtron/vehicles`;
const PRODUCTS_API = `${API_BASE}/api/maxtron/products`;
const EMPLOYEES_API = `${API_BASE}/api/maxtron/employees`;

export default function DeliveryDetails() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [alert, setAlert] = useState<{
    show: boolean, 
    type: 'success' | 'error' | 'confirm',
    title: string,
    message: string,
    onConfirm?: () => void
  }>({ show: false, type: 'success', title: '', message: '' });

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    invoice_id: '',
    order_id: '',
    vehicle_id: '',
    driver_name: '',
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_person_id: '',
    receiver_name: '',
    receiver_section: '',
    delivery_time: '',
    contact_number: '',
    dc_no: '',
    status: 'OUT_FOR_DELIVERY',
    remarks: '',
    company_id: '',
    items: [{ product_id: '', quantity: 0 }]
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

      const [invRes, vehRes, prodRes, empRes] = await Promise.all([
        fetch(`${INVOICES_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${VEHICLES_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${PRODUCTS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${EMPLOYEES_API}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const invData = await invRes.json();
      const vehData = await vehRes.json();
      const prodData = await prodRes.json();
      const empData = await empRes.json();
      
      if (invData.success) setInvoices(invData.data);
      if (vehData.success) setVehicles(vehData.data);
      if (prodData.success) setProducts(prodData.data);
      if (empData.success) {
          setEmployees(empData.data.filter((e: any) => 
              e.companies?.company_name?.toUpperCase() === activeTenant &&
              (e.user_types?.name === 'marketing' || e.user_types?.name === 'delivery' || e.user_types?.name === 'admin' || e.user_types?.name === 'sales')
          ));
      }

      if (coId) fetchDeliveries(coId);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${DELIVERIES_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setDeliveries(data.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleInvoiceSelect = (invId: string) => {
      const inv = invoices.find(i => i.id === invId);
      if (inv) {
          setFormData({
              ...formData,
              invoice_id: invId,
              order_id: inv.order_id || '',
              items: inv.items.map((i: any) => ({
                  product_id: i.product_id,
                  quantity: i.quantity
              }))
          });
      }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 0 }]
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
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    const newErrors: Record<string, boolean> = {};
    if (!formData.delivery_date) newErrors.delivery_date = true;
    if (!formData.invoice_id) newErrors.invoice_id = true;
    if (!formData.vehicle_id) newErrors.vehicle_id = true;
    if (!formData.delivery_person_id) newErrors.delivery_person_id = true;
    if (!formData.receiver_name) newErrors.receiver_name = true;
    if (!formData.receiver_section) newErrors.receiver_section = true;
    if (!formData.contact_number || !/^[0-9]{10}$/.test(formData.contact_number.replace(/\s/g, ''))) {
        newErrors.contact_number = true;
    }
    if (!formData.delivery_time) newErrors.delivery_time = true;
    if (!formData.dc_no) newErrors.dc_no = true;
    
    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setAlert({ show: true, type: 'error', title: 'Validation Error', message: 'Please fill in all required fields marked below.' });
        return;
    }

    if (formData.items.length === 0 || formData.items.some(i => !i.product_id || i.quantity <= 0)) {
        setAlert({ show: true, type: 'error', title: 'Validation Error', message: 'Please add at least one item with a valid quantity.' });
        return;
    }

    setErrors({});
    try {
      const url = editingId ? `${DELIVERIES_API}/${editingId}` : DELIVERIES_API;
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (result.success) {
        setAlert({ show: true, type: 'success', title: 'Success', message: 'Delivery record saved.' });
        setShowForm(false);
        setEditingId(null);
        setErrors({});
        setFormData({
            invoice_id: '',
            order_id: '',
            vehicle_id: '',
            driver_name: '',
            delivery_date: new Date().toISOString().split('T')[0],
            delivery_person_id: '',
            receiver_name: '',
            receiver_section: '',
            delivery_time: '',
            contact_number: '',
            dc_no: '',
            status: 'OUT_FOR_DELIVERY',
            remarks: '',
            company_id: currentCompanyId,
            items: [{ product_id: '', quantity: 0 }]
        });
        fetchDeliveries();
      } else {
        setAlert({ show: true, type: 'error', title: 'Error', message: result.message });
      }
    } catch (err) {
        setAlert({ show: true, type: 'error', title: 'System Error', message: 'Something went wrong.' });
    }
  };

  const handleEdit = (del: any) => {
    setEditingId(del.id);
    setFormData({
      invoice_id: del.invoice_id || '',
      order_id: del.order_id || '',
      vehicle_id: del.vehicle_id || '',
      driver_name: del.driver_name || '',
      delivery_date: del.delivery_date.split('T')[0],
      delivery_person_id: del.delivery_person_id || '',
      receiver_name: del.receiver_name || '',
      receiver_section: del.receiver_section || '',
      delivery_time: del.delivery_time || '',
      contact_number: del.contact_number || '',
      dc_no: del.dc_no || '',
      status: del.status,
      remarks: del.remarks || '',
      company_id: del.company_id,
      items: del.items.map((i: any) => ({
        product_id: i.product_id,
        quantity: i.quantity
      }))
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    setAlert({
        show: true,
        type: 'confirm',
        title: 'Delete Record?',
        message: 'This will permanently remove the delivery record.',
        onConfirm: async () => {
            const res = await fetch(`${DELIVERIES_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            if (result.success) {
                setAlert({ show: true, type: 'success', title: 'Deleted', message: 'Record removed.' });
                fetchDeliveries();
            }
        }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Standardized Accessible Alert Dialog */}
      <Dialog open={alert.show} onOpenChange={(open) => !open && setAlert({...alert, show: false})}>
          <DialogContent className="max-w-[440px] p-8 text-center sm:rounded-[3rem] border-none shadow-2xl">
              <VisuallyHidden>
                  <DialogDescription>
                      System notification: {alert.title}
                  </DialogDescription>
              </VisuallyHidden>
              
              <div className="flex justify-center mb-6">
                  {alert.type === 'success' && <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-in zoom-in duration-500" />}
                  {alert.type === 'error' && <XCircle className="w-16 h-16 text-rose-500 animate-in zoom-in duration-500" />}
                  {alert.type === 'confirm' && <AlertCircle className="w-16 h-16 text-primary animate-in zoom-in duration-500" />}
              </div>
              
              <DialogTitle className="text-3xl font-black mb-2 tracking-tight">
                  {alert.title}
              </DialogTitle>
              <p className="text-slate-500 font-medium leading-relaxed">
                  {alert.message}
              </p>
              
              <DialogFooter className="mt-10 flex-row justify-center gap-3">
                  {alert.type === 'confirm' ? (
                      <>
                          <Button 
                              variant="outline" 
                              onClick={() => setAlert({...alert, show: false})} 
                              className="flex-1 rounded-full px-6 font-bold border-slate-200"
                          >
                            Cancel
                          </Button>
                          <Button 
                              onClick={() => { alert.onConfirm?.(); setAlert({...alert, show: false}); }} 
                              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold shadow-lg shadow-rose-200"
                          >
                            Confirm Delete
                          </Button>
                      </>
                  ) : (
                      <Button 
                          onClick={() => setAlert({...alert, show: false})} 
                          className="px-12 h-12 rounded-full font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                      >
                        Got it
                      </Button>
                  )}
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-primary/10 mb-6 transition-all">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <Truck className="w-8 h-8 md:w-10 md:h-10 text-primary shrink-0" /> <span>Delivery Details</span>
          </h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-xs md:text-sm font-semibold opacity-80">Streamlined logistics tracking, vehicle assignments, and dispatch management.</p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          {!showForm ? (
            <>
              <Button variant="outline" className="h-10 md:h-11 border-primary/20 text-primary hover:bg-primary/5 shadow-sm font-bold order-2 md:order-1 flex-1 md:flex-none transition-all hover:scale-105 active:scale-95 px-6 rounded-full">
                 <FileText className="w-4 h-4 mr-2" /> Export Logs
              </Button>
              <Button 
                onClick={() => { setEditingId(null); setShowForm(true); }} 
                className="h-10 md:h-11 bg-primary hover:bg-primary/95 text-white shadow-lg transition-all font-bold order-1 md:order-2 px-8 rounded-full flex-1 md:flex-none"
              >
                <Plus className="w-5 h-5 mr-2" /> New Dispatch
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3 w-full md:w-auto">
               <Button 
                  variant="outline" 
                  onClick={() => { setShowForm(false); setEditingId(null); setErrors({}); }} 
                  className="flex-1 md:flex-none border-primary/10 rounded-full h-10 md:h-11 px-6 font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                >
                  <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="flex-[2] md:flex-none bg-primary hover:bg-primary/95 text-white shadow-lg rounded-full h-10 md:h-11 px-10 font-black tracking-wide"
                >
                  <Save className="w-4 h-4 mr-2" /> {editingId ? "Update Record" : "Save Dispatch"}
                </Button>
            </div>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden ring-1 ring-slate-200/50">
            <CardContent className="p-4 md:p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                 <Truck className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Dispatches</p>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{deliveries.length}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-emerald-500/10 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden ring-1 ring-emerald-100">
            <CardContent className="p-4 md:p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                 <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivered Today</p>
                <h3 className="text-2xl md:text-3xl font-black text-emerald-700 leading-none">
                  {deliveries.filter(d => d.status === 'DELIVERED' && new Date(d.delivery_date).toDateString() === new Date().toDateString()).length}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-blue-500/10 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden ring-1 ring-blue-100">
            <CardContent className="p-4 md:p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                 <Package className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Out for Delivery</p>
                <h3 className="text-2xl md:text-3xl font-black text-blue-700 leading-none">
                  {deliveries.filter(d => d.status === 'OUT_FOR_DELIVERY').length}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card className="border-primary/20 shadow-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-6">
            <CardTitle className="text-primary flex items-center gap-2">
              <ClipboardList className="w-5 h-5" /> {editingId ? "Edit Dispatch" : "New Dispatch Entry"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Delivery Date <span className="text-rose-500">*</span></label>
                  <Input 
                    type="date" 
                    className={errors.delivery_date ? "border-rose-400 focus:ring-rose-200" : ""}
                    value={formData.delivery_date} 
                    onChange={e => setFormData({...formData, delivery_date: e.target.value})} 
                  />
                  {errors.delivery_date && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">Delivery Date is required</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Link Invoice <span className="text-rose-500">*</span></label>
                  <select 
                    value={formData.invoice_id} 
                    onChange={e => handleInvoiceSelect(e.target.value)} 
                    className={`w-full flex h-10 rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-colors ${errors.invoice_id ? "border-rose-400 focus:ring-rose-200 ring-2 ring-rose-50" : "border-slate-200"}`}
                  >
                    <option value="">Select Invoice...</option>
                    {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} - {i.customers?.customer_name}</option>)}
                  </select>
                  {errors.invoice_id && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">Please link an invoice</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Select Vehicle <span className="text-rose-500">*</span></label>
                  <select 
                    value={formData.vehicle_id} 
                    onChange={e => setFormData({...formData, vehicle_id: e.target.value})} 
                    className={`w-full flex h-10 rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-colors ${errors.vehicle_id ? "border-rose-400 focus:ring-rose-200 ring-2 ring-rose-50" : "border-slate-200"}`}
                  >
                    <option value="">Choose Vehicle...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} ({v.vehicle_type})</option>)}
                  </select>
                  {errors.vehicle_id && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">Vehicle selection is required</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Delivery Person <span className="text-rose-500">*</span></label>
                  <select 
                    value={formData.delivery_person_id} 
                    onChange={e => setFormData({...formData, delivery_person_id: e.target.value})} 
                    className={`w-full flex h-10 rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-colors ${errors.delivery_person_id ? "border-rose-400 focus:ring-rose-200 ring-2 ring-rose-50" : "border-slate-200"}`}
                  >
                    <option value="">Select Delivery Employee...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  {errors.delivery_person_id && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">Delivery person is required</p>}
                </div>
              </div>

              {formData.invoice_id && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-5">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1 space-y-2">
                        <div className="text-sm font-bold text-blue-900 border-b border-blue-200 pb-2">Invoice Details Overview</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             {(() => {
                                 const selectedInvoice = invoices.find(i => i.id === formData.invoice_id);
                                 if (!selectedInvoice) return null;
                                 return (
                                     <>
                                        <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Customer</span><span className="text-sm font-bold text-blue-900">{selectedInvoice.customers?.customer_name}</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Invoice Date</span><span className="text-sm font-bold text-blue-900">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Order Ref</span><span className="text-sm font-bold text-blue-900">{selectedInvoice.orders?.order_number || 'N/A'}</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Total Value</span><span className="text-sm font-bold text-blue-900">₹ {selectedInvoice.net_amount?.toLocaleString() || '0'}</span></div>
                                     </>
                                 )
                             })()}
                        </div>
                    </div>
                </div>
              )}

              <div className="bg-slate-50/50 border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-3">
                   <User className="w-4 h-4 text-primary" /> Delivery To / Receiver Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Receiver's Name <span className="text-rose-500">*</span></label>
                        <Input 
                            placeholder="Name of recipient" 
                            className={`bg-white ${errors.receiver_name ? "border-rose-400 focus:ring-rose-200" : ""}`}
                            value={formData.receiver_name} 
                            onChange={e => setFormData({...formData, receiver_name: e.target.value})} 
                        />
                        {errors.receiver_name && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">Receiver name is required</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Section / Department <span className="text-rose-500">*</span></label>
                        <Input 
                            placeholder="E.g. Stores, Main Office" 
                            className={`bg-white ${errors.receiver_section ? "border-rose-400 focus:ring-rose-200" : ""}`}
                            value={formData.receiver_section} 
                            onChange={e => setFormData({...formData, receiver_section: e.target.value})} 
                        />
                        {errors.receiver_section && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">Section/Dept is required</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Contact Number <span className="text-rose-500">*</span></label>
                        <Input 
                            type="tel" 
                            placeholder="Phone number" 
                            className={`bg-white ${errors.contact_number ? "border-rose-400 focus:ring-rose-200" : ""}`}
                            value={formData.contact_number} 
                            onChange={e => setFormData({...formData, contact_number: e.target.value})} 
                        />
                        {errors.contact_number && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">Contact number is required</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Time of Delivery <span className="text-rose-500">*</span></label>
                        <Input 
                            type="time" 
                            className={`bg-white ${errors.delivery_time ? "border-rose-400 focus:ring-rose-200" : ""}`}
                            value={formData.delivery_time} 
                            onChange={e => setFormData({...formData, delivery_time: e.target.value})} 
                        />
                        {errors.delivery_time && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">Delivery time is required</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">DC No. (Delivery Challan) <span className="text-rose-500">*</span></label>
                        <Input 
                            placeholder="Enter DC No." 
                            className={`bg-white ${errors.dc_no ? "border-rose-400 focus:ring-rose-200" : ""}`}
                            value={formData.dc_no} 
                            onChange={e => setFormData({...formData, dc_no: e.target.value})} 
                        />
                        {errors.dc_no && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">DC Number is required</p>}
                    </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black uppercase text-slate-500">Items to Dispatch</label>
                </div>
                <div className="bg-slate-50 border rounded-xl overflow-hidden shadow-inner">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left">Product</th>
                                <th className="px-4 py-3 text-center w-40">Quantity to Dispatch</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {formData.items.map((item, index) => (
                                <tr key={index} className="bg-white hover:bg-slate-50">
                                    <td className="p-4">
                                        <select value={item.product_id} onChange={e => handleItemChange(index, 'product_id', e.target.value)} className="w-full bg-transparent border-none focus:ring-0">
                                            <option value="">Select Product...</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.product_name} [{p.product_code}]</option>)}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <Input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="text-center font-bold border-none" />
                                    </td>
                                    <td className="p-4 text-center">
                                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Button type="button" onClick={handleAddItem} variant="ghost" size="sm" className="text-primary hover:bg-primary/5"><Plus className="w-3 h-3 mr-1" /> Add Manual Line Item</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Remarks</label>
                    <Input placeholder="E.g. Route details, loading instructions..." value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                        <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                 </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" className="gap-2 px-10 h-12 text-base font-bold shadow-xl bg-primary hover:bg-primary-hover">
                  <Truck className="w-5 h-5" /> {editingId ? "Update Dispatch" : "Record Dispatch"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Card className="border-border/40 shadow-xl overflow-hidden bg-white">
          <CardHeader className="grid md:flex flex-row items-center justify-between pb-6 border-b border-slate-100 bg-slate-50/30">
            <div>
              <CardTitle className="text-xl text-primary font-black uppercase tracking-tight">Dispatch Logs</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Recent delivery tracking and vehicle assignments.</CardDescription>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                className="pl-9 w-full md:w-72 rounded-full border-slate-200 bg-white" 
                placeholder="Search by DC No, Invoice..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 animate-in fade-in duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Del No</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Date</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Delivery Person</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Receiver</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">DC No</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Status</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-400 font-bold">Loading dispatch records...</td></tr>
                  ) : deliveries.length === 0 ? (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-400 font-bold">No delivery records found.</td></tr>
                  ) : (
                    deliveries
                      .filter(del => 
                        (del.delivery_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (del.dc_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (del.receiver_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((del) => (
                        <tr key={del.id} className="hover:bg-primary/5 transition-all group">
                          <td className="px-6 py-4 font-mono font-black text-primary">{del.delivery_number}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">{new Date(del.delivery_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="px-6 py-4 font-bold text-slate-700">{del.delivery_person?.name || 'Unassigned'}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{del.receiver_name || 'N/A'}</div>
                            <div className="text-[10px] text-slate-400 font-black uppercase">{del.receiver_section}</div>
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-500 bg-slate-50/50">{del.dc_no || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                del.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                                del.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                                {del.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(del)} className="h-8 w-8 text-primary hover:bg-primary/10 border border-slate-100 rounded-full"><Edit2 className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(del.id)} className="h-8 w-8 text-rose-600 hover:bg-rose-50 border border-slate-100 rounded-full"><Trash2 className="w-4 h-4" /></Button>
                             </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
