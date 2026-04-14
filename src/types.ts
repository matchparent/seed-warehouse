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
}
