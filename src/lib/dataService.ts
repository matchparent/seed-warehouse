import { db } from '../db';
import { Variety, Destination, Batch, SendingRecord, Order, OrderStatusType, OrderCustomType } from '../types';
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
      this.mode = data.dbMode || 'dexie';
    } catch (e) {
      console.error('Failed to fetch DB mode, defaulting to dexie', e);
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
        bcwei: toNum(b.bcwei)
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
      bcwei: toNum(b.bcwei)
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
      soid: r.soid ? toNum(r.soid) : undefined
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
    if (this.mode === 'dexie') return db.tab_order_status.toArray();
    const res = await fetch('/api/tab_order_status');
    return res.json();
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
    await this.updateOrder(id, { status: 7 });
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
        bcwei: toNum(b.bcwei)
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
      soid: r.soid ? toNum(r.soid) : undefined
    })));
  }, [ordered, date]);
  const [mysqlData, setMysqlData] = useState<SendingRecord[] | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql') dataService.getSendingRecords(ordered, date).then(setMysqlData); }, [ordered, date]);
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
  const dexieData = useLiveQuery(() => db.tab_order_status.toArray());
  const [mysqlData, setMysqlData] = useState<OrderStatusType[] | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql') dataService.getOrderStatuses().then(setMysqlData); }, []);
  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}

export function useOrderCustomTypes() {
  const dexieData = useLiveQuery(() => db.tab_order_custom.toArray());
  const [mysqlData, setMysqlData] = useState<OrderCustomType[] | undefined>(undefined);
  useEffect(() => { if (dataService.getMode() === 'mysql') dataService.getOrderCustomTypes().then(setMysqlData); }, []);
  return dataService.getMode() === 'dexie' ? dexieData : mysqlData;
}
