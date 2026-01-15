import React, { useMemo, useState, useEffect } from 'react';
import { Project, User, CompletionItem, FenceMaterialItem, FenceMaterialSheet, SystemRules } from '../types';
import { BoxIcon, TruckIcon, ClipboardListIcon, TrashIcon, UsersIcon, PlusIcon, PenToolIcon, CalendarIcon, FileTextIcon } from './Icons';

interface MaterialPreparationProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
}

const MaterialPreparation: React.FC<MaterialPreparationProps> = ({ project, onUpdateProject, systemRules }) => {
  const [activeSubTab, setActiveSubTab] = useState<'fence' | 'modular'>('fence');
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  // 取得所有報價單，並依時間排序（新到舊）
  const allReports = useMemo(() => {
    if (!project.planningReports || project.planningReports.length === 0) return [];
    return [...project.planningReports].sort((a, b) => b.timestamp - a.timestamp);
  }, [project.planningReports]);

  // 當報價單列表變動或初始載入時，預設選取最新的一筆
  useEffect(() => {
    if (allReports.length > 0 && !selectedReportId) {
      setSelectedReportId(allReports[0].id);
    } else if (allReports.length > 0 && !allReports.find(r => r.id === selectedReportId)) {
      setSelectedReportId(allReports[0].id);
    }
  }, [allReports, selectedReportId]);

  // 取得當前選取的報價單內容
  const currentPlanningReport = useMemo(() => {
    if (!selectedReportId) return allReports[0] || null;
    return allReports.find(r => r.id === selectedReportId) || allReports[0] || null;
  }, [allReports, selectedReportId]);

  const planningItems = currentPlanningReport?.items || [];

  // 過濾圍籬項目並分流
  const { fenceMainItems, fenceProductionItems, fenceSubcontractorItems } = useMemo(() => {
    const allFence = planningItems.filter(item => item.category === 'FENCE_MAIN');
    const main: CompletionItem[] = [];
    const prod: CompletionItem[] = [];
    const sub: CompletionItem[] = [];
    
    allFence.forEach(item => {
      const name = item.name || '';
      const isSub = systemRules.subcontractorKeywords.some(kw => name.includes(kw));
      const isProd = systemRules.productionKeywords.some(kw => name.includes(kw));
      
      if (isSub) sub.push(item);
      else if (isProd) prod.push(item);
      else main.push(item);
    });
    
    return { 
        fenceMainItems: main, 
        fenceProductionItems: prod, 
        fenceSubcontractorItems: sub 
    };
  }, [planningItems, systemRules]);

  // 組合屋分流邏輯更新：改為依據關鍵字分流
  const { 
    modularMainItems, 
    modularProductionItems, 
    modularSubcontractorItems 
  } = useMemo(() => {
    const allModular = planningItems.filter(item => 
      ['MODULAR_STRUCT', 'MODULAR_RENO', 'MODULAR_OTHER', 'MODULAR_DISMANTLE'].includes(item.category)
    );
    const main: CompletionItem[] = [];
    const prod: CompletionItem[] = [];
    const sub: CompletionItem[] = [];

    allModular.forEach(item => {
      const name = item.name || '';
      // 使用組合屋專屬關鍵字
      const isSub = systemRules.modularSubcontractorKeywords?.some(kw => name.includes(kw));
      const isProd = systemRules.modularProductionKeywords?.some(kw => name.includes(kw));

      if (isSub) sub.push(item);
      else if (isProd) prod.push(item);
      else main.push(item);
    });

    return {
      modularMainItems: main,
      modularProductionItems: prod,
      modularSubcontractorItems: sub
    };
  }, [planningItems, systemRules]);

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  // 動態換算材料項目
  const getDefaultMaterialItems = (itemName: string, quantity: string): { category: string; items: FenceMaterialItem[] } | null => {
    const baseQty = parseFloat(quantity) || 0;
    if (baseQty <= 0) return null;

    const formulaConfig = systemRules.materialFormulas.find(f => itemName.includes(f.keyword));
    if (!formulaConfig) return null;

    const generatedItems: FenceMaterialItem[] = formulaConfig.items.map(formulaItem => {
      let calcQty = 0;
      try {
        const func = new Function('baseQty', 'Math', `return ${formulaItem.formula}`);
        calcQty = func(baseQty, Math);
      } catch (e) {
        console.error(`公式解析失敗: ${formulaItem.formula}`, e);
        calcQty = baseQty;
      }

      return {
        id: crypto.randomUUID(),
        name: formulaItem.name,
        spec: '',
        quantity: isNaN(calcQty) ? 0 : calcQty,
        unit: formulaItem.unit
      };
    });

    return {
      category: formulaConfig.category,
      items: generatedItems
    };
  };

  const updateMaterialSheet = (itemKey: string, updatedSheet: FenceMaterialSheet) => {
    const updatedSheets = { ...(project.fenceMaterialSheets || {}) };
    updatedSheets[itemKey] = updatedSheet;
    onUpdateProject({ ...project, fenceMaterialSheets: updatedSheets });
  };

  const handleDeleteMainItem = (itemToDelete: CompletionItem) => {
    if (!currentPlanningReport || !window.confirm(`確定要從報價單移除「${itemToDelete.name}」嗎？`)) return;
    const updatedItems = currentPlanningReport.items.filter(item => 
      !(item.name === itemToDelete.name && item.category === itemToDelete.category && item.spec === itemToDelete.spec)
    );
    const updatedReports = project.planningReports.map(report => 
      report.id === currentPlanningReport.id ? { ...report, items: updatedItems, timestamp: Date.now() } : report
    );
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const renderTable = (items: CompletionItem[], title?: string, icon?: React.ReactNode, showDetails: boolean = false) => {
    if (items.length === 0 && !title) {
      return (
        <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
          <BoxIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-bold">目前報價單內容為空</p>
        </div>
      );
    }
    if (items.length === 0 && title) return null;

    return (
      <div className="space-y-3">
        {title && (
          <div className="flex items-center gap-2 px-1">
            {icon}
            <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
          </div>
        )}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 min-w-[200px]">品名</th>
                  <th className="px-6 py-4 min-w-[150px]">規格</th>
                  <th className="px-6 py-4 w-24 text-center">數量</th>
                  <th className="px-6 py-4 w-20">單位</th>
                  <th className="px-6 py-4">備註</th>
                  <th className="px-6 py-4 w-12 text-center text-slate-300">刪除</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const itemKey = getItemKey(item);
                  const existingSheet = project.fenceMaterialSheets?.[itemKey];
                  const autoData = showDetails ? getDefaultMaterialItems(item.name, item.quantity) : null;
                  
                  const activeItems = existingSheet?.items || autoData?.items || [];
                  const activeCategory = existingSheet?.category || autoData?.category || '';

                  return (
                    <React.Fragment key={itemKey}>
                      <tr className="hover:bg-slate-50 transition-colors group bg-white">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {item.name}
                            {activeCategory && <span className="bg-indigo-100 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded font-black tracking-tighter">自動備料: {activeCategory}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs whitespace-pre-wrap">{item.spec || '-'}</td>
                        <td className="px-6 py-4 text-center font-black text-blue-600">{item.quantity}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{item.unit}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{item.itemNote || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => handleDeleteMainItem(item)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4" /></button>
                        </td>
                      </tr>
                      {showDetails && activeItems.length > 0 && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={6} className="px-8 py-0">
                            <div className="border-l-4 border-indigo-200 ml-4 my-2 overflow-hidden rounded-r-lg border border-slate-100 shadow-inner">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-100 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                                  <tr>
                                    <th className="px-4 py-2 w-16">材料名稱</th>
                                    <th className="px-4 py-2 w-20">規格填寫</th>
                                    <th className="px-4 py-2 w-24 text-center">數量 (自動)</th>
                                    <th className="px-4 py-2 w-16 text-center">單位</th>
                                    <th className="px-4 py-2 w-10 text-center">刪除</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/50">
                                  {activeItems.map((mItem, mIdx) => (
                                    <tr key={mItem.id} className="hover:bg-indigo-50/30 transition-colors">
                                      <td className="px-4 py-2">
                                        <input 
                                          type="text" value={mItem.name} 
                                          onChange={(e) => {
                                            const newItems = [...activeItems];
                                            newItems[mIdx].name = e.target.value;
                                            updateMaterialSheet(itemKey, { category: activeCategory, items: newItems });
                                          }}
                                          className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none font-bold text-slate-700"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input 
                                          type="text" value={mItem.spec} placeholder="填寫規格..."
                                          onChange={(e) => {
                                            const newItems = [...activeItems];
                                            newItems[mIdx].spec = e.target.value;
                                            updateMaterialSheet(itemKey, { category: activeCategory, items: newItems });
                                          }}
                                          className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-slate-500 italic"
                                        />
                                      </td>
                                      <td className="px-4 py-2 text-center">
                                        <input 
                                          type="number" value={mItem.quantity} 
                                          onChange={(e) => {
                                            const newItems = [...activeItems];
                                            newItems[mIdx].quantity = parseFloat(e.target.value) || 0;
                                            updateMaterialSheet(itemKey, { category: activeCategory, items: newItems });
                                          }}
                                          className="w-16 bg-slate-100/50 border border-slate-200 rounded text-center outline-none focus:ring-1 focus:ring-indigo-400 font-black text-indigo-600"
                                        />
                                      </td>
                                      <td className="px-4 py-2 text-center font-bold text-slate-400">{mItem.unit}</td>
                                      <td className="px-4 py-2 text-center">
                                        <button 
                                          onClick={() => {
                                            const newItems = activeItems.filter((_, i) => i !== mIdx);
                                            updateMaterialSheet(itemKey, { category: activeCategory, items: newItems });
                                          }}
                                          className="text-slate-300 hover:text-red-500 transition-colors"
                                        ><TrashIcon className="w-3.5 h-3.5" /></button>
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-slate-50/30">
                                    <td colSpan={5} className="p-1">
                                      <button 
                                        onClick={() => {
                                          const m: FenceMaterialItem = { id: crypto.randomUUID(), name: '新材料', spec: '', quantity: 0, unit: '項' };
                                          updateMaterialSheet(itemKey, { category: activeCategory || '其他', items: [...activeItems, m] });
                                        }}
                                        className="w-full py-1 text-[10px] font-black text-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-1"
                                      >
                                        <PlusIcon className="w-3 h-3" /> 手動追加備料
                                      </button>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
             <TruckIcon className="w-6 h-6" />
           </div>
           <div>
             <h2 className="text-lg font-black text-slate-800">材料清單 (Material List)</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">依報價單品名自動產生備料清單</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          {allReports.length > 0 ? (
            <div className="relative flex-1 md:w-56">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                <select 
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm cursor-pointer"
                >
                  {allReports.map(r => (
                    <option key={r.id} value={r.id}>報價單日期: {r.date}</option>
                  ))}
                </select>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit">
        <button onClick={() => setActiveSubTab('fence')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeSubTab === 'fence' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
          <ClipboardListIcon className="w-4 h-4" /> 圍籬
        </button>
        <button onClick={() => setActiveSubTab('modular')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeSubTab === 'modular' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
          <BoxIcon className="w-4 h-4" /> 組合屋
        </button>
      </div>

      <div className="space-y-10 pb-10">
        {allReports.length > 0 ? (
          activeSubTab === 'fence' ? (
            <>
              {renderTable(fenceMainItems, undefined, undefined, true)}
              {renderTable(fenceProductionItems, "生產/備料", <PenToolIcon className="w-4 h-4 text-blue-500" />, true)}
              {renderTable(fenceSubcontractorItems, "外包廠商安排", <UsersIcon className="w-4 h-4 text-indigo-500" />)}
            </>
          ) : (
            <>
              {/* 組合屋分流呈現 */}
              {renderTable(modularMainItems, "組合屋主要規劃", <BoxIcon className="w-4 h-4 text-blue-500" />, true)}
              {renderTable(modularProductionItems, "生產/備料", <PenToolIcon className="w-4 h-4 text-emerald-500" />, true)}
              {renderTable(modularSubcontractorItems, "外包廠商安排", <UsersIcon className="w-4 h-4 text-indigo-500" />)}
            </>
          )
        ) : (
          <div className="p-12 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
             <FileTextIcon className="w-16 h-16 mx-auto mb-4 text-slate-200" />
             <p className="text-slate-500 font-bold">本案尚未建立任何報價單</p>
             <p className="text-xs text-slate-400 mt-1">請先至「報價單」頁面新增規劃內容後，此處將自動產生備料清單</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialPreparation;