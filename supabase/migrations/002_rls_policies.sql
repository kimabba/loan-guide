-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

-- RLS 활성화
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Branches 정책
-- ============================================

-- 자신이 속한 지점만 조회 가능
CREATE POLICY "Users can view their branch"
  ON branches FOR SELECT
  USING (
    id IN (
      SELECT branch_id FROM user_profiles WHERE id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

-- 지점 소유자만 수정 가능
CREATE POLICY "Branch owners can update"
  ON branches FOR UPDATE
  USING (owner_id = auth.uid());

-- 인증된 사용자는 지점 생성 가능
CREATE POLICY "Authenticated users can create branches"
  ON branches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- User Profiles 정책
-- ============================================

-- 같은 지점 멤버 프로필 조회 가능
CREATE POLICY "Users can view profiles in same branch"
  ON user_profiles FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_profiles WHERE id = auth.uid()
    )
    OR id = auth.uid()
  );

-- 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- 자신의 프로필 생성
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================
-- Loan Guides 정책 (공개)
-- ============================================

-- 인증된 사용자는 모든 가이드 조회 가능
CREATE POLICY "Authenticated users can view guides"
  ON loan_guides FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- Chat Sessions 정책
-- ============================================

-- 자신의 세션만 조회
CREATE POLICY "Users can view own sessions"
  ON chat_sessions FOR SELECT
  USING (user_id = auth.uid());

-- 자신의 세션 생성
CREATE POLICY "Users can create own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 자신의 세션 삭제
CREATE POLICY "Users can delete own sessions"
  ON chat_sessions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- Chat Messages 정책
-- ============================================

-- 자신의 세션 메시지만 조회
CREATE POLICY "Users can view messages in own sessions"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- 자신의 세션에 메시지 추가
CREATE POLICY "Users can insert messages in own sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Announcements 정책 (공개 읽기)
-- ============================================

-- 모든 인증 사용자 공지 조회 가능
CREATE POLICY "Authenticated users can view announcements"
  ON announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- Bug Reports 정책
-- ============================================

-- 자신의 리포트만 조회
CREATE POLICY "Users can view own reports"
  ON bug_reports FOR SELECT
  USING (user_id = auth.uid());

-- 인증된 사용자는 리포트 생성 가능
CREATE POLICY "Authenticated users can create reports"
  ON bug_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Branch Invites 정책
-- ============================================

-- 지점 관리자는 초대 조회 가능
CREATE POLICY "Branch admins can view invites"
  ON branch_invites FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 지점 관리자는 초대 생성 가능
CREATE POLICY "Branch admins can create invites"
  ON branch_invites FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 지점 관리자는 초대 삭제 가능
CREATE POLICY "Branch admins can delete invites"
  ON branch_invites FOR DELETE
  USING (
    branch_id IN (
      SELECT branch_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
