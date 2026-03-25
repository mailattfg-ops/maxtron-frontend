'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Clock, UserCheck, Plus, Search, Edit, Trash2, X, Save, Download, FileSpreadsheet, Lock, Loader2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function AttendancePage() {
  const { hasPermission, loading: permissionLoading } = usePermission();

  const canView = hasPermission('hr_attendance_view', 'view');
  const canCreate = hasPermission('hr_attendance_view', 'create');
  const canEdit = hasPermission('hr_attendance_view', 'edit');
  const canDelete = hasPermission('hr_attendance_view', 'delete');
  const pathname = usePathname();
  const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';
  const activeTenant = activeEntity.toUpperCase();

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManagement, setIsManagement] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsAdmin(userData.role_name?.toLowerCase() === 'admin' || userData.email?.toLowerCase() === 'admin@maxtron.com');
      setIsManagement(userData.category?.category_name?.toLowerCase() === 'management');
    }
  }, []);

  const ATTENDANCE_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/attendance`;
  const EMPLOYEES_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/employees`;

  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateFilter, setDateFilter] = useState('');

  const { success, error, info } = useToast();
  const { confirm } = useConfirm();


  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    shift: 'GENERAL',
    clock_in: '',
    clock_out: '',
    status: 'PRESENT',
    remarks: '',
    company_id: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const compRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      let coId = '';
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
          setFormData(prev => ({ ...prev, company_id: coId }));
        }
      }

      const empRes = await fetch(`${EMPLOYEES_API}?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const empData = await empRes.json();
      if (empData.success) {
        const filtered = empData.data.filter((emp: any) => 
          (emp.companies?.company_name || '').trim().toUpperCase() === activeTenant
        );
        setEmployees(filtered);
      }

      fetchAttendance(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const isAdmin = user?.role_name?.toLowerCase() === 'admin' || user?.email?.toLowerCase() === 'admin@maxtron.com';
    const isManagement = user?.category?.category_name?.toLowerCase() === 'management';

    const targetCoId = coId || currentCompanyId;
    if (!targetCoId) return; 

    try {
      const res = await fetch(`${ATTENDANCE_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const records = data.data || [];
        
        if (isAdmin) {
          setAttendanceRecords(records);
        } else if (isManagement) {
          setAttendanceRecords(records.filter((e: any) => 
            e.users?.user_types?.name?.toLowerCase() === user.role_name?.toLowerCase()
          ));
        } else {
          setAttendanceRecords(records.filter((e: any) => e.employee_id === user?.id));
        }
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const prepareBulkData = () => {
    const initialBulk = employees.map(emp => ({
      employee_id: emp.id,
      employee_name: emp.name,
      employee_code: emp.employee_code,
      date: bulkDate,
      shift: 'GENERAL',
      status: 'PRESENT',
      clock_in: '09:00',
      clock_out: '18:00',
      remarks: '',
      company_id: currentCompanyId
    }));
    setBulkData(initialBulk);
    setShowBulkForm(true);
    setShowForm(false);
  };

  const handleBulkDateChange = (newDate: string) => {
    setBulkDate(newDate);
    setBulkData(prev => prev.map(item => ({ ...item, date: newDate })));
  };

  const removeEmployeeFromBulk = (empId: string) => {
    setBulkData(prev => prev.filter(item => item.employee_id !== empId));
  };

  const saveBulkAttendance = async () => {
    const token = localStorage.getItem('token');
    setSubmitting(true);
    try {
      const cleanList = bulkData.map(({ employee_name, employee_code, ...rest }) => ({
        ...rest
      }));

      for (const item of bulkData) {
        if (item.status !== 'ABSENT') {
          if (item.clock_out <= item.clock_in) {
            error(`Error for ${item.employee_name}: Clock-out time must be later than Clock-in time.`);
            setSubmitting(false);
            return;
          }
        }
      }

      const res = await fetch(`${ATTENDANCE_API}/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ attendanceList: cleanList })
      });
      const data = await res.json();
      if (data.success) {
        success('Bulk attendance marked successfully!');
        setShowBulkForm(false);
        fetchAttendance(currentCompanyId);
      } else {
        error(data.error || data.message || 'Bulk marking failed');
      }
    } catch (err: any) {
      error(err.message || 'Network error during bulk save.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveAttendance = async () => {
    if (!formData.employee_id || !formData.date || !formData.shift) {
      error('Please fill required fields.');
      return;
    }

    if (formData.status !== 'ABSENT') {
      if (formData.clock_out <= formData.clock_in) {
        error('Clock-out time must be later than Clock-in time.');
        return;
      }
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${ATTENDANCE_API}/${editingId}` : ATTENDANCE_API;

    setSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Record updated!' : 'Record saved!');
        setShowForm(false);
        setEditingId(null);
        setDateFilter(formData.date);
        fetchAttendance(currentCompanyId); 
        resetForm();
      } else {
        error(data.error || data.message || 'Error occurred');
      }
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      error(err.message || 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      shift: 'GENERAL',
      clock_in: '',
      clock_out: '',
      status: 'PRESENT',
      remarks: '',
      company_id: currentCompanyId
    });
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      employee_id: rec.employee_id,
      date: rec.date.split('T')[0],
      shift: rec.shift,
      clock_in: rec.clock_in || '',
      clock_out: rec.clock_out || '',
      status: rec.status,
      remarks: rec.remarks || '',
      company_id: rec.company_id
    });
    setShowForm(true);
  };

  const downloadAttendance = async () => {
    const activeRecords = attendanceRecords.filter(rec => !dateFilter || rec.date.startsWith(dateFilter));
    if (activeRecords.length === 0) {
      info('No records found for the selected date to download.');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance');

      worksheet.columns = [
        { header: 'Employee', key: 'name', width: 25 },
        { header: 'Code', key: 'code', width: 12 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Shift', key: 'shift', width: 12 },
        { header: 'Clock In', key: 'clock_in', width: 12 },
        { header: 'Clock Out', key: 'clock_out', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Remarks', key: 'remarks', width: 30 }
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      const formatDate = (dateStr: any) => {
        if (!dateStr || dateStr === 'null') return 'N/A';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        } catch (e) { return dateStr; }
      };

      activeRecords.forEach(rec => {
        const row = worksheet.addRow({
          name: rec.users?.name || 'N/A',
          code: rec.users?.employee_code || 'N/A',
          date: formatDate(rec.date),
          shift: rec.shift || '',
          clock_in: rec.clock_in || 'N/A',
          clock_out: rec.clock_out || 'N/A',
          status: rec.status || '',
          remarks: rec.remarks || ''
        });
        
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `attendance_report_${dateFilter || 'all'}.xlsx`);
      
      success(`Attendance report for ${dateFilter || 'all dates'} downloaded.`);
    } catch (err) {
      console.error('Export error:', err);
      error('Failed to export Excel file.');
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this attendance record?',
      type: 'danger'
    });
    if (!isConfirmed) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${ATTENDANCE_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Log deleted.');
        fetchAttendance();
      }
    } catch (err) {
      error('Delete failed.');
    }
  };

  if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  if (!canView) return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
          <div className="p-6 rounded-full bg-primary/5 text-primary">
              <Lock className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
          <p className="text-muted-foreground font-medium">You do not have permission to view Attendance Management.</p>
      </div>
  );

  return (
    <div className="md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10 mb-2 font-heading">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1 italic">Track and manage daily staff presence and work hours across HR & Payroll.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
          <Button 
            onClick={downloadAttendance}
            variant="outline"
            className="flex-1 md:flex-none h-11 border-primary/20 text-primary hover:bg-primary/5 rounded-full px-6 font-bold active:scale-95 transition-all text-sm"
          >
            <Download className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Download Logs</span><span className="sm:hidden">Export</span>
          </Button>
          {canCreate && (
            <Button 
              onClick={prepareBulkData}
              variant="outline"
              className="flex-1 md:flex-none h-11 border-primary/20 text-primary hover:bg-primary/5 rounded-full px-6 font-bold active:scale-95 transition-all text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Bulk Entry</span><span className="sm:hidden">Bulk</span>
            </Button>
          )}
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); setShowBulkForm(false); }}
              className="flex-1 md:flex-none h-11 bg-primary hover:bg-primary/95 text-white px-8 rounded-full transition-all shadow-lg font-bold active:scale-95 text-sm"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
              {showForm ? 'Cancel Log' : 'New Log Entry'}
            </Button>
          )}
        </div>
      </div>



      {showForm && (
        <Card className="border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl font-bold text-primary">{editingId ? 'Edit Attendance' : 'Mark Daily Attendance'}</CardTitle>
            <CardDescription className="text-xs md:text-sm">Input shift details and timing for employees.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Select value={formData.employee_id} onValueChange={(val) => setFormData({...formData, employee_id: val})}>
                  <SelectTrigger className="w-full h-11 border-slate-200 bg-white font-bold text-sm shadow-sm">
                    <SelectValue placeholder="Choose employee..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
 
              <div className="space-y-2">
                {/* <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                  <Calendar className="w-3 h-3 mr-2 text-primary" /> Date
                </label> */}
                <Input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="h-11 font-bold"
                />
              </div>
 
                <Select value={formData.shift} onValueChange={(val) => setFormData({...formData, shift: val})}>
                  <SelectTrigger className="w-full h-11 border-slate-200 bg-white font-bold text-sm shadow-sm">
                    <SelectValue placeholder="Select Shift" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="GENERAL">General Shift</SelectItem>
                    <SelectItem value="DAY">Day Shift</SelectItem>
                    <SelectItem value="NIGHT">Night Shift</SelectItem>
                  </SelectContent>
                </Select>
 
                <Select 
                  value={formData.status} 
                  onValueChange={(val) => {
                    const status = val;
                    const updates: any = { status };
                    if (status === 'ABSENT') {
                      updates.clock_in = '00:00';
                      updates.clock_out = '00:00';
                    }
                    setFormData({...formData, ...updates});
                  }}
                >
                  <SelectTrigger className="w-full h-11 border-slate-200 bg-white font-black text-sm shadow-sm">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="LATE">Late</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                  </SelectContent>
                </Select>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Clock In Time</label>
                <Input 
                  type="time"
                  value={formData.clock_in}
                  onChange={(e) => setFormData({...formData, clock_in: e.target.value})}
                  className="h-11 font-bold"
                />
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Clock Out Time</label>
                <Input 
                  type="time"
                  value={formData.clock_out}
                  onChange={(e) => setFormData({...formData, clock_out: e.target.value})}
                  className="h-11 font-bold"
                />
              </div>
 
              <div className="sm:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Remarks (Optional)</label>
                <Input 
                  placeholder="Notes about attendance..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  className="h-11"
                />
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3">
              <Button 
                onClick={saveAttendance} 
                loading={submitting}
                className="flex-1 md:flex-none bg-primary hover:bg-primary/95 text-white px-10 h-11 rounded-full shadow-lg shadow-primary/20 flex items-center justify-center font-bold active:scale-95"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'UPDATE ATTENDANCE' : 'AUTHORIZE LOG'}
              </Button>
            </div>

          </CardContent>
        </Card>
      )}
      
      {showBulkForm && (
        <Card className="border-secondary/20 shadow-xl animate-in slide-in-from-top duration-300">
          <CardHeader className="bg-secondary/5 border-b border-secondary/10 rounded-t-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 p-4 md:p-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-secondary" />
                </div>
                <div>
                   <CardTitle className="text-lg md:text-xl font-bold text-slate-800">Bulk Attendance Mark</CardTitle>
                   <CardDescription className="text-[10px] md:text-xs">Register attendance for multiple staff members in one go.</CardDescription>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
               <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-secondary/20 shadow-sm">
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Mark Date:</span>
                  <Input 
                    type="date" 
                    value={bulkDate} 
                    onChange={(e) => handleBulkDateChange(e.target.value)}
                    className="text-xs font-bold outline-none bg-transparent h-7 border-none shadow-none p-0 w-24"
                  />
               </div>
               <Button size="sm" variant="ghost" onClick={() => setShowBulkForm(false)} className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive shrink-0">
                 <X className="w-4 h-4" />
               </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Shift</th>
                    <th className="px-4 py-3">Clock In / Out</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic font-medium">
                  {bulkData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                         <div className="font-bold text-slate-800">{row.employee_name}</div>
                         <div className="text-[10px] text-slate-400">{row.employee_code}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                         <Select 
                           value={row.status}
                           onValueChange={(val) => {
                             const status = val;
                             const nd = [...bulkData];
                             nd[idx].status = status;
                             if (status === 'ABSENT') {
                               nd[idx].clock_in = '00:00';
                               nd[idx].clock_out = '00:00';
                             }
                             setBulkData(nd);
                           }}
                         >
                           <SelectTrigger className="h-8 w-32 border-slate-200 bg-white px-2 text-xs mx-auto">
                             <SelectValue placeholder="Status" />
                           </SelectTrigger>
                           <SelectContent className="bg-white border-slate-200">
                             <SelectItem value="PRESENT">Present</SelectItem>
                             <SelectItem value="ABSENT">Absent</SelectItem>
                             <SelectItem value="LATE">Late</SelectItem>
                             <SelectItem value="HALF_DAY">Half Day</SelectItem>
                           </SelectContent>
                         </Select>
                      </td>
                      <td className="px-4 py-3 text-center">
                         <Select 
                           value={row.shift}
                           onValueChange={(val) => {
                             const nd = [...bulkData];
                             nd[idx].shift = val;
                             setBulkData(nd);
                           }}
                         >
                           <SelectTrigger className="h-8 w-24 border-slate-200 bg-white px-2 text-xs mx-auto">
                             <SelectValue placeholder="Shift" />
                           </SelectTrigger>
                           <SelectContent className="bg-white border-slate-200">
                             <SelectItem value="GENERAL">General</SelectItem>
                             <SelectItem value="DAY">Day</SelectItem>
                             <SelectItem value="NIGHT">Night</SelectItem>
                           </SelectContent>
                         </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Input type="time" value={row.clock_in} onChange={(e)=> { let d=[...bulkData]; d[idx].clock_in=e.target.value; setBulkData(d); }} className="h-8 w-24 text-xs" />
                          <Input type="time" value={row.clock_out} onChange={(e)=> { let d=[...bulkData]; d[idx].clock_out=e.target.value; setBulkData(d); }} className="h-8 w-24 text-xs" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                         <Input value={row.remarks} onChange={(e)=> { let d=[...bulkData]; d[idx].remarks=e.target.value; setBulkData(d); }} placeholder="Notes..." className="h-8 text-xs min-w-[150px]" />
                      </td>
                      <td className="px-4 py-3 text-right">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => removeEmployeeFromBulk(row.employee_id)}
                           className="h-8 w-8 rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/5"
                         >
                           <X className="w-4 h-4" />
                         </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-slate-50/50 rounded-b-xl flex justify-between items-center">
               <div className="text-xs text-slate-500 font-bold">Total: {bulkData.length} records ready.</div>
               <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                 <Button variant="ghost" onClick={() => setShowBulkForm(false)} className="rounded-full h-11 px-8 font-bold active:scale-95">Discard Changes</Button>
                 <Button 
                    onClick={saveBulkAttendance} 
                    loading={submitting}
                    className="flex-1 md:flex-none bg-secondary hover:bg-secondary/90 text-white rounded-full h-11 px-10 shadow-lg shadow-secondary/10 font-bold active:scale-95"
                  >
                   <Save className="w-4 h-4 mr-2" /> Mark Attendance
                 </Button>
               </div>

            </div>
          </CardContent>
        </Card>
      )}
      {!showForm && !showBulkForm && (
        <TableView
          title="Attendance Logs"
          description={`Daily shift-wise logging for ${activeTenant} staff.`}
          headers={['Employee', 'Date', 'Shift', 'In / Out', 'Status', 'Remarks', 'Actions']}
          data={attendanceRecords.filter(rec => rec && rec.date && rec.date.startsWith(dateFilter))}
          loading={loading}
          searchFields={['users.name', 'users.employee_code', 'remarks']}
          searchPlaceholder="Search staff or notes..."
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-bold text-muted-foreground whitespace-nowrap">Filter Date:</span>
              <div className="flex gap-1">
                <Input 
                  type="date"
                  className="w-32 md:w-40 rounded-full border-primary/20 shadow-none h-9 text-xs"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
                {dateFilter && (
                  <Button size="sm" variant="ghost" onClick={() => setDateFilter('')} className="h-9 px-2 text-[10px] font-bold text-primary">
                    Clear
                  </Button>
                )}
              </div>
            </div>
          }

          renderRow={(rec: any) => (
            <tr key={rec.id} className="hover:bg-primary/5 transition-colors group">
              <td className="px-6 py-4">
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {rec.users?.name}
                </div>
                <div className="text-[11px] text-muted-foreground">{rec.users?.employee_code}</div>
              </td>
              <td className="px-6 py-4 font-medium">{new Date(rec.date).toLocaleDateString()}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-[11px] font-bold ${
                  rec.shift === 'DAY' ? 'bg-orange-100 text-orange-700' : 
                  rec.shift === 'NIGHT' ? 'bg-slate-800 text-white' : 
                  'bg-blue-100 text-blue-700'
                }`}>
                  {rec.shift}
                </span>
              </td>
              <td className="px-6 py-4 font-mono text-xs">
                {rec.clock_in?.substring(0, 5) || '--:--'} - {rec.clock_out?.substring(0, 5) || '--:--'}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  rec.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : 
                  rec.status === 'ABSENT' ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {rec.status}
                </span>
              </td>
              <td className="px-6 py-4 text-muted-foreground italic text-xs truncate max-w-[150px]">
                {rec.remarks || '-'}
              </td>
              <td className="md:px-6 py-4 text-right space-x-2">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(rec)} className="hover:text-primary hover:bg-primary/10 rounded-full h-8 w-8">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(rec.id)} className="hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}
