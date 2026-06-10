/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { cn, formatWeight, addWeights, safeToFixed } from '../lib/utils';
import { ShipmentState, OrderStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Calendar, ChevronRight, ClipboardList, BarChart4, Filter } from 'lucide-react';
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
import { useVarieties, useBatches, useSendingRecords, useDestinations, useOrders, useWarehouses } from '../lib/dataService';
import { useI18n } from '../lib/i18n';

type Language = 'zh' | 'uz' | 'en';

const dict: Record<string, Record<string, string>> = {
  orderStats: { zh: '订单统计', uz: 'Buyurtmalar statistikasi', en: 'Order Statistics' },
  deliveryStats: { zh: '发货统计', uz: 'Yuklash statistikasi', en: 'Shipment Statistics' },
  selectDateRange: { zh: '请选择开始和结束日期', uz: 'Boshlanish va tugash sanasini tanlang', en: 'Select Date Range' },
  startDate: { zh: '开始日期', uz: 'Boshlanish sanasi', en: 'Start Date' },
  endDate: { zh: '结束日期', uz: 'Tugash sanasi', en: 'End Date' },
  quickSelect: { zh: '快速选择', uz: 'Tezkor tanlash', en: 'Quick Select' },
  recent7Days: { zh: '最近7天', uz: 'Oxirgi 7 kun', en: '7 Days' },
  recent30Days: { zh: '最近30天', uz: 'Oxirgi 30 kun', en: '30 Days' },
  thisMonth: { zh: '本月', uz: 'Shu oy', en: 'This Month' },
  thisYear: { zh: '今年', uz: 'Shu yil', en: 'This Year' },
  paymentTotal: { zh: '收取货款总额', uz: 'Keltirilgan jami to\'lov', en: 'Collected Payments' },
  refundTotal: { zh: '退款总数', uz: 'Qaytarilgan jami mablag\'', en: 'Total Refunded' },
  uncompletedTotal: { zh: '未完成订单总数（不含已退款、已删除）', uz: 'Bajarilmagan buyurtmalar jami (bekor/o\'chganlarsiz)', en: 'Uncompleted Orders Total' },
  statusDistribution: { zh: '各状态订单总数', uz: 'Holat bo\'yicha buyurtmalar', en: 'Orders by Status' },
  allWarehouses: { zh: '全部仓库', uz: 'Barcha omborlar', en: 'All Warehouses' },
  currentWarehouse: { zh: '当前仓库', uz: 'Hozirgi ombor', en: 'Current Warehouse' },
  back: { zh: '返回', uz: 'Orqaga', en: 'Back' },
  filterRange: { zh: '统计日期范围', uz: 'Statistika sanasi diapazoni', en: 'Statistics Date Range' },
  confirm: { zh: '确定跳转', uz: 'Tasdiqlash', en: 'Confirm' },
  statsEntrance: { zh: '统计功能选择', uz: 'Statistika xizmatini tanlash', en: 'Select Service' },
  orderStatsDesc: { zh: '查看收取货款、退款及各状态订单分布情况', uz: 'To\'lovlar, bekor qilinganlar va buyurtma holatlarini ko\'rish', en: 'Check payments, refunds and status breakdown' },
  deliveryStatsDesc: { zh: '查看发货目的地分布及每日出入库历史统计', uz: 'Yuklash manzillari va kunlik tarixiy statistikani ko\'rish', en: 'Check destinations and daily shipment trends' },
  noFinancials: { zh: '所选区间没有货款记录', uz: 'Belgilangan davrda to\'lov yozuvlari yo\'q', en: 'No financial records in selected range' },
  noRefunds: { zh: '所选区间无退款记录', uz: 'Belgilangan davrda qaytarilgan mablag\'lar yo\'q', en: 'No refund records in selected range' },
  netTotal: { zh: '净收款（收取-退款）', uz: 'Netto tushum (Kirim-Qaytarish)', en: 'Net Collections (Received-Refunded)' },
  noNet: { zh: '所选区间没有净收款额', uz: 'Belgilangan davrda netto tushum yo\'q', en: 'No net collections in selected range' }
};

