import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, ErrorBox, Pagination, Spinner } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { notifText, timeAgo } from '../lib/format';
import { Notif, Page } from '../lib/types';

export default function Notifications() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => (await api.get<Page<Notif>>('/notifications', { params: { page, limit: 15 } })).data,
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread-count'] }); };
  const readAll = useMutation({ mutationFn: async () => api.patch('/notifications/read-all'), onSuccess: refresh });
  const readOne = useMutation({ mutationFn: async (id: number) => api.patch(`/notifications/${id}/read`), onSuccess: refresh });

  const open = (n: Notif) => {
    if (!n.isRead) readOne.mutate(n.id);
    if (n.payload?.documentId) nav(`/documents/${n.payload.documentId}`);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl">Thông báo</h1>
        <button className="btn-outline btn-sm" onClick={() => readAll.mutate()}>Đánh dấu tất cả đã đọc</button>
      </div>
      {isLoading && <Spinner />}
      {error && <ErrorBox text={errMsg(error)} />}
      {data && data.items.length === 0 && <Empty title="Chưa có thông báo nào" hint="Bạn sẽ nhận thông báo khi tài liệu được duyệt hoặc có người bình luận, đánh giá." />}
      {data && data.items.length > 0 && (
        <>
          <ul className="panel divide-y divide-line">
            {data.items.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-brand-soft ${n.isRead ? '' : 'bg-brand-soft/50'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-brand'}`} aria-label={n.isRead ? 'Đã đọc' : 'Chưa đọc'} />
                  <span className="flex-1 text-sm">{notifText(n.type, n.payload)}<br /><span className="text-xs text-muted">{timeAgo(n.createdAt)}</span></span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
