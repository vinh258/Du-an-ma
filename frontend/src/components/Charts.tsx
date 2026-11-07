import { ReactNode, useEffect, useRef, useState } from 'react';

type Tone = 'brand' | 'accent' | 'amber' | 'danger';
const c = (t: Tone) => `rgb(var(--${t}))`;

/** Số chạy từ 0 đến giá trị (tắt khi người dùng chọn giảm chuyển động) */
export function useCountUp(target: number, ms = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function StatCard({ label, value, sub, tone = 'brand', icon }: { label: string; value: number; sub?: ReactNode; tone?: Tone; icon?: ReactNode }) {
  const n = useCountUp(value);
  return (
    <div className="panel card-hover p-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{label}</span>
        <span className="rounded-lg p-1.5" style={{ background: `${c(tone).replace(')', ' / 0.14)')}`, color: c(tone) }}>{icon}</span>
      </div>
      <p className="mt-1 font-display text-4xl font-extrabold tracking-tight">{n.toLocaleString('vi-VN')}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function LineChart({ dates, series, height = 220 }: { dates: string[]; series: { name: string; tone: Tone; values: number[] }[]; height?: number }) {
  const W = 640, H = height, L = 34, R = 10, T = 10, B = 24;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const top = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const x = (i: number) => L + ((W - L - R) * (dates.length <= 1 ? 0 : i / (dates.length - 1)));
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(dates.length - 1, Math.round(((px - L) / (W - L - R)) * (dates.length - 1)))));
  };
  const fmt = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap gap-4 text-xs">
        {series.map((s) => <span key={s.name} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: c(s.tone) }} />{s.name}</span>)}
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Biểu đồ theo ngày"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (top / 4) * i;
          return <g key={i}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgb(var(--line))" strokeDasharray={i ? '3 4' : ''} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="rgb(var(--muted))">{Math.round(v)}</text></g>;
        })}
        {[0, Math.floor((dates.length - 1) / 2), dates.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'} fontSize="10" fill="rgb(var(--muted))">{fmt(dates[i])}</text>
        ))}
        {series.map((s, k) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
          return (
            <g key={s.name}>
              {k === 0 && <polygon points={`${x(0)},${y(0)} ${pts} ${x(dates.length - 1)},${y(0)}`} fill={c(s.tone)} opacity="0.12" />}
              <polyline points={pts} fill="none" stroke={c(s.tone)} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {hover !== null && <circle cx={x(hover)} cy={y(s.values[hover])} r="4.5" fill="rgb(var(--surface))" stroke={c(s.tone)} strokeWidth="2.5" />}
            </g>
          );
        })}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="rgb(var(--muted))" strokeDasharray="3 3" opacity="0.6" />}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-8 z-10 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: `${Math.min(80, Math.max(2, (x(hover) / W) * 100 - 8))}%` }}>
          <p className="mb-1 font-semibold">{fmt(dates[hover])}</p>
          {series.map((s) => <p key={s.name} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: c(s.tone) }} />{s.name}: <b>{s.values[hover]}</b></p>)}
        </div>
      )}
    </div>
  );
}

export function Donut({ parts, center }: { parts: { label: string; value: number; tone: Tone }[]; center: ReactNode }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const R = 42, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90" role="img" aria-label="Tỷ lệ trạng thái tài liệu">
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(var(--line))" strokeWidth="12" />
          {total > 0 && parts.map((p) => {
            const len = (p.value / total) * C;
            const el = <circle key={p.label} cx="50" cy="50" r={R} fill="none" stroke={c(p.tone)} strokeWidth="12"
              strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-acc} style={{ transition: 'stroke-dasharray .8s ease' }} />;
            acc += len; return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: c(p.tone) }} />
            <span className="text-muted">{p.label}</span><b className="ml-auto pl-4">{p.value}</b></li>
        ))}
      </ul>
    </div>
  );
}

export function BarList({ rows }: { rows: { label: string; value: number; hint?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-sm"><span className="truncate pr-2">{r.label}</span><b>{r.value}{r.hint && <span className="ml-1 font-normal text-muted">{r.hint}</span>}</b></div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-soft">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(r.value / max) * 100}%`, background: 'linear-gradient(90deg, rgb(var(--brand)), rgb(var(--accent)))' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
