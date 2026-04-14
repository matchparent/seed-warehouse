/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, 
  MoreVertical, 
  History, 
  Edit2, 
  Trash2, 
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { cn, formatWeight, formatDate, copyToClipboard } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function BatchListFragment({ onAdd }: { onAdd: () => void }) {
  const batches = useLiveQuery(() => db.tab_batch.toArray());
  const varieties = useLiveQuery(() => db.tab_variaty.toArray());
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [historyModal, setHistoryModal] = useState<number | null>(null);
  const [editWeightModal, setEditWeightModal] = useState<number | null>(null);
  const [editStatusModal, setEditStatusModal] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const getVarietyName = (vid: number) => varieties?.find(v => v.vid === vid)?.vname || '未知';

  const handleCopySummary = async () => {
    if (!batches || !varieties) return;
    
    const summary = batches
      .filter(b => b.bcwei > 0)
      .map(b => {
        const vname = getVarietyName(b.bvid);
        const weightStr = `剩余 ${b.bcwei.toFixed(3).padStart(8)} 吨`;
        const batchInfo = `${b.bid}(${vname})`;
        return `${weightStr}          ${batchInfo}`;
      })
      .join('\n');
    
    const success = await copyToClipboard(summary);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">当前库存批次</h2>
        <button
          onClick={onAdd}
          className="bg-emerald-500 text-white p-2 rounded-full shadow-lg hover:bg-emerald-600 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="grid gap-3">
        {batches?.map((batch) => (
          <div key={batch.bid} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 relative">
            <div 
              className={cn(
                "w-3 h-3 rounded-full shrink-0",
                batch.bcwei === 0 ? "bg-slate-300" : (batch.bstatus === 1 ? "bg-[#AFC3A8]" : "bg-[#FF2525]")
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-700 truncate">批次: {batch.bname}</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-mono">
                  ID: {batch.bid}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span className="font-medium text-emerald-600">{getVarietyName(batch.bvid)}</span>
                <span className="text-slate-300">|</span>
                <span>初始: {formatWeight(batch.bowei)}t</span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-700">剩余: {formatWeight(batch.bcwei)}t</span>
              </div>
            </div>
            <button 
              onClick={() => setMenuOpen(menuOpen === batch.bid ? null : batch.bid)}
              className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"
            >
              <MoreVertical size={18} />
            </button>

            {/* Popover Menu */}
            <AnimatePresence>
              {menuOpen === batch.bid && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-3 top-10 bg-white shadow-xl border border-slate-100 rounded-xl py-1 z-20 min-w-[120px]"
                  >
                    <MenuButton icon={<History size={14} />} label="发货历史" onClick={() => { setHistoryModal(batch.bid); setMenuOpen(null); }} />
                    <MenuButton icon={<Edit2 size={14} />} label="修改状态" onClick={() => { setEditStatusModal(batch.bid); setMenuOpen(null); }} />
                    <MenuButton icon={<Edit2 size={14} />} label="修改剩余" onClick={() => { setEditWeightModal(batch.bid); setMenuOpen(null); }} />
                    <MenuButton icon={<Trash2 size={14} />} label="删除" onClick={() => { setDeleteConfirm(batch.bid); setMenuOpen(null); }} className="text-red-500" />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <button
        onClick={handleCopySummary}
        className="w-full py-3 bg-white border-2 border-dashed border-emerald-200 rounded-xl text-emerald-600 font-medium flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors mt-4"
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
        {copied ? '已复制到剪贴板' : '复制批次剩余重量信息'}
      </button>

      {/* Modals */}
      <HistoryModal bid={historyModal} onClose={() => setHistoryModal(null)} />
      <EditWeightModal bid={editWeightModal} onClose={() => setEditWeightModal(null)} />
      <EditStatusModal bid={editStatusModal} onClose={() => setEditStatusModal(null)} />
      <DeleteModal bid={deleteConfirm} onClose={() => setDeleteConfirm(null)} />
    </div>
  );
}

function MenuButton({ icon, label, onClick, className }: { icon: React.ReactNode, label: string, onClick: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn("w-full px-4 py-2 text-left text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors", className)}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Modal Components ---

function HistoryModal({ bid, onClose }: { bid: number | null, onClose: () => void }) {
  const batch = useLiveQuery(() => bid ? db.tab_batch.get(bid) : undefined, [bid]);
  const varieties = useLiveQuery(() => db.tab_variaty.toArray());
  const records = useLiveQuery(() => db.tab_sending_record.where('sstate').equals(3).toArray());

  if (!bid || !batch) return null;

  const history = records?.filter(r => r.sainfo.includes(`${bid}/`)).map(r => {
    const weight = parseFloat(r.sainfo.split(',').find(s => s.startsWith(`${bid}/`))?.split('/')[1] || '0');
    return { ...r, weight };
  });

  return (
    <Modal title="发货历史" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
          <div className="text-xs text-emerald-600 font-medium">批次信息</div>
          <div className="text-sm font-bold text-emerald-900">{batch.bname} ({varieties?.find(v => v.vid === batch.bvid)?.vname})</div>
          <div className="flex justify-between mt-2 text-xs text-emerald-700">
            <span>总重: {formatWeight(batch.bowei)}t</span>
            <span>当前剩余: {formatWeight(batch.bcwei)}t</span>
          </div>
        </div>
        
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {history?.length ? history.map(h => (
            <div key={h.sid} className="p-2 border-b border-slate-100 flex justify-between items-center text-xs">
              <div>
                <div className="font-bold text-slate-700">{h.splate}</div>
                <div className="text-slate-400">{formatDate(h.sdate)}</div>
              </div>
              <div className="text-red-500 font-bold">-{formatWeight(h.weight)}t</div>
            </div>
          )) : <div className="text-center py-8 text-slate-400 text-xs italic">暂无发货记录</div>}
        </div>
      </div>
    </Modal>
  );
}

function EditWeightModal({ bid, onClose }: { bid: number | null, onClose: () => void }) {
  const batch = useLiveQuery(() => bid ? db.tab_batch.get(bid) : undefined, [bid]);
  const [weight, setWeight] = useState('');

  if (!bid || !batch) return null;

  const handleConfirm = async () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w > batch.bowei) return;
    await db.tab_batch.update(bid, { bcwei: w });
    onClose();
  };

  return (
    <Modal title="修改剩余重量" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">当前剩余: {formatWeight(batch.bcwei)}t (最大: {formatWeight(batch.bowei)}t)</label>
          <input 
            type="number" 
            step="0.001"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="输入新的剩余吨数"
          />
          {parseFloat(weight) > batch.bowei && <p className="text-[10px] text-red-500 mt-1">修改数字不可大于批次总重</p>}
        </div>
        <button 
          onClick={handleConfirm}
          disabled={!weight || parseFloat(weight) > batch.bowei}
          className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold disabled:opacity-50"
        >
          确认修改
        </button>
      </div>
    </Modal>
  );
}

function EditStatusModal({ bid, onClose }: { bid: number | null, onClose: () => void }) {
  const batch = useLiveQuery(() => bid ? db.tab_batch.get(bid) : undefined, [bid]);
  const [status, setStatus] = useState<number>(0);

  if (!bid || !batch) return null;

  const handleConfirm = async () => {
    await db.tab_batch.update(bid, { bstatus: status });
    onClose();
  };

  return (
    <Modal title="修改批次状态" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-4">
          <button 
            onClick={() => setStatus(1)}
            className={cn(
              "flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
              status === 1 ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400"
            )}
          >
            <div className="w-4 h-4 rounded-full bg-[#AFC3A8]" />
            <span className="text-xs font-bold">可发货</span>
          </button>
          <button 
            onClick={() => setStatus(0)}
            className={cn(
              "flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
              status === 0 ? "border-red-500 bg-red-50 text-red-700" : "border-slate-100 text-slate-400"
            )}
          >
            <div className="w-4 h-4 rounded-full bg-[#FF2525]" />
            <span className="text-xs font-bold">不可发货</span>
          </button>
        </div>
        <button 
          onClick={handleConfirm}
          className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold"
        >
          确认修改
        </button>
      </div>
    </Modal>
  );
}

function DeleteModal({ bid, onClose }: { bid: number | null, onClose: () => void }) {
  if (!bid) return null;

  const handleConfirm = async () => {
    await db.tab_batch.delete(bid);
    onClose();
  };

  return (
    <Modal title="确认删除" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl">
          <AlertCircle size={24} />
          <p className="text-sm font-medium">确定要删除这个批次吗？此操作不可撤销。</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">取消</button>
          <button onClick={handleConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">确认删除</button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, y: 100 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
