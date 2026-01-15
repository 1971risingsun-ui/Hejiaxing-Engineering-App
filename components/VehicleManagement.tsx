import React, { useState } from 'react';
import { Vehicle, Employee } from '../types';
import { PlusIcon, TrashIcon, EditIcon, XIcon, CheckCircleIcon, TruckIcon, SearchIcon, ClockIcon, UserIcon, AlertIcon } from './Icons';

interface VehicleManagementProps {
  vehicles: Vehicle[];
  onUpdateVehicles: (list: Vehicle[]) => void;
  employees: Employee[];
}

const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicles, onUpdateVehicles, employees }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Vehicle, 'id'>>({
    plateNumber: '',
    model: '',
    currentMileage: 0,
    nextMaintenanceMileage: 0,
    insuranceExpiry: '',
    mainDriver: '',
    notes: ''
  });

  const filteredVehicles = vehicles.filter(v => 
    v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.mainDriver.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateVehicles(vehicles.map(v => v.id === editingId ? { ...formData, id: editingId } : v));
    } else {
      onUpdateVehicles([...vehicles, { ...formData, id: crypto.randomUUID() }]);
    }
    setIsAdding(false);
    setEditingId(null);
    setFormData({ plateNumber: '', model: '', currentMileage: 0, nextMaintenanceMileage: 0, insuranceExpiry: '', mainDriver: '', notes: '' });
  };

  const handleEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setFormData({ ...v });
    setIsAdding(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in overflow-hidden p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg"><TruckIcon className="w-5 h-5" /></div>
          <h2 className="text-lg font-black text-slate-800">車輛資產管理</h2>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="搜尋車牌、車型、駕駛人..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95"><PlusIcon className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4">車牌號碼</th>
              <th className="px-6 py-4">品牌車型</th>
              <th className="px-6 py-4">目前里程 (km)</th>
              <th className="px-6 py-4">保養預警</th>
              <th className="px-6 py-4">保險期限</th>
              <th className="px-6 py-4">主要駕駛人</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredVehicles.map(v => {
              const mileageWarning = v.nextMaintenanceMileage - v.currentMileage < 500;
              const insuranceWarning = v.insuranceExpiry && new Date(v.insuranceExpiry) < new Date(Date.now() + 30 * 86400000);

              return (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800 text-sm">{v.plateNumber}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{v.model || '-'}</td>
                  <td className="px-6 py-4 text-sm font-mono font-black text-slate-700">{v.currentMileage.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-wider ${mileageWarning ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      <AlertIcon className="w-3 h-3" />
                      下回: {v.nextMaintenanceMileage.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-xs font-bold ${insuranceWarning ? 'text-orange-600' : 'text-slate-600'}`}>
                       {v.insuranceExpiry || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
                      <UserIcon className="w-3.5 h-3.5 text-slate-300" />
                      {v.mainDriver || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(v)} className="p-2 text-slate-300 hover:text-emerald-600 rounded-xl transition-all"><EditIcon className="w-4 h-4" /></button>
                      <button onClick={() => { if(confirm('確定刪除？')) onUpdateVehicles(vehicles.filter(item => item.id !== v.id)); }} className="p-2 text-slate-300 hover:text-red-500 rounded-xl transition-all"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredVehicles.length === 0 && (
              <tr><td colSpan={7} className="py-20 text-center text-slate-400 italic">無相關車輛紀錄</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
            <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800">{editingId ? '編輯車輛資訊' : '新增車輛登記'}</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
            </header>
            <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">車牌號碼</label>
                  <input required type="text" value={formData.plateNumber} onChange={e => setFormData({...formData, plateNumber: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-black" placeholder="ABC-1234" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">品牌車型</label>
                  <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">目前里程</label>
                  <input type="number" value={formData.currentMileage} onChange={e => setFormData({...formData, currentMileage: parseInt(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">保養里程預警</label>
                  <input type="number" value={formData.nextMaintenanceMileage} onChange={e => setFormData({...formData, nextMaintenanceMileage: parseInt(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold text-emerald-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">保險到期日</label>
                  <input type="date" value={formData.insuranceExpiry} onChange={e => setFormData({...formData, insuranceExpiry: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">主要駕駛人</label>
                  <input type="text" list="employee-nicknames-list" value={formData.mainDriver} onChange={e => setFormData({...formData, mainDriver: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">備註</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none h-16" />
              </div>
              <footer className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-sm font-bold text-slate-500">取消</button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">確認儲存</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;