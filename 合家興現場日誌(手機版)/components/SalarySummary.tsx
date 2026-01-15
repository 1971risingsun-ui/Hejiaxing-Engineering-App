
import React from 'react';
import { Employee, AttendanceRecord, OvertimeRecord, MonthSummaryRemark, DailyDispatch as DailyDispatchType } from '../types';
import { BoxIcon } from './Icons';

interface SalarySummaryProps {
  selectedMonth: string;
  employees: Employee[];
  attendance: AttendanceRecord[];
  overtime: OvertimeRecord[];
  monthRemarks: MonthSummaryRemark[];
  dailyDispatches: DailyDispatchType[];
}

const SalarySummary: React.FC<SalarySummaryProps> = ({ 
  selectedMonth, employees, attendance, overtime, monthRemarks, dailyDispatches
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <BoxIcon className="w-4 h-4 text-blue-600" /> {selectedMonth} 月薪資統計彙整
        </h3>
      </div>
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0">
            <tr className="border-b border-slate-200">
              <th className="px-6 py-4">姓名</th>
              <th className="px-6 py-4">職務類別</th>
              <th className="px-6 py-4">出勤摘要 (天數)</th>
              <th className="px-6 py-4 text-center">總加班時數</th>
              <th className="px-6 py-4">月備註</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map(emp => {
              const empOvertime = overtime.filter(o => o.employeeId === emp.id && o.date.startsWith(selectedMonth));
              const totalOt = empOvertime.reduce((sum, curr) => sum + curr.hours, 0);
              
              // 計算當月所有天數的有效狀態
              const [year, month] = selectedMonth.split('-').map(Number);
              const daysInMonth = new Date(year, month, 0).getDate();
              const statusCounts: Record<string, number> = {};

              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                
                // 1. 查找手動出勤紀錄
                const record = attendance.find(a => a.employeeId === emp.id && a.date === dateStr);
                let status = record ? record.status : '';

                // 2. 若無手動紀錄或為排休，檢查派工連動邏輯 (與 AttendanceTable 保持一致)
                if (status === '' || status === '排休') {
                  const dispatch = dailyDispatches.find(disp => disp.date === dateStr);
                  if (dispatch) {
                    const empNick = emp.nickname || emp.name;
                    for (const teamId in dispatch.teams) {
                      const team = dispatch.teams[teamId];
                      if (team.tasks && team.tasks.length > 0 && team.assistants && team.assistants.includes(empNick)) {
                        status = team.master; // 統計為師傅暱稱
                        break;
                      }
                    }
                  }
                }

                // 3. 若仍無狀態且為週日，預設為排休
                if (status === '' && !record && new Date(dateStr).getDay() === 0) {
                  status = '排休';
                }

                // 加入統計
                if (status) {
                  statusCounts[status] = (statusCounts[status] || 0) + 1;
                }
              }

              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800">{emp.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      emp.category === '現場' ? 'bg-blue-100 text-blue-700' :
                      emp.category === '做件' ? 'bg-orange-100 text-orange-700' :
                      emp.category === '辦公室' ? 'bg-purple-100 text-purple-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {emp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <span key={status} className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          status === '排休' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {status}: {count}
                        </span>
                      ))}
                      {Object.keys(statusCounts).length === 0 && <span className="text-slate-400 italic text-xs">無紀錄</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-black text-orange-600">{totalOt}</span>
                    <span className="text-xs text-slate-400 ml-1">hrs</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">
                    {monthRemarks.find(r => r.month === selectedMonth && r.employeeId === emp.id)?.remark || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalarySummary;
