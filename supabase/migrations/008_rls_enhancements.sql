-- ============================================
-- RLS 정책 강화 마이그레이션
-- 서비스 역할 정책 보안 개선
-- ============================================

-- ============================================
-- 1. 서비스 정책 보안 강화
-- anon key로 삽입 방지, service_role만 허용
-- ============================================

-- api_usage_logs: 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "Service can insert api_usage_logs" ON api_usage_logs;
CREATE POLICY "Service role can insert api_usage_logs"
  ON api_usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- token_usage: 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "Service can insert token_usage" ON token_usage;
CREATE POLICY "Service role can insert token_usage"
  ON token_usage FOR INSERT
  TO service_role
  WITH CHECK (true);

-- branch_daily_stats: 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "Service can insert branch_daily_stats" ON branch_daily_stats;
DROP POLICY IF EXISTS "Service can update branch_daily_stats" ON branch_daily_stats;
CREATE POLICY "Service role can insert branch_daily_stats"
  ON branch_daily_stats FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can update branch_daily_stats"
  ON branch_daily_stats FOR UPDATE
  TO service_role
  USING (true);

-- guide_view_logs: 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "Service can insert guide_view_logs" ON guide_view_logs;
CREATE POLICY "Service role can insert guide_view_logs"
  ON guide_view_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- search_logs: 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "Service can insert search_logs" ON search_logs;
CREATE POLICY "Service role can insert search_logs"
  ON search_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- branch_monthly_usage: 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "Service can insert branch_monthly_usage" ON branch_monthly_usage;
DROP POLICY IF EXISTS "Service can update branch_monthly_usage" ON branch_monthly_usage;
CREATE POLICY "Service role can insert branch_monthly_usage"
  ON branch_monthly_usage FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can update branch_monthly_usage"
  ON branch_monthly_usage FOR UPDATE
  TO service_role
  USING (true);

-- ============================================
-- 2. chat_quality_logs 서비스 역할 정책 추가
-- API에서 품질 로그 삽입 가능하도록
-- ============================================

-- 서비스 역할 삽입 정책
CREATE POLICY "Service role can insert chat_quality_logs"
  ON chat_quality_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 서비스 역할 업데이트 정책 (피드백 처리용)
CREATE POLICY "Service role can update chat_quality_logs"
  ON chat_quality_logs FOR UPDATE
  TO service_role
  USING (true);

-- ============================================
-- 3. 관리자 조회 정책 추가
-- ============================================

-- chat_quality_logs: 관리자 전체 조회
CREATE POLICY "Admins can view all chat_quality_logs"
  ON chat_quality_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- chat_sessions: 관리자 전체 조회 (채팅 히스토리 관리용)
CREATE POLICY "Admins can view all chat_sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- chat_messages: 관리자 전체 조회
CREATE POLICY "Admins can view all chat_messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- bug_reports: 관리자 전체 조회
CREATE POLICY "Admins can view all bug_reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- bug_reports: 관리자 상태 업데이트
CREATE POLICY "Admins can update bug_reports"
  ON bug_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- announcements: 관리자 CRUD
CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 4. loan_guides 공개 읽기 정책
-- 비로그인 사용자도 가이드 조회 가능하도록
-- ============================================

-- 기존 정책 확인 후 공개 읽기 정책 추가
DROP POLICY IF EXISTS "Authenticated users can view guides" ON loan_guides;
CREATE POLICY "Anyone can view loan_guides"
  ON loan_guides FOR SELECT
  USING (true);

-- ============================================
-- 5. announcements 공개 읽기 정책
-- 비로그인 사용자도 공지사항 조회 가능하도록
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view announcements" ON announcements;
CREATE POLICY "Anyone can view announcements"
  ON announcements FOR SELECT
  USING (true);
