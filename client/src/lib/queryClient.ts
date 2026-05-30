import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Turn a raw error response body into a human-friendly message.
// The proxy/backend returns errors as JSON like
// {"error":"Selling price must be greater than buying price","success":false,"httpStatus":400}
// so we extract the human message instead of dumping the raw JSON into a toast.
export function parseApiError(status: number, rawBody: string): string {
  const body = (rawBody || "").trim();
  if (body) {
    try {
      const parsed = JSON.parse(body);
      const msg = parsed?.error || parsed?.message;
      if (typeof msg === "string" && msg.trim()) return msg;
    } catch {
      // Not JSON — if it's plain text (not a JSON blob), show it as-is.
      if (!body.startsWith("{") && !body.startsWith("[")) return body;
    }
  }
  if (status === 401 || status === 403) return "You are not authorized to do that.";
  if (status === 404) return "Not found.";
  if (status >= 500) return "Something went wrong on the server. Please try again.";
  return `Request failed (${status}).`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseApiError(res.status, text || res.statusText));
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check for both admin and attendant tokens
  const adminToken = localStorage.getItem("authToken");
  const attendantToken = localStorage.getItem("attendantToken");
  const token = attendantToken || adminToken;
  
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check for both admin and attendant tokens
    const adminToken = localStorage.getItem("authToken");
    const attendantToken = localStorage.getItem("attendantToken");
    const token = attendantToken || adminToken;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity for better cache management
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
