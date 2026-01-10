#!/usr/bin/env python3
"""
대출 상품 가이드 스크래퍼
http://gls.anrcomms.com에서 대출 상품 정보를 수집하여 JSON으로 저장
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re

# 설정
AJAX_URL = "http://gls.anrcomms.com/product/filteringView/new_filtering_view"
COOKIE = {"ci_session": "v0d48ttiue7notio5e81k0n7p59sbhgk"}
DELAY = 0.5  # 요청 사이 딜레이 (초)
OUTPUT_FILE = "loan_guides.json"

def parse_product_data(data_item):
    """JSON 데이터에서 상품 정보 추출"""
    product = {}

    # 기본 필드 매핑 (JSON 키 -> 한글 필드명)
    field_mapping = {
        'item_cd': 'item_cd',
        'fn_name': '금융사',
        'item_name': '상품명',
        'update_date': '수정일',
        'status': '상태',
        'status_name': '상태',

        # 기본내용
        'target': '대상',
        'area': '지역',
        'age': '연령',
        'work_period': '재직기간',
        'income': '연소득',
        'company_size': '직장규모',

        # 상품정보
        'limit_amt': '한도',
        'interest_rate': '금리',
        'repay_period': '상환기간',
        'repay_method': '상환방식',
        'early_repay_fee': '중도상환수수료',

        # 근무형태
        'contract_worker': '계약직',
        'dispatch_worker': '파견직',
        'regular_worker': '상용직',
        'daily_worker': '일용직',
        'part_time': '아르바이트',

        # 재직확인
        'work_verify': '재직확인방식',
        'company_search': '업체검색',
        'four_insurance': '4대확인',

        # 구비서류
        'basic_doc': '기본서류',
        'work_doc': '재직서류',
        'income_doc': '소득서류',

        # 기타
        'verify_auth': '조회/인증',
        'apply_method': '접수방식',
        'detail1': '세부기준1',
        'detail2': '세부기준2',
        'special_note': '특이사항',
        'fee': '수수료',
        'review_info': '심사관련',
    }

    # 모든 필드 추출
    for eng_key, kor_key in field_mapping.items():
        if eng_key in data_item and data_item[eng_key]:
            value = data_item[eng_key]
            if isinstance(value, str):
                value = value.strip()
            if value:
                product[kor_key] = value

    # 나머지 알려지지 않은 필드도 저장
    known_keys = set(field_mapping.keys())
    for key, value in data_item.items():
        if key not in known_keys and value:
            if isinstance(value, str):
                value = value.strip()
            if value and key not in ['fn_image_name', 'created_at', 'deleted_at']:
                product[key] = value

    return product

def scrape_loan_guides():
    """모든 대출 상품 가이드 스크래핑"""
    products = []
    success_count = 0
    fail_count = 0

    print("=" * 60)
    print("대출 상품 가이드 스크래퍼 시작")
    print("=" * 60)

    session = requests.Session()
    session.cookies.update(COOKIE)
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'http://gls.anrcomms.com',
        'Referer': 'http://gls.anrcomms.com/product/filteringView/filteringDetailPopup',
    })

    for item_cd in range(1, 201):
        try:
            # AJAX POST 요청
            response = session.post(
                AJAX_URL,
                data={'item_cd': json.dumps(item_cd)},
                timeout=10
            )

            if response.status_code == 200:
                try:
                    result = response.json()

                    if result and 'data' in result and result['data']:
                        data_list = result['data']
                        if isinstance(data_list, list) and len(data_list) > 0:
                            product = parse_product_data(data_list[0])

                            if product and len(product) > 1:
                                products.append(product)
                                success_count += 1
                                product_name = product.get('상품명', '알 수 없음')
                                company = product.get('금융사', '알 수 없음')
                                print(f"[{item_cd:3d}/200] ✓ {company} - {product_name}")
                            else:
                                fail_count += 1
                                print(f"[{item_cd:3d}/200] - 빈 데이터")
                        else:
                            fail_count += 1
                            print(f"[{item_cd:3d}/200] - 데이터 없음")
                    else:
                        fail_count += 1
                        print(f"[{item_cd:3d}/200] - 응답 없음")

                except json.JSONDecodeError:
                    fail_count += 1
                    print(f"[{item_cd:3d}/200] ✗ JSON 파싱 오류")
            else:
                fail_count += 1
                print(f"[{item_cd:3d}/200] ✗ HTTP {response.status_code}")

        except requests.exceptions.RequestException as e:
            fail_count += 1
            print(f"[{item_cd:3d}/200] ✗ 오류: {str(e)[:50]}")

        time.sleep(DELAY)

    # 결과 저장
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    print("=" * 60)
    print(f"스크래핑 완료!")
    print(f"- 성공: {success_count}개")
    print(f"- 실패/빈 페이지: {fail_count}개")
    print(f"- 저장 파일: {OUTPUT_FILE}")
    print("=" * 60)

    return products

if __name__ == "__main__":
    scrape_loan_guides()
