import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, User, ProjectType, DailyReport, SitePhoto } from '../types';
import { ClipboardListIcon, BoxIcon, CalendarIcon, XIcon, ChevronRightIcon, PlusIcon, TrashIcon, CheckCircleIcon, SunIcon, CloudIcon, RainIcon, CameraIcon, LoaderIcon, XCircleIcon } from './Icons';
import { processFile } from '../utils/fileHelpers';

interface GlobalWorkReportProps {
  projects: Project[];
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
}

const GlobalWorkReport: React.FC<GlobalWorkReportProps> = ({ projects, currentUser, onUpdateProject }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentViewMonth, setCurrentViewMonth] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'));

  const [manuallyAddedIds, setManuallyAddedIds] = useState<Record<string, string[]>>({});
  
  const [formBuffer, setFormBuffer] = useState<{
    worker: string;
    assistant: string;
    weather: 'sunny' | 'cloudy' | 'rainy';
    content: string;
    photos: SitePhoto[];
  }>({
    worker: '',
    assistant: '',
    weather: 'sunny',
    content: '',
    photos: []
  });

  const [pendingAssistantName, setPendingAssistantName] = useState('');
  const [isHalfDayChecked, setIsHalfDayChecked] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const activeProjects = useMemo(() => {
    const todayAdded = manuallyAddedIds[selectedDate] || [];
    return projects.filter(p => {
        if (p.type === ProjectType.CONSTRUCTION || p.type === ProjectType.MODULAR_HOUSE) {
            const hasReport = (p.reports || []).some(r => r.date === selectedDate);
            const hasItems = (p.constructionItems || []).some(i => i.date === selectedDate);
            return hasReport || hasItems || todayAdded.includes(p.id);
        }
        return todayAdded.includes(p.id);
    });
  }, [projects, selectedDate, manuallyAddedIds]);

  const mainActiveProject = useMemo(() => {
      const constProjects = activeProjects.filter(p => p.type === ProjectType.CONSTRUCTION);
      if (constProjects.length > 0) return constProjects[0];
      const modularProjects = activeProjects.filter(p => p.type === ProjectType.MODULAR_HOUSE);
      return modularProjects.length > 0 ? modularProjects[0] : null;
  }, [activeProjects]);

  useEffect(() => {
    if (mainActiveProject) {
        const report = (mainActiveProject.reports || []).find(r => r.date === selectedDate);
        const item = (mainActiveProject.constructionItems || []).find(i => i.date === selectedDate);
        
        setFormBuffer({
            worker: report?.worker !== undefined ? report.worker : (item?.worker || ''),
            assistant: report?.assistant !== undefined ? report.assistant : (item?.assistant || ''),
            weather: report?.weather || 'sunny',
            content: (report?.content || '').replace(/^\[已完成\]\s*/, '').replace(/^\[未完成\]\s*/, ''),
            photos: (report?.photos || []).map(id => mainActiveProject.photos.find(p => p.id === id)).filter((p): p is SitePhoto => !!p)
        });
    } else {
        setFormBuffer({ worker: '', assistant: '', weather: 'sunny', content: '', photos: [] });
    }
  }, [selectedDate, mainActiveProject?.id]);

  const recordedDates = useMemo(() => {
    const dates = new Set<string>();
    projects.filter(p => p.type === ProjectType.CONSTRUCTION || p.type === ProjectType.MODULAR_HOUSE).forEach(p => {
        (p.reports || []).forEach(r => dates.add(r.date));
        (p.constructionItems || []).forEach(i => dates.add(i.date));
    });
    return dates;
  }, [projects]);

  const saveToProject = (project: Project, updates: Partial<typeof formBuffer>) => {
    const newData = { ...formBuffer, ...updates };
    const existingReport = (project.reports || []).find(r => r.date === selectedDate);
    
    const report = (project.reports || []).find(r => r.date === selectedDate);
    const prefix = report?.content?.startsWith('[已完成]') ? '[已完成] ' : '[未完成] ';

    const updatedReport: DailyReport = {
        id: existingReport?.id || crypto.randomUUID(),
        date: selectedDate,
        weather: newData.weather,
        content: prefix + newData.content,
        reporter: currentUser.name,
        timestamp: Date.now(),
        photos: newData.photos.map(p => p.id),
        worker: newData.worker,
        assistant: newData.assistant
    };

    const otherReports = (project.reports || []).filter(r => r.date !== selectedDate);
    const existingPhotoIds = new Set(project.photos.map(p => p.id));
    const newPhotos = newData.photos.filter(p => !existingPhotoIds.has(p.id));
    
    onUpdateProject({ 
        ...project, 
        reports: [...otherReports, updatedReport],
        photos: [...project.photos, ...newPhotos]
    });
  };

  const handleFieldChange = (field: keyof typeof formBuffer, value: any) => {
    setFormBuffer(prev => ({ ...prev, [field]: value }));
    if (mainActiveProject) {
        saveToProject(mainActiveProject, { [field]: value });
    }
  };

  const handleAddAssistant = () => {
    if (!pendingAssistantName.trim()) return;
    const finalName = isHalfDayChecked ? `${pendingAssistantName.trim()} (半天)` : pendingAssistantName.trim();
    const currentList = formBuffer.assistant.split(',').map(s => s.trim()).filter(s => !!s);
    if (currentList.includes(finalName)) return;

    const newList = [...currentList, finalName].join(', ');
    handleFieldChange('assistant', newList);
    setPendingAssistantName('');
    setIsHalfDayChecked(false);
  };

  const removeAssistant = (name: string) => {
    const newList = formBuffer.assistant.split(',').map(s => s.trim()).filter(s => !!s && s !== name).join(', ');
    handleFieldChange('assistant', newList);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessingPhotos(true);
      const files = Array.from(e.target.files) as File[];
      const newPhotos: SitePhoto[] = [];
      for (const file of files) {
          try {
              const dataUrl = await processFile(file);
              newPhotos.push({ id: crypto.randomUUID(), url: dataUrl, timestamp: Date.now(), description: `工作回報 - ${selectedDate}` });
          } catch (err) { alert("照片處理失敗"); }
      }
      handleFieldChange('photos', [...formBuffer.photos, ...newPhotos]);
      setIsProcessingPhotos(false);
    }
  };

  const renderActiveList = (type: ProjectType) => {
      const items = activeProjects.filter(p => p.type === type);
      const label = type === ProjectType.CONSTRUCTION 
          ? '圍籬案件 (Fence)' 
          : type === ProjectType.MODULAR_HOUSE 
              ? '組合屋案件 (Modular)' 
              : '維修案件 (Maintenance)';
      const colorClass = type === ProjectType.CONSTRUCTION 
          ? 'bg-blue-600' 
          : type === ProjectType.MODULAR_HOUSE 
              ? 'bg-emerald-600' 
              : 'bg-orange-500';

      return (
          <section className="mb-6">
              <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="text-slate-800 font-bold text-lg flex items-center gap-2">
                    <div className={`w-1.5 h-6 ${colorClass} rounded-full`}></div>{label}
                  </h2>
                  <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-full">{items.length} 筆</span>
              </div>
              <div className="space-y-2">
                  {items.map(p => {
                      const report = (p.reports || []).find(r => r.date === selectedDate);
                      return (
                          <div key={p.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm group">
                              <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                              <div className="flex items-center gap-3">
                                  <select 
                                    value={report?.content?.startsWith('[已完成]') ? '已完成' : '未完成'}
                                    onChange={(e) => {
                                        const status = e.target.value;
                                        const cleanContent = (report?.content || '').replace(/^\[已完成\]\s*/, '').replace(/^\[未完成\]\s*/, '');
                                        const otherReports = (p.reports || []).filter(r => r.date !== selectedDate);
                                        const updatedReport: DailyReport = {
                                            id: report?.id || crypto.randomUUID(),
                                            date: selectedDate,
                                            weather: report?.weather || 'sunny',
                                            content: `[${status}] ${cleanContent}`,
                                            reporter: currentUser.name,
                                            timestamp: Date.now(),
                                            photos: report?.photos || []
                                        };
                                        onUpdateProject({ ...p, reports: [...otherReports, updatedReport] });
                                    }}
                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border-none shadow-sm ${report?.content?.startsWith('[已完成]') ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                                  >
                                      <option value="未完成">未完成</option>
                                      <option value="已完成">已完成</option>
                                  </select>
                                  <button onClick={() => {
                                      if(confirm("確定移除今日回報清單？")) {
                                          setManuallyAddedIds(prev => ({ ...prev, [selectedDate]: (prev[selectedDate] || []).filter(id => id !== p.id) }));
                                      }
                                  }} className="text-slate-200 hover:text-red-500 p-1"><TrashIcon className="w-4 h-4" /></button>
                              </div>
                          </div>
                      );
                  })}
              </div>
              <div className="mt-4">
                  <select 
                    onChange={(e) => {
                        const pid = e.target.value;
                        if(!pid) return;
                        setManuallyAddedIds(prev => ({ ...prev, [selectedDate]: [...(prev[selectedDate] || []), pid] }));
                    }}
                    value=""
                    className={`w-full text-xs font-bold py-2.5 px-4 bg-white border border-dashed rounded-xl shadow-sm cursor-pointer outline-none transition-all ${type === ProjectType.CONSTRUCTION ? 'border-blue-200 text-blue-600' : type === ProjectType.MODULAR_HOUSE ? 'border-emerald-200 text-emerald-600' : 'border-orange-200 text-orange-600'}`}
                  >
                      <option value="">+ 追加{label.split(' ')[0]}案件 (不限狀態)</option>
                      {projects.filter(p => p.type === type && !activeProjects.some(ap => ap.id === p.id)).map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                      ))}
                  </select>
              </div>
          </section>
      );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 pb-24 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-xl"><ClipboardListIcon className="w-6 h-6 text-blue-600" /></div>
            <div>
                <h1 className="text-xl font-bold text-slate-800 leading-none mb-1">工作回報</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Daily Report</p>
            </div>
        </div>
        <div className="flex flex-1 md:max-w-md items-center gap-3">
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-blue-700 outline-none" />
            </div>
            <button onClick={() => setShowCalendar(true)} className="bg-white border border-slate-200 w-11 h-11 rounded-xl text-blue-600 flex items-center justify-center shadow-sm active:scale-95 flex-shrink-0"><CalendarIcon className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderActiveList(ProjectType.CONSTRUCTION)}
          {renderActiveList(ProjectType.MODULAR_HOUSE)}
          {renderActiveList(ProjectType.MAINTENANCE)}
      </div>

      <div className="bg-white border border-blue-200 rounded-2xl shadow-lg overflow-hidden mt-10">
          <div className={`px-6 py-4 flex items-center justify-between ${mainActiveProject ? 'bg-blue-600' : 'bg-slate-700'}`}>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">今日施作詳情 (常駐顯示)</h3>
              {mainActiveProject && (
                  <div className="text-right">
                    <span className="text-[10px] text-blue-100 font-bold uppercase block">
                        {mainActiveProject.type === ProjectType.MODULAR_HOUSE ? '連動組合屋' : '連動圍籬'}
                    </span>
                    <span className="text-white font-bold text-sm truncate max-w-[150px]">{mainActiveProject.name}</span>
                  </div>
              )}
          </div>

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">師傅 (Thợ chính)</label>
                    <input 
                      type="text" 
                      list="employee-nicknames-list"
                      value={formBuffer.worker} 
                      onChange={(e) => handleFieldChange('worker', e.target.value)} 
                      placeholder="輸入姓名" 
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">助手清單 (Phụ việc)</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {formBuffer.assistant.split(',').map(s => s.trim()).filter(s => !!s).map(name => (
                            <span key={name} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-100">
                                {name}<button onClick={() => removeAssistant(name)}><XCircleIcon className="w-3.5 h-3.5" /></button>
                            </span>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          list="employee-nicknames-list"
                          value={pendingAssistantName} 
                          onChange={(e) => setPendingAssistantName(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleAddAssistant()} 
                          placeholder="輸入姓名" 
                          className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none" 
                        />
                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-3 rounded-xl border border-slate-200">
                            <input type="checkbox" id="half-day-global-fixed" checked={isHalfDayChecked} onChange={(e) => setIsHalfDayChecked(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                            <label htmlFor="half-day-global-fixed" className="text-xs font-bold text-slate-600 cursor-pointer whitespace-nowrap">半天</label>
                        </div>
                        <button onClick={handleAddAssistant} className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center"><PlusIcon className="w-6 h-6" /></button>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">當日天氣</label>
                        <div className="flex gap-2">
                            {['sunny', 'cloudy', 'rainy'].map((w) => (
                                <button key={w} onClick={() => handleFieldChange('weather', w)} className={`flex-1 py-3 rounded-xl border flex justify-center transition-all ${formBuffer.weather === w ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                                    {w === 'sunny' && <SunIcon className="w-6 h-6" />}{w === 'cloudy' && <CloudIcon className="w-6 h-6" />}{w === 'rainy' && <RainIcon className="w-6 h-6" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">施工備註 (Ghi chú)</label>
                        <textarea value={formBuffer.content} onChange={(e) => handleFieldChange('content', e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm h-24 resize-none outline-none shadow-inner" placeholder="輸入今日重點..." />
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">現場照片 (不裁切顯示)</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3">
                    <button onClick={() => photoInputRef.current?.click()} disabled={isProcessingPhotos} className="aspect-square border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center transition-all group hover:bg-blue-50">
                        {isProcessingPhotos ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <CameraIcon className="w-8 h-8 group-active:scale-90" />}
                    </button>
                    <input type="file" multiple accept="image/*" ref={photoInputRef} className="hidden" onChange={handlePhotoUpload} />
                    {formBuffer.photos.map(ph => (
                        <div key={ph.id} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 group shadow-sm bg-slate-50 flex items-center justify-center">
                            <img src={ph.url} className="max-w-full max-h-full object-contain" alt="site" />
                            <button onClick={() => handleFieldChange('photos', formBuffer.photos.filter(p => p.id !== ph.id))} className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><XIcon className="w-3.5 h-3.5" /></button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
      </div>

      {showCalendar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-blue-600" /><h3 className="font-bold text-slate-800 text-sm">紀錄月曆</h3></div>
                    <button onClick={() => setShowCalendar(false)} className="text-slate-400 p-1.5 bg-white rounded-full shadow-sm"><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-5">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h4 className="font-bold text-xl text-slate-800">{currentViewMonth.getFullYear()}年 {currentViewMonth.getMonth() + 1}月</h4>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentViewMonth(new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() - 1, 1))} className="p-2.5 bg-slate-100 rounded-xl"><ChevronRightIcon className="w-5 h-5 rotate-180" /></button>
                            <button onClick={() => setCurrentViewMonth(new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() + 1, 1))} className="p-2.5 bg-slate-100 rounded-xl"><ChevronRightIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({ length: new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                            const d = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth(), i + 1);
                            const ds = d.toLocaleDateString('sv-SE');
                            return (
                                <button key={ds} onClick={() => { setSelectedDate(ds); setShowCalendar(false); }} className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${ds === selectedDate ? 'bg-blue-600 text-white shadow-xl scale-110 z-10 font-bold' : 'hover:bg-slate-50 text-slate-700 border border-slate-100'}`}>
                                    <span className="text-sm">{i + 1}</span>
                                    {recordedDates.has(ds) && <div className={`w-1.5 h-1.5 rounded-full mt-1 ${ds === selectedDate ? 'bg-white' : 'bg-green-500'}`} />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default GlobalWorkReport;