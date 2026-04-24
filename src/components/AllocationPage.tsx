/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, CheckCircle2, Package, Info, AlertCircle, Calendar, Truck } from 'lucide-react';
import { ShipmentState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatWeight, isWeightExceeded } from '../lib/utils';

export default function AllocationPage({ shipmentId, onBack, onComplete }: { shipmentId: number, onBack: () => void, onComplete: () => void }) {
  const shipment = useLiveQuery(() => db.tab_sending_record.get(shipmentId), [shipmentId]);
  const varieties = useLiveQuery(() => db.tab_variaty.toArray());
  const allBatches = useLiveQuery(() => db.tab_batch.where('bstatus').equals(1).toArray());
  
  const [allocations, setAllocations] = useState<Record<number, number>>({}); // bid -> weight
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);
  const [tempWeight, setTempWeight] = useState('');

  const plannedItems = useMemo(() => {
    if (!shipment?.spinfo) return [];
    return shipment.spinfo.split(',').map(item => {
      const [vid, weight] = item.split('/');
      return { vid: parseInt(vid), weight: parseFloat(weight) };
    });
  }, [shipment]);

  const batches = useMemo(() => {
    if (!allBatches) return [];
    return allBatches.filter(b => b.bcwei > 0);
  }, [allBatches]);

  const varietyProgress = useMemo(() => {
    if (!plannedItems || !batches) return [];
    
    return plannedItems.map(plan => {
      const allocated = Object.entries(allocations).reduce((sum, [bid, weight]) => {
        const batch = batches.find(b => b.bid === parseInt(bid));
        return batch?.bvid === plan.vid ? sum + (weight as number) : sum;
      }, 0);
      const percent = (allocated / plan.weight) * 100;
      return { ...plan, allocated, percent };
    });
  }, [plannedItems, allocations, batches]);

  const isAllMatched = varietyProgress.every(p => Math.abs(p.allocated - p.weight) < 0.0001);

  const handleSetAllocation = () => {
    const weight = parseFloat(tempWeight);
    const batch = batches.find(b => b.bid === activeBatchId);
    if (!batch || isNaN(weight) || isWeightExceeded(weight, batch.bcwei)) return;
    
    setAllocations(prev => ({ ...prev, [batch.bid as number]: weight }));
    setActiveBatchId(null);
    setTempWeight('');
  };

  const handleFinish = async () => {
    if (!isAllMatched) return;
    
    const sainfo = Object.entries(allocations)
      .filter(([_, weight]) => weight > 0)
      .map(([bid, weight]) => `${bid}/${weight}`)
      .join(',');
    
    await db.tab_sending_record.update(shipmentId, { 
      sainfo, 
      sstate: ShipmentState.ALLOCATED 
    });
    
    onComplete();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white px-6 py-4 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">货物配置</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Progress Section */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">分配进度</h3>
          <div className="space-y-3">
            {varietyProgress.map((p, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700">{varieties?.find(v => v.vid === p.vid)?.vname}</span>
                  <span className={cn("font-mono font-bold", Math.abs(p.allocated - p.weight) < 0.0001 ? "text-emerald-600" : "text-amber-500")}>
                    {formatWeight(p.allocated)} / {formatWeight(p.weight)}t
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(p.percent, 100)}%` }}
                    className={cn("h-full transition-colors", p.percent > 100 ? "bg-red-500" : "bg-emerald-500")}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Batch List Section */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">可用批次 (点击配置)</h3>
          <div className="grid gap-2">
            {batches.map(batch => {
              const allocated = allocations[batch.bid] || 0;
              const variety = varieties?.find(v => v.vid === batch.bvid);
              const isRelevant = plannedItems.some(p => p.vid === batch.bvid);

              return (
                <button
                  key={batch.bid}
                  onClick={() => {
                    setActiveBatchId(batch.bid);
                    setTempWeight(allocated > 0 ? allocated.toString() : '');
                  }}
                  disabled={!isRelevant}
                  className={cn(
                    "bg-white p-3 rounded-xl shadow-sm border text-left transition-all",
                    allocated > 0 ? "border-emerald-500 ring-1 ring-emerald-500" : "border-slate-100",
                    !isRelevant && "opacity-40 grayscale"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-slate-800">{batch.bname}</div>
                      <div className="text-[10px] text-emerald-600 font-medium">{variety?.vname}</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1"><Calendar size={10} /> {batch.bdate}</span>
                        <span className="flex items-center gap-1"><Truck size={10} /> {batch.bcli}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">剩余: {formatWeight(batch.bcwei)}t</div>
                      {allocated > 0 && <div className="text-xs font-bold text-emerald-600">已选: {formatWeight(allocated)}t</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="p-6 bg-white border-t border-slate-100 space-y-4">
        <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3">
          <Info size={18} className="text-blue-500" />
          <p className="text-[10px] text-slate-500">只有当所有品种的已配置重量与计划重量完全吻合时，才可完成分配。</p>
        </div>
        <button 
          onClick={handleFinish}
          disabled={!isAllMatched}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={20} /> 完成分配
        </button>
      </footer>

      {/* Allocation Modal */}
      <AnimatePresence>
        {activeBatchId !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveBatchId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-xs rounded-3xl shadow-2xl relative z-10 p-6 space-y-4"
            >
              <h3 className="font-bold text-slate-800">配置扣除吨数</h3>
              <div>
                <div className="text-[10px] text-slate-400 mb-1">
                  批次: {batches.find(b => b.bid === activeBatchId)?.bname}
                </div>
                <div className="text-xs text-slate-500 mb-2">
                  当前批次剩余: <span className="font-bold text-slate-700">{formatWeight(batches.find(b => b.bid === activeBatchId)?.bcwei || 0)}t</span>
                </div>
                <input 
                  type="number" 
                  step="0.001"
                  autoFocus
                  value={tempWeight}
                  onChange={e => setTempWeight(e.target.value)}
                  placeholder="输入扣除吨数"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {isWeightExceeded(parseFloat(tempWeight), batches.find(b => b.bid === activeBatchId)?.bcwei || 0) && (
                  <div className="flex items-center gap-1 text-red-500 mt-2">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-bold">超出批次剩余重量！</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActiveBatchId(null)} className="flex-1 py-2 text-slate-400 font-bold">取消</button>
                <button 
                  onClick={handleSetAllocation}
                  disabled={!tempWeight || isWeightExceeded(parseFloat(tempWeight), batches.find(b => b.bid === activeBatchId)?.bcwei || 0)}
                  className="flex-1 py-2 bg-emerald-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  确认
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
