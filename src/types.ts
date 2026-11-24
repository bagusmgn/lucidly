export type TxType = "income" | "expense";

export interface Transaction {
  id: number;
  type: TxType;
  amount: number; // rupiah, integer
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  walletId?: number; // kosong = dompet pertama
}

export interface Recurring {
  id: number;
  type: TxType;
  amount: number;
  category: string;
  note: string;
  walletId?: number;
  day: number; // 1-28
  last: string; // YYYY-MM, bulan terakhir yang sudah dibuat
}

export type Budgets = Record<string, number>;
export type Categories = Record<TxType, [string, string][]>; // [nama, ikon]

export interface Wallet {
  id: number;
  name: string;
  icon: string;
  initial: number; // saldo awal
}

export interface Transfer {
  id: number;
  from: number;
  to: number;
  amount: number;
  date: string;
  note: string;
}

export interface Backup {
  version: number;
  tx: Transaction[];
  budgets?: Budgets;
  recurring?: Recurring[];
  categories?: Categories;
  wallets?: Wallet[];
  transfers?: Transfer[];
}
