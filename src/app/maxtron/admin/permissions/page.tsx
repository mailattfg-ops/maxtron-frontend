'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Save, RefreshCw, Lock, Check, X, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

export default function PermissionManagementPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error, info } = useToast();
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const isAdmin = 
        user.role_name?.toLowerCase() === 'admin' || 
        user.role_name?.toLowerCase() === 'administrator' || 
        user.email?.toLowerCase() === 'admin@maxtron.com';
        
      const canAccess = user.permissions?.find((p: any) => p.permission_key === 'admin_permissions' && p.can_view);
      
      if (!isAdmin && !canAccess) {
        router.replace('/maxtron');
        return;
      }
    }
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/user-types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
        if (data.data.length > 0) {
          setSelectedRoleId(data.data[0].id);
          fetchRolePermissions(data.data[0].id);
        }
      }
    } catch (err) {
      error('Failed to load user roles');
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/permissions/${roleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPermissions(data.data);
      }
    } catch (err) {
      error('Failed to fetch permissions for this role');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (permKey: string, action: string, currentValue: boolean) => {
    // Optimistic UI update
    const updated = permissions.map(p => {
      if (p.permission_key === permKey) {
        return { ...p, [action]: !currentValue };
      }
      return p;
    });
    setPermissions(updated);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/permissions/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roleId: selectedRoleId,
          permissionKey: permKey,
          updates: { [action]: !currentValue }
        })
      });
      const data = await res.json();
      if (!data.success) {
        // Revert if failed
        fetchRolePermissions(selectedRoleId);
        error('Failed to update permission');
      }
    } catch (err) {
      fetchRolePermissions(selectedRoleId);
      error('Network error updating permission');
    }
  };

  // Group permissions by module
  const modules = permissions.reduce((acc: any, curr: any) => {
    const modName = curr.permissions?.module_name || 'Other';
    if (!acc[modName]) acc[modName] = [];
    acc[modName].push(curr);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center">
            <Lock className="w-8 h-8 mr-3 text-secondary" />
            Role Permissions Matrix
          </h1>
          <p className="text-foreground/60 mt-2">Configure dynamic access rights and feature visibility for each user role.</p>
        </div>
        <div className="flex items-center space-x-4">
           <label className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Managing Role:</label>
           <select 
            value={selectedRoleId} 
            onChange={(e) => {
              setSelectedRoleId(e.target.value);
              fetchRolePermissions(e.target.value);
            }}
            className="bg-white border rounded-lg px-4 py-2 shadow-sm font-bold text-primary focus:ring-2 focus:ring-secondary/20 outline-none"
           >
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name?.toUpperCase()}</option>
              ))}
           </select>
           <Button variant="outline" size="icon" onClick={() => fetchRolePermissions(selectedRoleId)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
           </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
           <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
           <p className="text-foreground/50 font-medium italic">Loading Permission Matrix...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
           {Object.keys(modules).map((moduleName) => (
             <Card key={moduleName} className="overflow-hidden border-none shadow-lg">
                <CardHeader className="bg-primary/5 border-b py-4">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center">
                         <Shield className="w-5 h-5 mr-2 text-primary" />
                         <CardTitle className="text-lg">{moduleName}</CardTitle>
                      </div>
                      <span className="text-xs font-bold bg-white px-2 py-1 rounded border text-primary/50 uppercase">Module Settings</span>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 text-xs font-bold text-foreground/40 uppercase tracking-widest border-b">
                         <tr>
                            <th className="px-6 py-4">Feature / Action</th>
                            <th className="px-4 py-4 text-center">View</th>
                            <th className="px-4 py-4 text-center">Create</th>
                            <th className="px-4 py-4 text-center">Edit</th>
                            <th className="px-4 py-4 text-center">Delete</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y">
                         {modules[moduleName].map((perm: any) => (
                           <tr key={perm.permission_key} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                 <p className="font-semibold text-slate-800">{perm.permissions?.sub_module || 'General Access'}</p>
                                 <p className="text-xs text-foreground/40">{perm.permissions?.description}</p>
                              </td>
                              <td className="px-4 py-4 text-center">
                                 <PermissionToggle 
                                    active={perm.can_view} 
                                    onClick={() => togglePermission(perm.permission_key, 'can_view', perm.can_view)} 
                                 />
                              </td>
                              <td className="px-4 py-4 text-center">
                                 <PermissionToggle 
                                    active={perm.can_create} 
                                    onClick={() => togglePermission(perm.permission_key, 'can_create', perm.can_create)} 
                                 />
                              </td>
                              <td className="px-4 py-4 text-center">
                                 <PermissionToggle 
                                    active={perm.can_edit} 
                                    onClick={() => togglePermission(perm.permission_key, 'can_edit', perm.can_edit)} 
                                 />
                              </td>
                              <td className="px-4 py-4 text-center">
                                 <PermissionToggle 
                                    active={perm.can_delete} 
                                    onClick={() => togglePermission(perm.permission_key, 'can_delete', perm.can_delete)} 
                                 />
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </CardContent>
             </Card>
           ))}

           {permissions.length === 0 && (
             <div className="text-center py-20 bg-white rounded-xl shadow-inner border-2 border-dashed">
                <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-400">No Permissions Found</h3>
                <p className="text-slate-400">Ensure permissions are seeded in the database for this role.</p>
             </div>
           )}
        </div>
      )}
      
      <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl flex items-start shadow-sm">
         <ShieldAlert className="w-6 h-6 text-amber-600 mr-4 mt-1 shrink-0" />
         <div>
            <h4 className="font-bold text-amber-900">Security Warning</h4>
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
               Modifying permissions affects users **immediately** upon their next activity. Changes to sidebar visibility require a page refresh. 
               Always ensure at least one role maintains **Administrative** access to prevent system lockout.
            </p>
         </div>
      </div>
    </div>
  );
}

function PermissionToggle({ active, onClick }: { active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-sm ${
        active 
          ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
          : 'bg-rose-50 text-rose-300 hover:bg-rose-100'
      }`}
    >
      {active ? <Check className="w-5 h-5" /> : <X className="w-4 h-4" />}
    </button>
  );
}
