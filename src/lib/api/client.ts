import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/lib/config';
import { errorBody } from './errors';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Background refetches set this so a failure never fires the global 5xx toast. */
    suppressErrorToast?: boolean;
    _retried?: boolean;
  }
}

type Callback<T = unknown> = ((data: T) => void) | null;

/**
 * The single HTTP client for maskani-api. Pages never call fetch directly; domain modules in
 * src/lib/api wrap this and TanStack hooks in src/hooks wrap those.
 */
class ApiClient {
  private instance: AxiosInstance;
  private accessToken: string | null = null;
  private tenantId: string | null = null;
  private tenantSlug: string | null = null;
  private platformOwner = false;

  private on401: (() => void) | null = null;
  private onSubscription403: Callback<unknown> = null;
  private onLimitReached: Callback<unknown> = null;
  private onServerError: ((status: number, message: string) => void) | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    });
    this.instance.interceptors.request.use(this.handleRequest);
    this.instance.interceptors.response.use((r: AxiosResponse) => r, this.handleError);
  }

  private handleRequest = (config: InternalAxiosRequestConfig) => {
    if (this.accessToken) config.headers.Authorization = `Bearer ${this.accessToken}`;
    if (!this.platformOwner) {
      if (this.tenantId) config.headers['X-Tenant-ID'] = this.tenantId;
      if (this.tenantSlug) config.headers['X-Tenant-Slug'] = this.tenantSlug;
    }
    return config;
  };

  private handleError = async (error: any) => {
    const status: number | undefined = error?.response?.status;
    const config = error?.config;
    // Gate tablet calls carry a device key, not the user's session: a 401 there (wrong guard PIN,
    // revoked tablet) must never refresh or end a staff session on the same browser.
    if (config?.headers?.['X-Device-Key']) return Promise.reject(error);

    if (status === 401 && this.accessToken && config && !config._retried) {
      const { refreshAccessToken } = await import('@/lib/auth/token-refresh');
      const result = await refreshAccessToken();
      if ('token' in result) {
        this.accessToken = result.token;
        config._retried = true;
        config.headers.Authorization = `Bearer ${result.token}`;
        return this.instance.request(config);
      }
      // Only a refused refresh token ends the session; a transient failure just fails this call.
      if ('rejected' in result) this.on401?.();
    } else if (status === 401 && config?._retried) {
      this.on401?.();
    }

    if (status === 403) {
      const body = errorBody(error);
      if (body.code === 'feature_not_available' || body.code === 'subscription_inactive' || body.code === 'upgrade') {
        this.onSubscription403?.(body);
      }
    }
    if (status === 402) this.onLimitReached?.(error.response?.data);
    if (status && status >= 500 && !config?.suppressErrorToast) {
      const body = errorBody(error);
      this.onServerError?.(status, body.error || body.message || 'A server error occurred. Please try again.');
    }
    return Promise.reject(error);
  };

  setOn401(cb: (() => void) | null) { this.on401 = cb; }
  setOnSubscription403(cb: Callback<unknown>) { this.onSubscription403 = cb; }
  setOnLimitReached(cb: Callback<unknown>) { this.onLimitReached = cb; }
  setOnServerError(cb: ((status: number, message: string) => void) | null) { this.onServerError = cb; }

  setAccessToken(token: string | null) { this.accessToken = token; }
  getAccessToken() { return this.accessToken; }
  setTenantInfo(id: string | null, slug: string | null) { this.tenantId = id; this.tenantSlug = slug; }
  setPlatformOwner(v: boolean) { this.platformOwner = v; }

  get<T>(url: string, params?: Record<string, unknown>, config?: { suppressErrorToast?: boolean; timeout?: number }): Promise<T> {
    return this.instance.get<T>(url, { params: clean(params), ...config }).then((r) => r.data);
  }
  post<T>(url: string, data?: unknown, config?: { headers?: Record<string, string>; timeout?: number }): Promise<T> {
    return this.instance.post<T>(url, data, config).then((r) => r.data);
  }
  put<T>(url: string, data?: unknown): Promise<T> {
    return this.instance.put<T>(url, data).then((r) => r.data);
  }
  patch<T>(url: string, data?: unknown): Promise<T> {
    return this.instance.patch<T>(url, data).then((r) => r.data);
  }
  delete<T>(url: string): Promise<T> {
    return this.instance.delete<T>(url).then((r) => r.data);
  }
  /** Gate tablet calls: authenticated by the registered device key, not a user token. */
  device<T>(method: 'get' | 'post', url: string, deviceKey: string, data?: unknown): Promise<T> {
    return this.instance
      .request<T>({ method, url, data, headers: { 'X-Device-Key': deviceKey }, timeout: 10000, suppressErrorToast: true })
      .then((r) => r.data);
  }
  /** Multipart upload (media). Lets the browser set the boundary. */
  upload<T>(url: string, form: FormData): Promise<T> {
    return this.instance
      .post<T>(url, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })
      .then((r) => r.data);
  }
}

/** Drops undefined, null and empty-string params so the API never sees `?status=`. */
function clean(params?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

export const apiClient = new ApiClient();
