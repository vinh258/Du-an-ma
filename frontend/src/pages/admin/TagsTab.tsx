import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { Empty, ErrorBox, Modal, Spinner } from '../../components/ui';
import { api, errMsg } from '../../lib/api';
import { TagRow } from '../../lib/types';

export default function TagsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [merging, setMerging] = useState(false);
  const [target, setTarget] = useState<number | ''>('');

  const { data, isLoading, error } = useQuery({ queryKey: ['admin-tags'], queryFn: async () => (await api.get<TagRow[]>('/admin/tags')).data });
  const refresh = () => { ['admin-tags', 'tags', 'documents'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };
  const fail = (e: unknown) => toast(errMsg(e), 'error');

  const rename = useMutation({ mutationFn: async (v: { id: number; name: string }) => api.patch(`/admin/tags/${v.id}`, { name: v.name }), onSuccess: () => { toast('Đã đổi tên tag'); refresh(); }, onError: fail });
  const remove = useMutation({ mutationFn: async (id: number) => api.delete(`/admin/tags/${id}`), onSuccess: () => { toast('Đã xóa tag'); setSel(new Set()); refresh(); }, onError: fail });
  const merge = useMutation({
    mutationFn: async () => api.post('/admin/tags/merge', { sourceIds: [...sel].filter((i) => i !== target), targetId: target }),
    onSuccess: () => { toast('Đã gộp tag'); setSel(new Set()); setMerging(false); setTarget(''); refresh(); }, onError: fail,
  });

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox text={errMsg(error)} />;
  const rows = data.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  const chosen = data.filter((t) => sel.has(t.id));
  const toggle = (id: number, on: boolean) => setSel((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n; });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Tìm tag…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm tag" />
        <span className="text-sm text-muted">{data.length} tag</span>
        <button className="btn-primary ml-auto" disabled={sel.size < 2} onClick={() => { setTarget(chosen[0]?.id ?? ''); setMerging(true); }}>Gộp {sel.size >= 2 ? `${sel.size} tag đã chọn` : 'tag (chọn từ 2)'}</button>
      </div>
      {rows.length === 0 ? <Empty title="Không có tag nào" hint="Tag được tạo khi người dùng đăng tài liệu." /> : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-muted"><tr><th className="w-10 px-4 py-2"></th><th>Tag</th><th>Số tài liệu</th><th></th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((t) => (
                <tr key={t.id} className={sel.has(t.id) ? 'bg-brand-soft/50' : ''}>
                  <td className="px-4 py-2"><input type="checkbox" className="accent-[rgb(var(--brand))]" checked={sel.has(t.id)} onChange={(e) => toggle(t.id, e.target.checked)} aria-label={`Chọn tag ${t.name}`} /></td>
                  <td><span className="rounded-full border border-line px-2.5 py-0.5">#{t.name}</span> <span className="ml-1 text-xs text-muted">{t.slug}</span></td>
                  <td>{t.uses === 0 ? <span className="text-muted">0 (không dùng)</span> : t.uses}</td>
                  <td className="space-x-2 whitespace-nowrap pr-4 text-right">
                    <button className="btn-outline btn-sm" onClick={() => { const name = prompt('Tên mới cho tag:', t.name); if (name && name.trim() && name !== t.name) rename.mutate({ id: t.id, name }); }}>Đổi tên</button>
                    <button className="btn-outline btn-sm text-danger" onClick={() => confirm(`Xóa tag “${t.name}”? Các tài liệu sẽ mất tag này.`) && remove.mutate(t.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {merging && (
        <Modal title="Gộp tag" onClose={() => setMerging(false)}>
          <p className="mb-3 text-sm text-muted">Các tài liệu đang dùng những tag còn lại sẽ chuyển sang tag đích; tag nguồn bị xóa.</p>
          <label className="label" htmlFor="merge-target">Giữ lại tag (tag đích)</label>
          <select id="merge-target" className="input" value={target} onChange={(e) => setTarget(+e.target.value)}>
            {chosen.map((t) => <option key={t.id} value={t.id}>#{t.name} ({t.uses} tài liệu)</option>)}
          </select>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setMerging(false)}>Hủy</button>
            <button className="btn-primary" disabled={!target || merge.isPending} onClick={() => merge.mutate()}>Gộp tag</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
