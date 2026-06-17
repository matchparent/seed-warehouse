/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import { Variety, Destination, Batch, SendingRecord, Order, OrderStatusType, OrderCustomType, Warehouse, BatchModify, Bankcard, ConsumeRecord } from './types';

export class CottonSeedDB extends Dexie {
  tab_variaty!: Table<Variety, number>;
  tab_destination!: Table<Destination, number>;
  tab_batch!: Table<Batch, number>;
  tab_sending_record!: Table<SendingRecord, number>;
  tab_order_custom!: Table<OrderCustomType, number>;
  tab_orders!: Table<Order, number>;
  tab_user!: Table<{ uid?: number, spellname: string, key: string }, number>;
  tab_op_record!: Table<{ orid?: number, spellname: string, desc: string, optime: string }, number>;
  tab_warehouses!: Table<Warehouse, number>;
  tab_batch_modify!: Table<BatchModify, number>;
  tab_bankcards!: Table<Bankcard, number>;
  tab_consume_record!: Table<ConsumeRecord, number>;

  constructor() {
    super('CottonSeedDB');
    this.version(1).stores({
      tab_variaty: '++vid, vname',
      tab_destination: '++did, dname',
      tab_batch: '++bid, bname, bvid, bstatus, bdate',
      tab_sending_record: '++sid, sstate, sdate, splate, sdest, soid',
      tab_order_custom: '++ocid, occname',
      tab_orders: '++oid, status, ocdate, odest, octype',
      tab_user: '++uid, spellname, key',
      tab_op_record: '++orid, spellname, optime',
      tab_warehouses: 'wid, wname, wlocation',
      tab_batch_modify: '++bmid, bid, bmop, bmdate',
      tab_bankcards: '++bcid, bcno, bcbaname, bcdeleted',
      tab_consume_record: '++crid, crbcid, croper'
    });
  }
}

export const db = new CottonSeedDB();

let isInitializing = false;

// Initial data population
export async function initDB() {
  if (isInitializing) return;
  isInitializing = true;

  try {
    const varietyCount = await db.tab_variaty.count();
    if (varietyCount === 0) {
      await db.tab_variaty.bulkPut([
        { vid: 1, vname: '新陆中73号' },
        { vid: 2, vname: 'T115' },
        { vid: 3, vname: '鸿泰6636' },
        { vid: 4, vname: '草甘膦' }
      ]);
    }

    const destCount = await db.tab_destination.count();
    if (destCount === 0) {
      const uzbekStates = [
        '塔什干/Toshkent', '撒马尔罕/Samarqand', '布哈拉/Buxoro', '安集延/Andijon',
        '费尔干纳/Farg\'ona', '纳曼干/Namangan', '吉扎克/Jizzax', '卡什卡达里亚/Qashqadaryo',
        '苏尔汉河/Surxondaryo', '锡尔河/Sirdaryo', '纳沃伊/Navoiy', '花拉子模/Xorazm',
        '卡拉卡尔帕克斯坦/Qoraqalpog\'iston'
      ];
      await db.tab_destination.bulkPut(
        uzbekStates.map((name, i) => ({ did: i + 1, dname: name }))
      );
    }

    const userCount = await db.tab_user.count();
    if (userCount === 0) {
      await db.tab_user.add({
        spellname: 'BianJiang',
        key: 'U2FsdGVkX18mX9TVixXl9qnwMi9z2Mc6C1oaKzLc8Ow='
      });
    }

    const orderCustomCount = await db.tab_order_custom.count();
    if (orderCustomCount === 0 || orderCustomCount !== 6) {
      await db.tab_order_custom.clear();
      await db.tab_order_custom.bulkPut([
        { ocid: 1, occname: '政府', ocuname: 'Hukumat', ocename: 'Government' },
        { ocid: 2, occname: 'Cluster', ocuname: 'Klaster', ocename: 'Cluster' },
        { ocid: 3, occname: 'AKIS', ocuname: 'AKIS', ocename: 'AKIS' },
        { ocid: 4, occname: '散户', ocuname: 'Xususiy fermerlar', ocename: 'Private Farmer' },
        { ocid: 5, occname: '机构', ocuname: 'Tashkilot', ocename: 'Institution' },
        { ocid: 6, occname: '经销商', ocuname: 'Diler', ocename: 'Distributor' }
      ]);
    }

    const warehouseCount = await db.tab_warehouses.count();
    if (warehouseCount === 0) {
      await db.tab_warehouses.bulkPut([
        { wid: -1, wname: 'Sino-Uzbek Logistic', wlocation: 1 },
        { wid: -2, wname: 'Anasoy', wlocation: 7 },
        { wid: -3, wname: 'Bagdad', wlocation: 5 }
      ]);
    }

    // Migrate existing client-side batches with undefined, null, or 1 to -1 (Sino-Uzbek Logistic)
    const batches = await db.tab_batch.toArray();
    for (const b of batches) {
      if (b.bware === undefined || b.bware === null || b.bware === 1) {
        await db.tab_batch.update(b.bid!, { bware: -1 });
      }
    }

    // Migrate existing client-side sending records with undefined, null, or 1 to -1
    const records = await db.tab_sending_record.toArray();
    for (const r of records) {
      if (r.sware === undefined || r.sware === null || r.sware === 1) {
        await db.tab_sending_record.update(r.sid!, { sware: -1 });
      }
    }

    // Migrate existing client-side consume records with missing crtime
    const consumeRecords = await db.tab_consume_record.toArray();
    for (const cr of consumeRecords) {
      if (!cr.crtime) {
        const fallbackTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.tab_consume_record.update(cr.crid!, { crtime: fallbackTime });
      }
    }
  } finally {
    isInitializing = false;
  }
}
