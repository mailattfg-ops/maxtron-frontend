'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Plus, Search, Edit, Trash2, X, Save, 
  Settings, Calendar, Hash, User, 
  Zap, Box, Layers, Activity, Clock
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const BATCH_API = `${API_BASE}/api/maxtron/production/batches`;
const PRODUCT_API = `${API_BASE}/api/maxtron/products`;
const EMPLOYEES_API = `${API_BASE}/api/maxtron/employees`;

export default function ExtrusionPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('prod_extrusion_view', 'create');

  const [showForm, setShowForm] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { success, error, info } = useToast();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState<any>({
    batch_number: `BAT-${Date.now().toString().slice(-6)}`,
    product_id: '',
    shift: 'Morning',
    operator_id: '',
    supervisor_id: '',
    machine_no: '',
    raw_material_consumed_qty: 0,
    extrusion_output_qty: 0,
    date: new Date().toISOString().split('T')[0],
    company_id: '',
    consumption_id: ''
  });

  const [consumptions, setConsumptions] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      console.log('Fetching extrusion initial data...');
      const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      
      let coId = '';
      if (compData.success && Array.isArray(compData.data)) {
        const activeCo = compData.data.find((c: any) => 
          c.company_name?.toUpperCase() === activeTenant || 
          c.company_name?.toUpperCase().includes(activeTenant)
        );
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
          setFormData((prev: any) => ({ ...prev, company_id: coId }));
          console.log(`Matched company: ${activeCo.company_name} (${coId})`);
        }
      }

      const [prodRes, empRes, conRes] = await Promise.all([
        fetch(`${PRODUCT_API}${coId ? `?company_id=${coId}` : ''}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${EMPLOYEES_API}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/maxtron/consumptions${coId ? `?company_id=${coId}` : ''}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const prodData = await prodRes.json();
      const empData = await empRes.json();
      const conData = await conRes.json();
      
      if (prodData.success) setProducts(prodData.data);
      if (conData.success) {
        // Only show Unlinked or Extrusion process type if needed, but for now all
        setConsumptions(conData.data);
      }
      
      if (empData.success && Array.isArray(empData.data)) {
        setEmployees(empData.data.filter((e: any) => 
          e.companies?.company_name?.toUpperCase() === activeTenant ||
          e.companies?.company_name?.toUpperCase().includes(activeTenant)
        ));
      }

      if (coId) await fetchBatches(coId);
      else setLoading(false);
      
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setLoading(false);
    }
  };

  const handleConsumptionSelect = (id: string) => {
    const consumption = consumptions.find(c => c.id === id);
    if (consumption) {
        setFormData({
            ...formData,
            consumption_id: id,
            raw_material_consumed_qty: consumption.quantity_used,
            machine_no: consumption.machine_no || formData.machine_no
        });
    } else {
        setFormData({
            ...formData,
            consumption_id: '',
            raw_material_consumed_qty: 0
        });
    }
  };

  const fetchBatches = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    if (!targetCoId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BATCH_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBatches(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveBatch = async () => {
    if (!formData.product_id || !formData.operator_id) {
      error('Please select product and operator.');
      return;
    }

    if (!formData.consumption_id) {
        error('Please select a material consumption record.');
        return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(BATCH_API, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        success('Production batch recorded');
        setShowForm(false);
        setFormData({
            ...formData,
            batch_number: `BAT-${Date.now().toString().slice(-6)}`,
            raw_material_consumed_qty: 0,
            extrusion_output_qty: 0,
            consumption_id: ''
        });
        fetchBatches();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error saving batch');
    }
  };

  const filteredBatches = batches.filter(b => 
    b.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.finished_products?.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Production (Extrusion)</h1>
          <p className="text-muted-foreground mt-1">Record extrusion output by shift and operator.</p>
        </div>
        <div className="flex items-center gap-3">
          {!showForm && canCreate && (
            <Button onClick={() => setShowForm(true)} className="shadow-sm hover:shadow-md transition-all gap-2">
              <Plus className="w-4 h-4" /> Record New Batch
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-lg animate-in slide-in-from-top duration-500 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-xl flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> New Production Batch
            </CardTitle>
            <CardDescription>Enter extrusion output and machine details for the current shift.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Hash className="w-4 h-4 text-primary" /> Batch Number</label>
                <Input value={formData.batch_number} readOnly className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Calendar className="w-4 h-4 text-primary" /> Production Date</label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Box className="w-4 h-4 text-primary" /> Select Product</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.product_id}
                  onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                >
                  <option value="">Select Finished Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.product_name} ({p.product_code})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Clock className="w-4 h-4 text-primary" /> Shift</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.shift}
                  onChange={e => setFormData({ ...formData, shift: e.target.value })}
                >
                  <option value="Morning">Morning (6AM - 2PM)</option>
                  <option value="Afternoon">Afternoon (2PM - 10PM)</option>
                  <option value="Night">Night (10PM - 6AM)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Settings className="w-4 h-4 text-primary" /> Machine No</label>
                <Input placeholder="e.g. EX-01" value={formData.machine_no} onChange={e => setFormData({ ...formData, machine_no: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><User className="w-4 h-4 text-primary" /> Operator</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.operator_id}
                  onChange={e => setFormData({ ...formData, operator_id: e.target.value })}
                >
                  <option value="">Select Operator</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><User className="w-4 h-4 text-primary" /> Supervisor</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.supervisor_id}
                  onChange={e => setFormData({ ...formData, supervisor_id: e.target.value })}
                >
                  <option value="">Select Supervisor</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Layers className="w-4 h-4 text-primary" /> Select Material Consumption</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.consumption_id}
                  onChange={e => handleConsumptionSelect(e.target.value)}
                >
                  <option value="">Select Consumption Record</option>
                  {consumptions.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.raw_materials?.rm_name} - {c.quantity_used} Kg ({new Date(c.consumption_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Layers className="w-4 h-4 text-primary" /> RM Consumed (Kg)</label>
                <Input type="number" readOnly className="bg-muted cursor-not-allowed" value={formData.raw_material_consumed_qty} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Activity className="w-4 h-4 text-primary" /> Extrusion Output (Kg)</label>
                <Input type="number" min={0} placeholder="0.00" value={formData.extrusion_output_qty} onChange={e => setFormData({ ...formData, extrusion_output_qty: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 justify-end gap-3 border-t pt-6">
              <div className="mr-auto flex items-center gap-4">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total RM Input</span>
                    <span className="text-xl font-black text-primary">{formData.raw_material_consumed_qty} Kg</span>
                 </div>
                 <div className="w-[1px] h-8 bg-slate-200"></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recovery %</span>
                    <span className="text-xl font-black text-emerald-600">
                        {formData.raw_material_consumed_qty > 0 
                            ? ((formData.extrusion_output_qty / formData.raw_material_consumed_qty) * 100).toFixed(1) 
                            : '0.0'}%
                    </span>
                 </div>
              </div>
              <Button variant="outline" onClick={() => setShowForm(false)} className="w-full px-6">Cancel</Button>
              <Button onClick={saveBatch} className="px-8 shadow-sm hover:shadow-md gap-2 bg-primary">
                <Save className="w-4 h-4" /> Save Batch Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Batch History"
          description="History of production batches and machine assignments."
          headers={['Date', 'Batch #', 'Product', 'Shift', 'Machine', 'Material Used', 'Output (Kg)', 'Operator']}
          data={batches}
          loading={loading}
          searchFields={['batch_number', 'finished_products.product_name']}
          searchPlaceholder="Search batches or products..."
          renderRow={(b: any) => {
            const product = Array.isArray(b.finished_products) ? b.finished_products[0] : b.finished_products;
            const operator = Array.isArray(b.operator) ? b.operator[0] : b.operator;
            
            return (
              <tr key={b.id} className="hover:bg-primary/5 border-b last:border-none transition-all group">
                <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{new Date(b.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-mono font-bold text-foreground/80">{b.batch_number}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-primary">{product?.product_name || 'N/A'}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{product?.product_code || ''}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold w-fit uppercase border">
                      <Clock className="w-3 h-3 text-slate-400" /> {b.shift}
                    </div>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-foreground/60">{b.machine_no}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">{b.material_consumptions?.raw_materials?.rm_name || 'N/A'}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{b.material_consumptions?.raw_materials?.rm_code || ''}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex flex-col items-end sm:items-start">
                      <span className="font-bold text-base text-foreground/80">{b.extrusion_output_qty} Kg</span>
                      <span className="text-[10px] text-muted-foreground">RM: {b.raw_material_consumed_qty} Kg</span>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {operator?.name?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs font-medium">{operator?.name || 'Unknown'}</span>
                    </div>
                </td>
              </tr>
            );
          }}
        />
      )}
    </div>
  );
}
