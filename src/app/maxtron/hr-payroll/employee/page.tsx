'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    UserPlus, Save, Upload, Search, Edit, Trash2, Plus, X, 
    Briefcase, FileText, ChevronRight, ChevronLeft, CheckCircle2,
    DollarSign, Lock, Copy, AlertCircle, Users, TrendingUp, 
    FileDown, Download, Eye, EyeOff 
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination';
import { exportToExcel } from '@/utils/export';

const API_URL = (activeEntity: string) => `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/employees`;

export default function EmployeeInformationPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [isViewMode, setIsViewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newEmployeePopup, setNewEmployeePopup] = useState<{username: string, password: string} | null>(null);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [userTypes, setUserTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermission();
  const router = useRouter();
  
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

  // Calculate 18 years ago for DOB selection
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  const maxDobDate = eighteenYearsAgo.toISOString().split('T')[0];
  
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
    phone: '',
    aadhaar: '',
    type: '',
    guarantor_name: '',
    is_married: false,
    family_details: '',
    category_id: '',
    basic_salary: 0,
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
      console.log("sj cate ",data.data);
      
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
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const isAdmin = user?.role_name?.toLowerCase() === 'admin' || user?.email?.toLowerCase() === 'admin@maxtron.com';
      const isManagement = user?.category?.category_name?.toLowerCase() === 'management';

      const baseUrl = API_URL(activeEntity);
      let url = coId 
        ? `${baseUrl}?company_id=${coId}&t=${Date.now()}&is_deleted=${showDeactivated}`
        : `${baseUrl}?t=${Date.now()}&is_deleted=${showDeactivated}`;

      console.log("sj user",user);

      // If NOT admin, filter by their own category only
      // if (!isAdmin && user?.category_id) {
      //   url += `&category_id=${user.category_id}`;
      // }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      console.log("sj data",data.data); 
      
      if (data.success) {
        if(isAdmin){
          setEmployees(data.data);
        }else if (isManagement) {
          setEmployees(data.data.filter((e: any) => e.user_types?.name?.toLowerCase() === user?.role_name?.toLowerCase()));
        }else{
          setEmployees(data.data.filter((e: any) => e.id === user?.id));
        }
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value, type } = e.target;
    updateFormData(name, value, type);
  };

  const updateFormData = (name: string, value: any, type?: string) => {
    let val = value;
    // Restrict to digits only for phone and aadhaar
    if (name === 'phone' || name === 'aadhaar') {
      val = val.replace(/\D/g, '');
    }

    // Restrict negative values for number inputs
    if (type === 'number' && Number(val) < 0) {
      val = '0';
    }
    setFormData(prev => ({ ...prev, [name]: val }));
    
    // Auto-clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
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
    
    // Restrict negative values for numeric fields
    const numericFields = ['loan_availed', 'balance_receivable', 'suspense_issued', 'minimum_target', 'slab_from', 'slab_to', 'incentive_percent'];
    if (numericFields.includes(field) && Number(value) < 0) {
      value = '0';
    }

    const today = new Date().toISOString().split('T')[0];

    // Work Experience Validations
    if (collection === 'employee_experiences') {
      if ((field === 'from_period' || field === 'to_period') && value > today) {
        error("Future dates are not allowed for past work experience.");
        return;
      }
      if (field === 'to_period' && list[index].from_period && value <= list[index].from_period) {
        error("'To' date must be strictly greater than 'From' date.");
        return;
      }
      if (field === 'from_period' && list[index].to_period && value >= list[index].to_period) {
        error("'From' date must be strictly before 'To' date.");
        return;
      }
    }

    // Certification Validations
    if (collection === 'employee_certificates') {
      if (field === 'issue_date' && value > today) {
        error("Issue date cannot be in the future.");
        return;
      }
      if (field === 'expiry_date' && list[index].issue_date && value < list[index].issue_date) {
        error("Expiry date cannot be before issue date.");
        return;
      }
      if (field === 'issue_date' && list[index].expiry_date && value > list[index].expiry_date) {
        error("Issue date cannot be after expiry date.");
        return;
      }
    }

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

  const downloadEmployeeList = async () => {
    if (employees.length === 0) {
      info('No employee data available to export.');
      return;
    }
    
    const headers = [
      'Emp Code', 'Full Name', 'Username/Email', 'Phone', 'Aadhaar', 
      'Role', 'Category', 'Company', 'DOB', 'Salary', 
      'Guarantor', 'Married', 'Has License', 'Has Passport'
    ];

    const rows = employees.map(emp => {
      const formatDate = (dateStr: any) => {
        if (!dateStr || dateStr === 'null') return 'N/A';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        } catch (e) { return dateStr; }
      };

      return [
        emp.employee_code || 'SYS',
        emp.name || 'N/A',
        emp.username || 'N/A',
        emp.phone || 'N/A',
        emp.aadhaar || 'N/A',
        emp.user_types?.name || 'User',
        emp.employee_categories?.category_name || 'N/A',
        emp.companies?.company_name || 'N/A',
        formatDate(emp.date_of_birth),
        Number(emp.basic_salary) || 0,
        emp.guarantor_name || 'N/A',
        emp.is_married ? 'Yes' : 'No',
        emp.has_license ? 'Yes' : 'No',
        emp.has_passport ? 'Yes' : 'No'
      ];
    });
    
    await exportToExcel({
      headers,
      rows,
      filename: `employee_list_${activeTenant.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Staff Directory'
    });

    success('Detailed employee list exported successfully!');
  };

  const validatePersonalTab = () => {
    const requiredFields: {key: keyof typeof formData, label: string}[] = [
      { key: 'name', label: 'Full Name' },
      { key: 'date_of_birth', label: 'Date of Birth' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'aadhaar', label: 'Aadhaar Card No' },
      { key: 'category_id', label: 'Employee Category' },
      { key: 'type', label: 'System Role' },
      { key: 'username', label: 'Login Email' }
    ];

    const newErrors: Record<string, string> = {};

    for (const field of requiredFields) {
      if (!formData[field.key] || String(formData[field.key]).trim() === '') {
        newErrors[field.key] = `${field.label} required`;
      }
    }

    const nameRegex = /^[a-zA-Z0-9\s-]+$/;
    if (formData.name && !nameRegex.test(formData.name.trim())) {
        newErrors.name = 'Invalid characters (A-Z, 0-9, -)';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.username && !emailRegex.test(formData.username)) {
      newErrors.username = 'Invalid email format';
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Must be 10 digits';
    }

    if (!editingId && !formData.password) {
      newErrors.password = 'Password required';
    }

    if (formData.password) {
      if (formData.password.length < 8) newErrors.password = 'Min 8 characters';
      else if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Need uppercase';
      else if (!/\d/.test(formData.password)) newErrors.password = 'Need number';
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) newErrors.password = 'Need special char';
    }

    if (formData.aadhaar && !/^[2-9]{1}[0-9]{11}$/.test(formData.aadhaar)) {
      newErrors.aadhaar = 'Invalid Aadhaar (12 digits, no 0/1 start)';
    }

    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 18) newErrors.date_of_birth = 'Must be 18+ years old';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      error('Please correct the highlighted errors.');
      return false;
    }

    return true;
  };

  const validateQualificationsTab = () => {
    // Validate each experience entry
    for (const exp of formData.employee_experiences) {
      if (!exp.company_name || !exp.from_period || !exp.to_period || !exp.post) {
        error("Please complete all required fields for each Work Experience entry.");
        return false;
      }
      if (exp.to_period <= exp.from_period) {
        error(`Work Experience at ${exp.company_name}: 'To' date must be greater than 'From' date.`);
        return false;
      }
    }
    return true;
  };

  const saveEmployee = async () => {
    if (!validatePersonalTab()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `${API_URL(activeEntity)}/${editingId}` : API_URL(activeEntity);
      const method = editingId ? 'PUT' : 'POST';

      const sanitizedData = {
        ...formData,
        basic_salary: Number(formData.basic_salary) || 0,
        employee_loans: formData.employee_loans.map(l => ({
          ...l,
          loan_availed: Number(l.loan_availed) || 0,
          balance_receivable: Number(l.balance_receivable) || 0
        })),
        employee_suspenses: formData.employee_suspenses.map(s => ({
          ...s,
          suspense_issued: Number(s.suspense_issued) || 0,
          balance_receivable: Number(s.balance_receivable) || 0
        })),
        employee_targets: formData.employee_targets.map(t => ({
          ...t,
          minimum_target: Number(t.minimum_target) || 0
        })),
        employee_incentive_slabs: formData.employee_incentive_slabs.map(slab => ({
          ...slab,
          slab_from: Number(slab.slab_from) || 0,
          slab_to: Number(slab.slab_to) || 0,
          incentive_percent: Number(slab.incentive_percent) || 0
        }))
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sanitizedData)
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
          company_id: '', has_license: false, has_passport: false, phone: '', aadhaar: '', type: '',
          guarantor_name: '', is_married: false, family_details: '', category_id: '', basic_salary: 0,
          employee_qualifications: [], employee_experiences: [], employee_certificates: [], employee_licenses: [], employee_passports: [], employee_loans: [], employee_targets: [], employee_suspenses: [], employee_incentive_slabs: []
        });
        setErrors({});
        setActiveTab('personal');
      } else {
        error(data.error || data.message || 'Operation failed');
      }
    } catch (err: any) {
      error(err.message || 'Network error occurred');
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
      phone: emp.phone || '',
      aadhaar: emp.aadhaar || '',
      type: emp.type || '',
      guarantor_name: emp.guarantor_name || '',
      is_married: emp.is_married || false,
      family_details: emp.family_details || '',
      category_id: emp.category_id || '',
      basic_salary: Number(emp.basic_salary) || 0,
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
      message: 'Are you sure you want to deactivate this employee? They will no longer appear in active employee lists or attendance selections.',
      type: 'danger',
      confirmLabel: 'Deactivate'
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
        success('Employee deactivated successfully.');
        fetchEmployees(formData.company_id);
      } else {
        error(data.message || 'Failed to deactivate');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const activateEmployee = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to reactivate this employee? They will appear in active lists again and regain system access.',
      type: 'info',
      confirmLabel: 'Reactivate'
    });
    if (!isConfirmed) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL(activeEntity)}/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_deleted: false })
      });
      
      const data = await res.json();
      if (data.success) {
        success('Employee reactivated successfully.');
        fetchEmployees(formData.company_id);
      } else {
        error(data.message || 'Failed to reactivate');
      }
    } catch (error) {
      console.error('Error reactivating employee:', error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchEmployees(formData.company_id);
  }, [showDeactivated]);

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
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-base font-bold tracking-wider text-foreground">
                        {showTempPassword ? newEmployeePopup.password : '••••••••'}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                        onClick={() => setShowTempPassword(!showTempPassword)}
                      >
                        {showTempPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                    </div>
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
              <Button onClick={() => { setNewEmployeePopup(null); setShowTempPassword(false); }} className="w-full bg-slate-800 hover:bg-slate-900 shadow-md">Acknowledge & Close</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary font-heading">Employee Management</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1 md:mt-2">Comprehensive staff directory with bio-data, technical skills, and access control.</p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          {!showForm ? (
            <>
              <Button onClick={downloadEmployeeList} variant="outline" className="h-10 border-primary/20 text-primary hover:bg-primary/5 shadow-sm font-bold order-2 md:order-1 flex-1 md:flex-none transition-all hover:scale-105 active:scale-95">
                 <Download className="w-4 h-4 mr-2" /> <span className="md:hidden">Export Details</span><span className="hidden md:inline">Download Employee List</span>
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
                    company_id: defaultCompany ? defaultCompany.id : '', has_license: false, has_passport: false, phone: '', aadhaar: '', type: '', guarantor_name: '', is_married: false, family_details: '', category_id: '', basic_salary: 0, employee_qualifications: [], employee_experiences: [], employee_certificates: [], employee_licenses: [], employee_passports: [], employee_loans: [], employee_targets: [], employee_suspenses: [], employee_incentive_slabs: [] 
                  });
                  setIsViewMode(false);
                  setShowForm(true);
                }} className="h-10 md:h-11 bg-primary hover:bg-primary/95 text-white shadow-lg transition-all font-bold order-1 md:order-2 px-6 rounded-full flex-1 md:flex-none">
                  <Plus className="w-5 h-5 mr-2" /> Add Employee
                </Button>
              )}
            </>
          ) : (
            <div className="flex space-x-2 md:space-x-3 w-full md:w-auto">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setActiveTab('personal'); }} className="flex-1 md:flex-none border-primary/10 rounded-full h-10 md:h-11">
                <X className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Cancel</span>
              </Button>
              {activeTab !== 'personal' && (
                <Button variant="outline" onClick={() => setActiveTab(activeTab === 'financials' ? 'qualifications' : 'personal')} className="flex-1 md:flex-none border-primary/10 rounded-full h-10 md:h-11">
                  <ChevronLeft className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Back</span>
                </Button>
              )}
              <Button onClick={() => {
                if (activeTab === 'personal') {
                  if (validatePersonalTab()) setActiveTab('qualifications');
                }
                else if (activeTab === 'qualifications') {
                  if (validateQualificationsTab()) setActiveTab('financials');
                }
                else if (isViewMode) { setShowForm(false); setIsViewMode(false); setActiveTab('personal'); }
                else saveEmployee();
              }} 
              loading={submitting}
              className="flex-[2] md:flex-none bg-primary hover:bg-primary/95 text-white shadow-lg rounded-full h-10 md:h-11 font-bold"
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
                  <CardHeader className="bg-primary/5 border-b border-primary/10 p-4 md:p-6 rounded-2xl">
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
                          className="h-10 md:h-11 bg-slate-50 font-mono font-bold text-blue-600 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                        <Input name="name" value={formData.name} onChange={handleInputChange} disabled={isViewMode} placeholder="John Doe" className={`h-10 md:h-11 font-bold ${errors.name ? 'border-amber-400 bg-amber-50' : ''}`} />
                        {errors.name && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.name}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
                        <Input 
                           type="date" 
                           name="date_of_birth" 
                           max={maxDobDate}
                           value={formData.date_of_birth} 
                           onChange={handleInputChange} 
                           disabled={isViewMode} 
                           className={`h-10 md:h-11 ${errors.date_of_birth ? 'border-amber-400 bg-amber-50' : ''}`} 
                        />
                        {errors.date_of_birth && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.date_of_birth}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                        <Input name="phone" maxLength={10} value={formData.phone} onChange={handleInputChange} disabled={isViewMode} placeholder="10 Digit Number" className={`h-10 md:h-11 ${errors.phone ? 'border-amber-400 bg-amber-50' : ''}`} />
                        {errors.phone && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.phone}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Aadhaar Card No</label>
                        <Input name="aadhaar" maxLength={12} value={formData.aadhaar} onChange={handleInputChange} disabled={isViewMode} placeholder="12 Digit Number" className={`h-10 md:h-11 ${errors.aadhaar ? 'border-amber-400 bg-amber-50' : ''}`} />
                        {errors.aadhaar && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.aadhaar}</p>}
                      </div>
                      <div className="space-y-4 col-span-full md:col-span-1 lg:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                        <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">Communication Address</h3>
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
                          <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">Permanent Address</h3>
                          {!isViewMode && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={copyCommunicationAddress}
                              className="h-7 text-[10px] font-bold text-blue-600 bg-primary/10 hover:bg-primary/20 rounded-full transition-all"
                            >
                              <Copy className="w-3 h-3 mr-1" /> <span className="hidden md:block">Same as Communication</span>
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
                          <Checkbox 
                             name="is_married" 
                             checked={formData.is_married} 
                             onCheckedChange={(checked) => !isViewMode && setFormData({...formData, is_married: !!checked})} 
                             disabled={isViewMode}
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
                <Select value={formData.category_id} onValueChange={(val) => updateFormData('category_id', val)} disabled={isViewMode}>
                  <SelectTrigger className="w-full h-10 border-input bg-transparent px-3 py-1 text-sm shadow-sm font-medium">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.category_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Login Email {!formData.username && <span className="text-muted-foreground/50 text-[10px]">(Username)</span>}</label>
                <Input name="username" value={formData.username} onChange={handleInputChange} disabled={isViewMode} placeholder="john@maxtron.com" className={`${errors.username ? 'border-amber-400 bg-amber-50' : ''}`} />
                {errors.username && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Company / Department Appointed</label>
                <Select value={formData.company_id} onValueChange={(val) => updateFormData('company_id', val)} disabled={true}>
                  <SelectTrigger className="w-full h-10 border-input bg-transparent px-3 py-1 text-sm shadow-sm font-medium">
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">{editingId ? 'Change Password' : 'Appoint Temporary Password'} {!editingId && !formData.password && <span className="text-muted-foreground/50 text-[10px]">(Necessary)</span>}</label>
                <div className="relative">
                  <Input 
                    type={showFormPassword ? "text" : "password"} 
                    name="password" 
                    value={formData.password} 
                    onChange={handleInputChange} 
                    disabled={isViewMode} 
                    placeholder={isViewMode ? '••••••••' : editingId ? 'Leave blank to keep unchanged' : '••••••••'} 
                    className={`${errors.password ? 'border-amber-400 bg-amber-50' : ''}`}
                  />
                  {!isViewMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                    >
                      {showFormPassword ? <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />}
                    </Button>
                  )}
                </div>
                {errors.password && <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">System Role</label>
                <Select value={formData.type} onValueChange={(val) => updateFormData('type', val)} disabled={isViewMode}>
                  <SelectTrigger className="w-full h-10 border-input bg-transparent px-3 py-1 text-sm shadow-sm font-medium">
                    <SelectValue placeholder="Select System Role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {userTypes.map((role) => (
                      <SelectItem key={role.id} value={role.id}>{(role.name || '').toUpperCase()} - {role.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                              <Select value={q.qualification_type} onValueChange={(val) => handleNestedRowChange('employee_qualifications', idx, 'qualification_type', val)} disabled={isViewMode}>
                                <SelectTrigger className="h-9 w-40 border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200">
                                  <SelectItem value="BASIC">Basic</SelectItem>
                                  <SelectItem value="ADDITIONAL">Additional</SelectItem>
                                </SelectContent>
                              </Select>
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
                                <Input type="date" max={new Date().toISOString().split('T')[0]} value={exp.from_period?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'from_period', e.target.value)} disabled={isViewMode} />
                              </div>
                              <div className="col-span-1 md:col-span-2 space-y-1">
                                <label className="text-xs text-muted-foreground">To</label>
                                <Input type="date" max={new Date().toISOString().split('T')[0]} value={exp.to_period?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'to_period', e.target.value)} disabled={isViewMode} />
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
                  <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 mb-6">
                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center">
                            <DollarSign className="w-4 h-4 mr-2" />
                            Monthly Remuneration
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Base salary for payroll generation</p>
                       </div>
                       <div className="w-64 space-y-1 text-right">
                          <label className="text-[10px] font-bold text-primary uppercase tracking-widest mr-1">Basic Salary {!formData.basic_salary && <span className="text-[10px] font-medium lowercase">(₹)</span>}</label>
                          <Input 
                            type="number" 
                            name="basic_salary" 
                            value={Number(formData.basic_salary) || ''} 
                            onChange={handleInputChange} 
                            disabled={isViewMode} 
                            placeholder="0.00" 
                            className="h-12 font-black text-xl text-primary bg-white border-primary/20 rounded-xl text-right"
                            min="0"
                          />
                       </div>
                    </div>
                  </div>
                  
                  {/* Licenses & Passports */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="flex items-center space-x-2 font-semibold text-foreground/90 cursor-pointer">
                            <Checkbox checked={formData.has_license} onCheckedChange={(checked) => !isViewMode && setFormData({...formData, has_license: !!checked})} disabled={isViewMode} />
                            <span>License Holder (YES/NO)</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="flex items-center space-x-2 font-semibold text-foreground/90 cursor-pointer">
                            <Checkbox checked={formData.has_passport} onCheckedChange={(checked) => !isViewMode && setFormData({...formData, has_passport: !!checked})} disabled={isViewMode} />
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
                              <Select value={cert.certificate_type} onValueChange={(val) => handleNestedRowChange('employee_certificates', idx, 'certificate_type', val)} disabled={isViewMode}>
                                <SelectTrigger className="h-9 w-full border-input bg-card/50 px-3 py-1 text-sm shadow-sm">
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200">
                                  <SelectItem value="MEDICAL">Medical Certificate</SelectItem>
                                  <SelectItem value="POLICE_VERIFICATION">Police Verification</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* <div className="space-y-1 flex-none w-20">
                              <label className="text-xs text-muted-foreground">Issued?</label>
                              <div className="h-9 flex items-center">
                                <input type="checkbox" checked={cert.issued} onChange={(e) => !isViewMode && handleNestedRowChange('employee_certificates', idx, 'issued', e.target.checked)} disabled={isViewMode} className="rounded w-4 h-4 text-primary focus:ring-primary" />
                              </div>
                            </div> */}
                            <div className="space-y-1 flex-1">
                              <label className="text-xs text-muted-foreground">Issue Date</label>
                              <Input type="date" max={new Date().toISOString().split('T')[0]} value={cert.issue_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_certificates', idx, 'issue_date', e.target.value)} disabled={isViewMode} />
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
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              if (formData.employee_loans.length >= 3) {
                                info('Maximum limit of 3 loan entries reached.');
                                return;
                              }
                              addNestedRow('employee_loans', { loan_availed: '', balance_receivable: '', loan_date: '' });
                            }}
                          >
                             <Plus className="w-4 h-4 mr-1" /> Add Row
                          </Button>
                        )}

                      </div>
                      <div className="space-y-3">
                        {formData.employee_loans.map((loan, idx) => (
                           <div key={idx} className="grid lg:flex gap-2 items-center animate-in fade-in">
                               <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground font-bold tracking-tight">Loan Availed {!loan.loan_availed && <span className="text-[10px] font-medium lowercase">(₹)</span>}</label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="0.00" 
                                  value={Number(loan.loan_availed) || ''} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length <= 10) handleNestedRowChange('employee_loans', idx, 'loan_availed', val);
                                  }} 
                                  disabled={isViewMode} 
                                />
                              </div>
                               <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground font-bold tracking-tight">Balance Received {!loan.balance_receivable && <span className="text-[10px] font-medium lowercase">(₹)</span>}</label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="0.00" 
                                  value={Number(loan.balance_receivable) || ''} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length <= 10) handleNestedRowChange('employee_loans', idx, 'balance_receivable', val);
                                  }} 
                                  disabled={isViewMode} 
                                />
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
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              if (formData.employee_suspenses.length >= 3) {
                                info('Maximum limit of 3 suspense entries reached.');
                                return;
                              }
                              addNestedRow('employee_suspenses', { suspense_issued: '', balance_receivable: '' });
                            }}
                          >
                             <Plus className="w-4 h-4 mr-1" /> Add Row
                          </Button>
                        )}

                      </div>
                      <div className="space-y-3">
                         {formData.employee_suspenses.map((susp, idx) => (
                           <div key={idx} className="flex gap-2 items-center animate-in fade-in">
                                <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Suspense Issued {!susp.suspense_issued ? <span className="text-[10px] font-medium lowercase">(₹)</span> : ''}</label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="Suspense Issued" 
                                  value={Number(susp.suspense_issued) || ''} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length <= 10) handleNestedRowChange('employee_suspenses', idx, 'suspense_issued', val);
                                  }} 
                                  disabled={isViewMode} 
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Balance Received {!susp.balance_receivable ? <span className="text-[10px] font-medium lowercase">(₹)</span> : ''}</label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="Balance Received" 
                                  value={Number(susp.balance_receivable) || ''} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length <= 10) handleNestedRowChange('employee_suspenses', idx, 'balance_receivable', val);
                                  }} 
                                  disabled={isViewMode} 
                                />
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
                               <div className="flex-1 space-y-1">
                                 <label className="text-xs text-muted-foreground font-bold tracking-tight">Minimum Target {!tgt.minimum_target && <span className="text-[10px] font-medium lowercase">(₹)</span>}</label>
                                 <Input type="number" min="0" placeholder="Target Minimum" value={Number(tgt.minimum_target) || ''} onChange={(e) => handleNestedRowChange('employee_targets', idx, 'minimum_target', e.target.value)} disabled={isViewMode} />
                               </div>
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
                               <Input type="number" min="0" placeholder="From Amount" value={Number(slab.slab_from) || ''} onChange={(e) => handleNestedRowChange('employee_incentive_slabs', idx, 'slab_from', e.target.value)} disabled={isViewMode} />
                               <Input type="number" min="0" placeholder="To Amount" value={Number(slab.slab_to) || ''} onChange={(e) => handleNestedRowChange('employee_incentive_slabs', idx, 'slab_to', e.target.value)} disabled={isViewMode} />
                               <Input type="number" min="0" max="100" placeholder="Percent (%)" value={Number(slab.incentive_percent) || ''} onChange={(e) => handleNestedRowChange('employee_incentive_slabs', idx, 'incentive_percent', e.target.value)} disabled={isViewMode} />
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
          <div className="grid grid-cols-1 md:flex gap-4 items-center">
            <div className="hidden md:flex items-center space-x-2 mr-4 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
               <Checkbox 
                  id="showDeactivated"
                  checked={showDeactivated} 
                  onCheckedChange={(checked) => { setShowDeactivated(!!checked); setCurrentPage(1); }}
               />
               <label htmlFor="showDeactivated" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground cursor-pointer select-none">Show Deactivated</label>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                 className="pl-9 w-full md:w-72 rounded-full border-border bg-muted/20" 
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
                        <th className="p-4 font-bold uppercase tracking-wider text-[11px]">Basic Salary</th>
                        <th className="p-4 font-bold uppercase tracking-wider text-[11px]">Contact Email</th>
                        <th className="p-4 font-bold text-right uppercase tracking-wider text-[11px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loading ? (
                        <tr><td colSpan={6} className="p-4 text-center">Loading employees...</td></tr>
                      ) : currentEmployees.length === 0 ? (
                        <tr><td colSpan={6} className="p-4 text-center text-foreground/60">No matching employees found.</td></tr>
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
                      <td className="p-4 font-bold text-primary">{Number(emp.basic_salary) > 0 ? `₹${Number(emp.basic_salary).toLocaleString()}` : '-'}</td>
                      <td className="p-4 font-bold text-foreground">{emp.username}</td>
                      <td className="p-4 text-right space-x-2">
                        {emp.is_deleted ? (
                          <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-wider text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-full px-4" onClick={() => activateEmployee(emp.id)}>
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Reactivate
                          </Button>
                        ) : (
                          <>
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
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(rows) => {
              setRowsPerPage(rows);
              setCurrentPage(1);
            }}
            totalEntries={filteredEmployees.length}
            startEntry={employees.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
            endEntry={Math.min(currentPage * rowsPerPage, filteredEmployees.length)}
          />
        </>
      );
    })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
