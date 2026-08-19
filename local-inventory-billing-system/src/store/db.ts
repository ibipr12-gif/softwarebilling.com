import { AppState } from '../types';

export const STORAGE_KEY = 'sofa_shop_pos_db_v1';

export const defaultSettings: AppState['settings'] = {
  shopName: 'My Furniture Shop',
  address: 'Main Bazaar, Your City',
  phone: '0300-0000000',
  currencySymbol: 'Rs.',
  invoicePrefix: 'INV-',
  claimPrefix: 'CLM-',
  lowStockThresholdDefault: 5,
  nextInvoiceSeq: 1,
  nextClaimSeq: 1,
  footerNote: 'Thank you for your business!',
};

export const defaultState: AppState = {
  products: [],
  customers: [],
  bills: [],
  claims: [],
  settings: defaultSettings,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredCloneSafe(defaultState);
    const parsed = JSON.parse(raw);
    // merge with defaults to be safe against missing fields after updates
    return {
      products: parsed.products ?? [],
      customers: parsed.customers ?? [],
      bills: parsed.bills ?? [],
      claims: parsed.claims ?? [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
  } catch (e) {
    console.error('Failed to load saved data, starting fresh.', e);
    return structuredCloneSafe(defaultState);
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save data locally', e);
  }
}

function structuredCloneSafe<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
