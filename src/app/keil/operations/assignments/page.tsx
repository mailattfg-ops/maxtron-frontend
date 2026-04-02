'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Plus, 
    Trash2, 
    Link as LinkIcon, 
    Building2, 
    MapPin, 
    Check,
    Calendar,
    Settings,
    X,
    Save,
    Map,
    Edit,
    Lock,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TableView } from "@/components/ui/table-view";
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const ASSIGN_API = `${API_BASE}/api/keil/operations/assignments`;
const HCE_API = `${API_BASE}/api/keil/operations/hces`;
const ROUTE_API = `${API_BASE}/api/keil/operations/routes`;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function RouteAssignmentsContent() {
    const searchParams = useSearchParams();
    const routeId = searchParams.get('route_id');
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const { hasPermission, loading: permissionLoading } = usePermission();

    const canView = hasPermission('prod_assignment_view', 'view');
    const canCreate = hasPermission('prod_assignment_view', 'create');
    const canEdit = hasPermission('prod_assignment_view', 'edit');
    const canDelete = hasPermission('prod_assignment_view', 'delete');

    const [route, setRoute] = useState<any>(null);
    const [routes, setRoutes] = useState<any[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState(routeId || '');
    const [assignments, setAssignments] = useState<any[]>([]);
    const [availableHces, setAvailableHces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    const [assignmentForm, setAssignmentForm] = useState({
        hce_id: '',
        collection_type: 'Daily',
        collection_days: DAYS,
        remarks: ''
    });

    useEffect(() => {
        fetchRoutesAndHces();
    }, []);

    useEffect(() => {
        if (selectedRouteId) {
            fetchAssignments(selectedRouteId);
        } else {
            setRoute(null);
            setAssignments([]);
        }
    }, [selectedRouteId]);

    const fetchRoutesAndHces = async () => {
        const token = localStorage.getItem('token');
        try {
            // Find KEIL company ID first
            const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const compData = await compRes.json();
            
            let coId = '';
            if (compData.success && Array.isArray(compData.data)) {
                const activeCo = compData.data.find((c: any) => 
                    c.company_name?.toUpperCase().includes('KEIL')
                );
                if (activeCo) coId = activeCo.id;
            }

            if (coId) {
                const [rRes, hRes] = await Promise.all([
                    fetch(`${ROUTE_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${HCE_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                const rData = await rRes.json();
                const hData = await hRes.json();

                if (rData.success) setRoutes(rData.data);
                if (hData.success) setAvailableHces(hData.data);
            }
        } catch (err) {
            console.error('Error fetching baseline data:', err);
        }
    };

    const fetchAssignments = async (id: string) => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const [rRes, aRes] = await Promise.all([
                fetch(`${ROUTE_API}/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${ASSIGN_API}?route_id=${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const rData = await rRes.json();
            const aData = await aRes.json();

            if (rData.success) {
                setRoute(rData.data);
            } else {
                error("Failed to load route details.");
            }
            if (aData.success) setAssignments(aData.data);
        } catch (err) {
            console.error('Error fetching record details:', err);
            error("Connection failed while fetching mapping data.");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        setSubmitting(true);
        try {
            const payload = {
                ...assignmentForm,
                route_id: selectedRouteId,
                company_id: route?.company_id
            };
            
            if (!payload.company_id || !payload.route_id) {
                error("Administrative context missing. Please wait for route data to sync.");
                return;
            }
            const res = await fetch(ASSIGN_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                success("HCE assigned to route.");
                resetForm();
                fetchAssignments(selectedRouteId);
            } else {
                error(data.message);
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        const token = localStorage.getItem('token');
        setSubmitting(true);
        try {
            const res = await fetch(`${ASSIGN_API}/${editingAssignment.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(assignmentForm)
            });
            const data = await res.json();
            if (data.success) {
                success("Assignment updated.");
                setEditingAssignment(null);
                resetForm();
                fetchAssignments(selectedRouteId);
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (await confirm({ message: "Remove this HCE from the route?" })) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${ASSIGN_API}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    success("HCE unlinked from route.");
                    fetchAssignments(selectedRouteId);
                }
            } catch (err: any) {
                error(err.message);
            }
        }
    };

    const resetForm = () => {
        setAssignmentForm({
            hce_id: '',
            collection_type: 'Daily',
            collection_days: DAYS,
            remarks: ''
        });
        setIsAssigning(false);
    };

    const toggleDay = (day: string) => {
        setAssignmentForm(prev => {
            const days = prev.collection_days.includes(day)
                ? prev.collection_days.filter(d => d !== day)
                : [...prev.collection_days, day];
            return { ...prev, collection_days: days };
        });
    };

    const setAllDays = () => {
        setAssignmentForm(prev => ({ ...prev, collection_days: DAYS }));
    };

    const effectiveHces = availableHces.filter(h => {
        const assignedIds = new Set(assignments.map(a => a.hce_id));
        return !assignedIds.has(h.id);
    });

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!canView) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="p-6 rounded-full bg-primary/5 text-primary">
                <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground font-medium">You do not have permission to view the Route Mapping module.</p>
        </div>
    );

    return (
        <div className="md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-4 w-full md:w-auto">
                    <div className="space-y-1 text-center md:text-left">
                        <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Route Mapping</h1>
                        <p className="text-xs md:text-sm font-medium text-muted-foreground">Assign facilities to active logistical loops.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex justify-center items-center group w-full sm:w-[300px]">
                            <Map className="hidden md:block w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors" />
                            <Select value={selectedRouteId} onValueChange={(val) => setSelectedRouteId(val)}>
                                <SelectTrigger className="md:pl-9 h-10 w-full border-primary/20 bg-background shadow-sm font-bold text-xs md:text-sm">
                                    <SelectValue placeholder="Switch / Select Route" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-primary/20">
                                    {routes.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.route_name} ({r.route_code})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {route && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-md border border-primary/10 w-full sm:w-auto justify-center">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{route.route_code}</span>
                                <span className="w-px h-3 bg-primary/20" />
                                <span className="text-[10px] md:text-xs font-bold text-muted-foreground">{route.branch_name}</span>
                            </div>
                        )}
                    </div>
                </div>
                {selectedRouteId && !isAssigning && !editingAssignment && canCreate && (
                    <Button 
                        onClick={() => setIsAssigning(true)} 
                        className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-8 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-10 md:h-11 font-bold uppercase tracking-wider text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95"
                    >
                        <LinkIcon className="w-4 h-4" /> 
                        <span className="hidden md:inline">Add HCE to Route</span>
                        <span className="md:hidden">Add HCE</span>
                    </Button>
                )}
            </div>

            {!selectedRouteId && (
                <div className="h-80 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Map className="w-16 h-16 text-slate-200 mb-4" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Route Selected</p>
                    <p className="text-[10px] text-slate-400 mt-1">Select a logistical loop from the dropdown above to manage facility mapping.</p>
                </div>
            )}

            {selectedRouteId && (
                <>

            {isAssigning || editingAssignment ? (
                <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-300 overflow-hidden rounded-xl">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 py-6">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                {editingAssignment ? 'Update Assignment Parameters' : 'Link Facility to Route'}
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => { setIsAssigning(false); setEditingAssignment(null); resetForm(); }} className="text-primary/60 hover:text-primary">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 px-8 pb-8">
                        <form onSubmit={editingAssignment ? (e) => { e.preventDefault(); handleUpdate(); } : handleAssign} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider pl-1">Select Facility</label>
                                    {editingAssignment ? (
                                        <div className="p-3 bg-muted rounded-md border border-primary/10">
                                            <p className="font-bold text-foreground">{editingAssignment.keil_hces?.hce_name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase">{editingAssignment.keil_hces?.hce_code}</p>
                                        </div>
                                    ) : (
                                        <Select value={assignmentForm.hce_id} onValueChange={(val) => setAssignmentForm({ ...assignmentForm, hce_id: val })}>
                                            <SelectTrigger className="h-10 w-full border-primary/20 bg-background shadow-sm font-bold">
                                                <SelectValue placeholder="Choose Hospital/Clinic" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-primary/20">
                                                {effectiveHces.map(h => (
                                                    <SelectItem key={h.id} value={h.id}>{h.hce_name} ({h.hce_code})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider pl-1">Collection Frequency</label>
                                    <Select 
                                        value={assignmentForm.collection_type} 
                                        onValueChange={(val) => {
                                            setAssignmentForm(prev => ({ 
                                                ...prev, 
                                                collection_type: val,
                                                collection_days: val === 'Daily' ? DAYS : prev.collection_days
                                            }));
                                        }}
                                    >
                                        <SelectTrigger className="h-10 w-full border-primary/20 bg-background shadow-sm font-bold">
                                            <SelectValue placeholder="Select Frequency" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-primary/20">
                                            <SelectItem value="Daily">Daily</SelectItem>
                                            <SelectItem value="Alternate days">Alternate days</SelectItem>
                                            <SelectItem value="Thrice a Week">Thrice a Week</SelectItem>
                                            <SelectItem value="Once a Week">Once a Week</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider pl-1">Days of Collection</label>
                                    <Button type="button" variant="ghost" className="text-[10px] h-6 font-bold text-primary" onClick={setAllDays}>Select All</Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {DAYS.map(day => (
                                        <div 
                                            key={day}
                                            onClick={() => toggleDay(day)}
                                            className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all ${
                                                assignmentForm.collection_days.includes(day) 
                                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                                : 'bg-background border-primary/10 text-muted-foreground hover:border-primary/40'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${assignmentForm.collection_days.includes(day) ? 'bg-white text-primary border-white' : 'border-primary/20'}`}>
                                                {assignmentForm.collection_days.includes(day) && <Check className="w-3 h-3 font-bold" />}
                                            </div>
                                            <span className="text-xs font-bold">{day}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6 flex flex-col justify-between">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider pl-1">Remarks / Sequence Instructions</label>
                                    <textarea 
                                        className="flex min-h-[100px] w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                        placeholder="Special entry instructions..."
                                        value={assignmentForm.remarks}
                                        onChange={e => setAssignmentForm({ ...assignmentForm, remarks: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button 
                                        type="submit" 
                                        disabled={submitting}
                                        className="bg-primary hover:bg-primary/90 text-white px-8 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-10 font-bold uppercase tracking-wider w-full"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                SAVING...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" /> 
                                                {editingAssignment ? 'Update Link' : 'Confirm Link'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <TableView
                    title="Mapped Facilities"
                    description={`Collection sequence for ${route?.route_name}`}
                    headers={['HCE / Place', 'Type', 'Collection Days', 'Remarks', 'Actions']}
                    data={assignments}
                    loading={loading}
                    searchFields={['keil_hces.hce_name', 'keil_hces.hce_code', 'keil_hces.hce_place']}
                    renderRow={(a: any) => (
                        <tr key={a.id} className="hover:bg-primary/[0.02] transition-colors group border-b last:border-0 border-slate-100">
                            <td className="px-6 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary shadow-sm border border-primary/10">
                                        {a.sequence_order}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-foreground text-sm truncate max-w-[200px]" title={a.keil_hces?.hce_name}>{a.keil_hces?.hce_name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground/70 uppercase font-medium truncate max-w-[100px]" title={a.keil_hces?.hce_code}>{a.keil_hces?.hce_code}</span>
                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                                            <span className="text-[10px] font-bold text-secondary uppercase tracking-tight">{a.keil_hces?.hce_place}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-6 min-w-[200px]">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 whitespace-nowrap">{a.collection_type}</span>
                            </td>
                            <td className="px-6 py-6">
                                <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                    {(Array.isArray(a.collection_days) ? a.collection_days : []).map((day: string) => (
                                        <span key={day} className="text-[9px] font-bold bg-muted text-muted-foreground px-2 py-1 rounded-md border border-muted-foreground/5 shadow-sm">{day.slice(0, 3)}</span>
                                    ))}
                                    {(!a.collection_days || a.collection_days.length === 0) && <span className="text-[10px] font-medium text-slate-400 italic">None selected</span>}
                                </div>
                            </td>
                            <td className="px-6 py-6 text-[10px] font-bold text-muted-foreground/70 max-w-[150px] truncate italic">{a.remarks}</td>
                            <td className="px-6 py-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {canEdit && (
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-xl transition-all border border-transparent hover:border-primary/10" onClick={() => {
                                            setEditingAssignment(a);
                                            setAssignmentForm({
                                                hce_id: a.hce_id,
                                                collection_type: a.collection_type || 'Daily',
                                                collection_days: a.collection_days || [],
                                                remarks: a.remarks || ''
                                            });
                                        }}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button variant="ghost" size="icon" onClick={() => handleRemove(a.id)} className="h-10 w-10 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all border border-transparent hover:border-destructive/10">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                />
            )}
            </>
            )}
        </div>
    );
}

export default function RouteAssignmentsPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading mapping console...</div>}>
            <RouteAssignmentsContent />
        </Suspense>
    );
}
