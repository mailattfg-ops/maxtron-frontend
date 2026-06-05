'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { TableView } from '@/components/ui/table-view';
import {
  ShoppingCart, TrendingUp, Download, Calendar,
  IndianRupee, Package, Truck, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { exportToExcel } from '@/utils/export';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function PurchaseReportPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [companyState, setCompanyState] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { info } = useToast();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  useEffect(() => {
    fetchReport();
  }, []);

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
        // Capture company's registered state for GST type determination
        const companyAddr = (activeCo?.addresses || []).find((a: any) => a.address_type === 'registered' || a.address_type === 'billing') || (activeCo?.addresses || [])[0];
        if (companyAddr?.state) {
          setCompanyState(companyAddr.state.trim().toLowerCase());
        }
      }

      const [purchaseRes, supplierRes] = await Promise.all([
        fetch(`${API_BASE}/api/maxtron/purchase-entries?company_id=${coId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/maxtron/suppliers?company_id=${coId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const purchaseData = await purchaseRes.json();
      const supplierData = await supplierRes.json();

      if (purchaseData.success) setPurchases(purchaseData.data);
      if (supplierData.success) setSuppliers(supplierData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: determine GST type for a given supplier_id
  const getGstType = (supplierId: string): 'IGST' | 'CGST_SGST' | 'UNKNOWN' => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const billingState = supplier?.billing_addr_data?.state?.trim().toLowerCase() || '';
    if (!billingState || !companyState) return 'UNKNOWN';
    return billingState !== companyState ? 'IGST' : 'CGST_SGST';
  };

  const filtered = purchases.filter(p => {
    if (dateFrom && new Date(p.entry_date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(p.entry_date) > new Date(dateTo)) return false;
    return true;
  });

  const totalValue = filtered.reduce((acc, p) => {
    const items = p.purchase_entry_items || [];
    return acc + items.reduce((a: number, i: any) => a + Number(i.amount || 0), 0);
  }, 0);

  const totalQty = filtered.reduce((acc, p) => {
    const items = p.purchase_entry_items || [];
    return acc + items.reduce((a: number, i: any) => a + Number(i.received_quantity || 0), 0);
  }, 0);

  const totalGstAll = filtered.reduce((acc, p) => {
    const items = p.purchase_entry_items || [];
    return acc + items.reduce((a: number, i: any) => a + Number(i.gst_amount || 0), 0);
  }, 0);

  const downloadCSV = async () => {
    if (filtered.length === 0) { info('No data to export.'); return; }

    const formatDate = (dateStr: any) => {
      if (!dateStr || dateStr === 'null') return 'N/A';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      } catch (e) { return dateStr; }
    };

    const rows = filtered.flatMap(p => {
      const formattedDate = formatDate(p.entry_date);
      const gstType = getGstType(p.supplier_id);

      return (p.purchase_entry_items || []).map((item: any) => {
        const baseAmount = Number(item.amount || 0);
        const gstAmount = Number(item.gst_amount || 0);
        const totalLine = baseAmount + gstAmount;
        const cgst = gstType === 'CGST_SGST' ? (gstAmount / 2) : 0;
        const sgst = gstType === 'CGST_SGST' ? (gstAmount / 2) : 0;
        const igst = gstType === 'IGST' ? gstAmount : 0;

        return [
          p.entry_number || '',
          formattedDate,
          p.supplier_master?.supplier_name || '',
          p.invoice_number || '',
          item.raw_materials?.rm_name || '',
          item.raw_materials?.hsn_code || '',
          Number(item.ordered_quantity || 0),
          Number(item.received_quantity || 0),
          Number(item.rate || 0),
          Number(item.gst_percent || 0),
          baseAmount,
          cgst,
          sgst,
          igst,
          gstAmount,
          totalLine,
          gstType === 'IGST' ? 'Inter-State (IGST)' : gstType === 'CGST_SGST' ? 'Intra-State (CGST+SGST)' : '—'
        ];
      });
    });

    const headers = [
      'GRN No', 'Date', 'Supplier', 'Invoice No', 'Material', 'HSN Code',
      'Ordered Qty', 'Received Qty', 'Rate (₹)', 'GST %',
      'Base Amount (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total GST (₹)', 'Total Amount (₹)',
      'GST Type'
    ];

    await exportToExcel({
      headers,
      rows,
      filename: `purchase_report_${activeTenant.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Purchase Report'
    });
    info('Purchase report exported.');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Purchase History</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Detailed breakdown of all procurement and intake entries (GRN).</p>
        </div>
        <div className="flex items-center w-full md:w-auto">
          <Button onClick={downloadCSV} className="w-full md:w-auto bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg font-bold h-11 transition-all active:scale-95 whitespace-nowrap">
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 md:p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total GRNs</p>
              <h3 className="text-xl md:text-3xl font-black text-primary mt-1">{filtered.length}</h3>
            </div>
            <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 md:p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Intake</p>
              <h3 className="text-xl md:text-2xl font-black text-emerald-600 mt-1">{totalQty.toLocaleString()}</h3>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-xl shrink-0">
              <Package className="w-5 h-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 md:p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Purchase Value</p>
              <h3 className="text-lg md:text-xl font-black text-slate-900 mt-1">₹ {totalValue.toLocaleString()}</h3>
            </div>
            <div className="bg-slate-100 p-2.5 rounded-xl shrink-0">
              <IndianRupee className="w-5 h-5 text-slate-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 md:p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Vendors</p>
              <h3 className="text-xl md:text-3xl font-black text-blue-600 mt-1">
                {new Set(filtered.map(p => p.supplier_id)).size}
              </h3>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-xl shrink-0">
              <Truck className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-primary/10 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">From Date</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 w-full rounded-full text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">To Date</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 w-full rounded-full text-xs" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => fetchReport()} className="flex-1 bg-slate-900 text-white h-10 rounded-full text-xs font-bold">Apply Range</Button>
            <Button variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); }} className="h-10 rounded-full px-4 text-xs font-bold border-slate-200">
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <TableView
        title="Purchase Entry Log"
        description="All GRN entries with itemised material breakdown including GST split."
        headers={['GRN / Date', 'Supplier', 'Invoice', 'Materials', 'Total Value', 'Details']}
        data={filtered}
        loading={loading}
        searchFields={['entry_number', 'invoice_number']}
        searchPlaceholder="Search GRN or Invoice..."
        renderRow={(p: any) => {
          const gstType = getGstType(p.supplier_id);
          const entryTotalGst = (p.purchase_entry_items || []).reduce((a: number, i: any) => a + Number(i.gst_amount || 0), 0);
          const entryBaseTotal = (p.purchase_entry_items || []).reduce((a: number, i: any) => a + Number(i.amount || 0), 0);

          return (
            <>
              <tr key={p.id} className="hover:bg-primary/5 transition-all border-b border-slate-50 last:border-none">
                <td className="px-6 py-4">
                  <div className="font-black text-slate-800 text-[13px]">{p.entry_number}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center mt-0.5">
                    <Calendar className="w-2.5 h-2.5 mr-1" /> {new Date(p.entry_date).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-700">{p.supplier_master?.supplier_name}</div>
                  <div className="text-[10px] font-mono text-slate-400">{p.supplier_master?.supplier_code}</div>
                  {gstType !== 'UNKNOWN' && (
                    <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                      gstType === 'IGST'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {gstType === 'IGST' ? '⚡ IGST' : '✓ CGST+SGST'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-600">{p.invoice_number || '—'}</div>
                  {p.invoice_date && <div className="text-[10px] text-slate-400">{new Date(p.invoice_date).toLocaleDateString()}</div>}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-black text-primary">{p.purchase_entry_items?.length || 0} {p.purchase_entry_items?.length === 1 ? 'Item' : 'Items'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {p.purchase_entry_items?.map((i: any) => i.raw_materials?.rm_name).filter(Boolean).join(', ')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-black text-slate-900">
                    ₹ {(entryBaseTotal + entryTotalGst).toLocaleString()}
                  </div>
                  {entryTotalGst > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {gstType === 'IGST' ? (
                        <div className="text-[10px] font-bold text-amber-600">
                          IGST: ₹ {entryTotalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      ) : gstType === 'CGST_SGST' ? (
                        <>
                          <div className="text-[10px] font-bold text-blue-600">
                            CGST: ₹ {(entryTotalGst / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] font-bold text-violet-600">
                            SGST: ₹ {(entryTotalGst / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="px-3 flex justify-end py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="h-8 rounded-full text-xs font-bold text-primary hover:bg-primary/10"
                  >
                    {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedId === p.id ? 'Hide' : 'Expand'}
                  </Button>
                </td>
              </tr>
              {expandedId === p.id && (
                <tr key={`${p.id}-details`} className="bg-primary/2">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase">Material</th>
                            <th className="px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase">HSN Code</th>
                            <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Ordered Qty</th>
                            <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Received Qty</th>
                            <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Rate (₹)</th>
                            <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Base Amt (₹)</th>
                            <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">GST %</th>
                            {gstType === 'IGST' ? (
                              <th className="px-4 py-2 text-right text-[10px] font-black text-amber-600 uppercase">IGST (₹)</th>
                            ) : (
                              <>
                                <th className="px-4 py-2 text-right text-[10px] font-black text-blue-600 uppercase">CGST (₹)</th>
                                <th className="px-4 py-2 text-right text-[10px] font-black text-violet-600 uppercase">SGST (₹)</th>
                              </>
                            )}
                            <th className="px-4 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(p.purchase_entry_items || []).map((item: any, idx: number) => {
                            const baseAmt = Number(item.amount || 0);
                            const gstAmt = Number(item.gst_amount || 0);
                            const totalAmt = baseAmt + gstAmt;
                            return (
                              <tr key={idx} className="bg-white hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-semibold text-slate-700">
                                  {item.raw_materials?.rm_name}
                                  <span className="ml-2 text-[10px] font-mono text-slate-400">{item.raw_materials?.rm_code}</span>
                                </td>
                                <td className="px-4 py-2.5 text-left text-slate-600">{item.raw_materials?.hsn_code || '—'}</td>
                                <td className="px-4 py-2.5 text-right text-slate-600">{Number(item.ordered_quantity || 0).toLocaleString()} {item.raw_materials?.unit_type}</td>
                                <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{Number(item.received_quantity || 0).toLocaleString()} {item.raw_materials?.unit_type}</td>
                                <td className="px-4 py-2.5 text-right text-slate-600">₹ {Number(item.rate || 0).toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right text-slate-600">₹ {baseAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-2.5 text-right text-slate-500 font-bold">{Number(item.gst_percent || 0)}%</td>
                                {gstType === 'IGST' ? (
                                  <td className="px-4 py-2.5 text-right font-bold text-amber-600">
                                    ₹ {gstAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                ) : (
                                  <>
                                    <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                                      ₹ {(gstAmt / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-violet-600">
                                      ₹ {(gstAmt / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </>
                                )}
                                <td className="px-4 py-2.5 text-right font-black text-slate-900">
                                  ₹ {totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* GST Summary Footer */}
                        {entryTotalGst > 0 && (
                          <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={gstType === 'IGST' ? 7 : 7} className="px-4 py-2.5 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                GST Summary
                              </td>
                              {gstType === 'IGST' ? (
                                <>
                                  <td className="px-4 py-2.5 text-right font-black text-amber-700">
                                    ₹ {entryTotalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-black text-slate-900">
                                    ₹ {(entryBaseTotal + entryTotalGst).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-2.5 text-right font-black text-blue-700">
                                    ₹ {(entryTotalGst / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-black text-violet-700">
                                    ₹ {(entryTotalGst / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-black text-slate-900">
                                    ₹ {(entryBaseTotal + entryTotalGst).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </>
                              )}
                            </tr>
                            <tr>
                              <td colSpan={gstType === 'IGST' ? 9 : 10} className="px-4 py-2 text-right">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                  gstType === 'IGST'
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}>
                                  {gstType === 'IGST' ? '⚡ Inter-State · IGST Applied' : '✓ Intra-State · CGST + SGST Applied'}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                      {p.remarks && (
                        <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 font-medium italic">
                          Remarks: {p.remarks}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          );
        }}
      />
    </div>
  );
}
