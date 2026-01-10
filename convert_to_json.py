#!/usr/bin/env python3
"""
마크다운 대출 가이드를 JSON으로 역변환
수정된 마크다운 파일들을 다시 JSON 형식으로 변환
"""
import json
import os
import re
from pathlib import Path
import yaml

INPUT_DIR = "guides"
OUTPUT_FILE = "loan_guides_updated.json"

def parse_front_matter(content):
    """YAML front matter 파싱"""
    if not content.startswith('---'):
        return {}, content

    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content

    try:
        front_matter = yaml.safe_load(parts[1])
        body = parts[2].strip()
        return front_matter or {}, body
    except:
        return {}, content

def parse_table(table_text):
    """마크다운 테이블 파싱"""
    lines = [l.strip() for l in table_text.strip().split('\n') if l.strip()]

    if len(lines) < 3:  # 헤더, 구분선, 최소 1개 데이터
        return []

    items = []
    for line in lines[2:]:  # 헤더와 구분선 스킵
        if not line.startswith('|'):
            continue

        cells = [c.strip() for c in line.split('|')]
        cells = [c for c in cells if c]  # 빈 셀 제거

        if len(cells) >= 2:
            field_name = cells[0]
            # <br> 태그를 줄바꿈으로 변환
            detail = cells[1].replace('<br>', '\n').replace('\\|', '|')
            items.append({
                "depth4_name": field_name,
                "detail": detail
            })

    return items

def parse_markdown_file(file_path):
    """마크다운 파일을 JSON 구조로 변환"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    front_matter, body = parse_front_matter(content)

    # 날짜 값을 문자열로 변환
    updated_dt = front_matter.get('수정일', '')
    if hasattr(updated_dt, 'strftime'):
        updated_dt = updated_dt.strftime('%Y-%m-%d')
    else:
        updated_dt = str(updated_dt) if updated_dt else ''

    product = {
        "item_cd": str(front_matter.get('item_cd', '')),
        "pfi_name": front_matter.get('금융사', ''),
        "depth1": front_matter.get('카테고리', ''),
        "depth2": front_matter.get('상품유형', ''),
        "updated_dt": updated_dt,
        "fi_memo": "",
        "depth3": []
    }

    # 메모 추출 (blockquote)
    memo_match = re.search(r'^(>.*?\n)+', body, re.MULTILINE)
    if memo_match:
        memo_lines = memo_match.group(0).strip().split('\n')
        memo = '\n'.join(line.lstrip('> ').strip() for line in memo_lines)
        product['fi_memo'] = memo

    # 섹션별 테이블 파싱
    section_pattern = r'^## (.+?)\n\n(.*?)(?=^## |\Z)'
    sections = re.findall(section_pattern, body, re.MULTILINE | re.DOTALL)

    for section_name, section_content in sections:
        section_name = section_name.strip()

        # 테이블 찾기
        table_match = re.search(r'\|.*?\|.*?\n\|[-:| ]+\|\n(\|.*?\n)+', section_content, re.DOTALL)
        if table_match:
            items = parse_table(table_match.group(0))
            if items:
                product['depth3'].append({
                    "depth3_name": section_name,
                    "depth4_key": items
                })

    return product

def main():
    print("=" * 60)
    print("마크다운 → JSON 역변환 시작")
    print("=" * 60)

    input_path = Path(INPUT_DIR)
    products = []
    errors = []

    # 모든 마크다운 파일 처리
    md_files = list(input_path.rglob("*.md"))
    print(f"발견된 마크다운 파일: {len(md_files)}개")

    for i, md_file in enumerate(md_files, 1):
        if md_file.name == "_index.json":
            continue

        try:
            product = parse_markdown_file(md_file)
            if product and product.get('pfi_name'):
                products.append(product)
                print(f"[{i:3d}] ✓ {md_file.relative_to(input_path)}")
            else:
                print(f"[{i:3d}] - {md_file.relative_to(input_path)} (데이터 없음)")
        except Exception as e:
            errors.append(f"{md_file}: {str(e)}")
            print(f"[{i:3d}] ✗ {md_file.relative_to(input_path)}: {e}")

    # JSON 저장
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print("역변환 완료!")
    print("=" * 60)
    print(f"변환된 상품 수: {len(products)}개")
    print(f"오류: {len(errors)}개")
    print(f"출력 파일: {OUTPUT_FILE}")

    if errors:
        print("\n오류 목록:")
        for err in errors[:10]:
            print(f"  - {err}")
        if len(errors) > 10:
            print(f"  ... 외 {len(errors) - 10}개")

if __name__ == "__main__":
    main()
