/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db';
import * as XLSX from 'xlsx';
import { ShipmentState } from '../types';
import { dataService, useWarehouses, useDestinations } from '../lib/dataService';
import { useI18n, Language } from '../lib/i18n';
import { Database, FileSpreadsheet, Download, ShieldCheck, Languages, AlertCircle, Plus, Home } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';

export default function OtherFragment() {
  const { t, lang, setLang } = useI18n();
  const [showSQLConfirm, setShowSQLConfirm] = useState(false);
  const [showExcelConfirm, setShowExcelConfirm] = useState(false);

  const warehouses = useWarehouses();
  const destinations = useDestinations();
  const [currentWarehouseId, setCurrentWarehouseId] = useState(() => localStorage.getItem('current_warehouse_id') || 'all');

  const handleWarehouseChange = (id: string) => {
    setCurrentWarehouseId(id);
    localStorage.setItem('current_warehouse_id', id);
    window.dispatchEvent(new Event('warehouse_changed'));
  };

  const exportSQL = async () => {
    setShowSQLConfirm(false);
    const varieties = await dataService.getVarieties();
    const destinations = await dataService.getDestinations();
    const batches = await dataService.getBatches(false);
    const records = await dataService.getSendingRecords(false);
    const orderCustomTypes = await dataService.getOrderCustomTypes();
    const orders = await dataService.getOrders(true);
    const warehouses = await dataService.getWarehouses();
    const modifications = await dataService.getBatchModifications();
    const bankcards = await dataService.getBankcards(true);
    const consumeRecords = await dataService.getConsumeRecords();
    
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

    // Schema with full table and column semantic documentation
    sql += `-- ==========================================================\n`;
    sql += `-- 1. tab_variaty : 棉种品种表 / Cotton Seed Varieties Table\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_variaty (\n`;
    sql += `  vid INTEGER PRIMARY KEY AUTO_INCREMENT, -- 品种ID (自增主键) / Variety unique ID\n`;
    sql += `  vname TEXT                             -- 品种名称 / Variety display name\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 2. tab_destination : 运输目的地城市表 / Destinations Table\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_destination (\n`;
    sql += `  did INTEGER PRIMARY KEY AUTO_INCREMENT, -- 目的地ID (自增主键) / Destination unique ID\n`;
    sql += `  dname TEXT                             -- 目的地城市名称 / Destination/City name\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 3. tab_batch : 棉种物料批次表 / Cotton Seed Batches Table\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_batch (\n`;
    sql += `  bid INTEGER PRIMARY KEY AUTO_INCREMENT, -- 批次ID (自增主键) / Batch unique ID\n`;
    sql += `  bname TEXT,                             -- 批次编号/名称 / Batch display name/serial\n`;
    sql += `  bvid INTEGER,                           -- 关联品种ID (外键, 关联 tab_variaty.vid) / Variety relation ID\n`;
    sql += `  bdate TEXT,                             -- 进库/录入日期 / Batch registration date\n`;
    sql += `  bowei DECIMAL(10,3),                    -- 原始入库重量（吨） / Original batch total weight in tons\n`;
    sql += `  bcwei DECIMAL(10,3),                    -- 当前剩余库存重量（吨） / Current remaining material stock in tons\n`;
    sql += `  bstatus INTEGER,                        -- 质检审核状态: 0=驳回/不合格, 1=已审核安全通过, 2=转运在途待目的仓确认 / Status: 0=Rejected, 1=Approved, 2=In transit (transfer matching)\n`;
    sql += `  bcli TEXT,                              -- 进库运输卡车车牌号 / Delivering truck license plate\n`;
    sql += `  bmemo TEXT,                             -- 批次录入备注 / Optional batch specific remarks\n`;
    sql += `  bware INTEGER                           -- 存储货仓ID (外键, 关联 tab_warehouses.wid) / Current storage warehouse ID\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 4. tab_sending_record : 提货与发货出库状态流转表 / Shipment & Dispatch Records Table\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_sending_record (\n`;
    sql += `  sid INTEGER PRIMARY KEY AUTO_INCREMENT, -- 发货记录ID (自增主键) / Shipment unique ID\n`;
    sql += `  sstate INTEGER,                         -- 发货状态代码: 1=新创建, 2=已分配配置, 3=已完成核验出库, 4=已撤回撤销 / Shipment State: 1=New, 2=Allocated, 3=Completed, 4=Withdrawn\n`;
    sql += `  splate TEXT,                            -- 提货运输车辆车牌号 / Pick-up truck license plate\n`;
    sql += `  spinfo TEXT,                            -- 计划配置物料列表 (数据格式: "品种ID/重量(吨),品种ID/重量,...") / Planned loading: "vid/weight,vid/weight..."\n`;
    sql += `  sainfo TEXT,                            -- 实际扣除批次配置列表 (数据格式: "批次ID/重量(吨),批次ID/重量,...") / Actual deducted batches: "bid/weight,bid/weight..."\n`;
    sql += `  sdate TEXT,                             -- 提货日期 / Scheduled pickup date\n`;
    sql += `  sftime TEXT,                            -- 最终核验出仓完成时间 / Outbound final completion timestamp\n`;
    sql += `  sdrpn TEXT,                             -- 提货司机联系电话 / Driver's phone number\n`;
    sql += `  sdest INTEGER,                          -- 目的地ID (外键, 关联 tab_destination.did) / Destination reference ID\n`;
    sql += `  smemo TEXT,                             -- 运输出库物流备注 / Shipping dispatcher notes\n`;
    sql += `  soid INTEGER,                           -- 关联销售订单ID (外键, 关联 tab_orders.oid) / Associated business order ID\n`;
    sql += `  sware INTEGER                           -- 所提出的货仓网点ID (外键, 关联 tab_warehouses.wid) / Source physical warehouse ID\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 5. tab_order_custom : 客户属性分类字典表 (常量定义) / Customer Type Categories Definitions\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_order_custom (\n`;
    sql += `  ocid INTEGER PRIMARY KEY AUTO_INCREMENT, -- 客户分类ID (自增主键, 1=政府, 2=Cluster, 3=AKIS, 4=散户, 5=机构, 6=经销商) / Customer category ID\n`;
    sql += `  occname TEXT,                           -- 客户类别中文标签 / Chinese name\n`;
    sql += `  ocuname TEXT,                           -- 客户类别乌兹别克语标签 / Uzbek name\n`;
    sql += `  ocename TEXT                            -- 客户类别英语标签 / English name\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 6. tab_orders : 销售商务订单清单表 / Business Sales Orders Table\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_orders (\n`;
    sql += `  oid INTEGER PRIMARY KEY AUTO_INCREMENT, -- 订单ID (自增主键) / Order sequence ID\n`;
    sql += `  status INTEGER,                         -- 订单状态代码 (0=已删除, 1=有意愿, 2=已签约, 3=已付定金, 4=已付全款, 5=已完成, 6=已退款) / Status reference key\n`;
    sql += `  ocdate TEXT,                            -- 下单签约日期 / Contract signup date\n`;
    sql += `  odest INTEGER,                          -- 订单交付目的城市 (外键, 关联 tab_destination.did) / Delivering destination city ID\n`;
    sql += `  octype INTEGER,                         -- 客户属性分类ID (外键, 关联 tab_order_custom.ocid) / Customer type reference key\n`;
    sql += `  ocname TEXT,                            -- 采购客户姓名 / 采购单位名称 / Customer or company name\n`;
    sql += `  ocphone TEXT,                           -- 客户业务联系电话 / Customer contact phone number\n`;
    sql += `  otr TEXT,                               -- 订单协议应收货运货款（文本数值） / Agreed amount receivables (string decimal format)\n`;
    sql += `  otrc INTEGER,                           -- 应收款支付货币单位 (1=UZS 乌兹别克斯坦苏姆, 2=USD 美元, 3=CNY 人民币) / Currency type code for receivables\n`;
    sql += `  ossgi TEXT,                             -- 采购意向品种和指标规定总量配额 (数据格式: "品种ID/设计需量(吨),品种ID/设计需量,...") / Demands quota list: "vid/qty,vid/qty"\n`;
    sql += `  oconid TEXT,                            -- 签约销售合同号 / Sales contract identification reference string\n`;
    sql += `  oconfn TEXT,                            -- 合同文本附件原始文件名 / Contract attached file logical name\n`;
    sql += `  oarp TEXT,                              -- 销售合同实际已付总账款金额（文本数值） / Total cumulative received payments so far\n`;
    sql += `  oard TEXT,                              -- 合同约定或已付首期定金（文本数值） / Down payment/deposit received amount\n`;
    sql += `  oarr TEXT,                              -- 合同剩余约定尾款或最新已付尾款 / Late balance received amount\n`;
    sql += `  oarpc INTEGER,                          -- 合同实收款计量货币单位 (1=UZS, 2=USD, 3=CNY) / Currency type code for actual cash inflow\n`;
    sql += `  ogsented TEXT,                          -- 针对该单已累计核验出仓发货总量配额 (数据格式: "品种ID/已发量(吨),...") / Dispatched progress tracker: "vid/qty,vid/qty"\n`;
    sql += `  omemo TEXT,                             -- 商务订单物流备注/财务说明 / Business remarks or exceptions notes\n`;
    sql += `  orf TEXT,                               -- 退款金额 / Refund amount\n`;
    sql += `  orfc INTEGER                            -- 退款结算货币 / Refund currency code\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 8. tab_user : 系统授权管理操作人员表 / Authorized Users Codebook\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_user (\n`;
    sql += `  uid INTEGER PRIMARY KEY AUTO_INCREMENT, -- 操作员用户自增主键 / Authorized operator user ID\n`;
    sql += `  spellname TEXT,                         -- 用户姓名拼音(拼进日志和记录) / Operator login/spell name\n`;
    sql += `  \`key\` TEXT                              -- 访问身份口令/验证安全Key / Passcode or sign-in fingerprint key\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 9. tab_op_record : 系统历史业务操作审计日志表 / Operation Audit Trail Logs\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_op_record (\n`;
    sql += `  orid INTEGER PRIMARY KEY AUTO_INCREMENT, -- 日志主键 / Operations logger sequence id\n`;
    sql += `  spellname TEXT,                         -- 执行该操作的登录操作员拼音 / Responsible operator name\n`;
    sql += `  \`desc\` TEXT,                            -- 操作事件的详细说明记录 / Plain text actions description\n`;
    sql += `  optime TEXT                             -- 操作发生当时的时标记录 / Precise system timestamp\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 10. tab_warehouses : 授权存储分支货仓信息表 / Physical Warehouses Table\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_warehouses (\n`;
    sql += `  wid INTEGER PRIMARY KEY,                -- 货仓唯一ID (主仓库默认为 -1 标识 Sino-Uzbek) / Unique warehouse code\n`;
    sql += `  wname TEXT,                             -- 货仓网点展示名称 / Warehouse location brand name\n`;
    sql += `  wlocation INTEGER                       -- 货仓所属的物理地级市ID (外键, 关联 tab_destination.did) / City locality mapping key\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 11. tab_batch_modify : 棉种批次库存手工调整与损耗记录表 / Batch Modify Record Table\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_batch_modify (\n`;
    sql += `  bmid INTEGER PRIMARY KEY AUTO_INCREMENT, -- 调整记录自增主键 / Modification log unique ID\n`;
    sql += `  bid INTEGER,                           -- 关联批次ID (外键, 关联 tab_batch.bid) / Batch ID reference\n`;
    sql += `  bmop INTEGER,                          -- 操作类型 (1=手工补充/加码, 2=损耗/减码) / Operation Type (1=replenish, 2=loss)\n`;
    sql += `  bmvolume DECIMAL(10,3),                -- 数量（吨） / Adjustment amount in tons\n`;
    sql += `  bmmemo TEXT,                           -- 调整备注 / Adjustment remarks and reasons\n`;
    sql += `  bmdate TEXT                            -- 调整日期 / Adjustment timestamp or date\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 12. tab_bankcards : 财务管理银行卡及现金账户表 / Financial Bankcards & Accounts Table\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_bankcards (\n`;
    sql += `  bcid INTEGER PRIMARY KEY AUTO_INCREMENT, -- 卡片物理唯一ID (自增主键) / Card unique ID\n`;
    sql += `  bcno TEXT,                              -- 账号/卡号/尾号 / Account or card number\n`;
    sql += `  bcbalance INTEGER,                      -- 账户实时余额 / Account current balance\n`;
    sql += `  bcbaname TEXT,                          -- 账号账户简称/开户名称 / Bankcard custom display nickname\n`;
    sql += `  bcdeleted INTEGER DEFAULT 0             -- 逻辑删除标志 (0=正常, 1=已删除) / Soft-deletion indicator\n`;
    sql += `);\n\n`;

    sql += `-- ==========================================================\n`;
    sql += `-- 13. tab_consume_record : 财务管理消费与支出流水记录表 / Expense/Consume Records Table\n`;
    sql += `-- ==========================================================\n`;
    sql += `CREATE TABLE tab_consume_record (\n`;
    sql += `  crid INTEGER PRIMARY KEY AUTO_INCREMENT, -- 消费流水自增ID / Consume entry sequence unique ID\n`;
    sql += `  crbcid INTEGER,                         -- 对应关联银行卡ID (外键, 关联 tab_bankcards.bcid) / Bound card ID comparison reference\n`;
    sql += `  croper TEXT,                            -- 申请支取的操作经办员拼音姓名 / Action representative spellname\n`;
    sql += `  cramount INTEGER,                       -- 消费金额 / Actual transaction cost amount\n`;
    sql += `  crmemo TEXT,                            -- 消费用途备注及核对说明 / Expense detailed explanation\n`;
    sql += `  crqrcode TEXT,                          -- 发票/收据二维码扫描纯文本值 / Raw scanned invoice/receipt QR metadata\n`;
    sql += `  crscaned INTEGER DEFAULT 0,             -- 会计财务确认审核收录归档状态 (0=未核对收录, 1=财务已核毕入账) / Filing accounting check-off archive flag\n`;
    sql += `  crtime TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 消费时间(精确到秒) / System precise autogen timestamp\n`;
    sql += `);\n\n`;

    // Data
    varieties.forEach(v => sql += `INSERT INTO tab_variaty VALUES (${v.vid}, '${esc(v.vname)}');\n`);
    destinations.forEach(d => sql += `INSERT INTO tab_destination VALUES (${d.did}, '${esc(d.dname)}');\n`);
    batches.forEach(b => sql += `INSERT INTO tab_batch VALUES (${b.bid}, '${esc(b.bname)}', ${b.bvid}, '${esc(b.bdate)}', ${b.bowei}, ${b.bcwei}, ${b.bstatus}, '${esc(b.bcli)}', '${esc(b.bmemo)}', ${b.bware !== undefined ? b.bware : -1});\n`);
    records.forEach(r => sql += `INSERT INTO tab_sending_record VALUES (${r.sid}, ${r.sstate}, '${esc(r.splate)}', '${esc(r.spinfo)}', '${esc(r.sainfo)}', '${esc(r.sdate)}', '${esc(r.sftime)}', '${esc(r.sdrpn)}', ${r.sdest}, '${esc(r.smemo)}', ${r.soid !== undefined ? r.soid : 'NULL'}, ${r.sware !== undefined ? r.sware : -1});\n`);
    orderCustomTypes.forEach(oc => sql += `INSERT INTO tab_order_custom VALUES (${oc.ocid}, '${esc(oc.occname)}', '${esc(oc.ocuname)}', '${esc(oc.ocename)}');\n`);
    orders.forEach(o => sql += `INSERT INTO tab_orders VALUES (${o.oid}, ${o.status}, '${esc(o.ocdate)}', ${o.odest}, ${o.octype}, '${esc(o.ocname)}', '${esc(o.ocphone)}', '${esc(o.otr)}', ${o.otrc ?? 1}, '${esc(o.ossgi)}', '${esc(o.oconid)}', '${esc(o.oconfn)}', '${esc(o.oarp)}', '${esc(o.oard)}', '${esc(o.oarr)}', ${o.oarpc ?? 1}, '${esc(o.ogsented)}', '${esc(o.omemo)}');\n`);
    users.forEach(u => sql += `INSERT INTO tab_user VALUES (${u.uid}, '${esc(u.spellname)}', '${esc(u.key)}');\n`);
    logs.forEach(l => sql += `INSERT INTO tab_op_record VALUES (${l.orid}, '${esc(l.spellname)}', '${esc(l.desc)}', '${esc(l.optime)}');\n`);
    warehouses.forEach(w => sql += `INSERT INTO tab_warehouses VALUES (${w.wid}, '${esc(w.wname)}', ${w.wlocation});\n`);
    modifications.forEach(bm => sql += `INSERT INTO tab_batch_modify VALUES (${bm.bmid}, ${bm.bid}, ${bm.bmop}, ${bm.bmvolume}, ${bm.bmmemo ? `'${esc(bm.bmmemo)}'` : 'NULL'}, '${esc(bm.bmdate)}');\n`);
    bankcards.forEach(bc => sql += `INSERT INTO tab_bankcards VALUES (${bc.bcid}, '${esc(bc.bcno)}', ${bc.bcbalance}, '${esc(bc.bcbaname)}', ${bc.bcdeleted});\n`);
    consumeRecords.forEach(cr => {
      const escapedTime = cr.crtime ? esc(cr.crtime) : new Date().toISOString().replace('T', ' ').substring(0, 19);
      sql += `INSERT INTO tab_consume_record (crid, crbcid, croper, cramount, crmemo, crqrcode, crscaned, crtime) VALUES (${cr.crid}, ${cr.crbcid}, '${esc(cr.croper)}', ${cr.cramount}, '${esc(cr.crmemo)}', '${esc(cr.crqrcode)}', ${cr.crscaned}, '${escapedTime}');\n`;
    });

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
        {/* Active Warehouse Switching Card */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Home size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-700">切换仓库 / Active Warehouse</div>
              <div className="text-[10px] text-slate-400">切换当前进行中和管理的源货仓 / Toggle current focus warehouse</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => handleWarehouseChange('all')}
              className={cn(
                "py-3 px-4 rounded-xl text-xs font-bold transition-all border text-left flex justify-between items-center cursor-pointer",
                currentWarehouseId === 'all'
                  ? "bg-slate-800 text-white border-slate-800 shadow"
                  : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
              )}
            >
              <span>全部仓库 / All Warehouses</span>
              <span className="text-[10px] opacity-75 font-mono">ALL</span>
            </button>
            {warehouses?.map(w => {
              const dest = destinations?.find(d => d.did === w.wlocation);
              const isSelected = currentWarehouseId === String(w.wid);
              return (
                <button
                  key={w.wid}
                  onClick={() => handleWarehouseChange(String(w.wid))}
                  className={cn(
                    "py-3 px-4 rounded-xl text-xs font-bold transition-all border text-left flex flex-col gap-0.5 cursor-pointer",
                    isSelected
                      ? "bg-slate-800 text-white border-slate-800 shadow"
                      : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                  )}
                >
                  <span className="truncate">{dest ? dest.dname : 'Location'}</span>
                  <span className={cn("text-[10px] font-mono truncate", isSelected ? "text-emerald-300" : "text-slate-400")}>{w.wname}</span>
                </button>
              );
            })}
          </div>
        </div>

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
