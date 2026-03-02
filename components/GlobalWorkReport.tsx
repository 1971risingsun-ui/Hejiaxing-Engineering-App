import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, User, ProjectType, DailyReport, SitePhoto, ConstructionItem, CompletionReport, SystemRules } from '../types';
import { ClipboardListIcon, BoxIcon, CalendarIcon, XIcon, ChevronRightIcon, PlusIcon, TrashIcon, CheckCircleIcon, SunIcon, CloudIcon, RainIcon, CameraIcon, LoaderIcon, XCircleIcon, FileTextIcon, DownloadIcon } from './Icons';
import { processFile, downloadBlob } from '../utils/fileHelpers';

declare const html2canvas: any;
declare const jspdf: any;

interface GlobalWorkReportProps {
  projects: Project[];
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
  systemRules?: SystemRules;
}

const GlobalWorkReport: React.FC<GlobalWorkReportProps> = ({ projects, currentUser, onUpdateProject, systemRules }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentViewMonth, setCurrentViewMonth] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'));
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [manuallyAddedIds, setManuallyAddedIds] = useState<Record<string, string[]>>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
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
  
  const [newItem, setNewItem] = useState<Partial<ConstructionItem>>({ name: '', quantity: '0', unit: '式', location: '' });

  // Refs for debounce logic
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const projectsRef = useRef(projects);
  const formBufferRef = useRef(formBuffer);

  // Sync refs
  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => { formBufferRef.current = formBuffer; }, [formBuffer]);

  // 優化過濾邏輯：確保手動追加與自動偵測都能正確顯示
  const activeProjects = useMemo(() => {
    const todayAdded = manuallyAddedIds[selectedDate] || [];
    return projects.filter(p => {
        const hasReport = (p.reports || []).some(r => r.date === selectedDate);
        const hasItems = (p.constructionItems || []).some(i => i.date === selectedDate);
        const hasCompletion = (p.completionReports || []).some(r => r.date === selectedDate);
        
        // 只要有數據或是在手動追加清單中就顯示
        return hasReport || hasItems || hasCompletion || todayAdded.includes(p.id);
    });
  }, [projects, selectedDate, manuallyAddedIds]);

  const mainActiveProject = useMemo(() => {
      if (selectedProjectId) {
          const p = activeProjects.find(ap => ap.id === selectedProjectId);
          if (p) return p;
      }
      const constProjects = activeProjects.filter(p => p.type === ProjectType.CONSTRUCTION);
      if (constProjects.length > 0) return constProjects[0];
      const modularProjects = activeProjects.filter(p => p.type === ProjectType.MODULAR_HOUSE);
      return modularProjects.length > 0 ? modularProjects[0] : null;
  }, [activeProjects, selectedProjectId]);

  // 當 mainActiveProject 變更時，更新 selectedProjectId 以保持同步
  useEffect(() => {
      if (mainActiveProject && mainActiveProject.id !== selectedProjectId) {
          setSelectedProjectId(mainActiveProject.id);
      }
  }, [mainActiveProject]);

  useEffect(() => {
    // 切換專案或日期時，清除未完成的儲存排程，避免資料錯置
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
    }

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
    projects.forEach(p => {
        (p.reports || []).forEach(r => dates.add(r.date));
        (p.constructionItems || []).forEach(i => dates.add(i.date));
    });
    return dates;
  }, [projects]);

  const saveToProject = (targetProjectId: string, updates: Partial<typeof formBuffer>) => {
    // 使用 Ref 獲取最新數據
    const currentProjects = projectsRef.current;
    const currentForm = formBufferRef.current;
    
    // 從最新的 projects 列表中找到目標專案
    const project = currentProjects.find(p => p.id === targetProjectId);
    if (!project) return;

    const newData = { ...currentForm, ...updates };
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

  const handleAddItem = () => {
    if (!mainActiveProject || !newItem.name) return;
    const project = projectsRef.current.find(p => p.id === mainActiveProject.id);
    if (!project) return;

    const item: ConstructionItem = {
        id: crypto.randomUUID(),
        date: selectedDate,
        name: newItem.name!,
        quantity: String(newItem.quantity || '0'),
        unit: newItem.unit || '式',
        location: newItem.location || '',
        worker: formBuffer.worker,
        assistant: formBuffer.assistant,
    };

    onUpdateProject({
        ...project,
        constructionItems: [...(project.constructionItems || []), item]
    });
    setNewItem({ name: '', quantity: '0', unit: '式', location: '' });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!mainActiveProject) return;
    const project = projectsRef.current.find(p => p.id === mainActiveProject.id);
    if (!project) return;

    onUpdateProject({
        ...project,
        constructionItems: (project.constructionItems || []).filter(i => i.id !== itemId)
    });
  };

  const handleFieldChange = (field: keyof typeof formBuffer, value: any) => {
    setFormBuffer(prev => ({ ...prev, [field]: value }));
    
    if (!mainActiveProject) return;
    const targetProjectId = mainActiveProject.id;

    // 對於文字輸入欄位使用 debounce
    if (field === 'worker' || field === 'content' || field === 'assistant') {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            // 確保儲存時專案 ID 仍一致，或者是針對特定 ID 儲存
            // 這裡我們直接傳遞 targetProjectId 給 saveToProject
            saveToProject(targetProjectId, { [field]: value });
        }, 800);
    } else {
        // 其他欄位即時儲存
        saveToProject(targetProjectId, { [field]: value });
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

  // 修改後的全域 PDF 匯出：確保每個案件之間強制換頁
  const handleExportGlobalPDF = async () => {
    if (activeProjects.length === 0) return alert("當日無活躍案件可供匯出");
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') return alert("必要元件尚未載入");
    
    setIsGeneratingPDF(true);

    // 準備匯出的 JSON 數據物件 (內嵌於 Metadata)
    const exportData: any = {
        date: selectedDate,
        exportedAt: new Date().toISOString(),
        projects: activeProjects.map(p => ({
            id: p.id,
            name: p.name,
            dailyReport: (p.reports || []).find(r => r.date === selectedDate),
            constructionItems: (p.constructionItems || []).filter(i => i.date === selectedDate),
            completionReport: (p.completionReports || []).find(r => r.date === selectedDate)
        }))
    };

    // 初始化 jsPDF
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // 設定 PDF 元數據，內嵌 JSON
    pdf.setProperties({
        title: `合家興工作彙整_${selectedDate}`,
        subject: JSON.stringify(exportData),
        author: currentUser.name,
        keywords: 'DailyWorkReport, MultiProject, JSON_Embedded',
        creator: '合家興 AI 管理系統'
    });

    // 逐案渲染並加入 PDF
    for (let i = 0; i < activeProjects.length; i++) {
        const p = activeProjects[i];
        
        // 除第一案外，其餘案件開始前先新增一頁
        if (i > 0) pdf.addPage();

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.style.width = '850px';
        container.style.backgroundColor = '#ffffff';
        document.body.appendChild(container);

        const report = (p.reports || []).find(r => r.date === selectedDate);
        const items = (p.constructionItems || []).filter(i => i.date === selectedDate);
        const completion = (p.completionReports || []).find(r => r.date === selectedDate);

        let html = `<div style="font-family: 'Microsoft JhengHei', sans-serif; padding: 40px; color: #333; background: white;">`;
        
        // 只有在第一頁顯示總彙整標題
        if (i === 0) {
            html += `
                <h1 style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; font-size: 26px; font-weight: bold;">
                  合家興實業 - 當日工作回報綜合彙整
                </h1>
                <div style="margin: 20px 0; font-size: 16px; display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                  <span>彙整日期：<strong>${selectedDate}</strong></span>
                  <span>案件數量：<strong>${activeProjects.length} 筆</strong></span>
                </div>
            `;
        }

        html += `
          <div style="margin-top: 10px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="background: #1e293b; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="margin: 0; font-size: 18px;">[${p.type.toUpperCase()}] ${p.name}</h2>
            </div>
            <div style="padding: 20px;">
              <div style="margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 10px; border-radius: 8px;">
                <div><span style="font-weight: bold; color: #64748b; font-size: 12px;">負責人員：</span><br/><span style="font-size: 14px;">師傅: ${report?.worker || items[0]?.worker || '未指定'} / 助手: ${report?.assistant || items[0]?.assistant || '無'}</span></div>
                <div><span style="font-weight: bold; color: #64748b; font-size: 12px;">當日天氣：</span><br/><span style="font-size: 14px;">${report?.weather === 'sunny' ? '☀️ 晴天' : report?.weather === 'cloudy' ? '☁️ 陰天' : '🌧️ 雨天'}</span></div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; border-left: 4px solid #3b82f6; padding-left: 10px; color: #1e40af;">施工日誌與備註</div>
                <div style="background: #fafafa; padding: 12px; border-radius: 6px; font-size: 13px; white-space: pre-wrap; border: 1px solid #f1f5f9;">${report?.content || '今日無文字回報'}</div>
              </div>

              ${items.length > 0 ? `
                <div style="margin-bottom: 20px;">
                   <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; border-left: 4px solid #10b981; padding-left: 10px; color: #065f46;">施工報告清單</div>
                   <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                      <thead>
                        <tr style="background-color: #f1f5f9;">
                          <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">施工項目</th>
                          <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; width: 60px;">數量</th>
                          <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; width: 60px;">單位</th>
                          <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">施作位置/動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${items.map(i => `
                          <tr>
                            <td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: bold;">${i.name}</td>
                            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${i.quantity}</td>
                            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${i.unit}</td>
                            <td style="border: 1px solid #e2e8f0; padding: 8px;">${i.location || '-'}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                   </table>
                </div>
              ` : ''}

              ${completion ? `
                 <div style="margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                   <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; border-left: 4px solid #f59e0b; padding-left: 10px; color: #92400e;">完工報告確認</div>
                   <div style="font-size: 13px; color: #475569;">已於今日提交正式完工報告 (包含 ${completion.items?.length || 0} 個查驗項)。</div>
                 </div>
              ` : ''}

              ${report?.photos?.length ? `
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 20px;">
                  ${report.photos.slice(0, 9).map(pid => {
                    const photo = p.photos.find(img => img.id === pid);
                    return photo ? `<div style="aspect-ratio: 1; overflow: hidden; border: 1px solid #eee; border-radius: 4px;"><img src="${photo.url}" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : '';
                  }).join('')}
                </div>
                ${report.photos.length > 9 ? `<div style="text-align: right; font-size: 10px; color: #94a3b8; margin-top: 5px;">* 僅顯示前 9 張照片</div>` : ''}
              ` : ''}
            </div>
          </div>
        </div>`;

        container.innerHTML = html;
        // 等待樣式與圖片渲染
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            const canvas = await html2canvas(container, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            // 將畫布加入當前頁面
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            // 如果該案件內容本身超過一頁 A4，則繼續在該案下進行內部分頁
            while (heightLeft > 0) {
              position = heightLeft - imgHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
              heightLeft -= pdfHeight;
            }
        } catch (err) {
            console.error(`渲染案件 ${p.name} 失敗:`, err);
        } finally {
            document.body.removeChild(container);
        }
    }

    // 全部案場處理完畢，下載檔案
    const pdfBlob = pdf.output('blob');
    const fileName = `${selectedDate}_${currentUser.name}_合家興工作彙整.pdf`;

    if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: fileName,
                    text: `合家興工作回報綜合彙整 - ${selectedDate}`
                });
            } catch (shareError) {
                if ((shareError as Error).name !== 'AbortError') {
                    downloadBlob(pdfBlob, fileName);
                }
            }
        } else {
            downloadBlob(pdfBlob, fileName);
        }
    } else {
        downloadBlob(pdfBlob, fileName);
    }
    setIsGeneratingPDF(false);
  };

  const renderActiveList = (type: ProjectType) => {
      const items = activeProjects.filter(p => p.type === type);
      const label = type === ProjectType.CONSTRUCTION 
          ? '圍籬案件' 
          : type === ProjectType.MODULAR_HOUSE 
              ? '組合屋案件' 
              : '維修案件';
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
                          <div 
                            key={p.id} 
                            onClick={() => setSelectedProjectId(p.id)}
                            className={`border rounded-xl p-3 flex items-center justify-between shadow-sm group cursor-pointer transition-all ${selectedProjectId === p.id ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-100 hover:border-blue-300'}`}
                          >
                              <span className={`font-bold text-sm ${selectedProjectId === p.id ? 'text-blue-700' : 'text-slate-800'}`}>{p.name}</span>
                              <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
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
                        e.target.value = ""; // 重置選單
                    }}
                    value=""
                    className={`w-full text-xs font-bold py-2.5 px-4 bg-white border border-dashed rounded-xl shadow-sm cursor-pointer outline-none transition-all ${type === ProjectType.CONSTRUCTION ? 'border-blue-200 text-blue-600 hover:bg-blue-50' : type === ProjectType.MODULAR_HOUSE ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-orange-200 text-orange-600 hover:bg-orange-50'}`}
                  >
                      <option value="">+ 追加{label.substring(0,3)}案件 (依客戶名稱搜尋)</option>
                      {projects
                        .filter(p => p.type === type && !activeProjects.some(ap => ap.id === p.id))
                        .sort((a,b) => a.name.localeCompare(b.name, 'zh-Hant'))
                        .map(p => (
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
            
            {/* 匯出 PDF 按鈕 */}
            <button 
                onClick={handleExportGlobalPDF} 
                disabled={isGeneratingPDF}
                className="bg-white border border-slate-200 w-11 h-11 rounded-xl text-indigo-600 flex items-center justify-center shadow-sm active:scale-95 flex-shrink-0 disabled:opacity-50 transition-all hover:bg-indigo-50"
                title="匯出當日案件綜合 PDF (含 JSON 內嵌)"
            >
                {isGeneratingPDF ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <FileTextIcon className="w-5 h-5" />}
            </button>
            
            <button onClick={() => setShowCalendar(true)} className="bg-white border border-slate-200 w-11 h-11 rounded-xl text-blue-600 flex items-center justify-center shadow-sm active:scale-95 flex-shrink-0 hover:bg-blue-50"><CalendarIcon className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderActiveList(ProjectType.CONSTRUCTION)}
          {renderActiveList(ProjectType.MODULAR_HOUSE)}
          {renderActiveList(ProjectType.MAINTENANCE)}
      </div>

      <div className="bg-white border border-blue-200 rounded-2xl shadow-lg overflow-hidden mt-10">
          <div className={`px-6 py-4 flex items-center justify-between ${mainActiveProject ? 'bg-blue-600' : 'bg-slate-700'}`}>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">今日施作詳情 (連動編輯)</h3>
              {mainActiveProject && (
                  <div className="text-right">
                    <span className="text-[10px] text-blue-100 font-bold uppercase block">
                        {mainActiveProject.type === ProjectType.MODULAR_HOUSE ? '組合屋' : '圍籬'}
                    </span>
                    <span className="text-white font-bold text-sm truncate max-w-[150px]">{mainActiveProject.name}</span>
                  </div>
              )}
          </div>

          <div className="p-6 space-y-8">
            {!mainActiveProject ? (
                <div className="py-12 text-center text-slate-400">
                    <BoxIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold">請先點選或追加一個圍籬或組合屋案件以啟用詳細編輯</p>
                </div>
            ) : (
                <>
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
                                <button onClick={handleAddAssistant} className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center transition-transform active:scale-90"><PlusIcon className="w-6 h-6" /></button>
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
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">施工項目 (Hạng mục thi công)</label>
                        <div className="space-y-2 mb-4">
                            {(mainActiveProject.constructionItems || []).filter(i => i.date === selectedDate).map(item => (
                                <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="flex-1 font-bold text-sm text-slate-700">{item.name}</span>
                                    <span className="w-16 text-center text-sm bg-white px-2 py-1 rounded border border-slate-200">{item.quantity}</span>
                                    <span className="w-12 text-center text-sm text-slate-500">{item.unit}</span>
                                    <span className="w-24 text-sm text-slate-500 truncate">{item.location}</span>
                                    <button onClick={() => handleDeleteItem(item.id)} className="text-slate-400 hover:text-red-500 p-1"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                            <input 
                                type="text" 
                                placeholder="項目名稱" 
                                value={newItem.name} 
                                onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                            />
                            <input 
                                type="number" 
                                placeholder="數量" 
                                value={newItem.quantity || ''} 
                                onChange={e => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                                className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                            />
                            <input 
                                type="text" 
                                placeholder="單位" 
                                value={newItem.unit} 
                                onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                                className="w-16 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                            />
                            <button onClick={handleAddItem} disabled={!newItem.name} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                <PlusIcon className="w-5 h-5" />
                            </button>
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
                </>
            )}
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
                            <button onClick={() => setCurrentViewMonth(new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() - 1, 1))} className="p-2.5 bg-slate-100 rounded-xl"><ChevronRightIcon className="w-4 h-4 rotate-180" /></button>
                            <button onClick={() => setCurrentViewMonth(new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() + 1, 1))} className="p-2.5 bg-slate-100 rounded-xl"><ChevronRightIcon className="w-4 h-4" /></button>
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