import React, { useState, useEffect, useRef } from 'react';
import { Project, ConstructionItem, User, UserRole, ConstructionSignature, DailyReport, SitePhoto, ProjectType } from '../types';
import { DownloadIcon, PlusIcon, ClipboardListIcon, ArrowLeftIcon, ChevronRightIcon, TrashIcon, CheckCircleIcon as SubmitIcon, PenToolIcon, XIcon, StampIcon, XCircleIcon, SunIcon, CloudIcon, RainIcon, CameraIcon, LoaderIcon, FileTextIcon, BoxIcon, ImageIcon, EditIcon } from './Icons';
import { downloadBlob, processFile } from '../utils/fileHelpers';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';

declare const XLSX: any;
declare const html2canvas: any;
declare const jspdf: any;

interface ConstructionRecordProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
  forceEntryMode?: boolean; 
  initialDate?: string; 
}

const STANDARD_CONSTRUCTION_ITEMS = [
  { name: '立柱', unit: '支' },
  { name: '澆置', unit: '洞' },
  { name: '(雙模)前模', unit: '米' },
  { name: '(雙模)後模', unit: '米' },
  { name: '(雙模)螺桿', unit: '米' },
  { name: '(雙模)澆置', unit: '米' },
  { name: '(雙模)拆模', unit: '米' },
  { name: '(雙模)清潔', unit: '' },
  { name: '(雙模)收模', unit: '米' },
  { name: '三橫骨架', unit: '米' },
  { name: '封板', unit: '米' },
  { name: '(單模)組模', unit: '米' },
  { name: '(單模)澆置', unit: '米' },
  { name: '(單模)拆模', unit: '米' },
  { name: '(單模)清潔', unit: '' },
  { name: '(單模)收模', unit: '米' },
  { name: '安走骨架', unit: '米' },
  { name: '安走三橫', unit: '米' },
  { name: '安走封板', unit: '米' },
  { name: '隔音帆布骨架', unit: '米' },
  { name: '隔音帆布', unit: '米' },
  { name: '大門門片安裝', unit: '樘' },
];

const MAINTENANCE_CONSTRUCTION_ITEMS = [
  { name: '一般大門 (Cổng thông thường)', unit: '組/bộ' },
  { name: '日式拉門 (Cửa kéo kiểu Nhật)', unit: '組/bộ' },
  { name: '摺疊門 (Cửa xếp)', unit: '組/bộ' },
  { name: '(4", 5") 門柱 (Trụ cổng)', unit: '支/cây' },
  { name: '大門斜撐 (Thanh chống chéo cổng)', unit: '支/cây' },
  { name: '上拉桿 (Thanh kéo lên)', unit: '組/bộ' },
  { name: '後紐 (Nút sau)', unit: '片/tấm' },
  { name: '門栓、地栓 (Chốt cửa/Chốt sàn)', unit: '支/cây' },
  { name: '門片 (Cánh cửa)', unit: '片/tấm' },
  { name: '上軌道整修 (Sửa chữa ray trên)', unit: '支/thanh' },
  { name: '門片整修 (Sửa chữa cánh cửa)', unit: '組/bộ' },
  { name: '基礎座 (Chân đế)', unit: '個/cái' },
  { name: '下軌道 (Ray dưới)', unit: '米/mét' },
  { name: 'H型鋼立柱 (Cột thép hình H)', unit: '支/cây' },
  { name: '橫衍 (Thanh ngang)', unit: '米/mét' },
  { name: '簡易小門加工 (Gia công cửa nhỏ đơn)', unit: '樘/cửa' },
  { name: '簡易小門維修 (Sửa cửa nhỏ đơn giản)', unit: '式/kiểu' },
  { name: '小門後紐 (Nút sau cửa nhỏ)', unit: '個/cái' },
  { name: '甲種圍籬 (Hàng rào loại A)', unit: '米/mét' },
  { name: '乙種圍籬 (Hàng rào loại B)', unit: '米/mét' },
  { name: '防颱型圍籬 (Hàng rào công trình chống bão)', unit: '米/mét' },
  { name: '一般圍籬立柱 (Trụ hàng rào)', unit: '支/cây' },
  { name: '斜撐 (Chống chéo)', unit: '支/cây' },
  { name: '防颱型立柱 (Cột chống bão)', unit: '支/cây' },
  { name: '6米角鋼 (Thép góc)', unit: '支/cây' },
  { name: '長斜撐 (Dầm chéo dài)', unit: '支/cây' },
  { name: '一般鋼板 (Tấm thép thường)', unit: '片/tấm' },
  { name: '烤漆鋼板 (Thép tấm sơn tĩnh điện)', unit: '片/tấm' },
  { name: '鍍鋅鋼板 (Thép mạ kẽm)', unit: '片/tấm' },
  { name: '懸吊式骨架 (Khung treo)', unit: '支/cây' },
  { name: '懸吊式懸臂/短臂 (Cần treo kiểu treo)', unit: '支/cây' },
  { name: 'L收邊板 (Tấm vi園 chữ L)', unit: '片/tấm' },
  { name: '懸吊式安走鋼板 (Tấm thép lối đi an全)', unit: '片/tấm' },
];

const RESOURCE_ITEMS = [
    { name: '點工 (Công nhân theo ngày)', unit: '工/công' },
    { name: '吊卡 (Xe cẩu tự行)', unit: '式/chuyến' },
    { name: '怪手 (Máy đào)', unit: '式/chuyến' }
];

