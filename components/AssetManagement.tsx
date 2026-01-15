import React, { useState } from 'react';
import { Asset } from '../types';
import { PlusIcon, TrashIcon, EditIcon, XIcon, CheckCircleIcon, BoxIcon, SearchIcon, MapPinIcon, CalendarIcon } from './Icons';

interface AssetManagementProps {
  assets: Asset[];
  onUpdateAssets: (list: Asset[]) => void;
}

const AssetManagement: React.FC<AssetManagementProps> = ({ assets, onUpdateAssets }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Asset, 'id'>>({
    name: '',
    spec: '',
    purchaseDate: '',
    location: '倉庫',
    nextInspection: '',
    owner: '',
    notes: ''
  });

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.spec.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateAssets(assets.map(a => a.id === editingId ? { ...formData, id: editingId } : a));
    } else {
      onUpdateAssets([...assets, { ...formData, id: crypto.randomUUID() }]);
    }
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', spec: '', purchaseDate: '', location: '倉庫', nextInspection: '', owner: '', notes: '' });
  };

  const handleEdit = (a: Asset) => {
    setEditingId(a.id);
    setFormData({ ...a });
    setIsAdding(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in overflow-hidden p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><BoxIcon className="w-5 h-5" /></div>
          <h2 className="text-lg font-black text-slate-800">大型設備清冊</h2>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="搜尋設備、規格、存放地..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95"><PlusIcon className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4">設備名稱</th>
              <th className="px-6 py-4">規格</th>
              <th className="px-6 py-4">購買日期</th>
              <th className="px-6 py-4">存放地點</th>
              <th className="px-6 py-4">下次檢驗日期</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAssets.map(a => (
              <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-black text-slate-800 text-sm">{a.name}</td>
                <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{a.spec || '-'}</td>
                <td className="px-6 py-4 text-xs text-slate-400 font-mono">{a.purchaseDate || '-'}</td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-1 text-slate-600 text-xs font-bold">
                      <MapPinIcon className="w-3 h-3 text-slate-300" />
                      {a.location}
                   </div>
                </td>
                <td className="px-6 py-4">
                   <div className={`text-xs font-black font-mono ${a.nextInspection && new Date(a.nextInspection) < new Date() ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
                      {a.nextInspection || '不定期檢'}
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleEdit(a)} className="p-2 text-slate-300 hover:text-indigo-600 rounded-xl"><EditIcon className="w-4 h-4" /></button>
                    <button onClick={() => { if(confirm('確定刪除？')) onUpdateAssets(assets.filter(item => item.id !== a.id)); }} className="p-2 text-slate-300 hover:text-red-500 rounded-xl"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAssets.length === 0 && (
              <tr><td colSpan={6} className="py-20 text-center text-slate-400 italic">無相關設備紀錄</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
            <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800">{editingId ? '編輯設備資訊' : '新增設備項目'}</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
            </header>
            <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">設備名稱</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">規格</label>
                <textarea value={formData.spec} onChange={e => setFormData({...formData, spec: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-16" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">購買日期</label>
                  <input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">存放地點</label>
                  <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">下次檢驗日</label>
                  <input type="date" value={formData.nextInspection} onChange={e => setFormData({...formData, nextInspection: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">保管/負責人</label>
                  <input type="text" list="employee-nicknames-list" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
              </div>
              <footer className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-sm font-bold text-slate-500">取消</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">確認儲存</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;