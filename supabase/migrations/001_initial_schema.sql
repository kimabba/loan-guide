-- ============================================
-- 대출 가이드 챗봇 SaaS - 초기 스키마
-- ============================================

-- 1. 지점 (Branches) 테이블
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE, -- 지점 코드 (초대용)
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_users INTEGER DEFAULT 5, -- 최대 사용자 수 (요금제)
  plan VARCHAR(20) DEFAULT 'free', -- free, basic, pro
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  display_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'member', -- admin, member
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 대출 가이드 테이블
CREATE TABLE IF NOT EXISTS loan_guides (
  id SERIAL PRIMARY KEY,
  item_cd VARCHAR(20) UNIQUE NOT NULL,
  pfi_name VARCHAR(100), -- 금융사명
  depth1 VARCHAR(50), -- 카테고리1
  depth2 VARCHAR(100), -- 상품유형
  fi_memo TEXT, -- 메모
  depth3 JSONB, -- 상세 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 채팅 세션 테이블
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  title VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  guide_ids TEXT[], -- 관련 가이드 ID 배열
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 공지사항 테이블
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) DEFAULT 'notice', -- update, notice, maintenance, new_feature
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  important BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 버그 리포트 테이블
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  type VARCHAR(20) DEFAULT 'bug', -- bug, guide_fix, feature, other
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  email VARCHAR(255),
  guide_id VARCHAR(20),
  status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 지점 초대 테이블
CREATE TABLE IF NOT EXISTS branch_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  token VARCHAR(100) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_branch ON user_profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_loan_guides_pfi_name ON loan_guides(pfi_name);
CREATE INDEX IF NOT EXISTS idx_loan_guides_depth1 ON loan_guides(depth1);
CREATE INDEX IF NOT EXISTS idx_loan_guides_depth2 ON loan_guides(depth2);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_branch ON chat_sessions(branch_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_branch_invites_token ON branch_invites(token);
CREATE INDEX IF NOT EXISTS idx_branch_invites_email ON branch_invites(email);

-- ============================================
-- Updated_at 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_loan_guides_updated_at
  BEFORE UPDATE ON loan_guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_bug_reports_updated_at
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
