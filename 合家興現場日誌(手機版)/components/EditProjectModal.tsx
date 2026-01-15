
import React, { useState, useRef } from 'react';
import { Project, Attachment, ProjectStatus } from '../types';
import { PaperclipIcon, XIcon, LoaderIcon } from './Icons';
import { processFile } from '../utils/fileHelpers';

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onSave: (updatedProject: Project) => void;
}

const STATUS_CYCLE = [
  ProjectStatus.PLANNING,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.COMPLETED,
  ProjectStatus.ON_HOLD
];

const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: project.name,
    clientName: project.clientName,
    clientContact: project.clientContact,
    clientPhone: project.clientPhone,
    address: project.address,
    status: project.status,
    appointmentDate: project.appointmentDate,
    reportDate: project.reportDate,
    description: project.description,
    remarks: project.remarks || '',
  });

  const [attachments, setAttachments] = useState<Attachment[]>(project.attachments || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStatusCycle = () => {
    const currentIndex = STATUS_CYCLE.indexOf(formData.status);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    setFormData({ ...formData, status: STATUS_CYCLE[nextIndex] });
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.COMPLETED: return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case ProjectStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
      case ProjectStatus.PLANNING: return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
      case ProjectStatus.ON_HOLD: return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      const files = Array.from(e.target.files) as File[];
      const newAttachments: Attachment[] = [];

      for (const file of files) {
         try {
             const dataUrl = await processFile(file);
             newAttachments.push({
                 id: crypto.randomUUID(),
                 name: file.name,
                 size: file.size,
                 type: file.type,
                 url: dataUrl
             });
         } catch (error: any) {
             alert(error.message || "檔案處理失敗");
         }
      }
      
      setAttachments(prev => [...prev, ...newAttachments]);
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    const updatedProject: Project = {
      ...project,
      ...formData,
      status: formData.status as ProjectStatus,
      attachments: attachments
    };

    onSave(updatedProject);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">編輯案件內容</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="edit-project-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">案件狀態 (點擊切換)</label>
              <button
                type="button"
                onClick={handleStatusCycle}
                className={`w-full px-4 py-3 rounded-lg border text-sm font-bold transition-all text-center shadow-sm ${getStatusColor(formData.status)}`}
              >
                {formData.status}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">專案名稱</label>
                <input required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">客戶名稱</label>
                <input required name="clientName" value={formData.clientName} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">聯絡窗口</label>
                <input name="clientContact" value={formData.clientContact} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">聯絡電話</label>
                <input name="clientPhone" value={formData.clientPhone} onChange={handleChange} type="tel" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">施工地址</label>
              <input required name="address" value={formData.address} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">預約日期</label>
                <input name="appointmentDate" value={formData.appointmentDate} onChange={handleChange} type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">報修日期</label>
                <input name="reportDate" value={formData.reportDate} onChange={handleChange} type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">工程概要</label>
              <textarea 
                required 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition h-24 resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">備註</label>
              <textarea 
                name="remarks" 
                value={formData.remarks} 
                onChange={handleChange} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition h-20 resize-none"
              ></textarea>
            </div>

            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">相關附件</label>
               <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={handleAttachmentUpload}
               />
               <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="w-full border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg p-3 text-sm text-slate-500 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
               >
                  {isProcessing ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <PaperclipIcon className="w-4 h-4" />}
                  {isProcessing ? '處理檔案中...' : '點擊上傳新附件'}
               </button>
               {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                     {attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded text-sm">
                           <span className="truncate max-w-[80%] text-slate-700">{att.name}</span>
                           <button type="button" onClick={() => removeAttachment(att.id)} className="text-slate-400 hover:text-red-500">
                              <XIcon className="w-4 h-4" />
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            取消
          </button>
          <button 
            type="submit" 
            form="edit-project-form"
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-sm font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? '儲存中...' : '儲存變更'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;
