import React, { useRef, useState } from 'react';
import { Project, User, ProjectStatus, ProjectType, GlobalTeamConfigs, SystemRules, Employee, AttendanceRecord, CompletionReport, DailyReport, ConstructionItem } from '../types';
import ProjectList from './ProjectList';
import ExcelJS from 'exceljs';
import { downloadBlob } from '../utils/fileHelpers';
import { generateId } from '../utils/dataLogic';
import { LoaderIcon } from './Icons';

declare const XLSX: any;
declare const pdfjsLib: any;

interface EngineeringViewProps {
  projects: Project[]; 
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>; 
  currentUser: User; 
  lastUpdateInfo: { name: string; time: string; user?: string } | null; 
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
  onTranslateAllProjects: () => Promise<void>; // 新增此行以修正 TS 錯誤
  globalTeamConfigs: GlobalTeamConfigs;
}

const EngineeringView: React.FC<EngineeringViewProps> = ({ 
  projects, setProjects, currentUser, lastUpdateInfo, updateLastAction, systemRules, 
  employees, setAttendance, onSelectProject, onAddProject, onEditProject, 
  handleDeleteProject, onAddToSchedule, onOpenDrivingTime, onTranslateAllProjects, globalTeamConfigs 
}) => {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const recordInputRef = useRef<HTMLInputElement>(null); // Excel 施工紀錄
  const reportInputRef = useRef<HTMLInputElement>(null); // PDF 施工報告
  const completionInputRef = useRef<HTMLInputElement>(null); // PDF 完工報告
  const [isProcessing, setIsProcessing] = useState(false);

  // 安全取得 Excel 儲存格字串
  const getSafeText = (cell: ExcelJS.Cell): string => {
    const val = cell.value;
    if (val === null || val === undefined) return '';
    if (typeof val === 'object' && 'richText' in val) {
      return (val as any).richText.map((segment: any) => segment.text || '').join('');
    }
    return String(val);
  };

  // 1. 完工報告匯入：解析 PDF Metadata
  const handleImportCompletionPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const updatedProjects = projects.map(p => {
        if (p.id === targetProject.id) {
          const newReport: CompletionReport = {
            id: generateId(),
            date: rData.date,
            worker: rData.worker,
            items: rData.items,
            notes: rData.content || '',
            signature: '',
            timestamp: Date.now()
          };
          const others = (p.completionReports || []).filter(r => r.date !== rData.date);
          return { ...p, completionReports: [...others, newReport] };
        }
        return p;
      });

      setProjects(updatedProjects);
      updateLastAction(targetProject.name, `[${targetProject.name}] 透過 PDF 匯入完工報告 (${rData.date})`);
      alert(`匯入成功！已更新案場「${targetProject.name}」的完工報告。`);
    } catch (error: any) {
      alert('匯入失敗: ' + error.message);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // 2. 施工報告匯入：解析 PDF Metadata (與完工報告邏輯相似，但更新至施工日誌)
  const handleImportConstructionReportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const updatedProjects = projects.map(p => {
        if (p.id === targetProject.id) {
          // 轉換施工品項
          const newItems: ConstructionItem[] = (rData.items || []).map((item: any) => ({
              id: generateId(),
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              location: item.location || '',
              worker: rData.worker,
              assistant: rData.assistant || '',
              date: rData.date
          }));

          // 過濾掉同一天的舊項目
          const filteredItems = (p.constructionItems || []).filter(item => item.date !== rData.date);
          const otherReports = (p.reports || []).filter(r => r.date !== rData.date);

          return { 
              ...p, 
              constructionItems: [...filteredItems, ...newItems],
              reports: [...otherReports, {
                  id: generateId(),
                  date: rData.date,
                  weather: rData.weather || 'sunny',
                  content: rData.content || '',
                  reporter: currentUser.name,
                  timestamp: Date.now(),
                  worker: rData.worker,
                  assistant: rData.assistant || ''
              }]
          };
        }
        return p;
      });

      setProjects(updatedProjects);
      updateLastAction(targetProject.name, `[${targetProject.name}] 透過 PDF 匯入施工報告 (${rData.date})`);
      alert(`匯入成功！已更新案場「${targetProject.name}」的施工日誌。`);
    } catch (error: any) {
      alert('匯入失敗: ' + error.message);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // 3. 施工紀錄匯入：解析 Excel
  const handleImportConstructionExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error('找不到工作表');

      // 解析標題獲取案名
      const titleVal = getSafeText(worksheet.getCell('A1'));
      const projName = titleVal.includes('-') ? titleVal.split('-')[1].trim() : titleVal;
      const targetProject = projects.find(p => p.name.includes(projName) || projName.includes(p.name));
      
      if (!targetProject) throw new Error(`系統中找不到對應案場：${projName}`);

      const reportDate = getSafeText(worksheet.getCell('B2'));
      const personnelInfo = getSafeText(worksheet.getCell('B3')); // 格式: 師傅: XXX / 助手: YYY
      const weatherText = getSafeText(worksheet.getCell('B4'));
      const notes = getSafeText(worksheet.getCell('A10'));
      
      const workerMatch = personnelInfo.match(/師傅:\s*([^/]*)/);
      const assistantMatch = personnelInfo.match(/助手:\s*(.*)/);
      const worker = workerMatch ? workerMatch[1].trim() : '';
      const assistant = assistantMatch ? assistantMatch[1].trim() : '';

      const items: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
          // 從第 7 列開始是施工品項
          if (rowNumber >= 7 && rowNumber < 10) {
              const name = getSafeText(row.getCell(2));
              if (name && name !== '無施工項目') {
                  items.push({
                      id: generateId(),
                      name,
                      quantity: getSafeText(row.getCell(3)),
                      unit: getSafeText(row.getCell(4)),
                      location: getSafeText(row.getCell(5)),
                      worker,
                      assistant,
                      date: reportDate
                  });
              }
          }
      });

      const updatedProjects = projects.map(p => {
          if (p.id === targetProject.id) {
              const filteredItems = (p.constructionItems || []).filter(item => item.date !== reportDate);
              const otherReports = (p.reports || []).filter(r => r.date !== reportDate);
              
              const weatherMap: Record<string, any> = { '晴天': 'sunny', '陰天': 'cloudy', '雨天': 'rainy' };
              const weather = weatherMap[weatherText] || 'sunny';

              return { 
                  ...p, 
                  constructionItems: [...filteredItems, ...items],
                  reports: [...otherReports, {
                      id: generateId(),
                      date: reportDate,
                      weather,
                      content: notes,
                      reporter: currentUser.name,
                      timestamp: Date.now(),
                      worker,
                      assistant
                  }]
              };
          }
          return p;
      });

      setProjects(updatedProjects);
      updateLastAction(targetProject.name, `[${targetProject.name}] 透過 Excel 匯入施工紀錄 (${reportDate})`);
      alert(`施工紀錄匯入成功！案場：${targetProject.name}`);
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
      <input type="file" accept=".xlsx, .xls" ref={recordInputRef} className="hidden" onChange={handleImportConstructionExcel} />
      <input type="file" accept=".pdf" ref={reportInputRef} className="hidden" onChange={handleImportConstructionReportPDF} />
      <input type="file" accept=".pdf" ref={completionInputRef} className="hidden" onChange={handleImportCompletionPDF} />
      
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