'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Save, Upload, Search, Edit, Trash2, Plus, X, Briefcase, FileText, ChevronRight, ChevronLeft, CheckCircle2, Copy, AlertCircle, Users, TrendingUp, FileDown, Download, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';
import { useRouter } from 'next/navigation';

const API_URL = (activeEntity: string) => `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/employees`;

export default function EmployeeInformationPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [isViewMode, setIsViewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newEmployeePopup, setNewEmployeePopup] = useState<{username: string, password: string} | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [userTypes, setUserTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermission();
  const router = useRouter();
  
  // Page access check
  useEffect(() => {
    // We check view permission, but if they are already on this page via sidebar, 
    // it's likely they have it. This is a secondary layer.
    const canView = hasPermission('hr_employee_view', 'can_view');
    // If the hook is still loading user data (user is null initially), we might want to wait.
    // However, sidebar already handles the main gate.
  }, [hasPermission]);
  
  // Table Pagination and Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const pathname = usePathname();
  const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  useEffect(() => {
    fetchCompanies();
  }, []);
  
  // Form State mapped to unified `users` database schema
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    username: '',    // The email used for login
    password: '',    // Initial generated password
    date_of_birth: '',
    addresses: [
      { address_type: 'Communication', street: '', city: '', state: '', zip_code: '', country: 'India' },
      { address_type: 'Permanent', street: '', city: '', state: '', zip_code: '', country: 'India' }
    ],
    company_id: '',
    has_license: false,
    has_passport: false,
    type: '',
    guarantor_name: '',
    is_married: false,
    family_details: '',
    category_id: '',
    employee_qualifications: [] as any[],
    employee_experiences: [] as any[],
    employee_certificates: [] as any[],
    employee_licenses: [] as any[],
    employee_passports: [] as any[],
    employee_loans: [] as any[],
    employee_targets: [] as any[],
    employee_suspenses: [] as any[],
    employee_incentive_slabs: [] as any[]
  });

  const [categories, setCategories] = useState<any[]>([]);

  const fetchCategories = async (coId?: string) => {
    try {
      const token = localStorage.getItem('token');
      const url = coId 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/categories?company_id=${coId}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/categories`;
        
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success) { setCategories(data.data); }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchUserTypes = async (coId?: string) => {
    try {
      const token = localStorage.getItem('token');
      const url = coId
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/user-types?company_id=${coId}&t=${Date.now()}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/user-types?t=${Date.now()}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
         setUserTypes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user types', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/companies`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success) { 
          setCompanies(data.data); 
          const activeCo = data.data.find((c: any) => c.company_name?.toUpperCase().includes(activeTenant));
          setFormData(prev => ({ 
             ...prev, 
             company_id: prev.company_id || (activeCo ? activeCo.id : '') 
          }));

          if (activeCo) {
            fetchCategories(activeCo.id);
            fetchUserTypes(activeCo.id);
            fetchEmployees(activeCo.id);
          } else {
            fetchCategories();
            fetchUserTypes();
            fetchEmployees();
          }
      }
    } catch (error) {
      console.error('Failed to fetch companies', error);
    }
  };

  const fetchEmployees = async (coId?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = API_URL(activeEntity);
      const url = coId 
        ? `${baseUrl}?company_id=${coId}&t=${Date.now()}`
        : `${baseUrl}?t=${Date.now()}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success) {
        console.log("sj",data.data);
        
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddressChange = (index: number, field: string, value: string) => {
    const newAddresses = [...formData.addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setFormData({ ...formData, addresses: newAddresses });
  };

  const copyCommunicationAddress = () => {
    const comm = formData.addresses[0];
    if (!comm.street && !comm.city && !comm.state) {
      info('Communication address is empty.');
      return;
    }
    const newAddresses = [...formData.addresses];
    newAddresses[1] = {
      ...newAddresses[1],
      street: comm.street,
      city: comm.city,
      state: comm.state,
      zip_code: comm.zip_code,
      country: comm.country
    };
    setFormData({ ...formData, addresses: newAddresses });
    success('Address copied successfully!');
  };

  const handleNestedRowChange = (collection: keyof typeof formData, index: number, field: string, value: any) => {
    const list = [...(formData[collection] as any[])];
    list[index][field] = value;
    setFormData({ ...formData, [collection]: list });
  };

  const addNestedRow = (collection: keyof typeof formData, defaultObj: any) => {
    setFormData({ ...formData, [collection]: [...(formData[collection] as any[]), defaultObj] });
  };

  const removeNestedRow = (collection: keyof typeof formData, index: number) => {
    const list = [...(formData[collection] as any[])];
    list.splice(index, 1);
    setFormData({ ...formData, [collection]: list });
  };

  const downloadEmployeeList = () => {
    if (employees.length === 0) {
      info('No employee data available to export.');
      return;
    }
    
    const headers = ['Emp Code', 'Full Name', 'Username/Email', 'Role', 'Company', 'DOB', 'Guarantor', 'Married', 'Has License', 'Has Passport'];
    const rows = employees.map(emp => {
      const formatDate = (dateStr: any) => {
        if (!dateStr || dateStr === 'null') return 'N/A';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        } catch (e) {
          return dateStr;
        }
      };

      return [
        `"${(emp.employee_code || 'SYS').replace(/"/g, '""')}"`,
        `"${(emp.name || '').replace(/"/g, '""')}"`,
        `"${(emp.username || '').replace(/"/g, '""')}"`,
        `"${(emp.user_types?.name || 'User').replace(/"/g, '""')}"`,
        `"${(emp.companies?.company_name || 'N/A').replace(/"/g, '""')}"`,
        `"'${formatDate(emp.date_of_birth)}'"`, // Prepend single quote after the double quote to force text in Excel
        `"${(emp.guarantor_name || 'N/A').replace(/"/g, '""')}"`,
        `"${emp.is_married ? 'Yes' : 'No'}"`,
        `"${emp.has_license ? 'Yes' : 'No'}"`,
        `"${emp.has_passport ? 'Yes' : 'No'}"`
      ];
    });
    
    const csvContent = [headers.map(h => `"${h}"`), ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `employee_list_${activeTenant.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Detailed employee list exported successfully!');
  };

  const saveEmployee = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `${API_URL(activeEntity)}/${editingId}` : API_URL(activeEntity);
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const submittedCreds = { username: formData.username, password: formData.password };
      const data = await res.json();
      if (data.success) {
        if (!editingId) {
           setNewEmployeePopup(submittedCreds);
        } else {
           success('Employee record updated successfully!');
        }
        setShowForm(false);
        setEditingId(null);
        fetchEmployees(formData.company_id); // Refresh list for active company
        // Reset form
        setFormData({
          employee_code: '', name: '', username: '', password: '', date_of_birth: '', 
          addresses: [
            { address_type: 'Communication', street: '', city: '', state: '', zip_code: '', country: 'India' },
            { address_type: 'Permanent', street: '', city: '', state: '', zip_code: '', country: 'India' }
          ],
          company_id: '', has_license: false, has_passport: false, type: '',
          guarantor_name: '', is_married: false, family_details: '', category_id: '',
          employee_qualifications: [], employee_experiences: [], employee_certificates: [], employee_licenses: [], employee_passports: [], employee_loans: [], employee_targets: [], employee_suspenses: [], employee_incentive_slabs: []
        });
        setActiveTab('personal');
      } else {
        error(data.message || 'Operation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const editEmployee = (emp: any) => {
    setEditingId(emp.id);
    setFormData({
      employee_code: emp.employee_code || '',
      name: emp.name || '',
      username: emp.username || '',
      password: '', // Leave blank unless they want to change it
      date_of_birth: emp.date_of_birth ? emp.date_of_birth.split('T')[0] : '',
      addresses: [
        emp.addresses?.find((a: any) => a.address_type === 'Communication') || { address_type: 'Communication', street: '', city: '', state: '', zip_code: '', country: 'India' },
        emp.addresses?.find((a: any) => a.address_type === 'Permanent') || { address_type: 'Permanent', street: '', city: '', state: '', zip_code: '', country: 'India' }
      ],
      company_id: emp.company_id || '',
      has_license: emp.has_license || false,
      has_passport: emp.has_passport || false,
      type: emp.type || '',
      guarantor_name: emp.guarantor_name || '',
      is_married: emp.is_married || false,
      family_details: emp.family_details || '',
      category_id: emp.category_id || '',
      employee_qualifications: emp.employee_qualifications || [],
      employee_experiences: emp.employee_experiences || [],
      employee_certificates: emp.employee_certificates || [],
      employee_licenses: emp.employee_licenses || [],
      employee_passports: emp.employee_passports || [],
      employee_loans: emp.employee_loans || [],
      employee_targets: emp.employee_targets || [],
      employee_suspenses: emp.employee_suspenses || [],
      employee_incentive_slabs: emp.employee_incentive_slabs || []
    });
    setIsViewMode(false);
    setActiveTab('personal');
    setShowForm(true);
  };

  const viewEmployee = (emp: any) => {
    editEmployee(emp);
    setIsViewMode(true);
  };

  const deleteEmployee = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this employee? This will permanently erase their credentials and bio-data.',
      type: 'danger',
      confirmLabel: 'Erase Data'
    });
    if (!isConfirmed) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL(activeEntity)}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (data.success) {
        success('Employee records purged.');
        fetchEmployees(formData.company_id);
      } else {
        error(data.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {newEmployeePopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border-none bg-card">
            <CardHeader className="bg-emerald-500/10 pb-6 border-b border-border text-center rounded-t-xl">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
              <CardTitle className="text-2xl text-emerald-500">Employee Registered!</CardTitle>
              <CardDescription className="text-emerald-500/80 font-medium">System access credentials successfully configured.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-muted/30 p-4 rounded-xl text-sm border border-border space-y-3">
                 <div className="flex justify-between items-center bg-card p-3 rounded-lg border border-border shadow-sm">
                   <span className="text-muted-foreground font-semibold tracking-wide uppercase text-xs">Username</span>
                   <span className="font-mono text-base font-bold text-foreground">{newEmployeePopup.username}</span>
                 </div>
                 <div className="flex justify-between items-center bg-card p-3 rounded-lg border border-border shadow-sm">
                   <span className="text-muted-foreground font-semibold tracking-wide uppercase text-xs">Password</span>
                   <span className="font-mono text-base font-bold tracking-wider text-foreground">{newEmployeePopup.password}</span>
                 </div>
              </div>

               <Button onClick={() => {
                  navigator.clipboard.writeText(`Maxtron Login Credentials\nUsername: ${newEmployeePopup.username}\nPassword: ${newEmployeePopup.password}`);
                  info('Access credentials copied to clipboard.');
                }}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm" variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy to Clipboard
              </Button>
              
              <div className="flex items-start p-4 bg-amber-50 rounded-xl border border-amber-200 mt-6 shadow-sm">
                 <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-amber-550 flex-none" />
                 <p className="text-xs font-medium leading-relaxed text-amber-800">
                   <strong>Strict Security Notice:</strong> Please securely provide these initial credentials to the employee. They will be strictly required to change their password upon their immediate first login.
                 </p>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl">
              <Button onClick={() => setNewEmployeePopup(null)} className="w-full bg-slate-800 hover:bg-slate-900 shadow-md">Acknowledge & Close</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary font-heading">Employee Management</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1 md:mt-2">Comprehensive staff directory with bio-data, technical skills, and access control.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {!showForm ? (
            <>
              <Button onClick={downloadEmployeeList} variant="outline" className="h-10 border-primary/20 text-primary hover:bg-primary/5 shadow-sm font-bold order-2 sm:order-1">
                 <Download className="w-4 h-4 mr-2" /> <span className="sm:hidden">Export</span><span className="hidden sm:inline">Download Employee List</span>
              </Button>
              {hasPermission('hr_employee_view', 'create') && (
                <Button onClick={() => {
                  setEditingId(null);
                  const defaultCompany = companies.find((c: any) => c.company_name?.toUpperCase().includes(activeTenant));
                  setFormData({ 
                    employee_code: '', name: '', username: '', password: '', date_of_birth: '', 
                    addresses: [
                      { address_type: 'Communication', street: '', city: '', state: '', zip_code: '', country: 'India' },
                      { address_type: 'Permanent', street: '', city: '', state: '', zip_code: '', country: 'India' }
                    ],
                    company_id: defaultCompany ? defaultCompany.id : '', has_license: false, has_passport: false, type: '', guarantor_name: '', is_married: false, family_details: '', category_id: '', employee_qualifications: [], employee_experiences: [], employee_certificates: [], employee_licenses: [], employee_passports: [], employee_loans: [], employee_targets: [], employee_suspenses: [], employee_incentive_slabs: [] 
                  });
                  setIsViewMode(false);
                  setShowForm(true);
                }} className="h-10 md:h-11 bg-primary hover:bg-primary/95 text-white shadow-lg transition-all font-bold order-1 sm:order-2 px-6 rounded-full">
                  <Plus className="w-5 h-5 mr-2" /> Add Employee
                </Button>
              )}
            </>
          ) : (
            <div className="flex space-x-2 md:space-x-3 w-full">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setActiveTab('personal'); }} className="flex-1 sm:flex-none border-primary/10 rounded-full h-10 md:h-11">
                <X className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Cancel</span>
              </Button>
              {activeTab !== 'personal' && (
                <Button variant="outline" onClick={() => setActiveTab(activeTab === 'financials' ? 'qualifications' : 'personal')} className="flex-1 sm:flex-none border-primary/10 rounded-full h-10 md:h-11">
                  <ChevronLeft className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Back</span>
                </Button>
              )}
              <Button onClick={() => {
                if (activeTab === 'personal') setActiveTab('qualifications');
                else if (activeTab === 'qualifications') setActiveTab('financials');
                else if (isViewMode) { setShowForm(false); setIsViewMode(false); setActiveTab('personal'); }
                else saveEmployee();
              }} 
              loading={submitting}
              className="flex-[2] sm:flex-none bg-primary hover:bg-primary/95 text-white shadow-lg rounded-full h-10 md:h-11 font-bold"
              >
                {isViewMode && activeTab === 'financials' ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Done</>
                ) : activeTab === 'financials' ? (
                  <><Save className="w-4 h-4 mr-2" /> {editingId ? 'Update' : 'Save'}</>
                ) : (
                  <>Next <ChevronRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {!showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Staff</p>
                  <h3 className="text-2xl md:text-3xl font-black text-primary mt-1">{employees.length}</h3>
                </div>
                <div className="bg-primary/5 p-3 rounded-2xl shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Management</p>
                  <h3 className="text-2xl md:text-3xl font-black text-rose-500 mt-1">
                    {employees.filter(e => e.employee_categories?.category_name === "Management").length}
                  </h3>
                </div>
                <div className="bg-rose-50 p-3 rounded-2xl shrink-0">
                  <Briefcase className="w-6 h-6 text-rose-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hidden lg:block bg-white border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Operational</p>
                  <h3 className="text-3xl font-black text-blue-500 mt-1">
                    {employees.filter(e => !e.user_types?.name?.includes('ADMIN')).length}
                  </h3>
                </div>
                <div className="bg-blue-50 p-3 rounded-2xl shrink-0">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto mb-6">
              <TabsList className="flex w-full min-w-[480px] overflow-hidden">
                <TabsTrigger value="personal" className="flex-1"><UserPlus className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Basic Details</span><span className="sm:hidden">Basic</span></TabsTrigger>
                <TabsTrigger value="qualifications" className="flex-1"><Briefcase className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Professional & Experience</span><span className="sm:hidden">Work</span></TabsTrigger>
                <TabsTrigger value="financials" className="flex-1"><FileText className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Financials & Docs</span><span className="sm:hidden">Finance</span></TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="personal">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="bg-primary/5 border-b border-primary/10 p-4 md:p-6">
                    <CardTitle className="text-lg md:text-xl text-primary flex items-center">
                      <UserPlus className="w-5 h-5 mr-3 text-secondary" />
                      {isViewMode ? 'View Employee Details' : editingId ? 'Edit Personal Details' : 'Personal Details'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Employee Code</label>
                        <Input 
                          name="employee_code" 
                          value={!editingId ? 'AUTO-GENERATED' : formData.employee_code} 
                          disabled={true} 
                          className="h-10 md:h-11 bg-slate-50 font-mono font-bold text-secondary text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                        <Input name="name" value={formData.name} onChange={handleInputChange} disabled={isViewMode} placeholder="John Doe" className="h-10 md:h-11 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
                        <Input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} disabled={isViewMode} className="h-10 md:h-11" />
                      </div>
                      <div className="space-y-4 col-span-full md:col-span-1 lg:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                        <h3 className="text-xs font-black text-primary uppercase tracking-widest">Communication Address</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="space-y-2 sm:col-span-2">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Street / Building</label>
                             <Input value={formData.addresses[0]?.street} onChange={(e) => handleAddressChange(0, 'street', e.target.value)} disabled={isViewMode} placeholder="123 Main St..." className="h-10 text-sm" />
                           </div>
                           <div className="space-y-2 text-sm">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">City</label>
                             <Input value={formData.addresses[0]?.city} onChange={(e) => handleAddressChange(0, 'city', e.target.value)} disabled={isViewMode} placeholder="City" className="h-10" />
                           </div>
                           <div className="space-y-2 text-sm">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">State</label>
                             <Input value={formData.addresses[0]?.state} onChange={(e) => handleAddressChange(0, 'state', e.target.value)} disabled={isViewMode} placeholder="State" className="h-10" />
                           </div>
                        </div>
                      </div>
 
                      <div className="space-y-4 col-span-full bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-xs font-black text-primary uppercase tracking-widest">Permanent Address</h3>
                          {!isViewMode && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={copyCommunicationAddress}
                              className="h-7 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-full transition-all"
                            >
                              <Copy className="w-3 h-3 mr-1" /> Same as Communication
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="space-y-2 sm:col-span-2">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Street / Building</label>
                             <Input value={formData.addresses[1]?.street} onChange={(e) => handleAddressChange(1, 'street', e.target.value)} disabled={isViewMode} placeholder="Permanent home street..." className="h-10 text-sm" />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">City</label>
                             <Input value={formData.addresses[1]?.city} onChange={(e) => handleAddressChange(1, 'city', e.target.value)} disabled={isViewMode} placeholder="City" className="h-10" />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">State</label>
                             <Input value={formData.addresses[1]?.state} onChange={(e) => handleAddressChange(1, 'state', e.target.value)} disabled={isViewMode} placeholder="State" className="h-10" />
                           </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Guarantor Name</label>
                        <Input name="guarantor_name" value={formData.guarantor_name} onChange={handleInputChange} disabled={isViewMode} placeholder="Name of Guarantor" className="h-10" />
                      </div>
                      <div className="space-y-2 flex items-center h-full pt-4">
                        <label className="flex items-center space-x-3 text-sm font-bold text-slate-600 cursor-pointer bg-slate-50 px-4 py-2 rounded-full border border-slate-100 hover:bg-slate-100 transition-colors">
                          <input 
                             type="checkbox" 
                             name="is_married" 
                             checked={formData.is_married} 
                             onChange={(e) => !isViewMode && setFormData({...formData, is_married: e.target.checked})} 
                             disabled={isViewMode}
                             className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                          />
                          <span>Is Married?</span>
                        </label>
                      </div>
                      {formData.is_married && (
                          <div className="space-y-2 col-span-full">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Family Details</label>
                            <textarea 
                                name="family_details" 
                                value={formData.family_details} 
                                maxLength={50}
                                onChange={handleInputChange as any} 
                                disabled={isViewMode}
                                placeholder="Spouse / Children details..."
                                className="w-full h-20 p-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                            />
                          </div>
                      )}
                    </div>
                  </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary">System & Role Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Employee Category</label>
                <select 
                  name="category_id" 
                  value={formData.category_id} 
                  onChange={handleInputChange} 
                  disabled={isViewMode}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-primary font-medium disabled:opacity-50"
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Login Email (Username)</label>
                <Input name="username" value={formData.username} onChange={handleInputChange} disabled={isViewMode} placeholder="john@maxtron.com" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Company / Department Appointed</label>
                <select 
                  name="company_id" 
                  value={formData.company_id} 
                  onChange={handleInputChange} 
                  disabled={true}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-primary font-medium disabled:opacity-50"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">{editingId ? 'Change Password (Optional)' : 'Appoint Temporary Password'}</label>
                <Input type="password" name="password" value={formData.password} onChange={handleInputChange} disabled={isViewMode} placeholder={isViewMode ? '••••••••' : editingId ? 'Leave blank to keep unchanged' : '••••••••'} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">System Role</label>
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleInputChange} 
                  disabled={isViewMode}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-primary font-medium disabled:opacity-50"
                >
                  <option value="" disabled>Select System Role</option>
                  {userTypes.map((role) => (
                    <option key={role.id} value={role.id}>{(role.name || '').toUpperCase()} - {role.description}</option>
                  ))}
                </select>
              </div>
            </CardContent>
              </Card>
             </div>
            </TabsContent>

            <TabsContent value="qualifications">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-primary flex items-center">
                    <Briefcase className="w-5 h-5 mr-2" />
                    Qualifications & Experience
                  </CardTitle>
                  <CardDescription>Manage educational background and past work experience entries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-foreground/90">Educational Qualifications</h3>
                        {!isViewMode && (
                          <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_qualifications', { qualification_type: 'BASIC', qualification_name: '' })}>
                             <Plus className="w-4 h-4 mr-1" /> Add Qualification
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {formData.employee_qualifications.map((q, idx) => (
                           <div key={idx} className="flex gap-4 items-center animate-in fade-in">
                              <select 
                                value={q.qualification_type} 
                                onChange={(e) => handleNestedRowChange('employee_qualifications', idx, 'qualification_type', e.target.value)}
                                disabled={isViewMode}
                                className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                              >
                                <option value="BASIC">Basic</option>
                                <option value="ADDITIONAL">Additional</option>
                              </select>
                              <Input 
                                placeholder="Qualification Details (e.g. Master's in IT)" 
                                value={q.qualification_name}
                                onChange={(e) => handleNestedRowChange('employee_qualifications', idx, 'qualification_name', e.target.value)}
                                disabled={isViewMode}
                                className="flex-1"
                              />
                              {!isViewMode && (
                                <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removeNestedRow('employee_qualifications', idx)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                           </div>
                        ))}
                        {formData.employee_qualifications.length === 0 && <p className="text-sm text-foreground/50 border border-dashed rounded-lg p-4 text-center">No qualifications recorded yet.</p>}
                      </div>
                    </div>

                    <hr className="border-border" />

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-foreground/90">Past Work Experience</h3>
                        {!isViewMode && (
                          <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_experiences', { company_name: '', from_period: '', to_period: '', post: '', responsibilities: '' })}>
                             <Plus className="w-4 h-4 mr-1" /> Add Experience
                          </Button>
                        )}
                      </div>
                      <div className="space-y-4">
                        {formData.employee_experiences.map((exp, idx) => (
                           <div key={idx} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-start animate-in fade-in bg-muted/20 p-4 rounded-lg relative">
                              <div className="col-span-2 md:col-span-3 space-y-1">
                                <label className="text-xs text-muted-foreground">Company Name</label>
                                <Input value={exp.company_name} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'company_name', e.target.value)} disabled={isViewMode} placeholder="Previous Employer" />
                              </div>
                              <div className="col-span-1 md:col-span-2 space-y-1">
                                <label className="text-xs text-muted-foreground">From</label>
                                <Input type="date" value={exp.from_period?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'from_period', e.target.value)} disabled={isViewMode} />
                              </div>
                              <div className="col-span-1 md:col-span-2 space-y-1">
                                <label className="text-xs text-muted-foreground">To</label>
                                <Input type="date" value={exp.to_period?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'to_period', e.target.value)} disabled={isViewMode} />
                              </div>
                              <div className="col-span-2 md:col-span-2 space-y-1">
                                <label className="text-xs text-muted-foreground">Post/Job Title</label>
                                <Input value={exp.post} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'post', e.target.value)} disabled={isViewMode} placeholder="Engineer" />
                              </div>
                              <div className="col-span-2 md:col-span-3 space-y-1">
                                <label className="text-xs text-muted-foreground">Responsibilities</label>
                                <Input value={exp.responsibilities} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'responsibilities', e.target.value)} disabled={isViewMode} placeholder="Job duties..." />
                              </div>
                              {!isViewMode && (
                                <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeNestedRow('employee_experiences', idx)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                           </div>
                        ))}
                        {formData.employee_experiences.length === 0 && <p className="text-sm text-foreground/50 border border-dashed rounded-lg p-4 text-center">No experience history documented.</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financials">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-primary flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Financials, Compliance & Docs
                  </CardTitle>
                  <CardDescription>Manage passports, certificates, licenses, and advances here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  
                  {/* Licenses & Passports */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="flex items-center space-x-2 font-semibold text-foreground/90 cursor-pointer">
                            <input type="checkbox" checked={formData.has_license} onChange={(e) => !isViewMode && setFormData({...formData, has_license: e.target.checked})} disabled={isViewMode} className="rounded text-primary focus:ring-primary" />
                            <span>License Holder (YES/NO)</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="flex items-center space-x-2 font-semibold text-foreground/90 cursor-pointer">
                            <input type="checkbox" checked={formData.has_passport} onChange={(e) => !isViewMode && setFormData({...formData, has_passport: e.target.checked})} disabled={isViewMode} className="rounded text-primary focus:ring-primary" />
                            <span>Passport Holder (YES/NO)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <hr className="border-border" />

                  {/* Certificates */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-foreground/90">Certifications (Medical / Police)</h3>
                      {!isViewMode && (
                        <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_certificates', { certificate_type: 'MEDICAL', issued: false, issue_date: '', expiry_date: '' })}>
                           <Plus className="w-4 h-4 mr-1" /> <span className="hidden lg:block">Add Certificate</span>
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {formData.employee_certificates.map((cert, idx) => (
                         <div key={idx} className="grid lg:flex gap-3 items-center animate-in fade-in bg-muted/20 p-3 rounded-lg">
                            <div className="space-y-1 flex-none w-full lg:w-48">
                              <label className="text-xs text-muted-foreground">Type</label>
                              <select 
                                value={cert.certificate_type} 
                                onChange={(e) => handleNestedRowChange('employee_certificates', idx, 'certificate_type', e.target.value)}
                                disabled={isViewMode}
                                className="flex h-9 w-full rounded-md border border-input bg-card/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                              >
                                <option value="MEDICAL">Medical Certificate</option>
                                <option value="POLICE_VERIFICATION">Police Verification</option>
                              </select>
                            </div>
                            {/* <div className="space-y-1 flex-none w-20">
                              <label className="text-xs text-muted-foreground">Issued?</label>
                              <div className="h-9 flex items-center">
                                <input type="checkbox" checked={cert.issued} onChange={(e) => !isViewMode && handleNestedRowChange('employee_certificates', idx, 'issued', e.target.checked)} disabled={isViewMode} className="rounded w-4 h-4 text-primary focus:ring-primary" />
                              </div>
                            </div> */}
                            <div className="space-y-1 flex-1">
                              <label className="text-xs text-muted-foreground">Issue Date</label>
                              <Input type="date" value={cert.issue_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_certificates', idx, 'issue_date', e.target.value)} disabled={isViewMode} />
                            </div>
                            <div className="space-y-1 flex-1">
                              <label className="text-xs text-muted-foreground">Expiry Date</label>
                              <Input type="date" value={cert.expiry_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_certificates', idx, 'expiry_date', e.target.value)} disabled={isViewMode} />
                            </div>
                            <div className="pt-5 flex-none w-10 text-right">
                               {!isViewMode && (
                                 <Button size="icon" variant="ghost" className="text-destructive shrink-0 hover:bg-destructive/10" onClick={() => removeNestedRow('employee_certificates', idx)}>
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               )}
                            </div>
                         </div>
                      ))}
                      {formData.employee_certificates.length === 0 && <p className="text-sm text-foreground/50 border border-dashed rounded-lg p-3 text-center">No compliance certificates documented.</p>}
                    </div>
                  </div>

                  <hr className="border-border" />

                  {/* Financial loans & Targets */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-foreground/90">Loan Amount</h3>
                        {!isViewMode && (
                          <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_loans', { loan_availed: '', balance_receivable: '', loan_date: '' })}>
                             <Plus className="w-4 h-4 mr-1" /> Add Row
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {formData.employee_loans.map((loan, idx) => (
                           <div key={idx} className="grid lg:flex gap-2 items-center animate-in fade-in">
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Loan Availed ₹</label>
                                <Input type="number" placeholder="0.00" value={loan.loan_availed} onChange={(e) => handleNestedRowChange('employee_loans', idx, 'loan_availed', e.target.value)} disabled={isViewMode} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Balance Recived ₹</label>
                                <Input type="number" placeholder="0.00" value={loan.balance_receivable} onChange={(e) => handleNestedRowChange('employee_loans', idx, 'balance_receivable', e.target.value)} disabled={isViewMode} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Date Issued</label>
                                <Input type="date" value={loan.loan_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_loans', idx, 'loan_date', e.target.value)} disabled={isViewMode} />
                              </div>
                              <div className="pt-5">
                               {!isViewMode && (
                                 <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_loans', idx)}>
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               )}
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-foreground/90">Suspense Amounts</h3>
                        {!isViewMode && (
                          <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_suspenses', { suspense_issued: '', balance_receivable: '' })}>
                             <Plus className="w-4 h-4 mr-1" /> Add Row
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                         {formData.employee_suspenses.map((susp, idx) => (
                           <div key={idx} className="flex gap-2 items-center animate-in fade-in">
                                <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Suspense Issued</label>
                                <Input type="number" placeholder="Suspense Issued ₹" value={susp.suspense_issued} onChange={(e) => handleNestedRowChange('employee_suspenses', idx, 'suspense_issued', e.target.value)} disabled={isViewMode} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Balance Recived ₹</label>
                                <Input type="number" placeholder="Balance Recived ₹" value={susp.balance_receivable} onChange={(e) => handleNestedRowChange('employee_suspenses', idx, 'balance_receivable', e.target.value)} disabled={isViewMode} />
                              </div>
                               {!isViewMode && (
                                 <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_suspenses', idx)}>
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               )}
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <hr className="border-border" />

                  {/* Targets & Incentives */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-foreground/90">Minimum Targets</h3>
                        {!isViewMode && (
                          <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_targets', { minimum_target: '' })}>
                             <Plus className="w-4 h-4 mr-1" /> Add Target
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {formData.employee_targets.map((tgt, idx) => (
                           <div key={idx} className="flex gap-2 items-center animate-in fade-in">
                              <Input type="number" placeholder="Target Minimum" value={tgt.minimum_target} onChange={(e) => handleNestedRowChange('employee_targets', idx, 'minimum_target', e.target.value)} disabled={isViewMode} />
                               {!isViewMode && (
                                 <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_targets', idx)}>
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               )}
                           </div>
                        ))}
                      </div>
                     </div>

                     <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-foreground/90">Incentive Slabs</h3>
                        {!isViewMode && (
                          <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_incentive_slabs', { slab_from: '', slab_to: '', incentive_percent: '' })}>
                             <Plus className="w-4 h-4 mr-1" /> Add Slab
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                         {formData.employee_incentive_slabs.map((slab, idx) => (
                           <div key={idx} className="grid lg:flex gap-2 items-center animate-in fade-in">
                              <Input type="number" placeholder="From Amount" value={slab.slab_from} onChange={(e) => handleNestedRowChange('employee_incentive_slabs', idx, 'slab_from', e.target.value)} disabled={isViewMode} />
                              <Input type="number" placeholder="To Amount" value={slab.slab_to} onChange={(e) => handleNestedRowChange('employee_incentive_slabs', idx, 'slab_to', e.target.value)} disabled={isViewMode} />
                              <Input type="number" placeholder="Percent (%)" value={slab.incentive_percent} onChange={(e) => handleNestedRowChange('employee_incentive_slabs', idx, 'incentive_percent', e.target.value)} disabled={isViewMode} />
                               {!isViewMode && (
                                 <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_incentive_slabs', idx)}>
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               )}
                           </div>
                        ))}
                      </div>
                     </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Existing Employees Table Section */}
      {!showForm && (
        <Card className="mt-8 border-border/40 shadow-sm overflow-hidden bg-card">
          <CardHeader className="grid md:flex flex-row items-center justify-between pb-6 border-b border-border">
          <div>
            <CardTitle className="text-xl text-primary font-bold">Registered Employees</CardTitle>
            <CardDescription className="text-muted-foreground">View, edit, or remove authenticated employee records.</CardDescription>
          </div>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                 className="pl-9 w-72 rounded-full border-border bg-muted/20" 
                 placeholder="Search by name or code..." 
                 value={searchQuery}
                 onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 md:px-6 pt-6">
          {(() => {
            const filteredEmployees = employees
              .filter((emp) => 
                 (emp.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                 (emp.employee_code?.toLowerCase() || '').includes(searchQuery.toLowerCase())
              )
              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage) || 1;
            const currentEmployees = filteredEmployees.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

            return (
              <>
                <div className="border border-border/60 rounded-xl mx-2 overflow-x-auto lg:overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-primary/5 text-primary border-b border-border/60">
                      <tr>
                        <th className="p-4 font-bold w-24 uppercase tracking-wider text-[11px]">Emp Code</th>
                        <th className="p-4 font-bold uppercase tracking-wider text-[11px]">Full Name</th>
                        <th className="p-4 font-bold uppercase tracking-wider text-[11px]">Department / Role</th>
                        <th className="p-4 font-bold uppercase tracking-wider text-[11px]">Contact Email</th>
                        <th className="p-4 font-bold text-right uppercase tracking-wider text-[11px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loading ? (
                        <tr><td colSpan={5} className="p-4 text-center">Loading employees...</td></tr>
                      ) : currentEmployees.length === 0 ? (
                        <tr><td colSpan={5} className="p-4 text-center text-foreground/60">No matching employees found.</td></tr>
                      ) : (
                        currentEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="p-4 font-bold text-secondary">{emp.employee_code || 'SYS'}</td>
                      <td className="p-4 font-bold text-foreground">{emp.name}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          emp.user_types?.name?.includes('ADMIN') ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                          emp.user_types?.name?.includes('HR') ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                          emp.user_types?.name?.includes('SALES') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }`}>
                          {emp.user_types?.name || 'User'}
                        </span>
                      </td>
                      <td className="p-4 text-foreground/60 font-mono text-xs">{emp.username}</td>
                      <td className="p-4 text-right space-x-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/10" onClick={() => viewEmployee(emp)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {hasPermission('hr_employee_view', 'edit') && (
                          <Button variant="outline" size="icon" className="h-8 w-8 text-secondary border-secondary/20 hover:bg-secondary/10" onClick={() => editEmployee(emp)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {hasPermission('hr_employee_view', 'delete') && (
                          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => deleteEmployee(emp.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="md:flex md:justify-between items-center mt-4 mx-2">
            <div className="text-sm text-muted-foreground">
              Showing {employees.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredEmployees.length)} of {filteredEmployees.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <div className="hidden md:flex items-center space-x-2 mr-4">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
                <select 
                  value={rowsPerPage} 
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <Button 
                variant="outline" size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="outline" size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage >= totalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      );
    })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
