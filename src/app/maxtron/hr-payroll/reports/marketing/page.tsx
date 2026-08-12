'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Map, Download, Briefcase, Calendar, Clock, Loader2, MapPin, Users, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { exportToExcel } from '@/utils/export';

const MARKETING_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/marketing-visits`;
const EMPLOYEES_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/employees`;

export default function MarketingReportPage() {
  const [dateFilter, setDateFilter] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const { success, error, info } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [compRes, empRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/companies`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(EMPLOYEES_API, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [compData, empData] = await Promise.all([compRes.json(), empRes.json()]);

      let coId = '';
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === 'MAXTRON');
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
        }
      }

      let empsList: any[] = [];
      if (empData.success) {
        empsList = empData.data || [];
        setEmployees(empsList);
      }

      if (coId) {
        const visitsRes = await fetch(`${MARKETING_API}?company_id=${coId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const visitsData = await visitsRes.json();
        if (visitsData.success) {
          const enriched = (visitsData.data || []).map((rec: any) => {
            const emp = empsList.find((e: any) => e.id === rec.employee_id);
            return {
              ...rec,
              employee_code: rec.users?.employee_code || emp?.employee_code || '',
              employee_name: rec.users?.name || emp?.name || 'Unknown Staff'
            };
          });
          setRecords(enriched);
        }
      }
    } catch (err) {
      console.error('Error fetching marketing report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(rec => !dateFilter || (rec.visit_date && rec.visit_date.startsWith(dateFilter)));

  const calculateDuration = (timeIn: string, timeOut: string) => {
    if (!timeIn || !timeOut) return 'N/A';
    try {
      const [inH, inM] = timeIn.split(':').map(Number);
      const [outH, outM] = timeOut.split(':').map(Number);
      const totalInMins = inH * 60 + inM;
      const totalOutMins = outH * 60 + outM;
      const diffMins = totalOutMins - totalInMins;
      if (diffMins <= 0) return 'N/A';
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (hours === 0) return `${mins}m`;
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    } catch (e) {
      return 'N/A';
    }
  };

  const topPerformer = (() => {
    if (records.length === 0) return { name: 'N/A', count: 0 };
    const weights: Record<string, number> = {
      'Order Received': 10,
      'Payment Collected': 10,
      'Proposal Sent': 5,
      'Negotiation': 3,
      'Product Demo': 2,
      'Follow-up Scheduled': 1,
      'Initial Contact': 1,
      'Not Interested': 0
    };

    const statsMap: Record<string, { name: string; count: number; score: number; lastVisitTime: number }> = {};
    records.forEach(curr => {
      const emp = employees.find(e => e.id === curr.employee_id);
      const name = curr.users?.name || emp?.name || curr.employee_name || 'Unknown Staff';
      const score = weights[curr.outcome] !== undefined ? weights[curr.outcome] : 1;
      let visitTime = 0;
      if (curr.visit_date) {
        const datePart = curr.visit_date.split('T')[0];
        const timePart = curr.time_in ? curr.time_in : '00:00:00';
        visitTime = new Date(`${datePart}T${timePart}`).getTime() || 0;
      }
      if (!statsMap[name]) {
        statsMap[name] = { name, count: 0, score: 0, lastVisitTime: 0 };
      }
      statsMap[name].count += 1;
      statsMap[name].score += score;
      if (visitTime > statsMap[name].lastVisitTime) {
        statsMap[name].lastVisitTime = visitTime;
      }
    });

    const list = Object.values(statsMap);
    if (list.length === 0) return { name: 'N/A', count: 0 };
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.count !== a.count) return b.count - a.count;
      return b.lastVisitTime - a.lastVisitTime; // Deterministic tie-breaker
    });
    return list[0];
  })();

  const downloadExcelReport = async () => {
    if (filteredRecords.length === 0) {
      info('No visit records found to export.');
      return;
    }

    const headers = ['Date', 'Staff Code', 'Staff Name', 'Customer / Client', 'Location', 'Time In', 'Time Out', 'Duration', 'Purpose', 'Outcome', 'Feedback'];
    const rows = filteredRecords.map(rec => {
      const formatDate = (dateStr: any) => {
        if (!dateStr || dateStr === 'null') return 'N/A';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        } catch (e) { return dateStr; }
      };

      return [
        formatDate(rec.visit_date),
        rec.employee_code || rec.users?.employee_code || 'N/A',
        rec.employee_name || rec.users?.name || 'N/A',
        rec.customer_name || 'N/A',
        rec.location || 'N/A',
        rec.time_in || 'N/A',
        rec.time_out || 'N/A',
        calculateDuration(rec.time_in, rec.time_out),
        rec.purpose || '',
        rec.outcome || '',
        rec.feedback || ''
      ];
    });

    await exportToExcel({
      headers,
      rows,
      filename: `Marketing_Operations_Report_${dateFilter || 'all'}.xlsx`,
      sheetName: 'Marketing Operations'
    });

    success('Marketing report exported successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Marketing Executive Visits</h1>
          <p className="text-foreground/60 mt-2">Analytics on field force movement and customer coverage.</p>
        </div>
        <Button onClick={downloadExcelReport} className="bg-secondary text-white hover:bg-secondary/90 rounded-full px-6 w-full sm:w-auto h-11">
          <Download className="w-4 h-4 mr-2" /> Export Logs
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="col-span-1 lg:col-span-3 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b">
            <CardTitle className="text-xl flex items-center text-primary font-bold">
              <Map className="w-5 h-5 mr-3 text-secondary" />
              Visit History Log
            </CardTitle>
            <div className="flex items-center space-x-2 w-full sm:w-auto group">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Filter Date:</span>
              <Input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 text-xs w-full sm:w-36 rounded-md border-primary/20" 
              />
              {dateFilter && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDateFilter('')}
                  className="h-9 px-3 rounded-full text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border border-slate-100 mx-0 overflow-x-auto shadow-sm">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-widest border-b">
                  <tr>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Exec Code</th>
                    <th className="p-4 font-semibold">Staff Name</th>
                    <th className="p-4 font-semibold">Client Visited</th>
                    <th className="p-4 font-semibold">Duration</th>
                    <th className="p-4 font-semibold">Location</th>
                    <th className="p-4 font-semibold">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading visit history...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                        No visit records found.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-primary/5 transition-colors">
                        <td className="p-4 text-foreground/70 font-mono text-xs">
                          {new Date(rec.visit_date).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-medium text-secondary font-mono text-xs">
                          {rec.employee_code || '#---'}
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          {rec.employee_name}
                        </td>
                        <td className="p-4 font-semibold text-primary">
                          {rec.customer_name}
                        </td>
                        <td className="p-4 text-slate-600 font-mono text-xs">
                          {calculateDuration(rec.time_in, rec.time_out)}
                        </td>
                        <td className="p-4 text-foreground/70 text-xs">
                          {rec.location || 'N/A'}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {rec.outcome || 'Logged'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Sidebar */}
        <div className="space-y-6">
          <Card className="bg-primary shadow text-primary-foreground border-none rounded-2xl">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70 flex items-center">
                 <Briefcase className="w-4 h-4 mr-2" /> Top Performer
               </CardTitle>
            </CardHeader>
            <CardContent>
               <h3 className="text-2xl font-black truncate">{topPerformer.name}</h3>
               <p className="text-xs mt-1 text-primary-foreground/80 font-medium">
                 {topPerformer.count} Client Visits Logged
               </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-primary/10 rounded-2xl">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                 <Users className="w-4 h-4 mr-2 text-secondary" /> Unique Clients
               </CardTitle>
            </CardHeader>
            <CardContent>
               <h3 className="text-3xl font-black text-primary">
                 {new Set(records.map(r => r.customer_name)).size}
               </h3>
               <p className="text-xs text-muted-foreground mt-1 tracking-wide font-medium border-t border-dashed mt-2 pt-2">
                 Total Visits: {records.length}
               </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
