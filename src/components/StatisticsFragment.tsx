/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatWeight } from '../lib/utils';
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

export default function StatisticsFragment() {
  const varieties = useLiveQuery(() => db.tab_variaty.toArray());
  const batches = useLiveQuery(() => db.tab_batch.toArray());
  const records = useLiveQuery(() => db.tab_sending_record.where('sstate').equals(ShipmentState.COMPLETED).toArray());
  const destinations = useLiveQuery(() => db.tab_destination.toArray());

  if (!varieties || !batches || !records || !destinations) return null;

  // Helper for precise decimal addition to avoid float issues
  const addWeights = (a: number, b: number) => (Math.round(a * 1000) + Math.round(b * 1000)) / 1000;

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
    // Use loose equality or Number conversion to handle potential type mismatches
    const dRecords = records.filter(r => Number(r.sdest) === Number(d.did));
    const total = dRecords.reduce((sum, r) => {
      if (!r.sainfo) return sum;
      // Split and clean each item before parsing
      const recordTotal = r.sainfo.split(',').reduce((acc, s) => {
        const parts = s.trim().split('/');
        if (parts.length < 2) return acc;
        const w = parseFloat(parts[1]);
        return isNaN(w) ? acc : addWeights(acc, w);
      }, 0);
      return addWeights(sum, recordTotal);
    }, 0);
    return { name: d.dname.split('/')[0], value: total };
  }).filter(d => d.value > 0);

  // 3. Daily Stats
  const dailyData: any[] = [];
  const dates = Array.from(new Set(records.map(r => r.sdate))).sort();
  
  dates.forEach(date => {
    const dayRecords = records.filter(r => r.sdate === date);
    const row: any = { date: date.split('-').slice(1).join('-') };
    let dayTotal = 0;
    
    varieties.forEach(v => {
      const vTotal = dayRecords.reduce((sum, r) => {
        if (!r.sainfo) return sum;
        const recordVTotal = r.sainfo.split(',').reduce((acc, s) => {
          const parts = s.split('/');
          if (parts.length < 2) return acc;
          const [bid, weight] = parts;
          const batch = batches.find(b => b.bid === parseInt(bid));
          const w = parseFloat(weight);
          if (batch?.bvid === v.vid && !isNaN(w)) {
            return addWeights(acc, w);
          }
          return acc;
        }, 0);
        return addWeights(sum, recordVTotal);
      }, 0);
      row[v.vname] = vTotal;
      dayTotal = addWeights(dayTotal, vTotal);
    });
    row.total = dayTotal;
    dailyData.push(row);
  });

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 pb-8">
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" /> 品种库存概览
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
              <div className="text-[10px] text-right text-emerald-600 font-bold">{s.percent.toFixed(1)}% 剩余</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded-full" /> 目的地发货分布 (吨)
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
                      {`${name} ${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {destStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toFixed(3)}t`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {destStats.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-slate-500 truncate">{d.name}:</span>
              <span className="font-bold text-slate-700">{d.value.toFixed(3)}t</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-amber-500 rounded-full" /> 每日发货统计
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-slate-400 border-b border-slate-50">
                <th className="text-left py-2 font-bold">日期</th>
                {varieties.map(v => (
                  <th key={v.vid} className="text-right py-2 font-bold">{v.vname}</th>
                ))}
                <th className="text-right py-2 font-bold text-slate-700">总计</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dailyData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 text-slate-500 font-medium">{row.date}</td>
                  {varieties.map(v => (
                    <td key={v.vid} className="text-right py-2 text-slate-600">
                      {row[v.vname] > 0 ? row[v.vname].toFixed(3) : '-'}
                    </td>
                  ))}
                  <td className="text-right py-2 font-bold text-emerald-600">
                    {row.total.toFixed(3)}t
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dailyData.length === 0 && (
            <div className="text-center py-8 text-slate-400 italic text-xs">暂无发货记录</div>
          )}
        </div>
      </section>
    </div>
  );
}
