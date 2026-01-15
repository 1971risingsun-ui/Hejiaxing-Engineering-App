
import React, { useState } from 'react';
import { Employee, AttendanceRecord, OvertimeRecord, MonthSummaryRemark, DailyDispatch as DailyDispatchType } from '../types';
import { CalendarIcon, ClipboardListIcon, ClockIcon, BoxIcon, UsersIcon, ArrowLeftIcon, SparklesIcon } from './Icons';
import AttendanceTable from './AttendanceTable';
import OvertimeTable from './OvertimeTable';
import SalarySummary from './SalarySummary';
import EmployeeList from './EmployeeList';

interface HRManagementProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  overtime: OvertimeRecord[];
  monthRemarks: MonthSummaryRemark[];
  dailyDispatches: DailyDispatchType[];
  onUpdateEmployees: (list: Employee[]) => void;
  onUpdateAttendance: (list: AttendanceRecord[]) => void;
  onUpdateOvertime: (list: OvertimeRecord[]) => void;
  onUpdateMonthRemarks: (list: MonthSummaryRemark[]) => void;
}

const HRManagement: React.FC<HRManagementProps> = ({ 
  employees, attendance, overtime, monthRemarks, dailyDispatches,
  onUpdateEmployees, onUpdateAttendance, onUpdateOvertime, onUpdateMonthRemarks 
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'attendance' | 'overtime' | 'salary' | 'list'>('menu');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const hrModules = [
    { 
      id: 'attendance', 
      label: '出勤紀錄', 
      icon: <ClipboardListIcon className="w-6 h-6" />, 
      color: 'bg-blue-50 text-blue-600', 
      desc: '登記每日出勤狀況與請假事由' 
    },
    { 
      id: 'overtime', 
      label: '加班登錄', 
      icon: <ClockIcon className="w-6 h-6" />, 
      color: 'bg-orange-50 text-orange-600', 
      desc: '紀錄人員每日加班時數與備註' 
    },
    { 
      id: 'salary', 
      label: '薪資計算', 
      icon: <BoxIcon className="w-6 h-6" />, 
      color: 'bg-emerald-50 text-emerald-600', 
      desc: '依月份統計出勤明細與加班總時數' 
    },
    { 
      id: 'list', 
      label: '人員名單', 
      icon: <UsersIcon className="w-6 h-6" />, 
      color: 'bg-indigo-50 text-indigo-600', 
      desc: '管理全體員工基本資訊與職務類別' 
    },
  ];

  if (activeTab === 'menu') {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50">
        <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-slate-900 p-3.5 rounded-2xl text-white shadow-lg">
              <UsersIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">人事管理中心</h1>
              <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                <SparklesIcon className="w-3.5 h-3.5 text-blue-500" />
                管理出勤、加班、人員名單與薪資彙整
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-10">
            {hrModules.map(module => (
              <button
                key={module.id}
                onClick={() => setActiveTab(module.id as any)}
                className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all group flex flex-col items-center text-center gap-4"
              >
                <div className={`p-4 rounded-2xl ${module.color} group-hover:scale-110 transition-transform`}>
                  {module.icon}
                </div>
                <div className="font-bold text-slate-800 text-lg">{module.label}</div>
                <p className="text-xs text-slate-400 font-medium">{module.desc}</p>
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-2">HR Module</p>
              </button>
            ))}
          </div>

          <div className="mt-auto p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between shadow-sm">
            <p className="text-[10px] text-blue-700 font-bold uppercase tracking-widest leading-relaxed">
               💡 系統提示：出勤與加班數據會隨月份自動切換。國定假日與星期日已在表格中自動標記。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden animate-fade-in">
      <div className="p-4 md:p-6 pb-2">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('menu')}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
              title="返回人事選單"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-black text-slate-800">
                {hrModules.find(m => m.id === activeTab)?.label}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                HR Management / {activeTab}
              </p>
            </div>
          </div>
          
          {activeTab !== 'list' && (
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto justify-center">
              <CalendarIcon className="w-4 h-4 text-slate-500" />
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-4 md:px-6 pb-6 overflow-hidden">
        {activeTab === 'attendance' && (
          <AttendanceTable 
            selectedMonth={selectedMonth}
            employees={employees}
            attendance={attendance}
            monthRemarks={monthRemarks}
            dailyDispatches={dailyDispatches}
            onUpdateAttendance={onUpdateAttendance}
            onUpdateMonthRemarks={onUpdateMonthRemarks}
          />
        )}
        {activeTab === 'overtime' && (
          <OvertimeTable 
            selectedMonth={selectedMonth}
            employees={employees}
            overtime={overtime}
            monthRemarks={monthRemarks}
            onUpdateOvertime={onUpdateOvertime}
            onUpdateMonthRemarks={onUpdateMonthRemarks}
          />
        )}
        {activeTab === 'salary' && (
          <SalarySummary 
            selectedMonth={selectedMonth}
            employees={employees}
            attendance={attendance}
            overtime={overtime}
            monthRemarks={monthRemarks}
            dailyDispatches={dailyDispatches}
          />
        )}
        {activeTab === 'list' && (
          <EmployeeList 
            employees={employees}
            onUpdateEmployees={onUpdateEmployees}
          />
        )}
      </div>
    </div>
  );
};

export default HRManagement;
