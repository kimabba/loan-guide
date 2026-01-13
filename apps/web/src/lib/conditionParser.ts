/**
 * 복붙 검색을 위한 조건 파싱 유틸리티
 * 사용자 입력 텍스트에서 대출 조건을 추출하고,
 * 상품 조건과 매칭하는 로직을 제공합니다.
 *
 * CRM 시스템 복붙 형식 지원:
 * - 주민번호에서 나이/성별 추출
 * - 테이블 형식 데이터 파싱
 * - 라디오 버튼 형식 고용형태 인식
 */

// ============================================
// 타입 정의
// ============================================

/** 사용자가 입력한 조건 (파싱 결과) */
export interface ParsedConditions {
  age?: number;                    // 나이 (세)
  gender?: 'male' | 'female';      // 성별
  annualIncome?: number;           // 연소득 (만원)
  monthlyIncome?: number;          // 월소득 (만원)
  employmentType?: EmploymentType; // 고용형태
  employmentPeriod?: number;       // 재직기간 (개월)
  desiredAmount?: number;          // 희망 대출금액 (만원)
  creditScore?: number;            // 신용점수 (NICE/KCB)
  creditGrade?: number;            // 신용등급 (1-10)
  hasInsurance?: boolean;          // 4대보험 가입 여부
  existingLoans?: number;          // 기존 대출 잔액 (만원)
  rawText?: string;                // 원본 텍스트 (디버깅용)
}

/** 고용 형태 */
export type EmploymentType =
  | 'employee'       // 직장인 (4대보험)
  | 'employee_no_insurance' // 직장인 (미가입)
  | 'self_employed'  // 자영업자
  | 'freelancer'     // 프리랜서
  | 'ceo'            // 법인대표
  | 'housewife'      // 주부
  | 'student'        // 학생
  | 'unemployed'     // 무직
  | 'contract'       // 계약직
  | 'dispatch'       // 파견직
  | 'daily'          // 일용직
  | 'parttime'       // 아르바이트
  | 'regular'        // 정규직
  | 'temporary'      // 상용직
  | 'other';         // 기타

/** 상품의 구조화된 조건 */
export interface ProductConditions {
  item_cd: string;
  pfi_name: string;
  depth1: string;
  depth2: string;
  fi_memo: string;

  // 파싱된 조건들
  age?: { min?: number; max?: number };
  annualIncome?: { min?: number };
  employmentPeriod?: { min?: number };  // 개월 단위
  loanLimit?: { min?: number; max?: number };  // 만원 단위
  interestRate?: { min?: number; max?: number };  // % 단위
  targetTypes?: string[];  // 대상 고용형태
  hasInsuranceRequired?: boolean;  // 4대보험 필수 여부
}

/** 매칭 결과 */
export interface MatchResult {
  item_cd: string;
  product: ProductConditions;
  score: number;           // 0-100
  matchedConditions: string[];
  unmatchedConditions: string[];
  unknownConditions: string[];  // 판단 불가 조건
}

/** 파싱 결과 상세 (UI 표시용) */
export interface ParseResult {
  success: boolean;
  conditions: ParsedConditions;
  confidence: number;  // 0-1
  details: ParseDetail[];
}

export interface ParseDetail {
  field: keyof ParsedConditions;
  label: string;
  value: string | number | boolean | undefined;
  rawMatch: string;
  confidence: number;
}

// ============================================
// CRM 시스템 전용 파싱 함수들
// ============================================

/**
 * 주민번호에서 나이와 성별 추출
 * 형식: 671210-1, 671210-2, 001210-3, 001210-4
 */
function parseResidentNumber(text: string): {
  age?: number;
  gender?: 'male' | 'female';
  match?: string;
  confidence: number;
} {
  // 주민번호 패턴: 6자리-1자리 또는 6자리 1자리 (하이픈 없이)
  const patterns = [
    /(\d{2})(\d{2})(\d{2})\s*-?\s*([1-4])/,  // 671210-1
    /생년월일.*?(\d{2})(\d{2})(\d{2})/,       // 생년월일 671210
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const yearPrefix = parseInt(match[1], 10);
      const genderCode = match[4] ? parseInt(match[4], 10) : null;

      // 출생년도 계산
      let birthYear: number;
      if (genderCode === 1 || genderCode === 2) {
        // 1900년대 출생
        birthYear = 1900 + yearPrefix;
      } else if (genderCode === 3 || genderCode === 4) {
        // 2000년대 출생
        birthYear = 2000 + yearPrefix;
      } else {
        // 성별 코드가 없으면 연도로 추정
        birthYear = yearPrefix >= 0 && yearPrefix <= 26 ? 2000 + yearPrefix : 1900 + yearPrefix;
      }

      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;

      // 성별 결정
      let gender: 'male' | 'female' | undefined;
      if (genderCode === 1 || genderCode === 3) {
        gender = 'male';
      } else if (genderCode === 2 || genderCode === 4) {
        gender = 'female';
      }

      if (age >= 18 && age <= 100) {
        return {
          age,
          gender,
          match: match[0],
          confidence: 0.95
        };
      }
    }
  }

  return { confidence: 0 };
}

