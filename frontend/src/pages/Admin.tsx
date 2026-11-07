import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { ErrorBox, PageTabs, Pagination, Spinner } from '../components/ui';
import { api, downloadFile, errMsg } from '../lib/api';
import { useFaculties, useSubjects } from '../lib/hooks';
import { Page, Role, User } from '../lib/types';
import AnnounceTab from './admin/AnnounceTab';
import AuditTab from './admin/AuditTab';
import Dashboard from './admin/Dashboard';
import DocsTab from './admin/DocsTab';
import TagsTab from './admin/TagsTab';

type Tab = 'overview' | 'users' | 'docs' | 'catalog' | 'tags' | 'audit' | 'announce';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <div>
      <h1 className="mb-4 text-3xl">Quản trị hệ thống</h1>
      <PageTabs value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Tổng quan' }, { id: 'users', label: 'Người dùng' }, { id: 'docs', label: 'Tài liệu' },
        { id: 'catalog', label: 'Khoa & môn học' }, { id: 'tags', label: 'Tag' }, { id: 'audit', label: 'Nhật ký' }, { id: 'announce', label: 'Thông báo chung' },
      ]} />
      {tab === 'overview' && <Dashboard />}
      {tab === 'users' && <Users />}
      {tab === 'docs' && <DocsTab />}
      {tab === 'catalog' && <Catalog />}
      {tab === 'tags' && <TagsTab />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'announce' && <AnnounceTab />}
    </div>
  );
}

function Users() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', q, page],
    queryFn: async () => (await api.get<Page<User>>('/admin/users', { params: { q: q || undefined, page, limit: 15 } })).data,
  });
  const ok = (msg: string) => () => { toast(msg); qc.invalidateQueries({ queryKey: ['admin-users'] }); };
  const fail = (e: unknown) => toast(errMsg(e), 'error');
  const setRole = useMutation({ mutationFn: async (v: { id: number; role: Role }) => api.patch(`/admin/users/${v.id}/role`, { role: v.role }), onSuccess: ok('Đã đổi quyền'), onError: fail });
  const setStatus = useMutation({ mutationFn: async (v: { id: number; status: string }) => api.patch(`/admin/users/${v.id}/status`, { status: v.status }), onSuccess: ok('Đã cập nhật trạng thái'), onError: fail });
  const adjust = useMutation({ mutationFn: async (v: { id: number; delta: number; reason: string }) => api.post(`/admin/users/${v.id}/reputation`, { delta: v.delta, reason: v.reason }), onSuccess: ok('Đã điều chỉnh điểm'), onError: fail });

  const promptAdjust = (u: User) => {
    const raw = prompt(`Cộng/trừ điểm uy tín cho ${u.fullName} (ví dụ 10 hoặc -20):`);
    if (!raw) return;
    const delta = parseInt(raw, 10);
    if (!delta) return toast('Giá trị không hợp lệ', 'error');
    const reason = prompt('Lý do (hiển thị trong lịch sử điểm):', 'Điều chỉnh bởi quản trị viên');
    if (reason) adjust.mutate({ id: u.id, delta, reason: reason.slice(0, 40) });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-sm" placeholder="Tìm theo tên hoặc email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Tìm người dùng" />
        <button className="btn-outline ml-auto" onClick={() => downloadFile('/admin/export/users', 'nguoi-dung.csv').catch((e) => toast(errMsg(e), 'error'))}>Xuất CSV</button>
      </div>
      {isLoading && <Spinner />}
      {error && <ErrorBox text={errMsg(error)} />}
      {data && (
        <>
          <div className="panel overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted"><tr><th className="px-4 py-2">Người dùng</th><th>Quyền</th><th>Điểm</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2"><b>{u.fullName}</b><br /><span className="text-xs text-muted">{u.email}</span></td>
                    <td>
                      <select className="input w-auto py-1" aria-label={`Quyền của ${u.fullName}`} value={u.role} disabled={u.id === me?.id}
                        onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as Role })}>
                        <option value="STUDENT">Sinh viên</option><option value="MOD">Kiểm duyệt</option><option value="ADMIN">Quản trị</option>
                      </select>
                    </td>
                    <td>{u.reputationScore}</td>
                    <td className={u.status === 'BANNED' ? 'text-danger' : 'text-brand'}>{u.status === 'BANNED' ? 'Đã khóa' : 'Hoạt động'}</td>
                    <td className="space-x-2 whitespace-nowrap pr-4 text-right">
                      <button className="btn-outline btn-sm" onClick={() => promptAdjust(u)}>± Điểm</button>
                      {u.id !== me?.id && (
                        <button className="btn-outline btn-sm" onClick={() => setStatus.mutate({ id: u.id, status: u.status === 'BANNED' ? 'ACTIVE' : 'BANNED' })}>
                          {u.status === 'BANNED' ? 'Mở khóa' : 'Khóa'}
                        </button>
                      )}
                    </td>
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

