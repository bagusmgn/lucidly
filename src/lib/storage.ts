import type { Budgets, Recurring, Transaction } from "../types";

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
