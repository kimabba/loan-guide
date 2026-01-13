import { Hono } from "hono";
import type { Env } from "../index";
import { sanitizeString } from "../middleware/security";

// 임시: 로컬 JSON 데이터 (추후 Supabase로 교체)
import loanGuides from "../../../../loan_guides.json";

export const guidesRoutes = new Hono<{ Bindings: Env }>();

// 전체 가이드 목록 (요약)
guidesRoutes.get("/", (c) => {
  const guides = (loanGuides as any[]).map((g) => ({
    item_cd: g.item_cd,
    company: g.pfi_name,
    category: g.depth1,
    product_type: g.depth2,
    memo: g.fi_memo?.slice(0, 100) + "...",
  }));

  return c.json({
    total: guides.length,
    guides,
  });
});

// 특정 가이드 상세
guidesRoutes.get("/:id", (c) => {
  const rawId = c.req.param("id");

  // 입력 검증 (item_cd는 숫자)
  if (!rawId || !/^\d+$/.test(rawId) || rawId.length > 20) {
    return c.json({ error: "Invalid guide ID" }, 400);
  }

  const id = rawId;
  const guide = (loanGuides as any[]).find((g) => g.item_cd === id);

  if (!guide) {
    return c.json({ error: "Guide not found" }, 404);
  }

  return c.json(guide);
});

// 가이드 검색
guidesRoutes.get("/search/:query", (c) => {
  const rawQuery = c.req.param("query");

  // 입력 검증
  if (!rawQuery || rawQuery.length > 100) {
    return c.json({ error: "Invalid search query" }, 400);
  }

  const query = sanitizeString(rawQuery).toLowerCase();

  const results = (loanGuides as any[])
    .filter((g) => {
      const searchText = [
        g.pfi_name,
        g.depth1,
        g.depth2,
        g.fi_memo,
        JSON.stringify(g.depth3),
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(query);
    })
    .slice(0, 10)
    .map((g) => ({
      item_cd: g.item_cd,
      company: g.pfi_name,
      category: g.depth1,
      product_type: g.depth2,
      memo: g.fi_memo?.slice(0, 150),
    }));

  return c.json({
    query,
    total: results.length,
    results,
  });
});
