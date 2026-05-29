'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  FileBox, Plus, Search, Edit, Trash2, X, Save, 
  ShoppingCart, Calendar, Truck, User, IndianRupee, 
  Clock, CheckCircle, Package, Download, Trash, AlertCircle,
  Building2, MapPin, Copy, Layers, Briefcase, Globe2, Activity, Tag, FileText
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
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const ORDER_API = `${API_BASE}/api/maxtron/rm-orders`;
const SUPPLIER_API = `${API_BASE}/api/maxtron/suppliers`;
const STOCK_API = `${API_BASE}/api/maxtron/inventory/stock-summary`;

export default function RMOrderPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('inv_order_view', 'create');
  const canEdit = hasPermission('inv_order_view', 'edit');
  const canDelete = hasPermission('inv_order_view', 'delete');
  const [showForm, setShowForm] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
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
    order_number: 'GENERATING...',
    order_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    expected_delivery_date: '',
    remarks: '',
    total_amount: 0,
    is_round_off: false,
    round_off: 0,
    company_id: '',
    status: 'PENDING',
    items: [] as any[]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!showForm || editingId) return;
    resetForm();
  }, [orders, showForm]);

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

      const [supRes, stockRes] = await Promise.all([
        fetch(`${SUPPLIER_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${STOCK_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const supData = await supRes.json();
      const stockData = await stockRes.json();
      
      if (supData.success) {
          setSuppliers(supData.data);
      }
      if (stockData.success) setMaterials(stockData.data);
      fetchTypeCodes(coId);

      fetchOrders(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${ORDER_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        console.log("RM Order Page - Orders List:", data.data);
        setOrders(data.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
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
      } else {
        error(data.message || 'Error occurred while saving supplier');
      }
    } catch (err: any) {
      error(err.message || 'Network error.');
    } finally {
      setSavingSupplier(false);
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
      // 1. Create raw material
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
        const newlyCreatedMaterialId = data.data.id;
        
        // 2. Link this material to the currently selected supplier
        if (formData.supplier_id) {
          const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);
          if (selectedSupplier) {
            const currentMaterialIds = (selectedSupplier.supplied_materials || []).map((sm: any) => sm.rm_id) || [];
            const updatedMaterialIds = [...currentMaterialIds, newlyCreatedMaterialId];
            
            const supplierPayload = {
              supplier_code: selectedSupplier.supplier_code,
              supplier_name: selectedSupplier.supplier_name,
              gst_no: selectedSupplier.gst_no,
              credit_period: selectedSupplier.credit_period,
              credit_limit: selectedSupplier.credit_limit,
              product_supplied: selectedSupplier.product_supplied,
              delivery_period: selectedSupplier.delivery_period,
              delivery_mode: selectedSupplier.delivery_mode,
              opening_balance: selectedSupplier.opening_balance,
              company_id: selectedSupplier.company_id,
              supplier_address: selectedSupplier.office_addr_data ? {
                street: selectedSupplier.office_addr_data.street,
                city: selectedSupplier.office_addr_data.city,
                state: selectedSupplier.office_addr_data.state,
                zip_code: selectedSupplier.office_addr_data.zip_code,
                country: selectedSupplier.office_addr_data.country,
              } : undefined,
              billing_address: selectedSupplier.billing_addr_data ? {
                street: selectedSupplier.billing_addr_data.street,
                city: selectedSupplier.billing_addr_data.city,
                state: selectedSupplier.billing_addr_data.state,
                zip_code: selectedSupplier.billing_addr_data.zip_code,
                country: selectedSupplier.billing_addr_data.country,
              } : undefined,
              supplied_materials: updatedMaterialIds
            };
            
            await fetch(`${SUPPLIER_API}/${selectedSupplier.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(supplierPayload)
            });
          }
        }

        success('Raw material added and linked to vendor!');
        setShowMaterialModal(false);

        // Refresh supplier and stock summary lists
        const [supRes, stockRes] = await Promise.all([
          fetch(`${SUPPLIER_API}?company_id=${currentCompanyId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${STOCK_API}?company_id=${currentCompanyId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        const supData = await supRes.json();
        const stockData = await stockRes.json();
        
        let updatedMaterials: any[] = [];
        if (supData.success) setSuppliers(supData.data);
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

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { 
        rm_id: '', 
        quantity: 0, 
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
    const total = newItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    setFormData({ ...formData, items: newItems, total_amount: total });
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
        const qty = Number(newItems[index].quantity || 0);
        const rate = Number(newItems[index].rate || 0);
        const gstPerc = Number(newItems[index].gst_percent || 0);
        
        const baseAmount = qty * rate;
        const gstAmount = (baseAmount * gstPerc) / 100;
        
        newItems[index].gst_amount = gstAmount;
        newItems[index].amount = baseAmount + gstAmount;
    }
    
    const total = newItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    setFormData({ ...formData, items: newItems, total_amount: total });
  };

  const saveOrder = async () => {
    if (!formData.supplier_id || formData.items.length === 0 || formData.items.some(i => !i.rm_id || i.quantity <= 0)) {
      error('Please select Supplier and add items with valid quantities.');
      return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${ORDER_API}/${editingId}` : ORDER_API;

    setSubmitting(true);
    try {
      const unroundedTotal = formData.items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
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
        success(editingId ? 'Purchase order updated!' : 'Purchase order released!');
        setShowForm(false);
        setEditingId(null);
        fetchInitialData(); // Re-fetch to get new balances if needed
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

  const resetForm = (latestOrders: any[] = orders) => {
    let nextNo = 'PO-000001';
    if (latestOrders && latestOrders.length > 0) {
      let max = 0;
      latestOrders.forEach(o => {
        if (o.order_number && o.order_number.startsWith('PO-')) {
          const numStr = o.order_number.substring(3);
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > max) {
            max = num;
          }
        }
      });
      nextNo = `PO-${String(max + 1).padStart(6, '0')}`;
    }

    setFormData({
      order_number: nextNo,
      order_date: new Date().toISOString().split('T')[0],
      supplier_id: '',
      expected_delivery_date: '',
      remarks: '',
      total_amount: 0,
      is_round_off: false,
      round_off: 0,
      company_id: currentCompanyId,
      status: 'PENDING',
      items: []
    });
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      order_number: rec.order_number,
      order_date: rec.order_date.split('T')[0],
      supplier_id: rec.supplier_id,
      expected_delivery_date: rec.expected_delivery_date ? rec.expected_delivery_date.split('T')[0] : '',
      remarks: rec.remarks || '',
      total_amount: Number(rec.total_amount),
      is_round_off: !!rec.is_round_off,
      round_off: Number(rec.round_off || 0),
      company_id: rec.company_id,
      status: rec.status,
      items: rec.rm_order_items.map((i: any) => {
        const qty = Number(i.quantity || 0);
        const rate = Number(i.rate || 0);
        const gstPerc = Number(i.gst_percent || 0);
        const base = qty * rate;
        const gstAmt = Number(i.gst_amount || (base * gstPerc / 100));
        return {
          rm_id: i.rm_id,
          quantity: qty,
          rate: rate,
          gst_percent: gstPerc,
          gst_amount: gstAmt,
          amount: Number(i.amount) + gstAmt // Assuming i.amount holds base
        };
      })
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Cancel this purchase order? Items will be removed from tracking.',
      type: 'danger'
    });
    if (!isConfirmed) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${ORDER_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Order cancelled.');
        fetchOrders();
      }
    } catch (err) {
      error('Cancellation failed.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Raw Material Order</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Release multi-item purchase orders to suppliers with automatic stock visibility.</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) { resetForm(); addItem(); } setEditingId(null); }}
              className="w-full md:w-auto bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg h-10 md:h-11 transition-all font-bold whitespace-nowrap"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Discard Draft' : 'New Purchase Order'}
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
            <CardTitle className="text-lg font-bold text-primary flex items-center">
               <FileBox className="w-5 h-5 mr-3 text-secondary" />
               Purchase Order: {formData.order_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 border-b border-slate-100 pb-8">
              <div className="space-y-2 text-sm">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Order Date</label>
                <Input type="date" max={new Date().toISOString().split('T')[0]} value={formData.order_date} onChange={(e) => setFormData({...formData, order_date: e.target.value})} className="h-11" />
              </div>
 
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Supplier Details</label>
                <div className="flex items-center gap-1.5">
                  <Select value={formData.supplier_id} onValueChange={(val) => setFormData({...formData, supplier_id: val})}>
                    <SelectTrigger className="w-full h-11 border border-slate-200 text-sm font-bold shadow-sm">
                      <SelectValue placeholder="Select Vendor..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.supplier_name.toUpperCase()} ({s.supplier_code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={openNewSupplierModal}
                    variant="outline"
                    className="h-11 px-3 border-primary/20 text-primary hover:bg-primary/10 rounded flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add New
                  </Button>
                </div>
              </div>
 
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Expected Delivery</label>
                <Input type="date" value={formData.expected_delivery_date} onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})} className="h-11 border-amber-200 bg-amber-50/10" />
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                    <Package className="w-4 h-4 mr-2 text-primary" /> Order Line Items
                  </h3>
                  <Button onClick={addItem} variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/10 rounded-full h-8">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                  </Button>
               </div>

                <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[750px]">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase">Material (Name / Stock)</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32">Qty Purchased</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32">Rate (₹)</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-24">GST %</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase w-32">Amount</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, idx) => (
                        <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 min-w-[200px]">
                              <Select 
                                value={item.rm_id} 
                                onValueChange={(val) => updateItem(idx, 'rm_id', val)}
                                disabled={!formData.supplier_id}
                              >
                                <SelectTrigger className="w-full h-10 border border-slate-200 text-sm font-medium">
                                  <SelectValue placeholder={!formData.supplier_id ? 'Select Supplier First...' : 'Select Material...'} />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200">
                                  {(() => {
                                     if (!formData.supplier_id) return null;
                                     const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);
                                     if (!selectedSupplier || !selectedSupplier.supplied_materials || selectedSupplier.supplied_materials.length === 0) {
                                         return <SelectItem value="none" disabled>No materials assigned</SelectItem>;
                                     }
                                     
                                     return materials.filter(m => selectedSupplier.supplied_materials.some((sm: any) => sm.rm_id === m.id)).map(m => (
                                       <SelectItem key={m.id} value={m.id}>
                                         {m.rm_name} ({Number(m.balance).toLocaleString()} {m.unit_type})
                                       </SelectItem>
                                     ));
                                  })()}
                                </SelectContent>
                              </Select>
                              {formData.supplier_id && (
                                <Button
                                  type="button"
                                  onClick={() => openNewMaterialModal(idx)}
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 shrink-0 border-primary/20 text-primary hover:bg-primary/10 rounded flex items-center justify-center"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Input 
                              type="number" 
                              required
                              min="0"
                              value={item.quantity === 0 ? '' : item.quantity} 
                              onChange={(e) => updateItem(idx, 'quantity', Math.max(0, Number(e.target.value)))}
                              className="h-10 text-right font-black text-primary"
                            />
                          </td>
                          <td className="p-4">
                            <Input 
                              type="number" 
                              min="0"
                              value={item.rate === 0 ? '' : item.rate} 
                              onChange={(e) => updateItem(idx, 'rate', Math.max(0, Number(e.target.value)))}
                              className="h-10 text-right font-bold text-slate-600"
                            />
                          </td>
                          <td className="p-4">
                            <Select 
                              value={String(item.gst_percent)}
                              onValueChange={(val) => updateItem(idx, 'gst_percent', Number(val))}
                            >
                              <SelectTrigger className="w-full h-10 border border-slate-200 text-xs font-bold shadow-sm">
                                <SelectValue placeholder="GST" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                {[0, 5, 12, 18, 28].map(p => (
                                  <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <Input 
                              type="number" 
                              min="0"
                              value={item.amount === 0 ? '' : item.amount} 
                              onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                              className="h-10 text-right font-mono font-black text-slate-900 bg-slate-50"
                            />
                            {item.gst_amount > 0 && (
                               <div className="text-[10px] text-right font-bold text-slate-400 mt-1">Incl. ₹{Number(item.gst_amount).toLocaleString()} GST</div>
                             )}
                          </td>
                          <td className="p-4 text-center">
                             <Button onClick={() => removeItem(idx)} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full">
                               <Trash className="w-3.5 h-3.5" />
                             </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Order Remarks</label>
                  <textarea 
                    className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    value={formData.remarks}
                    maxLength={50}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    placeholder="Specific instructions for vendor..."
                  />
               </div>
               <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col items-center md:items-end justify-center text-center md:text-right">
                  <div className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                    <Checkbox
                      id="po-round-off-checkbox"
                      checked={formData.is_round_off}
                      onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_round_off: !!checked })}
                      className="border-primary data-[state=checked]:bg-primary"
                    />
                    <label htmlFor="po-round-off-checkbox" className="text-[10px] font-black text-primary uppercase tracking-widest cursor-pointer select-none">
                      Round Off Final Amount
                    </label>
                  </div>
                  
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total Order Value</p>
                  {(() => {
                    const subTotalVal = formData.items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                    const displayTotalVal = formData.is_round_off ? Math.round(subTotalVal) : subTotalVal;
                    const roundOffDifference = formData.is_round_off ? (Math.round(subTotalVal) - subTotalVal) : 0;
                    return (
                      <>
                        <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tighter">₹ {displayTotalVal.toLocaleString()}</h2>
                        {formData.is_round_off && roundOffDifference !== 0 && (
                          <div className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                            <span>Round Off:</span>
                            <span className="font-mono">₹{roundOffDifference > 0 ? `+${roundOffDifference.toFixed(2)}` : roundOffDifference.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter font-heading">Includes GST Charges</p>
               </div>
            </div>
 
            <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3">
              <Button onClick={() => setShowForm(false)} variant="ghost" className="w-full sm:w-auto px-8 h-11 rounded-full text-slate-500 text-sm font-bold transition-all">
                Cancel Order
              </Button>
              <Button 
                onClick={saveOrder} 
                loading={submitting}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg shadow-primary/20 flex items-center justify-center font-bold transition-all transform active:scale-95"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update PO' : 'Release PO'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Procurement History"
          description="Release and track purchase orders with current stock visibility."
          headers={['PO Details', 'Supplier Partner', 'Total Items', 'Order Value', 'Status', 'Action']}
          data={orders}
          loading={loading}
          searchFields={['order_number', 'suppliers.supplier_name']}
          renderRow={(o: any) => (
            <tr key={o.id} className="hover:bg-primary/5 transition-all group border-b border-slate-50 last:border-none">
              <td className="px-6 py-4">
                <div className="font-black text-slate-800 text-[13px]">{o.order_number}</div>
                <div className="text-[10px] text-muted-foreground flex items-center font-bold mt-0.5">
                  <Calendar className="w-2.5 h-2.5 mr-1" /> {new Date(o.order_date).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4">
                 <div className="font-bold text-slate-700">{o.supplier_master?.supplier_name}</div>
              </td>
              <td className="px-6 py-4">
                 <div className="text-sm font-black text-primary">{o.rm_order_items?.length || 0} {o.rm_order_items?.length === 1 ? 'Item' : 'Items'}</div>
              </td>
              <td className="px-6 py-4">
                 <div className="font-black text-slate-900 tracking-tight">₹ {Number(o.total_amount).toLocaleString()}</div>
                 {Number(o.round_off || 0) !== 0 && (
                   <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                     Round Off: {Number(o.round_off) > 0 ? `+₹${Number(o.round_off).toFixed(2)}` : `-₹${Math.abs(Number(o.round_off)).toFixed(2)}`}
                   </div>
                 )}
              </td>
              <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest ${
                   o.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                   o.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                   'bg-amber-100 text-amber-700 border border-amber-200'
                 }`}>
                   <span className="hidden md:inline">{o.status}</span>
                   <span className="md:hidden">{o.status.charAt(0)}</span>
                 </span>
              </td>
              <td className="md:px-2 py-4 text-right space-x-1">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(o)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(o.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </td>
            </tr>
          )}
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
                        const val = e.target.value;
                        setNewSupplier({...newSupplier, supplier_address: {...newSupplier.supplier_address, zip_code: val}});
                        if (val && !/^\d{6}$/.test(val)) {
                          setVendorZipError('Must be 6 digits');
                        } else {
                          setVendorZipError('');
                        }
                      }} 
                      className={vendorZipError ? 'border-amber-400 bg-amber-50' : ''}
                      placeholder="Zip Code" 
                    />
                    {vendorZipError && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1">{vendorZipError}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Country</label>
                    <Input value={newSupplier.supplier_address.country} readOnly className="bg-slate-50 cursor-not-allowed text-slate-500 font-bold" />
                  </div>
                </div>
              </div>

              {/* Billing Address Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                   <div className="flex items-center space-x-2 text-primary">
                     <Building2 className="w-4 h-4" />
                     <h3 className="text-xs font-black uppercase tracking-widest">Billing Address</h3>
                   </div>
                   <button 
                     type="button" 
                     onClick={copyOfficialAddressForNewSupplier} 
                     className="text-[10px] font-black text-secondary hover:underline flex items-center gap-1 uppercase tracking-tighter"
                   >
                     <Copy className="w-3.5 h-3.5" /> Same as Official
                   </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Street / Landmark</label>
                    <Input value={newSupplier.billing_address.street} onChange={(e) => setNewSupplier({...newSupplier, billing_address: {...newSupplier.billing_address, street: e.target.value}})} placeholder="123 Industrial Area..." />
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
                        const val = e.target.value;
                        setNewSupplier({...newSupplier, billing_address: {...newSupplier.billing_address, zip_code: val}});
                        if (val && !/^\d{6}$/.test(val)) {
                          setVendorBillingZipError('Must be 6 digits');
                        } else {
                          setVendorBillingZipError('');
                        }
                      }} 
                      className={vendorBillingZipError ? 'border-amber-400 bg-amber-50' : ''}
                      placeholder="Zip Code" 
                    />
                    {vendorBillingZipError && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1">{vendorBillingZipError}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Country</label>
                    <Input value={newSupplier.billing_address.country} readOnly className="bg-slate-50 cursor-not-allowed text-slate-500 font-bold" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Product Supplied & Supplied Raw Materials Checkboxes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-slate-100 pt-4">
              <div className="space-y-1 lg:col-span-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Supplied Raw Materials (Optional)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {materials.map((m: any) => (
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