/**
 * CRM 테이블 형식에서 연봉 추출
 * 형식: "연봉 * | 8000 만원" 또는 "연봉	8000	만원"
 */
function parseCRMIncome(text: string): {
  annual?: number;
  monthly?: number;
  match?: string;
  confidence: number;
} {
  let result: { annual?: number; monthly?: number; match?: string; confidence: number } = { confidence: 0 };

  // CRM 테이블 형식: 연봉 * | 값 만원
  const crmAnnualPatterns = [
    /연봉\s*\*?\s*\|?\s*(\d{1,5})\s*만?\s*원?/,
    /연봉\s*[\t\|]\s*(\d{1,5})/,
    /연\s*소득\s*[\t\|:]\s*(\d{1,5})/i,
  ];

  // CRM 실수령액
  const crmMonthlyPatterns = [
    /실수령액\s*\*?\s*\|?\s*(\d{1,4})\s*만?\s*원?/,
    /실수령액\s*[\t\|]\s*(\d{1,4})/,
    /월\s*소득\s*[\t\|:]\s*(\d{1,4})/i,
  ];

  // 연봉 추출
  for (const pattern of crmAnnualPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value > 0 && value < 100000) {  // 유효한 연봉 범위
        result.annual = value;
        result.match = match[0];
        result.confidence = 0.9;
        break;
      }
    }
  }

  // 월 소득 추출
  for (const pattern of crmMonthlyPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value > 0 && value < 10000) {
        result.monthly = value;
        if (!result.annual) {
          result.annual = value * 12;
        }
        result.match = result.match || match[0];
        result.confidence = Math.max(result.confidence, 0.85);
        break;
      }
    }
  }

  return result;
}

/**
 * CRM 라디오 버튼 형식에서 고용형태 추출
 * 형식: "4대가입 미가입자 법인대표 사업자 프리랜서 무직 주부"
 */
function parseCRMEmploymentType(text: string): {
  value?: EmploymentType;
  hasInsurance?: boolean;
  match?: string;
  confidence: number;
} {
  // CRM 고용형태 패턴 (라디오 버튼 순서대로)
  // 선택된 항목은 보통 하나만 표시되거나, 앞에 체크 표시가 있음

  // 4대보험 관련 확인
  const has4Insurance = /4대\s*가입|4대\s*보험.*가입/.test(text);
  const no4Insurance = /미가입자|4대.*미가입|미가입/.test(text);

  // CRM 고용형태 키워드 (우선순위 순)
  const crmTypePatterns: Array<{ pattern: RegExp; type: EmploymentType; insurance?: boolean }> = [
    // 4대보험 가입 직장인
    { pattern: /4대\s*가입(?:\s|$)/, type: 'employee', insurance: true },
    // 미가입자
    { pattern: /미가입자(?:\s|$)/, type: 'employee_no_insurance', insurance: false },
    // 법인대표
    { pattern: /법인\s*대표/, type: 'ceo' },
    // 사업자/자영업
    { pattern: /사업자(?:\s|$)|자영업/, type: 'self_employed' },
    // 프리랜서
    { pattern: /프리랜서/, type: 'freelancer' },
    // 무직
    { pattern: /무직(?:\s|$)/, type: 'unemployed' },
    // 주부
    { pattern: /주부(?:\s|$)/, type: 'housewife' },
  ];

  // CRM 고용형태 상세 (정규직, 계약직 등)
  const crmDetailPatterns: Array<{ pattern: RegExp; type: EmploymentType }> = [
    { pattern: /정규직/, type: 'regular' },
    { pattern: /계약직/, type: 'contract' },
    { pattern: /파견직/, type: 'dispatch' },
    { pattern: /일용직/, type: 'daily' },
    { pattern: /아르바이트/, type: 'parttime' },
    { pattern: /상용직/, type: 'temporary' },
  ];

  // 메인 고용형태 확인
  for (const { pattern, type, insurance } of crmTypePatterns) {
    if (pattern.test(text)) {
      return {
        value: type,
        hasInsurance: insurance,
        match: text.match(pattern)?.[0],
        confidence: 0.9
      };
    }
  }

  // 상세 고용형태 확인 (4대보험 여부와 함께)
  for (const { pattern, type } of crmDetailPatterns) {
    if (pattern.test(text)) {
      return {
        value: type,
        hasInsurance: has4Insurance && !no4Insurance,
        match: text.match(pattern)?.[0],
        confidence: 0.85
      };
    }
  }

  // 4대보험 가입 여부만 있는 경우
  if (has4Insurance) {
    return { value: 'employee', hasInsurance: true, match: '4대 가입', confidence: 0.7 };
  }

  return { confidence: 0 };
}

