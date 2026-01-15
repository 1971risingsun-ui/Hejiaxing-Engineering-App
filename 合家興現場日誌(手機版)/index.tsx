
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 使用動態導入註冊 PWA，防止虛擬模組載入失敗導致應用崩潰
const registerPWA = async () => {
  // Fix: Cast import.meta to any to access Vite-specific env property when type definitions are not available.
  if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
    try {
      // @ts-ignore - virtual:pwa-register 是由 vite-plugin-pwa 提供的虛擬模組
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        immediate: true,
        onRegisterError(error: any) {
          console.error('PWA registration error', error);
        }
      });
    } catch (e) {
      console.warn('PWA modules not found, skipping registration.');
    }
  }
};

const init = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  registerPWA();
};

// 確保腳本載入時，DOM 已經準備好
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
