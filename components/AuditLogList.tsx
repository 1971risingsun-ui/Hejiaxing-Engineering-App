import React from 'react';
import { AuditLog } from '../types';
import { HistoryIcon } from './Icons';

interface AuditLogListProps {
  logs: AuditLog[];
}

const AuditLogList: React.FC<AuditLogListProps> = ({ logs }) => {
  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar animate-fade-in bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-100">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">全系統審計日誌</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">System Audit Trail</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">時間</th>
                  <th className="px-6 py-4">操作人員</th>
                  <th className="px-6 py-4">動作內容摘要</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('zh-TW', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{log.userName}</div>
                        <div className="text-[10px] text-slate-400">{log.userEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600 leading-relaxed font-medium">
                          {log.details}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-32 text-center text-slate-300 italic font-bold">
                      <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      目前尚無任何更新紀錄
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogList;