# 오늘밥상물가 - 토스쇼핑 도구 공통 부분 (bapsang-shop.ps1, bapsang-search.ps1이 같이 써요)
# 이 파일만 따로 실행하지 않아요. 같은 폴더에 두기만 하면 돼요.
#
# 10/28 밤: 토스 쉐어링크 Open API는 '상품 목록·상세로 받아 간 상품 수'가 하루 1만 개까지예요
#  (거래처 하나 기준, 밤 12시에 초기화, 넘으면 SHARELINK_OPENAPI_QUOTA_EXCEEDED).
#  예전 스크립트는 품목마다 카테고리를 여러 쪽 받다가 한도를 넘겨서, 그 뒤 '다음 쪽' 조회가 다 실패 → 사실상 1쪽만 봤어요.
#  그래서 ① 오늘 쓴 개수를 quota.txt에 적어 두고 9,300개에서 스스로 멈추고
#        ② 받은 인기 상품은 best-cache.txt에 그날(오전 9시 순위 갱신 기준) 동안 저장해 다시 받지 않아요.
#           (같은 날 여러 번 돌려도, 검색 도구를 써도 한도를 거의 안 써요)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$LogFile = Join-Path $Here 'shop-log.txt'
$Utf8 = New-Object Text.UTF8Encoding $false

function Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Write-Host $line
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

