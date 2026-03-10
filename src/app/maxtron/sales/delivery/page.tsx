'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Truck, Plus, Trash2, Save, X, Search, 
  User, Calendar, Package, Briefcase, 
  Info, Edit2, CheckCircle2, AlertCircle, XCircle,
  FileText, ClipboardList
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const DELIVERIES_API = `${API_BASE}/api/maxtron/sales/deliveries`;
const INVOICES_API = `${API_BASE}/api/maxtron/sales/invoices`;
const VEHICLES_API = `${API_BASE}/api/maxtron/sales/vehicles`;
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
      {/* Alert Component */}
      {alert.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setAlert({...alert, show: false})} />
            <Card className="relative w-full max-w-[440px] shadow-2xl bg-white rounded-3xl overflow-hidden p-8 text-center">
                <div className="flex justify-center mb-6">
                    {alert.type === 'success' && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
                    {alert.type === 'error' && <XCircle className="w-12 h-12 text-rose-500" />}
                    {alert.type === 'confirm' && <AlertCircle className="w-12 h-12 text-primary" />}
                </div>
                <h3 className="text-2xl font-black mb-2">{alert.title}</h3>
                <p className="text-slate-500">{alert.message}</p>
                <div className="mt-8 flex gap-3 justify-center">
                    {alert.type === 'confirm' ? (
                        <>
                            <Button variant="outline" onClick={() => setAlert({...alert, show: false})}>Cancel</Button>
                            <Button onClick={() => { alert.onConfirm?.(); setAlert({...alert, show: false}); }} className="bg-rose-600 hover:bg-rose-700">Delete</Button>
                        </>
                    ) : (
                        <Button onClick={() => setAlert({...alert, show: false})} className="px-10">Got it</Button>
                    )}
                </div>
            </Card>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Truck className="w-10 h-10 text-primary" /> Delivery Details
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Manage dispatches, vehicle assignments, and delivery tracking.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"} className="gap-2 shadow-lg">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel Dispatch" : "New Delivery Dispatch"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-primary flex items-center gap-2">
              <ClipboardList className="w-5 h-5" /> {editingId ? "Edit Dispatch" : "New Dispatch Entry"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Delivery Date</label>
                  <Input type="date" value={formData.delivery_date} onChange={e => setFormData({...formData, delivery_date: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Link Invoice</label>
                  <select value={formData.invoice_id} onChange={e => handleInvoiceSelect(e.target.value)} className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                    <option value="">Select Invoice...</option>
                    {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} - {i.customers?.customer_name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Select Vehicle</label>
                  <select value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})} className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                    <option value="">Choose Vehicle...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} ({v.vehicle_type})</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Delivery Person</label>
                  <select value={formData.delivery_person_id} onChange={e => setFormData({...formData, delivery_person_id: e.target.value})} className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                    <option value="">Select Delivery Employee...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
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
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Receiver's Name</label>
                        <Input placeholder="Name of recipient" value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Section / Department</label>
                        <Input placeholder="E.g. Stores, Main Office" value={formData.receiver_section} onChange={e => setFormData({...formData, receiver_section: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Contact Number</label>
                        <Input placeholder="Phone number" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Time of Delivery</label>
                        <Input type="time" value={formData.delivery_time} onChange={e => setFormData({...formData, delivery_time: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">DC No. (Delivery Challan)</label>
                        <Input placeholder="Enter DC No." value={formData.dc_no} onChange={e => setFormData({...formData, dc_no: e.target.value})} className="bg-white" />
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

      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white/80 backdrop-blur-md">
        <TableView
          title="Dispatch Logs"
          description="Recent delivery tracking and vehicle assignments."
          headers={['Del No', 'Date', 'Delivery Person', 'Receiver', 'DC No', 'Status', 'Actions']}
          data={deliveries}
          loading={loading}
          searchFields={['delivery_number', 'vehicles.registration_number', 'invoices.invoice_number', 'receiver_name', 'dc_no']}
          renderRow={(del: any) => (
            <tr key={del.id} className="hover:bg-primary/5 transition-all group border-b last:border-0">
              <td className="px-6 py-4 font-mono font-black text-primary">{del.delivery_number}</td>
              <td className="px-6 py-4 text-xs font-semibold">{new Date(del.delivery_date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-bold">{del.delivery_person?.name || 'Unassigned'}</td>
              <td className="px-6 py-4">
                <div className="font-bold text-slate-800">{del.receiver_name || 'N/A'}</div>
                <div className="text-[10px] text-slate-400 uppercase">{del.receiver_section}</div>
              </td>
              <td className="px-6 py-4 text-xs italic">{del.dc_no || 'N/A'}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    del.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                    del.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                }`}>
                    {del.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-6 py-4">
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(del)} className="h-8 w-8 p-0 text-primary hover:bg-primary/10 border"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(del.id)} className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 border"><Trash2 className="w-4 h-4" /></Button>
                 </div>
              </td>
            </tr>
          )}
        />
      </Card>
    </div>
  );
}
