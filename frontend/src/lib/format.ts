import { DocStatus } from './types';

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;

export const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

export function timeAgo(d: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} ngày trước`;
  return formatDate(d);
}

export const statusLabel: Record<DocStatus, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối',
};

export const fileKind = (mime: string) => (mime === 'application/pdf' ? 'PDF' : 'Word');

export function notifText(type: string, p: Record<string, any> | null): string {
  const t = p?.title ? `“${p.title}”` : 'tài liệu';
  switch (type) {
    case 'DOC_APPROVED': return `${t} đã được duyệt (+10 điểm uy tín)`;
    case 'DOC_REJECTED': return `${t} bị từ chối: ${p?.reason ?? ''}`;
    case 'DOC_VIOLATION': return `${t} bị gỡ do vi phạm: ${p?.reason ?? ''}`;
    case 'DOC_DELETED': return `${t} đã bị quản trị viên xóa. Lý do: ${p?.reason ?? ''}`;
    case 'ANNOUNCEMENT': return `📢 ${p?.title ?? 'Thông báo'}: ${p?.message ?? ''}`;
    case 'NEW_COMMENT': return `${p?.by ?? 'Ai đó'} đã bình luận về ${t}`;
    case 'NEW_RATING': return `${p?.by ?? 'Ai đó'} đánh giá ${p?.score ?? ''} sao cho ${t}`;
    default: return 'Bạn có thông báo mới';
  }
}