# ── 설정 읽기 ──
$cfgPath = Join-Path $Here 'shop-config.json'
if (-not (Test-Path $cfgPath)) { Log 'shop-config.json 파일이 없어요. README.txt를 보고 만들어 주세요.'; exit 1 }
$cfg = [IO.File]::ReadAllText($cfgPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
foreach ($k in 'accessKey', 'secretKey', 'publisherId', 'githubToken') {
  if (-not $cfg.$k -or $cfg.$k -like '*여기에*') { Log "shop-config.json의 $k 값을 채워 주세요."; exit 1 }
}
$Repo = if ($cfg.repo) { $cfg.repo } else { 'yogibabayo7-glitch/bapsang' }
$Base = 'https://sharelink.toss.im/openapi'
$Block = @(); if ($cfg.block) { $Block = @($cfg.block | ForEach-Object { [string]$_ }) }

function Read-Json($resp) {
  $bytes = $resp.RawContentStream.ToArray()
  return ([Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json)
}

function Show-MyIp {
  try {
    $ip = (Invoke-WebRequest -UseBasicParsing 'https://api.ipify.org').Content
    Log "이 컴퓨터의 인터넷 주소는 $ip 예요. 쉐어링크 → 연동 → API 키 발급 → 출발지 IP에 등록해 주세요."
  } catch { Log '이 컴퓨터의 인터넷 주소를 확인하지 못했어요.' }
}

# ── 날짜 (한국 시간) ──
$KstNow = [DateTime]::UtcNow.AddHours(9)
$QuotaDay = $KstNow.ToString('yyyyMMdd')                                   # 한도는 밤 12시에 초기화
$RankDay = $(if ($KstNow.Hour -lt 9) { $KstNow.AddDays(-1) } else { $KstNow }).ToString('yyyyMMdd')  # 순위는 오전 9시에 갱신

# ── 하루 조회 한도 관리 ──
#  Q.used : 오늘 받아 간 상품 수(이 컴퓨터에서 센 값) / Q.cap : 여기까지만 쓰고 멈춰요 / Q.hit : 토스가 '한도 넘음'이라고 한 적 있음
$QuotaFile = Join-Path $Here 'quota.txt'
$Q = @{ used = 0; cap = 9300; hit = $false; told = $false }
if (Test-Path $QuotaFile) {
  try {
    $qt = ([IO.File]::ReadAllText($QuotaFile, [Text.Encoding]::UTF8)).Trim() -split '\s+'
    if ($qt.Count -ge 2 -and $qt[0] -eq $QuotaDay) { $Q.used = [int]$qt[1] }
  } catch {}
}
function Save-Quota { try { [IO.File]::WriteAllText($QuotaFile, "$QuotaDay $($Q.used)", $Utf8) } catch {} }
function Quota-Left { return [Math]::Max(0, $Q.cap - $Q.used) }

# ── 1. 토큰 ──
try {
  $tok = Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'https://oauth2.cert.toss.im/token' `
    -ContentType 'application/x-www-form-urlencoded' `
    -Body @{ grant_type = 'client_credentials'; client_id = $cfg.accessKey; client_secret = $cfg.secretKey; scope = 'sharelink:read sharelink:write' }
  $Token = (Read-Json $tok).access_token
} catch { Log "토큰을 받지 못했어요. Access Key / Secret Key를 확인해 주세요. ($($_.Exception.Message))"; exit 1 }
$H = @{ Authorization = "Bearer $Token" }

function Api($method, $path, $body) {
  # 상품 목록·상세는 받아 간 상품 수만큼 한도를 써요 → 미리 계산해서 넘을 것 같으면 부르지 않아요
  $isProd = $path -like '/products*'
  if ($isProd) {
    if ($Q.hit) { throw 'QUOTA: 오늘 조회 한도를 다 썼어요' }
    $need = 30
    if ($path -match '[?&]size=(\d+)') { $need = [int]$Matches[1] }
    if ($path -match 'tacaItemIds=([\d,]+)') { $need = @($Matches[1].Split(',')).Count }
    if ($Q.used + $need -gt $Q.cap) { throw "BUDGET: 오늘 쓸 한도($($Q.cap)개)에 닿아서 멈춰요 (지금 $($Q.used)개)" }
  }
  for ($try = 0; $try -lt 3; $try++) {
    try {
      if ($body) {
        $r = Invoke-WebRequest -UseBasicParsing -Method $method -Uri "$Base$path" -Headers $H -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Compress)))
      } else {
        $r = Invoke-WebRequest -UseBasicParsing -Method $method -Uri "$Base$path" -Headers $H
      }
      $j = Read-Json $r
      if ($j.resultType -ne 'SUCCESS') {
        $code = $j.error.errorCode
        if ($code -eq 'SHARELINK_OPENAPI_ACCESS_DENIED') { Show-MyIp }
        if ($code -eq 'SHARELINK_OPENAPI_QUOTA_EXCEEDED' -and $isProd) {
          $Q.hit = $true
          if ($Q.used -lt 10000) { $Q.used = 10000 }
          if (-not $Q.told) { $Q.told = $true; Log '⚠ 토스가 "오늘 상품 조회 한도(1만 개)를 넘었다"고 해요. 오늘은 저장해 둔 상품으로만 만들고, 밤 12시 뒤에 다시 받아요.' }
          throw "QUOTA: $path"
        }
        throw "API 실패 $path : $code $($j.error.reason)"
      }
      if ($isProd -and $j.success.items) { $Q.used += @($j.success.items).Count }
      Start-Sleep -Milliseconds 150
      return $j.success
    } catch {
      $status = $null
      try { $status = $_.Exception.Response.StatusCode.value__ } catch {}
      if ($status -eq 429) { Start-Sleep -Seconds 2; continue }
      if ($status -eq 403) { Show-MyIp }
      throw
    }
  }
  throw "API 재시도 초과 $path"
}

# ── 쉐어링크 (한 번 만든 건 link-cache.json에 저장해 다시 써요) ──
$Links = @{}
$LinkCacheFile = Join-Path $Here 'link-cache.json'
if (Test-Path $LinkCacheFile) {
  try {
    $lc = [IO.File]::ReadAllText($LinkCacheFile, [Text.Encoding]::UTF8) | ConvertFrom-Json
    foreach ($p in $lc.PSObject.Properties) { if ($p.Value) { $Links[$p.Name] = [string]$p.Value } }
  } catch { Log "링크 저장 파일을 못 읽어서 새로 만들어요." }
}
function Get-Link($it) {
  $key = [string]$it.tacaItemId
  if (-not $Links.ContainsKey($key)) {
    try {
      $Links[$key] = (Api 'POST' '/links' @{ landingType = 'PRODUCT'; tacaItemId = [long]$it.tacaItemId; publisherId = $cfg.publisherId }).shortUrl
    } catch { Log "링크 발급 실패 $key : $_"; return $null }
  }
  return $Links[$key]
}
function Save-Links {
  try {
    $lcOut = [ordered]@{}
    foreach ($k in $Links.Keys) { $lcOut[$k] = $Links[$k] }
    [IO.File]::WriteAllText($LinkCacheFile, ($lcOut | ConvertTo-Json -Compress), $Utf8)
  } catch { Log "링크 저장 파일을 쓰지 못했어요: $($_.Exception.Message)" }
}

