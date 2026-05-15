/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db';
import { Database, FileSpreadsheet, Download, ShieldCheck, Server, Globe } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ShipmentState } from '../types';
import { dataService, DBMode } from '../lib/dataService';
import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

export default function OtherFragment() {
  const dbMode = dataService.getMode();
  const [mysqlStatus, setMysqlStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  useEffect(() => {
    if (dbMode === 'mysql') {
      checkMysql();
    }
  }, [dbMode]);

  const checkMysql = async () => {
    try {
      const res = await fetch('/api/db/status');
      const data = await res.json();
      setMysqlStatus(data.status === 'connected' ? 'connected' : 'disconnected');
    } catch {
      setMysqlStatus('disconnected');
    }
  };

  const exportSQL = async () => {
    const varieties = await dataService.getVarieties();
    const destinations = await dataService.getDestinations();
    const batches = await dataService.getBatches(false);
    const records = await dataService.getSendingRecords(false);
    // ... rest of exportSQL

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
    const allRecords = await dataService.getSendingRecords(false);
    const records = allRecords.filter(r => r.sstate === ShipmentState.COMPLETED);
    
    const varieties = await dataService.getVarieties();
    const destinations = await dataService.getDestinations();
    const batches = await dataService.getBatches(false);

    const rows: any[] = [];
    // ... rest of exportExcel logic is same
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
      {/* Database Status */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Server size={16} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-700">当前存储模式</h3>
        </div>
        
        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            dbMode === 'mysql' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
          )}>
            {dbMode === 'mysql' ? <Globe size={20} /> : <ShieldCheck size={20} />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-700">
              {dbMode === 'mysql' ? "远程数据库 (MySQL)" : "浏览器本地数据库 (Dexie)"}
            </div>
            <div className="text-[10px] text-slate-400">
              {dbMode === 'mysql' ? "系统已根据环境变量自动启用 MySQL 存储模式" : "未检测到远程数据库配置，当前使用本地存储模式"}
            </div>
          </div>
        </div>

        {dbMode === 'mysql' && (
          <div className={cn(
            "mt-2 p-2 rounded-lg text-[10px] flex items-center justify-between",
            mysqlStatus === 'connected' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            <div className="flex items-center gap-1">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", mysqlStatus === 'connected' ? "bg-emerald-500" : "bg-red-500")} />
              {mysqlStatus === 'connected' ? "MySQL 服务已连接" : "MySQL 服务连接异常，请检查后端配置"}
            </div>
            <button onClick={checkMysql} className="underline">立即重试</button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} />
        </div>
        <h3 className="font-bold text-slate-800">数据安全与导出</h3>
        <p className="text-xs text-slate-400 px-4">
          {dbMode === 'mysql' 
            ? "当前数据存储在 MySQL 远程服务器中，由后端系统统一管理。" 
            : "当前数据由于未检测到配置，存储在您的浏览器本地，建议定期导出备份。"}
        </p>
      </div>

      <div className="grid gap-3 pt-2">
        <button 
          onClick={() => {
            localStorage.removeItem('auth_user');
            window.location.reload();
          }}
          className="w-full py-4 bg-white border border-slate-100 text-red-500 rounded-2xl font-bold shadow-sm flex items-center justify-center gap-2"
        >
          <ShieldCheck size={18} />
          退出当前授权
        </button>
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
