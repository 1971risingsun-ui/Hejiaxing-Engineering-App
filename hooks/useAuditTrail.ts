import { useState, useCallback } from 'react';
import { AuditLog, User } from '../types';
import { generateId } from '../utils/dataLogic';

export const useAuditTrail = (currentUser: User | null) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [lastUpdateInfo, setLastUpdateInfo] = useState<{ name: string; time: string; user?: string } | null>(null);

  const updateLastAction = useCallback((name: string, customDetails?: string) => {
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    setLastUpdateInfo({ name, time: timeStr, user: currentUser?.name || '系統' });

    if (!currentUser) return;

    const details = customDetails || `更新了項目: ${name}`;
    
    setAuditLogs(prev => {
      if (prev.length > 0) {
        const lastLog = prev[0];
        const isSameUser = lastLog.userId === currentUser.id;
        const isRecent = (now - lastLog.timestamp) < 15000; 
        
        const getProjectTag = (d: string) => {
          const match = d.match(/^\[(.*?)\]\s*修改了：/);
          return match ? match[1] : null;
        };
        
        const lastProject = getProjectTag(lastLog.details);
        const currentProject = getProjectTag(details);

        if (isSameUser && isRecent && lastProject && currentProject && lastProject === currentProject) {
          const lastContent = lastLog.details.split('：')[1] || '';
          const currentContent = details.split('：')[1] || '';
          if (lastContent && currentContent) {
            const combinedParts = Array.from(new Set([...lastContent.split('、'), ...currentContent.split('、')])).filter(Boolean);
            const mergedDetails = `[${currentProject}] 修改了：${combinedParts.join('、')}`;
            if (lastLog.details === mergedDetails) return prev;
            const newLogs = [...prev];
            newLogs[0] = { ...lastLog, details: mergedDetails, timestamp: now };
            return newLogs;
          }
        }
        if (isSameUser && (now - lastLog.timestamp) < 5000 && lastLog.details === details) return prev;
      }
      
      return [{ 
        id: generateId(), userId: currentUser.id, userName: currentUser.name, 
        userEmail: currentUser.email, action: 'UPDATE', details: details, timestamp: now 
      }, ...prev];
    });
  }, [currentUser]);

  return { auditLogs, setAuditLogs, lastUpdateInfo, setLastUpdateInfo, updateLastAction };
};