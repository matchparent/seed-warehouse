/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Truck, MapPin, Phone, FileText, Calendar } from 'lucide-react';
import { ShipmentState, OrderStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useVarieties, useDestinations, dataService, useOrders, useWarehouses } from '../lib/dataService';
import { safeToFixed } from '../lib/utils';
import { useI18n } from '../lib/i18n';

export default function CreateShipmentPage({ onBack, onCreated }: { onBack: () => void, onCreated: (id: number) => void }) {
  const { t } = useI18n();
  const varieties = useVarieties();
  const destinations = useDestinations();
  const orders = useOrders();
  const warehouses = useWarehouses();

  const currentWarehouseId = React.useMemo(() => {
    const cached = localStorage.getItem('current_warehouse_id');
    if (cached && cached !== 'all') {
      return parseInt(cached);
    }
    return -1; // Default selector is wid = -1 (Sino-Uzbek Logistic)
  }, []);

  const activeOrders = React.useMemo(() => {
    return orders?.filter(o => o.status === OrderStatus.FULL_PAID) || [];
  }, [orders]);
  
  const [formData, setFormData] = useState({
    splate: '',
    soid: '', // Selected order's oid (positive) or warehouse's wid (negative)
    sdate: new Date().toISOString().split('T')[0]
  });

  const [plannedItems, setPlannedItems] = useState<{ vid: number, weight: number }[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ vid: '', weight: '' });
  const [modalError, setModalError] = useState('');

  const isTransfer = formData.soid !== '' && formData.soid.startsWith('transfer:');

  const activeOrder = React.useMemo(() => {
    if (isTransfer || !formData.soid.startsWith('order:')) return undefined;
    const oid = parseInt(formData.soid.split(':')[1]);
    return activeOrders.find(o => o.oid === oid);
  }, [activeOrders, formData.soid, isTransfer]);

  // Parse order variety demands
  const orderedMap = React.useMemo(() => {
    if (!activeOrder) return {};
    const map: { [vid: number]: number } = {};
    activeOrder.ossgi.split(',').forEach(item => {
      const parts = item.split('/');
      if (parts.length === 2) {
        const vid = parseInt(parts[0]);
        const qty = parseFloat(parts[1]);
        if (!isNaN(vid) && !isNaN(qty)) map[vid] = qty;
      }
    });
    return map;
  }, [activeOrder]);

  const sentMap = React.useMemo(() => {
    if (!activeOrder) return {};
    const map: { [vid: number]: number } = {};
    if (activeOrder.ogsented) {
      activeOrder.ogsented.split(',').forEach(item => {
        const parts = item.split('/');
        if (parts.length === 2) {
          const vid = parseInt(parts[0]);
          const qty = parseFloat(parts[1]);
          if (!isNaN(vid) && !isNaN(qty)) map[vid] = qty;
        }
      });
    }
    return map;
  }, [activeOrder]);

  const currentlyPlannedMap = React.useMemo(() => {
    const map: { [vid: number]: number } = {};
    plannedItems.forEach(item => {
      map[item.vid] = (map[item.vid] || 0) + item.weight;
    });
    return map;
  }, [plannedItems]);

  const filteredVarieties = React.useMemo(() => {
    if (isTransfer) return varieties || [];
    if (!activeOrder) return [];
    const keys = Object.keys(orderedMap).map(Number);
    return varieties?.filter(v => keys.includes(v.vid)) || [];
  }, [varieties, activeOrder, orderedMap, isTransfer]);

  const handleOrderChange = (soid: string) => {
    setFormData(prev => ({ ...prev, soid }));
    setPlannedItems([]); // Reset items because the order demands differ
  };

  const handleAddItem = () => {
    if (!newItem.vid || !newItem.weight) return;
    const vid = parseInt(newItem.vid);
    const weight = parseFloat(newItem.weight);
    if (isNaN(weight) || weight <= 0) {
      setModalError('请输入有效的重量');
      return;
    }
    if (isTransfer) {
      // Direct transfer, no caps
      setPlannedItems([...plannedItems, { vid, weight }]);
      setNewItem({ vid: '', weight: '' });
      setModalError('');
      setShowItemModal(false);
      return;
    }
    const ord = orderedMap[vid] || 0;
    if (ord === 0) {
      setModalError('该品种不在此订单的需求内！');
      return;
    }
    const snt = sentMap[vid] || 0;
    const plnd = currentlyPlannedMap[vid] || 0;
    const rem = ord - snt - plnd;
    if (weight > rem + 0.0001) {
      setModalError(`超出剩余需要发货的量！该品种当前最大剩余发货量为 ${safeToFixed(rem > 0 ? rem : 0, 3)} 吨`);
      return;
    }
    setPlannedItems([...plannedItems, { vid, weight }]);
    setNewItem({ vid: '', weight: '' });
    setModalError('');
    setShowItemModal(false);
  };

  const handleRemoveItem = (index: number) => {
    setPlannedItems(plannedItems.filter((_, i) => i !== index));
  };

  const isValid = formData.splate && formData.soid && plannedItems.length > 0;

  const handleCreate = async () => {
    if (!isValid) return;
    
    let sdestValue = 1;
    let soidValue: any = undefined;
    let swareValue = -1;

    // Source warehouse default logic
    const cached = localStorage.getItem('current_warehouse_id');
    if (cached && cached !== 'all') {
      swareValue = Number(cached);
    }

    if (formData.soid.startsWith('transfer:')) {
      // Transfer to another warehouse
      const destWid = parseInt(formData.soid.split(':')[1]);
      const w = warehouses?.find(wh => wh.wid === destWid || wh.wid === -Math.abs(destWid) || wh.wid === Math.abs(destWid));
      sdestValue = w ? w.wlocation : 1;
      soidValue = -Math.abs(destWid);
    } else {
      // Normal Order
      const orderOid = parseInt(formData.soid.split(':')[1]);
      const order = activeOrders.find(o => o.oid === orderOid);
      if (!order) return;
      sdestValue = order.odest;
      soidValue = order.oid;
    }

    const spinfo = plannedItems.map(item => `${item.vid}/${item.weight}`).join(',');
    
    const id = await dataService.addSendingRecord({
      sstate: ShipmentState.NEW,
      splate: formData.splate,
      sdrpn: '',
      sdest: sdestValue,
      soid: soidValue,
      sware: swareValue,
      sdate: formData.sdate,
      spinfo: spinfo,
      sainfo: '',
      smemo: formData.soid.startsWith('transfer:') ? `由货仓发起跨仓转运 / Cargo transfer dispatch` : ''
    });
    
    onCreated(id);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">
          {t('page.create_shipment')}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <InputGroup label={t('form.plate')} icon={<Truck size={18} />}>
            <input 
              type="text" 
              maxLength={30}
              value={formData.splate}
              onChange={e => setFormData({...formData, splate: e.target.value})}
              placeholder={t('form.placeholder.plate')}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
            />
          </InputGroup>

          <InputGroup label="选择订单/转运 (Select Order/Transfer)" icon={<FileText size={18} />}>
            <select 
              value={formData.soid}
              onChange={e => handleOrderChange(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none font-bold text-xs"
            >
              <option value="">选择分属订单/转运目的仓库</option>
              {activeOrders && activeOrders.length > 0 && (
                <optgroup label="✅ 契合可用订单 / Active Orders">
                  {activeOrders.map(o => {
                    const destName = destinations?.find(d => d.did === o.odest)?.dname || `ID ${o.odest}`;
                    return (
                      <option key={`order-${o.oid}`} value={`order:${o.oid}`}>
                        {destName} - {o.ocname}
                      </option>
                    );
                  })}
                </optgroup>
              )}
              {warehouses && warehouses.length > 0 && (
                <optgroup label="🚚 转运目的货仓 / Transfer Destination Warehouses">
                  {warehouses
                    .filter(w => w.wid !== currentWarehouseId)
                    .map(w => {
                      const dest = destinations?.find(d => d.did === w.wlocation);
                      const destLabel = dest ? dest.dname : `Location ${w.wlocation}`;
                      return (
                        <option key={`ware-${w.wid}`} value={`transfer:${w.wid}`}>
                          [转运] {destLabel} ：{w.wname}
                        </option>
                      );
                    })}
                </optgroup>
              )}
            </select>
          </InputGroup>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-2 ml-1">
                <PackageIcon size={18} /> {t('shipment.planned')}
              </label>
              <button 
                onClick={() => {
                  if (!formData.soid) return;
                  setModalError('');
                  setShowItemModal(true);
                }}
                disabled={!formData.soid}
                className="text-xs font-bold text-emerald-600 disabled:text-slate-300 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> {t('action.add')}
              </button>
            </div>

            {!formData.soid && (
              <p className="text-[10px] text-amber-500 font-bold bg-amber-50 px-3 py-2 border border-amber-100 rounded-xl flex items-center gap-1 ml-1">
                ⚠️ {t('shipment.select_order_hint')}
              </p>
            )}

            {isTransfer && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="text-xs font-bold text-blue-700">进行仓与仓之间的货物转移</div>
                <p className="text-[10px] text-blue-500 mt-1">跨区域仓库物料调度，不需要扣减客户订单量，仅扣除始发货仓该品种的批次重量，并会给目的货仓新生成一个状态为“待接收”的新批次以录入。</p>
              </div>
            )}

            {!isTransfer && activeOrder && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">
                  {t('order.variety_qty') || '订单品种需求'}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(orderedMap).map(([vidStr, reqQty]) => {
                    const vid = parseInt(vidStr);
                    const vname = varieties?.find(v => v.vid === vid)?.vname || `ID ${vid}`;
                    const snt = sentMap[vid] || 0;
                    const plnd = currentlyPlannedMap[vid] || 0;
                    const rem = reqQty - snt - plnd;
                    return (
                      <div key={vid} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm text-xs gap-1">
                        <span className="font-bold text-slate-700">{vname}</span>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500">
                          <span>需求: <strong className="text-slate-800 font-bold">{reqQty}t</strong></span>
                          <span>已发: <strong className="text-slate-800 font-medium">{snt}t</strong></span>
                          {plnd > 0 && (
                            <span>本次计划: <strong className="text-emerald-600 font-bold">{safeToFixed(plnd, 3)}t</strong></span>
                          )}
                          <span>剩余所需: <strong className={rem > 0.001 ? "text-amber-600 font-bold" : "text-slate-400 font-medium"}>{safeToFixed(rem > 0 ? rem : 0, 3)}t</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {plannedItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="text-sm font-bold text-emerald-800">
                    {varieties?.find(v => v.vid === item.vid)?.vname}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-emerald-600">{safeToFixed(item.weight, 3)}t</span>
                    <button onClick={() => handleRemoveItem(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {plannedItems.length === 0 && (
                <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-[10px] italic font-medium">
                  {t('shipment.no_records')}
                </div>
              )}
            </div>
          </div>

          <InputGroup label={t('form.date')} icon={<Calendar size={18} />}>
            <input 
              type="date" 
              value={formData.sdate}
              onChange={e => setFormData({...formData, sdate: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </InputGroup>
        </div>
      </main>

      <footer className="p-6 border-t border-slate-100">
        <button 
          onClick={handleCreate}
          disabled={!isValid}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 disabled:opacity-50 cursor-pointer"
        >
          {t('action.confirm')}
        </button>
      </footer>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowItemModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-xs rounded-3xl shadow-2xl relative z-10 p-6 space-y-4"
            >
              <h3 className="font-bold text-slate-800">{t('page.allocation')}</h3>
              <div className="space-y-3">
                <select 
                  value={newItem.vid}
                  onChange={e => {
                    setNewItem({...newItem, vid: e.target.value});
                    setModalError('');
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs"
                >
                  <option value="">{t('form.select_variety')}</option>
                  {filteredVarieties?.map(v => {
                    if (isTransfer) {
                      return (
                        <option key={v.vid} value={v.vid}>
                          {v.vname}
                        </option>
                      );
                    }
                    const ord = orderedMap[v.vid] || 0;
                    const snt = sentMap[v.vid] || 0;
                    const plnd = currentlyPlannedMap[v.vid] || 0;
                    const rem = ord - snt - plnd;
                    return (
                      <option key={v.vid} value={v.vid}>
                        {v.vname} (Req: {ord}t, Rem: {safeToFixed(rem > 0 ? rem : 0, 3)}t)
                      </option>
                    );
                  })}
                </select>
                <input 
                  type="number" 
                  step="0.001"
                  value={newItem.weight}
                  onChange={e => {
                    setNewItem({...newItem, weight: e.target.value});
                    setModalError('');
                  }}
                  placeholder={t('form.total_weight_t')}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              {modalError && (
                <div className="text-xs text-red-500 font-bold bg-red-50 px-3 py-2 border border-red-100 rounded-xl animate-pulse">
                  ⚠️ {modalError}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowItemModal(false)} className="flex-1 py-2 text-slate-400 font-bold hover:bg-slate-50 rounded-xl">{t('action.no')}</button>
                <button 
                  onClick={handleAddItem}
                  disabled={!newItem.vid || !newItem.weight}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:bg-emerald-300 disabled:text-emerald-50 disabled:cursor-not-allowed"
                >
                  {t('action.add')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InputGroup({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 flex items-center gap-2 ml-1">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function PackageIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
}
