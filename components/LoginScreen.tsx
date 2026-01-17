
import React, { useState } from 'react';
import { User } from '../types';

export interface LoginScreenProps {
  onLogin: (user: User) => void;
  users: User[];
}

export default function LoginScreen({ onLogin, users }: LoginScreenProps) {
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('lastUsedEmail') || '@hejiaxing.ai';
  });

  const [loading, setLoading] = useState(false);

  const LOGO_URL = './logo.png';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // 模擬驗證延遲
    setTimeout(() => {
      try {
        const trimmedEmail = email.trim().toLowerCase();
        // 執行比對：從系統使用者名單中尋找匹配的 Email
        const matchedUser = users.find(u => u.email.toLowerCase() === trimmedEmail);

        if (matchedUser) {
          // 成功比對：儲存最後使用的帳號並執行登入
          localStorage.setItem('lastUsedEmail', trimmedEmail);
          localStorage.setItem('lastUsedRole', matchedUser.role);
          
          onLogin(matchedUser);
        } else {
          // 比對失敗：Email 不在名單中
          alert("登入失敗：此電子郵件尚未註冊於系統中。請聯繫管理員新增帳號。");
        }
      } catch (err) { 
        alert("登入發生錯誤，請稍後再試。"); 
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
          <div className="text-[10px] font-bold text-yellow-500 mt-2 uppercase tracking-widest opacity-80">智能工務管理系統</div>
        </div>
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-widest">電子郵件帳號</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="輸入您的公司信箱"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium shadow-inner" 
              />
              <p className="mt-3 text-[11px] text-slate-400 font-medium leading-relaxed">
                系統將自動根據您的帳號設定判斷存取權限。
              </p>
            </div>
            
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex justify-center items-center disabled:opacity-70 group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>身份驗證中...</span>
                </div>
              ) : "登入系統"}
            </button>
          </form>
        </div>
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                He Jia Xing Construction Management
            </p>
        </div>
      </div>
    </div>
  );
}
