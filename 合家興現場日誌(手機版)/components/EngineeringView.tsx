import React, { useRef, useState } from 'react';
import { Project, User, ProjectStatus, ProjectType, GlobalTeamConfigs, SystemRules, Employee, AttendanceRecord, CompletionReport } from '../types';
import ProjectList from './ProjectList';
import ExcelJS from 'exceljs';
import { downloadBlob } from '../utils/fileHelpers';
import { generateId } from '../utils/dataLogic';
// Fix: Add missing LoaderIcon import
import { LoaderIcon } from './Icons';

declare const XLSX: any;
declare const pdfjsLib: any;

interface EngineeringViewProps {
  projects: Project[]; 
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>; 
  currentUser: User; 
  lastUpdateInfo: { name: string; time: string } | null; 
  updateLastAction: (name: string, details?: string) => void; 
  systemRules: SystemRules; 
  employees: Employee[]; 
  setAttendance: (records: AttendanceRecord[]) => void; 
  onSelectProject: (project: Project) => void; 
  onAddProject: () => void; 
  onEditProject: (project: Project) => void; 
  handleDeleteProject: (id: string) => void; 
  onAddToSchedule: (date: string, teamId: number, taskName: string) => boolean; 
  onOpenDrivingTime?: () => void;
  globalTeamConfigs: GlobalTeamConfigs;
}

