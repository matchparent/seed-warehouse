import React, { useState } from 'react';
import { User, Lock, ArrowRight, AlertCircle, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';

import { cn } from '../lib/utils';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { t } = useI18n();
  const isOnline = dataService.isOnline();
  const dbConfig = dataService.getDbConfig();
  const [spellname, setSpellname] = useState('');
  const [key, setKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spellname.trim() || !key.trim()) {
      setError(t('login.error.empty') || '请输入账号和密码');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isValid = await dataService.verifyUser(spellname.trim(), key.trim());
      if (isValid) {
        dataService.saveAuth({
          spellname: spellname.trim(),
          key: key.trim()
        });
        onLoginSuccess();
      } else {
        setError(t('login.error.invalid') || '账号或密码错误');
      }
    } catch (err: any) {
      setError(err.message || '登录验证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {t('login.title') || '系统登录'}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              棉籽发运管理系统 / Cotton Seed Logistics
            </p>
            <div className="flex justify-center pt-1">
              <span className={cn(
                "px-2.5 py-0.5 text-[11px] font-bold rounded-full inline-flex items-center gap-1.5",
                isOnline ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-sky-50 text-sky-700 border border-sky-200"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500" : "bg-sky-500")} />
                {isOnline ? `联机模式 (${dbConfig?.host || 'MySQL'})` : '单机模式 (本地数据库)'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 ml-1">
                {t('login.username') || '账号'}
              </label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={spellname}
                  onChange={(e) => { setSpellname(e.target.value); setError(null); }}
                  placeholder="请输入账号 (例如: admin)"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 ml-1">
                {t('login.password') || '密码'}
              </label>
              <div className="relative flex items-center">
                <Lock size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => { setKey(e.target.value); setError(null); }}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>登录中...</span>
                </>
              ) : (
                <>
                  <span>{t('login.submit') || '确定登录'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
