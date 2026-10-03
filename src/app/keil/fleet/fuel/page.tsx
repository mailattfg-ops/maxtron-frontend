'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Edit,
    Trash2, 
    Fuel,
    Calendar,
    Truck,
    Hash,
    IndianRupee,
    TrendingUp,
    AlertCircle,
    X,
    Save,
    Users,
    Lock,
    Loader2,
    Download,
    Filter,
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableView } from "@/components/ui/table-view";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePermission } from '@/hooks/usePermission';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const FUEL_API = `${API_BASE}/api/keil/fleet/fuel-fillings`;
const VEHICLE_API = `${API_BASE}/api/keil/fleet/vehicles`;

export default function FuelFillingPage() {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const { hasPermission, loading: permissionLoading } = usePermission();

    const canView = hasPermission('fleet_fuel_view', 'view');
    const canCreate = hasPermission('fleet_fuel_view', 'create');
    const canEdit = hasPermission('fleet_fuel_view', 'edit');
    const canDelete = hasPermission('fleet_fuel_view', 'delete');

    const [fillings, setFillings] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentCompanyId, setCurrentCompanyId] = useState('');
    const [saving, setSaving] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [bulkPreviewRecords, setBulkPreviewRecords] = useState<any[]>([]);
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkFilter, setBulkFilter] = useState<'all' | 'valid' | 'invalid'>('all');
    const [bulkFileName, setBulkFileName] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [filters, setFilters] = useState({
        vehicle_id: '',
        from: '',
        to: ''
    });

    const [formData, setFormData] = useState({
        vehicle_id: '',
        log_date: new Date().toISOString().split('T')[0],
        odometer_reading: '',
        indent_number: '',
        pump_details: '',
        liters: '',
        rate: '',
        amount: '',
        efficiency: '',
        difference: '',
        remarks: '',
        company_id: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (currentCompanyId) {
            fetchFillings();
        }
    }, [filters, currentCompanyId]);

    const fetchInitialData = async () => {
        const token = localStorage.getItem('token');
        try {
            const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const compData = await compRes.json();
            
            let coId = '';
            if (compData.success && Array.isArray(compData.data)) {
                const activeCo = compData.data.find((c: any) => 
                    c.company_name?.toUpperCase().includes('KEIL')
                );
                if (activeCo) {
                    coId = activeCo.id;
                    setCurrentCompanyId(coId);
                    setFormData(prev => ({ ...prev, company_id: coId }));
                }
            }

            if (coId) {
                const vRes = await fetch(`${VEHICLE_API}?company_id=${coId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const vData = await vRes.json();
                if (vData.success) setVehicles(vData.data);
                
                fetchFillings(coId);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFillings = async (coId?: string) => {
        const token = localStorage.getItem('token');
        const effectiveCompanyId = coId || currentCompanyId;
        const filterParams = new URLSearchParams();
        if (effectiveCompanyId) filterParams.set('company_id', effectiveCompanyId);
        if (filters.vehicle_id && filters.vehicle_id !== 'all') filterParams.set('vehicle_id', filters.vehicle_id);
        if (filters.from && filters.from.trim()) filterParams.set('from', filters.from.trim());
        if (filters.to && filters.to.trim()) filterParams.set('to', filters.to.trim());

        try {
            const res = await fetch(`${FUEL_API}?${filterParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setFillings(data.data);
        } catch (err) {
            console.error('Error fetching fuel fillings:', err);
        }
    };

    const handleAmountCalc = (l: string, r: string) => {
        const litersNum = parseFloat(l) || 0;
        const rateNum = parseFloat(r) || 0;
        if (litersNum && rateNum) {
            setFormData(prev => ({ ...prev, amount: (litersNum * rateNum).toFixed(2) }));
        }
    };

    const handleSave = async () => {
        if (!formData.vehicle_id || !formData.log_date || !formData.liters) {
            error("Please fill all required fields");
            return;
        }

        const token = localStorage.getItem('token');
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${FUEL_API}/${editingId}` : FUEL_API;

        setSaving(true);
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
                success(editingId ? "Fuel record updated!" : "Fuel record saved!");
                setShowForm(false);
                setEditingId(null);
                fetchFillings();
                resetForm();
            } else {
                error(data.message);
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            vehicle_id: '',
            log_date: new Date().toISOString().split('T')[0],
            odometer_reading: '',
            indent_number: '',
            pump_details: '',
            liters: '',
            rate: '',
            amount: '',
            efficiency: '',
            difference: '',
            remarks: '',
            company_id: currentCompanyId
        });
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        if (await confirm({ message: "Delete this fuel record?" })) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${FUEL_API}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    success("Record deleted.");
                    fetchFillings();
                }
            } catch (err: any) {
                error(err.message);
            }
        }
    };

    const normalizeReg = (str: string) => (str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const matchVehicle = (rawVeh: string) => {
        if (!rawVeh) return null;
        const cleanRaw = normalizeReg(rawVeh);
        // 1. Exact normalized match (e.g. KL70J0665 === KL70J0665)
        let match = vehicles.find(v => normalizeReg(v.registration_number) === cleanRaw);
        if (match) return match;

        // 2. Match ignoring leading zeros in trailing number (e.g. 0665 vs 665)
        const stripZeros = (s: string) => s.replace(/(\D)0+(\d+)/g, '$1$2');
        match = vehicles.find(v => stripZeros(normalizeReg(v.registration_number)) === stripZeros(cleanRaw));
        return match || null;
    };

    const downloadSampleTemplate = async () => {
        const ExcelJS = (await import('exceljs')).default;
        const saveAs = (await import('file-saver')).saveAs;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Diesel Register');

        // Title Row matching image: Monthly Diesel Consumption Register September – 2026–27
        const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());
        const currentYear = new Date().getFullYear();
        const nextYearShort = String(currentYear + 1).slice(-2);
        const titleText = `Monthly Diesel Consumption Register ${currentMonth} – ${currentYear}–${nextYearShort}`;

        const titleRow = worksheet.addRow([titleText]);
        titleRow.font = { bold: true, size: 13, name: 'Calibri' };
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.mergeCells('A1:F1');
        titleRow.height = 26;

        // Header Row matching image: DATE | VEH NO | LTR | RATE | AMOUT | PUMP
        const headerRow = worksheet.addRow(['DATE', 'VEH NO', 'LTR', 'RATE', 'AMOUT', 'PUMP']);
        headerRow.height = 22;
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Sample data rows matching the user's image exactly, falling back to registered fleet numbers if available
        const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const reg1 = vehicles[0]?.registration_number || 'KL 70 J 0665';
        const reg2 = vehicles[1]?.registration_number || 'KL 09 AX 2744';
        const reg3 = vehicles[2]?.registration_number || 'KL 70 H 4641';
        const reg4 = vehicles[3]?.registration_number || 'KL 09 AZ 7721';
        const reg5 = vehicles[4]?.registration_number || 'KL 09 AZ 7750';
        const reg6 = vehicles[5]?.registration_number || 'KL 09 BA 3420';
        const reg7 = vehicles[6]?.registration_number || 'KL 70 H 4621';
        const reg8 = vehicles[7]?.registration_number || 'KL 70 H 4690';

        const sampleRows = [
            [todayStr, reg1, 9.73, 102.77, 1000.00, 'C.K THAVOO'],
            [todayStr, reg2, 38.00, 103.67, 3939.46, 'C.K THAVOO'],
            [todayStr, reg3, 22.10, 102.44, 2263.92, 'CHITHRAPUZHA EKM'],
            [todayStr, reg4, 24.49, 102.44, 2508.76, 'CHITHRAPUZHA EKM'],
            [todayStr, reg1, 113.88, 102.44, 11665.87, 'CHITHRAPUZHA EKM'],
            [todayStr, reg5, 17.00, 102.44, 1741.48, 'CHITHRAPUZHA EKM'],
            [todayStr, reg6, 17.85, 102.44, 1828.55, 'CHITHRAPUZHA EKM'],
            [todayStr, reg7, 10.89, 102.44, 1115.57, 'CHITHRAPUZHA EKM'],
            [todayStr, reg8, 20.21, 103.67, 2095.17, 'C.K THAVOO'],
            [todayStr, reg3, 21.68, 103.53, 2244.53, 'PALAZHI']
        ];

        sampleRows.forEach(rowData => {
            const row = worksheet.addRow(rowData);
            row.height = 20;
            row.eachCell((cell, colNumber) => {
                cell.font = { size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: colNumber === 1 || colNumber === 2 ? 'center' : (colNumber === 6 ? 'center' : 'center')
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Column widths
        worksheet.getColumn(1).width = 16; // DATE
        worksheet.getColumn(2).width = 18; // VEH NO
        worksheet.getColumn(3).width = 14; // LTR
        worksheet.getColumn(4).width = 14; // RATE
        worksheet.getColumn(5).width = 16; // AMOUT
        worksheet.getColumn(6).width = 24; // PUMP

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Monthly_Diesel_Consumption_Register_Template.xlsx`);
        success("Sample Excel format template downloaded successfully!");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setBulkFileName(file.name);

        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const buffer = await file.arrayBuffer();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                error("Uploaded workbook contains no worksheets.");
                return;
            }

            const getCellValue = (cell: any): string => {
                if (!cell || cell.value === null || cell.value === undefined) return '';
                if (cell.value instanceof Date) {
                    const d = cell.value;
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                }
                if (typeof cell.value === 'object') {
                    if (cell.value.result !== undefined) return String(cell.value.result).trim();
                    if (cell.value.text !== undefined) return String(cell.value.text).trim();
                    if (cell.value.richText) return cell.value.richText.map((t: any) => t.text).join('').trim();
                    return JSON.stringify(cell.value).trim();
                }
                return String(cell.value).trim();
            };

            // Detect header row by scanning rows 1 to 10
            let headerRowIndex = -1;
            let colMap = { date: -1, veh: -1, ltr: -1, rate: -1, amount: -1, pump: -1 };

            worksheet.eachRow((row, rowNumber) => {
                if (headerRowIndex !== -1) return;
                const cellTexts: { [col: number]: string } = {};
                row.eachCell((cell, colNumber) => {
                    cellTexts[colNumber] = getCellValue(cell).toUpperCase();
                });

                const values = Object.values(cellTexts);
                const hasDate = values.some(v => v.includes('DATE'));
                const hasVeh = values.some(v => v.includes('VEH') || v.includes('REG') || v.includes('ASSET'));
                const hasLtr = values.some(v => v.includes('LTR') || v.includes('LITER') || v.includes('QTY'));

                if (hasDate && (hasVeh || hasLtr)) {
                    headerRowIndex = rowNumber;
                    Object.entries(cellTexts).forEach(([colStr, text]) => {
                        const colIdx = Number(colStr);
                        if (text.includes('DATE')) colMap.date = colIdx;
                        else if (text.includes('VEH') || text.includes('REG') || text.includes('ASSET')) colMap.veh = colIdx;
                        else if (text.includes('LTR') || text.includes('LITER') || text.includes('QTY')) colMap.ltr = colIdx;
                        else if (text.includes('RATE') || text.includes('PRICE')) colMap.rate = colIdx;
                        else if (text.includes('AMOUT') || text.includes('AMOUNT') || text.includes('TOTAL') || text.includes('COST')) colMap.amount = colIdx;
                        else if (text.includes('PUMP') || text.includes('STATION') || text.includes('BUNK')) colMap.pump = colIdx;
                    });
                }
            });

            if (headerRowIndex === -1 || colMap.date === -1 || colMap.veh === -1 || colMap.ltr === -1) {
                error("Could not find expected columns (DATE, VEH NO, LTR, RATE, AMOUT, PUMP). Please download and use the provided template.");
                return;
            }

            const parseDateValue = (raw: string, cell: any): string => {
                if (cell?.value instanceof Date) {
                    const d = cell.value;
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                }
                if (typeof cell?.value === 'number' && cell.value > 20000 && cell.value < 100000) {
                    const dateObj = new Date((cell.value - 25569) * 86400 * 1000);
                    const yyyy = dateObj.getFullYear();
                    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const dd = String(dateObj.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                }
                const clean = raw.trim();
                if (!clean) return '';

                // Match DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
                const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
                if (dmyMatch) {
                    const [_, day, month, year] = dmyMatch;
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }

                // Match YYYY-MM-DD
                const ymdMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
                if (ymdMatch) {
                    const [_, year, month, day] = ymdMatch;
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }

                const parsed = new Date(clean);
                if (!isNaN(parsed.getTime())) {
                    return parsed.toISOString().split('T')[0];
                }
                return '';
            };

            const parsedRows: any[] = [];

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber <= headerRowIndex) return;

                const rawDate = colMap.date !== -1 ? getCellValue(row.getCell(colMap.date)) : '';
                const rawVeh = colMap.veh !== -1 ? getCellValue(row.getCell(colMap.veh)) : '';
                const rawLtr = colMap.ltr !== -1 ? getCellValue(row.getCell(colMap.ltr)) : '';
                const rawRate = colMap.rate !== -1 ? getCellValue(row.getCell(colMap.rate)) : '';
                const rawAmount = colMap.amount !== -1 ? getCellValue(row.getCell(colMap.amount)) : '';
                const rawPump = colMap.pump !== -1 ? getCellValue(row.getCell(colMap.pump)) : '';

                // Skip blank rows or total summary rows at bottom
                if (!rawDate && !rawVeh && !rawLtr && !rawAmount && !rawPump) return;
                if (rawDate.toUpperCase().includes('TOTAL') || rawVeh.toUpperCase().includes('TOTAL')) return;

                const rowErrors: string[] = [];

                // 1. Date Validation
                const dateCell = colMap.date !== -1 ? row.getCell(colMap.date) : null;
                const formattedDate = parseDateValue(rawDate, dateCell);
                if (!rawDate) {
                    rowErrors.push("Date is required");
                } else if (!formattedDate) {
                    rowErrors.push(`Invalid date: "${rawDate}" (use DD-MM-YYYY)`);
                } else {
                    const yr = parseInt(formattedDate.split('-')[0], 10);
                    if (yr < 2000 || yr > 2099) {
                        rowErrors.push(`Date year ${yr} out of range`);
                    }
                }

                // 2. Vehicle Matching
                if (!rawVeh) {
                    rowErrors.push("Vehicle number is required");
                }
                const matchedVeh = matchVehicle(rawVeh);
                if (rawVeh && !matchedVeh) {
                    rowErrors.push(`Vehicle "${rawVeh}" not found in registered fleet`);
                }

                // 3. Liters Validation
                const ltrNum = parseFloat(rawLtr);
                if (!rawLtr) {
                    rowErrors.push("Liters (LTR) is required");
                } else if (isNaN(ltrNum) || ltrNum <= 0) {
                    rowErrors.push(`Invalid liters: "${rawLtr}"`);
                }

                // 4. Rate & Amount Validation / Auto-calculation
                let rateNum = parseFloat(rawRate);
                let amountNum = parseFloat(rawAmount);

                if ((isNaN(amountNum) || amountNum <= 0) && !isNaN(ltrNum) && !isNaN(rateNum) && ltrNum > 0 && rateNum > 0) {
                    amountNum = parseFloat((ltrNum * rateNum).toFixed(2));
                }

                if ((isNaN(rateNum) || rateNum <= 0) && !isNaN(ltrNum) && !isNaN(amountNum) && ltrNum > 0 && amountNum > 0) {
                    rateNum = parseFloat((amountNum / ltrNum).toFixed(2));
                }

                if (isNaN(amountNum) || amountNum <= 0) {
                    rowErrors.push("Valid amount or rate is required");
                }

                parsedRows.push({
                    rowNumber,
                    rawDate,
                    formattedDate,
                    rawVeh,
                    vehicleId: matchedVeh?.id || null,
                    vehicleReg: matchedVeh?.registration_number || rawVeh,
                    liters: !isNaN(ltrNum) ? ltrNum : 0,
                    rate: !isNaN(rateNum) ? rateNum : 0,
                    amount: !isNaN(amountNum) ? amountNum : 0,
                    pump: rawPump || '',
                    isValid: rowErrors.length === 0,
                    errors: rowErrors
                });
            });

            if (parsedRows.length === 0) {
                error("No data rows found below the header row.");
                return;
            }

            setBulkPreviewRecords(parsedRows);
            setShowBulkImport(true);
            setShowForm(false);
            success(`Loaded ${parsedRows.length} rows from Excel file. Please review before importing.`);
        } catch (err: any) {
            console.error("Excel parse error:", err);
            error(`Failed to parse Excel file: ${err.message}`);
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    const handleSaveBulkImport = async () => {
        const validRecords = bulkPreviewRecords.filter(r => r.isValid);
        if (validRecords.length === 0) {
            error("No valid records to import. Please resolve the errors shown.");
            return;
        }

        setBulkImporting(true);
        const token = localStorage.getItem('token');

        try {
            const payload = validRecords.map(r => ({
                company_id: currentCompanyId,
                vehicle_id: r.vehicleId,
                log_date: r.formattedDate,
                liters: r.liters,
                rate: r.rate,
                amount: r.amount,
                pump_details: r.pump || null,
                indent_number: null,
                odometer_reading: null,
                remarks: 'Bulk Excel Import'
            }));

            const res = await fetch(`${FUEL_API}/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ records: payload })
            });

            const data = await res.json();
            if (data.success) {
                success(`Successfully imported ${validRecords.length} fuel records!`);
                setShowBulkImport(false);
                setBulkPreviewRecords([]);
                setBulkFileName('');
                fetchFillings();
            } else {
                error(data.message || "Bulk import failed.");
            }
        } catch (err: any) {
            console.error("Bulk import error:", err);
            error(err.message || "Network error during bulk import.");
        } finally {
            setBulkImporting(false);
        }
    };

    const removeBulkRecord = (index: number) => {
        setBulkPreviewRecords(prev => prev.filter((_, i) => i !== index));
    };

    const resetBulkImport = () => {
        setShowBulkImport(false);
        setBulkPreviewRecords([]);
        setBulkFileName('');
        setBulkFilter('all');
    };

    const handleExport = async () => {
        // Verify and apply active date-wise and vehicle filters to exported dataset
        let exportData = fillings;
        if (filters.from && filters.from.trim()) {
            exportData = exportData.filter(f => {
                const itemDate = new Date(f.log_date).toISOString().split('T')[0];
                return itemDate >= filters.from.trim();
            });
        }
        if (filters.to && filters.to.trim()) {
            exportData = exportData.filter(f => {
                const itemDate = new Date(f.log_date).toISOString().split('T')[0];
                return itemDate <= filters.to.trim();
            });
        }
        if (filters.vehicle_id && filters.vehicle_id !== 'all') {
            exportData = exportData.filter(f => f.vehicle_id === filters.vehicle_id);
        }

        if (exportData.length === 0) {
            error("No data available to export for the selected filter range.");
            return;
        }

        const ExcelJS = (await import('exceljs')).default;
        const saveAs = (await import('file-saver')).saveAs;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Fuel Filling Report');

        worksheet.addRow(['FUEL FILLING REPORT - LOGISTICS TELEMETRY']).font = { bold: true, size: 14 };
        
        // Add date-wise filter indicator to export sheet
        if (filters.from || filters.to) {
            const filterLabel = `Date Filter: ${filters.from || 'Beginning'} to ${filters.to || 'Present'}`;
            worksheet.addRow([filterLabel]).font = { italic: true, bold: true, size: 10, color: { argb: 'FF475569' } };
        }
        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            'DATE', 'VEHICLE NO', 'ODOMETER (KM)', 'INDENT NO', 'PUMP DETAILS', 'LITERS (LTR)', 'RATE (₹)', 'TOTAL AMOUNT (₹)', 'REMARKS'
        ]);

        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        exportData.forEach(f => {
            const row = worksheet.addRow([
                new Date(f.log_date).toLocaleDateString(),
                f.vehicle?.registration_number || 'N/A',
                f.odometer_reading ? parseFloat(f.odometer_reading).toLocaleString() : '-',
                f.indent_number || '-',
                f.pump_details || '-',
                f.liters,
                f.rate,
                f.amount,
                f.remarks || ''
            ]);
            row.eachCell(cell => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
        });
        
        // Add Totals Row
        const totalLiters = exportData.reduce((sum, f) => sum + (parseFloat(f.liters) || 0), 0);
        const totalAmount = exportData.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
        
        worksheet.addRow([]); // Empty row
        const footerRow = worksheet.addRow([
            'TOTAL', '', '', '', '', totalLiters.toFixed(2), '', totalAmount.toFixed(2), ''
        ]);
        
        footerRow.eachCell((cell: any) => {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // slate-100
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        worksheet.columns.forEach(col => { col.width = 18; });

        const dateSuffix = filters.from && filters.to 
            ? `${filters.from}_to_${filters.to}`
            : (filters.from ? `from_${filters.from}` : new Date().toISOString().split('T')[0]);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Fuel_Report_${dateSuffix}.xlsx`);
        success(`Fuel report exported successfully (${exportData.length} records).`);
    };

    if (permissionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!canView) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="p-6 rounded-full bg-primary/5 text-primary">
                <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground font-medium">You do not have permission to view Fuel Filling Management.</p>
        </div>
    );

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-primary/10">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight flex items-center gap-2">
                        <Fuel className="w-8 h-8" />
                        Fuel Filling Management
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium italic">Logistics Telemetry - Fuel Consumption & Efficiency tracking</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {canCreate && (
                        <>
                            <Button 
                                onClick={() => { 
                                    setShowForm(!showForm); 
                                    if(!showForm) {
                                        resetForm();
                                        setShowBulkImport(false);
                                    }
                                }}
                                className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 font-bold uppercase tracking-wider"
                            >
                                {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                {showForm ? 'Cancel' : 'New Fuel Entry'}
                            </Button>
                            <Button 
                                onClick={() => { 
                                    setShowBulkImport(!showBulkImport);
                                    if (!showBulkImport) {
                                        setShowForm(false);
                                    }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {showBulkImport ? 'Close Bulk Import' : 'Bulk Import'}
                            </Button>
                        </>
                    )}
                    <Button 
                        variant="outline"
                        onClick={handleExport}
                        className="border-primary/20 text-primary font-bold uppercase tracking-wider rounded-full px-6"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                </div>
            </div>

            {showBulkImport ? (
                <Card className="border-emerald-200/60 shadow-xl overflow-hidden animate-in fade-in duration-300">
                    <CardHeader className="bg-emerald-50/50 py-5 px-6 border-b border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold text-emerald-950 flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shadow-sm">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                Bulk Fuel Filling Import (Excel)
                            </CardTitle>
                            <CardDescription className="text-emerald-700/80 font-medium text-xs md:text-sm">
                                Format: Monthly Diesel Consumption Register (DATE, VEH NO, LTR, RATE, AMOUT, PUMP)
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <Button 
                                variant="outline"
                                onClick={downloadSampleTemplate}
                                className="border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 font-bold uppercase tracking-wider text-xs rounded-full h-10 px-5 shadow-sm"
                            >
                                <Download className="w-4 h-4 mr-2 text-emerald-600" />
                                Download Format (.xlsx)
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={resetBulkImport}
                                className="rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 w-9 h-9"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8 space-y-6">
                        {/* Hidden file input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept=".xlsx, .xls" 
                            onChange={handleFileUpload} 
                            className="hidden" 
                        />

                        {bulkPreviewRecords.length === 0 ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-emerald-200/80 hover:border-emerald-400 bg-emerald-50/20 hover:bg-emerald-50/50 rounded-3xl p-10 md:p-14 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center space-y-4 shadow-inner"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-emerald-100/80 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                    <Upload className="w-10 h-10" />
                                </div>
                                <div className="space-y-1.5 max-w-lg">
                                    <h3 className="text-lg md:text-xl font-bold text-slate-800">
                                        Click to Upload or Drag & Drop Excel Register
                                    </h3>
                                    <p className="text-xs md:text-sm text-slate-500 font-medium">
                                        Upload Excel file matching the Monthly Diesel Consumption Register structure.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                    {['DATE', 'VEH NO', 'LTR', 'RATE', 'AMOUT', 'PUMP'].map((col, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-white border border-emerald-200 text-emerald-800 text-[10px] font-black rounded-lg uppercase tracking-wider shadow-2xs">
                                            {col}
                                        </span>
                                    ))}
                                </div>
                                <div className="pt-4 flex flex-wrap gap-3">
                                    <Button 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 h-11 font-bold uppercase tracking-wider shadow-md shadow-emerald-600/20"
                                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Select Excel File
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 rounded-full px-6 h-11 font-bold uppercase tracking-wider"
                                        onClick={(e) => { e.stopPropagation(); downloadSampleTemplate(); }}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Sample Format
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Metrics Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Rows</span>
                                        <p className="text-2xl font-black text-slate-800">{bulkPreviewRecords.length}</p>
                                    </div>
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Valid & Ready
                                        </span>
                                        <p className="text-2xl font-black text-emerald-700">
                                            {bulkPreviewRecords.filter(r => r.isValid).length}
                                        </p>
                                    </div>
                                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Issues Found
                                        </span>
                                        <p className="text-2xl font-black text-rose-700">
                                            {bulkPreviewRecords.filter(r => !r.isValid).length}
                                        </p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1">
                                            <Fuel className="w-3.5 h-3.5" /> Total Liters
                                        </span>
                                        <p className="text-2xl font-black text-amber-700">
                                            {bulkPreviewRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0).toFixed(2)} <span className="text-xs font-bold">L</span>
                                        </p>
                                    </div>
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 space-y-1 col-span-2 sm:col-span-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                                            <IndianRupee className="w-3.5 h-3.5" /> Total Amount
                                        </span>
                                        <p className="text-2xl font-black text-indigo-800">
                                            ₹{bulkPreviewRecords.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                {/* Controls Toolbar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 mr-1">Filter:</span>
                                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                                            <button
                                                type="button"
                                                onClick={() => setBulkFilter('all')}
                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${bulkFilter === 'all' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                All ({bulkPreviewRecords.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBulkFilter('valid')}
                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${bulkFilter === 'valid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                Valid ({bulkPreviewRecords.filter(r => r.isValid).length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBulkFilter('invalid')}
                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${bulkFilter === 'invalid' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                Errors ({bulkPreviewRecords.filter(r => !r.isValid).length})
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-9 rounded-lg border-slate-300 font-bold text-xs"
                                        >
                                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                                            Upload Different File
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={downloadSampleTemplate}
                                            className="h-9 rounded-lg border-emerald-300 text-emerald-800 font-bold text-xs"
                                        >
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            Sample Format
                                        </Button>
                                    </div>
                                </div>

                                {/* Preview Table */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                    <div className="max-h-[420px] overflow-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead className="bg-slate-800 text-white uppercase text-[10px] tracking-wider sticky top-0 z-10 font-bold">
                                                <tr>
                                                    <th className="py-3 px-3 text-center w-12">#</th>
                                                    <th className="py-3 px-4 w-28">Status</th>
                                                    <th className="py-3 px-4">Date</th>
                                                    <th className="py-3 px-4">Vehicle No</th>
                                                    <th className="py-3 px-4 text-right">Liters (LTR)</th>
                                                    <th className="py-3 px-4 text-right">Rate (₹)</th>
                                                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                                                    <th className="py-3 px-4">Pump Details</th>
                                                    <th className="py-3 px-4">Validation Notes</th>
                                                    <th className="py-3 px-3 text-center w-12">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {bulkPreviewRecords
                                                    .filter(r => {
                                                        if (bulkFilter === 'valid') return r.isValid;
                                                        if (bulkFilter === 'invalid') return !r.isValid;
                                                        return true;
                                                    })
                                                    .map((row, idx) => (
                                                        <tr key={idx} className={row.isValid ? 'hover:bg-slate-50/80' : 'bg-rose-50/50 hover:bg-rose-50'}>
                                                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{row.rowNumber}</td>
                                                            <td className="py-2.5 px-4">
                                                                {row.isValid ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                        <CheckCircle2 className="w-3 h-3" /> Valid
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                                                        <AlertTriangle className="w-3 h-3" /> Error
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                                                                {row.formattedDate || row.rawDate}
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-slate-900 font-mono">{row.rawVeh}</span>
                                                                    {row.vehicleId ? (
                                                                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                                                                            Matched
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] font-bold">
                                                                            Not Registered
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-4 text-right font-black text-amber-600 font-mono">
                                                                {row.liters ? row.liters.toFixed(2) : '-'}
                                                            </td>
                                                            <td className="py-2.5 px-4 text-right font-bold text-slate-600 font-mono">
                                                                {row.rate ? `₹${row.rate.toFixed(2)}` : '-'}
                                                            </td>
                                                            <td className="py-2.5 px-4 text-right font-black text-slate-900 font-mono">
                                                                {row.amount ? `₹${row.amount.toFixed(2)}` : '-'}
                                                            </td>
                                                            <td className="py-2.5 px-4 text-slate-700 font-semibold truncate max-w-[160px]" title={row.pump}>
                                                                {row.pump || '-'}
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                {row.errors && row.errors.length > 0 ? (
                                                                    <div className="text-rose-600 text-[11px] font-semibold space-y-0.5">
                                                                        {row.errors.map((e: string, eIdx: number) => (
                                                                            <p key={eIdx}>• {e}</p>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-emerald-600 text-[11px] font-medium flex items-center gap-1">
                                                                        <Check className="w-3.5 h-3.5" /> Ready for sync
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeBulkRecord(idx)}
                                                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                                    title="Remove row"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Footer Confirmation */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Importing will record <span className="font-bold text-emerald-700">{bulkPreviewRecords.filter(r => r.isValid).length} valid entries</span> directly into Logistics Telemetry Fuel Fillings.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            onClick={resetBulkImport}
                                            className="rounded-full px-6 font-bold uppercase tracking-wider text-xs"
                                        >
                                            Discard / Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSaveBulkImport}
                                            disabled={bulkImporting || bulkPreviewRecords.filter(r => r.isValid).length === 0}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 h-11 font-bold uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                                        >
                                            {bulkImporting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Synchronizing {bulkPreviewRecords.filter(r => r.isValid).length} Records...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Confirm & Import ({bulkPreviewRecords.filter(r => r.isValid).length}) Records
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : showForm ? (
                <Card className="border-primary/20 shadow-xl overflow-hidden">
                    <CardHeader className="bg-primary/5 py-4 px-6 border-b border-primary/10">
                        <CardTitle className="text-lg font-bold text-primary">Capture Fuel Telemetry</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Log Date *</label>
                                <Input type="date" value={formData.log_date} onChange={e => setFormData({...formData, log_date: e.target.value})} className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Vehicle Number *</label>
                                <Select value={formData.vehicle_id} onValueChange={v => {
                                    const veh = vehicles.find(veh => veh.id === v);
                                    setFormData(prev => ({
                                        ...prev, 
                                        vehicle_id: v,
                                        odometer_reading: prev.odometer_reading || (veh?.current_km ? veh.current_km.toString() : '')
                                    }));
                                }}>
                                    <SelectTrigger className="h-11 rounded-lg border-primary/20 bg-white font-bold">
                                        <SelectValue placeholder="Select Vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicles.map(v => (
                                            <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Odometer Reading (KM)</label>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    min={0}
                                    value={formData.odometer_reading} 
                                    onChange={e => setFormData({...formData, odometer_reading: e.target.value})} 
                                    placeholder="e.g. 45200" 
                                    className="h-11 rounded-lg border-primary/20 font-bold" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Indent Number</label>
                                <Input value={formData.indent_number} onChange={e => setFormData({...formData, indent_number: e.target.value})} placeholder="IND-XXXXX" className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Pump Details</label>
                                <Input value={formData.pump_details || ''} onChange={e => setFormData({...formData, pump_details: e.target.value})} placeholder="Pump Name / Station" className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Liters (LTR) *</label>
                                <Input type="number" step="0.01" value={formData.liters} onChange={e => {setFormData({...formData, liters: e.target.value}); handleAmountCalc(e.target.value, formData.rate);}} className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Rate (₹/Ltr)</label>
                                <Input type="number" step="0.01" value={formData.rate} onChange={e => {setFormData({...formData, rate: e.target.value}); handleAmountCalc(formData.liters, e.target.value);}} className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Total Amount (₹)</label>
                                <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>

                            <div className="space-y-1.5 lg:col-span-4 md:col-span-2 col-span-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Remarks</label>
                                <Input value={formData.remarks || ''} onChange={e => setFormData({...formData, remarks: e.target.value})} placeholder="Enter remarks or notes" className="h-11 rounded-lg border-primary/20 font-bold" />
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-full px-8 font-bold uppercase tracking-widest">Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-primary text-white rounded-full px-10 h-11 font-black uppercase tracking-wider shadow-lg shadow-primary/20">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                Synchronize Record
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    <Card className="border-primary/10 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-primary/5 flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[200px] space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Vehicle Filter</label>
                                <Select value={filters.vehicle_id} onValueChange={v => setFilters({...filters, vehicle_id: v})}>
                                    <SelectTrigger className="h-10 rounded-lg bg-white border-primary/10 font-bold text-xs">
                                        <SelectValue placeholder="All Fleet Assets" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Fleet Assets</SelectItem>
                                        {vehicles.map(v => (
                                            <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">From Date</label>
                                <Input type="date" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} className="h-10 rounded-lg bg-white border-primary/10 font-bold text-xs" />
                            </div>
                            <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">To Date</label>
                                <Input type="date" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} className="h-10 rounded-lg bg-white border-primary/10 font-bold text-xs" />
                            </div>
                            <Button variant="ghost" onClick={() => setFilters({vehicle_id: 'all', from: '', to: ''})} className="text-primary font-black uppercase text-[10px] tracking-widest h-10 px-4">
                                <X className="w-3 h-3 mr-1" /> Reset
                            </Button>
                        </div>

                        <TableView 
                            data={fillings}
                            loading={loading}
                            headers={['DATE', 'VEHICLE NO', 'INDENT NO', 'PUMP DETAILS', 'QUANTITY', 'RATE / AMOUNT', 'EFFICIENCY HUB', 'REMARKS', 'ACTIONS']}
                            searchFields={['indent_number', 'vehicle.registration_number', 'remarks', 'pump_details', 'odometer_reading']}
                            renderRow={(f) => (
                                <tr key={f.id} className="hover:bg-primary/[0.02] transition-colors border-b border-primary/5 last:border-0">
                                    <td className="px-6 py-4 font-bold text-sm text-slate-700">
                                        {new Date(f.log_date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-800 tracking-tight">{f.vehicle?.registration_number}</span>
                                                {f.odometer_reading && (
                                                    <span className="text-[9px] font-bold text-slate-500 font-mono">
                                                        {parseFloat(f.odometer_reading).toLocaleString()} KM
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 bg-slate-100 w-fit px-3 py-1 rounded-full border border-slate-200">
                                            <Hash className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{f.indent_number || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-semibold text-slate-700">{f.pump_details || '--'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-black text-amber-600 leading-none">{f.liters}</span>
                                            <span className="text-[8px] font-bold text-amber-600/60 uppercase tracking-tighter mt-1">LITERS (LTR)</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                                <span>₹{f.rate}</span>
                                                <span className="text-[8px] opacity-40">/ LTR</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm font-black text-slate-800">
                                                <IndianRupee className="w-3 h-3" />
                                                <span>{f.amount}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">EQ</span>
                                                <span className="text-xs font-black text-emerald-600">{f.efficiency || '--'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">DIFF</span>
                                                <span className={`text-xs font-black ${parseFloat(f.difference) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {f.difference || '--'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-semibold text-slate-600 max-w-[200px] truncate" title={f.remarks || ''}>
                                        {f.remarks || '--'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {canEdit && (
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="w-8 h-8 rounded-full border-primary/10 text-primary hover:bg-primary/5"
                                                    onClick={() => {
                                                        setEditingId(f.id);
                                                        setFormData({
                                                            ...f,
                                                            odometer_reading: f.odometer_reading ? f.odometer_reading.toString() : '',
                                                            log_date: new Date(f.log_date).toISOString().split('T')[0]
                                                        });
                                                        setShowForm(true);
                                                    }}
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="w-8 h-8 rounded-full border-rose-100 text-rose-500 hover:bg-rose-50"
                                                    onClick={() => handleDelete(f.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        />
                        
                        {/* Summary Footer */}
                        <div className="p-6 bg-slate-50/50 border-t border-primary/5 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex flex-wrap gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Count</p>
                                    <p className="text-2xl font-black text-slate-800 tracking-tight">{new Set(fillings.map(f => f.vehicle_id)).size} Vehicles</p>
                                </div>
                                <div className="space-y-1 border-l border-slate-200 pl-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fuel Volume</p>
                                    <div className="flex items-baseline gap-1">
                                        <p className="text-2xl font-black text-amber-600 tracking-tight">
                                            {fillings.reduce((sum, f) => sum + (parseFloat(f.liters) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                        </p>
                                        <span className="text-[10px] font-bold text-amber-600/60 uppercase">LTR</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 min-w-[280px] group hover:bg-primary/10 transition-all duration-300">
                                <div className="flex justify-between items-center gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em]">Gross Expenditure</p>
                                        <div className="flex items-center gap-2">
                                            <IndianRupee className="w-5 h-5 text-primary" />
                                            <p className="text-3xl font-black text-primary tracking-tight">
                                                {fillings.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                        <IndianRupee className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
