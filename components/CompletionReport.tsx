
import React, { useState, useRef, useEffect } from 'react';
import { Project, User, CompletionReport as CompletionReportType, CompletionItem, SystemRules } from '../types';
import { PlusIcon, FileTextIcon, TrashIcon, PenToolIcon, XIcon, StampIcon, CheckCircleIcon, EditIcon, LoaderIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';

declare const html2canvas: any;
declare const jspdf: any;

// Fix: Added systemRules to CompletionReportProps to match usage in ProjectDetail.tsx
interface CompletionReportProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
}

// Define Categories and their items
const CATEGORIES = {
    FENCE: {
        id: 'FENCE',
        label: '圍籬 (Hàng rào)',
        defaultUnit: '米',
        items: [
            "一般型安裝 (Hàng rào loại tiêu chuẩn)",
            "防颱型安裝 (Hàng rào loại chống bão)",
            "懸吊式安全走廊安裝 (Lắp đặt hành lang an toàn treo)"
        ]
    },
    BARRIER: {
        id: 'BARRIER',
        label: '防溢座 (Bệ chống tràn)',
        defaultUnit: '米',
        items: [
            "30cm單模 (Khuôn đơ)", "30cm雙模 (Khuôn đôi)", "30cm假模 (Khuôn giả)",
            "60cm單模 (Khuôn đơn)", "60cm雙模 (Khuôn đôi)", "60cm假模 (Khuôn giả)"
        ]
    },
    DOOR: {
        id: 'DOOR',
        label: '門 (Cửa)',
        defaultUnit: '組',
        items: [
            "一般大門 (Cửa chính loại tiêu chuẩn)",
            "日式拉門 (Cửa trượt kiểu Nhật)",
            "客製化小門 (Cửa nhỏ tùy chỉnh)",
            "簡易小門加工 (Gia công cửa nhỏ đơn giản)"
        ]
    },
    OTHER: {
        id: 'OTHER',
        label: '其他 (Khác)',
        defaultUnit: '',
        items: [
            "警示燈 (Đèn cảnh báo)",
            "巨型告示牌 (Biển báo khổng lồ)",
            "告示牌 (Biển báo)",
            "五合一偵測器 (Bộ cảm biến 5 trong 1)"
        ]
    }
};

const RESOURCE_ITEMS = [
    { name: '點工 (Công nhân theo ngày)', unit: '工/công', category: 'RESOURCES' },
    { name: '吊卡 (Xe cẩu tự hành)', unit: '式/chuyến', category: 'RESOURCES' },
    { name: '怪手 (Máy đào)', unit: '式/chuyến', category: 'RESOURCES' }
];

