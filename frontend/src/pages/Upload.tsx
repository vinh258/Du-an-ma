import { useQueryClient } from '@tanstack/react-query';
import { FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { ErrorBox } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { formatBytes } from '../lib/format';
import { useFaculties, useSubjects } from '../lib/hooks';

const MAX = 20 * 1024 * 1024;
const OK = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function Upload() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const { data: faculties } = useFaculties();
  const [facultyId, setFacultyId] = useState('');
  const { data: subjects } = useSubjects(facultyId ? +facultyId : '');
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({ title: '', description: '', subjectId: '', tags: '' });
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);

  const pick = (fl?: File) => {
    if (!fl) return;
    if (!OK.includes(fl.type)) return setError('Chỉ chấp nhận file PDF hoặc Word (.doc, .docx)');
    if (fl.size > MAX) return setError('File vượt quá 20MB');
    setError(''); setFile(fl);
    if (!f.title) setF((p) => ({ ...p, title: fl.name.replace(/\.[^.]+$/, '') }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Hãy chọn file tài liệu');
    if (!f.subjectId) return setError('Hãy chọn môn học');
    setBusy(true); setError('');
    const fd = new FormData();
    fd.append('file', file); fd.append('title', f.title); fd.append('subjectId', f.subjectId);
    if (f.description) fd.append('description', f.description);
    if (f.tags) fd.append('tags', f.tags);
    try {
      await api.post('/documents', fd, { onUploadProgress: (p) => setProgress(Math.round((p.loaded * 100) / (p.total || file.size))) });
      toast('Tải lên thành công! Tài liệu đang chờ kiểm duyệt.');
      qc.invalidateQueries({ queryKey: ['my-docs'] });
      nav('/my-documents');
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl">Đăng tài liệu</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Tài liệu sẽ được người kiểm duyệt xem xét trước khi hiển thị công khai. Khi được duyệt, bạn nhận +10 điểm uy tín.</p>
      <form onSubmit={submit} className="panel space-y-4 p-5">
        {error && <ErrorBox text={error} />}
        <div>
          <span className="label">File tài liệu (PDF, Word — tối đa 20MB)</span>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
            className={`rounded-md border-2 border-dashed px-4 py-8 text-center ${drag ? 'border-brand bg-brand-soft' : 'border-line'}`}>
            {file ? (
              <p className="text-sm"><b>{file.name}</b> <span className="text-muted">({formatBytes(file.size)})</span>
                <button type="button" className="ml-3 text-danger underline" onClick={() => setFile(null)}>Bỏ chọn</button></p>
            ) : (
              <>
                <p className="text-sm text-muted">Kéo thả file vào đây, hoặc</p>
                <button type="button" className="btn-outline btn-sm mt-2" onClick={() => input.current?.click()}>Chọn file từ máy</button>
              </>
            )}
            <input ref={input} type="file" hidden accept=".pdf,.doc,.docx" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
        </div>
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
          <textarea id="d" className="input" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Tài liệu gồm những nội dung gì, dùng cho học kỳ nào…" /></div>
        <div><label className="label" htmlFor="tg">Tag (ngăn cách bằng dấu phẩy, tối đa 10)</label>
          <input id="tg" className="input" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="đề thi, giữa kỳ, slide" /></div>
        {busy && <div className="h-2 overflow-hidden rounded bg-line" role="progressbar" aria-valuenow={progress}><div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? `Đang tải lên… ${progress}%` : 'Đăng tài liệu'}</button>
      </form>
    </div>
  );
}
