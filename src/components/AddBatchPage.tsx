/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Save, Calendar, Truck, Tag, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AddBatchPage({ onBack }: { onBack: () => void }) {
  const varieties = useLiveQuery(() => db.tab_variaty.toArray());
  const [formData, setFormData] = useState({
    bname: '',
    bvid: '',
    bdate: new Date().toISOString().split('T')[0],
    bowei: '',
    bcli: '',
    bmemo: ''
  });

  const isValid = formData.bname && formData.bvid && formData.bdate && formData.bowei && formData.bcli;

  const handleSubmit = async () => {
    if (!isValid) return;
    const weight = parseFloat(formData.bowei);
    await db.tab_batch.add({
      bname: formData.bname,
      bvid: parseInt(formData.bvid),
      bdate: formData.bdate,
      bowei: weight,
      bcwei: weight,
      bstatus: 0,
      bcli: formData.bcli,
      bmemo: formData.bmemo
    });
    onBack();
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">添加新批次</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <InputGroup label="批次名称" icon={<Tag size={18} />}>
            <input 
              type="text" 
              value={formData.bname}
              onChange={e => setFormData({...formData, bname: e.target.value})}
              placeholder="例如: 2026-A01"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </InputGroup>

          <InputGroup label="对应品种" icon={<PackageIcon size={18} />}>
            <select 
              value={formData.bvid}
              onChange={e => setFormData({...formData, bvid: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
            >
              <option value="">选择品种</option>
              {varieties?.map(v => (
                <option key={v.vid} value={v.vid}>{v.vname}</option>
              ))}
            </select>
          </InputGroup>

          <InputGroup label="卸货日期" icon={<Calendar size={18} />}>
            <input 
              type="date" 
              value={formData.bdate}
              onChange={e => setFormData({...formData, bdate: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </InputGroup>

          <InputGroup label="批次总重 (吨)" icon={<ScaleIcon size={18} />}>
            <input 
              type="number" 
              step="0.001"
              value={formData.bowei}
              onChange={e => setFormData({...formData, bowei: e.target.value})}
              placeholder="0.000"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </InputGroup>

          <InputGroup label="运送卡车车牌" icon={<Truck size={18} />}>
            <input 
              type="text" 
              maxLength={30}
              value={formData.bcli}
              onChange={e => setFormData({...formData, bcli: e.target.value})}
              placeholder="输入车牌号"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </InputGroup>

          <InputGroup label="备注 (可选)" icon={<FileText size={18} />}>
            <textarea 
              maxLength={400}
              rows={3}
              value={formData.bmemo}
              onChange={e => setFormData({...formData, bmemo: e.target.value})}
              placeholder="输入备注信息..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
            <div className="text-[10px] text-right text-slate-400 mt-1">{formData.bmemo.length}/400</div>
          </InputGroup>
        </div>
      </main>

      <footer className="p-6 border-t border-slate-100">
        <button 
          onClick={handleSubmit}
          disabled={!isValid}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={20} /> 确认添加
        </button>
      </footer>
    </div>
  );
}

function InputGroup({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 flex items-center gap-2 ml-1">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function PackageIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
}

function ScaleIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h18"/></svg>;
}
