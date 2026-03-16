'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    TrendingUp, 
    ShoppingCart, 
    Settings, 
    Users, 
    AlertCircle, 
    ArrowUpRight, 
    ArrowDownRight,
    Wallet,
    Package,
    ChevronRight,
    Clock,
    Activity,
    LineChart as ChartIcon,
    UserCheck,
    RefreshCw
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Dashboard() {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [companyId, setCompanyId] = useState<string>(
        typeof window !== 'undefined' ? (localStorage.getItem('companyId') || '24ea3bef-1e0c-4490-9d40-7063fb9067e9') : ''
    );

    const fetchDashboardData = async (forcedId?: string) => {
        setLoading(true);
        try {
            const targetId = forcedId || companyId;
            if (!targetId) {
                setLoading(false);
                return;
            }

            const res = await fetch(`${API_BASE}/api/maxtron/dashboard-summary?companyId=${targetId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            if (result.success) {
                console.log("sj",result.data);
                setData(result.data);
            }
        } catch (error) {
            console.error('Dashboard fetch failed', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initializeDashboard = async () => {
            setMounted(true);
            const token = localStorage.getItem('token');
            let cId = localStorage.getItem('companyId');

            // Robust check: if no companyId or we want to ensure it's MAXTRON
            try {
                const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const compData = await compRes.json();
                if (compData.success) {
                    const maxtronCo = compData.data.find((c: any) => c.company_name.toUpperCase() === 'MAXTRON');
                    if (maxtronCo) {
                        cId = maxtronCo.id;
                        setCompanyId(maxtronCo.id);
                        localStorage.setItem('companyId', maxtronCo.id);
                    }
                }
            } catch (err) {
                console.error('Error verifying company:', err);
            }

            if (cId) {
                fetchDashboardData(cId);
            }
        };

        initializeDashboard();
    }, []);

    if (!mounted) return null;

    const stats = [
        { 
            label: 'Monthly Sales', 
            value: `₹${Number(data?.stats?.totalSales || 0).toLocaleString()}`, 
            icon: TrendingUp, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50',
            trend: `${(data?.stats?.salesTrend || 0).toFixed(1)}%`,
            isPos: (data?.stats?.salesTrend || 0) >= 0
        },
        { 
            label: 'Pending Orders', 
            value: data?.stats?.pendingOrdersCount || '0', 
            icon: ShoppingCart, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50',
            trend: '+5.2%',
            isPos: true
        },
        { 
            label: 'Total Production', 
            value: `${Number(data?.stats?.totalProduction || 0).toLocaleString()} KG`, 
            icon: Settings, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50',
            trend: `${(data?.stats?.productionTrend || 0).toFixed(1)}%`,
            isPos: (data?.stats?.productionTrend || 0) >= 0
        },
        { 
            label: 'Active Staff', 
            value: data?.stats?.presentToday !== undefined ? `${data?.stats?.presentToday}/${data?.stats?.employeeCount || 0}` : (data?.stats?.employeeCount || '0'), 
            icon: Users, 
            color: 'text-violet-600', 
            bg: 'bg-violet-50',
            trend: '0.0%',
            isPos: true
        },
    ];

    const chartData = data?.chartData || [];
    const attendanceData = data?.attendanceChartData || [];

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight">Enterprise Overview</h1>
                    <p className="text-muted-foreground font-medium mt-1">Real-time analytical baseline for Maxtron Operations.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-card rounded-2xl border border-border shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">System Live</span>
                    </div>
                    <Button onClick={() => fetchDashboardData()} variant="outline" className="rounded-2xl border-border hover:bg-accent h-10 px-6 font-bold">Refresh Data</Button>
                </div>
            </div>

            {/* Main Stats Hub */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-none bg-card shadow-sm ring-1 ring-border/50">
                        <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} ${theme === 'dark' ? 'opacity-10' : 'opacity-40'} rounded-bl-full -z-10 group-hover:scale-125 transition-transform duration-700`}></div>
                        <CardHeader className="pb-2">
                            <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-2 group-hover:rotate-6 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-muted-foreground text-xs font-black uppercase tracking-widest leading-none">{stat.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black text-foreground tracking-tight">{loading ? '...' : stat.value}</p>
                            <div className="mt-4 flex items-center gap-2">
                                <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-widest ${stat.isPos ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {stat.isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {stat.trend}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">vs last month</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <Card className="border-none shadow-sm ring-1 ring-border/50 bg-card rounded-3xl overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
                        <div>
                            <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                                <ChartIcon className="w-6 h-6 text-indigo-500" /> Revenue vs Collections
                            </CardTitle>
                            <CardDescription className="text-muted-foreground font-medium italic">Financial performance monitoring</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px] p-4 pr-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}}
                                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
                                />
                                <Tooltip 
                                    contentStyle={{ background: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold', color: theme === 'dark' ? '#f8fafc' : '#1e293b' }}
                                    cursor={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0', strokeWidth: 2 }}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" dot={{ r: 4, fill: theme === 'dark' ? '#1e293b' : '#fff', stroke: '#4f46e5' }} />
                                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" dot={{ r: 4, fill: theme === 'dark' ? '#1e293b' : '#fff', stroke: '#10b981' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Attendance Chart */}
                <Card className="border-none shadow-sm ring-1 ring-border/50 bg-card rounded-3xl overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
                        <div>
                            <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                                <UserCheck className="w-6 h-6 text-violet-500" /> Attendance Trends
                            </CardTitle>
                            <CardDescription className="text-muted-foreground font-medium italic">Staff presence analysis (Last 7 Days)</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px] p-4 pr-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}}
                                />
                                <Tooltip 
                                    contentStyle={{ background: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold', color: theme === 'dark' ? '#f8fafc' : '#1e293b' }}
                                    cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f1f5f9' }}
                                />
                                <Bar dataKey="present" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={20} />
                                <Bar dataKey="absent" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics & Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Center Panel: Recent Transactions */}
                <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-border/50 gap-0 bg-card rounded-3xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b border-border p-6">
                        <div>
                            <CardTitle className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" /> Recent Operations
                            </CardTitle>
                            <CardDescription className="text-muted-foreground font-medium">Latest invoices and order lifecycle</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="font-bold text-primary gap-1 hover:bg-primary/10">
                            Operational Hub <ChevronRight className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-muted/10">
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Entity</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Party</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {(data?.recentActivity?.invoices || []).map((inv: any, i: number) => (
                                        <tr key={i} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-[10px]">INV</div>
                                                    <span className="text-sm font-bold text-foreground/90">{inv.invoice_number}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{inv.customers?.customer_name}</td>
                                            <td className="px-6 py-4 text-sm font-black text-foreground">₹{Number(inv.net_amount).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest">Billed</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(data?.recentActivity?.orders || []).slice(0, 2).map((ord: any, i: number) => (
                                        <tr key={i} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[10px]">ORD</div>
                                                    <span className="text-sm font-bold text-foreground/90">{ord.order_number}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{ord.customers?.customer_name}</td>
                                            <td className="px-6 py-4 text-sm font-black text-foreground">₹{Number(ord.total_amount).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    ord.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                    {ord.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Panel: Alerts & Stock */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm ring-1 ring-border/50 bg-card rounded-3xl overflow-hidden">
                        <CardHeader className="flex justify-center items-center pt-4 !pb-4 bg-rose-500/10 border-b border-rose-500/20 rounded-2xl">
                            <CardTitle className="text-lg font-black text-rose-500 uppercase tracking-tight flex items-center">
                                <AlertCircle className="w-5 h-5 text-rose-500" /> Critical Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {data?.alerts?.length > 0 ? (
                                <div className="divide-y divide-rose-500/10">
                                    {data.alerts.map((alert: any, i: number) => (
                                        <div key={i} className="flex items-center gap-4 p-5 hover:bg-rose-500/5 transition-colors group">
                                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-black text-foreground uppercase tracking-tight">
                                                    {alert.name?.length > 30 ?alert.name.slice(0, 30) + "..." : alert.name}
                                                </p>
                                                <p className="text-xs text-rose-500 font-bold mt-0.5 animate-pulse">Low Stock: {alert.balance} {alert.unit}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-10 text-center space-y-3">
                                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                    </div>
                                    <p className="text-muted-foreground font-bold text-sm tracking-tight">Inventory Health Optimal</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm ring-1 ring-blue-100 bg-gradient-to-br from-primary to-indigo-900 rounded-3xl overflow-hidden text-white group">
                        <CardContent className="p-8 space-y-6 relative overflow-hidden h-full flex flex-col justify-center">
                            <Wallet className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                            <div>
                                <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Assets (Liquidity)</p>
                                <h2 className="text-5xl font-black tracking-tighter">₹{Number(data?.stats?.cashInHand || 0).toLocaleString()}</h2>
                            </div>
                            <div className="flex items-end justify-between pt-4">
                                <div>
                                    <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest leading-none mb-1 text-xs">Collection Efficiency</p>
                                    <p className="text-2xl font-black text-emerald-400 leading-none">{Number(data?.stats?.collectionEfficiency || 0).toFixed(1)}%</p>
                                </div>
                                <div className="h-2 w-32 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${Math.min(100, data?.stats?.collectionEfficiency || 0)}%` }}></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Production Matrix Holder */}
            <Card className="border-none shadow-sm ring-1 gap-4 ring-border/50 bg-card rounded-3xl overflow-hidden">
                <CardHeader className="p-2 pb-0">
                    <CardTitle className="text-xl font-black text-foreground uppercase tracking-tighter flex items-center gap-3">
                        <Activity className="w-6 h-6 text-secondary" /> Production Output Matrix
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {(data?.recentActivity?.production?.length > 0 ? data.recentActivity.production : [
                            { batch_number: 'BTH-9281', extrusion_output_qty: 450, finished_products: { product_name: 'LDPE Liner' }, date: new Date().toISOString() },
                            { batch_number: 'BTH-9282', extrusion_output_qty: 320, finished_products: { product_name: 'PP Bag' }, date: new Date().toISOString() },
                            { batch_number: 'BTH-9283', extrusion_output_qty: 180, finished_products: { product_name: 'BOPP Film' }, date: new Date().toISOString() },
                            { batch_number: 'BTH-9284', extrusion_output_qty: 540, finished_products: { product_name: 'Stretch Film' }, date: new Date().toISOString() },
                            { batch_number: 'BTH-9285', extrusion_output_qty: 410, finished_products: { product_name: 'HM-HDPE' }, date: new Date().toISOString() },
                        ]).map((batch: any, i: number) => (
                            <div key={i} className="p-6 bg-muted/20 rounded-2xl border border-border/40 hover:border-secondary/30 transition-all hover:bg-card hover:shadow-xl group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-[10px] font-black text-blue-600 tracking-widest px-2 py-1 bg-secondary/10 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">{batch.finished_products?.product_name || 'N/A'}</div>
                                    <Clock className="w-4 h-4 text-muted-foreground/40" />
                                </div>
                                <h4 className="text-sm font-black text-foreground/90 uppercase tracking-tight mb-1">{batch.batch_number}</h4>
                                <div className="text-2xl font-black text-foreground leading-none mb-1">{batch.extrusion_output_qty} <span className="text-[10px] text-muted-foreground ml-1 tracking-widest uppercase">KG</span></div>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">{new Date(batch.date).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
