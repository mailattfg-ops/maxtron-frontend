'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Plus, Search, Edit, Trash2, X, Save, 
  Settings, Calendar, DollarSign, FileText, 
  CreditCard, Tag, Info, AlertCircle
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const EXPENSES_API = `${API_BASE}/api/maxtron/production/expenses`;

const CATEGORIES = [
  'Spare Parts',
  'Maintenance',
  'Consumables',
  'Utilities',
  'Machine Repair',
  'Tools',
  'Others'
];

const PAYMENT_MODES = ['CASH', 'BANK', 'CHECK', 'UPI'];

export default function ProductionExpensesPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('prod_extrusion_view', 'create');
  const canEdit = hasPermission('prod_extrusion_view', 'edit');
  const canDelete = hasPermission('prod_extrusion_view', 'delete');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState<any>({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Others',
    description: '',
    amount: 0,
    payment_mode: 'CASH',
    reference_no: '',
    company_id: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
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
        }
      }

      if (coId) await fetchExpenses(coId);
      else setLoading(false);
      
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setLoading(false);
    }
  };

  const fetchExpenses = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    if (!targetCoId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${EXPENSES_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ex: any) => {
    setEditingId(ex.id);
    setFormData({
      expense_date: ex.expense_date.split('T')[0],
      category: ex.category,
      description: ex.description || '',
      amount: ex.amount,
      payment_mode: ex.payment_mode,
      reference_no: ex.reference_no || '',
      company_id: ex.company_id
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: 'Are you sure you want to delete this expense record? This action cannot be undone.',
      type: 'danger'
    });

    if (!isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${EXPENSES_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Expense deleted successfully');
        fetchExpenses();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error deleting expense');
    }
  };

  const saveExpense = async () => {
    if (!formData.expense_date) return error('Expense date is required.');
    if (!formData.category) return error('Category is required.');
    if (formData.amount <= 0) return error('Amount must be greater than zero.');
    if (!formData.description) return error('Brief description is required.');

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${EXPENSES_API}/${editingId}` : EXPENSES_API;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Expense updated' : 'Expense recorded');
        setShowForm(false);
        setEditingId(null);
        setFormData({
            ...formData,
            description: '',
            amount: 0,
            reference_no: ''
        });
        fetchExpenses();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error saving expense');
    }
  };

  const filteredExpenses = expenses.filter(ex => 
    ex.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.reference_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
             <DollarSign className="w-8 h-8 md:w-10 md:h-10 text-primary p-1.5 bg-primary/10 rounded-lg shrink-0" />
             <span className="truncate text-primary">Miscellaneous Expenses</span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">Manage and track production-specific miscellaneous costs.</p>
        </div>
        {!showForm && canCreate && (
          <Button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                ...formData,
                expense_date: new Date().toISOString().split('T')[0],
                description: '',
                amount: 0,
                reference_no: ''
              });
              setShowForm(true);
            }} 
            className="bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg shadow-primary/20 h-10 md:h-11 transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex-1 md:flex-none font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> Add New Expense
          </Button>
        )}
      </div>

      {showForm ? (
        <Card className="border-primary/20 shadow-xl overflow-hidden bg-white animate-in slide-in-from-top duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10 py-6">
            <CardTitle className="text-primary flex items-center gap-2 uppercase tracking-wider text-sm">
              {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? "Edit Expense Record" : "New Expense Entry"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                  <Calendar className="w-3 h-3" /> Date
                </label>
                <Input type="date" value={formData.expense_date} onChange={e => setFormData({ ...formData, expense_date: e.target.value })} />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                  <Tag className="w-3 h-3" /> Category
                </label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger className="h-10 w-full border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-input">
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                  <DollarSign className="w-3 h-3" /> Amount (₹)
                </label>
                <Input type="number" placeholder="0.00" value={formData.amount === 0 ? '' : formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                  <FileText className="w-3 h-3" /> Description / Purpose
                </label>
                <Input placeholder="e.g. Purchased spare belt for Extruder 01" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                  <CreditCard className="w-3 h-3" /> Payment Mode
                </label>
                <Select value={formData.payment_mode} onValueChange={(val) => setFormData({ ...formData, payment_mode: val })}>
                  <SelectTrigger className="h-10 w-full border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select Mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-input">
                    {PAYMENT_MODES.map(mode => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                  <Info className="w-3 h-3" /> Ref. No / Voucher No
                </label>
                <Input placeholder="Optional" value={formData.reference_no} onChange={e => setFormData({ ...formData, reference_no: e.target.value })} />
              </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row justify-end gap-3 border-t pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(false)} 
                  className="px-8 rounded-full h-11 h-12 order-2 md:order-1 font-bold"
                >
                  Back to History
                </Button>
                <Button 
                  onClick={saveExpense} 
                  className="bg-primary hover:bg-primary/95 text-white px-10 rounded-full shadow-lg shadow-primary/20 h-12 transition-all hover:scale-105 active:scale-95 order-1 md:order-2 font-bold"
                >
                  <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update Record' : 'Record Expense'}
                </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <TableView
          title="Expense History"
          description="Historical log of miscellaneous production expenses."
          headers={['Date', 'Category', 'Description', 'Amount', 'Mode', 'Ref No', 'Actions']}
          data={filteredExpenses}
          loading={loading}
          searchFields={['category', 'description', 'reference_no']}
          renderRow={(ex: any) => (
            <tr key={ex.id} className="hover:bg-primary/5 border-b last:border-none transition-all group">
              <td className="px-6 py-4 text-xs font-semibold text-slate-500">{new Date(ex.expense_date).toLocaleDateString()}</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase border border-blue-100">
                  {ex.category}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-medium text-slate-700">{ex.description || 'N/A'}</span>
              </td>
              <td className="px-6 py-4 font-black text-slate-900">₹ {Number(ex.amount).toLocaleString()}</td>
              <td className="px-6 py-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{ex.payment_mode}</span>
              </td>
              <td className="px-6 py-4 text-xs text-slate-400 font-mono">{ex.reference_no || '-'}</td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(ex)} className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ex.id)} className="h-8 w-8 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}
