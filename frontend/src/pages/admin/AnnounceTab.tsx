import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useToast } from '../../components/Toast';
import { api, errMsg } from '../../lib/api';

export default function AnnounceTab() {
  const toast = useToast();
  const [f, setF] = useState({ title: '', message: '' });
  const send = useMutation({
    mutationFn: async () => (await api.post<{ sent: number }>('/admin/announcements', f)).data,
    onSuccess: (r) => { toast(`Đã gửi thông báo tới ${r.sent} người dùng`); setF({ title: '', message: '' }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); if (confirm('Gửi thông báo này tới TẤT CẢ người dùng?')) send.mutate(); };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={submit} className="panel space-y-4 p-5">
        <h2 className="text-xl font-bold">Gửi thông báo toàn hệ thống</h2>
        <div><label className="label" htmlFor="a-t">Tiêu đề</label>
          <input id="a-t" className="input" required minLength={3} maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ví dụ: Bảo trì hệ thống" /></div>
        <div><label className="label" htmlFor="a-m">Nội dung <span className="font-normal text-muted">({f.message.length}/500)</span></label>
          <textarea id="a-m" className="input" rows={4} required minLength={3} maxLength={500} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
        <button className="btn-primary" disabled={send.isPending}>{send.isPending ? 'Đang gửi…' : 'Gửi tới mọi người'}</button>
      </form>
      <div className="panel p-5 text-sm text-muted">
        <h3 className="mb-2 text-lg font-bold text-ink">Người dùng sẽ thấy</h3>
        <p>Thông báo hiện ngay lập tức (realtime) cho ai đang online, và lưu trong mục <b className="text-ink">Thông báo</b> cho người offline.</p>
        <div className="mt-4 rounded-xl border-l-4 border-accent bg-accent-soft p-3 text-ink">
          <p className="font-semibold">📢 {f.title || 'Tiêu đề thông báo'}</p>
          <p className="mt-0.5 text-sm">{f.message || 'Nội dung thông báo sẽ hiển thị ở đây.'}</p>
        </div>
      </div>
    </div>
  );
}
