import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import {
  AppState,
  Bill,
  BillItem,
  ClaimRecord,
  Customer,
  PaymentMethod,
  Product,
  ShopSettings,
  StockLog,
} from '../types';
import { loadState, saveState } from './db';

interface NewProductInput {
  name: string;
  category: string;
  barcode: string;
  barcodeSource: 'existing' | 'generated';
  unit: string;
  price: number;
  costPrice?: number;
  stockQty: number;
  lowStockThreshold: number;
}

interface NewBillInput {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: { productId: string; qty: number; price: number }[];
  discount: number;
  amountPaidNow: number;
  paymentMethod: PaymentMethod;
  dueDate?: string;
  notes?: string;
}

interface NewClaimInput {
  type: ClaimRecord['type'];
  billId?: string;
  customerName: string;
  customerPhone?: string;
  productId?: string;
  productName: string;
  qty: number;
  reason: string;
  refundAmount?: number;
  exchangeProductId?: string;
  exchangeQty?: number;
  warrantyOutcome?: ClaimRecord['warrantyOutcome'];
  notes?: string;
}

interface StoreContextValue {
  state: AppState;
  // products
  addProduct: (input: NewProductInput) => Product;
  updateProduct: (id: string, patch: Partial<NewProductInput>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, delta: number, note: string, type?: StockLog['type']) => void;
  findProductByBarcode: (barcode: string) => Product | undefined;
  // customers
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  // bills
  createBill: (input: NewBillInput) => Bill;
  addPaymentToBill: (billId: string, amount: number, method: PaymentMethod, note?: string) => void;
  // claims
  createClaim: (input: NewClaimInput) => ClaimRecord;
  updateClaimStatus: (id: string, status: ClaimRecord['status']) => void;
  // settings
  updateSettings: (patch: Partial<ShopSettings>) => void;
  // backup
  exportBackup: () => void;
  importBackup: (file: File) => Promise<void>;
  resetAllData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function genBarcode(seed: string) {
  // Generates a numeric-looking unique barcode (EAN/Code128 friendly)
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 900 + 100);
  const prefix = seed.replace(/[^0-9]/g, '').slice(0, 3).padStart(3, '2');
  return `${prefix}${ts}${rand}`;
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => loadState());
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    saveState(state);
  }, [state]);

  // save on unload just in case
  useEffect(() => {
    const handler = () => saveState(state);
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state]);

  const findProductByBarcode = (barcode: string) =>
    state.products.find((p) => p.barcode.trim() === barcode.trim());

  const addProduct: StoreContextValue['addProduct'] = (input) => {
    const now = new Date().toISOString();
    const barcode = input.barcode?.trim() || genBarcode(input.category || 'GEN');
    const product: Product = {
      id: uuid(),
      name: input.name,
      category: input.category,
      barcode,
      barcodeSource: input.barcodeSource,
      unit: input.unit || 'pcs',
      price: input.price,
      costPrice: input.costPrice,
      stockQty: input.stockQty || 0,
      lowStockThreshold: input.lowStockThreshold ?? state.settings.lowStockThresholdDefault,
      createdAt: now,
      updatedAt: now,
      stockLogs:
        input.stockQty > 0
          ? [{ id: uuid(), date: now, type: 'restock', qty: input.stockQty, note: 'Initial stock' }]
          : [],
    };
    setState((s) => ({ ...s, products: [product, ...s.products] }));
    return product;
  };

  const updateProduct: StoreContextValue['updateProduct'] = (id, patch) => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) =>
        p.id === id
          ? {
              ...p,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
  };

  const deleteProduct: StoreContextValue['deleteProduct'] = (id) => {
    setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
  };

  const adjustStock: StoreContextValue['adjustStock'] = (productId, delta, note, type = 'adjustment') => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) => {
        if (p.id !== productId) return p;
        const log: StockLog = {
          id: uuid(),
          date: new Date().toISOString(),
          type,
          qty: delta,
          note,
        };
        return {
          ...p,
          stockQty: p.stockQty + delta,
          updatedAt: new Date().toISOString(),
          stockLogs: [log, ...p.stockLogs].slice(0, 200),
        };
      }),
    }));
  };

  const addCustomer: StoreContextValue['addCustomer'] = (c) => {
    const customer: Customer = { ...c, id: uuid(), createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, customers: [customer, ...s.customers] }));
    return customer;
  };

  const createBill: StoreContextValue['createBill'] = (input) => {
    const now = new Date().toISOString();
    const items: BillItem[] = input.items.map((it) => {
      const product = state.products.find((p) => p.id === it.productId);
      const total = it.qty * it.price;
      return {
        id: uuid(),
        productId: it.productId,
        name: product?.name || 'Unknown',
        barcode: product?.barcode || '',
        unit: product?.unit || 'pcs',
        qty: it.qty,
        price: it.price,
        originalPrice: product?.price ?? it.price,
        total,
      };
    });
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const grandTotal = Math.max(0, subtotal - input.discount);
    const amountPaid = Math.min(input.amountPaidNow, grandTotal);
    const amountDue = grandTotal - amountPaid;
    const status: Bill['status'] = amountDue <= 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid';
    const billNumber = `${state.settings.invoicePrefix}${String(state.settings.nextInvoiceSeq).padStart(4, '0')}`;

    const payments = amountPaid > 0
      ? [{ id: uuid(), date: now, amount: amountPaid, method: input.paymentMethod }]
      : [];

    const bill: Bill = {
      id: uuid(),
      billNumber,
      date: now,
      customerId: input.customerId,
      customerName: input.customerName || 'Walk-in Customer',
      customerPhone: input.customerPhone,
      items,
      subtotal,
      discount: input.discount,
      grandTotal,
      payments,
      amountPaid,
      amountDue,
      status,
      dueDate: input.dueDate,
      notes: input.notes,
      createdAt: now,
    };

    setState((s) => ({
      ...s,
      bills: [bill, ...s.bills],
      products: s.products.map((p) => {
        const item = items.find((i) => i.productId === p.id);
        if (!item) return p;
        const log: StockLog = {
          id: uuid(),
          date: now,
          type: 'sale',
          qty: -item.qty,
          note: `Sold in bill ${billNumber}`,
          refBillId: bill.id,
        };
        return {
          ...p,
          stockQty: p.stockQty - item.qty,
          updatedAt: now,
          stockLogs: [log, ...p.stockLogs].slice(0, 200),
        };
      }),
      settings: { ...s.settings, nextInvoiceSeq: s.settings.nextInvoiceSeq + 1 },
    }));

    return bill;
  };

  const addPaymentToBill: StoreContextValue['addPaymentToBill'] = (billId, amount, method, note) => {
    setState((s) => ({
      ...s,
      bills: s.bills.map((b) => {
        if (b.id !== billId) return b;
        const newPaid = Math.min(b.amountPaid + amount, b.grandTotal);
        const newDue = b.grandTotal - newPaid;
        const status: Bill['status'] = newDue <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';
        return {
          ...b,
          payments: [...b.payments, { id: uuid(), date: new Date().toISOString(), amount, method, note }],
          amountPaid: newPaid,
          amountDue: newDue,
          status,
        };
      }),
    }));
  };

  const createClaim: StoreContextValue['createClaim'] = (input) => {
    const now = new Date().toISOString();
    const claimNumber = `${state.settings.claimPrefix}${String(state.settings.nextClaimSeq).padStart(4, '0')}`;
    const bill = state.bills.find((b) => b.id === input.billId);
    const exProduct = input.exchangeProductId
      ? state.products.find((p) => p.id === input.exchangeProductId)
      : undefined;

    let priceDifference: number | undefined = undefined;
    if (input.type === 'Exchange' && exProduct && input.productId) {
      const origProduct = state.products.find((p) => p.id === input.productId);
      const origValue = (origProduct?.price ?? 0) * input.qty;
      const newValue = exProduct.price * (input.exchangeQty ?? input.qty);
      priceDifference = newValue - origValue;
    }

    const claim: ClaimRecord = {
      id: uuid(),
      claimNumber,
      type: input.type,
      date: now,
      billId: input.billId,
      billNumber: bill?.billNumber,
      customerName: input.customerName || bill?.customerName || 'Walk-in Customer',
      customerPhone: input.customerPhone || bill?.customerPhone,
      productId: input.productId,
      productName: input.productName,
      qty: input.qty,
      reason: input.reason,
      refundAmount: input.refundAmount,
      exchangeProductId: input.exchangeProductId,
      exchangeProductName: exProduct?.name,
      exchangeQty: input.exchangeQty,
      priceDifference,
      warrantyOutcome: input.warrantyOutcome,
      status: 'Pending',
      notes: input.notes,
      createdAt: now,
    };

    setState((s) => {
      let products = s.products;
      // Return: put stock back for returned product
      if (input.type === 'Return' && input.productId) {
        products = products.map((p) =>
          p.id === input.productId
            ? {
                ...p,
                stockQty: p.stockQty + input.qty,
                updatedAt: now,
                stockLogs: [
                  { id: uuid(), date: now, type: 'return', qty: input.qty, note: `Return ${claimNumber}` } as StockLog,
                  ...p.stockLogs,
                ].slice(0, 200),
              }
            : p
        );
      }
      // Exchange: return old stock, remove new stock
      if (input.type === 'Exchange') {
        if (input.productId) {
          products = products.map((p) =>
            p.id === input.productId
              ? {
                  ...p,
                  stockQty: p.stockQty + input.qty,
                  updatedAt: now,
                  stockLogs: [
                    { id: uuid(), date: now, type: 'exchange-in', qty: input.qty, note: `Exchange ${claimNumber}` } as StockLog,
                    ...p.stockLogs,
                  ].slice(0, 200),
                }
              : p
          );
        }
        if (input.exchangeProductId) {
          const exQty = input.exchangeQty ?? input.qty;
          products = products.map((p) =>
            p.id === input.exchangeProductId
              ? {
                  ...p,
                  stockQty: p.stockQty - exQty,
                  updatedAt: now,
                  stockLogs: [
                    { id: uuid(), date: now, type: 'exchange-out', qty: -exQty, note: `Exchange ${claimNumber}` } as StockLog,
                    ...p.stockLogs,
                  ].slice(0, 200),
                }
              : p
          );
        }
      }
      // Warranty claim replaced -> deduct one unit of same product as replacement
      if (input.type === 'Warranty Claim' && input.warrantyOutcome === 'Replaced' && input.productId) {
        products = products.map((p) =>
          p.id === input.productId
            ? {
                ...p,
                stockQty: p.stockQty - input.qty,
                updatedAt: now,
                stockLogs: [
                  { id: uuid(), date: now, type: 'exchange-out', qty: -input.qty, note: `Warranty replacement ${claimNumber}` } as StockLog,
                  ...p.stockLogs,
                ].slice(0, 200),
              }
            : p
        );
      }
      return {
        ...s,
        claims: [claim, ...s.claims],
        products,
        settings: { ...s.settings, nextClaimSeq: s.settings.nextClaimSeq + 1 },
      };
    });

    return claim;
  };

  const updateClaimStatus: StoreContextValue['updateClaimStatus'] = (id, status) => {
    setState((s) => ({
      ...s,
      claims: s.claims.map((c) => (c.id === id ? { ...c, status } : c)),
    }));
  };

  const updateSettings: StoreContextValue['updateSettings'] = (patch) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  };

  const exportBackup: StoreContextValue['exportBackup'] = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `shop-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importBackup: StoreContextValue['importBackup'] = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.products)) {
            throw new Error('Invalid backup file format');
          }
          setState({
            products: parsed.products ?? [],
            customers: parsed.customers ?? [],
            bills: parsed.bills ?? [],
            claims: parsed.claims ?? [],
            settings: { ...state.settings, ...(parsed.settings ?? {}) },
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const resetAllData: StoreContextValue['resetAllData'] = () => {
    setState({
      products: [],
      customers: [],
      bills: [],
      claims: [],
      settings: state.settings,
    });
  };

  const value: StoreContextValue = {
    state,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    findProductByBarcode,
    addCustomer,
    createBill,
    addPaymentToBill,
    createClaim,
    updateClaimStatus,
    updateSettings,
    exportBackup,
    importBackup,
    resetAllData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
