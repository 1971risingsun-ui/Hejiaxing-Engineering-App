import React, { useMemo, useState } from 'react';
import { Project, CompletionItem, FenceMaterialItem, FenceMaterialSheet, SystemRules } from '../types';
import { PenToolIcon, BoxIcon, CalendarIcon, TrashIcon, PlusIcon, ChevronRightIcon } from './Icons';

interface GlobalProductionProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
}

type SortKey = 'projectName' | 'date' | 'name';
type SortDirection = 'asc' | 'desc' | null;

const GlobalProduction: React.FC<GlobalProductionProps> = ({ projects, onUpdateProject, systemRules }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'asc',
  });

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

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null; 
    }
    setSortConfig({ key, direction });
  };

  const productionItems = useMemo(() => {
    let list: { project: Project; item: CompletionItem; itemIdx: number; reportIdx: number; reportId: string; reportDate: string }[] = [];
    
    projects.forEach(project => {
      if (!project.planningReports || project.planningReports.length === 0) return;
      
      // 遍歷所有報價單，移除最新一筆限制
      project.planningReports.forEach((report, reportIdx) => {
        report.items.forEach((item, itemIdx) => {
          const name = item.name || '';
          
          // 分流規則：圍籬項目 vs 組合屋項目
          const isFenceProd = systemRules.productionKeywords.some(kw => name.includes(kw)) && item.category === 'FENCE_MAIN';
          const isModularProd = systemRules.modularProductionKeywords?.some(kw => name.includes(kw)) && 
                               ['MODULAR_STRUCT', 'MODULAR_RENO', 'MODULAR_OTHER', 'MODULAR_DISMANTLE'].includes(item.category);
          
          if (isFenceProd || isModularProd) {
            list.push({ 
              project, 
              item, 
              itemIdx, 
              reportIdx,
              reportId: report.id,
              reportDate: report.date 
            });
          }
        });
      });
    });
    
    if (sortConfig.direction) {
      list.sort((a, b) => {
        let valA = '';
        let valB = '';

        switch (sortConfig.key) {
          case 'projectName':
            valA = a.project.name;
            valB = b.project.name;
            break;
          case 'date':
            valA = a.item.productionDate || a.reportDate || '9999-12-31';
            valB = b.item.productionDate || b.reportDate || '9999-12-31';
            break;
          case 'name':
            valA = a.item.name;
            valB = b.item.name;
            break;
        }

        if (sortConfig.direction === 'asc') {
          return valA.localeCompare(valB, 'zh-Hant');
        } else {
          return valB.localeCompare(valA, 'zh-Hant');
        }
      });
    } else {
        list.sort((a, b) => {
            const dateA = a.item.productionDate || a.reportDate || '9999-12-31';
            const dateB = b.item.productionDate || b.reportDate || '9999-12-31';
            return dateA.localeCompare(dateB);
        });
    }
    
    return list;
  }, [projects, sortConfig, systemRules]);

  const handleUpdateItemDate = (projId: string, reportIdx: number, itemIdx: number, newDate: string) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;
    
    const updatedReports = [...project.planningReports];
    const updatedItems = [...updatedReports[reportIdx].items];
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], productionDate: newDate };
    updatedReports[reportIdx] = { ...updatedReports[reportIdx], items: updatedItems };
    
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleToggleProduced = (projId: string, reportIdx: number, itemIdx: number) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;
    
    const updatedReports = [...project.planningReports];
    const updatedItems = [...updatedReports[reportIdx].items];
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], isProduced: !updatedItems[itemIdx].isProduced };
    updatedReports[reportIdx] = { ...updatedReports[reportIdx], items: updatedItems };
    
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const updateMaterialSheet = (projId: string, itemKey: string, updatedSheet: FenceMaterialSheet) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;

    const updatedSheets = { ...(project.fenceMaterialSheets || {}) };
    updatedSheets[itemKey] = updatedSheet;
    onUpdateProject({ ...project, fenceMaterialSheets: updatedSheets });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <div className="flex flex-col opacity-20 ml-1"><ChevronRightIcon className="w-2 h-2 -rotate-90" /><ChevronRightIcon className="w-2 h-2 rotate-90" /></div>;
    if (sortConfig.direction === 'asc') return <div className="flex flex-col ml-1 text-indigo-600"><ChevronRightIcon className="w-2 h-2 -rotate-90" /><ChevronRightIcon className="w-2 h-2 rotate-90 opacity-20" /></div>;
    if (sortConfig.direction === 'desc') return <div className="flex flex-col ml-1 text-indigo-600"><ChevronRightIcon className="w-2 h-2 -rotate-90 opacity-20" /><ChevronRightIcon className="w-2 h-2 rotate-90" /></div>;
    return <div className="flex flex-col opacity-20 ml-1"><ChevronRightIcon className="w-2 h-2 -rotate-90" /><ChevronRightIcon className="w-2 h-2 rotate-90" /></div>;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in h-full overflow-hidden">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-xl text-white">
            <PenToolIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">生產／備料總覽</h1>
            <p className="text-xs text-slate-500 font-medium">彙整各案場所有日期之需預作項目與詳細材料清單</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
           <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">全日期監控模式</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-44">
                  <button onClick={() => handleSort('projectName')} className="flex items-center hover:text-indigo-600 transition-colors uppercase tracking-widest">
                    案件名稱 {renderSortIcon('projectName')}
                  </button>
                </th>
                <th className="px-6 py-4 w-40">
                  <button onClick={() => handleSort('date')} className="flex items-center hover:text-indigo-600 transition-colors uppercase tracking-widest">
                    日期 {renderSortIcon('date')}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('name')} className="flex items-center hover:text-indigo-600 transition-colors uppercase tracking-widest">
                    品名 {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-4">規格</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20">單位</th>
                <th className="px-6 py-4">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productionItems.length > 0 ? productionItems.map(({ project, item, itemIdx, reportIdx, reportId, reportDate }, idx) => {
                const itemKey = getItemKey(item);
                const existingSheet = project.fenceMaterialSheets?.[itemKey];
                const autoData = getDefaultMaterialItems(item.name, item.quantity);
                
                const activeItems = existingSheet?.items || autoData?.items || [];
                const activeCategory = existingSheet?.category || autoData?.category || '';

                return (
                  <React.Fragment key={`${project.id}-${reportId}-${itemIdx}-${idx}`}>
                    <tr className={`hover:bg-slate-50/50 transition-colors group ${item.isProduced ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!item.isProduced}
                            onChange={() => handleToggleProduced(project.id, reportIdx, itemIdx)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all"
                          />
                          <div className={`font-black text-sm truncate max-w-[140px] transition-all ${item.isProduced ? 'text-slate-400 line-through' : 'text-indigo-700'}`} title={project.name}>
                            {project.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="relative group/date">
                          <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within/date:text-indigo-500" />
                          <input 
                            type="date" 
                            value={item.productionDate || reportDate}
                            onChange={(e) => handleUpdateItemDate(project.id, reportIdx, itemIdx, e.target.value)}
                            className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className={`font-bold text-sm transition-all ${item.isProduced ? 'text-slate-400' : 'text-slate-800'}`}>{item.name}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="text-xs text-slate-500 whitespace-pre-wrap max-w-[220px] leading-relaxed">
                          {item.spec || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center align-top">
                        <span className={`font-black text-sm transition-all ${item.isProduced ? 'text-slate-400' : 'text-blue-600'}`}>{item.quantity}</span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className="text-xs text-slate-400 font-bold">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="text-xs text-slate-500 italic truncate max-w-[150px]">
                          {item.itemNote || '-'}
                        </div>
                      </td>
                    </tr>
                    
                    {activeItems.length > 0 && (
                      <tr className="bg-slate-50/30">
                        <td colSpan={6} className="px-8 py-0">
                          <div className={`border-l-4 border-indigo-200 ml-6 my-2 overflow-hidden rounded-r-xl border border-slate-100 shadow-sm bg-white/50 transition-opacity ${item.isProduced ? 'opacity-50' : ''}`}>
                            <table className="w-full text-xs">
                              <thead className="bg-slate-100 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                                <tr>
                                  <th className="px-4 py-2 text-left w-16">材料名稱</th>
                                  <th className="px-4 py-2 text-left w-20">規格填寫</th>
                                  <th className="px-4 py-2 w-24 text-center">數量 (自動)</th>
                                  <th className="px-4 py-2 w-16 text-center">單位</th>
                                  <th className="px-4 py-2 w-10 text-center">刪除</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {activeItems.map((mItem, mIdx) => (
                                  <tr key={mItem.id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-4 py-2">
                                      <input 
                                        type="text" value={mItem.name} 
                                        onChange={(e) => {
                                          const newItems = [...activeItems];
                                          newItems[mIdx].name = e.target.value;
                                          updateMaterialSheet(project.id, itemKey, { category: activeCategory, items: newItems });
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
                                          updateMaterialSheet(project.id, itemKey, { category: activeCategory, items: newItems });
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
                                          updateMaterialSheet(project.id, itemKey, { category: activeCategory, items: newItems });
                                        }}
                                        className="w-16 bg-slate-100/50 border border-slate-200 rounded text-center outline-none focus:ring-1 focus:ring-indigo-400 font-black text-indigo-600"
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-center font-bold text-slate-400">{mItem.unit}</td>
                                    <td className="px-4 py-2 text-center">
                                      <button 
                                        onClick={() => {
                                          const newItems = activeItems.filter((_, i) => i !== mIdx);
                                          updateMaterialSheet(project.id, itemKey, { category: activeCategory, items: newItems });
                                        }}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                      ><TrashIcon className="w-3.5 h-3.5" /></button>
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-slate-50/50">
                                  <td colSpan={5} className="p-1">
                                    <button 
                                      onClick={() => {
                                        const m: FenceMaterialItem = { id: crypto.randomUUID(), name: '新材料', spec: '', quantity: 0, unit: '項' };
                                        updateMaterialSheet(project.id, itemKey, { category: activeCategory || '其他', items: [...activeItems, m] });
                                      }}
                                      className="w-full py-1.5 text-[9px] font-black text-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-1 uppercase tracking-widest"
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
              }) : (
                <tr>
                  <td colSpan={7} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="textbase font-bold">目前沒有任何生產備料項目</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GlobalProduction;