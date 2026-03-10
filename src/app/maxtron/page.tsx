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
    UserCheck
} from 'lucide-react';
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
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const companyId = localStorage.getItem('companyId') || '24ea3bef-1e0c-4490-9d40-7063fb9067e9';

    useEffect(() => {
        setMounted(true);
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/maxtron/dashboard-summary?companyId=${companyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Dashboard fetch failed', error);
        } finally {
            setLoading(false);
        }
    };

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
            value: data?.stats?.employeeCount || '0', 
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
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Enterprise Overview</h1>
                    <p className="text-slate-500 font-medium mt-1">Real-time analytical baseline for Maxtron Operations.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">System Live</span>
                    </div>
                    <Button onClick={fetchDashboardData} variant="outline" className="rounded-2xl border-slate-200 hover:bg-slate-50 h-10 px-6 font-bold text-slate-700">Refresh Data</Button>
                </div>
            </div>

            {/* Main Stats Hub */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-none bg-white shadow-sm ring-1 ring-slate-100">
                        <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-bl-full opacity-40 -z-10 group-hover:scale-125 transition-transform duration-700`}></div>
                        <CardHeader className="pb-2">
                            <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-2 group-hover:rotate-6 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-slate-500 text-xs font-black uppercase tracking-widest leading-none">{stat.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black text-slate-900 tracking-tight">{loading ? '...' : stat.value}</p>
                            <div className="mt-4 flex items-center gap-2">
                                <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-widest ${stat.isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {stat.isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {stat.trend}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">vs last month</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <Card className="border-none shadow-sm ring-1 ring-slate-100 bg-white rounded-3xl overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <ChartIcon className="w-5 h-5 text-indigo-600" /> Revenue vs Collections
                            </CardTitle>
                            <CardDescription className="text-slate-500 font-medium italic">Financial performance monitoring</CardDescription>
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
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" dot={{ r: 4, fill: '#fff', stroke: '#4f46e5' }} />
                                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" dot={{ r: 4, fill: '#fff', stroke: '#10b981' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Attendance Chart */}
                <Card className="border-none shadow-sm ring-1 ring-slate-100 bg-white rounded-3xl overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-violet-600" /> Attendance Trends
                            </CardTitle>
                            <CardDescription className="text-slate-500 font-medium italic">Staff presence analysis (Last 7 Days)</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px] p-4 pr-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                    cursor={{ fill: '#f1f5f9' }}
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
                <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-slate-100 bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b p-6">
                        <div>
                            <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" /> Recent Operations
                            </CardTitle>
                            <CardDescription className="text-slate-500 font-medium">Latest invoices and order lifecycle</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="font-bold text-primary gap-1">
                            Operational Hub <ChevronRight className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-slate-50/30">
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Party</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(data?.recentActivity?.invoices || []).map((inv: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px]">INV</div>
                                                    <span className="text-sm font-bold text-slate-800">{inv.invoice_number}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600">{inv.customers?.customer_name}</td>
                                            <td className="px-6 py-4 text-sm font-black text-slate-900">₹{Number(inv.net_amount).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest">Billed</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(data?.recentActivity?.orders || []).slice(0, 2).map((ord: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">ORD</div>
                                                    <span className="text-sm font-bold text-slate-800">{ord.order_number}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600">{ord.customers?.customer_name}</td>
                                            <td className="px-6 py-4 text-sm font-black text-slate-900">₹{Number(ord.total_amount).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    ord.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
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
                    <Card className="border-none shadow-sm ring-1 ring-slate-100 bg-white rounded-3xl overflow-hidden">
                        <CardHeader className="bg-rose-50/50 border-b border-rose-100">
                            <CardTitle className="text-lg font-black text-rose-900 uppercase tracking-tight flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-rose-600" /> Critical Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {data?.alerts?.length > 0 ? (
                                <div className="divide-y divide-rose-50">
                                    {data.alerts.map((alert: any, i: number) => (
                                        <div key={i} className="flex items-center gap-4 p-5 hover:bg-rose-50/30 transition-colors group">
                                            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{alert.name}</p>
                                                <p className="text-xs text-rose-600 font-bold mt-0.5 animate-pulse">Low Stock: {alert.balance} {alert.unit}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-10 text-center space-y-3">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                    </div>
                                    <p className="text-slate-400 font-bold text-sm tracking-tight">Inventory Health Optimal</p>
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
            <Card className="border-none shadow-sm ring-1 ring-slate-100 bg-white rounded-3xl overflow-hidden">
                <CardHeader className="p-8 pb-0">
                    <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        <Activity className="w-6 h-6 text-secondary" /> Production Output Matrix
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {(data?.recentActivity?.production || []).map((batch: any, i: number) => (
                            <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-secondary/30 transition-all hover:bg-white hover:shadow-xl group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-[10px] font-black text-secondary tracking-widest px-2 py-1 bg-secondary/10 rounded-lg group-hover:bg-secondary group-hover:text-white transition-colors">{batch.finished_products?.product_name || 'N/A'}</div>
                                    <Clock className="w-4 h-4 text-slate-300" />
                                </div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">{batch.batch_number}</h4>
                                <div className="text-2xl font-black text-slate-900 leading-none mb-1">{batch.extrusion_output_qty} <span className="text-[10px] text-slate-400 ml-1 tracking-widest uppercase">KG</span></div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(batch.date).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
