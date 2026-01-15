
import React, { useState, useMemo } from 'react';
import { Project, WeeklySchedule as WeeklyScheduleType, GlobalTeamConfigs, TeamConfig } from '../types';
import { ChevronRightIcon, CalendarIcon, UserIcon, PlusIcon, XIcon, TruckIcon, HomeIcon, NavigationIcon } from './Icons';

interface WeeklyScheduleProps {
  projects: Project[];
  weeklySchedules: WeeklyScheduleType[];
  globalTeamConfigs: GlobalTeamConfigs;
  onUpdateWeeklySchedules: (schedules: WeeklyScheduleType[]) => void;
  onOpenDrivingTime: () => void;
}

const ROC_HOLIDAYS = ['01-01', '02-28', '04-04', '04-05', '05-01', '10-10'];

const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({ projects, weeklySchedules, globalTeamConfigs, onUpdateWeeklySchedules, onOpenDrivingTime }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff)).toISOString().split('T')[0];
  });

  const teams = [1, 2, 3, 4, 5, 6, 7, 8];
  
  const weekDays = useMemo(() => {
    const dates = [];
    const start = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }, [currentWeekStart]);

  const projectsByDate = useMemo(() => {
    const map: Record<string, Project[]> = {};
    projects.forEach(p => {
      if (p.appointmentDate) {
        if (!map[p.appointmentDate]) map[p.appointmentDate] = [];
        map[p.appointmentDate].push(p);
      }
    });
    return map;
  }, [projects]);

  const currentSchedule = useMemo(() => {
    return weeklySchedules.find(s => s.weekStartDate === currentWeekStart) || {
      weekStartDate: currentWeekStart,
      teamConfigs: {},
      days: {}
    };
  }, [weeklySchedules, currentWeekStart]);

  const handleUpdateTeamConfig = (teamId: number, field: keyof TeamConfig, value: string) => {
    const newWeeklySchedules = [...weeklySchedules];
    let weekIdx = newWeeklySchedules.findIndex(s => s.weekStartDate === currentWeekStart);
    
    if (weekIdx === -1) {
      newWeeklySchedules.push({ weekStartDate: currentWeekStart, teamConfigs: {}, days: {} });
      weekIdx = newWeeklySchedules.length - 1;
    }

    const week = { ...newWeeklySchedules[weekIdx] };
    if (!week.teamConfigs) week.teamConfigs = {};
    if (!week.teamConfigs[teamId]) {
      week.teamConfigs[teamId] = { master: '', assistant: '', carNumber: '' };
    }
    
    week.teamConfigs[teamId] = { ...week.teamConfigs[teamId], [field]: value };
    newWeeklySchedules[weekIdx] = week;
    onUpdateWeeklySchedules(newWeeklySchedules);
  };

  const handleAddTask = (date: string, teamId: number, taskName: string) => {
    if (!taskName.trim()) return;
    const newWeeklySchedules = [...weeklySchedules];
    let weekIdx = newWeeklySchedules.findIndex(s => s.weekStartDate === currentWeekStart);
    if (weekIdx === -1) {
      newWeeklySchedules.push({ weekStartDate: currentWeekStart, teamConfigs: {}, days: {} });
      weekIdx = newWeeklySchedules.length - 1;
    }
    const week = { ...newWeeklySchedules[weekIdx] };
    if (!week.days[date]) week.days[date] = { date, teams: {} };
    const day = { ...week.days[date] };
    if (!day.teams[teamId]) day.teams[teamId] = { tasks: [] };
    if (!day.teams[teamId].tasks.includes(taskName)) {
      day.teams[teamId].tasks = [...day.teams[teamId].tasks, taskName];
      week.days[date] = day;
      newWeeklySchedules[weekIdx] = week;
      onUpdateWeeklySchedules(newWeeklySchedules);
    }
  };

  const handleRemoveTask = (date: string, teamId: number, taskName: string) => {
    const newWeeklySchedules = [...weeklySchedules];
    const weekIdx = newWeeklySchedules.findIndex(s => s.weekStartDate === currentWeekStart);
    if (weekIdx === -1) return;
    const week = { ...newWeeklySchedules[weekIdx] };
    const day = { ...week.days[date] };
    if (day?.teams[teamId]) {
      day.teams[teamId].tasks = (day.teams[teamId].tasks || []).filter(t => t !== taskName);
      week.days[date] = day;
      newWeeklySchedules[weekIdx] = week;
      onUpdateWeeklySchedules(newWeeklySchedules);
    }
  };

  const navigateWeek = (direction: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + (direction * 7));
    setCurrentWeekStart(d.toISOString().split('T')[0]);
  };

  return (
    <div className="p-4 md:p-6 max-w-full overflow-hidden animate-fade-in flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-4 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 min-w-[150px] text-center">
            {currentWeekStart} 週
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenDrivingTime} className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors mr-2">
            <NavigationIcon className="w-4 h-4" />
            路徑估算
          </button>
          <button onClick={() => navigateWeek(-1)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"><ChevronRightIcon className="w-4 h-4 rotate-180" /></button>
          <button onClick={() => {
              const today = new Date();
              const day = today.getDay();
              const diff = today.getDate() - day + (day === 0 ? -6 : 1);
              setCurrentWeekStart(new Date(today.setDate(diff)).toISOString().split('T')[0]);
            }} className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-all">本週</button>
          <button onClick={() => navigateWeek(1)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"><ChevronRightIcon className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
        <table className="w-full border-collapse table-fixed min-w-[1700px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider divide-x divide-slate-200">
              <th className="w-32 p-2 sticky left-0 z-20 bg-slate-50 text-center">日期 / 預約案件</th>
              {teams.map(teamId => {
                const global = globalTeamConfigs[teamId] || { master: '', assistant: '', carNumber: '' };
                const weekOverride = currentSchedule.teamConfigs?.[teamId];
                const isOverridden = !!(weekOverride?.master || weekOverride?.assistant || weekOverride?.carNumber);

                return (
                  <th key={`head-${teamId}`} className={`p-2 ${isOverridden ? 'bg-amber-50/30' : 'bg-indigo-50/20'}`}>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center px-1">
                         <div className={`text-[10px] font-black ${isOverridden ? 'text-amber-600' : 'text-indigo-600'}`}>
                           第 {teamId} 組 {isOverridden && '(本週微調)'}
                         </div>
                         <div className={`flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border shadow-sm ${weekOverride?.carNumber ? 'border-amber-300' : 'border-slate-200'}`}>
                            <TruckIcon className="w-2.5 h-2.5 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder={global.carNumber || "車號"}
                              value={weekOverride?.carNumber || ''}
                              onChange={(e) => handleUpdateTeamConfig(teamId, 'carNumber', e.target.value)}
                              className={`w-10 text-[9px] outline-none bg-transparent font-bold ${weekOverride?.carNumber ? 'text-amber-700' : 'text-slate-400'}`}
                            />
                         </div>
                      </div>
                      <div className="flex gap-1">
                        <div className={`flex-1 flex items-center gap-1 px-1.5 py-0.5 bg-white border rounded shadow-sm ${weekOverride?.master ? 'border-amber-300' : 'border-slate-200'}`}>
                          <UserIcon className="w-2.5 h-2.5 text-slate-300" />
                          <input 
                            type="text" 
                            list="employee-nicknames-list"
                            placeholder={global.master || "師傅"}
                            value={weekOverride?.master || ''}
                            onChange={(e) => handleUpdateTeamConfig(teamId, 'master', e.target.value)}
                            className={`w-full text-[10px] outline-none bg-transparent font-bold ${weekOverride?.master ? 'text-slate-800' : 'text-slate-400'}`}
                          />
                        </div>
                        <div className={`flex-1 flex items-center gap-1 px-1.5 py-0.5 bg-white border rounded shadow-sm ${weekOverride?.assistant ? 'border-amber-300' : 'border-slate-200'}`}>
                          <div className="w-2 h-2 border border-slate-200 rounded-full bg-slate-50" />
                          <input 
                            type="text" 
                            list="employee-nicknames-list"
                            placeholder={global.assistant || "助手"}
                            value={weekOverride?.assistant || ''}
                            onChange={(e) => handleUpdateTeamConfig(teamId, 'assistant', e.target.value)}
                            className={`w-full text-[10px] outline-none bg-transparent font-bold ${weekOverride?.assistant ? 'text-slate-600' : 'text-slate-400'}`}
                          />
                        </div>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
            <tr className="bg-slate-100 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-t border-slate-200">
              <th className="p-1 sticky left-0 z-20 bg-slate-100 text-center">日期資訊</th>
              {teams.map(t => <th key={`task-header-${t}`} className="p-1 border-l border-slate-200 text-center">施作內容</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {weekDays.map(date => {
              const dayProjects = projectsByDate[date] || [];
              const isHoliday = new Date(date).getDay() === 0 || ROC_HOLIDAYS.includes(date.substring(5));
              
              return (
                <tr key={date} className={`${isHoliday ? 'bg-red-50/20' : 'hover:bg-slate-50/30'}`}>
                  <td className={`p-2 sticky left-0 z-10 font-bold border-r border-slate-200 bg-white text-slate-700 align-top`}>
                    <div className="text-center mb-2">
                        <div className="text-[10px] opacity-60">{date.substring(5)}</div>
                        <div className="text-xs">{['週日','週一','週二','週三','週四','週五','週六'][new Date(date).getDay()]}</div>
                    </div>
                    
                    {dayProjects.length > 0 && (
                        <div className="space-y-1">
                            <div className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter border-b border-blue-100 pb-0.5 mb-1 flex items-center gap-1">
                                <HomeIcon className="w-2.5 h-2.5" /> 預約案件
                            </div>
                            {dayProjects.map(p => (
                                <div key={p.id} className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[9px] truncate shadow-sm border border-blue-700" title={p.name}>
                                    {p.name}
                                </div>
                            ))}
                        </div>
                    )}
                  </td>
                  {teams.map(teamId => {
                    const assignment = currentSchedule.days[date]?.teams[teamId] || { tasks: [] };
                    return (
                      <td key={teamId} className="p-1.5 border-r border-slate-200 align-top min-h-[80px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap gap-1">
                            {assignment.tasks.map((t, idx) => (
                              <div key={`${t}-${idx}`} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 text-[10px] font-bold">
                                <span className="truncate max-w-[100px]">{t}</span>
                                <button onClick={() => handleRemoveTask(date, teamId, t)} className="text-indigo-300 hover:text-indigo-600"><XIcon className="w-2.5 h-2.5" /></button>
                              </div>
                            ))}
                          </div>
                          <div className="relative">
                            <input 
                              list={`projects-list-${teamId}-${date}`}
                              placeholder="代入案件..." 
                              className="w-full text-[11px] outline-none px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddTask(date, teamId, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (projects.some(p => p.name === val)) {
                                  handleAddTask(date, teamId, val);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <datalist id={`projects-list-${teamId}-${date}`}>{projects.map(p => <option key={p.id} value={p.name} />)}</datalist>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklySchedule;
