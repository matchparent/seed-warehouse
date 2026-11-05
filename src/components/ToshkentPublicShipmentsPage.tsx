/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Calendar, 
  Phone, 
  MapPin, 
  FileText, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2,
  PackageCheck,
  Building2,
  Globe,
  Layers
} from 'lucide-react';
import { cn, safeToFixed, formatDate } from '../lib/utils';
import { ShipmentState, SendingRecord, Variety, Destination, Order, Warehouse, Batch } from '../types';
import { dataService, PublicToshkentData } from '../lib/dataService';
import { useI18n, Language } from '../lib/i18n';

export default function ToshkentPublicShipmentsPage() {
  const { lang, setLang, t } = useI18n();
  const [data, setData] = useState<PublicToshkentData>({
    records: [],
    varieties: [],
    destinations: [],
    orders: [],
    warehouses: [],
    batches: []
  });
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'uz-UZ', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [lang]);

  // Calculate local client today and tomorrow
  const { todayStr, tomorrowStr } = useMemo(() => {
    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const now = new Date();
    const today = formatYMD(now);
    const tmr = new Date(now);
    tmr.setDate(tmr.getDate() + 1);
    const tomorrow = formatYMD(tmr);
    return { todayStr: today, tomorrowStr: tomorrow };
  }, []);

  const loadShipments = async () => {
    try {
      const res = await dataService.getPublicToshkentShipments(todayStr);
      setData(res);
      setLastRefreshed(new Date().toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'uz-UZ', { hour12: false }));
    } catch (e) {
      console.error('Failed to load public toshkent shipments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
    // Auto-sync polling every 15 seconds for live board display
    const interval = setInterval(loadShipments, 15000);
    return () => clearInterval(interval);
  }, [todayStr]);

  // Warehouse lookup
  const toshkentWarehouseIds = useMemo(() => {
    const ids = new Set<number>([-1, 1]);
    data.warehouses.forEach(w => {
      const wid = Number(w.wid);
      const loc = Number(w.wlocation);
      const name = (w.wname || '').toLowerCase();
      if (wid === -1 || loc === 1 || name.includes('toshkent') || name.includes('塔什干')) {
        ids.add(wid);
      }
    });
    return ids;
  }, [data.warehouses]);

  // Target valid dates
  const effectiveDates = useMemo(() => {
    const s = new Set<string>([todayStr, tomorrowStr]);
    if (data.serverToday) s.add(data.serverToday);
    if (data.serverTomorrow) s.add(data.serverTomorrow);
    return s;
  }, [todayStr, tomorrowStr, data.serverToday, data.serverTomorrow]);

  // Strictly filter: Toshkent warehouse, uncompleted, today & tomorrow
  const pendingRecords = useMemo(() => {
    return data.records.filter(r => {
      // 1. Must be uncompleted (not COMPLETED=3, not WITHDRAWN=4)
      if (r.sstate === ShipmentState.COMPLETED || r.sstate === ShipmentState.WITHDRAWN) {
        return false;
      }
      // 2. Must be Toshkent warehouse
      const sw = r.sware;
      const isToshkent = sw === undefined || sw === null || sw === -1 || sw === 1 || toshkentWarehouseIds.has(Number(sw));
      if (!isToshkent) return false;

      // 3. Must match today or tomorrow
      const d = (r.sdate || '').replace(/\./g, '-').slice(0, 10);
      return effectiveDates.has(d);
    });
  }, [data.records, toshkentWarehouseIds, effectiveDates]);

  // Group into today and tomorrow
  const { todayList, tomorrowList, otherList } = useMemo(() => {
    const todayL: SendingRecord[] = [];
    const tomorrowL: SendingRecord[] = [];
    const otherL: SendingRecord[] = [];

    pendingRecords.forEach(r => {
      const d = (r.sdate || '').replace(/\./g, '-').slice(0, 10);
      if (d === todayStr || (data.serverToday && d === data.serverToday)) {
        todayL.push(r);
      } else if (d === tomorrowStr || (data.serverTomorrow && d === data.serverTomorrow)) {
        tomorrowL.push(r);
      } else {
        otherL.push(r);
      }
    });

    return { todayList: todayL, tomorrowList: tomorrowL, otherList: otherL };
  }, [pendingRecords, todayStr, tomorrowStr, data.serverToday, data.serverTomorrow]);

  // Calculate totals
  const parseItems = (info: string, type: 'variety' | 'batch') => {
    if (!info) return [];
    return info.split(',').map(item => {
      const [id, weight] = item.split('/');
      const name = type === 'variety' 
        ? data.varieties.find(v => v.vid === parseInt(id))?.vname 
        : data.batches.find(b => b.bid === parseInt(id))?.bname;
      return { 
        name: name || `${t('form.variety') || '品种'} #${id}`, 
        weight: Number(weight) || 0 
      };
    });
  };

  const calculateTotalTonnage = (records: SendingRecord[]) => {
    let sum = 0;
    records.forEach(r => {
      const items = parseItems(r.spinfo, 'variety');
      items.forEach(it => {
        sum += it.weight;
      });
    });
    return sum;
  };

  const todayTonnage = useMemo(() => calculateTotalTonnage(todayList), [todayList]);
  const tomorrowTonnage = useMemo(() => calculateTotalTonnage(tomorrowList), [tomorrowList]);
  const totalTonnage = useMemo(() => calculateTotalTonnage(pendingRecords), [pendingRecords]);

  const getStateBadge = (state: ShipmentState) => {
    if (state === ShipmentState.ALLOCATED) {
      return {
        label: t('toshkent.status_allocated'),
        subLabel: 'Allocated / Awaiting Inspection',
        badgeClass: 'bg-amber-500 text-white shadow-sm'
      };
    }
    return {
      label: t('toshkent.status_new'),
      subLabel: 'Pending Allocation',
      badgeClass: 'bg-blue-600 text-white shadow-sm'
    };
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16 font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
              <Truck size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-1.5">
                  <span>塔什干仓库发货公示看板</span>
                  <span className="hidden sm:inline text-xs font-normal text-emerald-400">/ Toshkent Ombori</span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Building2 size={12} className="text-emerald-400 shrink-0" />
                <span>Sino-Uzbek Logistic (Toshkent)</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-medium">{t('toshkent.live_refresh')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Time */}
            <div className="hidden sm:flex flex-col items-end text-right px-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{currentTime || '--:--:--'}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {todayStr}
              </div>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[11px]">
              {(['zh', 'uz', 'en'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "px-2 py-1 rounded font-bold uppercase transition-colors",
                    lang === l ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Notice & Rule Banner (Strictly Read-Only) */}
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3.5 flex items-start gap-3 shadow-sm text-amber-900">
          <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <div className="font-bold flex items-center gap-2">
              <span>{t('toshkent.readonly_notice')}</span>
            </div>
            <p className="text-amber-700 text-[11px] mt-0.5">
              此页面为塔什干仓库专属发货公示看板，面向司机、客户与仓库现场工作人员。仅展示<strong>当天 ({todayStr})</strong> 与 <strong>明天 ({tomorrowStr})</strong> 处于待配货或待发车状态的未完成记录。
            </p>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500">{t('toshkent.today')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <div>
                <span className="text-xl sm:text-3xl font-black font-mono text-emerald-600">{todayList.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 ml-1">车</span>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-black font-mono text-slate-700">{safeToFixed(todayTonnage, 2)}</span>
                <span className="text-[10px] text-slate-400 ml-0.5">t</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">{todayStr}</div>
          </div>

          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500">{t('toshkent.tomorrow')}</span>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <div>
                <span className="text-xl sm:text-3xl font-black font-mono text-blue-600">{tomorrowList.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 ml-1">车</span>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-black font-mono text-slate-700">{safeToFixed(tomorrowTonnage, 2)}</span>
                <span className="text-[10px] text-slate-400 ml-0.5">t</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">{tomorrowStr}</div>
          </div>

          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500">{t('toshkent.total_trucks')}</span>
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <div>
                <span className="text-xl sm:text-3xl font-black font-mono text-slate-900">{pendingRecords.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 ml-1">车</span>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-black font-mono text-emerald-600">{safeToFixed(totalTonnage, 2)}</span>
                <span className="text-[10px] text-slate-400 ml-0.5">t</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{t('toshkent.total_tonnage')}</div>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
            <div className="text-sm font-bold text-slate-700">正在获取塔什干发货数据...</div>
            <div className="text-xs text-slate-400 mt-1">Connecting to Toshkent warehouse dispatch stream</div>
          </div>
        )}

        {/* Section 1: Today's Dispatches */}
        {!loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                <h2 className="text-sm sm:text-base font-black text-slate-800">
                  {t('toshkent.today')} ({todayStr})
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2 py-0.5 rounded-full">
                  {todayList.length} 辆车
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600">
                合计: {safeToFixed(todayTonnage, 3)} t
              </span>
            </div>

            {todayList.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-slate-200">
                <CheckCircle2 size={28} className="mx-auto text-emerald-400 mb-2 opacity-60" />
                <p className="text-xs font-bold text-slate-500">今日暂无待发车任务</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Bugun uchun kutilayotgan jo'natishlar yo'q</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {todayList.map(record => (
                  <PublicShipmentCard 
                    key={record.sid} 
                    record={record} 
                    data={data}
                    parseItems={parseItems}
                    getStateBadge={getStateBadge}
                    t={t}
                    dateCategory="today"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 2: Tomorrow's Dispatches */}
        {!loading && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                <h2 className="text-sm sm:text-base font-black text-slate-800">
                  {t('toshkent.tomorrow')} ({tomorrowStr})
                </h2>
                <span className="bg-blue-100 text-blue-800 text-[11px] font-black px-2 py-0.5 rounded-full">
                  {tomorrowList.length} 辆车
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600">
                合计: {safeToFixed(tomorrowTonnage, 3)} t
              </span>
            </div>

            {tomorrowList.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-slate-200">
                <Calendar size={28} className="mx-auto text-blue-400 mb-2 opacity-60" />
                <p className="text-xs font-bold text-slate-500">明日暂无待发车任务</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Ertaga uchun kutilayotgan jo'natishlar yo'q</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {tomorrowList.map(record => (
                  <PublicShipmentCard 
                    key={record.sid} 
                    record={record} 
                    data={data}
                    parseItems={parseItems}
                    getStateBadge={getStateBadge}
                    t={t}
                    dateCategory="tomorrow"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <footer className="pt-6 text-center text-[11px] text-slate-400 space-y-1">
          <div>塔什干发货看板 · 数据实时联动 · 只读公示视图</div>
          {lastRefreshed && (
            <div className="text-[10px] text-slate-400">
              最后自动更新时间：{lastRefreshed}
            </div>
          )}
        </footer>
      </main>
    </div>
  );
}

// Single Public Shipment Card (Strictly Read-Only, No Action, No Filter)
interface PublicShipmentCardProps {
  record: SendingRecord;
  data: PublicToshkentData;
  parseItems: (info: string, type: 'variety' | 'batch') => { name: string; weight: number }[];
  getStateBadge: (state: ShipmentState) => { label: string; subLabel: string; badgeClass: string };
  t: (key: string) => string;
  dateCategory: 'today' | 'tomorrow' | 'other';
}

function PublicShipmentCard({ record, data, parseItems, getStateBadge, t, dateCategory }: PublicShipmentCardProps) {
  const stateInfo = getStateBadge(record.sstate);
  const plannedItems = parseItems(record.spinfo, 'variety');
  const totalWeight = plannedItems.reduce((acc, it) => acc + it.weight, 0);

  // Check destination or transfer
  const isTransfer = Boolean(record.soid && record.soid < 0);
  const targetWarehouse = isTransfer 
    ? data.warehouses.find(w => w.wid === record.soid || w.wid === -Math.abs(record.soid!) || w.wid === Math.abs(record.soid!))
    : null;

  const order = !isTransfer && record.soid && record.soid > 0 
    ? data.orders.find(o => o.oid === record.soid)
    : null;

  const destName = data.destinations.find(d => d.did === record.sdest)?.dname || '塔什干/Toshkent';

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3 relative overflow-hidden transition-shadow hover:shadow-md">
      {/* Date ribbon on top-right */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-400">#{record.sid}</span>
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-bold uppercase", stateInfo.badgeClass)}>
            {stateInfo.label}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
            <Calendar size={11} className="text-slate-400" />
            <span>{record.sdate}</span>
          </span>
        </div>

        {/* Category Pill */}
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-md",
          dateCategory === 'today' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"
        )}>
          {dateCategory === 'today' ? '今日发车' : '明日发车'}
        </span>
      </div>

      {/* Truck plate and driver */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Truck size={18} />
          </div>
          <div>
            <div className="text-sm font-black font-mono text-slate-900 tracking-wide">
              {record.splate || '待录入车牌'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">运输车辆号牌 / Mashina raqami</div>
          </div>
        </div>

        {record.sdrpn ? (
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            <Phone size={13} className="text-emerald-600" />
            <span>{record.sdrpn}</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 italic">未留司机电话</span>
        )}
      </div>

      {/* Destination / Order subject */}
      <div className="text-xs">
        {isTransfer ? (
          <div className="bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-xl text-amber-900 flex items-start gap-2">
            <MapPin size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>跨仓转运至:</span>
                <span className="text-amber-800 underline decoration-amber-300 font-black">
                  {targetWarehouse ? targetWarehouse.wname : `仓网点 #${record.soid}`}
                </span>
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">
                目的地网点城市：{destName}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-slate-800 flex items-start gap-2">
            <MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold flex items-center gap-2 flex-wrap">
                <span className="text-slate-500">目的地:</span>
                <span className="text-emerald-800 font-black">{destName}</span>
                {order && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">客户/订单主体:</span>
                    <span className="text-slate-900 font-bold">{order.ocname || '-'}</span>
                  </>
                )}
              </div>
              {order?.ocphone && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Phone size={11} className="text-slate-400" />
                  <span>客户联系方式: {order.ocphone}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Goods & Tonnage Details */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-500 flex items-center gap-1">
            <PackageCheck size={13} className="text-slate-400" />
            <span>装载品种明细 / Yuklangan navlar</span>
          </span>
          <span className="font-mono font-bold text-slate-700">
            本车总重: <strong className="text-emerald-600 font-black text-sm">{safeToFixed(totalWeight, 3)}</strong> t
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {plannedItems.map((item, idx) => (
            <div key={idx} className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/70 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 truncate mr-2">{item.name}</span>
              <span className="font-mono font-black text-emerald-600 shrink-0">{safeToFixed(item.weight, 3)} t</span>
            </div>
          ))}
        </div>
      </div>

      {/* Memo / Notes if present */}
      {record.smemo && (
        <div className="text-[11px] text-slate-500 bg-amber-50/40 border border-amber-100 p-2 rounded-lg flex items-start gap-1.5">
          <FileText size={13} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="line-clamp-2">{record.smemo}</p>
        </div>
      )}
    </div>
  );
}
