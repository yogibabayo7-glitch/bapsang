# 오늘밥상물가 - 토스쇼핑 추천 상품 갱신
# 매일 한 번 실행: 토스쇼핑 카테고리 베스트 → 내 쉐어링크 발급 → GitHub에 shop.json 올리기
# 이 컴퓨터의 인터넷 주소(IP)가 쉐어링크 'API 키 발급' 화면의 출발지 IP에 등록돼 있어야 해요.

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = Join-Path $Here 'shop-log.txt'

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

# ── 1. 토큰 ──
try {
  $tok = Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'https://oauth2.cert.toss.im/token' `
    -ContentType 'application/x-www-form-urlencoded' `
    -Body @{ grant_type = 'client_credentials'; client_id = $cfg.accessKey; client_secret = $cfg.secretKey; scope = 'sharelink:read sharelink:write' }
  $Token = (Read-Json $tok).access_token
} catch { Log "토큰을 받지 못했어요. Access Key / Secret Key를 확인해 주세요. ($($_.Exception.Message))"; exit 1 }
$H = @{ Authorization = "Bearer $Token" }

function Api($method, $path, $body) {
  for ($try = 0; $try -lt 3; $try++) {
    try {
      if ($body) {
        $r = Invoke-WebRequest -UseBasicParsing -Method $method -Uri "$Base$path" -Headers $H -ContentType 'application/json' -Body ($body | ConvertTo-Json -Compress)
      } else {
        $r = Invoke-WebRequest -UseBasicParsing -Method $method -Uri "$Base$path" -Headers $H
      }
      $j = Read-Json $r
      if ($j.resultType -ne 'SUCCESS') {
        $code = $j.error.errorCode
        if ($code -eq 'SHARELINK_OPENAPI_ACCESS_DENIED') { Show-MyIp }
        throw "API 실패 $path : $code $($j.error.reason)"
      }
      Start-Sleep -Milliseconds 150
      return $j.success
    } catch {
      $status = $_.Exception.Response.StatusCode.value__
      if ($status -eq 429) { Start-Sleep -Seconds 2; continue }
      if ($status -eq 403) { Show-MyIp }
      throw
    }
  }
  throw "API 재시도 초과 $path"
}

# ── 2. 카테고리에서 우리가 쓸 묶음 찾기 ──
# 이름에 이 단어가 들어간 식품 카테고리를 모아요 (앞에 있을수록 우선)
$Groups = [ordered]@{
  kimjang = @('절임배추', '김장', '젓갈', '고춧가루', '액젓', '김치')
  cabbage = @('절임배추', '배추', '김장', '김치', '채소')
  veg     = @('채소', '야채', '나물')
  fruit   = @('과일')
  meat    = @('정육', '돼지고기', '소고기', '한우', '닭고기', '계란', '달걀')
  fish    = @('수산', '생선', '해산물', '건어물', '김/해조')
  grain   = @('쌀', '잡곡', '견과')
  spice   = @('양념', '소스', '장류', '조미료', '소금', '참기름', '식용유')
}
# 묶음별 규칙
#  cabbage : '배추 종류별 보기' 화면용. 이름에 '배추'가 든 상품만, 다른 묶음과 겹쳐도 돼요, 최대 30개
#  kimjang·cabbage : 김장 재료는 국산만 — 이름에 수입/중국산 등이 있으면 빼고, '국산/국내산'을 앞에
$NameMust = @{ cabbage = '배추' }
$Shared   = @('cabbage')
$KrOnly   = @('kimjang', 'cabbage')
$MaxItems = @{ cabbage = 30 }
$ImportRe = '수입|중국|외국산|미국산|호주산|베트남|칠레산|러시아산|노르웨이|뉴질랜드|태국산|인도산'
$KrRe     = '국산|국내산|국내|해남|괴산|강원|고랭지|평창|태백|정선|영월|홍천|강릉|횡성|진도|신안|영암|무안|부안|고창|청송|충북|전남|전북'
$Links    = @{}

# 김장 묶음은 재료별 정확한 카테고리에서 골고루 (10/28: 예전엔 절임배추가 12개 중 10개를 차지했어요)
#  재료 순서대로 1위 상품을 하나씩 → 다 돌면 2위를 하나씩… 그래서 앞 10개에 재료가 한 개씩 나와요
#  국산 표시는 앱과 같은 기준(국산·국내·해남·괴산·강원·고랭지·평창·태백·진도·신안·영암)인 상품만 써요
$KimjangCats = @(
  '채소류 > 나물/잎줄기채소 > 절임배추',
  # 김장 양념 세트 — 절임배추 바로 옆에 (간편 김장 조합)
  '김치 > 김치양념',
  '조미료/향신료 > 고추가루',
  '채소류 > 뿌리채소 > 깐마늘',
  '젓갈 > 새우젓',
  '육수/액젓 > 멸치액젓',
  '채소류 > 뿌리채소 > 무',
  '채소류 > 뿌리채소 > 생강',
  '채소류 > 나물/잎줄기채소 > 쪽파',
  '소금 > 천일염',
  '쌀/찹쌀가루/전분 > 찹쌀가루',
  '채소류 > 나물/잎줄기채소 > 미나리',
  '채소류 > 나물/잎줄기채소 > 대파'
)
$KimjangPer = 2
$AppKrRe = '국산|국내|해남|괴산|강원|고랭지|평창|태백|진도|신안|영암'

$Block = @(); if ($cfg.block) { $Block = @($cfg.block | ForEach-Object { [string]$_ }) }

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
Log "카테고리 $($flat.Count)개 중 식품 $($food.Count)개"

$out = [ordered]@{}
$seen = @{}
foreach ($g in $Groups.Keys) {
  $isShared = $Shared -contains $g
  $isKr = $KrOnly -contains $g
  $max = if ($MaxItems[$g]) { $MaxItems[$g] } else { 12 }
  $size = if ($NameMust[$g]) { 50 } else { 20 }
  $picked = New-Object System.Collections.ArrayList
  if ($g -eq 'kimjang') {
    foreach ($leaf in $KimjangCats) {
      $hit = $food | Where-Object { $_.path -like "*> $leaf" } | Select-Object -First 1
      if ($hit) { [void]$picked.Add($hit) } else { Log "김장 카테고리 못 찾음: $leaf" }
    }
  }
  foreach ($kw in $(if ($g -eq 'kimjang') { @() } else { $Groups[$g] })) {
    $hits = @($food | Where-Object { $_.name -like "*$kw*" } | Sort-Object level | Select-Object -First 2)
    foreach ($hit in $hits) { if (-not ($picked | Where-Object { $_.id -eq $hit.id })) { [void]$picked.Add($hit) } }
    if ($picked.Count -ge 5) { break }
  }
  $items = New-Object System.Collections.ArrayList
  foreach ($c in $picked) {
    try { $res = Api 'GET' "/products/best-categories/$($c.id)?size=$size" $null } catch { Log "카테고리 $($c.path) 조회 실패: $_"; continue }
    foreach ($it in $res.items) {
      $id = [string]$it.tacaItemId
      $nm = [string]$it.displayName
      if ($it.isSoldOut -or $Block -contains $id -or -not $it.thumbnailUrl) { continue }
      if ($NameMust[$g] -and $nm -notmatch $NameMust[$g]) { continue }
      if ($isKr -and $nm -match $ImportRe) { continue }
      if ($isShared) {
        if ($items | Where-Object { [string]$_.it.tacaItemId -eq $id }) { continue }
      } else {
        if ($seen.ContainsKey($id)) { continue }
        $seen[$id] = $true
      }
      $kr = if ($isKr -and $nm -match $KrRe) { 0 } else { 1 }
      [void]$items.Add([pscustomobject]@{ it = $it; cat = $c.name; rank = [int]$it.rank; kr = $kr })
    }
  }
  # 카테고리마다 골고루: 순위순으로 섞어서 12개 (김장 묶음은 국산 표시 상품 먼저)
  if ($g -eq 'kimjang') {
    # 재료(카테고리)마다 국산 표시 상품 우선·순위순으로 최대 2개 → 라운드로빈으로 섞기
    $byCat = [ordered]@{}
    foreach ($c in $picked) {
      $mine = @($items | Where-Object { $_.cat -eq $c.name })
      $krs  = @($mine | Where-Object { $_.it.displayName -match $AppKrRe } | Sort-Object rank)
      $rest = @($mine | Where-Object { $_.it.displayName -notmatch $AppKrRe } | Sort-Object rank)
      $byCat[$c.name] = @(@($krs) + @($rest) | Select-Object -First $KimjangPer)
      # 다른 재료 칸에서 쓰지 않은 상품은 seen에서 풀어 줘요 (뒤 묶음에서 쓸 수 있게)
      foreach ($x in $mine) { if (-not ($byCat[$c.name] | Where-Object { $_.it.tacaItemId -eq $x.it.tacaItemId })) { $seen.Remove([string]$x.it.tacaItemId) } }
    }
    $rr = New-Object System.Collections.ArrayList
    for ($i = 0; $i -lt $KimjangPer; $i++) {
      foreach ($k in $byCat.Keys) { if ($byCat[$k].Count -gt $i) { [void]$rr.Add($byCat[$k][$i]) } }
    }
    $max = [Math]::Max($max, $KimjangCats.Count + 4)
    $top = @($rr | Select-Object -First $max)
  } else {
  $top = @($items | Sort-Object kr, rank | Select-Object -First $max)
  }
  $list = New-Object System.Collections.ArrayList
  foreach ($x in $top) {
    $key = [string]$x.it.tacaItemId
    if (-not $Links.ContainsKey($key)) {
      try {
        $Links[$key] = (Api 'POST' '/links' @{ landingType = 'PRODUCT'; tacaItemId = [long]$x.it.tacaItemId; publisherId = $cfg.publisherId }).shortUrl
      } catch { Log "링크 발급 실패 $($x.it.tacaItemId): $_"; continue }
    }
    [void]$list.Add([ordered]@{
      id    = [string]$x.it.tacaItemId
      name  = $x.it.displayName
      thumb = $x.it.thumbnailUrl
      url   = $Links[$key]
      cat   = $x.cat
      price = $x.it.displayPrice
      review = $x.it.reviewCount
    })
  }
  $out[$g] = @($list)
  Log "$g : 카테고리 $($picked.Count)개 → 상품 $($list.Count)개"
}

# 지면 링크 (오아시스 신선식품, 특가)
$pages = [ordered]@{}
try { $pages.fresh = (Api 'POST' '/links' @{ landingType = 'FRESH_FOOD'; publisherId = $cfg.publisherId }).shortUrl } catch { Log "신선식품 지면 링크 실패: $_" }
try { $pages.deals = (Api 'POST' '/links' @{ landingType = 'SHOPPING_DEALS'; publisherId = $cfg.publisherId }).shortUrl } catch { Log "특가 지면 링크 실패: $_" }

$total = ($out.Keys | Where-Object { $Shared -notcontains $_ } | ForEach-Object { $out[$_].Count } | Measure-Object -Sum).Sum
if ($total -lt 5) { Log "상품이 너무 적어서($($total)개) 이번엔 올리지 않아요."; exit 1 }

$shop = [ordered]@{
  updatedAt  = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  disclosure = '토스쇼핑 쉐어링크 활동으로, 구매 시 일정액의 수수료를 받을 수 있어요'
  pages      = $pages
  groups     = $out
  categories = @($food | ForEach-Object { [ordered]@{ id = $_.id; path = $_.path } })
}
$json = $shop | ConvertTo-Json -Depth 8 -Compress

# ── 3. GitHub에 올리기 ──
$GH = @{ Authorization = "Bearer $($cfg.githubToken)" }
$api = "https://api.github.com/repos/$Repo/contents/docs/data/shop.json"
$sha = $null
try { $sha = (Read-Json (Invoke-WebRequest -UseBasicParsing -UserAgent 'bapsang-shop' -Uri $api -Headers $GH)).sha } catch {}
$body = [ordered]@{
  message = "토스쇼핑 추천 상품 갱신 ($($total)개)"
  content = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
}
if ($sha) { $body.sha = $sha }
try {
  Invoke-WebRequest -UseBasicParsing -UserAgent 'bapsang-shop' -Method Put -Uri $api -Headers $GH -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Compress))) | Out-Null
  Log "완료! 상품 $($total)개를 올렸어요."
} catch { Log "GitHub에 올리지 못했어요. githubToken을 확인해 주세요. ($($_.Exception.Message))"; exit 1 }
