import { useEffect, useMemo, useReducer, useState } from "react";
import type { Budgets, Categories, Recurring, Transaction, Transfer, TxType, Wallet } from "./types";
import { budgetStorage, categoryStorage, hideStorage, recurringStorage, transferStorage, txStorage, walletStorage } from "./lib/storage";
import { fmtDate, icon, monthLabel, monthTrend, parseBackup, rp, runRecurring, shiftMonth, sortTx, summarize, today, walletBalances, walletIdOf } from "./lib/domain";
import { Donut, PALETTE, Trend } from "./components/Charts";
import { BudgetForm, DataSheet, RecForm, TxForm } from "./components/Sheets";
import { EyeIcon, PaletteIcon } from "./components/Icons";
import { ThemeSheet } from "./components/ThemeSheet";
import { useTheme } from "./lib/theme";
import { CategorySheet, TransferSheet, WalletSheet } from "./components/Manage";

type Action =
  | { type: "add"; tx: Transaction }
  | { type: "remove"; id: number }
  | { type: "update"; tx: Transaction }
  | { type: "replace"; list: Transaction[] };

function reducer(s: Transaction[], a: Action): Transaction[] {
  switch (a.type) {
    case "add": return sortTx([a.tx, ...s]);
    case "remove": return s.filter((t) => t.id !== a.id);
    case "update": return sortTx(s.map((t) => (t.id === a.tx.id ? a.tx : t)));
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
  const [sheet, setSheet] = useState<null | "tx" | "budget" | "rec" | "data" | "cats" | "wallets" | "transfer" | "theme">(null);
  const [theme, setTheme] = useTheme();
  const [hidden, setHidden] = useState(() => hideStorage.load());
  const [cats, setCats] = useState<Categories>(() => categoryStorage.load());
  const [wallets, setWallets] = useState<Wallet[]>(() => walletStorage.load());
  const [transfers, setTransfers] = useState<Transfer[]>(() => transferStorage.load());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [undo, setUndo] = useState<Transaction | null>(null);
  const [month, setMonth] = useState(() => today().slice(0, 7));

  useEffect(() => txStorage.save(tx), [tx]);
  useEffect(() => budgetStorage.save(budgets), [budgets]);
  useEffect(() => recurringStorage.save(recs), [recs]);
  useEffect(() => categoryStorage.save(cats), [cats]);
  useEffect(() => hideStorage.save(hidden), [hidden]);
  useEffect(() => walletStorage.save(wallets), [wallets]);
  useEffect(() => transferStorage.save(transfers), [transfers]);
  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(id);
  }, [undo]);

  const mk = today().slice(0, 7);
  const { inc, exp, monthExp } = useMemo(() => summarize(tx, month), [tx, month]);
  const trend = useMemo(() => monthTrend(tx, month), [tx, month]);
  const monthItems = Object.entries(monthExp).sort((a, b) => b[1] - a[1]);
  const monthTotal = monthItems.reduce((sum, [, v]) => sum + v, 0);
  const list = tx.filter((t) => t.date.slice(0, 7) === month && (tab === "all" || t.type === tab));
  const budgetList = Object.entries(budgets);
  const warns = month === mk ? budgetList.filter(([c, b]) => (monthExp[c] ?? 0) / b >= 0.8) : [];
  const totalBudget = budgetList.reduce((sum, [, b]) => sum + b, 0);
  const totalSpent = budgetList.reduce((sum, [c]) => sum + (monthExp[c] ?? 0), 0);
  const totalRatio = totalBudget > 0 ? totalSpent / totalBudget : 0;

  const balances = useMemo(() => walletBalances(wallets, tx, transfers), [wallets, tx, transfers]);
  const totalBalance = Object.values(balances).reduce((a, b) => a + b, 0);
  const money = (n: number) => (hidden ? "Rp ••••••" : rp(n));
  const wName = (id: number) => wallets.find((w) => w.id === id)?.name ?? "?";
  const used = useMemo(() => {
    const u = new Set<number>();
    tx.forEach((t) => u.add(walletIdOf(t, wallets)));
    recs.forEach((r) => u.add(walletIdOf(r, wallets)));
    transfers.forEach((t) => { u.add(t.from); u.add(t.to); });
    return u;
  }, [tx, recs, transfers, wallets]);

  const getJson = () => JSON.stringify({ version: 1, tx, budgets, recurring: recs, categories: cats, wallets, transfers }, null, 2);
  const doImport = (raw: unknown) => {
    const b = parseBackup(raw);
    dispatch({ type: "replace", list: b.tx });
    if (b.budgets) setBudgets(b.budgets);
    if (b.recurring) setRecs(b.recurring);
    if (b.categories) setCats(b.categories);
    if (b.wallets) setWallets(b.wallets);
    if (b.transfers) setTransfers(b.transfers);
    return b.tx.length;
  };
  const close = () => { setSheet(null); setEditing(null); };
  const remove = (t: Transaction) => { dispatch({ type: "remove", id: t.id }); setUndo(t); };
  const saveTx = (t: Transaction) => (editing ? dispatch({ type: "update", tx: t }) : dispatch({ type: "add", tx: t }));

  return (
    <>
      <div className="hd" style={{ marginBottom: 0 }}>
        <h1>Lucidly</h1>
        <button className="eye" aria-label="Atur tema" onClick={() => setSheet("theme")}><PaletteIcon /></button>
      </div>

      <div className="mnav glass">
        <button aria-label="Bulan sebelumnya" onClick={() => setMonth((m) => shiftMonth(m, -1))}>◀</button>
        <b>{monthLabel(month)}</b>
        <button aria-label="Bulan berikutnya" disabled={month >= mk} onClick={() => setMonth((m) => shiftMonth(m, 1))}>▶</button>
      </div>

      {warns.length > 0 && (
        <div className="warn glass">
          {warns.map(([c, b]) => {
            const p = Math.round(((monthExp[c] ?? 0) / b) * 100);
            return <div key={c}>{p > 100 ? "🚨" : "⚠️"} {c}: {p}% dari anggaran terpakai</div>;
          })}
        </div>
      )}

      <div className="hero glass">
        <div className="hd" style={{ marginBottom: 0 }}>
          <span className="lbl">Total saldo</span>
          <button className="eye" aria-label={hidden ? "Tampilkan nominal" : "Sembunyikan nominal"} aria-pressed={hidden} onClick={() => setHidden((h) => !h)}>
            <EyeIcon off={hidden} />
          </button>
        </div>
        <div className="bal">{money(totalBalance)}</div>
        <div className="row">
          <div className="mini"><span className="lbl">Pemasukan</span><b className="inc">{money(inc)}</b></div>
          <div className="mini"><span className="lbl">Pengeluaran</span><b className="exp">{money(exp)}</b></div>
        </div>
      </div>

      <div className="sec glass">
        <div className="hd">
          <h2>Dompet</h2>
          <div className="hdb">
            <button className="lnk" disabled={wallets.length < 2} onClick={() => setSheet("transfer")}>Transfer</button>
            <button className="lnk" onClick={() => setSheet("wallets")}>Kelola</button>
          </div>
        </div>
        {wallets.map((w) => (
          <div className="mrow" key={w.id}><span>{w.icon} {w.name}</span><b>{money(balances[w.id] ?? 0)}</b></div>
        ))}
        {transfers.length > 0 && (
          <>
            <div className="lbl" style={{ margin: "12px 0 2px" }}>Transfer terakhir</div>
            {transfers.slice(0, 5).map((t) => (
              <div className="mrow" key={t.id}>
                <span className="lbl">{fmtDate(t.date)} · {wName(t.from)} → {wName(t.to)}</span>
                <span>{rp(t.amount)} <button className="del" aria-label="Hapus transfer" onClick={() => setTransfers((x) => x.filter((y) => y.id !== t.id))}>✕</button></span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="sec glass">
        <div className="hd"><h2>Anggaran</h2><button className="lnk" onClick={() => setSheet("budget")}>Atur</button></div>
        {budgetList.length > 0 && (
          <div className="mini" style={{ marginBottom: 14 }}>
            <div className="top" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <b>Total anggaran</b>
              <span style={totalRatio > 1 ? { color: "var(--exp)" } : undefined}>{rp(totalSpent)} / {rp(totalBudget)}</span>
            </div>
            <div className="bar">
              <i style={{ width: `${Math.min(100, Math.round(totalRatio * 100))}%`, background: totalRatio > 1 ? "var(--exp)" : totalRatio >= 0.8 ? "#ffb020" : "var(--acc)" }} />
            </div>
            <div className="lbl" style={{ marginTop: 4 }}>
              {totalRatio > 1 ? `Melebihi ${rp(totalSpent - totalBudget)}` : `Sisa ${rp(totalBudget - totalSpent)}`} · {Math.round(totalRatio * 100)}% terpakai
            </div>
          </div>
        )}
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
                  <span>{icon(cats, "expense", c)} {c}</span>
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
          <h2>Komposisi pengeluaran</h2>
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

      <div className="sec glass">
        <h2>Riwayat</h2>
        <div className="seg">
          {([["all", "Semua"], ["income", "Masuk"], ["expense", "Keluar"]] as const).map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {list.length === 0 ? (
          <div className="empty">Belum ada transaksi di bulan ini. Tekan + untuk mulai mencatat.</div>
        ) : (
          list.map((t) => (
            <div className="tx" key={t.id} onClick={() => setEditing(t)}>
              <div className="ic">{icon(cats, t.type, t.category)}</div>
              <div className="m"><b>{t.note || t.category}</b><span>{t.category} · {fmtDate(t.date)}{wallets.length > 1 ? ` · ${wName(walletIdOf(t, wallets))}` : ""}</span></div>
              <div className={`amt ${t.type === "income" ? "inc" : "exp"}`}>{t.type === "income" ? "+" : "−"}{rp(t.amount)}</div>
              <button className="del" aria-label="Hapus" onClick={(e) => { e.stopPropagation(); remove(t); }}>✕</button>
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
              <div className="ic">{icon(cats, r.type, r.category)}</div>
              <div className="m"><b>{r.note || r.category}</b><span>Setiap tanggal {r.day}</span></div>
              <div className={`amt ${r.type === "income" ? "inc" : "exp"}`}>{rp(r.amount)}</div>
              <button className="del" aria-label="Hapus" onClick={() => setRecs((x) => x.filter((y) => y.id !== r.id))}>✕</button>
            </div>
          ))
        )}
      </div>

      <div className="sec glass">
        <div className="hd"><h2>Kategori</h2><button className="lnk" onClick={() => setSheet("cats")}>Kelola</button></div>
        <div className="lbl">Tambah atau hapus kategori pengeluaran dan pemasukan.</div>
      </div>

      <div className="sec glass">
        <div className="hd"><h2>Cadangan data</h2><button className="lnk" onClick={() => setSheet("data")}>Ekspor / Impor</button></div>
        <div className="lbl">Simpan salinan JSON agar data aman jika cache browser dibersihkan.</div>
      </div>

      <button className="fab" aria-label="Tambah transaksi" onClick={() => setSheet("tx")}>+</button>

      {undo && (
        <div className="toast glass">
          <span>Transaksi dihapus</span>
          <button onClick={() => { dispatch({ type: "add", tx: undo }); setUndo(null); }}>Urungkan</button>
        </div>
      )}

      {(sheet === "tx" || editing) && <TxForm key={editing?.id ?? "new"} initial={editing ?? undefined} cats={cats} wallets={wallets} onSave={saveTx} onClose={close} />}
      {sheet === "budget" && (
        <BudgetForm
          cats={cats}
          budgets={budgets}
          onSave={(c, v) => setBudgets((b) => { const n = { ...b }; if (v > 0) n[c] = v; else delete n[c]; return n; })}
          onClose={close}
        />
      )}
      {sheet === "rec" && <RecForm cats={cats} wallets={wallets} onSave={(r) => setRecs((x) => [...x, r])} onClose={close} />}
      {sheet === "data" && <DataSheet getJson={getJson} onImport={doImport} onClose={close} />}
      {sheet === "cats" && <CategorySheet cats={cats} onChange={setCats} onClose={close} />}
      {sheet === "theme" && <ThemeSheet theme={theme} onChange={setTheme} onClose={close} />}
      {sheet === "wallets" && <WalletSheet wallets={wallets} balances={balances} used={used} onChange={setWallets} onClose={close} />}
      {sheet === "transfer" && (
        <TransferSheet
          wallets={wallets}
          onSave={(t) => setTransfers((x) => [t, ...x].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id))}
          onClose={close}
        />
      )}
    </>
  );
}
