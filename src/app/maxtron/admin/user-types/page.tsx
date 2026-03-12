'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Shield, Save, X } from 'lucide-react';
import { TableView } from '@/components/ui/table-view';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function KeilUserTypesPage() {
  const pathname = usePathname();
  const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';
  const activeTenant = pathname?.startsWith('/keil') ? 'KEIL' : 'MAXTRON';
  const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/user-types`;

  const [userTypes, setUserTypes] = useState<any[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', company_id: '' });

  const { success, error } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        const compRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/companies`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const compData = await compRes.json();
        
        let coId = '';
        if (compData.success && Array.isArray(compData.data)) {
            const activeCo = compData.data.find((c: any) => 
                c.company_name?.toUpperCase().includes(activeTenant)
            );
            if (activeCo) {
                coId = activeCo.id;
                setCurrentCompanyId(coId);
                setFormData(prev => ({ ...prev, company_id: coId }));
            }
        }

        if (coId) {
            await fetchUserTypes(coId);
        }
    } catch (err) {
        console.error('Error fetching initial data:', err);
    } finally {
        setLoading(false);
    }
  };

  const fetchUserTypes = async (coId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}?company_id=${coId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUserTypes(data.data);
      }
    } catch (err) {
      error('Failed to fetch user roles');
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.name) {
      error('Role name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;

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
        success(editingId ? 'Role updated successfully' : 'Role created successfully');
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', description: '', company_id: currentCompanyId });
        fetchUserTypes(currentCompanyId);
      } else {
        error(data.message || 'Action failed');
      }
    } catch (err) {
      error('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Role',
      message: 'Are you sure you want to delete this role? This might affect users assigned to it.',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          success('Role deleted');
          fetchUserTypes(currentCompanyId);
        } else {
          error(data.message);
        }
      } catch (err) {
        error('Delete failed');
      }
    }
  };

  const startEdit = (role: any) => {
    setEditingId(role.id);
    setFormData({ name: role.name, description: role.description || '', company_id: currentCompanyId });
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">KEIL User Roles</h1>
          <p className="text-foreground/60 mt-2">Manage system access levels for KEIL Operations.</p>
        </div>
        <Button 
          onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', description: '', company_id: currentCompanyId }); }}
          className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 shadow-lg shadow-primary/20"
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancel' : 'Add New Role'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-xl animate-in slide-in-from-top duration-300">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg font-semibold text-primary">
              {editingId ? 'Edit Role' : 'Create New Role'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80">Role Name</label>
                <Input 
                  placeholder="e.g. Project Lead"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80">Description</label>
                <Input 
                  placeholder="Role responsibilities..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleCreateOrUpdate} className="bg-secondary text-white hover:bg-secondary/90 px-8 rounded-full">
                <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update Role' : 'Save Role'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <TableView
        title="Active KEIL Roles"
        description="List of all roles defined for the KEIL entity."
        headers={['Role Name', 'Description', 'Actions']}
        data={userTypes}
        loading={loading}
        searchFields={['name', 'description']}
        searchPlaceholder="Search roles..."
        renderRow={(role: any) => (
          <tr key={role.id} className="hover:bg-primary/5 transition-colors">
            <td className="p-4 font-bold text-primary flex items-center">
              <Shield className="w-4 h-4 mr-2 text-secondary" />
              {role.name.toUpperCase()}
            </td>
            <td className="p-4 text-sm text-muted-foreground">{role.description || '-'}</td>
            <td className="p-4 text-right space-x-2">
              <Button variant="ghost" size="icon" onClick={() => startEdit(role)} className="hover:text-primary hover:bg-primary/10 rounded-full h-8 w-8">
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)} className="hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
