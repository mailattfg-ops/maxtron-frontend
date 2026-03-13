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

  const fetchCustomers = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${API_URL}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
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

  const saveCustomer = async () => {
    if (!formData.customer_name || !formData.customer_code) {
      error('Customer name and code are required.');
      return;
    }

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
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_code: '',
      gst_no: '',
      credit_period: 0,
      credit_limit: 0,
      delivery_period: '',
      delivery_mode: '',
      opening_balance: 0,
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
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={activeTab === 'basic' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setActiveTab('basic')}
                  className="rounded-full text-[10px] md:text-xs h-8 px-3 md:px-4"
                >Basic</Button>
                <Button 
                  variant={activeTab === 'address' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setActiveTab('address')}
                  className="rounded-full text-[10px] md:text-xs h-8 px-3 md:px-4"
                >Addresses</Button>
                <Button 
                  variant={activeTab === 'financial' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setActiveTab('financial')}
                  className="rounded-full text-[10px] md:text-xs h-8 px-3 md:px-4"
                >Financials</Button>
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
                  <Input name="customer_code" value={formData.customer_code} onChange={handleInputChange} placeholder="UNIQUE-CODE-01" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center"><FileText className="w-4 h-4 mr-2" /> GST No.</label>
                  <Input name="gst_no" value={formData.gst_no} onChange={handleInputChange} placeholder="GSTXXXXXXXXXXXX" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Delivery Period</label>
                  <Input name="delivery_period" value={formData.delivery_period} onChange={handleInputChange} placeholder="e.g. 7-10 Days" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Delivery Mode</label>
                  <Input name="delivery_mode" value={formData.delivery_mode} onChange={handleInputChange} placeholder="e.g. Courier, Hand-delivery" />
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
                  <Input type="number" name="credit_limit" value={formData.credit_limit} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Credit Period (Days)</label>
                  <Input type="number" name="credit_period" value={formData.credit_period} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Opening Balance (₹)</label>
                  <Input type="number" name="opening_balance" value={formData.opening_balance} onChange={handleInputChange} />
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t flex justify-end">
              <Button onClick={saveCustomer} className="bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Customer' : 'Save Customer'}
              </Button>
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
                  <div className="md:hidden mt-2 text-[10px] font-semibold text-slate-500">GST: {c.gst_no || 'NA'}</div>
                </td>
                <td className="hidden md:table-cell px-4 py-4 text-xs font-semibold">{c.gst_no || 'N/A'}</td>
                <td className="px-4 py-4">
                  <span className="md:hidden text-[9px] text-slate-400 block mb-1">CREDIT</span>
                  <div className="text-xs font-bold text-primary">{c.credit_period} Days</div>
                  <div className="hidden md:block text-[10px] text-muted-foreground">Limit: ₹{c.credit_limit?.toLocaleString()}</div>
                </td>
                <td className="hidden lg:table-cell px-4 py-4">
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
