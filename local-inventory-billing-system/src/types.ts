// Core data types for the shop management system

export type Category =
  | 'Sofa Raw Material'
  | 'Mattress'
  | 'Pillow'
  | 'Blanket'
  | 'Other'
  | string;

export interface StockLog {
  id: string;
  date: string; // ISO
  type: 'restock' | 'sale' | 'return' | 'exchange-in' | 'exchange-out' | 'adjustment' | 'damage';
  qty: number; // positive = added, negative = removed
  note?: string;
  refBillId?: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  barcode: string;
  unit: string; // pcs, meter, kg, roll, etc.
  price: number; // selling price in PKR
  costPrice?: number;
  stockQty: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
  stockLogs: StockLog[];
  barcodeSource: 'existing' | 'generated';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'Bank Transfer';

export interface PaymentRecord {
  id: string;
  date: string; // ISO
  amount: number;
  method: PaymentMethod;
  note?: string;
}

export interface BillItem {
  id: string;
  productId: string;
  name: string;
  barcode: string;
  unit: string;
  qty: number;
  price: number; // price at time of sale (editable/upsell)
  originalPrice: number; // catalog price for reference
  total: number;
}

export type BillStatus = 'Paid' | 'Partial' | 'Unpaid';

export interface Bill {
  id: string;
  billNumber: string;
  date: string; // ISO
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: BillItem[];
  subtotal: number;
  discount: number; // flat amount
  grandTotal: number;
  payments: PaymentRecord[];
  amountPaid: number;
  amountDue: number;
  status: BillStatus;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export type ClaimType = 'Return' | 'Exchange' | 'Warranty Claim';
export type ClaimStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected';

export interface ClaimRecord {
  id: string;
  claimNumber: string;
  type: ClaimType;
  date: string;
  billId?: string;
  billNumber?: string;
  customerName: string;
  customerPhone?: string;
  productId?: string;
  productName: string;
  qty: number;
  reason: string;
  refundAmount?: number;
  exchangeProductId?: string;
  exchangeProductName?: string;
  exchangeQty?: number;
  priceDifference?: number;
  warrantyOutcome?: 'Repaired' | 'Replaced' | 'Refunded' | 'Pending';
  status: ClaimStatus;
  notes?: string;
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  currencySymbol: string;
  invoicePrefix: string;
  claimPrefix: string;
  lowStockThresholdDefault: number;
  nextInvoiceSeq: number;
  nextClaimSeq: number;
  footerNote: string;
}

export interface AppState {
  products: Product[];
  customers: Customer[];
  bills: Bill[];
  claims: ClaimRecord[];
  settings: ShopSettings;
}
