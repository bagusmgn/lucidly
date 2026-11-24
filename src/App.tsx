import { useEffect, useMemo, useReducer, useState } from "react";
import type { Budgets, Recurring, Transaction, TxType } from "./types";
import { budgetStorage, recurringStorage, txStorage } from "./lib/storage";
import { fmtDate, icon, monthTrend, parseBackup, rp, runRecurring, sortTx, summarize, today } from "./lib/domain";
import { Donut, PALETTE, Trend } from "./components/Charts";
import { BudgetForm, DataSheet, RecForm, TxForm } from "./components/Sheets";

type Action =
  | { type: "add"; tx: Transaction }
  | { type: "remove"; id: number }
  | { type: "replace"; list: Transaction[] };

function reducer(s: Transaction[], a: Action): Transaction[] {
  switch (a.type) {
    case "add": return sortTx([a.tx, ...s]);
    case "remove": return s.filter((t) => t.id !== a.id);
    case "replace": return sortTx(a.list);
  }
}

// Dihitung sekali saat start (aman untuk StrictMode): transaksi berulang yang jatuh tempo langsung dibuat.
function boot() {
  const r = runRecurring(recurringStorage.load(), today());
  return { tx: sortTx([...r.txs, ...txStorage.load()]), recs: r.recs };
}

