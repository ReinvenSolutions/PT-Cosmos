import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json?.message || json?.error || text;
    } catch {
      // no es JSON, usar text tal cual
    }
    throw new Error(message || `Error ${res.status}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = url.startsWith("http") ? url : `${base}${url}`;
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(`El servidor devolvió HTML en lugar de JSON. ¿Estás usando npm run dev? Verifica la consola del servidor.`);
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = (queryKey as string[]).join("/");
    const url = path.startsWith("/") ? path : `/${path}`;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      throw new Error("El servidor devolvió HTML. Usa npm run dev y verifica que DATABASE_URL en .env apunte a Supabase.");
    }
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
