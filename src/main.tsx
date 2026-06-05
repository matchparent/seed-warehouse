import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { dataService } from './lib/dataService';
import { I18nProvider } from './lib/i18n';

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
