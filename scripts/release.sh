#!/usr/bin/env bash
# 출시 빌드 한 번에: 광고 그룹 ID를 .env에 넣고 → 타입·린트 검사 → .ait 빌드
# 사용법: bash scripts/release.sh <배너ID> [전면ID] [보상형ID]
#   ID를 비우고 싶으면 '' 를 넣어요. 예) bash scripts/release.sh ait-ad-xxxx '' ''
set -euo pipefail
cd "$(dirname "$0")/.."

BANNER="${1:-}"
INTER="${2:-}"
REWARD="${3:-}"
if [ -z "$BANNER" ]; then
  echo "배너 광고 그룹 ID를 첫 번째 값으로 넣어 주세요." >&2
  exit 1
fi

set_env() { # 키가 있으면 바꾸고 없으면 추가
  local key="$1" val="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}
set_env VITE_BANNER_AD_ID "$BANNER"
set_env VITE_INTERSTITIAL_AD_ID "$INTER"
set_env VITE_REWARD_AD_ID "$REWARD"

echo "── .env 광고 설정"
grep "_AD_ID=" .env

[ -d node_modules ] || npm ci
npx tsc -b
npx oxlint src >/dev/null
npm run build

# 빌드 결과에 ID가 실제로 들어갔는지 확인
if ! grep -rq "$BANNER" dist/assets/*.js; then
  echo "배너 ID가 빌드에 안 들어갔어요. .env를 확인해 주세요." >&2
  exit 1
fi
VER=$(node -p "require('./package.json').version")
cp bapsang-price.ait "release/bapsang-price-v${VER}.ait"
echo "── 완료: release/bapsang-price-v${VER}.ait (배너 ID 포함 확인됨)"
