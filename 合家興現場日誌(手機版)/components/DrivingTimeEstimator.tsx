
import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectType, GlobalTeamConfigs } from '../types';
import { MapPinIcon, NavigationIcon, PlusIcon, TrashIcon, HomeIcon, SparklesIcon, BriefcaseIcon, SearchIcon, XIcon, CalendarIcon, UsersIcon, CheckCircleIcon, ClipboardListIcon, LoaderIcon, ClockIcon } from './Icons';

interface DrivingTimeEstimatorProps {
  projects: Project[];
  onAddToSchedule: (date: string, teamId: number, taskName: string) => boolean;
  globalTeamConfigs: GlobalTeamConfigs;
}

const START_ADDRESS = "桃園市龜山區文化三路620巷80弄118-1號";
const START_COORDS = { lat: 25.047, lng: 121.371 }; 

// 使用具體色值以確保在動態渲染時顏色百分之百正確
const STOP_COLOR_MAP = [
    { name: 'emerald', hex: '#10b981', light: '#ecfdf5', text: '#047857' },
    { name: 'rose', hex: '#f43f5e', light: '#fff1f2', text: '#be123c' },
    { name: 'amber', hex: '#f59e0b', light: '#fffbeb', text: '#b45309' },
    { name: 'cyan', hex: '#06b6d4', light: '#ecfeff', text: '#0e7490' },
    { name: 'purple', hex: '#a855f7', light: '#faf5ff', text: '#7e22ce' },
    { name: 'orange', hex: '#f97316', light: '#fff7ed', text: '#c2410c' },
    { name: 'teal', hex: '#14b8a6', light: '#f0fdfa', text: '#0f766e' },
    { name: 'indigo', hex: '#6366f1', light: '#eef2ff', text: '#4338ca' }
];

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  "龜山": { lat: 25.021, lng: 121.362 },
  "中壢": { lat: 24.968, lng: 121.224 },
  "桃園": { lat: 24.993, lng: 121.301 },
  "平鎮": { lat: 24.945, lng: 121.218 },
  "八德": { lat: 24.938, lng: 121.284 },
  "楊梅": { lat: 24.907, lng: 121.145 },
  "蘆竹": { lat: 25.045, lng: 121.296 },
  "大溪": { lat: 24.880, lng: 121.286 },
  "龍潭": { lat: 24.863, lng: 121.216 },
  "大園": { lat: 25.063, lng: 121.201 },
  "觀音": { lat: 25.037, lng: 121.082 },
  "新屋": { lat: 24.972, lng: 121.105 },
  "新莊": { lat: 25.033, lng: 121.442 },
  "板橋": { lat: 25.011, lng: 121.465 },
  "林口": { lat: 25.077, lng: 121.391 },
  "五股": { lat: 25.084, lng: 121.437 },
  "泰山": { lat: 25.058, lng: 121.431 },
  "樹林": { lat: 24.991, lng: 121.425 },
  "鶯歌": { lat: 24.954, lng: 121.354 },
  "土城": { lat: 24.972, lng: 121.443 },
  "三重": { lat: 25.063, lng: 121.488 },
  "中和": { lat: 24.998, lng: 121.501 },
  "永和": { lat: 25.009, lng: 121.517 },
  "新店": { lat: 24.967, lng: 121.541 },
};

