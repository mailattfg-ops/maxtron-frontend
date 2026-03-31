'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck, Lock, Globe, ChevronRight, LayoutPanelTop } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { maxtronSidebarMenu } from '@/config/navigation/maxtron';
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

  const menuStructure = keilSidebarMenu;

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
      
      // 1. Fetch companies first to get current company ID
      const coRes = await fetch(`${BASE_API}/companies`, { headers: { 'Authorization': `Bearer ${token}` } });
      const coData = await coRes.json();
      let rolesUrl = `${BASE_API}/user-types`;
      
      if (coData.success && Array.isArray(coData.data)) {
        const activeTenantName = 'KEIL';
        const activeCo = coData.data.find((c: any) => c.company_name?.toUpperCase().includes(activeTenantName));
        if (activeCo) {
          rolesUrl += `?company_id=${activeCo.id}`;
        }
      }

      // 2. Fetch roles (filtered) and permissions
      const [rolesRes, permsRes] = await Promise.all([
        fetch(rolesUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
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

  const handleToggle = async (permissionKey: string, field: string, currentValue: boolean, cascadeKeys: string[] = []) => {
    if (!selectedRoleId) return;

    try {
      const token = localStorage.getItem('token');
      const newValue = !currentValue;
      
      // 1. Perform primary toggle
      const res = await fetch(`${BASE_API}/permissions/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roleId: selectedRoleId,
          permissionKey,
          updates: { [field]: newValue }
        })
      });

      const data = await res.json();
      if (data.success) {
        let updatedPerms = [...rolePerms];
        
        const updateLocalPerm = (key: string, updates: any) => {
          const index = updatedPerms.findIndex(p => p.permission_key === key);
          if (index > -1) {
            updatedPerms[index] = { ...updatedPerms[index], ...updates };
          } else {
            updatedPerms.push({ role_id: selectedRoleId, permission_key: key, ...updates });
          }
        };

        updateLocalPerm(permissionKey, { [field]: newValue });

        // 2. Handle cascade if unchecking a parent
        if (field === 'can_view' && newValue === false && cascadeKeys.length > 0) {
          for (const cKey of cascadeKeys) {
            const childUpdates = { can_view: false, can_create: false, can_edit: false, can_delete: false };
            
            // Call API for each child (could be optimized if backend supported batch)
            await fetch(`${BASE_API}/permissions/update`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                roleId: selectedRoleId,
                permissionKey: cKey,
                updates: childUpdates
              })
            });
            
            updateLocalPerm(cKey, childUpdates);
          }
        }
        
        setRolePerms(updatedPerms);
        success(newValue === false && cascadeKeys.length > 0 ? 'Permissions revoked for group' : 'Permission updated');
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

  const findPermissionKey = (title: string, moduleName: string) => {
      const matched = dbPermissions.find(p => 
          (p.sub_module?.toLowerCase() === title.toLowerCase()) ||
          (p.sub_module === null && p.module_name?.toLowerCase() === title.toLowerCase())
      );
      return matched?.permission_key;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-primary/10 sticky top-0 z-10">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 p-1.5 bg-secondary/10 text-secondary rounded-lg shrink-0" /> 
            <span className="text-2xl md:text-3xl font-bold text-primary tracking-tight font-heading flex items-center gap-2">KEIL Permissions</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Configure access based on Sidebar Menu structure.</p>
        </div>
        <div className="w-full md:w-64">
           <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-1 tracking-widest">Active Role Control</label>
           <Select value={selectedRoleId} onValueChange={(val) => setSelectedRoleId(val)}>
             <SelectTrigger className="w-full h-10 md:h-11 border-primary/20 bg-background font-bold text-primary shadow-sm text-xs md:text-sm">
               <SelectValue placeholder="-- Choose Role --" />
             </SelectTrigger>
             <SelectContent className="bg-white border-primary/20">
               {roles
                 .filter(r => r.name.toLowerCase() !== 'admin')
                 .map(r => (
                   <SelectItem key={r.id} value={r.id}>{r.name.toUpperCase()}</SelectItem>
                 ))}
             </SelectContent>
           </Select>
        </div>
      </div>

      {!selectedRoleId ? (
        <div className="h-96 flex flex-col items-center justify-center border-4 border-dashed border-primary/5 rounded-[3rem] bg-white/40">
           <div className="bg-primary/5 p-8 rounded-full mb-6">
              <Lock className="w-20 h-20 text-primary/20" />
           </div>
           <p className="text-primary/40 font-black text-2xl uppercase tracking-widest text-center">Select a role to manage access</p>
        </div>
      ) : loading ? (
        <div className="h-96 flex items-center justify-center">
           <Loader2 className="w-12 h-12 animate-spin text-secondary" />
        </div>
      ) : (
        <div className="space-y-8">
           {menuStructure
             .filter(item => item.title !== "System Administration")
             .map((item) => {
             const parentKey = item.permissionKey || findPermissionKey(item.title, item.title);
             
             return (
               <Card key={item.title} className="border shadow-2xl overflow-hidden rounded-[2rem] bg-background p-6">
                  <div className="bg-primary p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[2rem]">
                     <div className="flex items-center">
                        <div className="bg-white/10 p-3 rounded-2xl mr-4 text-secondary">
                           <item.icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">{item.title}</h3>
                     </div>
                     {parentKey && (
                        <div className="flex space-x-3 md:space-x-6 bg-black/20 p-2 md:p-3 rounded-xl md:rounded-2xl border border-white/5 self-stretch md:self-auto justify-center md:justify-end">
                            {(item.children ? ['can_view'] : ['can_view', 'can_create', 'can_edit', 'can_delete']).map(field => (
                                <div key={field} className="flex flex-col items-center px-1">
                                    <span className="text-[8px] text-white/50 font-black uppercase mb-1">{field.replace('can_', '')}</span>
                                    <Checkbox 
                                        checked={getPermValue(parentKey, field)}
                                        onCheckedChange={() => {
                                           const childrenKeys = item.children?.map(c => c.permissionKey || findPermissionKey(c.title, item.title)).filter(Boolean) as string[];
                                           handleToggle(parentKey, field, getPermValue(parentKey, field), childrenKeys);
                                        }}
                                        disabled={!canModify}
                                        className="h-5 w-5 border-white/20 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                                    />
                                </div>
                            ))}
                        </div>
                     )}
                  </div>
                  
                  {item.children && (
                    <CardContent className="p-0 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                       <table className="w-full min-w-[600px] md:min-w-full">
                          <tbody className="divide-y divide-primary/5">
                             {item.children.map((child) => {
                               const childKey = child.permissionKey || findPermissionKey(child.title, item.title);
                               
                               return (
                                 <tr key={child.title} className="group hover:bg-slate-50 transition-all duration-300">
                                    <td className="p-6 w-1/3">
                                       <div className="flex items-center">
                                          <ChevronRight className="w-4 h-4 text-primary/20 mr-3 group-hover:translate-x-1 transition-transform" />
                                          <div>
                                             <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">{child.title}</div>
                                             <div className="text-[9px] text-slate-400 font-medium tracking-wide uppercase mt-1">{child.path}</div>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="p-4 md:p-6">
                                       <div className="flex justify-end space-x-6 md:space-x-12 px-2 md:px-4">
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
