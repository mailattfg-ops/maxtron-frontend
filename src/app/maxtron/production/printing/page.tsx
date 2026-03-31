'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Plus, Search, Edit, Trash2, X, Save, 
  Printer, Activity, Layers, Hash, User, Calendar, Clock, FileText, Trash, Box
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
const PRINTING_API = `${API_BASE}/api/maxtron/production/printing`;
const BATCH_API = `${API_BASE}/api/maxtron/production/batches`;
const EMPLOYEES_API = `${API_BASE}/api/maxtron/employees`;

export default function PrintingSectionPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('prod_extrusion_view', 'create');
  const canEdit = hasPermission('prod_extrusion_view', 'edit');
  const canDelete = hasPermission('prod_extrusion_view', 'delete');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printingJobs, setPrintingJobs] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { success, error, info } = useToast();
  const { confirm } = useConfirm();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    batch_id: '',
    input_qty: 0,
    output_qty: 0,
    wastage_qty: 0,
    operator_id: '',
    shift: 'General',
    ink_details: '',
    date: new Date().toISOString().split('T')[0],
    remarks: '',
    company_id: '',
    printing_number: ''
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

      const [batchRes, empRes] = await Promise.all([
        fetch(`${BATCH_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${EMPLOYEES_API}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const batchData = await batchRes.json();
      const empData = await empRes.json();
      
      if (batchData.success) {
        // Filter batches that require printing based on color
        const printingRequiredColors = ['BLUE', 'RED', 'YELLOW'];
        const printableBatches = batchData.data.filter((b: any) => {
           const color = (b.finished_products?.color || '').toUpperCase();
           return printingRequiredColors.includes(color);
        });
        setBatches(printableBatches);
      }

      if (empData.success) {
        setEmployees(empData.data.filter((e: any) => 
            e.companies?.company_name?.toUpperCase() === activeTenant &&
            (e.employee_categories?.category_name?.toLowerCase().includes('printing') || e.user_types?.name === 'production')
        ));
      }

      fetchPrintingJobs(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrintingJobs = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${PRINTING_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPrintingJobs(data.data);
      }
    } catch (err) {
      console.error('Error fetching printing jobs:', err);
    }
  };

  const handleEdit = (job: any) => {
    setEditingId(job.id);
    setFormData({
      batch_id: job.batch_id,
      input_qty: parseFloat(job.input_qty) || 0,
      output_qty: parseFloat(job.output_qty) || 0,
      wastage_qty: parseFloat(job.wastage_qty) || 0,
      operator_id: job.operator_id,
      shift: job.shift || 'General',
      ink_details: job.ink_details || '',
      date: job.date?.split('T')[0] || new Date().toISOString().split('T')[0],
      remarks: job.remarks || '',
      company_id: job.company_id,
      printing_number: job.printing_number || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this printing record?',
      type: 'danger'
    });

    if (!isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${PRINTING_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Record deleted successfully');
        fetchPrintingJobs();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error deleting record');
    }
  };

  const savePrintingJob = async () => {
    if (!formData.batch_id || !formData.operator_id || formData.output_qty <= 0) {
      error('Please fill required fields and ensure output is > 0.');
      return;
    }

    if (formData.output_qty > formData.input_qty) {
        error('Output cannot exceed input quantity.');
        return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${PRINTING_API}/${editingId}` : PRINTING_API;

    setSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...formData,
            wastage_qty: formData.input_qty - formData.output_qty
        })
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Printing record updated' : 'Printing record saved');
        setShowForm(false);
        setEditingId(null);
        resetForm();
        fetchPrintingJobs();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error saving printing job');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = (latestJobs: any[] = printingJobs) => {
    let nextJobNo = 'PRN-000001';
    const validJobs = (latestJobs || [])
      .filter(j => j.printing_number && /^PRN-\d+$/i.test(j.printing_number))
      .map(j => {
        const parts = j.printing_number.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    if (validJobs.length > 0) {
      const max = Math.max(...validJobs);
      nextJobNo = `PRN-${String(max + 1).padStart(6, '0')}`;
    }

    setFormData({
      batch_id: '',
      input_qty: 0,
      output_qty: 0,
      wastage_qty: 0,
      operator_id: '',
      shift: 'General',
      ink_details: '',
      date: new Date().toISOString().split('T')[0],
      remarks: '',
      company_id: currentCompanyId,
      printing_number: nextJobNo
    });
  };

  const availableBatches = useMemo(() => {
    const usedBatchIds = printingJobs.map(j => j.batch_id);
    return batches.filter(b => !usedBatchIds.includes(b.id) || b.id === formData.batch_id);
  }, [batches, printingJobs, formData.batch_id]);

  const filteredJobs = printingJobs.filter(j => 
    j.printing_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.production_batches?.batch_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Printer className="w-8 h-8 md:w-10 md:h-10 text-primary shrink-0" /> <span className="truncate text-primary">Printing Section</span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">Manage printing process for designated color products.</p>
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
              <Plus className="w-4 h-4 mr-2" /> New Printing Record
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-500 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10 py-4">
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <Printer className="w-5 h-5" /> {editingId ? 'Edit Printing Record' : 'Record Printing Process'}
            </CardTitle>
            <CardDescription className="text-primary/70">Enter process details for extruded batches requiring printing.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Hash className="w-4 h-4 text-primary" /> Job No</label>
                <Input value={formData.printing_number || 'AUTO-GENERATED'} disabled className="bg-slate-50 font-mono text-xs h-10" />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Box className="w-4 h-4 text-primary" /> Select Batch (Extrusion)</label>
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
                  <SelectTrigger className="w-full h-10 border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select Print-Required Batch" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-input">
                    {availableBatches.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.batch_number} - {b.finished_products?.product_name} ({b.finished_products?.color})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Calendar className="w-4 h-4 text-primary" /> Process Date</label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Activity className="w-4 h-4 text-primary" /> Input Qty (Kg)</label>
                <Input value={formData.input_qty} readOnly className="h-10 bg-slate-50 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Printer className="w-4 h-4 text-primary" /> Output Qty (Kg)</label>
                <Input 
                  type="number" 
                  value={formData.output_qty || ''} 
                  onChange={e => setFormData({ ...formData, output_qty: parseFloat(e.target.value) || 0 })} 
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><User className="w-4 h-4 text-primary" /> Printing Operator</label>
                <Select value={formData.operator_id} onValueChange={(val) => setFormData({ ...formData, operator_id: val })}>
                  <SelectTrigger className="w-full h-10 border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select Operator" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-input">
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><FileText className="w-4 h-4 text-primary" /> Ink \u0026 Color Details</label>
              <Input 
                placeholder="e.g. Cyan Ink 2L, Thinner 1L" 
                value={formData.ink_details} 
                onChange={e => setFormData({ ...formData, ink_details: e.target.value })} 
              />
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t pt-6">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-full h-11 px-8">Cancel</Button>
              <Button 
                onClick={savePrintingJob} 
                loading={submitting}
                className="bg-primary hover:bg-primary/95 text-white px-10 rounded-full shadow-lg h-11 font-bold transition-all"
              >
                <Save className="w-4 h-4 mr-2" /> Save Printing Record
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Printing History"
          description="Log of printed batches and material transfer."
          headers={['Date', 'Print Job #', 'Batch #', 'Product', 'Color', 'Input Qty', 'Output Qty', 'Wastage', 'Operator', 'Actions']}
          data={printingJobs}
          loading={loading}
          searchFields={['printing_number', 'production_batches.batch_number']}
          searchPlaceholder="Search print jobs..."
          renderRow={(job: any) => (
            <tr key={job.id} className="hover:bg-primary/5 border-b last:border-none transition-all group">
              <td className="px-6 py-4 text-xs font-medium">{new Date(job.date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-mono font-bold text-primary text-xs min-w-[180px] whitespace-nowrap">{job.printing_number || 'P-001'}</td>
              <td className="px-6 py-4 font-mono text-xs">{job.production_batches?.batch_number}</td>
              <td className="px-6 py-4">
                  <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{job.production_batches?.finished_products?.product_name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{job.production_batches?.finished_products?.product_code}</span>
                  </div>
              </td>
              <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      job.production_batches?.finished_products?.color?.toUpperCase() === 'BLUE' ? 'bg-blue-100 text-blue-700' :
                      job.production_batches?.finished_products?.color?.toUpperCase() === 'RED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                  }`}>
                    {job.production_batches?.finished_products?.color}
                  </span>
              </td>
              <td className="px-6 py-4 text-xs">{job.input_qty} Kg</td>
              <td className="px-6 py-4 font-bold text-primary">{job.output_qty} Kg</td>
              <td className="px-6 py-4 text-rose-600 font-bold">{job.wastage_qty} Kg</td>
              <td className="px-6 py-4 text-xs font-medium">{job.operator?.name}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(job)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(job.id)} className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}
