import { resolveRuntimeApiBase } from "./runtimeUrls";

const API_BASE = resolveRuntimeApiBase(
  import.meta.env.VITE_API_BASE,
  typeof window === "undefined" ? undefined : window.location
).replace(/\/+$/, "");

export interface RequestOptions extends RequestInit {
  bodyJson?: unknown;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers ?? {});
  if (options.bodyJson !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: options.bodyJson !== undefined ? JSON.stringify(options.bodyJson) : options.body
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(payload?.error ?? `Erro HTTP ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
