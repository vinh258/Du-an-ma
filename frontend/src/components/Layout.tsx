import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../lib/theme';
import Icon from './Icon';
import NotificationBell, { useRealtimeNotifications, useUnreadCount } from './NotificationBell';
import Wordmark from './Wordmark';

function NavItem({ to, icon, children, end, badge }: { to: string; icon: Parameters<typeof Icon>[0]['name']; children: ReactNode; end?: boolean; badge?: number }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
      <Icon name={icon} className="nav-ico shrink-0" />
      <span className="flex-1">{children}</span>
      {!!badge && badge > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-[18px] text-white">{badge > 99 ? '99+' : badge}</span>}
    </NavLink>
  );
}

const Section = ({ children }: { children: ReactNode }) => (
  <p className="mb-1 mt-5 px-3 text-xs font-semibold text-muted/80">{children}</p>
);

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} className="relative h-10 w-10 rounded-xl text-muted transition-colors hover:bg-brand-soft hover:text-brand"
      aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}>
      <Icon name="sun" className="theme-ico theme-sun" />
      <Icon name="moon" className="theme-ico theme-moon" />
    </button>
  );
}

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState('');
  const [drawer, setDrawer] = useState(false);
  const unread = useUnreadCount();
  useRealtimeNotifications();

  useEffect(() => { setDrawer(false); }, [loc.pathname]);

  const search = (e: FormEvent) => { e.preventDefault(); nav(`/?q=${encodeURIComponent(q.trim())}`); };

  return (
    <div className="min-h-screen">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>

      {drawer && <div className="fixed inset-0 z-30 bg-ink/50 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} />}

      {/* ===== SIDEBAR ===== */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface/90 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${drawer ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Menu chính">
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <Link to="/" aria-label="TVinhhh — trang chủ"><Wordmark className="text-3xl" /></Link>
          <button className="rounded-lg p-1.5 text-muted hover:bg-brand-soft lg:hidden" onClick={() => setDrawer(false)} aria-label="Đóng menu"><Icon name="x" /></button>
        </div>
        <p className="px-5 text-xs text-muted">Kho tài liệu học tập của sinh viên</p>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <Section>Khám phá</Section>
          <NavItem to="/" end icon="home">Trang chủ</NavItem>
          {user && (
            <>
              <Section>Của tôi</Section>
              <NavItem to="/upload" icon="upload">Đăng tài liệu</NavItem>
              <NavItem to="/my-documents" icon="folder">Tài liệu của tôi</NavItem>
              <NavItem to="/bookmarks" icon="bookmark">Đã lưu</NavItem>
              <NavItem to="/notifications" icon="bell" badge={unread}>Thông báo</NavItem>
              <NavItem to="/profile" icon="user">Hồ sơ & điểm uy tín</NavItem>
            </>
          )}
          {hasRole('MOD', 'ADMIN') && (
            <>
              <Section>Quản lý</Section>
              <NavItem to="/moderation" icon="shield">Kiểm duyệt</NavItem>
              {hasRole('ADMIN') && <NavItem to="/admin" icon="users">Quản trị hệ thống</NavItem>}
            </>
          )}
        </nav>

        <div className="border-t border-line p-3">
          {user ? (
            <div className="flex items-center gap-3 rounded-xl bg-brand-soft/60 p-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand font-display text-lg font-bold text-white">{user.fullName.charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.fullName}</p>
                <p className="text-xs text-muted">Uy tín: <b className="text-brand">{user.reputationScore}</b></p>
              </div>
              <button className="rounded-lg p-2 text-muted transition-colors hover:bg-danger-soft hover:text-danger" onClick={() => { logout(); nav('/'); }} aria-label="Đăng xuất" title="Đăng xuất">
                <Icon name="logout" size={18} />
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              <Link to="/login" className="btn-outline"><Icon name="login" size={16} /> Đăng nhập</Link>
              <Link to="/register" className="btn-primary">Tạo tài khoản</Link>
            </div>
          )}
        </div>
      </aside>

      {/* ===== NỘI DUNG ===== */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-paper/80 px-4 py-3 backdrop-blur-xl">
          <button className="rounded-xl p-2.5 text-muted hover:bg-brand-soft lg:hidden" onClick={() => setDrawer(true)} aria-label="Mở menu"><Icon name="menu" /></button>
          <form onSubmit={search} className="relative max-w-md flex-1" role="search">
            <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tài liệu, môn học, từ khóa…" aria-label="Tìm kiếm tài liệu" />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {user && <NotificationBell />}
            {user && <Link to="/upload" className="btn-primary btn-sm ml-1 hidden sm:inline-flex"><Icon name="upload" size={16} /> Đăng tài liệu</Link>}
          </div>
        </header>

        <main key={loc.pathname} className="page-in mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          <Outlet />
        </main>
        <footer className="py-4 text-center text-xs text-muted">© TVinhhh — chia sẻ tài liệu học tập trong trường</footer>
      </div>
    </div>
  );
}
