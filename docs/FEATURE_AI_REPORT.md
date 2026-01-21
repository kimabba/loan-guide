# AI 리포트 기능 설계

## 📋 개요

고객 정보를 바탕으로 AI가 최적의 대출 상품을 추천하고, 절감 효과를 분석하여 전문적인 리포트를 생성하는 기능입니다.

## 🎯 주요 기능

### 1. 고객 정보 수집
- **기본 정보**: 이름, 나이, 직업, 소득
- **신용 정보**: 신용등급, 연체 이력
- **대출 목적**: 신용대출, 담보대출, 특목 대출 등
- **필요 금액**: 희망 대출액
- **현재 대출**: 기존 대출 현황, 금리

### 2. AI 분석 및 추천
- **최적 상품 추천**: 3-5개 상품 추천
- **비교 분석**: 
  - 금리 비교
  - 한도 비교
  - 상환 기간 비교
- **절감 효과 계산**:
  - 월 이자 절감액
  - 총 이자 절감액
  - 연간 절감액

### 3. 리포트 생성 (이미지 다운로드)
- **PDF 형식**: 전문적 리포트
- **이미지 형식**: SNS 공유 용
- **포함 내용**:
  - 고객 맞춤 분석
  - 추천 상품 리스트
  - 비교 차트
  - 절감액 예측
  - 신청 가이드

### 4. 공유 및 전송
- **이메일 전송**
- **링크 공유** (로그인 불필요)
- **다운로드** (PDF, PNG, JPG)

## 🏗️ 기술 스택

- **Frontend**: React + Tailwind CSS
- **Backend**: Hono + Cloudflare Pages
- **AI**: Gemini 2.5 Flash
- **이미지 생성**: html2canvas + jsPDF
- **Storage**: Supabase (리포트 저장)

## 📊 데이터베이스 스키마

### ai_reports 테이블
```sql
CREATE TABLE ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 고객 정보
  customer_info JSONB NOT NULL, -- { name, age, job, income, creditScore }
  
  -- 분석 결과
  recommended_products JSONB NOT NULL, -- [{ id, company, product, rate, limit, estimatedInterest }]
  savings_analysis JSONB NOT NULL, -- { monthly, yearly, total }
  comparison_chart JSONB, -- 차트 데이터
  
  -- 리포트 파일
  report_pdf_url TEXT,
  report_image_url TEXT,
  
  -- 공유
  share_token VARCHAR(100) UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- 3개월 후 자동 삭제
);

CREATE TABLE report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES ai_reports(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔄 API 엔드포인트

### 1. 리포트 생성
```
POST /api/ai-report/generate
Body: {
  customerInfo: {
    name, age, job, income, creditScore,
    currentLoan?: { amount, rate, monthlyPayment },
    desiredAmount, purpose
  }
}
Response: {
  reportId,
  recommendedProducts,
  savingsAnalysis,
  comparisonChart
}
```

### 2. 리포트 조회
```
GET /api/ai-report/:reportId
Response: 전체 리포트 데이터
```

### 3. 리포트 다운로드
```
GET /api/ai-report/:reportId/download?format=pdf|png|jpg
Response: 파일 스트림
```

### 4. 이메일 전송
```
POST /api/ai-report/:reportId/send
Body: { recipient_email }
Response: { success, message }
```

### 5. 공유 링크 생성
```
POST /api/ai-report/:reportId/share
Response: { shareUrl, token }
```

## 🎨 UI 컴포넌트

### 1. ReportForm
- 고객 정보 입력 폼
- 유효성 검사
- 다단계 폼 (Wizard)

### 2. ReportPreview
- 리포트 미리보기
- 반응형 디자인
- 다운로드 버튼

### 3. ReportShare
- 이메일 전송 모달
- 링크 복사
- QR 코드 생성

### 4. ReportComparison
- 상품 비교 차트
- 절감액 시각화
- 인터랙티브 그래프

## 🚀 구현 단계

### Phase 1: 기초 (1주)
- [ ] 데이터베이스 마이그레이션
- [ ] API 엔드포인트 (생성, 조회)
- [ ] 기본 UI 폼

### Phase 2: AI 분석 (1주)
- [ ] Gemini를 통한 상품 추천
- [ ] 절감액 계산 로직
- [ ] 비교 분석 기능

### Phase 3: 리포트 생성 (1주)
- [ ] HTML → PDF 변환
- [ ] 이미지 생성
- [ ] 템플릿 디자인

### Phase 4: 공유 및 배포 (1주)
- [ ] 이메일 전송
- [ ] 공유 링크 관리
- [ ] 다운로드 기능
- [ ] 배포 및 테스트

## 💡 절감액 계산 로직

```typescript
function calculateSavings(
  currentRate: number,
  recommendedRate: number,
  principal: number,
  months: number
): SavingsAnalysis {
  const currentMonthlyRate = currentRate / 100 / 12;
  const recommendedMonthlyRate = recommendedRate / 100 / 12;
  
  // 원리금균등분할 공식
  const currentMonthly = principal * 
    (currentMonthlyRate * Math.pow(1 + currentMonthlyRate, months)) /
    (Math.pow(1 + currentMonthlyRate, months) - 1);
  
  const recommendedMonthly = principal * 
    (recommendedMonthlyRate * Math.pow(1 + recommendedMonthlyRate, months)) /
    (Math.pow(1 + recommendedMonthlyRate, months) - 1);
  
  const monthlySavings = currentMonthly - recommendedMonthly;
  const totalSavings = monthlySavings * months;
  
  return {
    monthly: Math.round(monthlySavings),
    yearly: Math.round(monthlySavings * 12),
    total: Math.round(totalSavings)
  };
}
```

## 🔐 보안 고려사항

- [ ] 개인정보 암호화 (고객 정보)
- [ ] GDPR 준수
- [ ] 자동 만료 (3개월)
- [ ] 접근 제어 (본인만 조회)
- [ ] 감사 로그 (누가 언제 확인했는지)

## 📈 분석 및 모니터링

- 리포트 생성 횟수
- 다운로드 통계
- 전환율 (리포트 조회 → 신청)
- 인기 상품 분석

