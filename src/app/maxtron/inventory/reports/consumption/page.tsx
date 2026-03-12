'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  Flame, TrendingDown, Download, Calendar,
  Package, Activity, Settings, Zap, Search, Filter, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { exportToExcel } from '@/utils/export';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ConsumptionReportPage() {
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterProcess, setFilterProcess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { info } = useToast();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  useEffect(() => { fetchReport(); }, []);

  const fetchReport = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      let coId = '';
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        coId = activeCo?.id || '';
      }
      const res = await fetch(`${API_BASE}/api/maxtron/consumptions?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setConsumptions(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const processTypes = useMemo(() =>
    [...new Set(consumptions.map(c => c.process_type).filter(Boolean))], [consumptions]);

  const filtered = useMemo(() => consumptions.filter(c => {
    if (dateFrom && new Date(c.consumption_date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(c.consumption_date) > new Date(dateTo)) return false;
    if (filterProcess && c.process_type !== filterProcess) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.consumption_slip_no?.toLowerCase().includes(q) ||
        c.raw_materials?.rm_name?.toLowerCase().includes(q) ||
        c.process_type?.toLowerCase().includes(q)
      );
    }
    return true;
  }), [consumptions, dateFrom, dateTo, filterProcess, searchQuery]);

  const totalQty = useMemo(() => filtered.reduce((a, c) => a + Number(c.quantity_used || 0), 0), [filtered]);

  const materialSummary = useMemo(() => {
    const map: Record<string, { name: string; code: string; unit: string; total: number; slips: number }> = {};
    filtered.forEach(c => {
      const id = c.rm_id;
      if (!map[id]) map[id] = { name: c.raw_materials?.rm_name || 'Unknown', code: c.raw_materials?.rm_code || '', unit: c.raw_materials?.unit_type || '', total: 0, slips: 0 };
      map[id].total += Number(c.quantity_used || 0);
      map[id].slips++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const processSummary = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(c => { map[c.process_type || 'General'] = (map[c.process_type || 'General'] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const downloadCSV = async () => {
    if (!filtered.length) { info('No data to export.'); return; }
    const rows = filtered.map(c => {
      const formatDate = (dateStr: any) => {
        if (!dateStr || dateStr === 'null') return 'N/A';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        } catch (e) { return dateStr; }
      };
      return [
        c.consumption_slip_no || '',
        formatDate(c.consumption_date),
        c.raw_materials?.rm_name || '',
        c.raw_materials?.rm_code || '',
        Number(c.quantity_used || 0),
        c.raw_materials?.unit_type || '',
        c.process_type || '',
        c.machine_no || '',
        c.remarks || ''
      ];
    });
    const headers = ['Slip No', 'Date', 'Material', 'Code', 'Qty Used', 'Unit', 'Process', 'Machine', 'Remarks'];
    
    await exportToExcel({
      headers,
      rows,
      filename: `consumption_report_${activeTenant.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Consumption Report'
    });
    info('Report exported.');
  };

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setFilterProcess(''); setSearchQuery(''); };
  const hasFilters = dateFrom || dateTo || filterProcess || searchQuery;

  const processColors: Record<string, string> = {
    Extrusion: 'bg-blue-100 text-blue-700 border-blue-200',
    Cutting: 'bg-orange-100 text-orange-700 border-orange-200',
    Sealing: 'bg-purple-100 text-purple-700 border-purple-200',
    Printing: 'bg-pink-100 text-pink-700 border-pink-200',
    Slitting: 'bg-teal-100 text-teal-700 border-teal-200',
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-primary/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Consumption Report</h1>
            <p className="text-slate-400 text-sm mt-0.5">Raw material usage by process, line, and material type</p>
          </div>
        </div>
        <Button onClick={downloadCSV} className="bg-primary hover:bg-primary/90 text-white px-6 rounded-full shadow-lg shadow-primary/20 font-bold h-11 flex-shrink-0">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Slips', value: filtered.length, icon: Zap, color: 'from-primary to-blue-700', iconBg: 'bg-primary/10 text-primary' },
          { label: 'Total Consumed', value: `${totalQty.toLocaleString()}`, sub: 'units', icon: TrendingDown, color: 'from-rose-500 to-rose-700', iconBg: 'bg-rose-100 text-rose-600' },
          { label: 'Active Processes', value: processTypes.length, icon: Settings, color: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-100 text-amber-600' },
          { label: 'Materials Used', value: materialSummary.length, icon: Package, color: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-100 text-emerald-600' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start justify-between group hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-3xl font-black text-slate-900 mt-1 leading-none">{kpi.value}</p>
              {kpi.sub && <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{kpi.sub}</p>}
            </div>
            <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Material & Process Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Material consumption breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Material Breakdown</h3>
          </div>
          <div className="p-4 space-y-3 max-h-56 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : materialSummary.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No consumption data</p>
            ) : materialSummary.map((m, i) => {
              const pct = Math.min((m.total / (materialSummary[0]?.total || 1)) * 100, 100);
              return (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center">{i+1}</span>
                      <span className="font-bold text-slate-700 text-sm">{m.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{m.code}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 text-sm">{m.total.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 font-bold ml-1">{m.unit}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Process summary */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">By Process</h3>
          </div>
          <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}</div>
            ) : processSummary.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No data</p>
            ) : processSummary.map(([proc, count], i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border ${processColors[proc] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{proc}</span>
                <span className="font-black text-slate-900 text-sm">{count} <span className="text-slate-400 font-normal text-[10px]">slips</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search slip, material, process..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 w-40 border-slate-200" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 w-40 border-slate-200" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Process</label>
            <select
              value={filterProcess}
              onChange={e => setFilterProcess(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none bg-slate-50 focus:bg-white w-40"
            >
              <option value="">All Processes</option>
              {processTypes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="h-10 rounded-lg text-sm text-slate-500 hover:text-rose-500 px-3">
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
        {hasFilters && (
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Showing {filtered.length} of {consumptions.length} records
          </p>
        )}
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Issuance Detail Log</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{filtered.length} Records</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Flame className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-semibold">No consumption records found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Slip / Date</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Raw Material</th>
                  <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty Consumed</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Process / Line</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-amber-50/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-800 text-[13px] group-hover:text-primary transition-colors">{c.consumption_slip_no}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(c.consumption_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{c.raw_materials?.rm_name || '—'}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{c.raw_materials?.rm_code}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-xl font-black text-rose-500 leading-none">{Number(c.quantity_used).toLocaleString()}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{c.raw_materials?.unit_type || 'units'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide border ${processColors[c.process_type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {c.process_type || 'GENERAL'}
                      </span>
                      {c.machine_no && (
                        <div className="text-[10px] text-slate-400 font-bold mt-1">LINE: {c.machine_no}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] text-slate-500 italic max-w-[180px] truncate">{c.remarks || '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
