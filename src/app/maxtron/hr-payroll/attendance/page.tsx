'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Clock, UserCheck, Plus, Search, Edit, Trash2, X, Save } from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

const ATTENDANCE_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/attendance`;
const EMPLOYEES_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/employees`;

export default function AttendancePage() {
  const [showForm, setShowForm] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');

  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const { success, error } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

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
      // Fetch Companies to get current one
      const compRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/companies`, {
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

      // Fetch Employees
      const empRes = await fetch(`${EMPLOYEES_API}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const empData = await empRes.json();
      if (empData.success) {
        setEmployees(empData.data.filter((e: any) => e.companies?.company_name?.toUpperCase() === activeTenant));
      }

      // Fetch Attendance
      fetchAttendance(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${ATTENDANCE_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAttendanceRecords(data.data);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const saveAttendance = async () => {
    if (!formData.employee_id || !formData.date || !formData.shift) {
      error('Please fill required fields.');
      return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${ATTENDANCE_API}/${editingId}` : ATTENDANCE_API;

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
        fetchAttendance();
        resetForm();
      } else {
        error(data.message || 'Error occurred');
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
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



  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Attendance Details</h1>
          <p className="text-muted-foreground text-sm font-medium">Daily shift-wise logging for {activeTenant} staff.</p>
        </div>
        <Button 
          onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
          className="bg-primary hover:bg-primary/90 text-white px-6 rounded-full transition-all duration-300 shadow-lg shadow-primary/20"
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancel Entry' : 'Log Attendance'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl">
            <CardTitle className="text-lg font-semibold text-primary">{editingId ? 'Edit Attendance' : 'Mark Daily Attendance'}</CardTitle>
            <CardDescription>Input shift details and timing for employees.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-primary" /> Select Employee
                </label>
                <select 
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm"
                >
                  <option value="">Choose employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-primary" /> Date
                </label>
                <Input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="shadow-sm focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary" /> Shift
                </label>
                <select 
                  value={formData.shift}
                  onChange={(e) => setFormData({...formData, shift: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm"
                >
                  <option value="GENERAL">General Shift</option>
                  <option value="DAY">Day Shift</option>
                  <option value="NIGHT">Night Shift</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                   Status
                </label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80">Clock In Time</label>
                <Input 
                  type="time"
                  value={formData.clock_in}
                  onChange={(e) => setFormData({...formData, clock_in: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80">Clock Out Time</label>
                <Input 
                  type="time"
                  value={formData.clock_out}
                  onChange={(e) => setFormData({...formData, clock_out: e.target.value})}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-foreground/80">Remarks (Optional)</label>
                <Input 
                  placeholder="Notes about attendance..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={saveAttendance} className="bg-primary hover:bg-primary/95 text-white px-8 h-11 rounded-full shadow-lg shadow-primary/20 flex items-center">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Record' : 'Save Attendance'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <TableView
        title="Attendance Logs"
        description={`Daily shift-wise logging for ${activeTenant} staff.`}
        headers={['Employee', 'Date', 'Shift', 'In / Out', 'Status', 'Remarks', 'Actions']}
        data={attendanceRecords.filter(rec => rec.date.startsWith(dateFilter))}
        loading={loading}
        searchFields={['users.name', 'users.employee_code', 'remarks']}
        searchPlaceholder="Search staff or notes..."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">Filter Date:</span>
            <Input 
              type="date"
              className="w-40 rounded-full border-primary/20 shadow-none h-9 text-xs"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
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
            <td className="px-6 py-4 text-right space-x-2">
              <Button variant="ghost" size="icon" onClick={() => handleEdit(rec)} className="hover:text-primary hover:bg-primary/10 rounded-full h-8 w-8">
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(rec.id)} className="hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
