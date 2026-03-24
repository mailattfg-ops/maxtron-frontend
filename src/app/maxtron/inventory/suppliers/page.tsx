'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Building2, Plus, Search, Edit, Trash2, X, Save, 
  MapPin, Phone, Mail, FileCheck, CreditCard, 
  Truck, Package, Wallet, Download, Trash, Globe, Copy
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
import { exportToExcel } from '@/utils/export';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const SUPPLIER_API = `${API_BASE}/api/maxtron/suppliers`;
const STOCK_API = `${API_BASE}/api/maxtron/inventory/stock-summary`;

const defaultAddress = {
    street: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'India'
};

export default function SupplierPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('inv_supplier_view', 'create');
  const canEdit = hasPermission('inv_supplier_view', 'edit');
  const canDelete = hasPermission('inv_supplier_view', 'delete');
  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [gstChecking, setGstChecking] = useState(false);
  const [gstExists, setGstExists] = useState(false);
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
    supplier_code: '',
    supplier_name: '',
    supplier_address: { ...defaultAddress },
    billing_address: { ...defaultAddress },
    gst_no: '',
    credit_period: 0,
    credit_limit: 0,
    product_supplied: '',
    delivery_period: '',
    delivery_mode: '',
    opening_balance: 0,
    company_id: '',
    supplied_materials: [] as string[]
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
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          setCurrentCompanyId(activeCo.id);
          setFormData(prev => ({ ...prev, company_id: activeCo.id }));
          
          fetchSuppliers(activeCo.id);

          const stockRes = await fetch(`${STOCK_API}?company_id=${activeCo.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
          const stockData = await stockRes.json();
          if (stockData.success) {
             setMaterials(stockData.data);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkGstExistence = (gst: string) => {
    if (!gst || gst.trim() === '') {
      setGstExists(false);
      return;
    }
    const exists = suppliers.some(s => 
      s.gst_no?.toLowerCase() === gst.toLowerCase() && s.id !== editingId
    );
    setGstExists(exists);
  };

  const fetchSuppliers = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${SUPPLIER_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const saveSupplier = async () => {
    if (!formData.supplier_name || !formData.supplier_code) {
      error('Name and Code are required.');
      return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${SUPPLIER_API}/${editingId}` : SUPPLIER_API;

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
        success(editingId ? 'Supplier updated!' : 'New supplier registered!');
        setShowForm(false);
        setEditingId(null);
        fetchSuppliers();
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

  const copyOfficialAddress = () => {
    const off = formData.supplier_address;
    if (!off.street && !off.city && !off.state) {
      info('Official address is empty.');
      return;
    }
    setFormData({
      ...formData,
      billing_address: {
        ...formData.billing_address,
        street: off.street,
        city: off.city,
        state: off.state,
        zip_code: off.zip_code,
        country: off.country
      }
    });
    success('Address copied successfully!');
  };

  const resetForm = () => {
    setFormData({
      supplier_code: '',
      supplier_name: '',
      supplier_address: { ...defaultAddress },
      billing_address: { ...defaultAddress },
      gst_no: '',
      credit_period: 0,
      credit_limit: 0,
      product_supplied: '',
      delivery_period: '',
      delivery_mode: '',
      opening_balance: 0,
      supplied_materials: [],
      company_id: currentCompanyId
    });
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setFormData({
      supplier_code: s.supplier_code,
      supplier_name: s.supplier_name,
      supplier_address: s.office_addr_data ? {
          street: s.office_addr_data.street || '',
          city: s.office_addr_data.city || '',
          state: s.office_addr_data.state || '',
          zip_code: s.office_addr_data.zip_code || '',
          country: s.office_addr_data.country || 'India'
      } : { ...defaultAddress },
      billing_address: s.billing_addr_data ? {
          street: s.billing_addr_data.street || '',
          city: s.billing_addr_data.city || '',
          state: s.billing_addr_data.state || '',
          zip_code: s.billing_addr_data.zip_code || '',
          country: s.billing_addr_data.country || 'India'
      } : { ...defaultAddress },
      gst_no: s.gst_no || '',
      credit_period: s.credit_period || 0,
      credit_limit: s.credit_limit || 0,
      product_supplied: s.product_supplied || '',
      delivery_period: s.delivery_period || '',
      delivery_mode: s.delivery_mode || '',
      opening_balance: s.opening_balance || 0,
      supplied_materials: s.supplied_materials ? s.supplied_materials.map((sm: any) => sm.rm_id) : [],
      company_id: s.company_id
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this supplier? This action cannot be undone.',
      type: 'danger'
    });
    if (!isConfirmed) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${SUPPLIER_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Supplier deleted.');
        fetchSuppliers();
      }
    } catch (err) {
      error('Failed to delete supplier.');
    }
  };

  const downloadVendors = async () => {
    if (suppliers.length === 0) return;
    const headers = ['Code', 'Name', 'GST', 'Credit Period', 'Limit', 'Balance', 'Address'];
    const rows = suppliers.map(s => [
        s.supplier_code || '',
        s.supplier_name || '',
        s.gst_no || '',
        Number(s.credit_period || 0),
        Number(s.credit_limit || 0),
        Number(s.opening_balance || 0),
        `${s.office_addr_data?.street || ''}, ${s.office_addr_data?.city || ''}, ${s.office_addr_data?.state || ''}`
    ]);
    
    await exportToExcel({
      headers,
      rows,
      filename: `suppliers_${activeTenant.toLowerCase()}.xlsx`,
      sheetName: 'Suppliers'
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Suppliers</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Manage procurement partners and terms.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <Button onClick={downloadVendors} variant="outline" className="h-10 border-secondary text-secondary hover:bg-secondary/5 rounded-full px-5 shadow-sm font-bold order-2 sm:order-1">
             <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
              className="h-10 md:h-11 bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold order-1 sm:order-2 active:scale-95 transition-all whitespace-nowrap"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Cancel Registration' : 'New Vendor'}
            </Button>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4 md:p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Vendors</p>
                <h3 className="text-xl md:text-2xl font-black text-primary mt-1">{suppliers.length}</h3>
              </div>
              <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4 md:p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">GST Registered</p>
                <h3 className="text-xl md:text-2xl font-black text-emerald-600 mt-1">{suppliers.filter(s => s.gst_no).length}</h3>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-xl shrink-0">
                <FileCheck className="w-5 h-5 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4 md:p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Limit</p>
                <h3 className="text-lg md:text-xl font-black text-blue-600 mt-1">₹ {suppliers.reduce((acc, curr) => acc + Number(curr.credit_limit || 0), 0).toLocaleString()}</h3>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-xl shrink-0">
                <CreditCard className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4 md:p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Opening Exp.</p>
                <h3 className="text-lg md:text-xl font-black text-slate-800 mt-1">₹ {suppliers.reduce((acc, curr) => acc + Number(curr.opening_balance || 0), 0).toLocaleString()}</h3>
              </div>
              <div className="bg-slate-100 p-2.5 rounded-xl shrink-0">
                <Wallet className="w-5 h-5 text-slate-700" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card className="border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl font-bold text-primary flex items-center">
               <Building2 className="w-5 h-5 mr-3 text-secondary" />
               {editingId ? 'Edit Profile' : 'Vendor Onboarding'}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Setup procurement terms and address details.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Supplier Code</label>
                <Input value={formData.supplier_code} onChange={(e) => setFormData({...formData, supplier_code: e.target.value})} className="h-11 font-mono uppercase font-bold" placeholder="e.g. VEN-001" />
              </div>
 
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Supplier Name</label>
                <Input value={formData.supplier_name} onChange={(e) => setFormData({...formData, supplier_name: e.target.value})} className="h-11 font-bold" placeholder="Company Name" />
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                  <span>GST No (optional)</span>
                  {gstExists && <span className="text-rose-500 animate-pulse">Already Exists!</span>}
                </label>
                <Input 
                  value={formData.gst_no} 
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setFormData({...formData, gst_no: val});
                    checkGstExistence(val);
                  }} 
                  className={`h-11 uppercase font-bold transition-all ${gstExists ? 'border-rose-500 bg-rose-50 text-rose-600 focus:ring-rose-200' : 'text-emerald-600 border-slate-200'}`}
                  placeholder="29XXXXX..." 
                />
                {gstExists && <p className="text-[9px] font-bold text-rose-500 mt-1 ml-1 uppercase">This GST number is already registered in the system.</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-10 border-b border-slate-100 pb-10">
              {/* Supplier Address Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-primary border-b border-primary/10 pb-2">
                   <MapPin className="w-4 h-4" />
                   <h3 className="text-sm font-black uppercase tracking-widest">Supplier Official Address</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Street / Landmark</label>
                    <Input value={formData.supplier_address.street} onChange={(e) => setFormData({...formData, supplier_address: {...formData.supplier_address, street: e.target.value}})} placeholder="123 Industrial Area..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">City</label>
                    <Input value={formData.supplier_address.city} onChange={(e) => setFormData({...formData, supplier_address: {...formData.supplier_address, city: e.target.value}})} placeholder="City" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">State</label>
                    <Input value={formData.supplier_address.state} onChange={(e) => setFormData({...formData, supplier_address: {...formData.supplier_address, state: e.target.value}})} placeholder="State" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Zip Code</label>
                    <Input value={formData.supplier_address.zip_code} onChange={(e) => setFormData({...formData, supplier_address: {...formData.supplier_address, zip_code: e.target.value}})} placeholder="XXXXXX" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Country</label>
                    <Input value={formData.supplier_address.country} onChange={(e) => setFormData({...formData, supplier_address: {...formData.supplier_address, country: e.target.value}})} placeholder="Country" />
                  </div>
                </div>
              </div>

              {/* Billing Address Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-2">
                   <div className="flex items-center space-x-2">
                     <FileCheck className="w-4 h-4" />
                     <h3 className="text-sm font-black uppercase tracking-widest">Billing Address (optional)</h3>
                   </div>
                   <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyOfficialAddress}
                    className="h-7 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-full transition-all"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Same as Official
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Street / Landmark</label>
                    <Input value={formData.billing_address.street} onChange={(e) => setFormData({...formData, billing_address: {...formData.billing_address, street: e.target.value}})} placeholder="Same as above or specific..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">City</label>
                    <Input value={formData.billing_address.city} onChange={(e) => setFormData({...formData, billing_address: {...formData.billing_address, city: e.target.value}})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">State</label>
                    <Input value={formData.billing_address.state} onChange={(e) => setFormData({...formData, billing_address: {...formData.billing_address, state: e.target.value}})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Zip Code</label>
                    <Input value={formData.billing_address.zip_code} onChange={(e) => setFormData({...formData, billing_address: {...formData.billing_address, zip_code: e.target.value}})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Country</label>
                    <Input value={formData.billing_address.country} onChange={(e) => setFormData({...formData, billing_address: {...formData.billing_address, country: e.target.value}})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-2 lg:col-span-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Product Category Supplied</label>
                <Input value={formData.product_supplied} onChange={(e) => setFormData({...formData, product_supplied: e.target.value})} className="h-11" placeholder="Resins, Chemicals, etc." />
              </div>
              
              <div className="space-y-2 lg:col-span-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex justify-between">
                  <span>Specific Raw Materials Supplied</span>
                  <span className="text-[10px] text-emerald-600 font-black">{formData.supplied_materials.length} Selected</span>
                </label>
                <div className="border border-slate-200 rounded-md p-3 max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-slate-50">
                  {materials.map(m => (
                    <label key={m.id} className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-white p-1.5 rounded transition-all">
                      <Checkbox 
                        checked={formData.supplied_materials.includes(m.id)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setFormData({...formData, supplied_materials: [...formData.supplied_materials, m.id]});
                          } else {
                            setFormData({...formData, supplied_materials: formData.supplied_materials.filter(id => id !== m.id)});
                          }
                        }}
                      />
                      <span className="truncate">{m.rm_name}</span>
                    </label>
                  ))}
                  {materials.length === 0 && <span className="text-xs text-slate-400 font-bold col-span-full">No active materials in inventory.</span>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Delivery Mode</label>
                <Select value={formData.delivery_mode} onValueChange={(val) => setFormData({...formData, delivery_mode: val})}>
                  <SelectTrigger className="w-full h-11 border border-slate-200 text-sm shadow-sm">
                    <SelectValue placeholder="Select Mode..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Direct Truck">Direct Truck</SelectItem>
                    <SelectItem value="Courier">Courier</SelectItem>
                    <SelectItem value="Self Pickup">Self Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Delivery Period</label>
                <Input value={formData.delivery_period} onChange={(e) => setFormData({...formData, delivery_period: e.target.value})} className="h-11" placeholder="e.g. 2-4 Days" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Credit Period (Days)</label>
                <Input type="number" min="0" value={formData.credit_period} onChange={(e) => setFormData({...formData, credit_period: Math.max(0, Number(e.target.value) || 0)})} className="h-11" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Credit Limit (₹)</label>
                <Input type="number" min="0" value={formData.credit_limit} onChange={(e) => setFormData({...formData, credit_limit: Math.max(0, Number(e.target.value) || 0)})} className="h-11" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Opening Balance (₹)</label>
                <Input type="number" min="0" value={formData.opening_balance} onChange={(e) => setFormData({...formData, opening_balance: Math.max(0, Number(e.target.value) || 0)})} className="h-11" />
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3">
              <Button onClick={() => setShowForm(false)} variant="ghost" className="w-full sm:w-auto px-8 h-11 rounded-full text-muted-foreground font-bold">
                Discard Changes
              </Button>
              <Button 
                onClick={saveSupplier} 
                loading={submitting}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg font-bold flex items-center justify-center transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Profile' : 'Complete Onboarding'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Supplier Database"
          description="Comprehensive directory of vendors with multi-part address tracking."
          headers={['Vendor Identity', 'Office Location', 'Financial Terms', 'Product Line', 'Actions']}
          data={suppliers}
          loading={loading}
          searchFields={['supplier_name', 'supplier_code', 'gst_no']}
          renderRow={(s: any) => (
            <tr key={s.id} className="hover:bg-primary/5 transition-all group border-b border-slate-50 last:border-none">
              <td className="px-6 py-4">
                 <div className="font-black text-slate-800 text-[13px]">
                  {s.supplier_name?.length > 30 ? s.supplier_name.slice(0, 30) + "..." : s.supplier_name}
                 </div>
                 <div className="text-[10px] text-muted-foreground flex items-center font-mono mt-0.5 uppercase tracking-tighter">
                  <Package className="w-2.5 h-2.5 mr-1" /> {s.supplier_code} | GST: {s.gst_no || 'NA'}
                 </div>
              </td>
              <td className="px-6 py-4">
                 <div className="text-[11px] font-bold text-slate-700 flex items-center italic">
                   <MapPin className="w-3 h-3 mr-1 text-primary" /> {s.office_addr_data?.city || 'N/A'}, {s.office_addr_data?.state || ''}
                 </div>
                 <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                   {s.office_addr_data?.street || ''} {s.office_addr_data?.zip_code}
                 </div>
              </td>
              <td className="px-6 py-4">
                 <div className="text-[11px] font-black text-slate-800 tracking-tight">Limit: ₹{Number(s.credit_limit).toLocaleString()}</div>
                 <div className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-widest">{s.credit_period || 0} DAYS CREDIT</div>
              </td>
              <td className="px-6 py-4">
                 <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-black tracking-widest rounded border border-slate-200">
                   {s.product_supplied || 'GENERAL'}
                 </span>
                 {s.supplied_materials && s.supplied_materials.length > 0 && (
                   <div className="mt-2 text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center">
                     <Package className="w-3 h-3 mr-1" />
                     {s.supplied_materials.length} ITEM(S)
                   </div>
                 )}
              </td>
              <td className="md:px-6 py-4 text-right space-x-1">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
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
