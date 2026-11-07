import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { formatDate } from '../lib/format';
import { useFaculties } from '../lib/hooks';
import { Page, RepLog } from '../lib/types';

const reasonLabel: Record<string, string> = {
  DOC_APPROVED: 'Tài liệu được duyệt', DOC_REJECTED: 'Tài liệu bị từ chối', DOC_RATED_HIGH: 'Nhận đánh giá 5 sao',
  VIOLATION: 'Vi phạm quy định',
};

export default function Profile() {
  const { user, reload } = useAuth();
  const toast = useToast();
  const { data: faculties } = useFaculties();
  const [f, setF] = useState({ fullName: user?.fullName ?? '', studentCode: user?.studentCode ?? '', facultyId: String(user?.facultyId ?? '') });
  const [busy, setBusy] = useState(false);
  const { data: logs, isLoading } = useQuery({
    queryKey: ['rep-logs'],
    queryFn: async () => (await api.get<Page<RepLog>>('/users/me/reputation-logs', { params: { limit: 20 } })).data,
  });
  if (!user) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.patch('/users/me', { fullName: f.fullName, studentCode: f.studentCode || undefined, facultyId: f.facultyId ? +f.facultyId : undefined });
      await reload(); toast('Đã cập nhật hồ sơ');
    } catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section>
        <h1 className="mb-1 text-3xl">Hồ sơ</h1>
        <p className="mb-4 text-sm text-muted">{user.email} · {user.role === 'ADMIN' ? 'Quản trị viên' : user.role === 'MOD' ? 'Kiểm duyệt viên' : 'Sinh viên'} · tham gia {formatDate(user.createdAt)}</p>
        <form onSubmit={save} className="panel space-y-4 p-5">
          <div><label className="label" htmlFor="n">Họ và tên</label><input id="n" className="input" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
          <div><label className="label" htmlFor="c">Mã sinh viên</label><input id="c" className="input" value={f.studentCode} onChange={(e) => setF({ ...f, studentCode: e.target.value })} /></div>
          <div><label className="label" htmlFor="k">Khoa</label>
            <select id="k" className="input" value={f.facultyId} onChange={(e) => setF({ ...f, facultyId: e.target.value })}>
              <option value="">— Chưa chọn —</option>{faculties?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select></div>
          <button className="btn-primary" disabled={busy}>Lưu thay đổi</button>
        </form>
        <ChangePassword />
      </section>
      <section>
        <div className="panel mb-4 p-5 text-center">
          <p className="text-sm text-muted">Điểm uy tín</p>
          <p className="font-display text-5xl text-brand">{user.reputationScore}</p>
          <p className="mt-1 text-xs text-muted">+10 khi tài liệu được duyệt · −5 khi bị từ chối · −20 khi vi phạm</p>
        </div>
        <h2 className="mb-2 text-xl">Lịch sử điểm</h2>
        {isLoading ? <Spinner /> : logs && logs.items.length ? (
          <ul className="panel divide-y divide-line text-sm">
            {logs.items.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-4 py-2.5">
                <span>{reasonLabel[l.reason] ?? l.reason}<br /><span className="text-xs text-muted">{formatDate(l.createdAt)}</span></span>
                <b className={l.delta >= 0 ? 'text-brand' : 'text-danger'}>{l.delta > 0 ? '+' : ''}{l.delta}</b>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">Chưa có biến động điểm nào.</p>}
      </section>
    </div>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.newPassword !== f.confirm) return toast('Hai mật khẩu mới không khớp', 'error');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
      toast('Đã đổi mật khẩu'); setF({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="panel mt-6 space-y-4 p-5">
      <h2 className="text-xl font-bold">Đổi mật khẩu</h2>
      <div><label className="label" htmlFor="cp0">Mật khẩu hiện tại</label>
        <input id="cp0" type="password" required className="input" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} autoComplete="current-password" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="cp1">Mật khẩu mới</label>
          <input id="cp1" type="password" required minLength={6} className="input" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} autoComplete="new-password" /></div>
        <div><label className="label" htmlFor="cp2">Nhập lại</label>
          <input id="cp2" type="password" required minLength={6} className="input" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" /></div>
      </div>
      <button className="btn-outline" disabled={busy}>Đổi mật khẩu</button>
    </form>
  );
}
