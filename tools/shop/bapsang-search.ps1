# 오늘밥상물가 - 토스쇼핑 상품 찾기 + 고정하기 (3_search.bat로 실행)
# 토스 쉐어링크 API에는 '검색어로 찾기'가 없어요. 그래서 카테고리 인기 상품을 쪽 넘겨 받아서 이름으로 걸러요.
#  1) 오늘 받아 둔 인기 상품(best-cache.txt)에서 먼저 찾아요 → 한도를 안 써요
#  2) 더 찾고 싶으면 카테고리를 골라 더 깊게 받아요 → 받은 만큼 하루 한도(1만 개)를 써요
#  3) 마음에 드는 상품을 품목에 '고정'하면 pins.json에 저장 → 매일 아침 그 품목 맨 앞에 나와요 (품절·판매 끝이면 그날은 빠져요)
param([string]$Word)

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Here 'shop-lib.ps1')

$rules = Load-Rules
$pins = Load-Pins
$ruleImport = if ($rules -and $rules.importRe) { [string]$rules.importRe } else { $ImportRe }
$ResultHtml = Join-Path $Here 'search-result.html'

function Has-All($name, $words) {
  foreach ($w in $words) { if (([string]$name).IndexOf($w, [StringComparison]::OrdinalIgnoreCase) -lt 0) { return $false } }
  return $true
}
function Find-Rule($text) {
  if (-not $rules -or -not $text) { return $null }
  $t = $text.Trim()
  $hit = $rules.items | Where-Object { $_.name -eq $t -or $_.id -eq $t } | Select-Object -First 1
  if (-not $hit) { $hit = $rules.items | Where-Object { $t.Contains([string]$_.name) -or ([string]$_.name).Contains($t) } | Sort-Object { -([string]$_.name).Length } | Select-Object -First 1 }
  return $hit
}
function Esc($s) { return [Net.WebUtility]::HtmlEncode([string]$s) }
function Won($v) { if ($null -eq $v -or $v -eq '') { return '' }; return ('{0:N0}원' -f [long]$v) }

function Write-Html($title, $list, $rule) {
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append("<!doctype html><html lang='ko'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>$(Esc $title)</title>")
  [void]$sb.Append("<style>body{font-family:'Malgun Gothic',sans-serif;margin:16px;background:#f2f4f6;color:#191f28}h1{font-size:20px}p{color:#4e5968}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}.c{background:#fff;border-radius:14px;padding:10px;position:relative}.c img{width:100%;aspect-ratio:1;object-fit:contain;border-radius:10px;background:#fff}.n{font-size:13px;line-height:1.4;margin:6px 0;min-height:36px}.k{position:absolute;top:8px;left:8px;background:#191f28;color:#fff;border-radius:8px;padding:2px 8px;font-weight:700}.m{font-size:12px;color:#8b95a1}.ok{color:#0a7d4f;font-weight:700}.no{color:#f04452}.pin{color:#3182f6;font-weight:700}</style></head><body>")
  [void]$sb.Append("<h1>$(Esc $title)</h1><p>까만 번호를 검색 창에 넣으면 고정돼요. ✓ = 품목 이름 규칙 통과(규칙 안 맞아도 고정은 돼요)</p><div class='g'>")
  $i = 0
  foreach ($x in $list) {
    $i++
    $flag = ''
    if ($rule) { $flag = if (Test-Rule $rule ([string]$x.displayName) $ruleImport) { "<span class='ok'>✓ 규칙 통과</span>" } else { "<span class='no'>규칙 밖</span>" } }
    if ($x.isSoldOut) { $flag += " <span class='no'>품절</span>" }
    if ($rule -and $pins.Contains([string]$rule.id) -and (@($pins[[string]$rule.id]) -contains [string]$x.tacaItemId)) { $flag += " <span class='pin'>📌 고정됨</span>" }
    [void]$sb.Append("<div class='c'><span class='k'>$i</span><img src='$(Esc $x.thumbnailUrl)' loading='lazy' alt=''><div class='n'>$(Esc $x.displayName)</div><div class='m'>$(Won $x.displayPrice) · 리뷰 $($x.reviewCount) · 상품번호 $($x.tacaItemId)</div><div class='m'>$flag</div></div>")
  }
  [void]$sb.Append("</div></body></html>")
  [IO.File]::WriteAllText($ResultHtml, $sb.ToString(), $Utf8)
}

