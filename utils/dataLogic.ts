import { Project, ProjectStatus } from '../types';

export const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const sortProjects = (list: Project[]) => {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const dateA = a.appointmentDate || a.reportDate || '9999-12-31';
    const dateB = b.appointmentDate || b.reportDate || '9999-12-31';
    return String(dateA).localeCompare(String(dateB));
  });
};

/**
 * 更新不覆蓋合併邏輯 (Update not Overwrite)
 * 基於 lastModifiedAt 進行判斷，保留較新的版本。
 */
export const mergeLists = <T extends { id: string | number; lastModifiedAt?: number }>(base: T[], incoming: T[]): T[] => {
  const map = new Map<string | number, T>();
  
  // 1. 載入基底資料 (通常是本地暫存)
  base.forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });
  
  // 2. 處理傳入資料 (通常是遠端雲端資料)
  incoming.forEach(item => {
    if (!item || !item.id) return;
    const existing = map.get(item.id);
    if (!existing) {
      // 全新項目，直接加入
      map.set(item.id, item);
    } else {
      // 已存在項目，比對時間戳記
      const existingTime = existing.lastModifiedAt || 0;
      const incomingTime = item.lastModifiedAt || 0;
      
      // 只有當傳入的資料嚴格較新時才進行覆寫
      if (incomingTime > existingTime) {
        map.set(item.id, item);
      }
    }
  });
  
  return Array.from(map.values());
};

export const mergeAppState = (base: any, incoming: any) => {
  if (!base) return incoming;
  if (!incoming) return base;

  return {
    ...base,
    ...incoming, 
    projects: sortProjects(mergeLists(base.projects || [], incoming.projects || [])),
    users: mergeLists(base.users || [], incoming.users || []),
    auditLogs: mergeLists(base.auditLogs || [], incoming.auditLogs || []),
    employees: mergeLists(base.employees || [], incoming.employees || []),
    suppliers: mergeLists(base.suppliers || [], incoming.suppliers || []),
    subcontractors: mergeLists(base.subcontractors || [], incoming.subcontractors || []),
    purchaseOrders: mergeLists(base.purchaseOrders || [], incoming.purchaseOrders || []),
    stockAlertItems: mergeLists(base.stockAlertItems || [], incoming.stockAlertItems || []),
    tools: mergeLists(base.tools || [], incoming.tools || []),
    assets: mergeLists(base.assets || [], incoming.assets || []),
    vehicles: mergeLists(base.vehicles || [], incoming.vehicles || []),
  };
};

/**
 * 計算差異並過濾掉可自動合併的部分
 */
export const computeDiffs = (file: any, cache: any) => {
  const categories = ['projects', 'employees', 'suppliers', 'subcontractors', 'purchaseOrders', 'stockAlertItems', 'tools', 'assets', 'vehicles'];
  const results: Record<string, any[]> = {};

  categories.forEach((key) => {
    const fileList = Array.isArray(file[key]) ? file[key] : [];
    const cacheList = Array.isArray(cache[key]) ? cache[key] : [];
    const allIds = Array.from(new Set([...fileList.map((i: any) => i.id), ...cacheList.map((i: any) => i.id)]));

    results[key] = allIds.map(id => {
      const f = fileList.find((i: any) => i.id === id);
      const c = cacheList.find((i: any) => i.id === id);
      
      // 僅存在於某一端，不視為「衝突」，視為「新增」，可由 mergeAppState 自動處理
      if (!f || !c) return null;
      
      // 兩端皆有，比對時間戳記與內容
      const fTime = f.lastModifiedAt || 0;
      const cTime = c.lastModifiedAt || 0;
      
      // 若時間戳記不同，則依照「更新不覆蓋」原則自動取新者，不需手動決策
      if (fTime !== cTime) return null;
      
      // 若時間戳記相同但內容不同，才是真正的衝突 (無法判定誰是最新)
      if (JSON.stringify(f) !== JSON.stringify(c)) {
        return { 
          id, 
          name: f.name || f.plateNumber || id, 
          status: 'CONFLICT', 
          fileData: f, 
          cacheData: c, 
          newer: 'equal', // 時間戳相同
          fileTime: fTime, 
          cacheTime: cTime 
        };
      }
      
      return null;
    }).filter(Boolean);
  });
  return results;
};

export const getProjectDiffMessage = (oldP: Project, newP: Project): string => {
  const parts: string[] = [];
  if (oldP.status !== newP.status) parts.push(`狀態 (${oldP.status} -> ${newP.status})`);
  if (oldP.name !== newP.name) parts.push(`專案名稱`);
  if (oldP.appointmentDate !== newP.appointmentDate || oldP.reportDate !== newP.reportDate) parts.push(`日期排程`);
  const oldPh = oldP.photos || [];
  const newPh = newP.photos || [];
  if (oldPh.length !== newPh.length) parts.push(`照片 (${newPh.length - oldPh.length > 0 ? '新增' : '移除'})`);
  if (JSON.stringify(oldP.milestones) !== JSON.stringify(newP.milestones)) parts.push(`里程碑`);
  if (JSON.stringify(oldP.materials) !== JSON.stringify(newP.materials)) parts.push(`材料`);
  if (JSON.stringify(oldP.constructionItems) !== JSON.stringify(newP.constructionItems)) parts.push(`施工紀錄細項`);
  if (JSON.stringify(oldP.reports) !== JSON.stringify(newP.reports)) parts.push(`施工日誌`);
  return parts.length > 0 ? parts.join('、') : '內容更新';
};