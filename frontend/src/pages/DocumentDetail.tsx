import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import DeleteDocModal from '../components/DeleteDocModal';
import { useToast } from '../components/Toast';
import { ErrorBox, Modal, Spinner, Stars, StatusBadge } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { fileKind, formatBytes, formatDate, timeAgo } from '../lib/format';
import { CommentNode, Doc } from '../lib/types';

export default function DocumentDetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const nav = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');

  const { data: doc, isLoading, error } = useQuery({
    queryKey: ['document', id, user?.id],
    queryFn: async () => (await api.get<Doc>(`/documents/${id}`)).data,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['document', id] });
  const needLogin = () => { toast('Hãy đăng nhập để thực hiện thao tác này', 'info'); nav('/login', { state: { from: `/documents/${id}` } }); };

  const download = useMutation({
    mutationFn: async () => (await api.get<{ url: string }>(`/documents/${id}/download`)).data.url,
    onSuccess: (url) => { window.open(url, '_blank'); refresh(); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const rate = useMutation({
    mutationFn: async (score: number) => (await api.put(`/documents/${id}/rating`, { score })).data,
    onSuccess: () => { toast('Đã ghi nhận đánh giá'); refresh(); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const bookmark = useMutation({
    mutationFn: async (on: boolean) => (on ? api.put(`/documents/${id}/bookmark`) : api.delete(`/documents/${id}/bookmark`)),
    onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ['bookmarks'] }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const report = useMutation({
    mutationFn: async () => (await api.post(`/documents/${id}/reports`, { reason })).data,
    onSuccess: () => { toast('Đã gửi báo cáo. Cảm ơn bạn!'); setReporting(false); setReason(''); },
    onError: (e) => toast(errMsg(e), 'error'),
  });

  if (isLoading) return <Spinner />;
  if (error || !doc) return <ErrorBox text={errMsg(error) || 'Không tìm thấy tài liệu'} />;
  const isOwner = user?.id === doc.uploaderId;
  const approved = doc.status === 'APPROVED';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        {!approved && (
          <div className={`mb-4 rounded-md px-4 py-3 text-sm ${doc.status === 'REJECTED' ? 'bg-danger-soft text-danger' : 'bg-amber-soft text-amber'}`}>
            <StatusBadge status={doc.status} /> {doc.status === 'PENDING' ? 'Tài liệu đang chờ kiểm duyệt, chỉ bạn và người kiểm duyệt nhìn thấy.' : `Lý do: ${doc.rejectReason}`}
          </div>
        )}
        <h1 className="text-3xl leading-tight">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {doc.subject && <b className="text-ink">{doc.subject.code} · {doc.subject.name}</b>}
          {doc.subject?.faculty && ` — ${doc.subject.faculty.name}`}
        </p>
        <p className="mt-1 text-sm text-muted">
          Đăng bởi <Link className="font-medium text-brand hover:underline" to={`/profile/${doc.uploaderId}`}>{doc.uploader?.fullName}</Link>
          {doc.uploader?.reputationScore !== undefined && ` (uy tín ${doc.uploader.reputationScore})`} · {formatDate(doc.createdAt)}
        </p>
        {doc.description && <p className="mt-4 whitespace-pre-line leading-relaxed">{doc.description}</p>}
        {doc.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {doc.tags.map((t) => <Link key={t.id} to={`/?tags=${t.slug}`} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted hover:border-brand hover:text-brand">#{t.name}</Link>)}
          </div>
        )}
        <AiPanel doc={doc} canGenerate={isOwner || hasRole('MOD', 'ADMIN')} />
        {(approved || isOwner || hasRole('MOD', 'ADMIN')) && <PreviewPanel doc={doc} />}
        {approved && <Comments docId={doc.id} />}
        {approved && <Related docId={doc.id} />}
      </div>

      <aside className="space-y-4">
        <div className="panel space-y-3 p-4">
          <div className="text-sm"><b>{doc.fileName}</b><br /><span className="text-muted">{fileKind(doc.mimeType)} · {formatBytes(doc.fileSize)}</span></div>
          <button className="btn-primary w-full" onClick={() => (user ? download.mutate() : needLogin())} disabled={download.isPending}>
            {download.isPending ? 'Đang tạo link…' : 'Tải xuống'}
          </button>
          {approved && (
            <button className="btn-outline w-full" onClick={() => (user ? bookmark.mutate(!doc.bookmarked) : needLogin())}>
              {doc.bookmarked ? '★ Đã lưu — bỏ lưu' : '☆ Lưu tài liệu'}
            </button>
          )}
          <dl className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-center text-sm">
            <div><dt className="text-xs text-muted">Lượt xem</dt><dd className="font-semibold">{doc.viewCount}</dd></div>
            <div><dt className="text-xs text-muted">Lượt tải</dt><dd className="font-semibold">{doc.downloadCount}</dd></div>
          </dl>
        </div>

        {approved && (
          <div className="panel p-4">
            <p className="text-sm font-medium">Đánh giá</p>
            <div className="mt-1 flex items-center gap-2">
              <Stars value={doc.ratingAvg} size="sm" />
              <span className="text-sm text-muted">{doc.ratingCount ? `${doc.ratingAvg.toFixed(1)} (${doc.ratingCount})` : 'Chưa có đánh giá'}</span>
            </div>
            {!isOwner && (
              <div className="mt-3 border-t border-line pt-3">
                <p className="mb-1 text-xs text-muted">{doc.myRating ? 'Đánh giá của bạn (bấm để đổi)' : 'Chấm điểm tài liệu này'}</p>
                <Stars value={doc.myRating ?? 0} onChange={(v) => (user ? rate.mutate(v) : needLogin())} />
              </div>
            )}
          </div>
        )}

        {(isOwner || hasRole('ADMIN')) && (
          <div className="panel space-y-2 p-4">
            <p className="text-sm font-medium">{isOwner ? 'Quản lý bài đăng' : 'Quản trị viên'}</p>
            {isOwner && <Link to={`/documents/${doc.id}/edit`} className="btn-outline w-full">Sửa tài liệu</Link>}
            <button className="btn-outline w-full text-danger" onClick={() => setDeleting(true)}>{isOwner ? 'Xóa tài liệu' : 'Xóa bài này'}</button>
          </div>
        )}

        {approved && !isOwner && (
          <button className="text-xs text-muted underline hover:text-danger" onClick={() => (user ? setReporting(true) : needLogin())}>Báo cáo vi phạm</button>
        )}
      </aside>

      {deleting && <DeleteDocModal doc={doc} byAdmin={!isOwner} onClose={() => setDeleting(false)} onDeleted={() => nav(isOwner ? '/my-documents' : '/')} />}

      {reporting && (
        <Modal title="Báo cáo tài liệu" onClose={() => setReporting(false)}>
          <label className="label" htmlFor="rp">Mô tả vấn đề (vi phạm bản quyền, nội dung sai, spam…)</label>
          <textarea id="rp" className="input" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setReporting(false)}>Hủy</button>
            <button className="btn-danger" disabled={reason.trim().length < 10 || report.isPending} onClick={() => report.mutate()}>Gửi báo cáo</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Comments({ docId }: { docId: number }) {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null);
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['comments', docId],
    queryFn: async () => (await api.get<CommentNode[]>(`/documents/${docId}/comments`)).data,
  });
  const add = useMutation({
    mutationFn: async () => api.post(`/documents/${docId}/comments`, { content: text, parentId: replyTo?.id }),
    onSuccess: () => { setText(''); setReplyTo(null); qc.invalidateQueries({ queryKey: ['comments', docId] }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/comments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', docId] }),
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const edit = useMutation({
    mutationFn: async () => api.patch(`/comments/${editing!.id}`, { content: editing!.text }),
    onSuccess: () => { setEditing(null); qc.invalidateQueries({ queryKey: ['comments', docId] }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); if (text.trim()) add.mutate(); };

  const render = (c: CommentNode, depth = 0) => (
    <li key={c.id} className={depth ? 'ml-6 border-l border-line pl-4' : ''}>
      <div className="py-2">
        <p className="text-sm"><b>{c.user?.fullName ?? 'Người dùng'}</b>
          {c.user?.role && c.user.role !== 'STUDENT' && <span className="ml-1.5 rounded bg-brand-soft px-1.5 text-xs text-brand">{c.user.role === 'ADMIN' ? 'Quản trị' : 'Kiểm duyệt'}</span>}
          <span className="ml-2 text-xs text-muted">{timeAgo(c.createdAt)}</span></p>
        {editing?.id === c.id ? (
          <div className="mt-1">
            <textarea className="input" rows={3} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} aria-label="Sửa bình luận" />
            <div className="mt-1.5 flex gap-2">
              <button className="btn-primary btn-sm" disabled={!editing.text.trim() || edit.isPending} onClick={() => edit.mutate()}>Lưu</button>
              <button className="btn-outline btn-sm" onClick={() => setEditing(null)}>Hủy</button>
            </div>
          </div>
        ) : (
          <p className={`mt-0.5 whitespace-pre-line text-sm ${c.isDeleted ? 'italic text-muted' : ''}`}>
            {c.isDeleted ? 'Bình luận đã bị xóa' : c.content}
            {!c.isDeleted && c.editedAt && <span className="ml-1.5 text-xs text-muted">(đã sửa)</span>}
          </p>
        )}
        {!c.isDeleted && user && (
          <div className="mt-1 flex gap-3 text-xs text-muted">
            {depth === 0 && <button className="hover:text-brand" onClick={() => setReplyTo(c)}>Trả lời</button>}
            {user.id === c.user?.id && <button className="hover:text-brand" onClick={() => setEditing({ id: c.id, text: c.content })}>Sửa</button>}
            {(user.id === c.user?.id || hasRole('MOD', 'ADMIN')) && <button className="hover:text-danger" onClick={() => confirm('Xóa bình luận này?') && del.mutate(c.id)}>Xóa</button>}
          </div>
        )}
      </div>
      {c.replies.length > 0 && <ul>{c.replies.map((r) => render(r, depth + 1))}</ul>}
    </li>
  );

  return (
    <section className="mt-10" aria-label="Bình luận">
      <h2 className="mb-3 text-2xl">Bình luận</h2>
      {user ? (
        <form onSubmit={submit} className="mb-4">
          {replyTo && <p className="mb-1 text-xs text-muted">Đang trả lời {replyTo.user?.fullName} · <button type="button" className="underline" onClick={() => setReplyTo(null)}>hủy</button></p>}
          <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Chia sẻ nhận xét của bạn về tài liệu…" aria-label="Nội dung bình luận" />
          <button className="btn-primary btn-sm mt-2" disabled={!text.trim() || add.isPending}>Gửi bình luận</button>
        </form>
      ) : <p className="mb-4 text-sm text-muted"><Link className="text-brand underline" to="/login">Đăng nhập</Link> để bình luận.</p>}
      {isLoading ? <Spinner /> : data && data.length > 0
        ? <ul className="divide-y divide-line">{data.map((c) => render(c))}</ul>
        : <p className="text-sm text-muted">Chưa có bình luận nào.</p>}
    </section>
  );
}

function PreviewPanel({ doc }: { doc: Doc }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: url, isFetching, error } = useQuery({
    queryKey: ['preview', doc.id], enabled: open && !!user,
    queryFn: async () => (await api.get<{ url: string }>(`/documents/${doc.id}/preview`)).data.url, staleTime: 4 * 60_000,
  });
  if (doc.mimeType !== 'application/pdf') return <p className="mt-6 text-sm text-muted">Chỉ xem trước trực tiếp được file PDF. Hãy tải file Word về để xem.</p>;
  return (
    <section className="mt-6" aria-label="Xem trước">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold">Xem trước</h2>
        {user ? <button className="btn-outline btn-sm" onClick={() => setOpen(!open)}>{open ? 'Ẩn' : 'Xem trước PDF'}</button>
          : <Link to="/login" className="text-sm text-brand underline">Đăng nhập để xem trước</Link>}
      </div>
      {open && (isFetching ? <p className="text-sm text-muted">Đang tải…</p> : error ? <ErrorBox text={errMsg(error)} /> :
        url && <iframe src={url} title={`Xem trước ${doc.title}`} className="h-[70vh] w-full rounded-2xl border border-line bg-surface" />)}
    </section>
  );
}

function AiPanel({ doc, canGenerate }: { doc: Doc; canGenerate: boolean }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [tags, setTags] = useState<string[]>([]);
  const { data: f } = useQuery({
    queryKey: ['features'], staleTime: 10 * 60_000,
    queryFn: async () => (await api.get<{ ai: boolean }>('/system/features')).data,
  });
  const gen = useMutation({
    mutationFn: async () => (await api.post<{ summary: string; suggestedTags: string[] }>(`/documents/${doc.id}/ai-summary`)).data,
    onSuccess: (r) => { setTags(r.suggestedTags); qc.invalidateQueries({ queryKey: ['document'] }); toast('Đã tạo tóm tắt bằng AI'); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const canButton = canGenerate && !!f?.ai;
  if (!doc.aiSummary && !canButton) return null;
  return (
    <section className="mt-6 rounded-2xl border border-accent/30 bg-accent-soft/60 p-4" aria-label="Tóm tắt AI">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">✨ Tóm tắt bằng AI</h2>
        {canButton && <button className="btn-outline btn-sm" disabled={gen.isPending} onClick={() => gen.mutate()}>{gen.isPending ? 'Đang tóm tắt…' : doc.aiSummary ? 'Tạo lại' : 'Tạo tóm tắt'}</button>}
      </div>
      {doc.aiSummary ? <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{doc.aiSummary}</p> : <p className="mt-2 text-sm text-muted">Bấm “Tạo tóm tắt” để AI đọc tài liệu và tóm tắt nội dung.</p>}
      {tags.length > 0 && <p className="mt-2 text-sm">Tag gợi ý: {tags.map((t) => <span key={t} className="mr-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-xs">#{t}</span>)}</p>}
    </section>
  );
}

function Related({ docId }: { docId: number }) {
  const { data } = useQuery({ queryKey: ['related', docId], queryFn: async () => (await api.get<Doc[]>(`/documents/${docId}/related`)).data });
  if (!data?.length) return null;
  return (
    <section className="mt-10" aria-label="Tài liệu liên quan">
      <h2 className="mb-3 text-2xl font-bold">Tài liệu liên quan</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((d) => (
          <Link key={d.id} to={`/documents/${d.id}`} className="panel card-hover block p-4">
            <p className="font-display text-base font-semibold leading-snug">{d.title}</p>
            <p className="mt-1 text-xs text-muted">{d.subject?.code} · {d.subject?.name}</p>
            <p className="mt-2 flex items-center gap-3 text-xs text-muted">
              {d.ratingCount > 0 && <span className="inline-flex items-center gap-1"><Stars value={d.ratingAvg} size="sm" />{d.ratingAvg.toFixed(1)}</span>}
              <span>{d.downloadCount} lượt tải</span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
