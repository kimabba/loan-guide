import { Hono } from "hono";
import type { Env } from "../index";

export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get("/", (c) => {
  return c.json({
    name: "Loan Guide Chatbot API",
    version: "0.1.0",
    status: "ok",
  });
});

healthRoutes.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});
