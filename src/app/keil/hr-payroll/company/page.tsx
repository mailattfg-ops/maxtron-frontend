'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Save, Edit, Trash2, Plus, X, Building2, MapPin, Mail, Phone, Briefcase, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function CompanyInformationPage() {
  const pathname = usePathname();
  const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';
  const activeTenant = activeEntity.toUpperCase();
  const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/companies`;

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);


  const emptyFormData = {
    company_code: '',
    company_name: '',
    gst_no: '',
    license_no: '',
    license_details: '',
    license_renewal_date: '',
    pcb_authorization_no: '',
    pcb_details: '',
    pcb_renewal_date: '',
    no_of_employees: 0,
    email: '',
    phone: '',
    
    // Address Segregations
    office_street: '', office_city: '', office_state: '', office_zip: '',
    manufacturing_street: '', manufacturing_city: '', manufacturing_state: '', manufacturing_zip: '',
    billing_street: '', billing_city: '', billing_state: '', billing_zip: ''
  };

  const [formData, setFormData] = useState({ ...emptyFormData });

  useEffect(() => {
    fetchCompanies();
  }, [activeTenant]);


  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success) {
        const filtered = data.data.filter((c: any) => 
          (c.company_name || '').trim().toUpperCase().includes(activeTenant.trim().toUpperCase())
        );
        setCompanies(filtered);
      } else {
        error(`Failed to fetch: ${data.message || 'Unknown server error'}`);
      }

    } catch (err: any) {
      console.error('Failed to fetch companies:', err);
      error(`Network Error: ${err.message || 'Could not connect to server'}`);
    } finally {

      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const saveCompany = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? 'PUT' : 'POST';

      const payload = {
        company_code: formData.company_code,
        company_name: formData.company_name,
        gst_no: formData.gst_no,
        license_no: formData.license_no,
        license_details: formData.license_details,
        license_renewal_date: formData.license_renewal_date || null,
        pcb_authorization_no: formData.pcb_authorization_no,
        pcb_details: formData.pcb_details,
        pcb_renewal_date: formData.pcb_renewal_date || null,
        no_of_employees: Number(formData.no_of_employees) || 0,
        email: formData.email,
        phone: formData.phone,
        addresses: [
            { address_type: 'OFFICE', street: formData.office_street, city: formData.office_city, state: formData.office_state, zip_code: formData.office_zip },
            { address_type: 'MANUFACTURING_UNIT', street: formData.manufacturing_street, city: formData.manufacturing_city, state: formData.manufacturing_state, zip_code: formData.manufacturing_zip },
            { address_type: 'BILLING', street: formData.billing_street, city: formData.billing_city, state: formData.billing_state, zip_code: formData.billing_zip }
        ].filter(a => a.street && a.street.trim() !== '')
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();

      if (data.success) {
        success(editingId ? 'Company updated successfully!' : 'Company Registered Successfully!');
        setEditingId(null);
        fetchCompanies();
      } else {
        error(`Failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
        error('Network error during company registration.');
    }
  };

  const startEdit = (company: any) => {
    const o = company.addresses?.find((a: any) => a.address_type === 'OFFICE') || {};
    const m = company.addresses?.find((a: any) => a.address_type === 'MANUFACTURING_UNIT') || {};
    const b = company.addresses?.find((a: any) => a.address_type === 'BILLING') || {};

    setFormData({
      company_code: company.company_code || '',
      company_name: company.company_name || '',
      gst_no: company.gst_no || '',
      license_no: company.license_no || '',
      license_details: company.license_details || '',
      license_renewal_date: company.license_renewal_date ? company.license_renewal_date.split('T')[0] : '',
      pcb_authorization_no: company.pcb_authorization_no || '',
      pcb_details: company.pcb_details || '',
      pcb_renewal_date: company.pcb_renewal_date ? company.pcb_renewal_date.split('T')[0] : '',
      no_of_employees: company.no_of_employees || 0,
      email: company.email || '',
      phone: company.phone || '',
      
      office_street: o.street || '',
      office_city: o.city || '',
      office_state: o.state || '',
      office_zip: o.zip_code || '',

      manufacturing_street: m.street || '',
      manufacturing_city: m.city || '',
      manufacturing_state: m.state || '',
      manufacturing_zip: m.zip_code || '',

      billing_street: b.street || '',
      billing_city: b.city || '',
      billing_state: b.state || '',
      billing_zip: b.zip_code || '',
    });
    setEditingId(company.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ ...emptyFormData });
  };

  const renderForm = () => (
    <Card className="border-blue-100 shadow-md">
      <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4 flex flex-row justify-between items-center">
        <div>
          <CardTitle>Edit Company Information</CardTitle>
          <CardDescription>Enter structural details below.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={cancelEdit} className="text-slate-500 hover:text-slate-700">
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-6">
          
          {/* Section: Core Identification */}
          <div>
              <h3 className="font-semibold text-slate-800 border-b pb-2 mb-4">Core Identification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Company Code *</label>
                    <Input name="company_code" value={formData.company_code} onChange={handleInputChange} placeholder="e.g. MAX" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Company Name *</label>
                    <Input name="company_name" value={formData.company_name} disabled placeholder="Legal Name" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">GST No</label>
                    <Input name="gst_no" value={formData.gst_no} onChange={handleInputChange} placeholder="Tax Identification" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                    <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="hq@company.com" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Phone</label>
                    <Input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Number of Employees</label>
                    <Input type="number" name="no_of_employees" value={formData.no_of_employees} onChange={handleInputChange} />
                </div>
              </div>
          </div>

          {/* Section: Addresses */}
          <div className="mt-4">
              <h3 className="font-semibold text-slate-800 border-b pb-2 mb-4">Granular Addresses Setup</h3>
              
              <div className="space-y-6">
                
                {/* Office */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Office Location
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-4 space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Street Name & Building *</label>
                            <Input name="office_street" value={formData.office_street} onChange={handleInputChange} placeholder="123 Corporate Lane, Suite 400" className="bg-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">City / District</label>
                            <Input name="office_city" value={formData.office_city} onChange={handleInputChange} placeholder="Mumbai" className="bg-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">State / Province</label>
                            <Input name="office_state" value={formData.office_state} onChange={handleInputChange} placeholder="Maharashtra" className="bg-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">ZIP / Postal Code</label>
                            <Input name="office_zip" value={formData.office_zip} onChange={handleInputChange} placeholder="400001" className="bg-white" />
                        </div>
                    </div>
                </div>

                {/* Manufacturing */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Manufacturing Unit
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-4 space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Street Name & Block *</label>
                            <Input name="manufacturing_street" value={formData.manufacturing_street} onChange={handleInputChange} placeholder="Block C, Industrial Estate" className="bg-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">City / District</label>
                            <Input name="manufacturing_city" value={formData.manufacturing_city} onChange={handleInputChange} placeholder="Pune" className="bg-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">State / Province</label>
                            <Input name="manufacturing_state" value={formData.manufacturing_state} onChange={handleInputChange} placeholder="Maharashtra" className="bg-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">ZIP / Postal Code</label>
                            <Input name="manufacturing_zip" value={formData.manufacturing_zip} onChange={handleInputChange} placeholder="411001" className="bg-white" />
                        </div>
                    </div>
                </div>

                {/* Billing */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Billing Address
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-4 space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Street Name & Floor *</label>
                            <Input name="billing_street" value={formData.billing_street} onChange={handleInputChange} placeholder="Finance Dept, Ground Floor" className="bg-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">City / District</label>
                            <Input name="billing_city" value={formData.billing_city} onChange={handleInputChange} placeholder="Mumbai" className="bg-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">State / Province</label>
                            <Input name="billing_state" value={formData.billing_state} onChange={handleInputChange} placeholder="Maharashtra" className="bg-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">ZIP / Postal Code</label>
                            <Input name="billing_zip" value={formData.billing_zip} onChange={handleInputChange} placeholder="400001" className="bg-white" />
                        </div>
                    </div>
                </div>

              </div>
          </div>

          {/* Section: Licensing */}
          <div className="mt-4">
              <h3 className="font-semibold text-slate-800 border-b pb-2 mb-4">Licensing & Regulatory Approvals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">License No</label>
                    <Input name="license_no" value={formData.license_no} onChange={handleInputChange} />
                </div>
                <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-slate-700">License Details</label>
                    <Input name="license_details" value={formData.license_details} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">License Renewal Date</label>
                    <Input type="date" name="license_renewal_date" value={formData.license_renewal_date} onChange={handleInputChange} />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">PCB Authorization No</label>
                    <Input name="pcb_authorization_no" value={formData.pcb_authorization_no} onChange={handleInputChange} />
                </div>
                <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-slate-700">PCB Details</label>
                    <Input name="pcb_details" value={formData.pcb_details} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">PCB Renewal Date</label>
                    <Input type="date" name="pcb_renewal_date" value={formData.pcb_renewal_date} onChange={handleInputChange} />
                </div>
              </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-3 border-t bg-slate-50/50 pt-4 mt-8">
        <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
        <Button onClick={saveCompany} className="bg-blue-600 hover:bg-blue-700">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );

  const renderAddressDisplay = (company: any, type: string) => {
    const addr = company.addresses?.find((a: any) => a.address_type === type);
    if (!addr || !addr.street) {
        return <p className="font-medium text-slate-400 pt-4 leading-relaxed italic">Not provided directly</p>;
    }
    
    // Build comma separated string, ignoring empty fragments
    const details = [addr.city, addr.state, addr.zip_code].filter(Boolean).join(', ');

    return (
        <div className="pt-4">
           <p className="font-medium text-slate-800 leading-snug">{addr.street}</p>
           {details && <p className="text-sm text-slate-600 mt-1">{details}</p>}
        </div>
    );
  };

  const formatDate = (dateString?: string) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Information</h1>
          <p className="text-slate-500 mt-1">Manage core enterprise identities and operating locations.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12 text-slate-500">Loading company data...</div>
      ) : (
        <div className="space-y-8">
            <div className="space-y-6">
                {companies.map(company => (
                    <div key={company.id}>
                        {editingId === company.id ? (
                            renderForm()
                        ) : (
                            <Card className="border-slate-200 overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row justify-between items-start py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-100 text-blue-700 p-3 rounded-xl border border-blue-200">
                                            <Building2 className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl text-slate-800">{company.company_name}</CardTitle>
                                            <CardDescription className="text-sm font-medium mt-1">CODE: <span className="text-slate-700">{company.company_code}</span></CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => startEdit(company)} className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50">
                                            <Edit className="h-4 w-4 mr-2" /> Edit Details
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        
                                        {/* Core Details */}
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4" /> Organization</h4>
                                            
                                            <div className="grid grid-cols-3 gap-1 text-sm border-b pb-2">
                                                <span className="text-slate-500 col-span-1">GST No</span>
                                                <span className="font-medium text-slate-900 col-span-2">{company.gst_no || '-'}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-sm border-b pb-2">
                                                <span className="text-slate-500 col-span-1">Employees</span>
                                                <span className="font-medium text-slate-900 col-span-2">{company.no_of_employees || 0}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-sm border-b pb-2">
                                                <span className="text-slate-500 col-span-1">Email <Mail className="h-3 w-3 inline text-slate-400" /></span>
                                                <span className="font-medium text-slate-900 col-span-2">{company.email || '-'}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-sm">
                                                <span className="text-slate-500 col-span-1">Phone <Phone className="h-3 w-3 inline text-slate-400" /></span>
                                                <span className="font-medium text-slate-900 col-span-2">{company.phone || '-'}</span>
                                            </div>
                                        </div>

                                        {/* Addresses */}
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> Locations</h4>
                                            
                                            <div className="text-sm border-b pb-3 relative">
                                                <span className="text-xs text-blue-600 font-medium absolute -top-1 bg-blue-50 px-1 rounded">OFFICE</span>
                                                {renderAddressDisplay(company, 'OFFICE')}
                                            </div>
                                            <div className="text-sm border-b pb-3 relative">
                                                <span className="text-xs text-indigo-600 font-medium absolute -top-1 bg-indigo-50 px-1 rounded">MANUFACTURING UNIT</span>
                                                {renderAddressDisplay(company, 'MANUFACTURING_UNIT')}
                                            </div>
                                            <div className="text-sm pb-1 relative">
                                                <span className="text-xs text-green-600 font-medium absolute -top-1 bg-green-50 px-1 rounded">BILLING</span>
                                                {renderAddressDisplay(company, 'BILLING')}
                                            </div>
                                        </div>

                                        {/* Licensing */}
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Compliance</h4>
                                            
                                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                <div className="text-xs text-slate-500 mb-1">Trade License</div>
                                                <div className="font-medium text-slate-900 text-sm mb-1">{company.license_no || '-'}</div>
                                                {company.license_details && <div className="text-xs text-slate-600 mb-2 italic">{company.license_details}</div>}
                                                <div className="text-xs text-slate-500">Renewal: <span className="font-medium">{formatDate(company.license_renewal_date)}</span></div>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                <div className="text-xs text-slate-500 mb-1">PCB Authorization</div>
                                                <div className="font-medium text-slate-900 text-sm mb-1">{company.pcb_authorization_no || '-'}</div>
                                                {company.pcb_details && <div className="text-xs text-slate-600 mb-2 italic">{company.pcb_details}</div>}
                                                <div className="text-xs text-slate-500">Renewal: <span className="font-medium">{formatDate(company.pcb_renewal_date)}</span></div>
                                            </div>
                                        </div>

                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                ))}

                {companies.length === 0 && !loading && (
                    <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300">
                        <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No Companies Found</h3>
                        <p className="text-slate-500 mb-6">Database currently missing company records.</p>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