/**
 * CRM 입사일에서 재직기간 계산
 * 형식: "입사일 | 2022-01-15" 또는 "입사일 2022.01.15"
 */
function parseCRMEmploymentPeriod(text: string): {
  value?: number;
  match?: string;
  confidence: number;
} {
  // 입사일 패턴
  const datePatterns = [
    /입사일\s*[\t\|:]?\s*(\d{4})[-./](\d{1,2})[-./](\d{1,2})/,
    /입사일\s*[\t\|:]?\s*(\d{4})년\s*(\d{1,2})월/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);

      const startDate = new Date(year, month - 1);
      const now = new Date();
      const months = (now.getFullYear() - startDate.getFullYear()) * 12 +
                    (now.getMonth() - startDate.getMonth());

      if (months >= 0 && months < 600) {  // 50년 이내
        return {
          value: months,
          match: match[0],
          confidence: 0.95
        };
      }
    }
  }

  return { confidence: 0 };
}

/**
 * CRM 신용점수 추출
 * 형식: "NICE 신용평점 | 점", "KCB 신용평점 | 점"
 */
function parseCRMCreditScore(text: string): {
  score?: number;
  grade?: number;
  match?: string;
  confidence: number;
} {
  // 신용점수 패턴
  const scorePatterns = [
    /NICE\s*신용평점\s*[\t\|:]?\s*(\d{3})\s*점?/i,
    /KCB\s*신용평점\s*[\t\|:]?\s*(\d{3})\s*점?/i,
    /SCI\s*신용평점\s*[\t\|:]?\s*(\d{3})\s*점?/i,
    /신용\s*점수\s*[\t\|:]?\s*(\d{3})/,
  ];

  for (const pattern of scorePatterns) {
    const match = text.match(pattern);
    if (match) {
      const score = parseInt(match[1], 10);
      if (score >= 0 && score <= 1000) {
        // 점수를 등급으로 변환
        let grade: number;
        if (score >= 900) grade = 1;
        else if (score >= 870) grade = 2;
        else if (score >= 840) grade = 3;
        else if (score >= 805) grade = 4;
        else if (score >= 750) grade = 5;
        else if (score >= 665) grade = 6;
        else if (score >= 600) grade = 7;
        else if (score >= 515) grade = 8;
        else if (score >= 445) grade = 9;
        else grade = 10;

        return {
          score,
          grade,
          match: match[0],
          confidence: 0.9
        };
      }
    }
  }

  return { confidence: 0 };
}

/**
 * CRM 대출 잔액 추출
 * 형식: "신용대출 | 8 | 215,814,000"
 */
function parseCRMExistingLoans(text: string): {
  value?: number;
  match?: string;
  confidence: number;
} {
  // 대출 잔액 패턴 (원 단위)
  const patterns = [
    /(?:합계|잔액)[^\d]*(\d{1,3}(?:,\d{3})*)\s*원?/,
    /신용대출[^\d]*\d+[^\d]*(\d{1,3}(?:,\d{3})*)/,
    /총\s*대출[^\d]*(\d{1,3}(?:,\d{3})*)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const valueStr = match[1].replace(/,/g, '');
      const value = parseInt(valueStr, 10);
      // 원 단위를 만원 단위로 변환
      const inManwon = Math.round(value / 10000);

      if (inManwon > 0) {
        return {
          value: inManwon,
          match: match[0],
          confidence: 0.85
        };
      }
    }
  }

  return { confidence: 0 };
}

// ============================================
// 기본 파싱 함수들 (기존 + 개선)
// ============================================

