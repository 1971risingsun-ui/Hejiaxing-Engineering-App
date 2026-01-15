import React, { useState } from 'react';
import { Tool, Employee } from '../types';
import { PlusIcon, TrashIcon, EditIcon, XIcon, CheckCircleIcon, WrenchIcon, SearchIcon, UserIcon, LoaderIcon } from './Icons';

interface ToolManagementProps {
  tools: Tool[];
  onUpdateTools: (list: Tool[]) => void;
  employees: Employee[];
}

const ToolManagement: React.FC<ToolManagementProps> = ({ tools, onUpdateTools, employees }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Tool, 'id'>>({
    name: '',
    brand: '',
    model: '',
    status: 'available',
    borrower: '',
    lastMaintenance: '',
    notes: ''
  });

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.borrower || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateTools(tools.map(t => t.id === editingId ? { ...formData, id: editingId } : t));
    } else {
      onUpdateTools([...tools, { ...formData, id: crypto.randomUUID() }]);
    }
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', brand: '', model: '', status: 'available', borrower: '', lastMaintenance: '', notes: '' });
  };

  const handleEdit = (t: Tool) => {
    setEditingId(t.id);
    setFormData({ ...t });
    setIsAdding(true);
  };

  const statusLabel = (status: Tool['status']) => {
    switch (status) {
      case 'available': return { text: '在庫', class: 'bg-green-50 text-green-700 border-green-200' };
      case 'in_use': return { text: '使用中', class: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'maintenance': return { text: '維修中', class: 'bg-red-50 text-red-700 border-red-200' };
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in overflow-hidden p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><WrenchIcon className="w-5 h-5" /></div>
          <h2 className="text-lg font-black text-slate-800">工具清冊</h2>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="搜尋工具名稱、品牌或領用人..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95"><PlusIcon className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4">工具名稱</th>
              <th className="px-6 py-4">品牌 / 型號</th>
              <th className="px-6 py-4">目前狀態</th>
              <th className="px-6 py-4">領用人</th>
              <th className="px-6 py-4">最後保養日期</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTools.map(t => {
              const label = statusLabel(t.status);
              return (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800 text-sm">{t.name}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{t.brand} {t.model}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${label.class}`}>{label.text}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{t.borrower || '-'}</td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-mono">{t.lastMaintenance || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(t)} className="p-2 text-slate-300 hover:text-blue-600 rounded-xl"><EditIcon className="w-4 h-4" /></button>
                      <button onClick={() => { if(confirm('確定刪除？')) onUpdateTools(tools.filter(item => item.id !== t.id)); }} className="p-2 text-slate-300 hover:text-red-500 rounded-xl"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredTools.length === 0 && (
              <tr><td colSpan={6} className="py-20 text-center text-slate-400 italic">無相關工具紀錄</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
            <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800">{editingId ? '編輯工具資訊' : '新增工具項目'}</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
            </header>
            <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">工具名稱</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">品牌</label>
                  <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">型號</label>
                  <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">目前狀態</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                    <option value="available">在庫</option>
                    <option value="in_use">使用中</option>
                    <option value="maintenance">維修中</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">領用/借用人</label>
                  <input list="employee-nicknames-list" type="text" value={formData.borrower} onChange={e => setFormData({...formData, borrower: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">最後保養日期</label>
                <input type="date" value={formData.lastMaintenance} onChange={e => setFormData({...formData, lastMaintenance: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <footer className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-sm font-bold text-slate-500">取消</button>
                <button type="submit" className="flex-[2] bg-blue-600 text-white py-3 rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">確認儲存</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolManagement;