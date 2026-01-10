import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/cloudflare-workers";

// Security
import {
  rateLimit,
  securityHeaders,
  requestSizeLimit,
} from "./middleware/security";

// Routes
import { healthRoutes } from "./routes/health";
import { guidesRoutes } from "./routes/guides";
import { chatRoutes } from "./routes/chat";
import { reportsRoutes } from "./routes/reports";
import { announcementsRoutes } from "./routes/announcements";

// Types
export type Env = {
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GEMINI_API_KEY?: string;
  FILE_SEARCH_STORE_NAME?: string;
  ASSETS: Fetcher; // Static assets binding
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger());

// Security headers
app.use("*", securityHeaders());

// Request size limit (10KB for API)
app.use("/api/*", requestSizeLimit(10 * 1024));

// Rate limiting
app.use("/api/*", rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100, // 분당 100회
}));

// Stricter rate limit for POST endpoints
app.use("/api/chat", rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 분당 30회
}));
app.use("/api/reports", rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 분당 10회
}));

// CORS for API routes
app.use(
  "/api/*",
  cors({
    origin: "*", // Same origin이므로 모든 origin 허용
    credentials: true,
  })
);

// API Routes (prefix with /api)
app.route("/api", healthRoutes);
app.route("/api/guides", guidesRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/reports", reportsRoutes);
app.route("/api/announcements", announcementsRoutes);

// Static assets - React SPA
// Serve static files from public directory
app.get("/assets/*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

// SPA fallback - serve index.html for all other routes
app.get("*", async (c) => {
  // Try to serve the exact file first
  const response = await c.env.ASSETS.fetch(c.req.raw);
  if (response.status !== 404) {
    return response;
  }
  // Fallback to index.html for SPA routing
  const url = new URL(c.req.url);
  url.pathname = "/index.html";
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

// API 404 handler
app.notFound((c) => {
  if (c.req.path.startsWith("/api")) {
    return c.json({ error: "Not Found" }, 404);
  }
  // For non-API routes, let static handler deal with it
  return c.env.ASSETS.fetch(c.req.raw);
});

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
