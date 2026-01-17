
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { generateId } from '../utils/dataLogic';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  // 透過延遲初始化函數從 localStorage 讀取上次紀錄
  const [role, setRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('lastUsedRole');
    // 檢查上次存儲的角色是否在當前允許的名單中，若不在則預設為 ADMIN
    if (savedRole === UserRole.ADMIN || savedRole === UserRole.WORKER) {
      return savedRole as UserRole;
    }
    return UserRole.ADMIN;
  });
  
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('lastUsedEmail') || '@hejiaxing.ai';
  });

  const [loading, setLoading] = useState(false);

  const LOGO_URL = './logo.png';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      try {
        // 根據選擇的角色設定顯示名稱
        const displayName = role === UserRole.ADMIN ? '管理員' : '現場人員';

        // 在正式進入系統前儲存本次登入資訊
        localStorage.setItem('lastUsedEmail', email);
        localStorage.setItem('lastUsedRole', role);

        const mockUser: User = { id: generateId(), name: displayName, email: email, role: role, avatar: LOGO_URL };
        onLogin(mockUser);
      } catch (err) { 
        alert("登入發生錯誤"); 
      } finally { 
        setLoading(false); 
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-10 text-center flex flex-col items-center">
          <div className="w-32 h-32 mb-6 rounded-full bg-white p-1 shadow-xl">
            <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-[0.2em]">合家興實業</h1>
          <div className="text-[10px] font-bold text-yellow-500 mt-2 uppercase tracking-widest opacity-80">工務總覽</div>
        </div>
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">電子郵件</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">選擇身份</label>
              <div className="grid grid-cols-2 gap-3">
                {[UserRole.ADMIN, UserRole.WORKER].map(r => (
                  <button 
                    key={r} 
                    type="button" 
                    onClick={() => setRole(r)} 
                    className={`py-3 px-2 text-sm rounded-xl border transition-all ${role === r ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {r === UserRole.ADMIN ? '管理員' : '現場'}
                  </button>
                ))}
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center disabled:opacity-70"
            >
              {loading ? "認證中..." : "登入系統"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