# ── 카테고리 (한도 안 씀) ──
$cats = (Api 'GET' '/categories' $null).categories
$flat = New-Object System.Collections.ArrayList
function Walk($nodes, $path) {
  foreach ($n in $nodes) {
    $p = if ($path) { "$path > $($n.displayName)" } else { $n.displayName }
    [void]$flat.Add([pscustomobject]@{ id = $n.categoryId; level = $n.level; name = $n.displayName; path = $p })
    if ($n.children) { Walk $n.children $p }
  }
}
Walk $cats ''
$food = @($flat | Where-Object { $_.path -match '식품|푸드|신선' })
if (-not $food.Count) { $food = @($flat) }
$FoodById = @{}
foreach ($c in $food) { $FoodById[[string]$c.id] = $c }
function Find-Cat($suffix) { return ($food | Where-Object { $_.path -like "* > $suffix" -or $_.path -eq $suffix } | Select-Object -First 1) }
function Parent-Cat($c) {
  $i = $c.path.LastIndexOf(' > ')
  if ($i -lt 0) { return $null }
  $pp = $c.path.Substring(0, $i)
  return ($food | Where-Object { $_.path -eq $pp } | Select-Object -First 1)
}

# ── 카테고리 인기 상품 (쪽 넘기기 + 그날 저장) ──
# 저장 파일 best-cache.txt (탭으로 나눈 글자 파일, 큰 JSON은 윈도우 PowerShell이 못 읽을 때가 있어서)
#   첫 줄: D<탭>순위날짜 / C<탭>카테고리<탭>받은쪽수<탭>더있음<탭>다음커서 / P<탭>카테고리<탭>상품번호<탭>순위<탭>품절<탭>가격<탭>리뷰<탭>이름<탭>사진
$BestFile = Join-Path $Here 'best-cache.txt'
$BestState = @{}
function Clean($s) { return (([string]$s) -replace "[`t`r`n]", ' ') }
function Slim($it) {
  return [pscustomobject]@{
    tacaItemId = [string]$it.tacaItemId; displayName = [string]$it.displayName; thumbnailUrl = [string]$it.thumbnailUrl
    isSoldOut = [bool]$it.isSoldOut; rank = [int]$it.rank; displayPrice = $it.displayPrice; reviewCount = $it.reviewCount
  }
}
if (Test-Path $BestFile) {
  try {
    $lines = [IO.File]::ReadAllLines($BestFile, [Text.Encoding]::UTF8)
    if ($lines.Count -and $lines[0] -eq "D`t$RankDay") {
      foreach ($ln in $lines) {
        $f = $ln.Split("`t")
        if ($f[0] -eq 'C' -and $f.Count -ge 5) {
          $cur = if ($f[4]) { $f[4] } else { $null }
          $BestState[$f[1]] = @{ items = (New-Object System.Collections.ArrayList); n = [int]$f[2]; more = ($f[3] -eq '1'); cursor = $cur }
        } elseif ($f[0] -eq 'P' -and $f.Count -ge 9 -and $BestState.ContainsKey($f[1])) {
          $price = $null; if ($f[5]) { $price = [long]$f[5] }
          $rev = $null; if ($f[6]) { $rev = [long]$f[6] }
          [void]$BestState[$f[1]].items.Add([pscustomobject]@{
            tacaItemId = $f[2]; displayName = $f[7]; thumbnailUrl = $f[8]; isSoldOut = ($f[4] -eq '1'); rank = [int]$f[3]; displayPrice = $price; reviewCount = $rev
          })
        }
      }
    }
  } catch { Log "인기 상품 저장 파일을 못 읽어서 새로 받아요. ($($_.Exception.Message))"; $BestState = @{} }
}
$BestCached = $BestState.Count
function Save-Best {
  try {
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("D`t$RankDay")
    foreach ($k in $BestState.Keys) {
      $st = $BestState[$k]
      $more = if ($st.more) { '1' } else { '0' }
      [void]$sb.AppendLine("C`t$k`t$($st.n)`t$more`t$(Clean $st.cursor)")
      foreach ($it in $st.items) {
        $so = if ($it.isSoldOut) { '1' } else { '0' }
        [void]$sb.AppendLine("P`t$k`t$($it.tacaItemId)`t$($it.rank)`t$so`t$($it.displayPrice)`t$($it.reviewCount)`t$(Clean $it.displayName)`t$(Clean $it.thumbnailUrl)")
      }
    }
    [IO.File]::WriteAllText($BestFile, $sb.ToString(), $Utf8)
  } catch { Log "인기 상품 저장 파일을 쓰지 못했어요: $($_.Exception.Message)" }
}

