import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { formatBytes } from '../lib/format';
import { useFaculties, useSubjects } from '../lib/hooks';
import { Doc } from '../lib/types';

const MAX = 20 * 1024 * 1024;
const OK = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function EditDocument() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  const { data: doc, isLoading, error } = useQuery({
    queryKey: ['doc-edit', id],
    queryFn: async () => (await api.get<Doc>(`/documents/${id}`)).data,
  });
  const { data: faculties } = useFaculties();
  const [facultyId, setFacultyId] = useState('');
  const { data: subjects } = useSubjects(facultyId ? +facultyId : '');
  const [f, setF] = useState({ title: '', description: '', subjectId: '', tags: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!doc) return;
    setF({ title: doc.title, description: doc.description ?? '', subjectId: String(doc.subject?.id ?? ''), tags: doc.tags.map((t) => t.name).join(', ') });
    setFacultyId(String(doc.subject?.facultyId ?? ''));
  }, [doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <Spinner />;
  if (error || !doc) return <ErrorBox text={errMsg(error) || 'Không tìm thấy tài liệu'} />;
  if (doc.uploaderId !== user?.id) return <Empty title="Chỉ người đăng mới được sửa tài liệu này" />;

  const pick = (fl?: File) => {
    if (!fl) return;
    if (!OK.includes(fl.type)) return setMsg('Chỉ chấp nhận file PDF hoặc Word (.doc, .docx)');
    if (fl.size > MAX) return setMsg('File vượt quá 20MB');
    setMsg(''); setFile(fl);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg('');
    const fd = new FormData();
    fd.append('title', f.title); fd.append('description', f.description); fd.append('subjectId', f.subjectId); fd.append('tags', f.tags);
    if (file) fd.append('file', file);
    try {
      await api.patch(`/documents/${id}`, fd, { onUploadProgress: (p) => file && setProgress(Math.round((p.loaded * 100) / (p.total || file.size))) });
      toast('Đã lưu thay đổi. Tài liệu sẽ được kiểm duyệt lại.');
      ['documents', 'my-docs', 'document', 'doc-edit', 'mod-queue'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      nav(`/documents/${id}`);
    } catch (err) { setMsg(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">Sửa tài liệu</h1>
      <p className="mb-5 mt-1 rounded-xl bg-amber-soft px-4 py-2.5 text-sm text-amber">
        Sau khi lưu, tài liệu sẽ quay lại trạng thái <b>chờ duyệt</b> để người kiểm duyệt xem xét lại.
      </p>
      <form onSubmit={submit} className="panel space-y-4 p-5">
        {msg && <ErrorBox text={msg} />}
        <div><label className="label" htmlFor="t">Tiêu đề</label>
          <input id="t" className="input" required minLength={5} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="fa">Khoa</label>
            <select id="fa" className="input" value={facultyId} onChange={(e) => { setFacultyId(e.target.value); setF({ ...f, subjectId: '' }); }}>
              <option value="">— Chọn khoa —</option>{faculties?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select></div>
          <div><label className="label" htmlFor="su">Môn học</label>
            <select id="su" className="input" required value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })}>
              <option value="">— Chọn môn —</option>{subjects?.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}
            </select></div>
        </div>
        <div><label className="label" htmlFor="d">Mô tả</label>
          <textarea id="d" className="input" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div><label className="label" htmlFor="tg">Tag (ngăn cách bằng dấu phẩy)</label>
          <input id="tg" className="input" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></div>
        <div>
          <span className="label">File tài liệu</span>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {file ? <><b>{file.name}</b> ({formatBytes(file.size)}) — <span className="text-brand">sẽ thay file hiện tại</span></> : <>Đang dùng: <b>{doc.fileName}</b> ({formatBytes(doc.fileSize)})</>}
            </span>
            {file && <button type="button" className="text-danger underline" onClick={() => setFile(null)}>Bỏ file mới</button>}
            <button type="button" className="btn-outline btn-sm" onClick={() => input.current?.click()}>Thay file khác</button>
            <input ref={input} type="file" hidden accept=".pdf,.doc,.docx" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
        </div>
        {busy && file && <div className="h-2 overflow-hidden rounded bg-line" role="progressbar" aria-valuenow={progress}><div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div>}
        <div className="flex gap-3">
          <button type="button" className="btn-outline" onClick={() => nav(-1)}>Hủy</button>
          <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
        </div>
      </form>
    </div>
  );
}
