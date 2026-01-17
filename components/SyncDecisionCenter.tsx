import React, { useState, useMemo } from 'react';
import { BoxIcon, CheckCircleIcon, HistoryIcon, XIcon, AlertIcon, ChevronRightIcon, SaveIcon, RefreshIcon } from './Icons';

interface SyncItem {
  id: string;
  name: string;
  status: 'ONLY_FILE' | 'ONLY_CACHE' | 'CONFLICT';
  fileData?: any;
  cacheData?: any;
  newer?: 'file' | 'cache';
  fileTime?: number;
  cacheTime?: number;
}

interface SyncDecisionCenterProps {
  diffs: Record<string, SyncItem[]>;
  onConfirm: (selections: Record<string, { id: string, side: 'file' | 'cache' }[]>) => void;
  onCancel: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  projects: '施工案件',
  employees: '員工資料',
  suppliers: '供應商',
  subcontractors: '外包商',
  purchaseOrders: '採購單',
  stockAlertItems: '庫存預警',
  tools: '工具設備',
  assets: '大型資產',
  vehicles: '公司車輛'
};

const SyncDecisionCenter: React.FC<SyncDecisionCenterProps> = ({ diffs, onConfirm, onCancel }) => {
  const [selections, setSelections] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    Object.keys(diffs).forEach(cat => {
      initial[cat] = new Set();
      // 預設勾選「較新」的項目
      diffs[cat].forEach(item => {
        if (item.status === 'ONLY_FILE' || item.newer === 'file') {
          initial[cat].add(item.id);
        }
      });
    });
    return initial;
  });

  const [viewSide, setViewSide] = useState<Record<string, 'file' | 'cache'>>({});

  const toggleItem = (cat: string, id: string) => {
    const next = new Set(selections[cat]);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelections({ ...selections, [cat]: next });
  };

  const selectAllNewest = () => {
    const next: Record<string, Set<string>> = {};
    Object.keys(diffs).forEach(cat => {
      next[cat] = new Set();
      diffs[cat].forEach(item => {
        if (item.status === 'ONLY_FILE' || item.newer === 'file') {
          next[cat].add(item.id);
        }
      });
    });
    setSelections(next);
  };

  const handleApply = () => {
    const finalSelections: Record<string, { id: string, side: 'file' | 'cache' }[]> = {};
    Object.keys(selections).forEach(cat => {
      finalSelections[cat] = diffs[cat].map(item => ({
        id: item.id,
        side: selections[cat].has(item.id) ? 'file' : 'cache'
      }));
    });
    onConfirm(finalSelections);
  };

  // Fix: Explicitly cast values to SyncItem[][] to resolve 'length' access error on 'unknown'
  const totalDiffs = (Object.values(diffs) as SyncItem[][]).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-scale-in border border-white/20">
        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
              <RefreshIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-xl tracking-tight">資料同步決策中心</h3>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Selective Data Synchronization</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={selectAllNewest} className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-50 transition-all shadow-sm">
              保留全部最新版
            </button>
            <button onClick={onCancel} className="p-2 bg-white hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-full transition-all shadow-sm border border-slate-100">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
          <div className="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-[32px] flex items-start gap-4 shadow-sm">
            <div className="bg-amber-500 text-white p-2 rounded-xl flex-shrink-0">
              <AlertIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">偵測到數據差異</p>
              <p className="text-xs text-amber-700/80 leading-relaxed mt-1 font-medium">
                電腦檔案 (db.json) 與瀏覽器暫存內容不一致（共 {totalDiffs} 項差異）。<br />
                勾選項目代表使用「電腦檔案」版本，未勾選則保留「瀏覽器暫存」版本。系統已自動為您勾選較新的版本。
              </p>
            </div>
          </div>

          <div className="space-y-10">
            {/* Fix: Explicitly cast entries to resolve 'items' being treated as 'unknown' */}
            {(Object.entries(diffs) as [string, SyncItem[]][]).map(([cat, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={cat} className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
                    <h4 className="font-black text-slate-800 tracking-tight">{CATEGORY_LABELS[cat] || cat}</h4>
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2.5 py-0.5 rounded-full uppercase">{items.length} 變更</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map(item => {
                      const isSelected = selections[cat].has(item.id);
                      const isConflict = item.status === 'CONFLICT';
                      const side = isSelected ? 'file' : 'cache';
                      
                      return (
                        <div 
                          key={item.id}
                          onClick={() => toggleItem(cat, item.id)}
                          className={`relative p-5 rounded-3xl border-2 transition-all cursor-pointer group hover:shadow-lg ${
                            isSelected 
                              ? 'bg-blue-50/50 border-blue-500 shadow-blue-100' 
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-black text-slate-800 text-sm truncate">{item.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                {item.status === 'ONLY_FILE' && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">電腦端新增</span>}
                                {item.status === 'ONLY_CACHE' && <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">瀏覽器新增</span>}
                                {isConflict && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">內容更新</span>}
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 text-transparent'}`}>
                              <CheckCircleIcon className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                             <div className="flex items-center justify-between text-[10px] font-bold">
                                <div className={`flex items-center gap-1.5 ${item.newer === 'file' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                  <BoxIcon className="w-3 h-3" /> 電腦檔案: {item.fileTime ? new Date(item.fileTime).toLocaleString() : '無'}
                                  {item.newer === 'file' && <span className="ml-1">★ 最新</span>}
                                </div>
                             </div>
                             <div className="flex items-center justify-between text-[10px] font-bold">
                                <div className={`flex items-center gap-1.5 ${item.newer === 'cache' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                  <HistoryIcon className="w-3 h-3" /> 瀏覽器暫存: {item.cacheTime ? new Date(item.cacheTime).toLocaleString() : '無'}
                                  {item.newer === 'cache' && <span className="ml-1">★ 最新</span>}
                                </div>
                             </div>
                          </div>

                          <div className="mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-tighter">
                             <span className="text-slate-400">同步決策:</span>
                             <span className={isSelected ? 'text-blue-600' : 'text-slate-600'}>
                                {isSelected ? '採用電腦檔案 ➔' : '保留瀏覽器暫存 ➔'}
                             </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected Unit</span>
            <span className="text-sm font-black text-slate-700">準備處理 {totalDiffs} 項同步決定</span>
          </div>
          <button 
            onClick={handleApply}
            className="px-12 py-4 rounded-2xl text-sm font-black bg-slate-900 text-white hover:bg-black shadow-xl transition-all active:scale-[0.98] flex items-center gap-3"
          >
            <SaveIcon className="w-5 h-5 text-blue-400" /> 執行選擇性同步
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SyncDecisionCenter;