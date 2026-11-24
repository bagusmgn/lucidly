import { useEffect, useState } from "react";
import { createStore } from "./storage";

export type Mode = "system" | "light" | "dark";

export interface Theme {
  mode: Mode;
  preset: string; // "default" | id preset | "custom"
  bg: [string, string, string]; // warna latar gradient (#rrggbb)
  accent: [string, string]; // warna aksen (#rrggbb)
  blur: number; // px, 0-40
  glass: number | null; // opasitas kaca 0.1-0.8; null = otomatis mengikuti mode
  radius: number; // px, sudut kartu 12-36
}

export interface Preset {
  id: string;
  name: string;
  bg: [string, string, string];
  accent: [string, string];
}

export const PRESETS: Preset[] = [
  { id: "default", name: "Aurora", bg: ["#7aa7ff", "#c58bff", "#ffb8a0"], accent: ["#0a7cff", "#8a5cff"] },
  { id: "sunset", name: "Sunset", bg: ["#ff9a8b", "#ff6a88", "#ffd08a"], accent: ["#ff5e3a", "#c2185b"] },
  { id: "ocean", name: "Ocean", bg: ["#4facfe", "#00c6c7", "#7be0b0"], accent: ["#0077ff", "#00a896"] },
  { id: "forest", name: "Forest", bg: ["#6fcf97", "#2f855a", "#b7e4a8"], accent: ["#16a34a", "#0d9488"] },
  { id: "midnight", name: "Midnight", bg: ["#0f172a", "#1e1b4b", "#312e81"], accent: ["#6366f1", "#a855f7"] },
  { id: "mono", name: "Mono", bg: ["#d9d9de", "#b9bcc6", "#eceef2"], accent: ["#111827", "#4b5563"] },
];

export const DEFAULT_THEME: Theme = {
  mode: "system",
  preset: "default",
  bg: PRESETS[0].bg,
  accent: PRESETS[0].accent,
  blur: 24,
  glass: null,
  radius: 26,
};

/* ---------- util warna ---------- */
type RGB = [number, number, number];
const HEX = /^#[0-9a-f]{6}$/i;
const toRgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c: RGB) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const darken = (hex: string, t: number) => toHex(toRgb(hex).map((v) => v * (1 - t)) as RGB);
const luminance = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/* Palet turunan: teks, garis, kaca, dsb. mengikuti terang/gelapnya latar */
const DARK_PALETTE: Record<string, string> = {
  "--text": "#f4f6fb",
  "--sub": "rgba(244,246,251,.62)",
  "--line": "rgba(255,255,255,.16)",
  "--shadow": "0 8px 32px rgba(0,0,0,.4)",
  "--glass-rgb": "30,32,48",
  "--glass2": "rgba(60,64,92,.5)",
  "--inc": "#3ddc84",
  "--exp": "#ff6b70",
  "--inp": "rgba(255,255,255,.08)",
};
const LIGHT_PALETTE: Record<string, string> = {
  "--text": "#10131a",
  "--sub": "rgba(16,19,26,.6)",
  "--line": "rgba(255,255,255,.65)",
  "--shadow": "0 8px 32px rgba(31,38,80,.18)",
  "--glass-rgb": "255,255,255",
  "--glass2": "rgba(255,255,255,.55)",
  "--inc": "#12a150",
  "--exp": "#e5484d",
  "--inp": "rgba(255,255,255,.5)",
};
const PROPS = [
  "--bg1", "--bg2", "--bg3", "--acc", "--acc2", "--blob1", "--blob2", "--glass-a", "--blur", "--radius",
  ...Object.keys(DARK_PALETTE),
];

/** Menerapkan tema ke :root. Preset "default" memakai token CSS bawaan. */
export function applyTheme(t: Theme) {
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  PROPS.forEach((p) => root.style.removeProperty(p));

  if (t.mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t.mode);

  const modeDark = t.mode === "dark" || (t.mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (t.preset !== "default") {
    const bg = t.bg.map((c) => (modeDark ? darken(c, 0.6) : c));
    const rgbs = bg.map(toRgb);
    const avg = [0, 1, 2].map((i) => rgbs.reduce((s, c) => s + c[i], 0) / 3) as RGB;
    const dark = luminance(avg) < 0.38; // teks otomatis kontras dengan latar
    bg.forEach((c, i) => set(`--bg${i + 1}`, c));
    set("--acc", t.accent[0]);
    set("--acc2", t.accent[1]);
    set("--blob1", t.accent[0]);
    set("--blob2", t.accent[1]);
    Object.entries(dark ? DARK_PALETTE : LIGHT_PALETTE).forEach(([k, v]) => set(k, v));
    set("--glass-a", String(t.glass ?? (dark ? 0.42 : 0.38)));
  } else if (t.glass !== null) {
    set("--glass-a", String(t.glass));
  }
  if (t.blur !== 24) set("--blur", `${t.blur}px`);
  if (t.radius !== 26) set("--radius", `${t.radius}px`);
}

/* ---------- penyimpanan & hook ---------- */
const themeStorage = createStore<Theme>("glass-finance:theme:v1", () => DEFAULT_THEME, (v) => !!v && typeof v === "object");

const num = (v: unknown, min: number, max: number, d: number) =>
  typeof v === "number" && isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const col = (c: unknown, f: string) => (typeof c === "string" && HEX.test(c) ? c : f);

function sanitize(v: Partial<Theme>): Theme {
  const d = DEFAULT_THEME;
  const bg = Array.isArray(v.bg) ? v.bg : [];
  const ac = Array.isArray(v.accent) ? v.accent : [];
  return {
    mode: v.mode === "light" || v.mode === "dark" ? v.mode : "system",
    preset: typeof v.preset === "string" ? v.preset : "default",
    bg: [col(bg[0], d.bg[0]), col(bg[1], d.bg[1]), col(bg[2], d.bg[2])],
    accent: [col(ac[0], d.accent[0]), col(ac[1], d.accent[1])],
    blur: num(v.blur, 0, 40, 24),
    glass: v.glass == null ? null : num(v.glass, 0.1, 0.8, 0.4),
    radius: num(v.radius, 12, 36, 26),
  };
}

export const loadTheme = () => sanitize(themeStorage.load());

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  useEffect(() => {
    applyTheme(theme);
    themeStorage.save(theme);
    if (theme.mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme(theme);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);
  return [theme, setTheme];
}
