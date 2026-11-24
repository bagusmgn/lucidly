import { useState, type ReactNode } from "react";
import type { Categories, Recurring, Transaction, TxType, Wallet } from "../types";
import { prevMonth, today, walletIdOf } from "../lib/domain";

export function Sheet({ title, onClose, children, live }: { title: string; onClose: () => void; children: ReactNode; live?: boolean }) {
  return (
    <div className={`ov${live ? " clear" : ""}`} onClick={onClose}>
      <div className={`sheet glass${live ? " compact" : ""}`} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="f">
      <label>{label}</label>
      {children}
    </div>
  );
}

/** Input nominal: hanya angka, otomatis diberi titik ribuan (1.600.000). State menyimpan digit murni. */
export function AmountInput({ value, onChange, autoFocus }: { value: string; onChange: (digits: string) => void; autoFocus?: boolean }) {
  const shown = value ? Number(value).toLocaleString("id-ID") : "";
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="0"
      autoFocus={autoFocus}
      value={shown}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12))}
    />
  );
}

function TypeSeg({ type, onPick }: { type: TxType; onPick: (t: TxType) => void }) {
  return (
    <div className="seg">
      <button className={type === "expense" ? "on" : ""} onClick={() => onPick("expense")}>Pengeluaran</button>
      <button className={type === "income" ? "on" : ""} onClick={() => onPick("income")}>Pemasukan</button>
    </div>
  );
}

function CatSelect({ cats, type, value, onChange }: { cats: Categories; type: TxType; value: string; onChange: (v: string) => void }) {
  const list = cats[type];
  const missing = !!value && !list.some((c) => c[0] === value); // kategori sudah dihapus tapi masih dipakai transaksi ini
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {missing && <option value={value}>💸 {value}</option>}
      {list.map(([c, i]) => (
        <option key={c} value={c}>{i} {c}</option>
      ))}
    </select>
  );
}

export function WalletSelect({ wallets, value, onChange }: { wallets: Wallet[]; value: number; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {wallets.map((w) => (
        <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
      ))}
    </select>
  );
}

export function TxForm({ initial, cats, wallets, onSave, onClose }: { initial?: Transaction; cats: Categories; wallets: Wallet[]; onSave: (t: Transaction) => void; onClose: () => void }) {
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState(initial?.category ?? cats.expense[0]?.[0] ?? "Lainnya");
  const [note, setNote] = useState(initial?.note ?? "");
  const [date, setDate] = useState(initial?.date ?? today());
  const [walletId, setWalletId] = useState(walletIdOf(initial ?? {}, wallets));
  const ok = Number(amount) > 0;
  const pick = (t: TxType) => { setType(t); setCategory(cats[t][0]?.[0] ?? "Lainnya"); };
  const submit = () => {
    if (!ok) return;
    onSave({ id: initial?.id ?? Date.now(), type, amount: Math.round(Number(amount)), category, note: note.trim(), date, walletId });
    onClose();
  };
  return (
    <Sheet title={initial ? "Edit transaksi" : "Transaksi baru"} onClose={onClose}>
      <TypeSeg type={type} onPick={pick} />
      <Field label="Jumlah (Rp)"><AmountInput value={amount} onChange={setAmount} autoFocus /></Field>
      <Field label="Kategori"><CatSelect cats={cats} type={type} value={category} onChange={setCategory} /></Field>
      <Field label="Dompet"><WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} /></Field>
      <Field label="Catatan"><input type="text" placeholder="Opsional" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Field label="Tanggal"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <button className="go" disabled={!ok} onClick={submit}>Simpan</button>
    </Sheet>
  );
}

