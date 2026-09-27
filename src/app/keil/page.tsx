'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Truck, 
    Building2, 
    Map, 
    Activity, 
    Calendar, 
    ArrowUpRight, 
    TrendingUp, 
    Users, 
    Lock, 
    Loader2, 
    Fuel,
    Gauge,
    Wrench,
    CheckCircle2,
    IndianRupee,
    Filter,
    ShieldAlert,
    BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { usePermission } from '@/hooks/usePermission';
import { AnnouncementSection } from '@/components/dashboard/AnnouncementSection';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export default function KeilDashboard() {
    const { hasPermission, loading: permissionLoading } = usePermission();
    const canView = hasPermission('dashboard_view', 'view');

    const [stats, setStats] = useState({
        branches: 0,
        routes: 0,
        hces: 0,
        collectionsToday: 0
    });

    // Master dataset states
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [vehicleLogs, setVehicleLogs] = useState<any[]>([]);
    const [collections, setCollections] = useState<any[]>([]);
    const [fuelFillings, setFuelFillings] = useState<any[]>([]);
    const [repairs, setRepairs] = useState<any[]>([]);

    // Filter states for individual summary cards
    const [filterKmVehicle, setFilterKmVehicle] = useState('all');
    const [filterCollectionRoute, setFilterCollectionRoute] = useState('all');
    const [filterFuelVehicle, setFilterFuelVehicle] = useState('all');
    const [filterMaintenanceVehicle, setFilterMaintenanceVehicle] = useState('all');

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            // Find KEIL company ID first
            const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const compData = await compRes.json();
            
            let keilCo = null;
            if (compData.success && Array.isArray(compData.data)) {
                keilCo = compData.data.find((c: any) => 
                    c.company_name?.toUpperCase().includes('KEIL')
                );
            }
            
            if (keilCo) {
                const coId = keilCo.id;
                const today = new Date().toISOString().split('T')[0];

                const [
                    bRes, 
                    rRes, 
                    hRes, 
                    cTodayRes,
                    vRes,
                    logsRes,
                    allCollectionsRes,
                    fuelRes,
                    repairsRes
                ] = await Promise.all([
                    fetch(`${API_BASE}/api/keil/operations/branches?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                    fetch(`${API_BASE}/api/keil/operations/routes?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                    fetch(`${API_BASE}/api/keil/operations/hces?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                    fetch(`${API_BASE}/api/keil/operations/collections?company_id=${coId}&date=${today}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                    fetch(`${API_BASE}/api/keil/fleet/vehicles?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                    fetch(`${API_BASE}/api/keil/fleet/logs?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                    fetch(`${API_BASE}/api/keil/operations/collections?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                    fetch(`${API_BASE}/api/keil/fleet/fuel-fillings?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                    fetch(`${API_BASE}/api/keil/fleet/repairs?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                ]);

                const bData = bRes ? await bRes.json() : null;
                const rData = rRes ? await rRes.json() : null;
                const hData = hRes ? await hRes.json() : null;
                const cTodayData = cTodayRes ? await cTodayRes.json() : null;
                const vData = vRes ? await vRes.json() : null;
                const logsData = logsRes ? await logsRes.json() : null;
                const allColData = allCollectionsRes ? await allCollectionsRes.json() : null;
                const fuelData = fuelRes ? await fuelRes.json() : null;
                const repairsData = repairsRes ? await repairsRes.json() : null;

                setStats({
                    branches: bData?.data?.length || 0,
                    routes: rData?.data?.length || 0,
                    hces: hData?.data?.length || 0,
                    collectionsToday: cTodayData?.data?.length || 0
                });

                if (vData?.success && Array.isArray(vData.data)) setVehicles(vData.data);
                if (rData?.success && Array.isArray(rData.data)) setRoutes(rData.data);
                if (logsData?.success && Array.isArray(logsData.data)) setVehicleLogs(logsData.data);
                if (allColData?.success && Array.isArray(allColData.data)) setCollections(allColData.data);
                if (fuelData?.success && Array.isArray(fuelData.data)) setFuelFillings(fuelData.data);
                if (repairsData?.success && Array.isArray(repairsData.data)) setRepairs(repairsData.data);
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    // 1. Total Running KM (filtered by vehicle)
    const runningKmData = useMemo(() => {
        const filtered = filterKmVehicle === 'all'
            ? vehicleLogs
            : vehicleLogs.filter(l => String(l.vehicle_id) === String(filterKmVehicle));

        const totalKm = filtered.reduce((acc, log) => {
            const start = parseFloat(log.start_km) || 0;
            const end = parseFloat(log.end_km) || 0;
            const dist = end - start;
            return acc + (dist > 0 ? dist : 0);
        }, 0);

        const tripCount = filtered.length;
        const avgKm = tripCount > 0 ? (totalKm / tripCount).toFixed(0) : '0';

        const selectedVeh = vehicles.find(v => String(v.id) === String(filterKmVehicle));

        return {
            totalKm,
            tripCount,
            avgKm,
            vehicleLabel: selectedVeh ? selectedVeh.registration_number : 'All Fleet'
        };
    }, [vehicleLogs, filterKmVehicle, vehicles]);

    // 2. Collection % (filtered route-wise)
    const collectionRateData = useMemo(() => {
        const filtered = filterCollectionRoute === 'all'
            ? collections
            : collections.filter(c => String(c.route_id) === String(filterCollectionRoute));

        let totalAssigned = 0;
        let totalVisited = 0;
        let totalWasteQty = 0;

        filtered.forEach(c => {
            const assigned = (Number(c.assigned_bedded) || 0) + (Number(c.assigned_others) || 0);
            const visited = (Number(c.visited_bedded) || 0) + (Number(c.visited_others) || 0);
            totalAssigned += assigned;
            totalVisited += visited;
            totalWasteQty += (parseFloat(c.collection_qty) || 0);
        });

        const percentage = totalAssigned > 0 
            ? Math.round((totalVisited / totalAssigned) * 100) 
            : (filtered.length > 0 ? 100 : 0);

        const selectedRoute = routes.find(r => String(r.id) === String(filterCollectionRoute));

        return {
            percentage,
            totalVisited,
            totalAssigned,
            totalWasteQty,
            batchCount: filtered.length,
            routeLabel: selectedRoute ? selectedRoute.route_name : 'All Routes'
        };
    }, [collections, filterCollectionRoute, routes]);

    // 3. Fuel Consumption (filtered vehicle-wise)
    const fuelConsumptionData = useMemo(() => {
        const filtered = filterFuelVehicle === 'all'
            ? fuelFillings
            : fuelFillings.filter(f => String(f.vehicle_id) === String(filterFuelVehicle));

        let totalLiters = 0;
        let totalAmount = 0;

        filtered.forEach(f => {
            totalLiters += parseFloat(f.liters) || 0;
            totalAmount += parseFloat(f.amount) || 0;
        });

        const refillCount = filtered.length;
        const avgRate = totalLiters > 0 ? (totalAmount / totalLiters).toFixed(2) : '0.00';

        const selectedVeh = vehicles.find(v => String(v.id) === String(filterFuelVehicle));

        return {
            totalLiters,
            totalAmount,
            refillCount,
            avgRate,
            vehicleLabel: selectedVeh ? selectedVeh.registration_number : 'All Fleet'
        };
    }, [fuelFillings, filterFuelVehicle, vehicles]);

    // 4. Vehicle Maintenance (filtered vehicle-wise)
    const maintenanceData = useMemo(() => {
        const filtered = filterMaintenanceVehicle === 'all'
            ? repairs
            : repairs.filter(r => String(r.vehicle_id) === String(filterMaintenanceVehicle));

        let totalCost = 0;
        let gstCost = 0;
        let onRouteIncidents = 0;
        let inProgressCount = 0;

        filtered.forEach(r => {
            const cost = parseFloat(r.cost) || 0;
            totalCost += cost;
            if (r.is_gst_bill) gstCost += cost;
            if (r.is_on_route) onRouteIncidents += 1;
            if (r.status && r.status !== 'Completed') inProgressCount += 1;
        });

        const repairCount = filtered.length;
        const avgCost = repairCount > 0 ? (totalCost / repairCount).toFixed(0) : '0';

        const selectedVeh = vehicles.find(v => String(v.id) === String(filterMaintenanceVehicle));

        return {
            totalCost,
            repairCount,
            gstCost,
            onRouteIncidents,
            inProgressCount,
            avgCost,
            vehicleLabel: selectedVeh ? selectedVeh.registration_number : 'All Fleet'
        };
    }, [repairs, filterMaintenanceVehicle, vehicles]);

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!canView) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4 text-center px-4">
            <div className="p-6 rounded-full bg-primary/5 text-primary">
                <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground font-medium max-w-sm">You do not have permission to access the KEIL Control Center. Please contact your administrator.</p>
        </div>
    );

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">KEIL Control Center</h1>
                    <p className="text-slate-500 font-medium">Monitoring Bio-Medical Waste Logistics, Fleet Telemetry & Route Efficiency.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 font-bold" onClick={() => fetchDashboardStats()}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Refresh Real-time
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/10 font-bold" onClick={() => window.location.href='/keil/operations/collection'}>
                        <Activity className="w-4 h-4 mr-2" /> Log Collection
                    </Button>
                </div>
            </div>

            {/* Announcements Section */}
            <AnnouncementSection tenant="keil" />

            {/* SECTION 1: KEY PERFORMANCE SUMMARY CARDS (Vehicle/Route Filtered) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Operational & Fleet Telemetry</h2>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dynamic Interactive Filters</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Card 1: Total Running KM (Filter by vehicle) */}
                    <Card className="border border-blue-100/80 shadow-lg bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 relative overflow-hidden group hover:shadow-xl transition-all duration-300 rounded-2xl">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                        <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-blue-100/70 text-blue-700">
                                    <Gauge className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 block">Total Running KM</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">{runningKmData.vehicleLabel}</span>
                                </div>
                            </div>
                            <div className="w-28">
                                <Select value={filterKmVehicle} onValueChange={setFilterKmVehicle}>
                                    <SelectTrigger className="h-7 text-[11px] font-bold bg-white/90 border-blue-200 focus:ring-1 focus:ring-blue-400 rounded-lg">
                                        <SelectValue placeholder="Vehicle" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60 text-xs">
                                        <SelectItem value="all" className="font-bold">All Vehicles</SelectItem>
                                        {vehicles.map(v => (
                                            <SelectItem key={v.id} value={String(v.id)}>
                                                {v.registration_number}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-1 space-y-3">
                            <div className="flex items-baseline justify-between">
                                <div className="text-3xl font-black text-slate-800 tracking-tight">
                                    {runningKmData.totalKm.toLocaleString()} <span className="text-sm font-bold text-blue-600">KM</span>
                                </div>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                    {runningKmData.tripCount} Trips
                                </span>
                            </div>

                            <div className="pt-2 border-t border-blue-100/60 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                                <span>Avg Trip Distance</span>
                                <span className="font-black text-slate-700">{runningKmData.avgKm} KM / Trip</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Collection % (Route-wise) */}
                    <Card className="border border-emerald-100/80 shadow-lg bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40 relative overflow-hidden group hover:shadow-xl transition-all duration-300 rounded-2xl">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                        <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-100/70 text-emerald-700">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 block">Collection %</span>
                                    <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[90px] block">{collectionRateData.routeLabel}</span>
                                </div>
                            </div>
                            <div className="w-28">
                                <Select value={filterCollectionRoute} onValueChange={setFilterCollectionRoute}>
                                    <SelectTrigger className="h-7 text-[11px] font-bold bg-white/90 border-emerald-200 focus:ring-1 focus:ring-emerald-400 rounded-lg">
                                        <SelectValue placeholder="Route" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60 text-xs">
                                        <SelectItem value="all" className="font-bold">All Routes</SelectItem>
                                        {routes.map(r => (
                                            <SelectItem key={r.id} value={String(r.id)}>
                                                {r.route_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-1 space-y-3">
                            <div className="flex items-baseline justify-between">
                                <div className="text-3xl font-black text-slate-800 tracking-tight">
                                    {collectionRateData.percentage}<span className="text-xl font-bold text-emerald-600">%</span>
                                </div>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    collectionRateData.percentage >= 90 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : collectionRateData.percentage >= 70 
                                        ? 'bg-amber-100 text-amber-700' 
                                        : 'bg-rose-100 text-rose-700'
                                }`}>
                                    {collectionRateData.totalVisited}/{collectionRateData.totalAssigned || 0} HCEs
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        collectionRateData.percentage >= 90 ? 'bg-emerald-500' : collectionRateData.percentage >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(collectionRateData.percentage, 100)}%` }}
                                ></div>
                            </div>

                            <div className="pt-2 border-t border-emerald-100/60 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                                <span>Waste Collected</span>
                                <span className="font-black text-slate-700">{collectionRateData.totalWasteQty.toLocaleString()} KG</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Fuel Consumption (Vehicle-wise) */}
                    <Card className="border border-amber-100/80 shadow-lg bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 relative overflow-hidden group hover:shadow-xl transition-all duration-300 rounded-2xl">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                        <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-amber-100/70 text-amber-700">
                                    <Fuel className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 block">Fuel Consumption</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">{fuelConsumptionData.vehicleLabel}</span>
                                </div>
                            </div>
                            <div className="w-28">
                                <Select value={filterFuelVehicle} onValueChange={setFilterFuelVehicle}>
                                    <SelectTrigger className="h-7 text-[11px] font-bold bg-white/90 border-amber-200 focus:ring-1 focus:ring-amber-400 rounded-lg">
                                        <SelectValue placeholder="Vehicle" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60 text-xs">
                                        <SelectItem value="all" className="font-bold">All Vehicles</SelectItem>
                                        {vehicles.map(v => (
                                            <SelectItem key={v.id} value={String(v.id)}>
                                                {v.registration_number}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-1 space-y-3">
                            <div className="flex items-baseline justify-between">
                                <div className="text-3xl font-black text-slate-800 tracking-tight">
                                    {fuelConsumptionData.totalLiters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-bold text-amber-600">Liters</span>
                                </div>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                    {fuelConsumptionData.refillCount} Refills
                                </span>
                            </div>

                            <div className="pt-2 border-t border-amber-100/60 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                                <span>Total Fuel Spend</span>
                                <span className="font-black text-slate-700">₹{fuelConsumptionData.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 4: Vehicle Maintenance (Vehicle-wise) */}
                    <Card className="border border-rose-100/80 shadow-lg bg-gradient-to-br from-white via-rose-50/20 to-rose-50/40 relative overflow-hidden group hover:shadow-xl transition-all duration-300 rounded-2xl">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-600"></div>
                        <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-rose-100/70 text-rose-700">
                                    <Wrench className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 block">Vehicle Maintenance</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">{maintenanceData.vehicleLabel}</span>
                                </div>
                            </div>
                            <div className="w-28">
                                <Select value={filterMaintenanceVehicle} onValueChange={setFilterMaintenanceVehicle}>
                                    <SelectTrigger className="h-7 text-[11px] font-bold bg-white/90 border-rose-200 focus:ring-1 focus:ring-rose-400 rounded-lg">
                                        <SelectValue placeholder="Vehicle" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60 text-xs">
                                        <SelectItem value="all" className="font-bold">All Vehicles</SelectItem>
                                        {vehicles.map(v => (
                                            <SelectItem key={v.id} value={String(v.id)}>
                                                {v.registration_number}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-1 space-y-3">
                            <div className="flex items-baseline justify-between">
                                <div className="text-3xl font-black text-slate-800 tracking-tight">
                                    ₹{maintenanceData.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    maintenanceData.inProgressCount > 0 
                                        ? 'bg-amber-100 text-amber-800' 
                                        : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                    {maintenanceData.repairCount} Logs
                                </span>
                            </div>

                            <div className="pt-2 border-t border-rose-100/60 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                                <span>GST Invoiced Cost</span>
                                <span className="font-black text-slate-700">₹{maintenanceData.gstCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* SECTION 2: INFRASTRUCTURE & NETWORK OVERVIEW */}
            <div className="space-y-3">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Operational Infrastructure</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform duration-300">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Regional Branches</p>
                                    <p className="text-4xl font-black text-slate-800">{stats.branches}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">Operational Zones</p>
                                </div>
                                <Building2 className="w-10 h-10 text-slate-300 group-hover:text-slate-400 transition-colors" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform duration-300">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Enrolled Facilities</p>
                                    <p className="text-4xl font-black text-slate-800">{stats.hces}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">HCE Service Network</p>
                                </div>
                                <Activity className="w-10 h-10 text-slate-300 group-hover:text-slate-400 transition-colors" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform duration-300">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Active Routes</p>
                                    <p className="text-4xl font-black text-slate-800">{stats.routes}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">Mapped Collection Loops</p>
                                </div>
                                <Map className="w-10 h-10 text-slate-300 group-hover:text-slate-400 transition-colors" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white group hover:scale-[1.02] transition-transform duration-300">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Daily Sessions</p>
                                    <p className="text-4xl font-black text-slate-800">{stats.collectionsToday}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">Today's Batch Entries</p>
                                </div>
                                <Truck className="w-10 h-10 text-slate-300 group-hover:text-slate-400 transition-colors" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* SECTION 3: QUICK ACCESS & MODULE SHORTCUTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-black text-slate-800">Operational Quick Access</CardTitle>
                                <CardDescription className="font-medium">Direct links to critical KEIL workflows.</CardDescription>
                            </div>
                            <TrendingUp className="w-10 h-10 text-slate-200" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center border-slate-100 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all rounded-2xl group" onClick={() => window.location.href='/keil/operations/branch'}>
                            <Building2 className="w-6 h-6 mb-1 text-slate-400 group-hover:text-primary mr-0" />
                            <span className="font-black text-xs uppercase tracking-widest">Branch Registry</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center border-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all rounded-2xl group" onClick={() => window.location.href='/keil/operations/hce'}>
                            <Activity className="w-6 h-6 mb-1 text-slate-400 group-hover:text-emerald-600 mr-0" />
                            <span className="font-black text-xs uppercase tracking-widest">HCE Registry</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center border-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all rounded-2xl group" onClick={() => window.location.href='/keil/operations/route'}>
                            <Map className="w-6 h-6 mb-1 text-slate-400 group-hover:text-blue-600 mr-0" />
                            <span className="font-black text-xs uppercase tracking-widest">Route Setup</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center border-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all rounded-2xl group" onClick={() => window.location.href='/keil/operations/reports/route'}>
                            <Calendar className="w-6 h-6 mb-1 text-slate-400 group-hover:text-rose-600 mr-0" />
                            <span className="font-black text-xs uppercase tracking-widest">Daily Reports</span>
                        </Button>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card 
                        className="border-none shadow-xl bg-white p-6 cursor-pointer hover:bg-slate-50 transition-colors group"
                        onClick={() => window.location.href='/keil/hr-payroll/employee'}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-slate-800">Workforce Management</h4>
                                <p className="text-xs text-slate-500">Manage drivers, supervisors and field technicians.</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                    </Card>
                    <Card 
                        className="border-none shadow-xl bg-white p-6 cursor-pointer hover:bg-slate-50 transition-colors group"
                        onClick={() => window.location.href='/keil/fleet/fuel'}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Fuel className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-slate-800">Fleet Data Center</h4>
                                <p className="text-xs text-slate-500">Fuel Telemetry, efficiency reports & consumption logs.</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                    </Card>
                    <Card 
                        className="border-none shadow-xl bg-white p-6 cursor-pointer hover:bg-slate-50 transition-colors group"
                        onClick={() => window.location.href='/keil/hr-payroll/attendance'}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-slate-800">Compliance Calendar</h4>
                                <p className="text-xs text-slate-500">View upcoming audit dates and certificate renewals.</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-rose-500 transition-colors" />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