/** 나이 파싱 (기본) */
function parseAge(text: string): { value?: number; match?: string; confidence: number } {
  // 먼저 CRM 형식 확인 (만XX세 형식)
  const crmAgePattern = /만\s*(\d{1,2})\s*세/;
  const crmMatch = text.match(crmAgePattern);
  if (crmMatch) {
    const age = parseInt(crmMatch[1], 10);
    if (age >= 18 && age <= 100) {
      return { value: age, match: crmMatch[0], confidence: 0.95 };
    }
  }

  // 기본 패턴들
  const patterns = [
    /(?:만\s*)?(\d{1,2})\s*세/,
    /(\d{1,2})\s*살/,
    /나이[:\s]*(\d{1,2})/,
    /연령[:\s]*(\d{1,2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const age = parseInt(match[1], 10);
      if (age >= 18 && age <= 100) {
        return { value: age, match: match[0], confidence: 0.9 };
      }
    }
  }

  return { confidence: 0 };
}

/** 소득 파싱 (기본) */
function parseIncome(text: string): {
  annual?: number;
  monthly?: number;
  match?: string;
  confidence: number;
} {
  // 연소득 패턴
  const annualPatterns = [
    /연소득[:\s]*(\d{1,5})\s*만?\s*원?/,
    /연봉[:\s]*(\d{1,5})\s*만?\s*원?/,
    /연[\s]?(\d{1,5})\s*만\s*원/,
  ];

  // 월소득 패턴
  const monthlyPatterns = [
    /월소득[:\s]*(\d{1,4})\s*만?\s*원?/,
    /월급[:\s]*(\d{1,4})\s*만?\s*원?/,
    /월[\s]?(\d{1,4})\s*만\s*원/,
  ];

  let result: { annual?: number; monthly?: number; match?: string; confidence: number } = { confidence: 0 };

  for (const pattern of annualPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      const annual = value > 10000 ? Math.round(value / 10000) : value;
      result = { annual, match: match[0], confidence: 0.85 };
      break;
    }
  }

  for (const pattern of monthlyPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      const monthly = value > 1000 ? Math.round(value / 10000) : value;
      result = {
        ...result,
        monthly,
        annual: result.annual || monthly * 12,
        match: match[0],
        confidence: Math.max(result.confidence, 0.8)
      };
      break;
    }
  }

  return result;
}

/** 고용형태 파싱 (기본) */
function parseEmploymentType(text: string): {
  value?: EmploymentType;
  hasInsurance?: boolean;
  match?: string;
  confidence: number;
} {
  const hasInsurance = /4대\s*보험|4대\s*가입|사대\s*보험/.test(text);
  const noInsurance = /미가입|4대\s*미/.test(text);

  const typePatterns: Array<{ pattern: RegExp; type: EmploymentType; confidence: number }> = [
    { pattern: /법인\s*대표|대표\s*이사|ceo/i, type: 'ceo', confidence: 0.9 },
    { pattern: /자영업|개인\s*사업|사업자/, type: 'self_employed', confidence: 0.9 },
    { pattern: /프리랜서|freelancer/i, type: 'freelancer', confidence: 0.9 },
    { pattern: /계약직/, type: 'contract', confidence: 0.85 },
    { pattern: /파견직|파견\s*근무/, type: 'dispatch', confidence: 0.85 },
    { pattern: /일용직|일당/, type: 'daily', confidence: 0.85 },
    { pattern: /주부|가정\s*주부/, type: 'housewife', confidence: 0.9 },
    { pattern: /학생/, type: 'student', confidence: 0.9 },
    { pattern: /무직|백수/, type: 'unemployed', confidence: 0.9 },
    { pattern: /직장인|회사원|근로자/, type: noInsurance ? 'employee_no_insurance' : 'employee', confidence: 0.8 },
  ];

  for (const { pattern, type, confidence } of typePatterns) {
    if (pattern.test(text)) {
      let finalType = type;
      if (type === 'employee' && noInsurance) {
        finalType = 'employee_no_insurance';
      }

      return {
        value: finalType,
        hasInsurance: type === 'employee' ? (hasInsurance || !noInsurance) : undefined,
        match: text.match(pattern)?.[0],
        confidence
      };
    }
  }

  if (hasInsurance) {
    return { value: 'employee', hasInsurance: true, match: '4대보험', confidence: 0.7 };
  }

  return { confidence: 0 };
}

/** 재직기간 파싱 (기본) */
function parseEmploymentPeriod(text: string): {
  value?: number;
  match?: string;
  confidence: number;
} {
  const combinedPattern = /(\d{1,2})\s*년\s*(\d{1,2})\s*개월/;
  const combinedMatch = text.match(combinedPattern);
  if (combinedMatch) {
    const years = parseInt(combinedMatch[1], 10);
    const months = parseInt(combinedMatch[2], 10);
    return { value: years * 12 + months, match: combinedMatch[0], confidence: 0.95 };
  }

  const yearPatterns = [
    /재직[:\s]*(\d{1,2})\s*년/,
    /근무[:\s]*(\d{1,2})\s*년/,
    /(\d{1,2})\s*년\s*(?:근무|재직|근속)/,
  ];

  for (const pattern of yearPatterns) {
    const match = text.match(pattern);
    if (match) {
      const years = parseInt(match[1], 10);
      return { value: years * 12, match: match[0], confidence: 0.85 };
    }
  }

  const monthPatterns = [
    /재직[:\s]*(\d{1,3})\s*개월/,
    /근무[:\s]*(\d{1,3})\s*개월/,
    /(\d{1,3})\s*개월\s*(?:근무|재직|근속)/,
  ];

  for (const pattern of monthPatterns) {
    const match = text.match(pattern);
    if (match) {
      const months = parseInt(match[1], 10);
      return { value: months, match: match[0], confidence: 0.9 };
    }
  }

  return { confidence: 0 };
}