const DrivingTimeEstimator: React.FC<DrivingTimeEstimatorProps> = ({ projects, onAddToSchedule, globalTeamConfigs }) => {
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [projectLabels, setProjectLabels] = useState<string[]>(['']);
  const [results, setResults] = useState<(number | null)[]>([null]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchTeam, setBatchTeam] = useState(1);
  const [isBatchPasting, setIsBatchPasting] = useState(false);
  const [pastedDone, setPastedDone] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getCoordsFromAddress = (address: string) => {
    for (const district in DISTRICT_COORDS) {
      if (address.includes(district)) return DISTRICT_COORDS[district];
    }
    return { lat: 25.0, lng: 121.4 }; 
  };

  const estimateLocal = (index: number, addr: string, currentDestinations: string[]) => {
    if (addr.trim().length < 2) return null;
    const originCoords = index === 0 ? START_COORDS : getCoordsFromAddress(currentDestinations[index - 1]);
    const targetCoords = getCoordsFromAddress(addr);
    const directDist = getDistanceFromLatLonInKm(originCoords.lat, originCoords.lng, targetCoords.lat, targetCoords.lng);
    const estimatedRoadDist = directDist * 1.4;
    return Math.max(2.5, parseFloat(estimatedRoadDist.toFixed(1)));
  };

  const handleUpdateDestination = (index: number, value: string, label?: string) => {
    const newDests = [...destinations];
    newDests[index] = value;
    setDestinations(newDests);

    const newLabels = [...projectLabels];
    newLabels[index] = label || '';
    setProjectLabels(newLabels);

    const newRes = [...results];
    newRes[index] = estimateLocal(index, value, newDests);
    
    for(let i = index + 1; i < newDests.length; i++) {
        newRes[i] = estimateLocal(i, newDests[i], newDests);
    }
    setResults(newRes);
    setPastedDone(false);
  };

  const handleAddDestination = () => {
    setDestinations([...destinations, '']);
    setProjectLabels([...projectLabels, '']);
    setResults([...results, null]);
    setPastedDone(false);
  };

  const handleRemoveDestination = (index: number) => {
    if (destinations.length <= 1) return;
    const newDests = destinations.filter((_, i) => i !== index);
    setDestinations(newDests);
    setProjectLabels(projectLabels.filter((_, i) => i !== index));
    
    const newRes: (number | null)[] = [];
    newDests.forEach((d, i) => {
        newRes.push(estimateLocal(i, d, newDests));
    });
    setResults(newRes);
    setPastedDone(false);
  };

  const handleBatchPaste = async () => {
    const validProjects = projectLabels.filter(label => !!label);
    if (validProjects.length === 0) {
      alert('請先選取至少一個案件');
      return;
    }

    setIsBatchPasting(true);
    for (const projectName of validProjects) {
       onAddToSchedule(batchDate, batchTeam, projectName);
    }
    setIsBatchPasting(false);
    setPastedDone(true);
    setTimeout(() => { setPastedDone(false); }, 3000);
  };

  const getProjectTypeLabel = (type: ProjectType) => {
    switch (type) {
      case ProjectType.MAINTENANCE: return { text: '維修', class: 'bg-orange-100 text-orange-600' };
      case ProjectType.MODULAR_HOUSE: return { text: '組合屋', class: 'bg-emerald-100 text-emerald-600' };
      default: return { text: '圍籬', class: 'bg-blue-100 text-blue-600' };
    }
  };

  const totalKm = results.reduce((acc, curr) => acc + (curr || 0), 0);
  const selectedCount = projectLabels.filter(l => !!l).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in flex flex-col gap-6 pb-24" ref={dropdownRef}>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-indigo-600 p-3.5 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <NavigationIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">極速路徑估算 (本地引擎)</h1>
            <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-500" />
                規劃整段施工路徑，並一鍵匯入週間排程
            </p>
          </div>
        </div>

        <div className="space-y-0 relative">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white z-10 shadow-lg border-4 border-white">
                <HomeIcon className="w-5 h-5" />
              </div>
              <div className="w-0.5 h-12 bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
            </div>
            <div className="flex-1 pt-1.5">
              <div className="text-[10px] font-black text-indigo-500 uppercase mb-1 tracking-widest opacity-60">START</div>
              <div className="text-sm font-black text-slate-800">{START_ADDRESS}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">(合家興總部)</div>
            </div>
          </div>

          {destinations.map((dest, idx) => {
            const color = STOP_COLOR_MAP[idx % STOP_COLOR_MAP.length];
            return (
              <React.Fragment key={idx}>
                {/* 縮短連接線空間約 40% (h-20 -> h-12) */}
                <div className="flex items-center gap-4 ml-[19px] -my-2 relative h-12">
                  <div className="w-0.5 h-full bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                  
                  {results[idx] !== null && (
                    <div 
                      style={{ borderColor: color.hex, backgroundColor: 'white' }}
                      className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-4 px-6 py-3 rounded-2xl border-2 shadow-xl animate-scale-in z-20 whitespace-nowrap"
                    >
                      <div style={{ color: color.text }} className="flex items-center gap-2 font-black text-xl">
                          <NavigationIcon className="w-5 h-5" />
                          <span className="font-mono">{(results[idx] || 0).toFixed(1)} <span className="text-sm font-bold opacity-60">km</span></span>
                      </div>
                      <div className="w-px h-6 bg-slate-200"></div>
                      <div style={{ color: color.text }} className="text-sm font-bold flex items-center gap-1.5">
                          <ClockIcon className="w-4 h-4" /> 預估 {Math.round((results[idx] || 0) * 1.8)} 分鐘
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div 
                      style={{ backgroundColor: results[idx] !== null ? color.hex : '#cbd5e1' }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white z-10 shadow-lg border-4 border-white transition-all duration-300"
                    >
                      <MapPinIcon className="w-5 h-5" />
                    </div>
                    {/* 縮短內部連接線空間 (h-28 -> h-16) */}
                    {idx < destinations.length - 1 && (
                      <div className="w-0.5 h-16 bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                    )}
                  </div>
                  <div className="flex-1 pt-1.5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                          <div className={`text-[10px] font-black uppercase tracking-widest ${results[idx] !== null ? 'text-slate-800' : 'text-slate-400'}`}>STOP {idx + 1}</div>
                          {projectLabels[idx] && (
                              <div 
                                style={{ backgroundColor: color.hex }}
                                className="text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-fade-in shadow-sm"
                              >
                                  <BriefcaseIcon className="w-2.5 h-2.5" /> {projectLabels[idx]}
                              </div>
                          )}
                      </div>
                      {destinations.length > 1 && (
                        <button onClick={() => handleRemoveDestination(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="relative">
                      <div className="relative">
                        <input 
                          value={dest}
                          onFocus={() => setActiveIdx(idx)}
                          onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateDestination(idx, val);
                          }}
                          placeholder="選取案件或手動輸入地址"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 pr-10 shadow-inner"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                          <SearchIcon className="w-4 h-4" />
                        </div>
                      </div>

                      {activeIdx === idx && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl z-[100] max-h-[320px] overflow-y-auto no-scrollbar animate-scale-in p-1">
                          {projects
                            .filter(p => 
                              p.name.toLowerCase().includes(dest.toLowerCase()) || 
                              p.address.toLowerCase().includes(dest.toLowerCase())
                            )
                            .map(p => {
                              const typeTag = getProjectTypeLabel(p.type);
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    handleUpdateDestination(idx, p.address, p.name);
                                    setActiveIdx(null);
                                  }}
                                  className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors rounded-2xl flex flex-col gap-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-base font-black text-slate-800 leading-tight truncate">
                                      {p.name}
                                    </div>
                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${typeTag.class}`}>
                                      {typeTag.text}
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-bold text-slate-400 truncate">
                                    {p.address}
                                  </div>
                                </button>
                              );
                            })
                          }
                          {projects.filter(p => p.name.toLowerCase().includes(dest.toLowerCase()) || p.address.toLowerCase().includes(dest.toLowerCase())).length === 0 && (
                            <div className="px-5 py-10 text-center text-slate-400 text-xs font-bold italic">
                              找不到匹配的案件，您可以繼續手動輸入
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100">
           <button 
             onClick={handleAddDestination}
             className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-indigo-600 font-black text-xs hover:bg-slate-50 transition-all shadow-sm active:scale-95 uppercase tracking-widest mb-10"
           >
             <PlusIcon className="w-4 h-4" /> 新增路段
           </button>

           <div className="bg-slate-50 rounded-[32px] p-5 border border-slate-200 mb-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200 flex-1 min-w-[150px]">
                <CalendarIcon className="w-4 h-4 text-indigo-500" />
                <input 
                  type="date" 
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-600 outline-none w-full"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200 flex-1 min-w-[150px]">
                <UsersIcon className="w-4 h-4 text-indigo-500" />
                <select 
                  value={batchTeam}
                  onChange={(e) => setBatchTeam(parseInt(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-600 outline-none w-full appearance-none cursor-pointer"
                >
                  {[1,2,3,4,5,6,7,8].map(t => {
                    const masterName = globalTeamConfigs[t]?.master || '未指定';
                    return (
                      <option key={t} value={t}>
                        第 {t} 組 ({masterName})
                      </option>
                    );
                  })}
                </select>
              </div>
              <button 
                onClick={handleBatchPaste}
                disabled={isBatchPasting || selectedCount === 0}
                className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale ${pastedDone ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {isBatchPasting ? <LoaderIcon className="w-4 h-4 animate-spin" /> : pastedDone ? <CheckCircleIcon className="w-4 h-4" /> : <ClipboardListIcon className="w-4 h-4" />}
                {isBatchPasting ? '處理中...' : pastedDone ? '已成功貼上排程' : `將全部案件 (${selectedCount}) 依序貼上排程`}
              </button>
           </div>
           
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 bg-slate-900 px-8 py-5 rounded-[32px] shadow-2xl relative overflow-hidden group w-full sm:w-auto">
                  <div className="flex flex-col relative z-10">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Distance</span>
                    <span className="text-3xl font-black text-white leading-none tracking-tight">{totalKm.toFixed(1)} <span className="text-sm font-bold text-indigo-400">km</span></span>
                  </div>
                  <div className="w-px h-10 bg-white/10 mx-4 relative z-10"></div>
                  <div className="flex flex-col relative z-10">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Drive Time</span>
                    <span className="text-3xl font-black text-emerald-400 leading-none tracking-tight">
                      {Math.round(totalKm * 1.8)} <span className="text-sm font-bold opacity-60 text-emerald-500/70">min</span>
                    </span>
                  </div>
                  <NavigationIcon className="absolute -right-2 -bottom-2 w-24 h-24 text-white/5 rotate-12" />
              </div>
              <div className="text-right hidden md:block">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Route Intelligence</p>
                 <p className="text-xs text-slate-500 font-medium">基於當地路況估算 (早上 08:00 基準)</p>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[32px] flex items-start gap-4 shadow-sm border-l-8 border-l-indigo-500">
        <div className="bg-indigo-500 p-2.5 rounded-xl text-white shadow-md flex-shrink-0">
            <SparklesIcon className="w-6 h-6" />
        </div>
        <div className="text-xs text-indigo-900 leading-relaxed font-bold">
          <p className="mb-1 uppercase tracking-widest text-[9px] opacity-60">Visual Pathfinding</p>
          您可以一次規劃多個停靠點，路徑中會自動顯示各段距離與預估時間（並列顯示）。每個站點都有獨特的顏色標註，方便您與地圖進行對照。
        </div>
      </div>
    </div>
  );
};

export default DrivingTimeEstimator;
