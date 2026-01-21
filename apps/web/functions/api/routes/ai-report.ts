// ============================================
// AI 리포트 API 라우트
// ============================================

/**
 * POST /api/ai-report/generate
 * AI 기반 리포트 생성
 */
async function generateAIReport(c: Context) {
  try {
    const body = await c.req.json<{
      customerInfo: {
        name: string;
        age: number;
        job: string;
        income: number;
        creditScore: number;
        currentLoan?: { amount: number; rate: number; monthlyPayment: number };
        desiredAmount: number;
        purpose: string;
      };
    }>();

    const { customerInfo } = body;
    const supabase = getSupabase(c.env);
    const apiKey = c.env?.GEMINI_API_KEY;

    if (!supabase || !apiKey) {
      return c.json({ error: "Configuration missing" }, 503);
    }

    // Gemini로 상품 추천 요청
    const geminiPrompt = `
당신은 한국 대출 상품 전문 상담사입니다.
다음 고객 정보를 바탕으로 최적의 대출 상품 3-5개를 추천하고 절감 효과를 분석해주세요.

## 고객 정보
- 이름: ${customerInfo.name}
- 나이: ${customerInfo.age}세
- 직업: ${customerInfo.job}
- 월 소득: ${customerInfo.income.toLocaleString()}원
- 신용등급: ${customerInfo.creditScore}
- 희망 대출액: ${customerInfo.desiredAmount.toLocaleString()}원
- 대출 목적: ${customerInfo.purpose}

${
  customerInfo.currentLoan
    ? `## 현재 대출 현황
- 대출액: ${customerInfo.currentLoan.amount.toLocaleString()}원
- 금리: ${customerInfo.currentLoan.rate}%
- 월 상환액: ${customerInfo.currentLoan.monthlyPayment.toLocaleString()}원`
    : ""
}

다음 형식으로 JSON 응답을 생성하세요:
\`\`\`json
{
  "recommendations": [
    {
      "rank": 1,
      "company": "금융사명",
      "product": "상품명",
      "rate": 3.5,
      "maxAmount": 50000000,
      "estimatedMonthlyPayment": 850000,
      "estimatedTotalInterest": 2550000,
      "pros": ["장점1", "장점2"],
      "cons": ["단점1", "단점2"],
      "eligibility_score": 95
    }
  ],
  "analysis": {
    "best_match": "추천 상품",
    "key_insight": "핵심 분석 내용",
    "risk_factors": "주의사항"
  }
}
\`\`\`
`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: geminiPrompt,
      config: { maxOutputTokens: 2000 },
    });

    // 응답 파싱
    let recommendations = [];
    let analysis = {};
    try {
      const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        recommendations = parsed.recommendations;
        analysis = parsed.analysis;
      }
    } catch (e) {
      console.error("JSON parse error:", e);
    }

    // 절감액 계산
    const savingsAnalysis = calculateSavings(
      customerInfo,
      recommendations[0] // 첫 번째 추천 상품 기준
    );

    // Supabase에 저장
    const { data: report, error: saveError } = await supabase
      .from("ai_reports")
      .insert({
        user_id: null, // 비로그인 사용자도 가능
        customer_info: customerInfo,
        recommended_products: recommendations,
        savings_analysis: savingsAnalysis,
        comparison_chart: generateChartData(recommendations),
        is_public: false,
      })
      .select("id")
      .single();

    if (saveError || !report) {
      console.error("Save error:", saveError);
      return c.json({ error: "Failed to save report" }, 500);
    }

    // 토큰 생성 (공유용)
    const shareToken = generateToken();
    await supabase
      .from("ai_reports")
      .update({ share_token: shareToken })
      .eq("id", report.id);

    return c.json({
      reportId: report.id,
      shareToken,
      recommendations,
      analysis,
      savingsAnalysis,
      comparisonChart: generateChartData(recommendations),
    });
  } catch (error) {
    console.error("AI Report error:", error);
    return c.json({ error: "Failed to generate report" }, 500);
  }
}

/**
 * GET /api/ai-report/:reportId
 * 리포트 조회
 */
async function getAIReport(c: Context) {
  const reportId = c.req.param("reportId");
  const supabase = getSupabase(c.env);

  if (!supabase) {
    return c.json({ error: "Database not configured" }, 503);
  }

  const { data: report, error } = await supabase
    .from("ai_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error || !report) {
    return c.json({ error: "Report not found" }, 404);
  }

  // 조회 로그 기록
  await supabase.from("report_views").insert({
    report_id: reportId,
    view_type: "owner", // 실제로는 사용자 확인 후 분류
    user_agent: c.req.header("user-agent"),
    ip_address: c.req.header("cf-connecting-ip") || "unknown",
  });

  // 조회수 증가
  await supabase
    .from("ai_reports")
    .update({ view_count: (report.view_count || 0) + 1 })
    .eq("id", reportId);

  return c.json(report);
}

