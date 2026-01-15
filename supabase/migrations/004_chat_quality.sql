-- ============================================
-- 채팅 품질 분석 및 피드백 시스템 스키마
-- ============================================

-- 1. 채팅 품질 로그 테이블
CREATE TABLE IF NOT EXISTS chat_quality_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,

  -- 분류 결과
  quality_score DECIMAL(3,2), -- 0.00 ~ 1.00
  issue_type VARCHAR(50), -- 'off_topic', 'no_answer', 'wrong_answer', 'low_confidence', 'ok'

  -- Gemini 메타데이터
  grounding_chunks_count INTEGER DEFAULT 0,
  has_guide_reference BOOLEAN DEFAULT FALSE,

  -- 사용자 피드백
  user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', 'wrong', NULL

  -- 관리자 리뷰
  admin_review VARCHAR(20), -- 'approved', 'needs_fix', 'flagged', NULL
  admin_notes TEXT,

  -- 버그 리포트 연결
  bug_report_id UUID REFERENCES bug_reports(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. System Instruction 버전 관리 테이블
CREATE TABLE IF NOT EXISTS system_instruction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  change_reason TEXT,
  related_issues UUID[], -- chat_quality_logs ids
  performance_before JSONB, -- { "avg_score": 0.7, "issue_count": 10 }
  performance_after JSONB,
  active BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chat_quality_logs_session ON chat_quality_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_quality_logs_message ON chat_quality_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_quality_logs_issue_type ON chat_quality_logs(issue_type);
CREATE INDEX IF NOT EXISTS idx_chat_quality_logs_score ON chat_quality_logs(quality_score);
CREATE INDEX IF NOT EXISTS idx_chat_quality_logs_created ON chat_quality_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_quality_logs_bug_report ON chat_quality_logs(bug_report_id);
CREATE INDEX IF NOT EXISTS idx_chat_quality_logs_feedback ON chat_quality_logs(user_feedback) WHERE user_feedback IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_system_instruction_logs_version ON system_instruction_logs(version DESC);
CREATE INDEX IF NOT EXISTS idx_system_instruction_logs_active ON system_instruction_logs(active) WHERE active = TRUE;

-- ============================================
-- 트리거
-- ============================================
CREATE TRIGGER tr_chat_quality_logs_updated_at
  BEFORE UPDATE ON chat_quality_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS 정책 (Row Level Security)
-- ============================================

-- chat_quality_logs: 인증된 사용자만 자신의 세션 품질 로그 조회 가능
ALTER TABLE chat_quality_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quality logs for their sessions" ON chat_quality_logs
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update feedback on their quality logs" ON chat_quality_logs
  FOR UPDATE USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- system_instruction_logs: 관리자만 조회/수정 가능
ALTER TABLE system_instruction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system instructions" ON system_instruction_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 뷰: 문제 채팅 요약
-- ============================================
CREATE OR REPLACE VIEW problem_chats_summary AS
SELECT
  cql.id,
  cql.session_id,
  cql.quality_score,
  cql.issue_type,
  cql.user_feedback,
  cql.admin_review,
  cql.bug_report_id,
  cql.created_at,
  cm.content AS user_message,
  (SELECT content FROM chat_messages WHERE session_id = cql.session_id AND role = 'assistant' ORDER BY created_at DESC LIMIT 1) AS ai_response,
  br.title AS bug_report_title,
  br.status AS bug_report_status
FROM chat_quality_logs cql
LEFT JOIN chat_messages cm ON cql.message_id = cm.id
LEFT JOIN bug_reports br ON cql.bug_report_id = br.id
WHERE cql.issue_type != 'ok' OR cql.quality_score < 0.7
ORDER BY cql.created_at DESC;

-- ============================================
-- 함수: 일별 품질 통계
-- ============================================
CREATE OR REPLACE FUNCTION get_daily_quality_stats(days_count INTEGER DEFAULT 7)
RETURNS TABLE (
  stat_date DATE,
  total_chats BIGINT,
  ok_count BIGINT,
  off_topic_count BIGINT,
  no_answer_count BIGINT,
  low_confidence_count BIGINT,
  avg_quality_score DECIMAL(3,2),
  feedback_helpful BIGINT,
  feedback_not_helpful BIGINT,
  feedback_wrong BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(cql.created_at) as stat_date,
    COUNT(*) as total_chats,
    COUNT(*) FILTER (WHERE cql.issue_type = 'ok') as ok_count,
    COUNT(*) FILTER (WHERE cql.issue_type = 'off_topic') as off_topic_count,
    COUNT(*) FILTER (WHERE cql.issue_type = 'no_answer') as no_answer_count,
    COUNT(*) FILTER (WHERE cql.issue_type = 'low_confidence') as low_confidence_count,
    ROUND(AVG(cql.quality_score)::DECIMAL, 2) as avg_quality_score,
    COUNT(*) FILTER (WHERE cql.user_feedback = 'helpful') as feedback_helpful,
    COUNT(*) FILTER (WHERE cql.user_feedback = 'not_helpful') as feedback_not_helpful,
    COUNT(*) FILTER (WHERE cql.user_feedback = 'wrong') as feedback_wrong
  FROM chat_quality_logs cql
  WHERE cql.created_at >= NOW() - (days_count || ' days')::INTERVAL
  GROUP BY DATE(cql.created_at)
  ORDER BY stat_date DESC;
END;
$$ LANGUAGE plpgsql;
