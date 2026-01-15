import React, { useState, useMemo } from 'react';
import { Project, Supplier, PurchaseOrder, PurchaseOrderItem, MaterialStatus, Material } from '../types';
import { PlusIcon, FileTextIcon, SearchIcon, TrashIcon, DownloadIcon, CheckCircleIcon, XIcon, UsersIcon, BoxIcon, ClipboardListIcon, CalendarIcon, UserIcon, MapPinIcon, EditIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';
import { generateId } from '../utils/dataLogic';

declare const XLSX: any;

interface PurchaseOrdersProps {
  projects: Project[]; suppliers: Supplier[]; purchaseOrders: PurchaseOrder[];
  onUpdatePurchaseOrders: (orders: PurchaseOrder[]) => void; onUpdateProject: (project: Project) => void;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ projects, suppliers, purchaseOrders, onUpdatePurchaseOrders, onUpdateProject }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingPOId, setEditingPOId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState(''); 
  const [selectedMaterials, setSelectedMaterials] = useState<Record<string, { quantity: number; projectId: string; notes?: string; name?: string; unit?: string; projectName?: string }>>({});
  const [extraMaterials, setExtraMaterials] = useState<Material[]>([]);

  const filteredOrders = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return purchaseOrders.filter(o => !o.isOrdered && (o.poNumber.toLowerCase().includes(s) || o.projectName.toLowerCase().includes(s) || o.supplierName.toLowerCase().includes(s))).sort((a, b) => b.date.localeCompare(a.date));
  }, [purchaseOrders, searchTerm]);

  const allAvailableMaterials = useMemo(() => {
    const flattened: any[] = [];
    projects.forEach(p => (p.materials || []).forEach(m => flattened.push({ ...m, projectId: p.id, projectName: p.name })));
    return [...flattened, ...extraMaterials.map(m => ({ ...m, projectId: '', projectName: '' }))];
  }, [projects, extraMaterials]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedSupplierId || Object.keys(selectedMaterials).length === 0) return;
    const poItems: PurchaseOrderItem[] = Object.entries(selectedMaterials).map(([mid, data]) => {
      const mat = allAvailableMaterials.find(m => m.id === mid);
      return { materialId: mid, name: mat?.name || data.name || '', quantity: data.quantity, unit: mat?.unit || data.unit || '', price: 0, notes: data.notes || mat?.notes || '', supplierId: selectedSupplierId, projectName: data.projectName || '' };
    });
    const sName = suppliers.find(s => s.id === selectedSupplierId)?.name || '未指定';
    const po: PurchaseOrder = { id: editingPOId || crypto.randomUUID(), poNumber: `PO-${Date.now()}`, date: new Date().toISOString().split('T')[0], projectId: '', projectIds: Array.from(new Set(Object.values(selectedMaterials).map((v: any) => v.projectId).filter(Boolean))), projectName: Array.from(new Set(poItems.map(i => i.projectName).filter(Boolean))).join(', '), supplierId: selectedSupplierId, supplierName: sName, items: poItems, status: 'draft', totalAmount: 0 };
    if (editingPOId) onUpdatePurchaseOrders(purchaseOrders.map(o => o.id === editingPOId ? po : o));
    else onUpdatePurchaseOrders([...purchaseOrders, po]);
    setIsAdding(false); setSelectedMaterials({});
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-4 md:p-6 pb-2">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-4"><div className="bg-indigo-100 p-2 rounded-xl"><ClipboardListIcon className="w-6 h-6 text-indigo-600" /></div><div><h2 className="text-base font-black">採購單管理</h2><p className="text-[10px] text-slate-400 font-bold">Purchase Orders</p></div></div>
          <div className="flex items-center gap-3 w-full md:w-auto"><div className="relative flex-1 md:w-64"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="搜尋..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm" /></div><button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white w-10 h-10 rounded-xl shadow-lg flex items-center justify-center"><PlusIcon className="w-6 h-6" /></button></div>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 md:px-6 pb-6">
        {!isAdding ? (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[800px]"><thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black border-b"><tr><th className="px-6 py-4">單號/日期</th><th className="px-6 py-4">廠商</th><th className="px-6 py-4">內容摘要</th><th className="px-6 py-4 text-right">操作</th></tr></thead><tbody className="divide-y">{filteredOrders.map(po => (<tr key={po.id} className="hover:bg-slate-50/50"> <td className="px-6 py-4"><div>{po.poNumber}</div><div className="text-[10px] text-slate-400">{po.date}</div></td> <td className="px-6 py-4 font-bold">{po.supplierName}</td> <td className="px-6 py-4 text-sm">{po.items[0]?.name} 等 {po.items.length} 項</td> <td className="px-6 py-4 text-right"><button onClick={() => onUpdatePurchaseOrders(purchaseOrders.filter(o => o.id !== po.id))} className="text-red-500 p-2"><TrashIcon className="w-4 h-4" /></button></td> </tr>))}</tbody></table>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-bold mb-4">建立採購單</h3>
            <select value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} className="w-full p-2 border rounded mb-4"><option value="">選擇廠商</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <div className="flex justify-end gap-2"><button onClick={() => setIsAdding(false)} className="px-4 py-2">取消</button><button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold">建立</button></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrders;