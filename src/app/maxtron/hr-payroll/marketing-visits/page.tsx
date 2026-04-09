'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, Briefcase, Calendar, Clock, Plus, Search, Edit, Trash2, X, Save, Building2, Quote, Download, ExternalLink, ArrowRight, Package, ChevronDown, ChevronUp, Eye, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';
import { exportToExcel } from '@/utils/export';
import { 
    Tag, 
    Megaphone, 
    Bell, 
    LayoutDashboard,
    ChevronRight,
    Star,
    Info,
    Clock3
} from 'lucide-react';

const MARKETING_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/marketing-visits`;
const OFFERS_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/marketing-offers`;
const ORDERS_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/orders`;
const EMPLOYEES_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/employees`;

export default function MarketingVisitsPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('hr_marketing_view', 'create');
  const canEdit = hasPermission('hr_marketing_view', 'edit');
  const canDelete = hasPermission('hr_marketing_view', 'delete');
  const [showForm, setShowForm] = useState(false);
  const [visitRecords, setVisitRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expandedQuotes, setExpandedQuotes] = useState<string[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [showOfferAdmin, setShowOfferAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true
  });


  const [dateFilter, setDateFilter] = useState(''); // Default to empty to show all records initially
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    employee_id: '',
    customer_id: '',
    customer_name: '',
    location: '',
    visit_date: new Date().toISOString().split('T')[0],
    time_in: '',
    time_out: '',
    purpose: '',
    outcome: '',
    feedback: '',
    company_id: '',
    is_quotation: false,
    quotation_items: [{ product_id: '', product_name: '', quantity: '', amount: '', gst_percent: '0' }],
    quotation_delivery_date: '',
    quotation_status: 'Pending'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      // Fetch Companies
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

      // Fetch Employees (Filter by Marketing/Sales types)
      const empRes = await fetch(EMPLOYEES_API, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const empData = await empRes.json();
      if (empData.success) {
        const maxtronEmps = empData.data.filter((e: any) => e.companies?.company_name?.toUpperCase() === activeTenant);
        // Filter specifically for Marketing roles if data supports it, otherwise keep Maxtron emps
        const marketingEmps = maxtronEmps.filter((e: any) => 
          e.categories?.category_name?.toLowerCase().includes('marketing') || 
          e.user_types?.name?.toLowerCase().includes('marketing') ||
          e.type?.toLowerCase().includes('marketing')
        );
        setEmployees(marketingEmps.length > 0 ? marketingEmps : maxtronEmps);
      }

      // Fetch Customers for the dropdown
      const custRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/customers?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const custData = await custRes.json();
      if (custData.success) {
        setCustomers(custData.data);
      }

      // Fetch Finished Products for Quotations (FG Stock Summary)
      const prodRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/inventory/fg-stock-summary?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const prodData = await prodRes.json();
      if (prodData.success) {
        setProducts(prodData.data);
      }

      fetchOffers(coId);
      fetchVisits(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addQuotationItem = () => {
    setFormData(prev => ({
      ...prev,
      quotation_items: [...prev.quotation_items, { product_id: '', product_name: '', quantity: '', amount: '', gst_percent: '0' }]
    }));
  };

  const removeQuotationItem = (index: number) => {
    if (formData.quotation_items.length <= 1) return;
    const newItems = [...formData.quotation_items];
    newItems.splice(index, 1);
    setFormData(prev => ({ ...prev, quotation_items: newItems }));
  };

  const updateQuotationItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.quotation_items];
    let updateValue = value;
    
    if (field === 'product_id') {
      const selectedProd = products.find(p => p.id === value);
      newItems[index] = { 
        ...newItems[index], 
        product_id: value, 
        product_name: selectedProd?.product_name || '' 
      };
    } else if (field === 'quantity') {
      newItems[index] = { ...newItems[index], [field]: value };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    setFormData(prev => ({ ...prev, quotation_items: newItems }));
  };

  const toggleQuoteExpand = (id: string) => {
    setExpandedQuotes(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const fetchOffers = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${OFFERS_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setOffers(data.data);
    } catch (err) {
      console.error('Error fetching offers:', err);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerForm.title) return error('Title is required');
    
    setSubmitting(true);
    try {
      const res = await fetch(OFFERS_API, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...offerForm, company_id: currentCompanyId })
      });
      const data = await res.json();
      if (data.success) {
        success('Offer posted successfully');
        setOfferForm({
            title: '',
            description: '',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            is_active: true
        });
        fetchOffers();
      }
    } catch (err) {
      error('Failed to post offer');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleOfferStatus = async (offer: any) => {
      try {
          const res = await fetch(`${OFFERS_API}/${offer.id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ is_active: !offer.is_active })
          });
          const data = await res.json();
          if (data.success) {
              success('Offer status updated');
              fetchOffers();
          }
      } catch (err) {
          error('Failed to update status');
      }
  };

  const deleteOffer = async (id: string) => {
    const isConfirmed = await confirm({
        title: 'Delete Offer',
        message: 'Are you sure you want to remove this announcement?',
        type: 'danger'
    });
    
    if (isConfirmed) {
        try {
            const res = await fetch(`${OFFERS_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                success('Offer deleted');
                fetchOffers();
            }
        } catch (err) {
            error('Failed to delete');
        }
    }
  };

  const handleEditOffer = (offer: any) => {
      // In a real scenario, you'd have a separate edit state, 
      // but for now let's just populate the form
      setOfferForm({
          title: offer.title,
          description: offer.description || '',
          start_date: offer.start_date ? offer.start_date.split('T')[0] : '',
          end_date: offer.end_date ? offer.end_date.split('T')[0] : '',
          is_active: offer.is_active
      });
      setShowOfferAdmin(true);
  };

  const fetchVisits = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${MARKETING_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setVisitRecords(data.data);
      }
    } catch (err) {
      console.error('Error fetching visits:', err);
    }
  };

  const saveVisit = async () => {
    if (!formData.employee_id || !formData.customer_name || !formData.visit_date) {
      error('Please fill customer and date.');
      return;
    }

    if (formData.time_in && formData.time_out) {
      if (formData.time_out <= formData.time_in) {
        error('Time Out must be strictly later than Time In.');
        return;
      }
    }

    if (formData.is_quotation && formData.quotation_status === 'Approved') {
      const lowStockItems = formData.quotation_items.filter(item => {
        const prod = products.find(p => p.id === item.product_id);
        return prod && Number(item.quantity) > Number(prod.balance);
      });
      
      if (lowStockItems.length > 0) {
        const itemNames = lowStockItems.map(i => i.product_name || 'Selected Product').join(', ');
        return error(`Inventory Alert: Cannot save as Approved. Low stock for ${itemNames}.`);
      }
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${MARKETING_API}/${editingId}` : MARKETING_API;

    const dataToSave = {
      ...formData,
      customer_id: formData.customer_id === '' ? null : formData.customer_id,
      employee_id: formData.employee_id === '' ? null : formData.employee_id,
      quotation_items: formData.is_quotation ? formData.quotation_items.map(item => ({
        ...item,
        quantity: item.quantity === '' ? null : Number(item.quantity),
        amount: item.amount === '' ? null : Number(item.amount),
        gst_percent: item.gst_percent === '' ? null : Number(item.gst_percent)
      })) : [],
      quotation_delivery_date: formData.quotation_delivery_date === '' ? null : formData.quotation_delivery_date
    };

    try {
      setSubmitting(true);
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSave)
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Visit updated!' : 'Visit saved!');
        
        // Automated Order Generation
        if (dataToSave.is_quotation && dataToSave.quotation_status === 'Approved') {
           if (dataToSave.customer_id) {
              generateOrderFromQuotation(dataToSave);
           } else {
              info('Quotation approved but no order created (Customer not linked).');
           }
        }

        setShowForm(false);
        setEditingId(null);
        fetchVisits();
        resetForm();
      } else {
        error(data.message || 'Transmission error');
      }
    } catch (err) {
      console.error('Error saving visit:', err);
      error('An error occurred while saving the visit.');
    } finally {
      setSubmitting(false);
    }
  };


  const generateOrderFromQuotation = async (qData: any) => {
    const token = localStorage.getItem('token');
    try {
        const taxableTotal = qData.quotation_items.reduce((sum: number, i: any) => sum + (Number(i.quantity) * Number(i.amount)), 0);
        const taxTotal = qData.quotation_items.reduce((sum: number, i: any) => {
           const taxable = Number(i.quantity) * Number(i.amount);
           const gst = Number(i.gst_percent) || 0;
           return sum + (taxable * gst / 100);
        }, 0);

        const orderPayload = {
            company_id: qData.company_id,
            customer_id: qData.customer_id,
            executive_id: qData.employee_id,
            order_date: new Date().toISOString().split('T')[0],
            total_value: taxableTotal,
            tax_amount: taxTotal,
            net_amount: taxableTotal + taxTotal,
            remarks: `Auto-generated from Approved Quotation (${qData.customer_name})`,
            items: qData.quotation_items.map((item: any) => {
                const taxable = Number(item.quantity) * Number(item.amount);
                const gstRate = Number(item.gst_percent) || 0;
                const gstAmt = (taxable * gstRate / 100);
                return {
                    product_id: item.product_id,
                    quantity: Number(item.quantity),
                    rate: Number(item.amount),
                    gst_percent: gstRate,
                    gst_amount: gstAmt,
                    total_value: taxable
                };
            })
        };

        const res = await fetch(ORDERS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderPayload)
        });
        const data = await res.json();
        if (data.success) {
            success('Sales Order created automatically!');
        } else {
            error('Quotation approved but Order creation failed: ' + data.message);
        }
    } catch (err) {
        console.error('Auto-order failed:', err);
    }
  };


  const resetForm = () => {
    setFormData({
      employee_id: '',
      customer_id: '',
      customer_name: '',
      location: '',
      visit_date: new Date().toISOString().split('T')[0],
      time_in: '',
      time_out: '',
      purpose: '',
      outcome: '',
      feedback: '',
      company_id: currentCompanyId,
      is_quotation: false,
      quotation_items: [{ product_id: '', product_name: '', quantity: '', amount: '', gst_percent: '0' }],
      quotation_delivery_date: '',
      quotation_status: 'Pending'
    });
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      employee_id: rec.employee_id,
      customer_id: rec.customer_id || '',
      customer_name: rec.customer_name,
      location: rec.location || '',
      visit_date: rec.visit_date ? rec.visit_date.split('T')[0] : new Date().toISOString().split('T')[0],
      time_in: rec.time_in || '',
      time_out: rec.time_out || '',
      purpose: rec.purpose || '',
      outcome: rec.outcome || '',
      feedback: rec.feedback || '',
      company_id: rec.company_id,
      is_quotation: rec.is_quotation || false,
      quotation_items: rec.quotation_items?.length > 0 
        ? rec.quotation_items.map((i: any) => ({
            product_id: i.product_id || '',
            product_name: i.product_name || i.product || '',
            quantity: i.quantity || '',
            amount: i.amount || '',
            gst_percent: i.gst_percent !== undefined ? String(i.gst_percent) : '0'
          })) 
        : [{ product_id: '', product_name: '', quantity: '', amount: '', gst_percent: '0' }],
      quotation_delivery_date: rec.quotation_delivery_date ? rec.quotation_delivery_date.split('T')[0] : '',
      quotation_status: rec.quotation_status || 'Pending'
    });
    setShowForm(true);
  };

  const downloadVisitList = async () => {
    const activeRecords = visitRecords.filter(rec => !dateFilter || (rec.visit_date && rec.visit_date.startsWith(dateFilter)));
    if (activeRecords.length === 0) {
      info('No visit records found to export.');
      return;
    }

    const headers = ['Staff', 'Client', 'Location', 'Date', 'Time In', 'Time Out', 'Purpose', 'Outcome', 'Feedback', 'Quotation', 'Status', 'Q. Items', 'Q. Delivery'];
    const rows = activeRecords.map(rec => {
      const formatDate = (dateStr: any) => {
        if (!dateStr || dateStr === 'null') return 'N/A';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        } catch (e) { return dateStr; }
      };

      return [
        rec.users?.name || 'N/A',
        rec.customer_name || 'N/A',
        rec.location || 'N/A',
        formatDate(rec.visit_date),
        rec.time_in || 'N/A',
        rec.time_out || 'N/A',
        rec.purpose || '',
        rec.outcome || '',
        rec.feedback || '',
        rec.is_quotation ? 'YES' : 'NO',
        rec.quotation_status || 'N/A',
        rec.quotation_items?.map((i: any) => `${i.product_name || i.product} (Qty: ${i.quantity}, Amt: ${i.amount}, GST: ${i.gst_percent}%)`).join('; ') || '',
        formatDate(rec.quotation_delivery_date)
      ];
    });

    await exportToExcel({
      headers,
      rows,
      filename: `marketing_visits_${activeTenant.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Marketing Visits'
    });

    success('Detailed visit list exported successfully!');
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this visit report?',
      type: 'danger'
    });
    if (!isConfirmed) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${MARKETING_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Log removed.');
        fetchVisits();
      }
    } catch (err) {
      error('Elimination failed.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="space-y-6">
        {/* Dynamic Offer Announcements Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className={`col-span-1 lg:col-span-8 ${(offers.filter(o => o.is_active).length === 0 || showOfferAdmin) ? 'hidden' : ''}`}>
                <Card className="border-none shadow-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white overflow-hidden relative group">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] group-hover:bg-primary/30 transition-all duration-1000" />
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
                    <CardHeader className="relative z-10 pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Megaphone className="w-6 h-6 animate-bounce" /> Active Offers & Schemes
                            </CardTitle>
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Live Now</span>
                        </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="grid md:flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                           {offers.filter(o => o.is_active).slice(0, 2).map((offer, idx) => (
                               <div key={idx} className="min-w-[270px] bg-white/10 backdrop-blur-2xl rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-all cursor-default">
                                   <div className="flex items-start justify-between mb-3">
                                       <div className="p-2 bg-white/20 rounded-lg">
                                           <Tag className="w-5 h-5 text-white" />
                                       </div>
                                       {offer.end_date && (
                                           <div className="text-[9px] font-bold bg-rose-500/80 px-2 py-0.5 rounded text-white uppercase tracking-tighter">
                                               Ends: {new Date(offer.end_date).toLocaleDateString()}
                                           </div>
                                       )}
                                   </div>
                                   <h4 className="text-lg font-black mb-1 line-clamp-1">{offer.title}</h4>
                                   <p className="text-sm text-white/80 line-clamp-2 leading-relaxed mb-4">{offer.description}</p>
                                   <div 
                                       onClick={() => setSelectedOffer(offer)}
                                       className="flex items-center gap-2 text-[10px] font-black text-white/60 group/btn cursor-pointer"
                                   >
                                       SEE DETAILS <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                                   </div>
                               </div>
                           ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className={`col-span-1 lg:col-span-4 border-none shadow-xl bg-white overflow-hidden relative ${(offers.filter(o => o.is_active).length === 0 || showOfferAdmin) ? 'lg:col-span-12' : ''}`}>
               <div className="absolute top-0 right-0 p-4">
                  <Bell className="w-12 h-12 text-slate-50 opacity-10 rotate-12" />
               </div>
               <CardHeader className="py-5">
                   <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black text-slate-900">Marketing Hub</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary">Announcement Console</CardDescription>
                        </div>
                        {hasPermission('marketing_view', 'edit') && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowOfferAdmin(!showOfferAdmin)}
                                className={`h-8 rounded-lg font-black text-[10px] uppercase border transition-all gap-1.5 ${showOfferAdmin ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-primary/5 text-primary border-primary/10'}`}
                            >
                                {showOfferAdmin ? (
                                    <> <X className="w-3.5 h-3.5" /> Close Panel </>
                                ) : (
                                    <> <Plus className="w-3.5 h-3.5" /> Add Offer </>
                                )}
                            </Button>
                        )}
                   </div>
               </CardHeader>
               <CardContent>
                   {!showOfferAdmin ? (
                      <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                               <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                   <LayoutDashboard className="w-5 h-5 text-primary" />
                               </div>
                               <div>
                                   <p className="text-xs font-bold text-slate-800">Visit Analytics</p>
                                   <p className="text-[10px] text-slate-400 font-medium">Tracking {visitRecords.length} activities</p>
                               </div>
                               <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                                  <p className="text-[8px] font-bold text-emerald-400 uppercase">Quotes</p>
                                  <p className="text-sm font-black text-emerald-700">{visitRecords.filter(v => v.is_quotation).length}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                                  <p className="text-[8px] font-bold text-blue-400 uppercase">Avg. GST</p>
                                  <p className="text-sm font-black text-blue-700">18%</p>
                              </div>
                          </div>
                      </div>
                   ) : (
                      <div className="space-y-6 animate-in slide-in-from-right duration-300">
                          <form onSubmit={handleCreateOffer} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Offer Title</label>
                                  <Input 
                                    placeholder="e.g. Festival Season Bonus"
                                    value={offerForm.title}
                                    onChange={e => setOfferForm({...offerForm, title: e.target.value})}
                                    className="h-9 text-sm bg-white"
                                  />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Start Date</label>
                                      <Input type="date" value={offerForm.start_date} onChange={e => setOfferForm({...offerForm, start_date: e.target.value})} className="h-9 text-xs bg-white" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Expiry Date</label>
                                      <Input type="date" value={offerForm.end_date} onChange={e => setOfferForm({...offerForm, end_date: e.target.value})} className="h-9 text-xs bg-white" />
                                  </div>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Detailed Description</label>
                                  <Input 
                                    placeholder="Brief details about the scheme..."
                                    value={offerForm.description}
                                    onChange={e => setOfferForm({...offerForm, description: e.target.value})}
                                    className="h-9 text-sm bg-white"
                                  />
                              </div>
                              <Button type="submit" loading={submitting} className="w-full h-10 font-bold bg-primary text-white shadow-lg shadow-primary/20">
                                  Post New Offer
                              </Button>
                          </form>

                          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                               {offers.map((o, idx) => (
                                   <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-primary/20 transition-all">
                                       <div className="min-w-0">
                                           <h5 className="text-xs font-bold text-slate-800 truncate">{o.title}</h5>
                                           <div className="flex items-center gap-2 mt-1">
                                               <span className={`w-1.5 h-1.5 rounded-full ${o.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Status: {o.is_active ? 'Active' : 'Halted'}</span>
                                           </div>
                                       </div>
                                       <div className="flex items-center gap-1.5">
                                           <button onClick={() => toggleOfferStatus(o)} className="p-1.5 text-slate-400 hover:text-primary"><Star className={`w-3.5 h-3.5 ${o.is_active ? 'fill-primary text-primary' : ''}`} /></button>
                                           <button onClick={() => deleteOffer(o.id)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                       </div>
                                   </div>
                               ))}
                          </div>
                      </div>
                   )}
               </CardContent>
            </Card>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10 relative overflow-hidden">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading" id="page-title">Marketing Operations</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">Field staff tracking, client visit logs, and outcome analysis.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* {!showForm && (
            <Button onClick={downloadVisitList} variant="outline" className="border-secondary text-secondary hover:bg-secondary/5 hidden md:flex rounded-full px-5 h-10 shadow-sm transition-all hover:scale-105 active:scale-95">
               <Download className="w-4 h-4 mr-2" /> Download Visit List
            </Button>
          )} */}
          {canCreate && (
            <Button 
              onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
              className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg shadow-primary/20 h-10 transition-all active:scale-95 w-full md:w-auto flex-1 md:flex-none"
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Cancel Entry' : 'New Field Visit'}
            </Button>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6 md:my-10 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Visits</p>
                  <h3 className="text-2xl md:text-3xl font-black text-primary mt-1">{visitRecords.length}</h3>
                </div>
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-600">
                <TrendingUp className="w-3 h-3 mr-1" /> <span>Activity tracked successfully</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Unique Clients</p>
                  <h3 className="text-2xl md:text-3xl font-black text-blue-600 mt-1">
                    {new Set(visitRecords.map(r => r.customer_name)).size}
                  </h3>
                </div>
                <div className="bg-blue-50 p-3 rounded-2xl">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground font-medium italic">Active pipeline outreach</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Top Performer</p>
                  <h3 className="text-lg font-black text-emerald-600 mt-1 truncate max-w-[150px]">
                    {(() => {
                      if (visitRecords.length === 0) return 'N/A';
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
                      const scores = visitRecords.reduce((acc: any, curr) => {
                        const name = curr.users?.name || 'Unknown';
                        const score = weights[curr.outcome] || 0;
                        acc[name] = (acc[name] || 0) + score;
                        return acc;
                      }, {});
                      const top = Object.entries(scores).sort((a: any, b: any) => b[1] - a[1])[0];
                      return top ? top[0] : 'N/A';
                    })()}
                  </h3>
                </div>
                <div className="bg-emerald-50 p-3 rounded-2xl">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground font-medium italic">Based on conversion & success rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card className="border-primary/20 shadow-xl animate-in slide-in-from-right duration-500 !mt-6 ">
          <CardHeader className="bg-primary/5 border-b border-primary/10 pt-6 rounded-2xl">
            <CardTitle>{editingId ? 'Edit Visit Details' : 'Record Field Visit'}</CardTitle>
            <CardDescription>Log time of entry, exit, and visit outcome.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                   Field Staff
                </label>
                <Select 
                  value={formData.employee_id}
                  onValueChange={(val) => setFormData({...formData, employee_id: val})}
                >
                  <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                    <SelectValue placeholder="Select staff..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                  <Building2 className="w-4 h-4 mr-2 text-primary" /> Customer / Company
                </label>
                <Select 
                  value={formData.customer_name}
                  onValueChange={(val) => {
                    const selectedCust = customers.find(c => c.customer_name === val);
                    setFormData({
                      ...formData, 
                      customer_name: val,
                      customer_id: selectedCust?.id || ''
                    });
                  }}
                >
                  <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {customers.map(cust => (
                      <SelectItem key={cust.id} value={cust.customer_name}>{cust.customer_name} ({cust.customer_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                   Location
                </label>
                <Input 
                  placeholder="Area / GPS Location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-primary" /> Date
                </label>
                <Input 
                  type="date"
                  value={formData.visit_date}
                  onChange={(e) => setFormData({...formData, visit_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary" /> Time In
                </label>
                <Input 
                  type="time"
                  value={formData.time_in}
                  onChange={(e) => setFormData({...formData, time_in: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary" /> Time Out
                </label>
                <Input 
                  type="time"
                  value={formData.time_out}
                  onChange={(e) => setFormData({...formData, time_out: e.target.value})}
                />
              </div>

              <div className="space-y-2 md:col-span-1 lg:col-span-1">
                <label className="text-sm font-semibold text-foreground/80">Purpose of Visit</label>
                <textarea 
                  className="w-full h-24 p-2.5 rounded-md border border-input text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                  placeholder="Sales pitch, follow-up, payment collection..."
                  value={formData.purpose}
                  maxLength={50}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80">Visit Outcome</label>
                <Select 
                  value={formData.outcome}
                  onValueChange={(val) => setFormData({...formData, outcome: val})}
                >
                  <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Initial Contact">Initial Contact</SelectItem>
                    <SelectItem value="Product Demo">Product Demo</SelectItem>
                    <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                    <SelectItem value="Order Received">Order Received</SelectItem>
                    <SelectItem value="Follow-up Scheduled">Follow-up Scheduled</SelectItem>
                    <SelectItem value="Payment Collected">Payment Collected</SelectItem>
                    <SelectItem value="Not Interested">Not Interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-semibold text-foreground/80">Customer Feedback</label>
                <textarea 
                  className="w-full h-24 p-2.5 rounded-md border border-input text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                  placeholder="Notes on client requirements or feedback..."
                  value={formData.feedback}
                  maxLength={100}
                  onChange={(e) => setFormData({...formData, feedback: e.target.value})}
                />
              </div>
              <div className="space-y-4 lg:col-span-3 bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 mt-2">
                <div className="flex items-center gap-3">
                   <label htmlFor="is_quotation" className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        id="is_quotation" 
                        className="sr-only peer"
                        checked={formData.is_quotation}
                        onChange={(e) => setFormData({...formData, is_quotation: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ms-3 text-sm font-bold text-slate-700">Add Quotation Details?</span>
                   </label>
                </div>

                {formData.is_quotation && (
                  <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                       <h4 className="text-sm font-bold text-primary flex items-center">
                         <Briefcase className="w-4 h-4 mr-2" /> Quotation Item List
                       </h4>
                       <Button 
                         type="button" 
                         variant="outline" 
                         size="sm" 
                         onClick={addQuotationItem}
                         className="h-8 rounded-full border-primary/30 text-primary hover:bg-primary/5 px-4"
                       >
                         <Plus className="w-3.5 h-3.5 mr-1" /> <span className='hidden md:block'>Add Product</span>
                       </Button>
                    </div>

                    <div className="space-y-3">
                      {formData.quotation_items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:border-primary/20">
                          <div className="md:col-span-4 space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Product Name</label>
                            <Select 
                              value={item.product_id}
                              onValueChange={(val) => updateQuotationItem(idx, 'product_id', val)}
                            >
                              <SelectTrigger className="w-full h-9 bg-white border-slate-200 text-sm">
                                <SelectValue placeholder="Select Product..." />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                {products.map(p => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.product_name} ({p.balance} Kg Available)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Quantity</label>
                            <Input 
                              type="number"
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) => updateQuotationItem(idx, 'quantity', e.target.value)}
                              className="h-9 text-sm text-center font-mono"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Unit Price</label>
                            <Input 
                              type="number"
                              placeholder="0.00"
                              value={item.amount}
                              onChange={(e) => updateQuotationItem(idx, 'amount', e.target.value)}
                              className="h-9 text-sm text-right font-mono text-slate-700"
                            />
                          </div>
                          <div className="md:col-span-1 space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">GST %</label>
                            <Select 
                              value={String(item.gst_percent)}
                              onValueChange={(val) => updateQuotationItem(idx, 'gst_percent', val)}
                            >
                              <SelectTrigger className="h-9 bg-white border-slate-200">
                                <SelectValue placeholder="0" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="12">12%</SelectItem>
                                <SelectItem value="18">18%</SelectItem>
                                <SelectItem value="28">28%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-3 flex justify-end gap-2 pl-4 pb-0.5">
                            <div className="w-fulltext-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 whitespace-nowrap">
                              Sum: ₹{((Number(item.amount) || 0) * (Number(item.quantity) || 1) * (1 + (Number(item.gst_percent) || 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeQuotationItem(idx)}
                              disabled={formData.quotation_items.length <= 1}
                              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end pt-4 border-t border-slate-200/50">
                      <div className="md:col-span-2 space-y-2">
                         <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 w-fit">
                            <CheckCircle className="w-3.5 h-3.5" /> Total Inclusive Value: ₹{formData.quotation_items.reduce((sum, item) => 
                              sum + ((Number(item.amount) || 0) * (Number(item.quantity) || 1) * (1 + (Number(item.gst_percent) || 0) / 100)), 0
                            ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                         </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Quote Status</label>
                        <Select 
                          value={formData.quotation_status}
                          onValueChange={(val) => {
                            if (val === 'Approved') {
                              const lowStockItems = formData.quotation_items.filter(item => {
                                const prod = products.find(p => p.id === item.product_id);
                                return prod && Number(item.quantity) > Number(prod.balance);
                              });
                              
                              if (lowStockItems.length > 0) {
                                const itemNames = lowStockItems.map(i => i.product_name || 'Selected Product').join(', ');
                                error(`Inventory Alert: Cannot approve quote. Low stock for ${itemNames}.`);
                                return;
                              }
                            }
                            setFormData({...formData, quotation_status: val});
                          }}
                        >
                          <SelectTrigger className="h-10 bg-white border-slate-200">
                            <SelectValue placeholder="Pending" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="lg:col-start-4 space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Expected Delivery</label>
                        <Input 
                          type="date"
                          value={formData.quotation_delivery_date}
                          onChange={(e) => setFormData({...formData, quotation_delivery_date: e.target.value})}
                          className="bg-white h-10"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button 
                onClick={saveVisit} 
                loading={submitting}
                disabled={submitting}
                className="bg-primary hover:bg-primary/95 text-white px-8 h-12 rounded-full shadow-lg shadow-primary/20 flex items-center transition-all hover:scale-105 active:scale-95 w-full md:w-auto"
              >
                {!submitting && <Save className="w-4 h-4 mr-2" />}
                {editingId ? (submitting ? 'Updating...' : 'Update Report') : (submitting ? 'Saving...' : 'Save Visit Report')}
              </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Field Visit Logs"
          description="Punching details for field staff tracking."
          headers={['Field Staff', 'Customer / Client', 'Locality', 'Date', 'Timing', 'Outcome / Feedback', 'Action']}
          data={visitRecords.filter(rec => !dateFilter || (rec.visit_date && rec.visit_date.startsWith(dateFilter)))}
          loading={loading}
          searchFields={['users.name', 'users.employee_code', 'customer_name', 'customers.customer_code', 'purpose']}
          searchPlaceholder="Search staff name/ID, client name/ID..."
          actions={
            <div className="flex gap-3">
              <span className="flex items-center text-sm font-semibold text-muted-foreground">Filter Date:</span>
              <div className="flex items-center gap-2">
                <Input 
                  type="date"
                  className="w-40 rounded-full border-primary/20 h-9 text-xs"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
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
            </div>
          }
          renderRow={(rec: any) => (
            <tr key={rec.id} className="hover:bg-primary/5 transition-all group">
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 font-bold text-xs">
                    {rec.users?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="font-semibold">{rec.users?.name || 'Unknown Staff'}</div>
                    <div className="text-[10px] text-muted-foreground">{rec.users?.employee_code || '#---'}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 font-medium text-foreground">
                {rec.customer_name}
              </td>
              <td className="px-6 py-4 text-xs text-muted-foreground">
                 <div className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {rec.location || 'N/A'}</div>
              </td>
              <td className="px-6 py-4">{new Date(rec.visit_date).toLocaleDateString()}</td>
              <td className="px-6 py-4 font-mono text-[11px] text-primary">
                {rec.time_in?.substring(0,5) || '--:--'} - {rec.time_out?.substring(0,5) || '--:--'}
              </td>
               <td className="px-6 py-4">
                 <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                     <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                       rec.outcome === 'Order Received' ? 'bg-emerald-100 text-emerald-700' :
                       rec.outcome === 'Proposal Sent' ? 'bg-blue-100 text-blue-700' :
                       rec.outcome === 'Not Interested' ? 'bg-rose-100 text-rose-700' :
                       'bg-slate-100 text-slate-700'
                     }`}>
                       {rec.outcome || 'N/A'}
                     </span>
                   </div>
                   <div className="text-[10px] text-muted-foreground italic truncate max-w-[150px]" title={rec.feedback}>
                     {rec.feedback || 'No feedback recorded'}
                   </div>
                   {rec.is_quotation && (
                     <div className="mt-3 overflow-hidden">
                       <div className="flex items-center justify-between px-1">
                         <div className="flex items-center gap-2">
                           <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border shadow-sm ${
                              rec.quotation_status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              rec.quotation_status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                           }`}>
                             {rec.quotation_status || 'Pending'}
                           </span>
                           <span className="text-[10px] font-black text-emerald-700">
                             ₹{rec.quotation_items?.reduce((sum: number, item: any) => 
                               sum + ((Number(item.amount) || 0) * (Number(item.quantity) || 1) * (1 + (Number(item.gst_percent) || 0) / 100)), 0
                             ).toLocaleString()}
                           </span>
                         </div>
                         
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => toggleQuoteExpand(rec.id)}
                           className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/5 gap-1"
                         >
                           {expandedQuotes.includes(rec.id) ? (
                             <><ChevronUp className="w-3 h-3" /> Hide</>
                           ) : (
                             <><ChevronDown className="w-3 h-3" /> {rec.quotation_items?.length || 0} Items</>
                           )}
                         </Button>
                       </div>
                       
                       {expandedQuotes.includes(rec.id) && (
                         <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10 animate-in slide-in-from-top-1 duration-200">
                           <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                             {rec.quotation_items?.map((item: any, i: number) => (
                               <div key={i} className="text-[9px] flex items-center justify-between bg-white/60 px-2 py-1.5 rounded border border-slate-100/50">
                                 <div className="flex items-center gap-2 min-w-0">
                                   <Package className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                   <div className="flex flex-col min-w-0">
                                     <span className="font-bold text-slate-700 truncate">{item.product_name || item.product}</span>
                                     <span className="text-[7px] text-muted-foreground uppercase">Qty: {item.quantity} | GST: {item.gst_percent}%</span>
                                   </div>
                                 </div>
                                 <div className="text-right flex flex-col">
                                   <span className="font-black text-primary whitespace-nowrap">₹{(Number(item.amount) || 0).toLocaleString()}</span>
                                   <span className="text-[7px] font-bold text-emerald-600 italic">Inc. Tax</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                           
                           {rec.quotation_delivery_date && (
                             <div className="mt-1.5 flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-tighter px-1 border-t border-slate-100 pt-1">
                               <Calendar className="w-2.5 h-2.5" /> Est. Delivery: {new Date(rec.quotation_delivery_date).toLocaleDateString()}
                             </div>
                           )}
                         </div>
                       )}
                     </div>
                   )}
                 </div>
              </td>
              <td className="md:px-6 py-4 text-right space-x-2">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(rec)} className="hover:text-primary rounded-full">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(rec.id)} className="hover:text-destructive rounded-full">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </td>
            </tr>
          )}
        />
      )}
      </div>

      {/* Offer Detail Modal */}
      <Dialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
        <DialogContent className="w-[92%] sm:max-w-lg bg-white rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl [&>button]:text-white mx-auto">
          <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 sm:p-8 text-white relative">
             <div className="absolute right-0 top-0 p-8 opacity-10">
                <Megaphone className="w-32 h-32 rotate-12 text-white" />
             </div>
             <div className="absolute left-0 bottom-0 w-full h-full bg-primary/10 blur-3xl -z-10" />
             <div className="relative z-10">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Active Scheme</span>
                <DialogTitle className="text-3xl font-black mt-4 leading-tight">{selectedOffer?.title}</DialogTitle>
                <div className="flex items-center gap-4 mt-6">
                   <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/5">
                      <Calendar className="w-4 h-4 text-white/80" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Starts: {selectedOffer?.start_date ? new Date(selectedOffer.start_date).toLocaleDateString() : 'N/A'}</span>
                   </div>
                   {selectedOffer?.end_date && (
                     <div className="flex items-center gap-2 bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/10">
                        <Clock3 className="w-4 h-4 text-white/80" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-white">Ends: {new Date(selectedOffer.end_date).toLocaleDateString()}</span>
                     </div>
                   )}
                </div>
             </div>
          </div>
          <div className="p-8">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                <Info className="w-4 h-4" /> Comprehensive Details
             </div>
             <p className="text-slate-600 leading-relaxed text-base font-medium whitespace-pre-wrap">
                {selectedOffer?.description || 'No additional details provided for this announcement.'}
             </p>
             <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                <span>Maxtron Operations</span>
                <span className="flex items-center gap-1.5"><Star className="w-3 h-3 text-primary fill-primary" /> Verified Announcement</span>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
