'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Plus, Search, Edit, Trash2, X, Save, 
  Settings, Layers, Ruler, Palette, Hash, Box, Package, FileText
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
    description: ''
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
      description: prod.description || ''
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
      description: ''
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
    { key: 'avg_count_per_kg', label: 'Count/Kg', icon: Hash }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Finished Products</h1>
          <p className="text-muted-foreground mt-1">Manage technical specifications and product master data.</p>
        </div>
        <div className="flex items-center gap-3">
          {!showForm && canCreate && (
            <Button onClick={() => setShowForm(true)} className="shadow-sm hover:shadow-md transition-all gap-2">
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
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Hash className="w-4 h-4 text-primary" /> Product Code</label>
                <Input placeholder="e.g. PP-001" value={formData.product_code} onChange={e => setFormData({ ...formData, product_code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Box className="w-4 h-4 text-primary" /> Product Name</label>
                <Input placeholder="e.g. Milky Polybag" value={formData.product_name} onChange={e => setFormData({ ...formData, product_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Palette className="w-4 h-4 text-primary" /> Color</label>
                <Input placeholder="e.g. White" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Layers className="w-4 h-4 text-primary" /> Thickness (Microns)</label>
                <Input type="number" placeholder="0.00" value={formData.thickness_microns} onChange={e => setFormData({ ...formData, thickness_microns: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Ruler className="w-4 h-4 text-primary" /> Size</label>
                <Input placeholder="e.g. 10x12" value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><Hash className="w-4 h-4 text-primary" /> Avg Count per Kg</label>
                <Input type="number" placeholder="0" value={formData.avg_count_per_kg} onChange={e => setFormData({ ...formData, avg_count_per_kg: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2 lg:col-span-3">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80"><FileText className="w-4 h-4 text-primary" /> Product Description</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Additional notes or specifications..." 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3 border-t pt-6">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="px-6 hover:bg-muted transition-colors">Cancel</Button>
              <Button onClick={saveProduct} className="px-8 shadow-sm hover:shadow-md transition-all gap-2 bg-primary hover:bg-primary/90">
                <Save className="w-4 h-4" /> {editingId ? 'Update Product' : 'Save Product'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/40 shadow-sm">
        <TableView
          title="Master Data Explorer"
          description="Explore and manage finished product specifications."
          headers={['Code', 'Name', 'Color', 'Thickness (µ)', 'Size', 'Count/Kg', 'Description', 'Actions']}
          data={products}
          loading={loading}
          searchFields={['product_code', 'product_name', 'color']}
          searchPlaceholder="Search products..."
          renderRow={(p: any) => (
            <tr key={p.id} className="hover:bg-primary/5 transition-all border-b last:border-none">
              <td className="px-6 py-4 font-mono text-xs font-bold">{p.product_code}</td>
              <td className="px-6 py-4 font-bold">{p.product_name}</td>
              <td className="px-6 py-4">{p.color}</td>
              <td className="px-6 py-4">{p.thickness_microns}</td>
              <td className="px-6 py-4">{p.size}</td>
              <td className="px-6 py-4">{p.avg_count_per_kg}</td>
              <td className="px-6 py-4 text-xs text-muted-foreground truncate max-w-[150px]">{p.description}</td>
              <td className="px-6 py-4 text-right space-x-2">
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} className="h-8 w-8 rounded-full">
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </td>
            </tr>
          )}
        />
      </Card>
    </div>
  );
}