/** 희망 대출금액 파싱 */
function parseDesiredAmount(text: string): {
  value?: number;
  match?: string;
  confidence: number;
} {
  const patterns = [
    /(?:희망|원하는|필요한?)\s*(?:대출\s*)?(?:금액|한도)[:\s]*(\d{1,5})\s*만?\s*원?/,
    /대출[:\s]*(\d{1,5})\s*만\s*원?\s*(?:희망|원함|필요)/,
    /(\d{1,5})\s*만\s*원?\s*대출/,
    /대출\s*금액[:\s]*(\d{1,5})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      const amount = value > 50000 ? Math.round(value / 10000) : value;
      return { value: amount, match: match[0], confidence: 0.85 };
    }
  }

  return { confidence: 0 };
}

/** 신용등급 파싱 (기본) */
function parseCreditGrade(text: string): {
  value?: number;
  match?: string;
  confidence: number;
} {
  const patterns = [
    /신용[:\s]*(\d{1,2})\s*등급/,
    /신용등급[:\s]*(\d{1,2})/,
    /(\d{1,2})\s*등급/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const grade = parseInt(match[1], 10);
      if (grade >= 1 && grade <= 10) {
        return { value: grade, match: match[0], confidence: 0.9 };
      }
    }
  }

  const scorePattern = /(?:신용\s*)?점수[:\s]*(\d{3})/;
  const scoreMatch = text.match(scorePattern);
  if (scoreMatch) {
    const score = parseInt(scoreMatch[1], 10);
    let grade: number;
    if (score >= 900) grade = 1;
    else if (score >= 870) grade = 2;
    else if (score >= 840) grade = 3;
    else if (score >= 805) grade = 4;
    else if (score >= 750) grade = 5;
    else if (score >= 665) grade = 6;
    else if (score >= 600) grade = 7;
    else if (score >= 515) grade = 8;
    else if (score >= 445) grade = 9;
    else grade = 10;

    return { value: grade, match: scoreMatch[0], confidence: 0.7 };
  }

  return { confidence: 0 };
}

// ============================================
// 메인 파싱 함수
// ============================================

