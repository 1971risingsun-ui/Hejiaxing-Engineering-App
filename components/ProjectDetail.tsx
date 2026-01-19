import React, { useState } from 'react';
import { Project, ProjectStatus, User, UserRole, ProjectType, GlobalTeamConfigs, SystemRules } from '../types';
import { ArrowLeftIcon, CalendarIcon, MapPinIcon, ExternalLinkIcon, ClipboardListIcon, BoxIcon, EditIcon, FileTextIcon, PlusIcon, XIcon, UsersIcon, CheckCircleIcon, TruckIcon, LanguagesIcon, LoaderIcon } from './Icons';
import ProjectOverview from './ProjectOverview';
import ConstructionRecord from './ConstructionRecord';
import ProjectMaterials from './ProjectMaterials';
import CompletionReport from './CompletionReport';
import EngineeringPlanning from './EngineeringPlanning';
import MaterialPreparation from './MaterialPreparation';
import { translateProjectContent } from '../services/geminiService';

interface ProjectDetailProps {
  project: Project;
  currentUser: User;
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  onEditProject: (project: Project) => void;
  onAddToSchedule?: (date: string, teamId: number, taskName: string) => boolean;
  globalTeamConfigs?: GlobalTeamConfigs;
  systemRules: SystemRules;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, currentUser, onBack, onUpdateProject, onEditProject, onAddToSchedule, globalTeamConfigs, systemRules }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'construction' | 'completion' | 'preparation' | 'planning'>('overview');
  
  // 排程與翻譯相關狀態
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTeam, setScheduleTeam] = useState(1);
  const [pastedDone, setPastedDone] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const canEdit = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ENGINEERING || currentUser.role === UserRole.WORKER;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${m}/${d}/${y}`;
  };

  const STATUS_CYCLE = [
    ProjectStatus.PLANNING,
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.COMPLETED,
    ProjectStatus.ON_HOLD
  ];

  const handleStatusCycle = () => {
    if (!canEdit) return;
    
    const currentIndex = STATUS_CYCLE.indexOf(project.status);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];

    onUpdateProject({
      ...project,
      status: nextStatus
    });
  };

  const handlePasteToSchedule = () => {
    if (!onAddToSchedule) return;
    const success = onAddToSchedule(scheduleDate, scheduleTeam, project.name);
    if (success) {
      setPastedDone(true);
      setTimeout(() => {
        setPastedDone(false);
        setIsScheduling(false);
      }, 1500);
    } else {
      alert('該案件已在排程中');
    }
  };

  /**
   * 改進後的單一案件翻譯：確保 description 與 remarks 同步翻譯為中越對照。
   */
  const handleTranslateProject = async () => {
    if (!canEdit) return;
    if (confirm('是否使用 AI 將此案件的描述與備註翻譯為中越文對照格式？')) {
      setIsTranslating(true);
      try {
        const translatedDesc = await translateProjectContent(project.description);
        const translatedRemarks = await translateProjectContent(project.remarks || '');
        
        onUpdateProject({
          ...project,
          description: translatedDesc || project.description,
          remarks: translatedRemarks || project.remarks,
          lastModifiedAt: Date.now(),
          lastModifiedBy: 'AI 翻譯'
        });
        alert('翻譯完成 (Dịch hoàn thành)！');
      } catch (e) {
        alert('翻譯失敗，請檢查網路或 API 金鑰。');
      } finally {
        setIsTranslating(false);
      }
    }
  };

  // 判斷是否為支援完工報告的類型 (圍籬或組合屋)
  const supportsCompletionReport = project.type === ProjectType.CONSTRUCTION || project.type === ProjectType.MODULAR_HOUSE;

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col relative">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 shadow-sm">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 mb-4 transition-colors">
          <ArrowLeftIcon className="w-4 h-4 mr-1" /> 返回列表 (Quay lại)
        </button>
        
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-3">
               <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
               {canEdit && (
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => onEditProject(project)} 
                     className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all text-xs font-bold"
                   >
                     <EditIcon className="w-3.5 h-3.5" /> 編輯 (Sửa)
                   </button>
                   {/* 新增的翻譯按鈕 */}
                   <button 
                     onClick={handleTranslateProject}
                     disabled={isTranslating}
                     className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all text-xs font-bold border border-indigo-100 disabled:opacity-50"
                     title="翻譯資訊 (Dịch thông tin)"
                   >
                     {isTranslating ? <LoaderIcon className="w-3.5 h-3.5 animate-spin" /> : <LanguagesIcon className="w-3.5 h-3.5" />}
                     翻譯 (Dịch)
                   </button>
                   <button 
                     onClick={() => setIsScheduling(true)} 
                     className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all text-xs font-bold border border-blue-100"
                   >
                     <PlusIcon className="w-3.5 h-3.5" /> 加入排程 (Lên lịch)
                   </button>
                 </div>
               )}
            </div>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 mt-2 text-sm text-slate-600">
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors group" title="在 Google 地圖中開啟">
                <MapPinIcon className="w-4 h-4 group-hover:text-blue-500" /> 
                <span className="underline decoration-dotted underline-offset-2">{project.address}</span>
                <ExternalLinkIcon className="w-3 h-3 opacity-50" />
              </a>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-slate-400" /> 
                  <span className="font-semibold">預約 (Hẹn):</span> {formatDate(project.appointmentDate) || '未定'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-400">報修 (Sửa):</span> {formatDate(project.reportDate) || '未定'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right mr-2 hidden sm:block">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">案件狀態 (Trạng thái)</div>
             </div>
             
             <button 
               onClick={handleStatusCycle}
               disabled={!canEdit}
               className={`px-4 py-2 rounded-xl text-sm font-black border transition-all active:scale-95 select-none ${
                 !canEdit ? 'cursor-default opacity-80' : 'cursor-pointer hover:shadow-md'
               } ${
                 project.status === ProjectStatus.COMPLETED ? 'bg-green-100 text-green-800 border-green-200' : 
                 project.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                 project.status === ProjectStatus.ON_HOLD ? 'bg-gray-100 text-gray-800 border-gray-200' :
                 'bg-yellow-100 text-yellow-800 border-yellow-200'
               }`}
               title={canEdit ? "點擊切換狀態" : ""}
             >
               {project.status}
             </button>
          </div>
        </div>

        <div className="flex gap-6 mt-8 border-b border-slate-200 overflow-x-auto no-scrollbar">
          <button className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('overview')}>
            詳細資訊 (Chi tiết)
          </button>
          <button className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'construction' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('construction')}>
            <ClipboardListIcon className="w-4 h-4" /> {project.type === ProjectType.CONSTRUCTION ? '施工紀錄 (Nhật ký)' : '施工報告 (Báo cáo)'} ({project.constructionItems?.length || 0})
          </button>
          {supportsCompletionReport && (
            <button className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'completion' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('completion')}>
                <FileTextIcon className="w-4 h-4" /> 完工報告 (Hoàn thành) ({(project.completionReports || []).length})
            </button>
          )}
          <button className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'materials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('materials')}>
            <BoxIcon className="w-4 h-4" /> 材料請購 (Vật tư) ({project.materials?.length || 0})
          </button>
          <button className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'preparation' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('preparation')}>
            <TruckIcon className="w-4 h-4" /> 材料清單 (Danh sách VT)
          </button>
          <button className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'planning' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('planning')}>
            <FileTextIcon className="w-4 h-4" /> 報價單 (Báo價) ({(project.planningReports || []).length})
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-auto bg-slate-50">
        {activeTab === 'overview' && <ProjectOverview project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} />}
        {activeTab === 'construction' && <ConstructionRecord project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} systemRules={systemRules} />}
        {activeTab === 'completion' && supportsCompletionReport && <CompletionReport project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} systemRules={systemRules} />}
        {activeTab === 'materials' && <ProjectMaterials project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} />}
        {activeTab === 'preparation' && <MaterialPreparation project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} systemRules={systemRules} />}
        {activeTab === 'planning' && <EngineeringPlanning project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} />}
      </div>
      
      {/* Join Schedule Dialog */}
      {isScheduling && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsScheduling(false)}>
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
             <header className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                      <PlusIcon className="w-4 h-4" />
                   </div>
                   <h3 className="font-black text-slate-800 text-sm">加入工作排程 (Lên lịch)</h3>
                </div>
                <button onClick={() => setIsScheduling(false)} className="p-1 text-slate-400 hover:text-slate-600">
                   <XIcon className="w-5 h-5" />
                </button>
             </header>
             <div className="p-6 space-y-5">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-2">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">待排專案 (Dự án)</div>
                   <div className="text-sm font-black text-slate-800 truncate">{project.name}</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">預計施工日期 (Ngày thi công)</label>
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
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">派遣組別 (Đội thi công)</label>
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
                  {pastedDone ? '已貼上排程 (Đã lên lịch)' : '貼上排程 (Lên lịch)'}
                </button>
             </div>
          </div>
        </div>
      )}

      {isTranslating && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center animate-fade-in">
            <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 animate-scale-in">
                <div className="relative">
                   <LanguagesIcon className="w-12 h-12 text-indigo-600 animate-pulse" />
                   <LoaderIcon className="w-6 h-6 text-indigo-400 animate-spin absolute -top-1 -right-1" />
                </div>
                <div className="text-center">
                  <p className="font-black text-slate-800 text-lg">AI 正在翻譯詳細資訊...</p>
                  <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Translating to Vietnamese</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;