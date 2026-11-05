/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Phone, 
  MessageSquare,
  FileText, 
  ClipboardCheck, 
  Wallet, 
  Truck, 
  Download, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Clock,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  X,
  SlidersHorizontal,
  ChevronDown,
  User,
  UserCheck,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { 
  useOrders, 
  useDestinations, 
  useOrderCustomTypes, 
  useOrderStatuses,
  useVarieties,
  dataService
} from '../lib/dataService';
import { Order, OrderStatus, OpRecord } from '../types';
import { cn, formatWeight, formatDate, formatSimpleDate, getCurrencySymbol, getCurrencyShortSymbol } from '../lib/utils';

export default function OrderListFragment({ onAdd, onEditOrder }: { onAdd: () => void, onEditOrder: (order: Order) => void }) {
  const { t, lang } = useI18n();
  const orders = useOrders();
  const destinations = useDestinations();
  const customTypes = useOrderCustomTypes();
  const statuses = useOrderStatuses();
  const varieties = useVarieties();

  const [search, setSearch] = useState('');
  const [selectedDest, setSelectedDest] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOptionsId, setShowOptionsId] = useState<number | null>(null);

  const activeFilterCount = (selectedDest !== 'all' ? 1 : 0) + 
                            (selectedType !== 'all' ? 1 : 0) + 
                            (selectedStatus !== 'all' ? 1 : 0);
  const hasActiveFilters = search.trim() !== '' || activeFilterCount > 0;

  const handleResetFilters = () => {
    setSearch('');
    setSelectedDest('all');
    setSelectedType('all');
    setSelectedStatus('all');
  };

  const filteredOrders = orders?.filter(o => {
    // 1. 订单主体名称模糊搜索
    if (search.trim()) {
      const keyword = search.trim().toLowerCase();
      const matchName = (o.ocname || '').toLowerCase().includes(keyword);
      if (!matchName) return false;
    }

    // 2. 目的地筛选
    if (selectedDest !== 'all') {
      if (Number(o.odest) !== Number(selectedDest)) return false;
    }

    // 3. 客户类型筛选
    if (selectedType !== 'all') {
      if (Number(o.octype) !== Number(selectedType)) return false;
    }

    // 4. 订单进度筛选
    if (selectedStatus !== 'all') {
      if (Number(o.status) !== Number(selectedStatus)) return false;
    }

    return true;
  });

  const getStatusName = (osid: number) => {
    switch (osid) {
      case OrderStatus.INTENTIONAL: return t('status.intentional');
      case OrderStatus.SIGNED: return t('status.signed');
      case OrderStatus.DEPOSIT_PAID: return t('status.deposit_paid');
      case OrderStatus.FULL_PAID: return t('status.full_paid');
      case OrderStatus.COMPLETED: return t('status.completed');
      case OrderStatus.DELETED: return t('status.deleted');
      case OrderStatus.REFUNDED: return t('status.refunded');
      default: return 'Unknown';
    }
  };

  const getCustomTypeName = (ocid: number) => {
    const type = customTypes?.find(t => t.ocid === ocid);
    if (!type) return 'Unknown';
    if (lang === 'zh') return type.occname;
    if (lang === 'uz') return type.ocuname;
    return type.ocename;
  };

  const getDestinationName = (did: number) => {
    return destinations?.find(d => d.did === did)?.dname || 'Unknown';
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Search Input for Order Subject Name */}
          <div className="relative flex-1 flex items-center">
            <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('order.search_placeholder') || '搜索订单主体名称...'}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                title="清空搜索"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Toggle Filter Panel Button */}
          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={cn(
              "p-2.5 rounded-2xl border transition-all flex items-center justify-center shrink-0 shadow-sm relative cursor-pointer",
              isFilterExpanded || activeFilterCount > 0
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
            title={t('order.filter_title') || '订单筛选'}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Add Order Button */}
          <button 
            onClick={onAdd}
            className="bg-emerald-500 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 active:scale-95 transition-all shrink-0 flex items-center justify-center cursor-pointer"
            title={t('order.add') || '新增订单'}
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Collapsible Filter Panel */}
        <AnimatePresence>
          {isFilterExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  {/* Destination Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 block truncate">
                      {t('order.dest') || '目的地'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDest}
                        onChange={(e) => setSelectedDest(e.target.value)}
                        className={cn(
                          "w-full bg-slate-50 border rounded-xl pl-2.5 pr-6 py-2 text-xs font-semibold focus:outline-none transition-colors appearance-none truncate cursor-pointer",
                          selectedDest !== 'all' 
                            ? "border-emerald-300 text-emerald-700 bg-emerald-50/50" 
                            : "border-slate-200 text-slate-700 focus:border-emerald-500"
                        )}
                      >
                        <option value="all">{t('order.all_dest') || '全部目的地'}</option>
                        {destinations?.map(d => (
                          <option key={d.did} value={String(d.did)}>{d.dname}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Customer Type Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 block truncate">
                      {t('order.custom_type') || '客户类型'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className={cn(
                          "w-full bg-slate-50 border rounded-xl pl-2.5 pr-6 py-2 text-xs font-semibold focus:outline-none transition-colors appearance-none truncate cursor-pointer",
                          selectedType !== 'all' 
                            ? "border-emerald-300 text-emerald-700 bg-emerald-50/50" 
                            : "border-slate-200 text-slate-700 focus:border-emerald-500"
                        )}
                      >
                        <option value="all">{t('order.all_types') || '全部客户类型'}</option>
                        {customTypes?.map(ct => (
                          <option key={ct.ocid} value={String(ct.ocid)}>{getCustomTypeName(ct.ocid)}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Order Progress / Status Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 block truncate">
                      {t('order.delivery_progress') || '订单进度'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className={cn(
                          "w-full bg-slate-50 border rounded-xl pl-2.5 pr-6 py-2 text-xs font-semibold focus:outline-none transition-colors appearance-none truncate cursor-pointer",
                          selectedStatus !== 'all' 
                            ? "border-emerald-300 text-emerald-700 bg-emerald-50/50" 
                            : "border-slate-200 text-slate-700 focus:border-emerald-500"
                        )}
                      >
                        <option value="all">{t('order.all_statuses') || '全部订单进度'}</option>
                        {statuses?.map(st => (
                          <option key={st.osid} value={String(st.osid)}>{getStatusName(st.osid)}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Status Summary & Reset Button */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[11px]">
                  <span className="text-slate-400 font-medium">
                    找到 <span className="font-bold text-slate-700">{filteredOrders?.length || 0}</span> 笔订单
                    {orders && orders.length !== (filteredOrders?.length || 0) && (
                      <span className="text-slate-400"> (共 {orders.length} 笔)</span>
                    )}
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>{t('order.reset_filter') || '重置筛选'}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Orders List / Empty State */}
      <div className="grid gap-3 pb-24">
        {filteredOrders && filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <OrderCard 
              key={order.oid} 
              order={order} 
              t={t}
              destName={getDestinationName(order.odest)}
              typeName={getCustomTypeName(order.octype)}
              statusName={getStatusName(order.status)}
              varieties={varieties || []}
              currency={getCurrencySymbol(order.otrc)}
              onClick={() => setSelectedOrder(order)}
              onOptions={() => setShowOptionsId(order.oid || null)}
            />
          ))
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Search size={22} />
            </div>
            <div className="text-sm font-bold text-slate-700">
              {hasActiveFilters ? (t('order.no_matching') || '未找到符合条件的订单') : '暂无订单记录'}
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {hasActiveFilters 
                ? '尝试修改搜索关键词或重置筛选条件' 
                : '点击上方“+”按钮创建第一笔新订单'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>{t('order.reset_filter') || '重置筛选'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onUpdate={() => setSelectedOrder(null)}
        />
      )}

      {showOptionsId && (
        <OrderOptionsModal 
          oid={showOptionsId} 
          onClose={() => setShowOptionsId(null)} 
          onEdit={() => {
            const order = orders?.find(o => o.oid === showOptionsId);
            if (order) onEditOrder(order);
            setShowOptionsId(null);
          }}
        />
      )}
    </div>
  );
}

