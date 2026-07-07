'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  FileCheck, Plus, Search, Edit, Trash2, X, Save,
  Truck, Calendar, Hash, User, IndianRupee,
  Warehouse, ClipboardList, Trash, Package, AlertCircle, Info,
  Building2, MapPin, Copy, Layers, Briefcase, Globe2, Activity, Tag, FileText,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const PURCHASE_API = `${API_BASE}/api/maxtron/purchase-entries`;
const ORDER_API = `${API_BASE}/api/maxtron/rm-orders`;
const STOCK_API = `${API_BASE}/api/maxtron/inventory/stock-summary`;
const SUPPLIER_API = `${API_BASE}/api/maxtron/suppliers`;

export default function PurchaseEntryPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('inv_purchase_view', 'create');
  const canEdit = hasPermission('inv_purchase_view', 'edit');
  const canDelete = hasPermission('inv_purchase_view', 'delete');
  const [showForm, setShowForm] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [companyState, setCompanyState] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    supplier_code: '',
    supplier_name: '',
    gst_no: '',
    supplier_address: {
      street: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'India'
    },
    billing_address: {
      street: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'India'
    },
    product_supplied: '',
    supplied_materials: [] as string[],
    delivery_mode: '',
    delivery_period: '',
    credit_period: 0,
    credit_limit: 0,
    opening_balance: 0
  });
  const [vendorNameError, setVendorNameError] = useState('');
  const [vendorGstError, setVendorGstError] = useState('');
  const [vendorZipError, setVendorZipError] = useState('');
  const [vendorBillingZipError, setVendorBillingZipError] = useState('');
  const [vendorDeliveryPeriodError, setVendorDeliveryPeriodError] = useState('');

  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const nameRegex = /^[a-zA-Z0-9\s.\-&',]+$/;
  const deliveryPeriodRegex = /^[a-zA-Z0-9\s-]+$/;

  const [typeCodes, setTypeCodes] = useState<any[]>([]);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [targetRowIndex, setTargetRowIndex] = useState<number | null>(null);
  const [showTypeCodeModal, setShowTypeCodeModal] = useState(false);
  const [savingTypeCode, setSavingTypeCode] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    rm_code: '',
    rm_name: '',
    rm_description: '',
    rate_per_unit: 0,
    unit_type: 'Kg',
    grade: '',
    rm_type_code: '',
    availability: 'Local',
    company_id: '',
    stock_threshold: 100,
    hsn_code: ''
  });
  const [newTypeCode, setNewTypeCode] = useState({ code: '', name: '' });
  const [materialCodeError, setMaterialCodeError] = useState('');
  const [materialNameError, setMaterialNameError] = useState('');
  const [materialGradeError, setMaterialGradeError] = useState('');

  const { success, error, info } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    entry_number: 'GENERATING...',
    entry_date: new Date().toISOString().split('T')[0],
    order_id: '',
    supplier_id: '',
    invoice_number: '',
    invoice_date: '',
    remarks: '',
    vehicle_number: '',
    unloading_charges: 0 as number | string,
    company_id: '',
    reorder_missing: false,
    is_round_off: false,
    round_off: 0,
    items: [] as any[]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!showForm || editingId) return;
    resetForm();
  }, [entries, showForm]);

  const getGstType = (supplierId: string): 'IGST' | 'CGST_SGST' | 'UNKNOWN' => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const billingState = supplier?.billing_addr_data?.state?.trim().toLowerCase() || supplier?.billing_address?.state?.trim().toLowerCase() || '';
    if (!billingState || !companyState) return 'UNKNOWN';
    return billingState !== companyState ? 'IGST' : 'CGST_SGST';
  };

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

      const [ordRes, supRes, stockRes] = await Promise.all([
        fetch(`${ORDER_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${SUPPLIER_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${STOCK_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const ordData = await ordRes.json();
      const supData = await supRes.json();
      const stockData = await stockRes.json();

      if (ordData.success) {
        // Filter for orders not yet fully received
        setPendingOrders(ordData.data.filter((o: any) => o.status === 'PENDING' || o.status === 'ORDERED'));
      }
      if (supData.success) setSuppliers(supData.data);
      if (stockData.success) setMaterials(stockData.data);
      fetchTypeCodes(coId);

      fetchEntries(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${PURCHASE_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
    }
  };

  const handleOrderSelection = (orderId: string) => {
    const selectedOrder = pendingOrders.find(o => o.id === orderId);
    if (selectedOrder) {
      setFormData({
        ...formData,
        order_id: orderId,
        supplier_id: selectedOrder.supplier_id,
        items: selectedOrder.rm_order_items.map((i: any) => {
          const baseAmount = Number(i.quantity) * Number(i.rate);
          const gstPercent = 18; // Defaulting to 18% or you can default to 0
          const gstAmount = (baseAmount * gstPercent) / 100;
          return {
            rm_id: i.rm_id,
            ordered_quantity: Number(i.quantity),
            received_quantity: Number(i.quantity),
            rate: Number(i.rate),
            gst_percent: gstPercent,
            gst_amount: gstAmount,
            amount: baseAmount + gstAmount
          };
        })
      });
    } else {
      setFormData({ ...formData, order_id: '', reorder_missing: false, items: [] });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        rm_id: '',
        ordered_quantity: 0,
        received_quantity: 0,
        rate: 0,
        gst_percent: 18,
        gst_amount: 0,
        amount: 0
      }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'rm_id') {
      const mat = materials.find(m => m.id === value);
      if (mat) {
        newItems[index].rate = Number(mat.rate_per_unit || 0);
      }
    }

    if (field !== 'amount') {
      const qty = Number(newItems[index].received_quantity || 0);
      const rate = Number(newItems[index].rate || 0);
      const gstPerc = Number(newItems[index].gst_percent || 0);

      const baseAmount = qty * rate;
      const gstAmount = (baseAmount * gstPerc) / 100;

      newItems[index].gst_amount = gstAmount;
      newItems[index].amount = baseAmount + gstAmount;
    }

    setFormData({ ...formData, items: newItems });
  };

  const validateGRN = () => {
    const newErrors: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];

    if (!formData.supplier_id) newErrors.supplier_id = 'Supplier selection is strictly required';
    if (!formData.entry_date) newErrors.entry_date = 'Intake date is required';
    else if (formData.entry_date > today) newErrors.entry_date = 'Intake date cannot be in the future';

    if (!formData.invoice_number?.trim()) newErrors.invoice_number = 'Invoice / Bill Number is required for audit';
    else if (!/^[a-zA-Z0-9-/ ]+$/.test(formData.invoice_number)) newErrors.invoice_number = 'Invalid characters in bill number';

    if (!formData.invoice_date) newErrors.invoice_date = 'Invoice date is required';
    else if (formData.invoice_date > today) newErrors.invoice_date = 'Invoice date cannot be in the future';

    if (formData.vehicle_number?.trim()) {
      // Standard Indian Vehicle Number Format: KA 01 AB 1234
      const vehicleRegex = /^[A-Z]{2}[ -]?[0-9]{2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}$/i;
      if (!vehicleRegex.test(formData.vehicle_number.trim())) {
        newErrors.vehicle_number = 'Invalid vehicle registration format (e.g. KA-01-AB-1234)';
      }
    }

    if (formData.items.length === 0) {
      error('Goods receipt must contain at least one material entry.');
      return false;
    }

    if (formData.items.some(i => !i.rm_id)) {
      error('All rows must have a valid material item selected.');
      return false;
    }

    if (formData.items.some(i => i.received_quantity <= 0)) {
      error('Receipt quantity must be strictly greater than zero.');
      return false;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      error('Please correct the validation errors before authorizing receipt.');
      return false;
    }
    return true;
  };

  const saveEntry = async () => {
    if (!validateGRN()) return;

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${PURCHASE_API}/${editingId}` : PURCHASE_API;

    setSubmitting(true);
    try {
      const unroundedTotal = formData.items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) + (Number(formData.unloading_charges) || 0);
      const isRoundOff = formData.is_round_off;
      const roundedTotal = isRoundOff ? Math.round(unroundedTotal) : unroundedTotal;
      const roundOffVal = isRoundOff ? (roundedTotal - unroundedTotal) : 0;

      const payload = {
        ...formData,
        total_amount: roundedTotal,
        round_off: roundOffVal
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Purchase entry updated!' : 'Material received successfully!');
        setShowForm(false);
        setEditingId(null);
        fetchEntries();
        resetForm();
      } else {
        error(data.error || data.message || 'Operation failed.');
      }
    } catch (err: any) {
      error(err.message || 'Network connectivity issue or server error.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = (latestEntries: any[] = entries) => {
    let nextNo = 'GRN-000001';
    if (latestEntries && latestEntries.length > 0) {
      let max = 0;
      latestEntries.forEach(e => {
        if (e.entry_number && e.entry_number.startsWith('GRN-')) {
          const numStr = e.entry_number.substring(4);
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > max) {
            max = num;
          }
        }
      });
      nextNo = `GRN-${String(max + 1).padStart(6, '0')}`;
    }

    setFormData({
      entry_number: nextNo,
      entry_date: new Date().toISOString().split('T')[0],
      order_id: '',
      supplier_id: '',
      invoice_number: '',
      invoice_date: '',
      remarks: '',
      vehicle_number: '',
      unloading_charges: 0 as number | string,
      company_id: currentCompanyId,
      reorder_missing: false,
      is_round_off: false,
      round_off: 0,
      items: []
    });
    setErrors({});
  };

  const openNewSupplierModal = () => {
    let nextCode = 'VEN-000001';
    const validCodes = suppliers
      .filter((s: any) => s.supplier_code && /^VEN-\d+$/i.test(s.supplier_code))
      .map((s: any) => {
        const parts = s.supplier_code.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter((n: any) => !isNaN(n));

    if (validCodes.length > 0) {
      const max = Math.max(...validCodes);
      nextCode = `VEN-${String(max + 1).padStart(6, '0')}`;
    }

    setNewSupplier({
      supplier_code: nextCode,
      supplier_name: '',
      gst_no: '',
      supplier_address: {
        street: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'India'
      },
      billing_address: {
        street: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'India'
      },
      product_supplied: '',
      supplied_materials: [],
      delivery_mode: '',
      delivery_period: '',
      credit_period: 0,
      credit_limit: 0,
      opening_balance: 0
    });

    setVendorNameError('');
    setVendorGstError('');
    setVendorZipError('');
    setVendorBillingZipError('');
    setVendorDeliveryPeriodError('');
    setShowSupplierModal(true);
  };

  const copyOfficialAddressForNewSupplier = () => {
    const off = newSupplier.supplier_address;
    if (!off.street && !off.city && !off.state) {
      info('Official address is empty.');
      return;
    }
    setNewSupplier(prev => ({
      ...prev,
      billing_address: {
        ...prev.billing_address,
        street: off.street,
        city: off.city,
        state: off.state,
        zip_code: off.zip_code,
        country: off.country
      }
    }));
    success('Address copied successfully!');
  };

  const handleCreateSupplier = async () => {
    const name = newSupplier.supplier_name.trim();
    const code = newSupplier.supplier_code.trim();

    if (!name || !code) {
      error('Name and Code are required.');
      return;
    }

    if (vendorNameError) {
      error('Please provide a valid supplier name.');
      return;
    }

    if (newSupplier.gst_no && !gstRegex.test(newSupplier.gst_no.toUpperCase())) {
      error('Please provide a valid 15-digit GST number or keep it empty.');
      return;
    }

    if (vendorZipError || vendorBillingZipError) {
      error('Please provide valid 6-digit zip codes.');
      return;
    }

    if (vendorDeliveryPeriodError) {
      error('Delivery Period contains invalid characters.');
      return;
    }

    setSavingSupplier(true);
    const token = localStorage.getItem('token');
    
    const payload = {
      supplier_code: code,
      supplier_name: name,
      supplier_address: {
        street: newSupplier.supplier_address.street.trim(),
        city: newSupplier.supplier_address.city.trim(),
        state: newSupplier.supplier_address.state.trim(),
        zip_code: newSupplier.supplier_address.zip_code.trim(),
        country: newSupplier.supplier_address.country.trim()
      },
      billing_address: {
        street: newSupplier.billing_address.street.trim(),
        city: newSupplier.billing_address.city.trim(),
        state: newSupplier.billing_address.state.trim(),
        zip_code: newSupplier.billing_address.zip_code.trim(),
        country: newSupplier.billing_address.country.trim()
      },
      gst_no: newSupplier.gst_no.toUpperCase().trim(),
      credit_period: Number(newSupplier.credit_period) || 0,
      credit_limit: Number(newSupplier.credit_limit) || 0,
      product_supplied: newSupplier.product_supplied.trim(),
      delivery_period: newSupplier.delivery_period.trim(),
      delivery_mode: newSupplier.delivery_mode,
      opening_balance: Number(newSupplier.opening_balance) || 0,
      supplied_materials: newSupplier.supplied_materials,
      company_id: currentCompanyId
    };

    try {
      const res = await fetch(`${API_BASE}/api/maxtron/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        success('New supplier registered!');
        setShowSupplierModal(false);
        
        // Refresh supplier list
        const supRes = await fetch(`${SUPPLIER_API}?company_id=${currentCompanyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const supData = await supRes.json();
        if (supData.success) {
          setSuppliers(supData.data);
        }
        
        setFormData(prev => ({
          ...prev,
          supplier_id: data.data.id
        }));
        if (errors.supplier_id) setErrors(prev => { const n = { ...prev }; delete n.supplier_id; return n; });
      } else {
        error(data.message || 'Error occurred while saving supplier');
      }
    } catch (err: any) {
      error(err.message || 'Network error.');
    } finally {
      setSavingSupplier(false);
    }
  };

  const fetchTypeCodes = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${API_BASE}/api/maxtron/rm-type-codes?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTypeCodes(data.data);
      }
    } catch (err) {
      console.error('Error fetching type codes:', err);
    }
  };

  const openNewMaterialModal = (rowIndex: number) => {
    setTargetRowIndex(rowIndex);
    
    let nextCode = 'RM-000001';
    const validCodes = materials
      .filter((m: any) => m.rm_code && /^RM-\d+$/i.test(m.rm_code))
      .map((m: any) => {
        const parts = m.rm_code.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter((n: any) => !isNaN(n));

    if (validCodes.length > 0) {
      const max = Math.max(...validCodes);
      nextCode = `RM-${String(max + 1).padStart(6, '0')}`;
    }

    setNewMaterial({
      rm_code: nextCode,
      rm_name: '',
      rm_description: '',
      rate_per_unit: 0,
      unit_type: 'Kg',
      grade: '',
      rm_type_code: '',
      availability: 'Local',
      company_id: currentCompanyId,
      stock_threshold: 100,
      hsn_code: ''
    });

    setMaterialCodeError('');
    setMaterialNameError('');
    setMaterialGradeError('');
    setShowMaterialModal(true);
  };

  const handleCreateTypeCode = async () => {
    const normalizedCode = (newTypeCode.code || '').trim().toUpperCase();
    const normalizedName = (newTypeCode.name || '').trim();

    if (!normalizedCode || !normalizedName) {
      error('Please fill both Code and Name.');
      return;
    }

    if (normalizedCode.length < 2 || normalizedCode.length > 10) {
      error('Code must be 2-10 characters long.');
      return;
    }
    if (normalizedName.length < 3 || normalizedName.length > 50) {
      error('Name must be 3-50 characters long.');
      return;
    }

    const tcNameRegex = /^[a-zA-Z0-9\s-]+$/;
    if (!tcNameRegex.test(normalizedCode) || !tcNameRegex.test(normalizedName)) {
      error('Only letters, numbers, spaces, and hyphens are allowed.');
      return;
    }

    setSavingTypeCode(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/maxtron/rm-type-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: normalizedCode,
          name: normalizedName,
          company_id: currentCompanyId
        })
      });
      const data = await res.json();
      if (data.success) {
        success('RM type code added successfully!');
        setShowTypeCodeModal(false);
        setNewTypeCode({ code: '', name: '' });
        fetchTypeCodes(currentCompanyId);
        setNewMaterial(prev => ({ ...prev, rm_type_code: normalizedCode }));
      } else {
        error(data.error || data.message || 'Error occurred');
      }
    } catch (err: any) {
      error(err.message || 'Network error.');
    } finally {
      setSavingTypeCode(false);
    }
  };

  const handleCreateMaterial = async () => {
    const codeRegex = /^[A-Z0-9-]+$/;
    const rmNameRegex = /^[a-zA-Z0-9\s-]+$/;
    const gradeRegex = /^[a-zA-Z0-9\s+-/]+$/;

    const normalizedCode = (newMaterial.rm_code || '').trim().toUpperCase();
    const normalizedName = (newMaterial.rm_name || '').trim();

    if (!normalizedCode || !normalizedName) {
      error('Please fill Code and Name.');
      return;
    }

    if (normalizedCode.length < 3 || normalizedCode.length > 30) {
      error('Material Code must be 3-30 characters');
      return;
    }

    if (normalizedName.length < 3 || normalizedName.length > 50) {
      error('Material Name must be 3-50 characters');
      return;
    }

    if (materialCodeError) {
      error('Material Code can only contain uppercase letters, numbers, and hyphens.');
      return;
    }

    if (materialNameError) {
      error('Material Name can only contain letters, numbers, spaces, and hyphens.');
      return;
    }
    
    if (materialGradeError) {
      error('Grade contains invalid characters.');
      return;
    }

    setSavingMaterial(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/api/maxtron/raw-materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newMaterial,
          rm_code: normalizedCode,
          rm_name: normalizedName
        })
      });
      const data = await res.json();
      if (data.success) {
        success('Raw material added!');
        setShowMaterialModal(false);

        const stockRes = await fetch(`${STOCK_API}?company_id=${currentCompanyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const stockData = await stockRes.json();
        let updatedMaterials: any[] = [];
        if (stockData.success) {
          setMaterials(stockData.data);
          updatedMaterials = stockData.data;
        }

        if (targetRowIndex !== null) {
          const newlyAdded = updatedMaterials.find((m: any) => m.rm_code === normalizedCode);
          if (newlyAdded) {
            updateItem(targetRowIndex, 'rm_id', newlyAdded.id);
          }
        }
      } else {
        error(data.error || data.message || 'Error occurred');
      }
    } catch (err: any) {
      error(err.message || 'Network error.');
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      entry_number: rec.entry_number || '',
      entry_date: rec.entry_date ? rec.entry_date.split('T')[0] : '',
      order_id: rec.order_id || '',
      supplier_id: rec.supplier_id || '',
      invoice_number: rec.invoice_number || '',
      invoice_date: rec.invoice_date ? rec.invoice_date.split('T')[0] : '',
      remarks: rec.remarks || '',
      vehicle_number: rec.vehicle_number || '',
      unloading_charges: Number(rec.unloading_charges || 0),
      company_id: rec.company_id || '',
      reorder_missing: false,
      is_round_off: !!rec.is_round_off,
      round_off: Number(rec.round_off || 0),
      items: (rec.purchase_entry_items || []).map((i: any) => {
        const qty = Number(i.received_quantity || 0);
        const rate = Number(i.rate || 0);
        const gstPerc = Number(i.gst_percent || 0);
        const base = qty * rate;
        const gstAmt = Number(i.gst_amount || (base * gstPerc / 100));
        return {
          rm_id: i.rm_id || '',
          ordered_quantity: Number(i.ordered_quantity || 0),
          received_quantity: qty,
          rate: rate,
          gst_percent: gstPerc,
          gst_amount: gstAmt,
          amount: base + gstAmt
        };
      })
    });
    setErrors({});
    setShowForm(true);
  };

  const deleteEntry = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to remove this Goods Receipt entry? This action will reverse the inventory update for these items.',
      type: 'danger',
      confirmLabel: 'Confirm Delete'
    });
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${PURCHASE_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Purchase entry removed successfully.');
        fetchEntries();
      } else {
        error(data.message || 'Deletion failed.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      error('An error occurred during deletion.');
    }
  };

  return (
    <div className="md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Purchase Registry</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Record material intake against pending orders with multi-item support.</p>
        </div>
        <div className="flex items-center w-full md:w-auto">
          {canCreate && (
            <Button
              onClick={() => { setShowForm(!showForm); if (!showForm) { resetForm(); addItem(); } setEditingId(null); }}
              className="w-full md:w-auto h-10 md:h-11 bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold transition-all whitespace-nowrap"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Cancel Receipt' : 'Register Intake'}
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl font-bold text-primary flex items-center">
              <ClipboardList className="w-5 h-5 mr-3 text-secondary" />
              {editingId ? 'Modify Goods Receipt' : 'Goods Receipt Note (GRN)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 border-b border-slate-100 pb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Pending Order Selection</label>
                <Select value={formData.order_id} onValueChange={handleOrderSelection}>
                  <SelectTrigger className="w-full h-11 border-primary/20 bg-primary/5 text-xs font-black shadow-sm">
                    <SelectValue placeholder="-- Select Pending PO --" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-primary/20">
                    <SelectItem value="manual">-- Select Pending PO --</SelectItem>
                    {pendingOrders.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.order_number} | {o.supplier_master?.supplier_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Intake Date</label>
                <Input type="date" max={new Date().toISOString().split('T')[0]} value={formData.entry_date} onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} className="h-11 font-bold" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-primary italic font-black">Vendor Identity</label>
                  {!formData.order_id && (
                    <button
                      type="button"
                      onClick={() => openNewSupplierModal()}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 animate-in fade-in"
                    >
                      <Plus className="w-3 h-3" /> Add New Vendor
                    </button>
                  )}
                </div>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(val) => {
                    setFormData({ ...formData, supplier_id: val });
                    if (errors.supplier_id) setErrors(prev => { const n = { ...prev }; delete n.supplier_id; return n; });
                  }}
                  disabled={!!formData.order_id}
                >
                  <SelectTrigger className={`w-full h-11 text-xs font-black bg-slate-50 border ${errors.supplier_id ? 'border-destructive bg-amber-50' : 'border-slate-200'}`}>
                    <SelectValue placeholder="Choose Supplier..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.supplier_name.toUpperCase()} ({s.supplier_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.supplier_id && <p className="text-[10px] font-bold text-destructive mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.supplier_id}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Invoice / Bill No</label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => {
                    setFormData({ ...formData, invoice_number: e.target.value });
                    if (errors.invoice_number) setErrors(prev => { const n = { ...prev }; delete n.invoice_number; return n; });
                  }}
                  className={`h-11 font-bold ${errors.invoice_number ? 'border-destructive bg-amber-50' : ''}`}
                  placeholder="Bill Number"
                />
                {errors.invoice_number && <p className="text-[10px] font-bold text-destructive mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.invoice_number}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Invoice Date</label>
                <Input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.invoice_date}
                  onChange={(e) => {
                    setFormData({ ...formData, invoice_date: e.target.value });
                    if (errors.invoice_date) setErrors(prev => { const n = { ...prev }; delete n.invoice_date; return n; });
                  }}
                  className={`h-11 font-bold ${errors.invoice_date ? 'border-destructive bg-amber-50' : ''}`}
                />
                {errors.invoice_date && <p className="text-[10px] font-bold text-destructive mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.invoice_date}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Truck className="w-3 h-3 text-primary" /> Vehicle Number</label>
                <Input
                  value={formData.vehicle_number}
                  onChange={(e) => {
                    setFormData({ ...formData, vehicle_number: e.target.value });
                    if (errors.vehicle_number) setErrors(prev => { const n = { ...prev }; delete n.vehicle_number; return n; });
                  }}
                  className={`h-11 uppercase font-black ${errors.vehicle_number ? 'border-destructive bg-amber-50' : ''}`}
                  placeholder="KA-00-XX-0000"
                />
                {errors.vehicle_number && <p className="text-[10px] font-bold text-destructive mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.vehicle_number}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Unloading Fees {!formData.unloading_charges && <span className="text-[10px] font-medium lowercase">(₹)</span>}</label>
                <Input type="number" min="0" value={formData.unloading_charges === 0 ? '' : formData.unloading_charges} onChange={(e) => setFormData({ ...formData, unloading_charges: e.target.value })} className="h-11 font-black text-primary" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                  <Warehouse className="hidden md:inline w-4 h-4 mr-2 text-primary" /> Multi-Item Receipt Entry
                </h3>
                {!formData.order_id && (
                  <Button onClick={addItem} variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/10 rounded-full h-8">
                    <Plus className="w-3.5 h-3.5 mr-1" /> <span className="hidden md:inline">Add Manual Row</span>
                  </Button>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[750px]">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase font-heading">Material Item / Current Stock</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32 font-heading">HSN Code</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32 font-heading">Qty Ordered</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32 font-heading">Qty Delivered</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-24 font-heading">Rate</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32 font-heading">Total Excl. GST</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-24 font-heading">GST %</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32 font-heading">Amount</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item, idx) => {
                      const baseAmt = Number(item.received_quantity || 0) * Number(item.rate || 0);
                      return (
                        <tr key={idx} className="bg-white">
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 min-w-[200px]">
                              <Select
                                value={item.rm_id}
                                onValueChange={(val) => updateItem(idx, 'rm_id', val)}
                                disabled={!!formData.order_id}
                              >
                                <SelectTrigger className="w-full h-10 border border-slate-200 text-sm font-medium">
                                  <SelectValue placeholder="Select Material..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200">
                                  {materials.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.rm_name} (Global Stock: {Number(m.balance).toLocaleString()} {m.unit_type})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!formData.order_id && (
                                <Button
                                  type="button"
                                  onClick={() => openNewMaterialModal(idx)}
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 shrink-0 border-primary/20 text-primary hover:bg-primary/10 rounded"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 font-bold uppercase whitespace-nowrap">
                              {materials.find(m => m.id === item.rm_id)?.hsn_code || '—'}
                            </span>
                          </td>
                          <td className="p-4">
                            <Input
                              type="number"
                              min="0"
                              value={item.ordered_quantity === 0 ? '' : item.ordered_quantity}
                              onChange={(e) => updateItem(idx, 'ordered_quantity', e.target.value)}
                              className="h-10 text-center font-bold text-slate-500 bg-slate-50"
                            />
                          </td>
                          <td className="p-4">
                            <Input
                              type="number"
                              min="0"
                              max={item.ordered_quantity || undefined}
                              value={item.received_quantity === 0 ? '' : item.received_quantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                const maxAllowed = item.ordered_quantity > 0 ? item.ordered_quantity : Infinity;
                                if (val !== '' && Number(val) > maxAllowed) {
                                  updateItem(idx, 'received_quantity', maxAllowed);
                                } else {
                                  updateItem(idx, 'received_quantity', val);
                                }
                              }}
                              className={`h-10 text-right font-black ${Number(item.received_quantity) < item.ordered_quantity ? 'text-slate-500' : 'text-primary'}`}
                            />
                          </td>
                          <td className="p-4">
                            <Input
                              type="number"
                              min="0"
                              value={item.rate === 0 ? '' : item.rate}
                              onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                              className="h-10 text-right font-bold text-slate-600 bg-slate-50"
                            />
                          </td>
                          <td className="p-4">
                            <Input
                              type="number"
                              readOnly
                              value={baseAmt === 0 ? '' : baseAmt}
                              className="h-10 text-right font-mono font-bold text-slate-600 bg-slate-50 cursor-not-allowed"
                            />
                          </td>
                          <td className="p-4">
                            <Select
                              value={String(item.gst_percent)}
                              onValueChange={(val) => updateItem(idx, 'gst_percent', Number(val))}
                            >
                              <SelectTrigger className="w-full h-10 border border-slate-200 text-xs font-bold">
                                <SelectValue placeholder="GST" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                {[0, 5, 12, 18, 28].map(p => (
                                  <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className={`${item.gst_amount ? "pt-8 pb-4 px-4" : "p-4"}`}>
                            <Input
                              type="number"
                              min="0"
                              value={item.amount === 0 ? '' : item.amount}
                              onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                              className="h-10 text-right font-mono font-black text-slate-900 bg-slate-100"
                            />
                            {item.gst_amount > 0 && (
                              <div className="text-[10px] text-right font-bold text-slate-400 mt-1">Incl. ₹{Number(item.gst_amount).toLocaleString()} GST</div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {!formData.order_id && (
                              <Button onClick={() => removeItem(idx)} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 rounded-full">
                                <Trash className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {formData.items.length > 0 && (
                      <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
                        <td className="p-4 text-xs font-black text-slate-700 uppercase">Total</td>
                        <td className="p-4"></td>
                        <td className="p-4 text-center text-xs font-black text-slate-600">
                          {formData.items.reduce((acc, curr) => acc + Number(curr.ordered_quantity || 0), 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right text-xs font-black text-primary">
                          {formData.items.reduce((acc, curr) => acc + Number(curr.received_quantity || 0), 0).toLocaleString()}
                        </td>
                        <td className="p-4"></td>
                        <td className="p-4 text-right text-xs font-black text-slate-800 font-mono">
                          ₹{formData.items.reduce((acc, curr) => acc + (Number(curr.received_quantity || 0) * Number(curr.rate || 0)), 0).toLocaleString()}
                        </td>
                        <td className="p-4"></td>
                        <td className="p-4 text-right text-xs font-black text-slate-900 font-mono">
                          ₹{formData.items.reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toLocaleString()}
                        </td>
                        <td className="p-4"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex flex-col lg:flex-row justify-between items-stretch lg:items-start gap-6">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Receipt Comments</label>
                <textarea
                  className="w-full h-20 p-3 mt-2 rounded-md border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  value={formData.remarks}
                  maxLength={50}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Shortage, damage or delay notes..."
                />
              </div>
              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 text-right relative flex flex-col items-end">
                {formData.order_id && formData.items.some(i => Number(i.ordered_quantity || 0) > Number(i.received_quantity)) && (
                  <div className="absolute -top-12 right-0 flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl animate-bounce shadow-sm">
                    <AlertCircle className="w-4 h-4 text-slate-500 font-black" />
                    <label className="text-[10px] font-black text-slate-800 uppercase flex items-center gap-2 cursor-pointer tracking-widest">
                      <Checkbox
                        checked={formData.reorder_missing}
                        onCheckedChange={(checked: boolean) => setFormData({ ...formData, reorder_missing: !!checked })}
                      />
                      <span className="hidden sm:inline">Re-order Missing Qty?</span>
                      <span className="sm:hidden">Re-order?</span>
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                  <Checkbox
                    id="round-off-checkbox"
                    checked={formData.is_round_off}
                    onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_round_off: !!checked })}
                    className="border-primary data-[state=checked]:bg-primary"
                  />
                  <label htmlFor="round-off-checkbox" className="text-[10px] font-black text-primary uppercase tracking-widest cursor-pointer select-none">
                    Round Off Final Amount
                  </label>
                </div>

                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Receipt Valuation</p>
                {(() => {
                  const gstType = getGstType(formData.supplier_id);
                  const totalGst = formData.items.reduce((acc, curr) => acc + Number(curr.gst_amount || 0), 0);
                  const cgst = gstType === 'CGST_SGST' ? totalGst / 2 : 0;
                  const sgst = gstType === 'CGST_SGST' ? totalGst / 2 : 0;
                  const igst = gstType === 'IGST' ? totalGst : 0;

                  return (
                    <>
                      {formData.supplier_id && gstType !== 'UNKNOWN' && (
                        <div className="mb-2">
                          {gstType === 'IGST' ? (
                            <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                              ⚡ Inter-State · IGST Applicable
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                              ✓ Intra-State · CGST + SGST
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                        <span>Total Excl. GST:</span>
                        <span className="font-mono">₹{formData.items.reduce((acc, curr) => acc + (Number(curr.received_quantity || 0) * Number(curr.rate || 0)), 0).toLocaleString()}</span>
                      </div>
                      {formData.supplier_id && gstType !== 'UNKNOWN' && totalGst > 0 && (
                        <div className="space-y-0.5 mb-1 text-right">
                          {gstType === 'IGST' ? (
                            <div className="text-[11px] font-bold text-amber-600 flex items-center justify-end gap-1">
                              <span>IGST:</span>
                              <span className="font-mono">₹{igst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          ) : (
                            <>
                              <div className="text-[11px] font-bold text-blue-600 flex items-center justify-end gap-1">
                                <span>CGST (50%):</span>
                                <span className="font-mono">₹{cgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="text-[11px] font-bold text-violet-600 flex items-center justify-end gap-1">
                                <span>SGST (50%):</span>
                                <span className="font-mono">₹{sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {gstType === 'UNKNOWN' && totalGst > 0 && (
                        <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                          <span>Total GST:</span>
                          <span className="font-mono">₹{totalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                {(() => {
                  const subTotalVal = formData.items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) + (Number(formData.unloading_charges) || 0);
                  const displayTotalVal = formData.is_round_off ? Math.round(subTotalVal) : subTotalVal;
                  const roundOffDifference = formData.is_round_off ? (Math.round(subTotalVal) - subTotalVal) : 0;
                  return (
                    <>
                      {formData.is_round_off && roundOffDifference !== 0 && (
                        <div className="text-[11px] font-bold text-emerald-600 mb-1 flex items-center gap-1">
                          <span>Round Off:</span>
                          <span className="font-mono">₹{roundOffDifference > 0 ? `+${roundOffDifference.toFixed(2)}` : roundOffDifference.toFixed(2)}</span>
                        </div>
                      )}
                      <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tighter">₹ {displayTotalVal.toLocaleString()}</h2>
                    </>
                  );
                })()}
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Includes GST & Labor charges</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3">
              <Button onClick={() => setShowForm(false)} variant="ghost" className="w-full sm:w-auto px-8 h-11 rounded-full text-slate-500 font-bold">
                Cancel Receipt
              </Button>
              <Button
                onClick={saveEntry}
                loading={submitting}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg font-bold flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update GRN' : 'Authorize Receipt'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Material Intake Log"
          description="Verify incoming shipments and audit quantities delivered against orders."
          headers={['GRN / Date', 'Procurement Context', 'Qty Delivered', 'Valuation', 'Vehicle / Bill', 'Details', 'Actions']}
          data={entries}
          loading={loading}
          searchFields={['entry_number', 'suppliers.supplier_name', 'invoice_number']}
          renderRow={(e: any) => {
            const gstType = getGstType(e.supplier_id);
            const entryTotalGst = (e.purchase_entry_items || []).reduce((a: number, i: any) => a + Number(i.gst_amount || 0), 0);
            return (
              <>
                <tr key={e.id} className="hover:bg-emerald-50 transition-all border-b border-slate-50 last:border-none">
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-800 text-[13px]">{e.entry_number}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(e.entry_date).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700">{e.supplier_master?.supplier_name}</div>
                    {e.rm_orders?.order_number && (
                      <div className="text-[10px] font-black text-primary uppercase mt-0.5 tracking-tighter">Order: {e.rm_orders.order_number}</div>
                    )}
                    {gstType !== 'UNKNOWN' && (
                      <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                        gstType === 'IGST'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {gstType === 'IGST' ? '⚡ IGST' : '✓ CGST+SGST'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-lg font-black text-primary">{e.purchase_entry_items?.reduce((acc: any, i: any) => acc + Number(i.received_quantity), 0).toLocaleString()}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">{e.purchase_entry_items?.length || 0} ITEMS</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-900 tracking-tight text-base">₹ {Number(e.total_amount || 0).toLocaleString()}</div>
                    {Number(e.round_off || 0) !== 0 && (
                      <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                        Round Off: {Number(e.round_off) > 0 ? `+₹${Number(e.round_off).toFixed(2)}` : `-₹${Math.abs(Number(e.round_off)).toFixed(2)}`}
                      </div>
                    )}
                    {entryTotalGst > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {gstType === 'IGST' ? (
                          <div className="text-[10px] font-bold text-amber-600">
                            IGST: ₹ {entryTotalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        ) : gstType === 'CGST_SGST' ? (
                          <>
                            <div className="text-[10px] font-bold text-blue-600">
                              CGST: ₹ {(entryTotalGst / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-bold text-violet-600">
                              SGST: ₹ {(entryTotalGst / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                    {Number(e.unloading_charges || 0) > 0 && (
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Incl. ₹{e.unloading_charges} labor</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-semibold text-slate-600 flex items-center capitalize"><Truck className="w-3 h-3 mr-1 opacity-50" /> {e.vehicle_number || '---'}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1">Invoice: {e.invoice_number || '---'}</div>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                      className="h-8 rounded-full text-xs font-bold text-primary hover:bg-primary/10"
                    >
                      {expandedId === e.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {expandedId === e.id ? 'Hide' : 'Expand'}
                    </Button>
                  </td>
                  <td className="md:px-4 py-4 text-right space-x-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(e)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => deleteEntry(e.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
                {expandedId === e.id && (
                  <tr key={`${e.id}-details`} className="bg-primary/5">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase">Material</th>
                              <th className="px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase">HSN Code</th>
                              <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Ordered Qty</th>
                              <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Received Qty</th>
                              <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Rate (₹)</th>
                              <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Base Amt (₹)</th>
                              <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">GST %</th>
                              {gstType === 'IGST' ? (
                                <th className="px-4 py-2 text-right text-[10px] font-black text-amber-600 uppercase">IGST (₹)</th>
                              ) : (
                                <>
                                  <th className="px-4 py-2 text-right text-[10px] font-black text-blue-600 uppercase">CGST (₹)</th>
                                  <th className="px-4 py-2 text-right text-[10px] font-black text-violet-600 uppercase">SGST (₹)</th>
                                </>
                              )}
                              <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Total (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(e.purchase_entry_items || []).map((item: any, idx: number) => {
                              const baseAmt = Number(item.received_quantity || 0) * Number(item.rate || 0);
                              const gstAmt = Number(item.gst_amount || 0);
                              const totalAmt = baseAmt + gstAmt;
                              return (
                                <tr key={idx} className="bg-white hover:bg-slate-50/50">
                                  <td className="px-4 py-2.5 font-semibold text-slate-700">
                                    {item.raw_materials?.rm_name || '—'}
                                    {item.raw_materials?.rm_code && (
                                      <span className="ml-2 text-[10px] font-mono text-slate-400">{item.raw_materials.rm_code}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-left text-slate-600 font-mono">{item.raw_materials?.hsn_code || '—'}</td>
                                  <td className="px-4 py-2.5 text-right text-slate-600">{Number(item.ordered_quantity || 0).toLocaleString()} {item.raw_materials?.unit_type}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{Number(item.received_quantity || 0).toLocaleString()} {item.raw_materials?.unit_type}</td>
                                  <td className="px-4 py-2.5 text-right text-slate-600 font-mono">₹ {Number(item.rate || 0).toLocaleString()}</td>
                                  <td className="px-4 py-2.5 text-right text-slate-600 font-mono">₹ {baseAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="px-4 py-2.5 text-right text-slate-500 font-bold font-mono">{Number(item.gst_percent || 0)}%</td>
                                  {gstType === 'IGST' ? (
                                    <td className="px-4 py-2.5 text-right font-bold text-amber-600 font-mono">
                                      ₹ {gstAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  ) : (
                                    <>
                                      <td className="px-4 py-2.5 text-right font-bold text-blue-600 font-mono">
                                        ₹ {(gstAmt / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-bold text-violet-600 font-mono">
                                        ₹ {(gstAmt / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    </>
                                  )}
                                  <td className="px-4 py-2.5 text-right font-black text-slate-900 font-mono">
                                    ₹ {totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {entryTotalGst > 0 && (
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                              <tr>
                                <td colSpan={gstType === 'IGST' ? 7 : 8} className="px-4 py-2.5 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                  GST Summary ({gstType === 'IGST' ? 'IGST Applicable' : 'CGST + SGST split'})
                                </td>
                                {gstType === 'IGST' ? (
                                  <td className="px-4 py-2.5 text-right font-black text-amber-600 font-mono">
                                    ₹ {entryTotalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                ) : (
                                  <>
                                    <td className="px-4 py-2.5 text-right font-black text-blue-600 font-mono">
                                      ₹ {(entryTotalGst / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-black text-violet-600 font-mono">
                                      ₹ {(entryTotalGst / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </>
                                )}
                                <td className="px-4 py-2.5 text-right font-black text-slate-900 font-mono">
                                  ₹ {entryTotalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          }}
        />
      )}

      <Dialog open={showSupplierModal} onOpenChange={setShowSupplierModal}>
        <DialogContent className="bg-white border-slate-200 max-w-4xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
              <Building2 className="w-5 h-5 text-secondary" /> Add New Supplier / Vendor
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a new vendor profile to register material intake.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Row 1: Code, Name, GST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Supplier Code</label>
                <Input
                  value={newSupplier.supplier_code}
                  readOnly
                  className="h-11 font-mono uppercase bg-slate-50 cursor-not-allowed font-bold"
                  placeholder="e.g. VEN-001"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Supplier Name</label>
                <Input
                  value={newSupplier.supplier_name}
                  maxLength={255}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewSupplier({ ...newSupplier, supplier_name: val });
                    if (val && !nameRegex.test(val)) {
                      setVendorNameError('Special characters not allowed');
                    } else {
                      setVendorNameError('');
                    }
                  }}
                  className={`h-11 font-bold ${vendorNameError ? 'border-amber-400 bg-amber-50 focus:ring-amber-200' : 'border-slate-200'}`}
                  placeholder="Supplier Name"
                />
                {vendorNameError && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1 animate-in fade-in">{vendorNameError}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">GST No (Optional)</label>
                <Input
                  value={newSupplier.gst_no}
                  maxLength={15}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setNewSupplier({ ...newSupplier, gst_no: val });
                    if (val && !gstRegex.test(val)) {
                      setVendorGstError('Invalid GST format (Example: 29ABCDE1234F1Z5)');
                    } else {
                      setVendorGstError('');
                    }
                  }}
                  className={`h-11 uppercase font-bold transition-all ${vendorGstError ? 'border-rose-500 bg-rose-50 text-rose-600 focus:ring-rose-200' : 'text-emerald-600 border-slate-200'}`}
                  placeholder="29XXXXX..."
                />
                {vendorGstError && <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1 animate-in fade-in">{vendorGstError}</p>}
              </div>
            </div>

            {/* Row 2: Addresses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-100 pt-4">
              {/* Supplier Address Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-primary border-b border-primary/10 pb-2">
                   <MapPin className="w-4 h-4" />
                   <h3 className="text-xs font-black uppercase tracking-widest">Supplier Official Address</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Street / Landmark</label>
                    <Input value={newSupplier.supplier_address.street} onChange={(e) => setNewSupplier({...newSupplier, supplier_address: {...newSupplier.supplier_address, street: e.target.value}})} placeholder="123 Industrial Area..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">City</label>
                    <Input value={newSupplier.supplier_address.city} onChange={(e) => setNewSupplier({...newSupplier, supplier_address: {...newSupplier.supplier_address, city: e.target.value}})} placeholder="City" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">State</label>
                    <Input value={newSupplier.supplier_address.state} onChange={(e) => setNewSupplier({...newSupplier, supplier_address: {...newSupplier.supplier_address, state: e.target.value}})} placeholder="State" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Zip Code</label>
                    <Input 
                        value={newSupplier.supplier_address.zip_code} 
                        maxLength={6}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setNewSupplier({...newSupplier, supplier_address: {...newSupplier.supplier_address, zip_code: val}});
                            if (val && val.length !== 6) setVendorZipError('Must be 6 digits');
                            else setVendorZipError('');
                        }} 
                        className={vendorZipError ? 'border-amber-400 bg-amber-50 h-10' : 'h-10'}
                        placeholder="XXXXXX" 
                    />
                    {vendorZipError && <p className="text-[10px] font-bold text-amber-600 ml-1">{vendorZipError}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Country</label>
                    <Input value={newSupplier.supplier_address.country} onChange={(e) => setNewSupplier({...newSupplier, supplier_address: {...newSupplier.supplier_address, country: e.target.value}})} placeholder="Country" />
                  </div>
                </div>
              </div>

              {/* Billing Address Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-2">
                   <div className="flex items-center space-x-2">
                     <FileCheck className="w-4 h-4" />
                     <h3 className="text-xs font-black uppercase tracking-widest">
                       Billing Address
                     </h3>
                   </div>
                   <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyOfficialAddressForNewSupplier}
                    className="h-7 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-full transition-all"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Same as Official
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Street / Landmark</label>
                    <Input value={newSupplier.billing_address.street} onChange={(e) => setNewSupplier({...newSupplier, billing_address: {...newSupplier.billing_address, street: e.target.value}})} placeholder="Same as above or specific..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">City</label>
                    <Input value={newSupplier.billing_address.city} onChange={(e) => setNewSupplier({...newSupplier, billing_address: {...newSupplier.billing_address, city: e.target.value}})} placeholder="City" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">State</label>
                    <Input value={newSupplier.billing_address.state} onChange={(e) => setNewSupplier({...newSupplier, billing_address: {...newSupplier.billing_address, state: e.target.value}})} placeholder="State" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Zip Code</label>
                    <Input 
                        value={newSupplier.billing_address.zip_code} 
                        maxLength={6}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setNewSupplier({...newSupplier, billing_address: {...newSupplier.billing_address, zip_code: val}});
                            if (val && val.length !== 6) setVendorBillingZipError('Must be 6 digits');
                            else setVendorBillingZipError('');
                        }} 
                        className={vendorBillingZipError ? 'border-amber-400 bg-amber-50 h-10' : 'h-10'}
                        placeholder="XXXXXX"
                    />
                    {vendorBillingZipError && <p className="text-[10px] font-bold text-amber-600 ml-1">{vendorBillingZipError}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Country</label>
                    <Input value={newSupplier.billing_address.country} onChange={(e) => setNewSupplier({...newSupplier, billing_address: {...newSupplier.billing_address, country: e.target.value}})} placeholder="Country" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Product line & terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
              <div className="space-y-1 lg:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Product Category Supplied</label>
                <Input value={newSupplier.product_supplied} onChange={(e) => setNewSupplier({...newSupplier, product_supplied: e.target.value})} className="h-11" placeholder="Resins, Chemicals, etc." />
              </div>
              
              <div className="space-y-1 lg:col-span-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                  <span>Specific Raw Materials Supplied</span>
                  <span className="text-[10px] text-emerald-600 font-black">{newSupplier.supplied_materials.length} Selected</span>
                </label>
                <div className="border border-slate-200 rounded-md p-3 max-h-32 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50">
                  {materials.map(m => (
                    <label key={m.id} className="flex items-start space-x-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-white p-1.5 rounded transition-all">
                      <Checkbox 
                        checked={newSupplier.supplied_materials.includes(m.id)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setNewSupplier(prev => ({ ...prev, supplied_materials: [...prev.supplied_materials, m.id] }));
                          } else {
                            setNewSupplier(prev => ({ ...prev, supplied_materials: prev.supplied_materials.filter(id => id !== m.id) }));
                          }
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{m.rm_name}</span>
                        {m.rm_type_code && (
                          <span className="text-[10px] text-slate-400 font-medium">Type: {m.rm_type_code}</span>
                        )}
                      </div>
                    </label>
                  ))}
                  {materials.length === 0 && <span className="text-xs text-slate-400 font-bold col-span-full">No active materials in inventory.</span>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delivery Mode</label>
                <Select value={newSupplier.delivery_mode} onValueChange={(val) => setNewSupplier({...newSupplier, delivery_mode: val})}>
                  <SelectTrigger className="w-full h-11 border border-slate-200 text-sm shadow-sm bg-slate-50">
                    <SelectValue placeholder="Select Mode..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Direct Truck">Direct Truck</SelectItem>
                    <SelectItem value="Courier">Courier</SelectItem>
                    <SelectItem value="Self Pickup">Self Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delivery Period</label>
                <Input 
                  value={newSupplier.delivery_period} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewSupplier({...newSupplier, delivery_period: val});
                    if (val && !deliveryPeriodRegex.test(val)) {
                      setVendorDeliveryPeriodError('Invalid characters (Use A-Z, 0-9, spaces, hyphens)');
                    } else {
                      setVendorDeliveryPeriodError('');
                    }
                  }} 
                  className={`h-11 ${vendorDeliveryPeriodError ? 'border-amber-400 bg-amber-50 focus:ring-amber-200' : 'border-slate-200'}`} 
                  placeholder="e.g. 2-4 Days" 
                />
                {vendorDeliveryPeriodError && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1 animate-in fade-in">{vendorDeliveryPeriodError}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Credit Period (Days)</label>
                <Input type="number" min="0" value={newSupplier.credit_period || ''} onChange={(e) => setNewSupplier({...newSupplier, credit_period: Math.max(0, Number(e.target.value) || 0)})} className="h-11" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Credit Limit (₹)</label>
                <Input type="number" min="0" value={newSupplier.credit_limit || ''} onChange={(e) => setNewSupplier({...newSupplier, credit_limit: Math.max(0, Number(e.target.value) || 0)})} className="h-11" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opening Balance (₹)</label>
                <Input type="number" min="0" value={newSupplier.opening_balance || ''} onChange={(e) => setNewSupplier({...newSupplier, opening_balance: Math.max(0, Number(e.target.value) || 0)})} className="h-11" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSupplierModal(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateSupplier}
              loading={savingSupplier}
              className="bg-primary hover:bg-primary/95 text-white font-bold px-6 rounded-full shadow-md"
            >
              <Save className="w-4 h-4 mr-2" /> Complete Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMaterialModal} onOpenChange={setShowMaterialModal}>
        <DialogContent className="bg-white border-slate-200 max-w-4xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
              <Package className="w-5 h-5 text-secondary" /> Add New Raw Material
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register a new material feedstock in the master registry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                  <Tag className="w-3 h-3 mr-2 text-primary" /> Material Code
                </label>
                <Input 
                  placeholder="e.g. RM-001"
                  value={newMaterial.rm_code}
                  readOnly
                  className="h-11 font-bold bg-slate-50 cursor-not-allowed" 
                />
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                   <Package className="w-3 h-3 mr-2 text-primary" /> Material Name
                </label>
                <Input 
                  placeholder="e.g. Virgin LDPE Granules"
                  value={newMaterial.rm_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const rmNameRegex = /^[a-zA-Z0-9\s-]+$/;
                    setNewMaterial({...newMaterial, rm_name: val});
                    if (val && !rmNameRegex.test(val)) {
                      setMaterialNameError('Invalid characters (Use A-Z, 0-9, spaces, hyphens)');
                    } else {
                      setMaterialNameError('');
                    }
                  }} 
                  className={`h-11 font-bold ${materialNameError ? 'border-amber-400 bg-amber-50 focus:ring-amber-200' : 'border-slate-200'}`} 
                />
                {materialNameError && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1 animate-in fade-in">{materialNameError}</p>}
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                  <Layers className="w-3 h-3 mr-2 text-primary" /> Grade
                </label>
                <Input 
                  placeholder="e.g. Grade A+"
                  value={newMaterial.grade}
                  onChange={(e) => {
                    const val = e.target.value;
                    const gradeRegex = /^[a-zA-Z0-9\s+-/]+$/;
                    setNewMaterial({...newMaterial, grade: val});
                    if (val && !gradeRegex.test(val)) {
                      setMaterialGradeError('Invalid characters (Use A-Z, 0-9, +, -, /)');
                    } else {
                      setMaterialGradeError('');
                    }
                  }}
                  className={`h-11 font-bold ${materialGradeError ? 'border-amber-400 bg-amber-50 focus:ring-amber-200' : 'border-slate-200'}`} 
                />
                {materialGradeError && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1 animate-in fade-in">{materialGradeError}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                  <FileText className="w-3 h-3 mr-2 text-primary" /> HSN Code
                </label>
                <Input 
                  placeholder="e.g. 39011010"
                  value={newMaterial.hsn_code}
                  onChange={(e) => setNewMaterial({...newMaterial, hsn_code: e.target.value})}
                  className="h-11 font-bold border-slate-200" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                    <Briefcase className="w-3 h-3 mr-2 text-primary" /> RM Type Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTypeCodeModal(true)}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add New
                  </button>
                </div>
                <Select value={newMaterial.rm_type_code} onValueChange={(val) => setNewMaterial({...newMaterial, rm_type_code: val})}>
                  <SelectTrigger className="w-full h-11 border border-slate-200 bg-slate-50 text-sm font-bold shadow-sm">
                    <SelectValue placeholder="Select Type Code..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {typeCodes.map(tc => (
                      <SelectItem key={tc.id} value={tc.code}>{tc.code} - {tc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                   Unit Type
                </label>
                <Select value={newMaterial.unit_type} onValueChange={(val) => setNewMaterial({...newMaterial, unit_type: val})}>
                  <SelectTrigger className="w-full h-11 border border-slate-200 bg-slate-50 text-sm shadow-sm">
                    <SelectValue placeholder="Select Unit..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Kg">Kilogram (Kg)</SelectItem>
                    <SelectItem value="Ton">Metric Ton (Ton)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                  <IndianRupee className="w-3 h-3 mr-2 text-primary" /> Rate per Unit {!newMaterial.rate_per_unit && <span className="text-[10px] ml-1">(₹)</span>}
                </label>
                <div className="relative">
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={newMaterial.rate_per_unit || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, rate_per_unit: Math.max(0, Number(e.target.value))})}
                    className="h-11 font-black text-primary pr-20"
                  />
                  <div className="absolute right-2 top-2 bottom-2 flex items-center bg-slate-100 px-2 rounded text-[10px] font-black text-slate-500">
                    PER {newMaterial.unit_type.toUpperCase()}
                  </div>
                </div>
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                   <Activity className="w-3 h-3 mr-2 text-primary" /> Stock Threshold
                </label>
                <div className="relative">
                  <Input 
                    type="number"
                    min="0"
                    placeholder="100.00"
                    value={newMaterial.stock_threshold || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, stock_threshold: Math.max(0, Number(e.target.value))})}
                    className="h-11 font-black text-slate-600 pr-12"
                  />
                  <div className="absolute right-2 top-2 bottom-2 flex items-center bg-slate-100 px-2 rounded text-[10px] font-black text-slate-500">
                    {newMaterial.unit_type.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/70 flex items-center">
                  <Globe2 className="w-4 h-4 mr-2 text-primary" /> Availability 
                </label>
                <Select value={newMaterial.availability} onValueChange={(val) => setNewMaterial({...newMaterial, availability: val})}>
                  <SelectTrigger className="w-full h-11 border border-slate-200 bg-slate-50 text-sm shadow-sm">
                    <SelectValue placeholder="Select Availability..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Local">Local (Domestic)</SelectItem>
                    <SelectItem value="Outstation">Outstation (Inter-state)</SelectItem>
                    <SelectItem value="Abroad">Abroad (Imported)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 lg:col-span-3 space-y-2">
                <label className="text-sm font-bold text-foreground/70 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-primary" /> Description
                </label>
                <textarea 
                  className="w-full h-24 p-3 rounded-md border border-slate-200 bg-slate-50 text-sm focus:bg-white outline-none shadow-sm resize-none"
                  placeholder="Notes about quality, chemical properties or vendor specifics..."
                  value={newMaterial.rm_description}
                  onChange={(e) => setNewMaterial({...newMaterial, rm_description: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMaterialModal(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateMaterial}
              loading={savingMaterial}
              className="bg-primary hover:bg-primary/95 text-white font-bold px-6 rounded-full shadow-md"
            >
              <Save className="w-4 h-4 mr-2" /> Register Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTypeCodeModal} onOpenChange={setShowTypeCodeModal}>
        <DialogContent className="bg-white border-slate-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-secondary" /> Add RM Type Code
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a new Raw Material classification code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Tag className="w-3 h-3 text-primary" /> Type Code
              </label>
              <Input
                placeholder="e.g. LDPE"
                value={newTypeCode.code}
                onChange={(e) => setNewTypeCode({ ...newTypeCode, code: e.target.value.toUpperCase() })}
                className="h-10 font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <FileText className="w-3 h-3 text-primary" /> Type Name
              </label>
              <Input
                placeholder="e.g. Low Density Polyethylene"
                value={newTypeCode.name}
                onChange={(e) => setNewTypeCode({ ...newTypeCode, name: e.target.value })}
                className="h-10 font-medium"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTypeCodeModal(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateTypeCode}
              loading={savingTypeCode}
              className="bg-primary hover:bg-primary/95 text-white font-bold px-6 rounded-full shadow-md"
            >
              <Save className="w-4 h-4 mr-2" /> Save Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

