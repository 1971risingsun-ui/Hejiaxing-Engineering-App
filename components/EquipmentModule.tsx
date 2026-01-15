
import React from 'react';
import { WrenchIcon, TruckIcon, BoxIcon, BriefcaseIcon, ShieldIcon } from './Icons';

interface EquipmentModuleProps {
  onNavigate: (view: any) => void;
  allowedViews: string[];
}

const EquipmentModule: React.FC<EquipmentModuleProps> = ({ onNavigate, allowedViews }) => {
  const categories = [
    { 
      id: 'equipment_tools', 
      label: '工具管理', 
      icon: <WrenchIcon className="w-6 h-6" />, 
      color: 'bg-blue-50 text-blue-600', 
      desc: '電動工具、手動工具清冊與領用狀態' 
    },
    { 
      id: 'equipment_assets', 
      label: '設備管理', 
      icon: <BoxIcon className="w-6 h-6" />, 
      color: 'bg-indigo-50 text-indigo-600', 
      desc: '大型機具、發電機與資產檢驗紀錄' 
    },
    { 
      id: 'equipment_vehicles', 
      label: '車輛管理', 
      icon: <TruckIcon className="w-6 h-6" />, 
      color: 'bg-emerald-50 text-emerald-600', 
      desc: '公司工程車、公務車之里程與保險維修' 
    },
  ];

  const visibleCategories = categories.filter(cat => allowedViews.includes(cat.id));

  return (
    <div className="p-6 max-w-5xl mx-auto h-full animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800">設備與工具管理</h1>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">Asset & Tool Management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onNavigate(cat.id)}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all group flex flex-col items-center text-center gap-4"
          >
            <div className={`p-4 rounded-2xl ${cat.color} group-hover:scale-110 transition-transform`}>
              {cat.icon}
            </div>
            <div className="font-bold text-slate-800 text-lg">{cat.label}</div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">{cat.desc}</p>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-auto pt-4">Module</p>
          </button>
        ))}
      </div>
      
      <div className="mt-12 p-6 bg-slate-900 rounded-[32px] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-yellow-500">
             <ShieldIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">資產維護提示</h3>
            <p className="text-xs text-slate-400">系統將自動根據下次檢驗日期或里程數發出通知</p>
          </div>
        </div>
        <div className="relative z-10 bg-white/10 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-white/10">
          Smart Maintenance Active
        </div>
        <WrenchIcon className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 rotate-12" />
      </div>
    </div>
  );
};

export default EquipmentModule;
