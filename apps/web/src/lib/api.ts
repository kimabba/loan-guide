import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "";

// 현재 세션의 액세스 토큰을 가져오는 헬퍼
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

// 인증 헤더 추가 옵션
interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean; // true면 인증 필수, 없으면 401 에러
  includeAuth?: boolean; // true면 인증 있으면 포함 (선택적)
}

export async function apiRequest<T>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const { requireAuth, includeAuth, ...fetchOptions } = options || {};

  // 헤더 준비
  const headers = new Headers(fetchOptions.headers);

  // 인증 토큰 처리
  if (requireAuth || includeAuth) {
    const token = await getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else if (requireAuth) {
      throw new Error("Authentication required");
    }
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // 일반 GET 요청 (인증 불필요)
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),

  // 인증 필수 GET 요청
  authGet: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { requireAuth: true }),

  // 선택적 인증 GET 요청 (로그인 상태면 토큰 포함)
  optionalAuthGet: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { includeAuth: true }),

  // 일반 POST 요청 (인증 불필요)
  post: <T>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  // 인증 필수 POST 요청
  authPost: <T>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      requireAuth: true,
    }),

  // 인증 필수 PUT 요청
  authPut: <T>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      requireAuth: true,
    }),

  // 일반 DELETE 요청 (인증 불필요)
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
    }),

  // 인증 필수 DELETE 요청
  authDelete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
      requireAuth: true,
    }),
};
