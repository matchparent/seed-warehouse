/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  RotateCcw
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
import { Order, OrderStatus } from '../types';
import { cn, formatWeight, formatDate, formatSimpleDate, getCurrencySymbol, getCurrencyShortSymbol } from '../lib/utils';

export default function OrderListFragment({ onAdd, onEditOrder }: { onAdd: () => void, onEditOrder: (order: Order) => void }) {
  const { t, lang } = useI18n();
  const orders = useOrders();
  const destinations = useDestinations();
  const customTypes = useOrderCustomTypes();
  const statuses = useOrderStatuses();
  const varieties = useVarieties();

  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOptionsId, setShowOptionsId] = useState<number | null>(null);

  const filteredOrders = orders?.filter(o => {
    const dest = destinations?.find(d => d.did === o.odest)?.dname || '';
    const match = o.ocname.toLowerCase().includes(search.toLowerCase()) || 
                  dest.toLowerCase().includes(search.toLowerCase()) ||
                  o.oconid?.toLowerCase().includes(search.toLowerCase());
    return match;
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
      <div className="flex items-center gap-3">
        <button 
          onClick={onAdd}
          className="bg-emerald-500 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-colors shrink-0"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="grid gap-3 pb-24">
        {filteredOrders?.map(order => (
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
        ))}
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
        order.status < OrderStatus.FULL_PAID ? "cursor-pointer hover:border-slate-200 hover:shadow-md" : ""
      )}
      onClick={() => {
        if (order.status < OrderStatus.FULL_PAID) {
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
        <button 
          onClick={(e) => { e.stopPropagation(); onOptions(); }}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <MoreVertical size={20} />
        </button>
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

      {order.status < OrderStatus.FULL_PAID && (
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
            await fetch('/api/contracts/upload', {
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
        });
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

        await dataService.updateOrder(order.oid!, updates);
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

        await dataService.updateOrder(order.oid!, { 
          status: newStatus, 
          oarr: receivedAmount,
          oarp: total,
          oarpc: Number(receivedCurrency),
          ocdate: newOcDate
        });
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
  const [refundAmt, setRefundAmt] = useState('');
  const [refundCur, setRefundCur] = useState(1);
  const orders = useOrders();
  const order = orders?.find(o => o.oid === oid);

  if (!order) return null;

  const handleDelete = async () => {
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

          <OptionButton 
            icon={<Trash2 size={18} />} 
            label={t('action.delete_order')} 
            onClick={() => setShowDeleteConfirm(true)} 
            className="text-red-500" 
          />
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
                    await dataService.updateOrder(order.oid!, orderData);
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
    </>
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
