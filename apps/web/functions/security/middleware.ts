/**
 * Security Middleware Module
 *
 * CORS, CSRF, CSP, Security Headers, Rate Limiting, Audit Logging
 */

import type { Context, Next, MiddlewareHandler } from "hono";

// ============================================
// Type Definitions
// ============================================
interface SecurityConfig {
  allowedOrigins: string[];
  csrfEnabled: boolean;
  cspEnabled: boolean;
  auditLogEnabled: boolean;
  rateLimitConfig: {
    windowMs: number;
    maxRequests: number;
    maxChatRequests: number;
    maxAuthAttempts: number;
  };
}

interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  path: string;
  method: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// ============================================
// Configuration
// ============================================
export const securityConfig: SecurityConfig = {
  allowedOrigins: [
    "https://loan-guide.pages.dev",
    "http://localhost:5173",
    "http://localhost:8788", // Wrangler dev
  ],
  csrfEnabled: true,
  cspEnabled: true,
  auditLogEnabled: true,
  rateLimitConfig: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // General requests
    maxChatRequests: 20, // Chat requests (more expensive)
    maxAuthAttempts: 5, // Auth attempts (bruteforce protection)
  },
};

// ============================================
// Rate Limiting Store (in-memory)
// ============================================
const rateLimitStore = new Map<string, RateLimitEntry>();
const chatRateLimitStore = new Map<string, RateLimitEntry>();
const authRateLimitStore = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries(store: Map<string, RateLimitEntry>) {
  const now = Date.now();
  if (store.size > 1000) {
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now) {
        store.delete(key);
      }
    }
  }
}

// ============================================
// Audit Log Store (in-memory, for demo)
// In production, send to external logging service
// ============================================
const auditLogs: AuditLogEntry[] = [];
const MAX_AUDIT_LOGS = 1000;

export function addAuditLog(entry: AuditLogEntry) {
  auditLogs.unshift(entry);
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.pop();
  }
}

export function getAuditLogs(limit: number = 100): AuditLogEntry[] {
  return auditLogs.slice(0, limit);
}

// ============================================
// Helper Functions
// ============================================
function getClientIP(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "anonymous"
  );
}

function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ============================================
// CORS Middleware (Enhanced)
// ============================================
export function corsMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const origin = c.req.header("origin");
    const allowedOrigin = securityConfig.allowedOrigins.includes(origin || "")
      ? origin
      : securityConfig.allowedOrigins[0];

    // Preflight request handling
    if (c.req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin || "",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400", // 24 hours preflight cache
        },
      });
    }

    // Set CORS headers for actual request
    c.header("Access-Control-Allow-Origin", allowedOrigin || "");
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");

    await next();
  };
}

// ============================================
// Security Headers Middleware (HSTS, CSP, etc.)
// ============================================
export function securityHeadersMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    await next();

    // HSTS - Strict Transport Security
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

    // XSS Protection (legacy but still useful)
    c.header("X-XSS-Protection", "1; mode=block");

    // Prevent MIME type sniffing
    c.header("X-Content-Type-Options", "nosniff");

    // Clickjacking protection
    c.header("X-Frame-Options", "DENY");

    // Referrer Policy
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions Policy (formerly Feature Policy)
    c.header(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()"
    );

    // Content Security Policy
    if (securityConfig.cspEnabled) {
      c.header(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // React needs these
          "style-src 'self' 'unsafe-inline'", // Tailwind uses inline styles
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://loan-guide.pages.dev https://*.supabase.co wss://*.supabase.co",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "upgrade-insecure-requests",
        ].join("; ")
      );
    }
  };
}

// ============================================
// CSRF Protection Middleware
// ============================================
const csrfTokens = new Map<string, { token: string; expires: number }>();

