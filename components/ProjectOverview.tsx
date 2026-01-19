import React, { useState, useEffect } from 'react';
import { Project, Milestone, User, UserRole } from '../types';
import { UserIcon, PhoneIcon, PaperclipIcon, DownloadIcon, FileTextIcon, PlusIcon, CheckCircleIcon, TrashIcon, XIcon, CalendarIcon } from './Icons';

interface ProjectOverviewProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ project, currentUser, onUpdateProject }) => {
  const [newMilestone, setNewMilestone] = useState({ title: '', date: '', notes: '' });
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [localRemarks, setLocalRemarks] = useState(project.remarks || '');
  
  // 當父組件傳入的備註改變時（例如翻譯完成後），同步更新內部 state
  useEffect(() => {
    setLocalRemarks(project.remarks || '');
  }, [project.remarks]);

  const canEdit = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  const toggleMilestone = (id: string) => {
    const updatedMilestones = (project.milestones || []).map(m => 
      m.id === id ? { ...m, completed: !m.completed } : m
    );
    updateProjectProgress(updatedMilestones);
  };

  const deleteMilestone = (id: string) => {
    if (!confirm('確定要刪除此工期節點嗎？')) return;
    const updatedMilestones = (project.milestones || []).filter(m => m.id !== id);
    updateProjectProgress(updatedMilestones);
  };

  const handleAddMilestone = () => {
    if (!newMilestone.title || !newMilestone.date) return;
    const milestone: Milestone = {
      id: crypto.randomUUID(),
      title: newMilestone.title,
      date: newMilestone.date,
      notes: newMilestone.notes,
      completed: false
    };
    const updatedMilestones = [...(project.milestones || []), milestone].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    updateProjectProgress(updatedMilestones);
    setNewMilestone({ title: '', date: '', notes: '' });
    setIsAddingMilestone(false);
  };

  const updateProjectProgress = (milestones: Milestone[]) => {
    const completed = milestones.filter(m => m.completed).length;
    const progress = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;
    onUpdateProject({ ...project, milestones, progress });
  };

  const handleDeleteAttachment = (id: string) => {
    if (!confirm('確定要刪除此附件嗎？')) return;
    const updatedAttachments = (project.attachments || []).filter(a => a.id !== id);
    onUpdateProject({ ...project, attachments: updatedAttachments });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  };

