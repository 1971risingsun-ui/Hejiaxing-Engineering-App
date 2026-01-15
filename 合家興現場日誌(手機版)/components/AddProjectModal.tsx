import React, { useState, useRef } from 'react';
import { Project, ProjectStatus, Attachment, ProjectType } from '../types';
import { PaperclipIcon, XIcon, LoaderIcon, BoxIcon } from './Icons';
import { processFile } from '../utils/fileHelpers';

interface AddProjectModalProps {
  onClose: () => void;
  onAdd: (project: Project) => void;
  defaultType: ProjectType;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ onClose, onAdd, defaultType }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: defaultType,
    clientName: '',
    clientContact: '',
    clientPhone: '',
    address: '',
    appointmentDate: '',
    reportDate: '',
    description: '',
    remarks: '',
  });
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    
    const newProject: Project = {
      id: crypto.randomUUID(),
      type: formData.type,
      name: formData.name,
      clientName: formData.clientName,
      clientContact: formData.clientContact || formData.clientName,
      clientPhone: formData.clientPhone || '',
      address: formData.address,
      status: ProjectStatus.PLANNING,
      progress: 0,
      appointmentDate: formData.appointmentDate,
      reportDate: formData.reportDate,
      description: formData.description,
      remarks: formData.remarks,
      milestones: [],
      photos: [],
      materials: [],
      reports: [],
      attachments: attachments,
      constructionItems: [],
      constructionSignatures: [],
      completionReports: [],
      planningReports: []
    };

    onAdd(newProject);
  };

  const getTitle = () => {
      return '新增案件';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">
            {getTitle()}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="add-project-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">專案名稱</label>
                <input required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="例如：信義區住宅翻修" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">客戶名稱 (公司/業主)</label>
                <input required name="clientName" value={formData.clientName} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">聯絡窗口/人</label>
                <input name="clientContact" value={formData.clientContact} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="例如: 陳先生" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">聯絡電話</label>
                <input name="clientPhone" value={formData.clientPhone} onChange={handleChange} type="tel" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="09xx-xxx-xxx" />
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
              <label className="block text-sm font-medium text-slate-700 mb-1">案件類別</label>
              <div className="relative">
                <BoxIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition bg-white appearance-none"
                >
                  <option value={ProjectType.CONSTRUCTION}>圍籬 (Fence)</option>
                  <option value={ProjectType.MODULAR_HOUSE}>組合屋 (Modular)</option>
                  <option value={ProjectType.MAINTENANCE}>維修 (Maintenance)</option>
                </select>
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
                placeholder="請詳細描述工程內容..."
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">備註</label>
              <textarea 
                name="remarks" 
                value={formData.remarks} 
                onChange={handleChange} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition h-20 resize-none"
                placeholder="輸入其他備註..."
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
                  {isProcessing ? '處理檔案中...' : '點擊上傳檔案'}
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
            form="add-project-form"
            disabled={isProcessing}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg shadow-sm font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? '處理中...' : '建立案件'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProjectModal;