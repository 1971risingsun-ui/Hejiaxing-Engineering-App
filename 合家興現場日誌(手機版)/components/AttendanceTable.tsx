
import React, { useMemo } from 'react';
import { Employee, AttendanceRecord, MonthSummaryRemark, DailyDispatch as DailyDispatchType } from '../types';

interface AttendanceTableProps {
  selectedMonth: string;
  employees: Employee[];
  attendance: AttendanceRecord[];
  monthRemarks: MonthSummaryRemark[];
  dailyDispatches: DailyDispatchType[];
  onUpdateAttendance: (list: AttendanceRecord[]) => void;
  onUpdateMonthRemarks: (list: MonthSummaryRemark[]) => void;
}

const ROC_HOLIDAYS = ['01-01', '02-28', '04-04', '04-05', '05-01', '10-10'];
const ATTENDANCE_OPTIONS = ['排休', '請假', '病假', '臨時請假', '廠內', '下午回廠', '點工'];

const AttendanceTable: React.FC<AttendanceTableProps> = ({ 
  selectedMonth, employees, attendance, monthRemarks, dailyDispatches, onUpdateAttendance, onUpdateMonthRemarks 
}) => {
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

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
      const isYesterday = dateStr === yesterdayStr;
      return { day: d, dateStr, isSunday, isHoliday, isYesterday };
    });
  }, [selectedMonth, yesterdayStr]);

  const updateAttendance = (date: string, employeeId: string, status: string) => {
    let newList = attendance.filter(a => !(a.date === date && a.employeeId === employeeId));
    const dayOfWeek = new Date(date).getDay();
    const isSunday = dayOfWeek === 0;

    // 儲存邏輯：若為空白且是週日，存入空紀錄以覆蓋預設的「排休」顯示
    if (status !== '' || isSunday) {
        newList.push({ date, employeeId, status });
    }
    
    onUpdateAttendance(newList);
  };

  const updateMonthRemark = (employeeId: string, remark: string) => {
    const newList = [...monthRemarks.filter(r => !(r.month === selectedMonth && r.employeeId === employeeId))];
    newList.push({ month: selectedMonth, employeeId, remark });
    onUpdateMonthRemarks(newList);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full border-collapse text-[11px] min-w-[1500px]">
          <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-24 p-2 border-r bg-slate-50 sticky left-0 z-30 shadow-[1px_0_0_0_#e2e8f0]">姓名</th>
              {monthDays.map(day => (
                <th 
                  key={day.day} 
                  className={`w-16 p-1 border-r ${day.isSunday || day.isHoliday ? 'bg-red-50 text-red-600' : ''} ${day.isYesterday ? 'ring-2 ring-inset ring-slate-900 z-10 bg-slate-100 shadow-lg' : ''}`}
                >
                  <div>{day.day}</div>
                  <div className="scale-75 opacity-60 font-medium">{['日','一','二','三','四','五','六'][new Date(day.dateStr).getDay()]}</div>
                </th>
              ))}
              <th className="w-32 p-2 min-w-[150px]">當月備註</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50/50 group">
                <td className="p-2 font-bold text-slate-700 border-r sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] truncate">{emp.name}</td>
                {monthDays.map(day => {
                  const record = attendance.find(a => a.date === day.dateStr && a.employeeId === emp.id);
                  let status = record ? record.status : '';
                  
                  // 檢查派工連動：如果目前狀態是空或是排休
                  if (status === '' || status === '排休') {
                    // 尋找「明日工作排程」中該日期的紀錄
                    const dispatch = dailyDispatches.find(d => d.date === day.dateStr);
                    if (dispatch) {
                      const empNick = emp.nickname || emp.name;
                      // 遍歷所有小組
                      for (const teamId in dispatch.teams) {
                        const team = dispatch.teams[teamId];
                        // 條件 1 & 2：派工項目有資料 且 人員在助手清單中
                        if (team.tasks && team.tasks.length > 0 && team.assistants && team.assistants.includes(empNick)) {
                          status = team.master; // 填入師傅暱稱
                          break;
                        }
                      }
                    }
                  }

                  // 預設顯示：若最終無狀態且為週日，顯示「排休」
                  const displayStatus = (status === '' && !record && day.isSunday) ? '排休' : status;

                  return (
                    <td key={day.day} className={`p-0 border-r relative ${day.isSunday || day.isHoliday ? 'bg-red-50/20' : ''} ${day.isYesterday ? 'ring-2 ring-inset ring-slate-900 z-10' : ''}`}>
                      <input 
                        list="att-options"
                        className={`w-full h-8 text-center bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium ${displayStatus && displayStatus !== '排休' ? 'text-blue-700 font-bold' : ''}`}
                        value={displayStatus}
                        onChange={(e) => updateAttendance(day.dateStr, emp.id, e.target.value)}
                      />
                    </td>
                  );
                })}
                <td className="p-1">
                  <input 
                    type="text" 
                    placeholder="輸入備註..."
                    value={monthRemarks.find(r => r.month === selectedMonth && r.employeeId === emp.id)?.remark || ''}
                    onChange={(e) => updateMonthRemark(emp.id, e.target.value)}
                    className="w-full px-2 py-1 text-[10px] outline-none bg-transparent border border-transparent focus:border-slate-200 rounded text-slate-600"
                  />
                </td>
              </tr>
            ))}
            <datalist id="att-options">
              {ATTENDANCE_OPTIONS.map(opt => <option key={opt} value={opt} />)}
            </datalist>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTable;
