import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const QUICK_SEARCHES = ['Đề thi', 'Bài giảng', 'Giáo trình'];

export default function Hero() {
  const { user } = useAuth();

  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl border border-line bg-surface px-6 py-8 sm:px-10 sm:py-10">
      <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-brand-soft/80" aria-hidden="true" />
      <div className="pointer-events-none absolute right-20 top-24 h-20 w-20 rounded-full bg-amber-soft/80" aria-hidden="true" />
      <div className="relative max-w-2xl">
        <p className="mb-3 text-sm font-semibold text-brand">Góc học tập của sinh viên</p>
        <h1 className="max-w-xl text-3xl font-bold leading-tight sm:text-4xl">Tìm tài liệu học tập, chia sẻ điều hữu ích.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
          Đề thi, bài giảng và giáo trình được sinh viên trong trường cùng đóng góp.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to={user ? '/upload' : '/register'} className="btn-primary px-5 py-2.5">
            {user ? 'Chia sẻ tài liệu' : 'Tham gia cộng đồng'}
          </Link>
          <a href="#kho-tai-lieu" className="btn-outline px-5 py-2.5">Khám phá kho tài liệu</a>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="mr-1 text-muted">Tìm nhanh:</span>
          {QUICK_SEARCHES.map((term) => (
            <Link
              key={term}
              to={`/?q=${encodeURIComponent(term)}`}
              className="rounded-full border border-line bg-paper px-3 py-1 text-ink transition-colors hover:border-brand hover:text-brand"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
