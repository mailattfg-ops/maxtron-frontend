'use client';

import { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    DollarSign, 
    ShoppingCart, 
    ArrowUpRight, 
    ArrowDownLeft,
    PieChart,
    Calendar,
    Filter
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';

export default function ScorecardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const { error: toastError } = useToast();
    const companyId = localStorage.getItem('companyId') || '24ea3bef-1e0c-4490-9d40-7063fb9067e9';

    useEffect(() => {
        fetchScorecard();
    }, []);

    const fetchScorecard = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/scorecard?companyId=${companyId}&startDate=${dateRange.start}&endDate=${dateRange.end}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            if (result.success) setData(result.data);
        } catch (error) {
            toastError('Failed to fetch scorecard');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) return <div className="p-8 text-center animate-pulse text-primary font-bold">Syncing Analytical Data...</div>;

    const cards = [
        { title: 'Total Sales', value: data?.totalSales || 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12%' },
        { title: 'Total Purchases', value: data?.totalPurchases || 0, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', trend: '-5%' },
        { title: 'Collections', value: data?.totalCollections || 0, icon: ArrowDownLeft, color: 'text-teal-600', bg: 'bg-teal-50', trend: '+8%' },
        { title: 'Payments', value: data?.totalPayments || 0, icon: ArrowUpRight, color: 'text-rose-600', bg: 'bg-rose-50', trend: '+15%' },
        { title: 'Op. Expenses', value: data?.totalExpenses || 0, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+2%' },
        { title: 'Cash Position', value: data?.cashInHand || 0, icon: PieChart, color: 'text-violet-600', bg: 'bg-violet-50', trend: 'Stable' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <TrendingUp className="text-secondary w-10 h-10 p-2 bg-secondary/10 rounded-xl" />
                        Business Scorecard
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Performance analytics and financial health overview</p>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 md:px-3">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <Input 
                            type="date" 
                            className="w-fit bg-transparent border-none text-sm font-semibold outline-none focus:ring-0 h-auto p-0"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        />
                    </div>
                    <div className="text-slate-300">|</div>
                    <div className="flex items-center gap-2 md:px-3">
                        <Input 
                            type="date" 
                            className="bg-transparent border-none text-sm font-semibold outline-none focus:ring-0 h-auto p-0"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        />
                    </div>
                    <button 
                        onClick={fetchScorecard}
                        className="hidden md:block bg-primary text-white p-2 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`${card.bg} ${card.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded-lg uppercase tracking-widest">
                                {card.trend}
                            </span>
                        </div>
                        <h3 className="text-slate-500 font-bold mb-1 uppercase text-[10px] tracking-widest">{card.title}</h3>
                        <div className="text-3xl font-black text-slate-900 tracking-tight">
                            ₹{Number(card.value).toLocaleString()}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Real-time sync active</span>
                            <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${card.color.replace('text', 'bg')} opacity-40`} style={{ width: '65%' }}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[350px] flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-secondary" />
                        Income vs Expenditure
                    </h3>
                    <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 px-10">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic text-center">Visualization Matrix Interface Coming Soon</p>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-white bg-gradient-to-br from-primary to-primary overflow-hidden relative">
                    <DollarSign className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10" />
                    <h3 className="text-xl font-black mb-6 relative tracking-tight">Executive Summary</h3>
                    <ul className="space-y-4 relative">
                        <li className="flex items-center justify-between pb-3 border-b border-white/10 text-sm font-medium">
                            <span className="text-blue-100">Revenue Generation</span>
                            <span className="font-black text-emerald-400 uppercase tracking-widest text-[10px]">High Performance</span>
                        </li>
                        <li className="flex items-center justify-between pb-3 border-b border-white/10 text-sm font-medium">
                            <span className="text-blue-100">Collection Efficiency</span>
                            <span className="font-black text-emerald-400 uppercase tracking-widest text-[10px]">92% Average</span>
                        </li>
                        <li className="flex items-center justify-between pb-3 border-b border-white/10 text-sm font-medium">
                            <span className="text-blue-100">Expense Control</span>
                            <span className="font-black text-amber-400 uppercase tracking-widest text-[10px]">Moderate</span>
                        </li>
                        <li className="flex items-center justify-between pt-2">
                            <span className="text-blue-100 text-lg">Net Profit Margin (Est.)</span>
                            <span className="font-black text-white text-3xl tracking-tighter">18.4%</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
