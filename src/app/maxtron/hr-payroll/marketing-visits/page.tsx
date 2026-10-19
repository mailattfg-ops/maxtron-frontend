'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, Briefcase, Calendar, Clock, Plus, Search, Edit, Trash2, X, Save, Building2, Quote, Download, ExternalLink, ArrowRight, Package, ChevronDown, ChevronUp, Eye, TrendingUp, Users, CheckCircle, Phone, Mail, Truck, Settings2, Edit2, Check } from 'lucide-react';
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
import { downloadQuotationTemplate } from '@/utils/quotationWordGenerator';
import { exportTradingQuotationToWord } from '@/utils/quotationTradingWord';
import { exportQuotationToPdf } from '@/utils/quotationPdf';
import { resizeImageFile, emptyQuotationItem, quotationTypeOf, type QuotationType } from '@/utils/quotationExcelGenerator';
import { exportBagsQuotationToWord } from '@/utils/quotationWordTemplate';
import { 
    Tag, 
    Megaphone, 
    Bell, 
    LayoutDashboard,
    ChevronRight,
    Star,
    Info,
    Clock3,
    FileText,
    History,
    FileCode
} from 'lucide-react';

const MARKETING_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/marketing-visits`;
const OFFERS_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/marketing-offers`;
const ORDERS_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/orders`;
const EMPLOYEES_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/employees`;
const OUTCOMES_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/marketing-outcomes`;

export const MARKETING_JOB_ROLES = [
  'Asst.marketing manager',
  'Team leader',
  'Business Development Executive',
  'office Assistant'
];

const DEFAULT_OUTCOMES = [
  'New visit',
  'Proposal sent',
  'Negotiation',
  'Order Received',
  'Revisit',
  'Payment follow-up',
  'Next follow-up scheduled',
  'Not Interested'
];

/** An office assistant (by designation) does not record visit times. */
const isOfficeAssistantDesignation = (designation?: string) => /office\s*assistant/i.test(String(designation || ''));

export default function MarketingVisitsPage() {
  const { hasPermission } = usePermission();
  // marketing_view is the key the sidebar gates this page on, and the one the
  // marketing roles are actually granted. These three used to read the legacy
  // hr_marketing_view (from when the page lived under HR), which no marketing
  // role has — so the page opened but every action button was hidden.
  const canCreate = hasPermission('marketing_view', 'create');
  const canEdit = hasPermission('marketing_view', 'edit');
  const canDelete = hasPermission('marketing_view', 'delete');
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
  const [showQuotationHistoryModal, setShowQuotationHistoryModal] = useState(false);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<string>('ALL');
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true
  });


  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeLoading, setOutcomeLoading] = useState(false);
  const [newOutcomeName, setNewOutcomeName] = useState('');
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [editingOutcomeName, setEditingOutcomeName] = useState('');

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    customer_name: '',
    customer_code: '',
    gst_no: '',
    mobile_no: '',
    email_id: '',
    contact_person: '',
    address: '',
    city: '',
    state: 'Kerala',
    zip_code: '',
    company_id: ''
  });

  const [dateFilter, setDateFilter] = useState(''); // Default to empty to show all records initially
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    employee_id: '',
    job_role: 'Business Development Executive',
    contact_number: '',
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
    quotation_items: [emptyQuotationItem()],
    quotation_type: 'BAGS' as QuotationType,
    quote_location: 'VKM',
    quote_seq: '',
    quote_year: '2026-27',
    quotation_ref: '',
    quotation_subject: 'Quotation for the Supply of Poly Bags – Reg.',
    quotation_delivery_date: '',
    quotation_status: 'Pending',
    probability: ''
  });


  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      // 1. Fetch Companies and Employees in parallel
      const [compRes, empRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/companies`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(EMPLOYEES_API, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [compData, empData] = await Promise.all([
        compRes.json(),
        empRes.json()
      ]);

      let coId = '';
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
          setFormData(prev => ({ ...prev, company_id: coId }));
        }
      }

      if (empData.success) {
        const maxtronEmps = empData.data.filter((e: any) => e.companies?.company_name?.toUpperCase() === activeTenant);
        const marketingEmps = maxtronEmps.filter((e: any) => 
          e.categories?.category_name?.toLowerCase().includes('marketing') || 
          e.user_types?.name?.toLowerCase().includes('marketing') ||
          e.type?.toLowerCase().includes('marketing')
        );
        setEmployees(marketingEmps.length > 0 ? marketingEmps : maxtronEmps);
      }

      // 2. Fetch Customers, Products, Offers, and Visits in parallel using coId
      if (coId) {
        const [custRes, prodRes, offersRes, visitsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/customers?company_id=${coId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/inventory/fg-stock-summary?company_id=${coId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${OFFERS_API}?company_id=${coId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${MARKETING_API}?company_id=${coId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const [custData, prodData, offersData, visitsData] = await Promise.all([
          custRes.json(),
          prodRes.json(),
          offersRes.json(),
          visitsRes.json()
        ]);

        if (custData.success) setCustomers(custData.data);
        if (prodData.success) setProducts(prodData.data);
        if (offersData.success) setOffers(offersData.data);
        if (visitsData.success) {
          const processed = processVisitRecords(visitsData.data, empData.data || []);
          setVisitRecords(processed);
        }
      }
      await fetchOutcomes(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutcomes = async (coId?: string) => {
    const token = localStorage.getItem('token');
    try {
      const url = coId ? `${OUTCOMES_API}?company_id=${coId}` : OUTCOMES_API;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setOutcomes(data.data);
      } else {
        setOutcomes(DEFAULT_OUTCOMES.map((name, idx) => ({ id: `default-${idx}`, name, display_order: idx + 1 })));
      }
    } catch (err) {
      console.error('Error fetching outcomes:', err);
      setOutcomes(DEFAULT_OUTCOMES.map((name, idx) => ({ id: `default-${idx}`, name, display_order: idx + 1 })));
    }
  };

  const handleCreateOutcome = async () => {
    const trimmed = newOutcomeName.trim();
    if (!trimmed) {
      error('Please enter an outcome name.');
      return;
    }
    if (outcomes.some(o => o.name.toLowerCase() === trimmed.toLowerCase())) {
      error('An outcome with this name already exists.');
      return;
    }

    setOutcomeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(OUTCOMES_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: trimmed,
          company_id: currentCompanyId || undefined,
          display_order: outcomes.length + 1
        })
      });
      const data = await res.json();
      if (data.success) {
        success(`"${trimmed}" is now available in visit outcomes.`);
        setNewOutcomeName('');
        await fetchOutcomes(currentCompanyId);
      } else {
        error(data.message || 'Error adding outcome');
      }
    } catch (err: any) {
      error(err.message || 'Could not add outcome');
    } finally {
      setOutcomeLoading(false);
    }
  };

  const handleUpdateOutcome = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      error('Outcome name cannot be empty.');
      return;
    }

    setOutcomeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${OUTCOMES_API}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: trimmed })
      });
      const data = await res.json();
      if (data.success) {
        success('Outcome title updated successfully.');
        setEditingOutcomeId(null);
        await fetchOutcomes(currentCompanyId);
      } else {
        error(data.message || 'Error updating outcome');
      }
    } catch (err: any) {
      error(err.message || 'Could not update outcome');
    } finally {
      setOutcomeLoading(false);
    }
  };

  const handleDeleteOutcome = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Outcome Option',
      message: `Are you sure you want to delete "${name}"? Existing recorded visits with this outcome will not be affected.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

    setOutcomeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${OUTCOMES_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success(`Outcome "${name}" removed.`);
        if (formData.outcome === name) {
          setFormData(prev => ({ ...prev, outcome: '' }));
        }
        await fetchOutcomes(currentCompanyId);
      } else {
        error(data.message || 'Error deleting outcome');
      }
    } catch (err: any) {
      error(err.message || 'Could not delete outcome');
    } finally {
      setOutcomeLoading(false);
    }
  };

  const processVisitRecords = (records: any[], empsList: any[]) => {
    const list = empsList && empsList.length > 0 ? empsList : employees;
    return (records || []).map(rec => {
      const emp = list.find((e: any) => e.id === rec.employee_id);
      const employee_code = rec.users?.employee_code || emp?.employee_code || '';
      const employee_name = rec.users?.name || emp?.name || 'Unknown Staff';
      return {
        ...rec,
        employee_code,
        employee_name,
        users: {
          ...rec.users,
          name: employee_name,
          employee_code
        }
      };
    });
  };

  const extractCustomerLocation = (cust: any): string => {
    if (!cust) return '';

    // Direct location field if present
    if (cust.location && typeof cust.location === 'string' && cust.location.trim()) {
      return cust.location.trim();
    }

    // Check addresses list if available
    const addrs = Array.isArray(cust.addresses) ? cust.addresses : [];
    if (addrs.length > 0) {
      // Find preferred address type (billing/customer/office), fallback to first
      const primary = addrs.find((a: any) => 
        ['billing', 'customer', 'office'].includes(a.address_type?.toLowerCase())
      ) || addrs[0];

      if (primary) {
        const area = (primary.street || primary.address_line1 || primary.address || '').trim();
        const city = (primary.city || '').trim();
        const state = (primary.state || '').trim();

        const parts: string[] = [];
        if (area) parts.push(area);
        if (city && !parts.some(p => p.toLowerCase().includes(city.toLowerCase()))) {
          parts.push(city);
        }
        if (parts.length === 0 && state) {
          parts.push(state);
        }

        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    }

    // Direct fallback fields on the customer object
    const directArea = (cust.street || cust.address || '').trim();
    const directCity = (cust.city || '').trim();
    const directState = (cust.state || '').trim();
    const directParts: string[] = [];
    if (directArea) directParts.push(directArea);
    if (directCity && !directParts.some(p => p.toLowerCase().includes(directCity.toLowerCase()))) {
      directParts.push(directCity);
    }
    if (directParts.length === 0 && directState) {
      directParts.push(directState);
    }

    return directParts.join(', ');
  };

  const openAddCustomerModal = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/customers/next-code?company_id=${currentCompanyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const code = data.success && data.data ? data.data : `CUST-${String(customers.length + 1).padStart(3, '0')}`;
      setNewCustomerData({
        customer_name: '',
        customer_code: code,
        gst_no: '',
        mobile_no: '',
        email_id: '',
        contact_person: '',
        address: '',
        city: '',
        state: 'Kerala',
        zip_code: '',
        company_id: currentCompanyId
      });
    } catch (e) {
      setNewCustomerData({
        customer_name: '',
        customer_code: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
        gst_no: '',
        mobile_no: '',
        email_id: '',
        contact_person: '',
        address: '',
        city: '',
        state: 'Kerala',
        zip_code: '',
        company_id: currentCompanyId
      });
    }
    setShowAddCustomerModal(true);
  };

  const handleSaveNewCustomer = async () => {
    if (!newCustomerData.customer_name || newCustomerData.customer_name.trim().length < 2) {
      error('Customer Name is required (minimum 2 characters).');
      return;
    }
    if (newCustomerData.mobile_no && !/^[0-9+\-\s]{7,15}$/.test(newCustomerData.mobile_no)) {
      error('Please enter a valid mobile number.');
      return;
    }
    if (newCustomerData.zip_code && !/^[0-9]{6}$/.test(newCustomerData.zip_code)) {
      error('ZIP/PIN code must be exactly 6 digits.');
      return;
    }

    setCustomerSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const payload = {
        customer_name: newCustomerData.customer_name.trim(),
        customer_code: newCustomerData.customer_code.trim(),
        gst_no: newCustomerData.gst_no.trim() || undefined,
        mobile_no: newCustomerData.mobile_no.trim() || undefined,
        email_id: newCustomerData.email_id.trim() || undefined,
        contact_person: newCustomerData.contact_person.trim() || undefined,
        company_id: currentCompanyId,
        addresses: [
          {
            address_type: 'billing',
            street: newCustomerData.address || '',
            city: newCustomerData.city || '',
            state: newCustomerData.state || 'Kerala',
            zip_code: newCustomerData.zip_code || ''
          }
        ]
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        success('Customer created successfully!');
        setShowAddCustomerModal(false);
        const createdCustomer = data.data;
        const autoLoc = extractCustomerLocation(createdCustomer) || 
          [newCustomerData.address, newCustomerData.city].filter(Boolean).join(', ') || 
          newCustomerData.city || 
          newCustomerData.state || 
          '';
        setCustomers(prev => [createdCustomer, ...prev]);
        setFormData(prev => ({
          ...prev,
          customer_name: createdCustomer.customer_name,
          customer_id: createdCustomer.id,
          location: autoLoc
        }));
      } else {
        // Say why, not only that it failed
        error([data.message || 'Failed to create customer', data.error].filter(Boolean).join(': '));
      }
    } catch (err: any) {
      error(err.message || 'Error creating customer');
    } finally {
      setCustomerSubmitting(false);
    }
  };

  const getCurrentFinancialYear = () => {
    const d = new Date();
    const curYear = d.getFullYear();
    const nextYear2 = String(curYear + 1).slice(-2);
    return `${curYear}-${nextYear2}`;
  };

  const getNextQuoteSeq = (customRecords?: any[]) => {
    const list = customRecords || visitRecords;
    const quotes = list.filter((r: any) => r.is_quotation && r.quotation_ref);
    let maxNum = 0;
    for (const q of quotes) {
      const match = String(q.quotation_ref).match(/QUOTE-([0-9]+)/i);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const next = maxNum > 0 ? maxNum + 1 : quotes.length + 1;
    return String(next).padStart(4, '0');
  };

  const extractLocationCode = (loc?: string) => {
    if (!loc) return 'VKM';
    const firstPart = loc.split(',')[0].trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (firstPart.startsWith('VANIYAM')) return 'VKM';
    if (firstPart.startsWith('KOCH') || firstPart.startsWith('ERNAK')) return 'KLM';
    if (firstPart.startsWith('PALAKK')) return 'PKD';
    if (firstPart.startsWith('THRISS')) return 'TSR';
    if (firstPart.startsWith('CALIC') || firstPart.startsWith('KOZHIK')) return 'CLT';
    if (firstPart.length >= 3) return firstPart.substring(0, 3);
    return 'VKM';
  };

  const composeQuoteRef = (loc?: string, seq?: string, yr?: string) => {
    const l = (loc || 'VKM').toUpperCase().trim();
    const s = (seq || '0131').trim();
    const y = (yr || getCurrentFinancialYear()).trim();
    return `MA/${l}(FO)-QUOTE-${s}/${y}`;
  };

  // The client's quotation formats (Bags / Trading) as a PDF laid out like the
  // Word quotation: it looks the same on a phone as on a computer, which the
  // Excel version did not.
  const downloadQuotationPdf = (rec: any) => {
    exportQuotationToPdf(rec).catch(() => error('Could not generate the PDF quotation.'));
  };


  // Both formats download on the client's own Word letterhead: bags as their
  // bags quotation, trading in the trading layout (with product photos).
  const downloadQuotationWord = (rec: any) => {
    const build = quotationTypeOf(rec) === 'TRADING' ? exportTradingQuotationToWord : exportBagsQuotationToWord;
    build(rec).catch(() => error('Could not generate the Word quotation.'));
  };

  const handleDownloadQuotationTemplate = () => {
    downloadQuotationTemplate().catch(() => error('Could not generate the Word quotation template.'));
  };

  const pickQuotationImage = async (index: number, file?: File) => {
    if (!file) return;
    try {
      updateQuotationItem(index, 'image', await resizeImageFile(file));
    } catch {
      error('Could not read that image. Please try a JPG or PNG.');
    }
  };

  const addQuotationItem = () => {
    setFormData(prev => ({
      ...prev,
      quotation_items: [...prev.quotation_items, emptyQuotationItem()]
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
        setVisitRecords(processVisitRecords(data.data, employees));
      }
    } catch (err) {
      console.error('Error fetching visits:', err);
    }
  };

  // Office assistants work from the office: their visits have no Time In / Time Out.
  // Decided by this visit's Job Role, which picking the staff fills from their
  // designation in Employee Management and which can be changed here.
  const isOfficeAssistant = isOfficeAssistantDesignation(formData.job_role);

  const saveVisit = async () => {
    if (!formData.employee_id || !formData.customer_name || !formData.visit_date) {
      error('Please fill staff, customer, and date.');
      return;
    }

    if (!isOfficeAssistant && (!formData.time_in || !formData.time_out)) {
      error('Both Time In and Time Out are required.');
      return;
    }

    if (!isOfficeAssistant && formData.time_out <= formData.time_in) {
      error(`Invalid timing: Time Out (${formData.time_out}) must be strictly later than Time In (${formData.time_in}).`);
      return;
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

    if (formData.is_quotation) {
      if (formData.quotation_items.length === 0) {
        return error('Please add at least one item to the quotation.');
      }
      const isBags = formData.quotation_type !== 'TRADING';
      for (const item of formData.quotation_items) {
        if (!item.product_id) {
          return error('Product selection is required for all items.');
        }
        if (!item.quantity || Number(item.quantity) <= 0) {
          return error(`Invalid Quantity: Must be greater than 0 for ${item.product_name || 'Item'}`);
        }
        if (!item.amount || Number(item.amount) <= 0) {
          return error(`Invalid Price: Must be greater than 0 for ${item.product_name || 'Item'}`);
        }
        if (isBags && !item.bags_per_kg?.trim()) {
          return error(`"No. of Bags / KG" is required for ${item.product_name || 'Poly Bags Item'}`);
        }
      }
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${MARKETING_API}/${editingId}` : MARKETING_API;

    // The quotation header fields travel only with a quotation, so saving a
    // plain visit never depends on those columns.
    const { quotation_type, quotation_ref, quotation_subject, quote_location, quote_seq, quote_year, ...visitFields } = formData as any;
    const finalRef = (quotation_ref && quotation_ref.trim()) || composeQuoteRef(quote_location, quote_seq, quote_year);
    const dataToSave = {
      ...visitFields,
      job_role: formData.job_role || 'Business Development Executive',
      contact_number: formData.contact_number || null,
      ...(formData.is_quotation ? {
        quotation_type: quotation_type || 'BAGS',
        quotation_ref: finalRef,
        quotation_subject: quotation_subject?.trim() || null
      } : {}),
      customer_id: formData.customer_id === '' ? null : formData.customer_id,
      employee_id: formData.employee_id === '' ? null : formData.employee_id,
      ...(isOfficeAssistant ? { time_in: null, time_out: null } : {}),
      quotation_items: formData.is_quotation ? formData.quotation_items.map(item => ({
        ...item,
        quantity: item.quantity === '' ? null : Number(item.quantity),
        amount: item.amount === '' ? null : Number(item.amount),
        gst_percent: item.gst_percent === '' ? 18 : Number(item.gst_percent)
      })) : [],
      quotation_delivery_date: formData.quotation_delivery_date === '' ? null : formData.quotation_delivery_date
    };


    try {
      setSubmitting(true);
      const send = (body: object) => fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      }).then(r => r.json());

      let data = await send(dataToSave);
      /* If this build reaches a database that does not have the quotation
       * format columns yet (migrations/add_quotation_format_fields.sql), the
       * save is refused outright. Losing a whole quotation over three header
       * fields is the worse outcome: save it without them and say so. */
      if (!data.success && /quotation_(type|ref|subject)/.test(String(data.message || ''))) {
        data = await send({ ...dataToSave, quotation_type: undefined, quotation_ref: undefined, quotation_subject: undefined });
        if (data.success) info('Saved, but Quotation Format / Ref No / Subject were not stored — the database update for them is still pending.');
      }
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
      job_role: 'Business Development Executive',
      contact_number: '',
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
      quotation_items: [emptyQuotationItem()],
      quotation_type: 'BAGS' as QuotationType,
      quote_location: 'VKM',
      quote_seq: '',
      quote_year: getCurrentFinancialYear(),
      quotation_ref: '',
      quotation_subject: 'Quotation for the Supply of Poly Bags – Reg.',
      quotation_delivery_date: '',
      quotation_status: 'Pending',
      probability: ''
    });
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    const matchedCust = customers.find(c => (rec.customer_id && c.id === rec.customer_id) || c.customer_name === rec.customer_name);
    const fallbackLoc = extractCustomerLocation(matchedCust);
    const locCode = extractLocationCode(rec.location || fallbackLoc);
    let seqCode = getNextQuoteSeq();
    let yrCode = getCurrentFinancialYear();
    if (rec.quotation_ref) {
      const match = String(rec.quotation_ref).match(/^MA\/([A-Za-z]+)\(FO\)-QUOTE-([0-9A-Za-z]+)\/(.+)$/);
      if (match) {
        seqCode = match[2];
        yrCode = match[3];
      }
    }
    setFormData({
      employee_id: rec.employee_id || '',
      job_role: rec.job_role || rec.users?.designation || 'Business Development Executive',
      contact_number: rec.contact_number || rec.users?.phone || '',
      customer_id: rec.customer_id || '',
      customer_name: rec.customer_name,
      location: rec.location || fallbackLoc || '',
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
            unit: i.unit || 'Kg',
            amount: i.amount || '',
            gst_percent: i.gst_percent !== undefined ? String(i.gst_percent) : '18',
            bags_per_kg: i.bags_per_kg || '',
            custom_size: i.custom_size || '',
            image: i.image || ''
          })) 
        : [emptyQuotationItem()],
      quotation_type: (rec.quotation_type === 'TRADING' ? 'TRADING' : 'BAGS') as QuotationType,
      quote_location: locCode,
      quote_seq: seqCode,
      quote_year: yrCode,
      quotation_ref: rec.quotation_ref || '',
      quotation_subject: rec.quotation_subject || 'Quotation for the Supply of Poly Bags – Reg.',
      quotation_delivery_date: rec.quotation_delivery_date ? rec.quotation_delivery_date.split('T')[0] : '',
      quotation_status: rec.quotation_status || 'Pending',
      probability: rec.probability || ''
    });
    setShowForm(true);
  };


  const downloadVisitList = async () => {
    const activeRecords = visitRecords.filter(rec => !dateFilter || (rec.visit_date && rec.visit_date.startsWith(dateFilter)));
    if (activeRecords.length === 0) {
      info('No visit records found to export.');
      return;
    }

    const headers = ['Staff', 'Client', 'Contact Person', 'Contact Number', 'Customer Email ID', 'Probability', 'Location', 'Date', 'Time In', 'Time Out', 'Purpose', 'Outcome', 'Feedback', 'Quotation', 'Status', 'Q. Items', 'Q. Delivery'];
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
        rec.customers?.contact_person || 'N/A',
        rec.customers?.mobile_no || 'N/A',
        (rec.customers?.email_id && !rec.customers?.email_id.toLowerCase().includes('maxtron')) ? rec.customers.email_id : 'N/A',
        rec.probability || 'N/A',
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
                                    <p className="text-[10px] text-slate-400 font-medium">Field Visit Summary</p>
                                </div>
                           </div>
                           
                           <div className="grid grid-cols-1 gap-3">
                               <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                                   <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Active Quotations</p>
                                   <p className="text-sm font-black text-emerald-700">{visitRecords.filter(v => v.is_quotation).length}</p>
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

        {!showOfferAdmin &&  
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10 relative overflow-hidden">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading" id="page-title">Marketing Operations</h1>
                <p className="text-muted-foreground text-xs md:text-sm font-medium">Field staff tracking, client visit logs, and outcome analysis.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-wrap">
                {!showForm && (
                  <>
                    <Button onClick={downloadVisitList} variant="outline" className="border-secondary text-secondary hover:bg-secondary/5 flex rounded-full px-5 h-10 shadow-sm transition-all hover:scale-105 active:scale-95 w-full sm:w-auto">
                      <Download className="w-4 h-4 mr-2" /> Download Visit List
                    </Button>
                    <Button onClick={() => setShowQuotationHistoryModal(true)} variant="outline" className="border-indigo-300 text-indigo-900 bg-indigo-50/60 hover:bg-indigo-100 flex rounded-full px-5 h-10 shadow-sm transition-all hover:scale-105 active:scale-95 w-full sm:w-auto font-bold">
                      <History className="w-4 h-4 mr-2 text-indigo-600" /> Customer Quote History
                    </Button>
                    <Button onClick={handleDownloadQuotationTemplate} variant="outline" className="border-blue-300 text-blue-900 bg-blue-50/60 hover:bg-blue-100 flex rounded-full px-5 h-10 shadow-sm transition-all hover:scale-105 active:scale-95 w-full sm:w-auto font-bold" title="Download Word Quotation Template (.doc)">
                      <FileText className="w-4 h-4 mr-2 text-blue-600" /> Word Template (.doc)
                    </Button>
                  </>
                )}
                {canCreate && (
                  <Button 
                    onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
                    className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg shadow-primary/20 h-10 transition-all active:scale-95 w-full md:w-auto flex-1 md:flex-none font-bold"
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
                            const statsMap: Record<string, { name: string; count: number; score: number; lastVisitTime: number }> = {};
                            visitRecords.forEach((curr) => {
                              const emp = employees.find(e => e.id === curr.employee_id);
                              const name = curr.users?.name || emp?.name || 'Unknown Staff';
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
                            if (list.length === 0) return 'N/A';
                            list.sort((a, b) => {
                              if (b.score !== a.score) return b.score - a.score;
                              if (b.count !== a.count) return b.count - a.count;
                              return b.lastVisitTime - a.lastVisitTime; // Deterministic tie-breaker
                            });
                            return list[0].name;
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
                        <Users className="w-4 h-4 mr-2 text-primary" /> Field Staff
                      </label>
                      <Select 
                        value={formData.employee_id}
                        onValueChange={(val) => {
                          const emp = employees.find(e => e.id === val);
                          setFormData(prev => ({
                            ...prev, 
                            employee_id: val,
                            job_role: emp?.designation || prev.job_role || 'Business Development Executive',
                            contact_number: emp?.phone || prev.contact_number || '',
                            ...(isOfficeAssistantDesignation(emp?.designation) ? { time_in: '', time_out: '' } : {})
                          }));
                        }}
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
                        <Briefcase className="w-4 h-4 mr-2 text-primary" /> Job Role (Marketing)
                      </label>
                      <Select 
                        value={formData.job_role}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, job_role: val, ...(isOfficeAssistantDesignation(val) ? { time_in: '', time_out: '' } : {}) }))}
                      >
                        <SelectTrigger className="w-full h-10 bg-white border-slate-200 font-semibold text-xs">
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {MARKETING_JOB_ROLES.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground/80 flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-primary" /> Contact Details (Phone)
                      </label>
                      <Input 
                        type="text"
                        placeholder="e.g. 8136861444"
                        value={formData.contact_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))}
                        className="h-10 bg-white border-slate-200 font-mono text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-foreground/80 flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-primary" /> Customer / Company
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={openAddCustomerModal}
                          className="h-6 px-2 text-xs font-bold text-primary hover:bg-primary/10 gap-1 rounded-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Customer
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={formData.customer_name}
                          onValueChange={(val) => {
                            if (val === '__ADD_NEW__') {
                              openAddCustomerModal();
                              return;
                            }
                            const selectedCust = customers.find(c => c.customer_name === val);
                            const autoLocation = extractCustomerLocation(selectedCust);
                            const locCode = extractLocationCode(autoLocation);
                            setFormData(prev => {
                              const seq = prev.quote_seq || getNextQuoteSeq();
                              const yr = prev.quote_year || getCurrentFinancialYear();
                              return {
                                ...prev, 
                                customer_name: val,
                                customer_id: selectedCust?.id || '',
                                location: autoLocation,
                                quote_location: locCode,
                                quotation_ref: prev.is_quotation ? composeQuoteRef(locCode, seq, yr) : prev.quotation_ref
                              };
                            });
                          }}
                        >

                          <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                            <SelectValue placeholder="Select customer..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="__ADD_NEW__" className="text-primary font-bold bg-primary/5 hover:bg-primary/10">
                              + Add New Customer
                            </SelectItem>
                            {customers.map(cust => (
                              <SelectItem key={cust.id} value={cust.customer_name}>{cust.customer_name} ({cust.customer_code})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          onClick={openAddCustomerModal}
                          className="h-10 px-3 bg-primary text-white hover:bg-primary/90 shrink-0 rounded-md"
                          title="Add New Customer"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-foreground/80 flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-primary" /> Location
                        </label>
                        <span className="text-[10px] text-muted-foreground font-semibold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          Auto-filled
                        </span>
                      </div>
                      <Input 
                        readOnly
                        tabIndex={-1}
                        placeholder={formData.customer_name ? "No location registered for customer" : "Auto-filled on customer selection"}
                        value={formData.location}
                        className="bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed font-medium select-none focus-visible:ring-0 focus-visible:border-slate-200"
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
                        disabled={isOfficeAssistant}
                        title={isOfficeAssistant ? 'Not needed for an office assistant' : undefined}
                        onChange={(e) => setFormData({...formData, time_in: e.target.value})}
                        className={formData.time_in && formData.time_out && formData.time_out <= formData.time_in ? 'border-destructive' : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground/80 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-primary" /> Time Out
                      </label>
                      <Input 
                        type="time"
                        value={formData.time_out}
                        disabled={isOfficeAssistant}
                        title={isOfficeAssistant ? 'Not needed for an office assistant' : undefined}
                        onChange={(e) => setFormData({...formData, time_out: e.target.value})}
                        className={formData.time_in && formData.time_out && formData.time_out <= formData.time_in ? 'border-destructive' : ''}
                      />
                      {formData.time_in && formData.time_out && formData.time_out <= formData.time_in && (
                        <p className="text-[10px] text-destructive font-bold">Time Out must be strictly later than Time In</p>
                      )}
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
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-foreground/80">Visit Outcome</label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowOutcomeModal(true)}
                          className="h-6 px-2 text-xs font-bold text-primary hover:bg-primary/10 gap-1 rounded-md"
                          title="Manage visit outcome choices"
                        >
                          <Settings2 className="w-3.5 h-3.5" /> Manage Options
                        </Button>
                      </div>
                      <Select 
                        value={formData.outcome}
                        onValueChange={(val) => {
                          if (val === '__MANAGE_OUTCOMES__') {
                            setShowOutcomeModal(true);
                            return;
                          }
                          setFormData({...formData, outcome: val});
                        }}
                      >
                        <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                          <SelectValue placeholder="Select outcome..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="__MANAGE_OUTCOMES__" className="text-primary font-bold bg-primary/5 hover:bg-primary/10">
                            + Manage Outcome Options
                          </SelectItem>
                          {formData.outcome && !outcomes.some(o => o.name === formData.outcome) && (
                            <SelectItem value={formData.outcome}>{formData.outcome}</SelectItem>
                          )}
                          {outcomes.map(opt => (
                            <SelectItem key={opt.id || opt.name} value={opt.name}>{opt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground/80">Probability</label>
                      <Select 
                        value={formData.probability}
                        onValueChange={(val) => setFormData({...formData, probability: val})}
                      >
                        <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                          <SelectValue placeholder="Select probability..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
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
                          {/* Quotation Header & Numbering Controls */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Quote className="w-4 h-4 text-primary" />
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Quotation Number & Header Configuration</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                                Standard: MA/{'{LOC}'}(FO)-QUOTE-{'{SEQ}'}/{'{YEAR}'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                              <div className="lg:col-span-3 space-y-1.5">
                                <label className="text-[10px] font-bold text-blue-900 uppercase tracking-widest px-1">
                                  Quotation Format <span className="text-rose-500">*</span>
                                </label>
                                <Select
                                  value={formData.quotation_type === 'TRADING' ? 'TRADING' : 'BAGS'}
                                  onValueChange={(val) => {
                                    const nextType = val as QuotationType;
                                    setFormData(prev => {
                                      const nextSubject = nextType === 'TRADING' ? '' : 'Quotation for the Supply of Semi Virgin Poly Bags 51 MICRONS – Reg.';
                                      return {
                                        ...prev,
                                        quotation_type: nextType,
                                        quotation_subject: nextSubject,
                                        quotation_items: prev.quotation_items.map(item => {
                                          if (!item.product_id) return item;
                                          const prod = products.find(p => p.id === item.product_id);
                                          const prodCat = (prod?.category || 'PRODUCT').toUpperCase();
                                          const targetCat = nextType === 'TRADING' ? 'TRADING' : 'PRODUCT';
                                          if (prodCat !== targetCat) {
                                            return { ...item, product_id: '', product_name: '' };
                                          }
                                          return item;
                                        })
                                      };
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-full h-9 bg-white border-blue-300 text-xs font-black text-blue-700">
                                    <SelectValue placeholder="Format" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white z-[1000]">
                                    <SelectItem value="BAGS" className="font-bold text-blue-900">Poly Bags (Bags Format)</SelectItem>
                                    <SelectItem value="TRADING" className="font-bold text-amber-900">Trading Goods (Trading Format)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="lg:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center justify-between">
                                  <span>Location Code</span>
                                  <span className="text-[9px] text-blue-600 font-semibold">(Editable)</span>
                                </label>
                                <Input
                                  value={formData.quote_location}
                                  onChange={(e) => {
                                    const locVal = e.target.value.toUpperCase();
                                    setFormData(prev => ({
                                      ...prev,
                                      quote_location: locVal,
                                      quotation_ref: composeQuoteRef(locVal, prev.quote_seq || getNextQuoteSeq(), prev.quote_year || getCurrentFinancialYear())
                                    }));
                                  }}
                                  placeholder="VKM"
                                  className="h-9 text-xs font-bold text-center uppercase"
                                />
                              </div>

                              <div className="lg:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center justify-between">
                                  <span>Quote Number</span>
                                  <span className="text-[9px] text-emerald-600 font-bold">(Auto)</span>
                                </label>
                                <Input
                                  value={formData.quote_seq || getNextQuoteSeq()}
                                  onChange={(e) => {
                                    const seqVal = e.target.value;
                                    setFormData(prev => ({
                                      ...prev,
                                      quote_seq: seqVal,
                                      quotation_ref: composeQuoteRef(prev.quote_location || 'VKM', seqVal, prev.quote_year || getCurrentFinancialYear())
                                    }));
                                  }}
                                  placeholder="0131"
                                  className="h-9 text-xs font-mono font-bold text-center"
                                />
                              </div>

                              <div className="lg:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center justify-between">
                                  <span>Year</span>
                                  <span className="text-[9px] text-blue-600 font-semibold">(Editable)</span>
                                </label>
                                <Input
                                  value={formData.quote_year || getCurrentFinancialYear()}
                                  onChange={(e) => {
                                    const yrVal = e.target.value;
                                    setFormData(prev => ({
                                      ...prev,
                                      quote_year: yrVal,
                                      quotation_ref: composeQuoteRef(prev.quote_location || 'VKM', prev.quote_seq || getNextQuoteSeq(), yrVal)
                                    }));
                                  }}
                                  placeholder="2026-27"
                                  className="h-9 text-xs font-bold text-center"
                                />
                              </div>

                              <div className="lg:col-span-3 space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-800 uppercase tracking-widest px-1">
                                  Final Quotation No.
                                </label>
                                <Input
                                  value={formData.quotation_ref || composeQuoteRef(formData.quote_location, formData.quote_seq || getNextQuoteSeq(), formData.quote_year)}
                                  onChange={(e) => setFormData(prev => ({ ...prev, quotation_ref: e.target.value }))}
                                  placeholder="MA/VKM(FO)-QUOTE-0131/2026-27"
                                  className="h-9 text-xs font-mono font-black text-primary bg-slate-50 border-slate-300"
                                />
                              </div>

                              {formData.quotation_type !== 'TRADING' && (
                                <div className="lg:col-span-12 space-y-1.5 pt-1">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Subject (Sub:)</label>
                                  <Input
                                    value={formData.quotation_subject}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quotation_subject: e.target.value }))}
                                    placeholder="Quotation for the Supply of Semi Virgin Poly Bags 51 MICRONS – Reg."
                                    className="h-9 text-xs font-semibold"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Product-Wise Item List Header */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-primary flex items-center">
                                <Briefcase className="w-4 h-4 mr-2" /> Quotation Item List
                              </h4>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                formData.quotation_type === 'TRADING'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-blue-100 text-blue-800 border-blue-300'
                              }`}>
                                {formData.quotation_type === 'TRADING' ? 'Trading Goods Entry' : 'Poly Bags Entry'}
                              </span>
                            </div>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={addQuotationItem}
                              className="h-8 rounded-full border-primary/30 text-primary hover:bg-primary/5 px-4 font-bold"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add {formData.quotation_type === 'TRADING' ? 'Trading Item' : 'Bag Item'}
                            </Button>
                          </div>

                          {/* Product-Wise Items Table / Grid */}
                          <div className="space-y-3">
                            {formData.quotation_items.map((item, idx) => {
                              const isTrading = formData.quotation_type === 'TRADING';
                              return (
                                <div 
                                  key={idx} 
                                  className={`p-3.5 rounded-xl border shadow-sm transition-all bg-white ${
                                    isTrading ? 'border-amber-200/80 hover:border-amber-400' : 'border-blue-200/80 hover:border-blue-400'
                                  }`}
                                >
                                  {isTrading ? (
                                    /* TRADING GOODS ENTRY LAYOUT */
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                        <div className="md:col-span-3 space-y-1.5">
                                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                            Product Name <span className="text-rose-500">*</span>
                                          </label>
                                          <Select 
                                            value={item.product_id}
                                            onValueChange={(val) => updateQuotationItem(idx, 'product_id', val)}
                                          >
                                            <SelectTrigger className="w-full h-9 bg-white border-slate-200 text-xs font-semibold">
                                              <SelectValue placeholder="Select Trading Product..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white z-[1000] max-h-60">
                                              {products
                                                .filter(p => (p.category || 'PRODUCT').toUpperCase() === 'TRADING')
                                                .map(p => (
                                                  <SelectItem key={p.id} value={p.id}>
                                                    {p.product_name} ({p.product_code}) {p.size ? ` - ${p.size}` : ''}
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div className="md:col-span-2 space-y-1.5">
                                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                            Quantity <span className="text-rose-500">*</span>
                                          </label>
                                          <Input 
                                            type="number"
                                            placeholder="0"
                                            value={item.quantity}
                                            onChange={(e) => updateQuotationItem(idx, 'quantity', e.target.value)}
                                            className="h-9 text-xs text-center font-mono font-bold"
                                          />
                                        </div>

                                        <div className="md:col-span-2 space-y-1.5">
                                          <label className="text-[10px] font-bold text-blue-900 uppercase tracking-widest px-1">
                                            Unit <span className="text-rose-500">*</span>
                                          </label>
                                          <Select
                                            value={item.unit || 'Pcs'}
                                            onValueChange={(val) => updateQuotationItem(idx, 'unit', val)}
                                          >
                                            <SelectTrigger className="h-9 bg-white border-blue-300 text-xs font-black text-blue-700">
                                              <SelectValue placeholder="Unit" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white z-[1000]">
                                              <SelectItem value="Pcs">Pcs (Pieces)</SelectItem>
                                              <SelectItem value="Box">Box</SelectItem>
                                              <SelectItem value="Set">Set</SelectItem>
                                              <SelectItem value="Roll">Roll</SelectItem>
                                              <SelectItem value="Mtr">Mtr (Meters)</SelectItem>
                                              <SelectItem value="Kg">Kg (Kilograms)</SelectItem>
                                              <SelectItem value="Bag">Bag</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div className="md:col-span-2 space-y-1.5">
                                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                            Unit Price (₹) <span className="text-rose-500">*</span>
                                          </label>
                                          <Input 
                                            type="number"
                                            placeholder="0.00"
                                            value={item.amount}
                                            onChange={(e) => updateQuotationItem(idx, 'amount', e.target.value)}
                                            className="h-9 text-xs text-right font-mono font-bold text-slate-800"
                                          />
                                        </div>

                                        <div className="md:col-span-1 space-y-1.5">
                                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">GST %</label>
                                          <Select 
                                            value={String(item.gst_percent)}
                                            onValueChange={(val) => updateQuotationItem(idx, 'gst_percent', val)}
                                          >
                                            <SelectTrigger className="h-9 bg-white border-slate-200 text-xs">
                                              <SelectValue placeholder="0" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white z-[1000]">
                                              <SelectItem value="0">0%</SelectItem>
                                              <SelectItem value="5">5%</SelectItem>
                                              <SelectItem value="12">12%</SelectItem>
                                              <SelectItem value="18">18%</SelectItem>
                                              <SelectItem value="28">28%</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div className="md:col-span-2 flex justify-end items-center gap-2 pl-2 pb-0.5">
                                          <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 whitespace-nowrap">
                                            ₹{((Number(item.amount) || 0) * (Number(item.quantity) || 1) * (1 + (Number(item.gst_percent) || 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </div>
                                          <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => removeQuotationItem(idx)}
                                            disabled={formData.quotation_items.length <= 1}
                                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full shrink-0"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Trading Product Image */}
                                      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                                        {item.image && (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={item.image} alt="Product" className="h-12 w-12 object-contain rounded border border-slate-200 bg-white" />
                                        )}
                                        <label className="inline-flex items-center h-8 px-3 rounded-full border border-amber-300 bg-amber-50/60 text-[11px] font-bold text-amber-900 cursor-pointer hover:bg-amber-100">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => { pickQuotationImage(idx, e.target.files?.[0]); e.target.value = ''; }}
                                          />
                                          {item.image ? 'Change Product Image' : '+ Upload Product Image'}
                                        </label>
                                        {item.image && (
                                          <button
                                            type="button"
                                            onClick={() => updateQuotationItem(idx, 'image', '')}
                                            className="text-[11px] font-bold text-rose-600 hover:underline"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    /* POLY BAGS ENTRY LAYOUT */
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                      <div className="md:col-span-3 space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                          Product Name <span className="text-rose-500">*</span>
                                        </label>
                                        <Select 
                                          value={item.product_id}
                                          onValueChange={(val) => updateQuotationItem(idx, 'product_id', val)}
                                        >
                                          <SelectTrigger className="w-full h-9 bg-white border-slate-200 text-xs font-semibold">
                                            <SelectValue placeholder="Select Poly Bags Product..." />
                                          </SelectTrigger>
                                          <SelectContent className="bg-white z-[1000] max-h-60">
                                            {products
                                              .filter(p => (p.category || 'PRODUCT').toUpperCase() !== 'TRADING')
                                              .map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                  {p.product_name} ({p.product_code}) {p.size ? ` - ${p.size}` : ''} {p.color ? `[${p.color}]` : ''}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                        {/* The client's own size, for this quotation only; the product keeps its standard size */}
                                        <Input
                                          value={item.custom_size || ''}
                                          onChange={(e) => updateQuotationItem(idx, 'custom_size', e.target.value.toUpperCase())}
                                          placeholder="Client size, e.g. 28 X 34 (optional)"
                                          className="h-8 text-[11px] font-semibold border-dashed border-slate-300"
                                        />
                                      </div>

                                      <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-bold text-blue-900 uppercase tracking-widest px-1">
                                          No. of Bags / KG <span className="text-rose-500">*</span>
                                        </label>
                                        <Input
                                          value={item.bags_per_kg}
                                          onChange={(e) => updateQuotationItem(idx, 'bags_per_kg', e.target.value)}
                                          placeholder="45 TO 50"
                                          className="h-9 text-xs text-center font-bold border-blue-200"
                                        />
                                      </div>

                                      <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                          Qty in KG <span className="text-rose-500">*</span>
                                        </label>
                                        <Input 
                                          type="number"
                                          placeholder="0"
                                          value={item.quantity}
                                          onChange={(e) => updateQuotationItem(idx, 'quantity', e.target.value)}
                                          className="h-9 text-xs text-center font-mono font-bold"
                                        />
                                      </div>

                                      <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                          Rate / KG (₹) <span className="text-rose-500">*</span>
                                        </label>
                                        <Input 
                                          type="number"
                                          placeholder="0.00"
                                          value={item.amount}
                                          onChange={(e) => updateQuotationItem(idx, 'amount', e.target.value)}
                                          className="h-9 text-xs text-right font-mono font-bold text-slate-800"
                                        />
                                      </div>

                                      <div className="md:col-span-1 space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">GST %</label>
                                        <Select 
                                          value={String(item.gst_percent)}
                                          onValueChange={(val) => updateQuotationItem(idx, 'gst_percent', val)}
                                        >
                                          <SelectTrigger className="h-9 bg-white border-slate-200 text-xs">
                                            <SelectValue placeholder="0" />
                                          </SelectTrigger>
                                          <SelectContent className="bg-white z-[1000]">
                                            <SelectItem value="0">0%</SelectItem>
                                            <SelectItem value="5">5%</SelectItem>
                                            <SelectItem value="12">12%</SelectItem>
                                            <SelectItem value="18">18%</SelectItem>
                                            <SelectItem value="28">28%</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="md:col-span-2 flex justify-end items-center gap-2 pl-2 pb-0.5">
                                        <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 whitespace-nowrap">
                                          ₹{((Number(item.amount) || 0) * (Number(item.quantity) || 1) * (1 + (Number(item.gst_percent) || 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => removeQuotationItem(idx)}
                                          disabled={formData.quotation_items.length <= 1}
                                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full shrink-0"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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
                data={visitRecords.filter(rec => {
                  if (!dateFilter) return true;
                  if (!rec.visit_date) return false;
                  const raw = String(rec.visit_date).split('T')[0];
                  if (raw === dateFilter) return true;
                  try {
                    const d = new Date(rec.visit_date);
                    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return local === dateFilter;
                  } catch (e) {
                    return false;
                  }
                })}
                loading={loading}
                searchFields={['users.name', 'users.employee_code', 'employee_name', 'employee_code', 'customer_name', 'customers.customer_name', 'customers.customer_code', 'customers.contact_person', 'purpose', 'location', 'outcome']}
                searchPlaceholder="Search staff name/ID, client name/ID, location, outcome..."
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
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 font-bold text-xs shrink-0">
                          {rec.users?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{rec.users?.name || 'Unknown Staff'}</div>
                          <div className="text-[10px] text-primary font-bold">{rec.job_role || rec.users?.designation || 'Marketing Executive'}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span>{rec.users?.employee_code || '#---'}</span>
                            {(rec.contact_number || rec.users?.phone) && (
                              <span className="font-mono text-slate-600 flex items-center gap-1">
                                • <Phone className="w-2.5 h-2.5 text-slate-400" />{rec.contact_number || rec.users?.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground text-sm md:text-base">{rec.customer_name}</div>
                      {rec.customers && (
                        <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-muted-foreground font-medium">
                          {rec.customers.contact_person && <span className="flex items-center text-primary/80"><Briefcase className="w-2.5 h-2.5 mr-1" /> {rec.customers.contact_person}</span>}
                          {rec.customers.mobile_no && <span className="flex items-center"><Phone className="w-2.5 h-2.5 mr-1" /> {rec.customers.mobile_no}</span>}
                          {rec.customers.email_id && <span className="flex items-center"><Mail className="w-2.5 h-2.5 mr-1 text-slate-400" /> {rec.customers.email_id}</span>}
                        </div>
                      )}
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
                            {rec.probability && (
                               <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  rec.probability === 'High' ? 'bg-rose-100 text-rose-700' :
                                  rec.probability === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-600'
                               }`}>
                                 P: {rec.probability}
                               </span>
                            )}
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
                                          <span className="text-[7px] text-muted-foreground uppercase">Qty: {item.quantity} {item.unit || 'Kg'} | GST: {item.gst_percent}%</span>
                                        </div>
                                      </div>
                                      <div className="text-right flex flex-col">
                                        <span className="font-black text-primary whitespace-nowrap">₹{(Number(item.amount) || 0).toLocaleString()}</span>
                                        <span className="text-[7px] font-bold text-emerald-600 italic">Inc. Tax</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                                  {rec.quotation_delivery_date ? (
                                    <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                      <Calendar className="w-2.5 h-2.5" /> Est. Delivery: {new Date(rec.quotation_delivery_date).toLocaleDateString()}
                                    </div>
                                  ) : <div />}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadQuotationPdf(rec)}
                                    className="h-6 text-[9px] font-bold border-rose-300 text-rose-800 bg-rose-50/70 hover:bg-rose-100 px-2 rounded flex items-center gap-1 shadow-sm"
                                    title="Download quotation as PDF, in the Maxtron quotation format"
                                  >
                                    <Download className="w-3 h-3 text-rose-600" /> PDF
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadQuotationWord(rec)}
                                    className="h-6 text-[9px] font-bold border-blue-300 text-blue-800 bg-blue-50/70 hover:bg-blue-100 px-2 rounded flex items-center gap-1 shadow-sm"
                                    title="Download quotation in Microsoft Word (.doc) format"
                                  >
                                    <FileText className="w-3 h-3 text-blue-600" /> Word (.doc)
                                  </Button>
                                </div>
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
          </>
        }
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

      {/* Add Customer Modal */}
      <Dialog open={showAddCustomerModal} onOpenChange={setShowAddCustomerModal}>
        {/* Scrolls inside itself on a phone, so the fields and Save stay reachable above the keyboard */}
        <DialogContent className="w-[92%] sm:max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain bg-white rounded-2xl p-6 border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Add New Customer
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Create a new client record and immediately link to this visit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Customer Name *</label>
                <Input
                  value={newCustomerData.customer_name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, customer_name: e.target.value })}
                  placeholder="e.g. Acme Industries Ltd"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Customer Code *</label>
                <Input
                  value={newCustomerData.customer_code}
                  readOnly
                  className="h-9 text-sm bg-slate-50 font-mono font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Contact Person</label>
                <Input
                  value={newCustomerData.contact_person}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, contact_person: e.target.value })}
                  placeholder="e.g. John Smith"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Mobile Number</label>
                <Input
                  value={newCustomerData.mobile_no}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, mobile_no: e.target.value })}
                  placeholder="+91 9876543210"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Email Address</label>
                <Input
                  value={newCustomerData.email_id}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, email_id: e.target.value })}
                  placeholder="contact@acme.com"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">GST Number</label>
                <Input
                  value={newCustomerData.gst_no}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, gst_no: e.target.value })}
                  placeholder="32AAAAA0000A1Z5"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Address / Locality</label>
              <Input
                value={newCustomerData.address}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                placeholder="Street / Industrial Area"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">City</label>
                <Input
                  value={newCustomerData.city}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                  placeholder="Cochin"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Pincode</label>
                <Input
                  value={newCustomerData.zip_code}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, zip_code: e.target.value })}
                  placeholder="682001"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddCustomerModal(false)}
              className="h-10 px-5 rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={customerSubmitting}
              onClick={handleSaveNewCustomer}
              className="bg-primary text-white hover:bg-primary/95 h-10 px-6 rounded-full font-bold shadow-md shadow-primary/20"
            >
              <Save className="w-4 h-4 mr-2" /> Save & Select Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Visit Outcomes Modal */}
      <Dialog open={showOutcomeModal} onOpenChange={setShowOutcomeModal}>
        <DialogContent className="w-[92%] sm:max-w-lg bg-white rounded-3xl p-6 border shadow-2xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" /> Manage Visit Outcomes
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Add new outcome options, edit existing titles, or delete options from the visit outcome list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {/* Add new outcome form */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Add New Outcome Option
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={newOutcomeName}
                  onChange={(e) => setNewOutcomeName(e.target.value)}
                  placeholder="e.g. Site Survey Done, Deal Closed..."
                  className="h-10 text-sm bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateOutcome();
                    }
                  }}
                />
                <Button
                  type="button"
                  loading={outcomeLoading}
                  onClick={handleCreateOutcome}
                  className="h-10 px-4 bg-primary text-white hover:bg-primary/90 font-bold shrink-0 rounded-xl gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </div>

            {/* Configured outcomes list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Configured Outcomes ({outcomes.length})
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Add, edit or delete below
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {outcomes.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400">
                    No outcomes configured yet. Add your first option above!
                  </div>
                ) : (
                  outcomes.map((item) => (
                    <div
                      key={item.id || item.name}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-primary/40 transition-all shadow-xs"
                    >
                      {editingOutcomeId === item.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <Input
                            value={editingOutcomeName}
                            onChange={(e) => setEditingOutcomeName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleUpdateOutcome(item.id, editingOutcomeName);
                              } else if (e.key === 'Escape') {
                                setEditingOutcomeId(null);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleUpdateOutcome(item.id, editingOutcomeName)}
                            className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shrink-0"
                            title="Save changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingOutcomeId(null)}
                            className="h-8 px-2 text-slate-500 hover:bg-slate-100 rounded-lg shrink-0"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {item.name}
                          </span>
                        </div>
                      )}

                      {editingOutcomeId !== item.id && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingOutcomeId(item.id);
                              setEditingOutcomeName(item.name);
                            }}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg"
                            title="Edit outcome"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOutcome(item.id, item.name)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Delete outcome"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOutcomeModal(false)}
              className="h-10 px-5 rounded-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Quotation History Modal */}
      <Dialog open={showQuotationHistoryModal} onOpenChange={setShowQuotationHistoryModal}>
        <DialogContent className="w-[95%] sm:max-w-4xl bg-white rounded-3xl p-6 border shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <History className="w-6 h-6 text-indigo-600" /> Customer Quotation History
              </DialogTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadQuotationTemplate}
                className="text-xs font-bold border-blue-300 text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-full flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-blue-600" /> Download Word Template (.doc)
              </Button>
            </div>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-1">
              Select a customer to view their complete historical quotation record and download Word (.doc) proposals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            {/* Customer Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="space-y-1 w-full sm:w-72">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Filter by Customer</label>
                <Select value={selectedHistoryCustomer} onValueChange={setSelectedHistoryCustomer}>
                  <SelectTrigger className="w-full h-10 font-bold bg-white border-slate-300">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-[1300] max-h-60 overflow-y-auto">
                    <SelectItem value="ALL">All Customers ({new Set(visitRecords.filter(v => v.is_quotation).map(v => v.customer_name)).size} Clients)</SelectItem>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.customer_name}>
                        {c.customer_name} ({c.customer_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Quotes</span>
                  <span className="text-base font-black text-indigo-700">
                    {visitRecords.filter(v => v.is_quotation && (selectedHistoryCustomer === 'ALL' || v.customer_name === selectedHistoryCustomer)).length}
                  </span>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Combined Value</span>
                  <span className="text-base font-black text-emerald-700">
                    ₹{visitRecords
                      .filter(v => v.is_quotation && (selectedHistoryCustomer === 'ALL' || v.customer_name === selectedHistoryCustomer))
                      .reduce((sum, v) => sum + (v.quotation_items?.reduce((itemSum: number, item: any) => itemSum + ((Number(item.amount) || 0) * (Number(item.quantity) || 1) * (1 + (Number(item.gst_percent) || 0) / 100)), 0) || 0), 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quotations List */}
            <div className="space-y-4">
              {visitRecords
                .filter(v => v.is_quotation && (selectedHistoryCustomer === 'ALL' || v.customer_name === selectedHistoryCustomer))
                .length === 0 ? (
                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-medium">
                  No quotation history found for the selected customer.
                </div>
              ) : (
                visitRecords
                  .filter(v => v.is_quotation && (selectedHistoryCustomer === 'ALL' || v.customer_name === selectedHistoryCustomer))
                  .map((quoteRec, idx) => {
                    const totalVal = quoteRec.quotation_items?.reduce((sum: number, item: any) =>
                      sum + ((Number(item.amount) || 0) * (Number(item.quantity) || 1) * (1 + (Number(item.gst_percent) || 0) / 100)), 0) || 0;

                    return (
                      <Card key={idx} className="border border-slate-200/80 shadow-sm hover:border-indigo-200 transition-all overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-base">{quoteRec.customer_name}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  quoteRec.quotation_status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                  quoteRec.quotation_status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                  'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {quoteRec.quotation_status || 'Pending'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 font-medium flex items-center gap-3 flex-wrap">
                                <span>Date: <strong className="text-slate-700">{new Date(quoteRec.visit_date).toLocaleDateString()}</strong></span>
                                <span>Prepared by: <strong className="text-slate-800 font-bold">{quoteRec.users?.name || quoteRec.employee_name || 'Executive'}</strong></span>
                                {(quoteRec.job_role || quoteRec.users?.designation) && (
                                  <span>Role: <strong className="text-primary font-bold">{quoteRec.job_role || quoteRec.users?.designation}</strong></span>
                                )}
                                {(quoteRec.contact_number || quoteRec.users?.phone) && (
                                  <span className="flex items-center gap-1 font-mono text-slate-700">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {quoteRec.contact_number || quoteRec.users?.phone}
                                  </span>
                                )}
                                {quoteRec.quotation_ref && (
                                  <span className="font-mono bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold">
                                    {quoteRec.quotation_ref}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                              <div className="text-right font-mono font-black text-emerald-700 text-lg">
                                ₹{totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => downloadQuotationPdf(quoteRec)}
                                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 text-xs flex items-center gap-1.5 shrink-0"
                              >
                                <Download className="w-4 h-4" /> Download PDF
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => downloadQuotationWord(quoteRec)}
                                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 text-xs flex items-center gap-1.5 shrink-0"
                              >
                                <FileText className="w-4 h-4" /> Download Word (.doc)
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Quotation Items List:</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {quoteRec.quotation_items?.map((item: any, itemIdx: number) => (
                                <div key={itemIdx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                                  <div>
                                    <div className="font-bold text-slate-800">{item.product_name || `Product #${itemIdx + 1}`}</div>
                                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                      Qty: <strong className="text-slate-700">{item.quantity} {item.unit || 'Kg'}</strong> @ ₹{Number(item.amount || 0).toLocaleString()} / {item.unit || 'Kg'} (GST {item.gst_percent || 0}%)
                                    </div>
                                  </div>
                                  <div className="font-mono font-bold text-slate-900 text-right">
                                    ₹{((Number(item.amount) || 0) * (Number(item.quantity) || 1) * (1 + (Number(item.gst_percent) || 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
