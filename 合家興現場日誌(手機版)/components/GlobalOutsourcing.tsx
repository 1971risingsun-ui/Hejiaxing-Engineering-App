import React, { useMemo, useState } from 'react';
import { Project, CompletionItem, SystemRules, Supplier } from '../types';
import { BriefcaseIcon, BoxIcon, CalendarIcon, ChevronRightIcon, XIcon, SearchIcon } from './Icons';

interface GlobalOutsourcingProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
  subcontractors: Supplier[];
}

type SortKey = 'projectName' | 'date' | 'name' | 'vendor';
type SortDirection = 'asc' | 'desc' | null;

const GlobalOutsourcing: React.FC<GlobalOutsourcingProps> = ({ projects, onUpdateProject, systemRules, subcontractors }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'asc',
  });
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null; 
    }
    setSortConfig({ key, direction });
  };

  // 1. 先算出所有符合外包規則的原始項目清單 (不分廠商篩選)
  const baseOutsourcingItems = useMemo(() => {
    let list: { project: Project; item: CompletionItem; itemIdx: number; reportIdx: number; reportId: string; reportDate: string }[] = [];
    
    projects.forEach(project => {
      if (!project.planningReports || project.planningReports.length === 0) return;
      
      project.planningReports.forEach((report, reportIdx) => {
        report.items.forEach((item, itemIdx) => {
          const name = item.name || '';
          
          const isFenceSub = systemRules.subcontractorKeywords.some(kw => name.includes(kw)) && item.category === 'FENCE_MAIN';
          const isModularSub = systemRules.modularSubcontractorKeywords?.some(kw => name.includes(kw)) && 
                               ['MODULAR_STRUCT', 'MODULAR_RENO', 'MODULAR_OTHER', 'MODULAR_DISMANTLE'].includes(item.category);
          
          if (isFenceSub || isModularSub) {
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
    return list;
  }, [projects, systemRules]);

  // 2. 取得目前所有項目中「確實有被選取/指派」的廠商清單，用於篩選選單
  const activeSubcontractors = useMemo(() => {
    const usedVendorIds = new Set(baseOutsourcingItems.map(i => i.item.supplierId).filter(Boolean));
    return subcontractors
      .filter(s => usedVendorIds.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  }, [baseOutsourcingItems, subcontractors]);

  // 3. 根據篩選值與排序規則產生最終顯示的清單
  const outsourcingItems = useMemo(() => {
    let list = vendorFilter === 'ALL' 
      ? [...baseOutsourcingItems] 
      : baseOutsourcingItems.filter(i => i.item.supplierId === vendorFilter);
    
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
          case 'vendor':
            valA = subcontractors.find(s => s.id === a.item.supplierId)?.name || a.item.supplierId || '';
            valB = subcontractors.find(s => s.id === b.item.supplierId)?.name || b.item.supplierId || '';
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
  }, [baseOutsourcingItems, sortConfig, subcontractors, vendorFilter]);

  const handleUpdateItemDate = (projId: string, reportIdx: number, itemIdx: number, newDate: string) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;
    
    const updatedReports = [...project.planningReports];
    const updatedItems = [...updatedReports[reportIdx].items];
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], productionDate: newDate };
    updatedReports[reportIdx] = { ...updatedReports[reportIdx], items: updatedItems };
    
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleUpdateItemVendor = (projId: string, reportIdx: number, itemIdx: number, vendorId: string) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;
    
    const updatedReports = [...project.planningReports];
    const updatedItems = [...updatedReports[reportIdx].items];
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], supplierId: vendorId };
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

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <div className="flex flex-col opacity-20 ml-1"><ChevronRightIcon className="w-2 h-2 -rotate-90" /><ChevronRightIcon className="w-2 h-2 rotate-90" /></div>;
    if (sortConfig.direction === 'asc') return <div className="flex flex-col ml-1 text-blue-600"><ChevronRightIcon className="w-2 h-2 -rotate-90" /><ChevronRightIcon className="w-2 h-2 rotate-90 opacity-20" /></div>;
    if (sortConfig.direction === 'desc') return <div className="flex flex-col ml-1 text-blue-600"><ChevronRightIcon className="w-2 h-2 -rotate-90 opacity-20" /><ChevronRightIcon className="w-2 h-2 rotate-90" /></div>;
    return <div className="flex flex-col opacity-20 ml-1"><ChevronRightIcon className="w-2 h-2 -rotate-90" /><ChevronRightIcon className="w-2 h-2 rotate-90" /></div>;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in h-full overflow-hidden">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl text-white">
            <BriefcaseIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">外包管理</h1>
            <p className="text-xs text-slate-500 font-medium">彙整各案場所有日期之外包廠商調度項目</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">全部廠商 (所有項目)</option>
              {activeSubcontractors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">外包廠商監控模式</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-10 text-center">狀態</th>
                <th className="px-4 py-4 w-48">
                  <button onClick={() => handleSort('vendor')} className="flex items-center hover:text-blue-600 transition-colors uppercase tracking-widest">
                    外包廠商 {renderSortIcon('vendor')}
                  </button>
                </th>
                <th className="px-6 py-4 w-44">
                  <button onClick={() => handleSort('projectName')} className="flex items-center hover:text-blue-600 transition-colors uppercase tracking-widest">
                    案件名稱 {renderSortIcon('projectName')}
                  </button>
                </th>
                <th className="px-6 py-4 w-40">
                  <button onClick={() => handleSort('date')} className="flex items-center hover:text-blue-600 transition-colors uppercase tracking-widest">
                    預定日期 {renderSortIcon('date')}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('name')} className="flex items-center hover:text-blue-600 transition-colors uppercase tracking-widest">
                    外包品名 {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-4">規格 / 內容</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20">單位</th>
                <th className="px-6 py-4">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {outsourcingItems.length > 0 ? outsourcingItems.map(({ project, item, itemIdx, reportIdx, reportId, reportDate }, idx) => {
                return (
                  <tr key={`${project.id}-${reportId}-${itemIdx}-${idx}`} className={`hover:bg-slate-50/50 transition-colors group ${item.isProduced ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={!!item.isProduced}
                          onChange={() => handleToggleProduced(project.id, reportIdx, itemIdx)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <select 
                        value={item.supplierId || ''} 
                        onChange={(e) => handleUpdateItemVendor(project.id, reportIdx, itemIdx, e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">選取廠商...</option>
                        {subcontractors.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 align-top">
                        <div className={`font-black text-sm truncate max-w-[140px] transition-all ${item.isProduced ? 'text-slate-400 line-through' : 'text-blue-700'}`} title={project.name}>
                          {project.name}
                        </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="relative group/date">
                        <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within/date:text-blue-500" />
                        <input 
                          type="date" 
                          value={item.productionDate || reportDate}
                          onChange={(e) => handleUpdateItemDate(project.id, reportIdx, itemIdx, e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
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
                );
              }) : (
                <tr>
                  <td colSpan={9} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="textbase font-bold">目前沒有任何外包協力項目</p>
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

export default GlobalOutsourcing;