const ConstructionRecord: React.FC<ConstructionRecordProps> = ({ project, currentUser, onUpdateProject, forceEntryMode = false, initialDate }) => {
  const isMaintenance = project.type === ProjectType.MAINTENANCE;
  const mainTitle = isMaintenance ? '施工報告' : '施工紀錄';

  const [constructionMode, setConstructionMode] = useState<'overview' | 'entry'>(
    forceEntryMode ? 'entry' : (isMaintenance ? 'entry' : 'overview')
  );
  
  const [constructionDate, setConstructionDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [dailyWorker, setDailyWorker] = useState('');
  const [dailyAssistant, setDailyAssistant] = useState(''); 
  const [pendingAssistant, setPendingAssistant] = useState(''); 
  const [isHalfDay, setIsHalfDay] = useState(false); 
  const [customItem, setCustomItem] = useState({ name: '', quantity: '', unit: '', location: '' });
  
  const [isEditing, setIsEditing] = useState(true);
  const [resourceInputs, setResourceInputs] = useState<Record<string, string>>({});

  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<ConstructionSignature | null>(null);

  const [reportWeather, setReportWeather] = useState<'sunny' | 'cloudy' | 'rainy'>('sunny');
  const [reportContent, setReportContent] = useState('');
  const [reportPhotos, setReportPhotos] = useState<SitePhoto[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const reportPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  const canEdit = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;
  const currentStandardItems = isMaintenance ? MAINTENANCE_CONSTRUCTION_ITEMS : STANDARD_CONSTRUCTION_ITEMS;

  useEffect(() => {
    const items = (project.constructionItems || []).filter(i => i.date === constructionDate);
    if (items.length > 0) {
      setDailyWorker(items[0].worker || '');
      setDailyAssistant(items[0].assistant || '');
      
      const currentResources: Record<string, string> = {};
      RESOURCE_ITEMS.forEach(res => {
          const found = items.find(i => i.name === res.name);
          if (found) currentResources[res.name] = found.quantity;
      });
      setResourceInputs(currentResources);
    } else {
      setDailyWorker('');
      setDailyAssistant('');
      setResourceInputs({});
    }

    const existingSig = (project.constructionSignatures || []).find(s => s.date === constructionDate);
    setSignatureData(existingSig || null);

    const existingReport = (project.reports || []).find(r => r.date === constructionDate);
    if (existingReport) {
        setReportWeather(existingReport.weather);
        setReportContent(existingReport.content);
        const photos = (existingReport.photos || []).map(id => project.photos.find(p => p.id === id)).filter((p): p is SitePhoto => !!p);
        setReportPhotos(photos);
    } else {
        setReportWeather('sunny');
        setReportContent('');
        setReportPhotos([]);
    }
  }, [constructionDate, project.constructionItems, project.constructionSignatures, project.reports, project.photos]);

  const updateReportData = (updates: Partial<{ weather: 'sunny' | 'cloudy' | 'rainy', content: string, photos: SitePhoto[] }>) => {
      const newWeather = updates.weather || reportWeather;
      const newContent = updates.content !== undefined ? updates.content : reportContent;
      const newPhotos = updates.photos || reportPhotos;
      
      if (updates.weather) setReportWeather(updates.weather);
      if (updates.content !== undefined) setReportContent(updates.content);
      if (updates.photos) setReportPhotos(updates.photos);

      const otherReports = (project.reports || []).filter(r => r.date !== constructionDate);
      const existingPhotoIds = new Set(project.photos.map(p => p.id));
      const photosToAdd = newPhotos.filter(p => !existingPhotoIds.has(p.id));
      const updatedGlobalPhotos = [...project.photos, ...photosToAdd];

      const reportPayload: DailyReport = {
          id: (project.reports || []).find(r => r.date === constructionDate)?.id || crypto.randomUUID(),
          date: constructionDate,
          weather: newWeather,
          content: newContent,
          reporter: currentUser.name,
          timestamp: Date.now(),
          photos: newPhotos.map(p => p.id),
          worker: dailyWorker,
          assistant: dailyAssistant
      };

      const shouldSave = newContent || newPhotos.length > 0 || (project.reports || []).some(r => r.date === constructionDate);
      if (shouldSave) {
          onUpdateProject({ ...project, reports: [...otherReports, reportPayload], photos: updatedGlobalPhotos });
      }
  };

  const handleReportPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessingPhotos(true);
      const files = Array.from(e.target.files) as File[];
      const newPhotos: SitePhoto[] = [];
      for (const file of files) {
          try {
              const dataUrl = await processFile(file);
              newPhotos.push({ id: crypto.randomUUID(), url: dataUrl, timestamp: Date.now(), description: `${mainTitle}附件 - ${constructionDate}` });
          } catch (error) {
              alert("照片處理失敗");
          }
      }
      updateReportData({ photos: [...reportPhotos, ...newPhotos] });
      setIsProcessingPhotos(false);
      e.target.value = '';
    }
  };

  const removeReportPhoto = (id: string) => {
    updateReportData({ photos: reportPhotos.filter(p => p.id !== id) });
  };

  const handleAddItem = () => {
    const newItem: ConstructionItem = {
      id: crypto.randomUUID(),
      name: currentStandardItems[0].name,
      unit: currentStandardItems[0].unit,
      quantity: '',
      location: isMaintenance ? '裝/Lắp đặt' : '',
      worker: dailyWorker,
      assistant: dailyAssistant,
      date: constructionDate
    };
    onUpdateProject({ ...project, constructionItems: [...(project.constructionItems || []), newItem] });
  };

  const handleAddCustomItem = () => {
    if (!customItem.name) return;
    const newItem: ConstructionItem = {
      id: crypto.randomUUID(),
      name: customItem.name,
      quantity: customItem.quantity,
      unit: customItem.unit,
      location: customItem.location,
      worker: dailyWorker,
      assistant: dailyAssistant,
      date: constructionDate
    };
    onUpdateProject({ ...project, constructionItems: [...(project.constructionItems || []), newItem] });
    setCustomItem({ name: '', quantity: '', unit: '', location: '' });
  };

  const deleteConstructionItem = (id: string) => {
    onUpdateProject({ ...project, constructionItems: (project.constructionItems || []).filter(item => item.id !== id) });
  };

  const updateConstructionItem = (id: string, field: keyof ConstructionItem, value: any) => {
    const updatedItems = (project.constructionItems || []).map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'name') {
           const std = currentStandardItems.find(s => s.name === value);
           if (std) updatedItem.unit = std.unit;
        }
        return updatedItem;
      }
      return item;
    });
    onUpdateProject({ ...project, constructionItems: updatedItems });
  };

  const handleHeaderWorkerChange = (val: string) => {
    setDailyWorker(val);
    const updatedItems = (project.constructionItems || []).map(item => item.date === constructionDate ? { ...item, worker: val } : item);
    onUpdateProject({ ...project, constructionItems: updatedItems });
  };

  const getAssistantList = () => {
    return dailyAssistant ? dailyAssistant.split(',').map(s => s.trim()).filter(s => s !== '') : [];
  };

  const handleAddAssistant = () => {
    if (!pendingAssistant.trim()) return;
    const currentList = getAssistantList();
    const finalName = isHalfDay ? `${pendingAssistant.trim()} (半天)` : pendingAssistant.trim();
    
    if (currentList.includes(finalName)) {
        setPendingAssistant('');
        setIsHalfDay(false);
        return;
    }
    
    const newList = [...currentList, finalName];
    const joined = newList.join(', ');
    updateAssistantInItems(joined);
    
    setPendingAssistant('');
    setIsHalfDay(false);
  };

  const removeAssistant = (name: string) => {
    const newList = getAssistantList().filter(a => a !== name);
    const joined = newList.join(', ');
    updateAssistantInItems(joined);
  };

  const updateAssistantInItems = (joinedValue: string) => {
    setDailyAssistant(joinedValue);
    const updatedItems = (project.constructionItems || []).map(item => 
      item.date === constructionDate ? { ...item, assistant: joinedValue } : item
    );
    onUpdateProject({ ...project, constructionItems: updatedItems });
  };

  const handleAssistantInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddAssistant();
    }
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    setIsDrawing(true);
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath(); ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };
  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    if ('touches' in e) e.preventDefault();
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top); ctx.stroke();
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx!.fillStyle = '#ffffff'; ctx!.fillRect(0, 0, canvas.width, canvas.height);
    }
  };
  const saveSignature = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const newSig: ConstructionSignature = { id: crypto.randomUUID(), date: constructionDate, url: canvas.toDataURL('image/jpeg', 0.8), timestamp: Date.now() };
    const otherSignatures = (project.constructionSignatures || []).filter(s => s.date !== constructionDate);
    onUpdateProject({ ...project, constructionSignatures: [...otherSignatures, newSig] });
    setSignatureData(newSig); setIsSigning(false);
  };

  useEffect(() => {
    if (isSigning && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#000000'; }
    }
  }, [isSigning]);

  const handleSubmitLog = () => setIsEditing(false);

  const generateReportPDF = async (date: string) => {
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert("必要元件尚未載入"); return;
    }
    setIsGeneratingPDF(true);
    const items = (project.constructionItems || []).filter(i => i.date === date);
    const report = (project.reports || []).find(r => r.date === date);
    const signature = (project.constructionSignatures || []).find(s => s.date === date);

    // Prepare embedded JSON data
    const embeddedData = {
        meta: {
            source: "合家興管理系統",
            version: "1.1",
            exportTime: new Date().toISOString()
        },
        project: {
            id: project.id,
            name: project.name,
            type: project.type
        },
        record: {
            date: date,
            worker: items[0]?.worker || '',
            assistant: items[0]?.assistant || '',
            weather: report?.weather || 'sunny',
            content: report?.content || '',
            items: items.map(i => ({
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                location: i.location
            }))
        }
    };
    const jsonString = JSON.stringify(embeddedData);

    const container = document.createElement('div');
    container.style.position = 'fixed'; container.style.top = '-9999px'; container.style.left = '-9999px'; container.style.width = '800px'; container.style.backgroundColor = '#ffffff'; document.body.appendChild(container);
    const weatherText = report ? (report.weather === 'sunny' ? '晴天' : report.weather === 'cloudy' ? '陰天' : report.weather === 'rainy' ? '雨天' : '未紀錄') : '未紀錄';
    container.innerHTML = `<div style="font-family: 'Microsoft JhengHei', sans-serif; padding: 40px; color: #333; background: white;"><h1 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; font-size: 28px; font-weight: bold; margin-bottom: 25px;">${mainTitle}</h1><div style="display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 16px;"><div><span style="font-weight: bold;">專案：</span>${project.name}</div><div><span style="font-weight: bold;">日期：</span>${date}</div></div><div style="border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 30px; background-color: #f8f9fa;"><div style="margin-bottom: 8px;"><strong style="color: #4b5563;">人員：</strong> 師傅: ${items[0]?.worker || '無'} / 助手: ${items[0]?.assistant || '無'}</div><div><strong style="color: #4b5563;">天氣：</strong> ${weatherText}</div></div><div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-left: 5px solid #3b82f6; padding-left: 12px; color: #1f2937;">施工項目</div><table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 15px;"><thead><tr style="background-color: #f3f4f6;"><th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">#</th><th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left;">項目</th><th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">數量</th><th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">單位</th><th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left;">${isMaintenance ? '作業' : '位置'}</th></tr></thead><tbody>${items.length > 0 ? items.map((item, idx) => `<tr><td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${idx + 1}</td><td style="border: 1px solid #e5e7eb; padding: 10px;">${item.name}</td><td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.quantity}</td><td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.unit}</td><td style="border: 1px solid #e5e7eb; padding: 10px;">${item.location || ''}</td></tr>`).join('') : '<tr><td colspan="5" style="border: 1px solid #e5e7eb; padding: 20px; text-align: center;">無施工項目</td></tr>'}</tbody></table><div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-left: 5px solid #3b82f6; padding-left: 12px; color: #1f2937;">施工內容與備註</div><div style="white-space: pre-wrap; margin-bottom: 30px; border: 1px solid #e5e7eb; padding: 15px; min-height: 100px; border-radius: 4px;">${report ? report.content : '無內容'}</div><div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-left: 5px solid #3b82f6; padding-left: 12px; color: #1f2937;">現場照片</div><div style="grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; display: grid;">${report?.photos?.length ? report.photos.map(pid => { const photo = project.photos.find(p => p.id === pid); return photo ? `<div style="border: 1px solid #e5e7eb; padding: 8px; background: #fff;"><img src="${photo.url}" style="width: 100%; height: auto; display: block;" /></div>` : ''; }).join('') : '<div style="grid-column: span 2; padding: 20px; text-align: center;">無照片</div>'}</div>${signature ? `<div style="margin-top: 50px; display: flex; flex-direction: column; align-items: flex-end;"><div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">現場人員簽名：</div><div style="border-bottom: 2px solid #333;"><img src="${signature.url}" style="width: 350px; height: auto;" /></div></div>` : ''}</div>`;
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
        const canvas = await html2canvas(container, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        // Set metadata properties to embed the JSON data
        pdf.setProperties({
            title: `${project.name}_${mainTitle}_${date}`,
            subject: jsonString, // JSON Data is hidden in the subject metadata field
            keywords: '合家興管理系統, 施工數據嵌入',
            creator: '合家興 AI 行政管理系統'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData); const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = imgHeight; let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight); heightLeft -= pdfHeight;
        while (heightLeft > 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight); heightLeft -= pdfHeight; }
        downloadBlob(pdf.output('blob'), `${project.name}_${mainTitle}_${date}.pdf`);
    } catch (error) { alert("PDF 生成失敗"); } finally { document.body.removeChild(container); setIsGeneratingPDF(false); }
  };

  const generateReportExcel = async (date: string) => {
    setIsGeneratingExcel(true);
    try {
        const items = (project.constructionItems || []).filter(i => i.date === date);
        const report = (project.reports || []).find(r => r.date === date);
        const signature = (project.constructionSignatures || []).find(s => s.date === date);
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(date);

        // --- 常用樣式定義 ---
        const centerStyle: any = { vertical: 'middle', horizontal: 'center' };
        const leftStyle: any = { vertical: 'middle', horizontal: 'left', wrapText: true };
        const borderThin: any = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        const titleFont: any = { name: 'Microsoft JhengHei', size: 20, bold: true, underline: true };
        const headerFont: any = { name: 'Microsoft JhengHei', size: 11, bold: true };
        const contentFont: any = { name: 'Microsoft JhengHei', size: 10 };
        const blueAccentColor = 'FF1E40AF'; // 深藍色

        // 1. A1: 主標題 (置中底線大字，符合匯入規則需包含「施工報告 - 專案名稱」)
        worksheet.mergeCells('A1:E1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `${mainTitle} - ${project.name}`;
        titleCell.font = titleFont;
        titleCell.alignment = centerStyle;
        worksheet.getRow(1).height = 45;

        // 2. 日期、人員、天氣資訊 (灰色盒狀區域 A2:E4)
        const infoFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        
        // Row 2: 日期 (精準對應匯入規則 B2)
        worksheet.getCell('A2').value = '日期';
        worksheet.getCell('A2').font = headerFont;
        worksheet.getCell('B2').value = date;
        worksheet.getCell('B2').font = contentFont;
        worksheet.mergeCells('B2:E2');
        
        // Row 3: 人員 (精準對應匯入規則 B3)
        worksheet.getCell('A3').value = '人員';
        worksheet.getCell('A3').font = headerFont;
        worksheet.getCell('B3').value = `師傅: ${items[0]?.worker || '無'} / 助手: ${items[0]?.assistant || '無'}`;
        worksheet.getCell('B3').font = contentFont;
        worksheet.mergeCells('B3:E3');

        // Row 4: 天氣 (精準對應匯入規則 B4)
        const weatherText = report ? (report.weather === 'sunny' ? '晴天' : report.weather === 'cloudy' ? '陰天' : report.weather === 'rainy' ? '雨天' : '未紀錄') : '未紀錄';
        worksheet.getCell('A4').value = '天氣';
        worksheet.getCell('A4').font = headerFont;
        worksheet.getCell('B4').value = weatherText;
        worksheet.getCell('B4').font = contentFont;
        worksheet.mergeCells('B4:E4');

        // 套用資訊盒區域樣式
        for(let r=2; r<=4; r++) {
            for(let c=1; c<=5; c++) {
                const cell = worksheet.getRow(r).getCell(c);
                cell.fill = infoFill;
                cell.alignment = leftStyle;
                cell.border = borderThin;
            }
            worksheet.getRow(r).height = 25;
        }

        // 3. 施工項目 章節標頭 (Row 5)
        worksheet.getRow(5).height = 30;
        const section1Cell = worksheet.getCell('B5');
        section1Cell.value = '施工項目';
        section1Cell.font = { ...headerFont, size: 14, color: { argb: 'FF1E293B' } };
        section1Cell.alignment = leftStyle;
        // 左側藍色側條
        const accent1 = worksheet.getCell('A5');
        accent1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueAccentColor } };
        
        // 4. 表格表頭 (Row 6)
        const tableHeaderRow = worksheet.getRow(6);
        tableHeaderRow.height = 25;
        const headers = ['#', '項目', '數量', '單位', isMaintenance ? '作業' : '位置'];
        headers.forEach((h, i) => {
            const cell = tableHeaderRow.getCell(i + 1);
            cell.value = h;
            cell.font = { ...headerFont, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } }; // 深灰色
            cell.alignment = centerStyle;
            cell.border = borderThin;
        });

        // 5. 填寫項目數據 (從 Row 7 開始，精準對應匯入規則)
        let currentRow = 7;
        items.forEach((item, idx) => {
            const row = worksheet.getRow(currentRow);
            row.height = 22;
            row.getCell(1).value = idx + 1;
            row.getCell(2).value = item.name;
            row.getCell(3).value = item.quantity;
            row.getCell(4).value = item.unit;
            row.getCell(5).value = item.location || '';
            
            for(let i=1; i<=5; i++) {
                const cell = row.getCell(i);
                cell.font = contentFont;
                cell.alignment = i === 1 || i === 3 || i === 4 ? centerStyle : leftStyle;
                cell.border = borderThin;
            }
            currentRow++;
        });

        // 6. 施工內容與備註 章節標頭
        currentRow += 1;
        worksheet.getRow(currentRow).height = 30;
        const section2Cell = worksheet.getCell(`B${currentRow}`);
        section2Cell.value = '施工內容與備註';
        section2Cell.font = { ...headerFont, size: 14, color: { argb: 'FF1E293B' } };
        section2Cell.alignment = leftStyle;
        const accent2 = worksheet.getCell(`A${currentRow}`);
        accent2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueAccentColor } };

        // 7. 備註內容區塊
        currentRow += 1;
        const noteStartRow = currentRow;
        const noteCell = worksheet.getCell(`A${currentRow}`);
        noteCell.value = report ? report.content : '無內容';
        noteCell.font = contentFont;
        noteCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        worksheet.mergeCells(`A${currentRow}:E${currentRow + 4}`);
        // 畫框
        for(let r=currentRow; r<=currentRow+4; r++) {
            worksheet.getRow(r).height = 20;
            for(let c=1; c<=5; c++) {
                worksheet.getRow(r).getCell(c).border = borderThin;
            }
        }
        currentRow += 5;

        // 8. 現場照片 章節標頭
        currentRow += 1;
        worksheet.getRow(currentRow).height = 30;
        const section3Cell = worksheet.getCell(`B${currentRow}`);
        section3Cell.value = '現場照片';
        section3Cell.font = { ...headerFont, size: 14, color: { argb: 'FF1E293B' } };
        section3Cell.alignment = leftStyle;
        const accent3 = worksheet.getCell(`A${currentRow}`);
        accent3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueAccentColor } };
        currentRow += 1;

        // 9. 插入簽名圖片
        if (signature) {
            const splitData = signature.url.split(',');
            if (splitData.length > 1) {
                const imageId = workbook.addImage({
                    base64: splitData[1],
                    extension: 'jpeg',
                });
                
                const sigLabelRow = currentRow + 2;
                const sigLabelCell = worksheet.getCell(`D${sigLabelRow}`);
                sigLabelCell.value = '現場人員簽名：';
                sigLabelCell.font = headerFont;
                sigLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
                
                worksheet.addImage(imageId, {
                    tl: { col: 3.8, row: sigLabelRow + 0.2 },
                    ext: { width: 140, height: 60 }
                });
                currentRow += 6;
            }
        } else {
            // 無照片提示
            const noPhotoCell = worksheet.getCell(`A${currentRow}`);
            noPhotoCell.value = '無照片';
            noPhotoCell.font = { ...contentFont, italic: true, color: { argb: 'FF94A3B8' } };
            noPhotoCell.alignment = centerStyle;
            worksheet.mergeCells(`A${currentRow}:E${currentRow + 2}`);
            currentRow += 3;
        }

        // 設定欄寬
        worksheet.getColumn(1).width = 7;
        worksheet.getColumn(2).width = 35;
        worksheet.getColumn(3).width = 12;
        worksheet.getColumn(4).width = 10;
        worksheet.getColumn(5).width = 30;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        downloadBlob(blob, `${project.name}_${mainTitle}_${date}.xlsx`);
    } catch (error) {
        console.error("Excel 匯出錯誤:", error);
        alert("Excel 匯出失敗");
    } finally {
        setIsGeneratingExcel(false);
    }
  };

  const handleExportPartitionTable = async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        const allItems = project.constructionItems || [];
        if (allItems.length === 0) { alert("尚無施工紀錄可供匯出"); return; }

        // 定義樣式與常數
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        const centerAlign = { horizontal: 'center', vertical: 'middle' };

        // 依「位置」分組
        const locationGroups: Record<string, ConstructionItem[]> = {};
        allItems.forEach(item => {
            const loc = item.location || '未分類位置';
            if (!locationGroups[loc]) locationGroups[loc] = [];
            locationGroups[loc].push(item);
        });

        // 針對每個位置建立一個工作表
        Object.keys(locationGroups).forEach(locName => {
            const worksheet = workbook.addWorksheet(locName.substring(0, 31)); // Excel 工作表名稱限制 31 字元
            const groupItems = locationGroups[locName];

            // 整理此位置下的所有施作欄位 (以日期 + 師傅作為唯一紀錄)
            const sessionsMap: Record<string, { date: string, worker: string, location: string }> = {};
            groupItems.forEach(item => {
                const key = `${item.date}_${item.worker}`;
                if (!sessionsMap[key]) {
                    sessionsMap[key] = { date: item.date, worker: item.worker, location: item.location || '' };
                }
            });
            const sortedSessionKeys = Object.keys(sessionsMap).sort();
            const sessionCount = sortedSessionKeys.length;

            // 設定基本寬度
            worksheet.getColumn(1).width = 8;  // 項次
            worksheet.getColumn(2).width = 25; // 工程項目
            worksheet.getColumn(3).width = 10; // 標籤欄 (位置/師傅/日期)
            for(let i = 0; i < sessionCount; i++) { worksheet.getColumn(4 + i).width = 15; }

            // --- 產生表頭 (位置、師傅、日期) ---
            const rowLocation = worksheet.getRow(1);
            rowLocation.getCell(3).value = '位置';
            sortedSessionKeys.forEach((key, idx) => {
                rowLocation.getCell(4 + idx).value = sessionsMap[key].location;
            });

            const rowWorker = worksheet.getRow(2);
            rowWorker.getCell(3).value = '師傅';
            sortedSessionKeys.forEach((key, idx) => {
                rowWorker.getCell(4 + idx).value = sessionsMap[key].worker;
            });

            const rowDate = worksheet.getRow(3);
            rowDate.getCell(3).value = '日期';
            sortedSessionKeys.forEach((key, idx) => {
                rowDate.getCell(4 + idx).value = sessionsMap[key].date;
            });

            // 合併左上角單元格並設定標題
            worksheet.mergeCells('A1:A3');
            worksheet.getCell('A1').value = '項次';
            worksheet.mergeCells('B1:B3');
            worksheet.getCell('B1').value = '工程項目';

            // 標題樣式套用
            ['A1', 'B1', 'C1', 'C2', 'C3'].forEach(addr => {
                const cell = worksheet.getCell(addr);
                cell.fill = headerFill as any;
                cell.font = { bold: true };
                cell.alignment = centerAlign as any;
            });
            // 數據列標題也套用樣式
            for(let i = 0; i < sessionCount; i++) {
                [1, 2, 3].forEach(r => {
                    const cell = worksheet.getRow(r).getCell(4 + i);
                    cell.fill = headerFill as any;
                    cell.alignment = centerAlign as any;
                });
            }

            // --- 填充標準項目 (1-22) ---
            STANDARD_CONSTRUCTION_ITEMS.forEach((stdItem, idx) => {
                const rowIdx = 4 + idx;
                const row = worksheet.getRow(rowIdx);
                row.getCell(1).value = idx + 1;
                row.getCell(2).value = `${stdItem.name} (${stdItem.unit})`;
                
                sortedSessionKeys.forEach((sessionKey, colOffset) => {
                    const sessionData = sessionsMap[sessionKey];
                    const match = groupItems.find(i => i.date === sessionData.date && i.worker === sessionData.worker && i.name === stdItem.name);
                    if (match) {
                        row.getCell(4 + colOffset).value = parseFloat(match.quantity) || match.quantity;
                    }
                });
            });

            // --- 填充其他項目 (不在 22 項內的) ---
            const otherItems = groupItems.filter(i => !STANDARD_CONSTRUCTION_ITEMS.some(std => std.name === i.name));
            const otherNames = Array.from(new Set(otherItems.map(i => i.name)));
            
            let currentOtherRow = 4 + STANDARD_CONSTRUCTION_ITEMS.length;
            if (otherNames.length > 0) {
                const otherLabelRow = worksheet.getRow(currentOtherRow);
                otherLabelRow.getCell(1).value = '其他';
                worksheet.mergeCells(`A${currentOtherRow}:C${currentOtherRow}`);
                otherLabelRow.getCell(1).font = { bold: true };
                otherLabelRow.getCell(1).fill = headerFill as any;
                currentOtherRow++;

                otherNames.forEach(name => {
                    const row = worksheet.getRow(currentOtherRow);
                    const unit = otherItems.find(i => i.name === name)?.unit || '';
                    row.getCell(2).value = `${name} (${unit})`;

                    sortedSessionKeys.forEach((sessionKey, colOffset) => {
                        const sessionData = sessionsMap[sessionKey];
                        const match = otherItems.find(i => i.date === sessionData.date && i.worker === sessionData.worker && i.name === name);
                        if (match) {
                            row.getCell(4 + colOffset).value = parseFloat(match.quantity) || match.quantity;
                        }
                    });
                    currentOtherRow++;
                });
            }

            // 全局邊框與對齊套用
            worksheet.eachRow(row => {
                row.eachCell(cell => {
                    cell.border = borderStyle as any;
                    if (!cell.alignment) cell.alignment = centerAlign as any;
                });
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        downloadBlob(blob, `${project.name}_施工分區彙整表.xlsx`);
    } catch (err) {
        console.error(err);
        alert("分區表匯出失敗");
    }
  };

  const renderConstructionOverview = () => {
    const groupedItems = (project.constructionItems || []).reduce((acc: any, item) => {
      if (!acc[item.date]) acc[item.date] = { date: item.date, worker: item.worker, assistant: item.assistant, count: 0 };
      acc[item.date].count++;
      if (!acc[item.date].worker) acc[item.date].worker = item.worker;
      return acc;
    }, {});
    const sortedDates = Object.values(groupedItems).sort((a: any, b: any) => b.date.localeCompare(a.date)) as any[];
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div><h3 className="font-bold text-lg text-slate-800">{mainTitle}總覽</h3><p className="text-sm text-slate-500">檢視所有已提交的{mainTitle}</p></div>
          <div className="flex gap-2">
            <button 
                onClick={handleExportPartitionTable}
                className="bg-white border border-slate-300 text-slate-600 hover:text-blue-600 w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-colors" 
                title="匯出分區彙整表"
            >
              <DownloadIcon className="w-5 h-5" />
            </button>
            {canEdit && <button onClick={() => { setConstructionDate(new Date().toISOString().split('T')[0]); setIsEditing(true); setConstructionMode('entry'); }} className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-colors"><PlusIcon className="w-6 h-6" /></button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold"><tr><th className="px-6 py-4">日期</th><th className="px-6 py-4">師傅</th><th className="px-6 py-4 text-center">簽證</th><th className="px-6 py-4 text-right">操作</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{sortedDates.length > 0 ? sortedDates.map((item) => (
              <tr key={item.date} onClick={() => { setConstructionDate(item.date); setIsEditing(false); setConstructionMode('entry'); }} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                <td className="px-6 py-4 font-medium text-slate-800">{item.date}</td>
                <td className="px-6 py-4 text-slate-600">{item.worker || '-'}</td>
                <td className="px-6 py-4 text-center">{(project.constructionSignatures || []).some(s => s.date === item.date) ? <StampIcon className="w-5 h-5 text-green-600 mx-auto" /> : <XCircleIcon className="w-5 h-5 text-slate-300 mx-auto" />}</td>
                <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={(e) => { e.stopPropagation(); generateReportExcel(item.date); }} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded" title="匯出 Excel"><DownloadIcon className="w-4 h-4" /></button><button onClick={(e) => { e.stopPropagation(); generateReportPDF(item.date); }} className="p-1.5 text-slate-400 hover:text-green-600 rounded" title="匯出 PDF"><FileTextIcon className="w-4 h-4" /></button></div></td>
              </tr>
            )) : <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">尚無紀錄</td></tr>}</tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderConstructionEntry = () => {
    const visibleItems = (project.constructionItems || []).filter(item => item.date === constructionDate);
    const currentAssistants = getAssistantList();

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
        <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="flex flex-row justify-between items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                 {!isMaintenance && <button onClick={() => setConstructionMode('overview')} className="text-slate-400 hover:text-slate-600 p-2 -ml-2"><ArrowLeftIcon className="w-5 h-5" /></button>}
                 <h3 className="font-bold text-lg text-slate-800">{isMaintenance ? '施工報告 (Báo cáo thi công)' : '編輯紀錄'}</h3>
              </div>
            <div className="flex items-center gap-1">
                <button onClick={() => generateReportExcel(constructionDate)} disabled={isGeneratingExcel} className="p-2 text-slate-500 hover:text-emerald-600 rounded-full" title="匯出 Excel">{isGeneratingExcel ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <DownloadIcon className="w-5 h-5" />}</button>
                <button onClick={() => generateReportPDF(constructionDate)} disabled={isGeneratingPDF} className="p-2 text-slate-500 hover:text-blue-600 rounded-full" title="匯出 PDF">{isGeneratingPDF ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <FileTextIcon className="w-5 h-5" />}</button>
                {signatureData && <div className="text-green-600 flex items-center gap-1 text-xs font-bold border border-green-200 bg-green-50 px-2 py-1 rounded ml-1"><StampIcon className="w-3.5 h-3.5" /><span>已簽證</span></div>}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <label className="block text-xs font-semibold text-slate-500 mb-1">日期 (Ngày)</label>
            <input type="date" value={constructionDate} disabled={!isEditing || !canEdit} onChange={(e) => setConstructionDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold"><tr><th className="px-4 py-3 w-12 text-center">#</th><th className="px-4 py-3 min-w-[120px]">工程項目</th><th className="px-4 py-3 w-20 text-center">數量</th><th className="px-4 py-3 w-16 text-center">單位</th><th className="px-4 py-3 min-w-[100px]">{isMaintenance ? '作業' : '位置'}</th>{canEdit && isEditing && <th className="px-4 py-3 w-12 text-center">刪</th>}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visibleItems.length > 0 ? visibleItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3">{canEdit && isEditing ? <select className="w-full bg-transparent border-b border-transparent focus:border-blue-500 py-1 outline-none" value={item.name} onChange={(e) => updateConstructionItem(item.id, 'name', e.target.value)}>{currentStandardItems.map(opt => <option key={opt.name} value={opt.name}>{opt.name}</option>)}</select> : <span className="font-medium text-slate-800">{item.name}</span>}</td>
                  <td className="px-4 py-3">{canEdit && isEditing ? <input type="text" className="w-full bg-transparent border-b border-transparent focus:border-blue-500 py-1 text-center outline-none" value={item.quantity} onChange={(e) => updateConstructionItem(item.id, 'quantity', e.target.value)} /> : <span className="text-slate-700 block text-center">{item.quantity}</span>}</td>
                  <td className="px-4 py-3 text-slate-500 text-center">{item.unit}</td>
                  <td className="px-4 py-3">{isMaintenance ? <select className="w-full bg-transparent border-b border-transparent focus:border-blue-500 py-1 outline-none" value={item.location} onChange={(e) => updateConstructionItem(item.id, 'location', e.target.value)} disabled={!canEdit || !isEditing}><option value="裝/Lắp đặt">裝 (Lắp)</option><option value="拆/Phá dỡ">拆 (Dỡ)</option></select> : (canEdit && isEditing ? <input type="text" className="w-full bg-transparent border-b border-transparent focus:border-blue-500 py-1 outline-none" value={item.location} onChange={(e) => updateConstructionItem(item.id, 'location', e.target.value)} /> : <span className="text-slate-700">{item.location || '-'}</span>)}</td>
                  {canEdit && isEditing && <td className="px-4 py-3 text-center"><button onClick={() => deleteConstructionItem(item.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button></td>}
                </tr>
              )) : <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">尚無項目</td></tr>}
            </tbody>
          </table>
          
          {canEdit && isEditing && (
            <div className="space-y-4 px-4 mt-6 pb-6">
                <button onClick={handleAddItem} className="w-full py-3 bg-white border border-dashed border-slate-300 rounded-lg text-blue-600 hover:bg-slate-50 font-medium text-sm flex items-center justify-center gap-2"><PlusIcon className="w-4 h-4" /> 新增標準項目</button>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">自訂項目</h4>
                    <div className="grid grid-cols-12 gap-2">
                       <div className="col-span-12 md:col-span-4"><input type="text" placeholder="名稱" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} /></div>
                       <div className="col-span-6 md:col-span-2"><input type="text" placeholder="數量" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" value={customItem.quantity} onChange={e => setCustomItem({...customItem, quantity: e.target.value})} /></div>
                       <div className="col-span-6 md:col-span-2"><input type="text" placeholder="單位" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" value={customItem.unit} onChange={e => setCustomItem({...customItem, unit: e.target.value})} /></div>
                       <div className="col-span-10 md:col-span-3">{isMaintenance ? <select className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" value={customItem.location} onChange={e => setCustomItem({...customItem, location: e.target.value})}><option value="">作業</option><option value="裝/Lắp đặt">裝 (Lắp)</option><option value="拆/Phá dỡ">拆 (Dỡ)</option></select> : <input type="text" placeholder="位置" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none" value={customItem.location} onChange={e => setCustomItem({...customItem, location: e.target.value})} />}</div>
                       <div className="col-span-2 md:col-span-1"><button onClick={handleAddCustomItem} disabled={!customItem.name} className="w-full h-full bg-slate-800 text-white rounded flex items-center justify-center disabled:opacity-50"><PlusIcon className="w-4 h-4" /></button></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div><label className="block text-xs font-semibold text-slate-500 mb-1">師傅</label><input type="text" list="employee-nicknames-list" value={dailyWorker} onChange={(e) => handleHeaderWorkerChange(e.target.value)} placeholder="輸入姓名" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">助手清單</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">{currentAssistants.map(name => (<span key={name} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold border border-blue-200">{name}<button onClick={() => removeAssistant(name)}><XCircleIcon className="w-3.5 h-3.5" /></button></span>))}</div>
                        <div className="flex gap-2">
                            <input type="text" list="employee-nicknames-list" value={pendingAssistant} onKeyDown={handleAssistantInputKeyDown} onChange={(e) => setPendingAssistant(e.target.value)} placeholder="輸入助手姓名" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-2 rounded-lg border border-slate-200">
                                <input 
                                    type="checkbox" id="half-day-record-fixed" 
                                    checked={isHalfDay} 
                                    onChange={(e) => setIsHalfDay(e.target.checked)} 
                                    className="w-4 h-4 text-blue-600 rounded" 
                                />
                                <label htmlFor="half-day-record-fixed" className="text-xs font-bold text-slate-600 cursor-pointer whitespace-nowrap">半天</label>
                            </div>
                            <button onClick={handleAddAssistant} disabled={!pendingAssistant.trim()} className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center"><PlusIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-6 mt-6">
                    <h3 className="font-bold text-lg text-slate-800 mb-4">回報內容</h3>
                    <div className="space-y-4">
                        <div><label className="block text-xs font-semibold text-slate-500 mb-2">天氣</label><div className="flex gap-2">{['sunny', 'cloudy', 'rainy'].map((w) => (<button key={w} onClick={() => updateReportData({ weather: w as any })} className={`flex-1 py-2 rounded-md border flex justify-center items-center ${reportWeather === w ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200'}`}>{w === 'sunny' && <SunIcon className="w-5 h-5" />}{w === 'cloudy' && <CloudIcon className="w-5 h-5" />}{w === 'rainy' && <RainIcon className="w-5 h-5" />}</button>))}</div></div>
                        <div><label className="block text-xs font-semibold text-slate-500 mb-2">備註</label><textarea value={reportContent} onChange={e => updateReportData({ content: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm h-24 resize-none" placeholder="施工重點..." /></div>
                        <div><label className="block text-xs font-semibold text-slate-500 mb-2">現場照片</label><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2"><button onClick={() => reportPhotoInputRef.current?.click()} disabled={isProcessingPhotos} className="aspect-square border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center">{isProcessingPhotos ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <CameraIcon className="w-6 h-6" />}</button><input type="file" multiple accept="image/*" ref={reportPhotoInputRef} className="hidden" onChange={handleReportPhotoUpload} />{reportPhotos.map(p => (<div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200"><img src={p.url} className="w-full h-full object-cover" /><button onClick={() => removeReportPhoto(p.id)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><XIcon className="w-3.5 h-3.5" /></button></div>))}</div></div>
                    </div>
                </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-white flex justify-between gap-3 flex-shrink-0 z-20 shadow-md">
            {!isMaintenance ? <button onClick={() => setConstructionMode('overview')} className="w-12 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500"><ArrowLeftIcon className="w-5 h-5" /></button> : <div />}
            <div className="flex gap-2">
                {isEditing && <button onClick={() => setIsSigning(true)} className="w-12 h-10 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200"><PenToolIcon className="w-5 h-5" /></button>}
                {isEditing ? <button onClick={handleSubmitLog} className="px-6 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm font-bold flex items-center gap-2"><SubmitIcon className="w-4 h-4" /> 提交</button> : <button onClick={() => setIsEditing(true)} className="px-6 h-10 rounded-lg bg-slate-800 text-white hover:bg-slate-900 shadow-sm font-bold flex items-center gap-2"><EditIcon className="w-4 h-4" /> 修改</button>}
            </div>
        </div>
        
        {isSigning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-lg text-slate-800">簽證簽名</h3><button onClick={() => setIsSigning(false)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6" /></button></div>
                    <div className="p-4 bg-slate-200 flex items-center justify-center"><canvas ref={canvasRef} width={340} height={200} className="bg-white shadow-md cursor-crosshair touch-none rounded-lg" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} /></div>
                    <div className="p-4 border-t border-slate-100 flex justify-between gap-3"><button onClick={clearSignature} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><TrashIcon className="w-5 h-5" /></button><div className="flex gap-2"><button onClick={() => setIsSigning(false)} className="px-4 py-2 text-slate-500 text-sm">取消</button><button onClick={saveSignature} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm">確認儲存</button></div></div>
                </div>
            </div>
        )}
      </div>
    );
  };

  return constructionMode === 'overview' ? renderConstructionOverview() : renderConstructionEntry();
};

export default ConstructionRecord;