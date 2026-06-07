/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Variety {
  vid: number;
  vname: string;
}

export interface Destination {
  did: number;
  dname: string;
}

export interface Batch {
  bid?: number;
  bname: string;
  bvid: number;
  bdate: string;
  bowei: number; // Total weight
  bcwei: number; // Current weight
  bstatus: number; // 0: No, 1: Yes
  bcli: string; // Truck plate
  bmemo: string;
}

export enum ShipmentState {
  NEW = 1,
  ALLOCATED = 2,
  COMPLETED = 3,
  WITHDRAWN = 4,
}

export enum OrderStatus {
  INTENTIONAL = 1, // 有意愿
  SIGNED = 2, // 已签约
  DEPOSIT_PAID = 3, // 已付定金
  FULL_PAID = 4, // 已付全款
  COMPLETED = 5, // 已完成
  REFUNDED = 6, // 已退款
  DELETED = 7, // 已删除
}

export interface OrderStatusType {
  osid: number;
  oscname: string;
  osuname: string;
  osename: string;
}

export interface OrderCustomType {
  ocid: number;
  occname: string;
  ocuname: string;
  ocename: string;
}

export interface Order {
  oid?: number;
  ocdate: string;
  status: OrderStatus;
  odest: number; // Foreign key to tab_destination
  octype: number; // Foreign key to tab_order_custom
  ocname: string;
  ocphone: string;
  otr: string; // Receivables (应收货款)
  otrc: number; // Currency for otr: 1-UZS, 2-USD, 3-CNY
  ossgi: string; // Ordered goods "vid/qty,vid/qty"
  oconid?: string; // Contract ID
  oconfn?: string; // Contract filename
  oarp?: string; // Actual received (实收货款)
  oard?: string; // Deposit received (实收定金)
  oarr?: string; // Balance received (实收尾款)
  oarpc?: number; // Currency for oarp: 1-UZS, 2-USD, 3-CNY
  ogsented: string; // Sent goods "vid/qty,vid/qty"
  omemo: string;
}

export interface SendingRecord {
  sid?: number;
  sstate: ShipmentState;
  splate: string;
  spinfo: string; // "vid/weight,vid/weight"
  sainfo: string; // "bid/weight,bid/weight"
  sdate: string;
  sftime?: string;
  sdrpn: string;
  sdest: number;
  smemo: string;
  soid?: number; // Foreign key to connect Order's oid
}
