'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Megaphone, 
    AlertTriangle, 
    Info, 
    X, 
    Plus, 
    Trash2, 
    Loader2,
    Sparkles,
    Calendar,
    Pin,
    ChevronLeft,
    ChevronRight,
    Volume2
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Input } from "@/components/ui/input";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'critical';
    created_at: string;
    users?: {
        name: string;
    };
}

interface AnnouncementSectionProps {
    tenant: 'maxtron' | 'keil';
}

export function AnnouncementSection({ tenant }: AnnouncementSectionProps) {
    const { user } = usePermission();
    const { success, error, info: toastInfo } = useToast();
    const { confirm } = useConfirm();
    const isAdmin = user?.role_name?.toLowerCase() === 'admin' || user?.email?.toLowerCase() === 'admin@maxtron.com';

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'info' as 'info' | 'warning' | 'critical',
    });

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/${tenant}/announcements?tenant=${tenant}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            if (result.success) {
                setAnnouncements(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch announcements', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
        setHasMounted(true);
    }, [tenant]);

    const handleCreate = async () => {
        const title = (formData.title || '').trim();
        const content = (formData.content || '').trim();

        if (!title || !content) {
            error("Title and content are required");
            return;
        }

        if (title.length < 5 || title.length > 50) {
            error("Title must be between 5 and 50 characters");
            return;
        }

        if (content.length < 10 || content.length > 500) {
            error("Content must be between 10 and 500 characters");
            return;
        }

        const nameRegex = /^[a-zA-Z0-9\s.,!?-]+$/;
        if (!nameRegex.test(title)) {
            error("Title can only contain letters, numbers, spaces, and basic punctuation");
            return;
        }

        if (!nameRegex.test(content)) {
            error("Content contains invalid characters. Only alphanumeric and basic punctuation (.,!?) are allowed.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/${tenant}/announcements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ...formData, tenant })
            });
            const result = await res.json();
            if (result.success) {
                success("Announcement published successfully");
                setIsDialogOpen(false);
                setFormData({ title: '', content: '', type: 'info' });
                fetchAnnouncements();
            }
        } catch (err) {
            error("Failed to publish announcement");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: "Delete Announcement?",
            message: "This action will remove the announcement for all users.",
            type: 'danger'
        });

        if (!ok) return;

        try {
            const res = await fetch(`${API_BASE}/api/${tenant}/announcements/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            if (result.success) {
                success("Announcement removed");
                fetchAnnouncements();
            }
        } catch (err) {
            error("Failed to delete announcement");
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'critical': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'critical': return 'bg-rose-500/10 border-rose-500/20';
            case 'warning': return 'bg-amber-500/10 border-amber-500/20';
            default: return 'bg-blue-500/10 border-blue-500/20';
        }
    };

    const [activeIndex, setActiveIndex] = useState(0);
    const [animatingOut, setAnimatingOut] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (hasMounted && announcements.length > 1 && !animatingOut) {
            interval = setInterval(() => {
                handleNext();
            }, 10000); // Auto-scroll every 10 seconds
        }
        return () => clearInterval(interval);
    }, [hasMounted, announcements.length, animatingOut]);

    const handleNext = () => {
        if (animatingOut || announcements.length <= 1) return;
        setAnimatingOut(true);
        setTimeout(() => {
            setActiveIndex((prev) => (prev + 1) % announcements.length);
            setAnimatingOut(false);
        }, 800); // Match CSS animation duration
    };

    const handlePrev = () => {
        if (animatingOut || announcements.length <= 1) return;
        setActiveIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
    };

    if (!hasMounted || (loading && announcements.length === 0)) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const highPriorityAnnouncements = announcements.filter(a => a.type === 'critical' || a.type === 'warning');

    return (
        <section className="space-y-6 relative overflow-hidden rounded-2xl">
            {/* Next-Gen Neural Marquee for High Priority Notices */}
            {/* {highPriorityAnnouncements.length > 0 && (
                <div className="mx-2 mb-4 h-10 overflow-hidden relative border-y border-primary/5 bg-primary/[0.01]">
                    <div className="absolute left-0 top-0 bottom-0 px-6 bg-rose-600 text-white flex items-center gap-2 z-20 font-black text-[9px] uppercase tracking-[0.3em] shadow-[15px_0_30px_rgba(225,29,72,0.3)]">
                        <Volume2 className="w-3 h-3 animate-pulse" /> Urgent Broadcast
                    </div>
                    <div className="neural-marquee-container w-full h-full relative">
                        <div className="marquee-ticker flex items-center h-full px-20">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center">
                                    {highPriorityAnnouncements.map((item) => (
                                        <div key={`${i}-${item.id}`} className="flex items-center gap-6 px-12 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                                            <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'critical' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'}`} />
                                            <span className="text-foreground font-black text-[10px] uppercase tracking-widest">{item.title}</span>
                                            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight opacity-50">•</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )} */}

            <div className="flex items-center justify-between mb-2 p-2 mt-0 rounded-2xl">
                <div className="flex items-center gap-3 group/header">
                    <div className="p-2.5 bg-primary/10 rounded-2xl ring-1 ring-primary/20 shadow-glow-primary group-hover/header:rotate-6 transition-transform duration-500">
                        <Megaphone className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                            Active Notices <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                        </h2>
                        <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-40">
                            Broadcast • {tenant.toUpperCase()} Control
                        </p>
                    </div>
                </div>
                {isAdmin && (
                    <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-primary hover:bg-primary/95 text-white rounded-2xl h-9 px-5 shadow-lg shadow-primary/10 font-black text-[9px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex gap-2 ring-1 ring-white/10"
                    >
                        <Plus className="w-4 h-4" /> New Announcement
                    </Button>
                )}
            </div>

            {announcements.length === 0 ? (
                <Card className="glass-card border-dashed border-2 bg-white/50 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardContent className="p-8 text-center space-y-2">
                        <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-primary/10">
                            <Sparkles className="w-5 h-5 text-primary/30" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-black text-foreground/40 uppercase tracking-widest leading-none">Clear Horizon</p>
                            <p className="text-[10px] text-muted-foreground/50 font-medium tracking-tight">No active broadcasts right now.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="relative w-full px-2 md:px-4 mt-6">
                    {/* Neural Glow Background */}
                    <div className="absolute inset-x-0 -top-20 h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

                    <div className="perspective-container relative w-full h-[320px] md:h-[350px] flex items-center justify-center">
                        {announcements.map((item, index) => {
                            const total = announcements.length;
                            const pos = (index - activeIndex + total) % total;
                            
                            let stackClass = 'stack-card-hidden';
                            if (pos === 0) stackClass = animatingOut ? 'animate-slide-out' : 'stack-card-active elite-card-floating';
                            else if (pos === 1) stackClass = 'stack-card-behind';
                            else if (pos === 2) stackClass = 'stack-card-hidden opacity-5';

                            if (pos > 2) return null;

                            const auraClass = item.type === 'critical' ? 'aura-glow-rose' : item.type === 'warning' ? 'aura-glow-amber' : 'aura-glow-primary';
                            const accentColor = item.type === 'critical' ? 'text-rose-500' : item.type === 'warning' ? 'text-amber-500' : 'text-primary';

                            return (
                                <div 
                                    key={item.id} 
                                    className={`absolute w-full max-w-4xl stack-card-wrapper ${stackClass} rounded-3xl md:rounded-[3rem] bg-white/70 backdrop-blur-2xl overflow-hidden transition-all duration-1000 ${pos === 0 ? auraClass : 'shadow-sm'}`}
                                >
                                    <div className="elite-card-border" />
                                    
                                    <div className={`flex flex-col md:flex-row h-full transition-opacity duration-500 ${pos === 0 && !animatingOut ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        {/* Dynamic Icon Section */}
                                        <div className="w-full md:w-[200px] p-6 md:p-12 flex flex-row md:flex-col items-center justify-center md:justify-between relative overflow-hidden bg-slate-50/50 md:bg-white/20">
                                            <div className="absolute inset-0 holographic-shimmer opacity-10" />
                                            
                                            <div className={`w-14 h-14 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] flex items-center justify-center bg-white shadow-xl ring-1 ring-slate-100 transition-transform duration-700 ${pos === 0 ? 'scale-100 rotate-0' : 'scale-75'}`}>
                                                {item.type === 'critical' ? 
                                                    <AlertTriangle className={`w-7 h-7 md:w-12 md:h-12 ${accentColor}`} /> : 
                                                    <Volume2 className={`w-7 h-7 md:w-12 md:h-12 ${accentColor}`} />
                                                }
                                            </div>

                                            <div className="ml-4 md:ml-0 md:mt-6 flex md:flex-col items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-[10px]">
                                                    {item.users?.name?.charAt(0) || 'S'}
                                                </div>
                                                <div className="flex flex-col md:items-center">
                                                    <p className="text-[9px] font-black text-foreground uppercase tracking-widest">{item.users?.name || 'System'}</p>
                                                    <p className="text-[8px] text-muted-foreground font-bold uppercase md:mt-1">Authorized</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content Section */}
                                        <div className="flex-1 p-6 md:p-14 relative overflow-hidden flex flex-col justify-center">
                                            <div className="space-y-3 md:space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`h-1.5 w-1.5 rounded-full ${item.type === 'critical' ? 'bg-rose-500 animate-pulse' : 'bg-primary'}`} />
                                                        <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${accentColor}`}>
                                                            {item.type} Priority Broadcast
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">
                                                        #{item.id.slice(0, 4)}
                                                    </span>
                                                </div>

                                                <h1 className="text-2xl md:text-5xl font-black text-foreground tracking-tighter leading-tight md:leading-[0.9]">
                                                    {item.title}
                                                </h1>

                                                <p className="text-sm md:text-xl text-slate-500 font-medium leading-relaxed line-clamp-2 md:line-clamp-3">
                                                    {item.content}
                                                </p>
                                            </div>

                                            <div className="mt-6 md:mt-10 flex items-center justify-between gap-4">
                                                <div className="flex gap-1.5">
                                                    {announcements.map((_, i) => (
                                                        <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === activeIndex ? 'w-8 bg-primary' : 'w-1.5 bg-slate-200'}`} />
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(item.id)}
                                                            className="h-10 w-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-500"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-slate-300 hover:text-rose-500" />
                                                        </Button>
                                                    )}
                                                    {/* <Button className="h-12 px-6 md:px-10 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all">
                                                        Read Details
                                                    </Button> */}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex absolute inset-x-0 top-1/2 -translate-y-1/2 justify-between px-2 pointer-events-none z-50">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            className="w-12 h-12 rounded-full border-white/80 bg-white/40 backdrop-blur-md shadow-xl pointer-events-auto hover:bg-white text-slate-400 hover:text-primary transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleNext}
                            className="w-12 h-12 rounded-full border-white/80 bg-white/40 backdrop-blur-md shadow-xl pointer-events-auto hover:bg-white text-slate-400 hover:text-primary transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Mobile Navigation Dots (Already included in the card area) */}
                </div>
            )}

            {/* Premium Glassmorphic Modal for Posting Notice */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setIsDialogOpen(false)} />

                    <Card className="relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto custom-scrollbar border-none shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] rounded-[2.5rem] bg-white/95 backdrop-blur-xl p-0 animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
                        {/* Modal Header */}
                        <div className="p-10 pb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-between border-b border-primary/5">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-primary text-white rounded-2xl shadow-glow-primary">
                                    <Megaphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-3xl font-black text-foreground uppercase tracking-tighter">
                                        New Broadcast
                                    </CardTitle>
                                    <CardDescription className="text-primary/60 font-black uppercase tracking-widest text-[10px] mt-1">
                                        Official {tenant.toLocaleUpperCase()} Communications
                                    </CardDescription>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsDialogOpen(false)} 
                                className="rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 w-12 h-12 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-primary uppercase tracking-[0.25em] ml-1 opacity-60">Headline</label>
                                <Input
                                    placeholder="Enter a compelling title..."
                                    value={formData.title}
                                    onChange={(e: any) => setFormData({...formData, title: e.target.value})}
                                    className="h-16 px-6 rounded-2xl border-slate-200 bg-slate-50/50 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.25em] ml-1 opacity-60">Priority</label>
                                    <div className="relative group">
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                                            className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50/50 font-black px-6 text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="info">💡 Information</option>
                                            <option value="warning">⚠️ Warning</option>
                                            <option value="critical">🚨 Critical / Urgent</option>
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                            <Plus className="w-4 h-4 rotate-45" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.25em] ml-1 opacity-60">Target</label>
                                    <div className="h-16 rounded-2xl bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/10 font-black flex items-center px-6 text-xs uppercase tracking-widest text-indigo-600/60">
                                        {tenant.toUpperCase()} DASHBOARD
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-primary uppercase tracking-[0.25em] ml-1 opacity-60">Message Body</label>
                                <textarea
                                    placeholder="Write your announcement details here..."
                                    value={formData.content}
                                    onChange={(e: any) => setFormData({...formData, content: e.target.value})}
                                    className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-6 font-medium resize-none focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-10 pt-0 flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                className="flex-1 h-14 rounded-2xl font-black border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all uppercase tracking-widest text-[10px]"
                            >
                                Discard Change
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={submitting}
                                className="flex-[2] h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 flex gap-3"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        Broadcast Now <Sparkles className="w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </section>
    );
}
