import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";

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

const app = new Hono();

// Middleware
app.use("*", logger());

// Security headers
app.use("*", securityHeaders());

// Request size limit (10KB for API)
app.use("/api/*", requestSizeLimit(10 * 1024));

// Rate limiting
app.use("/api/*", rateLimit({
  windowMs: 60 * 1000,
  max: 100,
}));

app.use("/api/chat", rateLimit({
  windowMs: 60 * 1000,
  max: 30,
}));

app.use("/api/reports", rateLimit({
  windowMs: 60 * 1000,
  max: 10,
}));

// CORS
app.use("/api/*", cors({ origin: "*", credentials: true }));

// API Routes
app.route("/api", healthRoutes);
app.route("/api/guides", guidesRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/reports", reportsRoutes);
app.route("/api/announcements", announcementsRoutes);

// Static files (React build)
app.use("/*", serveStatic({ root: "./public" }));

// SPA fallback
app.get("*", serveStatic({ root: "./public", path: "index.html" }));

// Start server
const port = parseInt(process.env.PORT || "8080");
console.log(`Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