/**
 * POST /api/ai-report/:reportId/send-email
 * 이메일 전송
 */
async function sendReportEmail(c: Context) {
  try {
    const reportId = c.req.param("reportId");
    const { recipientEmail } = await c.req.json<{ recipientEmail: string }>();

    const supabase = getSupabase(c.env);
    if (!supabase) {
      return c.json({ error: "Database not configured" }, 503);
    }

    // 리포트 조회
    const { data: report } = await supabase
      .from("ai_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    // 공유 기록 저장
    const { data: share } = await supabase
      .from("report_shares")
      .insert({
        report_id: reportId,
        recipient_email: recipientEmail,
        share_method: "email",
      })
      .select("id")
      .single();

    // 이메일 전송 (실제 구현 필요 - SendGrid/Resend)
    // const emailSent = await sendEmail({
    //   to: recipientEmail,
    //   template: 'report',
    //   data: { report, shareUrl: `${process.env.APP_URL}/report/${report.share_token}` }
    // });

    // TODO: 이메일 전송 로직 구현

    return c.json({
      success: true,
      message: "Email sent successfully",
      shareId: share?.id,
    });
  } catch (error) {
    console.error("Email send error:", error);
    return c.json({ error: "Failed to send email" }, 500);
  }
}

/**
 * GET /api/ai-report/:reportId/download
 * PDF/이미지 다운로드
 */
async function downloadReport(c: Context) {
  const reportId = c.req.param("reportId");
  const format = c.req.query("format") || "pdf"; // pdf, png, jpg

  const supabase = getSupabase(c.env);
  if (!supabase) {
    return c.json({ error: "Database not configured" }, 503);
  }

  const { data: report } = await supabase
    .from("ai_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }

  // 파일 URL 반환 (실제로는 Supabase Storage에서 직접 생성)
  const fileUrl =
    format === "pdf"
      ? report.report_pdf_url
      : report.report_image_url || report.report_pdf_url;

  if (!fileUrl) {
    return c.json({ error: "Report file not available" }, 404);
  }

  // 리다이렉트 또는 파일 스트림 반환
  return c.redirect(fileUrl, 302);
}

/**
 * POST /api/ai-report/:reportId/share
 * 공유 링크 생성
 */
async function createShareLink(c: Context) {
  const reportId = c.req.param("reportId");
  const supabase = getSupabase(c.env);

  if (!supabase) {
    return c.json({ error: "Database not configured" }, 503);
  }

  const { data: report } = await supabase
    .from("ai_reports")
    .select("id, share_token")
    .eq("id", reportId)
    .single();

  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }

  const shareUrl = `${c.req.header("origin")}/report/${report.share_token}`;

  return c.json({
    shareUrl,
    token: report.share_token,
    qrCode: generateQRCode(shareUrl), // TODO: QR 코드 생성
  });
}

/**
 * GET /api/ai-report/share/:token
 * 공유 링크로 조회 (로그인 불필요)
 */
async function viewSharedReport(c: Context) {
  const token = c.req.param("token");
  const supabase = getSupabase(c.env);

  if (!supabase) {
    return c.json({ error: "Database not configured" }, 503);
  }

  const { data: report } = await supabase
    .from("ai_reports")
    .select("*")
    .eq("share_token", token)
    .single();

  if (!report) {
    return c.json({ error: "Report not found or expired" }, 404);
  }

  // 조회 로그 기록
  await supabase.from("report_views").insert({
    report_id: report.id,
    view_type: "public",
    user_agent: c.req.header("user-agent"),
    ip_address: c.req.header("cf-connecting-ip") || "unknown",
  });

  return c.json(report);
}

// ============================================
// 헬퍼 함수
// ============================================

function calculateSavings(
  customerInfo: any,
  recommendedProduct: any
): {
  monthly: number;
  yearly: number;
  total: number;
  currentMonthlyPayment: number;
  recommendedMonthlyPayment: number;
} {
  // 구현: 절감액 계산
  // (원리금균등분할 공식 사용)
  return {
    monthly: 0,
    yearly: 0,
    total: 0,
    currentMonthlyPayment: 0,
    recommendedMonthlyPayment: 0,
  };
}

function generateChartData(recommendations: any) {
  // 구현: 차트 데이터 생성
  return {
    labels: recommendations.map((r: any) => r.product),
    datasets: [
      {
        label: "금리",
        data: recommendations.map((r: any) => r.rate),
      },
    ],
  };
}

function generateToken(): string {
  // 구현: 보안 토큰 생성
  return Math.random().toString(36).substring(2, 15);
}

function generateQRCode(url: string): string {
  // 구현: QR 코드 생성 (qrcode 라이브러리)
  return ""; // TODO
}
