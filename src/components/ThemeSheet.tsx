import type { Mode, Theme } from "../lib/theme";
import { DEFAULT_THEME, PRESETS } from "../lib/theme";
import { Field, Sheet } from "./Sheets";

const MODES: [Mode, string][] = [["system", "Sistem"], ["light", "Terang"], ["dark", "Gelap"]];
const grad = (bg: Theme["bg"]) => `linear-gradient(135deg,${bg[0]},${bg[1]} 55%,${bg[2]})`;

export function ThemeSheet({ theme, onChange, onClose }: { theme: Theme; onChange: (t: Theme) => void; onClose: () => void }) {
  const set = (p: Partial<Theme>) => onChange({ ...theme, ...p });
  const pickPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (p) set({ preset: id, bg: p.bg, accent: p.accent });
  };
  // mengubah warna apa pun otomatis menjadi tema "kustom"
  const setBg = (i: number, c: string) => {
    const bg: Theme["bg"] = [...theme.bg];
    bg[i] = c;
    set({ preset: "custom", bg });
  };
  const setAccent = (i: number, c: string) => {
    const accent: Theme["accent"] = [...theme.accent];
    accent[i] = c;
    set({ preset: "custom", accent });
  };
  const colors: [string, string, (c: string) => void][] = [
    ["Latar 1", theme.bg[0], (c) => setBg(0, c)],
    ["Latar 2", theme.bg[1], (c) => setBg(1, c)],
    ["Latar 3", theme.bg[2], (c) => setBg(2, c)],
    ["Aksen 1", theme.accent[0], (c) => setAccent(0, c)],
    ["Aksen 2", theme.accent[1], (c) => setAccent(1, c)],
  ];
  return (
    <Sheet title="Tema" onClose={onClose} live>
      <div className="seg">
        {MODES.map(([m, l]) => (
          <button key={m} className={theme.mode === m ? "on" : ""} onClick={() => set({ mode: m })}>{l}</button>
        ))}
      </div>

      <div className="swatches">
        {PRESETS.map((p) => (
          <button key={p.id} className={`sw${theme.preset === p.id ? " on" : ""}`} aria-pressed={theme.preset === p.id} onClick={() => pickPreset(p.id)}>
            <i style={{ background: grad(p.bg) }} />
            <span>{p.name}</span>
          </button>
        ))}
        <button className={`sw${theme.preset === "custom" ? " on" : ""}`} aria-pressed={theme.preset === "custom"} onClick={() => set({ preset: "custom" })}>
          <i style={{ background: grad(theme.bg) }} />
          <span>Kustom</span>
        </button>
      </div>

      <div className="cgrid">
        {colors.map(([label, value, onPick]) => (
          <label className="cp" key={label}>
            <input type="color" value={value} onChange={(e) => onPick(e.target.value)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <Field label={`Blur kaca: ${theme.blur}px`}>
        <input type="range" min={0} max={40} value={theme.blur} onChange={(e) => set({ blur: Number(e.target.value) })} />
      </Field>
      <Field label={`Opasitas kaca: ${Math.round((theme.glass ?? 0.4) * 100)}%`}>
        <input type="range" min={10} max={80} value={Math.round((theme.glass ?? 0.4) * 100)} onChange={(e) => set({ glass: Number(e.target.value) / 100 })} />
      </Field>
      <Field label={`Sudut kartu: ${theme.radius}px`}>
        <input type="range" min={12} max={36} value={theme.radius} onChange={(e) => set({ radius: Number(e.target.value) })} />
      </Field>

      <button className="go alt" onClick={() => onChange(DEFAULT_THEME)}>Kembalikan ke default</button>
      <div className="msg">Perubahan langsung diterapkan dan tersimpan di perangkat ini. Warna teks menyesuaikan otomatis dengan terang atau gelapnya latar.</div>
    </Sheet>
  );
}
