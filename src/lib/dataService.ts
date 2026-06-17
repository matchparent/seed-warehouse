import { db } from '../db';
import { Variety, Destination, Batch, SendingRecord, Order, OrderStatus, OrderStatusType, STATIC_ORDER_STATUSES, OrderCustomType, Warehouse, BatchModify, Bankcard, ConsumeRecord } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect } from 'react';

export type DBMode = 'dexie' | 'mysql';

class DataService {
  private mode: DBMode = 'dexie';
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      console.log('[Client Database Connection Debug] Fetched info from server:', data);
      this.mode = data.dbMode || 'dexie';
      console.log('[Client Database Connection Debug] Active mode is:', this.mode);
    } catch (e) {
      console.error('[Client Database Connection Debug] Failed to fetch DB mode, defaulting to dexie', e);
      this.mode = 'dexie';
    }
    this.initialized = true;
  }

  private async log(description: string) {
    const userStr = localStorage.getItem('auth_user');
    if (!userStr) return;
    try {
      const user = JSON.parse(userStr);
      const logEntry = {
        spellname: user.spellname || 'unknown',
        desc: description,
        optime: new Date().toLocaleString()
      };

      if (this.mode === 'dexie') {
        await db.tab_op_record.add(logEntry);
      } else {
        await fetch('/api/tab_op_record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        });
      }
    } catch (e) {
      console.error('Logging failed', e);
    }
  }

  getMode(): DBMode {
    return this.mode;
  }

  async getVarieties(): Promise<Variety[]> {
    if (this.mode === 'dexie') {
      const data = await db.tab_variaty.toArray();
      return data.map(v => ({ ...v, vid: Number(v.vid) }));
    }
    const res = await fetch('/api/tab_variaty');
    const data = await res.json();
    return data.map((v: any) => ({
      ...v,
      vid: Number(v.vid)
    }));
  }

  async getDestinations(): Promise<Destination[]> {
    if (this.mode === 'dexie') {
      const data = await db.tab_destination.toArray();
      return data.map(d => ({ ...d, did: Number(d.did) }));
    }
    const res = await fetch('/api/tab_destination');
    const data = await res.json();
    return data.map((d: any) => ({
      ...d,
      did: Number(d.did)
    }));
  }

  async getWarehouses(): Promise<Warehouse[]> {
    if (this.mode === 'dexie') {
      const data = await db.tab_warehouses.toArray();
      return data.map(w => ({ ...w, wid: Number(w.wid), wlocation: Number(w.wlocation) }));
    }
    const res = await fetch('/api/tab_warehouses');
    const data = await res.json();
    return data.map((w: any) => ({
      ...w,
      wid: Number(w.wid),
      wlocation: Number(w.wlocation)
    }));
  }

  async getBatches(ordered = true): Promise<Batch[]> {
    const toNum = (v: any) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    if (this.mode === 'dexie') {
      const q = db.tab_batch;
      const data = await (ordered ? q.orderBy('bdate').reverse().toArray() : q.toArray());
      return data.map(b => ({
        ...b,
        bid: toNum(b.bid),
        bvid: toNum(b.bvid),
        bstatus: toNum(b.bstatus),
        bowei: toNum(b.bowei),
        bcwei: toNum(b.bcwei),
        bware: b.bware !== undefined && b.bware !== null ? toNum(b.bware) : -1
      }));
    }
    const res = await fetch(ordered ? '/api/tab_batch/ordered' : '/api/tab_batch');
    const data = await res.json();
    // Normalize decimals from MySQL
    return data.map((b: any) => ({
      ...b,
      bid: toNum(b.bid),
      bvid: toNum(b.bvid),
      bstatus: toNum(b.bstatus),
      bowei: toNum(b.bowei),
      bcwei: toNum(b.bcwei),
      bware: b.bware !== undefined && b.bware !== null ? toNum(b.bware) : -1
    }));
  }

  async getSendingRecords(ordered = true, date?: string): Promise<SendingRecord[]> {
    const toNum = (v: any) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    let data: any[];
    if (this.mode === 'dexie') {
      const q = date 
        ? db.tab_sending_record.where('sdate').equals(date).reverse()
        : db.tab_sending_record.orderBy('sdate').reverse();
      data = await q.toArray();
    } else {
      let url = ordered ? '/api/tab_sending_record/ordered' : '/api/tab_sending_record';
      if (date) url = `/api/tab_sending_record?sdate=${date}`;
      const res = await fetch(url);
      data = await res.json();
    }

    return data.map((r: any) => ({
      ...r,
      sid: toNum(r.sid),
      sstate: toNum(r.sstate),
      sdest: toNum(r.sdest),
      soid: r.soid ? toNum(r.soid) : undefined,
      sware: r.sware !== undefined && r.sware !== null ? toNum(r.sware) : -1
    }));
  }

  async addBatch(batch: Omit<Batch, 'bid'>): Promise<number> {
    let id: number;
    if (this.mode === 'dexie') {
      id = (await db.tab_batch.add(batch as Batch)) as number;
    } else {
      const res = await fetch('/api/tab_batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
      });
      const data = await res.json();
      id = data.bid;
    }
    await this.log(`新增批次: ${batch.bname} (${batch.bdate})`);
    return id;
  }

  async updateBatch(id: number, changes: Partial<Batch>): Promise<void> {
    if (this.mode === 'dexie') {
      await db.tab_batch.update(id, changes);
    } else {
      await fetch(`/api/tab_batch/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
    }
    await this.log(`更新批次 ID ${id}: ${JSON.stringify(changes)}`);
  }

  async deleteBatch(id: number): Promise<void> {
    if (this.mode === 'dexie') {
      await db.tab_batch.delete(id);
    } else {
      await fetch(`/api/tab_batch/${id}`, { method: 'DELETE' });
    }
    await this.log(`删除批次 ID ${id}`);
  }

  async addSendingRecord(record: Omit<SendingRecord, 'sid'>): Promise<number> {
    let id: number;
    if (this.mode === 'dexie') {
      id = (await db.tab_sending_record.add(record as SendingRecord)) as number;
    } else {
      const res = await fetch('/api/tab_sending_record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      const data = await res.json();
      id = data.sid;
    }
    await this.log(`新增发货单: 车牌 ${record.splate}, 日期 ${record.sdate}`);
    return id;
  }

  async updateSendingRecord(id: number, changes: Partial<SendingRecord>): Promise<void> {
    if (this.mode === 'dexie') {
      await db.tab_sending_record.update(id, changes);
    } else {
      await fetch(`/api/tab_sending_record/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
    }
    await this.log(`更新发货单 ID ${id}: ${JSON.stringify(changes)}`);
  }

  async deleteSendingRecord(id: number): Promise<void> {
    if (this.mode === 'dexie') {
      await db.tab_sending_record.delete(id);
    } else {
      await fetch(`/api/tab_sending_record/${id}`, { method: 'DELETE' });
    }
    await this.log(`删除发货单 ID ${id}`);
  }

  async getBatch(id: number): Promise<Batch | undefined> {
    if (this.mode === 'dexie') return db.tab_batch.get(id);
    const batches = await this.getBatches(false);
    return batches.find(b => b.bid === id);
  }

  async getSendingRecord(id: number): Promise<SendingRecord | undefined> {
    if (this.mode === 'dexie') return db.tab_sending_record.get(id);
    const records = await this.getSendingRecords(false);
    return records.find(r => r.sid === id);
  }

  async getOrderStatuses(): Promise<OrderStatusType[]> {
    return STATIC_ORDER_STATUSES;
  }

  async getOrderCustomTypes(): Promise<OrderCustomType[]> {
    if (this.mode === 'dexie') return db.tab_order_custom.toArray();
    const res = await fetch('/api/tab_order_custom');
    return res.json();
  }

  async getOrders(includeDeleted = false): Promise<Order[]> {
    const toNum = (v: any) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    let data: any[];
    if (this.mode === 'dexie') {
      const q = db.tab_orders;
      data = await q.orderBy('ocdate').reverse().toArray();
    } else {
      const res = await fetch('/api/tab_orders');
      data = await res.json();
    }

    const result = data.map((o: any) => ({
      ...o,
      oid: toNum(o.oid),
      status: toNum(o.status),
      odest: toNum(o.odest),
      octype: toNum(o.octype)
    }));

    return includeDeleted ? result : result.filter((o: any) => o.status !== 7);
  }

  async addOrder(order: Omit<Order, 'oid'>): Promise<number> {
    let id: number;
    if (this.mode === 'dexie') {
      id = (await db.tab_orders.add(order as Order)) as number;
    } else {
      const res = await fetch('/api/tab_orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      const data = await res.json();
      id = data.oid;
    }
    await this.log(`新增订单: 客户 ${order.ocname}, 日期 ${order.ocdate}`);
    return id;
  }

  async updateOrder(id: number, changes: Partial<Order>): Promise<void> {
    if (this.mode === 'dexie') {
      await db.tab_orders.update(id, changes);
    } else {
      await fetch(`/api/tab_orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
    }
    await this.log(`更新订单 ID ${id}: ${JSON.stringify(changes)}`);
  }

  async deleteOrder(id: number): Promise<void> {
    // Logical delete
    await this.updateOrder(id, { status: OrderStatus.DELETED });
    await this.log(`删除订单 ID ${id} (逻辑删除)`);
  }

  async verifyUser(spellname: string, key: string): Promise<boolean> {
    if (this.mode === 'dexie') {
      const user = await db.tab_user.where({ spellname, key }).first();
      return !!user;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spellname, key })
      });
      const data = await res.json();
      return data.success === true;
    } catch (e) {
      console.error('Login verification failed', e);
      return false;
    }
  }

  async addBatchModify(record: Omit<BatchModify, 'bmid'>): Promise<number> {
    let id: number;
    if (this.mode === 'dexie') {
      id = (await db.tab_batch_modify.add(record as BatchModify)) as number;
    } else {
      const res = await fetch('/api/tab_batch_modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      const data = await res.json();
      id = data.bmid;
    }
    await this.log(`批次修改: 批次 ID ${record.bid}, 类型 ${record.bmop === 1 ? '库存补充' : '损耗/赠予'}, 数量 ${record.bmvolume}t`);
    window.dispatchEvent(new CustomEvent('batch_modify_changed'));
    return id;
  }

  async getBatchModifications(): Promise<BatchModify[]> {
    const toNum = (v: any) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    let data: any[];
    if (this.mode === 'dexie') {
      data = await db.tab_batch_modify.toArray();
    } else {
      const res = await fetch('/api/tab_batch_modify');
      data = await res.json();
    }

    return data.map((bm: any) => ({
      ...bm,
      bmid: toNum(bm.bmid),
      bid: toNum(bm.bid),
      bmop: toNum(bm.bmop),
      bmvolume: toNum(bm.bmvolume)
    }));
  }

  async getBankcards(includeDeleted = false): Promise<Bankcard[]> {
    const toNum = (v: any) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    let data: any[];
    if (this.mode === 'dexie') {
      data = await db.tab_bankcards.toArray();
    } else {
      const res = await fetch('/api/tab_bankcards');
      data = await res.json();
    }

    const result = data.map((bc: any) => ({
      ...bc,
      bcid: toNum(bc.bcid),
      bcbalance: toNum(bc.bcbalance),
      bcdeleted: toNum(bc.bcdeleted)
    }));

    return includeDeleted ? result : result.filter((bc: any) => bc.bcdeleted !== 1);
  }

  async addBankcard(bankcard: Omit<Bankcard, 'bcid'>): Promise<number> {
    let id: number;
    if (this.mode === 'dexie') {
      id = (await db.tab_bankcards.add(bankcard as Bankcard)) as number;
    } else {
      const res = await fetch('/api/tab_bankcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankcard)
      });
      const data = await res.json();
      id = data.bcid;
    }
    await this.log(`新增银行卡/现金: ${bankcard.bcbaname} (${bankcard.bcno})`);
    window.dispatchEvent(new CustomEvent('bankcards_changed'));
    return id;
  }

  async updateBankcard(id: number, changes: Partial<Bankcard>): Promise<void> {
    if (this.mode === 'dexie') {
      await db.tab_bankcards.update(id, changes);
    } else {
      await fetch(`/api/tab_bankcards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
    }
    await this.log(`更新银行卡/现金 ID ${id}: ${JSON.stringify(changes)}`);
    window.dispatchEvent(new CustomEvent('bankcards_changed'));
  }

  async deleteBankcard(id: number): Promise<void> {
    await this.updateBankcard(id, { bcdeleted: 1 });
    await this.log(`删除银行卡/现金 ID ${id}`);
    window.dispatchEvent(new CustomEvent('bankcards_changed'));
  }

  async getConsumeRecords(): Promise<ConsumeRecord[]> {
    const toNum = (v: any) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    let data: any[];
    if (this.mode === 'dexie') {
      data = await db.tab_consume_record.toArray();
    } else {
      const res = await fetch('/api/tab_consume_record');
      data = await res.json();
    }

    return data.map((cr: any) => ({
      ...cr,
      crid: toNum(cr.crid),
      crbcid: toNum(cr.crbcid),
      cramount: toNum(cr.cramount),
      crscaned: toNum(cr.crscaned)
    }));
  }

  async addConsumeRecord(record: Omit<ConsumeRecord, 'crid'>): Promise<number> {
    const defaultTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const recordWithTime = {
      crtime: defaultTime,
      ...record
    };
    
    let id: number;
    if (this.mode === 'dexie') {
      id = (await db.tab_consume_record.add(recordWithTime as ConsumeRecord)) as number;
    } else {
      const res = await fetch('/api/tab_consume_record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordWithTime)
      });
      const data = await res.json();
      id = data.crid;
    }
    await this.log(`新增消费流水: 金额 ${record.cramount}, 说明 ${record.crmemo}`);
    window.dispatchEvent(new CustomEvent('consume_records_changed'));
    return id;
  }

  async updateConsumeRecord(id: number, changes: Partial<ConsumeRecord>): Promise<void> {
    if (this.mode === 'dexie') {
      await db.tab_consume_record.update(id, changes);
    } else {
      await fetch(`/api/tab_consume_record/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
    }
    await this.log(`更新消费流水 ID ${id}: ${JSON.stringify(changes)}`);
    window.dispatchEvent(new CustomEvent('consume_records_changed'));
  }
}

export const dataService = new DataService();

export function useVarieties() {
  const toNum = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const dexieData = useLiveQuery(() => db.tab_variaty.toArray().then(data => data.map(v => ({ ...v, vid: toNum(v.vid) }))));
  const [mysqlData, setMysqlData] = useState<Variety[] | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql') dataService.getVarieties().then(setMysqlData); }, []);
  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useDestinations() {
  const toNum = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const dexieData = useLiveQuery(() => db.tab_destination.toArray().then(data => data.map(d => ({ ...d, did: toNum(d.did) }))));
  const [mysqlData, setMysqlData] = useState<Destination[] | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql') dataService.getDestinations().then(setMysqlData); }, []);
  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useBatches(ordered = true) {
  const toNum = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const dexieData = useLiveQuery(() => {
    const q = db.tab_batch;
    return (ordered ? q.orderBy('bdate').reverse().toArray() : q.toArray()).then(data => 
      data.map(b => ({
        ...b,
        bid: toNum(b.bid),
        bvid: toNum(b.bvid),
        bstatus: toNum(b.bstatus),
        bowei: toNum(b.bowei),
        bcwei: toNum(b.bcwei),
        bware: b.bware !== undefined && b.bware !== null ? toNum(b.bware) : -1
      }))
    );
  }, [ordered]);
  const [mysqlData, setMysqlData] = useState<Batch[] | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql') dataService.getBatches(ordered).then(setMysqlData); }, [ordered]);
  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useSendingRecords(ordered = true, date?: string) {
  const toNum = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const dexieData = useLiveQuery(() => {
    const q = date 
      ? db.tab_sending_record.where('sdate').equals(date).reverse()
      : db.tab_sending_record.orderBy('sdate').reverse();
    return q.toArray().then(data => data.map(r => ({
      ...r,
      sid: toNum(r.sid),
      sstate: toNum(r.sstate),
      sdest: toNum(r.sdest),
      soid: r.soid ? toNum(r.soid) : undefined,
      sware: r.sware !== undefined && r.sware !== null ? toNum(r.sware) : -1
    })));
  }, [ordered, date]);
  const [mysqlData, setMysqlData] = useState<SendingRecord[] | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql') dataService.getSendingRecords(ordered, date).then(setMysqlData); }, [ordered, date]);
  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useWarehouses() {
  const toNum = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const dexieData = useLiveQuery(() => db.tab_warehouses.toArray().then(data => data.map(w => ({ ...w, wid: toNum(w.wid), wlocation: toNum(w.wlocation) }))));
  const [mysqlData, setMysqlData] = useState<Warehouse[] | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql') dataService.getWarehouses().then(setMysqlData); }, []);
  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useBatch(id: number | null) {
  const dexieData = useLiveQuery(() => id ? db.tab_batch.get(id) : undefined, [id]);
  const [mysqlData, setMysqlData] = useState<Batch | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql' && id) dataService.getBatch(id).then(setMysqlData); }, [id]);
  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useSendingRecord(id: number | null) {
  const dexieData = useLiveQuery(() => id ? db.tab_sending_record.get(id) : undefined, [id]);
  const [mysqlData, setMysqlData] = useState<SendingRecord | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql' && id) dataService.getSendingRecord(id).then(setMysqlData); }, [id]);
  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useOrders(includeDeleted = false) {
  const toNum = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const dexieData = useLiveQuery(() => 
    db.tab_orders.orderBy('ocdate').reverse().toArray().then(data => 
      data.map(o => ({
        ...o,
        oid: toNum(o.oid),
        status: toNum(o.status),
        odest: toNum(o.odest),
        octype: toNum(o.octype)
      })).filter(o => includeDeleted || o.status !== 7)
    ), [includeDeleted]);

  const [mysqlData, setMysqlData] = useState<Order[] | undefined>(undefined);
  useEffect(() => { 
    if (dataService.getMode() === 'mysql') {
      dataService.getOrders(includeDeleted).then(setMysqlData);
    }
  }, [includeDeleted]);

  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useOrderStatuses() {
  return STATIC_ORDER_STATUSES;
}

export function useOrderCustomTypes() {
  const dexieData = useLiveQuery(() => db.tab_order_custom.toArray());
  const [mysqlData, setMysqlData] = useState<OrderCustomType[] | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql') dataService.getOrderCustomTypes().then(setMysqlData); }, []);
  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useBatchModifications() {
  const toNum = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const dexieData = useLiveQuery(() => 
    db.tab_batch_modify.toArray().then(data => data.map(bm => ({
      ...bm,
      bmid: toNum(bm.bmid),
      bid: toNum(bm.bid),
      bmop: toNum(bm.bmop),
      bmvolume: toNum(bm.bmvolume)
    })))
  );
  const [mysqlData, setMysqlData] = useState<BatchModify[] | undefined>(undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleRefresh = () => setTick(t => t + 1);
    window.addEventListener('batch_modify_changed', handleRefresh);
    return () => window.removeEventListener('batch_modify_changed', handleRefresh);
  }, []);

  useEffect(() => { 
    if (dataService.getMode() === 'mysql') {
      dataService.getBatchModifications().then(setMysqlData); 
    }
  }, [tick]);

  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useBankcards(includeDeleted = false) {
  const dexieData = useLiveQuery(() => 
    db.tab_bankcards.toArray().then(data => 
      data.map(bc => ({
        ...bc,
        bcid: Number(bc.bcid),
        bcbalance: Number(bc.bcbalance),
        bcdeleted: Number(bc.bcdeleted)
      })).filter(bc => includeDeleted || bc.bcdeleted !== 1)
    ), [includeDeleted]);

  const [mysqlData, setMysqlData] = useState<Bankcard[] | undefined>(undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleRefresh = () => setTick(t => t + 1);
    window.addEventListener('bankcards_changed', handleRefresh);
    return () => window.removeEventListener('bankcards_changed', handleRefresh);
  }, []);

  useEffect(() => {
    if (dataService.getMode() === 'mysql') {
      dataService.getBankcards(includeDeleted).then(setMysqlData);
    }
  }, [tick, includeDeleted]);

  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useConsumeRecords() {
  const dexieData = useLiveQuery(() => 
    db.tab_consume_record.toArray().then(data => 
      data.map(cr => ({
        ...cr,
        crid: Number(cr.crid),
        crbcid: Number(cr.crbcid),
        cramount: Number(cr.cramount),
        crscaned: Number(cr.crscaned)
      }))
    ));

  const [mysqlData, setMysqlData] = useState<ConsumeRecord[] | undefined>(undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleRefresh = () => setTick(t => t + 1);
    window.addEventListener('consume_records_changed', handleRefresh);
    return () => window.removeEventListener('consume_records_changed', handleRefresh);
  }, []);

  useEffect(() => {
    if (dataService.getMode() === 'mysql') {
      dataService.getConsumeRecords().then(setMysqlData);
    }
  }, [tick]);

  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}
