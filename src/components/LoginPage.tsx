import React, { useState, useRef } from 'react';
import { Upload, FileJson, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { dataService } from '../lib/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJsonData = async (content: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = JSON.parse(content);
      
      // 1. Format validation
      if (data.type !== 'HT-Login' || !data.spellname || !data.key) {
        throw new Error(t('login.error.format'));
      }

      // 2. Database verification
      const isValid = await dataService.verifyUser(data.spellname, data.key);
      
      if (isValid) {
        localStorage.setItem('auth_user', JSON.stringify({
          name: data.name,
          spellname: data.spellname,
          key: data.key
        }));
        onLoginSuccess();
      } else {
        throw new Error(t('login.error.match'));
      }
    } catch (err: any) {
      setError(err.message || t('login.error.read'));
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleJsonData(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        handleJsonData(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck size={40} />
          </div>
          
          <div>
            <h1 className="text-2xl font-black text-slate-800">系统授权登录 / Tizimga kirish</h1>
            <p className="text-slate-400 text-sm mt-2 font-medium">请上传您的 JSON 授权文件以进入系统 / JSON ruxsatnoma faylini yuklang</p>
          </div>

          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all duration-300",
              dragActive ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50"
            )}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".json" 
              onChange={onFileChange}
              className="hidden" 
            />
            
            <div className="space-y-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-colors",
                dragActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-500"
              )}>
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
              </div>
              <div className="text-sm font-bold text-slate-600">{t('login.drag_hint')}</div>
              <div className="text-[10px] text-slate-400">.json</div>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 text-red-500 p-3 rounded-xl flex items-center gap-2 text-xs font-bold"
              >
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
