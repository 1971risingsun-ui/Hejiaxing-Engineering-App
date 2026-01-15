import React, { useState, useRef, useMemo } from 'react';
import { User, UserRole, AuditLog, Project, SystemRules, MaterialFormulaConfig, MaterialFormulaItem, RolePermission } from '../types';
import { PlusIcon, TrashIcon, ShieldIcon, UserIcon, HistoryIcon, DownloadIcon, UploadIcon, BoxIcon, SettingsIcon, CheckCircleIcon, LoaderIcon, AlertIcon, PenToolIcon, ChevronRightIcon, WrenchIcon, EditIcon, XIcon, LayoutGridIcon, BriefcaseIcon, UsersIcon, FileTextIcon, TruckIcon, ClipboardListIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';

interface UserManagementProps {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  auditLogs: AuditLog[];
  onLogAction: (action: string, details: string) => void;
  projects?: Project[];
  onRestoreData?: (data: { projects: Project[], users: User[], auditLogs: AuditLog[] }) => void;
  onConnectDirectory?: () => Promise<void>;
  dirPermission?: 'granted' | 'prompt' | 'denied';
  isWorkspaceLoading?: boolean;
  systemRules: SystemRules;
  onUpdateSystemRules: (rules: SystemRules) => void;
}

const PERMISSION_STRUCTURE = [
  { id: 'engineering', label: '工務總覽', type: 'main' },
  { id: 'engineering_hub', label: '工作排程', type: 'main', children: [
    { id: 'daily_dispatch', label: '明日工作排程' },
    { id: 'driving_time', label: '估計行車時間' },
    { id: 'weekly_schedule', label: '週間工作排程' },
    { id: 'outsourcing', label: '外包廠商管理' },
    { id: 'engineering_groups', label: '工程小組設定' },
  ]},
  { id: 'purchasing_hub', label: '採購管理', type: 'main', children: [
    { id: 'purchasing_items', label: '採購項目' },
    { id: 'stock_alert', label: '常備庫存爆量通知' },
    { id: 'purchasing_suppliers', label: '供應商清冊' },
    { id: 'purchasing_subcontractors', label: '外包廠商' },
    { id: 'purchasing_orders', label: '採購單管理' },
    { id: 'purchasing_inbounds', label: '進料明細' },
  ]},
  { id: 'hr', label: '人事管理', type: 'main' },
  { id: 'production', label: '生產／備料', type: 'main' },
  { id: 'equipment', label: '設備與工具', type: 'main', children: [
    { id: 'equipment_tools', label: '工具管理' },
    { id: 'equipment_assets', label: '大型設備管理' },
    { id: 'equipment_vehicles', label: '車輛管理' },
  ]},
  { id: 'report', label: '工作回報', type: 'main' },
  { id: 'users', label: '系統權限設定', type: 'main' },
];

const UserManagement: React.FC<UserManagementProps> = ({ 
  users, onUpdateUsers, auditLogs, onLogAction, projects = [], onRestoreData,
  onConnectDirectory, dirPermission, isWorkspaceLoading,
  systemRules, onUpdateSystemRules
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'data' | 'rules' | 'settings'>('users');
  const [activeRoleTab, setActiveRoleTab] = useState<UserRole>(UserRole.ADMIN);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.WORKER });
  const importFileRef = useRef<HTMLInputElement>(null);

  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);

  const isBrowserSupported = 'showDirectoryPicker' in window;

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return;

    const user: User = {
      id: crypto.randomUUID(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
    };

    onUpdateUsers([...users, user]);
    onLogAction('ADD_USER', `Added user: ${newUser.name} (${newUser.role})`);
    
    setNewUser({ name: '', email: '', role: UserRole.WORKER });
    setIsAdding(false);
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm('確定要刪除此使用者嗎？')) {
      onUpdateUsers(users.filter(u => u.id !== id));
      onLogAction('DELETE_USER', `Deleted user: ${name}`);
    }
  };

  const handleRoleChange = (id: string, name: string, newRole: UserRole) => {
    onUpdateUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    onLogAction('UPDATE_ROLE', `Changed role for ${name} to ${newRole}`);
  };

  const handleUpdateRolePermission = (role: UserRole, updates: Partial<RolePermission>) => {
    const currentPermissions = systemRules.rolePermissions || {
      [UserRole.ADMIN]: { displayName: '管理員', allowedViews: [] },
      [UserRole.MANAGER]: { displayName: '專案經理', allowedViews: [] },
      [UserRole.ENGINEERING]: { displayName: '工務人員', allowedViews: [] },
      [UserRole.FACTORY]: { displayName: '廠務人員', allowedViews: [] },
      [UserRole.WORKER]: { displayName: '現場人員', allowedViews: [] }
    };

    const newPermissions = {
      ...currentPermissions,
      [role]: { ...currentPermissions[role], ...updates }
    };

    onUpdateSystemRules({ ...systemRules, rolePermissions: newPermissions });
    onLogAction('UPDATE_ROLE_PERM', `Updated permissions for role: ${role}`);
  };

  const togglePermission = (role: UserRole, viewId: string) => {
    const current = systemRules.rolePermissions?.[role]?.allowedViews || [];
    let next;
    if (current.includes(viewId)) {
      next = current.filter(id => id !== viewId);
      // 如果關閉的是父項目，同步關閉所有子項目
      const item = PERMISSION_STRUCTURE.find(p => p.id === viewId);
      if (item?.children) {
        const childIds = item.children.map(c => c.id);
        next = next.filter(id => !childIds.includes(id));
      }
    } else {
      next = [...current, viewId];
      // 如果開啟的是子項目，自動開啟父項目
      PERMISSION_STRUCTURE.forEach(p => {
        if (p.children?.some(c => c.id === viewId) && !next.includes(p.id)) {
          next.push(p.id);
        }
      });
    }
    handleUpdateUpdateRolePermission(role, { allowedViews: next });
  };

  const handleUpdateUpdateRolePermission = (role: UserRole, updates: Partial<RolePermission>) => {
      handleUpdateRolePermission(role, updates);
  };

  const handleExportData = () => {
    const backupData = {
      projects,
      users,
      auditLogs,
      systemRules,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadBlob(blob, `hejiaxing_backup_${new Date().toISOString().split('T')[0]}.json`);
    
    onLogAction('DATA_EXPORT', 'Exported system backup');
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.projects || !Array.isArray(json.projects)) {
          throw new Error('Invalid backup file');
        }

        if (confirm(`還原將覆寫現有資料，確定嗎？`)) {
          if (onRestoreData) {
            onRestoreData({
              projects: json.projects,
              users: json.users || users,
              auditLogs: json.auditLogs || auditLogs
            });
          }
        }
      } catch (error) {
        alert('備份檔案無效');
      }
    };
    reader.readAsText(file);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  // --- 規則設定相關函數 ---
  const handleUpdateKeywords = (type: 'production' | 'subcontractor' | 'modular-production' | 'modular-subcontractor', value: string) => {
    const keywords = value.split(',').map(s => s.trim()).filter(s => !!s);
    if (type === 'production') {
      onUpdateSystemRules({ ...systemRules, productionKeywords: keywords });
    } else if (type === 'subcontractor') {
      onUpdateSystemRules({ ...systemRules, subcontractorKeywords: keywords });
    } else if (type === 'modular-production') {
      onUpdateSystemRules({ ...systemRules, modularProductionKeywords: keywords });
    } else if (type === 'modular-subcontractor') {
      onUpdateSystemRules({ ...systemRules, modularSubcontractorKeywords: keywords });
    }
  };

  const handleAddFormula = () => {
    const newFormula: MaterialFormulaConfig = {
      id: crypto.randomUUID(),
      keyword: '新關鍵字',
      category: '其他',
      items: []
    };
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: [...systemRules.materialFormulas, newFormula]
    });
    setEditingFormulaId(newFormula.id);
  };

  const handleDeleteFormula = (id: string) => {
    if (!confirm('確定刪除此換算規則嗎？')) return;
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: systemRules.materialFormulas.filter(f => f.id !== id)
    });
  };

  const handleUpdateFormulaConfig = (id: string, field: keyof MaterialFormulaConfig, value: string) => {
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: systemRules.materialFormulas.map(f => f.id === id ? { ...f, [field]: value } : f)
    });
  };

  const handleAddFormulaItem = (formulaId: string) => {
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: systemRules.materialFormulas.map(f => {
        if (f.id === formulaId) {
          return {
            ...f,
            items: [...f.items, { id: crypto.randomUUID(), name: '新材料', formula: 'baseQty', unit: '項' }]
          };
        }
        return f;
      })
    });
  };

  const handleUpdateFormulaItem = (formulaId: string, itemId: string, field: keyof MaterialFormulaItem, value: string) => {
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: systemRules.materialFormulas.map(f => {
        if (f.id === formulaId) {
          return {
            ...f,
            items: f.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
          };
        }
        return f;
      })
    });
  };

  const handleRemoveFormulaItem = (formulaId: string, itemId: string) => {
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: systemRules.materialFormulas.map(f => {
        if (f.id === formulaId) {
          return {
            ...f,
            items: f.items.filter(i => i.id !== itemId)
          };
        }
        return f;
      })
    });
  };

  const currentRolePerm = useMemo(() => {
    return systemRules.rolePermissions?.[activeRoleTab] || { displayName: '', allowedViews: [] };
  }, [systemRules.rolePermissions, activeRoleTab]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">權限管理與系統設定</h1>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200 overflow-x-auto no-scrollbar flex-shrink-0">
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('users')}>
          <ShieldIcon className="w-4 h-4" /> 使用者與權限
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'rules' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('rules')}>
          <PenToolIcon className="w-4 h-4" /> 規則設定
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('logs')}>
          <HistoryIcon className="w-4 h-4" /> 紀錄
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('data')}>
          <BoxIcon className="w-4 h-4" /> 備份
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('settings')}>
          <SettingsIcon className="w-4 h-4" /> 系統設定
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-1">
        {activeTab === 'users' && (
          <div className="space-y-10 pb-10">
            {/* 使用者名單部分 */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><UsersIcon className="w-5 h-5 text-indigo-500" /> 使用者名單</h3>
                <button
                  onClick={() => setIsAdding(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all"
                  title="新增使用者"
                >
                  <PlusIcon className="w-6 h-6" />
                </button>
              </div>

              {isAdding && (
                <div className="mb-6 bg-white p-4 rounded-xl border border-blue-200 shadow-sm animate-fade-in">
                  <h3 className="font-bold mb-3 text-slate-800">新增帳號</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input type="text" placeholder="姓名" className="px-3 py-2 border rounded-lg" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                    <input type="email" placeholder="Email" className="px-3 py-2 border rounded-lg" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                    <select className="px-3 py-2 border rounded-lg bg-white" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                      <option value={UserRole.ADMIN}>管理員</option>
                      <option value={UserRole.MANAGER}>專案經理</option>
                      <option value={UserRole.ENGINEERING}>工務人員</option>
                      <option value={UserRole.FACTORY}>廠務人員</option>
                      <option value={UserRole.WORKER}>現場人員</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-100 text-slate-600 rounded-lg py-2">取消</button>
                      <button onClick={handleAddUser} className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-bold">建立</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                        <tr>
                        <th className="px-4 py-3 whitespace-nowrap">使用者</th>
                        <th className="px-4 py-3 whitespace-nowrap">Email</th>
                        <th className="px-4 py-3 whitespace-nowrap">權限類別</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">刪除</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 flex items-center gap-2 whitespace-nowrap">
                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {user.avatar ? <img src={user.avatar} alt={user.name} /> : <UserIcon className="w-4 h-4 text-slate-500" />}
                            </div>
                            <span className="font-bold text-slate-800 text-sm">{user.name}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{user.email}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                            <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, user.name, e.target.value as UserRole)}
                                className={`text-xs font-black px-3 py-1.5 rounded-lg border-none shadow-sm cursor-pointer ${
                                user.role === UserRole.ADMIN ? 'bg-purple-600 text-white' :
                                user.role === UserRole.MANAGER ? 'bg-blue-600 text-white' :
                                user.role === UserRole.ENGINEERING ? 'bg-indigo-600 text-white' :
                                user.role === UserRole.FACTORY ? 'bg-emerald-600 text-white' :
                                'bg-slate-600 text-white'
                                }`}
                            >
                                <option value={UserRole.ADMIN}>{systemRules.rolePermissions?.[UserRole.ADMIN]?.displayName || '管理員'}</option>
                                <option value={UserRole.MANAGER}>{systemRules.rolePermissions?.[UserRole.MANAGER]?.displayName || '專案經理'}</option>
                                <option value={UserRole.ENGINEERING}>{systemRules.rolePermissions?.[UserRole.ENGINEERING]?.displayName || '工務人員'}</option>
                                <option value={UserRole.FACTORY}>{systemRules.rolePermissions?.[UserRole.FACTORY]?.displayName || '廠務人員'}</option>
                                <option value={UserRole.WORKER}>{systemRules.rolePermissions?.[UserRole.WORKER]?.displayName || '現場人員'}</option>
                            </select>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button onClick={() => handleDeleteUser(user.id, user.name)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
              </div>
            </div>

            {/* 權限角色設定部分 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShieldIcon className="w-5 h-5 text-blue-600" /> 權限角色細節設定</h3>
              </div>

              {/* 角色頁籤 */}
              <div className="flex flex-wrap gap-2 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
                {[UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEERING, UserRole.FACTORY, UserRole.WORKER].map(role => (
                  <button 
                    key={role}
                    onClick={() => setActiveRoleTab(role)}
                    className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeRoleTab === role ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {systemRules.rolePermissions?.[role]?.displayName || role}
                  </button>
                ))}
              </div>

              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">權限類別自訂名稱</label>
                  <input 
                    type="text"
                    value={currentRolePerm.displayName}
                    onChange={(e) => handleUpdateRolePermission(activeRoleTab, { displayName: e.target.value })}
                    placeholder="例如: 超級管理員"
                    className="w-full max-w-md px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">側邊欄與子項目可見權限</label>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {PERMISSION_STRUCTURE.map(group => {
                        const isMainChecked = currentRolePerm.allowedViews.includes(group.id);
                        return (
                          <div key={group.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                             <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox"
                                  id={`perm-${activeRoleTab}-${group.id}`}
                                  checked={isMainChecked}
                                  onChange={() => togglePermission(activeRoleTab, group.id)}
                                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor={`perm-${activeRoleTab}-${group.id}`} className="font-black text-slate-700 text-sm cursor-pointer">{group.label}</label>
                             </div>
                             
                             {group.children && (
                               <div className="pl-8 space-y-2 border-l-2 border-blue-100 ml-2.5 py-1">
                                  {group.children.map(child => {
                                    const isChildChecked = currentRolePerm.allowedViews.includes(child.id);
                                    return (
                                      <div key={child.id} className="flex items-center gap-2">
                                        <input 
                                          type="checkbox"
                                          disabled={!isMainChecked}
                                          id={`perm-${activeRoleTab}-${child.id}`}
                                          checked={isChildChecked}
                                          onChange={() => togglePermission(activeRoleTab, child.id)}
                                          className="w-4 h-4 rounded text-blue-400 focus:ring-blue-400 cursor-pointer disabled:opacity-30"
                                        />
                                        <label htmlFor={`perm-${activeRoleTab}-${child.id}`} className={`text-xs font-bold ${isMainChecked ? 'text-slate-500 cursor-pointer' : 'text-slate-300'}`}>{child.label}</label>
                                      </div>
                                    );
                                  })}
                               </div>
                             )}
                          </div>
                        );
                      })}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-8 pb-10">
            {/* 分流關鍵字設定 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <BoxIcon className="w-5 h-5 text-indigo-500" /> 生產與協力分流關鍵字 (圍籬)
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    生產／備料關鍵字 (以半形逗號隔開)
                  </label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    rows={2}
                    value={systemRules.productionKeywords.join(', ')}
                    onChange={(e) => handleUpdateKeywords('production', e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-medium italic">命中後將歸類至「生產／備料」頁面，通常為需預作的大門、防溢座等。</p>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    協力廠商關鍵字 (以半形逗號隔開)
                  </label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    rows={2}
                    value={systemRules.subcontractorKeywords.join(', ')}
                    onChange={(e) => handleUpdateKeywords('subcontractor', e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-medium italic">命中後將歸類至「協力廠商安排」，通常為怪手、告示牌、吊卡等。</p>
                </div>
              </div>
            </div>

            {/* 組合屋分流關鍵字區塊 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <BoxIcon className="w-5 h-5 text-blue-500" /> 組合屋分流關鍵字
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    生產／備料關鍵字 (以半形逗號隔開)
                  </label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    rows={2}
                    value={systemRules.modularProductionKeywords?.join(', ') || ''}
                    onChange={(e) => handleUpdateKeywords('modular-production', e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-medium italic">命中後將歸類至「生產／備料」頁面。</p>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    協力廠商關鍵字 (以半形逗號隔開)
                  </label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    rows={2}
                    value={systemRules.modularSubcontractorKeywords?.join(', ') || ''}
                    onChange={(e) => handleUpdateKeywords('modular-subcontractor', e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-medium italic">命中後將歸類至「協力廠商安排」。</p>
                </div>
              </div>
            </div>

            {/* 材料自動換算公式設定 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <WrenchIcon className="w-5 h-5 text-indigo-500" /> 材料自動換算公式 (基於報價單數量)
                </h3>
                <button 
                  onClick={handleAddFormula}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" /> 新增換算規則
                </button>
              </div>

              <div className="space-y-4">
                {systemRules.materialFormulas.map((f) => (
                  <div key={f.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">觸發關鍵字</label>
                            <input 
                              type="text" value={f.keyword}
                              onChange={(e) => handleUpdateFormulaConfig(f.id, 'keyword', e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-indigo-500 outline-none font-black text-slate-700 text-sm"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">歸屬分類</label>
                            <input 
                              type="text" value={f.category}
                              onChange={(e) => handleUpdateFormulaConfig(f.id, 'category', e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-indigo-500 outline-none font-bold text-indigo-600 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingFormulaId(editingFormulaId === f.id ? null : f.id)}
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteFormula(f.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {editingFormulaId === f.id && (
                      <div className="p-5 bg-white animate-fade-in">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="text-slate-400 font-bold uppercase tracking-widest text-[9px] bg-slate-50/50">
                              <tr>
                                <th className="px-3 py-2 w-1/4">材料名稱</th>
                                <th className="px-3 py-2 w-1/2">計算公式 (基數: baseQty)</th>
                                <th className="px-3 py-2 w-1/6">單位</th>
                                <th className="px-3 py-2 w-12 text-center">刪</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {f.items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/30">
                                  <td className="px-3 py-2">
                                    <input 
                                      type="text" value={item.name}
                                      onChange={(e) => handleUpdateFormulaItem(f.id, item.id, 'name', e.target.value)}
                                      className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 outline-none font-bold text-slate-700"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input 
                                      type="text" value={item.formula}
                                      onChange={(e) => handleUpdateFormulaItem(f.id, item.id, 'formula', e.target.value)}
                                      className="w-full bg-slate-50 px-2 py-1 rounded border border-slate-200 outline-none font-mono text-indigo-600"
                                      placeholder="Math.ceil(baseQty / 2.4)"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input 
                                      type="text" value={item.unit}
                                      onChange={(e) => handleUpdateFormulaItem(f.id, item.id, 'unit', e.target.value)}
                                      className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 outline-none text-slate-500 font-medium"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button onClick={() => handleRemoveFormulaItem(f.id, item.id)} className="text-slate-300 hover:text-red-500">
                                      <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button 
                            onClick={() => handleAddFormulaItem(f.id)}
                            className="w-full mt-4 py-2 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-black text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                          >
                            + 新增細項材料與公式
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">時間</th>
                  <th className="px-4 py-3 whitespace-nowrap">人員</th>
                  <th className="px-4 py-3 whitespace-nowrap">動作</th>
                  <th className="px-4 py-3 whitespace-nowrap">內容</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{log.userName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs line-clamp-2 max-w-[200px]">
                        {log.details}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      <HistoryIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      無紀錄
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                   <DownloadIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">匯出備份</h3>
                <p className="text-slate-500 text-xs mb-4">下載系統完整備份檔 (.json)</p>
                <button 
                  onClick={handleExportData}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg shadow-sm font-medium transition-all flex justify-center items-center gap-2 text-sm"
                >
                  <DownloadIcon className="w-4 h-4" /> 下載
                </button>
             </div>

             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-3">
                   <UploadIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">還原資料</h3>
                <p className="text-slate-500 text-xs mb-4">警告：將覆蓋現有資料</p>
                <input type="file" accept=".json" ref={importFileRef} className="hidden" onChange={handleFileChange} />
                <button 
                  onClick={handleImportClick}
                  className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 rounded-lg shadow-sm font-medium transition-all flex justify-center items-center gap-2 text-sm"
                >
                  <UploadIcon className="w-4 h-4" /> 選擇檔案
                </button>
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
             <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
               <SettingsIcon className="w-5 h-5 text-slate-400" /> 系統全域設定
             </h3>
             
             <div className="space-y-10">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">自動備份 db.json 權限設定</label>
                  <p className="text-xs text-slate-500 mb-4">
                    授權瀏覽器存取電腦特定的實體資料夾。選定後，系統將在每次更動時自動於該目錄寫入 db.json 進行即時同步。
                  </p>
                  
                  <div className="mt-4">
                    <button 
                      onClick={onConnectDirectory}
                      disabled={isWorkspaceLoading || !isBrowserSupported}
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl w-full transition-all border-2 ${
                        !isBrowserSupported ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed' :
                        dirPermission === 'granted' 
                          ? 'bg-green-50 border-green-500 text-green-700' 
                          : 'bg-blue-50 border-blue-500 text-blue-700'
                      } hover:shadow-md active:scale-[0.99]`}
                    >
                      <div className={`p-3 rounded-xl ${!isBrowserSupported ? 'bg-slate-300' : dirPermission === 'granted' ? 'bg-green-600' : 'bg-blue-600'} text-white`}>
                        {isWorkspaceLoading ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <BoxIcon className="w-6 h-6" />}
                      </div>
                      <div className="flex flex-col items-start text-left flex-1 min-w-0">
                        <span className="text-lg font-black tracking-tight">
                          {dirPermission === 'granted' ? '電腦同步已開啟' : '連結電腦自動備份目錄'}
                        </span>
                        <span className="text-xs opacity-70 font-bold">
                          {!isBrowserSupported ? '目前瀏覽器不支援' : dirPermission === 'granted' ? '點擊可更換儲存資料夾' : '選取資料夾以開啟即時備份功能'}
                        </span>
                      </div>
                      {isBrowserSupported && (
                        <div className="flex items-center gap-2">
                          {dirPermission === 'granted' ? <CheckCircleIcon className="w-6 h-6" /> : <AlertIcon className="w-6 h-6" />}
                        </div>
                      )}
                    </button>
                    
                    {dirPermission === 'granted' && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-600">系統目前正在同步您的資料夾根目錄下的 db.json</span>
                      </div>
                    )}
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;