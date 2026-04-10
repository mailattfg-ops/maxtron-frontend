'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, Save, Search, Edit, Trash2, Plus, X, Building2, Phone, Mail, FileText, CreditCard, MapPin, CheckCircle2 } from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';
import { useRouter } from 'next/navigation';

const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/customers`;

export default function CustomersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentCompanyId, setCurrentCompanyId] = useState('');

  const [activeTab, setActiveTab] = useState('basic');
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermission();
  const router = useRouter();

  useEffect(() => {
    // Secondary layer check - sidebar already gates this usually
    const canView = hasPermission('sales_customers_view', 'can_view');
  }, [hasPermission]);

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_code: '',
    gst_no: '',
    credit_period: 0,
    credit_limit: 0,
    delivery_period: '',
    delivery_mode: '',
    mobile_no: '',
    email_id: '',
    department: '',
    custom_label1: '',
    custom_value1: '',
    custom_label2: '',
    custom_value2: '',
    opening_balance: 0,
    is_active: true,
    company_id: '',
    addresses: [
      { address_type: 'Customer', street: '', city: '', state: '', zip_code: '', country: 'India' },
      { address_type: 'Billing', street: '', city: '', state: '', zip_code: '', country: 'India' }
    ]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      // Fetch Companies to get current one
      const compRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          setCurrentCompanyId(activeCo.id);
          setFormData(prev => ({ ...prev, company_id: activeCo.id }));
          fetchCustomers(activeCo.id);
        }
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sync code if customers list updates while form is open (and not editing)
    if (showForm && !editingId && customers.length > 0) {
       const currentCode = formData.customer_code;
       if (!currentCode || currentCode === 'CUST-000001' || currentCode === 'GENERATING...') {
          resetForm(customers);
       }
    }
  }, [customers, showForm, editingId]);

  const fetchCustomers = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${API_URL}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Sort by created_at descending
        const sorted = (data.data || []).sort((a: any, b: any) => 
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        setCustomers(sorted);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleAddressChange = (index: number, field: string, value: string) => {
    const newAddresses = [...formData.addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setFormData({ ...formData, addresses: newAddresses });
  };

  const copyBillingToShipping = () => {
    const billing = formData.addresses[0];
    const newAddresses = [...formData.addresses];
    newAddresses[1] = { ...billing, address_type: 'Shipping' };
    setFormData({ ...formData, addresses: newAddresses });
  };

  const validateForm = () => {
    if (!formData.customer_name || !formData.customer_code) {
      error('Customer name and code are required.');
      return false;
    }

    if (formData.mobile_no && !/^[0-9]{10,12}$/.test(formData.mobile_no)) {
      error('Invalid mobile number. Please enter 10-12 digits.');
      return false;
    }

    if (formData.email_id && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_id)) {
      error('Invalid email format. Please check again.');
      return false;
    }

    if (formData.department && formData.department.length < 2) {
      error('Department name should be at least 2 characters.');
      return false;
    }

    if (formData.delivery_period && !/^[a-zA-Z0-9\s\-\/\.]+$/.test(formData.delivery_period)) {
        error('Delivery Period contains invalid special characters. Use alphanumeric, space, hyphens or slashes.');
        return false;
    }

    if (formData.delivery_mode && !/^[a-zA-Z0-9\s\-\/\.]+$/.test(formData.delivery_mode)) {
        error('Delivery Mode contains invalid characters.');
        return false;
    }

    // Zip Code validation for all addresses
    for (const addr of formData.addresses) {
      if (addr.zip_code && !/^[0-9]{6}$/.test(addr.zip_code)) {
        error(`Invalid Zip code for ${addr.address_type} address. Please enter exactly 6 digits.`);
        return false;
      }
    }

    return true;
  };

  const saveCustomer = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/${editingId}` : API_URL;

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
        success(editingId ? 'Customer updated!' : 'Customer created!');
        setShowForm(false);
        setEditingId(null);
        fetchCustomers();
        resetForm();
      } else {
        error(data.message || 'Something went wrong');
      }
    } catch (err) {
      console.error('Error saving customer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = (latestCustomers: any[] = customers) => {
    if (loading && latestCustomers.length === 0) {
        setFormData(prev => ({ ...prev, customer_code: 'GENERATING...' }));
        return;
    }

    let nextCode = 'CUST-000001';
    const validCodes = latestCustomers
      .filter(c => c.customer_code && /^CUST-\d+$/i.test(c.customer_code))
      .map(c => {
        const parts = c.customer_code.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    if (validCodes.length > 0) {
      const max = Math.max(...validCodes);
      nextCode = `CUST-${String(max + 1).padStart(6, '0')}`;
    }

    setFormData({
      customer_name: '',
      customer_code: nextCode,
      gst_no: '',
      credit_period: 0,
      credit_limit: 0,
      delivery_period: '',
      delivery_mode: '',
      opening_balance: 0,
      mobile_no: '',
      email_id: '',
      department: '',
      custom_label1: '',
      custom_value1: '',
      custom_label2: '',
      custom_value2: '',
      is_active: true,
      company_id: currentCompanyId,
      addresses: [
        { address_type: 'Customer', street: '', city: '', state: '', zip_code: '', country: 'India' },
        { address_type: 'Billing', street: '', city: '', state: '', zip_code: '', country: 'India' }
      ]
    });
    setActiveTab('basic');
  };

  const handleEdit = (cust: any) => {
    setEditingId(cust.id);
    setFormData({
      ...cust,
      addresses: (cust.addresses?.length > 0) ? cust.addresses : [
        { address_type: 'Customer', street: '', city: '', state: '', zip_code: '', country: 'India' },
        { address_type: 'Billing', street: '', city: '', state: '', zip_code: '', country: 'India' }
      ]
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this customer? All their associated data will be removed.',
      confirmLabel: 'Delete Customer',
      cancelLabel: 'Keep',
      type: 'danger'
    });
    if (!isConfirmed) return;
    
    const token = localStorage.getItem('token');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Customer records purged!');
        fetchCustomers();
      }
    } catch (err) {
      error('Failed to eliminate customer record.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight flex items-center font-heading">
            <Building2 className="w-6 h-6 md:w-7 md:h-7 mr-2 shrink-0" /> Customer Information
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Manage your {activeTenant} clients and billing details.</p>
        </div>
        {hasPermission('sales_customers_view', 'create') && (
          <Button 
            onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
            className="w-full md:w-auto bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg h-10 md:h-11 font-bold whitespace-nowrap"
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Cancel' : 'Add New Customer'}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-xl animate-in zoom-in duration-300">
          <CardHeader className="bg-primary/5 border-b p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl font-bold text-primary">{editingId ? 'Edit Customer' : 'Create New Customer'}</CardTitle>
                <CardDescription className="text-xs">Enter company details, tax info, and credit terms.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 pointer-events-none">
                <Button 
                  variant={activeTab === 'basic' ? 'default' : 'outline'} 
                  size="sm" 
                  className={`rounded-full text-[10px] md:text-xs h-8 px-3 md:px-4 ${activeTab === 'basic' ? 'bg-primary' : 'bg-transparent text-muted-foreground'}`}
                >1. Basic</Button>
                <Button 
                  variant={activeTab === 'address' ? 'default' : 'outline'} 
                  size="sm" 
                  className={`rounded-full text-[10px] md:text-xs h-8 px-3 md:px-4 ${activeTab === 'address' ? 'bg-primary' : 'bg-transparent text-muted-foreground'}`}
                >2. Addresses</Button>
                <Button 
                  variant={activeTab === 'financial' ? 'default' : 'outline'} 
                  size="sm" 
                  className={`rounded-full text-[10px] md:text-xs h-8 px-3 md:px-4 ${activeTab === 'financial' ? 'bg-primary' : 'bg-transparent text-muted-foreground'}`}
                >3. Financials</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Customer Name *</label>
                  <Input name="customer_name" value={formData.customer_name} onChange={handleInputChange} placeholder="Legal Company Name" />
                </div>
                 <div className="space-y-2">
                  <label className="text-sm font-semibold">Customer Code *</label>
                  <Input 
                    name="customer_code" 
                    value={formData.customer_code} 
                    readOnly
                    className="h-11 font-mono uppercase bg-slate-50 cursor-not-allowed font-bold"
                    placeholder="e.g. CUST-001" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center"><FileText className="w-4 h-4 mr-2" /> GST No.</label>
                  <Input name="gst_no" value={formData.gst_no} onChange={handleInputChange} placeholder="GSTXXXXXXXXXXXX" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center"><Phone className="w-4 h-4 mr-2" /> Mobile No.</label>
                  <Input name="mobile_no" value={formData.mobile_no} onChange={handleInputChange} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center"><Mail className="w-4 h-4 mr-2" /> Email ID</label>
                  <Input name="email_id" value={formData.email_id} onChange={handleInputChange} placeholder="contact@company.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Department</label>
                  <Input name="department" value={formData.department} onChange={handleInputChange} placeholder="e.g. Purchase, Finance" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Delivery Period</label>
                  <Input name="delivery_period" value={formData.delivery_period} onChange={handleInputChange} placeholder="e.g. 7-10 Days" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Delivery Mode</label>
                  <Input name="delivery_mode" value={formData.delivery_mode} onChange={handleInputChange} placeholder="e.g. Courier, Hand-delivery" />
                </div>
                
                {/* Custom Fields Section */}
                <div className="md:col-span-2 lg:col-span-3 pt-4 border-t border-primary/5">
                  <h3 className="text-sm font-bold text-primary mb-4 flex items-center">
                    Custom Information (Optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 transition-all hover:bg-primary/[0.08]">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Field Label 1</label>
                        <Input 
                          name="custom_label1" 
                          value={formData.custom_label1} 
                          onChange={handleInputChange} 
                          placeholder="e.g. Preferred Contact Time" 
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Field Data 1</label>
                        <Input 
                          name="custom_value1" 
                          value={formData.custom_value1} 
                          onChange={handleInputChange} 
                          placeholder="e.g. 10 AM - 4 PM" 
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 transition-all hover:bg-primary/[0.08]">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Field Label 2</label>
                        <Input 
                          name="custom_label2" 
                          value={formData.custom_label2} 
                          onChange={handleInputChange} 
                          placeholder="e.g. Lead Source" 
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Field Data 2</label>
                        <Input 
                          name="custom_value2" 
                          value={formData.custom_value2} 
                          onChange={handleInputChange} 
                          placeholder="e.g. Website Referral" 
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'address' && (
              <div className="space-y-8 animate-in slide-in-from-right duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {formData.addresses.map((addr, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-primary/10 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-primary flex items-center">
                          <MapPin className="w-4 h-4 mr-2" /> {addr.address_type} Address
                        </h3>
                        {idx === 1 && (
                          <Button variant="ghost" size="sm" onClick={copyBillingToShipping} className="text-[10px] h-7 bg-white shadow-sm border">
                            Same as Customer Address
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4">
                        <Input placeholder="Street / Area" value={addr.street} onChange={(e) => handleAddressChange(idx, 'street', e.target.value)} />
                        <div className="grid grid-cols-2 gap-4">
                          <Input placeholder="City" value={addr.city} onChange={(e) => handleAddressChange(idx, 'city', e.target.value)} />
                          <Input placeholder="State" value={addr.state} onChange={(e) => handleAddressChange(idx, 'state', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input placeholder="Zip Code" value={addr.zip_code} onChange={(e) => handleAddressChange(idx, 'zip_code', e.target.value)} />
                          <Input placeholder="Country" value={addr.country} onChange={(e) => handleAddressChange(idx, 'country', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center"><CreditCard className="w-4 h-4 mr-2" /> Credit Limit (₹)</label>
                  <Input type="number" min={0} name="credit_limit" value={formData.credit_limit || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Credit Period (Days)</label>
                  <Input type="number" min={0} name="credit_period" value={formData.credit_period || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Opening Balance (₹)</label>
                  <Input type="number" min={0} name="opening_balance" value={formData.opening_balance || ''} onChange={handleInputChange} />
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t flex justify-between items-center">
              <div>
                {activeTab !== 'basic' && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (activeTab === 'address') setActiveTab('basic');
                      if (activeTab === 'financial') setActiveTab('address');
                    }}
                    className="rounded-full px-6 h-10 font-bold border-primary/20 hover:bg-primary/5 mr-3"
                  >
                    Back
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="rounded-full px-4 text-slate-400 hover:text-rose-500 font-medium"
                >
                  Cancel Entry
                </Button>
              </div>

              <div className="flex gap-3">
                {activeTab !== 'financial' ? (
                  <Button 
                    onClick={() => {
                      if (activeTab === 'basic') {
                        if (!validateForm()) return;
                        setActiveTab('address');
                      }
                      else if (activeTab === 'address') {
                        // Strict Zip check when moving from Address to Financials
                        for (const addr of formData.addresses) {
                          if (addr.zip_code && !/^[0-9]{6}$/.test(addr.zip_code)) {
                             return error(`Invalid Zip code for ${addr.address_type}. 6 digits required.`);
                          }
                        }
                        setActiveTab('financial');
                      }
                    }}
                    className="bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg font-bold"
                  >
                    Next Section
                  </Button>
                ) : (
                  <Button 
                    onClick={saveCustomer} 
                    loading={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-11 rounded-full shadow-lg font-bold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? 'Update Customer' : 'Save Customer Record'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Registered Clients"
          description={`Manage your ${activeTenant} clients and billing details.`}
          headers={['Code', 'Name', 'GST No', 'Credit Terms', 'Logistics', 'Balance', 'Action']}
          data={customers}
          loading={loading}
          searchFields={['customer_name', 'customer_code', 'gst_no']}
          searchPlaceholder="Search customers, codes or GST..."
          renderRow={(c: any) => {
            return (
              <tr key={c.id} className="hover:bg-primary/5 transition-colors group border-b border-primary/5 last:border-0">
                <td className="px-4 py-4 font-mono text-[10px] md:text-xs font-bold text-secondary">
                  <span className="md:hidden text-[9px] text-slate-400 block mb-1">CODE</span>
                  {c.customer_code}
                </td>
                <td className="px-4 py-4">
                  <span className="md:hidden text-[9px] text-slate-400 block mb-1 font-bold">CLIENT NAME</span>
                  <div className="font-bold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">{c.customer_name}</div>
                  <div className="hidden md:flex items-center gap-3 mt-1 text-[10px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                    {c.mobile_no && <span className="flex items-center"><Phone className="w-2.5 h-2.5 mr-1" /> {c.mobile_no}</span>}
                    {c.email_id && <span className="flex items-center"><Mail className="w-2.5 h-2.5 mr-1" /> {c.email_id}</span>}
                  </div>
                  <div className="hidden md:flex flex-wrap gap-2 mt-2">
                    {c.custom_label1 && c.custom_value1 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/5 text-[9px] font-medium text-primary border border-primary/10">
                        <span className="opacity-70 mr-1">{c.custom_label1}:</span> {c.custom_value1}
                      </span>
                    )}
                    {c.custom_label2 && c.custom_value2 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary/5 text-[9px] font-medium text-secondary border border-secondary/10">
                        <span className="opacity-70 mr-1">{c.custom_label2}:</span> {c.custom_value2}
                      </span>
                    )}
                  </div>
                  <div className="md:hidden mt-2 text-[10px] font-semibold text-slate-500">GST: {c.gst_no || 'NA'}</div>
                </td>
                <td className="table-cell px-4 py-4 text-xs font-semibold">{c.gst_no || 'N/A'}</td>
                <td className="px-4 py-4">
                  <span className="md:hidden text-[9px] text-slate-400 block mb-1 font-bold italic text-rose-500">CREDIT</span>
                  {c.credit_period > 0 ? (
                    <div className="text-xs font-bold text-primary">{c.credit_period} Days</div>
                  ) : !c.credit_limit ? (
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Cash Only</div>
                  ) : null}
                  {c.credit_limit > 0 && <div className="hidden md:block text-[10px] text-muted-foreground">Limit: ₹{c.credit_limit?.toLocaleString()}</div>}
                </td>
                <td className="table-cell px-4 py-4">
                  <div className="text-xs font-semibold">{c.delivery_mode || 'N/A'}</div>
                  <div className="text-[10px] text-muted-foreground">Period: {c.delivery_period || 'N/A'}</div>
                </td>
                <td className="px-4 py-4">
                  <span className="md:hidden text-[9px] text-slate-400 block mb-1">BALANCE</span>
                  <span className={`${c.opening_balance > 0 ? 'text-rose-600' : 'text-emerald-600'} font-bold text-xs md:text-sm`}>
                    ₹{c.opening_balance?.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {hasPermission('sales_customers_view', 'edit') && (
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} className="hover:text-primary rounded-full h-8 w-8 shrink-0">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {hasPermission('sales_customers_view', 'delete') && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="hover:text-destructive rounded-full h-8 w-8 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          }}
        />
      )}
    </div>
  );
}