/** 텍스트에서 모든 조건을 파싱 (CRM 형식 우선) */
export function parseConditionsFromText(text: string): ParseResult {
  const details: ParseDetail[] = [];
  const conditions: ParsedConditions = { rawText: text };
  let totalConfidence = 0;
  let parsedCount = 0;

  // 1. 주민번호에서 나이/성별 추출 (CRM 우선)
  const residentResult = parseResidentNumber(text);
  if (residentResult.age !== undefined) {
    conditions.age = residentResult.age;
    conditions.gender = residentResult.gender;
    details.push({
      field: 'age',
      label: '나이',
      value: residentResult.age,
      rawMatch: residentResult.match || '',
      confidence: residentResult.confidence
    });
    totalConfidence += residentResult.confidence;
    parsedCount++;
  } else {
    // 기본 나이 파싱
    const ageResult = parseAge(text);
    if (ageResult.value !== undefined) {
      conditions.age = ageResult.value;
      details.push({
        field: 'age',
        label: '나이',
        value: ageResult.value,
        rawMatch: ageResult.match || '',
        confidence: ageResult.confidence
      });
      totalConfidence += ageResult.confidence;
      parsedCount++;
    }
  }

  // 2. 소득 파싱 (CRM 형식 우선)
  let incomeResult = parseCRMIncome(text);
  if (incomeResult.confidence === 0) {
    incomeResult = parseIncome(text);
  }
  if (incomeResult.annual !== undefined) {
    conditions.annualIncome = incomeResult.annual;
    conditions.monthlyIncome = incomeResult.monthly;
    details.push({
      field: 'annualIncome',
      label: '연소득',
      value: incomeResult.annual,
      rawMatch: incomeResult.match || '',
      confidence: incomeResult.confidence
    });
    totalConfidence += incomeResult.confidence;
    parsedCount++;
  }

  // 3. 고용형태 파싱 (CRM 형식 우선)
  let employmentResult = parseCRMEmploymentType(text);
  if (employmentResult.confidence === 0) {
    employmentResult = parseEmploymentType(text);
  }
  if (employmentResult.value !== undefined) {
    conditions.employmentType = employmentResult.value;
    conditions.hasInsurance = employmentResult.hasInsurance;
    details.push({
      field: 'employmentType',
      label: '고용형태',
      value: employmentResult.value,
      rawMatch: employmentResult.match || '',
      confidence: employmentResult.confidence
    });
    totalConfidence += employmentResult.confidence;
    parsedCount++;
  }

  // 4. 재직기간 파싱 (CRM 입사일 우선)
  let periodResult = parseCRMEmploymentPeriod(text);
  if (periodResult.confidence === 0) {
    periodResult = parseEmploymentPeriod(text);
  }
  if (periodResult.value !== undefined) {
    conditions.employmentPeriod = periodResult.value;
    details.push({
      field: 'employmentPeriod',
      label: '재직기간',
      value: periodResult.value,
      rawMatch: periodResult.match || '',
      confidence: periodResult.confidence
    });
    totalConfidence += periodResult.confidence;
    parsedCount++;
  }

  // 5. 희망 대출금액 파싱
  const amountResult = parseDesiredAmount(text);
  if (amountResult.value !== undefined) {
    conditions.desiredAmount = amountResult.value;
    details.push({
      field: 'desiredAmount',
      label: '희망금액',
      value: amountResult.value,
      rawMatch: amountResult.match || '',
      confidence: amountResult.confidence
    });
    totalConfidence += amountResult.confidence;
    parsedCount++;
  }

  // 6. 신용점수/등급 파싱 (CRM 형식 우선)
  const creditResult = parseCRMCreditScore(text);
  if (creditResult.score !== undefined) {
    conditions.creditScore = creditResult.score;
    conditions.creditGrade = creditResult.grade;
    details.push({
      field: 'creditGrade',
      label: '신용등급',
      value: creditResult.grade,
      rawMatch: creditResult.match || '',
      confidence: creditResult.confidence
    });
    totalConfidence += creditResult.confidence;
    parsedCount++;
  } else {
    const gradeResult = parseCreditGrade(text);
    if (gradeResult.value !== undefined) {
      conditions.creditGrade = gradeResult.value;
      details.push({
        field: 'creditGrade',
        label: '신용등급',
        value: gradeResult.value,
        rawMatch: gradeResult.match || '',
        confidence: gradeResult.confidence
      });
      totalConfidence += gradeResult.confidence;
      parsedCount++;
    }
  }

  // 7. 기존 대출 잔액 파싱
  const loansResult = parseCRMExistingLoans(text);
  if (loansResult.value !== undefined) {
    conditions.existingLoans = loansResult.value;
    details.push({
      field: 'existingLoans',
      label: '기존대출',
      value: loansResult.value,
      rawMatch: loansResult.match || '',
      confidence: loansResult.confidence
    });
    totalConfidence += loansResult.confidence;
    parsedCount++;
  }

  const avgConfidence = parsedCount > 0 ? totalConfidence / parsedCount : 0;

  return {
    success: parsedCount >= 1,
    conditions,
    confidence: avgConfidence,
    details
  };
}

// ============================================
// 상품 조건 파싱 (depth3에서 구조화)
// ============================================

function findDepth4Detail(depth3: any[], depth4Name: string): string | undefined {
  for (const section of depth3) {
    if (section.depth4_key) {
      const field = section.depth4_key.find((f: any) => f.depth4_name === depth4Name);
      if (field) return field.detail;
    }
  }
  return undefined;
}

function parseAgeRange(detail: string): { min?: number; max?: number } {
  const rangePattern = /만?\s*(\d{1,2})\s*세?\s*이상.*만?\s*(\d{1,2})\s*세?\s*이하/;
  const rangeMatch = detail.match(rangePattern);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  }

  const minPattern = /만?\s*(\d{1,2})\s*세?\s*이상/;
  const minMatch = detail.match(minPattern);
  if (minMatch) {
    return { min: parseInt(minMatch[1], 10) };
  }

  const maxPattern = /만?\s*(\d{1,2})\s*세?\s*이하/;
  const maxMatch = detail.match(maxPattern);
  if (maxMatch) {
    return { max: parseInt(maxMatch[1], 10) };
  }

  return {};
}

function parseMinIncome(detail: string): number | undefined {
  const pattern = /(\d{1,5})\s*만?\s*(?:원\s*)?이상/;
  const match = detail.match(pattern);
  if (match) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

function parseMinPeriod(detail: string): number | undefined {
  const monthPattern = /(\d{1,3})\s*개월\s*이상/;
  const monthMatch = detail.match(monthPattern);
  if (monthMatch) {
    return parseInt(monthMatch[1], 10);
  }

  const yearPattern = /(\d{1,2})\s*년\s*이상/;
  const yearMatch = detail.match(yearPattern);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10) * 12;
  }

  return undefined;
}

