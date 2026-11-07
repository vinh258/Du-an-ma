import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Empty, ErrorBox, Pagination, Spinner } from '../../components/ui';
import { api, errMsg } from '../../lib/api';
import { AuditItem, Page } from '../../lib/types';

const LABEL: Record<string, { text: string; cls: string }> = {
  DOC_APPROVED: { text: 'Duyệt tài liệu', cls: 'bg-brand-soft text-brand' },
  DOC_REJECTED: { text: 'Từ chối tài liệu', cls: 'bg-amber-soft text-amber' },
  DOC_DELETED: { text: 'Xóa tài liệu', cls: 'bg-danger-soft text-danger' },
  REPORT_RESOLVED: { text: 'Xử lý báo cáo', cls: 'bg-amber-soft text-amber' },
  USER_ROLE_CHANGED: { text: 'Đổi quyền', cls: 'bg-accent-soft text-accent' },
  USER_STATUS_CHANGED: { text: 'Khóa/Mở khóa', cls: 'bg-danger-soft text-danger' },
  REPUTATION_ADJUSTED: { text: 'Chỉnh điểm uy tín', cls: 'bg-accent-soft text-accent' },
  FACULTY_CREATED: { text: 'Thêm khoa', cls: 'bg-brand-soft text-brand' }, FACULTY_UPDATED: { text: 'Sửa khoa', cls: 'bg-brand-soft text-brand' }, FACULTY_DELETED: { text: 'Xóa khoa', cls: 'bg-danger-soft text-danger' },
  SUBJECT_CREATED: { text: 'Thêm môn học', cls: 'bg-brand-soft text-brand' }, SUBJECT_UPDATED: { text: 'Sửa môn học', cls: 'bg-brand-soft text-brand' }, SUBJECT_DELETED: { text: 'Xóa môn học', cls: 'bg-danger-soft text-danger' },
  TAG_RENAMED: { text: 'Đổi tên tag', cls: 'bg-brand-soft text-brand' }, TAG_DELETED: { text: 'Xóa tag', cls: 'bg-danger-soft text-danger' }, TAG_MERGED: { text: 'Gộp tag', cls: 'bg-brand-soft text-brand' },
  ANNOUNCEMENT_SENT: { text: 'Thông báo chung', cls: 'bg-accent-soft text-accent' },
  EXPORT: { text: 'Xuất dữ liệu', cls: 'bg-line/60 text-muted' },
};
const label = (a: string) => LABEL[a] ?? { text: a, cls: 'bg-line/60 text-muted' };

export default function AuditTab() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', action, page],
    queryFn: async () => (await api.get<Page<AuditItem> & { actions: string[] }>('/admin/audit-logs', { params: { action: action || undefined, page, limit: 20 } })).data,
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="Lọc theo hành động">
          <option value="">Mọi hành động</option>
          {data?.actions.map((a) => <option key={a} value={a}>{label(a).text}</option>)}
        </select>
        {data && <span className="text-sm text-muted">{data.total} bản ghi</span>}
      </div>
      {isLoading && <Spinner />}
      {error && <ErrorBox text={errMsg(error)} />}
      {data && data.items.length === 0 && <Empty title="Chưa có hoạt động nào được ghi lại" />}
      {data && data.items.length > 0 && (
        <>
          <div className="panel overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted"><tr><th className="px-4 py-2">Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th className="pr-4">Chi tiết</th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.items.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-muted">{new Date(a.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="whitespace-nowrap">{a.actor?.fullName ?? <span className="text-muted">(đã xóa)</span>}</td>
                    <td><span className={`rounded px-2 py-0.5 text-xs font-medium ${label(a.action).cls}`}>{label(a.action).text}</span></td>
                    <td className="max-w-md truncate pr-4" title={a.detail ?? ''}>{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
