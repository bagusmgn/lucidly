import type { Budgets, Categories, Recurring, Transaction, Transfer, Wallet } from "../types";
import { CATS } from "./domain";

// Adapter penyimpanan. Untuk pindah ke backend, ganti load/save dengan pemanggilan API.
function createStore<T>(key: string, fallback: () => T, valid: (v: unknown) => boolean) {
  return {
    load(): T {
      try {
        const v: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
        return valid(v) ? (v as T) : fallback();
      } catch {
        return fallback();
      }
    },
    save(data: T): void {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        /* storage penuh atau dinonaktifkan */
      }
    },
  };
}

const isArray = (v: unknown) => Array.isArray(v);
const isObject = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v);

export const txStorage = createStore<Transaction[]>("glass-finance:v1", () => [], isArray);
export const budgetStorage = createStore<Budgets>("glass-finance:budgets:v1", () => ({}), isObject);
export const recurringStorage = createStore<Recurring[]>("glass-finance:recurring:v1", () => [], isArray);

const isCats = (v: unknown) =>
  isObject(v) && Array.isArray((v as Record<string, unknown>).expense) && Array.isArray((v as Record<string, unknown>).income);

export const categoryStorage = createStore<Categories>(
  "glass-finance:categories:v1",
  () => ({ expense: [...CATS.expense], income: [...CATS.income] }),
  isCats,
);
export const walletStorage = createStore<Wallet[]>(
  "glass-finance:wallets:v1",
  () => [{ id: 1, name: "Tunai", icon: "💵", initial: 0 }],
  (v) => Array.isArray(v) && v.length > 0,
);
export const transferStorage = createStore<Transfer[]>("glass-finance:transfers:v1", () => [], isArray);
