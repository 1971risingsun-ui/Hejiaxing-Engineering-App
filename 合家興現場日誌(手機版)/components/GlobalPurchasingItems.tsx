import React, { useMemo, useState, useRef } from 'react';
import { Project, CompletionItem, FenceMaterialItem, SystemRules, Supplier, PurchaseOrder, PurchaseOrderItem } from '../types';
import { ClipboardListIcon, BoxIcon, CalendarIcon, ChevronRightIcon, ArrowLeftIcon, XIcon, CheckCircleIcon, UsersIcon, PlusIcon, FileTextIcon, MapPinIcon, UserIcon, TrashIcon, EditIcon, SaveIcon } from './Icons';

interface GlobalPurchasingItemsProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
  onBack: () => void;
  suppliers: Supplier[];
  subcontractors: Supplier[];
  onUpdateSuppliers: (list: Supplier[]) => void;
  onUpdateSubcontractors: (list: Supplier[]) => void;
  purchaseOrders: PurchaseOrder[];
  onUpdatePurchaseOrders: (orders: PurchaseOrder[]) => void;
}

type SortKey = 'projectName' | 'date' | 'name' | 'supplier';
type SortDirection = 'asc' | 'desc' | null;

interface RowData {
  project: Project;
  type: 'main' | 'sub';
  mainItem: CompletionItem;
  mainItemIdx: number;
  reportIdx: number;
  reportId: string;
  reportDate: string;
  subItem?: FenceMaterialItem;
  itemKey?: string;
  subIdx?: number;
  rowKey: string;
  // Local state for non-backfilling fields
  manualSpec?: string;
}

