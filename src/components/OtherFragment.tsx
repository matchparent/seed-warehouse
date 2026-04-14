/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db';
import { Database, FileSpreadsheet, Download, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ShipmentState } from '../types';

export default function OtherFragment() {
  const exportSQL = async () => {
    const varieties = await db.tab_variaty.toArray();
    const destinations = await db.tab_destination.toArray();
    const batches = await db.tab_batch.toArray();
    const records = await db.tab_sending_record.toArray();

    let sql = `-- Cotton Seed Warehouse Export\n-- Date: ${new Date().toLocaleString()}\n\n`;

    // Schema
    sql += `CREATE TABLE tab_variaty (vid INTEGER PRIMARY KEY, vname TEXT);\n`;
    sql += `CREATE TABLE tab_destination (did INTEGER PRIMARY KEY, dname TEXT);\n`;
    sql += `CREATE TABLE tab_batch (bid INTEGER PRIMARY KEY, bname TEXT, bvid INTEGER, bdate TEXT, bowei DECIMAL(10,3), bcwei DECIMAL(10,3), bstatus INTEGER, bcli TEXT, bmemo TEXT);\n`;
    sql += `CREATE TABLE tab_sending_record (sid INTEGER PRIMARY KEY AUTOINCREMENT, sstate INTEGER, splate TEXT, spinfo TEXT, sainfo TEXT, sdate TEXT, sftime TEXT, sdrpn TEXT, sdest INTEGER, smemo TEXT);\n\n`;

    // Data
    varieties.forEach(v => sql += `INSERT INTO tab_variaty VALUES (${v.vid}, '${v.vname}');\n`);
    destinations.forEach(d => sql += `INSERT INTO tab_destination VALUES (${d.did}, '${d.dname}');\n`);
    batches.forEach(b => sql += `INSERT INTO tab_batch VALUES (${b.bid}, '${b.bname}', ${b.bvid}, '${b.bdate}', ${b.bowei}, ${b.bcwei}, ${b.bstatus}, '${b.bcli}', '${b.bmemo}');\n`);
    records.forEach(r => sql += `INSERT INTO tab_sending_record VALUES (${r.sid}, ${r.sstate}, '${r.splate}', '${r.spinfo}', '${r.sainfo}', '${r.sdate}', '${r.sftime || ''}', '${r.sdrpn}', ${r.sdest}, '${r.smemo}');\n`);

    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotton_seed_db_${new Date().getTime()}.sql`;
    a.click();
  };

  const exportExcel = async () => {
    const allRecords = await db.tab_sending_record.toArray();
    // Filter for completed shipments only
    const records = allRecords.filter(r => r.sstate === ShipmentState.COMPLETED);
    
    const varieties = await db.tab_variaty.toArray();
    const destinations = await db.tab_destination.toArray();
    const batches = await db.tab_batch.toArray();

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
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} />
        </div>
        <h3 className="font-bold text-slate-800">数据安全与导出</h3>
        <p className="text-xs text-slate-400 px-4">所有数据均存储在本地浏览器中，无需网络即可使用。建议定期导出备份。</p>
      </div>

      <div className="grid gap-3">
        <button 
          onClick={exportSQL}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Database size={20} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-700">数据库信息导出</div>
            <div className="text-[10px] text-slate-400">生成 .sql 文件，包含所有表结构与数据</div>
          </div>
          <Download size={18} className="text-slate-300" />
        </button>

        <button 
          onClick={exportExcel}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-700">已完成出货信息 Excel 导出</div>
            <div className="text-[10px] text-slate-400">筛选已完成记录，按批次拆分行导出</div>
          </div>
          <Download size={18} className="text-slate-300" />
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[10px] text-slate-300">Cotton Seed Warehouse Management System © 2026</p>
      </div>
    </div>
  );
}
