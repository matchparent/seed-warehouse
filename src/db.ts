/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import { Variety, Destination, Batch, SendingRecord } from './types';

export class CottonSeedDB extends Dexie {
  tab_variaty!: Table<Variety, number>;
  tab_destination!: Table<Destination, number>;
  tab_batch!: Table<Batch, number>;
  tab_sending_record!: Table<SendingRecord, number>;
  tab_user!: Table<{ uid?: number, spellname: string, key: string }, number>;
  tab_record!: Table<{ rid?: number, spellname: string, desc: string, optime: string }, number>;

  constructor() {
    super('CottonSeedDB');
    this.version(1).stores({
      tab_variaty: '++vid, vname',
      tab_destination: '++did, dname',
      tab_batch: '++bid, bname, bvid, bstatus, bdate',
      tab_sending_record: '++sid, sstate, sdate, splate, sdest',
      tab_user: '++uid, spellname, key',
      tab_record: '++rid, spellname, optime'
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
        { vid: 3, vname: '鸿泰6636' }
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
  } finally {
    isInitializing = false;
  }
}
