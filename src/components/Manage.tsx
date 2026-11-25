import { useState } from "react";
import type { Categories, Transfer, TxType, Wallet } from "../types";
import { CATEGORY_ICONS, rp, today, WALLET_ICONS } from "../lib/domain";
import { AmountInput, Field, Sheet, WalletSelect } from "./Sheets";

function IconSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select className="icon-select" aria-label="Pilih ikon" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((i) => (
        <option key={i} value={i}>{i}</option>
      ))}
    </select>
  );
}

export function CategorySheet({ cats, onChange, onClose }: { cats: Categories; onChange: (c: Categories) => void; onClose: () => void }) {
  const [type, setType] = useState<TxType>("expense");
  const [icon, setIcon] = useState("📦");
  const [name, setName] = useState("");
  const list = cats[type];
  const n = name.trim();
  const dup = list.some((c) => c[0].toLowerCase() === n.toLowerCase());
  const add = () => {
    if (!n || dup) return;
    const next: [string, string][] = [...list, [n, icon]];
    onChange({ ...cats, [type]: next });
    setName("");
    setIcon("📦");
  };
  const del = (c: string) => onChange({ ...cats, [type]: list.filter((x) => x[0] !== c) });
  return (
    <Sheet title="Kategori" onClose={onClose}>
      <div className="seg">
        <button className={type === "expense" ? "on" : ""} onClick={() => setType("expense")}>Pengeluaran</button>
        <button className={type === "income" ? "on" : ""} onClick={() => setType("income")}>Pemasukan</button>
      </div>
      <div className="mlist">
        {list.map(([c, i]) => (
          <div className="mrow" key={c}>
            <span>{i} {c}</span>
            <button className="del" aria-label={`Hapus ${c}`} disabled={list.length <= 1} onClick={() => del(c)}>✕</button>
          </div>
        ))}
      </div>
      <div className="row">
        <div style={{ width: 84 }}>
          <Field label="Ikon"><IconSelect value={icon} options={CATEGORY_ICONS} onChange={setIcon} /></Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Nama"><input type="text" placeholder="Contoh: Kopi" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        </div>
      </div>
      <button className="go" disabled={!n || dup} onClick={add}>Tambah kategori</button>
      <div className="msg">{dup ? "Nama kategori sudah ada." : "Transaksi lama tetap menyimpan nama kategorinya meski kategori dihapus."}</div>
    </Sheet>
  );
}

export function WalletSheet({ wallets, balances, used, onChange, onClose }: { wallets: Wallet[]; balances: Record<number, number>; used: Set<number>; onChange: (w: Wallet[]) => void; onClose: () => void }) {
  const [icon, setIcon] = useState("👛");
  const [name, setName] = useState("");
  const [initial, setInitial] = useState("");
  const n = name.trim();
  const add = () => {
    if (!n) return;
    onChange([...wallets, { id: Date.now(), name: n, icon, initial: Number(initial) || 0 }]);
    setName("");
    setIcon("👛");
    setInitial("");
  };
  return (
    <Sheet title="Kelola dompet" onClose={onClose}>
      <div className="mlist">
        {wallets.map((w) => {
          const locked = wallets.length <= 1 || used.has(w.id);
          return (
            <div className="mrow" key={w.id}>
              <span>{w.icon} {w.name} <span className="lbl">· {rp(balances[w.id] ?? 0)}</span></span>
              <button className="del" aria-label={`Hapus ${w.name}`} disabled={locked} title={locked ? "Dompet yang sudah dipakai tidak bisa dihapus" : ""} onClick={() => onChange(wallets.filter((x) => x.id !== w.id))}>✕</button>
            </div>
          );
        })}
      </div>
      <div className="row">
        <div style={{ width: 84 }}>
          <Field label="Ikon"><IconSelect value={icon} options={WALLET_ICONS} onChange={setIcon} /></Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Nama"><input type="text" placeholder="Contoh: BCA" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        </div>
      </div>
      <Field label="Saldo awal (Rp)"><AmountInput value={initial} onChange={setInitial} /></Field>
      <button className="go" disabled={!n} onClick={add}>Tambah dompet</button>
      <div className="msg">Dompet yang sudah punya transaksi atau transfer tidak bisa dihapus.</div>
    </Sheet>
  );
}

export function TransferSheet({ wallets, onSave, onClose }: { wallets: Wallet[]; onSave: (t: Transfer) => void; onClose: () => void }) {
  const [from, setFrom] = useState(wallets[0].id);
  const [to, setTo] = useState(wallets[1]?.id ?? wallets[0].id);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const ok = Number(amount) > 0 && from !== to;
  const submit = () => {
    if (!ok) return;
    onSave({ id: Date.now(), from, to, amount: Math.round(Number(amount)), date, note: note.trim() });
    onClose();
  };
  return (
    <Sheet title="Transfer antar dompet" onClose={onClose}>
      <Field label="Dari"><WalletSelect wallets={wallets} value={from} onChange={setFrom} /></Field>
      <Field label="Ke"><WalletSelect wallets={wallets} value={to} onChange={setTo} /></Field>
      <Field label="Jumlah (Rp)"><AmountInput value={amount} onChange={setAmount} /></Field>
      <Field label="Catatan"><input type="text" placeholder="Opsional" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Field label="Tanggal"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <button className="go" disabled={!ok} onClick={submit}>Transfer</button>
      {from === to && <div className="msg">Pilih dompet asal dan tujuan yang berbeda.</div>}
    </Sheet>
  );
}
