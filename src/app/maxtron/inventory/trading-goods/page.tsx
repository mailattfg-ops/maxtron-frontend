'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Package, Plus, Search, Edit, Trash2, X, Save, 
  Truck, Calendar, Hash, User, AlertCircle, 
  Download, FileText, CheckCircle2, TrendingUp,
  DollarSign, Layers, ArrowDownToLine
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
import { exportToExcel } from '@/utils/export';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const TRADING_API = `${API_BASE}/api/maxtron/inventory/trading-goods`;
const PRODUCT_API = `${API_BASE}/api/maxtron/products`;
const SUPPLIER_API = `${API_BASE}/api/maxtron/suppliers`;

export default function TradingGoodsInwardPage() {
  const { hasPermission } = usePermission();
  const canView = hasPermission('inv_trading_view', 'view') || hasPermission('inv_purchase_view', 'view') || hasPermission('inv_view', 'view');
  const canCreate = hasPermission('inv_trading_view', 'create') || hasPermission('inv_purchase_view', 'create') || hasPermission('inv_view', 'create');
  const canEdit = hasPermission('inv_trading_view', 'edit') || hasPermission('inv_purchase_view', 'edit') || hasPermission('inv_view', 'edit');
  const canDelete = hasPermission('inv_trading_view', 'delete') || hasPermission('inv_purchase_view', 'delete') || hasPermission('inv_view', 'delete');

  const [showForm, setShowForm] = useState(false);
  const [inwardList, setInwardList] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');

  const { success, error, info } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const formRef = useRef<HTMLDivElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        referenceInputRef.current?.focus();
      }, 100);
    }
  }, [showForm]);

  const [formData, setFormData] = useState({
    inward_number: '',
    inward_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    supplier_id: '',
    product_id: '',
    quantity: '' as number | string,
    unit: 'PCS',
    rate: '' as number | string,
    gst_percent: 18 as number,
    gst_amount: 0 as number,
    total_amount: 0 as number,
    remarks: '',
    company_id: ''
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
      if (compData.success && Array.isArray(compData.data)) {
        const activeCo = compData.data.find((c: any) => c.company_name?.toUpperCase().includes(activeTenant));
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
          setFormData(prev => ({ ...prev, company_id: coId }));
        }
      }

      const [prodRes, supRes] = await Promise.all([
        fetch(`${PRODUCT_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${SUPPLIER_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const prodData = await prodRes.json();
      const supData = await supRes.json();
      
      if (prodData.success) setProducts(prodData.data || []);
      if (supData.success) setSuppliers(supData.data || []);

      await fetchInwardList(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInwardList = async (coId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${TRADING_API}?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setInwardList(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching trading goods inward:', err);
    }
  };

  const getNextNumber = async (coId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${TRADING_API}/next-number?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.nextNumber) {
        return data.nextNumber;
      }
    } catch (e) {
      console.error('Error fetching next number:', e);
    }
    const year = new Date().getFullYear();
    return `TRD-${year}-${String(inwardList.length + 1).padStart(4, '0')}`;
  };

  const handleOpenAddForm = async () => {
    const nextNum = await getNextNumber(currentCompanyId);
    setEditingId(null);
    setFormData({
      inward_number: nextNum,
      inward_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      supplier_id: '',
      product_id: '',
      quantity: '',
      unit: 'PCS',
      rate: '',
      gst_percent: 18,
      gst_amount: 0,
      total_amount: 0,
      remarks: '',
      company_id: currentCompanyId
    });
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      inward_number: item.inward_number || '',
      inward_date: item.inward_date ? item.inward_date.split('T')[0] : new Date().toISOString().split('T')[0],
      reference_no: item.reference_no || '',
      supplier_id: item.supplier_id || '',
      product_id: item.product_id || '',
      quantity: item.quantity || '',
      unit: item.unit || 'PCS',
      rate: item.rate || '',
      gst_percent: Number(item.gst_percent) || 0,
      gst_amount: Number(item.gst_amount) || 0,
      total_amount: Number(item.total_amount) || 0,
      remarks: item.remarks || '',
      company_id: item.company_id || currentCompanyId
    });
    setShowForm(true);
  };

  const calculateAmounts = (qty: any, rate: any, gstPercent: any) => {
    const q = Number(qty) || 0;
    const r = Number(rate) || 0;
    const subtotal = q * r;
    const gstPct = Number(gstPercent) || 0;
    const gstAmt = Number((subtotal * (gstPct / 100)).toFixed(2));
    const total = Number((subtotal + gstAmt).toFixed(2));
    return { gst_amount: gstAmt, total_amount: total };
  };

  const handleQuantityChange = (val: string) => {
    const num = val === '' ? '' : Math.max(0, Number(val));
    const { gst_amount, total_amount } = calculateAmounts(num, formData.rate, formData.gst_percent);
    setFormData(prev => ({
      ...prev,
      quantity: num,
      gst_amount,
      total_amount
    }));
  };

  const handleRateChange = (val: string) => {
    const num = val === '' ? '' : Math.max(0, Number(val));
    const { gst_amount, total_amount } = calculateAmounts(formData.quantity, num, formData.gst_percent);
    setFormData(prev => ({
      ...prev,
      rate: num,
      gst_amount,
      total_amount
    }));
  };

  const handleGstPercentChange = (val: string) => {
    const pct = Number(val);
    const { gst_amount, total_amount } = calculateAmounts(formData.quantity, formData.rate, pct);
    setFormData(prev => ({
      ...prev,
      gst_percent: pct,
      gst_amount,
      total_amount
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id) {
      error('Please select a Finished Product');
      return;
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      error('Please enter a valid inward quantity greater than 0');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const url = editingId ? `${TRADING_API}/${editingId}` : TRADING_API;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          company_id: currentCompanyId
        })
      });

      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Trading stock inward record updated successfully!' : 'Trading goods stock inwarded successfully!');
        setShowForm(false);
        setEditingId(null);
        fetchInwardList(currentCompanyId);
      } else {
        error(data.message || 'Failed to save record');
      }
    } catch (err: any) {
      console.error('Error saving trading inward:', err);
      error(err.message || 'An error occurred while saving');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Inward Record',
      message: 'Are you sure you want to delete this trading stock inward record? Finished goods stock balance will be adjusted accordingly.',
      type: 'danger',
      confirmLabel: 'Delete Record'
    });
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${TRADING_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Record deleted successfully');
        fetchInwardList(currentCompanyId);
      } else {
        error(data.message || 'Failed to delete record');
      }
    } catch (err) {
      console.error('Error deleting record:', err);
      error('Failed to delete record');
    }
  };

  const handleDownloadExcel = async () => {
    if (filteredList.length === 0) {
      info('No trading stock entries available to export.');
      return;
    }

    const headers = [
      'Inward Date',
      'Inward Number',
      'Reference / Invoice No',
      'Supplier Name',
      'Product Code',
      'Product Name',
      'Size',
      'Color',
      'Quantity',
      'Unit',
      'Rate (₹)',
      'GST %',
      'GST Amount (₹)',
      'Total Amount (₹)',
      'Remarks'
    ];

    const rows = filteredList.map(item => [
      item.inward_date || '',
      item.inward_number || '',
      item.reference_no || '',
      item.supplier_master?.supplier_name || 'N/A',
      item.finished_products?.product_code || '',
      item.finished_products?.product_name || '',
      item.finished_products?.size || '',
      item.finished_products?.color || '',
      Number(item.quantity || 0),
      item.unit || 'PCS',
      Number(item.rate || 0),
      Number(item.gst_percent || 0),
      Number(item.gst_amount || 0),
      Number(item.total_amount || 0),
      item.remarks || ''
    ]);

    await exportToExcel({
      headers,
      rows,
      filename: `trading_goods_inward_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Trading Inward Stock'
    });
    success('Trading stock report exported successfully!');
  };

  const filteredList = inwardList.filter(item => {
    const matchesSearch = 
      (item.inward_number?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.reference_no?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.finished_products?.product_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.finished_products?.product_code?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.supplier_master?.supplier_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesSupplier = supplierFilter === 'ALL' || item.supplier_id === supplierFilter;
    const matchesProduct = productFilter === 'ALL' || item.product_id === productFilter;

    return matchesSearch && matchesSupplier && matchesProduct;
  });

  // Calculate Metrics
  const totalInwardQty = inwardList.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
  const totalValuation = inwardList.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  const uniqueProductsCount = new Set(inwardList.map(i => i.product_id)).size;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-blue-100 text-blue-800 rounded-full border border-blue-200">
              Inventory &amp; Procurement
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Trading Finished Goods Inward</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Record and manage stock additions from trading finished goods to augment finished inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleDownloadExcel}
            className="rounded-full border-slate-200 font-bold text-xs h-10 px-4 hover:bg-slate-50"
          >
            <Download className="w-4 h-4 mr-2 text-slate-600" /> Export Excel
          </Button>

          {canCreate && (
            <Button
              onClick={handleOpenAddForm}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-5 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Trading Stock
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inward Entries</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{inwardList.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Stock Inwarded</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{totalInwardQty.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Inward Value</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₹{totalValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Products Handled</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{uniqueProductsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Form Modal */}
      {showForm && (
        <Card ref={formRef} className="border-blue-200 bg-blue-50/20 shadow-md scroll-mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader className="pb-4 border-b border-blue-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-blue-600" />
                {editingId ? 'Edit Trading Stock Inward' : 'New Trading Goods Stock Inward'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium">
                Add stock directly to finished products inventory from trading purchases.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="rounded-full text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Inward Number */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" /> Inward Number *
                  </label>
                  <Input
                    required
                    value={formData.inward_number}
                    onChange={(e) => setFormData({ ...formData, inward_number: e.target.value })}
                    className="font-bold text-slate-800 bg-white"
                    placeholder="TRD-2026-0001"
                  />
                </div>

                {/* Inward Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Inward Date *
                  </label>
                  <Input
                    type="date"
                    required
                    value={formData.inward_date}
                    onChange={(e) => setFormData({ ...formData, inward_date: e.target.value })}
                    className="font-bold text-slate-800 bg-white"
                  />
                </div>

                {/* Reference Invoice No */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Supplier Invoice / Ref No
                  </label>
                  <Input
                    ref={referenceInputRef}
                    value={formData.reference_no}
                    onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                    className="bg-white"
                    placeholder="e.g. INV-8841 / DC-09"
                  />
                </div>

                {/* Supplier / Vendor */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-slate-400" /> Supplier / Vendor
                  </label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(val) => setFormData({ ...formData, supplier_id: val })}
                  >
                    <SelectTrigger className="bg-white font-medium">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.supplier_name} {s.supplier_code ? `(${s.supplier_code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product Selection & Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-slate-200">
                {/* Finished Product */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-blue-600" /> Finished Product *
                  </label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(val) => setFormData({ ...formData, product_id: val })}
                  >
                    <SelectTrigger className="bg-white font-bold">
                      <SelectValue placeholder="Select Finished Product..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.product_name} ({p.product_code}) {p.size ? ` - ${p.size}` : ''} {p.color ? `[${p.color}]` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Inward Quantity *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="font-bold text-emerald-700 bg-white"
                  />
                </div>

                {/* Unit */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Unit
                  </label>
                  <Select
                    value={formData.unit}
                    onValueChange={(val) => setFormData({ ...formData, unit: val })}
                  >
                    <SelectTrigger className="bg-white font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="PCS">PCS (Pieces)</SelectItem>
                      <SelectItem value="KG">KG (Kilograms)</SelectItem>
                      <SelectItem value="BOX">BOX (Boxes)</SelectItem>
                      <SelectItem value="BUNDLE">BUNDLE (Bundles)</SelectItem>
                      <SelectItem value="ROLL">ROLL (Rolls)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing & Tax */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Rate */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Unit Purchase Rate (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={formData.rate}
                    onChange={(e) => handleRateChange(e.target.value)}
                    className="bg-white font-medium"
                  />
                </div>

                {/* GST % */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    GST Rate (%)
                  </label>
                  <Select
                    value={String(formData.gst_percent)}
                    onValueChange={handleGstPercentChange}
                  >
                    <SelectTrigger className="bg-white font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="0">0% (Nil / Exempt)</SelectItem>
                      <SelectItem value="5">5% GST</SelectItem>
                      <SelectItem value="12">12% GST</SelectItem>
                      <SelectItem value="18">18% GST</SelectItem>
                      <SelectItem value="28">28% GST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* GST Amount (Calculated) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    GST Amount (₹)
                  </label>
                  <Input
                    readOnly
                    disabled
                    value={formData.gst_amount.toFixed(2)}
                    className="bg-slate-100 font-mono text-slate-600"
                  />
                </div>

                {/* Total Amount (Calculated) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Total Inward Value (₹)
                  </label>
                  <Input
                    readOnly
                    disabled
                    value={formData.total_amount.toFixed(2)}
                    className="bg-slate-100 font-bold font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Remarks / Notes
                </label>
                <Input
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Additional notes about this trading batch, vendor quality, etc."
                  className="bg-white"
                />
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="rounded-full px-6 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-sm"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Trading Stock' : 'Add to Finished Stock'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Inward No, Ref No, Product Name, Code, Supplier..."
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Supplier Filter */}
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-44 bg-white text-xs font-semibold">
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent className="bg-white text-xs">
              <SelectItem value="ALL">All Suppliers</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Product Filter */}
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-44 bg-white text-xs font-semibold">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent className="bg-white text-xs">
              <SelectItem value="ALL">All Products</SelectItem>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
        <TableView
          title="Trading Goods Inward Records"
          description="Log of finished products received from trading suppliers."
          headers={['Inward Details', 'Supplier / Vendor', 'Finished Product', 'Inward Quantity', 'Rate / Total', 'Actions']}
          data={filteredList}
          loading={loading}
          searchFields={['inward_number', 'reference_no']}
          rightAlignedColumns={[5]}
          renderRow={(item: any) => (
            <tr key={item.id} className="hover:bg-primary/5 transition-all group border-b border-primary/5 last:border-none">
              <td className="px-6 py-4">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-blue-600" />
                  {item.inward_number}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {item.inward_date}
                </div>
                {item.reference_no && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ref: {item.reference_no}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="font-semibold text-slate-800">
                  {item.supplier_master?.supplier_name || <span className="text-slate-400 italic">Direct / Trading</span>}
                </div>
                {item.supplier_master?.supplier_code && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.supplier_master.supplier_code}
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="font-bold text-slate-900">
                  {item.finished_products?.product_name || 'N/A'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                    {item.finished_products?.product_code || 'PROD'}
                  </span>
                  {item.finished_products?.size && (
                    <span className="text-[10px] font-medium text-slate-500">
                      {item.finished_products.size}
                    </span>
                  )}
                  {item.finished_products?.color && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {item.finished_products.color}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-left font-bold text-emerald-700">
                  <span className="text-sm">+{Number(item.quantity || 0).toLocaleString()}</span>
                  <span className="text-[10px] font-medium text-slate-500 ml-1 uppercase">{item.unit || 'PCS'}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div>
                  <div className="font-bold text-slate-900">
                    ₹{Number(item.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    @ ₹{Number(item.rate || 0).toFixed(2)} / {item.unit || 'pc'}
                    {Number(item.gst_percent || 0) > 0 && ` (${item.gst_percent}% GST)`}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
}
