'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Truck, 
  Save, 
  Plus, 
  X, 
  Edit, 
  Trash2, 
  MapPin, 
  Calendar, 
  Settings, 
  ShieldCheck, 
  Hash, 
  User, 
  Navigation 
} from 'lucide-react';
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
import { useRouter } from 'next/navigation';

const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/vehicles`;

const vehicleTypes = ['LCV', 'HCV', 'Car', 'Bike', 'Bus', 'Other'];
const purposes = [
  'Office Use', 
  'Delivery', 
  'Employee Transportation', 
  'BMW Collection'
];

export default function VehiclesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('sales_vehicles_view', 'create');
  const canEdit = hasPermission('sales_vehicles_view', 'edit');
  const canDelete = hasPermission('sales_vehicles_view', 'delete');
  const router = useRouter();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    registration_number: '',
    model: '',
    vehicle_type: '',
    body_type: '',
    fitness_date: '',
    fitness_renewal_date: '',
    km_on_day_1: 0,
    engine_no: '',
    chassis_no: '',
    owner_name: '',
    owner_address: '',
    gps_installed: false,
    gps_company: '',
    gps_install_date: '',
    seating_capacity: 0,
    purpose: '',
    company_id: '',
    is_active: true
  });

  const validateTab = (tab: string) => {
    const newErrors: Record<string, string> = {};
    
    if (tab === 'basic') {
      if (!formData.registration_number.trim()) newErrors.registration_number = 'Required';
      else if (!/^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,2}[-\s]?[0-9]{4}$/i.test(formData.registration_number)) {
        newErrors.registration_number = 'Invalid format (e.g. DL-01-AB-1234)';
      }
      
      if (!formData.model.trim()) newErrors.model = 'Required';
      else if (!/^[a-zA-Z0-9\s\-\.]+$/.test(formData.model)) {
        newErrors.model = 'Invalid characters used';
      }

      if (formData.body_type && !/^[a-zA-Z0-9\s\-\.]+$/.test(formData.body_type)) {
        newErrors.body_type = 'Invalid characters';
      }

      if (!formData.vehicle_type) newErrors.vehicle_type = 'Required';
      if (!formData.purpose) newErrors.purpose = 'Required';
      
      if (Number(formData.seating_capacity) <= 0) newErrors.seating_capacity = 'Must be > 0';
    }

    if (tab === 'tech') {
      if (formData.engine_no && !/^[a-zA-Z0-9\s\-]+$/.test(formData.engine_no)) {
        newErrors.engine_no = 'Invalid characters';
      }
      if (formData.chassis_no && !/^[a-zA-Z0-9\s\-]+$/.test(formData.chassis_no)) {
        newErrors.chassis_no = 'Invalid characters';
      }
      if (formData.fitness_date && formData.fitness_renewal_date) {
        if (new Date(formData.fitness_renewal_date) <= new Date(formData.fitness_date)) {
          newErrors.fitness_renewal_date = 'Must be strictly later than Fitness Date';
        }
      }
      if (Number(formData.km_on_day_1) < 0) newErrors.km_on_day_1 = 'Cannot be negative';
    }

    if (tab === 'owner' && formData.gps_installed) {
      if (!formData.gps_company.trim()) newErrors.gps_company = 'GPS Provider required';
      if (!formData.gps_install_date) newErrors.gps_install_date = 'Install date required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const compRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          setCurrentCompanyId(activeCo.id);
          setFormData(prev => ({ ...prev, company_id: activeCo.id }));
          fetchVehicles(activeCo.id);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${API_URL}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (err) {}
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    
    if (type === 'number') {
      finalValue = value === '' ? 0 : parseFloat(value);
    }
    if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;
    
    setFormData({ ...formData, [name]: finalValue });
    if (errors[name]) setErrors(prev => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  };

  const resetForm = () => {
    setFormData({
      registration_number: '',
      model: '',
      vehicle_type: '',
      body_type: '',
      fitness_date: '',
      fitness_renewal_date: '',
      km_on_day_1: 0,
      engine_no: '',
      chassis_no: '',
      owner_name: '',
      owner_address: '',
      gps_installed: false,
      gps_company: '',
      gps_install_date: '',
      seating_capacity: 0,
      purpose: '',
      company_id: currentCompanyId,
      is_active: true
    });
    setErrors({});
    setActiveTab('basic');
  };

  const saveVehicle = async () => {
    if (!validateTab('basic') || !validateTab('tech') || !validateTab('owner')) {
      error('Please correct errors in all sections.');
      return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/${editingId}` : API_URL;

    // Clean up empty date strings to null for PostgreSQL
    const cleanData = {
      ...formData,
      fitness_date: formData.fitness_date || null,
      fitness_renewal_date: formData.fitness_renewal_date || null,
      gps_install_date: formData.gps_install_date || null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cleanData)
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Vehicle updated!' : 'Vehicle added to fleet!');
        setShowForm(false);
        setEditingId(null);
        fetchVehicles();
        resetForm();
      } else {
        error(data.message || 'Error occurred');
      }
    } catch (err) {}
  };

  const handleEdit = (v: any) => {
    setEditingId(v.id);
    setFormData({ ...v });
    setErrors({});
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to remove this vehicle from the fleet records?',
      confirmLabel: 'Delete Record',
      cancelLabel: 'Keep',
      type: 'danger'
    });
    if (!isConfirmed) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Vehicle records removed.');
        fetchVehicles();
      }
    } catch (err) {}
  };

  return (
    <div className="md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center">
            <Truck className="w-6 h-6 mr-2" /> Vehicle Information
          </h1>
          <p className="text-muted-foreground text-sm font-medium tracking-wide">Manage your {activeTenant} motor fleet and maintenance.</p>
        </div>
        {canCreate && (
          <Button 
            onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
            className="bg-primary hover:bg-primary/90 text-white px-6 rounded-full shadow-lg"
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Cancel' : 'Add New Vehicle'}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-xl animate-in zoom-in duration-300 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b grid grid-cols-1 md:grid-cols-2 gap-1 items-center justify-between py-4">
            <div>
              <CardTitle className="text-primary">{editingId ? 'Modify Vehicle' : 'Register New Vehicle'}</CardTitle>
              <CardDescription>Enter technical, legal and ownership specifications.</CardDescription>
            </div>
            <div className="flex gap-2 bg-white/50 p-1 rounded-full border pointer-events-none">
              <Button 
                variant={activeTab === 'basic' ? 'default' : 'ghost'} 
                size="sm" 
                className={`rounded-full px-4 h-8 text-[10px] uppercase font-bold tracking-widest ${activeTab === 'basic' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
              >Basic</Button>
              <Button 
                variant={activeTab === 'tech' ? 'default' : 'ghost'} 
                size="sm" 
                className={`rounded-full px-4 h-8 text-[10px] uppercase font-bold tracking-widest ${activeTab === 'tech' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
              >Technical</Button>
              <Button 
                variant={activeTab === 'owner' ? 'default' : 'ghost'} 
                size="sm" 
                className={`rounded-full px-4 h-8 text-[10px] uppercase font-bold tracking-widest ${activeTab === 'owner' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
              >Owner <span className='hidden md:block'> & GPS</span></Button>
            </div>
          </CardHeader>
          <CardContent className="px-0 md:px-6 md:p-8">
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500 px-6 md:px-0">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Registration Number *</label>
                  <Input 
                    name="registration_number" 
                    value={formData.registration_number} 
                    onChange={handleInputChange} 
                    placeholder="e.g. DL-01-AB-1234" 
                    className={`uppercase font-mono ${errors.registration_number ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`} 
                  />
                  {errors.registration_number && <p className="text-[10px] text-rose-600 font-bold">{errors.registration_number}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Model *</label>
                  <Input 
                    name="model" 
                    value={formData.model} 
                    onChange={handleInputChange} 
                    placeholder="e.g. Tata Ace, Bolero" 
                    className={errors.model ? 'border-rose-500 focus-visible:ring-rose-500' : ''} 
                  />
                  {errors.model && <p className="text-[10px] text-rose-600 font-bold">{errors.model}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vehicle Type *</label>
                  <Select value={formData.vehicle_type} onValueChange={(val) => { setFormData({...formData, vehicle_type: val}); if(errors.vehicle_type) setErrors(prev => { const { vehicle_type: _, ...rest } = prev; return rest; }); }}>
                    <SelectTrigger className={`w-full h-10 border text-sm shadow-sm font-medium ${errors.vehicle_type ? 'border-rose-500' : 'border-slate-200'}`}>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {vehicleTypes.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vehicle_type && <p className="text-[10px] text-rose-600 font-bold">{errors.vehicle_type}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Body Type</label>
                  <Input 
                    name="body_type" 
                    value={formData.body_type} 
                    onChange={handleInputChange} 
                    placeholder="e.g. Open Box, Container" 
                    className={errors.body_type ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                  />
                  {errors.body_type && <p className="text-[10px] text-rose-600 font-bold">{errors.body_type}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seating Capacity *</label>
                  <Input 
                    type="number" 
                    min={0} 
                    name="seating_capacity" 
                    value={formData.seating_capacity === 0 ? '' : formData.seating_capacity} 
                    onChange={handleInputChange} 
                    placeholder="Enter capacity"
                    className={errors.seating_capacity ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                  />
                  {errors.seating_capacity && <p className="text-[10px] text-rose-600 font-bold">{errors.seating_capacity}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Purpose of Usage *</label>
                  <Select value={formData.purpose} onValueChange={(val) => { setFormData({...formData, purpose: val}); if(errors.purpose) setErrors(prev => { const { purpose: _, ...rest } = prev; return rest; }); }}>
                    <SelectTrigger className={`w-full h-10 border text-sm shadow-sm font-medium ${errors.purpose ? 'border-rose-500' : 'border-slate-200'}`}>
                      <SelectValue placeholder="Select Purpose" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {purposes.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.purpose && <p className="text-[10px] text-rose-600 font-bold">{errors.purpose}</p>}
                </div>
              </div>
            )}

            {activeTab === 'tech' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-right duration-500 px-6 md:px-0">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Engine No</label>
                  <Input 
                    name="engine_no" 
                    value={formData.engine_no} 
                    onChange={handleInputChange} 
                    className={`font-mono ${errors.engine_no ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`} 
                  />
                  {errors.engine_no && <p className="text-[10px] text-rose-600 font-bold">{errors.engine_no}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chassis No</label>
                  <Input 
                    name="chassis_no" 
                    value={formData.chassis_no} 
                    onChange={handleInputChange} 
                    className={`font-mono ${errors.chassis_no ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`} 
                  />
                  {errors.chassis_no && <p className="text-[10px] text-rose-600 font-bold">{errors.chassis_no}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">KM on Day 1</label>
                  <Input 
                    type="number" 
                    min={0} 
                    name="km_on_day_1" 
                    value={formData.km_on_day_1 === 0 ? '' : formData.km_on_day_1} 
                    onChange={handleInputChange} 
                    className={errors.km_on_day_1 ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                  />
                  {errors.km_on_day_1 && <p className="text-[10px] text-rose-600 font-bold">{errors.km_on_day_1}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center"><Calendar className="w-3 h-3 mr-1" /> Fitness Date</label>
                  <Input type="date" name="fitness_date" value={formData.fitness_date} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center"><ShieldCheck className="w-3 h-3 mr-1" /> Fitness Renewal Date</label>
                  <Input 
                    type="date" 
                    name="fitness_renewal_date" 
                    value={formData.fitness_renewal_date} 
                    onChange={handleInputChange} 
                    className={errors.fitness_renewal_date ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                  />
                  {errors.fitness_renewal_date && <p className="text-[10px] text-rose-600 font-bold">{errors.fitness_renewal_date}</p>}
                </div>
              </div>
            )}

            {activeTab === 'owner' && (
              <div className="space-y-8 animate-in slide-in-from-right duration-500 px-6 md:px-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-50/50 p-6 rounded-xl border border-primary/5 space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center">
                      <User className="w-4 h-4 mr-2" /> Ownership Info
                    </h3>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Owner Name</label>
                      <Input name="owner_name" maxLength={30} value={formData.owner_name} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Owner Address</label>
                      <Input name="owner_address" value={formData.owner_address} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-6 rounded-xl border border-primary/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center">
                        <Navigation className="w-4 h-4 mr-2" /> GPS Tracking
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-500">INSTALLED?</span>
                        <Checkbox 
                          checked={formData.gps_installed} 
                          onCheckedChange={(checked: boolean) => setFormData({...formData, gps_installed: !!checked})}
                        />
                      </div>
                    </div>
                    
                    {formData.gps_installed && (
                      <div className="grid grid-cols-1 gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">GPS Provider/Company *</label>
                          <Input 
                            name="gps_company" 
                            value={formData.gps_company} 
                            onChange={handleInputChange} 
                            placeholder="e.g. MapmyIndia, Fleetx" 
                            className={errors.gps_company ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                          />
                          {errors.gps_company && <p className="text-[10px] text-rose-600 font-bold">{errors.gps_company}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Date of Installation *</label>
                          <Input 
                            type="date" 
                            name="gps_install_date" 
                            value={formData.gps_install_date} 
                            onChange={handleInputChange} 
                            className={errors.gps_install_date ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                          />
                          {errors.gps_install_date && <p className="text-[10px] text-rose-600 font-bold">{errors.gps_install_date}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10 pt-6 border-t flex justify-between items-center">
              <div className="flex gap-3">
                {activeTab !== 'basic' && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (activeTab === 'tech') setActiveTab('basic');
                      if (activeTab === 'owner') setActiveTab('tech');
                    }}
                    className="rounded-full mr-1 px-8 h-10 font-bold border-primary/20 hover:bg-primary/5 shadow-sm"
                  >
                    Back
                  </Button>
                )}
                <Button 
                   variant="ghost" 
                   onClick={() => { setShowForm(false); resetForm(); }}
                   className="hidden md:block rounded-full px-4 text-slate-400 hover:text-rose-500 font-medium h-10"
                >
                  Cancel Entry
                </Button>
              </div>

              <div className="flex gap-3">
                {activeTab !== 'owner' ? (
                  <Button 
                    onClick={() => {
                      if (activeTab === 'basic') {
                        if (validateTab('basic')) setActiveTab('tech');
                      }
                      else if (activeTab === 'tech') {
                        if (validateTab('tech')) setActiveTab('owner');
                      }
                    }}
                    className="bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg font-bold"
                  >
                    Next Section
                  </Button>
                ) : (
                  <Button 
                    onClick={saveVehicle} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-11 rounded-full shadow-lg font-bold transition-all hover:scale-105"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? 'Update Vehicle Record' : 'Register Vehicle to Fleet'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Fleet Directory"
          description={`Comprehensive list of ${activeTenant} vehicles and tracking status.`}
          headers={['Reg No', 'Model/Type', 'Current Use', 'Fitness Status', 'GPS', 'Actions']}
          data={vehicles}
          loading={loading}
          searchFields={['registration_number', 'model', 'owner_name']}
          searchPlaceholder="Search Reg No, Model or Owner..."
          renderRow={(v: any) => {
            const isFitnessExpiring = v.fitness_renewal_date && new Date(v.fitness_renewal_date) < new Date();
            
            return (
              <tr key={v.id} className="hover:bg-primary/5 transition-colors group">
                <td className="px-4 py-4 font-mono text-sm font-bold text-primary uppercase">{v.registration_number}</td>
                <td className="px-4 py-4">
                  <div className="font-bold text-foreground">{v.model || 'N/A'}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">{v.vehicle_type} • {v.body_type}</div>
                </td>
                <td className="px-4 py-4">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200 uppercase">
                    {v.purpose || 'NOT SET'}
                  </span>
                </td>
                <td className="px-4 py-4">
                   <div className="text-xs font-bold">Ren: {v.fitness_renewal_date || 'N/A'}</div>
                   {isFitnessExpiring ? (
                     <div className="text-[9px] text-rose-600 font-extrabold uppercase animate-pulse">Fitness Expired</div>
                   ) : (
                     <div className="text-[9px] text-emerald-600 font-extrabold uppercase">Valid</div>
                   )}
                </td>
                <td className="px-4 py-4">
                  {v.gps_installed ? (
                    <div className="flex items-center text-emerald-600 font-bold text-[10px]">
                      <Navigation className="w-3 h-3 mr-1 fill-emerald-600" /> ACTIVE
                    </div>
                  ) : (
                    <div className="text-muted-foreground/30 font-bold text-[10px]">INACTIVE</div>
                  )}
                </td>
                <td className="px-4 py-4 text-right space-x-2">
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(v)} className="hover:bg-primary/10 hover:text-primary rounded-full h-8 w-8">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="hover:bg-rose-50 hover:text-rose-600 rounded-full h-8 w-8">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          }}
        />
      )}
    </div>
  );
}
