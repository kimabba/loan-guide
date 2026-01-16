-- ============================================
-- 동의어 매핑 테이블
-- 검색 시 동의어/유사어 확장을 위한 매핑 관리
-- ============================================

-- 동의어 매핑 테이블 생성
CREATE TABLE IF NOT EXISTS synonym_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,     -- '직업', '대출유형', '조건', '특수'
  primary_key VARCHAR(50) NOT NULL,  -- '4대가입', '프리랜서' 등 (기준 키워드)
  synonyms TEXT[] NOT NULL,          -- 동의어 배열
  description VARCHAR(200),          -- 설명 (선택)
  is_active BOOLEAN DEFAULT true,    -- 활성화 상태
  priority INTEGER DEFAULT 0,        -- 우선순위 (높을수록 먼저 적용)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, primary_key)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_synonym_mappings_category ON synonym_mappings(category);
CREATE INDEX IF NOT EXISTS idx_synonym_mappings_active ON synonym_mappings(is_active);
CREATE INDEX IF NOT EXISTS idx_synonym_mappings_priority ON synonym_mappings(priority DESC);

-- Updated_at 트리거
CREATE TRIGGER tr_synonym_mappings_updated_at
  BEFORE UPDATE ON synonym_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 초기 데이터 삽입 (기존 하드코딩 매핑)
-- ============================================

-- 직업 구분
INSERT INTO synonym_mappings (category, primary_key, synonyms, description, priority) VALUES
('직업', '4대가입', ARRAY['4대보험', '4대', '사대보험', '사대', '직장인', '회사원', '근로자', '월급쟁이', '정규직'], '4대보험 가입 직장인', 10),
('직업', '미가입', ARRAY['4대보험없는', '4대없는', '보험없는', '미가입자', '4대미가입'], '4대보험 미가입자', 10),
('직업', '프리랜서', ARRAY['자유직', '프리', '비정규직', '자유계약', '1인사업자', '플랫폼노동자'], '프리랜서/자유직', 10),
('직업', '개인사업자', ARRAY['자영업', '자영업자', '사업자', '개인사업', '소상공인', '자영업대출'], '개인사업자/자영업자', 10),
('직업', '무직', ARRAY['무직자', '실업자', '미취업', '백수', '취준생'], '무직자', 10),
('직업', '주부', ARRAY['전업주부', '주부론', '가정주부'], '전업주부', 10),
('직업', '청년', ARRAY['청년론', '사회초년생', '청년대출'], '사회초년생/청년', 10),
('직업', '개인회생', ARRAY['회생', '회생자', '파산'], '개인회생/파산자', 10),
('직업', '연금', ARRAY['연금수령', '국민연금', '퇴직연금'], '연금수령자', 10),
('직업', '계약직', ARRAY['기간제', '단기계약'], '계약직 근로자', 5),
('직업', '파견직', ARRAY['파견근무', '파견'], '파견직 근로자', 5),
('직업', '일용직', ARRAY['일당제', '일용'], '일용직 근로자', 5)
ON CONFLICT (category, primary_key) DO NOTHING;

-- 대출 유형
INSERT INTO synonym_mappings (category, primary_key, synonyms, description, priority) VALUES
('대출유형', '신용대출', ARRAY['신용', '무담보', '신용론'], '신용대출', 10),
('대출유형', '담보대출', ARRAY['담보', '주담대', '주택담보', '하우스론'], '담보대출', 10),
('대출유형', '햇살론', ARRAY['햇살', '서민대출', '정부지원대출'], '햇살론', 10),
('대출유형', '사잇돌', ARRAY['사잇돌대출', '중금리'], '사잇돌 대출', 10),
('대출유형', '오토론', ARRAY['자동차담보', '차량담보', '자동차대출'], '자동차 담보대출', 10)
ON CONFLICT (category, primary_key) DO NOTHING;

-- 금융 조건
INSERT INTO synonym_mappings (category, primary_key, synonyms, description, priority) VALUES
('조건', '금리', ARRAY['이자', '이율', '연이율', '금리대'], '금리 관련', 5),
('조건', '한도', ARRAY['최대금액', '대출금액', '한도액', '대출한도'], '한도 관련', 5),
('조건', '조건', ARRAY['자격', '요건', '기준', '대상'], '자격 조건', 5)
ON CONFLICT (category, primary_key) DO NOTHING;

-- ============================================
-- RLS 정책 (관리자만 수정 가능, 읽기는 공개)
-- ============================================
ALTER TABLE synonym_mappings ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 사용자 허용 (활성화된 항목만)
CREATE POLICY "synonym_mappings_select_policy"
  ON synonym_mappings
  FOR SELECT
  USING (is_active = true);

-- 읽기: 관리자는 모든 항목 조회 가능
CREATE POLICY "synonym_mappings_admin_select_policy"
  ON synonym_mappings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 쓰기: 관리자만 허용
CREATE POLICY "synonym_mappings_admin_all_policy"
  ON synonym_mappings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
