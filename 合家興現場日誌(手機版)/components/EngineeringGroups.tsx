import React from 'react';
import { GlobalTeamConfigs, TeamConfig } from '../types';
import { UsersIcon, UserIcon, TruckIcon } from './Icons';

interface EngineeringGroupsProps {
  globalTeamConfigs: GlobalTeamConfigs;
  onUpdateGlobalTeamConfigs: (configs: GlobalTeamConfigs) => void;
}

const EngineeringGroups: React.FC<EngineeringGroupsProps> = ({ globalTeamConfigs, onUpdateGlobalTeamConfigs }) => {
  const teams = [1, 2, 3, 4, 5, 6, 7, 8];

  const handleUpdateConfig = (teamId: number, field: keyof TeamConfig, value: string) => {
    const newConfigs = { ...globalTeamConfigs };
    if (!newConfigs[teamId]) {
      newConfigs[teamId] = { master: '', assistant: '', carNumber: '' };
    }
    newConfigs[teamId] = { ...newConfigs[teamId], [field]: value };
    onUpdateGlobalTeamConfigs(newConfigs);
  };

  return (
    <div className="p-4 md:p-6 max-w-full overflow-hidden animate-fade-in flex flex-col h-full bg-slate-50">
      {/* 表頭 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-6 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-blue-200 shadow-lg">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">工程小組預設設定</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Global Team Management</p>
          </div>
        </div>
        <div className="text-right">
           <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">一次設定 · 全域生效</span>
        </div>
      </div>

      {/* 小組配置網格 */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.map(teamId => {
            const config = globalTeamConfigs[teamId] || { master: '', assistant: '', carNumber: '' };
            return (
              <div key={teamId} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all group overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center group-hover:bg-blue-50 transition-colors">
                   <span className="text-xs font-black text-slate-400 group-hover:text-blue-600 uppercase tracking-widest">第 {teamId} 組</span>
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <TruckIcon className="w-3.5 h-3.5 text-blue-400" />
                      <input 
                        type="text" 
                        value={config.carNumber || ''}
                        onChange={(e) => handleUpdateConfig(teamId, 'carNumber', e.target.value)}
                        placeholder="車號"
                        className="bg-transparent outline-none text-[11px] font-bold text-slate-600 w-16"
                      />
                   </div>
                </div>

                <div className="p-4 space-y-4">
                   <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">預設師傅</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
                          <UserIcon className="w-4 h-4 text-blue-400" />
                          <input 
                            type="text" 
                            list="employee-nicknames-list"
                            value={config.master}
                            onChange={(e) => handleUpdateConfig(teamId, 'master', e.target.value)}
                            placeholder="姓名"
                            className="bg-transparent outline-none text-sm font-bold text-slate-700 w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">預設助手</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
                          <div className="w-4 h-4 rounded-full border-2 border-slate-200 bg-slate-100" />
                          <input 
                            type="text" 
                            list="employee-nicknames-list"
                            value={config.assistant}
                            onChange={(e) => handleUpdateConfig(teamId, 'assistant', e.target.value)}
                            placeholder="姓名"
                            className="bg-transparent outline-none text-sm font-medium text-slate-500 w-full"
                          />
                        </div>
                      </div>
                   </div>
                </div>
                
                <div className="mt-auto px-4 py-2 bg-slate-50/50 text-[10px] text-slate-400 font-medium italic border-t border-slate-100">
                   此處變更將影響所有週別的初始顯示
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 px-4 py-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            💡 提示：此頁面用於管理系統的「永久固定配置」。設定完成後，週間工作會自動載入這些人員，您只需在「明日排程」針對突發的人力異動進行微調即可。
         </p>
      </div>
    </div>
  );
};

export default EngineeringGroups;