import React, { useMemo } from 'react';
import { Employee, OvertimeRecord, MonthSummaryRemark } from '../types';

interface OvertimeTableProps {
  selectedMonth: string;
  employees: Employee[];
  overtime: OvertimeRecord[];
  monthRemarks: MonthSummaryRemark[];
  onUpdateOvertime: (list: OvertimeRecord[]) => void;
  onUpdateMonthRemarks: (list: MonthSummaryRemark[]) => void;
}

const ROC_HOLIDAYS = ['01-01', '02-28', '04-04', '04-05', '05-01', '10-10'];

const OvertimeTable: React.FC<OvertimeTableProps> = ({ 
  selectedMonth, employees, overtime, monthRemarks, onUpdateOvertime, onUpdateMonthRemarks 
}) => {
  const monthDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 0);
    const days = date.getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const isSunday = dayOfWeek === 0;
      const isHoliday = ROC_HOLIDAYS.includes(dateStr.slice(5));
      return { day: d, dateStr, isSunday, isHoliday };
    });
  }, [selectedMonth]);

  const updateOvertime = (date: string, employeeId: string, hours: string) => {
    const h = parseFloat(hours) || 0;
    const newList = [...overtime.filter(o => !(o.date === date && o.employeeId === employeeId))];
    if (h > 0) newList.push({ date, employeeId, hours: h });
    onUpdateOvertime(newList);
  };

  const updateMonthRemark = (employeeId: string, remark: string) => {
    const newList = [...monthRemarks.filter(r => !(r.month === selectedMonth && r.employeeId === employeeId))];
    newList.push({ month: selectedMonth, employeeId, remark });
    onUpdateMonthRemarks(newList);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full border-collapse text-[11px] min-w-[1200px]">
          <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-24 p-2 border-r bg-slate-50 sticky left-0 z-30 shadow-[1px_0_0_0_#e2e8f0]">姓名</th>
              {monthDays.map(day => (
                <th key={day.day} className={`w-10 p-1 border-r ${day.isSunday || day.isHoliday ? 'bg-red-50 text-red-600' : ''}`}>
                  <div>{day.day}</div>
                  <div className="scale-75 opacity-60 font-medium">{['日','一','二','三','四','五','六'][new Date(day.dateStr).getDay()]}</div>
                </th>
              ))}
              <th className="w-32 p-2 min-w-[150px]">備註</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50/50 group">
                <td className="p-2 font-bold text-slate-700 border-r sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[1px_0_0_0_#e2e8f0]">{emp.name}</td>
                {monthDays.map(day => {
                  const hours = overtime.find(o => o.date === day.dateStr && o.employeeId === emp.id)?.hours || '';
                  return (
                    <td key={day.day} className={`p-0 border-r ${day.isSunday || day.isHoliday ? 'bg-red-50/20' : ''}`}>
                      <input 
                        type="number" step="0.5" min="0"
                        className="w-full h-8 text-center bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-bold text-orange-600"
                        value={hours}
                        onChange={(e) => updateOvertime(day.dateStr, emp.id, e.target.value)}
                      />
                    </td>
                  );
                })}
                <td className="p-1">
                  <input 
                    type="text" 
                    value={monthRemarks.find(r => r.month === selectedMonth && r.employeeId === emp.id)?.remark || ''}
                    onChange={(e) => updateMonthRemark(emp.id, e.target.value)}
                    className="w-full px-2 py-1 text-[10px] outline-none bg-transparent border border-transparent focus:border-slate-200 rounded text-slate-600"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OvertimeTable;