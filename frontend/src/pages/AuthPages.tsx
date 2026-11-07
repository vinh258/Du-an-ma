import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ErrorBox } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useFaculties } from '../lib/hooks';

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl">{title}</h1>
      <p className="mb-5 mt-1 text-sm text-muted">{sub}</p>
      <div className="panel p-5">{children}</div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await login(email, password); nav(from, { replace: true }); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Đăng nhập" sub="Đăng nhập để đăng tài liệu, lưu và đánh giá.">
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox text={error} />}
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div><label className="label" htmlFor="pw">Mật khẩu</label>
          <input id="pw" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
        <div className="-mt-2 text-right text-sm"><Link to="/forgot-password" className="text-brand hover:underline">Quên mật khẩu?</Link></div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        <p className="text-center text-sm text-muted">Chưa có tài khoản? <Link to="/register" className="font-medium text-brand hover:underline">Đăng ký</Link></p>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const { data: faculties } = useFaculties();
  const [f, setF] = useState({ fullName: '', email: '', password: '', studentCode: '', facultyId: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await register({
        fullName: f.fullName, email: f.email, password: f.password,
        studentCode: f.studentCode || undefined, facultyId: f.facultyId ? +f.facultyId : undefined,
      });
      nav('/', { replace: true });
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Tạo tài khoản" sub="Miễn phí, dùng email của bạn.">
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox text={error} />}
        <div><label className="label" htmlFor="fn">Họ và tên</label><input id="fn" required className="input" value={f.fullName} onChange={set('fullName')} /></div>
        <div><label className="label" htmlFor="em">Email</label><input id="em" type="email" required className="input" value={f.email} onChange={set('email')} autoComplete="email" /></div>
        <div><label className="label" htmlFor="pw2">Mật khẩu (tối thiểu 6 ký tự)</label><input id="pw2" type="password" required minLength={6} className="input" value={f.password} onChange={set('password')} autoComplete="new-password" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="sc">Mã sinh viên</label><input id="sc" className="input" value={f.studentCode} onChange={set('studentCode')} /></div>
          <div><label className="label" htmlFor="fa">Khoa</label>
            <select id="fa" className="input" value={f.facultyId} onChange={set('facultyId')}>
              <option value="">— Chọn —</option>
              {faculties?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select></div>
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Đang tạo…' : 'Đăng ký'}</button>
        <p className="text-center text-sm text-muted">Đã có tài khoản? <Link to="/login" className="font-medium text-brand hover:underline">Đăng nhập</Link></p>
      </form>
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [devLink, setDevLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { data } = await api.post<{ message: string; devResetLink?: string }>('/auth/forgot-password', { email });
      setMsg(data.message);
      if (data.devResetLink) setDevLink(new URL(data.devResetLink).pathname + new URL(data.devResetLink).search);
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Quên mật khẩu" sub="Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.">
      {msg ? (
        <div className="space-y-4 text-sm">
          <p className="rounded-xl bg-brand-soft px-4 py-3">{msg}</p>
          {devLink && (
            <div className="rounded-xl border border-amber/40 bg-amber-soft p-3 text-amber">
              <p className="font-semibold">Chế độ phát triển</p>
              <p className="mt-1 text-ink">Chưa cấu hình email (SMTP) nên liên kết được hiện ngay tại đây:</p>
              <Link to={devLink} className="mt-2 inline-block font-medium text-brand underline">Đặt lại mật khẩu →</Link>
            </div>
          )}
          <Link to="/login" className="block text-center font-medium text-brand hover:underline">Quay lại đăng nhập</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorBox text={error} />}
          <div><label className="label" htmlFor="fe">Email</label>
            <input id="fe" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi liên kết'}</button>
          <p className="text-center text-sm"><Link to="/login" className="text-brand hover:underline">Quay lại đăng nhập</Link></p>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const [sp] = useSearchParams();
  const token = sp.get('token') || '';
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setError('Hai mật khẩu không khớp');
    setBusy(true); setError('');
    try { await api.post('/auth/reset-password', { token, password: pw }); setDone(true); setTimeout(() => nav('/login'), 1800); }
    catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  if (!token) return <Shell title="Liên kết không hợp lệ" sub="Hãy yêu cầu đặt lại mật khẩu lại từ đầu."><Link to="/forgot-password" className="btn-primary w-full">Quên mật khẩu</Link></Shell>;
  return (
    <Shell title="Đặt mật khẩu mới" sub="Chọn mật khẩu mới cho tài khoản của bạn.">
      {done ? <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm">Đã đặt lại mật khẩu. Đang chuyển tới trang đăng nhập…</p> : (
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorBox text={error} />}
          <div><label className="label" htmlFor="np">Mật khẩu mới (tối thiểu 6 ký tự)</label>
            <input id="np" type="password" required minLength={6} className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
          <div><label className="label" htmlFor="np2">Nhập lại mật khẩu</label>
            <input id="np2" type="password" required minLength={6} className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Đang lưu…' : 'Đặt lại mật khẩu'}</button>
        </form>
      )}
    </Shell>
  );
}
