'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, Briefcase, Calendar, Clock, Plus, Search, Edit, Trash2, X, Save, Building2, Quote, Download, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';
import { exportToExcel } from '@/utils/export';

const MARKETING_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/marketing-visits`;
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
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);


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
    company_id: ''
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

      fetchVisits(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
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

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${MARKETING_API}/${editingId}` : MARKETING_API;

    const dataToSave = {
      ...formData,
      customer_id: formData.customer_id === '' ? null : formData.customer_id,
      employee_id: formData.employee_id === '' ? null : formData.employee_id
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
      company_id: currentCompanyId
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
      company_id: rec.company_id
    });
    setShowForm(true);
  };

  const downloadVisitList = async () => {
    const activeRecords = visitRecords.filter(rec => !dateFilter || (rec.visit_date && rec.visit_date.startsWith(dateFilter)));
    if (activeRecords.length === 0) {
      info('No visit records found to export.');
      return;
    }

    const headers = ['Staff', 'Client', 'Location', 'Date', 'Time In', 'Time Out', 'Purpose', 'Outcome', 'Feedback'];
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
        rec.feedback || ''
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10 mb-2">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading" id="page-title">Marketing Operations</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">Field staff tracking, client visit logs, and outcome analysis.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {!showForm && (
            <Button onClick={downloadVisitList} variant="outline" className="border-secondary text-secondary hover:bg-secondary/5 hidden md:flex rounded-full px-5 h-10 shadow-sm transition-all hover:scale-105 active:scale-95">
               <Download className="w-4 h-4 mr-2" /> Download Visit List
            </Button>
          )}
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
  );
}
