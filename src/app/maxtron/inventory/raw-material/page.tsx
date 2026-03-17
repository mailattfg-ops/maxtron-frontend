'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Package, Plus, Search, Edit, Trash2, X, Save, 
  Tag, FileText, IndianRupee, MapPin, Layers, Briefcase, Download, 
  TrendingUp, Activity, CheckCircle, Globe2
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';
import { exportToExcel } from '@/utils/export';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const RM_API = `${API_BASE}/api/maxtron/raw-materials`;

export default function RawMaterialPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('inv_rm_view', 'create');
  const canEdit = hasPermission('inv_rm_view', 'edit');
  const canDelete = hasPermission('inv_rm_view', 'delete');
  const [showForm, setShowForm] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    rm_code: '',
    rm_name: '',
    rm_description: '',
    rate_per_unit: 0,
    unit_type: 'Kg',
    grade: '',
    rm_type_code: '',
    availability: 'Local',
    company_id: '',
    stock_threshold: 100
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
      fetchMaterials(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${RM_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMaterials(data.data);
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    }
  };

  const saveMaterial = async () => {
    if (!formData.rm_code || !formData.rm_name) {
      error('Please fill Code and Name.');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${RM_API}/${editingId}` : RM_API;

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
        success(editingId ? 'Material updated!' : 'Material added!');
        setShowForm(false);
        setEditingId(null);
        fetchMaterials();
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

  const resetForm = () => {
    setFormData({
      rm_code: '',
      rm_name: '',
      rm_description: '',
      rate_per_unit: 0,
      unit_type: 'Kg',
      grade: '',
      rm_type_code: '',
      availability: 'Local',
      company_id: currentCompanyId,
      stock_threshold: 100
    });
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      rm_code: rec.rm_code,
      rm_name: rec.rm_name,
      rm_description: rec.rm_description || '',
      rate_per_unit: rec.rate_per_unit || 0,
      unit_type: rec.unit_type || 'Kg',
      grade: rec.grade || '',
      rm_type_code: rec.rm_type_code || '',
      availability: rec.availability || 'Local',
      company_id: rec.company_id,
      stock_threshold: rec.stock_threshold || 100
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this raw material?',
      type: 'danger'
    });
    if (!isConfirmed) return;
    
    const token = localStorage.getItem('token');
    setSubmitting(true);
    try {
      const res = await fetch(`${RM_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Material removed from registry.');
        fetchMaterials();
      }
    } catch (err) {
      error('Deletion failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadMaterialList = async () => {
    if (materials.length === 0) {
      info('No data for export.');
      return;
    }
    const headers = ['Code', 'Name', 'Type Code', 'Grade', 'Rate', 'Unit', 'Availability', 'Threshold'];
    const rows = materials.map(m => [
      m.rm_code || '',
      m.rm_name || '',
      m.rm_type_code || '',
      m.grade || '',
      Number(m.rate_per_unit || 0),
      m.unit_type || '',
      m.availability || '',
      m.stock_threshold || 100
    ]);
    
    await exportToExcel({
      headers,
      rows,
      filename: `raw_materials_${activeTenant.toLowerCase()}.xlsx`,
      sheetName: 'Raw Materials'
    });
    success('Material list exported.');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Raw Materials</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Manage manufacturing feedstock, grades, and pricing.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {!showForm && (
            <Button onClick={downloadMaterialList} variant="outline" className="h-10 border-secondary text-secondary hover:bg-secondary/5 rounded-full px-5 shadow-sm font-bold order-2 sm:order-1">
               <Download className="w-4 h-4 mr-2" /> Export List
            </Button>
          )}
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
              className="h-10 md:h-11 bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold order-1 sm:order-2 active:scale-95 transition-all whitespace-nowrap"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Cancel' : 'New Registration'}
            </Button>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Unique Items</p>
                  <h3 className="text-2xl md:text-3xl font-black text-primary mt-1">{materials.length}</h3>
                </div>
                <div className="bg-primary/10 p-2 md:p-3 rounded-xl md:rounded-2xl">
                  <Package className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-600">
                <CheckCircle className="w-3 h-3 mr-1" /> <span>Registry synchronized</span>
              </div>
            </CardContent>
          </Card>
 
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Global Grades</p>
                  <h3 className="text-2xl md:text-3xl font-black text-blue-600 mt-1">
                    {new Set(materials.map(m => m.grade).filter(Boolean)).size}
                  </h3>
                </div>
                <div className="bg-blue-50 p-2 md:p-3 rounded-xl md:rounded-2xl">
                  <Layers className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                </div>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground font-medium italic">Standardized manufacturing quality</p>
            </CardContent>
          </Card>
 
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Avg Price/Unit</p>
                  <h3 className="text-xl md:text-2xl font-black text-emerald-600 mt-1">
                    ₹ {materials.length > 0 ? (materials.reduce((acc, curr) => acc + (Number(curr.rate_per_unit) || 0), 0) / materials.length).toFixed(2) : '0.00'}
                  </h3>
                </div>
                <div className="bg-emerald-50 p-2 md:p-3 rounded-xl md:rounded-2xl">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                </div>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground font-medium italic">Market rate fluctuations tracking</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card className="border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl font-bold text-primary">{editingId ? 'Edit Material' : 'New Registration'}</CardTitle>
            <CardDescription className="text-xs md:text-sm">Enter technical specifications and procurement rates.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                  <Tag className="w-3 h-3 mr-2 text-primary" /> Material Code
                </label>
                <Input 
                  placeholder="e.g. RM-LDPE-001"
                  value={formData.rm_code}
                  onChange={(e) => setFormData({...formData, rm_code: e.target.value})}
                  className="h-11 font-bold"
                />
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                  <Package className="w-3 h-3 mr-2 text-primary" /> Material Name
                </label>
                <Input 
                  placeholder="e.g. Virgin LDPE Granules"
                  value={formData.rm_name}
                  onChange={(e) => setFormData({...formData, rm_name: e.target.value})}
                  className="h-11 font-bold"
                />
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                  <Layers className="w-3 h-3 mr-2 text-primary" /> Grade
                </label>
                <Input 
                  placeholder="e.g. Grade A+"
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  className="h-11 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                  <Briefcase className="w-3 h-3 mr-2 text-primary" /> RM Type Code
                </label>
                <Input 
                  placeholder="code..."
                  value={formData.rm_type_code}
                  onChange={(e) => setFormData({...formData, rm_type_code: e.target.value.toUpperCase()})}
                  className="h-11 font-black text-blue-600"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                   Unit Type
                </label>
                <select 
                  value={formData.unit_type}
                  onChange={(e) => setFormData({...formData, unit_type: e.target.value})}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm focus:bg-white outline-none shadow-sm"
                >
                  <option value="Kg">Kilogram (Kg)</option>
                  <option value="Ton">Metric Ton (Ton)</option>
                </select>
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                  <IndianRupee className="w-3 h-3 mr-2 text-primary" /> Rate per Unit
                </label>
                <div className="relative">
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={formData.rate_per_unit === 0 ? '' : formData.rate_per_unit}
                    onChange={(e) => setFormData({...formData, rate_per_unit: Number(e.target.value)})}
                    className="h-11 font-black text-emerald-600 pr-20"
                  />
                  <div className="absolute right-2 top-2 bottom-2 flex items-center bg-slate-100 px-2 rounded text-[10px] font-black text-slate-500">
                    PER {formData.unit_type.toUpperCase()}
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
                    placeholder="100.00"
                    value={formData.stock_threshold}
                    onChange={(e) => setFormData({...formData, stock_threshold: Number(e.target.value)})}
                    className="h-11 font-black text-rose-500 pr-12"
                  />
                  <div className="absolute right-2 top-2 bottom-2 flex items-center bg-slate-100 px-2 rounded text-[10px] font-black text-slate-500">
                    {formData.unit_type.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/70 flex items-center">
                  <Globe2 className="w-4 h-4 mr-2 text-primary" /> Availability 
                </label>
                <select 
                  value={formData.availability}
                  onChange={(e) => setFormData({...formData, availability: e.target.value})}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm focus:bg-white outline-none shadow-sm"
                >
                  <option value="Local">Local (Domestic)</option>
                  <option value="Outstation">Outstation (Inter-state)</option>
                  <option value="Abroad">Abroad (Imported)</option>
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-3 space-y-2">
                <label className="text-sm font-bold text-foreground/70 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-primary" /> Description
                </label>
                <textarea 
                  className="w-full h-24 p-3 rounded-md border border-slate-200 bg-slate-50 text-sm focus:bg-white outline-none shadow-sm resize-none"
                  placeholder="Notes about quality, chemical properties or vendor specifics..."
                  value={formData.rm_description}
                  maxLength={50}
                  onChange={(e) => setFormData({...formData, rm_description: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3">
              <Button onClick={() => setShowForm(false)} variant="outline" className="w-full sm:w-auto px-8 h-11 rounded-full border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
                Discard Changes
              </Button>
              <Button 
                onClick={saveMaterial} 
                loading={submitting}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg font-bold flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Material' : 'Confirm Registration'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Raw Material Registry"
          description="Comprehensive list of production inputs and market rates."
          headers={['Code', 'Material Name', 'Type', 'Grade / Quality', 'Procurement Rate', 'Threshold', 'Availability', 'Created', 'Actions']}
          data={materials.filter(m => m.rm_name.toLowerCase().includes(searchQuery.toLowerCase()) || m.rm_code.toLowerCase().includes(searchQuery.toLowerCase()))}
          loading={loading}
          searchFields={['rm_code', 'rm_name', 'grade']}
          searchPlaceholder="Filter items by code or name..."
          renderRow={(m: any) => (
            <tr key={m.id} className="hover:bg-primary/5 transition-all group border-b border-slate-50 last:border-none">
              <td className="px-6 py-4">
                <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-bold uppercase">{m.rm_code}</span>
              </td>
              <td className="px-6 py-4">
                <div className="font-bold text-slate-800">{m.rm_name?.length > 20 ? m.rm_name.slice(0, 20) + "..." : m.rm_name}</div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[150px] italic">{m.rm_description || 'No description'}</div>
              </td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-slate-50 text-slate-500 border border-slate-200">
                  {m.rm_type_code || 'N/A'}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
                  {m.grade || 'STD'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="font-black text-slate-900 group-hover:text-primary transition-colors">₹ {m.rate_per_unit}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase">PER {m.unit_type || 'KG'}</div>
              </td>
              <td className="px-6 py-4">
                <div className="font-bold text-rose-600 tracking-tighter">{m.stock_threshold || 100}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase">{m.unit_type || 'KG'}</div>
              </td>
              <td className="px-6 py-4">
                <span className={`flex items-center text-[11px] font-bold ${
                  m.availability === 'Abroad' ? 'text-purple-600' : 
                  m.availability === 'Outstation' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {m.availability === 'Abroad' ? <Globe2 className="w-3 h-3 mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
                  {m.availability}
                </span>
              </td>
              <td className="px-6 py-4 text-[11px] text-slate-400">
                {new Date(m.created_at).toLocaleDateString()}
              </td>
              <td className="md:px-6 py-4 text-right space-x-1.5">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(m)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all">
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
