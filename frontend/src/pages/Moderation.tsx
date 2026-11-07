import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DocumentRow from '../components/DocumentRow';
import { useToast } from '../components/Toast';
import { Empty, ErrorBox, Modal, PageTabs, Pagination, Spinner } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { formatDate } from '../lib/format';
import { BulkResult, Doc, ModLog, Page, ReportItem } from '../lib/types';

type Tab = 'queue' | 'reports' | 'logs';

export default function Moderation() {
  const [tab, setTab] = useState<Tab>('queue');
  return (
    <div>
      <h1 className="mb-1 text-3xl">Kiểm duyệt</h1>
      <p className="mb-4 text-sm text-muted">Duyệt tài liệu mới, xử lý báo cáo vi phạm và xem lịch sử.</p>
      <PageTabs value={tab} onChange={setTab} tabs={[{ id: 'queue', label: 'Hàng đợi' }, { id: 'reports', label: 'Báo cáo' }, { id: 'logs', label: 'Lịch sử' }]} />
      {tab === 'queue' && <Queue />}
      {tab === 'reports' && <Reports />}
      {tab === 'logs' && <Logs />}
    </div>
  );
}

function Queue() {
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<Doc | null>(null);
  const [reason, setReason] = useState('');
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [bulkReject, setBulkReject] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ['mod-queue', page],
    queryFn: async () => (await api.get<Page<Doc>>('/moderation/queue', { params: { page, limit: 10 } })).data,
  });
  const done = () => { qc.invalidateQueries({ queryKey: ['mod-queue'] }); qc.invalidateQueries({ queryKey: ['mod-logs'] }); };
  const approve = useMutation({
    mutationFn: async (id: number) => api.post(`/moderation/documents/${id}/approve`),
    onSuccess: () => { toast('Đã duyệt tài liệu'); done(); }, onError: (e) => toast(errMsg(e), 'error'),
  });
  const reject = useMutation({
    mutationFn: async () => api.post(`/moderation/documents/${rejecting!.id}/reject`, { reason }),
    onSuccess: () => { toast('Đã từ chối tài liệu'); setRejecting(null); setReason(''); done(); }, onError: (e) => toast(errMsg(e), 'error'),
  });
  const bulk = useMutation({
    mutationFn: async (v: { action: 'APPROVE' | 'REJECT'; reason?: string }) => (await api.post<BulkResult>('/moderation/bulk', { ids: [...sel], ...v })).data,
    onSuccess: (r) => {
      toast(`Đã xử lý ${r.done} tài liệu${r.failed.length ? `, ${r.failed.length} lỗi` : ''}`, r.failed.length ? 'info' : 'success');
      setSel(new Set()); setBulkReject(false); setReason(''); done();
    },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const toggle = (id: number, on: boolean) => setSel((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n; });
  const preview = async (id: number) => {
    try { window.open((await api.get<{ url: string }>(`/documents/${id}/download`)).data.url, '_blank'); } catch (e) { toast(errMsg(e), 'error'); }
  };

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox text={errMsg(error)} />;
  if (!data?.items.length) return <Empty title="Hàng đợi trống" hint="Không có tài liệu nào đang chờ duyệt. Cảm ơn bạn!" />;
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2 text-muted">
          <input type="checkbox" className="accent-[rgb(var(--brand))]" checked={data.items.every((d) => sel.has(d.id))}
            onChange={(e) => setSel(e.target.checked ? new Set(data.items.map((d) => d.id)) : new Set())} /> Chọn tất cả trang này
        </label>
        <span className="text-muted">{data.total} tài liệu đang chờ, cũ nhất ở trên cùng.</span>
      </div>
      {sel.size > 0 && (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand bg-surface px-4 py-2.5 shadow-lift">
          <b className="text-sm">Đã chọn {sel.size}</b>
          <button className="btn-primary btn-sm ml-auto" disabled={bulk.isPending} onClick={() => bulk.mutate({ action: 'APPROVE' })}>Duyệt tất cả</button>
          <button className="btn-outline btn-sm text-danger" onClick={() => setBulkReject(true)}>Từ chối tất cả</button>
          <button className="text-xs text-muted underline" onClick={() => setSel(new Set())}>Bỏ chọn</button>
        </div>
      )}
      <div className="space-y-3">
        {data.items.map((d) => (
          <DocumentRow key={d.id} doc={d} select={{ checked: sel.has(d.id), onChange: (v) => toggle(d.id, v) }} actions={
            <>
              <button className="btn-outline btn-sm" onClick={() => preview(d.id)}>Xem file</button>
              <button className="btn-primary btn-sm" disabled={approve.isPending} onClick={() => approve.mutate(d.id)}>Duyệt</button>
              <button className="btn-outline btn-sm text-danger" onClick={() => setRejecting(d)}>Từ chối</button>
            </>
          } />
        ))}
      </div>
      <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
      {bulkReject && (
        <Modal title={`Từ chối ${sel.size} tài liệu`} onClose={() => setBulkReject(false)}>
          <label className="label" htmlFor="br">Lý do chung (tối thiểu 10 ký tự, gửi tới từng người đăng)</label>
          <textarea id="br" className="input" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setBulkReject(false)}>Hủy</button>
            <button className="btn-danger" disabled={reason.trim().length < 10 || bulk.isPending} onClick={() => bulk.mutate({ action: 'REJECT', reason })}>Từ chối</button>
          </div>
        </Modal>
      )}
      {rejecting && (
        <Modal title="Từ chối tài liệu" onClose={() => setRejecting(null)}>
          <p className="mb-2 text-sm text-muted">“{rejecting.title}” — lý do sẽ được gửi tới người đăng.</p>
          <label className="label" htmlFor="rr">Lý do (tối thiểu 10 ký tự)</label>
          <textarea id="rr" className="input" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setRejecting(null)}>Hủy</button>
            <button className="btn-danger" disabled={reason.trim().length < 10 || reject.isPending} onClick={() => reject.mutate()}>Từ chối</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Reports() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ['mod-reports'],
    queryFn: async () => (await api.get<Page<ReportItem>>('/moderation/reports', { params: { limit: 50 } })).data,
  });
  const resolve = useMutation({
    mutationFn: async (v: { id: number; action: 'VIOLATION' | 'DISMISS' }) => api.patch(`/moderation/reports/${v.id}`, { action: v.action }),
    onSuccess: () => { toast('Đã xử lý báo cáo'); qc.invalidateQueries({ queryKey: ['mod-reports'] }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox text={errMsg(error)} />;
  if (!data?.items.length) return <Empty title="Không có báo cáo nào đang mở" />;
  return (
    <ul className="space-y-3">
      {data.items.map((r) => (
        <li key={r.id} className="panel flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <Link to={`/documents/${r.document?.id}`} className="font-display text-lg hover:text-brand hover:underline">{r.document?.title}</Link>
            <p className="mt-1 text-sm">{r.reason}</p>
            <p className="mt-1 text-xs text-muted">Báo cáo bởi {r.reporter?.fullName} · {formatDate(r.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-outline btn-sm" onClick={() => resolve.mutate({ id: r.id, action: 'DISMISS' })}>Bỏ qua</button>
            <button className="btn-danger btn-sm" onClick={() => confirm('Gỡ tài liệu và trừ 20 điểm uy tín người đăng?') && resolve.mutate({ id: r.id, action: 'VIOLATION' })}>Xác nhận vi phạm</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Logs() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['mod-logs', page],
    queryFn: async () => (await api.get<Page<ModLog>>('/moderation/logs', { params: { page, limit: 20 } })).data,
  });
  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox text={errMsg(error)} />;
  if (!data?.items.length) return <Empty title="Chưa có lịch sử kiểm duyệt" />;
  return (
    <>
      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-muted"><tr><th className="px-4 py-2">Thời gian</th><th>Người duyệt</th><th>Tài liệu</th><th>Kết quả</th><th>Lý do</th></tr></thead>
          <tbody className="divide-y divide-line">
            {data.items.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-2">{formatDate(l.createdAt)}</td>
                <td>{l.moderator?.fullName}</td>
                <td><Link className="text-brand hover:underline" to={`/documents/${l.document?.id}`}>{l.document?.title}</Link></td>
                <td className={l.action === 'APPROVE' ? 'text-brand' : 'text-danger'}>{l.action === 'APPROVE' ? 'Duyệt' : 'Từ chối'}</td>
                <td className="max-w-xs truncate pr-4" title={l.reason ?? ''}>{l.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
    </>
  );
}