function Catalog() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: faculties } = useFaculties();
  const [facultyId, setFacultyId] = useState<number | ''>('');
  const { data: subjects } = useSubjects(facultyId);
  const [fac, setFac] = useState({ code: '', name: '' });
  const [sub, setSub] = useState({ code: '', name: '' });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['faculties'] }); qc.invalidateQueries({ queryKey: ['subjects'] }); };
  const fail = (e: unknown) => toast(errMsg(e), 'error');

  const addFac = useMutation({ mutationFn: async () => api.post('/faculties', fac), onSuccess: () => { toast('Đã thêm khoa'); setFac({ code: '', name: '' }); refresh(); }, onError: fail });
  const delFac = useMutation({ mutationFn: async (id: number) => api.delete(`/faculties/${id}`), onSuccess: () => { toast('Đã xóa khoa'); setFacultyId(''); refresh(); }, onError: fail });
  const addSub = useMutation({ mutationFn: async () => api.post('/subjects', { ...sub, facultyId }), onSuccess: () => { toast('Đã thêm môn học'); setSub({ code: '', name: '' }); refresh(); }, onError: fail });
  const delSub = useMutation({ mutationFn: async (id: number) => api.delete(`/subjects/${id}`), onSuccess: () => { toast('Đã xóa môn học'); refresh(); }, onError: fail });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section>
        <h2 className="mb-2 text-xl">Khoa</h2>
        <ul className="panel mb-3 divide-y divide-line text-sm">
          {faculties?.map((f) => (
            <li key={f.id} className={`flex items-center justify-between px-4 py-2 ${facultyId === f.id ? 'bg-brand-soft' : ''}`}>
              <button className="flex-1 text-left" onClick={() => setFacultyId(f.id)}><b>{f.code}</b> · {f.name}</button>
              <button className="text-xs text-danger" onClick={() => confirm(`Xóa khoa ${f.name}?`) && delFac.mutate(f.id)}>Xóa</button>
            </li>
          ))}
        </ul>
        <form className="flex gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); addFac.mutate(); }}>
          <input className="input w-24" placeholder="Mã" required value={fac.code} onChange={(e) => setFac({ ...fac, code: e.target.value })} aria-label="Mã khoa" />
          <input className="input" placeholder="Tên khoa" required value={fac.name} onChange={(e) => setFac({ ...fac, name: e.target.value })} aria-label="Tên khoa" />
          <button className="btn-primary">Thêm</button>
        </form>
      </section>
      <section>
        <h2 className="mb-2 text-xl">Môn học {facultyId ? `của khoa đã chọn` : '(chọn một khoa để thêm)'}</h2>
        <ul className="panel mb-3 divide-y divide-line text-sm">
          {subjects?.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-2">
              <span><b>{s.code}</b> · {s.name}</span>
              <button className="text-xs text-danger" onClick={() => confirm(`Xóa môn ${s.name}?`) && delSub.mutate(s.id)}>Xóa</button>
            </li>
          ))}
        </ul>
        <form className="flex gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); addSub.mutate(); }}>
          <input className="input w-24" placeholder="Mã" required disabled={!facultyId} value={sub.code} onChange={(e) => setSub({ ...sub, code: e.target.value })} aria-label="Mã môn" />
          <input className="input" placeholder="Tên môn học" required disabled={!facultyId} value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} aria-label="Tên môn" />
          <button className="btn-primary" disabled={!facultyId}>Thêm</button>
        </form>
      </section>
    </div>
  );
}
