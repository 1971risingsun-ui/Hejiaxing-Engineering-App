import React, { useState, useRef, useEffect } from 'react';
import { Project, User, CompletionReport as CompletionReportType, CompletionItem } from '../types';
import { PlusIcon, FileTextIcon, TrashIcon, XIcon, CheckCircleIcon, EditIcon, LoaderIcon, ClockIcon, DownloadIcon, UploadIcon, CopyIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';
import ExcelJS from 'exceljs';

declare const html2canvas: any;
declare const jspdf: any;

interface EngineeringPlanningProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
}

// 定義大分類及其下的子分類
const CATEGORY_GROUPS = {
    FENCE: {
        label: '安全圍籬及休息區',
        subCategories: {
            FENCE_MAIN: {
                label: '安全圍籬',
                defaultUnit: '米',
                items: [
                    "怪手整地、打洞", "新作防颱型甲種圍籬", "30cm防溢座 - 單模", "基地內圍牆加高圍籬",
                    "新作8米施工大門", "新作6米施工大門", "警示燈", "告示牌", "安衛貼紙", "美化帆布",
                    "隔音帆布", "噪音管制看板", "監測告示牌", "休息區", "生活垃圾雨遮", "電箱網狀圍籬",
                    "電箱網狀小門加工", "大門寫字"
                ]
            }
        }
    },
    MODULAR_HOUSE: {
        label: '組合房屋',
        subCategories: {
            MODULAR_STRUCT: {
                label: '主結構',
                defaultUnit: '坪',
                items: [
                    "基礎框架 + 周邊模板", "主結構租賃", "牆板噴漆", "屋頂鋼板", "特殊雙後紐門(1F)",
                    "D2單開門", "走道", "樓梯", "客製化樓梯上蓋", "1F雨披", "W1窗", "天溝、落水管",
                    "屋頂防颱", "吊裝運費"
                ]
            },
            MODULAR_RENO: {
                label: '裝修工程',
                defaultUnit: '坪',
                items: [
                    "天花板", "2F-2分夾板+PVC地磚", "1F地坪-底料+PVC地磚", "牆板隔間", "走道止滑毯", "百葉窗"
                ]
            },
            MODULAR_OTHER: {
                label: '其他工程',
                defaultUnit: '式',
                items: [
                    "土尾工", "整體粉光"
                ]
            },
            MODULAR_DISMANTLE: {
                label: '拆除工程',
                defaultUnit: '坪',
                items: [
                    "組合房屋拆除", "吊裝運費"
                ]
            }
        }
    }
};

const EngineeringPlanning: React.FC<EngineeringPlanningProps> = ({ project, currentUser, onUpdateProject }) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEditing, setIsEditing] = useState(true);
  
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CompletionItem[]>([]);

  const [estDaysFence, setEstDaysFence] = useState('12');
  const [estDaysModular, setEstDaysModular] = useState('20');

  const [customItem, setCustomItem] = useState({ name: '', spec: '', quantity: '', unit: '', itemNote: '' });

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasReport = (project.planningReports || []).some(r => r.date === reportDate);

  // 安全取得 Excel 儲存格字串
  const getSafeText = (cell: ExcelJS.Cell): string => {
    const val = cell.value;
    if (val === null || val === undefined) return '';
    
    // 處理 RichText
    if (typeof val === 'object' && 'richText' in val) {
      return (val as any).richText.map((segment: any) => segment.text || '').join('');
    }
    
    // 處理 Hyperlink
    if (typeof val === 'object' && 'text' in val && 'hyperlink' in val) {
      return String((val as any).text || '');
    }

    // 處理 Formula
    if (typeof val === 'object' && 'result' in val) {
      return String((val as any).result || '');
    }

    return String(val);
  };

  useEffect(() => {
    const existingReport = (project.planningReports || []).find(r => r.date === reportDate);
    
    if (existingReport) {
        const noteContent = existingReport.notes || '';
        const fenceMatch = noteContent.match(/圍籬：(\d+)\s*日/);
        const modularMatch = noteContent.match(/組合屋：(\d+)\s*日/);
        if (fenceMatch) setEstDaysFence(fenceMatch[1]);
        if (modularMatch) setEstDaysModular(modularMatch[1]);
        
        setNotes(noteContent.replace(/【預估工期】.*?\n\n/s, ''));
        setItems(existingReport.items || []);
        setIsEditing(false);
    } else {
        setNotes('');
        setItems([]);
        setIsEditing(true);
    }
  }, [reportDate, project.planningReports]);

  const handleSave = () => {
      const combinedNotes = `【預估工期】圍籬：${estDaysFence} 日 / 組合屋：${estDaysModular} 日\n\n${notes}`;

      const newReport: CompletionReportType = {
          id: (project.planningReports || []).find(r => r.date === reportDate)?.id || crypto.randomUUID(),
          date: reportDate,
          worker: '', 
          items,
          notes: combinedNotes,
          signature: '', 
          timestamp: Date.now()
      };

      const otherReports = (project.planningReports || []).filter(r => r.date !== reportDate);
      const updatedReports = [...otherReports, newReport];

      onUpdateProject({
          ...project,
          planningReports: updatedReports
      });
      
      setIsEditing(false);
  };

  const handleDeleteReport = () => {
    if (!window.confirm(`確定要刪除 ${reportDate} 的整份報價單嗎？`)) return;
    const updatedReports = (project.planningReports || []).filter(r => r.date !== reportDate);
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const allWorksheets = workbook.worksheets;
      if (allWorksheets.length === 0) throw new Error('Excel 檔案內無工作表');

      // 規則修正：從右側（最後一個工作表）開始搜尋
      let worksheet = null;
      for (let i = allWorksheets.length - 1; i >= 0; i--) {
        const ws = allWorksheets[i];
        const row8 = ws.getRow(8);
        let found = false;
        row8.eachCell((cell) => {
            if (getSafeText(cell).trim() === '品名') found = true;
        });
        if (found) {
            worksheet = ws;
            break;
        }
      }

      // 如果都沒找到符合第 8 列「品名」規範的，預設抓最右側的工作表
      if (!worksheet) {
          worksheet = allWorksheets[allWorksheets.length - 1];
      }

      const importedItems: CompletionItem[] = [];
      let currentSubCat = 'FENCE_MAIN';
      
      // 定位第 8 列的標題位置
      const headers: Record<string, number> = {};
      const headerRow = worksheet.getRow(8);
      headerRow.eachCell((cell, colNumber) => {
          const text = getSafeText(cell).trim();
          if (text) headers[text] = colNumber;
      });

      const nameCol = headers['品名'];
      const specCol = headers['規格'];
      const qtyCol = headers['數量'];
      const unitCol = headers['單位'];

      if (!nameCol) throw new Error(`在工作表「${worksheet.name}」的第 8 列找不到「品名」欄位，請確認格式是否正確`);

      // 從第 9 列開始判讀
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 8) return;

        const firstCell = getSafeText(row.getCell(1)).trim();
        const itemName = getSafeText(row.getCell(nameCol)).trim();
        const itemSpec = specCol ? getSafeText(row.getCell(specCol)).trim() : '';
        const itemQty = qtyCol ? getSafeText(row.getCell(qtyCol)).trim() : '';
        const itemUnit = unitCol ? getSafeText(row.getCell(unitCol)).trim() : '';

        // 規則：偵測品名文字以切換子分類
        if (itemName === '安全圍籬及休息區') {
            currentSubCat = 'FENCE_MAIN';
            return;
        } else if (itemName === '主結構租賃') {
            currentSubCat = 'MODULAR_STRUCT';
            return;
        } else if (itemName === '裝修工程') {
            currentSubCat = 'MODULAR_RENO';
            return;
        } else if (itemName === '其他工程') {
            currentSubCat = 'MODULAR_OTHER';
            return;
        } else if (itemName === '拆除工程') {
            currentSubCat = 'MODULAR_DISMANTLE';
            return;
        }

        // 有效項目判定：第一欄（項次）必須為數字且品名不為空
        if (itemName && firstCell && !isNaN(Number(firstCell))) {
            importedItems.push({
                name: itemName,
                action: 'install',
                spec: itemSpec,
                quantity: itemQty,
                unit: itemUnit,
                category: currentSubCat,
                itemNote: ''
            });
        }
      });

      if (importedItems.length > 0) {
        setItems(prev => {
            const combined = [...prev];
            importedItems.forEach(newItem => {
                // 檢查重複（同分類同品名同規格）
                if (!combined.some(i => i.name === newItem.name && i.category === newItem.category && i.spec === newItem.spec)) {
                    combined.push(newItem);
                }
            });
            return combined;
        });
        alert(`成功從「${worksheet.name}」匯入 ${importedItems.length} 個規劃項目`);
      } else {
        alert('未偵測到有效項目。請確認第 8 列為欄位標題，且第 9 列起的第一欄包含數字項次。');
      }
    } catch (err: any) {
      console.error(err);
      alert('匯入失敗: ' + err.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteItem = (index: number) => {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
  };

  const handleDuplicateItem = (index: number) => {
      const itemToCopy = items[index];
      const newItems = [...items];
      newItems.splice(index + 1, 0, { ...itemToCopy });
      setItems(newItems);
  };

  const handleAddSubCategoryItem = (subCatId: string) => {
      let subCat: any = null;
      Object.values(CATEGORY_GROUPS).forEach(group => {
          if (group.subCategories[subCatId as keyof typeof group.subCategories]) {
              subCat = group.subCategories[subCatId as keyof typeof group.subCategories];
          }
      });
      if (!subCat) return;

      setItems([...items, { 
          name: subCat.items[0], 
          action: 'install', 
          spec: '',
          quantity: '', 
          unit: subCat.defaultUnit,
          category: subCatId,
          itemNote: ''
      }]);
  };

  const handleAddCustomItem = (targetSubCat: string) => {
      if (!customItem.name) return;
      setItems([...items, { 
          name: customItem.name, 
          action: 'install', 
          spec: customItem.spec,
          quantity: customItem.quantity,
          unit: customItem.unit,
          category: targetSubCat,
          itemNote: customItem.itemNote
      }]);
      setCustomItem({ name: '', spec: '', quantity: '', unit: '', itemNote: '' });
  };

  const updateItem = (index: number, field: keyof CompletionItem, value: any) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === 'name') {
           const currentSubCatId = newItems[index].category;
           let subCat: any = null;
           Object.values(CATEGORY_GROUPS).forEach(group => {
               if (group.subCategories[currentSubCatId as keyof typeof group.subCategories]) {
                   subCat = group.subCategories[currentSubCatId as keyof typeof group.subCategories];
               }
           });
           if (subCat && subCat.defaultUnit) {
               newItems[index].unit = subCat.defaultUnit;
           }
      }
      setItems(newItems);
  };

  const generatePDF = async () => {
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert("必要元件尚未載入，請重新整理頁面");
        return;
    }
    setIsGeneratingPDF(true);
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1100px'; 
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    const renderGroupHtml = (groupId: string) => {
        const group = CATEGORY_GROUPS[groupId as keyof typeof CATEGORY_GROUPS];
        const groupItems = items.filter(i => Object.keys(group.subCategories).includes(i.category));
        if (groupItems.length === 0) return '';

        let innerHtml = `<div style="font-weight: bold; font-size: 18px; margin-bottom: 10px; background-color: #0f172a; color: white; padding: 10px; border-radius: 4px;">${group.label}</div>`;

        Object.entries(group.subCategories).forEach(([subId, subCat]) => {
            const subItems = items.filter(i => i.category === subId);
            if (subItems.length === 0) return;

            const rows = subItems.map((item, idx) => `
                <tr>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 13px; font-weight: bold;">${item.name}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px; white-space: pre-wrap;">${item.spec || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${item.itemNote || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 13px; font-weight: bold;">${item.quantity}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 13px;">${item.unit}</td>
                </tr>
            `).join('');

            innerHtml += `
                <div style="margin-bottom: 20px; padding-left: 15px;">
                    <div style="font-weight: bold; font-size: 15px; margin-bottom: 5px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">${subCat.label}</div>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <thead>
                            <tr style="background-color: #f8fafc;">
                                <th style="border: 1px solid #000; padding: 8px; width: 30%;">品名</th>
                                <th style="border: 1px solid #000; padding: 8px; width: 24%;">規格</th>
                                <th style="border: 1px solid #000; padding: 8px; width: 22%;">注意</th>
                                <th style="border: 1px solid #000; padding: 8px; width: 12%;">數量</th>
                                <th style="border: 1px solid #000; padding: 8px; width: 12%;">單位</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        });

        return `<div style="margin-bottom: 35px;">${innerHtml}</div>`;
    };

    const groupsHtml = Object.keys(CATEGORY_GROUPS).map(renderGroupHtml).join('');
    
    container.innerHTML = `
        <div style="font-family: 'Microsoft JhengHei', sans-serif; padding: 40px; color: #000; background: white;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 28px; font-weight: bold; margin: 0;">合家興實業有限公司</h1>
                <h2 style="font-size: 22px; font-weight: normal; margin: 10px 0; text-decoration: underline; letter-spacing: 2px;">報 價 單 (估 價 預 估)</h2>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 15px;">
                <div><span style="font-weight: bold;">日期：</span> ${reportDate}</div>
                <div><span style="font-weight: bold;">案場名稱：</span> ${project.name}</div>
            </div>
            <div style="border: 2px solid #000; padding: 15px; margin-bottom: 25px; font-size: 15px; background-color: #fffbeb;">
                <span style="font-weight: bold;">工期預估：</span> 圍籬 ${estDaysFence} 日 / 組合屋 ${estDaysModular} 日 (請於施工前 7 日通知安排)
            </div>
            ${items.length > 0 ? groupsHtml : '<div style="text-align: center; padding: 50px; border: 1px solid #ccc;">尚未加入任何規劃項目</div>'}
            <div style="border: 1px solid #000; padding: 15px; min-height: 120px; margin-bottom: 30px; margin-top: 20px;">
                <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">備註說明：</div>
                <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${notes || '無'}</div>
            </div>
        </div>
    `;

    await new Promise(resolve => setTimeout(resolve, 800));
    try {
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
        while (heightLeft > 0) {
             position = heightLeft - imgHeight;
             pdf.addPage();
             pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
             heightLeft -= pdfHeight;
        }
        downloadBlob(pdf.output('blob'), `${project.name}_報價單_${reportDate}.pdf`);
    } catch (e) {
        console.error(e);
        alert("PDF 生成失敗");
    } finally {
        document.body.removeChild(container);
        setIsGeneratingPDF(false);
    }
  };

  return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative min-h-[600px]">
          <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <FileTextIcon className="w-5 h-5 text-indigo-600" /> 報價單 (Quotation / Engineering Planning)
                  </h3>
                  <div className="flex gap-2">
                       {hasReport && (
                          <button 
                            onClick={handleDeleteReport}
                            className="p-2 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="刪除整份報價單"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                       )}
                       <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleImportExcel} />
                       <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className={`p-2 rounded-full transition-colors ${isImporting ? 'text-slate-300' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            title="匯入估價單 Excel"
                        >
                            {isImporting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <UploadIcon className="w-5 h-5" />}
                        </button>
                       <button 
                            onClick={generatePDF}
                            disabled={isGeneratingPDF}
                            className={`p-2 rounded-full transition-colors ${isGeneratingPDF ? 'text-slate-300' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            title="匯出報價單 PDF"
                        >
                            {isGeneratingPDF ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <DownloadIcon className="w-5 h-5" />}
                        </button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">日期</label>
                      <input 
                        type="date" 
                        value={reportDate}
                        disabled={isEditing && hasReport}
                        onChange={e => setReportDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-50"
                      />
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 shadow-sm flex flex-col justify-center">
                      <label className="block text-xs font-bold text-amber-700 mb-1 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> 圍籬預估工期</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={estDaysFence} onChange={e => setEstDaysFence(e.target.value)} disabled={!isEditing} className="w-full bg-white px-2 py-1 border border-amber-300 rounded font-bold text-sm outline-none" />
                        <span className="text-xs font-bold text-amber-700">日</span>
                      </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm flex flex-col justify-center">
                      <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> 組合屋預估工期</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={estDaysModular} onChange={e => setEstDaysModular(e.target.value)} disabled={!isEditing} className="w-full bg-white px-2 py-1 border border-blue-300 rounded font-bold text-sm outline-none" />
                        <span className="text-xs font-bold text-blue-700">日</span>
                      </div>
                  </div>
              </div>
          </div>

          <div className="p-6 space-y-12 overflow-x-auto pb-10">
              {Object.entries(CATEGORY_GROUPS).map(([groupId, group]) => {
                  const groupItemsCount = items.filter(i => Object.keys(group.subCategories).includes(i.category)).length;
                  if (!isEditing && groupItemsCount === 0) return null;

                  return (
                    <div key={groupId} className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 space-y-8">
                        <h4 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b border-slate-200 pb-4">
                            <div className="w-2 h-8 bg-slate-900 rounded-full"></div>
                            {group.label}
                        </h4>

                        {Object.entries(group.subCategories).map(([subId, subCat]) => {
                            const subItems = items
                                .map((item, index) => ({ item, index }))
                                .filter(({ item }) => item.category === subId);
                            
                            if (!isEditing && subItems.length === 0) return null;

                            return (
                                <div key={subId} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                    <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-700 text-xs border-b border-slate-200 flex justify-between items-center">
                                        <span>{subCat.label}</span>
                                        <span className="text-[9px] opacity-50 uppercase tracking-widest">{subId}</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                                                <tr>
                                                    <th className="px-3 py-2 min-w-[200px]">品名</th>
                                                    <th className="px-3 py-2 min-w-[180px]">規格</th>
                                                    <th className="px-3 py-2 min-w-[150px]">注意</th>
                                                    <th className="px-3 py-2 w-20 text-center">數量</th>
                                                    <th className="px-3 py-2 w-20">單位</th>
                                                    {isEditing && <th className="px-3 py-2 w-20 text-center">操作</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-sm">
                                                {subItems.map(({ item, index }) => (
                                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-3 py-2">
                                                            {isEditing ? (
                                                                <select 
                                                                    value={item.name} 
                                                                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                                    className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1 font-bold"
                                                                >
                                                                    {subCat.items.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    {!subCat.items.includes(item.name) && <option value={item.name}>{item.name}</option>}
                                                                </select>
                                                            ) : <span className="font-bold text-slate-800">{item.name}</span>}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {isEditing ? (
                                                                <textarea 
                                                                    rows={2}
                                                                    value={item.spec || ''} 
                                                                    onChange={(e) => updateItem(index, 'spec', e.target.value)}
                                                                    className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1 text-xs resize-none"
                                                                    placeholder="規格 (支援多行)"
                                                                />
                                                            ) : <span className="text-slate-600 text-xs whitespace-pre-wrap">{item.spec || '-'}</span>}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {isEditing ? (
                                                                <input 
                                                                    type="text" 
                                                                    value={item.itemNote || ''} 
                                                                    onChange={(e) => updateItem(index, 'itemNote', e.target.value)}
                                                                    className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1 text-xs"
                                                                    placeholder="注意內容"
                                                                />
                                                            ) : <span className="text-slate-500 text-xs">{item.itemNote || '-'}</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {isEditing ? (
                                                                <input 
                                                                    type="text" 
                                                                    value={item.quantity} 
                                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                                    className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1 text-center font-black text-indigo-600"
                                                                    placeholder="0"
                                                                />
                                                            ) : <span className="text-slate-900 font-black">{item.quantity}</span>}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {isEditing ? (
                                                                <input 
                                                                    type="text" 
                                                                    value={item.unit} 
                                                                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                                                    className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1 text-xs text-slate-500"
                                                                    placeholder={subCat.defaultUnit || "單位"}
                                                                />
                                                            ) : <span className="text-slate-400 text-xs font-bold">{item.unit}</span>}
                                                        </td>
                                                        {isEditing && (
                                                            <td className="px-3 py-2 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button 
                                                                        onClick={() => handleDuplicateItem(index)} 
                                                                        className="text-slate-300 hover:text-indigo-600 transition-colors p-1"
                                                                        title="複製品項"
                                                                    >
                                                                        <CopyIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteItem(index)} 
                                                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                                        title="刪除品項"
                                                                    >
                                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {isEditing && (
                                        <div className="bg-slate-50 p-2 border-t border-slate-100 flex gap-2">
                                            <button 
                                                onClick={() => handleAddSubCategoryItem(subId)}
                                                className="flex-1 py-1.5 bg-white border border-dashed border-slate-300 rounded text-indigo-600 hover:text-indigo-700 text-[10px] font-black flex items-center justify-center gap-1 transition-all"
                                            >
                                                <PlusIcon className="w-3 h-3" /> 新增標品
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                  );
              })}

              {isEditing && (
                 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-8 shadow-lg">
                    <h4 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">手動追加規劃 (任一子項)</h4>
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-3">
                            <select 
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer font-bold"
                                onChange={(e) => {/* temp storage handled by add button */}}
                                id="extra-target-subcat"
                            >
                                <option value="">選擇歸類小項...</option>
                                {Object.values(CATEGORY_GROUPS).map(g => (
                                    <optgroup key={g.label} label={g.label}>
                                        {Object.entries(g.subCategories).map(([sid, sc]) => (
                                            <option key={sid} value={sid}>{sc.label}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-12 md:col-span-2"><input type="text" placeholder="品名" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} /></div>
                        <div className="col-span-12 md:col-span-3"><textarea rows={1} placeholder="規格 (可多行)" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" value={customItem.spec} onChange={e => setCustomItem({...customItem, spec: e.target.value})} /></div>
                        <div className="col-span-12 md:col-span-2"><input type="text" placeholder="注意內容" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={customItem.itemNote} onChange={e => setCustomItem({...customItem, itemNote: e.target.value})} /></div>
                        <div className="col-span-6 md:col-span-1"><input type="text" placeholder="數量" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none text-center" value={customItem.quantity} onChange={e => setCustomItem({...customItem, quantity: e.target.value})} /></div>
                        <div className="col-span-6 md:col-span-1"><input type="text" placeholder="單位" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none text-center" value={customItem.unit} onChange={e => setCustomItem({...customItem, unit: e.target.value})} /></div>
                        <div className="col-span-12"><button onClick={() => {
                            const subcat = (document.getElementById('extra-target-subcat') as HTMLSelectElement).value;
                            if(!subcat) { alert("請選擇歸類小項"); return; }
                            handleAddCustomItem(subcat);
                        }} disabled={!customItem.name} className="w-full bg-white text-slate-900 rounded-xl py-3 font-black shadow-lg hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-2"><PlusIcon className="w-5 h-5" /> 加入規劃清單</button></div>
                    </div>
                </div>
              )}

              <div className="pt-8 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">報價單備註說明 (General Notes)</label>
                  <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl h-32 resize-none disabled:bg-slate-50 disabled:text-slate-400 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" value={notes} onChange={e => setNotes(e.target.value)} disabled={!isEditing} placeholder="請輸入工程規劃細節、施工條件說明 or 全域物料規格備註..."></textarea>
              </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 flex-shrink-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              {isEditing ? (
                  <>
                    {hasReport && <button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm font-bold transition-all active:scale-95">取消</button>}
                    <button onClick={handleSave} className="px-8 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-black flex items-center gap-2 transition-all active:scale-95"><CheckCircleIcon className="w-4 h-4" /> 提交規劃並儲存</button>
                  </>
              ) : <button onClick={() => setIsEditing(true)} className="px-8 py-2 rounded-xl bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200 font-black flex items-center gap-2 transition-all active:scale-95"><EditIcon className="w-5 h-5" /> 編輯報價單</button>}
          </div>
      </div>
  );
};

export default EngineeringPlanning;