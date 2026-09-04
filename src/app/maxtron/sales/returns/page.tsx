'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RotateCcw, Plus, Trash2, Save, X, Search,
  User, Calendar, Package, Info, Edit2,
  CheckCircle2, XCircle, AlertCircle, FileText,
  BadgeCheck, RefreshCw, AlertTriangle, Eye, Copy, Check, Printer
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const RETURNS_API = `${API_BASE}/api/maxtron/sales/returns`;
const INVOICES_API = `${API_BASE}/api/maxtron/sales/invoices`;
const CUSTOMERS_API = `${API_BASE}/api/maxtron/customers`;
const PRODUCTS_API = `${API_BASE}/api/maxtron/products`;
const EMPLOYEES_API = `${API_BASE}/api/maxtron/employees`;

// ─── Credit Note Status Badge Component ───────────────────────────────────────
const CreditNoteBadge = ({ status, irn, onClick }: { status?: string; irn?: string; onClick?: () => void }) => {
  if (!status || status === 'NOT_APPLICABLE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
        N/A
      </span>
    );
  }
  if (status === 'GENERATED') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-left space-y-0.5 group cursor-pointer"
        title="Click to view Credit Note Details"
      >
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-100 transition-colors">
          <BadgeCheck className="w-3 h-3" /> CRN Generated
        </span>
        {irn && (
          <div className="text-[9px] font-mono text-slate-400 px-1 truncate max-w-[120px] group-hover:text-emerald-700">
            IRN: {irn.substring(0, 10)}...
          </div>
        )}
      </button>
    );
  }
  if (status === 'FAILED') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
        title="Click to view failure error details"
      >
        <AlertTriangle className="w-3 h-3" /> CRN Failed
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
      <AlertCircle className="w-3 h-3" /> {status}
    </span>
  );
};

export default function SalesReturns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingReturn, setViewingReturn] = useState<any | null>(null);
  const [copiedIrn, setCopiedIrn] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [crnLoading, setCrnLoading] = useState<string | null>(null);

  const [alert, setAlert] = useState<{
    show: boolean,
    type: 'success' | 'error' | 'confirm',
    title: string,
    message: string,
    onConfirm?: () => void
  }>({ show: false, type: 'success', title: '', message: '' });

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    invoice_id: '',
    customer_id: '',
    return_date: new Date().toISOString().split('T')[0],
    return_through: 'DIRECT',
    courier_name: '',
    return_employee_id: '',
    reason: '',
    total_return_value: 0,
    company_id: '',
    items: [{ product_id: '', quantity: 0, rate: 0, value: 0 }]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Generate QR code data URL whenever viewingReturn changes
  useEffect(() => {
    if (viewingReturn?.credit_note_signed_qr_code) {
      QRCode.toDataURL(viewingReturn.credit_note_signed_qr_code, { margin: 1, width: 160 })
        .then((url: string) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(null));
    } else {
      setQrCodeDataUrl(null);
    }
  }, [viewingReturn]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIrn(true);
    setTimeout(() => setCopiedIrn(false), 2000);
  };

  const fetchInitialData = async () => {
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
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
          setFormData(prev => ({ ...prev, company_id: coId }));
        }
      }

      const [invRes, custRes, prodRes, empRes] = await Promise.all([
        fetch(`${INVOICES_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${CUSTOMERS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${PRODUCTS_API}?company_id=${coId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${EMPLOYEES_API}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const invData = await invRes.json();
      const custData = await custRes.json();
      const prodData = await prodRes.json();
      const empData = await empRes.json();

      if (invData.success) setInvoices(invData.data);
      if (custData.success) setCustomers(custData.data);
      if (prodData.success) setProducts(prodData.data);
      if (empData.success) {
        setEmployees(empData.data.filter((e: any) =>
          e.companies?.company_name?.toUpperCase() === activeTenant &&
          (e.user_types?.name === 'marketing' || e.user_types?.name === 'delivery' || e.user_types?.name === 'sales' || e.user_types?.name === 'admin')
        ));
      }

      if (coId) fetchReturns(coId);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${RETURNS_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setReturns(data.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleInvoiceSelect = (invId: string) => {
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      const initialItems = inv.items && inv.items.length > 0
        ? [{
          product_id: inv.items[0].product_id,
          quantity: inv.items[0].quantity,
          rate: inv.items[0].rate,
          value: Number(inv.items[0].quantity) * Number(inv.items[0].rate)
        }]
        : [{ product_id: '', quantity: 0, rate: 0, value: 0 }];

      setFormData({
        ...formData,
        invoice_id: invId,
        customer_id: inv.customer_id,
        items: initialItems
      });
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] } as any;

    if (field === 'quantity' || field === 'rate') {
      item[field] = value === '' ? 0 : parseFloat(value) || 0;
    } else {
      item[field] = value;
    }

    const qty = Number(item.quantity || 0);
    const rate = Number(item.rate || 0);
    item.value = qty * rate;

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const totalValue = formData.items.reduce((sum, item) => sum + (item.value || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.customer_id) newErrors.customer_id = 'Required';
    if (formData.return_through === 'DIRECT' && !formData.return_employee_id) newErrors.return_employee_id = 'Required';
    if (formData.return_through === 'COURIER' && !formData.courier_name.trim()) newErrors.courier_name = 'Required';
    if (!formData.reason.trim()) newErrors.reason = 'Reason required';

    if (formData.items.length === 0 || formData.items.some(i => !i.product_id || (i.quantity || 0) <= 0 || (i.rate || 0) <= 0)) {
      setAlert({ show: true, type: 'error', title: 'Line Items Invalid', message: 'All items must have a valid Quantity and Rate greater than 0.' });
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setAlert({ show: true, type: 'error', title: 'Validation Failed', message: 'Please check and fill mandatory fields highlighted in red.' });
      return;
    }

    setErrors({});
    try {
      const url = editingId ? `${RETURNS_API}/${editingId}` : RETURNS_API;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...formData, total_return_value: totalValue })
      });

      const result = await res.json();
      if (result.success) {
        setAlert({ show: true, type: 'success', title: 'Return Processed', message: 'The sales return has been recorded. Credit Note (e-Invoice) will be generated automatically if applicable.' });
        setShowForm(false);
        setEditingId(null);
        setFormData({
          invoice_id: '',
          customer_id: '',
          return_date: new Date().toISOString().split('T')[0],
          return_through: 'DIRECT',
          courier_name: '',
          return_employee_id: '',
          reason: '',
          total_return_value: 0,
          company_id: currentCompanyId,
          items: [{ product_id: '', quantity: 0, rate: 0, value: 0 }]
        });
        fetchReturns();
      } else {
        setAlert({ show: true, type: 'error', title: 'Error', message: result.message });
      }
    } catch (err) {
      setAlert({ show: true, type: 'error', title: 'System Error', message: 'Something went wrong.' });
    }
  };

  const handleEdit = (ret: any) => {
    setEditingId(ret.id);
    setFormData({
      invoice_id: ret.invoice_id || '',
      customer_id: ret.customer_id,
      return_date: ret.return_date.split('T')[0],
      return_through: ret.return_through || 'DIRECT',
      courier_name: ret.courier_name || '',
      return_employee_id: ret.return_employee_id || '',
      reason: ret.reason || '',
      total_return_value: ret.total_return_value || 0,
      company_id: ret.company_id,
      items: ret.items.map((i: any) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        rate: i.rate,
        value: i.value
      }))
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setAlert({
      show: true,
      type: 'confirm',
      title: 'Delete Return?',
      message: 'This will reverse the return entry.',
      onConfirm: async () => {
        const res = await fetch(`${RETURNS_API}/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await res.json();
        if (result.success) {
          setAlert({ show: true, type: 'success', title: 'Deleted', message: 'Record removed.' });
          fetchReturns();
        }
      }
    });
  };

  const handleGenerateCreditNote = async (ret: any) => {
    setCrnLoading(ret.id);
    try {
      const res = await fetch(`${RETURNS_API}/${ret.id}/credit-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await res.json();
      if (result.success) {
        setAlert({
          show: true, type: 'success',
          title: 'Credit Note Generated',
          message: `CRN IRN: ${result.data?.credit_note_irn || 'Generated successfully'}`
        });
        fetchReturns();
      } else {
        setAlert({ show: true, type: 'error', title: 'CRN Failed', message: result.message });
      }
    } catch {
      setAlert({ show: true, type: 'error', title: 'Error', message: 'Failed to generate Credit Note.' });
    } finally {
      setCrnLoading(null);
    }
  };

  const handleDownloadCreditNotePdf = async (ret: any, qrDataUrl: string | null) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(244, 63, 94); // Rose 500
      doc.rect(0, 0, pageWidth, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('CREDIT NOTE / SALES RETURN', 14, 15);

      doc.setFontSize(9);
      doc.text(`Doc No: ${ret.return_number}`, pageWidth - 14, 15, { align: 'right' });

      let y = 32;

      // Seller & Buyer Info
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('ISSUED BY:', 14, y);
      doc.text('ISSUED TO (CUSTOMER):', 110, y);

      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(activeTenant === 'KEIL' ? 'KEIL Industries Ltd.' : 'MAXTRON ASSOCIATES', 14, y);
      doc.text(ret.customers?.customer_name || 'Customer', 110, y);

      y += 4.5;
      doc.text('GSTIN: 32AUYPV8850B1Z2', 14, y);
      doc.text(`GSTIN: ${ret.customers?.gst_no || 'Unregistered'}`, 110, y);

      y += 4.5;
      doc.text(`Date: ${new Date(ret.return_date).toLocaleDateString('en-GB')}`, 14, y);
      doc.text(`Orig. Inv: ${ret.invoices?.invoice_number || 'N/A'}`, 110, y);

      y += 8;

      // e-Invoice IRN Details (if generated)
      if (ret.credit_note_irn) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'D');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('E-CREDIT NOTE IRN:', 18, y + 6);

        doc.setFont('courier', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text(ret.credit_note_irn, 18, y + 11);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`Ack No: ${ret.credit_note_ack_no || 'N/A'}`, 18, y + 17);
        if (ret.credit_note_ack_date) {
          doc.text(`Ack Date: ${new Date(ret.credit_note_ack_date).toLocaleString()}`, 100, y + 17);
        }

        if (qrDataUrl) {
          try {
            doc.addImage(qrDataUrl, 'PNG', pageWidth - 32, y + 2, 18, 18);
          } catch {}
        }
        y += 26;
      }

      // Line Items Table using autoTable
      const tableData = (ret.items || []).map((item: any, idx: number) => {
        const val = Number(item.value || (item.quantity * item.rate));
        const gst = Number((val * 0.18).toFixed(2));
        return [
          (idx + 1).toString(),
          item.finished_products?.product_name || 'Returned Product',
          item.finished_products?.hsn_code || '392011',
          Number(item.quantity).toString(),
          `Rs ${Number(item.rate).toLocaleString()}`,
          `Rs ${val.toLocaleString()}`,
          `Rs ${gst.toLocaleString()}`,
          `Rs ${(val + gst).toLocaleString()}`
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['#', 'Product Name', 'HSN Code', 'Qty', 'Rate', 'Taxable Val', 'GST (18%)', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [244, 63, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, font: 'helvetica' },
        columnStyles: {
          0: { cellWidth: 10 },
          3: { halign: 'center' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right', fontStyle: 'bold' }
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || y + 30;

      // Summary Box
      const totalTaxable = Number(ret.total_return_value || 0);
      const totalGst = Number((totalTaxable * 0.18).toFixed(2));
      const totalAmount = totalTaxable + totalGst;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Total Taxable Value: Rs ${totalTaxable.toLocaleString()}`, pageWidth - 14, finalY + 10, { align: 'right' });
      doc.text(`Total GST Amount (18%): Rs ${totalGst.toLocaleString()}`, pageWidth - 14, finalY + 15, { align: 'right' });

      doc.setFontSize(11);
      doc.setTextColor(225, 29, 72);
      doc.text(`Total Credit Note Value: Rs ${totalAmount.toLocaleString()}`, pageWidth - 14, finalY + 22, { align: 'right' });

      doc.save(`Credit_Note_${ret.return_number}.pdf`);
    } catch (err) {
      console.error('Error generating Credit Note PDF:', err);
    }
  };

  // Determine if selected invoice has an e-Invoice IRN
  const selectedInvoice = invoices.find(i => i.id === formData.invoice_id);
  const selectedInvoiceHasEInvoice = !!(selectedInvoice?.einvoice_irn);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {alert.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setAlert({ ...alert, show: false })} />
          <Card className="relative w-full max-w-[440px] shadow-2xl bg-white rounded-3xl p-8 text-center animate-in zoom-in">
            <div className="flex justify-center mb-6">
              {alert.type === 'success' && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
              {alert.type === 'error' && <XCircle className="w-12 h-12 text-rose-500" />}
              {alert.type === 'confirm' && <AlertCircle className="w-12 h-12 text-primary" />}
            </div>
            <h3 className="text-2xl font-black mb-2">{alert.title}</h3>
            <p className="text-slate-500">{alert.message}</p>
            <div className="mt-8 flex gap-3 justify-center">
              {alert.type === 'confirm' ? (
                <>
                  <Button variant="outline" onClick={() => setAlert({ ...alert, show: false })}>Cancel</Button>
                  <Button onClick={() => { alert.onConfirm?.(); setAlert({ ...alert, show: false }); }} className="bg-rose-600">Delete</Button>
                </>
              ) : (
                <Button onClick={() => setAlert({ ...alert, show: false })} className="px-12">Got it</Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ─── Credit Note Details Modal ────────────────────────────────────── */}
      {viewingReturn && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
            onClick={() => setViewingReturn(null)}
          />

          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-200 z-10">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-50 via-slate-50 to-emerald-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">Credit Note Details</h2>
                    <span className="text-xs font-mono font-bold text-rose-600 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200">
                      {viewingReturn.return_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Sales Return &amp; GST Credit Note (CRN) Summary
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingReturn(null)}
                className="rounded-full hover:bg-slate-200/60 text-slate-500"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Status Banner */}
              {viewingReturn.credit_note_status === 'GENERATED' && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-sm font-black text-emerald-900 flex items-center gap-2">
                        Official e-Credit Note (CRN) Generated
                      </div>
                      <div className="text-xs font-medium text-emerald-700">
                        Ack No: <span className="font-bold font-mono">{viewingReturn.credit_note_ack_no || 'N/A'}</span>
                        {viewingReturn.credit_note_ack_date && (
                          <span className="ml-3">Ack Date: <span className="font-bold">{new Date(viewingReturn.credit_note_ack_date).toLocaleString()}</span></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QR Code Container */}
                  {qrCodeDataUrl && (
                    <div className="flex flex-col items-center bg-white p-2 rounded-xl border border-emerald-200 shadow-xs shrink-0 self-center">
                      <img src={qrCodeDataUrl} alt="e-Invoice QR Code" className="w-24 h-24 object-contain" />
                      <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Signed QR Code</span>
                    </div>
                  )}
                </div>
              )}

              {/* IRN Box */}
              {viewingReturn.credit_note_irn && (
                <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-inner">
                  <div className="space-y-1 overflow-hidden">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block font-sans">
                      e-Invoice IRN (Invoice Reference Number)
                    </span>
                    <span className="break-all select-all font-semibold text-slate-200 block text-[11px] leading-relaxed">
                      {viewingReturn.credit_note_irn}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(viewingReturn.credit_note_irn)}
                    className="shrink-0 h-8 px-3 text-xs font-bold font-sans bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5 cursor-pointer"
                  >
                    {copiedIrn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedIrn ? 'Copied!' : 'Copy IRN'}
                  </Button>
                </div>
              )}

              {/* Error Alert Box */}
              {viewingReturn.credit_note_status === 'FAILED' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    Credit Note Generation Failed
                  </div>
                  <div className="text-xs text-rose-700 font-mono bg-white/80 p-3 rounded-xl border border-rose-100 break-words">
                    {viewingReturn.credit_note_error || 'GSP API Error occurred during CRN generation.'}
                  </div>
                  {viewingReturn.invoices?.einvoice_irn && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleGenerateCreditNote(viewingReturn);
                        setViewingReturn(null);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Credit Note Generation
                    </Button>
                  )}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Original Invoice</span>
                  <span className="font-bold text-slate-900 block">{viewingReturn.invoices?.invoice_number || 'N/A'}</span>
                  {viewingReturn.invoices?.invoice_date && (
                    <span className="text-[10px] text-slate-500 font-medium">({new Date(viewingReturn.invoices.invoice_date).toLocaleDateString()})</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Customer Name</span>
                  <span className="font-bold text-slate-900 block">{viewingReturn.customers?.customer_name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">GST: {viewingReturn.customers?.gst_no || 'Unregistered / B2C'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Return Date</span>
                  <span className="font-bold text-slate-900 block">{new Date(viewingReturn.return_date).toLocaleDateString()}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Returned Via</span>
                  <span className="font-bold text-slate-900 block">{viewingReturn.return_through}</span>
                  <span className="text-[10px] text-slate-500 truncate block">
                    {viewingReturn.return_through === 'DIRECT'
                      ? (viewingReturn.return_employee?.name || 'Staff')
                      : (viewingReturn.courier_name || 'Courier')}
                  </span>
                </div>
              </div>

              {/* Reason */}
              {viewingReturn.reason && (
                <div className="text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Reason for Return:</span>
                  <p className="mt-1 font-medium text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {viewingReturn.reason}
                  </p>
                </div>
              )}

              {/* Line Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-500">Returned Line Items</h4>
                <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 whitespace-nowrap w-10">#</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">Product Name</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">HSN Code</th>
                        <th className="px-3 py-2.5 whitespace-nowrap text-center">Qty</th>
                        <th className="px-3 py-2.5 whitespace-nowrap text-right">Rate (₹)</th>
                        <th className="px-3 py-2.5 whitespace-nowrap text-right">Taxable Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingReturn.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-semibold text-slate-400 whitespace-nowrap">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{item.finished_products?.product_name || 'Returned Product'}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap">{item.finished_products?.hsn_code || '392011'}</td>
                          <td className="px-3 py-2.5 text-center font-bold whitespace-nowrap">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">₹ {Number(item.rate).toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-black text-slate-900 whitespace-nowrap">₹ {Number(item.value || (item.quantity * item.rate)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-full max-w-xs bg-rose-50/60 border border-rose-100 p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal (Assessable Value):</span>
                    <span className="font-bold text-slate-900">₹ {Number(viewingReturn.total_return_value || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 border-b border-rose-200/60 pb-2">
                    <span>Est. GST Tax (18%):</span>
                    <span className="font-bold text-slate-900">₹ {Number(((Number(viewingReturn.total_return_value || 0) * 18) / 100).toFixed(2)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center font-black text-rose-700 text-sm pt-1">
                    <span>Total Credit Note Value:</span>
                    <span>₹ {Number((Number(viewingReturn.total_return_value || 0) * 1.18).toFixed(2)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => handleDownloadCreditNotePdf(viewingReturn, qrCodeDataUrl)}
                className="gap-2 border-slate-300 hover:bg-white text-slate-700 font-bold text-xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-rose-600" /> Download Credit Note PDF
              </Button>

              <Button
                onClick={() => setViewingReturn(null)}
                className="px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-8 h-8 md:w-10 md:h-10 p-1.5 bg-rose-50 text-rose-500 rounded-lg shrink-0" />
            <span className="truncate">Sales Returns</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Handle product returns, quality issues, and credit notes.</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className={`h-11 px-6 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none font-bold ${showForm ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200"}`}
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? "Cancel Return" : "Process New Return"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-rose-100 shadow-2xl overflow-hidden">
          <CardHeader className="bg-rose-50 border-b py-6">
            <CardTitle className="text-rose-700 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" /> New Return Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 md:px-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-8 px-6 md:px-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Return Date *</label>
                  <Input type="date" value={formData.return_date} onChange={e => setFormData({ ...formData, return_date: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Link Invoice / Customer *</label>
                  <select
                    value={formData.invoice_id || ''}
                    onChange={e => { handleInvoiceSelect(e.target.value); if (errors.customer_id) setErrors(prev => { const { ['customer_id']: _, ...r } = prev; return r; }); }}
                    className={`w-full flex h-10 rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-colors ${errors.customer_id ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-50' : 'border-slate-200'}`}
                  >
                    <option value="">Select Invoice...</option>
                    {invoices.map(i => (
                      <option key={i.id} value={i.id}>{i.invoice_number}{i.einvoice_ack_no ? ` (e-Inv ${i.einvoice_ack_no})` : ''} - {i.customers?.customer_name}</option>
                    ))}
                  </select>
                  {errors.customer_id && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">{errors.customer_id}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Return Through</label>
                  <select
                    value={formData.return_through || 'DIRECT'}
                    onChange={(e) => { setFormData({ ...formData, return_through: e.target.value, return_employee_id: '', courier_name: '' }); setErrors({}); }}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="DIRECT">Direct (via Marketing/Delivery Employee)</option>
                    <option value="COURIER">Courier / Transport</option>
                  </select>
                </div>

                {formData.return_through === 'DIRECT' ? (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Employee Name *</label>
                    <select
                      value={formData.return_employee_id || ''}
                      onChange={(e) => { setFormData({ ...formData, return_employee_id: e.target.value }); if (errors.return_employee_id) setErrors(prev => { const { return_employee_id: _, ...r } = prev; return r; }); }}
                      className={`w-full h-10 rounded-md border text-sm shadow-sm ${errors.return_employee_id ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-50' : 'border-slate-200'}`}
                    >
                      <option value="">Select Employee...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                    {errors.return_employee_id && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">{errors.return_employee_id}</p>}
                  </div>
                ) : (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Courier / Transport Name *</label>
                    <Input
                      placeholder="E.g. DTDC, Hand carry..."
                      value={formData.courier_name}
                      onChange={e => { setFormData({ ...formData, courier_name: e.target.value }); if (errors.courier_name) setErrors(prev => { const { courier_name: _, ...r } = prev; return r; }); }}
                      className={errors.courier_name ? 'border-rose-500 bg-rose-50/50' : ''}
                    />
                    {errors.courier_name && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">{errors.courier_name}</p>}
                  </div>
                )}

                <div className="space-y-1.5 md:col-span-4">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Return Remarks (Reason) *</label>
                  <Input
                    placeholder="E.g. Damaged during transit, incorrect size..."
                    value={formData.reason}
                    onChange={e => { setFormData({ ...formData, reason: e.target.value }); if (errors.reason) setErrors(prev => { const { reason: _, ...r } = prev; return r; }); }}
                    className={errors.reason ? 'border-rose-500 bg-rose-50/50' : ''}
                  />
                  {errors.reason && <p className="text-[9px] text-rose-500 font-bold px-1 mt-0.5">{errors.reason}</p>}
                </div>
              </div>

              {formData.invoice_id && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-5">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-bold text-blue-900 border-b border-blue-200 pb-2">Original Invoice Details</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(() => {
                        if (!selectedInvoice) return null;
                        return (
                          <>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Customer</span><span className="text-sm font-bold text-blue-900">{selectedInvoice.customers?.customer_name}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Invoice Date</span><span className="text-sm font-bold text-blue-900">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Order Ref</span><span className="text-sm font-bold text-blue-900">{selectedInvoice.orders?.order_number || 'N/A'}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Billed Total Value</span><span className="text-sm font-bold text-blue-900">₹ {selectedInvoice.net_amount?.toLocaleString() || '0'}</span></div>
                          </>
                        )
                      })()}
                    </div>
                    {/* Credit Note Info Banner */}
                    {selectedInvoiceHasEInvoice ? (
                      <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="text-xs font-semibold text-emerald-800">
                          This invoice has an e-Invoice (IRN). A <span className="font-black">Credit Note (CRN)</span> will be auto-generated on saving this return.
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div className="text-xs font-semibold text-amber-800">
                          Original invoice has no e-Invoice IRN. Credit Note will not be generated.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black uppercase text-slate-500">Returned Products</label>
                </div>
                <div className="bg-rose-50/30 border border-rose-100 rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-sm">
                    <thead className="bg-rose-100/50 border-b border-rose-100">
                      <tr>
                        <th className="px-4 py-3 text-left">Returned Item *</th>
                        <th className="px-4 py-3 text-center w-32">Quantity *</th>
                        <th className="px-4 py-3 text-center w-32">Rate (₹) *</th>
                        <th className="px-4 py-3 text-right w-40">Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      {formData.items.map((item, index) => (
                        <tr key={index} className="bg-white hover:bg-rose-50">
                          <td className="p-4">
                            <select
                              value={item.product_id || ''}
                              onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                              className="w-full h-9 bg-transparent border-none text-sm focus:ring-0 cursor-pointer"
                            >
                              <option value="">Choose Product...</option>
                              {(() => {
                                const selInv = invoices.find(i => i.id === formData.invoice_id);
                                const invoiceProductIds = selInv?.items?.map((ii: any) => ii.product_id).filter(Boolean) || [];
                                const availableProducts = (invoiceProductIds.length > 0)
                                  ? products.filter(p => invoiceProductIds.includes(p.id))
                                  : products;
                                return availableProducts.map(p => (
                                  <option key={p.id} value={p.id}>{p.product_name}</option>
                                ));
                              })()}
                            </select>
                          </td>
                          <td className="p-4"><Input type="number" value={item.quantity === 0 ? '' : item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="border-none text-center" /></td>
                          <td className="p-4"><Input type="number" value={item.rate === 0 ? '' : item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className="border-none text-center" /></td>
                          <td className="p-4 text-right font-black">₹ {(item.value || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 md:flex justify-between items-center border-t border-rose-100 pt-6">
                <div className="text-slate-500 font-medium italic">Return will be credited to customer account.</div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-rose-400 uppercase">Total Return Value</div>
                    <div className="text-2xl font-black text-rose-600">₹ {totalValue.toLocaleString()}</div>
                  </div>
                  <Button type="submit" className="gap-2 px-10 h-12 text-base font-bold shadow-xl bg-rose-600 hover:bg-rose-800">
                    <Save className="w-5 h-5" /> Save Return
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Return History"
          description="Log of all customer returns with Credit Note (e-Invoice) status."
          headers={['Return No', 'Req. Date', 'Customer', 'Return Through', 'Total Value', 'Credit Note', 'Actions']}
          data={returns}
          loading={loading}
          searchFields={['return_number', 'customers.customer_name', 'invoices.invoice_number', 'invoices.einvoice_ack_no', 'invoices.einvoice_irn']}
          renderRow={(ret: any) => (
            <tr key={ret.id} className="hover:bg-rose-50 transition-all border-b last:border-0">
              <td className="px-6 py-4 font-mono font-black text-rose-600">
                <button
                  type="button"
                  onClick={() => setViewingReturn(ret)}
                  className="text-left hover:underline cursor-pointer group flex items-center gap-1.5"
                  title="Click to view Credit Note Details"
                >
                  <span>{ret.return_number}</span>
                  <Eye className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-600 transition-colors" />
                </button>
                <div className="text-[10px] font-medium text-slate-400">Inv: {ret.invoices?.invoice_number || 'N/A'}</div>
                {ret.invoices?.einvoice_ack_no && (
                  <div className={`text-[10px] font-medium ${ret.invoices.einvoice_status === 'CANCELLED' ? 'text-rose-500' : 'text-emerald-600'}`}>
                    e-Inv: {ret.invoices.einvoice_ack_no}{ret.invoices.einvoice_status === 'CANCELLED' ? ' (cancelled)' : ''}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-xs font-semibold">{new Date(ret.return_date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-bold">{ret.customers?.customer_name}</td>
              <td className="px-6 py-4">
                <div className="text-xs font-bold text-slate-700">{ret.return_through}</div>
                <div className="text-[10px] text-slate-500 uppercase">{ret.return_through === 'DIRECT' ? ret.return_employee?.name || 'Unassigned' : ret.courier_name || 'N/A'}</div>
              </td>
              <td className="px-6 py-4 font-black">₹ {ret.total_return_value?.toLocaleString()}</td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1.5">
                  <CreditNoteBadge
                    status={ret.credit_note_status}
                    irn={ret.credit_note_irn}
                    onClick={() => setViewingReturn(ret)}
                  />
                  {/* Show retry button if invoice had e-invoice but CRN failed */}
                  {ret.invoices?.einvoice_irn && ret.credit_note_status !== 'GENERATED' && ret.credit_note_status !== 'NOT_APPLICABLE' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateCreditNote(ret)}
                      disabled={crnLoading === ret.id}
                      className="h-6 px-2 text-[10px] font-bold text-violet-700 border border-violet-200 hover:bg-violet-50 w-fit cursor-pointer"
                    >
                      {crnLoading === ret.id
                        ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                        : <><RefreshCw className="w-3 h-3 mr-1" /> Retry CRN</>
                      }
                    </Button>
                  )}
                  {/* Show Generate button if invoice has e-invoice but no CRN attempt yet */}
                  {ret.invoices?.einvoice_irn && !ret.credit_note_status && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateCreditNote(ret)}
                      disabled={crnLoading === ret.id}
                      className="h-6 px-2 text-[10px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 w-fit cursor-pointer"
                    >
                      {crnLoading === ret.id
                        ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                        : <><FileText className="w-3 h-3 mr-1" /> Gen CRN</>
                      }
                    </Button>
                  )}
                </div>
              </td>
              <td className="px-2 py-4">
                <div className="flex justify-end items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingReturn(ret)}
                    title="View Credit Note / Return Details"
                    className="h-8 px-2.5 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" /> View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(ret)} title="Edit Return" className="h-8 w-8 p-0 text-primary border cursor-pointer"><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(ret.id)} title="Delete Return" className="h-8 w-8 p-0 text-rose-600 border cursor-pointer"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}
