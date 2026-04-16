/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, CheckCircle2, Truck, MapPin, Phone, Calendar, Info, Package, FileText } from 'lucide-react';
import { ShipmentState } from '../types';
import { formatWeight, formatDate } from '../lib/utils';
import { motion } from 'motion/react';

export default function InspectionPage({ shipmentId, onBack, onFinished }: { shipmentId: number, onBack: () => void, onFinished: () => void }) {
  const shipment = useLiveQuery(() => db.tab_sending_record.get(shipmentId), [shipmentId]);
  const varieties = useLiveQuery(() => db.tab_variaty.toArray());
  const destinations = useLiveQuery(() => db.tab_destination.toArray());
  const allBatches = useLiveQuery(() => db.tab_batch.toArray());
  const [memo, setMemo] = React.useState('');

  React.useEffect(() => {
    if (shipment) {
      setMemo(shipment.smemo || '');
    }
  }, [shipment]);

  if (!shipment || !varieties || !destinations || !allBatches) return null;

  const allocations = shipment.sainfo.split(',').map(item => {
    const [bid, weight] = item.split('/');
    const batch = allBatches.find(b => b.bid === parseInt(bid));
    const variety = varieties.find(v => v.vid === batch?.bvid);
    return { 
      bid: parseInt(bid), 
      name: batch?.bname, 
      vname: variety?.vname, 
      current: batch?.bcwei || 0, 
      deduct: parseFloat(weight) 
    };
  });

  const handleFinish = async () => {
    await db.transaction('rw', db.tab_batch, db.tab_sending_record, async () => {
      // 1. Update batch weights
      for (const alloc of allocations) {
        const batch = await db.tab_batch.get(alloc.bid);
        if (batch) {
          await db.tab_batch.update(alloc.bid, { bcwei: batch.bcwei - alloc.deduct });
        }
      }
      
      // 2. Update shipment state
      await db.tab_sending_record.update(shipmentId, { 
        sstate: ShipmentState.COMPLETED,
        sftime: new Date().toISOString(),
        smemo: memo
      });
    });
    
    onFinished();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white px-6 py-4 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">发货检查</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info Summary */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-2 gap-4">
          <InfoItem icon={<Truck size={14} />} label="车牌号" value={shipment.splate} />
          <InfoItem icon={<MapPin size={14} />} label="目的地" value={destinations.find(d => d.did === shipment.sdest)?.dname || ''} />
          <InfoItem icon={<Phone size={14} />} label="司机电话" value={shipment.sdrpn} />
          <InfoItem icon={<Calendar size={14} />} label="创建日期" value={formatDate(shipment.sdate)} />
        </section>

        {/* Remarks Section */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-2">
          <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
            <FileText size={14} /> 备注 (可选)
          </div>
          <textarea 
            rows={3}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="输入执行此次发货的备注..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-xs"
          />
        </section>

        {/* Weight Change Inspection */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">批次重量变动检查</h3>
          <div className="space-y-2">
            {allocations.map(a => (
              <div key={a.bid} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{a.name}</div>
                    <div className="text-[10px] text-emerald-600 font-medium">{a.vname}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">装载吨数</div>
                    <div className="text-sm font-bold text-red-500">-{formatWeight(a.deduct)}t</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl relative overflow-hidden">
                  <div className="flex-1 text-center">
                    <div className="text-[10px] text-slate-400 mb-1">发货前</div>
                    <div className="text-xs font-bold text-slate-600">{formatWeight(a.current)}t</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 z-10">
                    <ArrowLeft className="rotate-180" size={16} />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-[10px] text-slate-400 mb-1">发货后</div>
                    <div className="text-xs font-bold text-emerald-600">{formatWeight(a.current - a.deduct)}t</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
          <Info className="text-amber-500 shrink-0" size={20} />
          <p className="text-xs text-amber-700 leading-relaxed">
            请仔细核对以上信息。点击“完成发货”后，系统将正式扣除对应批次的库存重量，并记录发货时间。
          </p>
        </div>
      </main>

      <footer className="p-6 bg-white border-t border-slate-100">
        <button 
          onClick={handleFinish}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={20} /> 完成发货
        </button>
      </footer>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="text-xs font-bold text-slate-700 truncate">{value}</div>
    </div>
  );
}
