export const PALETTE = ["#0a7cff", "#8a5cff", "#ff7ac6", "#ffb020", "#2fd0a0", "#ff6b70"];

interface TrendPoint {
  key: string;
  label: string;
  inc: number;
  exp: number;
}

export function Trend({ data }: { data: TrendPoint[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.inc, d.exp]));
  return (
    <svg viewBox="0 0 320 156" width="100%" role="img" aria-label="Tren pemasukan dan pengeluaran 6 bulan">
      <line x1={0} x2={320} y1={125} y2={125} style={{ stroke: "var(--line)" }} />
      {data.map((d, i) => {
        const x = i * 53 + 9;
        const hi = (d.inc / max) * 105;
        const he = (d.exp / max) * 105;
        return (
          <g key={d.key}>
            <rect x={x} y={125 - hi} width={15} height={hi} rx={5} style={{ fill: "var(--inc)" }} opacity={0.85} />
            <rect x={x + 18} y={125 - he} width={15} height={he} rx={5} style={{ fill: "var(--exp)" }} opacity={0.85} />
            <text x={x + 16} y={144} textAnchor="middle" fontSize={11} style={{ fill: "var(--sub)" }}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Donut({ items, total }: { items: [string, number][]; total: number }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  let off = 0;
  return (
    <svg viewBox="0 0 120 120" width={130} height={130} role="img" aria-label="Komposisi pengeluaran bulan ini">
      <g transform="rotate(-90 60 60)">
        {items.map(([c, v], i) => {
          const len = (v / total) * C;
          const el = (
            <circle key={c} cx={60} cy={60} r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={16} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />
          );
          off += len;
          return el;
        })}
      </g>
      <text x={60} y={64} textAnchor="middle" fontSize={12} fontWeight={700} style={{ fill: "var(--text)" }}>
        {items.length} kategori
      </text>
    </svg>
  );
}
