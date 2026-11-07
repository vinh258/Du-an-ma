import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ErrorBox, Spinner, Stars } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { formatDate } from '../lib/format';
import { Doc, User } from '../lib/types';

export default function PublicProfile() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-profile', id],
    queryFn: async () => (await api.get<User & { documents: Doc[] }>(`/users/${id}`)).data,
  });
  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox text={errMsg(error)} />;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand font-display text-2xl text-white">{data.fullName.charAt(0).toUpperCase()}</span>
        <div>
          <h1 className="text-3xl">{data.fullName}</h1>
          <p className="text-sm text-muted">{data.faculty?.name ?? 'Chưa cập nhật khoa'} · tham gia {formatDate(data.createdAt)} · uy tín <b className="text-ink">{data.reputationScore}</b></p>
        </div>
      </div>
      <h2 className="mb-2 text-xl">Tài liệu đã đóng góp ({data.documents.length})</h2>
      {data.documents.length === 0 ? <p className="text-sm text-muted">Chưa có tài liệu nào được duyệt.</p> : (
        <ul className="panel divide-y divide-line">
          {data.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <Link to={`/documents/${d.id}`} className="font-display text-lg hover:text-brand hover:underline">{d.title}</Link>
              <span className="flex shrink-0 items-center gap-3 text-xs text-muted">
                {d.ratingCount > 0 && <Stars value={d.ratingAvg} size="sm" />}{d.downloadCount} lượt tải
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
