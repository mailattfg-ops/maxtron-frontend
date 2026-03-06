'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck, Lock, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { keilSidebarMenu } from '@/config/navigation/keil';
import { usePermission } from '@/hooks/usePermission';

export default function KeilPermissionConsolePage() {
  const { hasPermission: globalHasPermission } = usePermission();
  const canModify = globalHasPermission('admin_permissions', 'edit');
  const pathname = usePathname();
  const activeEntity = 'keil';
  const BASE_API = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}`;

  const [roles, setRoles] = useState<any[]>([]);
  const [dbPermissions, setDbPermissions] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [rolePerms, setRolePerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { success, error } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      fetchRolePermissions(selectedRoleId);
    } else {
      setRolePerms([]);
    }
  }, [selectedRoleId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [rolesRes, permsRes] = await Promise.all([
        fetch(`${BASE_API}/user-types`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BASE_API}/permissions`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      if (rolesData.success) setRoles(rolesData.data);
      if (permsData.success) setDbPermissions(permsData.data);
    } catch (err) {
      error('Failed to load KEIL permission data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_API}/permissions/${roleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRolePerms(data.data);
      }
    } catch (err) {
      error('Failed to fetch role permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (permissionKey: string, field: string, currentValue: boolean) => {
    if (!selectedRoleId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_API}/permissions/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roleId: selectedRoleId,
          permissionKey,
          updates: { [field]: !currentValue }
        })
      });

      const data = await res.json();
        if (data.success) {
          const updatedPerms = [...rolePerms];
          const index = updatedPerms.findIndex(p => p.permission_key === permissionKey);
          
          if (index > -1) {
            updatedPerms[index] = { ...updatedPerms[index], [field]: !currentValue };
          } else {
            updatedPerms.push({ permission_key: permissionKey, [field]: !currentValue });
          }
          
          setRolePerms(updatedPerms);
          success('Permission updated');
        } else {
          error(data.message || 'Update failed');
        }
    } catch (err) {
      error('Update failed');
    }
  };

  const getPermValue = (key: string, field: string) => {
    const p = rolePerms.find(rp => rp.permission_key === key);
    return p ? p[field] : false;
  };

  const findPermissionKey = (title: string) => {
      const matched = dbPermissions.find(p => 
          (p.sub_module?.toLowerCase() === title.toLowerCase()) ||
          (p.sub_module === null && p.module_name?.toLowerCase() === title.toLowerCase())
      );
      return matched?.permission_key;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-primary/10 sticky top-0 z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center">
            <ShieldCheck className="w-8 h-8 mr-3 text-secondary" /> KEIL Permission Console
          </h1>
          <p className="text-foreground/60 mt-1">Manage KEIL specific access via sidebar menu options.</p>
        </div>
        <div className="w-64">
           <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Role</label>
           <select 
             value={selectedRoleId}
             onChange={(e) => setSelectedRoleId(e.target.value)}
             className="w-full h-11 px-4 rounded-xl border border-primary/20 bg-background font-bold text-primary outline-none"
           >
             <option value="">-- Select Role --</option>
             {roles.map(r => (
               <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
             ))}
           </select>
        </div>
      </div>

      {!selectedRoleId ? (
        <div className="h-96 flex flex-col items-center justify-center border-4 border-dashed border-primary/5 rounded-[3rem] bg-white/40">
           <Lock className="w-20 h-20 text-primary/10 mb-6" />
           <p className="text-primary/40 font-black text-2xl uppercase tracking-widest">Select a role to configure</p>
        </div>
      ) : loading ? (
        <div className="h-96 flex items-center justify-center">
           <Loader2 className="w-12 h-12 animate-spin text-secondary" />
        </div>
      ) : (
        <div className="space-y-8">
           {keilSidebarMenu.map((item) => {
             const parentKey = item.permissionKey || findPermissionKey(item.title);
             
             return (
               <Card key={item.title} className="border-none shadow-2xl overflow-hidden rounded-[2rem] bg-background">
                  <div className="bg-primary p-6 flex items-center justify-between">
                     <div className="flex items-center">
                        <div className="bg-white/10 p-3 rounded-2xl mr-4 text-secondary">
                           <item.icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">{item.title}</h3>
                     </div>
                     {parentKey && (
                        <div className="flex space-x-6 bg-black/20 p-3 rounded-2xl border border-white/5">
                            {['can_view', 'can_create', 'can_edit', 'can_delete'].map(field => (
                                <div key={field} className="flex flex-col items-center px-2">
                                    <span className="text-[8px] text-white/50 font-black uppercase mb-1.5">{field.replace('can_', '')}</span>
                                    <Checkbox 
                                        checked={getPermValue(parentKey, field)}
                                        onCheckedChange={() => handleToggle(parentKey, field, getPermValue(parentKey, field))}
                                        disabled={!canModify}
                                        className="h-5 w-5 border-white/20 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                                    />
                                </div>
                            ))}
                        </div>
                     )}
                  </div>
                  
                  {item.children && (
                    <CardContent className="p-0">
                       <table className="w-full">
                          <tbody className="divide-y divide-primary/5">
                             {item.children.map((child) => {
                               const childKey = child.permissionKey || findPermissionKey(child.title);
                               
                               return (
                                 <tr key={child.title} className="group hover:bg-slate-50 transition-all duration-300">
                                    <td className="p-6 w-1/3">
                                       <div className="flex items-center">
                                          <ChevronRight className="w-4 h-4 text-primary/20 mr-3 group-hover:translate-x-1 transition-transform" />
                                          <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">{child.title}</div>
                                       </div>
                                    </td>
                                    <td className="p-6">
                                       <div className="flex justify-end space-x-12 px-4">
                                          {childKey ? (
                                             ['can_view', 'can_create', 'can_edit', 'can_delete'].map(field => (
                                                <div key={field} className="flex flex-col items-center group/check">
                                                   <span className="text-[9px] text-slate-400 font-bold uppercase mb-2 group-hover/check:text-primary transition-colors">
                                                      {field.replace('can_', '')}
                                                   </span>
                                                   <Checkbox 
                                                      checked={getPermValue(childKey, field)}
                                                      onCheckedChange={() => handleToggle(childKey, field, getPermValue(childKey, field))}
                                                      disabled={!canModify}
                                                      className="h-6 w-6 border-slate-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                   />
                                                </div>
                                             ))
                                          ) : (
                                             <div className="text-slate-300 text-[10px] font-bold italic py-2">No permission mapping found</div>
                                          )}
                                       </div>
                                    </td>
                                 </tr>
                               );
                             })}
                          </tbody>
                       </table>
                    </CardContent>
                  )}
               </Card>
             );
           })}
        </div>
      )}
    </div>
  );
}
