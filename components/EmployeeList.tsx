
import React, { useState } from 'react';
import { Employee, EmployeeCategory } from '../types';
import { PlusIcon, TrashIcon, EditIcon } from './Icons';

interface EmployeeListProps {
  employees: Employee[];
  onUpdateEmployees: (list: Employee[]) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, onUpdateEmployees }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState({ name: '', nickname: '', lineId: '', category: '現場' as EmployeeCategory });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormState({ name: '', nickname: '', lineId: '', category: '現場' });
    setIsAdding(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormState({ 
      name: emp.name, 
      nickname: emp.nickname || '', 
      lineId: emp.lineId || '', 
      category: emp.category 
    });
    setIsAdding(true);
  };

  const handleSubmit = () => {
    if (!formState.name) return;
    
    if (editingId) {
      const newList = employees.map(e => e.id === editingId ? { ...e, ...formState } : e);
      onUpdateEmployees(newList);
    } else {
      onUpdateEmployees([...employees, { id: crypto.randomUUID(), ...formState }]);
    }
    
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-shrink-0">
        <h3 className="font-black text-slate-800">全體人員管理 ({employees.length})</h3>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <PlusIcon className="w-4 h-4" /> 新增人員
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-xl animate-fade-in flex-shrink-0">
          <h4 className="font-bold text-slate-800 mb-4">{editingId ? '修改人員資訊' : '新增人員資訊'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">人員姓名</label>
              <input 
                type="text" 
                value={formState.name}
                onChange={e => setFormState({...formState, name: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="姓名"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">暱稱</label>
              <input 
                type="text" 
                value={formState.nickname}
                onChange={e => setFormState({...formState, nickname: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="暱稱"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Line ID</label>
              <input 
                type="text" 
                value={formState.lineId}
                onChange={e => setFormState({...formState, lineId: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="Line"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">職務類別</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['做件', '現場', '廠內', '辦公室'].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setFormState({...formState, category: cat as EmployeeCategory})}
                    className={`py-3 text-[10px] font-bold rounded-xl border transition-all ${formState.category === cat ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold">取消</button>
            <button onClick={handleSubmit} className="px-10 bg-slate-900 text-white py-3 rounded-xl font-bold">確認{editingId ? '儲存' : '新增'}</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">姓名</th>
                <th className="px-6 py-4">暱稱</th>
                <th className="px-6 py-4">Line</th>
                <th className="px-6 py-4">職務類別</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800">{emp.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{emp.nickname || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{emp.lineId || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border ${
                      emp.category === '現場' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      emp.category === '做件' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      emp.category === '辦公室' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                      'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {emp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(emp)} className="text-slate-300 hover:text-blue-500 p-2"><EditIcon className="w-4 h-4" /></button>
                      <button onClick={() => onUpdateEmployees(employees.filter(e => e.id !== emp.id))} className="text-slate-300 hover:text-red-500 p-2"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-slate-400 italic text-sm">尚未建立人員名單</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
