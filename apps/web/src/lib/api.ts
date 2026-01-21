import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "";

// Rate Limit 관리
interface RequestRecord {
  timestamp: number;
  endpoint: string;
}

class RateLimitManager {
  private requests: RequestRecord[] = [];
  private readonly MAX_RPM = 4; // Free tier limit (5-1 for safety)
  private readonly MAX_TPM = 240000; // 250K - 10K safety margin
  private readonly WINDOW_MS = 60000; // 1 minute

  canMakeRequest(endpoint: string): boolean {
    const now = Date.now();
    
    // 최근 1분 내의 요청만 필터링
    this.requests = this.requests.filter(r => now - r.timestamp < this.WINDOW_MS);
    
    // RPM 체크
    if (this.requests.length >= this.MAX_RPM) {
      console.warn(`Rate limit RPM 도달: ${this.requests.length}/${this.MAX_RPM}`);
      return false;
    }
    
    // TPM 체크 (추정 - 대략적으로 계산)
    const estimatedTPM = this.requests.length * 1000; // 요청당 평균 1K 토큰 가정
    if (estimatedTPM >= this.MAX_TPM) {
      console.warn(`Rate limit TPM 추정 도달: ${estimatedTPM}/${this.MAX_TPM}`);
      return false;
    }
    
    return true;
  }

  recordRequest(endpoint: string): void {
    this.requests.push({
      timestamp: Date.now(),
      endpoint
    });
  }

  async waitForAvailability(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      if (this.canMakeRequest('/chat')) {
        return;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
      const delay = Math.min(Math.pow(2, attempts) * 1000, 16000);
      console.log(`Rate limit 대기 ${delay/1000}초 (시도 ${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }
    
    throw new Error('Rate limit timeout: 최대 대기 시간 초과');
  }
}

const rateLimitManager = new RateLimitManager();

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
  skipRateLimit?: boolean; // true면 rate limit 체크 건너뛰기
}

export async function apiRequest<T>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const { requireAuth, includeAuth, skipRateLimit, ...fetchOptions } = options || {};

  // Rate Limit 체크 (선택적 제외)
  if (!skipRateLimit && endpoint === '/api/chat') {
    await rateLimitManager.waitForAvailability();
    rateLimitManager.recordRequest(endpoint);
  }

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

  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      const res = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        // 429 Rate Limit 에러 시 특별 처리
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retries) * 1000;
          
          console.warn(`API 429 error: ${waitTime}ms 대기 후 재시도`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
          continue;
        }
        
        throw new Error(errorData.error || `API error: ${res.status}`);
      }

      return res.json();
    } catch (error: any) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }
      
      // 일반적인 에러도 exponential backoff
      const waitTime = Math.pow(2, retries) * 1000;
      console.warn(`API error 재시도 ${retries}/${maxRetries}: ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new Error('API request failed after retries');
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

  // 챗봇 전용 POST (Rate Limit 적용)
  chatPost: <T>(endpoint: string, data: unknown) =>
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
