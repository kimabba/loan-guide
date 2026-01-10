#!/usr/bin/env python3
"""
JSON 대출 가이드를 마크다운 파일로 변환
하이브리드 방식: 금융사별 디렉토리 + 상품별 마크다운 + 인덱스 JSON
"""
import json
import os
import re
from pathlib import Path

INPUT_FILE = "loan_guides.json"
OUTPUT_DIR = "guides"

def sanitize_filename(name):
    """파일명에 사용할 수 없는 문자 제거"""
    # 특수문자 제거/치환
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    # 괄호를 하이픈으로 변환
    name = name.replace('(', '-').replace(')', '')
    name = re.sub(r'-+', '-', name).strip('-')
    return name

def format_detail_text(text):
    """상세 내용 텍스트 포맷팅"""
    if not text:
        return ""
    # \r\n을 줄바꿈으로
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    # 여러 줄을 <br>로 변환 (테이블 내에서 사용)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return '<br>'.join(lines)

def create_markdown_content(item):
    """상품 데이터를 마크다운 형식으로 변환"""

    # Front matter
    item_cd = item.get('item_cd', '')
    company = item.get('pfi_name', '알 수 없음')
    product_type = item.get('depth2', '알 수 없음')
    updated = item.get('updated_dt', '')[:10] if item.get('updated_dt') else ''
    category = item.get('depth1', '')

    md = f"""---
item_cd: {item_cd}
금융사: {company}
카테고리: {category}
상품유형: {product_type}
수정일: {updated}
---

# {company} - {product_type}

"""

    # 메모 (설명)
    memo = item.get('fi_memo', '')
    if memo:
        memo_lines = memo.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        memo_lines = [f"> {line.strip()}" for line in memo_lines if line.strip()]
        md += '\n'.join(memo_lines) + '\n\n'

    # depth3 섹션들 처리
    depth3_list = item.get('depth3', [])

    # 섹션 순서 정의
    section_order = [
        '기본내용', '상품정보', '근무형태', '재직확인', '구비서류',
        '조회/인증', '접수방식', '세부기준1', '세부기준2',
        '소득관련', '업종관련', '차량정보', '물건지 조건',
        '특이사항', '수수료', '심사관련', '금융사팁', '백과사전',
        '6.27금융정책(한도규제)'
    ]

    # depth3를 딕셔너리로 변환
    sections = {}
    for d3 in depth3_list:
        section_name = d3.get('depth3_name', '')
        if section_name:
            sections[section_name] = d3.get('depth4_key', [])

    # 순서대로 섹션 출력
    for section_name in section_order:
        if section_name in sections:
            items = sections[section_name]
            if items:
                md += f"## {section_name}\n\n"
                md += "| 항목 | 내용 |\n"
                md += "|------|------|\n"

                for d4 in items:
                    field_name = d4.get('depth4_name', '')
                    detail = format_detail_text(d4.get('detail', ''))
                    if field_name and detail:
                        # 테이블 셀에서 파이프 문자 이스케이프
                        detail = detail.replace('|', '\\|')
                        md += f"| {field_name} | {detail} |\n"

                md += "\n"

    # 정의되지 않은 섹션도 출력
    for section_name, items in sections.items():
        if section_name not in section_order and items:
            md += f"## {section_name}\n\n"
            md += "| 항목 | 내용 |\n"
            md += "|------|------|\n"

            for d4 in items:
                field_name = d4.get('depth4_name', '')
                detail = format_detail_text(d4.get('detail', ''))
                if field_name and detail:
                    detail = detail.replace('|', '\\|')
                    md += f"| {field_name} | {detail} |\n"

            md += "\n"

    return md

def create_index(items):
    """검색/필터용 인덱스 JSON 생성"""
    index = {
        "meta": {
            "total_count": len(items),
            "generated_at": "",
            "categories": [],
            "product_types": [],
            "companies": []
        },
        "items": []
    }

    categories = set()
    product_types = set()
    companies = set()

    for item in items:
        company = item.get('pfi_name', '')
        category = item.get('depth1', '')
        product_type = item.get('depth2', '')

        categories.add(category)
        product_types.add(product_type)
        companies.add(company)

        # 파일 경로 생성
        company_safe = sanitize_filename(company)
        product_safe = sanitize_filename(product_type)
        file_path = f"{category}/{company_safe}/{product_safe}.md"

        index["items"].append({
            "item_cd": item.get('item_cd', ''),
            "company": company,
            "category": category,
            "product_type": product_type,
            "memo": item.get('fi_memo', '')[:100] + '...' if len(item.get('fi_memo', '')) > 100 else item.get('fi_memo', ''),
            "updated": item.get('updated_dt', '')[:10] if item.get('updated_dt') else '',
            "file_path": file_path
        })

    index["meta"]["categories"] = sorted(list(categories))
    index["meta"]["product_types"] = sorted(list(product_types))
    index["meta"]["companies"] = sorted(list(companies))

    from datetime import datetime
    index["meta"]["generated_at"] = datetime.now().isoformat()

    return index

def main():
    print("=" * 60)
    print("JSON → 마크다운 변환 시작")
    print("=" * 60)

    # JSON 로드
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"로드된 상품 수: {len(data)}개")

    # 출력 디렉토리 생성
    output_path = Path(OUTPUT_DIR)
    if output_path.exists():
        import shutil
        shutil.rmtree(output_path)
    output_path.mkdir(parents=True)

    # 통계
    created_files = 0
    errors = []

    for item in data:
        try:
            company = item.get('pfi_name', '알 수 없음')
            category = item.get('depth1', '기타')
            product_type = item.get('depth2', '기타')

            # 디렉토리 생성
            company_safe = sanitize_filename(company)
            product_safe = sanitize_filename(product_type)

            dir_path = output_path / category / company_safe
            dir_path.mkdir(parents=True, exist_ok=True)

            # 마크다운 파일 생성
            file_path = dir_path / f"{product_safe}.md"
            md_content = create_markdown_content(item)

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(md_content)

            created_files += 1
            print(f"[{created_files:3d}] ✓ {category}/{company_safe}/{product_safe}.md")

        except Exception as e:
            errors.append(f"{company} - {product_type}: {str(e)}")
            print(f"[ERR] ✗ {company} - {product_type}: {e}")

    # 인덱스 파일 생성
    print("\n인덱스 파일 생성 중...")
    index = create_index(data)

    with open(output_path / "_index.json", 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"✓ _index.json 생성 완료")

    # 결과 요약
    print("\n" + "=" * 60)
    print("변환 완료!")
    print("=" * 60)
    print(f"생성된 마크다운 파일: {created_files}개")
    print(f"오류: {len(errors)}개")
    print(f"출력 디렉토리: {OUTPUT_DIR}/")

    # 디렉토리 구조 출력
    print("\n디렉토리 구조:")
    for category_dir in sorted(output_path.iterdir()):
        if category_dir.is_dir():
            company_count = sum(1 for _ in category_dir.iterdir() if _.is_dir())
            file_count = sum(1 for c in category_dir.iterdir() if c.is_dir() for _ in c.glob('*.md'))
            print(f"  📁 {category_dir.name}/ ({company_count}개 금융사, {file_count}개 파일)")

    if errors:
        print("\n오류 목록:")
        for err in errors:
            print(f"  - {err}")

if __name__ == "__main__":
    main()
