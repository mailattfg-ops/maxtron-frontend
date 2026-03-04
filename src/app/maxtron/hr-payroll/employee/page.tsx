'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Save, Upload, Search, Edit, Trash2, Plus, X, Briefcase, FileText } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/maxtron/employees';

export default function EmployeeInformationPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [userTypes, setUserTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State mapped to unified `users` database schema
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    username: '',    // The email used for login
    password: '',    // Initial generated password
    date_of_birth: '',
    address: '',
    department_id: '',
    has_license: false,
    has_passport: false,
    type: '',
    permanent_address: '',
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
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployees();
    fetchCompanies();
    fetchCategories();
    fetchDepartments();
    fetchUserTypes();
  }, []);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/maxtron/departments`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success) { 
          setDepartments(data.data); 
          const maxtronDept = data.data.find((d: any) => d.department_name.toUpperCase() === 'MAXTRON');
          setFormData(prev => ({ 
             ...prev, 
             department_id: prev.department_id || (maxtronDept ? maxtronDept.id : '') 
          }));
      }
    } catch (error) {
      console.error('Failed to fetch departments', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      // We will need to create this route later, for now we will just attempt to fetch it
      const res = await fetch(`http://localhost:5000/api/maxtron/categories`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success) { setCategories(data.data); }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchUserTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/maxtron/user-types?t=${Date.now()}`, {
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
      // Switch endpoint to API fetch dynamic registered companies
      const res = await fetch(`http://localhost:5000/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success) { setCompanies(data.data); }
    } catch (error) {
      console.error('Failed to fetch companies', error);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success) {
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

  const saveEmployee = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? 'PUT' : 'POST';

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
        alert(`Employee ${editingId ? 'updated' : 'created'} successfully!`);
        setShowForm(false);
        setEditingId(null);
        fetchEmployees(); // Refresh list
        // Reset form
        setFormData({
          employee_code: '', name: '', username: '', password: '', date_of_birth: '', address: '', department_id: '', has_license: false, has_passport: false, type: '',
          permanent_address: '', guarantor_name: '', is_married: false, family_details: '', category_id: '',
          employee_qualifications: [], employee_experiences: [], employee_certificates: [], employee_licenses: [], employee_passports: [], employee_loans: [], employee_targets: [], employee_suspenses: [], employee_incentive_slabs: []
        });
      } else {
        alert('Failed to save: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Network error occurred.');
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
      address: emp.address || '',
      department_id: emp.department_id || '',
      has_license: emp.has_license || false,
      has_passport: emp.has_passport || false,
      type: emp.type || '',
      permanent_address: emp.permanent_address || '',
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
    setShowForm(true);
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee? This will cascade delete their records.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (data.success) {
        fetchEmployees();
      } else {
        alert('Failed to delete employee: ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Employee Information</h1>
          <p className="text-foreground/60 mt-2">Manage employee bio-data, qualifications, and system access.</p>
        </div>
        {!showForm ? (
          <Button onClick={() => {
            setEditingId(null);
            const defaultDept = departments.find(d => d.department_name.toUpperCase() === 'MAXTRON');
            setFormData({ employee_code: '', name: '', username: '', password: '', date_of_birth: '', address: '', department_id: defaultDept ? defaultDept.id : '', has_license: false, has_passport: false, type: '', permanent_address: '', guarantor_name: '', is_married: false, family_details: '', category_id: '', employee_qualifications: [], employee_experiences: [], employee_certificates: [], employee_licenses: [], employee_passports: [], employee_loans: [], employee_targets: [], employee_suspenses: [], employee_incentive_slabs: [] });
            setShowForm(true);
          }} className="bg-secondary hover:bg-secondary/90 text-white shadow-md transition-all hover:-translate-y-0.5">
            <Plus className="w-5 h-5 mr-2" /> Add Employee
          </Button>
        ) : (
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }} className="border-foreground/10">
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button onClick={saveEmployee} className="bg-primary hover:bg-primary/90 text-white shadow-md">
              <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update Record' : 'Save Record'}
            </Button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="personal"><UserPlus className="w-4 h-4 mr-2" /> Basic Details</TabsTrigger>
              <TabsTrigger value="qualifications"><Briefcase className="w-4 h-4 mr-2" /> Professional & Experience</TabsTrigger>
              <TabsTrigger value="financials"><FileText className="w-4 h-4 mr-2" /> Financials & Docs</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
            <CardHeader>
              <CardTitle className="text-xl text-primary flex items-center">
                <UserPlus className="w-5 h-5 mr-2" />
                {editingId ? 'Edit Personal Details' : 'Personal Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Employee Code</label>
                  <Input name="employee_code" value={formData.employee_code} onChange={handleInputChange} placeholder="EMP-001" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Full Name</label>
                  <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Date of Birth</label>
                  <Input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Residential Address (Communication)</label>
                  <Input name="address" value={formData.address} onChange={handleInputChange} placeholder="123 Main St, City" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Permanent Address</label>
                  <Input name="permanent_address" value={formData.permanent_address} onChange={handleInputChange} placeholder="Permanent Home Address" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Guarantor Name</label>
                  <Input name="guarantor_name" value={formData.guarantor_name} onChange={handleInputChange} placeholder="Name of Guarantor (if any)" />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="flex items-center space-x-2 text-sm font-medium text-foreground/80 mt-6 cursor-pointer">
                    <input 
                       type="checkbox" 
                       name="is_married" 
                       checked={formData.is_married} 
                       onChange={(e) => setFormData({...formData, is_married: e.target.checked})} 
                       className="rounded border-gray-300 text-primary focus:border-primary focus:ring focus:ring-primary/20"
                    />
                    <span>Is Married?</span>
                  </label>
                </div>
                {formData.is_married && (
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-medium text-foreground/80">Family Details</label>
                      <textarea 
                          name="family_details" 
                          value={formData.family_details} 
                          onChange={handleInputChange as any} 
                          placeholder="Spouse / Children details..."
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Login Email (Username)</label>
                <Input name="username" value={formData.username} onChange={handleInputChange} placeholder="john@maxtron.com" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Department Appointed</label>
                <select 
                  name="department_id" 
                  value={formData.department_id} 
                  onChange={handleInputChange} 
                  disabled
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                >
                  <option value="651b2d55-9fbc-4209-972f-7d26edd3ec63">MAXTRON</option>
                  {/* {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                  ))} */}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">{editingId ? 'Change Password (Optional)' : 'Appoint Temporary Password'}</label>
                <Input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder={editingId ? 'Leave blank to keep unchanged' : '••••••••'} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">System Role</label>
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleInputChange} 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
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
                        <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_qualifications', { qualification_type: 'BASIC', qualification_name: '' })}>
                           <Plus className="w-4 h-4 mr-1" /> Add Qualification
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {formData.employee_qualifications.map((q, idx) => (
                           <div key={idx} className="flex gap-4 items-center animate-in fade-in">
                              <select 
                                value={q.qualification_type} 
                                onChange={(e) => handleNestedRowChange('employee_qualifications', idx, 'qualification_type', e.target.value)}
                                className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              >
                                <option value="BASIC">Basic</option>
                                <option value="ADDITIONAL">Additional</option>
                              </select>
                              <Input 
                                placeholder="Qualification Details (e.g. Master's in IT)" 
                                value={q.qualification_name}
                                onChange={(e) => handleNestedRowChange('employee_qualifications', idx, 'qualification_name', e.target.value)}
                                className="flex-1"
                              />
                              <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removeNestedRow('employee_qualifications', idx)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                           </div>
                        ))}
                        {formData.employee_qualifications.length === 0 && <p className="text-sm text-foreground/50 border border-dashed rounded-lg p-4 text-center">No qualifications recorded yet.</p>}
                      </div>
                    </div>

                    <hr className="border-border" />

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-foreground/90">Past Work Experience</h3>
                        <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_experiences', { company_name: '', from_period: '', to_period: '', post: '', responsibilities: '' })}>
                           <Plus className="w-4 h-4 mr-1" /> Add Experience
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {formData.employee_experiences.map((exp, idx) => (
                           <div key={idx} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-start animate-in fade-in bg-secondary/5 p-4 rounded-lg relative">
                              <div className="col-span-2 md:col-span-3 space-y-1">
                                <label className="text-xs text-muted-foreground">Company Name</label>
                                <Input value={exp.company_name} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'company_name', e.target.value)} placeholder="Previous Employer" />
                              </div>
                              <div className="col-span-1 md:col-span-2 space-y-1">
                                <label className="text-xs text-muted-foreground">From</label>
                                <Input type="date" value={exp.from_period?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'from_period', e.target.value)} />
                              </div>
                              <div className="col-span-1 md:col-span-2 space-y-1">
                                <label className="text-xs text-muted-foreground">To</label>
                                <Input type="date" value={exp.to_period?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'to_period', e.target.value)} />
                              </div>
                              <div className="col-span-2 md:col-span-2 space-y-1">
                                <label className="text-xs text-muted-foreground">Post/Job Title</label>
                                <Input value={exp.post} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'post', e.target.value)} placeholder="Engineer" />
                              </div>
                              <div className="col-span-2 md:col-span-3 space-y-1">
                                <label className="text-xs text-muted-foreground">Responsibilities</label>
                                <Input value={exp.responsibilities} onChange={(e) => handleNestedRowChange('employee_experiences', idx, 'responsibilities', e.target.value)} placeholder="Job duties..." />
                              </div>
                              <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeNestedRow('employee_experiences', idx)}>
                                <X className="w-4 h-4" />
                              </Button>
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
                            <input type="checkbox" checked={formData.has_license} onChange={(e) => setFormData({...formData, has_license: e.target.checked})} className="rounded text-primary focus:ring-primary" />
                            <span>License Holder (YES/NO)</span>
                        </label>
                        {formData.has_license && (
                            <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_licenses', { license_no: '', issue_date: '', expiry_date: '' })}>
                               <Plus className="w-4 h-4 mr-1" /> Add License
                            </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {formData.has_license && formData.employee_licenses.map((lic, idx) => (
                           <div key={idx} className="flex gap-2 items-center animate-in fade-in">
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">License No.</label>
                                <Input placeholder="License No." value={lic.license_no} onChange={(e) => handleNestedRowChange('employee_licenses', idx, 'license_no', e.target.value)} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Issue Date</label>
                                <Input type="date" value={lic.issue_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_licenses', idx, 'issue_date', e.target.value)} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Expiry Date</label>
                                <Input type="date" value={lic.expiry_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_licenses', idx, 'expiry_date', e.target.value)} />
                              </div>
                              <div className="pt-5">
                                <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_licenses', idx)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                           </div>
                        ))}
                        {formData.has_license && formData.employee_licenses.length === 0 && <p className="text-sm text-foreground/50 border border-dashed rounded-lg p-3 text-center">No licenses recorded.</p>}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="flex items-center space-x-2 font-semibold text-foreground/90 cursor-pointer">
                            <input type="checkbox" checked={formData.has_passport} onChange={(e) => setFormData({...formData, has_passport: e.target.checked})} className="rounded text-primary focus:ring-primary" />
                            <span>Passport Holder (YES/NO)</span>
                        </label>
                        {formData.has_passport && (
                            <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_passports', { passport_no: '', issue_date: '', expiry_date: '' })}>
                               <Plus className="w-4 h-4 mr-1" /> Add Passport
                            </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {formData.has_passport && formData.employee_passports.map((ppt, idx) => (
                           <div key={idx} className="flex gap-2 items-center animate-in fade-in">
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Passport No.</label>
                                <Input placeholder="Passport No." value={ppt.passport_no} onChange={(e) => handleNestedRowChange('employee_passports', idx, 'passport_no', e.target.value)} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Issue Date</label>
                                <Input type="date" value={ppt.issue_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_passports', idx, 'issue_date', e.target.value)} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Expiry Date</label>
                                <Input type="date" value={ppt.expiry_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_passports', idx, 'expiry_date', e.target.value)} />
                              </div>
                              <div className="pt-5">
                                <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_passports', idx)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                           </div>
                        ))}
                        {formData.has_passport && formData.employee_passports.length === 0 && <p className="text-sm text-foreground/50 border border-dashed rounded-lg p-3 text-center">No passports recorded.</p>}
                      </div>
                    </div>
                  </div>

                  <hr className="border-border" />

                  {/* Certificates */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-foreground/90">Certifications (Medical / Police)</h3>
                      <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_certificates', { certificate_type: 'MEDICAL', issued: false, issue_date: '', expiry_date: '' })}>
                         <Plus className="w-4 h-4 mr-1" /> Add Certificate
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {formData.employee_certificates.map((cert, idx) => (
                         <div key={idx} className="flex gap-3 items-center animate-in fade-in bg-secondary/5 p-3 rounded-lg">
                            <div className="space-y-1 flex-none w-48">
                              <label className="text-xs text-muted-foreground">Type</label>
                              <select 
                                value={cert.certificate_type} 
                                onChange={(e) => handleNestedRowChange('employee_certificates', idx, 'certificate_type', e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none"
                              >
                                <option value="MEDICAL">Medical Certificate</option>
                                <option value="POLICE_VERIFICATION">Police Verification</option>
                              </select>
                            </div>
                            <div className="space-y-1 flex-none w-20">
                              <label className="text-xs text-muted-foreground">Issued?</label>
                              <div className="h-9 flex items-center">
                                <input type="checkbox" checked={cert.issued} onChange={(e) => handleNestedRowChange('employee_certificates', idx, 'issued', e.target.checked)} className="rounded w-4 h-4" />
                              </div>
                            </div>
                            <div className="space-y-1 flex-1">
                              <label className="text-xs text-muted-foreground">Issue Date</label>
                              <Input type="date" value={cert.issue_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_certificates', idx, 'issue_date', e.target.value)} />
                            </div>
                            <div className="space-y-1 flex-1">
                              <label className="text-xs text-muted-foreground">Expiry Date</label>
                              <Input type="date" value={cert.expiry_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_certificates', idx, 'expiry_date', e.target.value)} />
                            </div>
                            <div className="pt-5 flex-none w-10 text-right">
                                <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_certificates', idx)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
                        <h3 className="font-semibold text-foreground/90">Advanced Loans</h3>
                        <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_loans', { loan_availed: '', balance_receivable: '', loan_date: '' })}>
                           <Plus className="w-4 h-4 mr-1" /> Add Row
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {formData.employee_loans.map((loan, idx) => (
                           <div key={idx} className="flex gap-2 items-center animate-in fade-in">
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Loan Availed ₹</label>
                                <Input type="number" placeholder="0.00" value={loan.loan_availed} onChange={(e) => handleNestedRowChange('employee_loans', idx, 'loan_availed', e.target.value)} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Balance Recv ₹</label>
                                <Input type="number" placeholder="0.00" value={loan.balance_receivable} onChange={(e) => handleNestedRowChange('employee_loans', idx, 'balance_receivable', e.target.value)} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-xs text-muted-foreground">Date Issued</label>
                                <Input type="date" value={loan.loan_date?.split('T')[0] || ''} onChange={(e) => handleNestedRowChange('employee_loans', idx, 'loan_date', e.target.value)} />
                              </div>
                              <div className="pt-5">
                                <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_loans', idx)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-foreground/90">Suspense Amounts</h3>
                        <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_suspenses', { suspense_issued: '', balance_receivable: '' })}>
                           <Plus className="w-4 h-4 mr-1" /> Add Row
                        </Button>
                      </div>
                      <div className="space-y-3">
                         {formData.employee_suspenses.map((susp, idx) => (
                           <div key={idx} className="flex gap-2 items-center animate-in fade-in">
                              <Input type="number" placeholder="Suspense Issued ₹" value={susp.suspense_issued} onChange={(e) => handleNestedRowChange('employee_suspenses', idx, 'suspense_issued', e.target.value)} />
                              <Input type="number" placeholder="Balance Recv ₹" value={susp.balance_receivable} onChange={(e) => handleNestedRowChange('employee_suspenses', idx, 'balance_receivable', e.target.value)} />
                              <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_suspenses', idx)}>
                                <X className="w-4 h-4" />
                              </Button>
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
                        <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_targets', { minimum_target: '' })}>
                           <Plus className="w-4 h-4 mr-1" /> Add Target
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {formData.employee_targets.map((tgt, idx) => (
                           <div key={idx} className="flex gap-2 items-center animate-in fade-in">
                              <Input type="number" placeholder="Target Minimum" value={tgt.minimum_target} onChange={(e) => handleNestedRowChange('employee_targets', idx, 'minimum_target', e.target.value)} />
                              <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_targets', idx)}>
                                <X className="w-4 h-4" />
                              </Button>
                           </div>
                        ))}
                      </div>
                     </div>

                     <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-foreground/90">Incentive Slabs</h3>
                        <Button size="sm" variant="outline" onClick={() => addNestedRow('employee_incentive_slabs', { slab_from: '', slab_to: '', incentive_percent: '' })}>
                           <Plus className="w-4 h-4 mr-1" /> Add Slab
                        </Button>
                      </div>
                      <div className="space-y-3">
                         {formData.employee_incentive_slabs.map((slab, idx) => (
                           <div key={idx} className="flex gap-2 items-center animate-in fade-in">
                              <Input type="number" placeholder="From Amount" value={slab.slab_from} onChange={(e) => handleNestedRowChange('employee_incentive_slabs', idx, 'slab_from', e.target.value)} />
                              <Input type="number" placeholder="To Amount" value={slab.slab_to} onChange={(e) => handleNestedRowChange('employee_incentive_slabs', idx, 'slab_to', e.target.value)} />
                              <Input type="number" placeholder="Percent (%)" value={slab.incentive_percent} onChange={(e) => handleNestedRowChange('employee_incentive_slabs', idx, 'incentive_percent', e.target.value)} />
                              <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeNestedRow('employee_incentive_slabs', idx)}>
                                <X className="w-4 h-4" />
                              </Button>
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
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div>
            <CardTitle className="text-xl text-primary">Registered Employees</CardTitle>
            <CardDescription>View, edit, or remove authenticated employee records.</CardDescription>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 w-72 rounded-full border-primary/20" placeholder="Search by name or code..." />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="border rounded-xl mx-2 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-primary/5 text-primary">
                <tr>
                  <th className="p-4 font-semibold w-24">Emp Code</th>
                  <th className="p-4 font-semibold">Full Name</th>
                  <th className="p-4 font-semibold">Company Location</th>
                  <th className="p-4 font-semibold">System Role</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={5} className="p-4 text-center">Loading employees...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-foreground/60">No employees registered yet.</td></tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-medium text-secondary">{emp.employee_code || 'SYS'}</td>
                      <td className="p-4 font-semibold text-foreground">{emp.name}</td>
                      <td className="p-4 text-foreground/70">
                        {emp.companies?.company_name || 'Unassigned Tenant'}
                      </td>
                      <td className="p-4 text-foreground/70">{emp.user_types?.name || 'User'}</td>
                      <td className="p-4 text-right space-x-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 text-secondary border-secondary/20 hover:bg-secondary/10" onClick={() => editEmployee(emp)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => deleteEmployee(emp.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
