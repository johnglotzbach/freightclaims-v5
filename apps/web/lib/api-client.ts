import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

client.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const corpId = localStorage.getItem('fc-impersonate-corporate');
    if (corpId) {
      config.headers['X-Corporate-Id'] = corpId;
    }
  }
  if (typeof window !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
    config.timeout = 120_000;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  failedQueue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(client(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/users/refresh-token`, { refreshToken });
        const newToken = data.accessToken;
        localStorage.setItem('accessToken', newToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

        client.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.get<T>(url, config);
  return response.data;
}

/**
 * GET that always returns an array — handles both raw arrays and
 * paginated `{ data: T[], pagination }` responses from the API.
 */
export async function getList<T>(url: string, config?: AxiosRequestConfig): Promise<T[]> {
  const response = await client.get(url, config);
  const d = response.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object' && Array.isArray((d as any).data)) return (d as any).data;
  return [];
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.post<T>(url, data, config);
  return response.data;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.put<T>(url, data, config);
  return response.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.delete<T>(url, config);
  return response.data;
}

/**
 * Resolves the direct API base URL for file uploads at runtime.
 * Next.js rewrites corrupt multipart bodies, so uploads go directly to the API.
 * No env var needed — detects Render deployment from window.location.
 */
function getUploadBase(): string {
  if (typeof window === 'undefined') return '/api/v1';

  const env = process.env.NEXT_PUBLIC_UPLOAD_URL;
  if (env) return env;

  const host = window.location.hostname;
  if (host.includes('-web.onrender.com')) {
    return `https://${host.replace('-web.onrender.com', '-api.onrender.com')}/api/v1`;
  }

  return '/api/v1';
}

/**
 * Direct file upload using the browser's native fetch — bypasses the Next.js
 * proxy entirely and sends multipart/form-data straight to the API server.
 */
export async function uploadFile(path: string, formData: FormData): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const corpId = typeof window !== 'undefined' ? localStorage.getItem('fc-impersonate-corporate') : null;
  if (corpId) headers['X-Corporate-Id'] = corpId;

  const base = getUploadBase();
  const url = `${base}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    signal: AbortSignal.timeout(120_000),
  });

  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data?.error || data?.message || `Upload failed (${res.status})`);
    err.response = { data, status: res.status };
    throw err;
  }
  return data;
}

/**
 * Fetch a document binary with auth and return an object URL for inline viewing.
 * Uses the download endpoint directly via the API server.
 */
export async function fetchDocumentBlob(docId: string): Promise<{ blobUrl: string; contentType: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const corpId = typeof window !== 'undefined' ? localStorage.getItem('fc-impersonate-corporate') : null;
  if (corpId) headers['X-Corporate-Id'] = corpId;

  const url = `/api/v1/documents/${docId}/download`;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, contentType: blob.type };
}

export { client as apiClient };
