import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const KEY = 'hub_tokens';

export interface Tokens { accessToken: string; refreshToken: string }
export const tokenStore = {
  get(): Tokens | null {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  },
  set(t: Tokens) { localStorage.setItem(KEY, JSON.stringify(t)); },
  clear() { localStorage.removeItem(KEY); },
};

export const api = axios.create({ baseURL: `${API_URL}/api/v1` });

api.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t.accessToken}`;
  return cfg;
});

let refreshing: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  const t = tokenStore.get();
  if (!t) return null;
  try {
    const { data } = await axios.post<Tokens>(`${API_URL}/api/v1/auth/refresh`, { refreshToken: t.refreshToken });
    tokenStore.set(data);
    return data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthCall = cfg?.url?.includes('/auth/');
    if (error.response?.status === 401 && cfg && !cfg._retry && !isAuthCall && tokenStore.get()) {
      cfg._retry = true;
      refreshing ??= refreshAccessToken().finally(() => { refreshing = null; });
      const newToken = await refreshing;
      if (newToken) {
        cfg.headers.Authorization = `Bearer ${newToken}`;
        return api(cfg);
      }
      window.dispatchEvent(new Event('hub:logout'));
    }
    return Promise.reject(error);
  },
);

/** Lấy thông báo lỗi dễ đọc từ response của NestJS */
export function errMsg(e: unknown): string {
  const err = e as AxiosError<{ message?: string | string[] }>;
  const m = err.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  if (m) return m;
  if (err.code === 'ERR_NETWORK') return 'Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.';
  return err.message || 'Có lỗi xảy ra';
}

/** Tải file (CSV...) từ API có đăng nhập rồi lưu về máy */
export async function downloadFile(path: string, filename: string) {
  const res = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