export default function StatisticsFragment() {
  const { t, lang } = useI18n();
  const currentLang = (lang || 'zh') as Language;

  const varieties = useVarieties();
  const batches = useBatches();
  const allRecords = useSendingRecords();
  const records = useMemo(() => {
    if (!allRecords) return [];
    return allRecords.filter(r => r.sstate === ShipmentState.COMPLETED && (r.soid === undefined || r.soid === null || r.soid >= 0));
  }, [allRecords]);
  const destinations = useDestinations();
  const orders = useOrders(true); // Include logically deleted to list all statuses cleanly
  const warehouses = useWarehouses();

  // Selected warehouse from local storage or 'all'
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(() => localStorage.getItem('current_warehouse_id') || 'all');
  
  useEffect(() => {
    const handleChanged = () => {
      setSelectedWarehouseId(localStorage.getItem('current_warehouse_id') || 'all');
    };
    window.addEventListener('warehouse_changed', handleChanged);
    return () => window.removeEventListener('warehouse_changed', handleChanged);
  }, []);

  const getLabel = (key: string) => {
    return dict[key]?.[currentLang] || dict[key]?.zh || key;
  };

  // Sub-navigation view state
  const [subView, setSubView] = useState<'main' | 'order_stats' | 'delivery_stats'>('main');
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [pendingSubView, setPendingSubView] = useState<'order_stats' | 'delivery_stats' | null>(null);

  // Default dates
  const [startDate, setStartDate] = useState(() => {
    const base = new Date();
    // Default to the first day of current month
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const m = String(start.getMonth() + 1).padStart(2, '0');
    const d = String(start.getDate()).padStart(2, '0');
    return `${start.getFullYear()}-${m}-${d}`;
  });

  const [endDate, setEndDate] = useState(() => {
    const base = new Date();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    return `${base.getFullYear()}-${m}-${d}`;
  });

  // Calculate dynamic presets relative to today
  const getQuickDates = (type: '7d' | '30d' | 'month' | 'year') => {
    const baseDate = new Date();
    const format = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    const endStr = format(baseDate);
    let startStr = endStr;
    
    if (type === '7d') {
      const start = new Date(baseDate);
      start.setDate(baseDate.getDate() - 6);
      startStr = format(start);
    } else if (type === '30d') {
      const start = new Date(baseDate);
      start.setDate(baseDate.getDate() - 29);
      startStr = format(start);
    } else if (type === 'month') {
      const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      startStr = format(start);
    } else if (type === 'year') {
      const start = new Date(baseDate.getFullYear(), 0, 1);
      startStr = format(start);
    }
    
    return { start: startStr, end: endStr };
  };

  // Convert dots in status dates YYYY.MM.DD or standard ISO to dashed format for robust comparisons
  const normalizeDateStr = (dateStr: string): string => {
    if (!dateStr) return '';
    
    let clean = dateStr;
    // Handle "1-2026.05.22,2-2026.06.01" style format
    if (/^\d-/.test(dateStr)) {
      const records = dateStr.split(',');
      const firstRecord = records.find(r => r.startsWith('1-'));
      if (firstRecord) {
        clean = firstRecord.split('-')[1];
      } else {
        clean = records[0].split('-')[1] || '';
      }
    }
    
    clean = clean.split('T')[0];
    return clean.replace(/\./g, '-');
  };

  const currentWarehouseName = useMemo(() => {
    if (selectedWarehouseId === 'all') {
      return getLabel('allWarehouses');
    }
    const w = warehouses?.find(wh => wh.wid === parseInt(selectedWarehouseId));
    if (!w) return `${t('batch.label') || '仓库'} ${selectedWarehouseId}`;
    const destName = destinations?.find(d => d.did === w.wlocation)?.dname || '';
    return `${destName} • ${w.wname}`;
  }, [warehouses, destinations, selectedWarehouseId, currentLang]);

  // 1. Variety Stock (filtered by current warehouse selection)
  const filteredBatches = useMemo(() => {
    if (!batches) return [];
    if (selectedWarehouseId === 'all') return batches;
    return batches.filter(b => (b.bware !== undefined && b.bware !== null ? b.bware : -1) === parseInt(selectedWarehouseId));
  }, [batches, selectedWarehouseId]);

  const varietyStock = useMemo(() => {
    if (!varieties || !filteredBatches) return [];
    return varieties.map(v => {
      const vBatches = filteredBatches.filter(b => b.bvid === v.vid);
      const initial = vBatches.reduce((sum, b) => addWeights(sum, b.bowei), 0);
      const current = vBatches.reduce((sum, b) => addWeights(sum, b.bcwei), 0);
      const percent = initial > 0 ? (current / initial) * 100 : 0;
      return { name: v.vname, initial, current, percent };
    });
  }, [varieties, filteredBatches]);

  // DELIVERY SUB-VIEW CALCS (filtered by both completed shipments, selected warehouse and date range)
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records.filter(r => {
      if (selectedWarehouseId !== 'all') {
        if ((r.sware !== undefined && r.sware !== null ? r.sware : -1) !== parseInt(selectedWarehouseId)) {
          return false;
        }
      }
      const norm = normalizeDateStr(r.sdate);
      return norm >= startDate && norm <= endDate;
    });
  }, [records, startDate, endDate, selectedWarehouseId]);

  const destStats = useMemo(() => {
    if (!destinations || !filteredRecords) return [];
    return destinations.map(d => {
      const dRecords = filteredRecords.filter(r => Number(r.sdest) === Number(d.did));
      const total = dRecords.reduce((sum, r) => {
        const info = r.sainfo || '';
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
  }, [destinations, filteredRecords]);

  const dailyData = useMemo(() => {
    if (!varieties || !batches || !filteredRecords) return [];
    const dailyList: any[] = [];
    const dates = Array.from(new Set(filteredRecords.map(r => r.sdate))).sort().reverse();
    
    dates.forEach(date => {
      const dayRecords = filteredRecords.filter(r => r.sdate === date);
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
        dailyList.push({ 
          date: (date || '').split('-').slice(1).join('-'), 
          varieties: dayVarieties, 
          total: dayTotal 
        });
      }
    });
    return dailyList;
  }, [varieties, batches, filteredRecords]);

  // ORDER SUB-VIEW CALCS (filtered by date range)
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      const norm = normalizeDateStr(o.ocdate);
      return norm >= startDate && norm <= endDate;
    });
  }, [orders, startDate, endDate]);

  const financials = useMemo(() => {
    const collected: Record<number, number> = {};
    const refunds: Record<number, number> = {};
    const net: Record<number, number> = {};
    
    filteredOrders.forEach(o => {
      const collectedAmt = parseFloat(o.oarp || '0');
      if (!isNaN(collectedAmt) && collectedAmt > 0) {
        const c = o.oarpc || 1;
        collected[c] = (collected[c] || 0) + collectedAmt;
        net[c] = (net[c] || 0) + collectedAmt;
      }
      
      const refundAmt = parseFloat(o.orf || '0');
      if (!isNaN(refundAmt) && refundAmt > 0) {
        const c = o.orfc || 1;
        refunds[c] = (refunds[c] || 0) + refundAmt;
        net[c] = (net[c] || 0) - refundAmt;
      }
    });

    Object.keys(net).forEach(k => {
      const curKey = parseInt(k);
      if (net[curKey] === 0) {
        delete net[curKey];
      }
    });
    
    return { collected, refunds, net };
  }, [filteredOrders]);

  const uncompletedCount = useMemo(() => {
    return filteredOrders.filter(o => 
      o.status !== OrderStatus.COMPLETED && 
      o.status !== OrderStatus.REFUNDED && 
      o.status !== OrderStatus.DELETED
    ).length;
  }, [filteredOrders]);

  const statusCounts = useMemo(() => {
    const counts: Record<number, number> = {
      [OrderStatus.DELETED]: 0,
      [OrderStatus.INTENTIONAL]: 0,
      [OrderStatus.SIGNED]: 0,
      [OrderStatus.DEPOSIT_PAID]: 0,
      [OrderStatus.FULL_PAID]: 0,
      [OrderStatus.COMPLETED]: 0,
      [OrderStatus.REFUNDED]: 0,
    };
    filteredOrders.forEach(o => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      } else {
        counts[o.status] = 1;
      }
    });
    return counts;
  }, [filteredOrders]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const currencyLabels: Record<number, string> = {
    1: 'UZS',
    2: 'USD',
    3: 'CNY'
  };

  if (!varieties || !batches || !records || !destinations) return null;

  // RENDER DYNAMIC DATE PICKER MODAL
  const renderDatePickerModal = () => (
    <AnimatePresence>
      {showDatePickerModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <Calendar size={16} className="text-emerald-500" />
                {getLabel('selectDateRange')}
              </span>
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {pendingSubView === 'order_stats' ? getLabel('orderStats') : getLabel('deliveryStats')}
              </span>
            </div>
            
            {/* Content */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{getLabel('startDate')}</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{getLabel('endDate')}</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{getLabel('quickSelect')}</label>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <button
                    onClick={() => {
                      const { start, end } = getQuickDates('7d');
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    className="py-2 px-3 border border-slate-100 hover:border-emerald-100 text-slate-600 font-bold rounded-lg hover:bg-emerald-50/20 transition-all text-left flex justify-between items-center cursor-pointer"
                  >
                    <span>{getLabel('recent7Days')}</span>
                    <span className="text-[8px] tracking-tight bg-slate-100 px-1 py-0.5 rounded text-slate-400">7D</span>
                  </button>
                  <button
                    onClick={() => {
                      const { start, end } = getQuickDates('30d');
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    className="py-2 px-3 border border-slate-100 hover:border-emerald-100 text-slate-600 font-bold rounded-lg hover:bg-emerald-50/20 transition-all text-left flex justify-between items-center cursor-pointer"
                  >
                    <span>{getLabel('recent30Days')}</span>
                    <span className="text-[8px] tracking-tight bg-slate-100 px-1 py-0.5 rounded text-slate-400">30D</span>
                  </button>
                  <button
                    onClick={() => {
                      const { start, end } = getQuickDates('month');
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    className="py-2 px-3 border border-slate-100 hover:border-emerald-100 text-slate-600 font-bold rounded-lg hover:bg-emerald-50/20 transition-all text-left flex justify-between items-center cursor-pointer"
                  >
                    <span>{getLabel('thisMonth')}</span>
                    <span className="text-[8px] tracking-tight bg-slate-100 px-1 py-0.5 rounded text-slate-400">MONTH</span>
                  </button>
                  <button
                    onClick={() => {
                      const { start, end } = getQuickDates('year');
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    className="py-2 px-3 border border-slate-100 hover:border-emerald-100 text-slate-600 font-bold rounded-lg hover:bg-emerald-50/20 transition-all text-left flex justify-between items-center cursor-pointer"
                  >
                    <span>{getLabel('thisYear')}</span>
                    <span className="text-[8px] tracking-tight bg-slate-100 px-1 py-0.5 rounded text-slate-400">YEAR</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDatePickerModal(false);
                  setPendingSubView(null);
                }}
                className="px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {t('action.cancel') || '取消'}
              </button>
              <button
                onClick={() => {
                  if (pendingSubView) {
                    setSubView(pendingSubView);
                  }
                  setShowDatePickerModal(false);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-colors cursor-pointer"
              >
                {getLabel('confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // VIEW: DELIVERY STATISTICS
  if (subView === 'delivery_stats') {
    return (
      <div className="space-y-6 pb-24 font-sans">
        {/* Navigation Bar */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-fade-in">
          <button
            onClick={() => setSubView('main')}
            className="w-9 h-9 border border-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-black text-slate-800">{getLabel('deliveryStats')}</h3>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={10} className="text-emerald-500" />
              {startDate} ~ {endDate}
            </p>
          </div>
          <button
            onClick={() => {
              setPendingSubView('delivery_stats');
              setShowDatePickerModal(true);
            }}
            className="text-[9px] font-bold border border-slate-100 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-emerald-600 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Filter size={10} />
            <span>{t('batch.filter') || '筛选'}</span>
          </button>
        </div>

        {/* 1. Destination Delivery Distribution */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" /> {t('stats.distribution')} (t)
          </h3>
          {destStats.length > 0 ? (
            <>
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
            </>
          ) : (
            <div className="text-center py-10 text-slate-400 italic text-xs font-medium">
              {lang === 'zh' ? '所选日期区间无发货分布数据' : 'Sana oralig\'ida yuklash zaxirasi yo\'q'}
            </div>
          )}
        </section>

        {/* 2. Daily Shipment Statistics */}
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

        {renderDatePickerModal()}
      </div>
    );
  }

  // VIEW: ORDER STATISTICS
  if (subView === 'order_stats') {
    return (
      <div className="space-y-6 pb-24 font-sans">
        {/* Navigation Bar */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <button
            onClick={() => setSubView('main')}
            className="w-9 h-9 border border-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-black text-slate-800">{getLabel('orderStats')}</h3>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={10} className="text-emerald-500" />
              {startDate} ~ {endDate}
            </p>
          </div>
          <button
            onClick={() => {
              setPendingSubView('order_stats');
              setShowDatePickerModal(true);
            }}
            className="text-[9px] font-bold border border-slate-100 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-emerald-600 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Filter size={10} />
            <span>{t('batch.filter') || '筛选'}</span>
          </button>
        </div>

        {/* 1. Received & Refunded sums by currency */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" /> {lang === 'zh' ? '财务收支汇总' : 'Moliyaviy hisobot'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Payment Collected */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {getLabel('paymentTotal')}
              </span>
              <div className="space-y-1.5">
                {Object.keys(financials.collected).length > 0 ? (
                  Object.entries(financials.collected).map(([cur, amount]) => (
                    <div key={cur} className="bg-emerald-50/40 border border-emerald-100/30 p-2 rounded-xl">
                      <div className="text-[9px] text-emerald-600 font-bold uppercase">
                        {currencyLabels[parseInt(cur)] || 'UZS'}
                      </div>
                      <div className="text-xs font-black text-slate-700 tracking-tight mt-0.5">
                        {amount.toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400 italic">
                    {getLabel('noFinancials')}
                  </div>
                )}
              </div>
            </div>

            {/* Refunds */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {getLabel('refundTotal')}
              </span>
              <div className="space-y-1.5">
                {Object.keys(financials.refunds).length > 0 ? (
                  Object.entries(financials.refunds).map(([cur, amount]) => (
                    <div key={cur} className="bg-rose-50/40 border border-rose-100/30 p-2 rounded-xl">
                      <div className="text-[9px] text-rose-500 font-bold uppercase">
                        {currencyLabels[parseInt(cur)] || 'UZS'}
                      </div>
                      <div className="text-xs font-black text-rose-600 tracking-tight mt-0.5">
                        -{amount.toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400 italic">
                    {getLabel('noRefunds')}
                  </div>
                )}
              </div>
            </div>

            {/* Net Collections */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {getLabel('netTotal')}
              </span>
              <div className="space-y-1.5">
                {Object.keys(financials.net).length > 0 ? (
                  Object.entries(financials.net).map(([cur, amount]) => (
                    <div key={cur} className="bg-blue-50/40 border border-blue-100/30 p-2 rounded-xl">
                      <div className="text-[9px] text-blue-600 font-bold uppercase">
                        {currencyLabels[parseInt(cur)] || 'UZS'}
                      </div>
                      <div className="text-xs font-black text-slate-700 tracking-tight mt-0.5">
                        {amount > 0 ? '+' : ''}{amount.toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400 italic">
                    {getLabel('noNet')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Uncompleted Orders Box */}
        <section className="bg-slate-950 text-white p-4 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl" />
          <div className="relative z-10 flex justify-between items-center">
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider">
                {lang === 'zh' ? '未完成订单总数' : 'Bajarilmagan buyurtmalar jami'}
              </h4>
              <p className="text-[9.5px] text-slate-400 pr-4">
                {getLabel('uncompletedTotal')}
              </p>
            </div>
            <div className="text-3xl font-black text-emerald-400 bg-white/5 py-1.5 px-4 rounded-2xl border border-white/10 shrink-0 select-none">
              {uncompletedCount}
            </div>
          </div>
        </section>

        {/* 3. Orders status distribution breakdown */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 border-b border-indigo-50 pb-2">
            <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
            {getLabel('statusDistribution')}
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: OrderStatus.INTENTIONAL, color: 'bg-blue-50/60 border-blue-100/40 text-blue-600', dot: 'bg-blue-500', name: t('status.intentional') || '有意愿' },
              { id: OrderStatus.SIGNED, color: 'bg-indigo-50/60 border-indigo-100/40 text-indigo-600', dot: 'bg-indigo-500', name: t('status.signed') || '已签约' },
              { id: OrderStatus.DEPOSIT_PAID, color: 'bg-amber-50/60 border-amber-100/40 text-amber-600', dot: 'bg-amber-500', name: t('status.deposit_paid') || '已付定金' },
              { id: OrderStatus.FULL_PAID, color: 'bg-emerald-50/60 border-emerald-100/40 text-emerald-600', dot: 'bg-emerald-500', name: t('status.full_paid') || '已付全款' },
              { id: OrderStatus.COMPLETED, color: 'bg-green-50/60 border-green-100/40 text-green-600', dot: 'bg-green-500', name: t('status.completed') || '已完成' },
              { id: OrderStatus.REFUNDED, color: 'bg-rose-50/60 border-rose-100/40 text-rose-600', dot: 'bg-rose-500', name: t('status.refunded') || '已退款' },
              { id: OrderStatus.DELETED, color: 'bg-slate-50 border-slate-100 text-slate-500', dot: 'bg-slate-400', name: t('status.deleted') || '已删除' },
            ].map(s => {
              const count = statusCounts[s.id] || 0;
              return (
                <div key={s.id} className={cn("p-2.5 rounded-xl border flex justify-between items-center transition-all", s.color)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
                    <span className="text-[10px] font-bold truncate">{s.name}</span>
                  </div>
                  <span className="text-[11px] font-black tracking-tight">{count}</span>
                </div>
              );
            })}
          </div>
        </section>

        {renderDatePickerModal()}
      </div>
    );
  }

  // DEFAULT VIEW: STATISTICS HOME (STOCK BY ACTIVE WAREHOUSE + NAV ENTRANCES)
  return (
    <div className="space-y-6 pb-24 font-sans">
      {/* 1. Variety Stock Overview (limited specifically to selected warehouse) */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" /> 
            {t('stats.overview')}
          </span>
          <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded truncate max-w-[180px]">
            {currentWarehouseName}
          </span>
        </h3>
        {varietyStock.length > 0 ? (
          <div className="space-y-4">
            {varietyStock.map((s, i) => (
              <div key={i} className="space-y-1 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700">{s.name}</span>
                  <span className="text-slate-400 font-medium">{formatWeight(s.current)} / {formatWeight(s.initial)}t</span>
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
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            {currentLang === 'zh' ? '所选载体仓库下没有物料批次信息' : 'Ushbu omborda partiyalar topilmadi'}
          </div>
        )}
      </section>

      {/* 2. Sub-views entrances selection grid */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1">
          <div className="w-1 h-4 bg-indigo-500 rounded-full" /> {getLabel('statsEntrance')}
        </h3>
        
        {/* Order Statistics Entrance */}
        <button
          onClick={() => {
            setPendingSubView('order_stats');
            setShowDatePickerModal(true);
          }}
          className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50/50 transition-all flex items-center gap-4 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ClipboardList size={22} />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              {getLabel('orderStats')} 
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{getLabel('orderStatsDesc')}</p>
          </div>
        </button>

        {/* Delivery Statistics Entrance */}
        <button
          onClick={() => {
            setPendingSubView('delivery_stats');
            setShowDatePickerModal(true);
          }}
          className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-emerald-100 hover:bg-slate-50/50 transition-all flex items-center gap-4 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <BarChart4 size={22} />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              {getLabel('deliveryStats')} 
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{getLabel('deliveryStatsDesc')}</p>
          </div>
        </button>
      </section>

      {renderDatePickerModal()}
    </div>
  );
}
