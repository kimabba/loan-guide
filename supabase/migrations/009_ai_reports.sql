-- ============================================
-- AI 리포트 시스템 스키마
-- ============================================

-- 1. AI 리포트 테이블
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 고객 정보 (암호화됨)
  customer_info JSONB NOT NULL, -- { name, age, job, income, creditScore, currentLoan?, desiredAmount, purpose }
  
  -- 분석 결과
  recommended_products JSONB NOT NULL, -- [{ id, company, product, rate, limit, estimatedMonthlyPayment, estimatedTotalInterest }]
  savings_analysis JSONB NOT NULL, -- { monthly, yearly, total, currentMonthlyPayment, recommendedMonthlyPayment }
  comparison_chart JSONB, -- { datasets: [...], labels: [...] }
  
  -- 리포트 파일 URL
  report_pdf_url TEXT,
  report_image_url TEXT,
  
  -- 공유 & 접근 제어
  share_token VARCHAR(100) UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '3 months'
);

-- 2. 리포트 공유 기록 테이블
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES ai_reports(id) ON DELETE CASCADE NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  share_method VARCHAR(20) NOT NULL, -- 'email', 'link', 'direct'
  
  -- 추적 정보
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  
  -- 메타데이터
  metadata JSONB, -- { ip, userAgent, browser }
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 리포트 조회 로그 테이블
CREATE TABLE IF NOT EXISTS report_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES ai_reports(id) ON DELETE CASCADE NOT NULL,
  share_id UUID REFERENCES report_shares(id) ON DELETE SET NULL,
  
  -- 조회자 정보
  viewed_by_email VARCHAR(255),
  view_type VARCHAR(20) NOT NULL, -- 'owner', 'shared', 'public'
  
  -- 메타데이터
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AI 리포트 추천 상품 캐시 (성능 최적화)
CREATE TABLE IF NOT EXISTS report_recommendation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 입력 파라미터 (해시)
  input_hash VARCHAR(64) UNIQUE NOT NULL,
  
  -- 캐시된 결과
  recommended_products JSONB NOT NULL,
  savings_analysis JSONB NOT NULL,
  
  -- 캐시 유효성
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  hit_count INTEGER DEFAULT 0
);

-- ============================================
-- 인덱스
-- ============================================

-- ai_reports 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_id ON ai_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_share_token ON ai_reports(share_token);
CREATE INDEX IF NOT EXISTS idx_ai_reports_created_at ON ai_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_is_public ON ai_reports(is_public);
CREATE INDEX IF NOT EXISTS idx_ai_reports_expires_at ON ai_reports(expires_at);

-- report_shares 인덱스
CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_recipient_email ON report_shares(recipient_email);
CREATE INDEX IF NOT EXISTS idx_report_shares_sent_at ON report_shares(sent_at DESC);

-- report_views 인덱스
CREATE INDEX IF NOT EXISTS idx_report_views_report_id ON report_views(report_id);
CREATE INDEX IF NOT EXISTS idx_report_views_share_id ON report_views(share_id);
CREATE INDEX IF NOT EXISTS idx_report_views_viewed_at ON report_views(viewed_at DESC);

-- cache 인덱스
CREATE INDEX IF NOT EXISTS idx_report_recommendation_cache_expires ON report_recommendation_cache(expires_at);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- ai_reports: 소유자만 조회 (share_token으로 공개 가능)
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_reports_owner_access" ON ai_reports
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "ai_reports_public_view" ON ai_reports
  FOR SELECT USING (is_public OR user_id = auth.uid());

-- report_shares: 소유자만 관리
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_shares_owner_access" ON report_shares
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_reports 
      WHERE ai_reports.id = report_shares.report_id 
      AND ai_reports.user_id = auth.uid()
    )
  );

-- report_views: 읽기만 허용 (백엔드 자동 기록)
ALTER TABLE report_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_views_owner_access" ON report_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_reports 
      WHERE ai_reports.id = report_views.report_id 
      AND ai_reports.user_id = auth.uid()
    )
  );

-- service_role은 모든 작업 가능
CREATE POLICY "report_views_service_insert" ON report_views
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 자동 정리 함수 (3개월 이상 된 리포트 삭제)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_ai_reports()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_reports 
  WHERE expires_at < NOW() AND is_public = FALSE;
  
  -- 캐시도 정리
  DELETE FROM report_recommendation_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 매일 자정에 실행 (수동 설정 필요: pg_cron 또는 외부 스케줄러)
-- SELECT cron.schedule('cleanup_ai_reports', '0 0 * * *', 'SELECT cleanup_expired_ai_reports()');

-- ============================================
-- 통계 뷰
-- ============================================

-- 리포트 성과 분석 뷰
CREATE OR REPLACE VIEW report_performance_stats AS
SELECT
  r.id,
  r.user_id,
  r.created_at,
  COUNT(DISTINCT rs.id) as share_count,
  COUNT(DISTINCT rv.id) as total_view_count,
  MAX(rv.viewed_at) as last_viewed_at,
  r.view_count as owner_views,
  (COUNT(DISTINCT rv.id) > 0) as has_shared_views
FROM ai_reports r
LEFT JOIN report_shares rs ON r.id = rs.report_id
LEFT JOIN report_views rv ON r.id = rv.report_id
GROUP BY r.id, r.user_id, r.created_at, r.view_count;

-- 추천 상품 통계 뷰
CREATE OR REPLACE VIEW top_recommended_products AS
SELECT
  jsonb_agg(product) as products,
  COUNT(*) as recommendation_count
FROM (
  SELECT jsonb_array_elements(recommended_products) as product
  FROM ai_reports
  WHERE created_at >= NOW() - INTERVAL '30 days'
) t
GROUP BY (product->>'id')
ORDER BY recommendation_count DESC
LIMIT 20;

-- ============================================
-- 주석
-- ============================================

COMMENT ON TABLE ai_reports IS '고객 맞춤 대출 리포트';
COMMENT ON TABLE report_shares IS '리포트 공유 기록';
COMMENT ON TABLE report_views IS '리포트 조회 로그';
COMMENT ON TABLE report_recommendation_cache IS '추천 상품 캐시 (성능 최적화)';

COMMENT ON COLUMN ai_reports.share_token IS '비로그인 공유용 토큰';
COMMENT ON COLUMN ai_reports.is_public IS '완전 공개 여부';
COMMENT ON COLUMN ai_reports.expires_at IS '자동 삭제 날짜';

COMMENT ON COLUMN report_shares.open_count IS '해당 공유 링크로 몇 번 열렸는지';
COMMENT ON COLUMN report_views.view_type IS 'owner: 본인, shared: 공유받음, public: 공개 링크';