function parseLoanLimit(detail: string): { min?: number; max?: number } {
  const rangePattern = /최소\s*(\d{1,5})\s*만?.*최대\s*(\d{1,5})\s*만?/;
  const rangeMatch = detail.match(rangePattern);
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1], 10),
      max: parseInt(rangeMatch[2], 10)
    };
  }

  if (detail.includes('1억')) {
    const min = detail.match(/최소\s*(\d{1,5})\s*만?/)?.[1];
    return {
      min: min ? parseInt(min, 10) : undefined,
      max: 10000
    };
  }

  return {};
}

function parseInterestRate(detail: string): { min?: number; max?: number } {
  const rangePattern = /(?:최저|최소)\s*(\d+\.?\d*)\s*%?.*(?:최고|최대)\s*(\d+\.?\d*)\s*%?/;
  const rangeMatch = detail.match(rangePattern);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2])
    };
  }

  return {};
}

function parseTargetTypes(detail: string): string[] {
  const types: string[] = [];

  if (/직장인/.test(detail)) types.push('employee');
  if (/4대보험.*가입|4대가입/.test(detail)) types.push('employee_insured');
  if (/4대보험.*미가입|미가입.*직장인/.test(detail)) types.push('employee_no_insurance');
  if (/자영업|개인\s*사업/.test(detail)) types.push('self_employed');
  if (/프리랜서/.test(detail)) types.push('freelancer');
  if (/법인\s*대표|대표/.test(detail)) types.push('ceo');
  if (/주부/.test(detail)) types.push('housewife');
  if (/계약직/.test(detail)) types.push('contract');
  if (/파견직/.test(detail)) types.push('dispatch');
  if (/일용직/.test(detail)) types.push('daily');

  return types;
}

export function extractProductConditions(product: any): ProductConditions {
  const conditions: ProductConditions = {
    item_cd: product.item_cd,
    pfi_name: product.pfi_name,
    depth1: product.depth1,
    depth2: product.depth2,
    fi_memo: product.fi_memo || ''
  };

  if (!product.depth3) return conditions;

  const ageDetail = findDepth4Detail(product.depth3, '연령');
  if (ageDetail) {
    conditions.age = parseAgeRange(ageDetail);
  }

  const incomeDetail = findDepth4Detail(product.depth3, '연소득');
  if (incomeDetail) {
    const minIncome = parseMinIncome(incomeDetail);
    if (minIncome) conditions.annualIncome = { min: minIncome };
  }

  const periodDetail = findDepth4Detail(product.depth3, '재직기간');
  if (periodDetail) {
    const minPeriod = parseMinPeriod(periodDetail);
    if (minPeriod) conditions.employmentPeriod = { min: minPeriod };
  }

  const limitDetail = findDepth4Detail(product.depth3, '한도');
  if (limitDetail) {
    conditions.loanLimit = parseLoanLimit(limitDetail);
  }

  const rateDetail = findDepth4Detail(product.depth3, '금리');
  if (rateDetail) {
    conditions.interestRate = parseInterestRate(rateDetail);
  }

  const targetDetail = findDepth4Detail(product.depth3, '대상');
  if (targetDetail) {
    conditions.targetTypes = parseTargetTypes(targetDetail);
    conditions.hasInsuranceRequired = /4대.*가입/.test(targetDetail) && !/미가입/.test(targetDetail);
  }

  return conditions;
}

// ============================================
// 매칭 로직
// ============================================

export interface MatchWeights {
  age: number;
  income: number;
  employmentType: number;
  employmentPeriod: number;
  desiredAmount: number;
  creditGrade: number;
}

const DEFAULT_WEIGHTS: MatchWeights = {
  age: 20,
  income: 25,
  employmentType: 20,
  employmentPeriod: 15,
  desiredAmount: 10,
  creditGrade: 10
};

