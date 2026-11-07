import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { notifText } from '../lib/format';
import { connectNotifications } from '../lib/socket';
import { Notif } from '../lib/types';
import Icon from './Icon';
import { useToast } from './Toast';

export const useUnreadCount = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => (await api.get<{ count: number }>('/notifications/unread-count')).data.count,
    enabled: !!user,
  }).data ?? 0;
};

/** Nhận thông báo realtime qua Socket.io (gọi 1 lần ở Layout) */
export function useRealtimeNotifications() {
  const { user, reload } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!user) return;
    const socket = connectNotifications();
    if (!socket) return;
    socket.on('notification', (n: Notif) => {
      toast(notifText(n.type, n.payload), n.type === 'DOC_REJECTED' || n.type === 'DOC_VIOLATION' || n.type === 'DOC_DELETED' ? 'error' : 'info');
      qc.invalidateQueries({ queryKey: ['unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['my-docs'] });
      if (n.type.startsWith('DOC_')) reload(); // điểm uy tín có thể đã thay đổi
    });
    return () => { socket.disconnect(); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function NotificationBell() {
  const count = useUnreadCount();
  return (
    <Link to="/notifications" className="relative rounded-xl p-2.5 text-muted transition-colors hover:bg-brand-soft hover:text-brand"
      aria-label={`Thông báo${count ? `, ${count} chưa đọc` : ''}`}>
      <Icon name="bell" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-[18px] animate-bounce rounded-full bg-accent px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
