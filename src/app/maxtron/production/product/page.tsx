'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Plus, Search, Edit, Trash2, X, Save, 
  Settings, Layers, Ruler, Palette, Hash, Box, Package, FileText, AlertCircle
} from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/usePermission';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const PRODUCT_API = `${API_BASE}/api/maxtron/products`;

export default function FinishedProductPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('prod_product_view', 'create');
  const canEdit = hasPermission('prod_product_view', 'edit');
  const canDelete = hasPermission('prod_product_view', 'delete');

  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { success, error, info } = useToast();
  const { confirm } = useConfirm();
  const pathname = usePathname();
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';

  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    color: '',
    thickness_microns: 0,
    size: '',
    avg_count_per_kg: 0,
    company_id: '',
    description: '',
    stock_threshold: 50
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
      if (compData.success) {
        const activeCo = compData.data.find((c: any) => c.company_name.toUpperCase() === activeTenant);
        if (activeCo) {
          coId = activeCo.id;
          setCurrentCompanyId(coId);
          setFormData(prev => ({ ...prev, company_id: coId }));
        }
      }
      fetchProducts(coId);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (coId?: string) => {
    const token = localStorage.getItem('token');
    const targetCoId = coId || currentCompanyId;
    try {
      const res = await fetch(`${PRODUCT_API}?company_id=${targetCoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const saveProduct = async () => {
    if (!formData.product_code || !formData.product_name) {
      error('Please fill Code and Name.');
      return;
    }

    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${PRODUCT_API}/${editingId}` : PRODUCT_API;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...formData, company_id: currentCompanyId })
      });
      const data = await res.json();
      if (data.success) {
        success(editingId ? 'Product updated' : 'Product created');
        setEditingId(null);
        setShowForm(false);
        resetForm();
        fetchProducts();
      } else {
        error(data.message || 'Operation failed');
      }
    } catch (err) {
      error('Error saving product');
    }
  };

  const handleEdit = (prod: any) => {
    setEditingId(prod.id);
    setFormData({
      product_code: prod.product_code,
      product_name: prod.product_name,
      color: prod.color || '',
      thickness_microns: prod.thickness_microns || 0,
      size: prod.size || '',
      avg_count_per_kg: prod.avg_count_per_kg || 0,
      company_id: prod.company_id,
      description: prod.description || '',
      stock_threshold: prod.stock_threshold || 50
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({ 
      message: "Are you sure you want to delete this product?", 
      title: "Delete Product", 
      type: 'danger' 
    });
    if (!isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${PRODUCT_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        success('Product deleted');
        fetchProducts();
      } else {
        error(data.message);
      }
    } catch (err) {
      error('Error deleting product');
    }
  };

  const resetForm = () => {
    setFormData({
      product_code: '',
      product_name: '',
      color: '',
      thickness_microns: 0,
      size: '',
      avg_count_per_kg: 0,
      company_id: currentCompanyId,
      description: '',
      stock_threshold: 50
    });
    setEditingId(null);
  };

  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { key: 'product_code', label: 'Code', icon: Hash },
    { key: 'product_name', label: 'Name', icon: Box },
    { key: 'color', label: 'Color', icon: Palette },
    { key: 'thickness_microns', label: 'Thickness (µ)', icon: Layers },
    { key: 'size', label: 'Size', icon: Ruler },
    { key: 'avg_count_per_kg', label: 'Count/Kg', icon: Hash },
    { key: 'stock_threshold', label: 'Threshold', icon: AlertCircle }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-primary/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading">Finished Products</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Manage technical specifications and product master data.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!showForm && canCreate && (
            <Button onClick={() => setShowForm(true)} className="w-full md:w-auto bg-primary hover:bg-primary/95 text-white px-6 rounded-full shadow-lg h-10 md:h-11 transition-all font-bold whitespace-nowrap gap-2">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-lg animate-in slide-in-from-top duration-500 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl flex items-center gap-2">
                {editingId ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                {editingId ? 'Edit Product Specification' : 'Add New Product Specification'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }} className="hover:bg-primary/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <CardDescription>Enter technical details like thickness, color, and size.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2"><Hash className="w-4 h-4 text-primary" /> Product Code</label>
                <Input placeholder="e.g. PP-001" value={formData.product_code} onChange={e => setFormData({ ...formData, product_code: e.target.value })} className="h-11 font-mono uppercase" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2"><Box className="w-4 h-4 text-primary" /> Product Name</label>
                <Input placeholder="e.g. Milky Polybag" value={formData.product_name} onChange={e => setFormData({ ...formData, product_name: e.target.value })} className="h-11 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2"><Palette className="w-4 h-4 text-primary" /> Color</label>
                <Input placeholder="e.g. White" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Thickness (Microns)</label>
                <Input type="number" min="0" placeholder="0.00" value={formData.thickness_microns || ''} onChange={e => setFormData({ ...formData, thickness_microns: Math.max(0, parseFloat(e.target.value) || 0) })} className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2"><Ruler className="w-4 h-4 text-primary" /> Size</label>
                <Input placeholder="e.g. 10x12" value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2"><Hash className="w-4 h-4 text-primary" /> Avg Count per Kg</label>
                <Input type="number" min="0" placeholder="0" value={formData.avg_count_per_kg || ''} onChange={e => setFormData({ ...formData, avg_count_per_kg: Math.max(0, parseFloat(e.target.value) || 0) })} className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2"><AlertCircle className="w-4 h-4 text-primary" /> Stock Threshold (Kg)</label>
                <Input type="number" min="0" placeholder="50" value={formData.stock_threshold || ''} onChange={e => setFormData({ ...formData, stock_threshold: Math.max(0, parseFloat(e.target.value) || 0) })} className="h-11 font-bold" />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Product Description</label>
                <textarea 
                  className="w-full h-11 p-3 rounded-md border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="Additional notes..." 
                  value={formData.description} 
                  maxLength={50}
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                />
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3 border-t pt-6">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="w-full sm:w-auto px-6 h-11 rounded-full text-slate-500">Cancel</Button>
              <Button onClick={saveProduct} className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white px-8 h-11 rounded-full shadow-lg shadow-primary/20 flex items-center justify-center font-bold gap-2">
                <Save className="w-4 h-4" /> {editingId ? 'Update Product' : 'Save Product'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <TableView
          title="Master Data Explorer"
          description="Explore and manage finished product specifications."
          headers={['Code', 'Name', 'Color', 'Thickness (µ)', 'Size', 'Count/Kg', 'Threshold', 'Description', 'Actions']}
          data={products}
          loading={loading}
          searchFields={['product_code', 'product_name', 'color']}
          searchPlaceholder="Search products..."
          renderRow={(p: any) => (
            <tr key={p.id} className="hover:bg-primary/5 transition-all border-b last:border-none group">
              <td className="px-6 py-4 font-mono text-xs font-bold text-primary">{p.product_code}</td>
              <td className="px-6 py-4 font-bold text-primary">{p.product_name}</td>
              <td className="px-6 py-4 text-sm font-medium">{p.color}</td>
              <td className="px-6 py-4 text-sm">{Number(p.thickness_microns) > 0 ? p.thickness_microns : ''}</td>
              <td className="px-6 py-4 text-sm">{p.size}</td>
              <td className="px-6 py-4 text-sm">{Number(p.avg_count_per_kg) > 0 ? p.avg_count_per_kg : ''}</td>
              <td className="px-6 py-4 font-bold text-slate-700 underline decoration-primary/20 underline-offset-4">
                {Number(p.stock_threshold) > 0 ? `${p.stock_threshold} Kg` : ''}
              </td>
              <td className="px-6 py-4 text-xs text-muted-foreground italic truncate max-w-[150px]">{p.description}</td>
              <td className="md:px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {canEdit && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(p)} 
                      className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(p.id)} 
                      className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
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