function Show-Pins($rule) {
  $ids = @()
  if ($pins.Contains([string]$rule.id)) { $ids = @($pins[[string]$rule.id]) }
  $fromRule = @($rule.pin | Where-Object { $_ } | ForEach-Object { [string]$_ })
  if (-not $ids.Count -and -not $fromRule.Count) { Write-Host "  지금 '$($rule.name)' 고정 상품: 없음"; return @() }
  $det = Get-Details (@($ids) + @($fromRule))
  Write-Host "  지금 '$($rule.name)' 고정 상품:"
  $k = 0
  foreach ($p in $ids) {
    $k++
    $d = $det[$p]
    $nm = if ($d -and -not ($d -is [string])) { "$($d.displayName)$(if ($d.isSoldOut) { ' (품절)' })" } elseif ($d -is [string]) { '(확인 실패)' } else { '(판매 끝 — 빼 주세요)' }
    Write-Host ("   x{0}  {1}  [{2}]" -f $k, $nm, $p)
  }
  foreach ($p in $fromRule) {
    $d = $det[$p]
    $nm = if ($d -and -not ($d -is [string])) { $d.displayName } else { '(판매 끝/확인 실패)' }
    Write-Host ("   (GitHub 규칙표 고정 — 여기선 못 빼요)  {0}  [{1}]" -f $nm, $p)
  }
  return $ids
}

Write-Host ''
Write-Host '=== 토스쇼핑 상품 찾기 · 고정하기 ==='
Write-Host "오늘 남은 조회 한도: $(Quota-Left)개 (하루 1만 개, 밤 12시 초기화) · 오늘 받아 둔 카테고리 $BestCached 개"
Write-Host ''

