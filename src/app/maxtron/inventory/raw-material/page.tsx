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
    availability: 'Local',
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
      availability: 'Local',
      company_id: currentCompanyId
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
      availability: rec.availability || 'Local',
      company_id: rec.company_id
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
    }
  };

  const downloadMaterialList = () => {
    if (materials.length === 0) {
      info('No data for export.');
      return;
    }
    const headers = ['Code', 'Name', 'Grade', 'Rate', 'Unit', 'Availability'];
    const rows = materials.map(m => [m.rm_code, m.rm_name, m.grade, m.rate_per_unit, m.unit_type, m.availability]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `raw_materials_${activeTenant.toLowerCase()}.csv`;
    link.click();
    success('Material list exported.');
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Raw Materials</h1>
          <p className="text-muted-foreground text-sm font-medium">Manage manufacturing feedstock, grades, and pricing.</p>
        </div>
        <div className="flex items-center space-x-3">
          {!showForm && (
            <Button onClick={downloadMaterialList} variant="outline" className="border-secondary text-secondary hover:bg-secondary/5 hidden md:flex rounded-full px-5 h-10 shadow-sm font-semibold">
               <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          )}
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
              className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg h-10 transition-all active:scale-95"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Cancel' : 'Add Raw Material'}
            </Button>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Unique Items</p>
                  <h3 className="text-3xl font-black text-primary mt-1">{materials.length}</h3>
                </div>
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <Package className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-600">
                <CheckCircle className="w-3 h-3 mr-1" /> <span>Registry synchronized</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Global Grades</p>
                  <h3 className="text-3xl font-black text-blue-600 mt-1">
                    {new Set(materials.map(m => m.grade).filter(Boolean)).size}
                  </h3>
                </div>
                <div className="bg-blue-50 p-3 rounded-2xl">
                  <Layers className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground font-medium italic">Standardized manufacturing quality</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Avg Price/Unit</p>
                  <h3 className="text-lg font-black text-emerald-600 mt-1">
                    ₹ {materials.length > 0 ? (materials.reduce((acc, curr) => acc + (Number(curr.rate_per_unit) || 0), 0) / materials.length).toFixed(2) : '0.00'}
                  </h3>
                </div>
                <div className="bg-emerald-50 p-3 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground font-medium italic">Market rate fluctuations tracking</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card className="border-primary/20 shadow-xl animate-in zoom-in-95 duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
            <CardTitle className="text-xl font-bold text-primary">{editingId ? 'Edit Raw Material' : 'New Material Registration'}</CardTitle>
            <CardDescription>Enter technical specifications and procurement rates.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/70 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-primary" /> Material Code
                </label>
                <Input 
                  placeholder="e.g. RM-LDPE-001"
                  value={formData.rm_code}
                  onChange={(e) => setFormData({...formData, rm_code: e.target.value})}
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/70 flex items-center">
                  <Package className="w-4 h-4 mr-2 text-primary" /> Material Name
                </label>
                <Input 
                  placeholder="e.g. Virgin LDPE Granules"
                  value={formData.rm_name}
                  onChange={(e) => setFormData({...formData, rm_name: e.target.value})}
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/70 flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-primary" /> Grade
                </label>
                <Input 
                  placeholder="e.g. Grade A+"
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/70 flex items-center">
                  <IndianRupee className="w-4 h-4 mr-2 text-primary" /> Rate per Unit
                </label>
                <div className="relative">
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={formData.rate_per_unit}
                    onChange={(e) => setFormData({...formData, rate_per_unit: Number(e.target.value)})}
                    className="h-11 bg-slate-50 border-slate-200 focus:bg-white pr-20"
                  />
                  <div className="absolute right-2 top-1.5 bottom-1.5 flex items-center bg-slate-200 px-3 rounded text-[10px] font-bold">
                    PER KG/TON
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/70 flex items-center">
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
                  onChange={(e) => setFormData({...formData, rm_description: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-10 flex justify-end space-x-4">
              <Button onClick={() => setShowForm(false)} variant="outline" className="px-8 h-11 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50">
                Discard Changes
              </Button>
              <Button onClick={saveMaterial} className="bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg shadow-primary/20 flex items-center font-bold">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Material' : 'Confirm Registration'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <TableView
        title="Raw Material Registry"
        description="Comprehensive list of production inputs and market rates."
        headers={['Code', 'Material Name', 'Grade / Quality', 'Procurement Rate', 'Availability', 'Created', 'Actions']}
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
              <div className="font-bold text-slate-800">{m.rm_name}</div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[150px] italic">{m.rm_description || 'No description'}</div>
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
            <td className="px-6 py-4 text-right space-x-1.5">
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
    </div>
  );
}
