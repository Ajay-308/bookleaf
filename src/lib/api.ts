const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://bookleaf-1-ujzy.onrender.com")
  .replace(/\/+$/, "");

export async function request<T>(url: string, token: string, onUnauthorized: () => void, options: RequestInit = {}): Promise<T> {
  const requestUrl = /^https?:\/\//i.test(url) ? url : `${apiBaseUrl}${url}`;
  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized();
    throw new Error(payload.error || "Request failed. Please try again.");
  }
  return payload as T;
}