const EngineeringView: React.FC<EngineeringViewProps> = ({ 
  projects, setProjects, currentUser, lastUpdateInfo, updateLastAction, systemRules, 
  employees, setAttendance, onSelectProject, onAddProject, onEditProject, 
  handleDeleteProject, onAddToSchedule, onOpenDrivingTime, globalTeamConfigs 
}) => {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const recordInputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const completionInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 解析 PDF Metadata (用於施工紀錄/報告匯入)
  const handleImportPDFMetadata = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || typeof pdfjsLib === 'undefined') return;
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const metadata = await pdf.getMetadata();
      const rawJson = metadata.info?.Subject;
      
      if (!rawJson) throw new Error('此 PDF 檔案不包含有效的系統數據。');
      
      const embeddedData = JSON.parse(rawJson);
      const { project: pInfo, record: rData } = embeddedData;
      
      const targetProject = projects.find(p => p.id === pInfo.id || p.name === pInfo.name);
      if (!targetProject) throw new Error(`系統中找不到對應案場：${pInfo.name}`);

      // 建立新的施工細項與日誌
      const updatedProjects = projects.map(p => {
        if (p.id === targetProject.id) {
          const newItems = rData.items.map((i: any) => ({
            id: generateId(),
            ...i,
            date: rData.date,
            worker: rData.worker,
            assistant: rData.assistant
          }));
          
          const filteredItems = (p.constructionItems || []).filter(item => item.date !== rData.date);
          const otherReports = (p.reports || []).filter(r => r.date !== rData.date);
          
          return {
            ...p,
            constructionItems: [...filteredItems, ...newItems],
            reports: [...otherReports, {
              id: generateId(),
              date: rData.date,
              weather: rData.weather,
              content: rData.content,
              reporter: currentUser.name,
              timestamp: Date.now(),
              worker: rData.worker,
              assistant: rData.assistant
            }]
          };
        }
        return p;
      });

      setProjects(updatedProjects);
      updateLastAction(targetProject.name, `[${targetProject.name}] 透過 PDF 匯入施工數據 (${rData.date})`);
      alert(`匯入成功！已更新案場「${targetProject.name}」於 ${rData.date} 的紀錄。`);
    } catch (error: any) {
      alert('匯入失敗: ' + error.message);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // 解析 Excel (用於批量匯入完工報告)
  const handleImportCompletionExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error('找不到工作表');

      const titleVal = worksheet.getCell('A1').value?.toString() || '';
      const projName = titleVal.includes('-') ? titleVal.split('-')[1].trim() : titleVal;
      const targetProject = projects.find(p => p.name.includes(projName) || projName.includes(p.name));
      
      if (!targetProject) throw new Error(`系統中找不到對應案場：${projName}`);

      const reportDate = worksheet.getCell('B2').value?.toString() || '';
      const worker = worksheet.getCell('B3').value?.toString() || '';
      const notes = worksheet.getCell('A10').value?.toString() || '';
      
      const items: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
          if (rowNumber >= 7 && rowNumber < 10) {
              const name = row.getCell(2).value?.toString();
              if (name) {
                  items.push({
                      name,
                      action: row.getCell(3).value?.toString().includes('裝') ? 'install' : 'dismantle',
                      quantity: row.getCell(5).value?.toString() || '0',
                      unit: row.getCell(6).value?.toString() || '',
                      category: 'OTHER'
                  });
              }
          }
      });

      const newReport: CompletionReport = {
          id: generateId(),
          date: reportDate,
          worker: worker,
          items,
          notes,
          signature: '',
          timestamp: Date.now()
      };

      const updatedProjects = projects.map(p => {
          if (p.id === targetProject.id) {
              const others = (p.completionReports || []).filter(r => r.date !== reportDate);
              return { ...p, completionReports: [...others, newReport] };
          }
          return p;
      });

      setProjects(updatedProjects);
      updateLastAction(targetProject.name, `[${targetProject.name}] 匯入完工報告 (${reportDate})`);
      alert(`完工報告匯入成功！案場：${targetProject.name}`);
    } catch (error: any) {
      alert('匯入失敗: ' + error.message);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return; 
    setIsProcessing(true);
    try {
      const workbook = new ExcelJS.Workbook(); 
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.getWorksheet(1); 
      if (!worksheet) throw new Error('找不到工作表');
      
      const currentProjects = [...projects]; 
      let newCount = 0; 
      const headers: Record<string, number> = {};
      
      worksheet.getRow(1).eachCell((cell: any, col: number) => { 
        const text = cell.value?.toString().trim(); 
        if (text) headers[text] = col; 
      });
      
      if (!headers['客戶'] || !headers['類別']) throw new Error('缺少必要欄位 (客戶 或 類別)');
      const config = systemRules.importConfig?.projectKeywords || { maintenance: '維修', modular: '組合屋' };

      for (const row of worksheet.getRows(2, worksheet.rowCount - 1) || []) {
        const rawName = row.getCell(headers['客戶']).value?.toString().trim() || ''; 
        if (!rawName) continue;
        
        const categoryStr = row.getCell(headers['類別']).value?.toString() || '';
        let type = ProjectType.CONSTRUCTION;
        if (categoryStr.includes(config.maintenance)) type = ProjectType.MAINTENANCE;
        else if (categoryStr.includes(config.modular)) type = ProjectType.MODULAR_HOUSE;
        
        if (!currentProjects.some(p => p.name === rawName)) {
          currentProjects.push({ 
            id: generateId(), 
            name: rawName, 
            type, 
            clientName: rawName.split('-')[0], 
            clientContact: '', 
            clientPhone: '', 
            address: row.getCell(headers['地址'] || 0).value?.toString() || '', 
            status: ProjectStatus.PLANNING, 
            progress: 0, 
            appointmentDate: '', 
            reportDate: '', 
            description: '', 
            remarks: '', 
            milestones: [], 
            photos: [], 
            materials: [], 
            reports: [], 
            attachments: [], 
            constructionItems: [], 
            constructionSignatures: [], 
            completionReports: [], 
            planningReports: [] 
          });
          newCount++;
        }
      }
      setProjects(currentProjects); 
      updateLastAction('Excel 匯入案件', `批量新增了 ${newCount} 筆案件`); 
      alert(`匯入完成！新增：${newCount} 筆`);
    } catch (error: any) { 
      alert('匯入失敗: ' + error.message); 
    } finally { 
      setIsProcessing(false); 
      if (excelInputRef.current) excelInputRef.current.value = ''; 
    }
  };

  const handleExportExcel = () => {
    try {
      const data = projects.map((p, idx) => ({
        '項次': idx + 1,
        '案件名稱': p.name,
        '客戶名稱': p.clientName,
        '類型': p.type === ProjectType.CONSTRUCTION ? '圍籬' : p.type === ProjectType.MODULAR_HOUSE ? '組合屋' : '維修',
        '地址': p.address,
        '狀態': p.status,
        '預約日期': p.appointmentDate,
        '報修日期': p.reportDate,
        '工程概要': p.description
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "案件總表");
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      downloadBlob(new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `合家興案件清冊_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      alert("匯出失敗");
    }
  };

  return (
    <>
      <ProjectList 
        title="工務總覽" 
        projects={projects} 
        currentUser={currentUser} 
        lastUpdateInfo={lastUpdateInfo} 
        onSelectProject={onSelectProject} 
        onAddProject={onAddProject} 
        onDeleteProject={handleDeleteProject} 
        onDuplicateProject={()=>{}} 
        onEditProject={onEditProject} 
        onImportExcel={() => excelInputRef.current?.click()} 
        onExportExcel={handleExportExcel}
        onOpenDrivingTime={onOpenDrivingTime}
        onAddToSchedule={onAddToSchedule} 
        onImportConstructionRecords={() => recordInputRef.current?.click()}
        onImportConstructionReports={() => reportInputRef.current?.click()}
        onImportCompletionReports={() => completionInputRef.current?.click()}
        globalTeamConfigs={globalTeamConfigs} 
      />
      <input type="file" accept=".xlsx, .xls" ref={excelInputRef} className="hidden" onChange={handleImportExcel} />
      <input type="file" accept=".pdf" ref={recordInputRef} className="hidden" onChange={handleImportPDFMetadata} />
      <input type="file" accept=".pdf" ref={reportInputRef} className="hidden" onChange={handleImportPDFMetadata} />
      <input type="file" accept=".xlsx, .xls" ref={completionInputRef} className="hidden" onChange={handleImportCompletionExcel} />
      
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                <LoaderIcon className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="font-bold text-slate-700 text-sm">正在處理檔案，請稍候...</p>
            </div>
        </div>
      )}
    </>
  );
};

export default EngineeringView;