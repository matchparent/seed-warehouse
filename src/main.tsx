import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { dataService } from './lib/dataService';
import { I18nProvider } from './lib/i18n';

// Premium global network request loader overlay
let activeRequestsCount = 0;
let loaderElement: HTMLDivElement | null = null;
let loaderTimeout: number | any = null;

function showLoader() {
  if (loaderElement) return;
  
  // Create fullscreen loader DOM element with high-precision Tailwind classes
  loaderElement = document.createElement('div');
  loaderElement.id = 'global-network-loader';
  loaderElement.className = 'fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-900/35 backdrop-blur-[1px] transition-opacity duration-200';
  
  const card = document.createElement('div');
  card.className = 'bg-white/95 border border-slate-100/90 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-[260px] w-11/12 text-center animate-in fade-in zoom-in duration-200';
  
  const spinnerContainer = document.createElement('div');
  spinnerContainer.className = 'relative w-10 h-10 flex items-center justify-center';
  
  const circleTrack = document.createElement('div');
  circleTrack.className = 'absolute inset-0 rounded-full border-[3px] border-slate-100';
  
  const circleSpin = document.createElement('div');
  circleSpin.className = 'absolute inset-0 rounded-full border-[3px] border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin';
  
  spinnerContainer.appendChild(circleTrack);
  spinnerContainer.appendChild(circleSpin);
  
  const textContainer = document.createElement('div');
  textContainer.className = 'space-y-1';
  
  const title = document.createElement('div');
  title.className = 'text-xs font-bold text-slate-800';
  title.innerText = '正在提交请求...';
  
  const subtitle = document.createElement('div');
  subtitle.className = 'text-[9px] text-slate-400 font-medium tracking-wide';
  subtitle.innerText = '正在连接云端服务器，请稍候';
  
  textContainer.appendChild(title);
  textContainer.appendChild(subtitle);
  
  card.appendChild(spinnerContainer);
  card.appendChild(textContainer);
  loaderElement.appendChild(card);
  
  if (document.body) {
    document.body.appendChild(loaderElement);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (loaderElement) document.body.appendChild(loaderElement);
    });
  }
}

function hideLoader() {
  if (loaderElement) {
    loaderElement.remove();
    loaderElement = null;
  }
}

// Global window.fetch wrapping to show premium overlay before any active net request
const originalFetch = window.fetch;
const wrappedFetch = async function (this: any, ...args: any[]) {
  const urlArg = args[0];
  let url = '';
  if (typeof urlArg === 'string') {
    url = urlArg;
  } else if (urlArg instanceof URL) {
    url = urlArg.href;
  } else if (urlArg && typeof urlArg === 'object' && 'url' in urlArg) {
    url = (urlArg as any).url;
  }

  // Intercept any relative/absolute backend API endpoint or file uploads
  const isApi = url.includes('/api/');

  if (isApi) {
    activeRequestsCount++;
    if (activeRequestsCount === 1) {
      // Clear any pending toggle first and show overlay
      if (loaderTimeout) {
        clearTimeout(loaderTimeout);
        loaderTimeout = null;
      }
      showLoader();
    }
  }

  try {
    return await originalFetch.apply(this, args);
  } finally {
    if (isApi) {
      activeRequestsCount--;
      if (activeRequestsCount <= 0) {
        activeRequestsCount = 0;
        // Introduce small debounce or remove instantly
        hideLoader();
      }
    }
  }
};

try {
  Object.defineProperty(window, 'fetch', {
    value: wrappedFetch,
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (e) {
  console.warn('Failed to redefine window.fetch with defineProperty, trying normal assignment', e);
  try {
    (window as any).fetch = wrappedFetch;
  } catch (err2) {
    console.error('Completely blocked from intercepting global fetch', err2);
  }
}

async function init() {
  await dataService.init();
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
}

init();
