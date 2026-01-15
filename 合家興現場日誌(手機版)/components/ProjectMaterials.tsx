import React, { useState, useEffect } from 'react';
import { Project, Material, MaterialStatus, User, UserRole } from '../types';
import { DownloadIcon, PlusIcon, TrashIcon, BoxIcon, CalendarIcon, UserIcon, MapPinIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';
import { generateId } from '../utils/dataLogic';

declare const XLSX: any;

interface ProjectMaterialsProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
}

const ProjectMaterials: React.FC<ProjectMaterialsProps> = ({ project, currentUser, onUpdateProject }) => {
  const [newMaterial, setNewMaterial] = useState({ name: '', quantity: 1, unit: '個', notes: '' });
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const canEdit = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  useEffect(() => {
    if (canEdit) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      let needsUpdate = false;
      const updates: any = {};
      if (!project.materialFillingDate) { updates.materialFillingDate = todayStr; needsUpdate = true; }
      if (!project.materialDeliveryDate) { updates.materialDeliveryDate = tomorrowStr; needsUpdate = true; }
      if (!project.materialRequisitioner) { updates.materialRequisitioner = currentUser.name; needsUpdate = true; }
      if (needsUpdate) onUpdateProject({ ...project, ...updates });
    }
  }, [project.id]);

  const handleHeaderChange = (field: string, value: string) => onUpdateProject({ ...project, [field]: value });

  const handleAddMaterial = () => {
    if (!newMaterial.name) return;
    const material: Material = { id: generateId(), name: newMaterial.name, quantity: Number(newMaterial.quantity), unit: newMaterial.unit, status: MaterialStatus.PENDING, notes: newMaterial.notes };
    onUpdateProject({ ...project, materials: [...(project.materials || []), material] });
    setNewMaterial({ name: '', quantity: 1, unit: '個', notes: '' }); setIsAddingMaterial(false);
  };

  const deleteMaterial = (id: string) => {
    if (!window.confirm('確定要刪除此材料嗎？')) return;
    onUpdateProject({ ...project, materials: (project.materials || []).filter(m => m.id !== id) });
  };

  const handleExportMaterials = () => {
    try {
      const data = [["合家興材料請購單"], ["專案名稱", project.name], ["填表日期", project.materialFillingDate || ""], ["請購人", project.materialRequisitioner || ""], ["需到貨日期", project.materialDeliveryDate || ""], ["送貨地點", project.materialDeliveryLocation || ""], ["收貨人", project.materialReceiver || ""], [], ["項次", "材料名稱", "數量", "單位", "備註"]];
      (project.materials || []).forEach((m, index) => data.push([(index + 1).toString(), m.name, m.quantity.toString(), m.unit, m.notes || ""]));
      const ws = XLSX.utils.aoa_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "材料請購");
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      downloadBlob(new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${project.name}_材料請購單.xlsx`);
    } catch (e) { alert("匯出失敗"); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">請購資訊</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">填表日期</label><input type="date" value={project.materialFillingDate || ''} disabled={!canEdit} onChange={(e) => handleHeaderChange('materialFillingDate', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>
          <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">請購人</label><input type="text" value={project.materialRequisitioner || ''} disabled={!canEdit} onChange={(e) => handleHeaderChange('materialRequisitioner', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>
          <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">需到貨日期</label><input type="date" value={project.materialDeliveryDate || ''} disabled={!canEdit} onChange={(e) => handleHeaderChange('materialDeliveryDate', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>
          <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">送貨地點</label><select value={project.materialDeliveryLocation || '現場'} disabled={!canEdit} onChange={(e) => handleHeaderChange('materialDeliveryLocation', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50"><option value="現場">現場</option><option value="廠內">廠內</option></select></div>
          <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">收貨人</label><input type="text" value={project.materialReceiver || ''} disabled={!canEdit} onChange={(e) => handleHeaderChange('materialReceiver', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><div><h3 className="font-bold text-lg text-slate-800">材料清單</h3></div><div className="flex gap-2"><button onClick={handleExportMaterials} className="bg-white border text-slate-700 w-10 h-10 rounded-full flex items-center justify-center transition-colors"><DownloadIcon className="w-5 h-5" /></button>{canEdit && <button onClick={() => setIsAddingMaterial(true)} className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"><PlusIcon className="w-6 h-6" /></button>}</div></div>
        {isAddingMaterial && (<div className="p-4 bg-blue-50 border-b border-blue-100"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="text-[10px] font-bold text-blue-700 block">材料名稱</label><input className="w-full px-3 py-2 border rounded-md" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} /></div><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] font-bold text-blue-700 block">數量</label><input type="number" className="w-full px-3 py-2 border rounded-md" value={newMaterial.quantity} onChange={e => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})} /></div><div><label className="text-[10px] font-bold text-blue-700 block">單位</label><input className="w-full px-3 py-2 border rounded-md" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})} /></div></div></div><div className="flex justify-end gap-2 mt-4"><button onClick={() => setIsAddingMaterial(false)} className="px-4 py-2 text-sm text-slate-600">取消</button><button onClick={handleAddMaterial} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg font-bold">新增材料</button></div></div>)}
        <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold"><tr><th className="px-4 py-3 min-w-[120px]">項目</th><th className="px-4 py-3 w-20 text-center">數量</th><th className="px-4 py-3 w-20 text-center">單位</th><th className="px-4 py-3">備註</th>{canEdit && <th className="px-4 py-3 w-16 text-right">操作</th>}</tr></thead><tbody className="divide-y divide-slate-100">{project.materials && project.materials.length > 0 ? project.materials.map((item) => (<tr key={item.id} className="hover:bg-slate-50"> <td className="px-4 py-3 font-bold text-slate-800 text-sm">{item.name}</td> <td className="px-4 py-3 text-slate-600 text-center">{item.quantity}</td> <td className="px-4 py-3 text-slate-400 text-center">{item.unit}</td> <td className="px-4 py-3 text-slate-500 text-sm truncate">{item.notes || '-'}</td> {canEdit && <td className="px-4 py-3 text-right"><button onClick={() => deleteMaterial(item.id)} className="text-slate-300 hover:text-red-500 p-2"><TrashIcon className="w-5 h-5" /></button></td>} </tr>)) : <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 italic">無材料請購紀錄</td></tr>}</tbody></table></div>
      </div>
    </div>
  );
};

export default ProjectMaterials;