# Get-Best 카테고리번호 쪽수 : 그 카테고리 인기 상품을 '쪽수'만큼(1쪽 = 100개) 받아서 돌려줘요.
#  이미 받은 쪽은 다시 안 받고, 모자란 쪽만 이어 받아요. 한도에 닿으면 받은 데까지만.
$PageLog = @{ fetched = 0; budgetStop = 0 }
function Get-Best($catId, $pages) {
  $k = [string]$catId
  if (-not $BestState.ContainsKey($k)) { $BestState[$k] = @{ items = (New-Object System.Collections.ArrayList); cursor = $null; more = $true; n = 0 } }
  $st = $BestState[$k]
  while ($st.more -and $st.n -lt $pages) {
    $path = "/products/best-categories/$($catId)?size=100"
    if ($st.cursor) { $path += "&cursor=$([uri]::EscapeDataString([string]$st.cursor))" }
    try { $res = Api 'GET' $path $null }
    catch {
      $m = [string]$_
      if ($m -like 'BUDGET*' -or $m -like 'QUOTA*') { $PageLog.budgetStop++; break }   # 한도: 다음에 이어서 받을 수 있게 그대로 둬요
      if ($st.n -eq 0) {
        try { $res = Api 'GET' "/products/best-categories/$($catId)?size=50" $null }
        catch { Log "카테고리 $catId 조회 실패: $m"; $st.more = $false; break }
        foreach ($it in @($res.items)) { if ($it) { [void]$st.items.Add((Slim $it)) } }
        $st.n++; $st.more = $false; $PageLog.fetched++; break
      } else { Log "카테고리 $catId $($st.n + 1)쪽 조회 실패: $m"; $st.more = $false; break }
    }
    foreach ($it in @($res.items)) { if ($it) { [void]$st.items.Add((Slim $it)) } }
    $st.n++
    $PageLog.fetched++
    $st.cursor = $res.nextCursor
    $st.more = ([bool]$res.hasNext) -and ([bool]$res.nextCursor)
  }
  return @($st.items)
}
function Best-Pages { return ((($BestState.Values | ForEach-Object { $_.n }) | Measure-Object -Sum).Sum) }

# ── 상품 상세 (고정 상품 확인용, 30개씩) ──
#  돌려주는 값: 상품번호 → 상품 (품절은 isSoldOut, 판매 끝난 상품은 빠져요)
function Get-Details($ids) {
  $out = @{}
  $list = @($ids | Where-Object { $_ } | ForEach-Object { [string]$_ } | Select-Object -Unique)
  for ($i = 0; $i -lt $list.Count; $i += 30) {
    $chunk = @($list[$i..([Math]::Min($i + 29, $list.Count - 1))])
    try {
      $res = Api 'GET' "/products/detail?tacaItemIds=$($chunk -join ',')" $null
      foreach ($it in @($res.items)) { if ($it) { $out[[string]$it.tacaItemId] = (Slim $it) } }
    } catch { Log "상품 상세 조회 실패($($chunk.Count)개): $_"; foreach ($x in $chunk) { $out[$x] = 'ERR' } }
  }
  return $out
}
# 상품 그룹 번호(tacaId = 토스쇼핑 주소 toss.shopping/t/번호의 번호)로 조회 → 대표 옵션. 결과 키는 그룹 번호.
#  ⚠ 옵션 번호(tacaItemId)와 번호 종류가 달라요. 섞어서 조회하면 우연히 같은 번호의 엉뚱한 상품이 나와요.
function Get-GroupDetails($ids) {
  $out = @{}
  $list = @($ids | Where-Object { $_ } | ForEach-Object { ([string]$_) -replace '^t', '' } | Select-Object -Unique)
  for ($i = 0; $i -lt $list.Count; $i += 30) {
    $chunk = @($list[$i..([Math]::Min($i + 29, $list.Count - 1))])
    try {
      $res = Api 'GET' "/products/detail?tacaIds=$($chunk -join ',')" $null
      foreach ($it in @($res.items)) { if ($it -and $it.tacaId) { $out[[string]$it.tacaId] = (Slim $it) } }
    } catch { Log "상품 그룹 번호 조회 실패($($chunk.Count)개): $_"; foreach ($x in $chunk) { $out[$x] = 'ERR' } }
  }
  return $out
}

# ── 고정 상품 (pins.json, 이 컴퓨터에 저장) ──
#  번호 앞에 t가 붙은 것(t123)은 상품 그룹 번호(토스쇼핑 주소의 번호), 그냥 숫자는 옵션 번호(검색 목록에서 고른 것)
#  { "품목id": ["상품번호", ...] }  검색 도구(3_search.bat)로 넣고 빼요. GitHub 규칙표의 pin과 합쳐서 써요.
$PinsFile = Join-Path $Here 'pins.json'
function Load-Pins {
  $p = [ordered]@{}
  if (Test-Path $PinsFile) {
    try {
      $j = [IO.File]::ReadAllText($PinsFile, [Text.Encoding]::UTF8) | ConvertFrom-Json
      foreach ($x in $j.PSObject.Properties) { $p[$x.Name] = @($x.Value | ForEach-Object { [string]$_ } | Where-Object { $_ }) }
    } catch { Log "pins.json을 못 읽었어요 (고정 상품 없이 진행): $($_.Exception.Message)" }
  }
  return $p
}
function Save-Pins($p) {
  $o = [ordered]@{}
  foreach ($k in $p.Keys) { if (@($p[$k]).Count) { $o[$k] = @($p[$k]) } }
  $txt = if ($o.Count) { $o | ConvertTo-Json -Depth 3 } else { '{}' }
  [IO.File]::WriteAllText($PinsFile, $txt, $Utf8)
}

# ── 품목 규칙 (GitHub의 docs/data/shop-rules.json을 매일 내려받아요) ──
$RulesFile = Join-Path $Here 'shop-rules.json'
$RulesUrl = "https://raw.githubusercontent.com/$Repo/main/docs/data/shop-rules.json"
function Load-Rules {
  try {
    $rr = Invoke-WebRequest -UseBasicParsing -Uri $RulesUrl
    $txt = [Text.Encoding]::UTF8.GetString($rr.RawContentStream.ToArray())
    $r = $txt | ConvertFrom-Json
    [IO.File]::WriteAllText($RulesFile, $txt, $Utf8)
    return $r
  } catch {
    Log "품목 규칙을 내려받지 못했어요. 저장해 둔 규칙을 써요. ($($_.Exception.Message))"
    if (Test-Path $RulesFile) { try { return ([IO.File]::ReadAllText($RulesFile, [Text.Encoding]::UTF8) | ConvertFrom-Json) } catch {} }
  }
  return $null
}
$ImportRe = '수입|중국|외국산|미국산|호주산|베트남|칠레산|러시아산|노르웨이|뉴질랜드|태국산|인도산'
$AppKrRe = '국산|국내|해남|괴산|강원|고랭지|평창|태백|진도|신안|영암'
# 상품 이름이 품목 규칙을 통과하나 (must 있어야 / not 없어야 / kr이면 수입 표시 없어야)
function Test-Rule($r, $nm, $importRe) {
  if ($nm -notmatch [string]$r.must) { return $false }
  if ($r.not -and $nm -match [string]$r.not) { return $false }
  if ($r.kr -and $nm -match $importRe) { return $false }
  return $true
}
