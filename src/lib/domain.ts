import type { Backup, Budgets, Recurring, Transaction, TxType } from "../types";

export const CATS: Record<TxType, [string, string][]> = {
  expense: [["Makan", "🍜"], ["Transport", "🚗"], ["Belanja", "🛍️"], ["Tagihan", "🧾"], ["Hiburan", "🎬"], ["Lainnya", "📦"]],
  income: [["Gaji", "💼"], ["Bonus", "🎁"], ["Investasi", "📈"], ["Lainnya", "💰"]],
};

export const icon = (t: TxType, c: string) => CATS[t].find((x) => x[0] === c)?.[1] ?? "💸";

export const rp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const pad = (n: number) => String(n).padStart(2, "0");

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export const sortTx = (l: Transaction[]) => [...l].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

/* ---------- ringkasan & tren ---------- */
export function summarize(tx: Transaction[], monthKey: string) {
  let inc = 0;
  let exp = 0;
  const all: Record<string, number> = {};
  const monthExp: Record<string, number> = {};
  for (const t of tx) {
    if (t.type === "income") inc += t.amount;
    else {
      exp += t.amount;
      all[t.category] = (all[t.category] ?? 0) + t.amount;
      if (t.date.slice(0, 7) === monthKey) monthExp[t.category] = (monthExp[t.category] ?? 0) + t.amount;
    }
  }
  const byCat = Object.entries(all).sort((a, b) => b[1] - a[1]);
  return { inc, exp, byCat, monthExp };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function monthTrend(tx: Transaction[], n = 6) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    const key = `${x.getFullYear()}-${pad(x.getMonth() + 1)}`;
    let inc = 0;
    let exp = 0;
    for (const t of tx) {
      if (t.date.slice(0, 7) !== key) continue;
      if (t.type === "income") inc += t.amount;
      else exp += t.amount;
    }
    return { key, label: MONTHS[x.getMonth()], inc, exp };
  });
}

/* ---------- transaksi berulang ---------- */
export function prevMonth(k: string) {
  const [y, m] = k.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
}
function nextMonth(k: string) {
  const [y, m] = k.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
}

/** Membuat transaksi berulang yang sudah jatuh tempo sampai hari ini. */
export function runRecurring(recs: Recurring[], td: string) {
  const cur = td.slice(0, 7);
  const dn = Number(td.slice(8, 10));
  const txs: Transaction[] = [];
  let n = 0;
  const out = recs.map((r) => {
    let last = r.last;
    let guard = 0;
    while (last < cur && guard++ < 24) {
      const k = nextMonth(last);
      if (k === cur && r.day > dn) break;
      txs.push({ id: Date.now() + n++, type: r.type, amount: r.amount, category: r.category, note: r.note, date: `${k}-${pad(r.day)}` });
      last = k;
    }
    return last === r.last ? r : { ...r, last };
  });
  return { txs, recs: out };
}

/* ---------- backup ---------- */
const isType = (v: unknown): v is TxType => v === "income" || v === "expense";

/** Memvalidasi JSON backup; entri rusak dilewati. Melempar error jika bentuknya salah. */
export function parseBackup(raw: unknown): Backup {
  if (!raw || typeof raw !== "object") throw new Error("Format tidak valid");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = raw as Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTx: any[] = Array.isArray(raw) ? raw : Array.isArray(d.tx) ? d.tx : [];
  const tx: Transaction[] = rawTx
    .filter((t) => t && isType(t.type) && Number(t.amount) > 0 && typeof t.date === "string")
    .map((t, i) => ({
      id: Number(t.id) || Date.now() + i,
      type: t.type as TxType,
      amount: Math.round(Number(t.amount)),
      category: String(t.category || "Lainnya"),
      note: String(t.note || ""),
      date: String(t.date).slice(0, 10),
    }));
  const out: Backup = { version: 1, tx: sortTx(tx) };
  if (d.budgets && typeof d.budgets === "object") {
    const b: Budgets = {};
    for (const [k, v] of Object.entries(d.budgets)) if (Number(v) > 0) b[k] = Number(v);
    out.budgets = b;
  }
  if (Array.isArray(d.recurring)) {
    out.recurring = d.recurring
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r && isType(r.type) && Number(r.amount) > 0 && Number(r.day) >= 1 && Number(r.day) <= 28 && typeof r.last === "string")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any, i: number) => ({
        id: Number(r.id) || Date.now() + i,
        type: r.type as TxType,
        amount: Number(r.amount),
        category: String(r.category || "Lainnya"),
        note: String(r.note || ""),
        day: Math.round(Number(r.day)),
        last: r.last as string,
      }));
  }
  return out;
}
