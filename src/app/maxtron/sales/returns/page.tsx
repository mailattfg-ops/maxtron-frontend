'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  RotateCcw, Plus, Trash2, Save, X, Search, 
  User, Calendar, Package, Info, Edit2, 
  CheckCircle2, XCircle, AlertCircle, FileText
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { TableView } from '@/components/ui/table-view';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const RETURNS_API = `${API_BASE}/api/maxtron/sales/returns`;
const INVOICES_API = `${API_BASE}/api/maxtron/sales/invoices`;
const CUSTOMERS_API = `${API_BASE}/api/maxtron/customers`;
const PRODUCTS_API = `${API_BASE}/api/maxtron/products`;
const EMPLOYEES_API = `${API_BASE}/api/maxtron/employees`;

export default function SalesReturns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
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
    customer_id: '',
    return_date: new Date().toISOString().split('T')[0],
    return_through: 'DIRECT',
    courier_name: '',
    return_employee_id: '',
    reason: '',
    total_return_value: 0,
    company_id: '',
    items: [{ product_id: '', quantity: 0, rate: 0, value: 0 }]
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

      const [invRes, custRes, prodRes, empRes] = await Promise.all([
        fetch(`${INVOICES_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${CUSTOMERS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${PRODUCTS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${EMPLOYEES_API}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const invData = await invRes.json();
      const custData = await custRes.json();
      const prodData = await prodRes.json();
      const empData = await empRes.json();
      
      if (invData.success) setInvoices(invData.data);
      if (custData.success) setCustomers(custData.data);
      if (prodData.success) setProducts(prodData.data);
      if (empData.success) {
          setEmployees(empData.data.filter((e: any) => 
              e.companies?.company_name?.toUpperCase() === activeTenant &&
              (e.user_types?.name === 'marketing' || e.user_types?.name === 'delivery' || e.user_types?.name === 'sales' || e.user_types?.name === 'admin')
          ));
      }

      if (coId) fetchReturns(coId);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${RETURNS_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setReturns(data.data);
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
              customer_id: inv.customer_id,
              items: inv.items.map((i: any) => ({
                  product_id: i.product_id,
                  quantity: i.quantity,
                  rate: i.rate,
                  value: i.amount
              }))
          });
      }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'rate') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
      const rate = field === 'rate' ? parseFloat(value) || 0 : item.rate;
      item.value = qty * rate;
    }

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const totalValue = formData.items.reduce((sum, item) => sum + (item.value || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${RETURNS_API}/${editingId}` : RETURNS_API;
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...formData, total_return_value: totalValue })
      });

      const result = await res.json();
      if (result.success) {
        setAlert({ show: true, type: 'success', title: 'Return Processed', message: 'The sales return has been recorded.' });
        setShowForm(false);
        setEditingId(null);
        setFormData({
            invoice_id: '',
            customer_id: '',
            return_date: new Date().toISOString().split('T')[0],
            return_through: 'DIRECT',
            courier_name: '',
            return_employee_id: '',
            reason: '',
            total_return_value: 0,
            company_id: currentCompanyId,
            items: [{ product_id: '', quantity: 0, rate: 0, value: 0 }]
        });
        fetchReturns();
      } else {
        setAlert({ show: true, type: 'error', title: 'Error', message: result.message });
      }
    } catch (err) {
        setAlert({ show: true, type: 'error', title: 'System Error', message: 'Something went wrong.' });
    }
  };

  const handleEdit = (ret: any) => {
    setEditingId(ret.id);
    setFormData({
      invoice_id: ret.invoice_id || '',
      customer_id: ret.customer_id,
      return_date: ret.return_date.split('T')[0],
      return_through: ret.return_through || 'DIRECT',
      courier_name: ret.courier_name || '',
      return_employee_id: ret.return_employee_id || '',
      reason: ret.reason || '',
      total_return_value: ret.total_return_value || 0,
      company_id: ret.company_id,
      items: ret.items.map((i: any) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        rate: i.rate,
        value: i.value
      }))
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setAlert({
        show: true,
        type: 'confirm',
        title: 'Delete Return?',
        message: 'This will reverse the return entry.',
        onConfirm: async () => {
            const res = await fetch(`${RETURNS_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            if (result.success) {
                setAlert({ show: true, type: 'success', title: 'Deleted', message: 'Record removed.' });
                fetchReturns();
            }
        }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Alert Component logic omitted for brevity, same as Delivery */}
      {alert.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setAlert({...alert, show: false})} />
            <Card className="relative w-full max-w-[440px] shadow-2xl bg-white rounded-3xl p-8 text-center animate-in zoom-in">
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
                            <Button onClick={() => { alert.onConfirm?.(); setAlert({...alert, show: false}); }} className="bg-rose-600">Delete</Button>
                        </>
                    ) : (
                        <Button onClick={() => setAlert({...alert, show: false})} className="px-12">Got it</Button>
                    )}
                </div>
            </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-8 h-8 md:w-10 md:h-10 p-1.5 bg-rose-50 text-rose-500 rounded-lg shrink-0" />
            <span className="truncate">Sales Returns</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Handle product returns, quality issues, and credit notes.</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          className={`h-11 px-6 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none font-bold ${showForm ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200"}`}
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? "Cancel Return" : "Process New Return"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-rose-100 shadow-2xl overflow-hidden">
          <CardHeader className="bg-rose-50 border-b py-6">
            <CardTitle className="text-rose-700 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" /> New Return Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 md:px-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Return Date</label>
                  <Input type="date" value={formData.return_date} onChange={e => setFormData({...formData, return_date: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Link Invoice</label>
                  <Select value={formData.invoice_id} onValueChange={(val) => handleInvoiceSelect(val)}>
                    <SelectTrigger className="w-full h-10 border border-slate-200 text-sm shadow-sm font-medium">
                      <SelectValue placeholder="Manual Entry..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {invoices.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.invoice_number} - {i.customers?.customer_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Return Through</label>
                  <Select 
                    value={formData.return_through} 
                    onValueChange={(val) => setFormData({...formData, return_through: val, return_employee_id: '', courier_name: ''})}
                  >
                    <SelectTrigger className="w-full h-10 border border-slate-200 text-sm shadow-sm font-medium">
                      <SelectValue placeholder="Select Return Mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="DIRECT">Direct (via Marketing/Delivery Employee)</SelectItem>
                      <SelectItem value="COURIER">Courier / Transport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.return_through === 'DIRECT' ? (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Employee Name</label>
                      <Select 
                        value={formData.return_employee_id} 
                        onValueChange={(val) => setFormData({...formData, return_employee_id: val})}
                      >
                        <SelectTrigger className="w-full h-10 border border-slate-200 text-sm shadow-sm font-medium">
                          <SelectValue placeholder="Select Employee..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Courier / Transport Name</label>
                    <Input placeholder="E.g. DTDC, Hand carry..." value={formData.courier_name} onChange={e => setFormData({...formData, courier_name: e.target.value})} />
                  </div>
                )}
                
                <div className="space-y-1.5 md:col-span-4">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Return Remarks (Reason)</label>
                  <Input placeholder="E.g. Damaged during transit, incorrect size..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
                </div>
              </div>

              {formData.invoice_id && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-5">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1 space-y-2">
                        <div className="text-sm font-bold text-blue-900 border-b border-blue-200 pb-2">Original Invoice Details Overview</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             {(() => {
                                 const selectedInvoice = invoices.find(i => i.id === formData.invoice_id);
                                 if (!selectedInvoice) return null;
                                 return (
                                     <>
                                        <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Customer</span><span className="text-sm font-bold text-blue-900">{selectedInvoice.customers?.customer_name}</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Invoice Date</span><span className="text-sm font-bold text-blue-900">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Order Ref</span><span className="text-sm font-bold text-blue-900">{selectedInvoice.orders?.order_number || 'N/A'}</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Billed Total Value</span><span className="text-sm font-bold text-blue-900">₹ {selectedInvoice.net_amount?.toLocaleString() || '0'}</span></div>
                                     </>
                                 )
                             })()}
                        </div>
                    </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black uppercase text-slate-500">Returned Products</label>
                </div>
                <div className="bg-rose-50/30 border border-rose-100 rounded-xl overflow-hidden shadow-inner">
                    <table className="w-full text-sm">
                        <thead className="bg-rose-100/50 border-b border-rose-100">
                            <tr>
                                <th className="px-4 py-3 text-left">Returned Item</th>
                                <th className="px-4 py-3 text-center w-32">Quantity</th>
                                <th className="px-4 py-3 text-center w-32">Rate (₹)</th>
                                <th className="px-4 py-3 text-right w-40">Value (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">
                            {formData.items.map((item, index) => (
                                <tr key={index} className="bg-white hover:bg-rose-50">
                                    <td className="p-4">
                                        <Select 
                                          value={item.product_id} 
                                          onValueChange={(val) => handleItemChange(index, 'product_id', val)}
                                        >
                                          <SelectTrigger className="w-full h-9 border-none bg-transparent hover:bg-slate-50 text-sm">
                                            <SelectValue placeholder="Choose Product..." />
                                          </SelectTrigger>
                                          <SelectContent className="bg-white border-slate-200">
                                            {products.map(p => (
                                              <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="p-4"><Input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="border-none text-center" /></td>
                                    <td className="p-4"><Input type="number" value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className="border-none text-center" /></td>
                                    <td className="p-4 text-right font-black">₹ {(item.value || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>

              <div className="grid gap-4 md:flex justify-between items-center border-t border-rose-100 pt-6">
                 <div className="text-slate-500 font-medium italic">Return will be credited to customer account.</div>
                 <div className="flex items-center gap-8">
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-rose-400 uppercase">Total Return Value</div>
                        <div className="text-2xl font-black text-rose-600">₹ {totalValue.toLocaleString()}</div>
                    </div>
                    <Button type="submit" className="gap-2 px-10 h-12 text-base font-bold shadow-xl bg-rose-600 hover:bg-rose-800">
                        <Save className="w-5 h-5" /> Save Return
                    </Button>
                 </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Return History"
          description="Log of all customer returns and reversals."
          headers={['Return No', 'Req. Date', 'Customer', 'Return Through', 'Total Value', 'Actions']}
          data={returns}
          loading={loading}
          searchFields={['return_number', 'customers.customer_name', 'invoices.invoice_number']}
          renderRow={(ret: any) => (
            <tr key={ret.id} className="hover:bg-rose-50 transition-all border-b last:border-0">
              <td className="px-6 py-4 font-mono font-black text-rose-600">
                <div>{ret.return_number}</div>
                <div className="text-[10px] font-medium text-slate-400">Inv: {ret.invoices?.invoice_number || 'N/A'}</div>
              </td>
              <td className="px-6 py-4 text-xs font-semibold">{new Date(ret.return_date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-bold">{ret.customers?.customer_name}</td>
              <td className="px-6 py-4">
                <div className="text-xs font-bold text-slate-700">{ret.return_through}</div>
                <div className="text-[10px] text-slate-500 uppercase">{ret.return_through === 'DIRECT' ? ret.return_employee?.name || 'Unassigned' : ret.courier_name || 'N/A'}</div>
              </td>
              <td className="px-6 py-4 font-black">₹ {ret.total_return_value?.toLocaleString()}</td>
              <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(ret)} className="h-8 w-8 p-0 text-primary border"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(ret.id)} className="h-8 w-8 p-0 text-rose-600 border"><Trash2 className="w-4 h-4" /></Button>
                  </div>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}
