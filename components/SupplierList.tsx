import React, { useState, useMemo, useRef } from 'react';
import { Supplier, ProductEntry } from '../types';
import { SearchIcon, PlusIcon, MapPinIcon, UserIcon, PhoneIcon, BoxIcon, TrashIcon, EditIcon, XIcon, CheckCircleIcon, UsersIcon, FileTextIcon, LoaderIcon, ChevronRightIcon } from './Icons';
import ExcelJS from 'exceljs';

interface SupplierListProps {
  title?: string;
  typeLabel?: string;
  themeColor?: 'emerald' | 'indigo' | 'blue' | 'orange';
  suppliers: Supplier[];
  onUpdateSuppliers: (list: Supplier[]) => void;
}

const SupplierList: React.FC<SupplierListProps> = ({ 
    title = '供應商清冊', 
    typeLabel = '供應商', 
    themeColor = 'emerald',
    suppliers, 
    onUpdateSuppliers 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Omit<Supplier, 'id'>>({
    name: '',
    address: '',
    contact: '',
    companyPhone: '',
    mobilePhone: '',
    lineId: '',
    productList: []
  });

  const [tempProduct, setTempProduct] = useState({ name: '', spec: '', usage: '' });
  
  // 主要業務表格排序狀態
  const [prodSort, setProdSort] = useState<{key: keyof ProductEntry, dir: 'asc' | 'desc' | null}>({ key: 'name', dir: null });

  // 根據 themeColor 動態設定 CSS class
  const colorConfig = useMemo(() => {
    switch (themeColor) {
        case 'indigo': return { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', light: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', ring: 'focus:ring-indigo-500', shadow: 'shadow-indigo-100', labelBg: 'bg-indigo-50', labelText: 'text-indigo-700', btnLight: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' };
        case 'orange': return { bg: 'bg-orange-600', hover: 'hover:bg-orange-700', light: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', ring: 'focus:ring-orange-500', shadow: 'shadow-orange-100', labelBg: 'bg-orange-50', labelText: 'text-orange-700', btnLight: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' };
        case 'blue': return { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', light: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', ring: 'focus:ring-blue-500', shadow: 'shadow-blue-100', labelBg: 'bg-blue-50', labelText: 'text-blue-700', btnLight: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' };
        default: return { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', light: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'focus:ring-emerald-500', shadow: 'shadow-emerald-100', labelBg: 'bg-emerald-50', labelText: 'text-emerald-700', btnLight: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-indigo-100' };
    }
  }, [themeColor]);

  // 模糊搜尋與排序邏輯 (主清單)
  const filteredSuppliers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    
    // 依據 productList 長度（重複/品項次數）降序排序
    let sortedList = [...suppliers].sort((a, b) => (b.productList?.length || 0) - (a.productList?.length || 0));

    if (!search) return sortedList;
    
    return sortedList.filter(s => 
      s.name.toLowerCase().includes(search) || 
      s.contact.toLowerCase().includes(search) ||
      s.address.toLowerCase().includes(search) ||
      s.companyPhone.includes(search) ||
      s.mobilePhone.includes(search) ||
      (s.lineId || '').toLowerCase().includes(search) ||
      s.productList.some(p => p.name.toLowerCase().includes(search) || p.spec.toLowerCase().includes(search) || p.usage.toLowerCase().includes(search))
    );
  }, [suppliers, searchTerm]);

  // 主要業務表格展示邏輯 (含排序處理)
  const displayProducts = useMemo(() => {
    const withOriginalIdx = formData.productList.map((p, i) => ({ ...p, originalIdx: i }));
    if (!prodSort.dir) return withOriginalIdx;

    return [...withOriginalIdx].sort((a, b) => {
      const valA = (a[prodSort.key] || '').toLowerCase();
      const valB = (b[prodSort.key] || '').toLowerCase();
      return prodSort.dir === 'asc' ? valA.localeCompare(valB, 'zh-Hant') : valB.localeCompare(valA, 'zh-Hant');
    });
  }, [formData.productList, prodSort]);

  const handleProdSort = (key: keyof ProductEntry) => {
    setProdSort(prev => {
      if (prev.key === key) {
        if (prev.dir === 'asc') return { key, dir: 'desc' };
        if (prev.dir === 'desc') return { key, dir: null };
        return { key, dir: 'asc' };
      }
      return { key, dir: 'asc' };
    });
  };

  const renderSortIndicator = (key: keyof ProductEntry) => {
    if (prodSort.key !== key || !prodSort.dir) return <span className="opacity-20 ml-1">⇅</span>;
    return <span className="ml-1 text-indigo-500 font-bold">{prodSort.dir === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      onUpdateSuppliers(suppliers.map(s => s.id === editingId ? { ...formData, id: editingId } : s));
    } else {
      onUpdateSuppliers([...suppliers, { ...formData, id: crypto.randomUUID() }]);
    }

    setFormData({ name: '', address: '', contact: '', companyPhone: '', mobilePhone: '', lineId: '', productList: [] });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (s: Supplier) => {
    setFormData({
      name: s.name,
      address: s.address,
      contact: s.contact,
      companyPhone: s.companyPhone,
      mobilePhone: s.mobilePhone,
      lineId: s.lineId || '',
      productList: Array.isArray(s.productList) ? s.productList : []
    });
    setEditingId(s.id);
    setIsAdding(true);
    setProdSort({ key: 'name', dir: null }); // 重置排序
  };

  // 安全取得 Excel 儲存格字串
  const getSafeText = (cell: ExcelJS.Cell): string => {
    const val = cell.value;
    if (val === null || val === undefined) return '';
    if (typeof val === 'object' && 'richText' in val) {
      return (val as any).richText.map((segment: any) => segment.text || '').join('');
    }
    if (typeof val === 'object' && 'text' in val && 'hyperlink' in val) {
      return String((val as any).text || '');
    }
    if (typeof val === 'object' && 'result' in val) {
      return String((val as any).result || '');
    }
    return String(val);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      let updatedList = [...suppliers];
      const tempImportMap: Record<string, Set<string>> = {};

      // 遍歷所有工作表
      workbook.eachSheet((worksheet) => {
        let headers: Record<string, number> = {};
        let headerRowNumber = -1;

        // 搜尋前 20 列找出包含「廠商」的標題列
        for (let i = 1; i <= Math.min(20, worksheet.rowCount); i++) {
          const row = worksheet.getRow(i);
          const rowHeaders: Record<string, number> = {};
          let foundVendor = false;
          
          row.eachCell((cell, colNumber) => {
            const text = getSafeText(cell).trim();
            if (text) {
              rowHeaders[text] = colNumber;
              if (text === '廠商') foundVendor = true;
            }
          });

          if (foundVendor) {
            headers = rowHeaders;
            headerRowNumber = i;
            break;
          }
        }

        const vendorCol = headers['廠商'];
        const comboCol = headers['品項(規格)'] || headers['材料名稱(規格)'];
        const itemCol = headers['品項'] || headers['材料名稱'];
        const specCol = headers['規格'];

        // 若此工作表找不到必要欄位則跳過
        if (!vendorCol || (!comboCol && !itemCol)) return;

        // 從標題列的下一列開始讀取數據
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber <= headerRowNumber) return;
          
          const vName = getSafeText(row.getCell(vendorCol)).trim();
          if (!vName) return;

          let fullItem = '';
          if (comboCol) {
            fullItem = getSafeText(row.getCell(comboCol)).trim();
          } else if (itemCol) {
            const iName = getSafeText(row.getCell(itemCol)).trim();
            const sName = specCol ? getSafeText(row.getCell(specCol)).trim() : '';
            // 暫時合併以便去重
            fullItem = sName ? `${iName}(${sName})` : iName;
          }
          
          if (vName && fullItem) {
            if (!tempImportMap[vName]) tempImportMap[vName] = new Set<string>();
            tempImportMap[vName].add(fullItem);
          }
        });
      });

      const vendorNames = Object.keys(tempImportMap);
      if (vendorNames.length === 0) {
        alert('在 Excel 的所有工作表中皆找不到有效的數據（需包含「廠商」與「品項/材料名稱」相關欄位）');
        setIsImporting(false);
        return;
      }

      let importCount = 0;
      let totalMergedItems = 0;

      vendorNames.forEach(vName => {
        const existingIdx = updatedList.findIndex(s => s.name === vName);
        const newRawItems = Array.from(tempImportMap[vName]);
        
        // 將字串解析為 ProductEntry 物件
        const newProductEntries: ProductEntry[] = newRawItems.map(raw => {
          // 嘗試從 "品名(規格)" 解析
          const match = raw.match(/^(.*?)\((.*?)\)$/);
          if (match) {
            return { name: match[1].trim(), spec: match[2].trim(), usage: '' };
          }
          return { name: raw.trim(), spec: '', usage: '' };
        });

        if (existingIdx > -1) {
          // 合併並去重 (基於品名+規格)
          const currentList = [...updatedList[existingIdx].productList];
          const beforeSize = currentList.length;
          
          newProductEntries.forEach(newEntry => {
            if (!currentList.some(e => e.name === newEntry.name && e.spec === newEntry.spec)) {
              currentList.push(newEntry);
            }
          });
          
          updatedList[existingIdx] = { 
            ...updatedList[existingIdx], 
            productList: currentList 
          };
          totalMergedItems += (currentList.length - beforeSize);
        } else {
          // 新增
          updatedList.push({
            id: crypto.randomUUID(),
            name: vName,
            address: '',
            contact: '',
            companyPhone: '',
            mobilePhone: '',
            lineId: '',
            productList: newProductEntries
          });
          totalMergedItems += newProductEntries.length;
        }
        importCount++;
      });

      onUpdateSuppliers(updatedList);
      alert(`匯入完成！已檢視所有工作表，共處理 ${importCount} 間${typeLabel}，新增/更新共 ${totalMergedItems} 項業務類別。`);
      
    } catch (err) {
      console.error(err);
      alert('Excel 匯入失敗，請檢查檔案格式。');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addProduct = () => {
    if (!tempProduct.name.trim()) return;
    if (formData.productList.some(p => p.name === tempProduct.name.trim() && p.spec === tempProduct.spec.trim())) return;
    setFormData({
      ...formData,
      productList: [...formData.productList, { 
        name: tempProduct.name.trim(), 
        spec: tempProduct.spec.trim(), 
        usage: tempProduct.usage.trim() 
      }]
    });
    setTempProduct({ name: '', spec: '', usage: '' });
  };

  const removeProduct = (originalIdx: number) => {
    const newList = [...formData.productList];
    newList.splice(originalIdx, 1);
    setFormData({ ...formData, productList: newList });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in overflow-hidden">
      <div className="p-4 md:p-6 pb-2">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className={`${colorConfig.light} p-2 rounded-xl`}>
              <UsersIcon className={`w-6 h-6 ${colorConfig.text}`} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">{title}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{typeLabel} Directory</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder={`搜尋${typeLabel}、產品或 LINE...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm ${colorConfig.ring} outline-none font-medium`}
              />
            </div>

            <input 
              type="file" 
              accept=".xlsx, .xls" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleImportExcel} 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className={`flex items-center justify-center gap-2 px-3 h-10 rounded-xl border font-bold text-xs transition-all active:scale-95 ${colorConfig.btnLight}`}
              title="匯入 Excel"
            >
              {isImporting ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <FileTextIcon className="w-4 h-4" />}
              <span className="hidden sm:inline">匯入清冊</span>
            </button>

            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', address: '', contact: '', companyPhone: '', mobilePhone: '', lineId: '', productList: [] });
                setTempProduct({ name: '', spec: '', usage: '' });
                setIsAdding(true);
              }}
              className={`${colorConfig.bg} ${colorConfig.hover} text-white w-10 h-10 rounded-xl shadow-lg ${colorConfig.shadow} flex items-center justify-center transition-all active:scale-95 flex-shrink-0`}
              title="手動新增"
            >
              <PlusIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 pb-6 custom-scrollbar">
        {isAdding && (
          <div className={`mb-6 bg-white p-6 rounded-2xl border ${colorConfig.border} shadow-xl animate-fade-in`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? `編輯${typeLabel}資訊` : `新增${typeLabel}`}</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-1"><XIcon className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{typeLabel}名稱</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none ${colorConfig.ring} font-bold`} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">聯絡人</label>
                  <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none ${colorConfig.ring} font-bold`} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">公司電話</label>
                  <input type="text" value={formData.companyPhone} onChange={e => setFormData({...formData, companyPhone: e.target.value})} className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none ${colorConfig.ring} font-bold`} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">手機</label>
                  <input type="text" value={formData.mobilePhone} onChange={e => setFormData({...formData, mobilePhone: e.target.value})} className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none ${colorConfig.ring} font-bold`} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">LINE ID</label>
                  <input type="text" value={formData.lineId} onChange={e => setFormData({...formData, lineId: e.target.value})} className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none ${colorConfig.ring} font-bold`} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">地址</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none ${colorConfig.ring} font-bold`} />
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3">主要業務 / 產品明細</label>
                
                {/* 新增品項輸入區 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">材料名稱</label>
                    <input 
                      type="text" 
                      placeholder="產品名稱..."
                      value={tempProduct.name}
                      onChange={(e) => setTempProduct({...tempProduct, name: e.target.value})}
                      className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none ${colorConfig.ring} text-sm font-bold`}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">規格</label>
                    <input 
                      type="text" 
                      placeholder="規格型號..."
                      value={tempProduct.spec}
                      onChange={(e) => setTempProduct({...tempProduct, spec: e.target.value})}
                      className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none ${colorConfig.ring} text-sm`}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">用途</label>
                    <input 
                      type="text" 
                      placeholder="產品用途..."
                      value={tempProduct.usage}
                      onChange={(e) => setTempProduct({...tempProduct, usage: e.target.value})}
                      className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none ${colorConfig.ring} text-sm`}
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="button" 
                      onClick={addProduct}
                      className="w-full h-10 bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                    >
                      <PlusIcon className="w-4 h-4" /> 加入表格
                    </button>
                  </div>
                </div>

                {/* 品項表格展示區 */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-200">
                      <tr>
                        <th 
                          className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleProdSort('name')}
                        >
                          材料名稱 {renderSortIndicator('name')}
                        </th>
                        <th 
                          className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleProdSort('spec')}
                        >
                          規格 {renderSortIndicator('spec')}
                        </th>
                        <th 
                          className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleProdSort('usage')}
                        >
                          用途 {renderSortIndicator('usage')}
                        </th>
                        <th className="px-4 py-2 w-20 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {displayProducts.length > 0 ? displayProducts.map((p) => (
                        <tr key={p.originalIdx} className="hover:bg-slate-50 transition-colors animate-scale-in">
                          <td className="px-4 py-2 text-sm font-bold text-slate-700">{p.name}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{p.spec || '-'}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{p.usage || '-'}</td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex justify-center gap-1">
                              <button 
                                type="button" 
                                onClick={() => {
                                  setTempProduct({ name: p.name, spec: p.spec, usage: p.usage });
                                  removeProduct(p.originalIdx);
                                }}
                                className="text-slate-300 hover:text-blue-500 transition-colors p-1"
                                title="編輯品項"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => removeProduct(p.originalIdx)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                title="刪除品項"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs italic">尚未加入任何材料紀錄</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">取消</button>
                <button type="submit" className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" /> 確認儲存
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">{typeLabel}名稱</th>
                  <th className="px-6 py-4">LINE</th>
                  <th className="px-6 py-4">主要業務 (首項)</th>
                  <th className="px-6 py-4">聯絡電話</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map(s => (
                  <tr 
                    key={s.id} 
                    onClick={() => handleEdit(s)}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className={`font-black text-slate-800 text-sm group-hover:${colorConfig.text} transition-colors`}>{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold truncate max-w-[200px] mt-0.5">{s.contact ? `聯絡人: ${s.contact}` : '無聯絡人資訊'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {s.lineId ? (
                        <span className={`${colorConfig.labelBg} ${colorConfig.labelText} px-2.5 py-1 rounded-lg text-xs font-black border ${colorConfig.border}`}>
                          {s.lineId}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {s.productList && s.productList.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <BoxIcon className={`w-3.5 h-3.5 ${colorConfig.text}`} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-slate-600 truncate max-w-[150px]">{s.productList[0].name}</span>
                            {s.productList[0].spec && <span className="text-[9px] text-slate-400 truncate max-w-[150px]">{s.productList[0].spec}</span>}
                          </div>
                          {s.productList.length > 1 && (
                            <span className="bg-slate-100 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                              +{s.productList.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">無類別資訊</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600">
                      {s.mobilePhone || s.companyPhone || '-'}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => handleEdit(s)} 
                          className={`p-2 text-slate-300 hover:${colorConfig.text} hover:${colorConfig.labelBg} rounded-xl transition-all`}
                          title="編輯"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { if(confirm('確定刪除？')) onUpdateSuppliers(suppliers.filter(i => i.id !== s.id)); }} 
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="刪除"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <UsersIcon className="w-12 h-12 mb-3 opacity-10" />
                        <p className="text-sm font-bold">沒有找到符合搜尋條件的資料</p>
                        {searchTerm && (
                          <button onClick={() => setSearchTerm('')} className={`mt-3 ${colorConfig.text} text-xs font-black underline`}>清除搜尋</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
            <span>總計 {filteredSuppliers.length} 筆資料</span>
            {searchTerm && <span>篩選結果</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierList;