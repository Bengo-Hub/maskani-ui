/** maskani-api error envelope: `{error, code}` plus optional `required`, `module`, `feature`. */
export interface ApiErrorBody {
  error?: string;
  message?: string;
  code?: string;
  required?: string;
  module?: string;
  feature?: string;
}

interface AxiosLike {
  response?: { status?: number; data?: unknown };
  message?: string;
  code?: string;
}

export function errorBody(err: unknown): ApiErrorBody {
  const data = (err as AxiosLike)?.response?.data;
  return data && typeof data === 'object' ? (data as ApiErrorBody) : {};
}

export function errorStatus(err: unknown): number | undefined {
  return (err as AxiosLike)?.response?.status;
}

/** Human message for a failed request, preferring the backend's own wording. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const status = errorStatus(err);
  const body = errorBody(err);
  if (body.code === 'module_not_enabled') return 'This module is not switched on for your estate.';
  if (body.code === 'feature_not_available') return 'Your plan does not include this feature.';
  if (body.code === 'forbidden' || status === 403) return body.error || 'You do not have permission to do that.';
  if (body.error) return body.error;
  if (body.message) return body.message;
  const e = err as AxiosLike;
  if (e?.code === 'ECONNABORTED') return 'The request timed out. Check your connection and try again.';
  if (!e?.response && e?.message === 'Network Error') return 'You are offline or the server cannot be reached.';
  return fallback;
}

/** True when a transport failure, not an HTTP answer, caused the error. */
export function isNetworkError(err: unknown): boolean {
  const e = err as AxiosLike;
  return !e?.response && (e?.message === 'Network Error' || e?.code === 'ECONNABORTED' || e?.code === 'ERR_NETWORK');
}
