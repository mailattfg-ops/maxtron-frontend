'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Search, Calendar, DollarSign, FileText, 
  Tag, Filter, Download, Printer, PieChart, TrendingUp, ArrowUpDown
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { exportToPDF } from '@/utils/export';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const EXPENSES_API = `${API_BASE}/api/maxtron/production/expenses`;

const CATEGORIES = [
  'All Categories',
  'Spare Parts',
  'Maintenance',
  'Consumables',
  'Utilities',
  'Machine Repair',
  'Tools',
  'Others'
];

export default function MiscellaneousExpensesReport() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { error } = useToast();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

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
          c.company_name?.toUpperCase() === activeTenant || 
          c.company_name?.toUpperCase().includes(activeTenant)
        );
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
        }
      }

      if (coId) await fetchExpenses(coId);
      else setLoading(false);
      
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setLoading(false);
    }
  };

  const fetchExpenses = async (coId?: string) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    if (!targetCoId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${EXPENSES_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      error("Failed to load expense data.");
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(ex => {
      const exDate = new Date(ex.expense_date).toISOString().split('T')[0];
      const dateMatch = exDate >= startDate && exDate <= endDate;
      const categoryMatch = selectedCategory === 'All Categories' || ex.category === selectedCategory;
      const searchMatch = !searchQuery || 
        ex.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.reference_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return dateMatch && categoryMatch && searchMatch;
    });
  }, [expenses, startDate, endDate, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, ex) => sum + Number(ex.amount), 0);
    const count = filteredExpenses.length;
    const avg = count > 0 ? total / count : 0;
    
    // Group by category for summary
    const byCategory = filteredExpenses.reduce((acc: any, ex) => {
        acc[ex.category] = (acc[ex.category] || 0) + Number(ex.amount);
        return acc;
    }, {});

    const topCategory = Object.entries(byCategory)
        .sort(([, a]: any, [, b]: any) => b - a)[0] || ['None', 0];

    return { total, count, avg, topCategory };
  }, [filteredExpenses]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (filteredExpenses.length === 0) return;
    
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Mode', 'Reference No'];
    const rows = filteredExpenses.map(ex => [
      new Date(ex.expense_date).toLocaleDateString(),
      ex.category,
      ex.description,
      `INR ${Number(ex.amount).toLocaleString()}`,
      ex.payment_mode,
      ex.reference_no || '-'
    ]);

    await exportToPDF({
      headers,
      rows,
      filename: `Misc_Expenses_Report_${startDate}_to_${endDate}.pdf`,
      title: 'Miscellaneous Expenses Report',
      subtitle: `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()} | Total: INR ${stats.total.toLocaleString()}`
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700 print:bg-white print:p-0">
      {/* Header - Hidden on Print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10 print:hidden">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
             <FileText className="w-8 h-8 md:w-10 md:h-10 text-primary p-1.5 bg-primary/10 rounded-lg shrink-0" />
             <span className="truncate text-primary">Miscellaneous Expenses Report</span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">Consolidated view of production and general miscellaneous costs.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint} className="rounded-full shadow-sm hover:bg-slate-50">
                <Printer className="w-4 h-4 mr-2" /> Print Report
            </Button>
            <Button 
                onClick={handleExportPDF}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-200 font-bold px-6"
            >
                <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-white to-primary/5">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="p-2 bg-primary/10 rounded-lg"><DollarSign className="w-6 h-6 text-primary" /></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Total Expense</span>
                </div>
                <div className="mt-4">
                    <h3 className="text-2xl font-black text-slate-900">₹ {stats.total.toLocaleString()}</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Across {stats.count} individual entries</p>
                </div>
            </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-white to-amber-50/50">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="p-2 bg-amber-100 rounded-lg"><TrendingUp className="w-6 h-6 text-amber-600" /></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Average / Entry</span>
                </div>
                <div className="mt-4">
                    <h3 className="text-2xl font-black text-slate-900">₹ {stats.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Typical cost per miscellaneous item</p>
                </div>
            </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-white to-blue-50/50">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="p-2 bg-blue-100 rounded-lg"><Tag className="w-6 h-6 text-blue-600" /></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Highest Category</span>
                </div>
                <div className="mt-4">
                    <h3 className="text-xl font-black text-slate-900 truncate">{stats.topCategory[0]}</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">₹ {Number(stats.topCategory[1]).toLocaleString()} total spent</p>
                </div>
            </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-white to-rose-50/50">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="p-2 bg-rose-100 rounded-lg"><Calendar className="w-6 h-6 text-rose-600" /></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Report Period</span>
                </div>
                <div className="mt-4">
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                        {new Date(startDate).toLocaleDateString()} - <br/>
                        {new Date(endDate).toLocaleDateString()}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Selected duration for this report</p>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Filters - Hidden on Print */}
      <Card className="border-primary/10 shadow-sm print:hidden">
        <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                        <Calendar className="w-3 h-3" /> From Date
                    </label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                        <Calendar className="w-3 h-3" /> To Date
                    </label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                        <Filter className="w-3 h-3" /> Category
                    </label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            {CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                        <Search className="w-3 h-3" /> Search Records
                    </label>
                    <Input 
                        placeholder="Description or Ref No..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="h-9 bg-slate-50/50"
                    />
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      <div className="bg-white rounded-xl shadow-sm border border-primary/10 overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" /> Detailed Expense Log
            </h2>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">
                Showing {filteredExpenses.length} Records
            </div>
        </div>
        <TableView
            title=""
            description=""
            headers={['Date', 'Category', 'Description', 'Amount', 'Payment Mode', 'Reference No']}
            data={filteredExpenses}
            loading={loading}
            searchFields={['category', 'description', 'reference_no']}
            searchPlaceholder="Search records..."
            renderRow={(ex: any) => (
                <tr key={ex.id} className="hover:bg-primary/5 border-b last:border-none transition-colors group">
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                        {new Date(ex.expense_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/5 text-primary text-[10px] font-bold uppercase border border-primary/10">
                            {ex.category}
                        </span>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                        <span className="text-sm font-medium text-slate-700 line-clamp-1">{ex.description}</span>
                    </td>
                    <td className="px-6 py-4">
                        <span className="font-black text-slate-900 whitespace-nowrap">₹ {Number(ex.amount).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${ex.payment_mode === 'CASH' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{ex.payment_mode}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono tracking-tighter">
                        {ex.reference_no || '-'}
                    </td>
                </tr>
            )}
        />
        {filteredExpenses.length === 0 && !loading && (
            <div className="p-12 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-slate-300" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">No Expenses Found</h3>
                    <p className="text-xs text-slate-500">Try adjusting your filters or date range.</p>
                </div>
            </div>
        )}
      </div>

      {/* Footer / Summary Info */}
      <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
            <p className="text-xs font-medium text-slate-500">
                This report excludes all Petty Cash transactions and strictly focuses on categorized production and general miscellaneous expenses.
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                Generated internally by Maxtron ERP System • {new Date().toLocaleString()}
            </p>
      </div>

      <style jsx global>{`
        @media print {
            body { background: white !important; }
            .print\\:hidden { display: none !important; }
            .print\\:bg-white { background: white !important; }
            .print\\:p-0 { padding: 0 !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border: 1px solid #e2e8f0 !important; }
        }
      `}</style>
    </div>
  );
}

// Missing icon fix
import { AlertCircle as AlertCircleIcon } from 'lucide-react';
const AlertCircle = AlertCircleIcon;
