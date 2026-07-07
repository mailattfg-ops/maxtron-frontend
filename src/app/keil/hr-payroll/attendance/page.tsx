'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Clock, UserCheck, Plus, Search, Edit, Trash2, X, Save, Download, FileSpreadsheet, Lock, Loader2, ChevronRight, CheckCircle2, Upload } from 'lucide-react';
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
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [excelPreviewRecords, setExcelPreviewRecords] = useState<any[]>([]);
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

  const validateRecord = (record: any, employeesList: any[]) => {
    const errors: string[] = [];
    
    const matchedEmp = employeesList.find(
      emp => (emp.employee_code || '').trim().toLowerCase() === (record.employee_code || '').trim().toLowerCase()
    );

    if (!record.employee_code) {
      errors.push('Employee Code is missing');
    } else if (!matchedEmp) {
      errors.push(`Employee Code "${record.employee_code}" not found`);
    }

    if (!record.date) {
      errors.push('Date is missing');
    } else {
      const year = new Date(record.date).getFullYear();
      if (isNaN(year) || year < 2020 || year > 2099) {
        errors.push(`Date year ${year} is invalid (must be between 2020 and 2099)`);
      }
    }

    const validShifts = ['DAY', 'NIGHT', 'GENERAL'];
    if (!record.shift || !validShifts.includes(record.shift.toUpperCase())) {
      errors.push(`Invalid Shift: "${record.shift}"`);
    }

    const validStatus = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY'];
    if (!record.status || !validStatus.includes(record.status.toUpperCase())) {
      errors.push(`Invalid Status: "${record.status}"`);
    }

    if (record.status !== 'ABSENT') {
      if (!record.clock_in) {
        errors.push('Clock In is missing');
      }
      if (!record.clock_out) {
        errors.push('Clock Out is missing');
      }
      if (record.clock_in && record.clock_out && record.clock_out <= record.clock_in) {
        errors.push(`Clock Out (${record.clock_out}) must be later than Clock In (${record.clock_in})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const updateExcelRecord = (idx: number, field: string, value: any) => {
    setExcelPreviewRecords(prev => {
      const updated = prev.map((item, i) => {
        if (i !== idx) return item;
        
        const newRecord = { ...item, [field]: value };
        
        if (field === 'status' && value === 'ABSENT') {
          newRecord.clock_in = '00:00';
          newRecord.clock_out = '00:00';
        }
        
        const valResult = validateRecord(newRecord, employees);
        newRecord.isValid = valResult.isValid;
        newRecord.errors = valResult.errors;
        
        return newRecord;
      });
      return updated;
    });
  };

  const removeExcelRecord = (idx: number) => {
    setExcelPreviewRecords(prev => prev.filter((_, i) => i !== idx));
  };

  const downloadUploadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Upload Template');

      worksheet.columns = [
        { header: 'Employee Code', key: 'code', width: 15 },
        { header: 'Employee Name', key: 'name', width: 25 },
        { header: 'Date (YYYY-MM-DD)', key: 'date', width: 20 },
        { header: 'Shift (DAY/NIGHT/GENERAL)', key: 'shift', width: 25 },
        { header: 'Clock In (HH:MM)', key: 'clock_in', width: 20 },
        { header: 'Clock Out (HH:MM)', key: 'clock_out', width: 20 },
        { header: 'Status (PRESENT/ABSENT/LATE/HALF_DAY)', key: 'status', width: 35 },
        { header: 'Remarks (Optional)', key: 'remarks', width: 30 }
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: activeEntity === 'keil' ? 'FFB45309' : 'FF1E40AF' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      const todayStr = new Date().toISOString().split('T')[0];
      employees.forEach(emp => {
        const row = worksheet.addRow({
          code: emp.employee_code || '',
          name: emp.name || '',
          date: todayStr,
          shift: activeEntity === 'keil' ? 'GENERAL' : 'DAY',
          clock_in: '09:00',
          clock_out: '18:00',
          status: 'PRESENT',
          remarks: ''
        });

        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${activeEntity}_attendance_template.xlsx`);
      success('Attendance upload template downloaded.');
    } catch (err) {
      console.error('Template download error:', err);
      error('Failed to generate upload template.');
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          await workbook.xlsx.load(buffer);
          const worksheet = workbook.worksheets[0];
          
          if (!worksheet) {
            error('The uploaded Excel file has no worksheets.');
            setLoading(false);
            return;
          }

          const parsedRecords: any[] = [];
          
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header row

            const getCellValue = (colNum: number): string => {
              const cell = row.getCell(colNum);
              if (!cell.value && cell.value !== 0) return '';
              
              if (cell.value && typeof cell.value === 'object') {
                if (cell.value instanceof Date) {
                  return cell.value.toISOString().split('T')[0];
                }
                const cellObj = cell.value as any;
                if (cellObj.result !== undefined) {
                  return String(cellObj.result).trim();
                }
                if (cellObj.text !== undefined) {
                  return String(cellObj.text).trim();
                }
                return JSON.stringify(cellObj).trim();
              }
              return String(cell.value).trim();
            };

            const rawCode = getCellValue(1);
            const rawName = getCellValue(2);
            const rawDate = getCellValue(3);
            const rawShift = getCellValue(4);
            const rawClockIn = getCellValue(5);
            const rawClockOut = getCellValue(6);
            const rawStatus = getCellValue(7);
            const rawRemarks = getCellValue(8);

            if (!rawCode && !rawName && !rawDate && !rawStatus) return;

            const recordErrors: string[] = [];
            
            const matchedEmp = employees.find(
              emp => (emp.employee_code || '').trim().toLowerCase() === rawCode.trim().toLowerCase()
            );

            if (!rawCode) {
              recordErrors.push('Employee Code is missing');
            } else if (!matchedEmp) {
              recordErrors.push(`Employee Code "${rawCode}" not found`);
            }

            let formattedDate = '';
            if (!rawDate) {
              recordErrors.push('Date is missing');
            } else {
              const parsedNum = Number(rawDate);
              if (!isNaN(parsedNum) && parsedNum > 20000 && parsedNum < 100000) {
                const dateObj = new Date((parsedNum - 25569) * 86400 * 1000);
                formattedDate = dateObj.toISOString().split('T')[0];
              } else {
                try {
                  const dateObj = new Date(rawDate);
                  if (isNaN(dateObj.getTime())) {
                    const parts = rawDate.split(/[-/]/);
                    if (parts.length === 3) {
                      let d = parts[0], m = parts[1], y = parts[2];
                      if (d.length === 4) {
                        formattedDate = `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`;
                      } else {
                        formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                      }
                    } else {
                      recordErrors.push(`Invalid Date format: "${rawDate}"`);
                    }
                  } else {
                    formattedDate = dateObj.toISOString().split('T')[0];
                  }
                } catch (e) {
                  recordErrors.push(`Invalid Date format: "${rawDate}"`);
                }
              }
            }

            if (formattedDate) {
              const year = new Date(formattedDate).getFullYear();
              if (year < 2020 || year > 2099) {
                recordErrors.push(`Date year ${year} is invalid (must be between 2020 and 2099)`);
              }
            }

            const validShifts = ['DAY', 'NIGHT', 'GENERAL'];
            const normalizedShift = rawShift.toUpperCase().trim();
            const finalShift = validShifts.includes(normalizedShift) ? normalizedShift : 'DAY';

            const validStatus = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY'];
            const normalizedStatus = rawStatus.toUpperCase().trim();
            let finalStatus = 'PRESENT';
            if (!rawStatus) {
              recordErrors.push('Status is missing');
            } else if (!validStatus.includes(normalizedStatus)) {
              recordErrors.push(`Invalid Status: "${rawStatus}" (must be PRESENT, ABSENT, LATE, or HALF_DAY)`);
            } else {
              finalStatus = normalizedStatus;
            }

            const parseTime = (timeStr: string): string => {
              if (!timeStr) return '';
              const clean = timeStr.trim();
              if (/^\d{1,2}:\d{2}$/.test(clean)) {
                const parts = clean.split(':');
                return `${parts[0].padStart(2, '0')}:${parts[1]}`;
              }
              if (/^\d{1,2}:\d{2}:\d{2}$/.test(clean)) {
                const parts = clean.split(':');
                return `${parts[0].padStart(2, '0')}:${parts[1]}`;
              }
              const timeNum = Number(timeStr);
              if (!isNaN(timeNum) && timeNum >= 0 && timeNum < 1) {
                const totalMinutes = Math.round(timeNum * 24 * 60);
                const hrs = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
              }
              return '';
            };

            const clockIn = parseTime(rawClockIn);
            const clockOut = parseTime(rawClockOut);

            if (finalStatus !== 'ABSENT') {
              if (!rawClockIn) {
                recordErrors.push('Clock In time is missing');
              } else if (!clockIn) {
                recordErrors.push(`Invalid Clock In format: "${rawClockIn}" (use HH:MM)`);
              }

              if (!rawClockOut) {
                recordErrors.push('Clock Out time is missing');
              } else if (!clockOut) {
                recordErrors.push(`Invalid Clock Out format: "${rawClockOut}" (use HH:MM)`);
              }

              if (clockIn && clockOut && clockOut <= clockIn) {
                recordErrors.push(`Clock Out (${clockOut}) must be later than Clock In (${clockIn})`);
              }
            }

            parsedRecords.push({
              employee_code: rawCode,
              employee_name: matchedEmp ? matchedEmp.name : (rawName || 'Unknown'),
              employee_id: matchedEmp ? matchedEmp.id : null,
              date: formattedDate || rawDate,
              shift: finalShift,
              clock_in: finalStatus === 'ABSENT' ? '00:00' : (clockIn || rawClockIn),
              clock_out: finalStatus === 'ABSENT' ? '00:00' : (clockOut || rawClockOut),
              status: finalStatus,
              remarks: rawRemarks,
              company_id: currentCompanyId,
              isValid: recordErrors.length === 0,
              errors: recordErrors
            });
          });

          if (parsedRecords.length === 0) {
            error('No valid rows found in the uploaded file.');
            setLoading(false);
            return;
          }

          setExcelPreviewRecords(parsedRecords);
          setShowExcelPreview(true);
          setShowBulkForm(false);
          setShowForm(false);
        } catch (err: any) {
          console.error(err);
          error(`Failed to parse Excel content: ${err.message}`);
        } finally {
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error(err);
      error(`Error reading file: ${err.message}`);
      setLoading(false);
    }
  };

  const saveExcelBulkAttendance = async () => {
    const validRecords = excelPreviewRecords.filter(r => r.isValid);
    if (validRecords.length === 0) {
      error('No valid records to import.');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const cleanList = validRecords.map(({ employee_name, employee_code, isValid, errors, ...rest }) => ({
        ...rest
      }));

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
        const msg = data.message ? `Success. ${data.message}` : `Successfully imported ${validRecords.length} records!`;
        success(msg);
        setShowExcelPreview(false);
        setExcelPreviewRecords([]);
        fetchAttendance(currentCompanyId);
      } else {
        error(data.error || data.message || 'Import failed');
      }
    } catch (err: any) {
      error(err.message || 'Network error during import.');
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
          {/* <Button 
            onClick={downloadAttendance}
            variant="outline"
            className="flex-1 md:flex-none h-11 border-primary/20 text-primary hover:bg-primary/5 rounded-full px-6 font-bold active:scale-95 transition-all text-sm"
          >
            <Download className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Download Logs</span><span className="sm:hidden">Export</span>
          </Button> */}
          {canCreate && (
            <div className="flex gap-2 flex-1 sm:flex-none">
              <Button 
                onClick={downloadUploadTemplate}
                variant="outline"
                className="border-amber-600/30 text-amber-700 hover:bg-amber-50 rounded-full px-5 h-10 font-bold uppercase tracking-wider text-[11px] flex-1"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2 text-amber-600" /> Template
              </Button>
              <label className="cursor-pointer flex-1">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleExcelUpload} 
                  className="hidden" 
                />
                <Button 
                  asChild
                  variant="outline"
                  className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 rounded-full px-5 h-10 font-bold uppercase tracking-wider text-[11px] w-full"
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2 text-emerald-600" /> Upload Excel
                  </span>
                </Button>
              </label>
            </div>
          )}
          {canCreate && (
            <Button 
              onClick={() => { prepareBulkData(); setShowExcelPreview(false); }}
              variant="outline"
              className="flex-1 md:flex-none h-11 border-primary/20 text-primary hover:bg-primary/5 rounded-full px-6 font-bold active:scale-95 transition-all text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Bulk Entry</span><span className="sm:hidden">Bulk</span>
            </Button>
          )}
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); setShowBulkForm(false); setShowExcelPreview(false); }}
              className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 h-10 font-bold uppercase tracking-wider text-xs flex-1 sm:flex-none"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Cancel Log' : 'New Log Entry'}
            </Button>
          )}
        </div>
      </div>



      {showForm && (
        <Card className="border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-4 md:p-6 rounded-t-xl">
            <CardTitle className="text-lg md:text-xl font-bold text-primary">{editingId ? 'Edit Attendance' : 'Mark Daily Attendance'}</CardTitle>
            <CardDescription className="text-xs md:text-sm">Input shift details and timing for employees.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                    <UserCheck className="w-3 h-3 mr-2 text-primary" /> Staff Member
                  </label>
                  <Select value={formData.employee_id} onValueChange={(val) => setFormData({...formData, employee_id: val})}>
                    <SelectTrigger className="w-full h-11 border-slate-200 bg-white font-bold text-sm shadow-sm rounded-xl focus:ring-primary/20">
                      <SelectValue placeholder="Choose employee..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                    <Calendar className="w-3 h-3 mr-2 text-primary" /> Mark Date
                  </label>
                  <Input 
                    type="date"
                    value={formData.date}
                    max={new Date().toLocaleDateString('en-CA')}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="h-11 font-bold border-slate-200 rounded-xl shadow-sm focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                    <ChevronRight className="w-3 h-3 mr-2 text-primary" /> Assigned Shift
                  </label>
                  <Select value={formData.shift} onValueChange={(val) => setFormData({...formData, shift: val})}>
                    <SelectTrigger className="w-full h-11 border-slate-200 bg-white font-bold text-sm shadow-sm rounded-xl focus:ring-primary/20">
                      <SelectValue placeholder="Select Shift" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                      <SelectItem value="GENERAL">General Shift</SelectItem>
                      <SelectItem value="DAY">Day Shift</SelectItem>
                      <SelectItem value="NIGHT">Night Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-2 text-primary" /> Status
                  </label>
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
                    <SelectTrigger className="w-full h-11 border-slate-200 bg-white font-black text-sm shadow-sm rounded-xl focus:ring-primary/20">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                      <SelectItem value="PRESENT">Present</SelectItem>
                      <SelectItem value="ABSENT">Absent</SelectItem>
                      <SelectItem value="LATE">Late</SelectItem>
                      <SelectItem value="HALF_DAY">Half Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                    <Clock className="w-3 h-3 mr-2 text-primary" /> Clock In Time
                  </label>
                  <Input 
                    type="time"
                    value={formData.clock_in}
                    onChange={(e) => setFormData({...formData, clock_in: e.target.value})}
                    className="h-11 font-bold border-slate-200 rounded-xl shadow-sm focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                    <Clock className="w-3 h-3 mr-2 text-primary" /> Clock Out Time
                  </label>
                  <Input 
                    type="time"
                    value={formData.clock_out}
                    onChange={(e) => setFormData({...formData, clock_out: e.target.value})}
                    className="h-11 font-bold border-slate-200 rounded-xl shadow-sm focus:ring-primary/20"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                    Edit Remarks (Optional)
                  </label>
                  <Input 
                    placeholder="Notes about attendance..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    className="h-11 border-slate-200 rounded-xl shadow-sm focus:ring-primary/20 italic"
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
            
            <div className="flex items-center justify-center gap-2">
               <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-secondary/20 shadow-sm">
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Mark Date:</span>
                  <Input 
                    type="date" 
                    value={bulkDate} 
                    max={new Date().toLocaleDateString('en-CA')}
                    onChange={(e) => handleBulkDateChange(e.target.value)}
                    className="text-xs font-bold outline-none bg-transparent h-7 border-none shadow-none p-0 w-fit"
                  />
               </div>
               {/* <Button size="sm" variant="ghost" onClick={() => setShowBulkForm(false)} className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive shrink-0">
                 <X className="w-4 h-4" />
               </Button> */}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-4 font-black">Staff Member</th>
                    <th className="px-4 py-4 text-center border-x border-slate-100/50">Absence / Presence</th>
                    <th className="px-4 py-4 text-center border-r border-slate-100/50">Duty Shift</th>
                    <th className="px-4 py-4">In / Out Timing</th>
                    <th className="px-4 py-4 border-l border-slate-100/50">Remarks/Notes</th>
                    <th className="px-4 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic font-medium">
                  {bulkData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-4">
                         <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">{row.employee_name}</div>
                         <div className="text-[10px] text-slate-500 font-bold">{row.employee_code}</div>
                      </td>
                      <td className="px-4 py-4 text-center border-x border-slate-100/50">
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
                           <SelectTrigger className="h-9 w-32 border-slate-200 bg-white px-3 text-xs mx-auto rounded-xl shadow-sm focus:ring-primary/20 transition-all">
                             <SelectValue placeholder="Status" />
                           </SelectTrigger>
                           <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                             <SelectItem value="PRESENT">Present</SelectItem>
                             <SelectItem value="ABSENT">Absent</SelectItem>
                             <SelectItem value="LATE">Late</SelectItem>
                             <SelectItem value="HALF_DAY">Half Day</SelectItem>
                           </SelectContent>
                         </Select>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-slate-100/50">
                         <Select 
                           value={row.shift}
                           onValueChange={(val) => {
                             const nd = [...bulkData];
                             nd[idx].shift = val;
                             setBulkData(nd);
                           }}
                         >
                           <SelectTrigger className="h-9 w-24 border-slate-200 bg-white px-3 text-xs mx-auto rounded-xl shadow-sm focus:ring-primary/20 transition-all">
                             <SelectValue placeholder="Shift" />
                           </SelectTrigger>
                           <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                             <SelectItem value="GENERAL">General</SelectItem>
                             <SelectItem value="DAY">Day</SelectItem>
                             <SelectItem value="NIGHT">Night</SelectItem>
                           </SelectContent>
                         </Select>
                      </td>
                      <td className="px-4 py-4 border-r border-slate-100/50">
                        <div className="flex items-center gap-2">
                          <div className="relative group/time">
                            <Input 
                              type="time" 
                              value={row.clock_in} 
                              onChange={(e)=> { let d=[...bulkData]; d[idx].clock_in=e.target.value; setBulkData(d); }} 
                              className="h-9 w-28 text-xs border-slate-200 rounded-xl shadow-sm focus:ring-primary/20 pr-7 font-bold italic" 
                            />
                            <Clock className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-hover/time:text-primary transition-colors" />
                          </div>
                          <span className="text-slate-300 font-bold">-</span>
                          <div className="relative group/time">
                            <Input 
                              type="time" 
                              value={row.clock_out} 
                              onChange={(e)=> { let d=[...bulkData]; d[idx].clock_out=e.target.value; setBulkData(d); }} 
                              className="h-9 w-28 text-xs border-slate-200 rounded-xl shadow-sm focus:ring-primary/20 pr-7 font-bold italic" 
                            />
                            <Clock className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-hover/time:text-primary transition-colors" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 border-r border-slate-100/50">
                         <Input 
                           value={row.remarks} 
                           onChange={(e)=> { let d=[...bulkData]; d[idx].remarks=e.target.value; setBulkData(d); }} 
                           placeholder="Notes about staff attendance..." 
                           className="h-9 text-xs min-w-[200px] border-slate-200 rounded-xl shadow-sm focus:ring-primary/20 font-medium italic" 
                         />
                      </td>
                      <td className="px-4 py-4 text-right">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => removeEmployeeFromBulk(row.employee_id)}
                           className="h-9 w-9 rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95"
                         >
                           <X className="w-4 h-4" />
                         </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 md:p-6 border-t bg-slate-50/50 rounded-b-xl flex flex-col sm:flex-row justify-between items-center gap-4">
               <div className="text-xs text-slate-500 font-bold uppercase tracking-wider bg-slate-100/50 px-4 py-2 rounded-full border border-slate-200">
                 Summary: <span className="text-secondary">{bulkData.length}</span> staff records to process
               </div>
               <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
                 <Button 
                   variant="ghost" 
                   onClick={() => setShowBulkForm(false)} 
                   className="h-11 px-8 rounded-full font-bold hover:bg-destructive/5 hover:text-destructive transition-all active:scale-95"
                 >
                   Cancel / Discard
                 </Button>
                 <Button 
                   onClick={saveBulkAttendance} 
                   loading={submitting}
                   className="bg-secondary hover:bg-secondary/90 text-white rounded-full h-11 px-10 shadow-lg shadow-secondary/20 flex items-center justify-center font-bold active:scale-95 tracking-wide"
                 >
                   <Save className="w-4 h-4 mr-2" /> Mark Attendance
                 </Button>
               </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showExcelPreview && (
        <Card className="border-emerald-200 shadow-2xl animate-in slide-in-from-top duration-300">
          <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 rounded-t-xl py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100/80 text-emerald-800 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-emerald-900">Excel Upload Preview</CardTitle>
                <CardDescription className="text-xs font-semibold text-emerald-700/80">
                  Review matched employees and verify record validations before importing.
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-emerald-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Rows:</span>
              <span className="text-sm font-bold text-slate-900">{excelPreviewRecords.length}</span>
              <span className="text-slate-200 font-bold">|</span>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Valid:</span>
              <span className="text-sm font-bold text-emerald-700">
                {excelPreviewRecords.filter(r => r.isValid).length}
              </span>
              <span className="text-slate-200 font-bold">|</span>
              <span className="text-[10px] font-black text-destructive uppercase tracking-widest">Errors:</span>
              <span className="text-sm font-bold text-destructive">
                {excelPreviewRecords.filter(r => !r.isValid).length}
              </span>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
              <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-widest border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-black">Staff Member</th>
                    <th className="px-4 py-4 text-center">Date</th>
                    <th className="px-4 py-4 text-center">Shift</th>
                    <th className="px-4 py-4 text-center">In / Out</th>
                    <th className="px-4 py-4 text-center">Status</th>
                    <th className="px-4 py-4 font-sans">Remarks</th>
                    <th className="px-4 py-4 text-center">Validation</th>
                    <th className="px-4 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic font-medium">
                  {excelPreviewRecords.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-slate-50/50 transition-colors group ${
                        !row.isValid ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                          {row.employee_name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold">{row.employee_code || 'MISSING'}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Input 
                          type="date"
                          value={row.date}
                          onChange={(e) => updateExcelRecord(idx, 'date', e.target.value)}
                          className="h-8 text-xs font-bold w-32 border-slate-200 focus:ring-emerald-500/20 mx-auto"
                        />
                      </td>
                      <td className="px-4 py-4 text-center border-x border-slate-100/50">
                        <Select 
                          value={row.shift}
                          onValueChange={(val) => updateExcelRecord(idx, 'shift', val)}
                        >
                          <SelectTrigger className="h-8 w-24 border-slate-200 bg-white px-2 text-xs mx-auto rounded-lg shadow-sm focus:ring-emerald-500/20">
                            <SelectValue placeholder="Shift" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 rounded-lg shadow-lg">
                            <SelectItem value="GENERAL">General</SelectItem>
                            <SelectItem value="DAY">Day</SelectItem>
                            <SelectItem value="NIGHT">Night</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-slate-100/50">
                        <div className="flex items-center gap-1.5 justify-center">
                          <Input 
                            type="time" 
                            value={row.clock_in} 
                            onChange={(e) => updateExcelRecord(idx, 'clock_in', e.target.value)} 
                            disabled={row.status === 'ABSENT'}
                            className="h-8 w-24 text-xs border-slate-200 rounded-lg shadow-sm focus:ring-emerald-500/20 font-bold" 
                          />
                          <span className="text-slate-350 font-bold">-</span>
                          <Input 
                            type="time" 
                            value={row.clock_out} 
                            onChange={(e) => updateExcelRecord(idx, 'clock_out', e.target.value)} 
                            disabled={row.status === 'ABSENT'}
                            className="h-8 w-24 text-xs border-slate-200 rounded-lg shadow-sm focus:ring-emerald-500/20 font-bold" 
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-slate-100/50">
                        <Select 
                          value={row.status}
                          onValueChange={(val) => updateExcelRecord(idx, 'status', val)}
                        >
                          <SelectTrigger className="h-8 w-28 border-slate-200 bg-white px-2 text-xs mx-auto rounded-lg shadow-sm focus:ring-emerald-500/20">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 rounded-lg shadow-lg">
                            <SelectItem value="PRESENT">Present</SelectItem>
                            <SelectItem value="ABSENT">Absent</SelectItem>
                            <SelectItem value="LATE">Late</SelectItem>
                            <SelectItem value="HALF_DAY">Half Day</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-4 border-r border-slate-100/50">
                        <Input 
                          value={row.remarks || ''} 
                          onChange={(e) => updateExcelRecord(idx, 'remarks', e.target.value)} 
                          placeholder="Remarks..." 
                          className="h-8 text-xs min-w-[150px] border-slate-200 rounded-lg shadow-sm focus:ring-emerald-500/20 font-medium italic" 
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Ready
                          </span>
                        ) : (
                          <div className="text-left space-y-0.5 max-w-[180px]">
                            {row.errors.map((err: string, i: number) => (
                              <div key={i} className="text-[10px] font-bold text-destructive leading-tight flex items-start gap-1">
                                <span>•</span> <span className="break-words">{err}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeExcelRecord(idx)}
                          className="h-8 w-8 rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 md:p-6 border-t bg-slate-50/50 rounded-b-xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider bg-slate-100/50 px-4 py-2 rounded-full border border-slate-200 font-sans">
                Ready: <span className="text-emerald-600 font-bold">{excelPreviewRecords.filter(r => r.isValid).length}</span> of {excelPreviewRecords.length} records
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto font-sans">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowExcelPreview(false);
                    setExcelPreviewRecords([]);
                  }} 
                  className="h-11 px-8 rounded-full font-bold hover:bg-destructive/5 hover:text-destructive transition-all active:scale-95 text-xs"
                >
                  Discard Import
                </Button>
                <Button 
                  onClick={saveExcelBulkAttendance} 
                  loading={submitting}
                  disabled={excelPreviewRecords.filter(r => r.isValid).length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-11 px-10 shadow-lg shadow-emerald-200 flex items-center justify-center font-bold active:scale-95 tracking-wide text-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" /> Import Valid Records
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && !showBulkForm && !showExcelPreview && (
        <TableView
          title="Attendance Logs"
          description={`Daily shift-wise logging for ${activeTenant} staff.`}
          headers={['Employee', 'Date', 'Shift', 'In / Out', 'Status', 'Remarks', 'Actions']}
          data={attendanceRecords.filter(rec => rec && rec.date && rec.date.startsWith(dateFilter))}
          loading={loading}
          searchFields={['users.name', 'users.employee_code', 'remarks']}
          searchPlaceholder="Search staff or notes..."
          actions={
            <div className="hidden md:flex items-center gap-2">
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
