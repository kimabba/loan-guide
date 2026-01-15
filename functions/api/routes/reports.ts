import { Hono } from "hono";
import type { Env } from "../index";
import {
  validateMessage,
  validateEmail,
  validateReportType,
  sanitizeString,
} from "../middleware/security";

export const reportsRoutes = new Hono<{ Bindings: Env }>();

interface Screenshot {
  name: string;
  data: string; // base64
}

interface BugReport {
  id: string;
  type: "bug" | "guide_fix" | "feature" | "other";
  title: string;
  description: string;
  email?: string;
  guideId?: string;
  screenshots?: Screenshot[];
  createdAt: string;
}

// In-memory storage (replace with Supabase later)
const reports: BugReport[] = [];

// Submit bug report
reportsRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json();

    // 입력 검증
    const typeValidation = validateReportType(body.type || "bug");
    if (!typeValidation.valid) {
      return c.json({ error: typeValidation.error }, 400);
    }

    const titleValidation = validateMessage(body.title);
    if (!titleValidation.valid) {
      return c.json({ error: `제목: ${titleValidation.error}` }, 400);
    }

    const descValidation = validateMessage(body.description);
    if (!descValidation.valid) {
      return c.json({ error: `내용: ${descValidation.error}` }, 400);
    }

    const emailValidation = validateEmail(body.email);
    if (!emailValidation.valid) {
      return c.json({ error: emailValidation.error }, 400);
    }

    // Validate screenshots (max 3, each max 5MB)
    let screenshots: Screenshot[] | undefined;
    if (body.screenshots && Array.isArray(body.screenshots)) {
      screenshots = body.screenshots.slice(0, 3).map((s: Screenshot) => ({
        name: sanitizeString(s.name || "screenshot").slice(0, 100),
        data: typeof s.data === "string" ? s.data.slice(0, 7 * 1024 * 1024) : "", // ~5MB base64
      }));
    }

    const report: BugReport = {
      id: crypto.randomUUID(),
      type: typeValidation.sanitized as BugReport["type"],
      title: titleValidation.sanitized!,
      description: descValidation.sanitized!,
      email: emailValidation.sanitized,
      guideId: body.guideId ? sanitizeString(body.guideId).slice(0, 50) : undefined,
      screenshots,
      createdAt: new Date().toISOString(),
    };

    reports.push(report);

    // Log for now (replace with email sending later)
    console.log("📝 새로운 버그 리포트:");
    console.log(`   제목: ${report.title}`);
    console.log(`   유형: ${report.type}`);
    console.log(`   내용: ${report.description.slice(0, 100)}...`);
    if (report.email) console.log(`   이메일: ${report.email}`);
    if (report.guideId) console.log(`   가이드: ${report.guideId}`);
    if (report.screenshots?.length) console.log(`   스크린샷: ${report.screenshots.length}장`);

    return c.json({
      success: true,
      message: "리포트가 제출되었습니다. 검토 후 반영하겠습니다.",
      reportId: report.id,
    });
  } catch (error) {
    console.error("Report submission error:", error);
    return c.json({ error: "리포트 제출에 실패했습니다" }, 500);
  }
});

// Get all reports (admin only - for testing)
reportsRoutes.get("/", (c) => {
  return c.json({
    total: reports.length,
    reports: reports.slice(-20).reverse(),
  });
});
