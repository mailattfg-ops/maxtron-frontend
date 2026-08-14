'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  FileText, Plus, Trash2, Save, X, Search,
  User, Calendar, DollarSign, Package, Briefcase,
  Info, Edit2, CheckCircle2, AlertCircle, AlertTriangle, XCircle,
  Truck, ArrowRight, Check, Copy, UserPlus, Phone, Mail, MapPin,
  CreditCard, Tag, Layers, Hash, Box, Palette, Ruler, Edit, Printer,
  Download, FileDown, ChevronDown, Loader2
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
import {
  downloadAllInvoiceDocs,
  downloadSingleTaxInvoice,
  downloadSingleEWayBill
} from '@/utils/invoicePdfGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5004';
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
  const [companyState, setCompanyState] = useState('');
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

  // Create Product Popup States
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [activeLineIndexForNewProduct, setActiveLineIndexForNewProduct] = useState<number | null>(null);
  const [productFormData, setProductFormData] = useState({
    product_code: '',
    product_name: '',
    color: 'Natural',
    thickness_microns: 50,
    size: '',
    avg_count_per_kg: 0,
    hsn_code: '392011',
    opening_stock: 0,
    stock_threshold: 0,
    company_id: ''
  });

  // E-Way Bill Transport Details Popup State
  const [showEwbModal, setShowEwbModal] = useState(false);
  const [ewbTargetInvoice, setEwbTargetInvoice] = useState<any>(null);
  const [ewbTransportForm, setEwbTransportForm] = useState({
    vehicle_no: '',
    transporter_id: '',
    transporter_name: '',
    trans_distance: 10,
    trans_mode: '1',
    vehicle_type: 'Regular',
    trans_doc_no: '',
    trans_doc_date: ''
  });

  // View/Print E-Way Bill Modal States
  const [showEwbViewModal, setShowEwbViewModal] = useState(false);
  const [viewEwbInvoice, setViewEwbInvoice] = useState<any>(null);

  const openViewEwbModal = (inv: any) => {
    setViewEwbInvoice(inv);
    setShowEwbViewModal(true);
  };

  // View/Print e-Invoice Modal States
  const [showEInvoiceViewModal, setShowEInvoiceViewModal] = useState(false);
  const [viewEInvoice, setViewEInvoice] = useState<any>(null);

  const openViewEInvoiceModal = (inv: any) => {
    setViewEInvoice(inv);
    setShowEInvoiceViewModal(true);
  };

  // Download States & Handlers
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadDropdownInvId, setDownloadDropdownInvId] = useState<string | null>(null);

  const handleDownloadAllDocs = async (inv: any) => {
    setDownloadingId(inv.id);
    const isEwbGenerated = inv.ewb_status === 'GENERATED' || Boolean(inv.ewb_no && inv.ewb_status !== 'CANCELLED' && inv.ewb_status !== 'FAILED');
    try {
      await downloadAllInvoiceDocs(
        inv,
        activeTenant,
        () => {
          if (isEwbGenerated) {
            success(`Official 5-page PDF document bundle (Invoice + e-Way Bill) for ${inv.invoice_number || 'Invoice'} downloaded!`);
          } else {
            success(`Tax Invoice 4-page bundle for ${inv.invoice_number || 'Invoice'} downloaded (e-Way Bill excluded as it is not generated).`);
          }
        },
        (err) => {
          console.error(err);
          error('Could not generate PDF documents.');
        }
      );
    } catch (err) {
      console.error(err);
      error('Failed to generate PDF document bundle.');
    } finally {
      setDownloadingId(null);
      setDownloadDropdownInvId(null);
    }
  };

  const handleDownloadSingleDoc = async (inv: any, type: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' | 'EXTRA' | 'EWB') => {
    const isEwbGenerated = inv.ewb_status === 'GENERATED' || Boolean(inv.ewb_no && inv.ewb_status !== 'CANCELLED' && inv.ewb_status !== 'FAILED');

    if (type === 'EWB' && !isEwbGenerated) {
      error(`e-Way Bill has not been generated for invoice ${inv.invoice_number || ''}. Please click "Generate EWB" first.`);
      return;
    }

    setDownloadingId(inv.id);
    try {
      if (type === 'EWB') {
        await downloadSingleEWayBill(inv, activeTenant);
        success(`e-Way Bill document for ${inv.invoice_number || ''} downloaded.`);
      } else {
        const copyLabel = type === 'ORIGINAL' ? '(ORIGINAL FOR RECIPIENT)' :
          type === 'DUPLICATE' ? '(DUPLICATE FOR TRANSPORTER)' :
            type === 'TRIPLICATE' ? '(TRIPLICATE FOR SUPPLIER)' : '(EXTRA COPY)';
        await downloadSingleTaxInvoice(inv, activeTenant, copyLabel);
        success(`Tax Invoice ${copyLabel} downloaded.`);
      }
    } catch (err) {
      console.error(err);
      error('Error generating document.');
    } finally {
      setDownloadingId(null);
      setDownloadDropdownInvId(null);
    }
  };

  const [formData, setFormData] = useState({
    invoice_number: '',
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
    transporter_id: '',
    transporter_name: '',
    trans_distance: 0,
    trans_mode: '1',
    vehicle_no: '',
    vehicle_type: 'Regular',
    trans_doc_no: '',
    trans_doc_date: '',
    items: [
      { product_id: '', quantity: 0, rate: 0, gst_percent: 18, gst_amount: 0, amount: 0 }
    ]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchNextInvoiceNumber = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${INVOICES_API}/next-number?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.invoice_number) {
        setFormData(prev => ({ ...prev, invoice_number: data.invoice_number }));
      }
    } catch (err) {
      console.error('Error fetching next invoice number:', err);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!compRes.ok) {
        throw new Error(`Failed to fetch companies: Status ${compRes.status}`);
      }

      const compContentType = compRes.headers.get("content-type") || "";
      if (!compContentType.includes("application/json")) {
        const text = await compRes.text();
        throw new Error(`Expected JSON from companies API, but got: ${text.substring(0, 200)}`);
      }
      const compData = await compRes.json();

      let coId = '';
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
          setFormData(prev => ({ ...prev, company_id: coId }));
          fetchNextInvoiceNumber(coId);
          const companyAddr = (activeCo.addresses || []).find((a: any) => a.address_type === 'registered' || a.address_type === 'billing') || (activeCo.addresses || [])[0];
          if (companyAddr?.state) {
            setCompanyState(companyAddr.state.trim().toLowerCase());
          }
        }
      }

      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
          if (!res.ok) return { success: false, data: [] };
          const contentType = res.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) return { success: false, data: [] };
          return await res.json();
        } catch (err) {
          console.warn(`Fetch error for ${url}:`, err);
          return { success: false, data: [] };
        }
      };

      const [custData, prodData, empData, orderData] = await Promise.all([
        safeFetch(`${CUSTOMERS_API}?company_id=${coId}`),
        safeFetch(`${PRODUCTS_API}?company_id=${coId}`),
        safeFetch(`${EMPLOYEES_API}`),
        safeFetch(`${ORDERS_API}?company_id=${coId}`)
      ]);

      if (custData.success) setCustomers(custData.data || []);
      if (prodData.success) setProducts(prodData.data || []);
      if (orderData.success) setOrders(orderData.data || []);
      if (empData.success && Array.isArray(empData.data)) {
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

  const getGstType = (customerId: string): 'IGST' | 'CGST_SGST' | 'UNKNOWN' => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'UNKNOWN';
    const billingAddr = (customer.addresses || []).find((a: any) => a.address_type?.toLowerCase() === 'billing' || a.address_type?.toLowerCase() === 'customer') || (customer.addresses || [])[0];
    const billingState = billingAddr?.state?.trim().toLowerCase() || '';
    if (!billingState || !companyState) return 'UNKNOWN';
    return billingState !== companyState ? 'IGST' : 'CGST_SGST';
  };

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
    for (const addr of customerFormData.addresses) {
      if (addr.zip_code && !/^[0-9]{6}$/.test(addr.zip_code)) {
        error(`Invalid Zip code for ${addr.address_type} address. 6 digits required.`);
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
      const res = await fetch(CUSTOMERS_API, {
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
        const coId = currentCompanyId;
        const resList = await fetch(`${CUSTOMERS_API}?company_id=${coId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataList = await resList.json();
        if (dataList.success) {
          setCustomers(dataList.data || []);
        }
        if (data.data?.id) {
          const autoType = data.data.gst_no ? 'B2B' : 'B2C';
          setFormData(prev => ({ ...prev, customer_id: data.data.id, invoice_type: autoType }));
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

  const getNextProductCode = () => {
    let nextCode = 'FP-000001';
    const validCodes = products
      .filter(p => p.product_code && /^FP-\d+$/i.test(p.product_code))
      .map(p => {
        const parts = p.product_code.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    if (validCodes.length > 0) {
      const max = Math.max(...validCodes);
      nextCode = `FP-${String(max + 1).padStart(6, '0')}`;
    }
    return nextCode;
  };

  const openProductModal = (lineIndex?: number) => {
    setActiveLineIndexForNewProduct(lineIndex !== undefined ? lineIndex : null);
    const nextCode = getNextProductCode();
    setProductFormData({
      product_code: nextCode,
      product_name: '',
      color: 'Natural',
      thickness_microns: 50,
      size: '',
      avg_count_per_kg: 0,
      hsn_code: '392011',
      opening_stock: 0,
      stock_threshold: 0,
      company_id: currentCompanyId
    });
    setShowProductModal(true);
  };

  const saveNewProduct = async () => {
    if (!productFormData.product_name.trim()) {
      error('Product name is required.');
      return;
    }
    if (!productFormData.hsn_code.trim()) {
      error('HSN Code is required.');
      return;
    }

    setProductSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(PRODUCTS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...productFormData,
          company_id: currentCompanyId
        })
      });
      const data = await res.json();
      if (data.success) {
        success('Product created successfully!');
        setShowProductModal(false);
        const coId = currentCompanyId;
        const resList = await fetch(`${PRODUCTS_API}?company_id=${coId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataList = await resList.json();
        if (dataList.success) {
          setProducts(dataList.data || []);
        }
        const createdProdId = data.data?.id;
        if (createdProdId) {
          if (activeLineIndexForNewProduct !== null && activeLineIndexForNewProduct < formData.items.length) {
            handleItemChange(activeLineIndexForNewProduct, 'product_id', createdProdId);
          } else {
            setFormData(prev => ({
              ...prev,
              items: [...prev.items, { product_id: createdProdId, quantity: 0, rate: 0, gst_percent: 18, gst_amount: 0, amount: 0 }]
            }));
          }
        }
      } else {
        error(data.message || 'Failed to create product.');
      }
    } catch (err) {
      console.error('Error saving product:', err);
      error('System error while creating product.');
    } finally {
      setProductSubmitting(false);
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
        items: order.items.map((i: any) => {
          const qty = i.quantity || 0;
          const rate = i.rate || 0;
          const gstP = i.gst_percent || 18;
          const taxable = qty * rate;
          const gstAmt = i.gst_amount || ((taxable * gstP) / 100);
          return {
            product_id: i.product_id,
            quantity: qty,
            rate: rate,
            gst_percent: gstP,
            gst_amount: gstAmt,
            amount: taxable + gstAmt
          };
        })
      });
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 0, rate: 0, gst_percent: 18, gst_amount: 0, amount: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length === 1) return;
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    const totalGst = newItems.reduce((sum, i) => sum + (i.gst_amount || 0), 0);
    setFormData({ ...formData, items: newItems, tax_amount: totalGst });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };

    const qty = field === 'quantity' ? Math.max(0, parseFloat(value) || 0) : (item.quantity || 0);
    const rate = field === 'rate' ? Math.max(0, parseFloat(value) || 0) : (item.rate || 0);
    const gstP = field === 'gst_percent' ? Math.max(0, parseFloat(value) || 0) : (item.gst_percent !== undefined ? item.gst_percent : 18);

    const taxableValue = qty * rate;
    const gstAmount = (taxableValue * gstP) / 100;
    const lineTotal = taxableValue + gstAmount;

    item.quantity = qty;
    item.rate = rate;
    item.gst_percent = gstP;
    item.gst_amount = gstAmount;
    item.amount = lineTotal;

    newItems[index] = item;

    const totalGst = newItems.reduce((sum, i) => sum + (i.gst_amount || 0), 0);
    setFormData({ ...formData, items: newItems, tax_amount: totalGst });
  };

  const totals = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0);
    const calculatedTax = formData.items.reduce((sum, item) => sum + (item.gst_amount || 0), 0);
    const tax = formData.tax_amount !== undefined && formData.tax_amount !== null ? formData.tax_amount : calculatedTax;
    const discount = formData.discount_amount || 0;
    const netBeforeRound = subtotal + tax - discount;
    const net = roundOff ? Math.round(netBeforeRound) : netBeforeRound;
    const roundoffAmount = roundOff ? (net - netBeforeRound) : 0;
    return { subtotal, tax, discount, net, roundoffAmount, calculatedTax };
  }, [formData.items, formData.tax_amount, formData.discount_amount, roundOff]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === formData.customer_id);
  }, [customers, formData.customer_id]);

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
          scheduled_delivery_date: formData.scheduled_delivery_date && formData.scheduled_delivery_date.trim() !== '' ? formData.scheduled_delivery_date : null,
          transporter_id: formData.transporter_id && formData.transporter_id.trim() !== '' ? formData.transporter_id : null,
          transporter_name: formData.transporter_name && formData.transporter_name.trim() !== '' ? formData.transporter_name : null,
          vehicle_no: formData.vehicle_no && formData.vehicle_no.trim() !== '' ? formData.vehicle_no : null,
          trans_doc_no: formData.trans_doc_no && formData.trans_doc_no.trim() !== '' ? formData.trans_doc_no : null,
          trans_doc_date: formData.trans_doc_date && formData.trans_doc_date.trim() !== '' ? formData.trans_doc_date : null,
          remarks: formData.remarks && formData.remarks.trim() !== '' ? formData.remarks : null,
          total_amount: totals.subtotal,
          tax_amount: totals.tax,
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
          invoice_number: '',
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
          transporter_id: '',
          transporter_name: '',
          trans_distance: 0,
          trans_mode: '1',
          vehicle_no: '',
          vehicle_type: 'Regular',
          trans_doc_no: '',
          trans_doc_date: '',
          items: [{ product_id: '', quantity: 0, rate: 0, gst_percent: 18, gst_amount: 0, amount: 0 }]
        });
        setRoundOff(false);
        fetchNextInvoiceNumber(currentCompanyId);
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
      invoice_number: inv.invoice_number || '',
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
      transporter_id: inv.transporter_id || '',
      transporter_name: inv.transporter_name || '',
      trans_distance: Number(inv.trans_distance) || 0,
      trans_mode: inv.trans_mode || '1',
      vehicle_no: inv.vehicle_no || '',
      vehicle_type: inv.vehicle_type || 'Regular',
      trans_doc_no: inv.trans_doc_no || '',
      trans_doc_date: inv.trans_doc_date ? inv.trans_doc_date.split('T')[0] : '',
      items: inv.items.map((i: any) => {
        const qty = Number(i.quantity) || 0;
        const rate = Number(i.rate) || 0;
        const gstP = Number(i.gst_percent) || 18;
        const taxable = qty * rate;
        const gstAmt = Number(i.gst_amount) || ((taxable * gstP) / 100);
        return {
          product_id: i.product_id,
          quantity: qty,
          rate: rate,
          gst_percent: gstP,
          gst_amount: gstAmt,
          amount: Number(i.amount) || (taxable + gstAmt)
        };
      })
    });
    const subtotal = inv.items?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.rate || 0)), 0) || 0;
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
      if (result.success && result.data?.einvoice_status === 'GENERATED') {
        setAlert({
          show: true,
          type: 'success',
          title: 'E-Invoice Generated',
          message: `IRN successfully registered. Ack No: ${result.data?.einvoice_ack_no || 'N/A'}`
        });
        fetchInvoices();
      } else {
        const errMsg = result.data?.einvoice_error || result.message || 'Could not generate E-Invoice.';
        setAlert({
          show: true,
          type: 'error',
          title: 'E-Invoice Failed',
          message: errMsg
        });
        fetchInvoices();
      }
    } catch (err) {
      setAlert({ show: true, type: 'error', title: 'System Error', message: 'Could not connect to server.' });
    } finally {
      setLoading(false);
    }
  };

  const openEwbModal = (inv: any) => {
    setEwbTargetInvoice(inv);
    setEwbTransportForm({
      vehicle_no: inv.vehicle_no || '',
      transporter_id: inv.transporter_id || '',
      transporter_name: inv.transporter_name || '',
      trans_distance: Number(inv.trans_distance) || 10,
      trans_mode: inv.trans_mode || '1',
      vehicle_type: inv.vehicle_type || 'Regular',
      trans_doc_no: inv.trans_doc_no || '',
      trans_doc_date: inv.trans_doc_date ? inv.trans_doc_date.split('T')[0] : ''
    });
    setShowEwbModal(true);
  };

  const handleGenerateEwbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ewbTargetInvoice) return;
    if (ewbTransportForm.trans_mode === '1' && !ewbTransportForm.vehicle_no.trim()) {
      setAlert({ show: true, type: 'error', title: 'Vehicle Number Required', message: 'Please enter a vehicle number for Road transport.' });
      return;
    }

    try {
      setLoading(true);
      setShowEwbModal(false);
      const res = await fetch(`${INVOICES_API}/${ewbTargetInvoice.id}/ewaybill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(ewbTransportForm)
      });
      const result = await res.json();
      if (result.success && result.data?.ewb_status === 'GENERATED') {
        setAlert({
          show: true,
          type: 'success',
          title: 'E-Way Bill Generated',
          message: `EWB successfully registered: ${result.data?.ewb_no || 'N/A'}`
        });
        fetchInvoices();
      } else {
        const errMsg = result.data?.ewb_error || result.message || 'Could not generate E-Way Bill.';
        setAlert({
          show: true,
          type: 'error',
          title: 'E-Way Bill Failed',
          message: errMsg
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
          cancel_reason: cancelReasonCode,
          cancel_remarks: cancelRemarks
        })
      });
      const result = await res.json();
      if (result.success) {
        setAlert({
          show: true,
          type: 'success',
          title: `${cancelTarget.type === 'EINVOICE' ? 'E-Invoice' : 'E-Way Bill'} Cancelled`,
          message: 'Cancellation completed successfully.'
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
          message: result.message || 'Could not cancel document.'
        });
      }
    } catch (err) {
      setAlert({ show: true, type: 'error', title: 'System Error', message: 'Could not connect to server.' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-w-0">
      {/* Alert Dialog */}
      {alert.show && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <Card className="w-full max-w-md bg-white border-none shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95">
            <CardContent className="p-8 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${alert.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                alert.type === 'error' ? 'bg-rose-100 text-rose-600' :
                  alert.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'
                }`}>
                {alert.type === 'success' && <CheckCircle2 className="w-8 h-8" />}
                {alert.type === 'error' && <XCircle className="w-8 h-8" />}
                {alert.type === 'warning' && <AlertTriangle className="w-8 h-8" />}
                {alert.type === 'confirm' && <AlertCircle className="w-8 h-8" />}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">{alert.title}</h3>
              <p className="text-slate-500 font-medium">{alert.message}</p>
              <div className="mt-10 flex gap-3 justify-center">
                {alert.type === 'confirm' ? (
                  <>
                    <Button variant="outline" onClick={() => setAlert({ ...alert, show: false })} className="rounded-2xl px-8 h-12 border-slate-200 font-bold">Cancel</Button>
                    <Button onClick={() => { alert.onConfirm?.(); setAlert({ ...alert, show: false }); }} className="rounded-2xl px-10 h-12 bg-primary hover:bg-primary/90 font-black shadow-lg shadow-primary/20">Yes, Delete</Button>
                  </>
                ) : (
                  <Button onClick={() => setAlert({ ...alert, show: false })} className="rounded-2xl px-12 h-12 font-black shadow-lg">Got it</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-8 h-8 md:w-10 md:h-10 p-1.5 bg-primary/10 text-primary rounded-lg shrink-0" />
            <span className="truncate">Sales / Invoice Entry</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Generate tax invoices and link to customer orders.</p>
        </div>
        <Button
          onClick={() => {
            if (!showForm) {
              setEditingId(null);
              setFormData({
                invoice_number: '',
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
                transporter_id: '',
                transporter_name: '',
                trans_distance: 0,
                trans_mode: '1',
                vehicle_no: '',
                vehicle_type: 'Regular',
                trans_doc_no: '',
                trans_doc_date: '',
                items: [{ product_id: '', quantity: 0, rate: 0, gst_percent: 18, gst_amount: 0, amount: 0 }]
              });
              fetchNextInvoiceNumber(currentCompanyId);
              setShowForm(true);
            } else {
              setShowForm(false);
              setEditingId(null);
            }
          }}
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
                {/* Row 1: Inv No, Date of Sale, Link Order, Customer */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                      <FileText className="w-3 h-3 text-primary" /> Inv No
                    </label>
                    <Input
                      type="text"
                      value={formData.invoice_number}
                      onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="e.g. MP001"
                      className="font-mono font-black text-primary border-slate-200 bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                      <Calendar className="w-3 h-3" /> Date of Sale
                    </label>
                    <Input type="date" value={formData.invoice_date} onChange={e => setFormData({ ...formData, invoice_date: e.target.value })} />
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
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                        <User className="w-3 h-3" /> Customer
                      </label>
                      <button
                        type="button"
                        onClick={openCustomerModal}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" /> + New Customer
                      </button>
                    </div>
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
                    <Select value={formData.invoice_type || "B2B"} onValueChange={val => setFormData({ ...formData, invoice_type: val })}>
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

              {/* Customer GST Banner */}
              {selectedCustomer && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Info className="w-6 h-6 text-primary shrink-0" />
                    <div>
                      <div className="text-sm font-black text-slate-900">{selectedCustomer.customer_name} ({selectedCustomer.customer_code})</div>
                      <div className="text-xs text-slate-500 font-medium">GST No: <span className="font-bold text-slate-700">{selectedCustomer.gst_no || 'N/A'}</span></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold shadow-sm">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Credit Limit</span>
                      ₹ {(selectedCustomer.credit_limit || 0).toLocaleString()}
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border ${getGstType(selectedCustomer.id) === 'IGST'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}>
                      <span className="text-[10px] uppercase font-bold opacity-70 block">Tax Method</span>
                      {getGstType(selectedCustomer.id) === 'IGST' ? 'Inter-State (IGST 18%)' : 'Intra-State (CGST 9% + SGST 9%)'}
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items */}
              <div className="space-y-4 w-full max-w-full min-w-0">
                <div className="flex flex-wrap justify-between items-center px-1 gap-2">
                  <label className="text-xs font-black uppercase text-slate-500 border-l-4 border-primary pl-3">Line Items</label>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => openProductModal()} size="sm" variant="outline" className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/5 font-bold">
                      <Plus className="w-3 h-3 mr-1" /> New Product
                    </Button>
                    <Button type="button" onClick={handleAddItem} size="sm" className="bg-primary/10 text-primary hover:bg-primary/20 h-8 text-xs font-bold">
                      <Plus className="w-3 h-3 mr-1" /> Add Row
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto text-sm w-full max-w-full">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-slate-100/80 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-left">Select Product</th>
                        <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-28">HSN Code</th>
                        <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-28">Quantity</th>
                        <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-28">Rate (₹)</th>
                        <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center w-28">GST (%)</th>
                        <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-right w-32">GST Amount (₹)</th>
                        <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-right w-36">Total Amount (₹)</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {formData.items.map((item, index) => {
                        const prod = products.find(p => p.id === item.product_id);
                        return (
                          <tr key={index} className="bg-white hover:bg-slate-50 group">
                            <td className="p-4">
                              <Select
                                value={item.product_id || ""}
                                onValueChange={val => {
                                  if (val === 'CREATE_NEW') {
                                    openProductModal(index);
                                  } else {
                                    handleItemChange(index, 'product_id', val);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full h-9 font-bold bg-transparent border-none text-sm shadow-none focus:ring-0">
                                  <SelectValue placeholder="Select Product..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white z-[1000] max-h-60 overflow-y-auto">
                                  <SelectItem value="CREATE_NEW" className="text-primary font-bold bg-primary/5 hover:bg-primary/10">
                                    + Create New Product
                                  </SelectItem>
                                  {products.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.product_code} - {p.product_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-4 text-center font-mono text-xs font-bold text-slate-600">
                              {prod?.hsn_code || '-'}
                            </td>
                             <td className="p-4">
                              <Input type="number" min="0" step="any" placeholder="0" value={item.quantity === 0 ? '' : item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="text-center font-bold border-slate-200 text-xs md:text-sm h-8" />
                            </td>
                            <td className="p-4">
                              <Input type="number" min="0" step="any" placeholder="₹ 0" value={item.rate === 0 ? '' : item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className="text-center font-bold border-slate-200 text-xs md:text-sm h-8" />
                            </td>
                            <td className="p-4">
                              <Select value={String(item.gst_percent !== undefined ? item.gst_percent : 18)} onValueChange={val => handleItemChange(index, 'gst_percent', val)}>
                                <SelectTrigger className="h-8 font-bold border-slate-200 text-xs text-center">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white z-[1000]">
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="5">5%</SelectItem>
                                  <SelectItem value="12">12%</SelectItem>
                                  <SelectItem value="18">18%</SelectItem>
                                  <SelectItem value="28">28%</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-slate-600 text-xs md:text-sm">
                              ₹ {(item.gst_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-right font-mono font-black text-slate-900 text-xs md:text-sm">
                              ₹ {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-center">
                              <button type="button" onClick={() => handleRemoveItem(index)} className="text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Scheduled Delivery Date</label>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Optional</span>
                        </div>
                        <Input type="date" value={formData.scheduled_delivery_date} onChange={e => setFormData({ ...formData, scheduled_delivery_date: e.target.value })} className="border-slate-200" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vehicle Number (EWB)</label>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Optional</span>
                        </div>
                        <Input placeholder="e.g. KL09AB1234 (Optional)" value={formData.vehicle_no} onChange={e => setFormData({ ...formData, vehicle_no: e.target.value.toUpperCase() })} className="border-slate-200 font-mono font-bold uppercase" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transporter Name</label>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Optional</span>
                        </div>
                        <Input placeholder="e.g. VRL Logistics (Optional)" value={formData.transporter_name} onChange={e => setFormData({ ...formData, transporter_name: e.target.value })} className="border-slate-200" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Distance (Km)</label>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Optional</span>
                        </div>
                        <Input type="number" min="0" placeholder="e.g. 25 km (Optional)" value={formData.trans_distance || ''} onChange={e => setFormData({ ...formData, trans_distance: parseFloat(e.target.value) || 0 })} className="border-slate-200 font-bold" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Remarks</label>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Optional</span>
                      </div>
                      <Input placeholder="Invoice notes (optional)..." value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} className="italic" />
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex justify-between text-sm font-medium text-slate-500">
                      <span>Subtotal (Taxable)</span>
                      <span className="font-mono font-bold text-slate-700">₹ {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="space-y-1 py-1 bg-white p-3 rounded-xl border border-slate-200/80">
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-slate-700 font-bold flex items-center gap-1.5">
                          GST Tax Amount (+)
                        </span>
                        <Input
                          type="number"
                          placeholder="₹ 0"
                          min="0"
                          step="any"
                          value={formData.tax_amount === 0 ? '' : formData.tax_amount}
                          onChange={e => setFormData({ ...formData, tax_amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className="w-32 h-8 text-right font-mono font-bold"
                        />
                      </div>

                      {/* GST Tax Breakdown */}
                      {totals.tax > 0 && formData.customer_id && (
                        <div className="pt-2 border-t border-dashed border-slate-200 text-xs space-y-1 font-mono">
                          {getGstType(formData.customer_id) === 'IGST' ? (
                            <div className="flex justify-between text-amber-700 font-medium">
                              <span>IGST (18%)</span>
                              <span>₹ {totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between text-emerald-700 font-medium">
                                <span>CGST (9%)</span>
                                <span>₹ {(totals.tax / 2).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-emerald-700 font-medium">
                                <span>SGST (9%)</span>
                                <span>₹ {(totals.tax / 2).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between text-sm items-center gap-4">
                      <span className="text-slate-500">Discount (-)</span>
                      <Input type="number" placeholder="₹ 0" min="0" step="any" value={formData.discount_amount === 0 ? '' : formData.discount_amount} onChange={e => setFormData({ ...formData, discount_amount: Math.max(0, parseFloat(e.target.value) || 0) })} className="w-32 h-8 text-right font-mono font-bold" />
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
                    <div className="flex justify-between text-xl font-black text-primary">
                      <span>Total Value</span>
                      <span className="font-mono">₹ {totals.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
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
              className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all ${activeSection === 'ALL'
                ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
            >
              All Invoices ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('B2B')}
              className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all ${activeSection === 'B2B'
                ? 'bg-white text-emerald-700 shadow-md shadow-slate-200/50'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
            >
              B2B Invoices ({invoices.filter(i => (i.invoice_type || (i.customers?.gst_no ? 'B2B' : 'B2C')).toUpperCase() === 'B2B').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('B2C')}
              className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all ${activeSection === 'B2C'
                ? 'bg-white text-blue-700 shadow-md shadow-slate-200/50'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
            >
              B2C Invoices ({invoices.filter(i => (i.invoice_type || (i.customers?.gst_no ? 'B2B' : 'B2C')).toUpperCase() === 'B2C').length})
            </button>
          </div>

          <TableView
            headers={['Invoice No', 'Date', 'Customer', 'Type', 'Amount', 'E-Invoice Status', 'E-Way Bill Status', 'Actions']}
            data={filteredInvoices}
            loading={loading}
            searchPlaceholder="Search invoices by Inv No or Customer..."
            searchFields={['invoice_number', 'customers.customer_name'] as any}
            renderRow={(inv: any) => {
              const resolvedType = inv.invoice_type || (inv.customers?.gst_no ? 'B2B' : 'B2C');
              const isB2B = resolvedType.toUpperCase() === 'B2B';
              const einvStatus = inv.einvoice_status || 'PENDING';
              const ewbStatus = inv.ewb_status || 'PENDING';

              return (
                <tr key={inv.id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                  <td className="px-6 py-4 font-mono font-black text-primary">{inv.invoice_number}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {inv.customers?.customer_name}
                    <div className="text-[10px] text-slate-400 font-normal">{inv.customers?.customer_code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isB2B ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                      {resolvedType}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">₹ {Number(inv.net_amount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {!isB2B ? (
                      <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-400 uppercase">N/A (B2C)</span>
                    ) : (
                      <div className="flex flex-col gap-1.5 items-start">
                        {einvStatus === 'GENERATED' && (
                          <div className="flex flex-col gap-0.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase w-fit flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Generated
                            </span>
                            {inv.einvoice_ack_no && (
                              <span className="text-[10px] font-mono text-slate-400">Ack: {inv.einvoice_ack_no}</span>
                            )}
                          </div>
                        )}
                        {einvStatus === 'FAILED' && (
                          <div className="flex flex-col gap-0.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 uppercase w-fit flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-600" /> Failed
                            </span>
                            {inv.einvoice_error && (
                              <span className="text-[9px] text-rose-500 max-w-[150px] truncate" title={inv.einvoice_error}>{inv.einvoice_error}</span>
                            )}
                          </div>
                        )}
                        {einvStatus === 'CANCELLED' && (
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-200 text-slate-600 uppercase">Cancelled</span>
                        )}
                        {einvStatus !== 'GENERATED' && einvStatus !== 'CANCELLED' && einvStatus !== 'FAILED' && (
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">Pending</span>
                        )}

                        {einvStatus !== 'GENERATED' && einvStatus !== 'CANCELLED' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateEInvoice(inv.id)}
                            className="h-7 text-[10px] font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-2 rounded-lg"
                          >
                            Generate IRN
                          </Button>
                        )}
                        {einvStatus === 'GENERATED' && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openViewEInvoiceModal(inv)}
                              className="h-6 text-[10px] font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 px-2 rounded flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" /> View e-Invoice
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCancelTarget({ id: inv.id, type: 'EINVOICE', docNo: inv.invoice_number });
                                setShowCancelDialog(true);
                              }}
                              className="h-6 text-[9px] font-bold text-rose-600 hover:bg-rose-50 px-1.5 rounded"
                            >
                              Cancel IRN
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 items-start">
                      {ewbStatus === 'GENERATED' && (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase w-fit flex items-center gap-1">
                            <Truck className="w-3 h-3 text-emerald-600" /> Generated
                          </span>
                          {inv.ewb_no && (
                            <span className="text-[10px] font-mono text-slate-500 font-bold">EWB: {inv.ewb_no}</span>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openViewEwbModal(inv)}
                            className="h-6 text-[10px] font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 px-2 rounded flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" /> View EWB
                          </Button>
                        </div>
                      )}
                      {ewbStatus === 'FAILED' && (
                        <div className="flex flex-col gap-0.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 uppercase w-fit flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" /> Failed
                          </span>
                          {inv.ewb_error && (
                            <span className="text-[9px] text-rose-500 max-w-[150px] truncate" title={inv.ewb_error}>{inv.ewb_error}</span>
                          )}
                        </div>
                      )}
                      {ewbStatus === 'CANCELLED' && (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-200 text-slate-600 uppercase">Cancelled</span>
                      )}
                      {ewbStatus !== 'GENERATED' && ewbStatus !== 'CANCELLED' && ewbStatus !== 'FAILED' && (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">Pending</span>
                      )}

                      {ewbStatus !== 'GENERATED' && ewbStatus !== 'CANCELLED' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEwbModal(inv)}
                          className="h-7 text-[10px] font-bold border-blue-300 text-blue-700 hover:bg-blue-50 px-2 rounded-lg flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5 text-blue-600" /> Generate EWB
                        </Button>
                      )}
                      {ewbStatus === 'GENERATED' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setCancelTarget({ id: inv.id, type: 'EWB', docNo: inv.invoice_number });
                            setShowCancelDialog(true);
                          }}
                          className="h-6 text-[9px] font-bold text-rose-600 hover:bg-rose-50 px-1.5 rounded"
                        >
                          Cancel EWB
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Download Action with Dropdown Menu */}
                      <div className="relative">
                        <div className="flex items-center rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors shadow-sm">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={downloadingId === inv.id}
                            onClick={() => handleDownloadAllDocs(inv)}
                            className="h-8 px-2.5 text-primary hover:bg-primary hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all rounded-l-lg rounded-r-none border-r border-primary/20"
                            title="Download All Documents (5-page PDF Bundle)"
                          >
                            {downloadingId === inv.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            ) : (
                              <FileDown className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden xl:inline">Download All Docs</span>
                            <span className="xl:hidden font-mono text-[11px]">PDF</span>
                          </Button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDownloadDropdownInvId(downloadDropdownInvId === inv.id ? null : inv.id);
                            }}
                            className="h-8 px-1.5 text-primary hover:text-white hover:bg-primary rounded-r-lg transition-colors flex items-center justify-center"
                            title="More Document Options"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {downloadDropdownInvId === inv.id && (() => {
                          const isEwbActive = inv.ewb_status === 'GENERATED' || Boolean(inv.ewb_no && inv.ewb_status !== 'CANCELLED' && inv.ewb_status !== 'FAILED');
                          return (
                            <div
                              className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-[1500] py-2 text-left animate-in fade-in zoom-in-95"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                <span>Download Documents</span>
                                <span className="text-[9px] font-mono text-primary font-bold">{inv.invoice_number}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDownloadAllDocs(inv)}
                                className="w-full px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5 flex items-center gap-2 transition-colors border-b border-slate-100"
                              >
                                <FileDown className="w-4 h-4 text-primary shrink-0" />
                                <div className="flex flex-col text-left">
                                  <span className="font-black text-slate-900">
                                    {isEwbActive ? 'All Documents (5 Pages Bundle)' : 'Tax Invoice Bundle (4 Pages)'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {isEwbActive ? 'Invoice + e-Way Bill + All Copies' : 'Invoice + All Copies (EWB Pending)'}
                                  </span>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadSingleDoc(inv, 'ORIGINAL')}
                                className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Tax Invoice (Original for Recipient)</span>
                              </button>

                              <button
                                type="button"
                                disabled={!isEwbActive}
                                onClick={() => handleDownloadSingleDoc(inv, 'EWB')}
                                className={`w-full px-3 py-1.5 text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${isEwbActive
                                  ? 'text-slate-700 hover:bg-slate-50'
                                  : 'text-slate-300 cursor-not-allowed bg-slate-50/50'
                                  }`}
                                title={isEwbActive ? 'Download official e-Way Bill' : 'e-Way Bill has not been generated for this invoice'}
                              >
                                <div className="flex items-center gap-2">
                                  <Truck className={`w-3.5 h-3.5 shrink-0 ${isEwbActive ? 'text-blue-600' : 'text-slate-300'}`} />
                                  <span>Official e-Way Bill</span>
                                </div>
                                {!isEwbActive && (
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Not Generated</span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadSingleDoc(inv, 'DUPLICATE')}
                                className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Duplicate for Transporter</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadSingleDoc(inv, 'TRIPLICATE')}
                                className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span>Triplicate for Supplier</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadSingleDoc(inv, 'EXTRA')}
                                className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>Extra Copy</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>

                      <Button variant="ghost" size="sm" onClick={() => handleEdit(inv)} className="h-8 w-8 p-0 text-slate-500 hover:text-primary rounded-lg" title="Edit Invoice">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)} className="h-8 w-8 p-0 text-slate-500 hover:text-destructive rounded-lg" title="Delete Invoice">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        </div>
      )}

      {/* Backdrop to close download dropdown */}
      {downloadDropdownInvId && (
        <div
          className="fixed inset-0 z-[1400] bg-transparent"
          onClick={() => setDownloadDropdownInvId(null)}
        />
      )}

      {/* Cancellation Modal */}
      {showCancelDialog && cancelTarget && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <Card className="w-full max-w-md bg-white border-none shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95">
            <CardHeader className="bg-rose-50 border-b border-rose-100 py-6">
              <CardTitle className="text-rose-900 flex items-center gap-2 text-xl font-black">
                <AlertTriangle className="w-6 h-6 text-rose-600" /> Cancel {cancelTarget.type === 'EINVOICE' ? 'E-Invoice' : 'E-Way Bill'}
              </CardTitle>
              <CardDescription className="text-rose-700 text-xs font-semibold">
                Document No: {cancelTarget.docNo}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Reason Code *</label>
                  <Select value={cancelReasonCode} onValueChange={setCancelReasonCode}>
                    <SelectTrigger className="w-full h-10 font-bold bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-[1300]">
                      <SelectItem value="1">1 - Duplicate Entry</SelectItem>
                      <SelectItem value="2">2 - Data Entry Error</SelectItem>
                      <SelectItem value="3">3 - Order Cancelled</SelectItem>
                      <SelectItem value="4">4 - Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Remarks / Reason Description</label>
                  <Input
                    placeholder="Provide additional details..."
                    value={cancelRemarks}
                    onChange={e => setCancelRemarks(e.target.value)}
                    className="font-medium"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowCancelDialog(false); setCancelTarget(null); }}
                    className="rounded-xl px-6 font-bold"
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    loading={cancelling}
                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-8 font-black shadow-lg shadow-rose-600/20"
                  >
                    Confirm Cancellation
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* E-Way Bill Transport Details Modal */}
      {showEwbModal && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <Card className="w-full max-w-lg bg-white shadow-2xl border-primary/20 rounded-2xl overflow-hidden animate-in zoom-in-95">
            <CardHeader className="bg-blue-50/80 border-b border-blue-100 py-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-950 font-black">
                  <Truck className="w-5 h-5 text-blue-600" />
                  E-Way Bill Dispatch Details ({ewbTargetInvoice?.invoice_number})
                </CardTitle>
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowEwbModal(false)} className="hover:bg-blue-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </Button>
              </div>
              <CardDescription className="text-xs text-blue-800">
                Enter vehicle & transport details for generating official E-Way Bill
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleGenerateEwbSubmit}>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-700 flex items-center justify-between">
                    <span>Vehicle Number <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-blue-600 font-bold">Road Mode Required</span>
                  </label>
                  <Input
                    placeholder="e.g. MH04AB1234"
                    value={ewbTransportForm.vehicle_no}
                    onChange={e => setEwbTransportForm({ ...ewbTransportForm, vehicle_no: e.target.value.toUpperCase() })}
                    className="h-11 font-mono font-bold uppercase tracking-wider text-slate-900 border-blue-300 focus:border-blue-500 focus:ring-blue-200"
                    required
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Format: State Code + Passing + Series + Number (e.g. MH04AB1234)</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-600">Transport Mode</label>
                    <Select
                      value={ewbTransportForm.trans_mode}
                      onValueChange={val => setEwbTransportForm({ ...ewbTransportForm, trans_mode: val })}
                    >
                      <SelectTrigger className="h-10 font-bold border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[1300]">
                        <SelectItem value="1">Road (Mode 1)</SelectItem>
                        <SelectItem value="2">Rail (Mode 2)</SelectItem>
                        <SelectItem value="3">Air (Mode 3)</SelectItem>
                        <SelectItem value="4">Ship (Mode 4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-600">Vehicle Type</label>
                    <Select
                      value={ewbTransportForm.vehicle_type}
                      onValueChange={val => setEwbTransportForm({ ...ewbTransportForm, vehicle_type: val })}
                    >
                      <SelectTrigger className="h-10 font-bold border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[1300]">
                        <SelectItem value="Regular">Regular</SelectItem>
                        <SelectItem value="ODC">Over Dimensional Cargo (ODC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-600">Distance (Km)</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 25"
                      value={ewbTransportForm.trans_distance || ''}
                      onChange={e => setEwbTransportForm({ ...ewbTransportForm, trans_distance: parseFloat(e.target.value) || 0 })}
                      className="h-10 font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-600">Transporter Name</label>
                    <Input
                      placeholder="e.g. VRL Logistics"
                      value={ewbTransportForm.transporter_name}
                      onChange={e => setEwbTransportForm({ ...ewbTransportForm, transporter_name: e.target.value })}
                      className="h-10 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-600">Transporter GSTIN / ID (Optional)</label>
                  <Input
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={ewbTransportForm.transporter_id}
                    onChange={e => setEwbTransportForm({ ...ewbTransportForm, transporter_id: e.target.value })}
                    className="h-10 font-mono font-bold uppercase"
                  />
                </div>
              </CardContent>
              <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowEwbModal(false)} className="rounded-full px-6 font-bold text-slate-600">
                  Cancel
                </Button>
                <Button type="submit" loading={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 font-black gap-2 shadow-lg shadow-blue-600/20">
                  <Truck className="w-4 h-4" /> Generate E-Way Bill
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* View / Print E-Way Bill Modal */}
      {showEwbViewModal && viewEwbInvoice && (
        <div className="fixed inset-0 z-[1300] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <Card className="w-full max-w-3xl bg-white shadow-2xl border-slate-200 rounded-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
            <CardHeader className="bg-slate-900 text-white py-4 px-6 shrink-0 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                    E-Way Bill Slip #{viewEwbInvoice.ewb_no || '121049284910'}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-300">
                    Official e-Way Bill for Tax Invoice {viewEwbInvoice.invoice_number}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => handleDownloadAllDocs(viewEwbInvoice)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-full px-4 h-9 text-xs font-bold gap-1.5 shadow-md"
                >
                  <FileDown className="w-4 h-4" /> Download All Docs (PDF)
                </Button>
                <Button
                  type="button"
                  onClick={() => downloadSingleEWayBill(viewEwbInvoice, activeTenant)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-4 h-9 text-xs font-bold gap-1.5 shadow-md"
                >
                  <Download className="w-4 h-4" /> Download EWB
                </Button>
                <Button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-full px-4 h-9 text-xs font-bold gap-1.5 shadow-md hidden sm:inline-flex"
                >
                  <Printer className="w-4 h-4" /> Print
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowEwbViewModal(false)} className="hover:bg-slate-800 text-slate-400 hover:text-white rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 overflow-y-auto space-y-6 text-slate-800 font-sans print:p-0">
              {/* EWB Header Slip Banner */}
              <div className="border-2 border-slate-900 rounded-xl p-5 bg-slate-50/50 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-300 pb-3">
                  <div>
                    <div className="text-xs uppercase font-black tracking-widest text-slate-500">Government of India</div>
                    <div className="text-xl font-black text-slate-900">E-WAY BILL SYSTEM</div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-black uppercase tracking-wider">
                      STATUS: ACTIVE / GENERATED
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">e-Way Bill No:</span>
                    <span className="font-mono font-black text-sm text-primary">{viewEwbInvoice.ewb_no || '121049284910'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Generated Date:</span>
                    <span className="font-bold">{viewEwbInvoice.ewb_date ? new Date(viewEwbInvoice.ewb_date).toLocaleString() : new Date().toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Consignor GSTIN:</span>
                    <span className="font-mono font-bold text-slate-800">32AUYPV8850B1Z2</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Valid Until:</span>
                    <span className="font-bold text-emerald-700">{viewEwbInvoice.ewb_valid_till ? new Date(viewEwbInvoice.ewb_valid_till).toLocaleString() : 'Next Day 11:59 PM'}</span>
                  </div>
                </div>
              </div>

              {/* PART A - Document & Party Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" /> PART A: Document & Transaction Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/30 space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Consignor (From)</span>
                    <div className="font-bold text-sm text-slate-900">{activeTenant === 'KEIL' ? 'KEIL Industries Ltd.' : 'Maxtron Industries'}</div>
                    <div className="text-slate-600 font-mono text-[11px]">GSTIN: 32AUYPV8850B1Z2</div>
                    <div className="text-slate-500">Address: Maxtron Industrial Area, Phase II, Mumbai, Maharashtra - 400001</div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/30 space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Consignee (To)</span>
                    <div className="font-bold text-sm text-slate-900">{viewEwbInvoice.customers?.customer_name || 'Customer'}</div>
                    <div className="text-slate-600 font-mono text-[11px]">GSTIN: {viewEwbInvoice.customers?.gst_no || 'URP (Unregistered)'}</div>
                    <div className="text-slate-500">
                      Address: {viewEwbInvoice.customers?.addresses?.[0]?.street || 'Customer Address'}, {viewEwbInvoice.customers?.addresses?.[0]?.city || 'City'}, {viewEwbInvoice.customers?.addresses?.[0]?.state || 'State'} - {viewEwbInvoice.customers?.addresses?.[0]?.zip_code || '400001'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-100/60 p-3 rounded-lg border border-slate-200/80 font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Invoice No:</span>
                    <span className="font-bold text-slate-900">{viewEwbInvoice.invoice_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Invoice Date:</span>
                    <span className="font-bold text-slate-900">{new Date(viewEwbInvoice.invoice_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Total Amount:</span>
                    <span className="font-black text-slate-900">₹ {Number(viewEwbInvoice.net_amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Items Summary Table */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600">Goods Description</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5 text-center">HSN Code</th>
                        <th className="p-2.5 text-center">Qty (KGS)</th>
                        <th className="p-2.5 text-right">Taxable Value</th>
                        <th className="p-2.5 text-right">GST %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {(viewEwbInvoice.items || []).map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{item.finished_products?.product_name || 'Industrial Poly Products'}</td>
                          <td className="p-2.5 text-center font-mono">{item.finished_products?.hsn_code || '392011'}</td>
                          <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono">₹ {(Number(item.quantity) * Number(item.rate)).toLocaleString()}</td>
                          <td className="p-2.5 text-right font-mono">{item.gst_percent || 18}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PART B - Transport & Vehicle Details */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600" /> PART B: Vehicle & Transport Details
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <div>
                    <span className="text-slate-500 text-[10px] font-medium block">Transport Mode:</span>
                    <span className="font-bold text-blue-950">{viewEwbInvoice.trans_mode === '2' ? 'Rail' : viewEwbInvoice.trans_mode === '3' ? 'Air' : viewEwbInvoice.trans_mode === '4' ? 'Ship' : 'Road'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-medium block">Vehicle Number:</span>
                    <span className="font-mono font-black text-sm text-blue-900">{viewEwbInvoice.vehicle_no || 'KL53V9494'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-medium block">Transporter Name:</span>
                    <span className="font-bold text-blue-950">{viewEwbInvoice.transporter_name || 'Direct Transport'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-medium block">Distance (Approx):</span>
                    <span className="font-mono font-bold text-blue-950">{viewEwbInvoice.trans_distance || 10} Km</span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50 p-4 border-t flex flex-wrap justify-between items-center gap-2 shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">Auto-generated via ERP GSP System</span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEwbViewModal(false)} className="rounded-full px-6 font-bold text-slate-600">
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDownloadAllDocs(viewEwbInvoice)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-full px-5 font-bold gap-1.5 shadow-md text-xs"
                >
                  <FileDown className="w-4 h-4" /> Download All Docs (5 Pages)
                </Button>
                <Button
                  type="button"
                  onClick={() => downloadSingleEWayBill(viewEwbInvoice, activeTenant)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-5 font-bold gap-1.5 shadow-md text-xs"
                >
                  <Download className="w-4 h-4" /> Download EWB
                </Button>
                <Button type="button" onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 font-bold gap-2">
                  <Printer className="w-4 h-4" /> Print Slip
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* View / Print e-Invoice (IRN) Modal */}
      {showEInvoiceViewModal && viewEInvoice && (
        <div className="fixed inset-0 z-[1300] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <Card className="w-full max-w-3xl bg-white shadow-2xl border-slate-200 rounded-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
            <CardHeader className="bg-emerald-950 text-white py-4 px-6 shrink-0 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                    e-Invoice (IRN Slip) - {viewEInvoice.invoice_number}
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-300">
                    Registered Tax Invoice & IRN Details
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => handleDownloadAllDocs(viewEInvoice)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-full px-4 h-9 text-xs font-bold gap-1.5 shadow-md"
                >
                  <FileDown className="w-4 h-4" /> Download All Docs
                </Button>
                <Button
                  type="button"
                  onClick={() => downloadSingleTaxInvoice(viewEInvoice, activeTenant, '(ORIGINAL FOR RECIPIENT)')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-4 h-9 text-xs font-bold gap-1.5 shadow-md"
                >
                  <Download className="w-4 h-4" /> Download Invoice
                </Button>
                <Button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-full px-4 h-9 text-xs font-bold gap-1.5 shadow-md hidden sm:inline-flex"
                >
                  <Printer className="w-4 h-4" /> Print
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowEInvoiceViewModal(false)} className="hover:bg-emerald-900 text-emerald-300 hover:text-white rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 overflow-y-auto space-y-6 text-slate-800 font-sans print:p-0">
              {/* e-Invoice Banner */}
              <div className="border-2 border-emerald-800 rounded-xl p-5 bg-emerald-50/40 space-y-4">
                <div className="flex justify-between items-center border-b border-emerald-200 pb-3">
                  <div>
                    <div className="text-xs uppercase font-black tracking-widest text-emerald-800">GST e-Invoice System</div>
                    <div className="text-xl font-black text-emerald-950">OFFICIAL TAX INVOICE</div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-200 text-emerald-950 border border-emerald-400 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> IRN ACTIVE / REGISTERED
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-500">Invoice Reference Number (IRN):</div>
                  <div className="font-mono text-xs font-bold bg-white p-2.5 rounded-lg border border-emerald-300 text-slate-900 break-all select-all shadow-sm">
                    {viewEInvoice.einvoice_irn || '4b89f0291e8432a10b9876543210feab9876543210feab9876543210feab9876'}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 font-medium block">Ack No:</span>
                    <span className="font-mono font-black text-sm text-emerald-950">{viewEInvoice.einvoice_ack_no || '105330196958644'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Ack Date:</span>
                    <span className="font-bold">{viewEInvoice.einvoice_ack_date ? new Date(viewEInvoice.einvoice_ack_date).toLocaleString() : new Date().toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Document Type:</span>
                    <span className="font-bold text-slate-800">Tax Invoice (INV)</span>
                  </div>
                </div>
              </div>

              {/* Seller & Buyer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Seller (Consignor)</span>
                  <div className="font-bold text-sm text-slate-900">{activeTenant === 'KEIL' ? 'KEIL Industries Ltd.' : 'Maxtron Industries'}</div>
                  <div className="text-slate-700 font-mono text-[11px] font-bold">GSTIN: 32AUYPV8850B1Z2</div>
                  <div className="text-slate-500 pt-1">Address: Maxtron Industrial Area, Phase II, Mumbai, Maharashtra - 400001</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Buyer (Consignee)</span>
                  <div className="font-bold text-sm text-slate-900">{viewEInvoice.customers?.customer_name || 'Customer'}</div>
                  <div className="text-slate-700 font-mono text-[11px] font-bold">GSTIN: {viewEInvoice.customers?.gst_no || 'N/A'}</div>
                  <div className="text-slate-500 pt-1">
                    Address: {viewEInvoice.customers?.addresses?.[0]?.street || 'Customer Address'}, {viewEInvoice.customers?.addresses?.[0]?.city || 'City'}, {viewEInvoice.customers?.addresses?.[0]?.state || 'State'} - {viewEInvoice.customers?.addresses?.[0]?.zip_code || '400001'}
                  </div>
                </div>
              </div>

              {/* Invoice Metadata Bar */}
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-100 p-3.5 rounded-xl border border-slate-200 font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">Invoice Number:</span>
                  <span className="font-bold text-slate-900 text-sm">{viewEInvoice.invoice_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Invoice Date:</span>
                  <span className="font-bold text-slate-900">{new Date(viewEInvoice.invoice_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Total Invoice Value:</span>
                  <span className="font-black text-emerald-800 text-sm">₹ {Number(viewEInvoice.net_amount).toLocaleString()}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600">Item Details & Tax Breakdown</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center">HSN Code</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Rate (₹)</th>
                        <th className="p-2.5 text-right">Taxable Value</th>
                        <th className="p-2.5 text-right">GST %</th>
                        <th className="p-2.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {(viewEInvoice.items || []).map((item: any, idx: number) => {
                        const qty = Number(item.quantity) || 0;
                        const rate = Number(item.rate) || 0;
                        const taxable = qty * rate;
                        const gstP = Number(item.gst_percent) || 18;
                        const lineTotal = Number(item.amount) || (taxable + (taxable * gstP / 100));
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">{item.finished_products?.product_name || 'Industrial Poly Product'}</td>
                            <td className="p-2.5 text-center font-mono">{item.finished_products?.hsn_code || '392011'}</td>
                            <td className="p-2.5 text-center font-mono">{qty}</td>
                            <td className="p-2.5 text-right font-mono">₹ {rate.toLocaleString()}</td>
                            <td className="p-2.5 text-right font-mono">₹ {taxable.toLocaleString()}</td>
                            <td className="p-2.5 text-right font-mono">{gstP}%</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹ {lineTotal.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tax Aggregates */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-bold">₹ {Number(viewEInvoice.total_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total GST Amount:</span>
                    <span className="font-mono font-bold">₹ {Number(viewEInvoice.tax_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-slate-200 my-1" />
                  <div className="flex justify-between font-black text-slate-900 text-sm">
                    <span>Net Invoice Value:</span>
                    <span className="font-mono text-emerald-700">₹ {Number(viewEInvoice.net_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50 p-4 border-t flex flex-wrap justify-between items-center gap-2 shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">Verified e-Invoice Document</span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEInvoiceViewModal(false)} className="rounded-full px-6 font-bold text-slate-600">
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDownloadAllDocs(viewEInvoice)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-full px-5 font-bold gap-1.5 shadow-md text-xs"
                >
                  <FileDown className="w-4 h-4" /> Download All Docs (5 Pages)
                </Button>
                <Button
                  type="button"
                  onClick={() => downloadSingleTaxInvoice(viewEInvoice, activeTenant, '(ORIGINAL FOR RECIPIENT)')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-full px-5 font-bold gap-1.5 shadow-md text-xs"
                >
                  <Download className="w-4 h-4" /> Download Invoice
                </Button>
                <Button type="button" onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 font-bold gap-2">
                  <Printer className="w-4 h-4" /> Print
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Customer Creation Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <Card className="w-full max-w-4xl bg-white shadow-2xl border-primary/20 rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <CardHeader className="bg-primary/5 border-b border-primary/10 p-4 md:p-6 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-primary flex items-center gap-2 text-xl font-black">
                    <UserPlus className="w-6 h-6" /> Quick Create Customer
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

      {/* Product Creation Modal (Matching Finished Products Specification Form) */}
      {showProductModal && (
        <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <Card className="w-full max-w-3xl bg-white shadow-2xl border-primary/20 rounded-2xl overflow-hidden animate-in zoom-in-95">
            <CardHeader className="bg-primary/5 border-b border-primary/10 py-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center gap-2 text-primary font-black">
                  <Plus className="w-5 h-5 text-primary" />
                  Add New Product Specification
                </CardTitle>
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowProductModal(false)} className="hover:bg-primary/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <CardDescription>Enter technical details like thickness, color, and size.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" /> Product Code
                  </label>
                  <Input
                    placeholder="e.g. FP-001"
                    value={productFormData.product_code}
                    readOnly
                    className="h-11 font-mono uppercase bg-slate-50 cursor-not-allowed font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                    <Box className="w-4 h-4 text-primary" /> Product Name *
                  </label>
                  <Input
                    placeholder="e.g. Milky Polybag"
                    value={productFormData.product_name}
                    onChange={e => setProductFormData({ ...productFormData, product_name: e.target.value })}
                    className="h-11 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" /> Color
                  </label>
                  <Input
                    placeholder="e.g. White"
                    value={productFormData.color}
                    onChange={e => setProductFormData({ ...productFormData, color: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" /> Thickness (Microns)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={productFormData.thickness_microns || ''}
                    onChange={e => setProductFormData({ ...productFormData, thickness_microns: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-primary" /> Size
                  </label>
                  <Input
                    placeholder="e.g. 10x12"
                    value={productFormData.size}
                    onChange={e => setProductFormData({ ...productFormData, size: e.target.value })}
                    className="h-11 px-3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" /> Avg Count per Kg
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={productFormData.avg_count_per_kg || ''}
                    onChange={e => setProductFormData({ ...productFormData, avg_count_per_kg: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> HSN Code *
                  </label>
                  <Input
                    placeholder="e.g. 3920"
                    value={productFormData.hsn_code}
                    onChange={e => setProductFormData({ ...productFormData, hsn_code: e.target.value })}
                    className="h-11 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary" /> Stock Threshold (Kg)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="50"
                    value={productFormData.stock_threshold || ''}
                    onChange={e => setProductFormData({ ...productFormData, stock_threshold: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="h-11 font-bold"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3 border-t pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProductModal(false)}
                  className="w-full sm:w-auto px-6 h-11 rounded-full text-slate-500 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={saveNewProduct}
                  loading={productSubmitting}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white px-8 h-11 rounded-full shadow-lg shadow-primary/20 flex items-center justify-center font-bold gap-2"
                >
                  <Save className="w-4 h-4" /> Save Product
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
