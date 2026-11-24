# Lucidly

_See your money clearly._

Pencatat keuangan pribadi dengan UI glass (gaya Apple). React 19 + Vite + TypeScript. Data disimpan di localStorage.

## Menjalankan
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + build produksi ke dist/
```

## Struktur
- `src/types.ts` : tipe domain
- `src/lib/storage.ts` : adapter localStorage (ganti dengan API/backend nanti)
- `src/lib/domain.ts` : kategori, format, perhitungan, transaksi berulang, parsing backup
- `src/components/` : Charts (SVG), Sheets (form dan bottom sheet)
- `src/App.tsx` : state dan layout dashboard
- `src/styles.css` : token tema light/dark dan gaya glass

## Key localStorage
Prefix `glass-finance:` sengaja dipertahankan agar data yang sudah tersimpan tetap terbaca.

`glass-finance:v1` (transaksi), `glass-finance:budgets:v1`, `glass-finance:recurring:v1`
