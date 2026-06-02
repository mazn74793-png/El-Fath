/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  uid: string;
  displayName: string;
  email: string;
  role: 'clerk' | 'manager' | 'admin';
  shopName?: string;
}

export interface Product {
  id: string; // barcode or custom ID
  barcode: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  safetyStock: number;
  expirationDate?: string; // YYYY-MM-DD
  updatedAt: string;
  updatedBy?: string;
  shopId?: string; // Multi-shop scope association
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // custom flat discount for this line item
}

export interface OrderLineItem {
  productId: string;
  name: string;
  barcode: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  discount: number;
  total: number;
}

export interface SalesOrder {
  id: string;
  cashierId: string;
  cashierName: string;
  shiftId: string;
  items: OrderLineItem[];
  subtotal: number;
  discount: number; // overall order discount
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card';
  createdAt: string;
  shopId?: string; // Multi-shop scope association
}

export interface Shift {
  id: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  expectedCash: number;
  actualCash?: number;
  discrepancy?: number;
  status: 'open' | 'closed';
  shopId?: string; // Multi-shop scope association
}

export interface Shop {
  id: string;
  name: string;
  type: 'supermarket' | 'clothing' | 'pharmacy' | 'spare_parts' | 'other';
  currency: 'EGP' | 'USD';
  createdAt: string;
}

export interface SyncItem {
  id: string;
  collection: 'products' | 'sales_orders' | 'shifts' | 'users' | 'repairs';
  action: 'create' | 'update' | 'delete';
  documentId: string;
  payload: any;
  timestamp: string;
}

export interface RepairOrder {
  id: string;
  clientName: string;
  clientPhone: string;
  deviceName: string;
  problemDetails: string;
  partsNeeded: string;
  cost: number;
  deposit: number;
  isDepositPaid: boolean;
  status: 'pending' | 'in_progress' | 'ready' | 'delivered';
  notes: string;
  receivedDate: string;
  expectedDeliveryDate: string;
  shopId: string;
  updatedAt: string;
}

export interface DatabaseState {
  users: Record<string, User>;
  products: Record<string, Product>;
  sales_orders: Record<string, SalesOrder>;
  shifts: Record<string, Shift>;
  repairs: Record<string, RepairOrder>;
}
