import { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';

export type Options = {
  headers?:
    | HttpHeaders
    | {
        [header: string]: string | string[];
      };
  context?: HttpContext;
  observe?: 'body';
  params?:
    | HttpParams
    | {
        [param: string]:
          | string
          | number
          | boolean
          | ReadonlyArray<string | number | boolean>;
      };
  reportProgress?: boolean;
  responseType: 'arraybuffer';
  withCredentials?: boolean;
  transferCache?:
    | {
        includeHeaders?: string[];
      }
    | boolean;
};

export interface Delivery {
  _id: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  pickup_time?: Date;
  start_time?: Date;
  end_time?: Date;
  location?: Point;
  status: DeliveryStatus;
  package: Package;
  customer: User;
  driver: User;
}

export enum DeliveryStatus {
  Open = 'open',
  PickedUp = 'picked-up',
  InTransit = 'in-transit',
  Delivered = 'delivered',
  Failed = 'failed',
}

export interface User {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  hash: string;
  address: string;
  firstName: string;
  lastName: string;
  role: Role;
  packages: Package[];
}

export enum Role {
  Admin = 'admin',
  Customer = 'customer',
  Driver = 'driver',
}

export interface Package {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  active_delivery_id?: string;
  active_delivery?: Delivery;
  description: string;
  weight: number;
  width: number;
  height: number;
  depth: number;
  from_address: string;
  from_location: Point;
  to_address: string;
  to_location: Point;
  deliveries: Delivery[];
  from_user: User;
  to_user: User;
}

export interface Point {
  type: 'Point';
  coordinates: number[];
}
