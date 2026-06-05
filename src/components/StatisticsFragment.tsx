/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatWeight, addWeights, safeToFixed } from '../lib/utils';
import { ShipmentState } from '../types';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useVarieties, useBatches, useSendingRecords, useDestinations } from '../lib/dataService';
import { useI18n } from '../lib/i18n';

export default function StatisticsFragment() {
  const { t } = useI18n();
  const varieties = useVarieties();
  const batches = useBatches();
  const allRecords = useSendingRecords();
  const records = allRecords?.filter(r => r.sstate === ShipmentState.COMPLETED);
  const destinations = useDestinations();

  if (!varieties || !batches || !records || !destinations) return null;

  // 1. Variety Stock
  const varietyStock = varieties.map(v => {
    const vBatches = batches.filter(b => b.bvid === v.vid);
    const initial = vBatches.reduce((sum, b) => addWeights(sum, b.bowei), 0);
    const current = vBatches.reduce((sum, b) => addWeights(sum, b.bcwei), 0);
    const percent = initial > 0 ? (current / initial) * 100 : 0;
    return { name: v.vname, initial, current, percent };
  });

  // 2. Destination Stats
  const destStats = destinations.map(d => {
    // Use Number conversion to handle potential type mismatches
    const dRecords = records.filter(r => Number(r.sdest) === Number(d.did));
    const total = dRecords.reduce((sum, r) => {
      const info = r.sainfo || '';
      // Split and clean each item before parsing
      const recordTotal = info.split(',').reduce((acc, s) => {
        const parts = s.trim().split('/');
        if (parts.length < 2) return acc;
        const w = parseFloat(parts[1]);
        return isNaN(w) ? acc : addWeights(acc, w);
      }, 0);
      return addWeights(sum, recordTotal);
    }, 0);
    
    const names = (d.dname || '未知/Noma\'lum').split('/');
    const zhName = names[0];
    const uzName = names[1] || names[0];
    
    return { 
      name: uzName, 
      fullName: `${zhName}/${uzName}`,
      value: Number(total) || 0 
    };
  }).filter(d => (d.value || 0) > 0);

  // 3. Daily Stats
  const dailyData: any[] = [];
  const dates = Array.from(new Set(records.map(r => r.sdate))).sort().reverse();
  
  dates.forEach(date => {
    const dayRecords = records.filter(r => r.sdate === date);
    const dayVarieties: { name: string, weight: number }[] = [];
    let dayTotal = 0;
    
    varieties.forEach(v => {
      const vTotal = dayRecords.reduce((sum, r) => {
        const info = r.sainfo || '';
        const recordVTotal = info.split(',').reduce((acc, s) => {
          const parts = s.split('/');
          if (parts.length < 2) return acc;
          const [bid, weight] = parts;
          const batch = batches.find(b => b.bid === Number(bid));
          const w = parseFloat(weight);
          if (batch?.bvid === v.vid && !isNaN(w)) {
            return addWeights(acc, w);
          }
          return acc;
        }, 0);
        return addWeights(sum, recordVTotal);
      }, 0);
      
      const vWeight = Number(vTotal) || 0;
      if (vWeight > 0) {
        dayVarieties.push({ name: v.vname, weight: vWeight });
        dayTotal = addWeights(dayTotal, vTotal);
      }
    });

    if (dayTotal > 0) {
      dailyData.push({ 
        date: (date || '').split('-').slice(1).join('-'), 
        varieties: dayVarieties, 
        total: dayTotal 
      });
    }
  });

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 pb-8">
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" /> {t('stats.overview')}
        </h3>
        <div className="space-y-4">
          {varietyStock.map((s, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-700">{s.name}</span>
                <span className="text-slate-400">{formatWeight(s.current)} / {formatWeight(s.initial)}t</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${s.percent}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
              <div className="text-[10px] text-right text-emerald-600 font-bold">{safeToFixed(s.percent, 1)}% {t('stats.remaining')}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded-full" /> {t('stats.distribution')} (t)
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={destStats}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={0}
                dataKey="value"
                nameKey="name"
                labelLine={false}
                label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                  const RADIAN = Math.PI / 180;
                  // Reduced distance: roughly half of standard offset (std is often 20)
                  const radius = outerRadius + 8;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text 
                      x={x} 
                      y={y} 
                      fill="#64748b" 
                      textAnchor={x > cx ? 'start' : 'end'} 
                      dominantBaseline="central"
                      style={{ fontSize: '7px', fontWeight: 'bold' }}
                    >
                      {`${name} ${safeToFixed((percent || 0) * 100, 0)}%`}
                    </text>
                  );
                }}
              >
                {destStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${safeToFixed(value, 3)}t`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {destStats.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-slate-500 truncate">{d.fullName}:</span>
              <span className="font-bold text-slate-700">{safeToFixed(d.value, 3)}t</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-amber-500 rounded-full" /> {t('stats.daily')}
        </h3>
        <div className="space-y-4">
          {dailyData.map((row, i) => (
            <div key={i} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{row.date}</span>
                <span className="text-[11px] font-bold text-emerald-600">{t('stats.total')}: {safeToFixed(row.total, 3)}t</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {row.varieties.map((v, j) => (
                  <div key={j} className="text-[10px] flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-slate-500">{v.name}:</span>
                    <span className="font-bold text-slate-700">{safeToFixed(v.weight, 3)}t</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {dailyData.length === 0 && (
            <div className="text-center py-8 text-slate-400 italic text-xs font-medium">{t('batch.no_records')}</div>
          )}
        </div>
      </section>
    </div>
  );
}
