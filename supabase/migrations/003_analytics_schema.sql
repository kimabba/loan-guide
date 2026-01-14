-- ============================================
-- 통계 및 분석 테이블 스키마
-- ============================================

-- 1. API 사용량 로그 테이블
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint VARCHAR(100) NOT NULL, -- /api/chat, /api/guides, etc.
  method VARCHAR(10) NOT NULL, -- GET, POST, etc.
  status_code INTEGER,
  response_time_ms INTEGER, -- 응답 시간
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 토큰 사용량 테이블
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  request_type VARCHAR(50) NOT NULL, -- chat, file_search, embedding
  model VARCHAR(100), -- gemini-2.5-flash, etc.
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_usd DECIMAL(10, 6) DEFAULT 0, -- 비용 (USD)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 일별 지점 통계 테이블 (집계용)
CREATE TABLE IF NOT EXISTS branch_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  -- 사용량 메트릭
  chat_count INTEGER DEFAULT 0, -- 채팅 횟수
  message_count INTEGER DEFAULT 0, -- 메시지 수
  api_call_count INTEGER DEFAULT 0, -- API 호출 수
  -- 토큰 메트릭
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0,
  -- 사용자 메트릭
  active_users INTEGER DEFAULT 0, -- 활성 사용자 수
  new_sessions INTEGER DEFAULT 0, -- 새 세션 수
  -- 제약조건
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, stat_date)
);

-- 4. 상품 조회 로그 테이블
CREATE TABLE IF NOT EXISTS guide_view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guide_id VARCHAR(20) NOT NULL, -- loan_guides.item_cd
  view_type VARCHAR(20) DEFAULT 'detail', -- list, detail, compare, chat_mention
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 검색 로그 테이블
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  search_type VARCHAR(20) DEFAULT 'keyword', -- keyword, ai, filter
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 플랜 토큰 한도 테이블
CREATE TABLE IF NOT EXISTS plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name VARCHAR(20) UNIQUE NOT NULL, -- free, basic, pro
  monthly_token_limit INTEGER NOT NULL, -- 월별 토큰 한도
  monthly_chat_limit INTEGER, -- 월별 채팅 한도 (NULL = 무제한)
  max_users INTEGER NOT NULL, -- 최대 사용자 수
  price_krw INTEGER DEFAULT 0, -- 월 가격 (KRW)
  features JSONB, -- 추가 기능 플래그
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 월별 지점 사용량 요약 테이블
CREATE TABLE IF NOT EXISTS branch_monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL, -- YYYY-MM 형식
  -- 토큰 사용량
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0,
  -- 활동 메트릭
  total_chats INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,
  -- 사용자 메트릭
  unique_users INTEGER DEFAULT 0,
  peak_daily_users INTEGER DEFAULT 0,
  -- 한도 대비
  token_usage_percent DECIMAL(5, 2) DEFAULT 0, -- 한도 대비 사용률
  -- 제약조건
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, year_month)
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_branch ON api_usage_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);

CREATE INDEX IF NOT EXISTS idx_token_usage_branch ON token_usage(branch_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_user ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created ON token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_type ON token_usage(request_type);

CREATE INDEX IF NOT EXISTS idx_branch_daily_stats_branch ON branch_daily_stats(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_daily_stats_date ON branch_daily_stats(stat_date DESC);

CREATE INDEX IF NOT EXISTS idx_guide_view_logs_branch ON guide_view_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_guide_view_logs_guide ON guide_view_logs(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_view_logs_created ON guide_view_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_logs_branch ON search_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created ON search_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_branch_monthly_usage_branch ON branch_monthly_usage(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_monthly_usage_month ON branch_monthly_usage(year_month DESC);

-- ============================================
-- 트리거
-- ============================================
CREATE TRIGGER tr_branch_daily_stats_updated_at
  BEFORE UPDATE ON branch_daily_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_branch_monthly_usage_updated_at
  BEFORE UPDATE ON branch_monthly_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 기본 플랜 데이터 삽입
-- ============================================
INSERT INTO plan_limits (plan_name, monthly_token_limit, monthly_chat_limit, max_users, price_krw, features)
VALUES
  ('free', 50000, 100, 5, 0, '{"basic_chat": true, "export": false, "api_access": false}'::jsonb),
  ('basic', 500000, 1000, 20, 49000, '{"basic_chat": true, "export": true, "api_access": false}'::jsonb),
  ('pro', 5000000, NULL, 100, 199000, '{"basic_chat": true, "export": true, "api_access": true, "priority_support": true}'::jsonb)
ON CONFLICT (plan_name) DO NOTHING;
