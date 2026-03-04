'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, Briefcase, Calendar, Clock, Plus, Search, Edit, Trash2, X, Save, Building2, Quote } from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

const MARKETING_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/marketing-visits`;
const EMPLOYEES_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/employees`;

export default function MarketingVisitsPage() {
  const [showForm, setShowForm] = useState(false);
  const [visitRecords, setVisitRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');

  const [dateFilter, setDateFilter] = useState(''); // Default to empty to show all records initially
  const { success, error } = useToast();
  const { confirm } = useConfirm();

  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    employee_id: '',
    customer_name: '',
    location: '',
    visit_date: new Date().toISOString().split('T')[0],
    time_in: '',
    time_out: '',
    purpose: '',
    outcome: '',
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

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${MARKETING_API}/${editingId}` : MARKETING_API;

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
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      customer_name: '',
      location: '',
      visit_date: new Date().toISOString().split('T')[0],
      time_in: '',
      time_out: '',
      purpose: '',
      outcome: '',
      company_id: currentCompanyId
    });
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      employee_id: rec.employee_id,
      customer_name: rec.customer_name,
      location: rec.location || '',
      visit_date: rec.visit_date.split('T')[0],
      time_in: rec.time_in || '',
      time_out: rec.time_out || '',
      purpose: rec.purpose || '',
      outcome: rec.outcome || '',
      company_id: rec.company_id
    });
    setShowForm(true);
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
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Marketing Team Visits</h1>
          <p className="text-muted-foreground text-sm font-medium">Punching details for field staff tracking.</p>
        </div>
        <Button 
          onClick={() => { setShowForm(!showForm); if(!showForm) resetForm(); setEditingId(null); }}
          className="bg-primary hover:bg-primary/90 text-white px-6 rounded-full shadow-lg shadow-primary/20"
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancel Entry' : 'New Field Visit'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-xl animate-in slide-in-from-right duration-500">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle>{editingId ? 'Edit Visit Details' : 'Record Field Visit'}</CardTitle>
            <CardDescription>Log time of entry, exit, and visit outcome.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                   Field Staff
                </label>
                <select 
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                >
                  <option value="">Select staff...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center">
                  <Building2 className="w-4 h-4 mr-2 text-primary" /> Customer / Company
                </label>
                <select 
                  value={formData.customer_name}
                  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                >
                  <option value="">Select customer...</option>
                  {customers.map(cust => (
                    <option key={cust.id} value={cust.customer_name}>{cust.customer_name} ({cust.customer_code})</option>
                  ))}
                  <option value="New Customer">+ Add New (Type below)</option>
                </select>
                {formData.customer_name === 'New Customer' && (
                  <Input 
                    placeholder="Enter new company name"
                    className="mt-2"
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  />
                )}
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
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-semibold text-foreground/80">Outcome / Feedback</label>
                <textarea 
                  className="w-full h-24 p-2.5 rounded-md border border-input text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                  placeholder="Result of the meeting..."
                  value={formData.outcome}
                  onChange={(e) => setFormData({...formData, outcome: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={saveVisit} className="bg-primary hover:bg-primary/95 text-white px-8 h-10 rounded-full shadow-lg flex items-center">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Report' : 'Save Visit Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <TableView
        title="Field Visit Logs"
        description="Punching details for field staff tracking."
        headers={['Field Staff', 'Customer / Client', 'Locality', 'Date', 'Timing', 'Status / Outcome', 'Action']}
        data={visitRecords.filter(rec => !dateFilter || (rec.visit_date && rec.visit_date.startsWith(dateFilter)))}
        loading={loading}
        searchFields={['users.name', 'customer_name', 'purpose']}
        searchPlaceholder="Search staff or client..."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground font-semibold">Filter Date:</span>
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
                 <div className="text-xs font-semibold">{rec.purpose}</div>
                 <div className="text-[10px] text-muted-foreground italic truncate max-w-[150px]">{rec.outcome || 'No outcome recorded'}</div>
               </div>
            </td>
            <td className="px-6 py-4 text-right space-x-2">
              <Button variant="ghost" size="icon" onClick={() => handleEdit(rec)} className="hover:text-primary rounded-full">
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(rec.id)} className="hover:text-destructive rounded-full">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
