import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectStatus, User, UserRole, ProjectType, GlobalTeamConfigs } from '../types';
import { CalendarIcon, MapPinIcon, SearchIcon, MoreVerticalIcon, EditIcon, CopyIcon, TrashIcon, LayoutGridIcon, ListIcon, PlusIcon, NavigationIcon, CheckCircleIcon, XIcon, UsersIcon, ClipboardListIcon, PaperclipIcon, BoxIcon, FileTextIcon, DownloadIcon, StampIcon, UploadIcon } from './Icons';

interface ProjectListProps {
  title?: string;
  projects: Project[];
  currentUser: User;
  lastUpdateInfo?: { name: string; time: string } | null;
  onSelectProject: (project: Project) => void;
  onAddProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onOpenDrivingTime?: () => void;
  onImportExcel?: () => void;
  onExportExcel?: () => void;
  onImportConstructionRecords?: () => void;
  onImportConstructionReports?: () => void;
  onImportCompletionReports?: () => void;
  onAddToSchedule?: (date: string, teamId: number, taskName: string) => boolean;
  globalTeamConfigs?: GlobalTeamConfigs;
}

const ProjectList: React.FC<ProjectListProps> = ({ 
  title, projects, currentUser, lastUpdateInfo, onSelectProject, onAddProject, 
  onDeleteProject, onDuplicateProject, onEditProject, onOpenDrivingTime,
  onImportExcel, onExportExcel, onImportConstructionRecords, onImportConstructionReports, onImportCompletionReports,
  onAddToSchedule, globalTeamConfigs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid'); 
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  
  // 排程相關狀態
  const [schedulingProject, setSchedulingProject] = useState<Project | null>(null);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTeam, setScheduleTeam] = useState(1);
  const [pastedDone, setPastedDone] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
      if (importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
        setImportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.COMPLETED: return 'bg-green-100 text-green-800 border-green-200';
      case ProjectStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 border-blue-200';
      case ProjectStatus.PLANNING: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeInfo = (type: ProjectType) => {
    switch (type) {
      case ProjectType.MAINTENANCE:
        return { label: '維修', color: 'bg-orange-50 text-orange-600 border-orange-100' };
      case ProjectType.MODULAR_HOUSE:
        return { label: '組合屋', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      default:
        return { label: '圍籬', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
    }
  };

  const formatDescription = (text: string) => {
    if (!text) return '';
    return text.replace(/(\d+\.\s)/g, (match, p1, offset) => {
      return offset === 0 ? match : `\n${match}`;
    }).trim();
  };

  const filteredProjects = projects.filter(project => {
    if (!project) return false;
    const search = searchTerm.toLowerCase();
    const name = (project.name || '').toLowerCase();
    const client = (project.clientName || '').toLowerCase();
    const addr = (project.address || '').toLowerCase();
    const matchesSearch = name.includes(search) || client.includes(search) || addr.includes(search);
    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || project.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const canAddProject = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;
  const canManageProject = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  const handleMenuClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === projectId ? null : projectId);
  };

  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    onEditProject(project);
    setActiveMenuId(null);
  };

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    onDeleteProject(projectId);
    setActiveMenuId(null);
  };

  const handleDuplicate = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    onDuplicateProject(project);
    setActiveMenuId(null);
  };

  const handleOpenScheduleDialog = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setSchedulingProject(project);
    setActiveMenuId(null);
    setPastedDone(false);
  };

  const handlePasteToSchedule = () => {
    if (!schedulingProject || !onAddToSchedule) return;
    const success = onAddToSchedule(scheduleDate, scheduleTeam, schedulingProject.name);
    if (success) {
      setPastedDone(true);
      setTimeout(() => {
        setPastedDone(false);
        setSchedulingProject(null);
      }, 1500);
    } else {
      alert('該案件已在排程中');
    }
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-[1600px] mx-auto pb-20 md:pb-6 h-full overflow-y-auto custom-scrollbar" onClick={() => setActiveMenuId(null)}>
      {/* Page Title & Global Actions */}
      <div className="flex flex-row items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title || '案件總覽'}</h1>
          {lastUpdateInfo && (
            <div className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1.5 animate-fade-in tracking-tight">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              最後更新: <span className="text-blue-600">{lastUpdateInfo.name}</span> <span className="opacity-60">({lastUpdateInfo.time})</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {/* 批量匯入中心 */}
          {(onImportConstructionRecords || onImportConstructionReports || onImportCompletionReports) && (
            <div className="relative" ref={importMenuRef}>
              <button
                onClick={() => setImportMenuOpen(!importMenuOpen)}
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all active:scale-95"
                title="批量匯入工具"
              >
                <UploadIcon className="w-5 h-5" />
              </button>
              
              {importMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-[120] overflow-hidden animate-fade-in p-1">
                   <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">匯入選項</div>
                   {onImportConstructionRecords && (
                     <button 
                        onClick={() => { onImportConstructionRecords(); setImportMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors"
                     >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                          <ClipboardListIcon className="w-4 h-4 text-slate-500" />
                        </div>
                        批量匯入施工紀錄 (Excel)
                     </button>
                   )}
                   {onImportConstructionReports && (
                     <button 
                        onClick={() => { onImportConstructionReports(); setImportMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors"
                     >
                        <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                          <FileTextIcon className="w-4 h-4 text-orange-600" />
                        </div>
                        批量匯入施工報告 (PDF)
                     </button>
                   )}
                   {onImportCompletionReports && (
                     <button 
                        onClick={() => { onImportCompletionReports(); setImportMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors"
                     >
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                          <StampIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        批量匯入完工報告 (PDF)
                     </button>
                   )}
                </div>
              )}
            </div>
          )}

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all active:scale-95"
              title="匯出排程表"
            >
              <DownloadIcon className="w-5 h-5" />
            </button>
          )}
          {onImportExcel && (
            <button
              onClick={onImportExcel}
              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all active:scale-95"
              title="匯入排程表"
            >
              <FileTextIcon className="w-5 h-5" />
            </button>
          )}
          {onOpenDrivingTime && (
            <button
              onClick={onOpenDrivingTime}
              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all active:scale-95"
              title="估計行車時間"
            >
              <NavigationIcon className="w-5 h-5" />
            </button>
          )}
          {canAddProject && (
            <button
              onClick={onAddProject}
              className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all active:scale-95"
              title="新增案件"
            >
              <PlusIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Unified Project Section */}
      <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Category Tabs Section */}
        <div className="bg-slate-50 border-b border-slate-200">
            <div className="flex overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setTypeFilter('ALL')}
                    className={`flex-1 min-w-[60px] py-2.5 px-3 text-xs font-black transition-all border-b-2 relative ${typeFilter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-700 shadow-inner' : 'text-slate-500 hover:bg-slate-100 border-transparent'}`}
                >
                    全部案件
                </button>
                <button 
                    onClick={() => setTypeFilter(ProjectType.CONSTRUCTION)}
                    className={`flex-1 min-w-[60px] py-2.5 px-3 text-xs font-black transition-all border-b-2 relative ${typeFilter === ProjectType.CONSTRUCTION ? 'bg-blue-600 text-white border-blue-700 shadow-inner' : 'text-slate-500 hover:bg-slate-100 border-transparent'}`}
                >
                    圍籬
                </button>
                <button 
                    onClick={() => setTypeFilter(ProjectType.MODULAR_HOUSE)}
                    className={`flex-1 min-w-[60px] py-2.5 px-3 text-xs font-black transition-all border-b-2 relative ${typeFilter === ProjectType.MODULAR_HOUSE ? 'bg-emerald-600 text-white border-emerald-700 shadow-inner' : 'text-slate-500 hover:bg-slate-100 border-transparent'}`}
                >
                    組合屋
                </button>
                <button 
                    onClick={() => setTypeFilter(ProjectType.MAINTENANCE)}
                    className={`flex-1 min-w-[60px] py-2.5 px-3 text-xs font-black transition-all border-b-2 relative ${typeFilter === ProjectType.MAINTENANCE ? 'bg-orange-600 text-white border-orange-700 shadow-inner' : 'text-slate-500 hover:bg-slate-100 border-transparent'}`}
                >
                    維修
                </button>
            </div>
        </div>

        {/* Toolbar Section */}
        <div className="p-4 md:p-6 border-b border-slate-100 bg-white space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="搜尋專案名稱、客戶或地址..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-shrink-0">
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        title="列表檢視"
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        title="卡片檢視"
                    >
                        <LayoutGridIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto w-full no-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 uppercase py-1.5 flex items-center whitespace-nowrap tracking-widest">狀態篩選：</span>
                {['ALL', ProjectStatus.IN_PROGRESS, ProjectStatus.PLANNING, ProjectStatus.COMPLETED].map((status) => (
                    <button 
                        key={status} 
                        onClick={() => setStatusFilter(status as any)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${statusFilter === status ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {status === 'ALL' ? '全部狀態' : status}
                    </button>
                ))}
            </div>
        </div>

        {/* Project Content Area */}
        <div className="p-4 md:p-6 bg-slate-50/30 flex-1 min-h-[400px]">
            {filteredProjects.length === 0 ? (
                <div className="w-full py-24 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                    <div className="mb-3 flex justify-center">
                        <BoxIcon className="w-12 h-12 opacity-20" />
                    </div>
                    <p className="font-bold">沒有找到符合條件的專案</p>
                    <p className="text-xs mt-1">您可以更換類別或清除搜尋條件</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredProjects.map((project) => {
                        const typeInfo = getTypeInfo(project.type);
                        const hasAttachments = project.attachments && project.attachments.length > 0;
                        return (
                            <div 
                                key={project.id} 
                                onClick={() => onSelectProject(project)}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all cursor-pointer overflow-hidden group relative flex flex-col hover:shadow-md hover:border-blue-300"
                            >
                                <div className={`h-1.5 bg-gradient-to-r ${project.type === ProjectType.MAINTENANCE ? 'from-orange-400 to-amber-500' : 'from-blue-500 to-indigo-500'}`} />
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-2 items-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${getStatusColor(project.status)}`}>
                                                {project.status}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wide ${typeInfo.color}`}>
                                                {typeInfo.label}
                                            </span>
                                            {hasAttachments && (
                                                <div className="flex items-center text-indigo-500" title="包含附件">
                                                    <PaperclipIcon className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                            {canManageProject && (
                                                <div className="relative">
                                                    <button 
                                                        onClick={(e) => handleMenuClick(e, project.id)}
                                                        className="text-slate-400 hover:text-slate-600 p-2 -mr-2 rounded-full active:bg-slate-100 transition-colors"
                                                    >
                                                        <MoreVerticalIcon className="w-5 h-5" />
                                                    </button>
                                                    
                                                    {activeMenuId === project.id && (
                                                        <div 
                                                            ref={menuRef}
                                                            className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in"
                                                        >
                                                            <button onClick={(e) => handleOpenScheduleDialog(e, project)} className="w-full text-left px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 font-bold flex items-center gap-2">
                                                                <PlusIcon className="w-4 h-4" /> 加入排程
                                                            </button>
                                                            <button onClick={(e) => handleEditClick(e, project)} className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 border-t border-slate-50 flex items-center gap-2">
                                                                <EditIcon className="w-4 h-4" /> 編輯
                                                            </button>
                                                            <button onClick={(e) => handleDuplicate(e, project)} className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                                                                <CopyIcon className="w-4 h-4" /> 複製
                                                            </button>
                                                            {currentUser.role === UserRole.ADMIN && (
                                                                <button onClick={(e) => handleDelete(e, project.id)} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50">
                                                                    <TrashIcon className="w-4 h-4" /> 刪除
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-lg font-black text-slate-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                                        {project.name}
                                    </h3>
                                    
                                    <p className="text-slate-500 text-sm md:text-base mb-6 line-clamp-5 min-h-[5em] leading-relaxed whitespace-pre-wrap">
                                        {formatDescription(project.description)}
                                    </p>

                                    <div className="space-y-1.5 text-xs md:text-sm text-slate-600 mt-auto pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <MapPinIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <span className="truncate font-medium">{project.address}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <CalendarIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                <span className="font-bold text-slate-400 whitespace-nowrap uppercase tracking-tighter">預約:</span>
                                                <span className="text-slate-700 font-black">{formatDate(project.appointmentDate)}</span>
                                            </div>
                                            {project.reportDate && (
                                                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                                    <span className="font-bold text-slate-400 whitespace-nowrap uppercase tracking-tighter">報修:</span>
                                                    <span className="text-slate-700 font-black">{formatDate(project.reportDate)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 w-24">狀態</th>
                                    <th className="px-6 py-4">專案名稱 / 工程內容</th>
                                    <th className="px-6 py-4">客戶 / 地址</th>
                                    <th className="px-6 py-4">重要日期</th>
                                    <th className="px-6 py-4 w-16 text-center">附件</th>
                                    {canManageProject && <th className="px-6 py-4 w-24 text-right">操作</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProjects.map((project) => {
                                    const typeInfo = getTypeInfo(project.type);
                                    const hasAttachments = project.attachments && project.attachments.length > 0;
                                    return (
                                        <tr key={project.id} onClick={() => onSelectProject(project)} className="hover:bg-slate-50 transition-colors cursor-pointer group active:bg-slate-100">
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${getStatusColor(project.status)}`}>
                                                        {project.status}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${typeInfo.color}`}>
                                                        {typeInfo.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-black text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">{project.name}</div>
                                                <div className="text-slate-400 text-xs line-clamp-2 max-w-[300px] whitespace-pre-wrap">{formatDescription(project.description)}</div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="text-sm font-bold text-slate-700">{project.clientName}</div>
                                                <div className="text-xs text-slate-400 truncate max-w-[150px] mt-0.5">{project.address}</div>
                                            </td>
                                            <td className="px-6 py-4 align-top text-xs">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-slate-400 font-bold uppercase tracking-tighter">預約:</span>
                                                        <span className="text-slate-700 font-black">{formatDate(project.appointmentDate) || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-slate-400 font-bold uppercase tracking-tighter">報修:</span>
                                                        <span className="text-slate-700 font-black">{formatDate(project.reportDate) || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top text-center">
                                                {hasAttachments && <PaperclipIcon className="w-4 h-4 text-indigo-400 mx-auto" />}
                                            </td>
                                            {canManageProject && (
                                                <td className="px-6 py-4 align-top text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={(e) => handleOpenScheduleDialog(e, project)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="加入排程">
                                                            <PlusIcon className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={(e) => handleEditClick(e, project)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="編輯">
                                                            <EditIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Join Schedule Dialog */}
      {schedulingProject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSchedulingProject(null)}>
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
             <header className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                      <PlusIcon className="w-4 h-4" />
                   </div>
                   <h3 className="font-black text-slate-800 text-sm">加入工作排程</h3>
                </div>
                <button onClick={() => setSchedulingProject(null)} className="p-1 text-slate-400 hover:text-slate-600">
                   <XIcon className="w-5 h-5" />
                </button>
             </header>
             <div className="p-6 space-y-5">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-2">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">待排專案</div>
                   <div className="text-sm font-black text-slate-800 truncate">{schedulingProject.name}</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">預計施工日期</label>
                    <div className="relative">
                       <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input 
                         type="date" 
                         value={scheduleDate}
                         onChange={e => setScheduleDate(e.target.value)}
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                       />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">派遣組別</label>
                    <div className="relative">
                       <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <select 
                         value={scheduleTeam}
                         onChange={e => setScheduleTeam(parseInt(e.target.value))}
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:bg-white transition-all"
                       >
                         {[1,2,3,4,5,6,7,8].map(t => (
                           <option key={t} value={t}>
                             第 {t} 組 {globalTeamConfigs && globalTeamConfigs[t]?.master ? `(${globalTeamConfigs[t].master})` : ''}
                           </option>
                         ))}
                       </select>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handlePasteToSchedule}
                  disabled={pastedDone}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black transition-all shadow-lg active:scale-95 ${pastedDone ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
                >
                  {pastedDone ? <CheckCircleIcon className="w-5 h-5" /> : <ClipboardListIcon className="w-5 h-5" />}
                  {pastedDone ? '已貼上排程' : '貼上排程'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;