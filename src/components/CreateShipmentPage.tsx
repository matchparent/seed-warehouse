/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Truck, MapPin, Phone, FileText, Calendar } from 'lucide-react';
import { ShipmentState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useVarieties, useDestinations, dataService } from '../lib/dataService';
import { safeToFixed } from '../lib/utils';
import { useI18n } from '../lib/i18n';

export default function CreateShipmentPage({ onBack, onCreated }: { onBack: () => void, onCreated: (id: number) => void }) {
  const { t } = useI18n();
  const varieties = useVarieties();
  const destinations = useDestinations();
  
  const [formData, setFormData] = useState({
    splate: '',
    sdest: '',
    sdate: new Date().toISOString().split('T')[0]
  });

  const [plannedItems, setPlannedItems] = useState<{ vid: number, weight: number }[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ vid: '', weight: '' });

  const handleAddItem = () => {
    if (!newItem.vid || !newItem.weight) return;
    setPlannedItems([...plannedItems, { vid: parseInt(newItem.vid), weight: parseFloat(newItem.weight) }]);
    setNewItem({ vid: '', weight: '' });
    setShowItemModal(false);
  };

  const handleRemoveItem = (index: number) => {
    setPlannedItems(plannedItems.filter((_, i) => i !== index));
  };

  const isValid = formData.splate && formData.sdest && plannedItems.length > 0;

  const handleCreate = async () => {
    if (!isValid) return;
    
    const spinfo = plannedItems.map(item => `${item.vid}/${item.weight}`).join(',');
    
    const id = await dataService.addSendingRecord({
      sstate: ShipmentState.NEW,
      splate: formData.splate,
      sdrpn: '',
      sdest: parseInt(formData.sdest),
      sdate: formData.sdate,
      spinfo: spinfo,
      sainfo: '',
      smemo: ''
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

          <InputGroup label={t('form.destination')} icon={<MapPin size={18} />}>
            <select 
              value={formData.sdest}
              onChange={e => setFormData({...formData, sdest: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
            >
              <option value="">{t('form.select_destination')}</option>
              {destinations?.map(d => (
                <option key={d.did} value={d.did}>{d.dname}</option>
              ))}
            </select>
          </InputGroup>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-2 ml-1">
                <PackageIcon size={18} /> {t('shipment.planned')}
              </label>
              <button 
                onClick={() => setShowItemModal(true)}
                className="text-xs font-bold text-emerald-600 flex items-center gap-1"
              >
                <Plus size={14} /> {t('action.add')}
              </button>
            </div>
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
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 disabled:opacity-50"
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
                  onChange={e => setNewItem({...newItem, vid: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="">{t('form.select_variety')}</option>
                  {varieties?.map(v => (
                    <option key={v.vid} value={v.vid}>{v.vname}</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  step="0.001"
                  value={newItem.weight}
                  onChange={e => setNewItem({...newItem, weight: e.target.value})}
                  placeholder={t('form.total_weight_t')}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowItemModal(false)} className="flex-1 py-2 text-slate-400 font-bold">{t('action.no')}</button>
                <button 
                  onClick={handleAddItem}
                  disabled={!newItem.vid || !newItem.weight}
                  className="flex-1 py-2 bg-emerald-500 text-white rounded-xl font-bold disabled:opacity-50"
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
