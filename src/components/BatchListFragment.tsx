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
  ArrowUpDown
} from 'lucide-react';
import { cn, formatWeight, formatDate, copyToClipboard, isWeightExceeded, safeToFixed } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useBatches, useVarieties, useSendingRecords, useBatch, dataService } from '../lib/dataService';
import { useI18n } from '../lib/i18n';

type FilterType = 'all' | 'remaining' | 'no_remaining' | 'approved' | 'rejected' | string;
type SortType = 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc' | 'remaining_asc' | 'remaining_desc' | 'status_asc' | 'status_desc';

export default function BatchListFragment({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();
  const batches = useBatches();
  const varieties = useVarieties();
  const [filterType, setFilterType] = useState<FilterType>('remaining');
  const [sortBy, setSortBy] = useState<SortType>('date_asc');
  
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [historyModal, setHistoryModal] = useState<number | null>(null);
  const [modifyModal, setModifyModal] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const getVarietyName = (vid: number) => varieties?.find(v => v.vid === vid)?.vname || '未知';

  const filteredAndSortedBatches = React.useMemo(() => {
    if (!batches) return [];

    let result = [...batches];

    // Filter
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
  }, [batches, filterType, sortBy]);

  const handleCopySummary = async () => {
    if (!batches || !varieties) return;
    
    const summary = batches
      .filter(b => b.bcwei > 0)
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
                batch.bcwei === 0 ? "bg-slate-300" : (batch.bstatus === 1 ? "bg-[#AFC3A8]" : "bg-[#FF2525]")
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-700 truncate">{t('batch.label')}: {batch.bname}</span>
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
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar size={10} /> {formatDate(batch.bdate)}
                </span>
                <span className="flex items-center gap-1">
                  <Truck size={10} /> {batch.bcli}
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

// --- Modal Components ---

function HistoryModal({ bid, onClose }: { bid: number | null, onClose: () => void }) {
  const { t } = useI18n();
  const batch = useBatch(bid);
  const varieties = useVarieties();
  const records = useSendingRecords(false);

  if (!bid || !batch) return null;

  const history = records?.filter(r => r.sstate === 3 && r.sainfo.includes(`${bid}/`)).map(r => {
    const weight = parseFloat(r.sainfo.split(',').find(s => s.startsWith(`${bid}/`))?.split('/')[1] || '0');
    return { ...r, weight };
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
          {history?.length ? history.map(h => (
            <div key={h.sid} className="p-2 border-b border-slate-100 flex justify-between items-center text-xs">
              <div>
                <div className="font-bold text-slate-700">{h.splate}</div>
                <div className="text-slate-400">{formatDate(h.sdate)}</div>
              </div>
              <div className="text-red-500 font-bold">-{formatWeight(h.weight)}t</div>
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
  const [weight, setWeight] = useState('');
  const [status, setStatus] = useState<number>(0);
  const [memo, setMemo] = useState('');

  React.useEffect(() => {
    if (batch) {
      setWeight(batch.bcwei.toString());
      setStatus(batch.bstatus);
      setMemo(batch.bmemo || '');
    }
  }, [batch]);

  if (!bid || !batch) return null;

  const handleConfirm = async () => {
    const w = parseFloat(weight);
    if (isNaN(w) || isWeightExceeded(w, batch.bowei)) return;
    await dataService.updateBatch(bid, { 
      bcwei: w,
      bstatus: status,
      bmemo: memo
    });
    onClose();
  };

  return (
    <Modal title={t('batch.modify')} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block font-bold">{t('batch.status')}</label>
          <div className="flex gap-3">
            <button 
              onClick={() => setStatus(1)}
              className={cn(
                "flex-1 p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
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
                "flex-1 p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                status === 0 ? "border-red-500 bg-red-50 text-red-700" : "border-slate-100 text-slate-400"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FF2525]" />
                <span className="text-xs font-bold">{t('batch.not_available')}</span>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-bold">{t('batch.remaining')} (t)</label>
          <div className="relative">
            <input 
              type="number" 
              step="0.001"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none pr-8 font-mono font-bold"
              placeholder={t('form.total_weight_t')}
            />
            <span className="absolute right-3 top-3 text-[10px] text-slate-400">t</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{t('batch.max_adj')}: {formatWeight(batch.bowei)}t</p>
          {isWeightExceeded(parseFloat(weight), batch.bowei) && <p className="text-[10px] text-red-500 mt-1 font-bold">{t('batch.weight_exceeded')}</p>}
        </div>

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
          disabled={!weight || isWeightExceeded(parseFloat(weight), batch.bowei)}
          className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50"
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
