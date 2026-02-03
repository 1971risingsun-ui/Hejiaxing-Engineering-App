import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, ProjectStatus, User, UserRole, ProjectType, WeeklySchedule as WeeklyScheduleType, DailyDispatch as DailyDispatchType, GlobalTeamConfigs, Employee, AttendanceRecord, OvertimeRecord, MonthSummaryRemark, Supplier, PurchaseOrder, SystemRules, StockAlertItem, Tool, Asset, Vehicle } from './types';
import EngineeringView from './components/EngineeringView';
import ProjectDetail from './components/ProjectDetail';
import UserManagement from './components/UserManagement';
import AddProjectModal from './components/AddProjectModal';
import EditProjectModal from './components/EditProjectModal';
import LoginScreen from './components/LoginScreen';
import GlobalWorkReport from './components/GlobalWorkReport';
import WeeklySchedule from './components/WeeklySchedule';
import DailyDispatch from './components/DailyDispatch';
import EngineeringGroups from './components/EngineeringGroups';
import HRManagement from './components/HRManagement';
import PurchasingModule from './components/PurchasingModule';
import SupplierList from './components/SupplierList';
import PurchaseOrders from './components/PurchaseOrders';
import InboundDetails from './components/InboundDetails';
import GlobalProduction from './components/GlobalProduction';
import GlobalOutsourcing from './components/GlobalOutsourcing';
import GlobalPurchasingItems from './components/GlobalPurchasingItems';
import StockAlert from './components/StockAlert';
import EquipmentModule from './components/EquipmentModule';
import ToolManagement from './components/ToolManagement';
import AssetManagement from './components/AssetManagement';
import VehicleManagement from './components/VehicleManagement';
import SyncDecisionCenter from './components/SyncDecisionCenter';
import AuditLogList from './components/AuditLogList';
import DrivingTimeEstimator from './components/DrivingTimeEstimator';
import ReportTrackingView from './components/ReportTrackingView';
import { HomeIcon, UserIcon, LogOutIcon, ShieldIcon, MenuIcon, XIcon, WrenchIcon, UploadIcon, LoaderIcon, ClipboardListIcon, LayoutGridIcon, BoxIcon, DownloadIcon, FileTextIcon, CheckCircleIcon, AlertIcon, UsersIcon, BriefcaseIcon, ArrowLeftIcon, CalendarIcon, NavigationIcon, SaveIcon, ExternalLinkIcon, RefreshIcon, PenToolIcon, HistoryIcon, MapPinIcon } from './components/Icons';
import { getDirectoryHandle, saveDbToLocal, loadDbFromLocal, getHandleFromIdb, saveAppStateToIdb, loadAppStateFromIdb, saveHandleToIdb } from './utils/fileSystem';
import { downloadBlob } from './utils/fileHelpers';
import { generateId, sortProjects, mergeAppState, computeDiffs, getProjectDiffMessage, mergeLists } from './utils/dataLogic';
import { DEFAULT_SYSTEM_RULES } from './constants/systemConfig';
import { useAuditTrail } from './hooks/useAuditTrail';
import { translateProjectContent } from './services/geminiService';

const LOGO_URL = './logo.png';
const REMOTE_DB_URL = 'https://1971risingsun-ui.github.io/Hejiaxing-internal-control-system/db.json';