// Fix: Destructured systemRules in CompletionReport component signature.
const CompletionReport: React.FC<CompletionReportProps> = ({ project, currentUser, onUpdateProject, systemRules }) => {
  // State
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEditing, setIsEditing] = useState(true);
  
  // Form Data (Local State)
  const [worker, setWorker] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CompletionItem[]>([]);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  // New Item State
  const [customItem, setCustomItem] = useState({ name: '', action: 'install' as 'install'|'dismantle', quantity: '', unit: '' });

  // Signature UI State
  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // PDF Loading
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Helper to check if report exists for current date
  const hasReport = (project.completionReports || []).some(r => r.date === reportDate);

  // Load data when date changes
  useEffect(() => {
    const existingReport = (project.completionReports || []).find(r => r.date === reportDate);
    
    if (existingReport) {
        setWorker(existingReport.worker);
        setNotes(existingReport.notes);
        // Migration: Ensure items have category and unit if missing
        const migratedItems = (existingReport.items || []).map(item => {
            let cat = item.category;
            let unit = item.unit;
            
            if (!cat || !unit) {
                // Try to deduce
                if (CATEGORIES.FENCE.items.includes(item.name)) { cat = 'FENCE'; unit = unit || '米'; }
                else if (CATEGORIES.BARRIER.items.includes(item.name)) { cat = 'BARRIER'; unit = unit || '米'; }
                else if (CATEGORIES.DOOR.items.includes(item.name)) { cat = 'DOOR'; unit = unit || '組'; }
                else if (RESOURCE_ITEMS.some(r => r.name === item.name)) { cat = 'RESOURCES'; unit = unit || RESOURCE_ITEMS.find(r => r.name === item.name)?.unit || ''; }
                else { cat = 'OTHER'; unit = unit || ''; }
            }
            return { ...item, category: cat, unit: unit };
        });

        setItems(migratedItems);
        setSignatureUrl(existingReport.signature);
        setIsEditing(false); // Default to view mode if exists
    } else {
        // Reset for new entry
        setWorker('');
        setNotes('');
        setItems([]);
        setSignatureUrl(null);
        setIsEditing(true); // Default to edit mode for new
    }
  }, [reportDate, project.completionReports, currentUser.name]);

  const handleSave = () => {
      const newReport: CompletionReportType = {
          id: (project.completionReports || []).find(r => r.date === reportDate)?.id || crypto.randomUUID(),
          date: reportDate,
          worker,
          items,
          notes,
          signature: signatureUrl || '',
          timestamp: Date.now()
      };

      const otherReports = (project.completionReports || []).filter(r => r.date !== reportDate);
      const updatedReports = [...otherReports, newReport];

      onUpdateProject({
          ...project,
          completionReports: updatedReports
      });
      
      setIsEditing(false);
  };

  const handleDeleteItem = (index: number) => {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
  };

  const handleAddCategoryItem = (catId: string) => {
      const cat = CATEGORIES[catId as keyof typeof CATEGORIES];
      setItems([...items, { 
          name: cat.items[0], 
          action: 'install', 
          quantity: '', 
          unit: cat.defaultUnit,
          category: catId 
      }]);
  };

  const handleAddCustomItem = () => {
      if (!customItem.name) return;
      setItems([...items, { 
          name: customItem.name, 
          action: customItem.action, 
          quantity: customItem.quantity,
          unit: customItem.unit,
          category: 'OTHER'
      }]);
      setCustomItem({ name: '', action: 'install', quantity: '', unit: '' });
  };

  const updateItem = (index: number, field: keyof CompletionItem, value: any) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      if (field === 'name') {
           const currentCatId = newItems[index].category;
           if (currentCatId !== 'RESOURCES' && currentCatId !== 'OTHER') {
             const cat = CATEGORIES[currentCatId as keyof typeof CATEGORIES];
             if (cat && cat.defaultUnit) {
                 newItems[index].unit = cat.defaultUnit;
             }
           }
      }
      setItems(newItems);
  };

  const handleResourceChange = (name: string, unit: string, qty: string) => {
      const existingIdx = items.findIndex(i => i.name === name);
      let newItems = [...items];

      if (!qty || qty === '0') {
          if (existingIdx !== -1) {
              newItems.splice(existingIdx, 1);
          }
      } else {
          if (existingIdx !== -1) {
              newItems[existingIdx] = { ...newItems[existingIdx], quantity: qty };
          } else {
              newItems.push({
                  name: name,
                  action: 'none',
                  quantity: qty,
                  unit: unit,
                  category: 'RESOURCES'
              });
          }
      }
      setItems(newItems);
  };

  // --- Signature Logic ---
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      setIsDrawing(true);
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e as React.MouseEvent;
      const rect = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if ('touches' in e) e.preventDefault();
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e as React.MouseEvent;
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(clientX - rect.left, clientY - rect.top);
      ctx.stroke();
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearSignature = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx!.fillStyle = '#ffffff';
          ctx!.fillRect(0, 0, canvas.width, canvas.height);
      }
  };
  const saveSignature = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          setSignatureUrl(canvas.toDataURL('image/jpeg', 0.8));
          setIsSigning(false);
      }
  };
  useEffect(() => {
    if (isSigning && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000000';
        }
    }
  }, [isSigning]);


  // --- PDF Generation ---
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
    container.style.width = '800px'; 
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    const checkMark = `<span style="font-family: Arial; font-size: 16px;">&#9745;</span>`;
    const emptyBox = `<span style="font-family: Arial; font-size: 16px;">&#9744;</span>`;

    const renderCategorySection = (catKey: string) => {
        const cat = CATEGORIES[catKey as keyof typeof CATEGORIES];
        const categoryItems = items.filter(i => i.category === catKey);

        if (categoryItems.length === 0) return '';

        const rows = categoryItems.map((item, idx) => `
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 6px; font-size: 14px;">${item.name}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.action === 'install' ? checkMark : emptyBox} 裝Lắp đặt</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.action === 'dismantle' ? checkMark : emptyBox} 拆Phá dỡ</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.unit}</td>
            </tr>
        `).join('');

        return `
            <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px; background-color: #e5e7eb; padding: 5px;">${cat.label}</div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f9fafb;">
                            <th style="border: 1px solid #000; padding: 5px; width: 5%;">#</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 40%;">項目 (Hạng mục)</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 15%;">裝 (Lắp)</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 15%;">拆 (Dỡ)</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 12%;">數量 (SL)</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 13%;">單位 (ĐV)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    };

    const renderResourcesSection = () => {
        const resourceItems = items.filter(i => i.category === 'RESOURCES');
        if (resourceItems.length === 0) return '';

        const rows = resourceItems.map((item, idx) => `
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 6px; font-size: 14px;">${item.name}</td>
                <td colspan="2" style="border: 1px solid #000; padding: 6px; text-align: center; color: #666;">資源項目</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.unit}</td>
            </tr>
        `).join('');

        return `
            <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px; background-color: #ffedd5; padding: 5px; color: #9a3412;">資源與其他 (Tài nguyên & Khác)</div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #fffaf0;">
                            <th style="border: 1px solid #000; padding: 5px; width: 5%;">#</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 40%;">項目 (Tên)</th>
                            <th colspan="2" style="border: 1px solid #000; padding: 5px; width: 30%;">說明 (Mô tả)</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 12%;">數量 (SL)</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 13%;">單位 (ĐV)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    };

    const categoriesHtml = Object.keys(CATEGORIES).map(renderCategorySection).join('');
    const resourcesHtml = renderResourcesSection();

    container.innerHTML = `
        <div style="font-family: 'Microsoft JhengHei', sans-serif; padding: 40px; color: #000; background: white;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 24px; font-weight: bold; margin: 0;">合家興實業有限公司</h1>
                <h2 style="font-size: 20px; font-weight: normal; margin: 5px 0; text-decoration: underline;">派工單 / 完工報告</h2>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                <div><span style="font-weight: bold;">日期 (ngày)：</span> ${reportDate}</div>
            </div>
             <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
                <div><span style="font-weight: bold;">案場 (công trường)：</span> ${project.name}</div>
            </div>

            ${items.length > 0 ? (categoriesHtml + resourcesHtml) : '<div style="text-align: center; padding: 20px; border: 1px solid #ccc;">無項目</div>'}

            <div style="border: 1px solid #000; padding: 10px; min-height: 80px; margin-bottom: 20px; margin-top: 20px;">
                <div style="font-weight: bold; margin-bottom: 5px;">備註 (Ghi chú):</div>
                <div style="white-space: pre-wrap;">${notes || ''}</div>
            </div>

             <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px;">
                <div style="width: 40%;">
                    <div style="font-weight: bold; margin-bottom: 5px;">現場人員 (Người thi công):</div>
                    <div style="border-bottom: 1px solid #000; padding: 5px; font-size: 16px;">${worker || ''}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: bold; margin-bottom: 10px;">簽名 (Ký tên):</div>
                    ${signatureUrl ? `<img src="${signatureUrl}" style="max-height: 80px; max-width: 200px;" />` : '<div style="height: 80px; width: 200px; border-bottom: 1px solid #000;"></div>'}
                </div>
            </div>
        </div>
    `;

    // Slight delay for rendering
    await new Promise(resolve => setTimeout(resolve, 500));

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

        downloadBlob(pdf.output('blob'), `${project.name}_完工報告_${reportDate}.pdf`);
    } catch (e) {
        console.error(e);
        alert("PDF 生成失敗");
    } finally {
        document.body.removeChild(container);
        setIsGeneratingPDF(false);
    }
  };

  const renderSection = (catKey: keyof typeof CATEGORIES) => {
      const cat = CATEGORIES[catKey];
      const categoryItems = items
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.category === catKey);

      if (!isEditing && categoryItems.length === 0) return null;

      return (
        <div key={catKey} className="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700 text-sm border-b border-slate-200">
                {cat.label}
            </div>
            
            {categoryItems.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-3 py-2 w-10 text-center">#</th>
                                <th className="px-3 py-2 min-w-[180px]">項目</th>
                                <th className="px-3 py-2 w-28">動作</th>
                                <th className="px-3 py-2 w-20">數量</th>
                                <th className="px-3 py-2 w-20">單位</th>
                                {isEditing && <th className="px-3 py-2 w-10 text-center">刪</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {categoryItems.map(({ item, index }) => (
                                <tr key={index} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 text-center text-slate-400">{index + 1}</td>
                                    <td className="px-3 py-2">
                                        {isEditing ? (
                                            <select 
                                                value={item.name} 
                                                onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                            >
                                                {cat.items.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                                {!cat.items.includes(item.name) && (
                                                    <option value={item.name}>{item.name}</option>
                                                )}
                                            </select>
                                        ) : (
                                            <span className="font-medium text-slate-800">{item.name}</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {isEditing ? (
                                            <select 
                                                value={item.action} 
                                                onChange={(e) => updateItem(index, 'action', e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                            >
                                                <option value="install">裝 (Lắp)</option>
                                                <option value="dismantle">拆 (Phá)</option>
                                                <option value="none">無</option>
                                            </select>
                                        ) : (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.action === 'install' ? 'bg-blue-100 text-blue-700' : item.action === 'dismantle' ? 'bg-red-100 text-red-700' : 'text-slate-500'}`}>
                                                {item.action === 'install' ? '裝' : item.action === 'dismantle' ? '拆' : '-'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {isEditing ? (
                                            <input 
                                                type="text" 
                                                value={item.quantity} 
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                                placeholder="0"
                                            />
                                        ) : (
                                            <span className="text-slate-700">{item.quantity}</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {isEditing ? (
                                            <input 
                                                type="text" 
                                                value={item.unit} 
                                                onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                                placeholder={cat.defaultUnit || "單位"}
                                            />
                                        ) : (
                                            <span className="text-slate-500 text-xs">{item.unit}</span>
                                        )}
                                    </td>
                                    {isEditing && (
                                        <td className="px-3 py-2 text-center">
                                            <button onClick={() => handleDeleteItem(index)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-4 text-center text-slate-400 text-sm">無項目</div>
            )}

            {isEditing && (
                <div className="bg-slate-50 p-2 border-t border-slate-200">
                    <button 
                        onClick={() => handleAddCategoryItem(catKey)}
                        className="w-full py-2 bg-white border border-dashed border-slate-300 rounded text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center justify-center gap-1 hover:bg-slate-50"
                    >
                        <PlusIcon className="w-3 h-3" /> 新增{cat.label.split(' ')[0]}項目
                    </button>
                </div>
            )}
        </div>
      );
  };

  const renderResourcesSection = () => {
    // Collect resources currently in items
    const resourceItems = items.filter(i => i.category === 'RESOURCES');
    
    // Map existing quantities for the inputs
    const resourceQuantities: Record<string, string> = {};
    resourceItems.forEach(i => resourceQuantities[i.name] = i.quantity);

    if (!isEditing && resourceItems.length === 0) return null;

    return (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h4 className="text-xs font-bold text-orange-700 mb-3 uppercase tracking-wide">資源與其他 (Tài nguyên & Khác)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {RESOURCE_ITEMS.map(res => (
                    <div key={res.name} className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-600 mb-1 truncate" title={res.name}>{res.name}</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                placeholder="0" 
                                className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm focus:ring-1 focus:ring-orange-500 outline-none disabled:bg-orange-100 disabled:text-slate-500"
                                value={resourceQuantities[res.name] || ''}
                                disabled={!isEditing}
                                onChange={(e) => handleResourceChange(res.name, res.unit, e.target.value)}
                            />
                            <span className="absolute right-2 top-1.5 text-xs text-slate-400 pointer-events-none">{res.unit.split('/')[0]}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative min-h-[500px]">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-slate-800">完工報告 (Báo cáo hoàn thành)</h3>
                  <div className="flex gap-2">
                       <button 
                            onClick={generatePDF}
                            disabled={isGeneratingPDF}
                            className={`p-2 rounded-full transition-colors ${isGeneratingPDF ? 'text-slate-300' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
                            title="下載 PDF"
                        >
                            {isGeneratingPDF ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <FileTextIcon className="w-5 h-5" />}
                        </button>
                        {signatureUrl && (
                            <div className="text-green-600 flex items-center gap-1 text-xs font-bold border border-green-200 bg-green-50 px-2 py-1 rounded ml-1">
                                <StampIcon className="w-3.5 h-3.5" />
                                <span>已簽名</span>
                            </div>
                        )}
                  </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">日期 (Ngày)</label>
                      <input 
                        type="date" 
                        value={reportDate}
                        disabled={isEditing && hasReport}
                        onChange={e => setReportDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
                      />
                  </div>
              </div>
          </div>

          <div className="p-6 space-y-6 overflow-x-auto pb-4">
              
              {/* Sections */}
              {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map(catKey => renderSection(catKey))}

              {/* Resources & Others (Same as maintenance construction record) */}
              {renderResourcesSection()}

              {/* Custom Item for Other */}
              {isEditing && (
                 <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
                    <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">自訂項目 (加入其他分類)</h4>
                    <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-12 md:col-span-4">
                            <input type="text" placeholder="名稱 (Tên)" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                                <select 
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                value={customItem.action}
                                onChange={e => setCustomItem({...customItem, action: e.target.value as any})}
                                >
                                <option value="install">裝 (Lắp)</option>
                                <option value="dismantle">拆 (Phá)</option>
                                </select>
                        </div>
                        <div className="col-span-3 md:col-span-2">
                            <input type="text" placeholder="數量" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={customItem.quantity} onChange={e => setCustomItem({...customItem, quantity: e.target.value})} />
                        </div>
                        <div className="col-span-3 md:col-span-2">
                            <input type="text" placeholder="單位" className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={customItem.unit} onChange={e => setCustomItem({...customItem, unit: e.target.value})} />
                        </div>
                        <div className="col-span-12 md:col-span-1">
                            <button onClick={handleAddCustomItem} disabled={!customItem.name} className="w-full h-full bg-slate-800 text-white rounded flex items-center justify-center disabled:opacity-50 hover:bg-slate-900 transition-colors min-h-[32px]">
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
              )}

              {/* Notes */}
              <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">備註 (Ghi chú)</label>
                  <textarea 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg h-24 resize-none disabled:bg-slate-50 disabled:text-slate-500" 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)}
                      disabled={!isEditing}
                  ></textarea>
              </div>

               {/* Personnel & Signature Row */}
              <div className="flex flex-col md:flex-row gap-6 border-t border-slate-100 pt-6 mt-2 items-end">
                  <div className="flex-1 w-full">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">現場人員 (Người thi công)</label>
                      <input 
                        type="text" 
                        value={worker} 
                        onChange={e => setWorker(e.target.value)} 
                        disabled={!isEditing}
                        className="w-full px-3 py-3 border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-500 text-base"
                        placeholder="輸入姓名"
                      />
                  </div>

                  <div className="flex-1 w-full flex flex-col items-start gap-2">
                      <label className="block text-xs font-semibold text-slate-500">簽名 (Ký tên)</label>
                      {signatureUrl ? (
                          <div className="relative border border-slate-300 rounded-lg p-2 bg-white w-full h-[120px] flex items-center justify-center">
                              <img src={signatureUrl} alt="Signature" className="max-h-full object-contain" />
                              {isEditing && (
                                <button onClick={() => setSignatureUrl(null)} className="absolute top-1 right-1 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                          </div>
                      ) : (
                          <button onClick={() => setIsSigning(true)} disabled={!isEditing} className="w-full h-[120px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <PenToolIcon className="w-6 h-6" /> 
                              <span>點擊簽名</span>
                          </button>
                      )}
                  </div>
              </div>
          </div>
          
          {/* Footer Actions */}
          <div className="p-3 border-t border-slate-100 bg-white flex justify-end gap-3 flex-shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              {isEditing ? (
                  <>
                    {hasReport && (
                        <button 
                            onClick={() => setIsEditing(false)} 
                            className="px-6 h-10 rounded-lg text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm font-medium"
                        >
                            取消
                        </button>
                    )}
                    <button 
                        onClick={handleSave} 
                        className="px-6 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm font-bold flex items-center gap-2"
                        title="提交"
                    >
                        <CheckCircleIcon className="w-4 h-4" /> 提交
                    </button>
                  </>
              ) : (
                  <button 
                      onClick={() => setIsEditing(true)} 
                      className="px-6 h-10 rounded-lg bg-slate-800 text-white hover:bg-slate-900 shadow-sm font-bold flex items-center gap-2"
                      title="修改"
                  >
                      <EditIcon className="w-4 h-4" /> 修改
                  </button>
              )}
          </div>

          {isSigning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-800">簽名</h3>
                        <button onClick={() => setIsSigning(false)} className="text-slate-400 hover:text-slate-600">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-4 bg-slate-200 flex-1 flex items-center justify-center overflow-hidden">
                         <canvas 
                            ref={canvasRef} width={340} height={200}
                            className="bg-white shadow-md cursor-crosshair touch-none rounded-lg"
                            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                         />
                    </div>
                    <div className="p-4 border-t border-slate-100 flex justify-between gap-3">
                         <button onClick={clearSignature} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="清除"><TrashIcon className="w-5 h-5" /></button>
                         <div className="flex gap-2">
                             <button onClick={() => setIsSigning(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">取消</button>
                             <button onClick={saveSignature} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm">確認</button>
                         </div>
                    </div>
                </div>
            </div>
        )}
      </div>
  );
};

export default CompletionReport;
