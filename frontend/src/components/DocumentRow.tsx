import { Link } from 'react-router-dom';
import { fileKind, formatBytes, formatDate } from '../lib/format';
import { Doc } from '../lib/types';
import { StatusBadge, Stars } from './ui';

/** Một "phiếu mục lục" trong danh sách tài liệu */
export default function DocumentRow({ doc, showStatus = false, actions, select }: {
  doc: Doc; showStatus?: boolean; actions?: React.ReactNode; select?: { checked: boolean; onChange: (v: boolean) => void };
}) {
  return (
    <article className={`panel card-hover flex gap-4 p-4 ${select?.checked ? 'border-brand ring-2 ring-brand/30' : ''}`}>
      {select && (
        <input type="checkbox" className="mt-1.5 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]" checked={select.checked}
          onChange={(e) => select.onChange(e.target.checked)} aria-label={`Chọn “${doc.title}”`} />
      )}
      <div className="hidden w-12 shrink-0 flex-col items-center justify-center rounded bg-brand-soft text-xs font-semibold text-brand sm:flex">
        {fileKind(doc.mimeType)}
        <span className="mt-0.5 font-normal text-muted">{formatBytes(doc.fileSize)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/documents/${doc.id}`} className="font-display text-lg font-semibold leading-snug hover:text-brand hover:underline">{doc.title}</Link>
          {showStatus && <StatusBadge status={doc.status} />}
        </div>
        <p className="mt-1 text-sm text-muted">
          {doc.subject ? <span className="font-medium text-ink">{doc.subject.code} · {doc.subject.name}</span> : null}
          {doc.subject?.faculty ? ` — ${doc.subject.faculty.name}` : ''}
        </p>
        {doc.description && <p className="mt-1 line-clamp-2 text-sm text-ink/80">{doc.description}</p>}
        {showStatus && doc.status === 'REJECTED' && doc.rejectReason && (
          <p className="mt-2 rounded bg-danger-soft px-2 py-1 text-sm text-danger">Lý do từ chối: {doc.rejectReason}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {doc.uploader && <span>{doc.uploader.fullName}</span>}
          <span>{formatDate(doc.createdAt)}</span>
          <span>{doc.viewCount} lượt xem</span>
          <span>{doc.downloadCount} lượt tải</span>
          {doc.ratingCount > 0 && <span className="inline-flex items-center gap-1"><Stars value={doc.ratingAvg} size="sm" /> {doc.ratingAvg.toFixed(1)} ({doc.ratingCount})</span>}
        </div>
        {doc.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {doc.tags.map((t) => (
              <Link key={t.id} to={`/?tags=${t.slug}`} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted hover:border-brand hover:text-brand">#{t.name}</Link>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-col items-end gap-2">{actions}</div>}
    </article>
  );
}
