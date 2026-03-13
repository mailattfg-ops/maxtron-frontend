'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, CalendarDays, LineChart, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { exportToExcel } from '@/utils/export';

export default function AttendanceReportPage() {
  const pathname = usePathname();
  const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';
  const activeTenant = activeEntity.toUpperCase();

  const ATTENDANCE_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/attendance`;

  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const { info, error, success } = useToast();

  useEffect(() => {

    fetchCompanyAndData();
  }, []);

  const fetchCompanyAndData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const compRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          setCurrentCompanyId(activeCo.id);
          fetchSummary(activeCo.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (coId?: string) => {
    setLoading(true);
    const targetCoId = coId || currentCompanyId;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${ATTENDANCE_API}/range?start_date=${startDate}&end_date=${endDate}&company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }
    } catch (err) {
      error('Failed to fetch summary data.');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'PRESENT').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    late: records.filter(r => r.status === 'LATE').length,
    presenceRate: records.length > 0 ? Math.round((records.filter(r => r.status === 'PRESENT').length / records.length) * 100) : 0
  };

  const downloadExcel = async () => {
    if (records.length === 0) {
      info('No records to export.');
      return;
    }
    const headers = ['Date', 'Emp Code', 'Name', 'In', 'Out', 'Status', 'Remarks'];
    const rows = records.map(r => [
      r.date.split('T')[0] || '',
      r.users?.employee_code || '',
      r.users?.name || '',
      r.clock_in || '',
      r.clock_out || '',
      r.status || '',
      r.remarks || ''
    ]);
    
    await exportToExcel({
      headers,
      rows,
      filename: `Attendance_Report_${startDate}_to_${endDate}.xlsx`,
      sheetName: 'Attendance Summary'
    });
    success('Report downloaded.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Attendance Summary</h1>
          <p className="text-foreground/60 mt-2">Analytics and date-range logs for {activeTenant}.</p>
        </div>
        <Button onClick={downloadExcel} className="bg-secondary text-white hover:bg-secondary/90 rounded-full px-6">
          <Download className="w-4 h-4 mr-2" /> Download Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary text-primary-foreground shadow-lg border-none relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-extrabold">{stats.presenceRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-primary-foreground/90">Avg Presence Rate</p>
          </CardContent>
          <LineChart className="w-20 h-20 absolute -right-3 -bottom-3 text-white/10" />
        </Card>
        
        <Card className="bg-white shadow border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-extrabold text-emerald-600">{stats.present}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-foreground/70">Total Present Days</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-extrabold text-rose-500">{stats.absent}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-foreground/70">Total Absents</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-extrabold text-orange-500">{stats.late}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-foreground/70">Late Comers</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-primary/5">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
          <CardTitle className="text-xl flex items-center text-primary font-bold">
            <CalendarDays className="w-5 h-5 mr-3 text-secondary" />
            Filtered Attendance Logs
          </CardTitle>
          <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-lg border">
             <span className="text-xs font-bold text-slate-500 uppercase px-1">From:</span>
             <Input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="rounded-md w-36 h-9 text-xs border-primary/20" />
             <span className="text-xs font-bold text-slate-500 uppercase px-1">To:</span>
             <Input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="rounded-md w-36 h-9 text-xs border-primary/20" />
             <Button onClick={() => fetchSummary()} size="sm" className="bg-primary text-white hover:bg-primary/90 h-9 px-4 rounded-md">
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
             </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-4 border-r">Date</th>
                  <th className="p-4 border-r">ID & Name</th>
                  <th className="p-4 border-r text-center">In / Out</th>
                  <th className="p-4 border-r text-center">Status</th>
                  <th className="p-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground italic">
                      {loading ? 'Crunching data...' : 'No logs found for this range.'}
                    </td>
                  </tr>
                ) : (
                  records.map(r => (
                    <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-mono text-xs">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="p-4">
                         <div className="font-bold text-primary">{r.users?.name}</div>
                         <div className="text-[10px] text-muted-foreground">{r.users?.employee_code}</div>
                      </td>
                      <td className="p-4 text-center text-xs font-mono">
                         {r.clock_in?.substring(0,5) || '--:--'} - {r.clock_out?.substring(0,5) || '--:--'}
                      </td>
                      <td className="p-4 text-center">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                           r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : 
                           r.status === 'ABSENT' ? 'bg-rose-100 text-rose-700' : 
                           'bg-amber-100 text-amber-700'
                         }`}>
                           {r.status}
                         </span>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground italic max-w-xs truncate">
                        {r.remarks || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

