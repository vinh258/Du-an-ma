import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import DeleteDocModal from '../components/DeleteDocModal';
import DocumentRow from '../components/DocumentRow';
import Hero from '../components/Hero';
import { Empty, ErrorBox, Pagination, Spinner } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useFaculties, useSubjects } from '../lib/hooks';
import { Doc, Page } from '../lib/types';

export default function Home() {
  const [sp, setSp] = useSearchParams();
  const { hasRole } = useAuth();
  const [deleting, setDeleting] = useState<Doc | null>(null);
  const q = sp.get('q') || '';
  const facultyId = sp.get('facultyId') || '';
  const subjectId = sp.get('subjectId') || '';
  const tags = sp.get('tags') || '';
  const sort = sp.get('sort') || 'newest';
  const page = +(sp.get('page') || 1);

  const { data: faculties } = useFaculties();
  const { data: subjects } = useSubjects(facultyId ? +facultyId : '');

  const params = { q: q || undefined, facultyId: facultyId || undefined, subjectId: subjectId || undefined, tags: tags || undefined, sort, page, limit: 10 };
  const { data, isLoading, error } = useQuery({
    queryKey: ['documents', params],
    queryFn: async () => (await api.get<Page<Doc>>('/documents', { params })).data,
  });

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setSp(next);
  };
  const filtered = !!(q || facultyId || subjectId || tags);
  const { data: trending } = useQuery({ queryKey: ['trending'], queryFn: async () => (await api.get<Doc[]>('/documents/trending')).data, staleTime: 60_000 });

  return (
    <div>
      <Hero />
      {!filtered && trending && trending.length > 0 && (
        <section className="mb-8" aria-label="Xu hướng tuần này">
          <h2 className="mb-3 text-xl font-bold">Được quan tâm tuần này</h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trending.slice(0, 6).map((d, i) => (
              <li key={d.id}>
                <Link to={`/documents/${d.id}`} className="panel card-hover flex items-center gap-4 p-4">
                  <span className="font-display text-4xl font-extrabold leading-none text-brand/30">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 font-display text-base font-semibold leading-snug">{d.title}</span>
                    <span className="mt-1 block text-xs text-muted">{d.subject?.code} · {d.downloadCount} lượt tải · {d.viewCount} lượt xem</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <h2 id="kho-tai-lieu" className="mb-3 scroll-mt-24 text-2xl font-bold">Kho tài liệu</h2>

      <div className="panel mb-5 grid gap-3 p-4 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <label className="label" htmlFor="f-fac">Khoa</label>
          <select id="f-fac" className="input" value={facultyId} onChange={(e) => update({ facultyId: e.target.value, subjectId: '' })}>
            <option value="">Tất cả khoa</option>
            {faculties?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="f-sub">Môn học</label>
          <select id="f-sub" className="input" value={subjectId} onChange={(e) => update({ subjectId: e.target.value })}>
            <option value="">Tất cả môn</option>
            {subjects?.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-sort">Sắp xếp</label>
          <select id="f-sort" className="input" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="newest">Mới nhất</option>
            <option value="popular">Xem nhiều</option>
            <option value="downloads">Tải nhiều</option>
            <option value="rating">Đánh giá cao</option>
          </select>
        </div>
        {(q || tags) && (
          <div className="flex flex-wrap items-center gap-2 text-sm sm:col-span-4">
            {q && <span className="rounded-full bg-brand-soft px-3 py-1">Từ khóa: <b>{q}</b></span>}
            {tags && <span className="rounded-full bg-brand-soft px-3 py-1">Tag: <b>#{tags}</b></span>}
            <button className="text-muted underline" onClick={() => setSp(new URLSearchParams())}>Xóa bộ lọc</button>
          </div>
        )}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox text={errMsg(error)} />}
      {data && data.items.length === 0 && (
        <Empty title={filtered ? 'Không tìm thấy tài liệu phù hợp' : 'Chưa có tài liệu nào'}
          hint={filtered ? 'Thử bỏ bớt bộ lọc hoặc đổi từ khóa.' : 'Hãy là người đầu tiên chia sẻ tài liệu.'} />
      )}
      {data && data.items.length > 0 && (
        <>
          <p className="mb-3 text-sm text-muted">{data.total} tài liệu</p>
          <div className="space-y-3">{data.items.map((d) => (
            <DocumentRow key={d.id} doc={d} actions={hasRole('ADMIN') ? (
              <button className="btn-outline btn-sm text-danger" onClick={() => setDeleting(d)} title="Quản trị viên: xóa bài này">Xóa bài</button>
            ) : undefined} />
          ))}</div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
      {deleting && <DeleteDocModal doc={deleting} byAdmin onClose={() => setDeleting(null)} />}
    </div>
  );
}