export function csrfMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    // Skip CSRF for safe methods
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(c.req.method)) {
      await next();
      return;
    }

    // Skip CSRF for API endpoints that use Bearer auth (stateless)
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      await next();
      return;
    }

    if (!securityConfig.csrfEnabled) {
      await next();
      return;
    }

    // For session-based requests, validate CSRF token
    const csrfToken = c.req.header("X-CSRF-Token");
    const sessionId = c.req.header("X-Session-ID");

    if (sessionId) {
      const storedToken = csrfTokens.get(sessionId);
      if (!storedToken || storedToken.token !== csrfToken || storedToken.expires < Date.now()) {
        return c.json({ error: "Invalid or expired CSRF token" }, 403);
      }
    }

    await next();
  };
}

// Generate CSRF token for a session
export function generateCSRFTokenForSession(sessionId: string): string {
  const token = generateCSRFToken();
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour
  csrfTokens.set(sessionId, { token, expires });

  // Cleanup old tokens
  if (csrfTokens.size > 10000) {
    const now = Date.now();
    for (const [key, value] of csrfTokens.entries()) {
      if (value.expires < now) {
        csrfTokens.delete(key);
      }
    }
  }

  return token;
}

// ============================================
// Rate Limiting Middleware (Enhanced)
// ============================================
export function rateLimitMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    cleanupExpiredEntries(rateLimitStore);

    const clientIP = getClientIP(c);
    const now = Date.now();
    const { windowMs, maxRequests } = securityConfig.rateLimitConfig;

    let entry = rateLimitStore.get(clientIP);
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(clientIP, entry);
    }
    entry.count++;

    // Set rate limit headers
    c.header("X-RateLimit-Limit", maxRequests.toString());
    c.header("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count).toString());
    c.header("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000).toString());

    if (entry.count > maxRequests) {
      // Log rate limit violation
      if (securityConfig.auditLogEnabled) {
        addAuditLog({
          timestamp: new Date().toISOString(),
          action: "RATE_LIMIT_EXCEEDED",
          ip: clientIP,
          userAgent: c.req.header("User-Agent"),
          path: c.req.path,
          method: c.req.method,
          details: { requestCount: entry.count, limit: maxRequests },
        });
      }
      return c.json({ error: "Too many requests. Please try again later." }, 429);
    }

    await next();
  };
}

// Chat-specific rate limiting (more restrictive)
export function chatRateLimitMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    cleanupExpiredEntries(chatRateLimitStore);

    const clientIP = getClientIP(c);
    const now = Date.now();
    const { windowMs, maxChatRequests } = securityConfig.rateLimitConfig;

    let entry = chatRateLimitStore.get(clientIP);
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      chatRateLimitStore.set(clientIP, entry);
    }
    entry.count++;

    c.header("X-Chat-RateLimit-Limit", maxChatRequests.toString());
    c.header("X-Chat-RateLimit-Remaining", Math.max(0, maxChatRequests - entry.count).toString());

    if (entry.count > maxChatRequests) {
      addAuditLog({
        timestamp: new Date().toISOString(),
        action: "CHAT_RATE_LIMIT_EXCEEDED",
        ip: clientIP,
        userAgent: c.req.header("User-Agent"),
        path: c.req.path,
        method: c.req.method,
        details: { requestCount: entry.count, limit: maxChatRequests },
      });
      return c.json({ error: "Chat rate limit exceeded. Please wait before sending more messages." }, 429);
    }

    await next();
  };
}

// Auth-specific rate limiting (bruteforce protection)
export function authRateLimitMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    cleanupExpiredEntries(authRateLimitStore);

    const clientIP = getClientIP(c);
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes for auth
    const { maxAuthAttempts } = securityConfig.rateLimitConfig;

    let entry = authRateLimitStore.get(clientIP);
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      authRateLimitStore.set(clientIP, entry);
    }
    entry.count++;

    if (entry.count > maxAuthAttempts) {
      addAuditLog({
        timestamp: new Date().toISOString(),
        action: "AUTH_BRUTEFORCE_BLOCKED",
        ip: clientIP,
        userAgent: c.req.header("User-Agent"),
        path: c.req.path,
        method: c.req.method,
        details: { attempts: entry.count, limit: maxAuthAttempts },
      });
      return c.json({
        error: "Too many authentication attempts. Please try again later.",
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      }, 429);
    }

    await next();
  };
}

