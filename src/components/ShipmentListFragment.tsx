/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, 
  Truck, 
  Calendar, 
  Phone, 
  MapPin, 
  FileText,
  AlertCircle,
  RotateCcw,
  Trash2,
  Filter
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { ShipmentState } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function ShipmentListFragment({ onAdd, onEdit }: { onAdd: () => void, onEdit: (id: number, state: ShipmentState) => void }) {
  const [filterDate, setFilterDate] = useState<string>('');
  const records = useLiveQuery(() => {
    if (filterDate) {
      return db.tab_sending_record.where('sdate').equals(filterDate).reverse().toArray();
    }
    return db.tab_sending_record.reverse().toArray();
  }, [filterDate]);

  const varieties = useLiveQuery(() => db.tab_variaty.toArray());
  const destinations = useLiveQuery(() => db.tab_destination.toArray());
  const batches = useLiveQuery(() => db.tab_batch.toArray());

  const [deleteModal, setDeleteModal] = useState<number | null>(null);
  const [withdrawModal, setWithdrawModal] = useState<number | null>(null);

  const getStateLabel = (state: ShipmentState) => {
    switch (state) {
      case ShipmentState.NEW: return { label: '新创建', color: 'bg-blue-100 text-blue-600' };
      case ShipmentState.ALLOCATED: return { label: '已分配', color: 'bg-amber-100 text-amber-600' };
      case ShipmentState.COMPLETED: return { label: '已完成', color: 'bg-emerald-100 text-emerald-600' };
      case ShipmentState.WITHDRAWN: return { label: '已撤回', color: 'bg-slate-100 text-slate-600' };
      default: return { label: '未知', color: 'bg-slate-100 text-slate-600' };
    }
  };

  const parseInfo = (info: string, type: 'variety' | 'batch') => {
    if (!info) return [];
    return info.split(',').map(item => {
      const [id, weight] = item.split('/');
      const name = type === 'variety' 
        ? varieties?.find(v => v.vid === parseInt(id))?.vname 
        : batches?.find(b => b.bid === parseInt(id))?.bname;
      return { name, weight };
    });
  };

  const handleLongPress = (id: number, state: ShipmentState) => {
    if (state === ShipmentState.COMPLETED) {
      setWithdrawModal(id);
    } else {
      setDeleteModal(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">发货记录</h2>
        <div className="flex gap-2">
          <div className="relative">
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                className="absolute -right-1 -top-1 bg-slate-400 text-white rounded-full p-0.5"
              >
                <Plus size={10} className="rotate-45" />
              </button>
            )}
          </div>
          <button
            onClick={onAdd}
            className="bg-emerald-500 text-white p-2 rounded-full shadow-lg hover:bg-emerald-600 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {records?.map((record) => {
          const stateInfo = getStateLabel(record.sstate);
          const showPlanned = record.sstate === ShipmentState.NEW || record.sstate === ShipmentState.ALLOCATED;
          const info = showPlanned ? parseInfo(record.spinfo, 'variety') : parseInfo(record.sainfo, 'batch');

          return (
            <motion.div 
              key={record.sid}
              onContextMenu={(e) => { e.preventDefault(); handleLongPress(record.sid!, record.sstate); }}
              onTouchStart={(e) => {
                const timer = setTimeout(() => handleLongPress(record.sid!, record.sstate), 600);
                e.currentTarget.addEventListener('touchend', () => clearTimeout(timer), { once: true });
              }}
              onClick={() => {
                if (record.sstate === ShipmentState.NEW || record.sstate === ShipmentState.ALLOCATED) {
                  onEdit(record.sid!, record.sstate);
                }
              }}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 space-y-2 active:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">#{record.sid}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase", stateInfo.color)}>
                    {stateInfo.label}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar size={10} /> {formatDate(record.sdate)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Truck size={14} className="text-emerald-500" />
                {record.splate}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1 text-slate-500">
                  <Phone size={12} /> {record.sdrpn}
                </div>
                <div className="flex items-center gap-1 text-slate-500 truncate">
                  <MapPin size={12} /> {destinations?.find(d => d.did === record.sdest)?.dname}
                </div>
              </div>

              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-[10px] text-slate-400 mb-1 font-medium">
                  {showPlanned ? '计划装载' : '实际装载'}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {info.map((item, i) => (
                    <div key={i} className="text-[11px] text-slate-600 flex items-center gap-1">
                      <span className="font-medium">{item.name}:</span>
                      <span className="font-bold text-emerald-600">{item.weight}t</span>
                    </div>
                  ))}
                </div>
              </div>

              {record.smemo && (
                <div className="text-[11px] text-slate-400 flex items-start gap-1 bg-amber-50/50 p-1.5 rounded border border-amber-100/50">
                  <FileText size={12} className="shrink-0 mt-0.5" />
                  <p className="line-clamp-2">{record.smemo}</p>
                </div>
              )}
            </motion.div>
          );
        })}
        {records?.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm italic">
            暂无发货记录
          </div>
        )}
      </div>

      <DeleteShipmentModal sid={deleteModal} onClose={() => setDeleteModal(null)} />
      <WithdrawShipmentModal sid={withdrawModal} onClose={() => setWithdrawModal(null)} />
    </div>
  );
}

function DeleteShipmentModal({ sid, onClose }: { sid: number | null, onClose: () => void }) {
  if (!sid) return null;
  const handleConfirm = async () => {
    await db.tab_sending_record.delete(sid);
    onClose();
  };
  return (
    <Modal title="确认删除记录" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl">
          <AlertCircle size={24} />
          <p className="text-sm font-medium">确定要删除这条发货记录吗？</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">取消</button>
          <button onClick={handleConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">确认删除</button>
        </div>
      </div>
    </Modal>
  );
}

function WithdrawShipmentModal({ sid, onClose }: { sid: number | null, onClose: () => void }) {
  const record = useLiveQuery(() => sid ? db.tab_sending_record.get(sid) : undefined, [sid]);
  const batches = useLiveQuery(() => db.tab_batch.toArray());

  if (!sid || !record) return null;

  const allocations = record.sainfo.split(',').map(item => {
    const [bid, weight] = item.split('/');
    const batch = batches?.find(b => b.bid === parseInt(bid));
    return { bid: parseInt(bid), name: batch?.bname, current: batch?.bcwei || 0, weight: parseFloat(weight) };
  });

  const handleConfirm = async () => {
    await db.transaction('rw', db.tab_batch, db.tab_sending_record, async () => {
      for (const alloc of allocations) {
        const batch = await db.tab_batch.get(alloc.bid);
        if (batch) {
          await db.tab_batch.update(alloc.bid, { bcwei: batch.bcwei + alloc.weight });
        }
      }
      await db.tab_sending_record.update(sid, { sstate: ShipmentState.WITHDRAWN });
    });
    onClose();
  };

  return (
    <Modal title="确认撤回发货" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-sm text-slate-600">撤回后，以下批次的剩余重量将恢复：</div>
        <div className="space-y-2">
          {allocations.map(a => (
            <div key={a.bid} className="flex justify-between text-xs p-2 bg-slate-50 rounded-lg">
              <span>{a.name}</span>
              <span className="font-bold text-emerald-600">{a.current}t → {(a.current + a.weight).toFixed(3)}t</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">取消</button>
          <button onClick={handleConfirm} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            <RotateCcw size={16} /> 确认撤回
          </button>
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
