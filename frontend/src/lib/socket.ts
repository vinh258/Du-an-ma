import { io, Socket } from 'socket.io-client';
import { API_URL, tokenStore } from './api';

export function connectNotifications(): Socket | null {
  const t = tokenStore.get();
  if (!t) return null;
  return io(`${API_URL}/notifications`, { auth: { token: t.accessToken }, transports: ['websocket', 'polling'] });
}
