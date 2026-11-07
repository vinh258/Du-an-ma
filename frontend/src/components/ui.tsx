import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../lib/types';
import { DocStatus } from '../lib/types';
import { statusLabel } from '../lib/format';

export const Spinner = ({ label = 'Đang tải…' }: { label?: string }) => (
  <div className="py-16 text-center text-sm text-muted" role="status">{label}</div>
);

export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="panel px-6 py-14 text-center">
    <p className="font-display text-xl">{title}</p>
    {hint && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorBox = ({ text }: { text: string }) => (
  <div className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{text}</div>
);

const statusStyle: Record<DocStatus, string> = {
  PENDING: 'bg-amber-soft text-amber', APPROVED: 'bg-brand-soft text-brand', REJECTED: 'bg-danger-soft text-danger',
};
export const StatusBadge = ({ status }: { status: DocStatus }) => (
  <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyle[status]}`}>{statusLabel[status]}</span>
);

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Phân trang">
      <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Trang trước</button>
      <span className="text-muted">Trang {page} / {totalPages}</span>
      <button className="btn-outline btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Trang sau</button>
    </nav>
  );
}

export function Stars({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 'text-sm' : 'text-2xl';
  return (
    <span className={`inline-flex ${px}`} role={onChange ? 'radiogroup' : 'img'} aria-label={`${value.toFixed(1)} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= Math.round(value);
        const star = <span className={on ? 'text-amber' : 'text-line'}>★</span>;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} sao`}
            className="px-0.5 hover:scale-110" onClick={() => onChange(n)}>{star}</button>
        ) : <span key={n}>{star}</span>;
      })}
    </span>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label={title}
      onClick={onClose}>
      <div className="panel w-full max-w-md p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-xl">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function PageTabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${value === t.id ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const TextLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="font-medium text-brand underline-offset-2 hover:underline">{children}</Link>
);

export type { Page };
