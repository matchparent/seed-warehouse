/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  MapPin, 
  User, 
  Phone, 
  Wallet, 
  Leaf, 
  Weight, 
  FileText,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { 
  dataService, 
  useDestinations, 
  useOrderCustomTypes, 
  useVarieties 
} from '../lib/dataService';
import { Order, OrderStatus } from '../types';
import { cn, formatSimpleDate } from '../lib/utils';

interface AddOrderPageProps {
  onBack: () => void;
  editOrder?: Order | null;
}

export default function AddOrderPage({ onBack, editOrder }: AddOrderPageProps) {
  const { t, lang } = useI18n();
  const destinations = useDestinations();
  const customTypes = useOrderCustomTypes();
  const varieties = useVarieties();

  const [loading, setLoading] = useState(false);
  const [dest, setDest] = useState(editOrder?.odest || '');
  const [customType, setCustomType] = useState(editOrder?.octype || '');
  const [name, setName] = useState(editOrder?.ocname || '');
  const [phone, setPhone] = useState(editOrder?.ocphone || '');
  const [receivables, setReceivables] = useState(editOrder?.otr || '');
  const [receivablesCurrency, setReceivablesCurrency] = useState(editOrder?.otrc || 1);
  const [received, setReceived] = useState(editOrder?.oarp || '');
  const [receivedCurrency, setReceivedCurrency] = useState(editOrder?.oarpc || 1);
  const [memo, setMemo] = useState(editOrder?.omemo || '');
  
  const [needs, setNeeds] = useState<{vid: string, qty: string}[]>(
    editOrder?.ossgi.split(',').map(s => {
      const [vid, qty] = s.split('/');
      return { vid, qty };
    }) || [{ vid: '', qty: '' }]
  );

  const handleSubmit = async () => {
    if (!dest) {
      alert(t('form.select_destination'));
      return;
    }
    if (!customType) {
      alert(t('form.select_custom_type'));
      return;
    }
    if (!name.trim()) {
      alert(t('order.contact_name_hint'));
      return;
    }
    if (!receivables || isNaN(Number(receivables)) || Number(receivables) < 0) {
      alert(t('order.receivables_hint'));
      return;
    }

    const validNeeds = needs.filter(n => n.vid && n.qty);

    if (validNeeds.length === 0) {
      alert(t('order.variety_qty'));
      return;
    }

    const ossgi = validNeeds
      .map(n => `${n.vid}/${n.qty}`)
      .join(',');

    // If editing, check if new qty is less than sent qty
    if (editOrder && editOrder.ogsented) {
      const sentMap = new Map(editOrder.ogsented.split(',').map(s => {
        const [vid, qty] = s.split('/');
        return [vid, Number(qty)];
      }));

      for (const n of validNeeds) {
        const sentQty = sentMap.get(n.vid) || 0;
        if (Number(n.qty) < sentQty) {
          alert(t('error.qty_invalid'));
          return;
        }
      }
    }

    setLoading(true);
    try {
      const status = editOrder?.status || OrderStatus.INTENTIONAL;
      let ocdate = editOrder?.ocdate || '';
      if (!ocdate) {
        ocdate = `${status}-${formatSimpleDate()}`;
      }

      const orderData: any = {
        ocdate: ocdate,
        status: status,
        odest: Number(dest),
        octype: Number(customType),
        ocname: name || '',
        ocphone: phone || '',
        otr: receivables,
        otrc: Number(receivablesCurrency),
        ossgi: ossgi,
        oarp: received || '',
        oarpc: Number(receivedCurrency),
        omemo: memo || '',
        ogsented: editOrder?.ogsented || ''
      };

      if (editOrder) {
        await dataService.updateOrder(editOrder.oid!, orderData);
      } else {
        await dataService.addOrder(orderData);
      }
      onBack();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-800 hover:bg-slate-50 rounded-xl transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-black text-slate-800">{editOrder ? t('action.edit') : t('order.add')}</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-20 space-y-4">
        <Section title={t('order.base_info')}>
          <FormField icon={<MapPin size={18} />} label={t('order.dest')}>
            <select 
              value={dest} 
              onChange={e => setDest(e.target.value)} 
              className="w-full bg-transparent text-sm font-bold focus:outline-none"
            >
              <option value="">{t('form.select_destination')}</option>
              {destinations?.map(d => <option key={d.did} value={d.did}>{d.dname}</option>)}
            </select>
          </FormField>

          <FormField icon={<User size={18} />} label={t('order.custom_type')}>
            <select 
              value={customType} 
              onChange={e => setCustomType(e.target.value)} 
              className="w-full bg-transparent text-sm font-bold focus:outline-none"
            >
              <option value="">{t('form.select_custom_type')}</option>
              {customTypes?.map(ct => <option key={ct.ocid} value={ct.ocid}>
                {lang === 'zh' ? ct.occname : lang === 'uz' ? ct.ocuname : ct.ocename}
              </option>)}
            </select>
          </FormField>

          <FormField icon={<User size={18} />} label={t('order.contact_name')}>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-transparent text-sm font-bold focus:outline-none" 
              placeholder={t('order.contact_name_hint')}
            />
          </FormField>

          <FormField icon={<Phone size={18} />} label={t('order.contact_phone')}>
            <input 
              type="text" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              className="w-full bg-transparent text-sm font-bold focus:outline-none" 
              placeholder={t('order.contact_phone_hint')}
            />
          </FormField>
          
          <FormField icon={<Wallet size={18} />} label={t('order.receivables')}>
            <div className="flex gap-2 w-full">
              <input 
                type="number" 
                step="any"
                min="0"
                value={receivables} 
                onChange={e => setReceivables(e.target.value)} 
                className="flex-1 bg-transparent text-sm font-bold focus:outline-none" 
                placeholder={t('order.receivables_hint')}
              />
              <select 
                value={receivablesCurrency} 
                onChange={e => setReceivablesCurrency(Number(e.target.value))}
                className="bg-slate-50 px-2 py-1 rounded-lg text-xs font-bold focus:outline-none"
              >
                <option value={1}>{t('currency.uzs')}</option>
                <option value={2}>{t('currency.usd')}</option>
                <option value={3}>{t('currency.cny')}</option>
              </select>
            </div>
          </FormField>

          {editOrder && editOrder.status >= OrderStatus.DEPOSIT_PAID && (
            <FormField icon={<Wallet size={18} />} label={t('order.received')}>
              <div className="flex gap-2 w-full">
                <input 
                  type="number" 
                  step="any"
                  min="0"
                  value={received} 
                  onChange={e => setReceived(e.target.value)} 
                  className="flex-1 bg-transparent text-sm font-bold focus:outline-none" 
                />
                <select 
                  value={receivedCurrency} 
                  onChange={e => setReceivedCurrency(Number(e.target.value))}
                  className="bg-slate-50 px-2 py-1 rounded-lg text-xs font-bold focus:outline-none"
                >
                  <option value={1}>{t('currency.uzs')}</option>
                  <option value={2}>{t('currency.usd')}</option>
                  <option value={3}>{t('currency.cny')}</option>
                </select>
              </div>
            </FormField>
          )}
        </Section>

        <Section title={t('order.variety_qty')}>
          <div className="space-y-3">
            {needs.map((need, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                   <FormField label={t('order.variety_name')} noIcon>
                      <select 
                        value={need.vid} 
                        onChange={e => {
                          const newNeeds = [...needs];
                          newNeeds[idx].vid = e.target.value;
                          setNeeds(newNeeds);
                        }} 
                        className="w-full bg-transparent text-xs font-bold focus:outline-none"
                      >
                        <option value="">{t('form.select_variety')}</option>
                        {varieties?.map(v => <option key={v.vid} value={v.vid}>{v.vname}</option>)}
                      </select>
                   </FormField>
                </div>
                <div className="w-24">
                   <FormField label={t('order.variety_weight')} noIcon>
                      <input 
                        type="number" 
                        value={need.qty} 
                        onChange={e => {
                          const newNeeds = [...needs];
                          newNeeds[idx].qty = e.target.value;
                          setNeeds(newNeeds);
                        }} 
                        className="w-full bg-transparent text-xs font-bold focus:outline-none" 
                        placeholder="0.00"
                      />
                   </FormField>
                </div>
                <button 
                  onClick={() => setNeeds(needs.filter((_, i) => i !== idx))}
                  className="p-3 bg-red-50 text-red-500 rounded-2xl mb-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => setNeeds([...needs, { vid: '', qty: '' }])}
              className="w-full py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
            >
              <Plus size={16} /> {t('action.add')}
            </button>
          </div>
        </Section>

        <Section title={t('order.memo')}>
          <textarea 
            value={memo} 
            onChange={e => setMemo(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-3xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/10 min-h-[100px]"
            placeholder="..."
          />
        </Section>

        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-emerald-500 text-white rounded-3xl font-black shadow-xl shadow-emerald-100 disabled:opacity-50"
        >
          {loading ? '...' : t('action.ok')}
        </button>
      </main>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="space-y-2">
      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormField({ icon, label, children, noIcon }: any) {
  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{label}</p>
      <div className="flex items-center gap-3">
        {!noIcon && <div className="text-slate-400">{icon}</div>}
        {children}
      </div>
    </div>
  );
}
