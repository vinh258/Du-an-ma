import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { Empty, ErrorBox, Modal, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { api, downloadFile, errMsg } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { BulkResult, Doc, DocStatus, Page } from '../../lib/types';

type Action = 'APPROVE' | 'REJECT' | 'DELETE';

export default function DocsTab() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<DocStatus | ''>('');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-docs', q, status, page],
    queryFn: async () => (await api.get<Page<Doc>>('/admin/documents', { params: { q: q || undefined, status: status || undefined, page, limit: 15 } })).data,
  });

  const run = useMutation({
    mutationFn: async (a: Action) => {
      const ids = [...sel];
      const res = a === 'DELETE'
        ? await api.post<BulkResult>('/admin/documents/bulk-delete', { ids, reason: reason || undefined })
        : await api.post<BulkResult>('/moderation/bulk', { ids, action: a, reason: reason || undefined });
      return res.data;
    },
    onSuccess: (r) => {
      toast(`Đã xử lý ${r.done} tài liệu${r.failed.length ? `, ${r.failed.length} lỗi (${r.failed[0].message})` : ''}`, r.failed.length ? 'info' : 'success');
      setSel(new Set()); setPending(null); setReason('');
      ['admin-docs', 'admin-stats', 'documents', 'mod-queue', 'trending'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => toast(errMsg(e), 'error'),
  });

  const items = data?.items ?? [];
  const allChecked = items.length > 0 && items.every((d) => sel.has(d.id));
  const toggle = (id: number, on: boolean) => setSel((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n; });
  const toggleAll = (on: boolean) => setSel((s) => { const n = new Set(s); items.forEach((d) => (on ? n.add(d.id) : n.delete(d.id))); return n; });
  const needReason = pending === 'REJECT' || pending === 'DELETE';
  const title: Record<Action, string> = { APPROVE: 'Duyệt', REJECT: 'Từ chối', DELETE: 'Xóa' };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Tìm theo tiêu đề hoặc người đăng…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Tìm tài liệu" />
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value as DocStatus | ''); setPage(1); }} aria-label="Lọc trạng thái">
          <option value="">Mọi trạng thái</option><option value="PENDING">Chờ duyệt</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Bị từ chối</option>
        </select>
        <button className="btn-outline ml-auto" onClick={() => downloadFile('/admin/export/documents', 'tai-lieu.csv').catch((e) => toast(errMsg(e), 'error'))}>Xuất CSV</button>
      </div>

      {sel.size > 0 && (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand bg-surface px-4 py-2.5 shadow-lift">
          <b className="text-sm">Đã chọn {sel.size}</b>
          <button className="btn-primary btn-sm ml-auto" onClick={() => setPending('APPROVE')}>Duyệt</button>
          <button className="btn-outline btn-sm" onClick={() => setPending('REJECT')}>Từ chối</button>
          <button className="btn-danger btn-sm" onClick={() => setPending('DELETE')}>Xóa</button>
          <button className="text-xs text-muted underline" onClick={() => setSel(new Set())}>Bỏ chọn</button>
        </div>
      )}

      {isLoading && <Spinner />}
      {error && <ErrorBox text={errMsg(error)} />}
      {data && items.length === 0 && <Empty title="Không có tài liệu nào" />}
      {data && items.length > 0 && (
        <>
          <div className="panel overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr><th className="w-10 px-4 py-2"><input type="checkbox" className="accent-[rgb(var(--brand))]" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} aria-label="Chọn tất cả" /></th>
                  <th>Tài liệu</th><th>Người đăng</th><th>Trạng thái</th><th>Tải</th><th className="pr-4">Ngày đăng</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((d) => (
                  <tr key={d.id} className={sel.has(d.id) ? 'bg-brand-soft/50' : ''}>
                    <td className="px-4 py-2"><input type="checkbox" className="accent-[rgb(var(--brand))]" checked={sel.has(d.id)} onChange={(e) => toggle(d.id, e.target.checked)} aria-label={`Chọn ${d.title}`} /></td>
                    <td className="max-w-xs py-2"><Link to={`/documents/${d.id}`} className="font-medium hover:text-brand hover:underline">{d.title}</Link>
                      <p className="text-xs text-muted">{d.subject?.code} · {d.subject?.name}</p></td>
                    <td>{d.uploader?.fullName}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>{d.downloadCount}</td>
                    <td className="whitespace-nowrap pr-4">{formatDate(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

      {pending && (
        <Modal title={`${title[pending]} ${sel.size} tài liệu?`} onClose={() => setPending(null)}>
          {pending === 'DELETE' && <p className="mb-3 text-sm text-danger">Xóa vĩnh viễn cùng file, bình luận và đánh giá. Người đăng sẽ nhận thông báo kèm lý do.</p>}
          {pending === 'APPROVE' && <p className="mb-3 text-sm text-muted">Chỉ các tài liệu đang chờ duyệt mới được duyệt; bài khác sẽ được bỏ qua và báo lại.</p>}
          {needReason && (
            <div><label className="label" htmlFor="bulk-reason">Lý do{pending === 'REJECT' ? ' (tối thiểu 10 ký tự)' : ' (gửi cho người đăng)'}</label>
              <textarea id="bulk-reason" className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setPending(null)}>Hủy</button>
            <button className={pending === 'DELETE' ? 'btn-danger' : 'btn-primary'} disabled={run.isPending || (pending === 'REJECT' && reason.trim().length < 10)} onClick={() => run.mutate(pending)}>
              {run.isPending ? 'Đang xử lý…' : title[pending]}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
