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
  bstatus: number; // 0: No, 1: Yes, 2:待确认转运
  bcli: string; // Truck plate
  bmemo: string;
  bware?: number; // Warehouse ID
}

export enum ShipmentState {
  NEW = 1,
  ALLOCATED = 2,
  COMPLETED = 3,
  WITHDRAWN = 4,
}

export enum OrderStatus {
  DELETED = 0, // 已删除
  INTENTIONAL = 1, // 有意愿
  SIGNED = 2, // 已签约
  DEPOSIT_PAID = 3, // 已付定金
  FULL_PAID = 4, // 已付全款
  COMPLETED = 5, // 已完成
  REFUNDED = 6, // 已退款
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
  ocontract_data?: string; // Base64 data URL for local storage
  oarp?: string; // Actual received (实收货款)
  oard?: string; // Deposit received (实收定金)
  oarr?: string; // Balance received (实收尾款)
  oarpc?: number; // Currency for oarp: 1-UZS, 2-USD, 3-CNY
  ogsented: string; // Sent goods "vid/qty,vid/qty"
  omemo: string;
  orf?: string; // Refund amount (退款金额)
  orfc?: number; // Refund currency code (退款结算货币)
}

export interface Warehouse {
  wid: number;
  wname: string;
  wlocation: number; // Foreign key to tab_destination (did)
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
  soid?: number; // Foreign key to connect Order's oid, or Warehouse wid (if negative)
  sware?: number; // Source Warehouse ID
}

// 批次修改表 tab_batch_modify
export interface BatchModify {
  bmid?: number;
  bid: number; // 关联的批次id
  bmop: number; // 操作类型：1->库存补充，2->损耗/赠予
  bmvolume: number; // 修改量
  bmmemo: string; // 备注
  bmdate: string; // 修改日期 'yyyy-MM-dd'
}

// 银行卡表 tab_bankcards
export interface Bankcard {
  bcid?: number;
  bcno: string;      // 银行卡号 (若值为 "0"，则代表现金而非特定银行卡)
  bcbalance: number;  // 余额，整数，货币为乌兹别克som
  bcbaname: string;   // 银行名
  bcdeleted: number;  // 是否删除了，0没有，1删除了
}

// 消费记录表 tab_consume_record
export interface ConsumeRecord {
  crid?: number;
  crbcid: number;     // 消费产生卡的bcid
  croper: string;     // 操作人，当前登录账户的name
  cramount: number;   // 消费金额，整数，可以为负
  crmemo: string;     // 消费说明
  crqrcode: string;   // 发票二维码值，为空则代表没有发票
  crscaned: number;   // 该记录是否会计已收录，默认0表示未收录，1为已收录
}


