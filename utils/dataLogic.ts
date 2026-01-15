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

export const mergeLists = <T extends { id: string | number }>(base: T[], incoming: T[]): T[] => {
  const map = new Map<string | number, T>();
  base.forEach(item => map.set(item.id, item));
  incoming.forEach(item => map.set(item.id, item));
  return Array.from(map.values());
};

export const mergeAppState = (base: any, incoming: any) => {
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

export const computeDiffs = (file: any, cache: any) => {
  const categories = ['projects', 'employees', 'suppliers', 'subcontractors', 'purchaseOrders', 'stockAlertItems', 'tools', 'assets', 'vehicles'];
  const results: Record<string, any[]> = {};

  categories.forEach((key) => {
    const fileList = file[key] || [];
    const cacheList = cache[key] || [];
    const allIds = Array.from(new Set([...fileList.map((i: any) => i.id), ...cacheList.map((i: any) => i.id)]));

    results[key] = allIds.map(id => {
      const f = fileList.find((i: any) => i.id === id);
      const c = cacheList.find((i: any) => i.id === id);
      if (!f) return { id, name: c.name || c.plateNumber || id, status: 'ONLY_CACHE', data: c, side: 'cache', cacheTime: c.lastModifiedAt };
      if (!c) return { id, name: f.name || f.plateNumber || id, status: 'ONLY_FILE', data: f, side: 'file', fileTime: f.lastModifiedAt };
      if (f.lastModifiedAt === c.lastModifiedAt && JSON.stringify(f) === JSON.stringify(c)) return null; 
      return { id, name: f.name || f.plateNumber || id, status: 'CONFLICT', fileData: f, cacheData: c, newer: (f.lastModifiedAt || 0) > (c.lastModifiedAt || 0) ? 'file' : 'cache', fileTime: f.lastModifiedAt, cacheTime: c.lastModifiedAt };
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