export default function App() {
  const [init] = useState(boot);
  const [tx, dispatch] = useReducer(reducer, init.tx);
  const [budgets, setBudgets] = useState<Budgets>(() => budgetStorage.load());
  const [recs, setRecs] = useState<Recurring[]>(init.recs);
  const [tab, setTab] = useState<"all" | TxType>("all");
  const [sheet, setSheet] = useState<null | "tx" | "budget" | "rec" | "data">(null);

  useEffect(() => txStorage.save(tx), [tx]);
  useEffect(() => budgetStorage.save(budgets), [budgets]);
  useEffect(() => recurringStorage.save(recs), [recs]);

  const mk = today().slice(0, 7);
  const { inc, exp, byCat, monthExp } = useMemo(() => summarize(tx, mk), [tx, mk]);
  const trend = useMemo(() => monthTrend(tx), [tx]);
  const monthItems = Object.entries(monthExp).sort((a, b) => b[1] - a[1]);
  const monthTotal = monthItems.reduce((s, [, v]) => s + v, 0);
  const list = tx.filter((t) => tab === "all" || t.type === tab);
  const budgetList = Object.entries(budgets);
  const warns = budgetList.filter(([c, b]) => (monthExp[c] ?? 0) / b >= 0.8);

  const getJson = () => JSON.stringify({ version: 1, tx, budgets, recurring: recs }, null, 2);
  const doImport = (raw: unknown) => {
    const b = parseBackup(raw);
    dispatch({ type: "replace", list: b.tx });
    if (b.budgets) setBudgets(b.budgets);
    if (b.recurring) setRecs(b.recurring);
    return b.tx.length;
  };
  const close = () => setSheet(null);

  return (
    <>
      <h1>Lucidly</h1>

      {warns.length > 0 && (
        <div className="warn glass">
          {warns.map(([c, b]) => {
            const p = Math.round(((monthExp[c] ?? 0) / b) * 100);
            return <div key={c}>{p > 100 ? "🚨" : "⚠️"} {c}: {p}% dari anggaran terpakai</div>;
          })}
        </div>
      )}

      <div className="hero glass">
        <div className="lbl">Total saldo</div>
        <div className="bal">{rp(inc - exp)}</div>
        <div className="row">
          <div className="mini"><span className="lbl">Pemasukan</span><b className="inc">{rp(inc)}</b></div>
          <div className="mini"><span className="lbl">Pengeluaran</span><b className="exp">{rp(exp)}</b></div>
        </div>
      </div>

      <div className="sec glass">
        <div className="hd"><h2>Anggaran bulan ini</h2><button className="lnk" onClick={() => setSheet("budget")}>Atur</button></div>
        {budgetList.length === 0 ? (
          <div className="empty">Belum ada anggaran. Tekan Atur untuk menetapkan batas per kategori.</div>
        ) : (
          budgetList.map(([c, b]) => {
            const s = monthExp[c] ?? 0;
            const p = s / b;
            const col = p > 1 ? "var(--exp)" : p >= 0.8 ? "#ffb020" : "var(--acc)";
            return (
              <div className="cat" key={c}>
                <div className="top">
                  <span>{icon("expense", c)} {c}</span>
                  <span style={p > 1 ? { color: "var(--exp)" } : undefined}>{rp(s)} / {rp(b)}</span>
                </div>
                <div className="bar"><i style={{ width: `${Math.min(100, Math.round(p * 100))}%`, background: col }} /></div>
                <div className="lbl" style={{ marginTop: 4 }}>{p > 1 ? `Melebihi ${rp(s - b)}` : `Sisa ${rp(b - s)}`}</div>
              </div>
            );
          })
        )}
      </div>

      <div className="sec glass">
        <h2>Tren 6 bulan</h2>
        <div className="legend"><span className="inc">● Masuk</span><span className="exp">● Keluar</span></div>
        <Trend data={trend} />
      </div>

      {monthItems.length > 0 && (
        <div className="sec glass">
          <h2>Komposisi bulan ini</h2>
          <div className="dn">
            <Donut items={monthItems} total={monthTotal} />
            <div className="lg">
              {monthItems.map(([c, v], i) => (
                <div key={c}><i style={{ background: PALETTE[i % PALETTE.length] }} />{c} {Math.round((v / monthTotal) * 100)}%</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {byCat.length > 0 && (
        <div className="sec glass">
          <h2>Pengeluaran per kategori</h2>
          {byCat.map(([c, v]) => (
            <div className="cat" key={c}>
              <div className="top"><span>{icon("expense", c)} {c}</span><span>{rp(v)}</span></div>
              <div className="bar"><i style={{ width: `${Math.round((v / exp) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      <div className="sec glass">
        <h2>Riwayat</h2>
        <div className="seg">
          {([["all", "Semua"], ["income", "Masuk"], ["expense", "Keluar"]] as const).map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {list.length === 0 ? (
          <div className="empty">Belum ada transaksi. Tekan + untuk mulai mencatat.</div>
        ) : (
          list.map((t) => (
            <div className="tx" key={t.id}>
              <div className="ic">{icon(t.type, t.category)}</div>
              <div className="m"><b>{t.note || t.category}</b><span>{t.category} · {fmtDate(t.date)}</span></div>
              <div className={`amt ${t.type === "income" ? "inc" : "exp"}`}>{t.type === "income" ? "+" : "−"}{rp(t.amount)}</div>
              <button className="del" aria-label="Hapus" onClick={() => dispatch({ type: "remove", id: t.id })}>✕</button>
            </div>
          ))
        )}
      </div>

      <div className="sec glass">
        <div className="hd"><h2>Transaksi berulang</h2><button className="lnk" onClick={() => setSheet("rec")}>Tambah</button></div>
        {recs.length === 0 ? (
          <div className="empty">Belum ada. Cocok untuk gaji, sewa, atau langganan bulanan.</div>
        ) : (
          recs.map((r) => (
            <div className="tx" key={r.id}>
              <div className="ic">{icon(r.type, r.category)}</div>
              <div className="m"><b>{r.note || r.category}</b><span>Setiap tanggal {r.day}</span></div>
              <div className={`amt ${r.type === "income" ? "inc" : "exp"}`}>{rp(r.amount)}</div>
              <button className="del" aria-label="Hapus" onClick={() => setRecs((x) => x.filter((y) => y.id !== r.id))}>✕</button>
            </div>
          ))
        )}
      </div>

      <div className="sec glass">
        <div className="hd"><h2>Cadangan data</h2><button className="lnk" onClick={() => setSheet("data")}>Ekspor / Impor</button></div>
        <div className="lbl">Simpan salinan JSON agar data aman jika cache browser dibersihkan.</div>
      </div>

      <button className="fab" aria-label="Tambah transaksi" onClick={() => setSheet("tx")}>+</button>

      {sheet === "tx" && <TxForm onSave={(t) => dispatch({ type: "add", tx: t })} onClose={close} />}
      {sheet === "budget" && (
        <BudgetForm
          budgets={budgets}
          onSave={(c, v) => setBudgets((b) => { const n = { ...b }; if (v > 0) n[c] = v; else delete n[c]; return n; })}
          onClose={close}
        />
      )}
      {sheet === "rec" && <RecForm onSave={(r) => setRecs((x) => [...x, r])} onClose={close} />}
      {sheet === "data" && <DataSheet getJson={getJson} onImport={doImport} onClose={close} />}
    </>
  );
}
