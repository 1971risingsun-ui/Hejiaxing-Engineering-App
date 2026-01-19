import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { generateId } from '../utils/dataLogic';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  users: User[];
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users }) => {
  const [role, setRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('lastUsedRole');
    return (savedRole as UserRole) || UserRole.ADMIN;
  });
  
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('lastUsedEmail') || 'demo@hejiaxing.ai';
  });

  const [loading, setLoading] = useState(false);

  const LOGO_URL = './logo.png';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // 模擬網路延遲
    setTimeout(() => {
      try {
        let displayName = '現場人員';
        if (role === UserRole.ADMIN) displayName = '管理員';
        else if (role === UserRole.MANAGER) displayName = '專案經理';
        else if (role === UserRole.ENGINEERING) displayName = '工務人員';
        else if (role === UserRole.FACTORY) displayName = '廠務人員';

        // 儲存登入資訊
        localStorage.setItem('lastUsedEmail', email);
        localStorage.setItem('lastUsedRole', role);

        const mockUser: User = { 
          id: generateId(), 
          name: displayName, 
          email: email, 
          role: role, 
          avatar: LOGO_URL 
        };
        onLogin(mockUser);
      } catch (err) { 
        alert("登入發生錯誤，請重新整理頁面。"); 
      } finally { 
        setLoading(false); 
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-10 text-center flex flex-col items-center">
          <div className="w-24 h-24 mb-6 rounded-full bg-white p-1 shadow-xl">
            <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-[0.2em]">合家興實業</h1>
          <div className="text-[10px] font-bold text-yellow-500 mt-2 uppercase tracking-widest opacity-80">行政管理系統</div>
        </div>
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">電子郵件 / 帳號</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="請輸入 Email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none transition focus:ring-2 focus:ring-blue-500 font-bold" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">選擇登入身份</label>
              <div className="grid grid-cols-2 gap-2">
                {[UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEERING, UserRole.FACTORY, UserRole.WORKER].map(r => (
                  <button 
                    key={r} 
                    type="button" 
                    onClick={() => setRole(r)} 
                    className={`py-3 px-1 text-xs rounded-xl border-2 transition-all ${role === r ? 'bg-blue-600 border-blue-600 text-white font-black shadow-md scale-[1.02]' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {r === UserRole.ADMIN ? '管理員' : r === UserRole.MANAGER ? '經理' : r === UserRole.ENGINEERING ? '工務' : r === UserRole.FACTORY ? '廠務' : '現場人員'}
                  </button>
                ))}
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70 active:scale-95"
            >
              {loading ? "正在驗證身份..." : "進入系統"}
            </button>
          </form>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">He Jia Xing Enterprise Co., Ltd.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;