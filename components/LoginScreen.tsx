import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { generateId } from '../utils/dataLogic';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  allUsers: User[];
  onRemoteSync: () => Promise<User[]>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, allUsers, onRemoteSync }) => {
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('lastUsedEmail') || 'demo@hejiaxing.ai';
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const LOGO_URL = './logo.png';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 1. 在進入系統前，先從遠端同步最新資料
      const latestUsers = await onRemoteSync();
      
      // 2. 使用最新的使用者清單進行比對
      const foundUser = latestUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!foundUser) {
        setError('帳號不存在');
        setLoading(false);
        return;
      }

      // 儲存本次登入 email
      localStorage.setItem('lastUsedEmail', email);

      // 使用找到的使用者資料進行登入
      onLogin(foundUser);
    } catch (err) { 
      setError("登入發生錯誤，請檢查網路連線"); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-10 text-center flex flex-col items-center">
          <div className="w-32 h-32 mb-6 rounded-full bg-white p-1 shadow-xl">
            <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-[0.2em]">合家興實業</h1>
          <div className="text-[10px] font-bold text-yellow-500 mt-2 uppercase tracking-widest opacity-80">行政管理系統</div>
        </div>
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">電子郵件</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }} 
                required 
                className={`w-full px-4 py-2 border rounded-lg outline-none transition focus:ring-2 ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`} 
              />
              {error && <p className="text-red-500 text-xs mt-1 font-bold">⚠️ {error}</p>}
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                 * 系統將從雲端同步最新帳號資訊。請輸入您在系統中註冊的電子郵件，系統將自動分配權限。
               </p>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center disabled:opacity-70"
            >
              {loading ? "雲端同步中..." : "登入系統"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;