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
  AlertTriangle, XCircle, UserPlus, Phone, Mail, FileText, 
  CreditCard, MapPin, Truck, Copy, Check
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
  const [companyState, setCompanyState] = useState('');
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

  // Create Customer Popup States
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerActiveTab, setCustomerActiveTab] = useState('basic');
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    customer_name: '',
    customer_code: '',
    gst_no: '',
    credit_period: 0,
    credit_limit: 0,
    delivery_period: '',
    delivery_mode: '',
    mobile_no: '',
    email_id: '',
    contact_person: '',
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

  const getNextCustomerCode = () => {
    let nextCode = 'CUST-000001';
    const validCodes = customers
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
    return nextCode;
  };

  const openCustomerModal = () => {
    const nextCode = getNextCustomerCode();
    setCustomerFormData({
      customer_name: '',
      customer_code: nextCode,
      gst_no: '',
      credit_period: 0,
      credit_limit: 0,
      delivery_period: '',
      delivery_mode: '',
      mobile_no: '',
      email_id: '',
      contact_person: '',
      custom_label1: '',
      custom_value1: '',
      custom_label2: '',
      custom_value2: '',
      opening_balance: 0,
      is_active: true,
      company_id: currentCompanyId,
      addresses: [
        { address_type: 'Customer', street: '', city: '', state: '', zip_code: '', country: 'India' },
        { address_type: 'Billing', street: '', city: '', state: '', zip_code: '', country: 'India' }
      ]
    });
    setCustomerActiveTab('basic');
    setShowCustomerModal(true);
  };

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setCustomerFormData({ ...customerFormData, [e.target.name]: value });
  };

  const handleCustomerAddressChange = (index: number, field: string, value: string) => {
    const newAddresses = [...customerFormData.addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setCustomerFormData({ ...customerFormData, addresses: newAddresses });
  };

  const copyBillingToShipping = () => {
    const billing = customerFormData.addresses[0];
    const newAddresses = [...customerFormData.addresses];
    newAddresses[1] = { ...billing, address_type: 'Shipping' };
    setCustomerFormData({ ...customerFormData, addresses: newAddresses });
  };

  const validateCustomerForm = () => {
    if (!customerFormData.customer_name || !customerFormData.customer_code) {
      error('Customer name and code are required.');
      return false;
    }

    if (customerFormData.mobile_no && !/^[0-9]{10,12}$/.test(customerFormData.mobile_no)) {
      error('Invalid mobile number. Please enter 10-12 digits.');
      return false;
    }

    if (customerFormData.email_id && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerFormData.email_id)) {
      error('Invalid email format. Please check again.');
      return false;
    }

    if (customerFormData.contact_person && customerFormData.contact_person.length < 2) {
      error('Contact person name should be at least 2 characters.');
      return false;
    }

    if (customerFormData.delivery_period && !/^[a-zA-Z0-9\s\-\/\.]+$/.test(customerFormData.delivery_period)) {
        error('Delivery Period contains invalid special characters. Use alphanumeric, space, hyphens or slashes.');
        return false;
    }

    if (customerFormData.delivery_mode && !/^[a-zA-Z0-9\s\-\/\.]+$/.test(customerFormData.delivery_mode)) {
        error('Delivery Mode contains invalid characters.');
        return false;
    }

    for (const addr of customerFormData.addresses) {
      if (addr.zip_code && !/^[0-9]{6}$/.test(addr.zip_code)) {
        error(`Invalid Zip code for ${addr.address_type} address. Please enter exactly 6 digits.`);
        return false;
      }
    }

    return true;
  };

  const saveNewCustomer = async () => {
    if (!validateCustomerForm()) return;

    setCustomerSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/api/maxtron/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(customerFormData)
      });
      const data = await res.json();
      if (data.success) {
        success('Customer created successfully!');
        setShowCustomerModal(false);
        // Refresh customer list
        const coId = currentCompanyId;
        const resList = await fetch(`${API_BASE}/api/maxtron/customers?company_id=${coId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataList = await resList.json();
        if (dataList.success) {
          const sorted = (dataList.data || []).sort((a: any, b: any) => 
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
          setCustomers(sorted);
        }
        // Auto-select the newly created customer
        if (data.data?.id) {
          setFormData(prev => ({ ...prev, customer_id: data.data.id }));
        }
      } else {
        error(data.message || 'Something went wrong');
      }
    } catch (err) {
      console.error('Error saving customer:', err);
      error('System error occurred while creating customer.');
    } finally {
      setCustomerSubmitting(false);
    }
  };

  const getGstType = (customerId: string): 'IGST' | 'CGST_SGST' | 'UNKNOWN' => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'UNKNOWN';
    const billingAddr = (customer.addresses || []).find((a: any) => a.address_type?.toLowerCase() === 'billing' || a.address_type?.toLowerCase() === 'customer') || (customer.addresses || [])[0];
    const billingState = billingAddr?.state?.trim().toLowerCase() || '';
    if (!billingState || !companyState) return 'UNKNOWN';
    return billingState !== companyState ? 'IGST' : 'CGST_SGST';
  };

  const [formData, setFormData] = useState({
    customer_id: '',
    executive_id: '',
    order_date: new Date().toISOString().split('T')[0],
    remarks: '',
    company_id: '',
    section_type: 'customer order',
    is_round_off: false,
    round_off: 0,
    items: [
      { product_id: '', quantity: 0, rate: 0, gst_percent: 18, gst_amount: 0, total_value: 0 }
    ],
    transporter_id: '',
    transporter_name: '',
    trans_distance: 0,
    trans_mode: '1',
    vehicle_no: '',
    vehicle_type: 'R',
    trans_doc_no: '',
    trans_doc_date: ''
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
          const companyAddr = (activeCo.addresses || []).find((a: any) => a.address_type === 'registered' || a.address_type === 'billing') || (activeCo.addresses || [])[0];
          if (companyAddr?.state) {
            setCompanyState(companyAddr.state.trim().toLowerCase());
          }
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
      items: [...formData.items, { product_id: '', quantity: 0, rate: 0, gst_percent: 18, gst_amount: 0, total_value: 0 }]
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
    
    // Auto-calculate GST and total value
    if (field === 'quantity' || field === 'rate' || field === 'gst_percent') {
      let qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
      const rate = field === 'rate' ? parseFloat(value) || 0 : item.rate;
      const gstP = field === 'gst_percent' ? parseFloat(value) || 0 : item.gst_percent;
      
      // Force limit if quantity is being changed
      if (field === 'quantity') {
        const prod = products.find(p => p.id === item.product_id);
        if (prod && qty > Number(prod.balance)) {
            qty = Number(prod.balance);
            item.quantity = qty;
            info(`Quantity capped at available stock: ${qty} Kg`);
        }
      }
      
      const taxableValue = qty * rate;
      item.gst_amount = (taxableValue * gstP) / 100;
      item.total_value = taxableValue + item.gst_amount;
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
      section_type: order.section_type || 'customer order',
      is_round_off: !!order.is_round_off,
      round_off: Number(order.round_off || 0),
      items: order.items.map((i: any) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        rate: i.rate,
        gst_percent: i.gst_percent || 0,
        gst_amount: i.gst_amount || 0,
        total_value: i.total_value || (i.quantity * i.rate)
      })),
      transporter_id: order.transporter_id || '',
      transporter_name: order.transporter_name || '',
      trans_distance: Number(order.trans_distance || 0),
      trans_mode: order.trans_mode || '1',
      vehicle_no: order.vehicle_no || '',
      vehicle_type: order.vehicle_type || 'R',
      trans_doc_no: order.trans_doc_no || '',
      trans_doc_date: order.trans_doc_date ? order.trans_doc_date.split('T')[0] : ''
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

  const orderCalculations = useMemo(() => {
    const calcs = formData.items.reduce((acc, item) => {
        const taxable = (item.quantity * item.rate) || 0;
        const gst = item.gst_amount || 0;
        return {
            taxableValue: acc.taxableValue + taxable,
            taxAmount: acc.taxAmount + gst,
            netAmount: acc.netAmount + taxable + gst
        };
    }, { taxableValue: 0, taxAmount: 0, netAmount: 0 });

    if (formData.is_round_off) {
      const rounded = Math.round(calcs.netAmount);
      const diff = rounded - calcs.netAmount;
      return {
        ...calcs,
        netAmount: rounded,
        roundOffDiff: diff
      };
    }
    return {
      ...calcs,
      roundOffDiff: 0
    };
  }, [formData.items, formData.is_round_off]);

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

    // E-Way Bill Validations
    if (orderCalculations.netAmount > 50000) {
      if (!formData.trans_distance || formData.trans_distance <= 0 || formData.trans_distance > 4000) {
        error('Please enter a valid transport distance between 1 and 4000 km.');
        return;
      }
      if (formData.trans_mode === '1') { // Road
        if (!formData.vehicle_no) {
          error('Vehicle number is required for Road transport mode.');
          return;
        }
        const cleanVehicle = formData.vehicle_no.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const vehicleRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{1,3}\d{4}$|^[A-Z]{2}\d{6}$|^BH\d{2}[A-Z]{1,2}\d{4}$/;
        if (!vehicleRegex.test(cleanVehicle)) {
          error('Please enter a valid Indian vehicle registration number (e.g. MH-12-AB-1234 or MH12AB1234).');
          return;
        }
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
          total_value: orderCalculations.taxableValue,
          tax_amount: orderCalculations.taxAmount,
          net_amount: orderCalculations.netAmount,
          round_off: orderCalculations.roundOffDiff
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
            section_type: 'customer order',
            is_round_off: false,
            round_off: 0,
            items: [{ product_id: '', quantity: 0, rate: 0, gst_percent: 18, gst_amount: 0, total_value: 0 }],
            transporter_id: '',
            transporter_name: '',
            trans_distance: 0,
            trans_mode: '1',
            vehicle_no: '',
            vehicle_type: 'R',
            trans_doc_no: '',
            trans_doc_date: ''
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1 text-primary">
                    <Info className="w-3 h-3" /> Section Type
                  </label>
                  <Select value={formData.section_type} onValueChange={(val) => setFormData({...formData, section_type: val})}>
                    <SelectTrigger className="w-full border-primary/20 bg-primary/5 shadow-sm font-bold text-primary">
                      <SelectValue placeholder="Choose Type..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="customer sample">Customer Sample</SelectItem>
                      <SelectItem value="customer order">Customer Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                    <User className="w-3 h-3" /> Select Customer
                  </label>
                  <div className="flex gap-2 items-center min-w-0">
                    <div className="flex-1 min-w-0">
                      <Select value={formData.customer_id} onValueChange={(val) => setFormData({...formData, customer_id: val})}>
                        <SelectTrigger className="w-full border-slate-200 bg-white shadow-sm truncate">
                          <SelectValue placeholder="Choose Customer..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {customers.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.customer_name} ({c.customer_code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      type="button" 
                      onClick={openCustomerModal} 
                      className="px-3 bg-primary text-white hover:bg-primary/95 shrink-0 rounded-md h-10 flex items-center justify-center shadow-sm"
                      title="Create New Customer"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
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
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-24">Quantity</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-28">Rate (₹)</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-24">GST %</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-right w-32">Total (₹)</th>
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
                                            value={item.quantity === 0 ? '' : item.quantity} 
                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                            className="text-center font-bold border-none bg-transparent focus:ring-0 text-xs md:text-sm"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <Input 
                                            type="number" 
                                            min={0}
                                            value={item.rate === 0 ? '' : item.rate} 
                                            onChange={e => handleItemChange(index, 'rate', e.target.value)}
                                            className="text-center font-bold border-none bg-transparent focus:ring-0 text-xs md:text-sm"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="p-4 text-center">
                                        <Input 
                                            type="number" 
                                            min={0}
                                            value={item.gst_percent === 0 ? '' : item.gst_percent} 
                                            onChange={e => handleItemChange(index, 'gst_percent', e.target.value)}
                                            className="text-center font-bold border-none bg-transparent focus:ring-0 text-xs md:text-sm"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="text-xs md:text-sm font-black text-slate-700">₹ {item.total_value.toLocaleString()}</span>
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
                        <tfoot className="bg-primary text-white font-black">
                             <tr>
                                <td colSpan={4} className="px-6 py-3 text-right text-[10px] uppercase tracking-widest text-slate-400">Total Value</td>
                                <td className="p-3 text-right text-sm">₹ {orderCalculations.taxableValue.toLocaleString()}</td>
                                <td></td>
                            </tr>
                            {(() => {
                              const gstType = getGstType(formData.customer_id);
                              if (gstType === 'IGST') {
                                return (
                                  <tr>
                                    <td colSpan={4} className="px-6 py-2.5 text-right text-[10px] uppercase tracking-widest text-amber-300">IGST (100%)</td>
                                    <td className="p-2.5 text-right text-sm">₹ {orderCalculations.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td></td>
                                  </tr>
                                );
                              } else if (gstType === 'CGST_SGST') {
                                return (
                                  <>
                                    <tr>
                                      <td colSpan={4} className="px-6 py-2.5 text-right text-[10px] uppercase tracking-widest text-blue-300">CGST (50%)</td>
                                      <td className="p-2.5 text-right text-sm">₹ {(orderCalculations.taxAmount / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td></td>
                                    </tr>
                                    <tr>
                                      <td colSpan={4} className="px-6 py-2.5 text-right text-[10px] uppercase tracking-widest text-violet-300">SGST (50%)</td>
                                      <td className="p-2.5 text-right text-sm">₹ {(orderCalculations.taxAmount / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td></td>
                                    </tr>
                                  </>
                                );
                              } else {
                                return (
                                  <tr>
                                    <td colSpan={4} className="px-6 py-3 text-right text-[10px] uppercase tracking-widest text-slate-400">Total GST</td>
                                    <td className="p-3 text-right text-sm">₹ {orderCalculations.taxAmount.toLocaleString()}</td>
                                    <td></td>
                                  </tr>
                                );
                              }
                            })()}
                            <tr className="border-t border-white/10">
                                <td colSpan={4} className="px-6 py-3 text-right">
                                    <label className="inline-flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.is_round_off} 
                                            onChange={e => setFormData({ ...formData, is_round_off: e.target.checked })}
                                            className="rounded border-white/20 bg-transparent text-primary focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        Round Off Final Amount
                                    </label>
                                </td>
                                <td className="p-3 text-right text-sm">
                                    ₹ {orderCalculations.roundOffDiff.toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                            <tr className="border-t border-white/20">
                                <td colSpan={4} className="px-6 py-6 text-right uppercase tracking-widest text-xs font-black">
                                    {formData.is_round_off ? "Grand Total (Rounded)" : "Grand Total"}
                                </td>
                                <td className="p-3 text-right text-2xl font-black">₹ {orderCalculations.netAmount.toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
              </div>

              {orderCalculations.netAmount > 50000 && (
                <Card className="border-amber-200 bg-amber-50/10 shadow-sm rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                  <CardHeader className="bg-amber-500/[0.03] border-b border-amber-200/30 py-4 px-6">
                    <CardTitle className="text-sm font-bold text-amber-700 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-500 animate-bounce" />
                      E-Way Bill Generation Required
                    </CardTitle>
                    <CardDescription className="text-xs text-amber-600/80">
                      Grand Total exceeds ₹50,000. Please provide transport and vehicle details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-slate-700">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                          Transporter ID / GSTIN
                        </label>
                        <Input
                          placeholder="e.g. 27AAAAA1111A1Z1"
                          value={formData.transporter_id}
                          onChange={e => setFormData({ ...formData, transporter_id: e.target.value.toUpperCase() })}
                          className="border-slate-200 h-10 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                          Transporter Name
                        </label>
                        <Input
                          placeholder="e.g. Blue Dart Logistics"
                          value={formData.transporter_name}
                          onChange={e => setFormData({ ...formData, transporter_name: e.target.value })}
                          className="border-slate-200 h-10 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                          Distance (in km) *
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={4000}
                          placeholder="e.g. 150"
                          value={formData.trans_distance || ''}
                          onChange={e => setFormData({ ...formData, trans_distance: parseFloat(e.target.value) || 0 })}
                          className="border-slate-200 h-10 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 text-primary">
                          Transport Mode *
                        </label>
                        <Select value={formData.trans_mode} onValueChange={(val) => setFormData({ ...formData, trans_mode: val })}>
                          <SelectTrigger className="w-full border-slate-200 bg-white shadow-sm font-semibold h-10 text-xs">
                            <SelectValue placeholder="Choose Mode..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">
                            <SelectItem value="1">Road</SelectItem>
                            <SelectItem value="2">Rail</SelectItem>
                            <SelectItem value="3">Air</SelectItem>
                            <SelectItem value="4">Ship</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                          Vehicle Number {formData.trans_mode === '1' && '*'}
                        </label>
                        <Input
                          placeholder="e.g. MH-12-AB-1234"
                          value={formData.vehicle_no}
                          onChange={e => setFormData({ ...formData, vehicle_no: e.target.value.toUpperCase() })}
                          className="border-slate-200 font-mono h-10 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 text-primary">
                          Vehicle Type
                        </label>
                        <Select value={formData.vehicle_type} onValueChange={(val) => setFormData({ ...formData, vehicle_type: val })}>
                          <SelectTrigger className="w-full border-slate-200 bg-white shadow-sm font-semibold h-10 text-xs">
                            <SelectValue placeholder="Choose Type..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">
                            <SelectItem value="R">Regular</SelectItem>
                            <SelectItem value="O">Over Dimensional Cargo (ODC)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                          Transport Doc No
                        </label>
                        <Input
                          placeholder="LR No / Consignment No"
                          value={formData.trans_doc_no}
                          onChange={e => setFormData({ ...formData, trans_doc_no: e.target.value })}
                          className="border-slate-200 h-10 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                          Transport Doc Date
                        </label>
                        <Input
                          type="date"
                          value={formData.trans_doc_date}
                          onChange={e => setFormData({ ...formData, trans_doc_date: e.target.value })}
                          className="border-slate-200 h-10 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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
          headers={['Order No', 'Date', 'Type', 'Customer', 'Executive', 'Total Value', 'E-Way Bill', 'Items', 'Actions']}
          data={orders}
          loading={loading}
          searchFields={['order_number', 'customers.customer_name', 'executive.name', 'remarks']}
          renderRow={(o: any) => (
            <tr key={o.id} className="hover:bg-primary/5 border-b last:border-none transition-all group cursor-pointer">
              <td className="px-6 py-4 font-mono font-black text-primary">{o.order_number}</td>
              <td className="px-6 py-4 text-xs font-semibold text-slate-600">{new Date(o.order_date).toLocaleDateString()}</td>
              <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                    o.section_type === 'customer sample' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {o.section_type || 'Standard'}
                  </span>
              </td>
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
                  {Number(o.net_amount) <= 50000 ? (
                      <span className="text-xs text-slate-400 font-semibold italic">Not Req.</span>
                  ) : (
                      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                          {o.ewb_status === 'GENERATED' ? (
                              <>
                                  <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <Check className="w-3 h-3 text-emerald-600 font-bold" />
                                      Generated
                                  </span>
                                  {o.ewb_no && (
                                      <div className="flex items-center gap-1 group/copy select-all">
                                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                              {o.ewb_no}
                                          </span>
                                          <button
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigator.clipboard.writeText(o.ewb_no);
                                                  success('E-Way Bill number copied!');
                                              }}
                                              className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-all"
                                              title="Copy E-Way Bill Number"
                                          >
                                              <Copy className="w-3 h-3" />
                                          </button>
                                      </div>
                                  )}
                                  {o.ewb_valid_till && (
                                      <span className="text-[9px] text-slate-500 font-medium">
                                          Valid till: {new Date(o.ewb_valid_till).toLocaleDateString()}
                                      </span>
                                  )}
                              </>
                          ) : o.ewb_status === 'FAILED' ? (
                              <>
                                  <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200" title={o.ewb_error || 'Generation failed'}>
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      Failed
                                  </span>
                                  {o.ewb_error && (
                                      <span className="text-[9px] text-rose-500 max-w-[150px] truncate block font-medium" title={o.ewb_error}>
                                          {o.ewb_error}
                                      </span>
                                  )}
                              </>
                          ) : (
                              <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Info className="w-3 h-3 text-amber-600 animate-pulse" />
                                  Pending
                              </span>
                          )}
                      </div>
                  )}
              </td>
              <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 border">
                        {o.items?.length || 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Products</span>
                  </div>
              </td>
              <td className="px-1 py-4">
                  <div className="flex items-center justify-end gap-2 transition-opacity">
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

      {/* Create Customer Popup Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" 
                 onClick={() => setShowCustomerModal(false)} />
            
            <Card className="relative w-full max-w-[800px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border-none bg-white rounded-3xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-300 max-h-[90vh] flex flex-col">
                <CardHeader className="bg-primary/5 border-b p-4 md:p-6 space-y-4 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg md:text-xl font-bold text-primary flex items-center gap-2">
                        <UserPlus className="w-5 h-5" /> Register New Customer
                      </CardTitle>
                      <CardDescription className="text-xs">Add a new customer to the database directly from here.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        type="button"
                        variant={customerActiveTab === 'basic' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => {
                          if (!customerFormData.customer_name) {
                            error('Customer name is required before switching tabs.');
                            return;
                          }
                          setCustomerActiveTab('basic');
                        }}
                        className={`rounded-full text-[10px] md:text-xs h-8 px-3 md:px-4 ${customerActiveTab === 'basic' ? 'bg-primary' : 'bg-transparent text-muted-foreground'}`}
                      >1. Basic</Button>
                      <Button 
                        type="button"
                        variant={customerActiveTab === 'address' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => {
                          if (!customerFormData.customer_name) {
                            error('Customer name is required before switching tabs.');
                            return;
                          }
                          setCustomerActiveTab('address');
                        }}
                        className={`rounded-full text-[10px] md:text-xs h-8 px-3 md:px-4 ${customerActiveTab === 'address' ? 'bg-primary' : 'bg-transparent text-muted-foreground'}`}
                      >2. Addresses</Button>
                      <Button 
                        type="button"
                        variant={customerActiveTab === 'financial' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => {
                          if (!customerFormData.customer_name) {
                            error('Customer name is required before switching tabs.');
                            return;
                          }
                          setCustomerActiveTab('financial');
                        }}
                        className={`rounded-full text-[10px] md:text-xs h-8 px-3 md:px-4 ${customerActiveTab === 'financial' ? 'bg-primary' : 'bg-transparent text-muted-foreground'}`}
                      >3. Financials</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 overflow-y-auto flex-1 text-slate-700">
                  {customerActiveTab === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Customer Name *</label>
                        <Input name="customer_name" value={customerFormData.customer_name} onChange={handleCustomerInputChange} placeholder="Legal Company Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Customer Code *</label>
                        <Input 
                          name="customer_code" 
                          value={customerFormData.customer_code} 
                          readOnly
                          className="h-11 font-mono uppercase bg-slate-50 cursor-not-allowed font-bold"
                          placeholder="e.g. CUST-001" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center"><FileText className="w-4 h-4 mr-2" /> GST No.</label>
                        <Input name="gst_no" value={customerFormData.gst_no} onChange={handleCustomerInputChange} placeholder="GSTXXXXXXXXXXXX" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center"><Phone className="w-4 h-4 mr-2" /> Mobile No.</label>
                        <Input name="mobile_no" value={customerFormData.mobile_no} onChange={handleCustomerInputChange} placeholder="+91 XXXXX XXXXX" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center"><Mail className="w-4 h-4 mr-2" /> Email ID</label>
                        <Input name="email_id" value={customerFormData.email_id} onChange={handleCustomerInputChange} placeholder="contact@company.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Contact Person</label>
                        <Input name="contact_person" value={customerFormData.contact_person} onChange={handleCustomerInputChange} placeholder="e.g. John Doe" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Delivery Period</label>
                        <Input name="delivery_period" value={customerFormData.delivery_period} onChange={handleCustomerInputChange} placeholder="e.g. 7-10 Days" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Delivery Mode</label>
                        <Input name="delivery_mode" value={customerFormData.delivery_mode} onChange={handleCustomerInputChange} placeholder="e.g. Courier, Hand-delivery" />
                      </div>

                      {/* Custom Fields Section */}
                      <div className="md:col-span-2 lg:col-span-3 pt-4 border-t border-primary/5">
                        <h3 className="text-sm font-bold text-primary mb-4 flex items-center">
                          Custom Information (Optional)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 transition-all hover:bg-primary/[0.08]">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Field Label 1</label>
                              <Input 
                                name="custom_label1" 
                                value={customerFormData.custom_label1} 
                                onChange={handleCustomerInputChange} 
                                placeholder="e.g. Preferred Contact Time" 
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Field Data 1</label>
                              <Input 
                                name="custom_value1" 
                                value={customerFormData.custom_value1} 
                                onChange={handleCustomerInputChange} 
                                placeholder="e.g. 10 AM - 4 PM" 
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 transition-all hover:bg-primary/[0.08]">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Field Label 2</label>
                              <Input 
                                name="custom_label2" 
                                value={customerFormData.custom_label2} 
                                onChange={handleCustomerInputChange} 
                                placeholder="e.g. Lead Source" 
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Field Data 2</label>
                              <Input 
                                name="custom_value2" 
                                value={customerFormData.custom_value2} 
                                onChange={handleCustomerInputChange} 
                                placeholder="e.g. Website Referral" 
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {customerActiveTab === 'address' && (
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {customerFormData.addresses.map((addr, idx) => (
                          <div key={idx} className="p-4 rounded-xl border border-primary/10 bg-slate-50/50">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-bold text-primary flex items-center">
                                <MapPin className="w-4 h-4 mr-2" /> {addr.address_type} Address
                              </h3>
                              {idx === 1 && (
                                <Button type="button" variant="ghost" size="sm" onClick={copyBillingToShipping} className="text-[10px] h-7 bg-white shadow-sm border">
                                  Same as Customer Address
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-4">
                              <Input placeholder="Street / Area" value={addr.street} onChange={(e) => handleCustomerAddressChange(idx, 'street', e.target.value)} />
                              <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="City" value={addr.city} onChange={(e) => handleCustomerAddressChange(idx, 'city', e.target.value)} />
                                <Input placeholder="State" value={addr.state} onChange={(e) => handleCustomerAddressChange(idx, 'state', e.target.value)} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="Zip Code" value={addr.zip_code} onChange={(e) => handleCustomerAddressChange(idx, 'zip_code', e.target.value)} />
                                <Input placeholder="Country" value={addr.country} onChange={(e) => handleCustomerAddressChange(idx, 'country', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {customerActiveTab === 'financial' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center"><CreditCard className="w-4 h-4 mr-2" /> Credit Limit (₹)</label>
                        <Input type="number" min={0} name="credit_limit" value={customerFormData.credit_limit || ''} onChange={handleCustomerInputChange} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Credit Period (Days)</label>
                        <Input type="number" min={0} name="credit_period" value={customerFormData.credit_period || ''} onChange={handleCustomerInputChange} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Opening Balance (₹)</label>
                        <Input type="number" min={0} name="opening_balance" value={customerFormData.opening_balance || ''} onChange={handleCustomerInputChange} />
                      </div>
                    </div>
                  )}
                </CardContent>
                
                <div className="p-4 md:p-6 border-t flex justify-between items-center bg-slate-50 shrink-0">
                  <div>
                    {customerActiveTab !== 'basic' && (
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => {
                          if (customerActiveTab === 'address') setCustomerActiveTab('basic');
                          if (customerActiveTab === 'financial') setCustomerActiveTab('address');
                        }}
                        className="rounded-full px-6 h-10 font-bold border-primary/20 hover:bg-primary/5 mr-3"
                      >
                        Back
                      </Button>
                    )}
                    <Button 
                      type="button"
                      variant="ghost" 
                      onClick={() => setShowCustomerModal(false)}
                      className="rounded-full px-4 text-slate-400 hover:text-rose-500 font-medium"
                    >
                      Close Modal
                    </Button>
                  </div>

                  <div className="flex gap-3">
                    {customerActiveTab !== 'financial' ? (
                      <Button 
                        type="button"
                        onClick={() => {
                          if (customerActiveTab === 'basic') {
                            if (!validateCustomerForm()) return;
                            setCustomerActiveTab('address');
                          }
                          else if (customerActiveTab === 'address') {
                            for (const addr of customerFormData.addresses) {
                              if (addr.zip_code && !/^[0-9]{6}$/.test(addr.zip_code)) {
                                 return error(`Invalid Zip code for ${addr.address_type}. 6 digits required.`);
                              }
                            }
                            setCustomerActiveTab('financial');
                          }
                        }}
                        className="bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg font-bold"
                      >
                        Next Section
                      </Button>
                    ) : (
                      <Button 
                        type="button"
                        onClick={saveNewCustomer} 
                        loading={customerSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-11 rounded-full shadow-lg font-bold"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Create Customer
                      </Button>
                    )}
                  </div>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
}