function OrderCard({ order, t, destName, typeName, statusName, varieties, currency, onClick, onOptions }: any) {
  const needs = order.ossgi.split(',').map((s: string) => {
    const [vid, qty] = s.split('/');
    const vname = varieties.find((v: any) => v.vid === Number(vid))?.vname || 'Unknown';
    return { vname, qty: Number(qty) };
  });

  const totalNeeds = needs.reduce((acc: number, n: any) => acc + n.qty, 0);
  const sent = order.ogsented.split(',').map((s: string) => {
    if (!s) return { qty: 0 };
    const [vid, qty] = s.split('/');
    return { vid: Number(vid), qty: Number(qty) };
  });

  const totalSent = sent.reduce((acc: number, s: any) => acc + s.qty, 0);
  const progress = Math.min(100, (totalSent / totalNeeds) * 100);

  const isContractUploaded = order.status >= OrderStatus.SIGNED && order.oconid && order.oconfn;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3 transition-all",
        (order.status < OrderStatus.FULL_PAID && order.status !== OrderStatus.DELETED) ? "cursor-pointer hover:border-slate-200 hover:shadow-md" : ""
      )}
      onClick={() => {
        if (order.status < OrderStatus.FULL_PAID && order.status !== OrderStatus.DELETED) {
          onClick();
        }
      }}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg">#{order.oid}</span>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-lg",
              order.status === OrderStatus.INTENTIONAL ? "bg-amber-100 text-amber-600" :
              order.status === OrderStatus.SIGNED ? "bg-blue-100 text-blue-600" :
              order.status === OrderStatus.DEPOSIT_PAID ? "bg-cyan-100 text-cyan-600" :
              order.status === OrderStatus.FULL_PAID ? "bg-purple-100 text-purple-600" :
              order.status === OrderStatus.COMPLETED ? "bg-emerald-100 text-emerald-600" :
              order.status === OrderStatus.REFUNDED ? "bg-rose-100 text-rose-600" :
              "bg-slate-100 text-slate-500"
            )}>{statusName}</span>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-lg",
              isContractUploaded ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-400"
            )}>
              {isContractUploaded ? t('order.contract_uploaded') : t('order.contract_not_uploaded')}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-slate-800">{order.ocname || '-'}</p>
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Clock size={12} /> {formatDate(order.ocdate)} • {destName}
              </p>
              {order.ocphone && (
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Phone size={12} /> {order.ocphone}
                </p>
              )}
            </div>
          </div>
        </div>
        {order.status !== OrderStatus.DELETED && (
          <button 
            onClick={(e) => { e.stopPropagation(); onOptions(); }}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <MoreVertical size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-1">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('order.custom_type')}</p>
          <p className="text-xs font-bold text-slate-700">{typeName}</p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('order.receivables')}</p>
          <p className="text-xs font-bold text-slate-700 truncate">{order.otr} {getCurrencyShortSymbol(order.otrc)}</p>
        </div>

        {order.oconid && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('order.contract_id')}</p>
            <p className="text-xs font-bold text-slate-700 truncate">{order.oconid}</p>
          </div>
        )}

        {order.oarp && (
          <div className="space-y-1 text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('order.received')}</p>
            <p className="text-xs font-bold text-slate-700 truncate">{order.oarp} {getCurrencyShortSymbol(order.oarpc || 1)}</p>
          </div>
        )}

        {order.oard && (
          <div className="space-y-1 text-right col-start-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('order.received_deposit')}</p>
            <p className="text-xs font-bold text-slate-700 truncate">{order.oard} {getCurrencyShortSymbol(order.oarpc || 1)}</p>
          </div>
        )}

        {order.oarr && (
          <div className="space-y-1 text-right col-start-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('order.received_balance')}</p>
            <p className="text-xs font-bold text-slate-700 truncate">{order.oarr} {getCurrencyShortSymbol(order.oarpc || 1)}</p>
          </div>
        )}

        {order.status === OrderStatus.REFUNDED && order.orf && (
          <div className="space-y-1 text-right col-start-2">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">已退金额 / Refunded</p>
            <p className="text-xs font-black text-rose-600 truncate">-{order.orf} {getCurrencyShortSymbol(order.orfc || 1)}</p>
          </div>
        )}
      </div>

      {order.omemo && (
        <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/50 flex gap-2">
          <MessageSquare size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium leading-relaxed">{order.omemo}</p>
        </div>
      )}

      {order.status >= OrderStatus.FULL_PAID && order.status !== OrderStatus.REFUNDED && (
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-end">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('order.delivery_progress')}</p>
            <p className="text-xs font-black text-slate-800">{formatWeight(totalSent)} / {formatWeight(totalNeeds)} t</p>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn(
                "h-full transition-all duration-1000",
                progress === 100 ? "bg-emerald-500" : "bg-blue-500"
              )}
            />
          </div>
        </div>
      )}

      {/* 订单创建人与最后修改人及操作时间 */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 text-[11px]">
        <div className="flex items-center gap-1 text-slate-500 min-w-0">
          <span className="text-[10px] text-slate-400 font-semibold">{t('order.creator') || '创建人'}:</span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md text-[10px]">
            <User size={11} className="text-slate-400 shrink-0" />
            <span className="truncate max-w-[90px]">{order.ocreator || 'admin'}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
          <span className="text-[10px] text-slate-400 font-semibold">{t('order.last_modifier') || '最后修改'}:</span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md text-[10px]">
            <UserCheck size={11} className="text-slate-400 shrink-0" />
            <span className="truncate max-w-[90px]">{order.omodifier || order.ocreator || 'admin'}</span>
          </span>
          <span className="inline-flex items-center gap-0.5 text-slate-400 text-[10px] font-medium shrink-0">
            <Clock size={10} className="text-slate-400 shrink-0" />
            <span>{order.omodtime ? (order.omodtime.includes(':') ? order.omodtime : formatDate(order.omodtime)) : (order.ocdate ? formatDate(order.ocdate) : '-')}</span>
          </span>
        </div>
      </div>

      {order.status < OrderStatus.FULL_PAID && order.status !== OrderStatus.DELETED && (
        <button 
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
        >
          {order.status === OrderStatus.INTENTIONAL ? t('action.upload_contract') : 
           order.status === OrderStatus.SIGNED ? t('order.confirm_payment') :
           order.status === OrderStatus.DEPOSIT_PAID ? t('order.confirm_balance_payment') : 
           t('action.view')}
          <ChevronRight size={14} />
        </button>
      )}
    </motion.div>
  );
}