$first = $true
while ($true) {
  if ($first -and $Word) { $w = $Word } else { $w = Read-Host '찾을 말 (예: 열무 / 한우 안심 / 그냥 엔터 = 끝)' }
  $first = $false
  if (-not $w -or -not $w.Trim()) { break }
  $words = @($w.Trim() -split '\s+' | Where-Object { $_ })
  $rule = Find-Rule $w
  if ($rule) { Write-Host "  → 품목 '$($rule.name)' 규칙으로도 확인해요 (카테고리: $(@($rule.cats) -join ', '))" }

  # 1) 오늘 받아 둔 상품에서
  $hits = [ordered]@{}
  foreach ($k in $BestState.Keys) {
    foreach ($it in $BestState[$k].items) {
      $id = [string]$it.tacaItemId
      if (-not $hits.Contains($id) -and (Has-All $it.displayName $words)) { $hits[$id] = $it }
    }
  }
  Write-Host "  오늘 받아 둔 인기 상품에서 $($hits.Count)개 찾았어요."

  # 2) 더 깊게 찾을 카테고리 고르기
  $cands = New-Object System.Collections.ArrayList
  if ($rule) {
    $lv = @(); foreach ($suf in @($rule.cats)) { $c = Find-Cat $suf; if ($c) { $lv += $c } }
    for ($d = 0; $d -lt 3 -and $lv.Count; $d++) {
      foreach ($c in $lv) { if (-not ($cands | Where-Object { $_.id -eq $c.id })) { [void]$cands.Add($c) } }
      $nx = @(); foreach ($c in $lv) { $pc = Parent-Cat $c; if ($pc -and $pc.path -match ' > .+ > ') { $nx += $pc } }
      $lv = $nx
    }
  }
  foreach ($c in $food) {
    if ($cands.Count -ge 12) { break }
    foreach ($x in $words) { if (([string]$c.name).Contains($x) -and -not ($cands | Where-Object { $_.id -eq $c.id })) { [void]$cands.Add($c); break } }
  }
  if ($cands.Count) {
    Write-Host '  더 깊게 찾을 수 있는 카테고리 (1쪽 = 100개, 받은 만큼 한도를 써요):'
    for ($i = 0; $i -lt $cands.Count; $i++) {
      $c = $cands[$i]; $st = $BestState[[string]$c.id]
      $had = if ($st) { "오늘 $($st.n)쪽 받음$(if (-not $st.more) { ' · 끝까지 봄' })" } else { '아직 안 받음' }
      Write-Host ("   {0,2}. {1}  ({2})" -f ($i + 1), $c.path.Replace('식품 > 신선식품 > ', ''), $had)
    }
    $sel = Read-Host '  더 찾을 번호 (예: 1,2 / 그냥 엔터 = 건너뛰기)'
    if ($sel -and $sel.Trim()) {
      $pg = Read-Host '  몇 쪽까지 볼까요? (그냥 엔터 = 10쪽)'
      $pages = 10; if ($pg -match '^\s*(\d+)\s*$') { $pages = [Math]::Max(1, [Math]::Min(50, [int]$Matches[1])) }
      foreach ($n in ($sel -split '[,\s]+' | Where-Object { $_ -match '^\d+$' })) {
        $ix = [int]$n - 1
        if ($ix -lt 0 -or $ix -ge $cands.Count) { continue }
        $c = $cands[$ix]
        Write-Host "  $($c.name) 받는 중..."
        foreach ($it in @(Get-Best $c.id $pages)) {
          $id = [string]$it.tacaItemId
          if (-not $hits.Contains($id) -and (Has-All $it.displayName $words)) { $hits[$id] = $it }
        }
        $st = $BestState[[string]$c.id]
        Write-Host "   → $($st.n)쪽까지 받음$(if (-not $st.more) { ' (끝까지 다 봄)' }) · 오늘 남은 한도 $(Quota-Left)개"
      }
      Save-Best; Save-Quota
    }
  }

  # 결과 보여주기 (규칙 통과 → 리뷰 많은 순)
  $list = @($hits.Values | Where-Object { $Block -notcontains [string]$_.tacaItemId } | Sort-Object `
    @{ Expression = { if ($rule -and (Test-Rule $rule ([string]$_.displayName) $ruleImport)) { 0 } else { 1 } } }, `
    @{ Expression = { if ($_.isSoldOut) { 1 } else { 0 } } }, `
    @{ Expression = { [long]$_.reviewCount }; Descending = $true } | Select-Object -First 60)
  if (-not $list.Count) {
    Write-Host "  '$w' 상품을 못 찾았어요. 다른 말(예: '얼갈이' 대신 '배추', '동태' 대신 '명태')이나 더 위 카테고리로 찾아보세요."
    Write-Host ''
    continue
  }
  Write-Host ''
  for ($i = 0; $i -lt $list.Count; $i++) {
    $x = $list[$i]
    $ok = if ($rule -and (Test-Rule $rule ([string]$x.displayName) $ruleImport)) { '✓' } else { ' ' }
    $so = if ($x.isSoldOut) { ' (품절)' } else { '' }
    Write-Host ("  {0,2}. {1} {2}{3} | {4} | 리뷰 {5} | [{6}]" -f ($i + 1), $ok, $x.displayName, $so, (Won $x.displayPrice), $x.reviewCount, $x.tacaItemId)
  }
  Write-Html "'$w' 찾은 상품 $($list.Count)개" $list $rule
  try { Start-Process $ResultHtml } catch {}
  Write-Host "  (사진으로 보기: search-result.html 이 열렸어요)"
  Write-Host ''

  # 3) 고정하기
  $ask = if ($rule) { "  고정할 품목 (그냥 엔터 = '$($rule.name)' / 다른 품목 이름 / - = 고정 안 함)" } else { '  고정할 품목 이름 (예: 열무 / 그냥 엔터 = 고정 안 함)' }
  $tn = Read-Host $ask
  if ($tn -eq '-') { continue }
  $target = if ($tn -and $tn.Trim()) { Find-Rule $tn } else { $rule }
  if (-not $target) { if ($tn) { Write-Host "  '$tn' 품목을 못 찾았어요." }; continue }
  $cur = @(Show-Pins $target)
  $cmd = Read-Host "  '$($target.name)'에 고정할 번호 (예: 1,4 · 빼기 x1 · 상품번호 직접 #2398866849 · 그냥 엔터 = 그대로)"
  if (-not $cmd -or -not $cmd.Trim()) { continue }
  $newIds = New-Object System.Collections.ArrayList
  foreach ($p in $cur) { [void]$newIds.Add([string]$p) }
  $removed = @()
  foreach ($t in ($cmd -split '[,\s]+' | Where-Object { $_ })) {
    if ($t -match '^[xX](\d+)$') { $ix = [int]$Matches[1] - 1; if ($ix -ge 0 -and $ix -lt $cur.Count) { $removed += [string]$cur[$ix] } }
    elseif ($t -match '^#(\d+)$') { if (-not ($newIds -contains $Matches[1])) { [void]$newIds.Add($Matches[1]) } }
    elseif ($t -match '^\d+$') {
      $ix = [int]$t - 1
      if ($ix -ge 0 -and $ix -lt $list.Count) { $id = [string]$list[$ix].tacaItemId; if (-not ($newIds -contains $id)) { [void]$newIds.Add($id) } }
    }
  }
  $final = @($newIds | Where-Object { $removed -notcontains $_ })
  $pins[[string]$target.id] = $final
  Save-Pins $pins
  Write-Host "  저장했어요: '$($target.name)' 고정 상품 $($final.Count)개 (pins.json). 내일 아침 9:40 실행부터 앱에 나와요."
  Write-Host ''
}

Save-Best; Save-Quota; Save-Links
$go = Read-Host '지금 바로 앱 상품을 새로 올릴까요? (y = 네 / 그냥 엔터 = 아니요)'
if ($go -match '^[yYㅛ]') {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Here 'bapsang-shop.ps1')
}
