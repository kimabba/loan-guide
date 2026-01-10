import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

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
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger());

// Security headers
app.use("*", securityHeaders());

// Request size limit (10KB)
app.use("*", requestSizeLimit(10 * 1024));

// Rate limiting
app.use("*", rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100, // 분당 100회
}));

// Stricter rate limit for POST endpoints
app.use("/chat", rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 분당 30회
}));
app.use("/reports", rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 분당 10회
}));

// CORS
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://loan-guide.pages.dev"],
    credentials: true,
  })
);

// Routes
app.route("/", healthRoutes);
app.route("/guides", guidesRoutes);
app.route("/chat", chatRoutes);
app.route("/reports", reportsRoutes);
app.route("/announcements", announcementsRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
