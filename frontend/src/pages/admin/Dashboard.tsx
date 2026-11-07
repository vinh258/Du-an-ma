import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarList, Donut, LineChart, StatCard } from '../../components/Charts';
import Icon from '../../components/Icon';
import { ErrorBox, Spinner } from '../../components/ui';
import { api, errMsg } from '../../lib/api';
import { Stats } from '../../lib/types';

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const { data: s, isLoading, error } = useQuery({
    queryKey: ['admin-stats', days],
    queryFn: async () => (await api.get<Stats>('/admin/stats', { params: { days } })).data,
    refetchInterval: 30_000,
  });
  if (isLoading) return <Spinner />;
  if (error || !s) return <ErrorBox text={errMsg(error)} />;

  const reviewed = s.moderation.approve + s.moderation.reject;
  const rate = reviewed ? Math.round((s.moderation.approve / reviewed) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Người dùng" value={s.users.total} tone="brand" icon={<Icon name="users" size={16} />}
          sub={<>+{s.users.new7} trong 7 ngày{s.users.banned > 0 && <> · {s.users.banned} bị khóa</>}</>} />
        <StatCard label="Tài liệu" value={s.documents.total} tone="accent" icon={<Icon name="folder" size={16} />} sub={<>+{s.documents.new7} trong 7 ngày</>} />
        <StatCard label="Lượt tải" value={s.documents.downloads} tone="amber" icon={<Icon name="upload" size={16} />} sub={<>{s.documents.views.toLocaleString('vi-VN')} lượt xem</>} />
        <Link to="/moderation" className="block">
          <StatCard label="Chờ duyệt" value={s.documents.pending} tone={s.documents.pending ? 'danger' : 'brand'} icon={<Icon name="shield" size={16} />}
            sub={s.interactions.openReports ? <>{s.interactions.openReports} báo cáo đang mở</> : 'Bấm để vào kiểm duyệt'} />
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Hoạt động theo ngày</h2>
            <div className="flex gap-1 rounded-xl bg-brand-soft p-1 text-xs">
              {[7, 30, 90].map((d) => (
                <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1 font-medium ${days === d ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}>{d} ngày</button>
              ))}
            </div>
          </div>
          <LineChart dates={s.series.dates} series={[
            { name: 'Tài liệu mới', tone: 'brand', values: s.series.documents },
            { name: 'Người dùng mới', tone: 'accent', values: s.series.users },
            { name: 'Lượt tải', tone: 'amber', values: s.series.downloads },
          ]} />
        </section>

        <section className="panel p-5">
          <h2 className="mb-4 text-xl font-bold">Trạng thái tài liệu</h2>
          <Donut parts={[
            { label: 'Đã duyệt', value: s.documents.approved, tone: 'brand' },
            { label: 'Chờ duyệt', value: s.documents.pending, tone: 'amber' },
            { label: 'Bị từ chối', value: s.documents.rejected, tone: 'danger' },
          ]} center={<><span className="font-display text-2xl font-extrabold">{s.documents.total}</span><span className="text-[11px] text-muted">tài liệu</span></>} />
          <p className="mt-4 rounded-xl bg-brand-soft px-3 py-2 text-sm">
            Tỷ lệ duyệt: <b>{rate}%</b> <span className="text-muted">({s.moderation.approve} duyệt / {s.moderation.reject} từ chối)</span>
          </p>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="panel p-5">
          <h2 className="mb-4 text-xl font-bold">Tài liệu theo khoa</h2>
          {s.byFaculty.length ? <BarList rows={s.byFaculty.map((f) => ({ label: f.name, value: f.docs, hint: 'bài' }))} /> : <p className="text-sm text-muted">Chưa có dữ liệu.</p>}
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 text-xl font-bold">Người đóng góp nhiều nhất</h2>
          {s.topContributors.length === 0 ? <p className="text-sm text-muted">Chưa có tài liệu được duyệt.</p> : (
            <ol className="space-y-3">
              {s.topContributors.map((u, i) => (
                <li key={u.id} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand">{i + 1}</span>
                  <Link to={`/profile/${u.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand">{u.fullName}</Link>
                  <span className="text-right text-xs text-muted"><b className="text-ink">{u.docs}</b> bài · {u.downloads} tải</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 text-xl font-bold">Tải nhiều nhất</h2>
          {s.topDocuments.length === 0 ? <p className="text-sm text-muted">Chưa có dữ liệu.</p> : (
            <ol className="space-y-3">
              {s.topDocuments.map((d, i) => (
                <li key={d.id} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-bold text-accent">{i + 1}</span>
                  <Link to={`/documents/${d.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand">{d.title}</Link>
                  <span className="text-xs text-muted"><b className="text-ink">{d.downloads}</b> tải</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[['Bình luận', s.interactions.comments], ['Đánh giá', s.interactions.ratings], ['Lượt lưu', s.interactions.bookmarks], ['Kiểm duyệt viên', s.users.mods]].map(([l, v]) => (
          <div key={l as string} className="panel px-4 py-3 text-center"><p className="font-display text-2xl font-bold">{v}</p><p className="text-xs text-muted">{l}</p></div>
        ))}
      </div>
    </div>
  );
}
