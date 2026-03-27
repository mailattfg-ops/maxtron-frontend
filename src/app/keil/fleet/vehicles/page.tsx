'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Truck, 
    Calendar,
    Settings,
    ShieldCheck,
    AlertCircle,
    Navigation,
    X,
    Save,
    User,
    Hash,
    MapPin,
    BarChart3,
    Lock,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableView } from "@/components/ui/table-view";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const VEHICLE_API = `${API_BASE}/api/keil/fleet/vehicles`;

const vehicleTypes = ['LCV', 'HCV', 'Car', 'Bike', 'Bus', 'Other'];
const purposes = ['BMW Collection', 'Delivery', 'Office Use', 'Employee Transportation'];
const fuelTypes = ['Diesel', 'Electric', 'CNG', 'Petrol'];
const statusOptions = [
    { value: 'Active', label: 'Operational' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Out of Service', label: 'Decommissioned' }
];

export default function VehicleMasterPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const { hasPermission, loading: permissionLoading } = usePermission();

    const canView = hasPermission('fleet_vehicle_view', 'view');
    const canCreate = hasPermission('fleet_vehicle_view', 'create');
    const canEdit = hasPermission('fleet_vehicle_view', 'edit');
    const canDelete = hasPermission('fleet_vehicle_view', 'delete');
    
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    const [activeTab, setActiveTab] = useState('basic');
    const [filterMode, setFilterMode] = useState<'all' | 'compliance'>('all');
    const [isAuditing, setIsAuditing] = useState(false);

    const [formData, setFormData] = useState({
        registration_number: '',
        make: '',
        model: '',
        vehicle_type: '',
        body_type: '',
        year: new Date().getFullYear(),
        fuel_type: 'Diesel',
        tank_capacity: '',
        current_km: '',
        km_on_day_1: '',
        status: 'Active',
        insurance_expiry: '',
        fitness_date: '',
        fitness_renewal_date: '',
        permit_expiry: '',
        pollution_expiry: '',
        chassis_no: '',
        engine_no: '',
        owner_name: '',
        owner_address: '',
        gps_installed: false,
        gps_company: '',
        gps_install_date: '',
        purpose: 'BMW Collection',
        seating_capacity: 0,
        is_active: true,
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
                const activeCo = compData.data.find((c: any) => 
                    c.company_name?.toUpperCase().includes('KEIL')
                );
                if (activeCo) {
                    coId = activeCo.id;
                    setCurrentCompanyId(coId);
                    setFormData(prev => ({ ...prev, company_id: coId }));
                }
            }

            if (coId) {
                fetchVehicles(coId);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchVehicles = async (coId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${VEHICLE_API}?company_id=${coId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setVehicles(data.data);
        } catch (err) {
            console.error('Error fetching vehicles:', err);
        }
    };

    const handleSave = async () => {
        const { registration_number, make, model, vehicle_type, year } = formData;
        if (!registration_number || !make || !model || !vehicle_type || !year) {
            error("Major Fields Missing: Registration, Make, Model, Type, and Year are mandatory.");
            return;
        }

        // Clean data: Convert empty strings to null for consistent backend ingestion
        const cleanedData = { ...formData };
        const dateFields = [
            'insurance_expiry', 
            'fitness_date', 
            'fitness_renewal_date', 
            'permit_expiry', 
            'pollution_expiry', 
            'gps_install_date'
        ];
        const numericFields = [
            'tank_capacity', 
            'current_km', 
            'km_on_day_1', 
            'seating_capacity'
        ];

        dateFields.forEach(field => {
            if (cleanedData[field as keyof typeof cleanedData] === '') {
                (cleanedData as any)[field] = null;
            }
        });

        numericFields.forEach(field => {
            const val = cleanedData[field as keyof typeof cleanedData];
            if (val === '' || val === undefined) {
                (cleanedData as any)[field] = null;
            } else {
                (cleanedData as any)[field] = parseFloat(val as string);
            }
        });

        const token = localStorage.getItem('token');
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${VEHICLE_API}/${editingId}` : VEHICLE_API;

        try {
            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(cleanedData)
            });
            const data = await res.json();
            if (data.success) {
                success(editingId ? "Vehicle updated!" : "Vehicle registered!");
                setShowForm(false);
                setEditingId(null);
                fetchVehicles(currentCompanyId);
                resetForm();
            } else {
                error(data.message);
            }
        } catch (err: any) {
            error(err.message);
        }
    };

    const handleEdit = (v: any) => {
        setEditingId(v.id);
        setFormData({
            registration_number: v.registration_number || '',
            make: v.make || '',
            model: v.model || '',
            vehicle_type: v.vehicle_type || '',
            body_type: v.body_type || '',
            year: v.year || new Date().getFullYear(),
            fuel_type: v.fuel_type || 'Diesel',
            tank_capacity: v.tank_capacity || '',
            current_km: v.current_km || '',
            km_on_day_1: v.km_on_day_1 || '',
            status: v.status || 'Active',
            insurance_expiry: v.insurance_expiry || '',
            fitness_date: v.fitness_date || '',
            fitness_renewal_date: v.fitness_renewal_date || '',
            permit_expiry: v.permit_expiry || '',
            pollution_expiry: v.pollution_expiry || '',
            chassis_no: v.chassis_no || '',
            engine_no: v.engine_no || '',
            owner_name: v.owner_name || '',
            owner_address: v.owner_address || '',
            gps_installed: !!v.gps_installed,
            gps_company: v.gps_company || '',
            gps_install_date: v.gps_install_date || '',
            purpose: v.purpose || 'BMW Collection',
            seating_capacity: v.seating_capacity || 0,
            is_active: v.is_active ?? true,
            company_id: currentCompanyId
        });
        setShowForm(true);
        setActiveTab('basic');
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({ 
            title: "Delete Asset?",
            message: "Permanently delete this vehicle record?", 
            type: 'danger' 
        });
        if (!isConfirmed) return;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${VEHICLE_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                success("Vehicle deleted.");
                fetchVehicles(currentCompanyId);
            }
        } catch (err: any) {
            error(err.message);
        }
    };

    const handleComplianceAudit = () => {
        setIsAuditing(true);
        setTimeout(() => {
            const issues = vehicles.filter(v => {
                const fitnessExpired = v.fitness_renewal_date && new Date(v.fitness_renewal_date) < new Date();
                const insuranceExpired = v.insurance_expiry && new Date(v.insurance_expiry) < new Date();
                const pollutionExpired = v.pollution_expiry && new Date(v.pollution_expiry) < new Date();
                const permitExpired = v.permit_expiry && new Date(v.permit_expiry) < new Date();
                return fitnessExpired || insuranceExpired || pollutionExpired || permitExpired;
            });

            if (issues.length === 0) {
                success("Strategic Audit: 100% Compliance.");
                setFilterMode('all');
            } else {
                setFilterMode('compliance');
                success(`Risk Alert: ${issues.length} assets identified with critical document expiration.`);
            }
            setIsAuditing(false);
        }, 1500);
    };

    const resetForm = () => {
        setFormData({
            registration_number: '',
            make: '',
            model: '',
            vehicle_type: '',
            body_type: '',
            year: new Date().getFullYear(),
            fuel_type: 'Diesel',
            tank_capacity: '',
            current_km: '',
            km_on_day_1: '',
            status: 'Active',
            insurance_expiry: '',
            fitness_date: '',
            fitness_renewal_date: '',
            permit_expiry: '',
            pollution_expiry: '',
            chassis_no: '',
            engine_no: '',
            owner_name: '',
            owner_address: '',
            gps_installed: false,
            gps_company: '',
            gps_install_date: '',
            purpose: 'BMW Collection',
            seating_capacity: 0,
            is_active: true,
            company_id: currentCompanyId
        });
        setActiveTab('basic');
    };

    const handleInputChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!canView) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="p-6 rounded-full bg-primary/5 text-primary">
                <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground font-medium">You do not have permission to view the Vehicle Master module.</p>
        </div>
    );

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading flex items-center gap-2">
                        <Truck className="w-8 h-8 md:w-10 md:h-10 text-primary" /> Vehicle Master
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm font-medium">Standardized Fleet Information System (Maxtron-KEIL Unified)</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                    {canCreate && (
                        <Button 
                            onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
                            className="flex-1 md:flex-none h-10 md:h-11 bg-primary hover:bg-primary/95 text-white px-4 md:px-8 rounded-full shadow-lg shadow-primary/20 font-bold uppercase tracking-widest text-[10px] md:text-xs"
                        >
                            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {showForm ? 'Cancel Entry' : 'Register Vehicle'}
                        </Button>
                    )}
                </div>
            </div>

            {showForm && (
                <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-300">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl py-6 p-4 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Edit className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg md:text-xl font-bold text-primary">
                                        {editingId ? 'Modify Fleet Record' : 'Create New Fleet Entry'}
                                    </CardTitle>
                                    <CardDescription className="text-[10px] md:text-xs text-muted-foreground font-medium mt-1">Unified Asset Protocol v1.1</CardDescription>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap bg-primary/5 p-1 rounded-2xl border border-primary/10 justify-center gap-1">
                                {[
                                    { id: 'basic', label: '1. Basic Info', icon: Hash },
                                    { id: 'tech', label: '2. Technical', icon: Settings },
                                    { id: 'compliance', label: '3. Compliance', icon: ShieldCheck },
                                    { id: 'gps', label: '4. Owner & GPS', icon: MapPin },
                                ].map(tab => (
                                    <div
                                        key={tab.id}
                                        className={`flex items-center gap-2 px-3 md:px-6 py-1.5 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${
                                            activeTab === tab.id 
                                            ? 'bg-white text-primary shadow-md' 
                                            : 'text-primary/60'
                                        }`}
                                    >
                                        <tab.icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                        <span>{tab.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-4 md:p-12">
                        {activeTab === 'basic' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Registration Number *</label>
                                    <Input required name="registration_number" value={formData.registration_number} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-background text-xs md:text-sm font-bold uppercase" placeholder="KL 01 AB 1234" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Make / Brand *</label>
                                    <Input required name="make" value={formData.make} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-background text-xs md:text-sm font-medium" placeholder="e.g. TATA" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Model *</label>
                                    <Input required name="model" value={formData.model} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-background text-xs md:text-sm font-medium" placeholder="e.g. Ace" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Vehicle Type *</label>
                                    <Select 
                                        required 
                                        value={formData.vehicle_type} 
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, vehicle_type: val }))}
                                    >
                                        <SelectTrigger className="w-full h-10 md:h-12 rounded-md border-primary/20 bg-background text-xs md:text-sm font-medium">
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200">
                                            {vehicleTypes.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Body Type</label>
                                    <Input name="body_type" value={formData.body_type} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-background text-xs md:text-sm font-medium" placeholder="e.g. Container" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Year of Mfg. *</label>
                                    <Input required type="number" name="year" value={formData.year} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-background text-xs md:text-sm font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Seating Capacity</label>
                                    <Input type="number" name="seating_capacity" value={formData.seating_capacity} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-background text-xs md:text-sm font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Usage Purpose</label>
                                    <Select 
                                        value={formData.purpose} 
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, purpose: val }))}
                                    >
                                        <SelectTrigger className="w-full h-10 md:h-12 rounded-md border-primary/20 bg-background text-xs md:text-sm font-medium">
                                            <SelectValue placeholder="Select Purpose" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200">
                                            {purposes.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {activeTab === 'tech' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-8 duration-500">
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Fuel Type</label>
                                    <Select 
                                        value={formData.fuel_type} 
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, fuel_type: val }))}
                                    >
                                        <SelectTrigger className="w-full h-10 md:h-12 rounded-md border-primary/20 bg-background text-xs md:text-sm font-medium">
                                            <SelectValue placeholder="Select Fuel" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200">
                                            {fuelTypes.map(f => (
                                                <SelectItem key={f} value={f}>{f}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Tank Capacity (Ltr)</label>
                                    <Input type="number" name="tank_capacity" value={formData.tank_capacity} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-background text-xs md:text-sm font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Engine Number</label>
                                    <Input name="engine_no" value={formData.engine_no} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-background text-xs md:text-sm font-bold uppercase font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">Chassis Number</label>
                                    <Input name="chassis_no" value={formData.chassis_no} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-background text-xs md:text-sm font-bold uppercase font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-foreground/80 pl-1 uppercase tracking-wider">KM on Day 1</label>
                                    <Input type="number" name="km_on_day_1" value={formData.km_on_day_1} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-background text-xs md:text-sm font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-secondary pl-1 uppercase tracking-wider flex items-center gap-2">
                                        <BarChart3 className="w-3 h-3" /> Current Odometer
                                    </label>
                                    <Input type="number" name="current_km" value={formData.current_km} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-secondary/30 bg-secondary/5 text-secondary font-bold text-xs md:text-sm" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'compliance' && (
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-500">
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-primary pl-1 uppercase tracking-wider">Insurance Expiry</label>
                                    <Input type="date" name="insurance_expiry" value={formData.insurance_expiry} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-primary/5 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-primary pl-1 uppercase tracking-wider">Fitness Date</label>
                                    <Input type="date" name="fitness_date" value={formData.fitness_date} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-primary/5 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-primary pl-1 uppercase tracking-wider">Fitness Renewal</label>
                                    <Input type="date" name="fitness_renewal_date" value={formData.fitness_renewal_date} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-primary/5 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-primary pl-1 uppercase tracking-wider">Pollution Expiry</label>
                                    <Input type="date" name="pollution_expiry" value={formData.pollution_expiry} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-primary/5 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-primary pl-1 uppercase tracking-wider">Permit Expiry</label>
                                    <Input type="date" name="permit_expiry" value={formData.permit_expiry} onChange={handleInputChange} className="h-10 md:h-11 rounded-md border-primary/20 bg-primary/5 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-semibold text-muted-foreground pl-1 uppercase tracking-wider">Operational Status</label>
                                    <Select 
                                        value={formData.status} 
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                                    >
                                        <SelectTrigger className="w-full h-10 md:h-12 rounded-md border-primary/20 bg-background text-xs md:text-sm font-bold">
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200">
                                            {statusOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {activeTab === 'gps' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-8 duration-500">
                                <div className="p-6 md:p-8 bg-primary/5 rounded-2xl border border-primary/10 space-y-6">
                                    <h3 className="text-[10px] md:text-xs font-bold text-primary flex items-center gap-3 uppercase tracking-widest">
                                        <User className="w-4 h-4" /> Ownership Details
                                    </h3>
                                    <div className="space-y-2">
                                        <label className="text-[10px] md:text-xs font-medium text-foreground/70 uppercase">Owner Name</label>
                                        <Input name="owner_name" value={formData.owner_name} onChange={handleInputChange} className="h-10 md:h-11 rounded-md bg-white border-primary/20 shadow-sm font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] md:text-xs font-medium text-foreground/70 uppercase">Owner Address</label>
                                        <textarea 
                                            name="owner_address" 
                                            value={formData.owner_address} 
                                            onChange={handleInputChange} 
                                            className="w-full h-24 p-4 rounded-md border border-primary/20 bg-white text-xs md:text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none font-medium"
                                            placeholder="Enter full legal address..."
                                        />
                                    </div>
                                </div>

                                <div className="p-6 md:p-8 bg-secondary/5 rounded-2xl border border-secondary/10 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[10px] md:text-xs font-bold text-secondary flex items-center gap-3 uppercase tracking-widest">
                                            <Navigation className="w-4 h-4" /> GPS Telemetry
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Installed?</span>
                                            <input type="checkbox" name="gps_installed" checked={formData.gps_installed} onChange={handleInputChange} className="w-5 h-5 accent-secondary" />
                                        </div>
                                    </div>
                                    {formData.gps_installed && (
                                        <div className="space-y-6 animate-in fade-in">
                                            <div className="space-y-2">
                                                <label className="text-[10px] md:text-xs font-medium text-foreground/70 uppercase">Hardware Provider</label>
                                                <Input name="gps_company" value={formData.gps_company} onChange={handleInputChange} className="h-10 md:h-11 rounded-md bg-white border-secondary/20 shadow-sm font-bold" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] md:text-xs font-medium text-foreground/70 uppercase">Installation Date</label>
                                                <Input type="date" name="gps_install_date" value={formData.gps_install_date} onChange={handleInputChange} className="h-10 md:h-11 rounded-md bg-white border-secondary/20 shadow-sm font-bold" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-8 pt-8 border-t border-primary/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex gap-2 w-full sm:w-auto">
                                {activeTab !== 'basic' && (
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            if (activeTab === 'tech') setActiveTab('basic');
                                            if (activeTab === 'compliance') setActiveTab('tech');
                                            if (activeTab === 'gps') setActiveTab('compliance');
                                        }}
                                        className="flex-1 sm:flex-none rounded-full px-6 h-10 border-primary/20 hover:bg-primary/5 font-bold uppercase tracking-widest text-[9px] md:text-[10px]"
                                    >
                                        Back
                                    </Button>
                                )}
                                <Button 
                                    variant="ghost" 
                                    onClick={() => { setShowForm(false); resetForm(); }}
                                    className="flex-1 sm:flex-none rounded-full px-6 text-slate-400 hover:text-rose-500 font-bold h-10 uppercase tracking-widest text-[9px] md:text-[10px]"
                                >
                                    Discard Entry
                                </Button>
                            </div>

                            <div className="flex gap-3 w-full sm:w-auto">
                                {activeTab !== 'gps' ? (
                                    <>
                                        {formData.registration_number && formData.make && formData.model && (
                                            <Button 
                                                onClick={handleSave} 
                                                variant="outline"
                                                className="hidden md:flex border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-full px-6 h-11 font-bold uppercase tracking-widest text-[9px] md:text-[10px]"
                                            >
                                                Quick Commit
                                            </Button>
                                        )}
                                        <Button 
                                            onClick={() => {
                                                if (activeTab === 'basic') {
                                                    const { registration_number, make, model, vehicle_type, year } = formData;
                                                    if (!registration_number || !make || !model || !vehicle_type || !year) {
                                                        error("Complete Basic Info: Registration, Make, Model, Type, and Year are required.");
                                                        return;
                                                    }
                                                    setActiveTab('tech');
                                                }
                                                else if (activeTab === 'tech') setActiveTab('compliance');
                                                else if (activeTab === 'compliance') setActiveTab('gps');
                                            }}
                                            className="flex-1 sm:flex-none bg-primary hover:bg-primary/95 text-white rounded-full px-10 h-11 shadow-lg font-bold uppercase tracking-widest text-[9px] md:text-[10px]"
                                        >
                                            Next Section
                                        </Button>
                                    </>
                                ) : (
                                    <Button 
                                        onClick={handleSave} 
                                        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 h-11 shadow-lg shadow-emerald-100 font-bold flex items-center justify-center transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-[9px] md:text-[10px]"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {editingId ? 'Update Record' : 'Commit Asset'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!showForm && (
                <div className="space-y-6">
                    <Card className="border-primary/20 flex flex-col md:flex-row items-stretch md:items-center justify-between shadow-xl rounded-xl overflow-hidden bg-primary text-white p-4 md:p-8 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-primary-foreground/60 leading-tight">Strategic Summary</h3>
                                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">Real-time Asset Intelligence</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-1 items-center justify-around gap-4 md:gap-12 py-4 md:py-0 border-y md:border-y-0 md:border-x border-white/10">
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] md:text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Active Units</span>
                                <span className="text-2xl md:text-3xl font-bold italic tabular-nums">{vehicles.filter(v=>v.status==='Active').length} <span className="text-xs text-white/20 italic">/ {vehicles.length}</span></span>
                            </div>

                            <div className="flex flex-col items-center">
                                <span className="text-[9px] md:text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Compliance Risk</span>
                                <span className="text-2xl md:text-3xl font-bold italic text-secondary tabular-nums leading-none">
                                    {vehicles.filter(v=>(v.fitness_renewal_date && new Date(v.fitness_renewal_date) < new Date())).length}
                                </span>
                            </div>
                        </div>

                        <Button 
                            onClick={handleComplianceAudit}
                            disabled={isAuditing}
                            className="w-full md:w-auto px-6 h-10 md:h-12 rounded-full bg-white text-primary hover:bg-white/90 font-bold uppercase tracking-widest text-[10px] shadow-2xl transition-all"
                        >
                            {isAuditing ? 'Analyzing Registry...' : 'Compliance Audit'}
                        </Button>
                    </Card>

                    <Card className="border-primary/10 shadow-sm rounded-xl overflow-hidden bg-white">
                        <TableView 
                            title="Fleet Directory Protocol"
                            description="Comprehensive tracking of vehicles and regulatory status."
                            headers={['Registry / Type', 'Technical Details', 'Compliance Status', 'Operational Status', 'Telemetry', 'Actions']}
                            data={filterMode === 'compliance' 
                                ? vehicles.filter(v => (v.fitness_renewal_date && new Date(v.fitness_renewal_date) < new Date()) || (v.insurance_expiry && new Date(v.insurance_expiry) < new Date()))
                                : vehicles
                            }
                            loading={loading}
                            searchFields={['registration_number', 'model', 'owner_name']}
                            renderRow={(v: any) => {
                                const fitnessExpired = v.fitness_renewal_date && new Date(v.fitness_renewal_date) < new Date();
                                const insuranceExpired = v.insurance_expiry && new Date(v.insurance_expiry) < new Date();
                                
                                return (
                                    <tr key={v.id} className="hover:bg-primary/[0.02] transition-colors border-b border-primary/5 last:border-0 group">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
                                                    <Truck className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm md:text-base font-bold text-foreground uppercase tracking-wider">{v.registration_number}</span>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{v.make} • {v.model} ({v.vehicle_type})</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs md:text-sm font-bold text-foreground">{parseFloat(v.current_km || '0').toLocaleString()} <span className="text-[10px] text-muted-foreground/50">KM</span></span>
                                                <span className="text-[9px] md:text-[10px] font-bold text-primary/60 uppercase">{v.fuel_type} • {v.tank_capacity}L</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${insuranceExpired ? 'bg-secondary/20 border-secondary/30 text-secondary animate-pulse shadow-sm shadow-secondary/20' : 'bg-primary/5 border-primary/10 text-primary/40 opacity-70'}`} title="Insurance">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </div>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${fitnessExpired ? 'bg-secondary/20 border-secondary/30 text-secondary animate-pulse shadow-sm shadow-secondary/20' : 'bg-primary/5 border-primary/10 text-primary/40 opacity-70'}`} title="Fitness">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest border ${
                                                v.status === 'Active' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                                                v.status === 'Maintenance' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                'bg-muted text-muted-foreground border-muted-foreground/10'
                                            }`}>
                                                {v.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6">
                                            {v.gps_installed ? (
                                                <div className="flex items-center gap-2 text-secondary font-bold text-[9px] md:text-[10px] uppercase tracking-widest">
                                                    <div className="w-2 h-2 rounded-full bg-secondary animate-ping" />
                                                    Active Link
                                                </div>
                                            ) : (
                                                <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Offline</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex justify-end gap-1 md:gap-2">
                                                {canEdit && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(v)} className="hover:bg-primary/10 text-primary/60 hover:text-primary rounded-xl border border-primary/5 hover:border-primary/20 h-9 w-9 transition-all">
                                                        <Edit className="w-4.5 h-4.5" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="hover:bg-secondary/10 text-secondary/60 hover:text-secondary rounded-xl border border-secondary/5 hover:border-secondary/20 h-9 w-9 transition-all">
                                                        <Trash2 className="w-4.5 h-4.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }}
                        />
                    </Card>
                </div>
            )}
        </div>
    );
}