  return (
    <div className="space-y-6">
      {/* 專案資訊 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">客戶資訊</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="text-xs text-slate-400 block mb-1 uppercase font-bold">客戶 (專案名稱)</label>
                 <div className="font-bold text-slate-800 text-lg">{project.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs text-slate-400 block mb-1 uppercase font-bold">聯絡人</label>
                   <div className="font-medium text-slate-700 flex items-center gap-2">
                     <UserIcon className="w-3.5 h-3.5 text-slate-300" />
                     {project.clientContact || '-'}
                   </div>
                </div>
                <div>
                   <label className="text-xs text-slate-400 block mb-1 uppercase font-bold">電話</label>
                   <div className="font-medium text-slate-700 flex items-center gap-2">
                     <PhoneIcon className="w-3.5 h-3.5 text-slate-300" />
                     {project.clientPhone || '-'}
                   </div>
                </div>
              </div>
           </div>
      </div>

      {/* 工程概要 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-3 text-slate-800">工程概要 (Chi tiết công trình)</h3>
          <p className="text-slate-600 leading-relaxed text-sm mb-6 whitespace-pre-wrap">{project.description}</p>
          
          {project.attachments && project.attachments.length > 0 && (
             <div className="pt-4 border-t border-slate-100">
               <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <PaperclipIcon className="w-4 h-4" /> 圖面與附件 (Excel 自動匯入)
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {project.attachments.map(att => {
                     const isImage = att.type.startsWith('image/');
                     return (
                        <div key={att.id} className="flex flex-col bg-slate-50 rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                           {isImage ? (
                             <div 
                                className="h-48 bg-slate-200 cursor-zoom-in overflow-hidden relative flex items-center justify-center"
                                onClick={() => setViewingPhoto(att.url)}
                             >
                                <img src={att.url} alt={att.name} className="max-w-full max-h-full object-contain transition-transform duration-300" />
                             </div>
                           ) : (
                             <div className="h-48 bg-slate-100 flex items-center justify-center text-slate-300">
                                <FileTextIcon className="w-12 h-12" />
                             </div>
                           )}
                           <div className="p-3 flex items-center justify-between bg-white border-t border-slate-100">
                              <div className="flex-1 min-w-0 mr-2">
                                 <div className="text-xs font-bold text-slate-700 truncate">{att.name}</div>
                                 <div className="text-[10px] text-slate-400">{(att.size / 1024).toFixed(1)} KB</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <a href={att.url} download={att.name} className="text-slate-400 hover:text-blue-600 p-1.5" onClick={(e) => e.stopPropagation()}>
                                   <DownloadIcon className="w-4 h-4" />
                                </a>
                                {canEdit && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }} 
                                    className="text-slate-400 hover:text-red-500 p-1.5"
                                    title="刪除附件"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
             </div>
          )}
      </div>

      {/* 工期里程碑 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">工期里程碑 (Milestones)</h3>
            {!isAddingMilestone && canEdit && (
                <button 
                  onClick={() => setIsAddingMilestone(true)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                    <PlusIcon className="w-4 h-4" /> 新增節點
                </button>
            )}
          </div>

          {isAddingMilestone && (
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-blue-100 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">節點名稱</label>
                  <input 
                    type="text" 
                    placeholder="例如：基礎開挖、結構完成" 
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newMilestone.title}
                    onChange={e => setNewMilestone({...newMilestone, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">預計完成日期</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newMilestone.date}
                    onChange={e => setNewMilestone({...newMilestone, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setIsAddingMilestone(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800">取消</button>
                <button onClick={handleAddMilestone} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-all">建立節點</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {project.milestones && project.milestones.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 py-2">
                {project.milestones.map((m) => (
                  <div key={m.id} className="relative">
                    <div className={`absolute -left-[27px] top-0 w-3 h-3 rounded-full border-2 bg-white transition-colors duration-300 ${m.completed ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}></div>
                    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 rounded-xl border transition-all ${m.completed ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100'}`}>
                      <div>
                        <div className={`text-sm font-bold ${m.completed ? 'text-blue-900' : 'text-slate-800'}`}>{m.title}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <CalendarIcon className="w-3 h-3" />
                          {formatDate(m.date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleMilestone(m.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${m.completed ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
                        >
                          {m.completed ? <CheckCircleIcon className="w-3.5 h-3.5" /> : null}
                          {m.completed ? '已完成' : '標記完成'}
                        </button>
                        {canEdit && (
                          <button onClick={() => deleteMilestone(m.id)} className="text-slate-300 hover:text-red-500 p-1">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">尚未規劃任何工期節點</p>
                {canEdit && <button onClick={() => setIsAddingMilestone(true)} className="mt-2 text-blue-600 font-bold text-xs hover:underline">點擊新增首個里程碑</button>}
              </div>
            )}
          </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 mb-4">備註資訊 (Ghi chú)</h3>
          <textarea 
              value={localRemarks}
              onChange={(e) => setLocalRemarks(e.target.value)}
              onBlur={() => onUpdateProject({ ...project, remarks: localRemarks })}
              placeholder="點擊輸入額外備註..."
              className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 focus:bg-white outline-none transition-all resize-none shadow-inner leading-relaxed"
          ></textarea>
      </div>

      {viewingPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
           <img src={viewingPhoto} alt="Original" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
           <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2"><XIcon className="w-8 h-8" /></button>
        </div>
      )}
    </div>
  );
};

export default ProjectOverview;