// Reset auth rate limit on successful login
export function resetAuthRateLimit(clientIP: string) {
  authRateLimitStore.delete(clientIP);
}

// ============================================
// Audit Log Middleware
// ============================================
export function auditLogMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    if (!securityConfig.auditLogEnabled) {
      await next();
      return;
    }

    const startTime = Date.now();
    const clientIP = getClientIP(c);

    await next();

    // Log sensitive operations
    const sensitivePatterns = [
      /^\/api\/admin/,
      /^\/api\/auth/,
      /^\/api\/stats/,
      /^\/api\/reports/,
      /^\/api\/sessions\/[^/]+$/,
    ];

    const shouldLog = sensitivePatterns.some((pattern) => pattern.test(c.req.path));

    if (shouldLog || c.res.status >= 400) {
      addAuditLog({
        timestamp: new Date().toISOString(),
        action: c.req.method === "GET" ? "READ" : "WRITE",
        ip: clientIP,
        userAgent: c.req.header("User-Agent"),
        path: c.req.path,
        method: c.req.method,
        statusCode: c.res.status,
        details: {
          responseTime: Date.now() - startTime,
        },
      });
    }
  };
}

// ============================================
// Error Sanitization (Prevent Info Leakage)
// ============================================
export function sanitizeError(error: unknown, isDev: boolean = false): { message: string; code?: string } {
  if (isDev && error instanceof Error) {
    return {
      message: error.message,
      code: error.name
    };
  }

  // Generic error messages for production
  if (error instanceof Error) {
    const errorMap: Record<string, string> = {
      "INVALID_TOKEN": "Authentication failed",
      "UNAUTHORIZED": "Access denied",
      "NOT_FOUND": "Resource not found",
      "VALIDATION_ERROR": "Invalid request data",
      "RATE_LIMIT": "Too many requests",
    };

    return {
      message: errorMap[error.name] || "An error occurred",
      code: error.name
    };
  }

  return { message: "An error occurred" };
}

// ============================================
// SSRF Protection
// ============================================
const BLOCKED_IP_RANGES = [
  /^10\./,                    // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^192\.168\./,              // 192.168.0.0/16
  /^127\./,                   // Localhost
  /^0\./,                     // 0.0.0.0/8
  /^169\.254\./,              // Link-local
  /^::1$/,                    // IPv6 localhost
  /^fc00:/i,                  // IPv6 private
  /^fe80:/i,                  // IPv6 link-local
];

export function isBlockedURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Block localhost variations
    if (hostname === "localhost" || hostname === "[::1]") {
      return true;
    }

    // Block internal IP ranges
    for (const pattern of BLOCKED_IP_RANGES) {
      if (pattern.test(hostname)) {
        return true;
      }
    }

    // Block metadata endpoints (cloud provider)
    if (hostname === "169.254.169.254" || hostname.endsWith(".internal")) {
      return true;
    }

    return false;
  } catch {
    return true; // Block invalid URLs
  }
}

// ============================================
// Input Validation Utilities
// ============================================
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Control chars
    .trim();
}

export function sanitizeForSQL(input: string): string {
  if (typeof input !== "string") return "";
  // Escape SQL special characters
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, "\\\\")
    .replace(/\x00/g, "")
    .trim();
}

export function validateUUID(input: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input);
}

export function validatePositiveInteger(input: string): boolean {
  return /^\d+$/.test(input) && parseInt(input, 10) > 0;
}

// ============================================
// Cookie Security Helper
// ============================================
export function createSecureCookie(name: string, value: string, options: {
  maxAge?: number;
  path?: string;
  domain?: string;
}): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "HttpOnly",           // Prevent XSS access
    "Secure",             // HTTPS only
    "SameSite=Strict",    // CSRF protection
  ];

  if (options.maxAge) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  return parts.join("; ");
}
