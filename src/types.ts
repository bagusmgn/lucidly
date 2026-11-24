export type TxType = "income" | "expense";

export interface Transaction {
  id: number;
  type: TxType;
  amount: number; // rupiah, integer
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
}

export interface Recurring {
  id: number;
  type: TxType;
  amount: number;
  category: string;
  note: string;
  day: number; // 1-28
  last: string; // YYYY-MM, bulan terakhir yang sudah dibuat
}

export type Budgets = Record<string, number>;

export interface Backup {
  version: number;
  tx: Transaction[];
  budgets?: Budgets;
  recurring?: Recurring[];
}
