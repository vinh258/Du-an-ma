import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, errMsg } from '../lib/api';
import { useToast } from './Toast';
import { Modal } from './ui';

/** Hộp thoại xác nhận xóa tài liệu. Khi ADMIN xóa bài của người khác thì có ô nhập lý do (gửi thông báo cho người đăng). */
export default function DeleteDocModal({ doc, byAdmin, onClose, onDeleted }: {
  doc: { id: number; title: string }; byAdmin: boolean; onClose: () => void; onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState('');

  const del = useMutation({
    mutationFn: async () => api.delete(`/documents/${doc.id}`, { params: byAdmin && reason.trim() ? { reason: reason.trim() } : {} }),
    onSuccess: () => {
      toast('Đã xóa tài liệu');
      ['documents', 'my-docs', 'mod-queue', 'bookmarks', 'public-profile'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose(); onDeleted?.();
    },
    onError: (e) => toast(errMsg(e), 'error'),
  });

  return (
    <Modal title="Xóa tài liệu?" onClose={onClose}>
      <p className="text-sm">“<b>{doc.title}</b>” sẽ bị xóa vĩnh viễn cùng file, bình luận và đánh giá. Hành động này không thể hoàn tác.</p>
      {byAdmin && (
        <div className="mt-3">
          <label className="label" htmlFor="del-reason">Lý do xóa (gửi cho người đăng)</label>
          <textarea id="del-reason" className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Vi phạm bản quyền, nội dung không phù hợp…" />
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Hủy</button>
        <button className="btn-danger" disabled={del.isPending} onClick={() => del.mutate()}>{del.isPending ? 'Đang xóa…' : 'Xóa tài liệu'}</button>
      </div>
    </Modal>
  );
}
