-- ============================================
-- 통계 테이블 RLS 정책
-- ============================================

-- RLS 활성화
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_view_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_monthly_usage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- API Usage Logs 정책
-- ============================================

-- 지점 관리자만 조회 가능
CREATE POLICY "Branch admins can view api_usage_logs"
  ON api_usage_logs FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 시스템에서 삽입 (서비스 롤)
CREATE POLICY "Service can insert api_usage_logs"
  ON api_usage_logs FOR INSERT
  WITH CHECK (true); -- service_role key로만 삽입

-- ============================================
-- Token Usage 정책
-- ============================================

-- 자신의 토큰 사용량 또는 지점 관리자는 전체 조회
CREATE POLICY "Users can view own token_usage or admins view branch"
  ON token_usage FOR SELECT
  USING (
    user_id = auth.uid()
    OR branch_id IN (
      SELECT branch_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 시스템에서 삽입
CREATE POLICY "Service can insert token_usage"
  ON token_usage FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Branch Daily Stats 정책
-- ============================================

-- 지점 관리자만 조회
CREATE POLICY "Branch admins can view branch_daily_stats"
  ON branch_daily_stats FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 시스템에서 삽입/수정
CREATE POLICY "Service can insert branch_daily_stats"
  ON branch_daily_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update branch_daily_stats"
  ON branch_daily_stats FOR UPDATE
  USING (true);

-- ============================================
-- Guide View Logs 정책
-- ============================================

-- 지점 관리자만 조회
CREATE POLICY "Branch admins can view guide_view_logs"
  ON guide_view_logs FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 시스템에서 삽입
CREATE POLICY "Service can insert guide_view_logs"
  ON guide_view_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Search Logs 정책
-- ============================================

-- 지점 관리자만 조회
CREATE POLICY "Branch admins can view search_logs"
  ON search_logs FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 시스템에서 삽입
CREATE POLICY "Service can insert search_logs"
  ON search_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Plan Limits 정책 (공개 읽기)
-- ============================================

-- 모든 인증 사용자 조회 가능
CREATE POLICY "Authenticated users can view plan_limits"
  ON plan_limits FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- Branch Monthly Usage 정책
-- ============================================

-- 지점 관리자만 조회
CREATE POLICY "Branch admins can view branch_monthly_usage"
  ON branch_monthly_usage FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 시스템에서 삽입/수정
CREATE POLICY "Service can insert branch_monthly_usage"
  ON branch_monthly_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update branch_monthly_usage"
  ON branch_monthly_usage FOR UPDATE
  USING (true);
