'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Plus, Search, Edit, Trash2, X, Save, 
  Settings, Calendar, Hash, User, 
  Scissors, Activity, Layers, ArrowRightLeft, Clock, FileText, Trash, Package
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const CONVERSION_API = `${API_BASE}/api/maxtron/production/conversions`;
const BATCH_API = `${API_BASE}/api/maxtron/production/batches`;
const EMPLOYEES_API = `${API_BASE}/api/maxtron/employees`;
const PRODUCTS_API = `${API_BASE}/api/maxtron/products`;

export default function CuttingSealingPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('prod_cutting_view', 'create');
  const canEdit = hasPermission('prod_cutting_view', 'edit');
  const canDelete = hasPermission('prod_cutting_view', 'delete');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [conversions, setConversions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { success, error, info } = useToast();
  const { confirm } = useConfirm();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    batch_id: '',
    input_qty: 0,
    operator_id: '',
    shift: 'General',
    date: new Date().toISOString().split('T')[0],
    remarks: '',
    company_id: '',
    items: [] as { product_id: string; quantity: number }[]
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

      const [batchRes, empRes, prodRes] = await Promise.all([
        fetch(`${BATCH_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${EMPLOYEES_API}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${PRODUCTS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const batchData = await batchRes.json();
      const empData = await empRes.json();
      const prodData = await prodRes.json();
      
      if (batchData.success) setBatches(batchData.data);
      if (prodData.success) setFinishedProducts(prodData.data);
      if (empData.success) {
        // Filter by "Cutting & Sealing" category if it exists, otherwise show all production staff
        const categoryEmp = empData.data.filter((e: any) => 
            e.companies?.company_name?.toUpperCase() === activeTenant &&
            (e.employee_categories?.category_name === 'Cutting & Sealing' || e.user_types?.name === 'production')
        );
        setEmployees(categoryEmp.length > 0 ? categoryEmp : empData.data.filter((e: any) => e.companies?.company_name?.toUpperCase() === activeTenant));
      }

      fetchConversions(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversions = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${CONVERSION_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConversions(data.data);
      }
    } catch (err) {
      console.error('Error fetching conversions:', err);
    }
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setFormData({
      batch_id: c.batch_id,
      input_qty: parseFloat(c.input_qty) || 0,
      operator_id: c.operator_id,
      shift: c.shift || 'General',
      date: c.date?.split('T')[0] || new Date().toISOString().split('T')[0],
      remarks: c.remarks || '',
      company_id: c.company_id,
      items: c.items?.map((it: any) => ({
          product_id: it.product_id,
          quantity: parseFloat(it.quantity) || 0
      })) || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this cutting & sealing entry? This action cannot be undone.',
      type: 'danger'
    });

    if (!isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${CONVERSION_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Entry deleted successfully');
        fetchConversions();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error deleting entry');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    let newValue = value;

    if (field === 'quantity') {
        const otherItemsTotal = formData.items.reduce((sum, it, i) => i === index ? sum : sum + it.quantity, 0);
        const maxAllowed = Math.max(0, formData.input_qty - otherItemsTotal);
        
        if (value > maxAllowed) {
            newValue = maxAllowed;
            info(`Quantity capped at ${maxAllowed.toFixed(2)} Kg to match total input.`);
        }
    }

    newItems[index] = { ...newItems[index], [field]: newValue };
    setFormData({ ...formData, items: newItems });
  };

  const saveConversion = async () => {
    if (!formData.batch_id || !formData.operator_id) {
      error('Please select batch and operator.');
      return;
    }
    if (formData.items.length === 0) {
      error('Please add at least one finished product entry.');
      return;
    }

    const totalOutput = formData.items.reduce((sum, it) => sum + it.quantity, 0);
    
    if (totalOutput > formData.input_qty) {
        error(`Total output (${totalOutput.toFixed(2)} Kg) exceeds input quantity (${formData.input_qty.toFixed(2)} Kg).`);
        return;
    }

    const wastage = formData.input_qty - totalOutput;

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${CONVERSION_API}/${editingId}` : CONVERSION_API;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
           ...formData,
           output_qty: totalOutput,
           wastage_qty: wastage
        })
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Cutting & Sealing entry updated' : 'Cutting & Sealing entry recorded');
        setShowForm(false);
        setEditingId(null);
        resetForm();
        fetchConversions();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error saving conversion');
    }
  };

  const resetForm = () => {
    setFormData({
      batch_id: '',
      input_qty: 0,
      operator_id: '',
      shift: 'General',
      date: new Date().toISOString().split('T')[0],
      remarks: '',
      company_id: currentCompanyId,
      items: []
    });
  };

  const filteredConversions = conversions.filter(c => 
    c.conversion_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.production_batches?.batch_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutput = formData.items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Scissors className="w-8 h-8 md:w-10 md:h-10 text-primary shrink-0" /> <span className="truncate text-primary">Cutting & Sealing</span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">Record and manage secondary processing output.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {!showForm && canCreate && (
            <Button 
                onClick={() => {
                   setEditingId(null);
                   resetForm();
                   setShowForm(true);
                }} 
                className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg shadow-primary/20 h-10 md:h-11 transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" /> New Cutting Entry
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-500 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10 py-4">
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <Scissors className="w-5 h-5" /> {editingId ? 'Edit Processing Job' : 'Processing Job Entry'}
            </CardTitle>
            <CardDescription className="text-primary/70">{editingId ? 'Update details for the existing cutting & sealing job.' : 'Secondary conversion from extrusion batches to finished products.'}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Hash className="w-4 h-4 text-primary" /> Cutting No</label>
                <Input value="AUTO-GENERATED" disabled className="bg-slate-50 font-mono text-xs h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Calendar className="w-4 h-4 text-primary" /> Date of Job</label>
                <Input type="date" className="h-10" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Clock className="w-4 h-4 text-primary" /> Production Shift</label>
                <Select value={formData.shift} onValueChange={(val) => setFormData({ ...formData, shift: val })}>
                  <SelectTrigger className="h-10 w-full border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select Shift" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-input">
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Day">Day</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><User className="w-4 h-4 text-primary" /> Operator</label>
                <Select value={formData.operator_id} onValueChange={(val) => setFormData({ ...formData, operator_id: val })}>
                  <SelectTrigger className="h-10 w-full border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select Operator" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-input">
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Activity className="w-4 h-4 text-primary" /> Base Production Batch (Input Source)</label>
                <Select 
                  value={formData.batch_id} 
                  onValueChange={(val) => {
                    const batch = batches.find(b => b.id === val);
                    setFormData({ 
                        ...formData, 
                        batch_id: val,
                        input_qty: batch ? (parseFloat(batch.extrusion_output_qty) || 0) : 0 
                    });
                  }}
                >
                  <SelectTrigger className="h-10 w-full border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select Base Batch" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-input">
                    {batches.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.batch_number} - {b.finished_products?.product_name || 'N/A'} ({b.extrusion_output_qty} Kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Layers className="w-4 h-4 text-primary" /> Input Qty (Kg)</label>
                <Input type="number" readOnly value={formData.input_qty} className="bg-slate-50 font-bold h-10" />
              </div>
            </div>

            {/* Line Items Sections */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <Box className="w-5 h-5" /> Finished Product Details
                </h3>
                <Button variant="outline" size="sm" onClick={addItem} className="text-primary border-primary/20 hover:bg-primary/5">
                    <Plus className="w-4 h-4 mr-1" />  <span className="hidden md:block">Add Product</span>
                </Button>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 text-slate-400">
                    No products added. Click "Add Product" to start.
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 bg-white border rounded-lg shadow-sm animate-in fade-in slide-in-from-left duration-300">
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Product</label>
                            <Select value={item.product_id} onValueChange={(val) => handleItemChange(idx, 'product_id', val)}>
                                <SelectTrigger className="h-9 w-full border-input bg-background shadow-sm">
                                    <SelectValue placeholder="Select Product Produced" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-input">
                                    {finishedProducts.map(fp => (
                                        <SelectItem key={fp.id} value={fp.id}>{fp.product_name} ({fp.size}, {fp.color})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-48 space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Qty Sealed (Kg)</label>
                            <Input 
                                type="number" 
                                min={0}
                                className="h-9"
                                value={item.quantity === 0 ? '' : item.quantity} 
                                onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)} 
                            />
                        </div>
                        <div className="flex items-end pb-1">
                            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-rose-500 hover:bg-rose-50">
                                <Trash className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary and Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t font-sans">
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><FileText className="w-4 h-4 text-primary" /> Remarks</label>
                    <textarea 
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Any specific observations or wastage details..."
                        value={formData.remarks}
                        onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                    />
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Total Input Qty</span>
                        <span className="font-bold">{formData.input_qty.toFixed(2)} Kg</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Total Output (Cut & Sealed)</span>
                        <span className="font-bold text-primary">{totalOutput.toFixed(2)} Kg</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-slate-600 font-bold uppercase text-xs">Total Wastage</span>
                        <span className={`font-black text-xl ${(formData.input_qty - totalOutput) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {(formData.input_qty - totalOutput).toFixed(2)} <span className="text-xs">Kg</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row justify-end gap-3 pt-6 border-t px-4 md:px-0">
              <Button 
                variant="outline" 
                onClick={() => { setShowForm(false); resetForm(); }} 
                className="flex-1 md:flex-none px-8 rounded-full h-12 order-2 md:order-1"
              >
                Cancel Entry
              </Button>
              <Button 
                onClick={saveConversion} 
                className="flex-1 md:flex-none bg-primary hover:bg-primary/95 text-white px-10 rounded-full shadow-lg shadow-primary/20 h-12 transition-all hover:scale-105 active:scale-95 order-1 md:order-2"
              >
                <Save className="w-4 h-4 mr-2" /> Save Cutting Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Conversion Log"
          description="Detailed history of processed quantities and cutting jobs."
          headers={['Job No', 'Date', 'Batch', 'Items Produced', 'Input', 'Output', 'Wastage', 'Operator', 'Actions']}
          data={conversions}
          loading={loading}
          searchFields={['conversion_number', 'production_batches.batch_number']}
          searchPlaceholder="Search job or batch no..."
          renderRow={(c: any) => (
            <tr key={c.id} className="hover:bg-primary/5 border-b last:border-none transition-all group">
              <td className="px-6 py-4 font-mono font-bold text-primary text-xs">
                  {c.conversion_number}
                  <div className="text-[9px] text-slate-400 font-normal uppercase">{c.shift}</div>
              </td>
              <td className="px-6 py-4 text-xs">{new Date(c.date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-mono text-xs">{c.production_batches?.batch_number}</td>
              <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                      {c.items?.map((it: any, i: number) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                              {it.finished_products?.product_name}: {it.quantity}Kg
                          </span>
                      )) || <span className="text-slate-300 text-xs">No items</span>}
                  </div>
              </td>
              <td className="px-6 py-4 text-xs">{c.input_qty}</td>
              <td className="px-6 py-4 font-bold text-primary">{c.output_qty}</td>
              <td className="px-6 py-4 text-rose-600 font-bold">{c.wastage_qty}</td>
              <td className="px-6 py-4 text-xs font-medium text-slate-600">{c.operator?.name}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {canEdit && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(c)}
                      className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(c.id)}
                      className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}

// Helper icons missing or renamed
const Box = Package;