const App: React.FC = () => {
  // --- 狀態管理 ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([{ id: 'u-1', name: 'Admin User', email: 'admin@hejiaxing.ai', role: UserRole.ADMIN, avatar: LOGO_URL }]);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleType[]>([]);
  const [dailyDispatches, setDailyDispatches] = useState<DailyDispatchType[]>([]);
  const [globalTeamConfigs, setGlobalTeamConfigs] = useState<GlobalTeamConfigs>({});
  const [systemRules, setSystemRules] = useState<SystemRules>(DEFAULT_SYSTEM_RULES);
  const [stockAlertItems, setStockAlertItems] = useState<StockAlertItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [overtime, setOvertime] = useState<OvertimeRecord[]>([]);
  const [monthRemarks, setMonthRemarks] = useState<MonthSummaryRemark[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [subcontractors, setSubcontractors] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // --- 持久化與同步 ---
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirPermission, setDirPermission] = useState<'granted' | 'prompt' | 'denied'>('prompt');
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncPending, setSyncPending] = useState<{ fileData: any, cacheData: any, diffs: any } | null>(null);
  const dbJsonInputRef = useRef<HTMLInputElement>(null);

  // --- 審計日誌 Hook ---
  const { auditLogs, setAuditLogs, lastUpdateInfo, setLastUpdateInfo, updateLastAction } = useAuditTrail(currentUser);

  // --- UI 控制 ---
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState<'update_log' | 'engineering' | 'engineering_hub' | 'purchasing_hub' | 'purchasing_items' | 'stock_alert' | 'purchasing_suppliers' | 'purchasing_subcontractors' | 'purchasing_orders' | 'purchasing_inbounds' | 'production' | 'hr' | 'equipment' | 'equipment_tools' | 'equipment_assets' | 'equipment_vehicles' | 'report' | 'users' | 'driving_time' | 'weekly_schedule' | 'daily_dispatch' | 'engineering_groups' | 'outsourcing' | 'report_tracking'>('engineering');

  const employeeNicknames = useMemo(() => employees.map(e => e.nickname || e.name).filter(Boolean), [employees]);

  // --- 資料還原核心 ---
  const restoreDataToState = (data: any) => {
    if (!data) return;
    if (Array.isArray(data.projects)) setProjects(sortProjects(data.projects));
    if (Array.isArray(data.users)) setAllUsers(data.users);
    if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
    if (Array.isArray(data.weeklySchedules)) setWeeklySchedules(data.weeklySchedules);
    if (Array.isArray(data.dailyDispatches)) setDailyDispatches(data.dailyDispatches);
    if (data.globalTeamConfigs) setGlobalTeamConfigs(data.globalTeamConfigs);
    if (data.systemRules) setSystemRules({ ...DEFAULT_SYSTEM_RULES, ...data.systemRules });
    if (Array.isArray(data.employees)) setEmployees(data.employees);
    if (Array.isArray(data.attendance)) setAttendance(data.attendance);
    if (Array.isArray(data.overtime)) setOvertime(data.overtime);
    if (Array.isArray(data.monthRemarks)) setMonthRemarks(data.monthRemarks);
    if (Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
    if (Array.isArray(data.subcontractors)) setSubcontractors(data.subcontractors);
    if (Array.isArray(data.purchaseOrders)) setPurchaseOrders(data.purchaseOrders);
    if (Array.isArray(data.stockAlertItems)) setStockAlertItems(data.stockAlertItems);
    if (Array.isArray(data.tools)) setTools(data.tools);
    if (Array.isArray(data.assets)) setAssets(data.assets);
    if (Array.isArray(data.vehicles)) setVehicles(data.vehicles);
    if (data.lastUpdateInfo) setLastUpdateInfo(data.lastUpdateInfo);
  };

  // --- 初始化加載 ---
  useEffect(() => {
    const restore = async () => {
      try {
        const savedHandle = await getHandleFromIdb();
        let fileState = null;
        if (savedHandle) {
          setDirHandle(savedHandle);
          const status = await (savedHandle as any).queryPermission({ mode: 'readwrite' });
          setDirPermission(status);
          if (status === 'granted') fileState = await loadDbFromLocal(savedHandle);
        }
        const cachedState = await loadAppStateFromIdb();
        if (!fileState && !cachedState) { setIsInitialized(true); return; }
        
        // 初次加載時執行自動合併 (Update not Overwrite)
        const merged = mergeAppState(cachedState || {}, fileState || {});
        restoreDataToState(merged);
      } catch (e) { console.error('Restore failed', e); } finally { setIsInitialized(true); }
    };
    restore();
  }, []);

  // --- 自動存檔監聽 ---
  useEffect(() => {
    if (!isInitialized) return;
    const save = async () => {
      const state = { projects, users: allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, systemRules, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, stockAlertItems, tools, assets, vehicles, lastUpdateInfo, lastSaved: new Date().toISOString() };
      await saveAppStateToIdb(state);
      if (dirHandle && dirPermission === 'granted') {
        await saveDbToLocal(dirHandle, state);
        setLastSyncTime(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
      }
    };
    const timer = setTimeout(save, 500);
    return () => clearTimeout(timer);
  }, [projects, allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, systemRules, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, stockAlertItems, tools, assets, vehicles, dirHandle, dirPermission, isInitialized, lastUpdateInfo]);

  // --- 登入同步邏輯 (智慧合併 + 決策機制) ---
  const handleSyncFromRemote = async (): Promise<User[]> => {
    try {
      const response = await fetch(REMOTE_DB_URL, { cache: 'no-store' });
      if (response.ok) {
        const remoteData = await response.json();
        const cachedData = await loadAppStateFromIdb() || { users: allUsers };
        
        // 1. 先執行自動合併 (時間戳優先，保證更新不覆蓋較新本地資料)
        const autoMerged = mergeAppState(cachedData, remoteData);
        restoreDataToState(autoMerged);
        await saveAppStateToIdb(autoMerged);

        // 2. 檢查是否有真正的「衝突」 (時間戳相同但內容不同)
        const diffs = computeDiffs(remoteData, cachedData);
        const hasTrueConflicts = Object.values(diffs).some((list: any) => list.length > 0);

        if (hasTrueConflicts) {
          // 只有發現無法自動判斷的衝突時，才彈出決策中心
          setSyncPending({ fileData: remoteData, cacheData: cachedData, diffs });
        }

        // 返回合併後的人員清單，確保 LoginScreen 有最新資料進行比對
        return autoMerged.users || [];
      }
    } catch (e) {
      console.warn('Remote sync failed, using local cache.', e);
    }
    return allUsers;
  };

  // --- 通用列表更新攔截 ---
  const handleUpdateList = <T extends object>(
    oldList: T[], 
    newList: T[], 
    setter: (list: T[]) => void, 
    entityLabel: string, 
    blockName: string = '基本資料',
    idKey: keyof T = 'id' as keyof T
  ) => {
    const getId = (item: T) => (item as any)[idKey];
    if (newList.length !== oldList.length) {
      const isAdded = newList.length > oldList.length;
      const target = isAdded 
        ? newList.find(n => !oldList.find(o => getId(o) === getId(n)))
        : oldList.find(o => !newList.find(n => getId(n) === getId(o)));
      if (target) {
        const name = (target as any).name || (target as any).plateNumber || String(getId(target));
        updateLastAction(name, `[${name}] ${isAdded ? '新增了' : '刪除了'}${entityLabel}`);
      }
    } else {
      const changed = newList.find(n => {
        const old = oldList.find(o => getId(o) === getId(n));
        return old && JSON.stringify(old) !== JSON.stringify(n);
      });
      if (changed) {
        const name = (changed as any).name || (changed as any).plateNumber || String(getId(changed));
        updateLastAction(name, `[${name}] 修改了：${blockName}`);
      }
    }
    setter(newList);
  };

  const handleUpdateAttendance = (newList: AttendanceRecord[]) => {
    const diff = newList.find(n => {
        const old = attendance.find(o => o.employeeId === n.employeeId && o.date === n.date);
        return !old || old.status !== n.status;
    });
    if (diff) {
        const emp = employees.find(e => e.id === diff.employeeId);
        if (emp) updateLastAction(emp.name, `[${emp.name}] 修改了：出勤紀錄 (${diff.date})`);
    }
    setAttendance(newList);
  };

  // --- 目錄同步與檔案操作 ---
  const handleDirectoryAction = async (force: boolean = false) => {
    setIsWorkspaceLoading(true);
    try {
      let handle = dirHandle;
      if (force || !handle) { handle = await getDirectoryHandle(); setDirHandle(handle); await saveHandleToIdb(handle); }
      const status = await (handle as any).requestPermission({ mode: 'readwrite' });
      setDirPermission(status);
      if (status === 'granted') {
        const fileState = await loadDbFromLocal(handle);
        const cachedState = await loadAppStateFromIdb();
        const diffs = computeDiffs(fileState || {}, cachedState || {});
        if (Object.values(diffs).some(l => l.length > 0)) {
          setSyncPending({ fileData: fileState, cacheData: cachedState, diffs });
        } else {
          restoreDataToState(mergeAppState(cachedState || {}, fileState || {}));
        }
      }
    } catch (e: any) { if (e.message !== '已取消選擇') alert(e.message); } finally { setIsWorkspaceLoading(false); }
  };

  const handleManualSaveAs = async () => {
    try {
      const appState = { projects, users: allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, systemRules, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, stockAlertItems, tools, assets, vehicles, lastUpdateInfo, lastSaved: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
      await downloadBlob(blob, `db_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    } catch (e) { alert('存檔失敗'); }
  };

  const handleImportDbJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.projects && window.confirm(`匯入將會完全覆蓋目前的系統資料，確定要繼續嗎？`)) {
          restoreDataToState(json); updateLastAction('匯入系統資料'); alert('資料已成功還原');
        }
      } catch (error) { alert('解析失敗'); }
    };
    reader.readAsText(file);
    if (dbJsonInputRef.current) dbJsonInputRef.current.value = '';
  };

  const handleSyncConfirm = (selections: Record<string, { id: string, side: 'file' | 'cache' }[]>) => {
    if (!syncPending) return;
    const { fileData, cacheData } = syncPending;
    const finalData = { ...mergeAppState(cacheData || {}, fileData || {}) }; 
    Object.entries(selections).forEach(([cat, list]) => {
      const catList: any[] = [];
      list.forEach(({ id, side }) => {
        const source = side === 'file' ? fileData[cat] : cacheData[cat];
        const item = source?.find((i: any) => i.id === id);
        if (item) catList.push(item);
      });
      const allIdsInSelections = new Set(list.map(l => l.id));
      const identicalItems = (fileData[cat] || []).filter((i: any) => !allIdsInSelections.has(i.id));
      finalData[cat] = [...catList, ...identicalItems];
      if (cat === 'projects') finalData[cat] = sortProjects(finalData[cat]);
    });
    restoreDataToState(finalData); setSyncPending(null); updateLastAction('完成選擇性同步');
  };

  const handleUpdateProject = (updatedProject: Project) => {
    const oldProject = projects.find(p => p.id === updatedProject.id);
    const diffText = oldProject ? getProjectDiffMessage(oldProject, updatedProject) : '';
    const finalProject = { ...updatedProject, lastModifiedBy: currentUser?.name || '系統', lastModifiedAt: Date.now() };
    setProjects(prev => sortProjects(prev.map(p => p.id === updatedProject.id ? finalProject : p)));
    if (selectedProject?.id === updatedProject.id) setSelectedProject(finalProject);
    updateLastAction(updatedProject.name, diffText ? `[${updatedProject.name}] 修改了：${diffText}` : undefined);
  };

  const handleDeleteProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId); if (!project) return;
    if (window.confirm(`確定要刪除案件「${project.name}」嗎？此操作無法還原。`)) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      updateLastAction(project.name, `[${project.name}] 刪除了案件`);
    }
  };

  const handleAddToSchedule = (date: string, teamId: number, taskName: string) => {
    let wasAdded = false;
    setWeeklySchedules(prev => {
      const newSchedules = [...prev];
      const d = new Date(date);
      const weekStart = new Date(d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1))).toISOString().split('T')[0];
      let wIdx = newSchedules.findIndex(s => s.weekStartDate === weekStart);
      if (wIdx === -1) { newSchedules.push({ weekStartDate: weekStart, teamConfigs: {}, days: {}, lastModifiedBy: currentUser?.name, lastModifiedAt: Date.now() }); wIdx = newSchedules.length - 1; }
      const week = { ...newSchedules[wIdx], lastModifiedBy: currentUser?.name, lastModifiedAt: Date.now() };
      const day = week.days[date] || { date, teams: {} };
      const team = day.teams[teamId] || { tasks: [] };
      if (!team.tasks.includes(taskName)) { team.tasks = [...team.tasks, taskName]; wasAdded = true; }
      day.teams[teamId] = team; week.days[date] = day; newSchedules[wIdx] = week;
      return newSchedules;
    });
    if (wasAdded) updateLastAction(`排程: ${taskName}`, `[排程系統] 將 ${taskName} 加入 ${date} 第 ${teamId} 組`);
    return wasAdded;
  };

  const handleTranslateAllProjects = async () => {
    const newProjects = [...projects];
    let successCount = 0;
    for (let i = 0; i < newProjects.length; i++) {
        const p = newProjects[i];
        if (p.description || p.remarks) {
            const translatedDesc = await translateProjectContent(p.description);
            const translatedRemarks = await translateProjectContent(p.remarks);
            newProjects[i] = { ...p, description: translatedDesc || p.description, remarks: translatedRemarks || p.remarks, lastModifiedAt: Date.now(), lastModifiedBy: 'AI 全域翻譯' };
            successCount++;
        }
    }
    setProjects(sortProjects(newProjects));
    updateLastAction('全域翻譯', `使用 AI 將 ${successCount} 件案件的資訊翻譯為中越對照格式`);
  };

  const isViewAllowed = (viewId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.ADMIN) return true;
    return !!systemRules.rolePermissions?.[currentUser.role]?.allowedViews?.includes(viewId);
  };

  const renderSidebarContent = () => (
    <>
      <div onClick={() => { setSelectedProject(null); setView('update_log'); setIsSidebarOpen(false); }} className="flex flex-col items-center justify-center w-full px-2 py-8 mb-2 hover:bg-slate-800/50 transition-colors group text-center cursor-pointer">
         <div className="w-20 h-20 mb-4 rounded-full bg-white p-0.5 shadow-lg border border-slate-700 transition-transform active:scale-95 group-hover:shadow-blue-500/20">
           <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain rounded-full" />
         </div>
         <h1 className="text-base font-black text-white tracking-[0.15em] border-b-2 border-yellow-500 pb-1">合家興實業</h1>
         <div className="mt-2 text-[9px] font-black bg-blue-600 px-3 py-0.5 rounded-full text-white uppercase tracking-widest">{systemRules.rolePermissions?.[currentUser?.role || UserRole.WORKER]?.displayName || currentUser?.role}</div>
      </div>
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar pb-10">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 mt-4 px-4">工務工程</div>
        {isViewAllowed('engineering') && <button onClick={() => { setSelectedProject(null); setView('engineering'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'engineering' && !selectedProject ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutGridIcon className="w-5 h-5" /> <span className="font-medium">工務總覽</span></button>}
        {isViewAllowed('engineering_hub') && <button onClick={() => { setSelectedProject(null); setView('engineering_hub'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'engineering_hub' || ['weekly_schedule','daily_dispatch','engineering_groups','driving_time','outsourcing','report_tracking'].includes(view) ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}><BriefcaseIcon className="w-5 h-5" /> <span className="font-medium">工作排程</span></button>}
        {isViewAllowed('report') && <button onClick={() => { setSelectedProject(null); setView('report'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'report' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><ClipboardListIcon className="w-5 h-5" /> <span className="font-medium">工作回報</span></button>}
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 mt-6 px-4">行政管理</div>
        {isViewAllowed('purchasing_hub') && <button onClick={() => { setSelectedProject(null); setView('purchasing_hub'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view.startsWith('purchasing') || view === 'stock_alert' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}><BoxIcon className="w-5 h-5" /> <span className="font-medium">採購管理</span></button>}
        {isViewAllowed('hr') && <button onClick={() => { setSelectedProject(null); setView('hr'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'hr' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}><UsersIcon className="w-5 h-5" /> <span className="font-medium">人事管理</span></button>}
        {isViewAllowed('production') && <button onClick={() => { setSelectedProject(null); setView('production'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'production' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}><PenToolIcon className="w-5 h-5" /> <span className="font-medium">生產／備料</span></button>}
        {isViewAllowed('equipment') && <button onClick={() => { setSelectedProject(null); setView('equipment'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'equipment' || view.startsWith('equipment_') ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}><WrenchIcon className="w-5 h-5" /> <span className="font-medium">設備／工具</span></button>}
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 mt-6 px-4">系統輔助</div>
        {isViewAllowed('users') && <button onClick={() => { setView('users'); setSelectedProject(null); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><ShieldIcon className="w-4 h-4" /> <span className="font-medium">系統帳號設定</span></button>}
        <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
          <button onClick={() => handleDirectoryAction(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all border ${dirHandle && dirPermission === 'granted' ? 'bg-green-600/10 border-green-500 text-green-400' : 'bg-red-600/10 border-red-500 text-red-400'}`}>
            {isWorkspaceLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : dirHandle && dirPermission === 'granted' ? <CheckCircleIcon className="w-5 h-5" /> : <AlertIcon className="w-5 h-5" />}
            <div className="flex items-start text-left flex-col"><span className="text-sm font-bold">{dirHandle && dirPermission === 'granted' ? '電腦同步已開啟' : '未連結電腦目錄'}</span><span className="text-[10px] opacity-70">{dirHandle && lastSyncTime ? `最後: ${lastSyncTime}` : 'db.json 即時備份'}</span></div>
          </button>
          <input type="file" accept=".json" ref={dbJsonInputRef} className="hidden" onChange={handleImportDbJson} />
          <button onClick={() => dbJsonInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all bg-orange-600/10 border border-orange-500/30 text-orange-400 hover:bg-orange-600 hover:text-white group"><UploadIcon className="w-5 h-5" /><div className="flex items-start text-left flex-col"><span className="text-sm font-bold">匯入 db.json</span><span className="text-[10px] opacity-70">還原系統備份</span></div></button>
          <button onClick={handleManualSaveAs} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white group"><SaveIcon className="w-5 h-5" /><div className="flex items-start text-left flex-col"><span className="text-sm font-bold">手動另存新檔</span><span className="text-[10px] opacity-70">下載 db.json 到本機</span></div></button>
        </div>
      </nav>
      <div className="p-4 border-t border-slate-800 w-full mt-auto mb-safe"><button onClick={() => setCurrentUser(null)} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"><LogOutIcon className="w-4 h-4" /> 登出</button></div>
    </>
  );

  const mainAppView = (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <datalist id="employee-nicknames-list">{employeeNicknames.map((name, i) => <option key={i} value={name} />)}</datalist>
      <div className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}><div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} /><aside className={`absolute left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>{renderSidebarContent()}</aside></div>
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white flex-shrink-0">{renderSidebarContent()}</aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-20 flex-shrink-0"><button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-500 p-2"><MenuIcon className="w-6 h-6" /></button><div className="text-sm font-bold text-slate-700">{selectedProject ? selectedProject.name : '合家興管理系統'}</div><div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm"><img src={LOGO_URL} alt="User" className="w-full h-full object-cover" /></div></header>
        <main className="flex-1 min-h-0 bg-[#f8fafc] pb-safe flex flex-col overflow-hidden">
          {view === 'update_log' ? (<AuditLogList logs={auditLogs} />) : 
           view === 'users' ? (<UserManagement users={allUsers} onUpdateUsers={(nl) => handleUpdateList(allUsers, nl, setAllUsers, '系統帳號')} auditLogs={auditLogs} onLogAction={(action, details) => updateLastAction('系統', details)} projects={projects} onRestoreData={restoreDataToState} systemRules={systemRules} onUpdateSystemRules={setSystemRules} />) : 
           view === 'report' ? (<div className="flex-1 overflow-y-auto custom-scrollbar"><GlobalWorkReport projects={projects} currentUser={currentUser!} onUpdateProject={handleUpdateProject} /></div>) : 
           view === 'engineering_hub' ? (<div className="flex-1 overflow-y-auto custom-scrollbar p-6 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">{[
             { id: 'daily_dispatch', label: '明日工作排程', icon: <ClipboardListIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
             { id: 'driving_time', label: '估計行車時間', icon: <NavigationIcon className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
             { id: 'weekly_schedule', label: '週間工作排程', icon: <CalendarIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
             { id: 'report_tracking', label: '回報追蹤表', icon: <FileTextIcon className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
             { id: 'outsourcing', label: '外包廠商管理', icon: <BriefcaseIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
             { id: 'engineering_groups', label: '工程小組設定', icon: <UsersIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
           ].filter(cat => isViewAllowed(cat.id)).map(cat => (<button key={cat.id} onClick={() => setView(cat.id as any)} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all group flex flex-col items-center text-center gap-4"><div className={`p-4 rounded-xl ${cat.color} group-hover:scale-110 transition-transform`}>{cat.icon}</div><div className="font-bold text-slate-800 text-lg">{cat.label}</div></button>))}</div></div>) :
           view === 'purchasing_hub' ? (<PurchasingModule onNavigate={setView} allowedViews={systemRules.rolePermissions?.[currentUser!.role]?.allowedViews || []} />) :
           view === 'purchasing_items' ? (<GlobalPurchasingItems projects={projects} onUpdateProject={handleUpdateProject} systemRules={systemRules} onBack={() => setView('purchasing_hub')} suppliers={suppliers} subcontractors={subcontractors} onUpdateSuppliers={(nl) => handleUpdateList(suppliers, nl, setSuppliers, '供應商', '清單細項')} onUpdateSubcontractors={(nl) => handleUpdateList(subcontractors, nl, setSubcontractors, '外包廠商', '清單細項')} purchaseOrders={purchaseOrders} onUpdatePurchaseOrders={(nl) => handleUpdateList(purchaseOrders, nl, setPurchaseOrders, '採購單', '單據內容')} />) :
           view === 'stock_alert' ? (<StockAlert items={stockAlertItems} onUpdateItems={(nl) => handleUpdateList(stockAlertItems, nl, setStockAlertItems, '預警項目', '數量內容')} onBack={() => setView('purchasing_hub')} />) :
           view === 'purchasing_suppliers' ? (<SupplierList title="供應商清冊" typeLabel="供應商" themeColor="emerald" suppliers={suppliers} onUpdateSuppliers={(nl) => handleUpdateList(suppliers, nl, setSuppliers, '供應商')} />) :
           view === 'purchasing_subcontractors' ? (<SupplierList title="外包廠商清冊" typeLabel="外包廠商" themeColor="indigo" suppliers={subcontractors} onUpdateSuppliers={(nl) => handleUpdateList(subcontractors, nl, setSubcontractors, '外包廠商')} />) :
           view === 'purchasing_orders' ? (<PurchaseOrders projects={projects} suppliers={[...suppliers, ...subcontractors]} purchaseOrders={purchaseOrders} onUpdatePurchaseOrders={(nl) => handleUpdateList(purchaseOrders, nl, setPurchaseOrders, '採購單')} onUpdateProject={handleUpdateProject} />) :
           view === 'purchasing_inbounds' ? (<InboundDetails projects={projects} suppliers={[...suppliers, ...subcontractors]} purchaseOrders={purchaseOrders} onUpdatePurchaseOrders={(nl) => handleUpdateList(purchaseOrders, nl, setPurchaseOrders, '進料清單')} />) :
           view === 'hr' ? (<HRManagement employees={employees} attendance={attendance} overtime={overtime} monthRemarks={monthRemarks} dailyDispatches={dailyDispatches} onUpdateEmployees={(nl) => handleUpdateList(employees, nl, setEmployees, '員工資料')} onUpdateAttendance={handleUpdateAttendance} onUpdateOvertime={(nl) => handleUpdateList(overtime, nl, setOvertime, '加班紀錄', '時數內容', 'date')} onUpdateMonthRemarks={(nl) => handleUpdateList(monthRemarks, nl, setMonthRemarks, '人事備註', '備註內容', 'month')} />) :
           view === 'production' ? (<GlobalProduction projects={projects} onUpdateProject={handleUpdateProject} systemRules={systemRules} />) :
           view === 'outsourcing' ? (<GlobalOutsourcing projects={projects} onUpdateProject={handleUpdateProject} systemRules={systemRules} subcontractors={subcontractors} />) :
           view === 'report_tracking' ? (<ReportTrackingView projects={projects} dailyDispatches={dailyDispatches} onBack={() => setView('engineering_hub')} onSelectProject={setSelectedProject} />) :
           view === 'driving_time' ? (<div className="flex-1 overflow-y-auto custom-scrollbar"><div className="px-6 pt-4"><button onClick={() => setView('engineering_hub')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回</button></div><DrivingTimeEstimator projects={projects} onAddToSchedule={handleAddToSchedule} globalTeamConfigs={globalTeamConfigs} /></div>) :
           view === 'weekly_schedule' ? (<div className="flex-1 flex flex-col overflow-hidden"><div className="px-6 pt-4"><button onClick={() => setView('engineering_hub')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回</button></div><WeeklySchedule projects={projects} weeklySchedules={weeklySchedules} globalTeamConfigs={globalTeamConfigs} onUpdateWeeklySchedules={(nl) => handleUpdateList(weeklySchedules, nl, setWeeklySchedules, '排程', '週計畫', 'weekStartDate')} onOpenDrivingTime={() => setView('driving_time')} /></div>) :
           view === 'daily_dispatch' ? (<div className="flex-1 flex flex-col overflow-hidden"><div className="px-6 pt-4"><button onClick={() => setView('engineering_hub')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回</button></div><DailyDispatch projects={projects} weeklySchedules={weeklySchedules} dailyDispatches={dailyDispatches} globalTeamConfigs={globalTeamConfigs} onUpdateDailyDispatches={(nl) => handleUpdateList(dailyDispatches, nl, setDailyDispatches, '派工', '當日內容', 'date')} onOpenDrivingTime={() => setView('driving_time')} /></div>) :
           view === 'engineering_groups' ? (<div className="flex-1 overflow-y-auto custom-scrollbar"><div className="px-6 pt-4"><button onClick={() => setView('engineering_hub')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回</button></div><EngineeringGroups globalTeamConfigs={globalTeamConfigs} onUpdateGlobalTeamConfigs={(nl) => { setGlobalTeamConfigs(nl); updateLastAction('系統設定', '[小組設定] 修改了：工程小組預設配置'); }} /></div>) :
           view === 'equipment' ? (<EquipmentModule onNavigate={setView} allowedViews={currentUser!.role === UserRole.ADMIN ? ['equipment_tools','equipment_assets','equipment_vehicles'] : (systemRules.rolePermissions?.[currentUser!.role]?.allowedViews || [])} />) :
           view === 'equipment_tools' ? (<ToolManagement tools={tools} onUpdateTools={(nl) => handleUpdateList(tools, nl, setTools, '工具', '狀態借用人')} employees={employees} />) :
           view === 'equipment_assets' ? (<AssetManagement assets={assets} onUpdateAssets={(nl) => handleUpdateList(assets, nl, setAssets, '大型設備', '地點檢驗日')} />) :
           view === 'equipment_vehicles' ? (<VehicleManagement vehicles={vehicles} onUpdateVehicles={(nl) => handleUpdateList(vehicles, nl, setVehicles, '車輛', '里程保險')} employees={employees} />) :
           selectedProject ? (<div className="flex-1 overflow-hidden"><ProjectDetail project={selectedProject} currentUser={currentUser!} onBack={() => setSelectedProject(null)} onUpdateProject={handleUpdateProject} onEditProject={setEditingProject} onAddToSchedule={handleAddToSchedule} globalTeamConfigs={globalTeamConfigs} systemRules={systemRules} /></div>) : 
           view === 'engineering' ? (<EngineeringView projects={projects} setProjects={setProjects} currentUser={currentUser!} lastUpdateInfo={lastUpdateInfo} updateLastAction={updateLastAction} systemRules={systemRules} employees={employees} setAttendance={handleUpdateAttendance} onSelectProject={setSelectedProject} onAddProject={() => setIsAddModalOpen(true)} onEditProject={setEditingProject} handleDeleteProject={handleDeleteProject} onAddToSchedule={handleAddToSchedule} onOpenDrivingTime={() => setView('driving_time')} onTranslateAllProjects={handleTranslateAllProjects} globalTeamConfigs={globalTeamConfigs} />) : null}
        </main>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {!currentUser ? (
        <LoginScreen onLogin={setCurrentUser} allUsers={allUsers} onRemoteSync={handleSyncFromRemote} />
      ) : (
        mainAppView
      )}
      
      {/* 全域同步決策中心：疊加於現有視圖之上，確保後方介面不消失 */}
      {syncPending && (
        <SyncDecisionCenter 
          diffs={syncPending.diffs} 
          onConfirm={handleSyncConfirm} 
          onCancel={() => setSyncPending(null)} 
        />
      )}

      {isAddModalOpen && <AddProjectModal onClose={() => setIsAddModalOpen(false)} onAdd={(p) => { setProjects(sortProjects([{ ...p, lastModifiedAt: Date.now(), lastModifiedBy: currentUser?.name }, ...projects])); updateLastAction(p.name, `[${p.name}] 新增了案件`); setIsAddModalOpen(false); }} defaultType={ProjectType.CONSTRUCTION} />}
      {editingProject && <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} onSave={handleUpdateProject} />}
    </div>
  );
};

export default App;