export function RecForm({ cats, wallets, onSave, onClose }: { cats: Categories; wallets: Wallet[]; onSave: (r: Recurring) => void; onClose: () => void }) {
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(cats.expense.find((c) => c[0] === "Tagihan")?.[0] ?? cats.expense[0]?.[0] ?? "Lainnya");
  const [note, setNote] = useState("");
  const [day, setDay] = useState("1");
  const [walletId, setWalletId] = useState(wallets[0].id);
  const ok = Number(amount) > 0;
  const pick = (t: TxType) => { setType(t); setCategory(cats[t][0]?.[0] ?? "Lainnya"); };
  const submit = () => {
    if (!ok) return;
    const d = Math.min(28, Math.max(1, Math.round(Number(day)) || 1));
    const td = today();
    const cur = td.slice(0, 7);
    // tanggal yang sudah lewat bulan ini mulai bulan depan; selain itu bulan ini ikut dibuat
    onSave({ id: Date.now(), type, amount: Math.round(Number(amount)), category, note: note.trim(), walletId, day: d, last: d < Number(td.slice(8, 10)) ? cur : prevMonth(cur) });
    onClose();
  };
  return (
    <Sheet title="Transaksi berulang" onClose={onClose}>
      <TypeSeg type={type} onPick={pick} />
      <Field label="Jumlah (Rp)"><AmountInput value={amount} onChange={setAmount} /></Field>
      <Field label="Kategori"><CatSelect cats={cats} type={type} value={category} onChange={setCategory} /></Field>
      <Field label="Dompet"><WalletSelect wallets={wallets} value={walletId} onChange={setWalletId} /></Field>
      <Field label="Catatan"><input type="text" placeholder="Contoh: Sewa kos" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Field label="Setiap tanggal (1-28)"><input type="number" min={1} max={28} value={day} onChange={(e) => setDay(e.target.value)} /></Field>
      <button className="go" disabled={!ok} onClick={submit}>Simpan</button>
    </Sheet>
  );
}

export function BudgetForm({ cats, budgets, onSave, onClose }: { cats: Categories; budgets: Record<string, number>; onSave: (cat: string, amount: number) => void; onClose: () => void }) {
  const first = cats.expense[0]?.[0] ?? "";
  const [cat, setCat] = useState(first);
  const [amt, setAmt] = useState(String(budgets[first] ?? ""));
  const change = (c: string) => { setCat(c); setAmt(String(budgets[c] ?? "")); };
  return (
    <Sheet title="Anggaran bulanan" onClose={onClose}>
      <Field label="Kategori"><CatSelect cats={cats} type="expense" value={cat} onChange={change} /></Field>
      <Field label="Batas per bulan (Rp), kosongkan untuk menghapus">
        <AmountInput value={amt} onChange={setAmt} />
      </Field>
      <button className="go" onClick={() => { onSave(cat, Number(amt) || 0); onClose(); }}>Simpan</button>
    </Sheet>
  );
}

export function DataSheet({ getJson, onImport, onClose }: { getJson: () => string; onImport: (raw: unknown) => number; onClose: () => void }) {
  const [text, setText] = useState(getJson);
  const [msg, setMsg] = useState("");
  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setMsg("Tersalin ke clipboard."),
      () => setMsg("Salin manual: pilih teks lalu Ctrl/Cmd+C."),
    );
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lucidly-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importText = (s: string) => {
    try { setMsg(`Berhasil mengimpor ${onImport(JSON.parse(s))} transaksi.`); }
    catch { setMsg("Format JSON tidak valid."); }
  };
  const importFile = async (f?: File) => { if (f) { const s = await f.text(); setText(s); importText(s); } };
  return (
    <Sheet title="Cadangan data" onClose={onClose}>
      <Field label="Salin atau unduh JSON untuk backup. Impor akan menimpa data saat ini.">
        <textarea rows={8} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <div className="row">
        <button className="go alt" onClick={copy}>Salin</button>
        <button className="go alt" onClick={download}>Unduh</button>
        <button className="go" onClick={() => importText(text)}>Impor</button>
      </div>
      <Field label="Atau impor dari file .json">
        <input type="file" accept="application/json,.json" onChange={(e) => importFile(e.target.files?.[0])} />
      </Field>
      {msg && <div className="msg">{msg}</div>}
    </Sheet>
  );
}