// Sub-components like Modals will be implemented in the same file or separated if too large.
// For brevity and based on "Modularity & Token Limit Management", I'll keep them here for now but watch out.

function Modal({ title, children, onClose }: any) {
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
          <h3 className="font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onUpdate }: { order: Order, onClose: () => void, onUpdate: () => void }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [conId, setConId] = useState(order.oconid || '');
  const [file, setFile] = useState<File | null>(null);
  const [receivedAmount, setReceivedAmount] = useState(order.oarp || '');
  const [receivedCurrency, setReceivedCurrency] = useState(order.oarpc || 1);
  const [paymentType, setPaymentType] = useState<'deposit' | 'full'>('full');

  const handleNextStep = async () => {
    setLoading(true);
    try {
      if (order.status === OrderStatus.INTENTIONAL) {
        if (!conId) { alert('Please enter contract ID'); return; }
        const fileName = file ? `${Date.now()}_${file.name}` : order.oconfn;

        let fileDataUrl = '';
        if (file) {
          fileDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        const isMysql = dataService.getMode() === 'mysql';

        if (file && fileDataUrl) {
          if (isMysql) {
            const base64Data = fileDataUrl.includes('base64,') ? fileDataUrl.split('base64,')[1] : '';
            await dataService.authFetch('/api/contracts/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName,
                fileData: base64Data
              })
            });
          }
        }

        const newStatus = OrderStatus.SIGNED;
        const newDateRecord = `${newStatus}-${formatSimpleDate()}`;
        const newOcDate = order.ocdate ? `${order.ocdate},${newDateRecord}` : newDateRecord;

        await dataService.updateOrder(order.oid!, { 
          status: newStatus, 
          oconid: conId, 
          oconfn: fileName,
          ocdate: newOcDate,
          ...(fileDataUrl && !isMysql ? { ocontract_data: fileDataUrl } : {})
        }, `上传合同并签约: 合同编号 "${conId}", 文件 "${fileName}", 状态更新为已签约`);
      } else if (order.status === OrderStatus.SIGNED) {
        if (!receivedAmount || isNaN(Number(receivedAmount)) || Number(receivedAmount) < 0) { 
          alert('Please enter a valid amount'); 
          return; 
        }
        
        const isDeposit = paymentType === 'deposit';
        const newStatus = isDeposit ? OrderStatus.DEPOSIT_PAID : OrderStatus.FULL_PAID;
        const newDateRecord = `${newStatus}-${formatSimpleDate()}`;
        const newOcDate = order.ocdate ? `${order.ocdate},${newDateRecord}` : newDateRecord;

        const updates: Partial<Order> = {
          status: newStatus,
          oarpc: Number(receivedCurrency),
          ocdate: newOcDate
        };

        if (isDeposit) {
          updates.oard = receivedAmount;
        } else {
          updates.oarp = receivedAmount;
        }

        const curSymbol = getCurrencyShortSymbol(receivedCurrency);
        const actionMsg = isDeposit
          ? `收取定金 ${receivedAmount} ${curSymbol}, 状态更新为已付定金`
          : `收取全款 ${receivedAmount} ${curSymbol}, 状态更新为已付全款`;

        await dataService.updateOrder(order.oid!, updates, actionMsg);
      } else if (order.status === OrderStatus.DEPOSIT_PAID) {
        if (!receivedAmount || isNaN(Number(receivedAmount)) || Number(receivedAmount) < 0) { 
          alert('Please enter a valid amount'); 
          return; 
        }

        const newStatus = OrderStatus.FULL_PAID;
        const newDateRecord = `${newStatus}-${formatSimpleDate()}`;
        const newOcDate = order.ocdate ? `${order.ocdate},${newDateRecord}` : newDateRecord;

        const deposit = Number(order.oard || 0);
        const balance = Number(receivedAmount);
        const total = (deposit + balance).toString();
        const curSymbol = getCurrencyShortSymbol(receivedCurrency);

        await dataService.updateOrder(order.oid!, { 
          status: newStatus, 
          oarr: receivedAmount,
          oarp: total,
          oarpc: Number(receivedCurrency),
          ocdate: newOcDate
        }, `收取尾款 ${receivedAmount} ${curSymbol}, 累计实收 ${total} ${curSymbol}, 状态更新为已付全款`);
      }
      onUpdate();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    if (order.status === OrderStatus.INTENTIONAL) return t('action.upload_contract');
    if (order.status === OrderStatus.SIGNED) return t('order.confirm_payment');
    if (order.status === OrderStatus.DEPOSIT_PAID) return t('order.confirm_balance_payment');
    return t('action.view');
  };

  return (
    <Modal title={getModalTitle()} onClose={onClose}>
      <div className="space-y-4">
        {order.status === OrderStatus.INTENTIONAL && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{t('order.contract_id')}</label>
              <input 
                type="text" 
                value={conId}
                onChange={e => setConId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{t('order.contract_file')}</label>
              <div 
                className="border-2 border-dashed border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <Download size={24} />
                </div>
                <p className="text-xs font-bold text-slate-500">{file ? file.name : t('action.upload')}</p>
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </>
        )}

        {order.status === OrderStatus.SIGNED && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{t('order.receivables')}</p>
                <p className="text-sm font-black text-slate-700">{order.otr} {getCurrencySymbol(order.otrc)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{t('order.payment_type')}</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPaymentType('deposit')}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-xs font-bold border transition-all",
                    paymentType === 'deposit' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-100"
                  )}
                >
                  {t('order.payment_deposit')}
                </button>
                <button 
                  onClick={() => setPaymentType('full')}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-xs font-bold border transition-all",
                    paymentType === 'full' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-100"
                  )}
                >
                  {t('order.payment_full')}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                {paymentType === 'deposit' ? t('order.received_deposit') : t('order.received')}
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  step="any"
                  min="0"
                  value={receivedAmount}
                  onChange={e => setReceivedAmount(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <select 
                  value={receivedCurrency} 
                  onChange={e => setReceivedCurrency(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-100 rounded-2xl px-2 text-xs font-bold focus:outline-none"
                >
                  <option value={1}>{t('currency.uzs')}</option>
                  <option value={2}>{t('currency.usd')}</option>
                  <option value={3}>{t('currency.cny')}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {order.status === OrderStatus.DEPOSIT_PAID && (
          <div className="space-y-4">
             <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-blue-400 uppercase">{t('order.receivables')}</p>
                  <p className="text-sm font-black text-blue-700">{order.otr} {getCurrencySymbol(order.otrc)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-blue-400 uppercase">{t('order.received_deposit')}</p>
                  <p className="text-sm font-black text-blue-700">{order.oard} {getCurrencySymbol(order.oarpc || 1)}</p>
                </div>
                <div className="pt-2 border-t border-blue-100 flex justify-between items-center">
                  <p className="text-[10px] font-bold text-blue-500 uppercase">{t('order.payment_difference')}</p>
                  <p className="text-base font-black text-blue-800">
                    {Math.max(0, Number(order.otr || 0) - Number(order.oard || 0)).toFixed(2).replace(/\.00$/, '')} {getCurrencySymbol(order.otrc)}
                  </p>
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('order.received_balance')}</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    step="any"
                    min="0"
                    value={receivedAmount}
                    onChange={e => setReceivedAmount(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <select 
                    value={receivedCurrency} 
                    onChange={e => setReceivedCurrency(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-100 rounded-2xl px-2 text-xs font-bold focus:outline-none"
                  >
                    <option value={1}>{t('currency.uzs')}</option>
                    <option value={2}>{t('currency.usd')}</option>
                    <option value={3}>{t('currency.cny')}</option>
                  </select>
                </div>
              </div>
          </div>
        )}

        <button 
          onClick={handleNextStep}
          disabled={loading}
          className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black shadow-xl shadow-slate-200 disabled:opacity-50"
        >
          {loading ? '...' : t('action.ok')}
        </button>
      </div>
    </Modal>
  );
}

function OrderOptionsModal({ oid, onClose, onEdit }: { oid: number, onClose: () => void, onEdit: () => void }) {
  const { t } = useI18n();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [showOpRecordsModal, setShowOpRecordsModal] = useState(false);
  const [refundAmt, setRefundAmt] = useState('');
  const [refundCur, setRefundCur] = useState(1);
  const orders = useOrders();
  const order = orders?.find(o => o.oid === oid);

  if (!order) return null;

  const handleDelete = async () => {
    if (
      order.status === OrderStatus.FULL_PAID ||
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.REFUNDED
    ) {
      alert("该订单状态下不可删除 (This order cannot be deleted under current status)");
      return;
    }
    // Check if status PAID and has sent goods
    if (order.status >= OrderStatus.DEPOSIT_PAID) {
      const sent = order.ogsented.split(',').reduce((acc, s) => {
        if (!s) return acc;
        const q = Number(s.split('/')[1]);
        return acc + q;
      }, 0);
      if (sent > 0) {
        alert(t('error.revoke_shipment'));
        return;
      }
    }
    
    await dataService.deleteOrder(oid);
    onClose();
  };

  const handleDownload = () => {
    if (!order.oconfn) return;
    if (confirm(t('confirm.download_contract'))) {
      const isMysql = dataService.getMode() === 'mysql';
      if (isMysql) {
        const link = document.createElement('a');
        link.href = `/api/contracts/download/${encodeURIComponent(order.oconfn)}`;
        link.download = order.oconfn;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Dexie mode
        if (order.ocontract_data) {
          const link = document.createElement('a');
          link.href = order.ocontract_data;
          link.download = order.oconfn;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          alert('Local contract file not found in storage.');
        }
      }
    }
  };

  return (
    <>
      <Modal title="" onClose={onClose}>
        <div className="grid gap-2">
          <OptionButton icon={<Edit2 size={18} />} label={order.status >= OrderStatus.DEPOSIT_PAID ? t('action.edit_info') : t('action.edit_base_info')} onClick={onEdit} />
          
          {/* 订单操作记录入口 */}
          <OptionButton 
            icon={<History size={18} className="text-blue-500" />} 
            label={t('order.op_records') || '订单操作记录 / Operation Logs'} 
            onClick={() => setShowOpRecordsModal(true)} 
          />

          {(order.status >= OrderStatus.SIGNED || order.status === OrderStatus.INTENTIONAL) && order.status !== OrderStatus.REFUNDED && (
             <OptionButton icon={<FileText size={18} />} label={t('action.update_contract')} onClick={() => setShowContractModal(true)} />
          )}

          {order.oconfn && order.status !== OrderStatus.REFUNDED && (
            <>
              <OptionButton icon={<Download size={18} />} label={t('action.download_contract')} onClick={handleDownload} />
            </>
          )}

          {(order.status === OrderStatus.DEPOSIT_PAID || order.status === OrderStatus.FULL_PAID || order.status === OrderStatus.COMPLETED) && (
            <OptionButton 
              icon={<RotateCcw size={18} />} 
              label="申请退款 / Refund order" 
              onClick={() => {
                setRefundAmt(order.oarp || order.oard || order.otr || '');
                setRefundCur(order.oarpc || order.otrc || 1);
                setShowRefundModal(true);
              }} 
            />
          )}

          {order.status !== OrderStatus.FULL_PAID && 
           order.status !== OrderStatus.COMPLETED && 
           order.status !== OrderStatus.REFUNDED && (
             <OptionButton 
               icon={<Trash2 size={18} />} 
               label={t('action.delete_order')} 
               onClick={() => setShowDeleteConfirm(true)} 
               className="text-red-500" 
             />
          )}
        </div>
      </Modal>

      {showDeleteConfirm && (
        <Modal title={t('action.delete_order')} onClose={() => setShowDeleteConfirm(false)}>
           <div className="space-y-4">
              <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-3xl">
                <AlertCircle size={24} className="shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{t('confirm.delete_order')}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">{t('action.no')}</button>
                <button onClick={handleDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold">{t('action.ok')}</button>
              </div>
            </div>
        </Modal>
      )}

      {showContractModal && (
        <OrderDetailsModal order={{...order, status: OrderStatus.INTENTIONAL}} onClose={() => setShowContractModal(false)} onUpdate={() => { setShowContractModal(false); onClose(); }} />
      )}

      {showRefundModal && (
        <Modal title="申请退款 / Refund" onClose={() => setShowRefundModal(false)}>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">退款金额 / Refund Amount</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  step="any"
                  min="0"
                  value={refundAmt}
                  onChange={e => setRefundAmt(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="请输入退款金额"
                />
                <select 
                  value={refundCur} 
                  onChange={e => setRefundCur(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-100 rounded-2xl px-2 text-xs font-bold focus:outline-none"
                >
                  <option value={1}>{t('currency.uzs')}</option>
                  <option value={2}>{t('currency.usd')}</option>
                  <option value={3}>{t('currency.cny')}</option>
                </select>
              </div>
            </div>

            <button 
              onClick={() => {
                if (!refundAmt || isNaN(Number(refundAmt)) || Number(refundAmt) <= 0) {
                  alert("请输入有效的且大于0的退款金额！");
                  return;
                }
                setShowRefundConfirm(true);
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black shadow-xl shadow-slate-200"
            >
              确定 / Confirm
            </button>
          </div>
        </Modal>
      )}

      {showRefundConfirm && (
        <Modal title="确认退款 / Confirm Refund" onClose={() => setShowRefundConfirm(false)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-rose-600 bg-rose-50 p-4 rounded-3xl">
              <AlertCircle size={24} className="shrink-0" />
              <p className="text-xs font-bold leading-relaxed">确定要对此订单进行退款吗？退款后，订单状态将直接变更为“已退款”。</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRefundConfirm(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">{t('action.no')}</button>
              <button 
                onClick={async () => {
                  try {
                    const orderData = {
                      ...order,
                      status: OrderStatus.REFUNDED,
                      orf: refundAmt,
                      orfc: refundCur
                    };
                    await dataService.updateOrder(
                      order.oid!, 
                      orderData, 
                      `申请退款: 金额 ${refundAmt} ${getCurrencyShortSymbol(refundCur)}, 状态变更为已退款`
                    );
                    setShowRefundConfirm(false);
                    setShowRefundModal(false);
                    onClose();
                  } catch (e) {
                    console.error(e);
                  }
                }} 
                className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold"
              >
                {t('action.ok')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showOpRecordsModal && (
        <OrderOpRecordsModal 
          oid={oid} 
          order={order} 
          onClose={() => setShowOpRecordsModal(false)} 
        />
      )}
    </>
  );
}

function OrderOpRecordsModal({ oid, order, onClose }: { oid: number, order: Order, onClose: () => void }) {
  const { t } = useI18n();
  const [records, setRecords] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    dataService.getOrderOpRecords(oid)
      .then(res => {
        if (isMounted) {
          setRecords(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load order op records', err);
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [oid]);

  return (
    <Modal title={t('order.op_records_title') || '订单操作记录明细'} onClose={onClose}>
      <div className="space-y-4">
        {/* Order Header Summary */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 truncate">
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-lg text-[10px] shrink-0">#{oid}</span>
              <span className="truncate">{order.ocname || '-'}</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 shrink-0">
              {records.length} {t('order.op_records') || '条记录'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">{t('order.creator') || '创建人'}:</span>
              <span className="font-bold text-slate-700 flex items-center gap-1 mt-0.5 truncate">
                <User size={12} className="text-emerald-500 shrink-0" />
                <span className="truncate">{order.ocreator || 'admin'}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">{t('order.last_modifier') || '最后修改'}:</span>
              <span className="font-bold text-slate-700 flex items-center gap-1 mt-0.5 truncate">
                <UserCheck size={12} className="text-blue-500 shrink-0" />
                <span className="truncate">{order.omodifier || order.ocreator || 'admin'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Operation Records Timeline */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <History size={14} className="text-slate-400" />
              {t('order.op_records') || '操作历史明细'}
            </span>
            <span className="text-[10px] text-slate-400">
              按时间正序排列
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>正在加载操作记录...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              {t('order.no_op_records') || '暂无操作记录'}
            </div>
          ) : (
            <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 max-h-[42vh] overflow-y-auto no-scrollbar pr-1">
              {records.map((rec, idx) => {
                const cleanDesc = rec.desc.replace(/^\[订单\s*#\d+\]\s*/, '');
                return (
                  <div key={rec.orid || idx} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-emerald-500 shadow-xs" />

                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs space-y-1.5 hover:border-slate-200 transition-colors">
                      {/* Operator & Time */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-800 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 truncate">
                          <User size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{rec.spellname || 'admin'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0 font-medium">
                          <Clock size={11} className="text-slate-400" />
                          {rec.optime}
                        </span>
                      </div>

                      {/* Operation Content */}
                      <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50/60 p-2 rounded-xl break-words">
                        {cleanDesc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-slate-800 transition-colors"
        >
          {t('action.close') || '关闭'}
        </button>
      </div>
    </Modal>
  );
}

function OptionButton({ icon, label, onClick, className }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-4 rounded-2xl hover:bg-slate-50 transition-colors font-bold text-sm text-left border border-slate-50",
        className
      )}
    >
      <div className="text-slate-400">{icon}</div>
      {label}
    </button>
  );
}
