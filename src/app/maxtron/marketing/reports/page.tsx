'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Search, 
  Calendar, 
  Download, 
  Filter, 
  Package, 
  Briefcase, 
  ChevronDown, 
  ChevronUp, 
  Quote, 
  User, 
  MapPin, 
  Clock,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { TableView } from '@/components/ui/table-view';
import * as XLSX from 'xlsx';

export default function MarketingReportsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [expandedQuotes, setExpandedQuotes] = useState<string[]>([]);
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    type: 'all',
    search: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      // Get active company
      const compRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      
      let coId = '';
      if (compData.success) {
        // Just take the first or filter by name if needed.
        coId = compData.data[0]?.id;
        setCurrentCompanyId(coId);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/marketing-visits?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setVisits(data.data);
      }
    } catch (err) {
      console.error('Error fetching visits:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      const dateMatch = (!filters.startDate || v.visit_date >= filters.startDate) && 
                       (!filters.endDate || v.visit_date <= filters.endDate);
      const statusMatch = filters.status === 'all' || v.quotation_status === filters.status;
      const typeMatch = filters.type === 'all' || 
                       (filters.type === 'quotation' && v.is_quotation) || 
                       (filters.type === 'visit' && !v.is_quotation);
      const searchMatch = !filters.search || 
                        v.customer_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
                        v.employee_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
                        v.location?.toLowerCase().includes(filters.search.toLowerCase());
      
      return dateMatch && statusMatch && typeMatch && searchMatch;
    });
  }, [visits, filters]);

  const stats = useMemo(() => {
    const totalVisits = filteredVisits.length;
    const quotations = filteredVisits.filter(v => v.is_quotation);
    const totalQuotations = quotations.length;
    const approvedQuotes = quotations.filter(v => v.quotation_status === 'Approved').length;
    
    const totalValue = quotations.reduce((sum, v) => {
        return sum + (v.quotation_items?.reduce((s: number, i: any) => 
            s + ((Number(i.amount) || 0) * (Number(i.quantity) || 1) * (1 + (Number(i.gst_percent) || 0) / 100)), 0) || 0);
    }, 0);

    return { totalVisits, totalQuotations, approvedQuotes, totalValue };
  }, [filteredVisits]);

  const downloadReport = () => {
    const reportData = filteredVisits.map(v => ({
      'Date': new Date(v.visit_date).toLocaleDateString(),
      'Staff': v.employee_name,
      'Client': v.customer_name,
      'Location': v.location,
      'Type': v.is_quotation ? 'Quotation' : 'Visit Only',
      'Status': v.quotation_status || 'N/A',
      'Quotation Details': v.quotation_items?.map((i: any) => `${i.product_name || i.product} (Qty: ${i.quantity}, Amt: ${i.amount})`).join('; ') || '',
      'Total Value (Inc. GST)': v.is_quotation ? v.quotation_items?.reduce((sum: number, i: any) => 
        sum + ((Number(i.amount) || 0) * (Number(i.quantity) || 1) * (1 + (Number(i.gst_percent) || 0) / 100)), 0
      ) : 0,
      'Outcome': v.outcome,
      'Feedback': v.feedback
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marketing Report");
    XLSX.writeFile(wb, `Marketing_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleExpand = (id: string) => {
    setExpandedQuotes(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-primary/10 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20" />
            Marketing Operations Reports
          </h1>
          <p className="text-slate-500 font-medium ml-13 mt-1">Analytics and history of all client visits and quotations.</p>
        </div>
        <Button 
          onClick={downloadReport}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12 px-6 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95"
        >
          <FileSpreadsheet className="w-5 h-5" /> Export Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Logs', value: stats.totalVisits, icon: Filter, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Quotations', value: stats.totalQuotations, icon: Quote, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Approved', value: stats.approvedQuotes, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Project Value', value: `₹${stats.totalValue.toLocaleString()}`, icon: TrendingUp, color: 'text-slate-900', bg: 'bg-slate-100 font-black' }
        ].map((s, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <h3 className={`text-2xl ${s.color}`}>{s.value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${s.bg}`}>
                  <s.icon className={`w-6 h-6 ${s.color.split(' ')[0]}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Search Keywords</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Staff, Client, or Location..."
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
                className="pl-9 h-11 bg-white border-slate-200"
              />
            </div>
          </div>
          
          <div className="space-y-1.5 w-40">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Start Date</label>
            <Input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="h-11 bg-white" />
          </div>

          <div className="space-y-1.5 w-40">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">End Date</label>
            <Input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="h-11 bg-white" />
          </div>

          <div className="space-y-1.5 w-40">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Status</label>
            <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
              <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 w-40">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">View Type</label>
            <Select value={filters.type} onValueChange={v => setFilters({...filters, type: v})}>
              <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everything</SelectItem>
                <SelectItem value="quotation">Quotes Only</SelectItem>
                <SelectItem value="visit">Visits Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TableView 
          data={filteredVisits}
          loading={loading}
          headers={['Staff & Date', 'Client & Location', 'Visit Details', 'Quoted Amount', 'Items & Status']}
          searchFields={['employee_name', 'customer_name', 'location', 'purpose']}
          renderRow={(rec: any) => {
            const totalInclusive = rec.is_quotation ? rec.quotation_items?.reduce((s: number, i: any) => 
               s + ((Number(i.amount) || 0) * (Number(i.quantity) || 1) * (1 + (Number(i.gst_percent) || 0) / 100)), 0
            ) : 0;

            return (
              <tr key={rec.id} className="hover:bg-slate-50 transition-all border-b last:border-none">
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{rec.employee_name}</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <Calendar className="w-3 h-3 text-primary" />
                      {new Date(rec.visit_date).toLocaleDateString()}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{rec.customer_name}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]" title={rec.location}>
                      <MapPin className="w-3 h-3 text-rose-500" />
                      {rec.location}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="max-w-[200px] space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border shrink-0 ${
                         rec.outcome === 'Interested / Hot Lead' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                         rec.outcome === 'Not Interested' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                         rec.outcome === 'Contact Later' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                         'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {rec.outcome || 'N/A'}
                      </span>
                      <p className="text-xs font-bold text-primary truncate" title={rec.purpose}>{rec.purpose}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1" title={rec.feedback}>{rec.feedback || 'No feedback'}</p>
                  </div>
                </td>
                <td className="p-4">
                   {rec.is_quotation ? (
                     <div className="flex flex-col">
                        <span className="text-sm font-black text-emerald-700">₹{totalInclusive.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Tax Inclusive</span>
                     </div>
                   ) : (
                     <span className="text-xs font-bold text-slate-300">—</span>
                   )}
                </td>
                <td className="p-4">
                  {!rec.is_quotation ? (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-1 px-2 bg-slate-100 rounded">Visit Only</span>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                         <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${
                            rec.quotation_status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            rec.quotation_status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                         }`}>
                           {rec.quotation_status}
                         </span>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => toggleExpand(rec.id)}
                           className="h-6 px-2 text-[10px] font-black text-primary hover:bg-primary/5 gap-1"
                         >
                           {expandedQuotes.includes(rec.id) ? (
                             <><ChevronUp className="w-3 h-3" /> Close</>
                           ) : (
                             <><ChevronDown className="w-3 h-3" /> {rec.quotation_items?.length || 0} Products</>
                           )}
                         </Button>
                      </div>
                      
                      {expandedQuotes.includes(rec.id) && (
                        <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200 animate-in slide-in-from-top-1 duration-200 min-w-[250px]">
                          <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                            {rec.quotation_items?.map((item: any, idx: number) => (
                               <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-[9px]">
                                 <div className="flex flex-col min-w-0">
                                   <div className="flex items-center gap-1">
                                      <Package className="w-2.5 h-2.5 text-slate-400" />
                                      <span className="font-black text-slate-700 truncate">{item.product_name}</span>
                                   </div>
                                   <span className="text-slate-500">Qty: {item.quantity} | GST: {item.gst_percent}%</span>
                                 </div>
                                 <div className="text-right flex flex-col">
                                    <span className="font-black text-primary">₹{(Number(item.amount) || 0).toLocaleString()}</span>
                                    <span className="text-[7px] text-emerald-600 font-bold">Sum: ₹{((Number(item.amount) || 0) * (Number(item.quantity) || 1) * (1 + (Number(item.gst_percent) || 0) / 100)).toLocaleString()}</span>
                                 </div>
                               </div>
                            ))}
                          </div>
                          
                          {rec.quotation_delivery_date && (
                            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase px-1">
                              <Clock3 className="w-2.5 h-2.5" /> Delivery: {new Date(rec.quotation_delivery_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          }}
        />
      </Card>
    </div>
  );
}
