/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  MoreVertical, 
  History, 
  Edit2, 
  Trash2, 
  Copy,
  Check,
  AlertCircle,
  Calendar,
  Truck,
  FileText,
  Filter,
  ArrowUpDown,
  Home,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn, formatWeight, formatDate, copyToClipboard, isWeightExceeded, safeToFixed } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useBatches, useVarieties, useSendingRecords, useBatch, useWarehouses, useDestinations, useBatchModifications, useOrders, dataService } from '../lib/dataService';
import { useI18n } from '../lib/i18n';

type FilterType = 'all' | 'remaining' | 'no_remaining' | 'approved' | 'rejected' | string;
type SortType = 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc' | 'remaining_asc' | 'remaining_desc' | 'status_asc' | 'status_desc';

export default function BatchListFragment({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();
  const batches = useBatches();
  const varieties = useVarieties();
  const warehouses = useWarehouses();
  const destinations = useDestinations();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(() => localStorage.getItem('current_warehouse_id') || 'all');
  React.useEffect(() => {
    const handleChanged = () => {
      setSelectedWarehouseId(localStorage.getItem('current_warehouse_id') || 'all');
    };
    window.addEventListener('warehouse_changed', handleChanged);
    return () => window.removeEventListener('warehouse_changed', handleChanged);
  }, []);

  const [filterType, setFilterType] = useState<FilterType>('remaining');
  const [sortBy, setSortBy] = useState<SortType>('date_asc');
  
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [historyModal, setHistoryModal] = useState<number | null>(null);
  const [modifyModal, setModifyModal] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [supplementModal, setSupplementModal] = useState<number | null>(null);
  const [deductionModal, setDeductionModal] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const getVarietyName = (vid: number) => varieties?.find(v => v.vid === vid)?.vname || '未知';

  const getWarehouseLabel = (bwareId?: number) => {
    const wid = bwareId !== undefined && bwareId !== null ? bwareId : -1;
    const w = warehouses?.find(wh => wh.wid === wid);
    if (!w) return `仓库/Warehouse ${wid}`;
    const dest = destinations?.find(d => d.did === w.wlocation);
    return `${dest ? dest.dname : 'Unknown'} ：${w.wname}`;
  };

  const filteredAndSortedBatches = React.useMemo(() => {
    if (!batches) return [];

    let result = [...batches];

    // Filter by Warehouse
    if (selectedWarehouseId !== 'all') {
      result = result.filter(b => (b.bware !== undefined && b.bware !== null ? b.bware : -1) === parseInt(selectedWarehouseId));
    }

    // Filter by general status
    if (filterType === 'remaining') {
      result = result.filter(b => b.bcwei > 0);
    } else if (filterType === 'no_remaining') {
      result = result.filter(b => b.bcwei <= 0);
    } else if (filterType === 'approved') {
      result = result.filter(b => b.bstatus === 1);
    } else if (filterType === 'rejected') {
      result = result.filter(b => b.bstatus === 0);
    } else if (filterType.startsWith('v_')) {
      const vid = parseInt(filterType.split('_')[1]);
      result = result.filter(b => b.bvid === vid);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc': return new Date(a.bdate).getTime() - new Date(b.bdate).getTime();
        case 'date_desc': return new Date(b.bdate).getTime() - new Date(a.bdate).getTime();
        case 'name_asc': return a.bname.localeCompare(b.bname);
        case 'name_desc': return b.bname.localeCompare(a.bname);
        case 'remaining_asc': return a.bcwei - b.bcwei;
        case 'remaining_desc': return b.bcwei - a.bcwei;
        case 'status_asc': return b.bstatus - a.bstatus; // 1 (Approved) first
        case 'status_desc': return a.bstatus - b.bstatus; // 0 (Rejected) first
        default: return 0;
      }
    });

    return result;
  }, [batches, filterType, sortBy, selectedWarehouseId]);

  const handleCopySummary = async () => {
    if (!batches || !varieties) return;
    
    const summaryFiltered = batches.filter(b => {
      if (b.bcwei <= 0) return false;
      if (selectedWarehouseId !== 'all') {
        const bware = b.bware !== undefined && b.bware !== null ? b.bware : -1;
        return bware === parseInt(selectedWarehouseId);
      }
      return true;
    });

    const summary = summaryFiltered
      .map(b => {
        const vname = getVarietyName(b.bvid);
        const weightStr = `剩余 ${safeToFixed(b.bcwei, 3).padStart(8)} 吨`;
        const batchInfo = `${b.bname}(${vname})`;
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
      {/* Controls Row */}
      <div className="flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar">
        <button 
          onClick={onAdd}
          className="bg-emerald-500 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-colors shrink-0"
        >
          <Plus size={20} />
        </button>

        <button 
          onClick={() => setShowFilterModal(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-bold transition-all border shrink-0",
            filterType === 'all' 
              ? "bg-white text-slate-600 border-slate-100" 
              : "bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-100"
          )}
        >
          <Filter size={14} />
          {filterType === 'all' ? t('batch.filter') : (
            filterType === 'remaining' ? t('batch.filter.remaining') :
            filterType === 'no_remaining' ? t('batch.filter.no_remaining') :
            filterType === 'approved' ? t('batch.filter.approved') :
            filterType === 'rejected' ? t('batch.filter.rejected') :
            filterType.startsWith('v_') ? getVarietyName(parseInt(filterType.split('_')[1])) : t('batch.filter')
          )}
        </button>

        <button 
          onClick={() => setShowSortModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] bg-white text-slate-600 border border-slate-100 font-bold transition-all shrink-0 hover:bg-slate-50"
        >
          <ArrowUpDown size={14} />
          {t('batch.sort')}: {
            sortBy === 'date_asc' ? t('batch.sort.date_asc') :
            sortBy === 'date_desc' ? t('batch.sort.date_desc') :
            sortBy === 'name_asc' ? t('batch.sort.name_asc') :
            sortBy === 'name_desc' ? t('batch.sort.name_desc') :
            sortBy === 'remaining_asc' ? t('batch.sort.remaining_asc') :
            sortBy === 'remaining_desc' ? t('batch.sort.remaining_desc') :
            sortBy === 'status_asc' ? t('batch.sort.status_asc') : t('batch.sort.status_desc')
          }
        </button>
      </div>

      <div className="grid gap-3">
        {filteredAndSortedBatches.map((batch) => (
          <div key={batch.bid} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 relative">
            <div 
              className={cn(
                "w-3 h-3 rounded-full shrink-0",
                batch.bcwei === 0 ? "bg-slate-300" : (batch.bstatus === 2 ? "bg-yellow-400" : (batch.bstatus === 1 ? "bg-[#AFC3A8]" : "bg-[#FF2525]"))
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center flex-wrap gap-1">
                  <span className="font-bold text-slate-700 truncate">{t('batch.label')}: {batch.bname}</span>
                  {batch.bstatus === 2 && (
                    <span className="text-[9px] bg-yellow-105 text-yellow-600 border border-yellow-200 font-bold px-1 py-0.5 rounded uppercase shrink-0">
                      转运待收 / Pending Transfer
                    </span>
                  )}
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-mono">
                  ID: {batch.bid}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span className="font-medium text-emerald-600">{getVarietyName(batch.bvid)}</span>
                <span className="text-slate-300">|</span>
                <span>{t('batch.initial')}: {formatWeight(batch.bowei)}t</span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-700">{t('batch.remaining')}: {formatWeight(batch.bcwei)}t</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar size={10} /> {formatDate(batch.bdate)}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <Truck size={10} /> {batch.bcli}
                </span>
                <span className="flex items-center gap-1 shrink-0 bg-slate-50 text-slate-500 border border-slate-100 px-1 py-0.5 rounded">
                  <Home size={10} className="text-indigo-500 shrink-0" /> {getWarehouseLabel(batch.bware)}
                </span>
              </div>
              {batch.bmemo && (
                <div className="mt-1 flex items-start gap-1">
                  <FileText size={10} className="text-slate-300 mt-0.5" />
                  <p className="text-[10px] text-slate-400 line-clamp-1">{batch.bmemo}</p>
                </div>
              )}
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
                    <MenuButton icon={<History size={14} />} label={t('batch.history')} onClick={() => { setHistoryModal(batch.bid); setMenuOpen(null); }} />
                    <MenuButton icon={<Edit2 size={14} />} label={t('batch.modify')} onClick={() => { setModifyModal(batch.bid); setMenuOpen(null); }} />
                    <MenuButton icon={<TrendingUp size={14} className="text-emerald-500" />} label={t('batch.supplement')} onClick={() => { setSupplementModal(batch.bid); setMenuOpen(null); }} />
                    <MenuButton icon={<TrendingDown size={14} className="text-amber-500" />} label={t('batch.deduction')} onClick={() => { setDeductionModal(batch.bid); setMenuOpen(null); }} />
                    <MenuButton icon={<Trash2 size={14} />} label={t('batch.delete')} onClick={() => { setDeleteConfirm(batch.bid); setMenuOpen(null); }} className="text-red-500" />
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
        {copied ? t('batch.copied') : t('batch.copy_remaining')}
      </button>

      {/* Modals */}
      <FilterModal 
        isOpen={showFilterModal} 
        onClose={() => setShowFilterModal(false)}
        filterType={filterType}
        setFilterType={setFilterType}
      />
      <SortModal
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />
      <HistoryModal bid={historyModal} onClose={() => setHistoryModal(null)} />
      <ModifyBatchModal bid={modifyModal} onClose={() => setModifyModal(null)} />
      <DeleteModal bid={deleteConfirm} onClose={() => setDeleteConfirm(null)} />
      <SupplementStockModal bid={supplementModal} onClose={() => setSupplementModal(null)} />
      <DeductionStockModal bid={deductionModal} onClose={() => setDeductionModal(null)} />
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

function FilterModal({ isOpen, onClose, filterType, setFilterType }: { isOpen: boolean, onClose: () => void, filterType: FilterType, setFilterType: (f: FilterType) => void }) {
  const { t } = useI18n();
  const varieties = useVarieties();

  if (!isOpen) return null;

  const handleSelect = (f: FilterType) => {
    setFilterType(f);
    onClose();
  };

  return (
    <Modal title={t('batch.filter')} onClose={onClose}>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('batch.status')}</p>
          <div className="grid grid-cols-2 gap-2">
            <FilterOption label={t('batch.filter.all')} active={filterType === 'all'} onClick={() => handleSelect('all')} />
            <FilterOption label={t('batch.filter.remaining')} active={filterType === 'remaining'} onClick={() => handleSelect('remaining')} />
            <FilterOption label={t('batch.filter.no_remaining')} active={filterType === 'no_remaining'} onClick={() => handleSelect('no_remaining')} />
            <FilterOption label={t('batch.filter.approved')} active={filterType === 'approved'} onClick={() => handleSelect('approved')} />
            <FilterOption label={t('batch.filter.rejected')} active={filterType === 'rejected'} onClick={() => handleSelect('rejected')} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('variety.label')}</p>
          <div className="grid grid-cols-2 gap-2">
            {varieties?.map(v => (
              <FilterOption 
                key={v.vid} 
                label={v.vname} 
                active={filterType === `v_${v.vid}`} 
                onClick={() => handleSelect(`v_${v.vid}`)} 
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SortModal({ isOpen, onClose, sortBy, setSortBy }: { isOpen: boolean, onClose: () => void, sortBy: SortType, setSortBy: (s: SortType) => void }) {
  const { t } = useI18n();

  if (!isOpen) return null;

  const handleSelect = (s: SortType) => {
    setSortBy(s);
    onClose();
  };

  return (
    <Modal title={t('batch.sort')} onClose={onClose}>
      <div className="grid grid-cols-1 gap-2">
        <SortOption label={t('batch.sort.date_asc')} active={sortBy === 'date_asc'} onClick={() => handleSelect('date_asc')} />
        <SortOption label={t('batch.sort.date_desc')} active={sortBy === 'date_desc'} onClick={() => handleSelect('date_desc')} />
        <SortOption label={t('batch.sort.name_asc')} active={sortBy === 'name_asc'} onClick={() => handleSelect('name_asc')} />
        <SortOption label={t('batch.sort.name_desc')} active={sortBy === 'name_desc'} onClick={() => handleSelect('name_desc')} />
        <SortOption label={t('batch.sort.remaining_asc')} active={sortBy === 'remaining_asc'} onClick={() => handleSelect('remaining_asc')} />
        <SortOption label={t('batch.sort.remaining_desc')} active={sortBy === 'remaining_desc'} onClick={() => handleSelect('remaining_desc')} />
        <SortOption label={t('batch.sort.status_asc')} active={sortBy === 'status_asc'} onClick={() => handleSelect('status_asc')} />
        <SortOption label={t('batch.sort.status_desc')} active={sortBy === 'status_desc'} onClick={() => handleSelect('status_desc')} />
      </div>
    </Modal>
  );
}

function FilterOption({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-3 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between",
        active 
          ? "bg-slate-800 text-white border-slate-800" 
          : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
      )}
    >
      {label}
      {active && <Check size={14} />}
    </button>
  );
}

function SortOption({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-3 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between",
        active 
          ? "bg-emerald-500 text-white border-emerald-500" 
          : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
      )}
    >
      {label}
      {active && <Check size={14} />}
    </button>
  );
}

function HistoryModal({ bid, onClose }: { bid: number | null, onClose: () => void }) {
  const { t } = useI18n();
  const batch = useBatch(bid);
  const varieties = useVarieties();
  const records = useSendingRecords(false);
  const batchModifications = useBatchModifications();
  const warehouses = useWarehouses();
  const destinations = useDestinations();
  const orders = useOrders(true);

  if (!bid || !batch) return null;

  const shipments = (records?.filter(r => r.sstate === 3 && r.sainfo.includes(`${bid}/`)) || []).map(r => {
    const weight = parseFloat(r.sainfo.split(',').find(s => s.startsWith(`${bid}/`))?.split('/')[1] || '0');
    return {
      type: 'shipment',
      date: r.sdate,
      desc: r.splate,
      weight: -weight,
      id: r.sid!,
      memo: '',
      raw: r
    };
  });

  const modifications = (batchModifications?.filter(bm => bm.bid === bid) || []).map(bm => {
    const isSupplement = bm.bmop === 1;
    return {
      type: 'adjustment',
      date: bm.bmdate,
      desc: isSupplement ? '库存补充' : '损耗/赠予',
      weight: isSupplement ? bm.bmvolume : -bm.bmvolume,
      id: bm.bmid!,
      memo: bm.bmmemo,
      raw: null as any
    };
  });

  const history = [...shipments, ...modifications].sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    if (cmp !== 0) return cmp;
    return b.id - a.id;
  });

  return (
    <Modal title={t('batch.history')} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
          <div className="text-[10px] text-emerald-600 font-bold uppercase mb-1">{t('batch.info')}</div>
          <div className="text-sm font-bold text-emerald-900">{batch.bname} ({varieties?.find(v => v.vid === batch.bvid)?.vname})</div>
          <div className="flex justify-between mt-2 text-[10px] text-emerald-700 font-bold">
            <span>{t('batch.total_weight')}: {formatWeight(batch.bowei)}t</span>
            <span>{t('batch.remaining')}: {formatWeight(batch.bcwei)}t</span>
          </div>
        </div>
        
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {history?.length ? history.map((h, idx) => (
            <div key={`${h.type}-${h.id}-${idx}`} className="p-2.5 border-b border-slate-100 flex justify-between items-center text-xs hover:bg-slate-50/50 rounded-lg">
              <div>
                <div className="font-bold text-slate-700 flex flex-col gap-0.5">
                  {h.type === 'adjustment' ? (
                    <div className="flex items-center gap-1.5">
                      {h.weight > 0 ? <TrendingUp size={13} className="text-emerald-500" /> : <TrendingDown size={13} className="text-amber-500" />}
                      {h.desc}
                    </div>
                  ) : (
                    <>
                      <div>{t('shipment.splate_label') || '车牌号：'}{h.desc}</div>
                      {h.raw && h.raw.soid && h.raw.soid < 0 ? (
                        <div className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/30 w-fit mt-0.5">
                          {t('shipment.transfer_to') || '转运至'}: {warehouses?.find(w => w.wid === h.raw.soid || w.wid === Math.abs(h.raw.soid))?.wname || '未知仓库'}
                        </div>
                      ) : h.raw && h.raw.soid && h.raw.soid > 0 ? (
                        <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/30 flex items-center gap-1 flex-wrap w-fit mt-0.5">
                          <span>{t('shipment.destination') || '目的地'}: {destinations?.find(d => d.did === h.raw.sdest)?.dname || '未知'}</span>
                          <span className="text-slate-300">|</span>
                          <span>{t('shipment.order_subject') || '订单主体'}: {orders?.find(o => o.oid === h.raw.soid)?.ocname || '未知'}</span>
                        </div>
                      ) : (
                        h.raw && <div className="text-[10px] text-slate-500 w-fit mt-0.5">
                          {t('shipment.destination') || '目的地'}: {destinations?.find(d => d.did === h.raw.sdest)?.dname || '未知'}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{formatDate(h.date)}</div>
                {h.memo && <div className="text-[10px] text-slate-500 italic mt-0.5">备注：{h.memo}</div>}
              </div>
              <div className={cn(
                "font-bold font-mono text-xs",
                h.weight > 0 ? "text-emerald-600" : "text-red-500"
              )}>
                {h.weight > 0 ? '+' : ''}{formatWeight(h.weight)}t
              </div>
            </div>
          )) : <div className="text-center py-8 text-slate-400 text-xs italic font-medium">{t('batch.no_records')}</div>}
        </div>
      </div>
    </Modal>
  );
}

function ModifyBatchModal({ bid, onClose }: { bid: number | null, onClose: () => void }) {
  const { t } = useI18n();
  const batch = useBatch(bid);
  const [status, setStatus] = useState<number>(0);
  const [memo, setMemo] = useState('');

  React.useEffect(() => {
    if (batch) {
      setStatus(batch.bstatus);
      setMemo(batch.bmemo || '');
    }
  }, [batch]);

  if (!bid || !batch) return null;

  const handleConfirm = async () => {
    const extraUpdates: any = {};
    if (batch.bstatus === 2 && status !== 2) {
      extraUpdates.bdate = new Date().toISOString().split('T')[0];
    }

    await dataService.updateBatch(bid, { 
      bstatus: status,
      bmemo: memo,
      ...extraUpdates
    });
    onClose();
  };

  return (
    <Modal title={t('batch.modify')} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block font-bold">{t('batch.status')}</label>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setStatus(1)}
              className={cn(
                "p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                status === 1 ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#AFC3A8]" />
                <span className="text-xs font-bold">{t('batch.available')}</span>
              </div>
            </button>
            <button 
              onClick={() => setStatus(0)}
              className={cn(
                "p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                status === 0 ? "border-red-500 bg-red-50 text-red-700" : "border-slate-100 text-slate-400"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FF2525]" />
                <span className="text-xs font-bold">{t('batch.not_available')}</span>
              </div>
            </button>
            <button 
              onClick={() => setStatus(2)}
              className={cn(
                "p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                status === 2 ? "border-yellow-500 bg-yellow-50 text-yellow-750" : "border-slate-100 text-slate-400"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#facc15]" />
                <span className="text-xs font-bold">{t('batch.status.transfer')}</span>
              </div>
            </button>
          </div>
        </div>

        {batch.bstatus === 2 && (
          <div className="bg-yellow-50 border border-yellow-200 p-3.5 rounded-xl space-y-2">
            <div className="text-xs font-bold text-yellow-800">转运签收确认 / Action Required</div>
            <p className="text-[10px] text-yellow-700 leading-relaxed">
              该货物批次自其它货仓装车起运，当前正等待目的货仓核实卸货录入。
            </p>
            <button
              onClick={async () => {
                await dataService.updateBatch(bid, { 
                  bstatus: 1, 
                  bdate: new Date().toISOString().split('T')[0] 
                });
                onClose();
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-605 text-white py-2 px-3 rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-1 cursor-pointer"
            >
              ✓ 签收并放行（登记进库）
            </button>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-bold">{t('batch.memo')}</label>
          <textarea 
            rows={3}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={t('form.placeholder.memo')}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-xs"
          />
        </div>

        <button 
          onClick={handleConfirm}
          className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold shadow-lg"
        >
          {t('action.confirm')}
        </button>
      </div>
    </Modal>
  );
}

function DeleteModal({ bid, onClose }: { bid: number | null, onClose: () => void }) {
  const { t } = useI18n();
  if (!bid) return null;

  const handleConfirm = async () => {
    await dataService.deleteBatch(bid);
    onClose();
  };

  return (
    <Modal title={t('batch.delete')} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl">
          <AlertCircle size={24} className="shrink-0" />
          <p className="text-xs font-bold leading-relaxed">{t('confirm.delete_batch')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">{t('action.no')}</button>
          <button onClick={handleConfirm} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-100">{t('action.ok')}</button>
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

function FilterChip({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border",
        active 
          ? "bg-slate-800 text-white border-slate-800 shadow-sm" 
          : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
      )}
    >
      {label}
    </button>
  );
}

function SortChip({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border",
        active 
          ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" 
          : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
      )}
    >
      {label}
    </button>
  );
}

function SupplementStockModal({ bid, onClose }: { bid: number | null, onClose: () => void }) {
  const { t } = useI18n();
  const batch = useBatch(bid);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (bid) {
      setAmount('');
      setMemo('');
      setConfirming(false);
      setError('');
    }
  }, [bid]);

  if (!bid || !batch) return null;

  const handleNext = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('请输入大于0的有效补充量');
      return;
    }
    const newTotal = Number(batch.bcwei) + val;
    if (newTotal > Number(batch.bowei)) {
      setError(`补充后的量不能超过初始上限 ${batch.bowei}t (当前剩余 ${batch.bcwei}t，最多可补充 ${safeToFixed(Number(batch.bowei) - Number(batch.bcwei), 3)}t)`);
      return;
    }
    setError('');
    setConfirming(true);
  };

  const handleConfirm = async () => {
    const val = parseFloat(amount);
    const newTotal = Number(batch.bcwei) + val;

    await dataService.updateBatch(bid, {
      bcwei: newTotal
    });

    await dataService.addBatchModify({
      bid: bid,
      bmop: 1, // 库存补充 -> 1
      bmvolume: val,
      bmmemo: memo,
      bmdate: new Date().toISOString().split('T')[0]
    });

    onClose();
  };

  return (
    <Modal title={t('batch.supplement.title')} onClose={onClose}>
      {!confirming ? (
        <div className="space-y-4">
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100/50 text-xs">
            <span className="font-bold text-emerald-800 text-xs block truncate mb-1">批次：{batch.bname}</span>
            <div className="grid grid-cols-2 font-medium text-emerald-700">
              <span>当前剩余: {batch.bcwei}t</span>
              <span>初始上限: {batch.bowei}t</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block font-bold">{t('batch.modify_volume')}</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.001"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none pr-8 font-mono font-bold"
                placeholder="请输入补充数量"
              />
              <span className="absolute right-3 top-3 text-[10px] text-slate-400">t</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block font-bold">{t('batch.memo')}</label>
            <textarea 
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="请输入操作备注"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-xs"
            />
          </div>

          {error && (
            <div className="text-xs text-red-500 font-bold bg-red-50 p-2 border border-red-100 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          <button 
            onClick={handleNext}
            disabled={!amount}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50"
          >
            确定
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <AlertCircle size={24} className="shrink-0" />
            <div className="text-xs font-bold leading-relaxed">
              是否确定补充库存？
              <div className="mt-1">将增加：<span className="text-sm font-black text-emerald-700">{amount}t</span></div>
              <div>变更后剩余：<span className="text-sm font-black text-emerald-700">{safeToFixed(Number(batch.bcwei) + parseFloat(amount), 3)}t</span></div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirming(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">上一步</button>
            <button onClick={handleConfirm} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100">确认补充</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DeductionStockModal({ bid, onClose }: { bid: number | null, onClose: () => void }) {
  const { t } = useI18n();
  const batch = useBatch(bid);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (bid) {
      setAmount('');
      setMemo('');
      setConfirming(false);
      setError('');
    }
  }, [bid]);

  if (!bid || !batch) return null;

  const handleNext = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('请输入大于0的有效扣除量');
      return;
    }
    const newTotal = Number(batch.bcwei) - val;
    if (newTotal < 0) {
      setError(`扣除后的量不能低于0 (当前剩余为 ${batch.bcwei}t，最多可扣除 ${batch.bcwei}t)`);
      return;
    }
    setError('');
    setConfirming(true);
  };

  const handleConfirm = async () => {
    const val = parseFloat(amount);
    const newTotal = Number(batch.bcwei) - val;

    await dataService.updateBatch(bid, {
      bcwei: newTotal < 0 ? 0 : newTotal
    });

    await dataService.addBatchModify({
      bid: bid,
      bmop: 2, // 损耗/赠予 -> 2
      bmvolume: val,
      bmmemo: memo,
      bmdate: new Date().toISOString().split('T')[0]
    });

    onClose();
  };

  return (
    <Modal title={t('batch.deduction.title')} onClose={onClose}>
      {!confirming ? (
        <div className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100/50 text-xs">
            <span className="font-bold text-amber-800 text-xs block truncate mb-1">批次：{batch.bname}</span>
            <div className="grid grid-cols-2 font-medium text-amber-100">
              <span className="text-amber-750">当前剩余: {batch.bcwei}t</span>
              <span className="text-amber-750">初始上限: {batch.bowei}t</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block font-bold">{t('batch.modify_volume')}</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.001"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none pr-8 font-mono font-bold"
                placeholder="请输入扣除数量"
              />
              <span className="absolute right-3 top-3 text-[10px] text-slate-400">t</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block font-bold">{t('batch.memo')}</label>
            <textarea 
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="请输入操作备注"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-xs"
            />
          </div>

          {error && (
            <div className="text-xs text-red-500 font-bold bg-red-50 p-2 border border-red-100 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          <button 
            onClick={handleNext}
            disabled={!amount}
            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50"
          >
            确定
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-100">
            <AlertCircle size={24} className="shrink-0" />
            <div className="text-xs font-bold leading-relaxed">
              是否确定扣除库存？
              <div className="mt-1">将扣除：<span className="text-sm font-black text-amber-700">-{amount}t</span></div>
              <div>变更后剩余：<span className="text-sm font-black text-amber-700">{safeToFixed(Number(batch.bcwei) - parseFloat(amount), 3)}t</span></div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirming(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">上一步</button>
            <button onClick={handleConfirm} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-100">确认扣除</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
