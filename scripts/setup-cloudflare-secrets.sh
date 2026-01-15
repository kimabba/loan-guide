#!/bin/bash
# Cloudflare Pages Secrets 설정 스크립트
#
# 사용법:
#   chmod +x scripts/setup-cloudflare-secrets.sh
#   ./scripts/setup-cloudflare-secrets.sh

echo "=== Cloudflare Pages Secrets 설정 ==="
echo ""
echo "프로젝트: loan-guide"
echo ""

cd apps/web

# GEMINI_API_KEY
echo "1. GEMINI_API_KEY 설정"
echo "   API 키를 입력하세요 (Enter 후 붙여넣기):"
npx wrangler pages secret put GEMINI_API_KEY --project-name=loan-guide

# FILE_SEARCH_STORE_NAME
echo ""
echo "2. FILE_SEARCH_STORE_NAME 설정"
echo "   Store 이름을 입력하세요 (예: fileSearchStores/loanguidesstore-xxx):"
npx wrangler pages secret put FILE_SEARCH_STORE_NAME --project-name=loan-guide

# SUPABASE_URL
echo ""
echo "3. SUPABASE_URL 설정"
echo "   Supabase URL을 입력하세요:"
npx wrangler pages secret put SUPABASE_URL --project-name=loan-guide

# SUPABASE_ANON_KEY
echo ""
echo "4. SUPABASE_ANON_KEY 설정"
echo "   Supabase Anon Key를 입력하세요:"
npx wrangler pages secret put SUPABASE_ANON_KEY --project-name=loan-guide

echo ""
echo "=== 설정 완료! ==="
echo ""
echo "배포하려면: npm run deploy:pages"
