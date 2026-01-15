
import React, { useState, useMemo } from 'react';
import { Project, MaterialStatus } from '../types';
import { BoxIcon, SearchIcon, ChevronRightIcon, ClipboardListIcon, CheckCircleIcon, LoaderIcon } from './Icons';

interface GlobalMaterialsProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

const GlobalMaterials: React.FC<GlobalMaterialsProps> = ({ projects, onSelectProject }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 彙整所有待辦採購材料
  const pendingMaterials = useMemo(() => {
    const allPending: { project: Project, material: any }[] = [];
    projects.forEach(p => {
      (p.materials || []).forEach(m => {
        if (m.status === MaterialStatus.PENDING) {
          allPending.push({ project: p, material: m });
        }
      });
    });
    return allPending;
  }, [projects]);

  // 過濾專案列表 (僅顯示有材料請購的專案)
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const hasMaterials = (p.materials || []).length > 0;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return hasMaterials && matchesSearch;
    });
  }, [projects, searchTerm]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pb-20">
      {/* 頂部標題 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-xl">
            <BoxIcon className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">材料請購管理</h1>
            <p className="text-xs text-slate-500 font-medium">全系統材料採購與進度監控</p>
          </div>
        </div>
        <div className="relative w-full md:w-72">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜尋專案名稱..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：統計與待辦彙整 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">待處理總量</h3>
              <div className="text-4xl font-black">{pendingMaterials.length} <span className="text-lg font-normal opacity-60">項</span></div>
            </div>
            <BoxIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <LoaderIcon className="w-4 h-4 text-orange-500" /> 待採購清單
              </h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
              {pendingMaterials.length > 0 ? pendingMaterials.map(({ project, material }, idx) => (
                <div key={`${project.id}-${idx}`} className="p-4 hover:bg-orange-50/30 transition-colors group">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 text-sm">{material.name}</span>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">待採購</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 truncate max-w-[150px]">{project.name}</span>
                    <span className="text-xs font-mono font-bold text-slate-600">{material.quantity} {material.unit}</span>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-slate-400 italic text-sm">目前無待採購項目</div>
              )}
            </div>
          </div>
        </div>

        {/* 右側：專案別概覽 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="font-bold text-slate-800">專案採購進度彙整</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProjects.map(project => {
              const total = (project.materials || []).length;
              const delivered = (project.materials || []).filter(m => m.status === MaterialStatus.DELIVERED).length;
              const pending = (project.materials || []).filter(m => m.status === MaterialStatus.PENDING).length;
              const ratio = total > 0 ? Math.round((delivered / total) * 100) : 0;

              return (
                <div 
                  key={project.id} 
                  onClick={() => onSelectProject(project)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-slate-800 text-base truncate group-hover:text-blue-600 transition-colors">{project.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium truncate uppercase">{project.type}</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
                      <ChevronRightIcon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">已進場</div>
                      <div className="text-xl font-black text-blue-600">{delivered}<span className="text-[10px] font-normal text-slate-400 ml-1">/{total}</span></div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                      <div className="text-[10px] font-bold text-orange-400 uppercase mb-1">待處理</div>
                      <div className="text-xl font-black text-orange-600">{pending}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">進場率</span>
                      <span className="text-xs font-black text-blue-600">{ratio}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${ratio}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredProjects.length === 0 && (
               <div className="col-span-full py-20 bg-white border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                  <BoxIcon className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">沒有找到包含材料清單的專案</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalMaterials;