export function matchProduct(
  userConditions: ParsedConditions,
  productConditions: ProductConditions,
  weights: MatchWeights = DEFAULT_WEIGHTS
): MatchResult {
  let score = 0;
  let maxScore = 0;
  const matchedConditions: string[] = [];
  const unmatchedConditions: string[] = [];
  const unknownConditions: string[] = [];

  // 나이 매칭
  if (userConditions.age !== undefined) {
    maxScore += weights.age;
    if (productConditions.age) {
      const { min, max } = productConditions.age;
      if ((min === undefined || userConditions.age >= min) &&
          (max === undefined || userConditions.age <= max)) {
        score += weights.age;
        matchedConditions.push(`나이 ${userConditions.age}세 충족`);
      } else {
        unmatchedConditions.push(
          `나이 ${userConditions.age}세 (조건: ${min || '?'}~${max || '?'}세)`
        );
      }
    } else {
      unknownConditions.push('나이 조건 없음');
      score += weights.age * 0.5;
    }
  }

  // 연소득 매칭
  if (userConditions.annualIncome !== undefined) {
    maxScore += weights.income;
    if (productConditions.annualIncome?.min !== undefined) {
      if (userConditions.annualIncome >= productConditions.annualIncome.min) {
        score += weights.income;
        matchedConditions.push(`연소득 ${userConditions.annualIncome}만원 충족`);
      } else {
        unmatchedConditions.push(
          `연소득 ${userConditions.annualIncome}만원 미달 (최소 ${productConditions.annualIncome.min}만원)`
        );
      }
    } else {
      unknownConditions.push('연소득 조건 없음');
      score += weights.income * 0.5;
    }
  }

  // 고용형태 매칭
  if (userConditions.employmentType !== undefined) {
    maxScore += weights.employmentType;
    if (productConditions.targetTypes && productConditions.targetTypes.length > 0) {
      if (productConditions.hasInsuranceRequired &&
          userConditions.employmentType === 'employee_no_insurance') {
        unmatchedConditions.push('4대보험 가입 필요');
      } else if (productConditions.targetTypes.includes(userConditions.employmentType) ||
                 productConditions.targetTypes.includes('employee') &&
                 ['employee', 'employee_no_insurance', 'contract', 'dispatch', 'daily', 'regular', 'temporary', 'parttime'].includes(userConditions.employmentType)) {
        score += weights.employmentType;
        matchedConditions.push(`고용형태 충족`);
      } else {
        unmatchedConditions.push(`고용형태 불일치`);
      }
    } else {
      unknownConditions.push('대상 조건 불명확');
      score += weights.employmentType * 0.3;
    }
  }

  // 재직기간 매칭
  if (userConditions.employmentPeriod !== undefined) {
    maxScore += weights.employmentPeriod;
    if (productConditions.employmentPeriod?.min !== undefined) {
      if (userConditions.employmentPeriod >= productConditions.employmentPeriod.min) {
        score += weights.employmentPeriod;
        matchedConditions.push(`재직기간 ${userConditions.employmentPeriod}개월 충족`);
      } else {
        unmatchedConditions.push(
          `재직기간 ${userConditions.employmentPeriod}개월 미달 (최소 ${productConditions.employmentPeriod.min}개월)`
        );
      }
    } else {
      unknownConditions.push('재직기간 조건 없음');
      score += weights.employmentPeriod * 0.5;
    }
  }

  // 희망 대출금액 매칭
  if (userConditions.desiredAmount !== undefined) {
    maxScore += weights.desiredAmount;
    if (productConditions.loanLimit) {
      const { min, max } = productConditions.loanLimit;
      if ((min === undefined || userConditions.desiredAmount >= min) &&
          (max === undefined || userConditions.desiredAmount <= max)) {
        score += weights.desiredAmount;
        matchedConditions.push(`희망금액 ${userConditions.desiredAmount}만원 한도 내`);
      } else {
        unmatchedConditions.push(
          `희망금액 ${userConditions.desiredAmount}만원 (한도: ${min || '?'}~${max || '?'}만원)`
        );
      }
    } else {
      unknownConditions.push('한도 정보 없음');
      score += weights.desiredAmount * 0.3;
    }
  }

  const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    item_cd: productConditions.item_cd,
    product: productConditions,
    score: finalScore,
    matchedConditions,
    unmatchedConditions,
    unknownConditions
  };
}

export function findMatchingProducts(
  userConditions: ParsedConditions,
  products: any[],
  weights: MatchWeights = DEFAULT_WEIGHTS,
  minScore: number = 60
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const product of products) {
    const productConditions = extractProductConditions(product);
    const result = matchProduct(userConditions, productConditions, weights);

    if (result.score >= minScore && result.unmatchedConditions.length === 0) {
      results.push(result);
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ============================================
// 고용형태 라벨
// ============================================

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  employee: '직장인 (4대보험)',
  employee_no_insurance: '직장인 (미가입)',
  self_employed: '자영업자',
  freelancer: '프리랜서',
  ceo: '법인대표',
  housewife: '주부',
  student: '학생',
  unemployed: '무직',
  contract: '계약직',
  dispatch: '파견직',
  daily: '일용직',
  parttime: '아르바이트',
  regular: '정규직',
  temporary: '상용직',
  other: '기타'
};
