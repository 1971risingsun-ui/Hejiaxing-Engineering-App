import React, { useState, useRef } from 'react';
import { Project, DailyReport, SitePhoto, User, UserRole } from '../types';
import { DownloadIcon, PlusIcon, FileTextIcon, SunIcon, CloudIcon, RainIcon, CameraIcon, XIcon, EditIcon, LoaderIcon } from './Icons';
import { processFile, downloadBlob } from '../utils/fileHelpers';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

interface ProjectReportsProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
}

const ProjectReports: React.FC<ProjectReportsProps> = ({ project, currentUser, onUpdateProject }) => {
  const [isAddingReport, setIsAddingReport] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [newReport, setNewReport] = useState({
    date: new Date().toISOString().split('T')[0],
    weather: 'sunny' as 'sunny' | 'cloudy' | 'rainy',
    content: ''
  });
  const [tempReportPhotos, setTempReportPhotos] = useState<SitePhoto[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const reportPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const canEdit = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ENGINEERING || currentUser.role === UserRole.WORKER;

  const handleReportPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessingPhotos(true);
      // Explicitly cast to File[] to avoid TS unknown type inference issues
      const files = Array.from(e.target.files) as File[];
      const newPhotos: SitePhoto[] = [];

      for (const file of files) {
          try {
              const dataUrl = await processFile(file);
              newPhotos.push({
                id: crypto.randomUUID(),
                url: dataUrl,
                timestamp: Date.now(),
                description: `日誌附件 - ${new Date().toLocaleDateString()}`
              });
          } catch (error) {
              console.error("Failed to process photo", error);
              alert("照片處理失敗");
          }
      }
      
      setTempReportPhotos(prev => [...prev, ...newPhotos]);
      setIsProcessingPhotos(false);
      e.target.value = '';
    }
  };

  const removeTempPhoto = (id: string) => {
    setTempReportPhotos(prev => prev.filter(p => p.id !== id));
  };

  const resetReportForm = () => {
    setNewReport({
      date: new Date().toISOString().split('T')[0],
      weather: 'sunny',
      content: ''
    });
    setTempReportPhotos([]);
    setEditingReportId(null);
    setIsAddingReport(false);
  };

  const handleEditReport = (report: DailyReport) => {
    setNewReport({
      date: report.date,
      weather: report.weather as any,
      content: report.content
    });
    const existingPhotos = (report.photos || [])
      .map(id => project.photos.find(p => p.id === id))
      .filter((p): p is SitePhoto => !!p);
    setTempReportPhotos(existingPhotos);
    setEditingReportId(report.id);
    setIsAddingReport(true);
  };

  const handleSaveReport = () => {
    if (!newReport.content) return;
    if (isProcessingPhotos) {
        alert("請等待照片處理完成");
        return;
    }

    const isDuplicateDate = project.reports.some(r => r.date === newReport.date && r.id !== editingReportId);
    if (isDuplicateDate) {
      alert("此日期已有工程日誌。");
      return;
    }

    let updatedProjectPhotos = [...(project.photos || [])];
    if (editingReportId) {
       const originalReport = project.reports.find(r => r.id === editingReportId);
       const originalPhotoIds = originalReport?.photos || [];
       updatedProjectPhotos = updatedProjectPhotos.filter(p => !originalPhotoIds.includes(p.id));
    }
    updatedProjectPhotos = [...updatedProjectPhotos, ...tempReportPhotos];

    const reportId = editingReportId || crypto.randomUUID();
    const reportPayload: DailyReport = {
      id: reportId,
      date: newReport.date,
      weather: newReport.weather,
      content: newReport.content,
      reporter: editingReportId ? (project.reports.find(r => r.id === reportId)?.reporter || currentUser.name) : currentUser.name,
      timestamp: editingReportId ? (project.reports.find(r => r.id === reportId)?.timestamp || Date.now()) : Date.now(),
      photos: tempReportPhotos.map(p => p.id)
    };

    let updatedReports;
    if (editingReportId) {
      updatedReports = project.reports.map(r => r.id === editingReportId ? reportPayload : r);
    } else {
      updatedReports = [...(project.reports || []), reportPayload].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    onUpdateProject({
      ...project,
      reports: updatedReports,
      photos: updatedProjectPhotos
    });
    resetReportForm();
  };

  const handleExportReports = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('工程日誌');
      worksheet.columns = [
        { header: '日期', key: 'date', width: 15 },
        { header: '天氣', key: 'weather', width: 10 },
        { header: '記錄人', key: 'reporter', width: 20 },
        { header: '內容', key: 'content', width: 60 },
      ];

      for (const report of project.reports) {
        const weatherText = report.weather === 'sunny' ? '晴天' : report.weather === 'cloudy' ? '陰天' : '雨天';
        const row = worksheet.addRow({
          date: report.date,
          weather: weatherText,
          reporter: report.reporter,
          content: report.content,
        });
        
        row.getCell('date').alignment = { vertical: 'top', horizontal: 'left' };
        row.getCell('weather').alignment = { vertical: 'top', horizontal: 'center' };
        row.getCell('reporter').alignment = { vertical: 'top', horizontal: 'left' };
        row.getCell('content').alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      // Create blob
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      // Helper function handles the "open/download" part based on platform
      await downloadBlob(blob, `${project.name}_工程日誌.xlsx`);

    } catch (error) {
      console.error("Excel export error:", error);
      alert("匯出失敗");
    }
  };

  const handleDownloadPhotosZip = async (report: DailyReport) => {
    if (!report.photos || report.photos.length === 0) return;

    try {
      const zip = new JSZip();
      report.photos.forEach((photoId, index) => {
        const photo = project.photos.find(p => p.id === photoId);
        if (photo && photo.url) {
          const splitData = photo.url.split(',');
          if (splitData.length > 1) {
            const base64Data = splitData[1];
            let ext = 'jpg';
            if (photo.url.includes('image/png')) ext = 'png';
            zip.file(`照片_${index + 1}.${ext}`, base64Data, { base64: true });
          }
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const blob = new Blob([content], { type: 'application/zip' });
      downloadBlob(blob, `${project.name}_${report.date}.zip`);

    } catch (error) {
      console.error("Zip export error:", error);
      alert("打包失敗");
    }
  };

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'rainy': return <RainIcon className="w-5 h-5 text-blue-500" />;
      case 'cloudy': return <CloudIcon className="w-5 h-5 text-slate-500" />;
      default: return <SunIcon className="w-5 h-5 text-orange-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h3 className="font-bold text-lg text-slate-800">工程日誌</h3>
          <p className="text-sm text-slate-500">記錄每日施工概況</p>
        </div>
        <div className="flex gap-2">
          {project.reports && project.reports.length > 0 && (
            <button 
                onClick={handleExportReports} 
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-colors" 
                title="匯出 Excel"
            >
              <DownloadIcon className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => { resetReportForm(); setIsAddingReport(true); }} className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-colors" title="新增日誌">
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-full">
        {isAddingReport && (
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 bg-blue-50/50 p-6 flex-shrink-0 flex flex-col gap-4 overflow-y-auto max-h-[800px]">
            <h4 className="font-bold text-slate-800">{editingReportId ? '編輯' : '新增'}</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">日期</label>
                <input type="date" value={newReport.date} onChange={e => setNewReport({...newReport, date: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">天氣</label>
                <div className="flex gap-2">
                  {['sunny', 'cloudy', 'rainy'].map((w) => (
                     <button key={w} onClick={() => setNewReport({...newReport, weather: w as any})} className={`flex-1 py-2 rounded-md border flex justify-center items-center ${newReport.weather === w ? 'bg-white border-blue-500 text-blue-600' : 'bg-slate-100 border-transparent text-slate-500'}`}>
                       {w === 'sunny' && <SunIcon className="w-4 h-4" />}
                       {w === 'cloudy' && <CloudIcon className="w-4 h-4" />}
                       {w === 'rainy' && <RainIcon className="w-4 h-4" />}
                     </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">內容</label>
                <textarea value={newReport.content} onChange={e => setNewReport({...newReport, content: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm h-32 resize-none" placeholder="施工項目..." />
              </div>
              <div>
                 <label className="block text-xs font-semibold text-slate-500 mb-1">照片</label>
                 <input type="file" multiple accept="image/*" ref={reportPhotoInputRef} className="hidden" onChange={handleReportPhotoUpload} />
                 <button 
                    onClick={() => reportPhotoInputRef.current?.click()} 
                    disabled={isProcessingPhotos}
                    className="w-full border-2 border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-500 rounded-md py-3 text-sm flex flex-col items-center justify-center transition-colors disabled:opacity-50"
                 >
                    {isProcessingPhotos ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <CameraIcon className="w-5 h-5" />}
                 </button>
                 {tempReportPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                       {tempReportPhotos.map(p => (
                          <div key={p.id} className="relative aspect-square rounded-md overflow-hidden bg-slate-200 group">
                             <img src={p.url} alt="preview" className="w-full h-full object-cover" />
                             <button onClick={() => removeTempPhoto(p.id)} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5">
                                <XIcon className="w-3 h-3" />
                             </button>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={resetReportForm} className="flex-1 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-md">取消</button>
                <button onClick={handleSaveReport} disabled={isProcessingPhotos} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-md shadow-sm disabled:opacity-70">
                  {editingReportId ? '儲存' : '提交'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
          {(!project.reports || project.reports.length === 0) ? (
            <div className="text-center py-20 text-slate-400">
              <FileTextIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>無紀錄</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {project.reports.map((report) => (
                <div key={report.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{report.date}</div>
                      <div className="text-slate-500">
                        {getWeatherIcon(report.weather)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-400">{report.reporter}</div>
                      {report.photos && report.photos.length > 0 && (
                        <button onClick={() => handleDownloadPhotosZip(report)} className="text-slate-400 hover:text-blue-600 p-1" title="下載照片">
                          <DownloadIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => handleEditReport(report)} className="text-slate-400 hover:text-blue-600 p-1" title="編輯">
                          <EditIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed mb-3 line-clamp-2" onClick={() => handleEditReport(report)}>{report.content}</p>
                  {report.photos && report.photos.length > 0 && (
                     <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
                        {report.photos.map(photoId => {
                           const photo = project.photos.find(p => p.id === photoId);
                           if (!photo) return null;
                           return (
                              <img key={photoId} src={photo.url} alt="Site" className="w-16 h-16 object-cover rounded-md flex-shrink-0 cursor-pointer" onClick={() => setViewingPhoto(photo.url)} />
                           );
                        })}
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {viewingPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
            <img src={viewingPhoto} alt="Full" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
};

export default ProjectReports;