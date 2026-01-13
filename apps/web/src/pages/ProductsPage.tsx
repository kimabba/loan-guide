import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductCard } from "../components/products/ProductCard";
import { ProductFilter } from "../components/products/ProductFilter";
import { CompareBar } from "../components/products/CompareBar";
import { CompareModal } from "../components/products/CompareModal";
import { GuideModal } from "../components/GuideModal";
import { useFavoritesStore } from "../lib/favorites";
import { useCompareStore } from "../lib/compare";

interface Product {
  item_cd: string;
  pfi_name: string;
  depth1: string;
  depth2: string;
  fi_memo: string;
}

type ViewMode = "all" | "favorites";

// 더미 데이터 (실제 대출가이드 데이터에서 추출한 100개 상품)
const DUMMY_PRODUCTS: Product[] = [
  {
    item_cd: "1",
    pfi_name: "OK저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo:
      "4대가입 직장인, 법인대표 접수 가능\r\n(불가 직군 없는 금융사 / 만기일시 진행시 중수료 면제)",
  },
  {
    item_cd: "2",
    pfi_name: "OK저축은행",
    depth1: "저축은행",
    depth2: "신용대출(미가입)",
    fi_memo:
      "3개월 이상 통장에 소득 확인되는 미가입 직장인\r\n(불가 직군 없는 금융사 / 만기일시 진행시 중수료 면제)",
  },
  {
    item_cd: "3",
    pfi_name: "OK저축은행",
    depth1: "저축은행",
    depth2: "신용대출(프리랜서)",
    fi_memo:
      "6개월 이상 통장에 소득 확인되는 3.3% 소득 공제 프리랜서\r\n(월급, 주급, 일급 인정되고, 불가 직군 없는 금융사 / 만기일시 진행시 중수료 면제)",
  },
  {
    item_cd: "4",
    pfi_name: "OK저축은행",
    depth1: "저축은행",
    depth2: "신용대출(개인사업자)",
    fi_memo:
      "개인사업자, 공동사업자 진행가능\r\n(소득 1가지라도 확인시 진행 가능/ 공동 사업자 경우 지분율 상관없이 진행 차주 서류로만 진행)",
  },
  {
    item_cd: "5",
    pfi_name: "OK저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대보험 가입자만 진행가능\r\n(※통장진행불가)",
  },
  {
    item_cd: "6",
    pfi_name: "OK저축은행",
    depth1: "저축은행",
    depth2: "하우스론(본인명의)",
    fi_memo:
      "아파트 소유중인 4대가입, 법인대표 진행가능\r\n개인설정 있어도 진행가능",
  },
  {
    item_cd: "7",
    pfi_name: "애큐온저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo:
      "4대가입 직장인 , 법인대표 진행가능\r\n(* DSR오바 되더라도 신규or대환 한도 발생만 되면 중 한가지 상품으로 자동 진행 가능)",
  },
  {
    item_cd: "8",
    pfi_name: "애큐온저축은행",
    depth1: "저축은행",
    depth2: "신용대출(미가입)",
    fi_memo: "소득인정 3개월 이상 미가입 직장인\r\n* 입사후 적립금 3개월 이상",
  },
  {
    item_cd: "9",
    pfi_name: "애큐온저축은행",
    depth1: "저축은행",
    depth2: "신용대출(프리랜서)",
    fi_memo: "소득인정 6개월 통장 프리랜서\r\n당사기준 부당업종 제외",
  },
  {
    item_cd: "10",
    pfi_name: "애큐온저축은행",
    depth1: "저축은행",
    depth2: "신용대출(개인사업자)",
    fi_memo: "개인사업자(1년이상 영업중)\r\n공동사업자(상관없음)",
  },
  {
    item_cd: "11",
    pfi_name: "애큐온저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대가입 직장인만 진행\r\n통장, 신분증만 으로도 진행 가능",
  },
  {
    item_cd: "12",
    pfi_name: "애큐온저축은행",
    depth1: "저축은행",
    depth2: "오토론",
    fi_memo:
      "신차 및 중고차 구매\r\n당사 출장서비스 부산지역까지 운영중(운영팀 협의후 진행)",
  },
  {
    item_cd: "13",
    pfi_name: "고려저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대 보험 가입자\r\n(은행 계좌 필수, 우리은행 계좌 필수)",
  },
  {
    item_cd: "14",
    pfi_name: "고려저축은행",
    depth1: "저축은행",
    depth2: "신용대출(미가입)",
    fi_memo: "3개월이상 소득확인 미가입자\r\n(은행계좌필수, 우리은행계좌필수)",
  },
  {
    item_cd: "15",
    pfi_name: "고려저축은행",
    depth1: "저축은행",
    depth2: "신용대출(프리랜서)",
    fi_memo: "프리랜서\r\n(소득확인 6개월, 은행계좌필수, 우리은행계좌필수)",
  },
  {
    item_cd: "16",
    pfi_name: "고려저축은행",
    depth1: "저축은행",
    depth2: "신용대출(개인사업자)",
    fi_memo: "개인사업자, 공동사업자\r\n(은행계좌필수, 우리은행계좌필수)",
  },
  {
    item_cd: "17",
    pfi_name: "고려저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대 보험 가입자\r\n(은행 계좌 필수, 우리은행 계좌 필수)",
  },
  {
    item_cd: "18",
    pfi_name: "SBI저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo:
      "4대가입 직장인, 법인대표\r\n신규/대환 관계없이 진행가능(전 금융권 가능)",
  },
  {
    item_cd: "19",
    pfi_name: "SBI저축은행",
    depth1: "저축은행",
    depth2: "신용대출(미가입)",
    fi_memo: "미가입 직장인(소득 3개월이상)\r\n신규/대환 관계없이 진행가능",
  },
  {
    item_cd: "20",
    pfi_name: "SBI저축은행",
    depth1: "저축은행",
    depth2: "신용대출(프리랜서)",
    fi_memo: "프리랜서(소득 6개월이상)\r\n신규/대환 관계없이 진행가능",
  },
  {
    item_cd: "21",
    pfi_name: "SBI저축은행",
    depth1: "저축은행",
    depth2: "신용대출(개인사업자)",
    fi_memo: "개인사업자, 공동사업자\r\n신규/대환 관계없이 진행가능",
  },
  {
    item_cd: "22",
    pfi_name: "SBI저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 관계없이 진행가능",
  },
  {
    item_cd: "23",
    pfi_name: "SBI저축은행",
    depth1: "저축은행",
    depth2: "사잇돌",
    fi_memo: "저소득층 근로자 대상 정책금융\r\n신규/대환 관계없이 진행가능",
  },
  {
    item_cd: "24",
    pfi_name: "JT저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인, 법인대표\r\n진행가능",
  },
  {
    item_cd: "25",
    pfi_name: "JT저축은행",
    depth1: "저축은행",
    depth2: "신용대출(미가입)",
    fi_memo: "미가입 직장인(소득 3개월이상)\r\n진행가능",
  },
  {
    item_cd: "26",
    pfi_name: "JT저축은행",
    depth1: "저축은행",
    depth2: "신용대출(프리랜서)",
    fi_memo: "프리랜서(소득 6개월이상)\r\n진행가능",
  },
  {
    item_cd: "27",
    pfi_name: "JT저축은행",
    depth1: "저축은행",
    depth2: "신용대출(개인사업자)",
    fi_memo: "개인사업자, 공동사업자\r\n진행가능",
  },
  {
    item_cd: "28",
    pfi_name: "JT저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대가입 직장인\r\n정책금융 상품",
  },
  {
    item_cd: "29",
    pfi_name: "IBK저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대보험 가입 직장인 및 법인대표\r\n업체검색 필수",
  },
  {
    item_cd: "30",
    pfi_name: "IBK저축은행",
    depth1: "저축은행",
    depth2: "신용대출(미가입)",
    fi_memo: "미가입 직장인(통장소득 3개월)\r\n업체검색 필수",
  },
  {
    item_cd: "31",
    pfi_name: "IBK저축은행",
    depth1: "저축은행",
    depth2: "신용대출(프리랜서)",
    fi_memo: "프리랜서(통장소득 6개월)\r\n업체검색 필수",
  },
  {
    item_cd: "32",
    pfi_name: "IBK저축은행",
    depth1: "저축은행",
    depth2: "신용대출(개인사업자)",
    fi_memo: "개인사업자 및 공동사업자\r\n업체검색 필수",
  },
  {
    item_cd: "33",
    pfi_name: "IBK저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대보험 가입 직장인\r\n정책금융 상품",
  },
  {
    item_cd: "34",
    pfi_name: "OSB저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인, 법인대표\r\n신규/대환 가능",
  },
  {
    item_cd: "35",
    pfi_name: "OSB저축은행",
    depth1: "저축은행",
    depth2: "신용대출(미가입)",
    fi_memo: "미가입 직장인(소득 3개월이상)\r\n신규/대환 가능",
  },
  {
    item_cd: "36",
    pfi_name: "OSB저축은행",
    depth1: "저축은행",
    depth2: "신용대출(프리랜서)",
    fi_memo: "프리랜서(소득 6개월이상)\r\n신규/대환 가능",
  },
  {
    item_cd: "37",
    pfi_name: "OSB저축은행",
    depth1: "저축은행",
    depth2: "신용대출(개인사업자)",
    fi_memo: "개인사업자, 공동사업자\r\n신규/대환 가능",
  },
  {
    item_cd: "38",
    pfi_name: "OSB저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대가입 직장인\r\n정책금융 상품",
  },
  {
    item_cd: "39",
    pfi_name: "다올저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인, 법인대표\r\n(은행계좌필수 - NH농협)",
  },
  {
    item_cd: "40",
    pfi_name: "다올저축은행",
    depth1: "저축은행",
    depth2: "신용대출(미가입)",
    fi_memo: "미가입 직장인(통장소득 3개월)\r\n(은행계좌필수 - NH농협)",
  },
  {
    item_cd: "41",
    pfi_name: "다올저축은행",
    depth1: "저축은행",
    depth2: "신용대출(프리랜서)",
    fi_memo: "프리랜서(통장소득 6개월)\r\n(은행계좌필수 - NH농협)",
  },
  {
    item_cd: "42",
    pfi_name: "다올저축은행",
    depth1: "저축은행",
    depth2: "신용대출(개인사업자)",
    fi_memo: "개인사업자, 공동사업자\r\n(은행계좌필수 - NH농협)",
  },
  {
    item_cd: "43",
    pfi_name: "다올저축은행",
    depth1: "저축은행",
    depth2: "사잇돌(4대가입)",
    fi_memo: "4대가입 직장인\r\n정책금융 사잇돌 상품",
  },
  {
    item_cd: "44",
    pfi_name: "다올저축은행",
    depth1: "저축은행",
    depth2: "사잇돌(미가입)",
    fi_memo: "미가입 직장인\r\n정책금융 사잇돌 상품",
  },
  {
    item_cd: "45",
    pfi_name: "동양저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인, 법인대표\r\n(통장필수, 하나은행 계좌 필수)",
  },
  {
    item_cd: "46",
    pfi_name: "동양저축은행",
    depth1: "저축은행",
    depth2: "신용대출(개인회생)",
    fi_memo: "개인회생 중 또는 면책자\r\n(통장필수, 하나은행 계좌 필수)",
  },
  {
    item_cd: "47",
    pfi_name: "동원제일저축은행",
    depth1: "저축은행",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융\r\n(업체검색 필수)",
  },
  {
    item_cd: "48",
    pfi_name: "모아상호저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인, 법인대표\r\n(통장필수, 신협 계좌)",
  },
  {
    item_cd: "49",
    pfi_name: "모아상호저축은행",
    depth1: "저축은행",
    depth2: "신용대출(미가입)",
    fi_memo: "미가입 직장인(소득 3개월)\r\n(통장필수, 신협 계좌)",
  },
  {
    item_cd: "50",
    pfi_name: "모아상호저축은행",
    depth1: "저축은행",
    depth2: "신용대출(프리랜서)",
    fi_memo: "프리랜서(소득 6개월)\r\n(통장필수, 신협 계좌)",
  },
  {
    item_cd: "51",
    pfi_name: "모아상호저축은행",
    depth1: "저축은행",
    depth2: "신용대출(주부론)",
    fi_memo: "주부 전용 상품\r\n(통장필수, 신협 계좌)",
  },
  {
    item_cd: "52",
    pfi_name: "모아상호저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대가입 직장인\r\n정책금융 상품",
  },
  {
    item_cd: "53",
    pfi_name: "삼일저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대가입 직장인\r\n정책금융 상품",
  },
  {
    item_cd: "54",
    pfi_name: "삼일저축은행",
    depth1: "저축은행",
    depth2: "햇살론(미가입)",
    fi_memo: "미가입 직장인\r\n정책금융 상품",
  },
  {
    item_cd: "55",
    pfi_name: "삼호저축은행",
    depth1: "저축은행",
    depth2: "신용대출(청년론)",
    fi_memo: "만 34세 이하 청년\r\n청년특화 상품",
  },
  {
    item_cd: "56",
    pfi_name: "삼호저축은행",
    depth1: "저축은행",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융\r\n(업체검색 필수)",
  },
  {
    item_cd: "57",
    pfi_name: "상상인저축은행",
    depth1: "저축은행",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융\r\n경쟁력 있는 금리",
  },
  {
    item_cd: "58",
    pfi_name: "상상인플러스",
    depth1: "저축은행",
    depth2: "신용대출(청년론)",
    fi_memo: "만 34세 이하 청년\r\n청년특화 상품",
  },
  {
    item_cd: "59",
    pfi_name: "상상인플러스",
    depth1: "저축은행",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융\r\n(업체검색 필수)",
  },
  {
    item_cd: "60",
    pfi_name: "세람저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인, 법인대표\r\n(신용카드 소유자 우대)",
  },
  {
    item_cd: "61",
    pfi_name: "세람저축은행",
    depth1: "저축은행",
    depth2: "신용대출(개인회생)",
    fi_memo: "개인회생 중 또는 면책자\r\n(신용카드 소유자 우대)",
  },
  {
    item_cd: "62",
    pfi_name: "스마트저축은행",
    depth1: "저축은행",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융\r\n(업체검색 필수)",
  },
  {
    item_cd: "63",
    pfi_name: "예가람저축은행",
    depth1: "저축은행",
    depth2: "사잇돌(4대가입)",
    fi_memo: "4대가입 직장인\r\n정책금융 사잇돌",
  },
  {
    item_cd: "64",
    pfi_name: "예가람저축은행",
    depth1: "저축은행",
    depth2: "사잇돌(개인사업자)",
    fi_memo: "개인사업자\r\n정책금융 사잇돌",
  },
  {
    item_cd: "65",
    pfi_name: "예가람저축은행",
    depth1: "저축은행",
    depth2: "사잇돌(프리랜서)",
    fi_memo: "프리랜서\r\n정책금융 사잇돌",
  },
  {
    item_cd: "66",
    pfi_name: "예가람저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n(은행계좌필수 - 경남은행)",
  },
  {
    item_cd: "67",
    pfi_name: "예가람저축은행",
    depth1: "저축은행",
    depth2: "신용대출(미가입)",
    fi_memo: "미가입 직장인\r\n(은행계좌필수 - 경남은행)",
  },
  {
    item_cd: "68",
    pfi_name: "예가람저축은행",
    depth1: "저축은행",
    depth2: "신용대출(프리랜서)",
    fi_memo: "프리랜서\r\n(은행계좌필수 - 경남은행)",
  },
  {
    item_cd: "69",
    pfi_name: "예가람저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대가입 직장인\r\n정책금융 상품",
  },
  {
    item_cd: "70",
    pfi_name: "우리금융저축은행",
    depth1: "저축은행",
    depth2: "햇살론(4대가입)",
    fi_memo: "4대가입 직장인\r\n정책금융 상품",
  },
  {
    item_cd: "71",
    pfi_name: "웰컴저축은행",
    depth1: "저축은행",
    depth2: "사잇돌(4대가입)",
    fi_memo: "4대가입 직장인\r\n정책금융 사잇돌",
  },
  {
    item_cd: "72",
    pfi_name: "KB캐피탈",
    depth1: "캐피탈",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매를 위한 자동차 금융 상품",
  },
  {
    item_cd: "73",
    pfi_name: "현대캐피탈",
    depth1: "캐피탈",
    depth2: "오토론",
    fi_memo: "합리적인 금리로 차량 구매를 지원하는 자동차 할부금융",
  },
  {
    item_cd: "74",
    pfi_name: "우리금융캐피탈",
    depth1: "캐피탈",
    depth2: "신용대출",
    fi_memo: "신용도를 바탕으로 한 간편한 신용대출 상품",
  },
  {
    item_cd: "75",
    pfi_name: "하나캐피탈",
    depth1: "캐피탈",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융",
  },
  {
    item_cd: "76",
    pfi_name: "롯데캐피탈",
    depth1: "캐피탈",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융",
  },
  {
    item_cd: "77",
    pfi_name: "한국캐피탈",
    depth1: "캐피탈",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융",
  },
  {
    item_cd: "78",
    pfi_name: "한국투자캐피탈",
    depth1: "캐피탈",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융",
  },
  {
    item_cd: "79",
    pfi_name: "BNK캐피탈",
    depth1: "캐피탈",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융",
  },
  {
    item_cd: "80",
    pfi_name: "IM캐피탈",
    depth1: "캐피탈",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융",
  },
  {
    item_cd: "81",
    pfi_name: "JB우리캐피탈",
    depth1: "캐피탈",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융",
  },
  {
    item_cd: "82",
    pfi_name: "NH농협캐피탈",
    depth1: "캐피탈",
    depth2: "오토론",
    fi_memo: "신차 및 중고차 구매 금융",
  },
  {
    item_cd: "83",
    pfi_name: "도이치캐피탈",
    depth1: "대부",
    depth2: "오토론",
    fi_memo: "신차 구매를 위한 전문화된 오토론 상품",
  },
  {
    item_cd: "84",
    pfi_name: "드림앤캐쉬대부",
    depth1: "대부",
    depth2: "오토론",
    fi_memo: "빠른 심사와 실행이 특징인 자동차 금융",
  },
  {
    item_cd: "85",
    pfi_name: "리드코프",
    depth1: "대부",
    depth2: "오토론",
    fi_memo: "경쟁력 있는 자동차 금융",
  },
  {
    item_cd: "86",
    pfi_name: "바로대부",
    depth1: "대부",
    depth2: "오토론",
    fi_memo: "빠른 실행 자동차 금융",
  },
  {
    item_cd: "87",
    pfi_name: "안전대부",
    depth1: "대부",
    depth2: "오토론",
    fi_memo: "안정적인 자동차 금융",
  },
  {
    item_cd: "88",
    pfi_name: "어드밴스미래대부",
    depth1: "대부",
    depth2: "오토론",
    fi_memo: "미래형 자동차 금융",
  },
  {
    item_cd: "89",
    pfi_name: "에이원대부",
    depth1: "대부",
    depth2: "오토론",
    fi_memo: "프리미엄 자동차 금융",
  },
  {
    item_cd: "90",
    pfi_name: "유미캐피탈",
    depth1: "대부",
    depth2: "연계대출-대부",
    fi_memo: "대부업체 연계 대출 상품",
  },
  {
    item_cd: "91",
    pfi_name: "유안타저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 진행가능",
  },
  {
    item_cd: "92",
    pfi_name: "융창저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 진행가능",
  },
  {
    item_cd: "93",
    pfi_name: "청주저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 진행가능",
  },
  {
    item_cd: "94",
    pfi_name: "친애저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 진행가능",
  },
  {
    item_cd: "95",
    pfi_name: "키움저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 진행가능",
  },
  {
    item_cd: "96",
    pfi_name: "키움YES저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 진행가능",
  },
  {
    item_cd: "97",
    pfi_name: "페퍼저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 진행가능",
  },
  {
    item_cd: "98",
    pfi_name: "한국투자저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 진행가능",
  },
  {
    item_cd: "99",
    pfi_name: "한성저축은행",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 진행가능",
  },
  {
    item_cd: "100",
    pfi_name: "페이직",
    depth1: "저축은행",
    depth2: "신용대출(4대가입)",
    fi_memo: "4대가입 직장인\r\n신규/대환 진행가능",
  },
];

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || []
  );
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>(
    searchParams.get("types")?.split(",").filter(Boolean) || []
  );
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    searchParams.get("companies")?.split(",").filter(Boolean) || []
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get("view") as ViewMode) || "all"
  );
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const { favorites } = useFavoritesStore();
  const { compareList } = useCompareStore();

  // 상품 목록 로드
  useEffect(() => {
    setLoading(true);

    // API 엔드포인트 시도
    fetch("/api/guides")
      .then((res) => {
        if (!res.ok) throw new Error("API failed");
        return res.json();
      })
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        // API가 없으면 더미 데이터 사용
        console.log("Using dummy data - API not available");
        setProducts(DUMMY_PRODUCTS);
        setLoading(false);
      });
  }, []);

  // URL 파라미터 동기화
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedCategories.length)
      params.set("categories", selectedCategories.join(","));
    if (selectedProductTypes.length)
      params.set("types", selectedProductTypes.join(","));
    if (selectedCompanies.length)
      params.set("companies", selectedCompanies.join(","));
    if (viewMode !== "all") params.set("view", viewMode);
    setSearchParams(params, { replace: true });
  }, [
    search,
    selectedCategories,
    selectedProductTypes,
    selectedCompanies,
    viewMode,
    setSearchParams,
  ]);

  // 필터 옵션 계산
  const filterOptions = useMemo(() => {
    const categoryMap = new Map<string, number>();
    const productTypeMap = new Map<string, number>();
    const companyMap = new Map<string, number>();

    products.forEach((p) => {
      categoryMap.set(p.depth1, (categoryMap.get(p.depth1) || 0) + 1);
      productTypeMap.set(p.depth2, (productTypeMap.get(p.depth2) || 0) + 1);
      companyMap.set(p.pfi_name, (companyMap.get(p.pfi_name) || 0) + 1);
    });

    return {
      categories: Array.from(categoryMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      productTypes: Array.from(productTypeMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      companies: Array.from(companyMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [products]);

  // 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    let result = products;

    // 즐겨찾기 모드
    if (viewMode === "favorites") {
      result = result.filter((p) => favorites.includes(p.item_cd));
    }

    // 검색어 필터
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.pfi_name.toLowerCase().includes(searchLower) ||
          p.depth1.toLowerCase().includes(searchLower) ||
          p.depth2.toLowerCase().includes(searchLower) ||
          p.fi_memo?.toLowerCase().includes(searchLower)
      );
    }

    // 카테고리 필터
    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.depth1));
    }

    // 상품유형 필터
    if (selectedProductTypes.length > 0) {
      result = result.filter((p) => selectedProductTypes.includes(p.depth2));
    }

    // 금융사 필터
    if (selectedCompanies.length > 0) {
      result = result.filter((p) => selectedCompanies.includes(p.pfi_name));
    }

    return result;
  }, [
    products,
    viewMode,
    favorites,
    search,
    selectedCategories,
    selectedProductTypes,
    selectedCompanies,
  ]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleProductTypeChange = (productType: string) => {
    setSelectedProductTypes((prev) =>
      prev.includes(productType)
        ? prev.filter((t) => t !== productType)
        : [...prev, productType]
    );
  };

  const handleCompanyChange = (company: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(company)
        ? prev.filter((c) => c !== company)
        : [...prev, company]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedProductTypes([]);
    setSelectedCompanies([]);
    setSearch("");
  };

  const compareProducts = products
    .filter((p) => compareList.includes(p.item_cd))
    .map((p) => ({
      itemCd: p.item_cd,
      company: p.pfi_name,
      productType: p.depth2,
    }));

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background pb-20">
      {/* 상세 모달 */}
      <GuideModal
        itemCd={selectedGuide}
        onClose={() => setSelectedGuide(null)}
      />

      {/* 비교 모달 */}
      <CompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
      />

      {/* 헤더 영역 */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                대출 상품 탐색
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredProducts.length}개 상품{" "}
                {products.length !== filteredProducts.length &&
                  `(전체 ${products.length}개)`}
              </p>
            </div>

            {/* 뷰 모드 토글 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("all")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                전체 상품
              </button>
              <button
                onClick={() => setViewMode("favorites")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === "favorites"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                즐겨찾기 ({favorites.length})
              </button>
            </div>
          </div>

          {/* 검색창 */}
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="금융사명, 상품명, 키워드 검색..."
                className="w-full rounded-lg border bg-background px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* 필터 토글 버튼 (모바일) */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="mt-4 flex w-full items-center justify-between rounded-lg border bg-background px-4 py-2 text-sm sm:hidden"
          >
            <span className="font-medium">필터</span>
            <span className="text-muted-foreground">
              {selectedCategories.length +
                selectedProductTypes.length +
                selectedCompanies.length >
              0
                ? `${
                    selectedCategories.length +
                    selectedProductTypes.length +
                    selectedCompanies.length
                  }개 선택`
                : "선택 없음"}
            </span>
          </button>

          {/* 필터 영역 */}
          <div className={`mt-4 ${filterOpen ? "block" : "hidden"} sm:block`}>
            <ProductFilter
              categories={filterOptions.categories}
              productTypes={filterOptions.productTypes}
              companies={filterOptions.companies}
              selectedCategories={selectedCategories}
              selectedProductTypes={selectedProductTypes}
              selectedCompanies={selectedCompanies}
              onCategoryChange={handleCategoryChange}
              onProductTypeChange={handleProductTypeChange}
              onCompanyChange={handleCompanyChange}
              onClearAll={clearAllFilters}
            />
          </div>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="mb-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <h3 className="mb-2 text-lg font-medium text-foreground">
              {viewMode === "favorites"
                ? "즐겨찾기한 상품이 없습니다"
                : "검색 결과가 없습니다"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {viewMode === "favorites"
                ? "상품 카드의 별 아이콘을 눌러 즐겨찾기에 추가해보세요"
                : "다른 검색어나 필터를 시도해보세요"}
            </p>
            {(selectedCategories.length > 0 ||
              selectedProductTypes.length > 0 ||
              selectedCompanies.length > 0 ||
              search) && (
              <button
                onClick={clearAllFilters}
                className="mt-4 text-sm text-primary hover:underline"
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.item_cd}
                itemCd={product.item_cd}
                company={product.pfi_name}
                category={product.depth1}
                productType={product.depth2}
                summary={product.fi_memo || ""}
                onClick={() => setSelectedGuide(product.item_cd)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 비교 바 */}
      <CompareBar
        products={compareProducts}
        onCompare={() => setCompareModalOpen(true)}
      />
    </div>
  );
}
