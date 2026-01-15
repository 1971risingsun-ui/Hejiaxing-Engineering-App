import React from 'react';
import { BoxIcon, FileTextIcon, UsersIcon, ClipboardListIcon, AlertIcon, TruckIcon } from './Icons';

interface PurchasingModuleProps {
  onNavigate: (view: any) => void;
  allowedViews: string[];
}

const PurchasingModule: React.FC<PurchasingModuleProps> = ({ onNavigate, allowedViews }) => {
  const categories = [
    { 
      id: 'purchasing_items', 
      label: '採購項目', 
      icon: <ClipboardListIcon className="w-6 h-6" />, 
      color: 'bg-indigo-50 text-indigo-600', 
      desc: '自動導入報價單清單並預計採購日期' 
    },
    { 
      id: 'stock_alert', 
      label: '常備庫存爆量通知', 
      icon: <AlertIcon className="w-6 h-6" />, 
      color: 'bg-red-50 text-red-600', 
      desc: '管理常規物料追加需求，及時採購不中斷' 
    },
    { 
      id: 'purchasing_orders', 
      label: '採購單', 
      icon: <FileTextIcon className="w-6 h-6" />, 
      color: 'bg-blue-50 text-blue-600', 
      desc: '建立對供應商的正式採購單' 
    },
    { 
      id: 'purchasing_inbounds', 
      label: '進料明細', 
      icon: <TruckIcon className="w-6 h-6" />, 
      color: 'bg-amber-50 text-amber-600', 
      desc: '追蹤已下單採購項目的到貨進度' 
    },
    { 
      id: 'purchasing_suppliers', 
      label: '供應商清冊', 
      icon: <UsersIcon className="w-6 h-6" />, 
      color: 'bg-emerald-50 text-emerald-600', 
      desc: '管理廠商資訊、聯絡方式與產品清單' 
    },
    { 
      id: 'purchasing_subcontractors', 
      label: '外包廠商', 
      icon: <UsersIcon className="w-6 h-6" />, 
      color: 'bg-indigo-50 text-indigo-600', 
      desc: '管理長期合作之點工、吊卡等協力夥伴' 
    },
  ];

  const visibleCategories = categories.filter(cat => allowedViews.includes(cat.id));

  return (
    <div className="p-6 max-w-5xl mx-auto h-full animate-fade-in overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800">採購與供應鏈管理</h1>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">Purchasing & Supply Chain</p>
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
    </div>
  );
};

export default PurchasingModule;