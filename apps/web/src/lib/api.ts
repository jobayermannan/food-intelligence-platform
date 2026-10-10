// Access tokens live only in memory. The API owns the HttpOnly refresh cookie.
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let generation = 0;
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export function setToken(token: string | null) { generation++; accessToken = token; }
async function responseBody(response: Response) {
  if (response.status === 204) return undefined;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(Array.isArray(body?.message) ? body.message.join(". ") : body?.message ?? (response.status >= 500 ? "The service is unavailable. Check the API connection and try again." : "The request could not be completed."), response.status);
  return body;
}
export async function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;
  const version = generation;
  const refresh = async () => {
    const response = await fetch("/api/v1/auth/refresh", {method: "POST", credentials: "include", cache: "no-store"});
    if (response.status === 401) { if (version === generation) accessToken = null; return false; }
    const body = await responseBody(response);
    if (version === generation) accessToken = body.accessToken;
    return version === generation;
  };
  const task: Promise<boolean> = typeof navigator !== "undefined" && navigator.locks
    ? (async (): Promise<boolean> => await navigator.locks.request("food-intelligence-session", () => refresh()))()
    : refresh();
  refreshing = task.finally(() => { refreshing = null; });
  return await refreshing;
}
export async function api<T>(path: string, options: {method?: string; body?: unknown; public?: boolean; signal?: AbortSignal} = {}): Promise<T> {
  const send = () => fetch(`/api/v1${path}`, {
    method: options.method ?? "GET", credentials: "include", cache: "no-store", signal: options.signal,
    headers: { ...(options.body !== undefined ? {"Content-Type": "application/json"} : {}), ...(!options.public && accessToken ? {Authorization: `Bearer ${accessToken}`} : {}) },
    ...(options.body !== undefined ? {body: JSON.stringify(options.body)} : {}),
  });
  let response: Response;
  try {
    response = await send();
    if (response.status === 401 && !options.public) {
      if (await refreshSession()) response = await send();
      else { if (typeof window !== "undefined") window.dispatchEvent(new Event("session-expired")); }
    }
  } catch (error) {
    if (error instanceof ApiError || (error instanceof Error && error.name === "AbortError")) throw error;
    throw new ApiError("Cannot reach the server. Check your connection, then retry.", 0);
  }
  return responseBody(response) as Promise<T>;
}
