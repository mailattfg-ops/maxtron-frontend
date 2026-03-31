'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Plus, Search, Edit, Trash2, X, Save, 
  Trash, Calendar, Hash, User, 
  Activity, AlertTriangle, Layers, FileText, Info
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
const WASTAGE_API = `${API_BASE}/api/maxtron/production/wastage`;
const PRODUCT_API = `${API_BASE}/api/maxtron/products`;
const RM_API = `${API_BASE}/api/maxtron/raw-materials`;

export default function DamagesWastagePage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('prod_product_view', 'create');
  const canEdit = hasPermission('prod_product_view', 'edit');
  const canDelete = hasPermission('prod_product_view', 'delete');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wastageRecords, setWastageRecords] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { success, error, info } = useToast();
  const { confirm } = useConfirm();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    stage: 'Extrusion',
    material_id: '',
    product_id: '',
    wastage_qty: 0,
    reason_code: '',
    remarks: '',
    date: new Date().toISOString().split('T')[0],
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

      const [prodRes, rmRes] = await Promise.all([
        fetch(`${PRODUCT_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${RM_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const prodData = await prodRes.json();
      const rmData = await rmRes.json();
      
      if (prodData.success) setProducts(prodData.data);
      if (rmData.success) setMaterials(rmData.data);

      fetchWastage(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWastage = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${WASTAGE_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setWastageRecords(data.data);
      }
    } catch (err) {
      console.error('Error fetching wastage:', err);
    }
  };

  const handleEdit = (w: any) => {
    setEditingId(w.id);
    setFormData({
      stage: w.stage,
      material_id: w.material_id || '',
      product_id: w.product_id || '',
      wastage_qty: parseFloat(w.wastage_qty) || 0,
      reason_code: w.reason_code || '',
      remarks: w.remarks || '',
      date: w.date.split('T')[0],
      company_id: w.company_id
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this wastage record? This action cannot be undone.',
      type: 'danger'
    });

    if (!isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${WASTAGE_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Record deleted successfully');
        fetchWastage();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error deleting record');
    }
  };

  const saveWastage = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.reason_code) newErrors.reason_code = 'Reason code is required';
    if (formData.wastage_qty <= 0) newErrors.wastage_qty = 'Quantity must be greater than zero';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      error('Please correct the highlighted errors.');
      return;
    }

    setSubmitting(true);
    setErrors({});

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${WASTAGE_API}/${editingId}` : WASTAGE_API;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Wastage record updated' : 'Wastage record saved');
        setShowForm(false);
        setEditingId(null);
        setFormData({
            ...formData,
            wastage_qty: 0,
            reason_code: '',
            remarks: ''
        });
        fetchWastage();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error saving record');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWastage = wastageRecords.filter(w => 
    w.stage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.reason_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.remarks?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { key: 'date', label: 'Date', icon: Calendar },
    { key: 'stage', label: 'Stage', icon: Activity },
    { key: 'wastage_qty', label: 'Wastage (Kg)', icon: Trash },
    { key: 'reason_code', label: 'Reason Code', icon: AlertTriangle },
    { key: 'remarks', label: 'Remarks', icon: Info }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Damages & Wastage</h1>
          <p className="text-muted-foreground mt-1">Track scrap and damaged goods during various production phases.</p>
        </div>
        <div className="flex items-center gap-3">
          {!showForm && canCreate && (
            <Button onClick={() => {
              setEditingId(null);
              setFormData({
                ...formData,
                wastage_qty: 0,
                reason_code: '',
                remarks: '',
                date: new Date().toISOString().split('T')[0]
              });
              setShowForm(true);
            }} className="shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all gap-2 bg-primary hover:bg-primary/95 text-white font-bold rounded-full px-6 h-10 md:h-11">
              <Plus className="w-4 h-4" /> Record New Damages
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-lg animate-in slide-in-from-top duration-500 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10 py-4">
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <AlertTriangle className="w-5 h-5" /> {editingId ? 'Edit Scrap Record' : 'Scrap Record Entry'}
            </CardTitle>
            <CardDescription className="text-primary/70">{editingId ? 'Update details for the existing wastage record.' : 'Pinpoint wastage events for extrusion, cutting, or packing stages.'}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Calendar className="w-4 h-4 text-primary" /> Date</label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Activity className="w-4 h-4 text-primary" /> Production Stage</label>
                <Select value={formData.stage} onValueChange={(val) => setFormData({ ...formData, stage: val })}>
                  <SelectTrigger className="h-10 w-full border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select Stage" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-input">
                    <SelectItem value="Extrusion">Extrusion (RM to Roll)</SelectItem>
                    <SelectItem value="Printing">Printing Section</SelectItem>
                    <SelectItem value="Cutting">Cutting & Sealing (Secondary)</SelectItem>
                    <SelectItem value="Packing">Final Packing</SelectItem>
                    <SelectItem value="Storage">Warehouse / Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Layers className="w-4 h-4 text-primary" />Damages Qty (Kg) <span className="text-rose-500">*</span></label>
                <Input 
                  type="number" 
                  min={0} 
                  step="0.001" 
                  placeholder="0.000" 
                  className={errors.wastage_qty ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                  value={formData.wastage_qty === 0 ? '' : formData.wastage_qty} 
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, wastage_qty: val });
                    if (val > 0) setErrors(prev => { const { wastage_qty: _, ...rest } = prev; return rest; });
                  }} 
                />
                {errors.wastage_qty && <p className="text-xs text-rose-600 font-bold">{errors.wastage_qty}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><AlertTriangle className="w-4 h-4 text-primary" /> Reason Code <span className="text-rose-500">*</span></label>
                <Select value={formData.reason_code} onValueChange={(val) => {
                  setFormData({ ...formData, reason_code: val });
                  setErrors(prev => { const { reason_code: _, ...rest } = prev; return rest; });
                }}>
                  <SelectTrigger className={`h-10 w-full bg-background shadow-sm ${errors.reason_code ? "border-rose-500" : "border-input"}`}>
                    <SelectValue placeholder="Select Reason" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-input">
                    <SelectItem value="Machine Fault">Machine Fault</SelectItem>
                    <SelectItem value="Technical Error">Technical Error</SelectItem>
                    <SelectItem value="Power Failure">Power Failure</SelectItem>
                    <SelectItem value="Material Quality">Material Quality</SelectItem>
                    <SelectItem value="Setup Waste">Initial Setup Waste</SelectItem>
                    <SelectItem value="Operator Error">Operator Error</SelectItem>
                    <SelectItem value="Other">Other (See Remarks)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.reason_code && <p className="text-xs text-rose-600 font-bold">{errors.reason_code}</p>}
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><FileText className="w-4 h-4 text-primary" /> Remarks / Details</label>
                <Input placeholder="Describe the loss event..." value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3 border-t pt-6">
              <Button variant="outline" onClick={() => setShowForm(false)} className="px-8 rounded-full h-11">Cancel</Button>
              <Button 
                onClick={saveWastage} 
                loading={submitting}
                className="px-10 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 gap-2 bg-primary hover:bg-primary/95 text-white font-bold rounded-full h-11"
              >
                <Save className="w-4 h-4" /> {editingId ? 'Update Scrap Entry' : 'Save Scrap Entry'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Wastage Audit Log"
          description="Detailed log of production scrap and reason codes."
          headers={['Date', 'Stage', 'Wastage (Kg)', 'Reason Code', 'Remarks', 'Actions']}
          data={wastageRecords}
          loading={loading}
          searchFields={['stage', 'reason_code', 'remarks']}
          searchPlaceholder="Search reason or stage..."
          renderRow={(w: any) => (
            <tr key={w.id} className="hover:bg-primary/5 border-b last:border-none transition-all">
              <td className="px-6 py-4 text-xs">{new Date(w.date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-bold text-primary">{w.stage}</td>
              <td className="px-6 py-4 font-mono font-black">{w.wastage_qty} Kg</td>
              <td className="px-6 py-4 underline decoration-primary/20 underline-offset-4 font-bold text-primary">{w.reason_code}</td>
              <td className="px-6 py-4 text-xs text-muted-foreground italic">{w.remarks}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {canEdit && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(w)}
                      className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(w.id)}
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
