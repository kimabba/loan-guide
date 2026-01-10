import { Context, Next } from "hono";

// ============================================
// Rate Limiting (In-memory, 단일 인스턴스용)
// ============================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// 만료된 항목 정리 (요청 시 lazy cleanup)
function cleanupExpiredEntries() {
  const now = Date.now();
  // 100개 이상일 때만 정리 (성능 최적화)
  if (rateLimitStore.size > 100) {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }
}

export function rateLimit(options: {
  windowMs?: number;
  max?: number;
  keyGenerator?: (c: Context) => string;
}) {
  const windowMs = options.windowMs || 60 * 1000; // 1분
  const max = options.max || 60; // 분당 60회
  const keyGenerator = options.keyGenerator || ((c: Context) => {
    return c.req.header("cf-connecting-ip") ||
           c.req.header("x-forwarded-for")?.split(",")[0] ||
           "anonymous";
  });

  return async (c: Context, next: Next) => {
    // Lazy cleanup on each request
    cleanupExpiredEntries();

    const key = keyGenerator(c);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    // Rate limit 헤더 설정
    c.header("X-RateLimit-Limit", max.toString());
    c.header("X-RateLimit-Remaining", Math.max(0, max - entry.count).toString());
    c.header("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000).toString());

    if (entry.count > max) {
      return c.json(
        { error: "Too many requests. Please try again later." },
        429
      );
    }

    await next();
  };
}

// ============================================
// Security Headers
// ============================================
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next();

    // XSS Protection
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("X-XSS-Protection", "1; mode=block");

    // Referrer Policy
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");

    // Content Security Policy (API용 - 스크립트 차단)
    c.header(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'"
    );

    // HSTS (HTTPS 강제 - 프로덕션용)
    if (c.env?.ENVIRONMENT === "production") {
      c.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }
  };
}

// ============================================
// Input Sanitization
// ============================================
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";

  return input
    // HTML 특수문자 이스케이프
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    // 제어 문자 제거
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // 앞뒤 공백 제거
    .trim();
}

// SQL Injection 방지용 (참고용 - 현재는 JSON 사용)
export function sanitizeForQuery(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .replace(/'/g, "''")
    .replace(/;/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .trim();
}

// ============================================
// Input Validation
// ============================================
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

export function validateMessage(message: unknown): ValidationResult {
  if (typeof message !== "string") {
    return { valid: false, error: "Message must be a string" };
  }

  if (message.trim().length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }

  if (message.length > 1000) {
    return { valid: false, error: "Message too long (max 1000 characters)" };
  }

  return {
    valid: true,
    sanitized: sanitizeString(message),
  };
}

export function validateEmail(email: unknown): ValidationResult {
  if (email === undefined || email === null || email === "") {
    return { valid: true, sanitized: undefined }; // Optional field
  }

  if (typeof email !== "string") {
    return { valid: false, error: "Email must be a string" };
  }

  if (email.length > 254) {
    return { valid: false, error: "Email too long" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true, sanitized: email.toLowerCase().trim() };
}

export function validateReportType(type: unknown): ValidationResult {
  const validTypes = ["bug", "guide_fix", "feature", "other"];

  if (typeof type !== "string" || !validTypes.includes(type)) {
    return { valid: false, error: "Invalid report type" };
  }

  return { valid: true, sanitized: type };
}

// ============================================
// Request Size Limit
// ============================================
export function requestSizeLimit(maxSize: number = 10 * 1024) { // 10KB default
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header("content-length");

    if (contentLength && parseInt(contentLength) > maxSize) {
      return c.json(
        { error: "Request body too large" },
        413
      );
    }

    await next();
  };
}
