'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TableView } from '@/components/ui/table-view';
import { 
    Plus, 
    Calendar, 
    User, 
    Trash2, 
    DollarSign,
    Briefcase,
    ChevronDown,
    X,
    Save,
    Search,
    Download,
    Eye,
    Edit,
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';

export default function PayrollPage() {
    const pathname = usePathname();
    const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';
    const activeTenant = activeEntity.toUpperCase();

    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    
    // Bulk Import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [importPreview, setImportPreview] = useState<any[]>([]);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);

    // Filters
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    const [formData, setFormData] = useState({
        employee_id: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        basic_salary: 0,
        allowances: 0,
        deductions: 0,
        incentives: 0,
        net_salary: 0,
        payment_status: 'PENDING',
        payment_date: '',
        payment_mode: 'BANK',
        remarks: '',
        company_id: ''
    });

    const { success, error, info } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
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
                    setFormData(prev => ({ ...prev, company_id: activeCo.id }));
                }
            }
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    };

    useEffect(() => {
        if (currentCompanyId) {
            fetchPayrolls();
            fetchEmployees();
        }
    }, [filterMonth, filterYear, currentCompanyId]);

    const fetchPayrolls = async () => {
        if (!currentCompanyId) return;
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/payroll?company_id=${currentCompanyId}&month=${filterMonth}&year=${filterYear}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setPayrolls(data.data);
        } catch (err) {
            error('Failed to fetch payroll records');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        if (!currentCompanyId) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/employees?company_id=${currentCompanyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setEmployees(data.data);
        } catch (err) {
            console.error('Failed to fetch employees');
        }
    };

    const calculateNetSalary = (basic: number, allow: number, deduct: number, incent: number) => {
        return (Number(basic) + Number(allow) + Number(incent)) - Number(deduct);
    };

    const handleSelectChange = (name: string, value: string) => {
        let newFormData = { ...formData, [name]: value };

        // Auto-fetch basic salary if employee is selected
        if (name === 'employee_id' && value) {
            const selectedEmp = employees.find(emp => emp.id === value);
            if (selectedEmp) {
                newFormData.basic_salary = Number(selectedEmp.basic_salary || 0);
            }
        }

        if (['basic_salary', 'allowances', 'deductions', 'incentives'].includes(name) || name === 'employee_id') {
            newFormData.net_salary = calculateNetSalary(
                Number(newFormData.basic_salary),
                Number(newFormData.allowances),
                Number(newFormData.deductions),
                Number(newFormData.incentives)
            );
        }

        setFormData(newFormData);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };

        if (['basic_salary', 'allowances', 'deductions', 'incentives'].includes(name)) {
            newFormData.net_salary = calculateNetSalary(
                Number(newFormData.basic_salary),
                Number(newFormData.allowances),
                Number(newFormData.deductions),
                Number(newFormData.incentives)
            );
        }

        setFormData(newFormData);
    };

    const resetForm = () => {
        setFormData({
            employee_id: '',
            month: filterMonth,
            year: filterYear,
            basic_salary: 0,
            allowances: 0,
            deductions: 0,
            incentives: 0,
            net_salary: 0,
            payment_status: 'PENDING',
            payment_date: '',
            payment_mode: 'BANK',
            remarks: '',
            company_id: currentCompanyId
        });
        setEditingId(null);
    };

    const handleEdit = (rec: any) => {
        setEditingId(rec.id);
        setFormData({
            employee_id: rec.employee_id,
            month: rec.month,
            year: rec.year,
            basic_salary: Number(rec.basic_salary),
            allowances: Number(rec.allowances),
            deductions: Number(rec.deductions),
            incentives: Number(rec.incentives),
            net_salary: Number(rec.net_salary),
            payment_status: rec.payment_status,
            payment_date: rec.payment_date || '',
            payment_mode: rec.payment_mode || 'BANK',
            remarks: rec.remarks || '',
            company_id: rec.company_id
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate payment_date range
        if (formData.payment_date) {
            const date = new Date(formData.payment_date);
            const year = date.getFullYear();
            if (year < 2020 || year > 2099) {
                error("Please enter a valid Payment Date (Year must be between 2020 and 2099)");
                return;
            }
        }

        setSubmitting(true);
        try {
            const url = editingId 
                ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/payroll/${editingId}`
                : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/payroll`;
            
            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    ...formData, 
                    basic_salary: Number(formData.basic_salary),
                    allowances: Number(formData.allowances),
                    deductions: Number(formData.deductions),
                    incentives: Number(formData.incentives),
                    net_salary: Number(formData.net_salary),
                    company_id: currentCompanyId 
                })
            });

            const data = await res.json();
            if (data.success) {
                success(editingId ? 'Payroll updated' : 'Payroll recorded');
                setShowForm(false);
                resetForm();
                fetchPayrolls();
            } else {
                error(data.message || 'Operation failed');
            }
        } catch (err) {
            error('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            message: 'Are you sure you want to delete this payroll record?',
            type: 'danger'
        });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/payroll/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                success('Record deleted');
                fetchPayrolls();
            }
        } catch (err) {
            error('Delete failed');
        }
    };

    const handleExport = async () => {
        if (payrolls.length === 0) {
            info('No payroll records found for this period to export.');
            return;
        }

        const ExcelJS = (await import('exceljs')).default;
        const saveAs = (await import('file-saver')).saveAs;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Payroll Report');

        const headerRow = worksheet.addRow([
            'EMP CODE', 'EMPLOYEE NAME', 'CATEGORY', 'MONTH', 'YEAR', 
            'BASIC SALARY (₹)', 'ALLOWANCES (₹)', 'DEDUCTIONS (₹)', 
            'INCENTIVES (₹)', 'NET SALARY (₹)', 'PAYMENT STATUS', 'PAYMENT MODE', 'PAYMENT DATE', 'REMARKS'
        ]);

        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        payrolls.forEach(p => {
            worksheet.addRow([
                p.users?.employee_code || 'N/A',
                p.users?.name || 'N/A',
                p.users?.employee_categories?.category_name || 'General Staff',
                months[p.month - 1] || p.month,
                p.year,
                Number(p.basic_salary) || 0,
                Number(p.allowances) || 0,
                Number(p.deductions) || 0,
                Number(p.incentives) || 0,
                Number(p.net_salary) || 0,
                p.payment_status || 'PENDING',
                p.payment_mode || 'BANK',
                p.payment_date || '-',
                p.remarks || ''
            ]);
        });

        worksheet.columns.forEach(col => { col.width = 18; });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `maxtron_payroll_report_${months[filterMonth - 1]}_${filterYear}.xlsx`);
        success('Payroll report exported successfully.');
    };

    const downloadSampleTemplate = async () => {
        const ExcelJS = (await import('exceljs')).default;
        const saveAs = (await import('file-saver')).saveAs;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Payroll_Import_Template');

        const headerRow = worksheet.addRow([
            'Employee Code', 'Month', 'Year', 'Basic Salary', 
            'Allowances', 'Deductions', 'Incentives', 'Payment Status', 'Payment Mode', 'Payment Date', 'Remarks'
        ]);

        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        if (employees.length > 0) {
            employees.slice(0, 3).forEach((emp, idx) => {
                worksheet.addRow([
                    emp.employee_code || `EMP-${1001 + idx}`,
                    filterMonth,
                    filterYear,
                    Number(emp.basic_salary) || 25000,
                    1500,
                    500,
                    1000,
                    'PENDING',
                    'BANK',
                    new Date().toISOString().split('T')[0],
                    'Monthly regular payout'
                ]);
            });
        } else {
            worksheet.addRow([
                'EMP-1001',
                filterMonth,
                filterYear,
                25000,
                2000,
                500,
                1000,
                'PENDING',
                'BANK',
                new Date().toISOString().split('T')[0],
                'Sample payroll record'
            ]);
        }

        worksheet.columns.forEach(col => { col.width = 18; });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `maxtron_payroll_import_template_${filterMonth}_${filterYear}.xlsx`);
        success('Sample Excel import template downloaded successfully.');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const arrayBuffer = await file.arrayBuffer();
            await workbook.xlsx.load(arrayBuffer);
            const worksheet = workbook.worksheets[0];

            if (!worksheet) {
                error('Uploaded file contains no worksheets.');
                return;
            }

            const parsedRows: any[] = [];
            const validationErrors: string[] = [];

            const headerValues: string[] = [];
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headerValues[colNumber] = cell.value ? cell.value.toString().trim().toLowerCase() : '';
            });

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;

                const getCell = (namePart: string) => {
                    const colIndex = headerValues.findIndex(h => h && h.includes(namePart));
                    return colIndex > -1 ? row.getCell(colIndex).value : null;
                };

                const rawCode = getCell('code');
                const empCode = rawCode ? rawCode.toString().trim() : '';
                if (!empCode) return;

                const matchedEmp = employees.find(
                    emp => emp.employee_code?.trim().toUpperCase() === empCode.toUpperCase()
                );

                if (!matchedEmp) {
                    validationErrors.push(`Row ${rowNumber}: Employee with code "${empCode}" not found.`);
                    return;
                }

                const basicSalary = Number(getCell('basic') || matchedEmp.basic_salary || 0);
                const allowances = Number(getCell('allow') || 0);
                const deductions = Number(getCell('deduct') || 0);
                const incentives = Number(getCell('incent') || 0);
                const netSalary = (basicSalary + allowances + incentives) - deductions;

                const monthVal = Number(getCell('month') || filterMonth);
                const yearVal = Number(getCell('year') || filterYear);
                const rawStatus = getCell('status')?.toString().toUpperCase().trim();
                const paymentStatus = rawStatus === 'PAID' ? 'PAID' : 'PENDING';
                const paymentMode = getCell('mode')?.toString().trim() || 'BANK';
                const rawDate = getCell('date');
                const paymentDate = rawDate instanceof Date
                    ? rawDate.toISOString().split('T')[0]
                    : (rawDate?.toString().trim() || new Date().toISOString().split('T')[0]);
                const remarks = getCell('remark')?.toString().trim() || 'Bulk imported via Excel';

                parsedRows.push({
                    employee_id: matchedEmp.id,
                    employee_name: matchedEmp.name,
                    employee_code: matchedEmp.employee_code,
                    company_id: currentCompanyId,
                    month: monthVal,
                    year: yearVal,
                    basic_salary: basicSalary,
                    allowances,
                    deductions,
                    incentives,
                    net_salary: netSalary,
                    payment_status: paymentStatus,
                    payment_mode: paymentMode,
                    payment_date: paymentDate,
                    remarks
                });
            });

            if (parsedRows.length === 0 && validationErrors.length === 0) {
                error('No data found in uploaded Excel file.');
                return;
            }

            setImportPreview(parsedRows);
            setImportErrors(validationErrors);
            setShowImportModal(true);
        } catch (err: any) {
            error('Error reading Excel: ' + err.message);
        } finally {
            e.target.value = '';
        }
    };

    const confirmBulkImport = async () => {
        if (importPreview.length === 0) return;
        setImporting(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/payroll`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                // employee_name and employee_code are only for the preview table. The
                // payroll table has no such columns and rejects the whole batch with them.
                body: JSON.stringify(importPreview.map(({ employee_name, employee_code, ...row }) => row))
            });
            const data = await res.json();
            if (data.success) {
                success(`Successfully imported ${importPreview.length} payroll records!`);
                setShowImportModal(false);
                setImportPreview([]);
                setImportErrors([]);
                fetchPayrolls();
            } else {
                error([data.message || 'Import failed.', data.error].filter(Boolean).join(': '));
            }
        } catch (err: any) {
            error(err.message || 'Network error during import.');
        } finally {
            setImporting(false);
        }
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-8 h-8 md:w-10 md:h-10 p-1.5 bg-primary/10 rounded-lg text-primary shrink-0" />
                        <span className="truncate">Payroll Management</span>
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Manage employee month-wise salary distributions and net payouts.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <Button 
                        onClick={handleExport}
                        variant="outline"
                        className="h-10 md:h-11 border-primary/20 text-primary hover:bg-primary/5 rounded-full px-5 font-bold shadow-sm flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export Excel</span>
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            id="bulk-payroll-input-maxtron"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button 
                            onClick={() => document.getElementById('bulk-payroll-input-maxtron')?.click()}
                            variant="outline"
                            className="h-10 md:h-11 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 rounded-full px-5 font-bold shadow-sm flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4 text-emerald-600" />
                            <span>Bulk Import Excel</span>
                        </Button>
                    </div>
                    <Button 
                        onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); }}
                        className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg shadow-primary/20 h-10 md:h-11 transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none"
                    >
                        {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {showForm ? 'Cancel Entry' : 'Generate Entry'}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            {!showForm && (
                <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <Select value={String(filterMonth)} onValueChange={(val) => setFilterMonth(Number(val))}>
                            <SelectTrigger className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold bg-white">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                                {months.map((m, i) => (
                                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={String(filterYear)} onValueChange={(val) => setFilterYear(Number(val))}>
                            <SelectTrigger className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold bg-white">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                                {years.map(y => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="ml-auto text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Total Payout for {months[filterMonth-1]} {filterYear}: 
                        <span className="ml-2 text-primary text-sm font-black italic">
                            ₹{payrolls.reduce((sum, p) => sum + Number(p.net_salary), 0).toLocaleString()}
                        </span>
                    </div>
                </div>
            )}

            {showForm ? (
                <Card className="border-none shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-primary p-6 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <DollarSign className="w-6 h-6 p-1 bg-white/20 rounded-lg text-white" />
                                    {editingId ? 'Edit Salary Detail' : 'Create Salary Entry'}
                                </h2>
                                <p className="text-white/70 text-xs mt-1">Specify earnings, deductions, and payment status for the employee.</p>
                            </div>
                        </div>
                    </div>
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Primary Info</h3>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Employee</label>
                                        <Select
                                            name="employee_id"
                                            value={formData.employee_id}
                                            onValueChange={(val) => handleSelectChange('employee_id', val)}
                                        >
                                            <SelectTrigger className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none">
                                                <SelectValue placeholder="Select Employee..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200">
                                                {employees.map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.name} ({emp.employee_code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Period</label>
                                            <Select
                                                name="month"
                                                value={String(formData.month)}
                                                onValueChange={(val) => handleSelectChange('month', val)}
                                            >
                                                <SelectTrigger className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold">
                                                    <SelectValue placeholder="Month" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-slate-200">
                                                    {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 pt-6">
                                            <Select
                                                name="year"
                                                value={String(formData.year)}
                                                onValueChange={(val) => handleSelectChange('year', val)}
                                            >
                                                <SelectTrigger className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold">
                                                    <SelectValue placeholder="Year" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-slate-200">
                                                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Components */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Salary Components</h3>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Basic Salary (₹)</label>
                                            <Input 
                                                type="number" 
                                                name="basic_salary" 
                                                value={formData.basic_salary} 
                                                onChange={handleInputChange} 
                                                className="h-11 font-bold"
                                                min="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Allowances (HRA/DA)</label>
                                            <Input 
                                                type="number" 
                                                name="allowances" 
                                                value={formData.allowances} 
                                                onChange={handleInputChange} 
                                                className="h-11 font-bold"
                                                min="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 text-red-500">Deductions (PT/PF)</label>
                                            <Input 
                                                type="number" 
                                                name="deductions" 
                                                value={formData.deductions} 
                                                onChange={handleInputChange} 
                                                className="h-11 font-bold border-red-100"
                                                min="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 text-emerald-500">Incentives/Bonus</label>
                                            <Input 
                                                type="number" 
                                                name="incentives" 
                                                value={formData.incentives} 
                                                onChange={handleInputChange} 
                                                className="h-11 font-bold border-emerald-100"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Net Payout */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Final Settlement</h3>
                                    
                                    <div className="bg-slate-900 rounded-3xl p-6 text-white text-center shadow-xl shadow-slate-200 border-b-8 border-primary/30 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-8 -mt-8 blur-3xl group-hover:bg-white/10 transition-all duration-500"></div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 block">Net Monthly Payout</label>
                                        <div className="text-4xl font-black font-heading tracking-tighter">
                                            ₹{formData.net_salary.toLocaleString()}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/10 text-[10px] uppercase font-bold text-white/40">
                                            Final calculated amount for disbursement
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 items-end border-t border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Status</label>
                                    <Select
                                        name="payment_status"
                                        value={formData.payment_status}
                                        onValueChange={(val) => handleSelectChange('payment_status', val)}
                                    >
                                        <SelectTrigger className={`w-full h-11 px-4 rounded-xl border text-sm font-black outline-none transition-all ${formData.payment_status === 'PAID' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200">
                                            <SelectItem value="PENDING">PENDING</SelectItem>
                                            <SelectItem value="PAID">PAID</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Payment Mode</label>
                                    <Select
                                        name="payment_mode"
                                        value={formData.payment_mode}
                                        onValueChange={(val) => handleSelectChange('payment_mode', val)}
                                    >
                                        <SelectTrigger className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold">
                                            <SelectValue placeholder="Payment Mode" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200">
                                            <SelectItem value="BANK">Bank Transfer (NEFT/RTGS)</SelectItem>
                                            <SelectItem value="CASH">Cash Payment</SelectItem>
                                            <SelectItem value="UPI">UPI Payment</SelectItem>
                                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Payment Date</label>
                                    <Input 
                                        type="date" 
                                        name="payment_date" 
                                        value={formData.payment_date} 
                                        onChange={handleInputChange} 
                                        className="h-11"
                                        max="2099-12-31"
                                    />
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-3">
                                    <Button
                                        type="button"
                                        onClick={() => { setShowForm(false); resetForm(); }}
                                        variant="outline"
                                        className="w-full md:flex-1 h-12 md:h-14 rounded-full font-bold border-slate-200 hover:bg-slate-50 order-2 md:order-1"
                                    >
                                        DISCARD
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full md:flex-1 h-12 md:h-14 bg-primary hover:bg-primary/95 text-white rounded-full font-black shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 order-1 md:order-2"
                                    >
                                        {submitting ? 'SAVING...' : (editingId ? 'UPDATE RECORD' : 'POST ENTRY')}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <TableView
                    title={`Payroll Log: ${months[filterMonth-1]} ${filterYear}`}
                    headers={['Employee', 'Category', 'Basic', 'Deductions', 'Net Payout', 'Status', 'Actions']}
                    data={payrolls}
                    loading={loading}
                    searchFields={['users.name', 'users.employee_code']}
                    searchPlaceholder="Search employee name or code..."
                    renderRow={(row: any) => (
                        <tr key={row.id} className="hover:bg-primary/5 transition-all border-b border-slate-50 last:border-none group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {row.users?.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{row.users?.name}</div>
                                        <div className="text-[10px] font-black text-slate-400 font-mono tracking-tighter uppercase">{row.users?.employee_code}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs font-semibold text-slate-500">
                                    {row.users?.employee_categories?.category_name || 'General Staff'}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-600">₹{Number(row.basic_salary).toLocaleString()}</td>
                            <td className="px-6 py-4 font-bold text-red-500">₹{Number(row.deductions).toLocaleString()}</td>
                            <td className="px-6 py-4">
                                <span className="font-black text-primary text-lg tracking-tight">₹{Number(row.net_salary).toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${row.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {row.payment_status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-full">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    )}
                />
            )}

            {/* Bulk Import Preview Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden bg-white animate-in zoom-in-95">
                        <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">Payroll Bulk Import Preview</h2>
                                    <p className="text-xs text-muted-foreground">Verify parsed records before applying to database</p>
                                </div>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={downloadSampleTemplate} 
                                className="font-bold text-xs gap-2 border-primary/20 text-primary hover:bg-primary/5 rounded-full"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download Sample Template
                            </Button>
                        </div>

                        <CardContent className="p-6 overflow-y-auto space-y-4 flex-1">
                            {importErrors.length > 0 && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Validation Warnings ({importErrors.length})
                                    </div>
                                    <ul className="text-xs text-amber-700 list-disc pl-5 space-y-1">
                                        {importErrors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                                    Ready to Import: {importPreview.length} Record(s)
                                </h3>
                                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[300px]">
                                    <table className="w-full text-left text-xs whitespace-nowrap">
                                        <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 sticky top-0">
                                            <tr>
                                                <th className="p-3">Emp Code</th>
                                                <th className="p-3">Employee Name</th>
                                                <th className="p-3">Basic (₹)</th>
                                                <th className="p-3">Allowances (₹)</th>
                                                <th className="p-3">Deductions (₹)</th>
                                                <th className="p-3">Incentives (₹)</th>
                                                <th className="p-3">Net (₹)</th>
                                                <th className="p-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {importPreview.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="p-3 font-mono font-bold text-primary">{row.employee_code}</td>
                                                    <td className="p-3 font-bold text-slate-800">{row.employee_name}</td>
                                                    <td className="p-3 font-bold text-slate-600">₹{row.basic_salary.toLocaleString()}</td>
                                                    <td className="p-3">₹{row.allowances.toLocaleString()}</td>
                                                    <td className="p-3 text-red-500">₹{row.deductions.toLocaleString()}</td>
                                                    <td className="p-3 text-emerald-600">₹{row.incentives.toLocaleString()}</td>
                                                    <td className="p-3 font-black text-primary">₹{row.net_salary.toLocaleString()}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                            row.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {row.payment_status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <Button 
                                variant="ghost" 
                                onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }}
                                className="font-bold text-slate-500 hover:text-slate-800 rounded-full px-6"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={confirmBulkImport}
                                disabled={importing || importPreview.length === 0}
                                className="bg-primary hover:bg-primary/95 text-white font-bold rounded-full px-8 shadow-md gap-2"
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Confirm & Import ({importPreview.length} Records)
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
