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
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const VEHICLE_API = `${API_BASE}/api/keil/fleet/vehicles`;

const vehicleTypes = ['LCV', 'HCV', 'Car', 'Bike', 'Bus', 'Other'];
const purposes = ['BMW Collection', 'Delivery', 'Office Use', 'Employee Transportation'];

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
        // Validation Suite
        if (!formData.registration_number) {
            error("Please enter the unique Vehicle Registration Number.");
            return;
        }
        if (!formData.make) {
            error("Please specify the Vehicle Make / Manufacturer.");
            return;
        }
        if (!formData.model) {
            error("Please enter the Vehicle Model / Variant.");
            return;
        }
        if (!formData.vehicle_type) {
            error("Please select a specific Vehicle Type classification.");
            return;
        }
        if (!formData.year || formData.year < 1900) {
            error("Please enter a valid Year of Mfg.");
            return;
        }

        // Non-negative checks
        const numericChecks = [
            { val: formData.tank_capacity, label: "Tank Capacity" },
            { val: formData.km_on_day_1, label: "KM on Day 1" },
            { val: formData.current_km, label: "Current Odometer Reading" },
            { val: formData.seating_capacity, label: "Seating Capacity" }
        ];

        for (const check of numericChecks) {
            if (check.val !== '' && parseFloat(check.val as string) < 0) {
                error(`${check.label} cannot be negative.`);
                return;
            }
        }

        const token = localStorage.getItem('token');
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${VEHICLE_API}/${editingId}` : VEHICLE_API;

        // Clean dates for PG
        const cleanData = {
            ...formData,
            fitness_date: formData.fitness_date || null,
            fitness_renewal_date: formData.fitness_renewal_date || null,
            gps_install_date: formData.gps_install_date || null,
            insurance_expiry: formData.insurance_expiry || null,
            permit_expiry: formData.permit_expiry || null,
            pollution_expiry: formData.pollution_expiry || null,
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
            ...v,
            fitness_date: v.fitness_date || '',
            fitness_renewal_date: v.fitness_renewal_date || '',
            insurance_expiry: v.insurance_expiry || '',
            permit_expiry: v.permit_expiry || '',
            pollution_expiry: v.pollution_expiry || '',
            gps_install_date: v.gps_install_date || '',
            company_id: currentCompanyId
        });
        setShowForm(true);
        setActiveTab('basic');
    };

    const handleDelete = async (id: string) => {
        if (await confirm({ message: "Permanently delete this vehicle record?" })) {
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
        }
    };

    const handleComplianceAudit = () => {
        setIsAuditing(true);
        // Simulate Strategic Scan
        setTimeout(() => {
            const issues = vehicles.filter(v => {
                const fitnessExpired = v.fitness_renewal_date && new Date(v.fitness_renewal_date) < new Date();
                const insuranceExpired = v.insurance_expiry && new Date(v.insurance_expiry) < new Date();
                return fitnessExpired || insuranceExpired;
            });

            if (issues.length === 0) {
                success("Strategic Audit: 100% Compliance. All assets are legally verified.");
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: any = value;
        if (type === 'number') finalValue = value === '' ? '' : parseFloat(value);
        if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;
        
        setFormData(prev => ({ ...prev, [name]: finalValue }));
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
        <div className="md:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-2">
                        <Truck className="w-8 h-8 text-primary" />
                        Vehicle Master
                        <span className="ml-4 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] rounded-full border border-emerald-100 flex items-center gap-2 font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" /> Fleet Aligned
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">Standardized Fleet Information System (Maxtron-KEIL Unified)</p>
                </div>
                {canCreate && (
                    <Button 
                        onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
                        className="bg-primary hover:bg-primary/90 text-white px-8 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-10 font-bold uppercase tracking-wider"
                    >
                        {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {showForm ? 'Cancel' : 'Register Vehicle'}
                    </Button>
                )}
            </div>

            {showForm && (
                <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-300">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl py-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Edit className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold text-primary">
                                        {editingId ? 'Modify Fleet Record' : 'Create New Fleet Entry'}
                                    </CardTitle>
                                    <CardDescription className="text-muted-foreground font-medium mt-1">Unified Asset Protocol v1.1</CardDescription>
                                </div>
                            </div>
                            
                            <div className="flex bg-primary/5 p-1.5 rounded-2xl border border-primary/10 pointer-events-none justify-center">
                                {[
                                    { id: 'basic', label: '1. Basic Info', icon: Hash },
                                    { id: 'tech', label: '2. Technical', icon: Settings },
                                    { id: 'compliance', label: '3. Compliance', icon: ShieldCheck },
                                    { id: 'gps', label: '4. Owner & GPS', icon: MapPin },
                                ].map(tab => (
                                    <div
                                        key={tab.id}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                            activeTab === tab.id 
                                            ? 'bg-white text-primary shadow-lg scale-105' 
                                            : 'text-primary/60'
                                        }`}
                                    >
                                        <tab.icon className="w-3.5 h-3.5" />
                                        <span className="hidden md:block">{tab.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="md:p-12">
                        {activeTab === 'basic' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Registration Number *</label>
                                    <Input required name="registration_number" value={formData.registration_number} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-bold uppercase" placeholder="KL 01 AB 1234" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Make / Brand *</label>
                                    <Input required name="make" value={formData.make} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-medium" placeholder="e.g. TATA" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Model *</label>
                                    <Input required name="model" value={formData.model} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-medium" placeholder="e.g. Ace" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Vehicle Type *</label>
                                    <select required name="vehicle_type" value={formData.vehicle_type} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-medium">
                                        <option value="">Select Type</option>
                                        {vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Body Type</label>
                                    <Input name="body_type" value={formData.body_type} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-medium" placeholder="e.g. Container" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Year of Mfg. *</label>
                                    <Input required type="number" min={1900} name="year" value={formData.year} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Seating Capacity</label>
                                    <Input type="number" min={0} name="seating_capacity" value={formData.seating_capacity} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Usage Purpose</label>
                                    <select name="purpose" value={formData.purpose} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-medium">
                                        {purposes.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeTab === 'tech' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8 animate-in slide-in-from-right-8 duration-500">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Fuel Type</label>
                                    <select name="fuel_type" value={formData.fuel_type} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-medium">
                                        <option value="Diesel">Diesel</option>
                                        <option value="Electric">Electric</option>
                                        <option value="CNG">CNG</option>
                                        <option value="Petrol">Petrol</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Tank Capacity (Ltr)</label>
                                    <Input type="number" min={0} name="tank_capacity" value={formData.tank_capacity} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Engine Number</label>
                                    <Input name="engine_no" value={formData.engine_no} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-bold uppercase" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">Chassis Number</label>
                                    <Input name="chassis_no" value={formData.chassis_no} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-bold uppercase" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 pl-1">KM on Day 1</label>
                                    <Input type="number" min={0} name="km_on_day_1" value={formData.km_on_day_1} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-background text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none shadow-sm font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-secondary pl-1 flex items-center gap-2">
                                        <BarChart3 className="w-3 h-3" /> Current Odometer Reading
                                    </label>
                                    <Input type="number" min={0} name="current_km" value={formData.current_km} onChange={handleInputChange} className="h-10 rounded-md border-secondary/30 bg-secondary/5 text-secondary font-bold text-sm" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'compliance' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-in zoom-in-95 duration-500">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-primary pl-1">Insurance Expiry</label>
                                    <Input type="date" name="insurance_expiry" value={formData.insurance_expiry} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-primary/5 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-primary pl-1">Fitness Issuance Date</label>
                                    <Input type="date" name="fitness_date" value={formData.fitness_date} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-primary/5 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-primary pl-1">Fitness Renewal Date</label>
                                    <Input type="date" name="fitness_renewal_date" value={formData.fitness_renewal_date} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-primary/5 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-primary pl-1">Pollution Expiry</label>
                                    <Input type="date" name="pollution_expiry" value={formData.pollution_expiry} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-primary/5 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-primary pl-1">Permit Expiry</label>
                                    <Input type="date" name="permit_expiry" value={formData.permit_expiry} onChange={handleInputChange} className="h-10 rounded-md border-primary/20 bg-primary/5 font-bold" />
                                </div>
                                <div className="space-y-2 lg:col-span-1">
                                    <label className="text-sm font-semibold text-muted-foreground pl-1">Operational Status</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-primary/20 bg-background text-sm font-bold focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/20 focus:outline-none">
                                        <option value="Active">Operational</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Out of Service">Decommissioned</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeTab === 'gps' && (
                            <div className="space-y-10 animate-in slide-in-from-top-8 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="p-8 bg-primary/5 rounded-2xl border border-primary/10 space-y-6">
                                        <h3 className="text-sm font-bold text-primary flex items-center gap-3">
                                            <User className="w-4 h-4" /> Ownership Verification
                                        </h3>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground/70">Owner Name</label>
                                            <Input name="owner_name" value={formData.owner_name} onChange={handleInputChange} className="h-10 rounded-md bg-white border-primary/20 shadow-sm font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground/70">Owner Address</label>
                                            <Input name="owner_address" value={formData.owner_address} onChange={handleInputChange} className="h-10 rounded-md bg-white border-primary/20 shadow-sm font-bold" />
                                        </div>
                                    </div>

                                    <div className="p-8 bg-secondary/5 rounded-2xl border border-secondary/10 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-secondary flex items-center gap-3">
                                                <Navigation className="w-4 h-4" /> GPS Telemetry Hardware
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hardware Active?</span>
                                                <input type="checkbox" name="gps_installed" checked={formData.gps_installed} onChange={handleInputChange} className="w-5 h-5 accent-secondary" />
                                            </div>
                                        </div>
                                        {formData.gps_installed && (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-foreground/70">Hardware Provider</label>
                                                    <Input name="gps_company" value={formData.gps_company} onChange={handleInputChange} className="h-10 rounded-md bg-white border-secondary/20 shadow-sm font-bold" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-foreground/70">Installation Date</label>
                                                    <Input type="date" name="gps_install_date" value={formData.gps_install_date} onChange={handleInputChange} className="h-10 rounded-md bg-white border-secondary/20 shadow-sm font-bold" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 pt-8 border-t border-primary/10 flex justify-between items-center">
                            <div className="flex gap-3">
                                {activeTab !== 'basic' && (
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            if (activeTab === 'tech') setActiveTab('basic');
                                            if (activeTab === 'compliance') setActiveTab('tech');
                                            if (activeTab === 'gps') setActiveTab('compliance');
                                        }}
                                        className="rounded-full px-8 h-10 font-bold border-primary/20 hover:bg-primary/5"
                                    >
                                        Back
                                    </Button>
                                )}
                                <Button 
                                    variant="ghost" 
                                    onClick={() => { setShowForm(false); resetForm(); }}
                                    className="rounded-full px-4 text-slate-400 hover:text-rose-500 font-medium h-10"
                                >
                                    Cancel Entry
                                </Button>
                            </div>

                            <div className="flex gap-3">
                                {activeTab !== 'gps' ? (
                                    <Button 
                                        onClick={() => {
                                            if (activeTab === 'basic') {
                                                if (!formData.registration_number) {
                                                    error("Please enter the unique Vehicle Registration Number.");
                                                    return;
                                                }
                                                if (!formData.make) {
                                                    error("Please specify the Vehicle Make / Manufacturer.");
                                                    return;
                                                }
                                                if (!formData.model) {
                                                    error("Please enter the Vehicle Model / Variant.");
                                                    return;
                                                }
                                                if (!formData.vehicle_type) {
                                                    error("Please select a specific Vehicle Type classification.");
                                                    return;
                                                }
                                                setActiveTab('tech');
                                            }
                                            else if (activeTab === 'tech') setActiveTab('compliance');
                                            else if (activeTab === 'compliance') setActiveTab('gps');
                                        }}
                                        className="bg-primary hover:bg-primary/95 text-white rounded-full px-10 h-11 shadow-lg font-bold"
                                    >
                                        Next Section
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={handleSave} 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 h-11 shadow-lg shadow-emerald-100 font-bold flex items-center transition-all hover:scale-105"
                                    >
                                        <Save className="w-4 h-4 mr-3" />
                                        {editingId ? 'Update Record' : 'Commit Asset'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!showForm && (
                <div className="flex flex-col gap-8">
                    <div className="animate-in slide-in-from-right-10 duration-700">
                        <Card className="border-primary/20 flex flex-col md:flex-row items-center justify-between shadow-xl rounded-xl overflow-hidden bg-primary text-white p-8 gap-8">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                    <BarChart3 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary-foreground/60">Strategic Summary</h3>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Real-time Asset Intelligence</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-1 flex-wrap items-center justify-around gap-8 md:gap-12 py-4 md:py-0 border-y md:border-y-0 md:border-x border-white/10 w-full md:w-auto">
                                <div className="flex flex-col items-center md:items-start">
                                    <span className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Active Units</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold italic tabular-nums leading-none">
                                            {vehicles.filter(v=>v.status==='Active').length}
                                        </span>
                                        <span className="text-sm font-bold text-white/20 uppercase">/ {vehicles.length} Total</span>
                                    </div>
                                </div>

                                <div className="hidden md:block w-px h-12 bg-white/10" />

                                <div className="flex flex-col items-center md:items-start">
                                    <span className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Compliance Alert</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl font-bold italic text-secondary tabular-nums leading-none">
                                            {vehicles.filter(v=>(v.fitness_renewal_date && new Date(v.fitness_renewal_date) < new Date()) || (v.insurance_expiry && new Date(v.insurance_expiry) < new Date())).length}
                                        </span>
                                        <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center text-secondary">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                onClick={handleComplianceAudit}
                                disabled={isAuditing || !canEdit}
                                className="w-full md:w-auto px-8 h-12 rounded-full bg-white text-primary hover:bg-white/90 font-bold uppercase tracking-widest text-[10px] shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                {isAuditing ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        Analyzing...
                                    </div>
                                ) : 'Compliance Audit'}
                            </Button>
                        </Card>
                    </div>
                    <Card className="lg:col-span-3 border-primary/10 shadow-sm rounded-xl overflow-hidden bg-white">
                        <div className="bg-primary/5 px-6 py-4 flex justify-between items-center border-b border-primary/10">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${filterMode === 'compliance' ? 'bg-secondary animate-pulse' : 'bg-primary/20'}`} />
                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                                    {filterMode === 'compliance' ? 'Viewing: Regulatory Risks Only' : 'Fleet Directory Protocol'}
                                </span>
                            </div>
                            {filterMode === 'compliance' && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setFilterMode('all')}
                                    className="h-7 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10"
                                >
                                    Reset View
                                </Button>
                            )}
                        </div>
                        <TableView 
                            title={filterMode === 'compliance' ? "Audit Results" : "Fleet Directory"}
                            description={filterMode === 'compliance' ? "Isolating assets requiring immediate regulatory intervention." : "Comprehensive tracking of BMW collection units and compliance status."}
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
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                                    <Truck className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-base font-bold text-foreground uppercase tracking-wider">{v.registration_number}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{v.vehicle_type} | {v.make}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 font-bold text-muted-foreground">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground">{parseFloat(v.km_on_day_1).toLocaleString()} <span className="text-[10px] text-muted-foreground/50">KM on Day 1</span></span>
                                                <span className="text-sm font-bold text-primary italic">ODO → {parseFloat(v.current_km).toLocaleString()} KM</span>
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
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                                v.status === 'Active' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                                                v.status === 'Maintenance' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                'bg-muted text-muted-foreground border-muted-foreground/10'
                                            }`}>
                                                {v.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6">
                                            {v.gps_installed ? (
                                                <div className="flex items-center gap-2 text-secondary font-bold text-[10px] uppercase tracking-widest">
                                                    <div className="w-2 h-2 rounded-full bg-secondary animate-ping" />
                                                    GPS Link
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">No Link</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex justify-end gap-2 transition-all duration-300">
                                                {canEdit && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(v)} className="hover:bg-primary/10 text-primary/60 hover:text-primary rounded-xl border border-primary/5 hover:border-primary/20 h-10 w-10 transition-all shadow-sm hover:shadow-md">
                                                        <Edit className="w-5 h-5 text-primary" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="hover:bg-secondary/10 text-secondary/60 hover:text-secondary rounded-xl border border-secondary/5 hover:border-secondary/20 h-10 w-10 transition-all shadow-sm hover:shadow-md">
                                                        <Trash2 className="w-5 h-5 text-secondary" />
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
