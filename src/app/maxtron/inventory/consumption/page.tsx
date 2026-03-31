'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Flame, Plus, Search, Edit, Trash2, X, Save, 
  Settings, Calendar, Hash, User, 
  Download, FileText, Activity, Layers, Zap, CheckCircle
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const CONSUMPTION_API = `${API_BASE}/api/maxtron/consumptions`;
const STOCK_API = `${API_BASE}/api/maxtron/inventory/stock-summary`;
const EMPLOYEES_API = `${API_BASE}/api/maxtron/employees`;

export default function ConsumptionPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('inv_consumption_view', 'create');
  const canEdit = hasPermission('inv_consumption_view', 'edit');
  const canDelete = hasPermission('inv_consumption_view', 'delete');
  const [showForm, setShowForm] = useState(false);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    consumption_slip_no: '',
    consumption_date: new Date().toISOString().split('T')[0],
    rm_id: '',
    quantity_used: 0,
    process_type: 'Extrusion',
    machine_no: '',
    issued_by: '',
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
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
          setFormData(prev => ({ ...prev, company_id: coId }));
        }
      }

      const [stockRes, empRes] = await Promise.all([
        fetch(`${STOCK_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${EMPLOYEES_API}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const stockData = await stockRes.json();
      const empData = await empRes.json();
      
      if (stockData.success) setMaterials(stockData.data);
      if (empData.success) {
        setEmployees(empData.data.filter((e: any) => e.companies?.company_name?.toUpperCase() === activeTenant));
      }

      fetchConsumptions(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sync slip number if consumptions list updates while form is open (and not editing)
    if (showForm && !editingId && consumptions.length > 0) {
       const currentNo = formData.consumption_slip_no;
       if (!currentNo || currentNo === 'CSN-000001' || currentNo === 'GENERATING...') {
          resetForm(consumptions);
       }
    }
  }, [consumptions, showForm, editingId]);

  const fetchConsumptions = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${CONSUMPTION_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConsumptions(data.data);
      }
    } catch (err) {
      console.error('Error fetching consumptions:', err);
    }
  };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        // Material & Quantity
        if (!formData.rm_id) newErrors.rm_id = 'Select material';
        if (formData.quantity_used <= 0) newErrors.quantity_used = 'Enter quantity > 0';

        // Date validation: prevent future dates
        const today = new Date().toISOString().split('T')[0];
        if (formData.consumption_date > today) {
            newErrors.consumption_date = 'Future dates not allowed';
        }

        // Machine validation: Alphanumeric, hyphen, slash
        const machineRegex = /^[A-Z0-9\-/]+$/i;
        if (formData.machine_no && !machineRegex.test(formData.machine_no)) {
            newErrors.machine_no = 'Invalid (A-Z, 0-9, -, / only)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const saveConsumption = async () => {
        if (!validateForm()) {
            error('Please correct the highlighted errors.');
            return;
        }

        // Stock check
        const selectedMaterial = materials.find(m => m.id === formData.rm_id);
        const availableStock = Number(selectedMaterial?.balance || 0);
        
        // If editing, we should account for the original quantity in the "budget"
        let limit = availableStock;
        if (editingId) {
            const originalRecord = consumptions.find(c => c.id === editingId);
            limit += Number(originalRecord?.quantity_used || 0);
        }

        if (formData.quantity_used > limit) {
          setErrors(prev => ({ ...prev, quantity_used: `Max: ${limit}` }));
          error(`Insufficient stock. Current balance: ${availableStock} ${selectedMaterial?.unit_type || ''}.`);
          return;
        }

        const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${CONSUMPTION_API}/${editingId}` : CONSUMPTION_API;

    setSubmitting(true);
    const payload: any = { ...formData };
    if (!payload.issued_by) delete payload.issued_by;
    if (!payload.machine_no) delete payload.machine_no;
    if (!payload.remarks) delete payload.remarks;

    try {
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
        success(editingId ? 'Slip updated!' : 'Material issued for production!');
        setShowForm(false);
        setEditingId(null);
        await fetchConsumptions();
        // Since resetForm reads from the consumptions state which is updated asynchronously,
        // it's safer to just rely on the click handler of the 'Issue Material' button to call resetForm() dynamically.

      } else {
        error(data.message || 'Error occurred');
      }
    } catch (err) {
      error('Network failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = (latestConsumptions: any[] = consumptions) => {
    // If we have no data and it's still loading, show a placeholder
    if (loading && latestConsumptions.length === 0) {
      setFormData(prev => ({
        ...prev,
        consumption_slip_no: 'GENERATING...'
      }));
      return;
    }

    let nextSlipNo = 'CSN-000001';
    
    // Filter and find the actual maximum number using a case-insensitive regex
    const validNumbers = latestConsumptions
      .filter(c => c.consumption_slip_no && /^CSN-\d+$/i.test(c.consumption_slip_no))
      .map(c => {
        const parts = c.consumption_slip_no.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    if (validNumbers.length > 0) {
      const max = Math.max(...validNumbers);
      nextSlipNo = `CSN-${String(max + 1).padStart(6, '0')}`;
    }

    setFormData({
      consumption_slip_no: nextSlipNo,
      consumption_date: new Date().toISOString().split('T')[0],
      rm_id: '',
      quantity_used: 0,
      process_type: 'Extrusion',
      machine_no: '',
      issued_by: '',
      remarks: '',
      company_id: currentCompanyId
    });
    setErrors({});
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      consumption_slip_no: rec.consumption_slip_no,
      consumption_date: rec.consumption_date.split('T')[0],
      rm_id: rec.rm_id,
      quantity_used: Number(rec.quantity_used),
      process_type: rec.process_type || 'Extrusion',
      machine_no: rec.machine_no || '',
      issued_by: rec.issued_by || '',
      remarks: rec.remarks || '',
      company_id: rec.company_id
    });
    setErrors({});
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Delete this consumption record? This will adjust the stock history.',
      type: 'danger'
    });
    if (!isConfirmed) return;
    
    const token = localStorage.getItem('token');
    setSubmitting(true);
    try {
      const res = await fetch(`${CONSUMPTION_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Record removed.');
        fetchConsumptions();
      } else {
        const msg = data.error?.toLowerCase();
        if (msg?.includes('foreign key constraint') || msg?.includes('violates')) {
           error('Cannot delete: This consumption record is already linked to a production batch.');
        } else {
           error(data.message || 'Deletion failed.');
        }
      }
    } catch (err) {
      error('Network failure.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Material Consumption</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Issue raw materials to production floor and track floor-side usage.</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
              className="w-full md:w-auto bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg h-10 md:h-11 transition-all font-bold whitespace-nowrap"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Cancel Issue' : 'Issue Material'}
            </Button>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 animate-in slide-in-from-top-4 duration-500">
          <Card className="bg-white border-primary/10 shadow-sm border-t-4 border-t-amber-500">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Slips Issued</p>
                  <h3 className="text-2xl md:text-3xl font-black text-amber-600 mt-1">{consumptions.length}</h3>
                </div>
                <div className="bg-amber-50 p-2 md:p-3 rounded-2xl shrink-0">
                  <Zap className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
 
          <Card className="bg-white border-primary/10 shadow-sm border-t-4 border-t-blue-500">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Volume Consumed</p>
                  <h3 className="text-2xl md:text-3xl font-black text-blue-600 mt-1">
                    {consumptions.reduce((acc, curr) => acc + Number(curr.quantity_used), 0).toLocaleString()} <span className="text-[10px] md:text-xs md:text-sm font-bold opacity-70 uppercase">Units</span>
                  </h3>
                </div>
                <div className="bg-blue-50 p-2 md:p-3 rounded-2xl shrink-0">
                  <Flame className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
 
          <Card className="hidden sm:block lg:block bg-white border-primary/10 shadow-sm border-t-4 border-t-emerald-500">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Processes</p>
                  <h3 className="text-2xl md:text-3xl font-black text-emerald-600 mt-1">
                    {new Set(consumptions.map(c => c.process_type)).size}
                  </h3>
                </div>
                <div className="bg-emerald-50 p-2 md:p-3 rounded-2xl shrink-0">
                  <Activity className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card className="border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl font-bold text-primary flex items-center">
              <Settings className="w-5 h-5 mr-3 text-secondary" />
              {editingId ? 'Edit Consumption Slip' : 'Material Issuance Slip'}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Release raw materials for specific production processes.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Slip Number</label>
                <Input value={formData.consumption_slip_no} readOnly className="h-11 bg-slate-50 font-mono text-sm font-bold border-slate-200" />
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Issue Date</label>
                <Input 
                  type="date"
                  value={formData.consumption_date}
                  onChange={(e) => {
                    setFormData({...formData, consumption_date: e.target.value});
                    if (errors.consumption_date) setErrors(prev => {
                      const next = {...prev};
                      delete next.consumption_date;
                      return next;
                    });
                  }}
                  className={`h-11 font-bold ${errors.consumption_date ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {errors.consumption_date && <p className="text-[10px] font-bold text-destructive ml-1">{errors.consumption_date}</p>}
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Raw Material Link</label>
                <Select value={formData.rm_id} onValueChange={(val) => {
                  setFormData({...formData, rm_id: val});
                  if (errors.rm_id) setErrors(prev => {
                    const next = {...prev};
                    delete next.rm_id;
                    return next;
                  });
                }}>
                  <SelectTrigger className={`w-full h-11 border text-sm font-black shadow-sm ${errors.rm_id ? 'border-destructive' : 'border-slate-200'}`}>
                    <SelectValue placeholder="Select feedstock..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {materials.filter(m => Number(m.balance || 0) > 0 || m.id === formData.rm_id).map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.rm_name} (Stock: {Number(m.balance || 0).toLocaleString()} {m.unit_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.rm_id && <p className="text-[10px] font-bold text-destructive ml-1">{errors.rm_id}</p>}
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Quantity Issued</label>
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.quantity_used === 0 ? '' : formData.quantity_used}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setFormData({...formData, quantity_used: val});
                    if (errors.quantity_used) setErrors(prev => {
                      const next = {...prev};
                      delete next.quantity_used;
                      return next;
                    });
                  }}
                  className={`h-11 text-xl font-black text-primary bg-primary/[0.02] ${errors.quantity_used ? 'border-destructive focus-visible:ring-destructive' : 'border-primary/20'}`}
                />
                {errors.quantity_used && <p className="text-[10px] font-bold text-destructive ml-1">{errors.quantity_used}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Production Process</label>
                <Select value={formData.process_type} onValueChange={(val) => setFormData({...formData, process_type: val})}>
                  <SelectTrigger className="w-full h-11 border border-slate-200 text-sm shadow-sm">
                    <SelectValue placeholder="Select Process..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Extrusion">Extrusion</SelectItem>
                    <SelectItem value="Printing">Printing</SelectItem>
                    <SelectItem value="Cutting">Cutting</SelectItem>
                    <SelectItem value="Slitting">Slitting</SelectItem>
                    <SelectItem value="Sealing">Sealing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Machine / Line No</label>
                <Input 
                  placeholder="e.g. L-1 or M-05"
                  value={formData.machine_no}
                  onChange={(e) => {
                    setFormData({...formData, machine_no: e.target.value});
                    if (errors.machine_no) setErrors(prev => {
                      const next = {...prev};
                      delete next.machine_no;
                      return next;
                    });
                  }}
                  className={`h-11 uppercase ${errors.machine_no ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {errors.machine_no && <p className="text-[10px] font-bold text-destructive ml-1">{errors.machine_no}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Issued To / Supervisor</label>
                <Select value={formData.issued_by} onValueChange={(val) => setFormData({...formData, issued_by: val})}>
                  <SelectTrigger className="w-full h-11 border border-slate-200 text-sm shadow-sm">
                    <SelectValue placeholder="Select staff..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-full space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Issuance Remarks</label>
                <textarea 
                  className="w-full h-24 p-3 rounded-md border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  value={formData.remarks}
                  maxLength={50}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  placeholder="e.g. Specific production batch # or quality check bypass notes..."
                />
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3">
              <Button onClick={() => setShowForm(false)} variant="ghost" className="w-full sm:w-auto px-8 h-11 rounded-full text-slate-500 text-sm">
                Cancel Issue
              </Button>
              <Button 
                onClick={saveConsumption} 
                loading={submitting}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg shadow-primary/20 flex items-center justify-center font-bold"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Record' : 'Authorize Issue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Issuance History"
          description="Daily log of materials issued for production activities."
          headers={['Slip / Date', 'Raw Material', 'Quantity', 'Process / Line', 'Status', 'Actions']}
          data={consumptions}
          loading={loading}
          searchFields={['consumption_slip_no', 'raw_materials.rm_name', 'process_type']}
          searchPlaceholder="Find slip or material..."
          renderRow={(c: any) => (
            <tr key={c.id} className="hover:bg-primary/5 transition-all group border-b border-slate-50 last:border-none">
              <td className="px-6 py-4">
                 <div className="font-black text-slate-800 text-[13px]">{c.consumption_slip_no}</div>
                 <div className="text-[10px] text-muted-foreground flex items-center mt-1">
                  <Calendar className="w-2.5 h-2.5 mr-1" /> {new Date(c.consumption_date).toLocaleDateString()}
                 </div>
              </td>
              <td className="px-6 py-4">
                 <div className="font-bold text-slate-700">{c.raw_materials?.rm_name}</div>
                 <div className="text-[10px] font-bold text-primary uppercase tracking-tighter">{c.raw_materials?.rm_code || '---'}</div>
              </td>
              <td className="px-6 py-4">
                 <div className="text-xl font-black text-secondary">{Number(c.quantity_used).toLocaleString()}</div>
                 <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{c.raw_materials?.unit_type || 'KG'} ISSUED</div>
              </td>
              <td className="px-6 py-4">
                 <div className="flex items-center">
                   <span className="px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-black tracking-widest rounded border border-slate-200">
                     {c.process_type || 'GENERAL'}
                   </span>
                   {c.machine_no && (
                     <span className="ml-2 text-[10px] text-slate-400 font-bold uppercase">LINE: {c.machine_no}</span>
                   )}
                 </div>
              </td>
              <td className="px-3 md:px-6 py-4">
                 <span className="flex items-center text-[10px] font-bold text-emerald-600">
                  <CheckCircle className="w-3 h-3 mr-1" /> <span className="hidden md:inline">CONSUMED</span>
                 </span>
              </td>
              <td className="md:px-6 py-4 text-right space-x-1">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
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
