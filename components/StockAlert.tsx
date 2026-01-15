import React, { useState } from 'react';
import { StockAlertItem } from '../types';
import { AlertIcon, PlusIcon, TrashIcon, BoxIcon, EditIcon, XIcon, CheckCircleIcon, ArrowLeftIcon } from './Icons';

interface StockAlertProps {
  items: StockAlertItem[];
  onUpdateItems: (items: StockAlertItem[]) => void;
  onBack: () => void;
}

const StockAlert: React.FC<StockAlertProps> = ({ items, onUpdateItems, onBack }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<StockAlertItem | null>(null);

  const [formData, setFormData] = useState<Omit<StockAlertItem, 'id' | 'timestamp'>>({
    name: '',
    spec: '',
    quantity: '',
    unit: '',
    note: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingItem) {
        onUpdateItems(items.map(i => i.id === editingItem.id ? { ...formData, id: i.id, timestamp: i.timestamp } : i));
    } else {
        const newItem: StockAlertItem = {
            ...formData,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };
        onUpdateItems([...items, newItem]);
    }

    setIsAdding(false);
    setEditingItem(null);
    setFormData({ name: '', spec: '', quantity: '', unit: '', note: '' });
  };

  const handleEdit = (item: StockAlertItem) => {
    setEditingItem(item);
    setFormData({
        name: item.name,
        spec: item.spec,
        quantity: item.quantity,
        unit: item.unit,
        note: item.note
    });
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('確定刪除此預警項目？')) {
        onUpdateItems(items.filter(i => i.id !== id));
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in h-full overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-bold text-xs cursor-pointer transition-colors w-fit" onClick={onBack}>
          <ArrowLeftIcon className="w-3 h-3" /> 返回採購
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-3 rounded-xl text-white shadow-lg shadow-red-100"><AlertIcon className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">常備庫存爆量通知</h1>
            <p className="text-xs text-slate-500 font-medium">記錄非專案性的庫存追加需求，及時下單補貨</p>
          </div>
        </div>
        <button 
          onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', spec: '', quantity: '', unit: '', note: '' });
              setIsAdding(true);
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" /> 新增項目
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-red-50 text-red-700 text-[10px] uppercase font-black tracking-widest border-b border-red-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">品名</th>
                <th className="px-6 py-4">規格</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20 text-center">單位</th>
                <th className="px-6 py-4">注意/備註</th>
                <th className="px-6 py-4 w-24 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length > 0 ? items.map((item) => (
                <tr key={item.id} className="hover:bg-red-50/30 transition-colors group">
                  <td className="px-6 py-4"><div className="font-bold text-sm text-slate-800">{item.name}</div></td>
                  <td className="px-6 py-4"><div className="text-xs text-slate-500">{item.spec || '-'}</div></td>
                  <td className="px-6 py-4 text-center font-black text-red-600">{item.quantity}</td>
                  <td className="px-6 py-4 text-center text-xs text-slate-400 font-bold">{item.unit}</td>
                  <td className="px-6 py-4"><div className="text-xs text-slate-500 font-medium truncate max-w-[300px]">{item.note || '-'}</div></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(item)} className="p-2 text-slate-300 hover:text-red-600 transition-all"><EditIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-32 text-center text-slate-300">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="font-bold">目前無庫存預警項目</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
            <header className="px-8 py-5 bg-red-600 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <AlertIcon className="w-5 h-5" />
                <h3 className="font-black">{editingItem ? '編輯預警項目' : '新增預警項目'}</h3>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
            </header>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">材料品名</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">規格</label>
                  <input type="text" value={formData.spec} onChange={e => setFormData({...formData, spec: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">數量</label>
                    <input type="text" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-red-600 focus:bg-white outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">單位</label>
                    <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:bg-white outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">備註</label>
                  <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-20 resize-none outline-none focus:bg-white" />
                </div>
              </div>
              <footer className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100">取消</button>
                <button type="submit" className="flex-[2] bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center gap-2"><CheckCircleIcon className="w-5 h-5" /> 確認提交</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAlert;