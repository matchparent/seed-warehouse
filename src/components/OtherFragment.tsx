/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db';
import * as XLSX from 'xlsx';
import { ShipmentState } from '../types';
import { dataService } from '../lib/dataService';
import { useI18n, Language } from '../lib/i18n';
import { Database, FileSpreadsheet, Download, ShieldCheck, Languages, AlertCircle, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';

export default function OtherFragment() {
  const { t, lang, setLang } = useI18n();
  const [showSQLConfirm, setShowSQLConfirm] = useState(false);
  const [showExcelConfirm, setShowExcelConfirm] = useState(false);

  const exportSQL = async () => {
    setShowSQLConfirm(false);
    const varieties = await dataService.getVarieties();
    const destinations = await dataService.getDestinations();
    const batches = await dataService.getBatches(false);
    const records = await dataService.getSendingRecords(false);
    const orderStatuses = await dataService.getOrderStatuses();
    const orderCustomTypes = await dataService.getOrderCustomTypes();
    const orders = await dataService.getOrders(true);
    
    // Fetch users and logs
    let users: any[] = [];
    let logs: any[] = [];
    if (dataService.getMode() === 'dexie') {
      users = await db.tab_user.toArray();
      logs = await db.tab_op_record.toArray();
    } else {
      const uRes = await fetch('/api/tab_user');
      users = await uRes.json();
      const lRes = await fetch('/api/tab_op_record');
      logs = await lRes.json();
    }

    let sql = `-- Cotton Seed Warehouse Export\n-- Date: ${new Date().toLocaleString()}\n\n`;

    const esc = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return '';
      return String(val).replace(/'/g, "''");
    };

    // Schema
    sql += `CREATE TABLE tab_variaty (vid INTEGER PRIMARY KEY AUTO_INCREMENT, vname TEXT);\n`;
    sql += `CREATE TABLE tab_destination (did INTEGER PRIMARY KEY AUTO_INCREMENT, dname TEXT);\n`;
    sql += `CREATE TABLE tab_batch (bid INTEGER PRIMARY KEY AUTO_INCREMENT, bname TEXT, bvid INTEGER, bdate TEXT, bowei DECIMAL(10,3), bcwei DECIMAL(10,3), bstatus INTEGER, bcli TEXT, bmemo TEXT);\n`;
    sql += `CREATE TABLE tab_sending_record (sid INTEGER PRIMARY KEY AUTO_INCREMENT, sstate INTEGER, splate TEXT, spinfo TEXT, sainfo TEXT, sdate TEXT, sftime TEXT, sdrpn TEXT, sdest INTEGER, smemo TEXT, soid INTEGER);\n`;
    sql += `CREATE TABLE tab_order_status (osid INTEGER PRIMARY KEY AUTO_INCREMENT, oscname TEXT, osuname TEXT, osename TEXT);\n`;
    sql += `CREATE TABLE tab_order_custom (ocid INTEGER PRIMARY KEY AUTO_INCREMENT, occname TEXT, ocuname TEXT, ocename TEXT);\n`;
    sql += `CREATE TABLE tab_orders (oid INTEGER PRIMARY KEY AUTO_INCREMENT, status INTEGER, ocdate TEXT, odest INTEGER, octype INTEGER, ocname TEXT, ocphone TEXT, otr TEXT, otrc INTEGER, ossgi TEXT, oconid TEXT, oconfn TEXT, oarp TEXT, oard TEXT, oarr TEXT, oarpc INTEGER, ogsented TEXT, omemo TEXT);\n`;
    sql += `CREATE TABLE tab_user (uid INTEGER PRIMARY KEY AUTO_INCREMENT, spellname TEXT, \`key\` TEXT);\n`;
    sql += `CREATE TABLE tab_op_record (orid INTEGER PRIMARY KEY AUTO_INCREMENT, spellname TEXT, \`desc\` TEXT, optime TEXT);\n\n`;

    // Data
    varieties.forEach(v => sql += `INSERT INTO tab_variaty VALUES (${v.vid}, '${esc(v.vname)}');\n`);
    destinations.forEach(d => sql += `INSERT INTO tab_destination VALUES (${d.did}, '${esc(d.dname)}');\n`);
    batches.forEach(b => sql += `INSERT INTO tab_batch VALUES (${b.bid}, '${esc(b.bname)}', ${b.bvid}, '${esc(b.bdate)}', ${b.bowei}, ${b.bcwei}, ${b.bstatus}, '${esc(b.bcli)}', '${esc(b.bmemo)}');\n`);
    records.forEach(r => sql += `INSERT INTO tab_sending_record VALUES (${r.sid}, ${r.sstate}, '${esc(r.splate)}', '${esc(r.spinfo)}', '${esc(r.sainfo)}', '${esc(r.sdate)}', '${esc(r.sftime)}', '${esc(r.sdrpn)}', ${r.sdest}, '${esc(r.smemo)}', ${r.soid !== undefined ? r.soid : 'NULL'});\n`);
    orderStatuses.forEach(os => sql += `INSERT INTO tab_order_status VALUES (${os.osid}, '${esc(os.oscname)}', '${esc(os.osuname)}', '${esc(os.osename)}');\n`);
    orderCustomTypes.forEach(oc => sql += `INSERT INTO tab_order_custom VALUES (${oc.ocid}, '${esc(oc.occname)}', '${esc(oc.ocuname)}', '${esc(oc.ocename)}');\n`);
    orders.forEach(o => sql += `INSERT INTO tab_orders VALUES (${o.oid}, ${o.status}, '${esc(o.ocdate)}', ${o.odest}, ${o.octype}, '${esc(o.ocname)}', '${esc(o.ocphone)}', '${esc(o.otr)}', ${o.otrc ?? 1}, '${esc(o.ossgi)}', '${esc(o.oconid)}', '${esc(o.oconfn)}', '${esc(o.oarp)}', '${esc(o.oard)}', '${esc(o.oarr)}', ${o.oarpc ?? 1}, '${esc(o.ogsented)}', '${esc(o.omemo)}');\n`);
    users.forEach(u => sql += `INSERT INTO tab_user VALUES (${u.uid}, '${esc(u.spellname)}', '${esc(u.key)}');\n`);
    logs.forEach(l => sql += `INSERT INTO tab_op_record VALUES (${l.orid}, '${esc(l.spellname)}', '${esc(l.desc)}', '${esc(l.optime)}');\n`);

    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotton_seed_db_${new Date().getTime()}.sql`;
    a.click();
  };

  const exportExcel = async () => {
    setShowExcelConfirm(false);
    const allRecords = await dataService.getSendingRecords(false);
    const records = allRecords.filter(r => r.sstate === ShipmentState.COMPLETED);
    
    const varieties = await dataService.getVarieties();
    const destinations = await dataService.getDestinations();
    const batches = await dataService.getBatches(false);

    const rows: any[] = [];
    records.forEach(r => {
      const destName = destinations.find(d => d.did === r.sdest)?.dname || '未知';

      if (r.sainfo) {
        r.sainfo.split(',').forEach(item => {
          const [bid, weight] = item.split('/');
          const batch = batches.find(b => b.bid === parseInt(bid));
          const variety = varieties.find(v => v.vid === batch?.bvid)?.vname || '未知';
          
          rows.push({
            '日期': r.sdate,
            '卡车车牌号': r.splate,
            '品种名': variety,
            '批次': batch?.bname || '未知',
            '实际扣除重量': parseFloat(weight),
            '目的地': destName,
            '司机电话': r.sdrpn,
            '备注': r.smemo
          });
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "已完成发货记录");
    XLSX.writeFile(wb, `已完成发货信息_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Languages size={20} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-700">{t('other.language')}</div>
              <div className="text-[10px] text-slate-400">Tilni tanlang / Select Language</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['zh', 'uz', 'en'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "py-2 rounded-xl text-xs font-bold transition-all border",
                  lang === l 
                    ? "bg-slate-800 text-white border-slate-800" 
                    : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                )}
              >
                {l === 'zh' ? '中文' : l === 'uz' ? 'O\'zbek' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setShowSQLConfirm(true)}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Database size={20} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-700">{t('other.export_sql')}</div>
            <div className="text-[10px] text-slate-400">{t('other.export_sql_desc')}</div>
          </div>
          <Download size={18} className="text-slate-300" />
        </button>

        <button 
          onClick={() => setShowExcelConfirm(true)}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-700">{t('other.export_excel')}</div>
            <div className="text-[10px] text-slate-400">{t('other.export_excel_desc')}</div>
          </div>
          <Download size={18} className="text-slate-300" />
        </button>
      </div>

      {dataService.getMode() !== 'dexie' && (
        <div className="grid gap-3 pt-4 border-t border-slate-50">
          <button 
            onClick={() => {
              localStorage.removeItem('auth_user');
              window.location.reload();
            }}
            className="w-full py-4 bg-white border border-slate-100 text-red-500 rounded-2xl font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
          >
            <ShieldCheck size={18} />
            {t('other.logout')}
          </button>
        </div>
      )}

      <AnimatePresence>
        {showSQLConfirm && (
          <Modal title={t('other.export_sql')} onClose={() => setShowSQLConfirm(false)}>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-xl">
                <AlertCircle size={24} className="shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{t('confirm.export_sql')}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowSQLConfirm(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">{t('action.no')}</button>
                <button onClick={exportSQL} className="flex-1 py-4 bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-100">{t('action.ok')}</button>
              </div>
            </div>
          </Modal>
        )}

        {showExcelConfirm && (
          <Modal title={t('other.export_excel')} onClose={() => setShowExcelConfirm(false)}>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-xl">
                <AlertCircle size={24} className="shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{t('confirm.export_excel')}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowExcelConfirm(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">{t('action.no')}</button>
                <button onClick={exportExcel} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100">{t('action.ok')}</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
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