const getDaysOffset = (dateStr: string, days: number) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const PurchasingItemRow: React.FC<{
  entry: RowData;
  suppliers: Supplier[];
  allPartners: Supplier[];
  isPoCreated: boolean | undefined;
  selectedRowKeys: Set<string>;
  toggleRowSelection: (key: string) => void;
  handleUpdateItemDate: (pId: string, rIdx: number, iIdx: number, val: string) => void;
  handleUpdateItemSupplier: (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => void;
  handleUpdateItemName: (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => void;
  handleUpdateItemSpec: (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => void;
  onUpdateSuppliers: (list: Supplier[]) => void;
  onEdit: (entry: RowData) => void;
}> = ({ 
  entry, suppliers, allPartners, isPoCreated, selectedRowKeys, toggleRowSelection, 
  handleUpdateItemDate, handleUpdateItemSupplier, handleUpdateItemName, handleUpdateItemSpec, onUpdateSuppliers,
  onEdit
}) => {
  const { project, type, subItem, mainItem, reportIdx, reportDate, mainItemIdx, itemKey, subIdx, rowKey } = entry;
  
  const displayDate = mainItem.productionDate || reportDate || getDaysOffset(project.appointmentDate, -7);
  
  // 需求映射邏輯：
  // 1. 品名 (rowName): 映射至材料表的「規格填寫 (subItem.spec)」
  // 2. 規格 (rowSpec): 不進行映射，保持手動編輯，不用回填
  // 3. 注意 (rowNote): 映射至材料表的「材料名稱 (subItem.name)」
  const rowName = type === 'sub' ? (subItem?.spec || '') : mainItem.name;
  const rowSpec = type === 'sub' ? (entry.manualSpec || '') : (mainItem.spec || '');
  const rowQty = type === 'sub' ? subItem?.quantity : mainItem.quantity;
  const rowUnit = type === 'sub' ? subItem?.unit : mainItem.unit;
  const rowNote = type === 'sub' ? (subItem?.name || '-') : (mainItem.itemNote || '-');
  
  const currentSupplierId = type === 'sub' ? subItem?.supplierId : mainItem.supplierId;
  const matchedSupplier = allPartners.find(s => s.id === currentSupplierId);
  const currentSupplierName = matchedSupplier?.name || currentSupplierId || '';

  const filteredSupplierOptions = useMemo(() => {
    if (rowName) {
      const providers = suppliers.filter(s => s.productList.some(p => p.name === rowName));
      if (providers.length > 0) return providers;
    }
    const searchTargets = [rowName, rowNote].filter(Boolean).map(s => s.toLowerCase());
    const matched = suppliers.filter(s => {
      const usages = s.productList.flatMap(p => (p.usage || '').split(',')).map(u => u.trim().toLowerCase()).filter(Boolean);
      return searchTargets.some(target => usages.some(u => target.includes(u) || u.includes(target)));
    });
    return matched.length > 0 ? matched : suppliers;
  }, [suppliers, rowName, rowNote]);

  const filteredProductOptions = useMemo(() => {
    const selectedS = suppliers.find(s => s.name === currentSupplierName);
    if (selectedS) {
      const searchTargets = [rowNote].filter(Boolean).map(s => s.toLowerCase());
      const matched = selectedS.productList.filter(p => {
        const pUsages = (p.usage || '').split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
        return searchTargets.some(target => pUsages.some(u => target.includes(u) || u.includes(target)));
      });
      return matched.length > 0 ? matched : selectedS.productList;
    }
    const allItems = new Map<string, string>();
    suppliers.forEach(s => s.productList.forEach(p => allItems.set(p.name, p.usage)));
    return Array.from(allItems.entries()).map(([name, usage]) => ({ name, spec: '', usage }));
  }, [suppliers, currentSupplierName, rowNote]);

  return (
    <tr key={rowKey} className={`hover:bg-slate-50/50 transition-colors group ${isPoCreated ? 'bg-slate-50 opacity-60' : ''}`}>
      <td className="px-4 py-4 text-center">
        {isPoCreated && <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto" />}
      </td>
      <td className="px-4 py-4 text-center">
        {!isPoCreated && (
          <input 
            type="checkbox" 
            checked={selectedRowKeys.has(rowKey)}
            onChange={() => toggleRowSelection(rowKey)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
        )}
      </td>
      <td className="px-3 py-4 w-22">
        <div className={`font-black text-xs truncate max-w-[80px] text-indigo-700 ${isPoCreated ? 'line-through text-slate-400 opacity-60' : ''}`}>{project.name}</div>
      </td>
      <td className="px-3 py-4 w-20">
        <input 
          type="date" 
          value={displayDate}
          onChange={(e) => handleUpdateItemDate(project.id, reportIdx, mainItemIdx, e.target.value)}
          className="w-full px-1 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-[10px] font-bold text-slate-500" 
        />
      </td>
      <td className="px-3 py-4 w-40">
        <input 
          list={`supplier-datalist-${rowKey}`}
          value={currentSupplierName} 
          onChange={(e) => handleUpdateItemSupplier(project.id, reportIdx, mainItemIdx, e.target.value, type, itemKey, subIdx)}
          placeholder="輸入或選擇..."
          className="w-full px-1 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-[11px] font-bold text-slate-700"
        />
        <datalist id={`supplier-datalist-${rowKey}`}>
          {filteredSupplierOptions.map(s => <option key={s.id} value={s.name} />)}
        </datalist>
      </td>
      <td className="px-6 py-4 w-60">
        <input 
          list={`item-datalist-${rowKey}`}
          value={rowName}
          onChange={(e) => handleUpdateItemName(project.id, reportIdx, mainItemIdx, e.target.value, type, itemKey, subIdx)}
          placeholder="輸入或選擇..."
          className="w-full px-1 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-[11px] font-bold text-slate-800"
        />
        <datalist id={`item-datalist-${rowKey}`}>
          {filteredProductOptions.map((p, i) => <option key={i} value={p.name}>{p.usage}</option>)}
        </datalist>
      </td>
      <td className="px-6 py-4 w-40">
        <input 
          type="text" 
          value={rowSpec}
          onChange={(e) => handleUpdateItemSpec(project.id, reportIdx, mainItemIdx, e.target.value, type, itemKey, subIdx)}
          placeholder="輸入規格..."
          className={`w-full px-1 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-[11px] font-medium text-slate-500`}
        />
      </td>
      <td className="px-6 py-4 w-20 text-center font-black text-blue-600 text-xs">{rowQty}</td>
      <td className="px-6 py-4 w-16 text-center text-[10px] text-slate-400 font-bold uppercase">{rowUnit}</td>
      <td className="px-6 py-4 text-[10px] text-slate-500 truncate max-w-[120px]">{rowNote}</td>
      <td className="px-6 py-4 w-12 text-right">
        <button 
          onClick={() => onEdit(entry)}
          className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
        >
          <EditIcon className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

const GlobalPurchasingItems: React.FC<GlobalPurchasingItemsProps> = ({ 
  projects, onUpdateProject, systemRules, onBack, suppliers, subcontractors, onUpdateSuppliers, onUpdateSubcontractors, purchaseOrders, onUpdatePurchaseOrders
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'asc',
  });
  
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [editingRow, setEditingRow] = useState<RowData | null>(null);
  
  // Local state for manual specs (no back-fill)
  const [manualSpecs, setManualSpecs] = useState<Record<string, string>>({});

  const [poForm, setPoForm] = useState({
    projectIds: [] as string[], supplierId: '', date: new Date().toISOString().split('T')[0],
    requisitioner: '', deliveryDate: '', deliveryLocation: '現場 (Site)', receiver: ''
  });

  const [poItemsDraft, setPoItemsDraft] = useState<Record<string, { quantity: string; name: string; unit: string; notes: string; project: string; spec: string }>>({});

  const allPartners = useMemo(() => [...suppliers, ...subcontractors], [suppliers, subcontractors]);

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  const getAutoFormulaItems = (itemName: string, quantity: string): FenceMaterialItem[] => {
    const baseQty = parseFloat(quantity) || 0;
    if (baseQty <= 0) return [];
    const config = systemRules.materialFormulas.find(f => itemName.includes(f.keyword));
    if (!config) return [];
    return config.items.map(fi => {
      let calcQty = 0;
      try {
        const func = new Function('baseQty', 'Math', `return ${fi.formula}`);
        calcQty = func(baseQty, Math);
      } catch (e) { calcQty = baseQty; }
      return { id: crypto.randomUUID(), name: fi.name, spec: '', quantity: isNaN(calcQty) ? 0 : calcQty, unit: fi.unit };
    });
  };

  const allPurchasingItems = useMemo(() => {
    let list: RowData[] = [];
    projects.forEach(project => {
      if (!project.planningReports || project.planningReports.length === 0) return;
      
      // 遍歷所有報價單，移除最新一筆限制
      project.planningReports.forEach((report, reportIdx) => {
        report.items.forEach((item, itemIdx) => {
          const isFence = item.category === 'FENCE_MAIN';
          const isSubKeyword = systemRules.subcontractorKeywords.some(kw => (item.name || '').includes(kw));
          const isProdKeyword = systemRules.productionKeywords.some(kw => (item.name || '').includes(kw));
          
          if (isFence && !isSubKeyword && !isProdKeyword) {
            const itemKey = getItemKey(item);
            const savedSheet = project.fenceMaterialSheets?.[itemKey];
            let activeSubItems = savedSheet?.items || getAutoFormulaItems(item.name, item.quantity);

            if (activeSubItems.length > 0) {
              activeSubItems.forEach((sub, subIdx) => {
                  const rowKey = `${project.id}-sub-${report.id}-${itemIdx}-${subIdx}`;
                  list.push({ 
                      project, type: 'sub', subItem: sub, mainItem: item, mainItemIdx: itemIdx, reportIdx, 
                      reportId: report.id, reportDate: report.date, itemKey, subIdx,
                      rowKey,
                      manualSpec: manualSpecs[rowKey] || ''
                  });
              });
            } else {
              const rowKey = `${project.id}-main-${report.id}-${itemIdx}`;
              list.push({ 
                project, type: 'main', mainItem: item, mainItemIdx: itemIdx, reportIdx, 
                reportId: report.id, reportDate: report.date,
                rowKey,
                manualSpec: manualSpecs[rowKey] || ''
              });
            }
          }
        });
      });
    });
    
    if (projectFilter !== 'ALL') list = list.filter(i => i.project.id === projectFilter);
    if (supplierFilter !== 'ALL') {
      list = list.filter(i => {
        const sId = i.type === 'sub' ? i.subItem?.supplierId : i.mainItem.supplierId;
        return sId === supplierFilter;
      });
    }

    if (sortConfig.direction) {
      list.sort((a, b) => {
        let valA = '', valB = '';
        switch (sortConfig.key) {
          case 'projectName': valA = a.project.name; valB = b.project.name; break;
          case 'date':
            valA = a.mainItem.productionDate || a.reportDate || '9999-12-31';
            valB = b.mainItem.productionDate || b.reportDate || '9999-12-31';
            break;
          case 'name':
            valA = a.type === 'sub' ? (a.subItem?.spec || '') : a.mainItem.name;
            valB = b.type === 'sub' ? (b.subItem?.spec || '') : b.mainItem.name;
            break;
          case 'supplier':
            const sIdA = a.type === 'sub' ? a.subItem?.supplierId : a.mainItem.supplierId;
            const sIdB = b.type === 'sub' ? b.subItem?.supplierId : b.mainItem.supplierId;
            valA = allPartners.find(s => s.id === sIdA)?.name || sIdA || '';
            valB = allPartners.find(s => s.id === sIdB)?.name || sIdB || '';
            break;
        }
        if (sortConfig.direction === 'asc') return valA.localeCompare(valB, 'zh-Hant');
        return valB.localeCompare(valA, 'zh-Hant');
      });
    }
    return list;
  }, [projects, sortConfig, systemRules, projectFilter, supplierFilter, allPartners, manualSpecs]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({ key, direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : (prev.direction === 'desc' ? null : 'asc')) : 'asc' }));
  };

  const toggleRowSelection = (rowKey: string) => {
    const next = new Set(selectedRowKeys);
    if (next.has(rowKey)) next.delete(rowKey);
    else next.add(rowKey);
    setSelectedRowKeys(next);
  };

  const handleUpdateItemDate = (pId: string, rIdx: number, iIdx: number, val: string) => {
    const project = projects.find(p => p.id === pId);
    if (!project) return;
    const updatedReports = [...project.planningReports];
    updatedReports[rIdx].items[iIdx] = { ...updatedReports[rIdx].items[iIdx], productionDate: val };
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleUpdateItemSupplier = (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => {
    const project = projects.find(p => p.id === pId);
    if (!project) return;
    const matchedSup = allPartners.find(s => s.name === val);
    const finalVal = matchedSup ? matchedSup.id : val;
    if (type === 'sub' && iKey && sIdx !== undefined) {
        const sheets = { ...(project.fenceMaterialSheets || {}) };
        if (sheets[iKey]) {
            sheets[iKey].items[sIdx].supplierId = finalVal;
            onUpdateProject({ ...project, fenceMaterialSheets: sheets });
        }
    } else {
        const updatedReports = [...project.planningReports];
        updatedReports[rIdx].items[iIdx].supplierId = finalVal;
        onUpdateProject({ ...project, planningReports: updatedReports });
    }
  };

  const handleUpdateItemName = (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => {
    const project = projects.find(p => p.id === pId);
    if (!project) return;
    if (type === 'sub' && iKey && sIdx !== undefined) {
        const sheets = { ...(project.fenceMaterialSheets || {}) };
        if (sheets[iKey]) {
            // 採購表的品名對應材料表的規格
            sheets[iKey].items[sIdx].spec = val;
            onUpdateProject({ ...project, fenceMaterialSheets: sheets });
        }
    } else {
        const updatedReports = [...project.planningReports];
        updatedReports[rIdx].items[iIdx].name = val;
        onUpdateProject({ ...project, planningReports: updatedReports });
    }
  };

  const handleUpdateItemSpec = (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => {
    // 生成對應的 rowKey 以便儲存 local state
    let rowKey = "";
    if (type === 'sub') {
        const entry = allPurchasingItems.find(i => i.project.id === pId && i.itemKey === iKey && i.subIdx === sIdx);
        if (entry) rowKey = entry.rowKey;
    } else {
        const entry = allPurchasingItems.find(i => i.project.id === pId && i.mainItemIdx === iIdx && i.reportIdx === rIdx && i.type === 'main');
        if (entry) rowKey = entry.rowKey;
    }

    if (type === 'sub') {
        // 規則要求：編輯不用回填材料清單，僅存在採購介面 (本地狀態)
        if (rowKey) setManualSpecs(prev => ({ ...prev, [rowKey]: val }));
    } else {
        const project = projects.find(p => p.id === pId);
        if (!project) return;
        const updatedReports = [...project.planningReports];
        updatedReports[rIdx].items[iIdx].spec = val;
        onUpdateProject({ ...project, planningReports: updatedReports });
        if (rowKey) setManualSpecs(prev => ({ ...prev, [rowKey]: val }));
    }
  };

  const handleUpdateRowValue = (field: string, val: string) => {
    if (!editingRow) return;
    const { project, type, reportIdx, mainItemIdx, itemKey, subIdx } = editingRow;
    if (field === 'date') handleUpdateItemDate(project.id, reportIdx, mainItemIdx, val);
    else if (field === 'supplier') handleUpdateItemSupplier(project.id, reportIdx, mainItemIdx, val, type, itemKey, subIdx);
    else if (field === 'name') handleUpdateItemName(project.id, reportIdx, mainItemIdx, val, type, itemKey, subIdx);
    else if (field === 'spec') handleUpdateItemSpec(project.id, reportIdx, mainItemIdx, val, type, itemKey, subIdx);
    else {
      const p = projects.find(p => p.id === project.id);
      if (!p) return;
      if (type === 'sub' && itemKey && subIdx !== undefined) {
        const sheets = { ...(p.fenceMaterialSheets || {}) };
        if (sheets[itemKey]) {
          const item = sheets[itemKey].items[subIdx];
          if (field === 'quantity') item.quantity = parseFloat(val) || 0;
          else if (field === 'unit') item.unit = val;
          onUpdateProject({ ...p, fenceMaterialSheets: sheets });
        }
      } else {
        const reports = [...p.planningReports];
        const item = reports[reportIdx].items[mainItemIdx];
        if (field === 'quantity') item.quantity = val;
        else if (field === 'unit') item.unit = val;
        onUpdateProject({ ...p, planningReports: reports });
      }
    }
  };

  const handleOpenPOModal = () => {
    if (selectedRowKeys.size === 0) return alert('請先勾選項目');
    const selectedItems = allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey));
    const draft: Record<string, any> = {};
    selectedItems.forEach(row => {
        const isSub = row.type === 'sub';
        draft[row.rowKey] = {
            quantity: String(isSub ? (row.subItem?.quantity || '0') : row.mainItem.quantity),
            name: isSub ? (row.subItem?.spec || '') : row.mainItem.name,
            unit: isSub ? (row.subItem?.unit || '') : row.mainItem.unit,
            notes: isSub ? (row.subItem?.name || '') : (row.mainItem.itemNote || ''),
            project: row.project.name,
            spec: isSub ? (manualSpecs[row.rowKey] || '') : (row.mainItem.spec || '')
        };
    });
    setPoItemsDraft(draft);
    setPoForm({ ...poForm, projectIds: Array.from(new Set(selectedItems.map(i => i.project.id))), supplierId: (selectedItems[0].type === 'sub' ? selectedItems[0].subItem?.supplierId : selectedItems[0].mainItem.supplierId) || '' });
    setIsCreatingPO(true);
  };

  const confirmCreatePO = () => {
    if (!poForm.supplierId) return alert('請選取主要供應商');
    const selectedItems = allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey));
    const targetSupplier = allPartners.find(s => s.id === poForm.supplierId);
    
    const newPO: PurchaseOrder = {
      id: crypto.randomUUID(),
      poNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: poForm.date, projectIds: poForm.projectIds, projectId: poForm.projectIds[0],
      projectName: Array.from(new Set(selectedItems.map(row => row.project.name))).join(', '), 
      supplierId: poForm.supplierId, supplierName: targetSupplier?.name || '未知廠商',
      items: selectedItems.map(row => ({
        materialId: row.type === 'sub' ? (row.subItem?.id || '') : `main-${row.mainItemIdx}`,
        name: poItemsDraft[row.rowKey].name, quantity: parseFloat(poItemsDraft[row.rowKey].quantity) || 0,
        unit: poItemsDraft[row.rowKey].unit, price: 0, notes: poItemsDraft[row.rowKey].notes + (poItemsDraft[row.rowKey].spec ? ` (${poItemsDraft[row.rowKey].spec})` : ''),
        supplierId: poForm.supplierId, projectName: row.project.name 
      })),
      status: 'draft', totalAmount: 0, requisitioner: poForm.requisitioner, deliveryDate: poForm.deliveryDate,
      deliveryLocation: poForm.deliveryLocation, receiver: poForm.receiver
    };
    onUpdatePurchaseOrders([...purchaseOrders, newPO]);
    
    selectedItems.forEach(row => {
        const p = projects.find(proj => proj.id === row.project.id);
        if (!p) return;
        if (row.type === 'sub' && row.itemKey && row.subIdx !== undefined) {
          const sheets = { ...(p.fenceMaterialSheets || {}) };
          if (sheets[row.itemKey]) {
            sheets[row.itemKey].items[row.subIdx].isPoCreated = true;
            onUpdateProject({ ...p, fenceMaterialSheets: sheets });
          }
        } else {
          const reports = [...p.planningReports];
          reports[row.reportIdx].items[row.mainItemIdx].isPoCreated = true;
          onUpdateProject({ ...p, planningReports: reports });
        }
    });
    setIsCreatingPO(false);
    setSelectedRowKeys(new Set());
    alert('採購單已建立');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 animate-fade-in h-full overflow-hidden">
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs cursor-pointer transition-colors" onClick={onBack}>
          <ArrowLeftIcon className="w-3 h-3" /> 返回
        </div>
        <div className="flex gap-4">
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                <option value="ALL">全部案件</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                <option value="ALL">全部供應商</option>
                {suppliers.sort((a,b)=>a.name.localeCompare(b.name,'zh')).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><ClipboardListIcon className="w-5 h-5" /></div>
          <div><h1 className="text-lg font-bold text-slate-800">採購總覽</h1><p className="text-[10px] text-slate-500 font-medium">彙整所有日期報價單規劃，含特定項目映射規則</p></div>
        </div>
        <button onClick={handleOpenPOModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-2 active:scale-95">
            <FileTextIcon className="w-4 h-4" /> 建立採購單
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 w-10 text-center">狀態</th>
                <th className="px-4 py-4 w-10 text-center">
                    <input type="checkbox" onChange={(e) => setSelectedRowKeys(e.target.checked ? new Set(allPurchasingItems.filter(i => !(i.type === 'sub' ? i.subItem?.isPoCreated : i.mainItem.isPoCreated)).map(i => i.rowKey)) : new Set())} checked={selectedRowKeys.size > 0 && selectedRowKeys.size === allPurchasingItems.filter(i => !(i.type === 'sub' ? i.subItem?.isPoCreated : i.mainItem.isPoCreated)).length} className="w-4 h-4 rounded text-indigo-600" />
                </th>
                <th className="px-3 py-4 w-22 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('projectName')}>案件 {sortConfig.key === 'projectName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="px-3 py-4 w-20 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('date')}>日期 {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="px-3 py-4 w-40 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('supplier')}>供應商 {sortConfig.key === 'supplier' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="px-6 py-4 w-60 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('name')}>品名 {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="px-6 py-4 w-40">規格</th>
                <th className="px-6 py-4 w-20 text-center">數量</th>
                <th className="px-6 py-4 w-16 text-center">單位</th>
                <th className="px-6 py-4">注意 (名稱)</th>
                <th className="px-6 py-4 w-12 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPurchasingItems.map((entry) => (
                <PurchasingItemRow 
                  key={entry.rowKey} entry={entry} suppliers={suppliers} allPartners={allPartners}
                  isPoCreated={entry.type === 'sub' ? entry.subItem?.isPoCreated : entry.mainItem.isPoCreated}
                  selectedRowKeys={selectedRowKeys} toggleRowSelection={toggleRowSelection}
                  handleUpdateItemDate={handleUpdateItemDate} handleUpdateItemSupplier={handleUpdateItemSupplier}
                  handleUpdateItemName={handleUpdateItemName} handleUpdateItemSpec={handleUpdateItemSpec}
                  onUpdateSuppliers={onUpdateSuppliers} onEdit={setEditingRow}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingRow && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setEditingRow(null)}>
          <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white"><EditIcon className="w-5 h-5" /></div>
                    <h3 className="font-black text-slate-800 text-lg">編輯項目詳細</h3>
                </div>
                <button onClick={() => setEditingRow(null)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
            </header>
            <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">預計日期</label>
                        <input type="date" value={editingRow.mainItem.productionDate || editingRow.reportDate} onChange={e => handleUpdateRowValue('date', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">供應商</label>
                        <input list="modal-s-list" value={allPartners.find(s => s.id === (editingRow.type === 'sub' ? editingRow.subItem?.supplierId : editingRow.mainItem.supplierId))?.name || (editingRow.type === 'sub' ? editingRow.subItem?.supplierId : editingRow.mainItem.supplierId) || ''} onChange={e => handleUpdateRowValue('supplier', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                        <datalist id="modal-s-list">{allPartners.map(s => <option key={s.id} value={s.name} />)}</datalist>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">{editingRow.type === 'sub' ? '品名 (來自材料清單規格填寫)' : '品名'}</label>
                    <input type="text" value={editingRow.type === 'sub' ? (editingRow.subItem?.spec || '') : editingRow.mainItem.name} onChange={e => handleUpdateRowValue('name', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">規格 (手動編輯不回填)</label>
                    <input 
                      type="text" 
                      value={editingRow.type === 'sub' ? (manualSpecs[editingRow.rowKey] || '') : (editingRow.mainItem.spec || '')} 
                      onChange={e => handleUpdateRowValue('spec', e.target.value)} 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">數量</label>
                        <input type="text" value={editingRow.type === 'sub' ? (editingRow.subItem?.quantity || '0') : editingRow.mainItem.quantity} onChange={e => handleUpdateRowValue('quantity', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">單位</label>
                        <input type="text" value={editingRow.type === 'sub' ? (editingRow.subItem?.unit || '') : editingRow.mainItem.unit} onChange={e => handleUpdateRowValue('unit', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                </div>
            </div>
            <footer className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 flex-shrink-0">
                <button onClick={() => setEditingRow(null)} className="w-full py-4 rounded-2xl text-sm font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl transition-all active:scale-95">完成編輯</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalPurchasingItems;