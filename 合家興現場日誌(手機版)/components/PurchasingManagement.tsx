import React, { useState, useRef } from 'react';
import { Project, Material, MaterialStatus, User } from '../types';
import { BoxIcon, UploadIcon, FileTextIcon, CheckCircleIcon, AlertIcon, LoaderIcon, SearchIcon } from './Icons';
import ExcelJS from 'exceljs';
import { generateId } from '../utils/dataLogic';

interface PurchasingManagementProps {
  projects: Project[];
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
}

interface ImportResult { fileName: string; projectName: string; status: 'success' | 'error'; message: string; }

const PurchasingManagement: React.FC<PurchasingManagementProps> = ({ projects, currentUser, onUpdateProject }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString().split('T')[0];
    return String(val).trim();
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setIsImporting(true); const results: ImportResult[] = []; const fileArray = Array.from(files) as File[];
    
    for (const file of fileArray) {
      try {
        const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
        const worksheet = workbook.getWorksheet(1); if (!worksheet) throw new Error('找不到工作表');
        const getValue = (row: number, col: number) => {
            const val = worksheet.getRow(row).getCell(col).value?.toString() || '';
            return val.includes(' ') ? val.split(/\s+/).slice(1).join(' ') : val;
        };
        const projectName = getValue(2, 1);
        const targetProject = projects.find(p => p.name === projectName || projectName.includes(p.name));
        if (!targetProject) { results.push({ fileName: file.name, projectName, status: 'error', message: '系統中找不到對應專案' }); continue; }
        const newMaterials: Material[] = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber >= 10) {
            const name = row.getCell(2).value?.toString();
            if (name) newMaterials.push({ id: generateId(), name, quantity: Number(row.getCell(3).value) || 0, unit: row.getCell(4).value?.toString() || '', status: MaterialStatus.PENDING, notes: row.getCell(5).value?.toString() || '' });
          }
        });
        onUpdateProject({ ...targetProject, materials: [...(targetProject.materials || []), ...newMaterials] });
        results.push({ fileName: file.name, projectName, status: 'success', message: `成功匯入 ${newMaterials.length} 項材料` });
      } catch (err: any) { results.push({ fileName: file.name, projectName: '未知', status: 'error', message: err.message }); }
    }
    setImportResults(results); setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="bg-white p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4"><div className="bg-blue-600 p-3 rounded-xl text-white"><BoxIcon className="w-6 h-6" /></div><div><h1 className="text-xl font-bold">採購管理</h1><p className="text-xs text-slate-500">批量處理 Excel 請購單並自動同步</p></div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center gap-4 group hover:border-blue-500 transition-all">
          <div className="p-4 bg-blue-50 rounded-full text-blue-600 group-hover:scale-110 transition-transform"><UploadIcon className="w-10 h-10" /></div>
          <div><h3 className="text-lg font-bold">批量匯入 Excel 請購單</h3></div>
          <input type="file" multiple accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleBulkImport} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="mt-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 disabled:opacity-50">{isImporting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <FileTextIcon className="w-5 h-5" />}匯入檔案</button>
        </div>
        <div className="bg-white rounded-2xl border shadow-sm flex flex-col min-h-[300px]">
          <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between"><h3 className="font-bold text-sm">本次匯入狀態</h3></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {importResults.length > 0 ? importResults.map((res, i) => (<div key={i} className={`p-3 rounded-lg border flex items-start gap-3 ${res.status === 'success' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}><div className="min-w-0"><div className="text-xs font-bold truncate">{res.fileName}</div><div className="text-[10px] text-slate-500 mt-0.5">專案: {res.projectName} • {res.message}</div></div></div>)) : <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12"><p className="text-xs">等待資料...</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchasingManagement;