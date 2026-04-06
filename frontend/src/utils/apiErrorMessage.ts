import type { AxiosError } from "axios";

type ValidationErr = { msg?: string; loc?: (string | number)[] };

/**
 * FastAPI returns `detail` as a string (HTTPException) or an array (422 validation).
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const ax = error as AxiosError<{ detail?: string | ValidationErr[] }>;
  const detail = ax.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first && typeof first === "object" && "msg" in first) {
      return String((first as ValidationErr).msg);
    }
  }

  if (ax.message === "Network Error" || ax.code === "ERR_NETWORK") {
    return "Network error — check that the API is running and VITE_API_URL matches the backend (including /api).";
  }

  const status = ax.response?.status;
  if (status === 429) {
    return "Too many requests. Please wait a minute and try again.";
  }

  return fallback;
}
