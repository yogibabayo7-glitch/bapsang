# 오늘밥상물가 - 토스쇼핑 추천 상품 갱신
# 매일 한 번 실행: 토스쇼핑 카테고리 베스트 → 내 쉐어링크 발급 → GitHub에 shop.json 올리기
# 이 컴퓨터의 인터넷 주소(IP)가 쉐어링크 'API 키 발급' 화면의 출발지 IP에 등록돼 있어야 해요.
# 같은 폴더에 shop-lib.ps1(공통 부분)이 꼭 있어야 해요.

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $Here 'shop-lib.ps1'))) {
  Add-Content -Path (Join-Path $Here 'shop-log.txt') -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] shop-lib.ps1 파일이 없어요. 새 폴더 파일을 전부 덮어써 주세요." -Encoding UTF8
  exit 1
}
. (Join-Path $Here 'shop-lib.ps1')

Log "카테고리 $($flat.Count)개 중 식품 $($food.Count)개 · 오늘 이미 쓴 조회 $($Q.used)개 · 저장해 둔 오늘 순위 $BestCached 개 카테고리"

# 같은 상품의 용량·수량만 다른 것(5kg 1개 / 5kg 2개 …)은 뒤로 미뤄요 → 앞쪽엔 종류가 다른 상품이 고루
function Base-Name($nm) {
  $b = $nm -replace '\(.*?\)', ' '
  $b = $b -replace '[\d.,~\-+/]+\s*(kg|g|ml|l|cm|mm|개입|개|봉지|봉|팩|입|박스|구|미|과|수|매|통|망|단|세트|마리|포기|근|번과|brix)?', ' '
  $b = $b -replace '(특대|대과|중대과|중과|소과|특품|특|상|중|소|대|왕|가정용|선물용|1\+\+|1\+)(\s|,|$)', ' '
  return (($b -replace '[,\s]+', ' ').Trim())
}

# ── 2. 김장·배추 묶음 ──
$Groups = [ordered]@{
  kimjang = @('절임배추', '김장', '젓갈', '고춧가루', '액젓', '김치')
  cabbage = @('절임배추', '배추', '김장', '김치', '채소')
}
# 10/28: 채소·과일·고기·생선·곡물·양념 묶음은 더 이상 넓은 카테고리 키워드로 모으지 않아요
#  (토마토주스·율무차·아보카도유김 같은 엉뚱한 상품이 섞였음) → 아래 '품목별 상품'에서 만들어요
#  cabbage : '배추 종류별 보기' 화면용. 이름에 '배추'가 든 상품만, 다른 묶음과 겹쳐도 돼요, 최대 30개
#  kimjang·cabbage : 김장 재료는 국산만 — 이름에 수입/중국산 등이 있으면 빼고, '국산/국내산'을 앞에
$NameMust = @{ cabbage = '배추' }
$Shared   = @('cabbage')
$KrOnly   = @('kimjang', 'cabbage')
$MaxItems = @{ cabbage = 30 }
$KrRe     = '국산|국내산|국내|해남|괴산|강원|고랭지|평창|태백|정선|영월|홍천|강릉|횡성|진도|신안|영암|무안|부안|고창|청송|충북|전남|전북'

# 김장 묶음은 재료별 정확한 카테고리에서 골고루 (10/28: 예전엔 절임배추가 12개 중 10개를 차지했어요)
#  재료 순서대로 1위 상품을 하나씩 → 다 돌면 2위를 하나씩… 그래서 앞 10개에 재료가 한 개씩 나와요
$KimjangCats = @(
  '채소류 > 나물/잎줄기채소 > 절임배추',
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

$out = [ordered]@{}
$seen = @{}
foreach ($g in $Groups.Keys) {
  $isShared = $Shared -contains $g
  $isKr = $KrOnly -contains $g
  $max = if ($MaxItems[$g]) { $MaxItems[$g] } else { 12 }
  $size = if ($NameMust[$g]) { 50 } else { 20 }   # 카테고리마다 앞에서 몇 개까지 볼지 (받는 건 1쪽 100개, 그날 저장)
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
    $best = @(Get-Best $c.id 1)
    foreach ($it in @($best | Select-Object -First $size)) {
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
  if ($g -eq 'kimjang') {
    # 재료(카테고리)마다 국산 표시 상품 우선·순위순으로 최대 2개 → 라운드로빈으로 섞기
    $byCat = [ordered]@{}
    foreach ($c in $picked) {
      $mine = @($items | Where-Object { $_.cat -eq $c.name })
      $krs  = @($mine | Where-Object { $_.it.displayName -match $AppKrRe } | Sort-Object rank)
      $rest = @($mine | Where-Object { $_.it.displayName -notmatch $AppKrRe } | Sort-Object rank)
      $byCat[$c.name] = @(@($krs) + @($rest) | Select-Object -First $KimjangPer)
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
    $url = Get-Link $x.it
    if (-not $url) { continue }
    [void]$list.Add([ordered]@{
      id    = [string]$x.it.tacaItemId
      name  = $x.it.displayName
      thumb = $x.it.thumbnailUrl
      url   = $url
      cat   = $x.cat
      price = $x.it.displayPrice
      review = $x.it.reviewCount
    })
  }
  $out[$g] = @($list)
  Log "$g : 카테고리 $($picked.Count)개 → 상품 $($list.Count)개"
}

# ── 3. 품목별 상품 ──
# 앱 '전체 시세'에서 품목을 누르면 그 품목 상품만 보여요. 규칙표(shop-rules.json)는 GitHub에서 매일 내려받아요.
#  cats : 이 카테고리 인기 상품에서 고름 / must·not·kr : 이름 규칙 / prefer : 앞으로 / pin : 고정 상품 번호
#
# 순서 (10/28 밤 — 하루 조회 한도 1만 개 안에서 '상품 없는 품목'부터 챙기도록):
#  ① 모든 품목: 정해 둔 카테고리 인기 1쪽(100개)
#  ② 전에 깊이 찾아서 기억해 둔 상품(found.txt, 14일) 다시 확인 — 상세 조회라 한도를 거의 안 써요
#  ③ 반찬 모아 보기
#  ④ 아직 0개인 품목: 같은 카테고리 끝까지(10쪽) → 한 단계 위(10쪽) → 그래도 0개면 두 단계 위(20쪽)
#     (토스쇼핑엔 '산지직송 국내산 햇 열무'처럼 옆 카테고리에 올라간 상품이 많아요. 이름 규칙은 똑같이)
#  ⑤ 한도가 남으면 12개보다 적은 품목도 같은 카테고리 3쪽까지
#  ⑥ 고정 상품(규칙표 pin + 이 컴퓨터 pins.json)은 맨 앞에. 이름 규칙 안 봐요(사람이 고른 거라), 품절·판매 끝은 빼요
$rules = Load-Rules
$itemsOut = [ordered]@{}
$prodById = [ordered]@{}
$ItemSt = [ordered]@{}
$p1stop = 0
$withProd = 0
$FoundFile = Join-Path $Here 'found.txt'
$Found = @{}   # 품목id → @{ 상품번호 = 마지막으로 본 날 }
if (Test-Path $FoundFile) {
  try {
    $limit = $KstNow.AddDays(-14).ToString('yyyyMMdd')
    foreach ($ln in [IO.File]::ReadAllLines($FoundFile, [Text.Encoding]::UTF8)) {
      $f = $ln.Split("`t")
      if ($f.Count -lt 3 -or $f[2] -lt $limit) { continue }
      if (-not $Found.ContainsKey($f[0])) { $Found[$f[0]] = @{} }
      $Found[$f[0]][$f[1]] = $f[2]
    }
  } catch { Log "found.txt를 못 읽었어요: $($_.Exception.Message)" }
}
function Remember($iid, $prodId) {
  if (-not $Found.ContainsKey($iid)) { $Found[$iid] = @{} }
  $Found[$iid][[string]$prodId] = $QuotaDay
}
function Save-Found {
  try {
    $sb = New-Object System.Text.StringBuilder
    foreach ($iid in $Found.Keys) { foreach ($p in $Found[$iid].Keys) { [void]$sb.AppendLine("$iid`t$p`t$($Found[$iid][$p])") } }
    [IO.File]::WriteAllText($FoundFile, $sb.ToString(), $Utf8)
  } catch { Log "found.txt를 쓰지 못했어요: $($_.Exception.Message)" }
}
function Save-All { Save-Best; Save-Quota; Save-Links; Save-Found }

# s : 품목 상태, cats : 볼 카테고리들, pages : 몇 쪽까지, stage : 단계(순위 뒤로 밀기·기억 여부)
function Scan($s, $cats, $pages, $stage) {
  $n0 = $s.got
  foreach ($c in @($cats)) {
    if (-not $c) { continue }
    $mine = New-Object System.Collections.ArrayList
    foreach ($it in @(Get-Best $c.id $pages)) {
      $id = [string]$it.tacaItemId
      $nm = [string]$it.displayName
      if ($s.ids.ContainsKey($id)) { continue }
      if ($it.isSoldOut -or $Block -contains $id -or -not $it.thumbnailUrl) { continue }
      if (-not (Test-Rule $s.r $nm $s.imp)) { continue }
      $s.ids[$id] = $true
      if ($stage -ge 2) { Remember $s.r.id $id }
      $pref = if ($s.r.prefer -and $nm -match [string]$s.r.prefer) { 0 } elseif ($s.r.kr -and $nm -match $AppKrRe) { 0 } else { 1 }
      [void]$mine.Add([pscustomobject]@{ it = $it; cat = $c.name; rank = [int]$it.rank + ($stage - 1) * 10000; pref = $pref; base = (Base-Name $nm) })
    }
    $key = [string]$c.id
    if ($s.byCat.Contains($key)) { $s.byCat[$key] = @(@($s.byCat[$key]) + @($mine) | Sort-Object pref, rank) }
    else { $s.byCat[$key] = @($mine | Sort-Object pref, rank) }
    $s.got += $mine.Count
  }
  return ($s.got - $n0)
}
# 한 단계 위 카테고리들 ('식품 > 신선식품' 같은 너무 넓은 곳은 안 봐요)
function Parents($list) {
  $res = New-Object System.Collections.ArrayList
  foreach ($c in @($list)) {
    if (-not $c) { continue }
    $pc = Parent-Cat $c
    if (-not $pc -or $pc.path -notmatch ' > .+ > ') { continue }
    if (-not ($res | Where-Object { $_.id -eq $pc.id })) { [void]$res.Add($pc) }
  }
  return @($res)
}

if ($rules -and $rules.items) {
  $ruleImport = if ($rules.importRe) { [string]$rules.importRe } else { $ImportRe }

  # ① 모든 품목 1쪽
  foreach ($r in $rules.items) {
    $prim = New-Object System.Collections.ArrayList
    foreach ($suf in @($r.cats)) {
      $c = Find-Cat $suf
      if (-not $c) { Log "품목 카테고리 못 찾음: $($r.name) ($suf)"; continue }
      [void]$prim.Add($c)
    }
    $s = @{ r = $r; imp = $ruleImport; byCat = [ordered]@{}; ids = @{}; got = 0; prim = @($prim); max = $(if ($r.max) { [int]$r.max } else { 12 }); note = '' }
    $ItemSt[[string]$r.id] = $s
    [void](Scan $s $s.prim 1 1)
  }
  $p1stop = $PageLog.budgetStop
  Log "① 1쪽씩: 상품 있는 품목 $(@($ItemSt.Values | Where-Object { $_.got -gt 0 }).Count)/$($ItemSt.Count) · 오늘 조회 $($Q.used)개"

  # ② 기억해 둔 상품 다시 확인 (12개보다 적은 품목만)
  $recheck = @{}
  foreach ($iid in $ItemSt.Keys) {
    $s = $ItemSt[$iid]
    if ($s.got -ge $s.max -or -not $Found.ContainsKey($iid)) { continue }
    foreach ($p in $Found[$iid].Keys) { if (-not $s.ids.ContainsKey($p)) { $recheck[$p] = $true } }
  }
  if ($recheck.Count) {
    $det = Get-Details @($recheck.Keys)
    $back = 0
    foreach ($iid in $ItemSt.Keys) {
      $s = $ItemSt[$iid]
      if ($s.got -ge $s.max -or -not $Found.ContainsKey($iid)) { continue }
      $mine = New-Object System.Collections.ArrayList
      foreach ($p in @($Found[$iid].Keys)) {
        if ($s.ids.ContainsKey($p) -or -not $det.ContainsKey($p)) { continue }
        $it = $det[$p]
        if ($it -is [string]) { continue }   # 조회 실패(ERR)는 오늘만 건너뛰어요
        if ($it.isSoldOut -or $Block -contains $p -or -not $it.thumbnailUrl) { continue }
        if (-not (Test-Rule $s.r ([string]$it.displayName) $s.imp)) { $Found[$iid].Remove($p); continue }
        $s.ids[$p] = $true
        $Found[$iid][$p] = $QuotaDay   # 아직 팔고 규칙도 맞으면 계속 기억
        $pref = if ($s.r.prefer -and $it.displayName -match [string]$s.r.prefer) { 0 } elseif ($s.r.kr -and $it.displayName -match $AppKrRe) { 0 } else { 1 }
        $leaf = ([string]@($s.r.cats)[0]).Split('>')[-1].Trim()
        [void]$mine.Add([pscustomobject]@{ it = $it; cat = $leaf; rank = 50000; pref = $pref; base = (Base-Name ([string]$it.displayName)) })
      }
      # 상세에 안 나온 상품(판매 끝)은 기억에서 빼요
      foreach ($p in @($Found[$iid].Keys)) { if ($recheck.ContainsKey($p) -and -not $det.ContainsKey($p)) { $Found[$iid].Remove($p) } }
      if ($mine.Count) {
        $s.byCat['found'] = @($mine | Sort-Object pref, rank)
        $s.got += $mine.Count; $back += $mine.Count
        $s.note += " 기억 $($mine.Count)"
      }
    }
    Log "② 전에 깊이 찾아 둔 상품 $($recheck.Count)개 확인 → $back 개 다시 씀"
  }
}

# ── 4. 반찬 모아 보기 (10/28 밤, 사장님 요청: 반찬 테마) ──
# 반찬 카테고리마다 인기 상품을 골라 shop.json의 'banchan'에 넣어요 (groups 밖이라 예전 앱 품목 상품엔 안 섞여요).
$BanchanCats = @(
  @('볶음', '반찬 > 볶음반찬'),
  @('조림', '반찬 > 조림반찬'),
  @('무침·나물', '반찬 > 무침반찬'),
  @('장아찌·절임', '반찬 > 단무지/피클/절임반찬'),
  @('반찬세트', '반찬 > 혼합반찬/반찬세트'),
  @('김치', '김치/반찬/젓갈 > 김치'),
  @('젓갈', '김치/반찬/젓갈 > 젓갈'),
  @('게장·장', '김치/반찬/젓갈 > 찌개양념/반찬장류')
)
$BanchanPer = 15
$BanchanNot = '찌개\s*양념|김치\s*양념|김장\s*양념|양념\s*세트|양념소|김치\s*소|육수|다시팩|밀키트'
$banchan = [ordered]@{ kinds = @(); items = @() }
try {
  $bItems = New-Object System.Collections.ArrayList
  $bKinds = New-Object System.Collections.ArrayList
  $bSeen = @{}
  foreach ($bc in $BanchanCats) {
    $label = $bc[0]; $suf = $bc[1]
    $c = Find-Cat $suf
    if (-not $c) { Log "반찬 카테고리 못 찾음: $suf"; continue }
    $pick = New-Object System.Collections.ArrayList
    $bases = @{}
    foreach ($pages in 1, 2) {
      foreach ($it in @(Get-Best $c.id $pages)) {
        if ($pick.Count -ge $BanchanPer) { break }
        $id = [string]$it.tacaItemId; $nm = [string]$it.displayName
        if ($bSeen.ContainsKey($id) -or $it.isSoldOut -or $Block -contains $id -or -not $it.thumbnailUrl) { continue }
        if ($nm -match $BanchanNot) { continue }
        $bn = Base-Name $nm
        if ($bases.ContainsKey($bn)) { continue }
        $url = Get-Link $it
        if (-not $url) { continue }
        $bases[$bn] = $true; $bSeen[$id] = $true
        [void]$pick.Add([ordered]@{ id = $id; name = $it.displayName; thumb = $it.thumbnailUrl; url = $url; cat = $label })
      }
      if ($pick.Count -ge $BanchanPer) { break }
    }
    if ($pick.Count) { [void]$bKinds.Add($label); foreach ($x in $pick) { [void]$bItems.Add($x) } }
  }
  $banchan = [ordered]@{ kinds = @($bKinds); items = @($bItems) }
  Log "반찬 모아 보기: $($bKinds.Count)종류, 상품 $($bItems.Count)개"
} catch { Log "반찬 모아 보기 실패(다른 상품은 그대로 올려요): $_" }

if ($rules -and $rules.items) {
  # ④ 아직 0개인 품목 깊게 찾기
  foreach ($iid in $ItemSt.Keys) {
    $s = $ItemSt[$iid]
    if ($s.got -gt 0 -or -not $s.prim.Count) { continue }
    $steps = New-Object System.Collections.ArrayList
    $n = Scan $s $s.prim 10 2
    [void]$steps.Add("같은 카테고리 끝까지 $n")
    $up1 = @(Parents $s.prim)
    if ($s.got -lt $s.max -and $up1.Count) {
      $n = Scan $s $up1 10 3
      [void]$steps.Add("$(($up1 | ForEach-Object { $_.name }) -join '·') $n")
    }
    if ($s.got -eq 0) {
      $up2 = @(Parents $up1)
      if ($up2.Count) {
        $n = Scan $s $up2 20 4
        [void]$steps.Add("$(($up2 | ForEach-Object { $_.name }) -join '·') $n")
      }
    }
    $s.note += " 깊게찾기[" + ($steps -join ' → ') + "]"
    if ($Q.hit -or (Quota-Left) -lt 100) { Log "④ 조회 한도가 바닥나서 깊게 찾기를 여기서 멈춰요 ($($s.r.name)까지)"; break }
  }
  # ⑤ 한도가 넉넉히 남으면 12개보다 적은 품목도 3쪽까지
  foreach ($iid in $ItemSt.Keys) {
    $s = $ItemSt[$iid]
    if ($s.got -eq 0 -or $s.got -ge $s.max) { continue }
    if ((Quota-Left) -lt 1500) { break }
    $n = Scan $s $s.prim 3 2
    if ($n) { $s.note += " 더찾기 $n" }
  }

  # ⑥ 고정 상품
  $pinsLocal = Load-Pins
  $pinMap = @{}
  foreach ($r in $rules.items) {
    $ids = New-Object System.Collections.ArrayList
    foreach ($p in @($r.pin)) { if ($p -and -not ($ids -contains [string]$p)) { [void]$ids.Add([string]$p) } }
    if ($pinsLocal.Contains([string]$r.id)) { foreach ($p in @($pinsLocal[[string]$r.id])) { if ($p -and -not ($ids -contains [string]$p)) { [void]$ids.Add([string]$p) } } }
    if ($ids.Count) { $pinMap[[string]$r.id] = @($ids) }
  }
  $pinDet = @{}
  if ($pinMap.Count) {
    $all = @($pinMap.Values | ForEach-Object { $_ })
    $pinDet = Get-Details $all
    # 10/29: 토스쇼핑 주소(toss.shopping/t/번호)의 번호는 상품 그룹 번호(tacaId)예요 (옵션 번호 tacaItemId가 아님).
    #  옵션 번호로 안 나온 것은 그룹 번호로 다시 조회 → 그 상품의 대표 옵션이 나와요 (링크도 그 옵션으로 발급).
    $miss = @($all | Where-Object { -not $pinDet.ContainsKey($_) -or $pinDet[$_] -is [string] } | Select-Object -Unique)
    for ($i = 0; $i -lt $miss.Count; $i += 30) {
      $chunk = @($miss[$i..([Math]::Min($i + 29, $miss.Count - 1))])
      try {
        $res = Api 'GET' "/products/detail?tacaIds=$($chunk -join ',')" $null
        foreach ($it in @($res.items)) { if ($it) { $pinDet[[string]$it.tacaId] = (Slim $it) } }
      } catch { Log "고정 상품 그룹 번호 조회 실패($($chunk.Count)개): $_" }
    }
    $gone = @($all | Where-Object { -not $pinDet.ContainsKey($_) } | Select-Object -Unique)
    $sold = @($all | Where-Object { $pinDet.ContainsKey($_) -and -not ($pinDet[$_] -is [string]) -and $pinDet[$_].isSoldOut } | Select-Object -Unique)
    Log "⑥ 고정 상품 $($all.Count)개 확인 (품절 $($sold.Count)개, 판매 끝 $($gone.Count)개는 오늘 빼요)"
    if ($gone.Count) { Log "   판매 끝난 고정 상품 번호: $($gone -join ', ') → 3_search.bat에서 빼 주세요" }
  }

  # ⑦ 품목마다 고르기
  $noProduct = New-Object System.Collections.ArrayList
  foreach ($r in $rules.items) {
    $iid = [string]$r.id
    $s = $ItemSt[$iid]
    $max = $s.max
    $chosen = New-Object System.Collections.ArrayList
    $bases = @{}
    $used = @{}
    $leaf = ([string]@($r.cats)[0]).Split('>')[-1].Trim()
    foreach ($p in @($pinMap[$iid])) {
      if (-not $p -or -not $pinDet.ContainsKey($p) -or $pinDet[$p] -is [string]) { continue }
      $it = $pinDet[$p]
      if ($it.isSoldOut -or -not $it.thumbnailUrl -or $used.ContainsKey($p)) { continue }
      $used[$p] = $true; $used[[string]$it.tacaItemId] = $true; $bases[(Base-Name ([string]$it.displayName))] = $true
      [void]$chosen.Add([pscustomobject]@{ it = $it; cat = $leaf; pin = $true })
      if ($chosen.Count -ge $max) { break }
    }
    $pinned = $chosen.Count
    # 1차: 이름이 겹치지 않는 상품을 카테고리마다 번갈아 (밤고구마→호박고구마→꿀고구마→…)
    # 2차: 자리가 남으면 용량만 다른 상품으로 채워요
    $more = $true
    for ($i = 0; $more -and $chosen.Count -lt $max; $i++) {
      $more = $false
      foreach ($k in @($s.byCat.Keys)) {
        $arr = @($s.byCat[$k] | Where-Object { -not $used.ContainsKey([string]$_.it.tacaItemId) -and -not $bases.ContainsKey($_.base) })
        if (-not $arr.Count) { continue }
        $more = $true
        $x = $arr[0]
        $used[[string]$x.it.tacaItemId] = $true; $bases[$x.base] = $true
        [void]$chosen.Add($x)
        if ($chosen.Count -ge $max) { break }
      }
    }
    if ($chosen.Count -lt $max) {
      $rest = @($s.byCat.Values | ForEach-Object { $_ } | Where-Object { -not $used.ContainsKey([string]$_.it.tacaItemId) } | Sort-Object pref, rank)
      foreach ($x in $rest) { if ($chosen.Count -ge $max) { break }; $used[[string]$x.it.tacaItemId] = $true; [void]$chosen.Add($x) }
    }
    $list = New-Object System.Collections.ArrayList
    foreach ($x in $chosen) {
      $prodId = [string]$x.it.tacaItemId
      if (-not $prodById.Contains($prodId)) {
        $url = Get-Link $x.it
        if (-not $url) { continue }
        $prodById[$prodId] = [ordered]@{ id = $prodId; name = $x.it.displayName; thumb = $x.it.thumbnailUrl; url = $url; cat = $x.cat }
      }
      [void]$list.Add($prodId)
    }
    # shop.json에는 상품 번호만 (상품 내용은 아래 묶음에 한 번만 넣어 파일을 작게)
    $itemsOut[$iid] = @($list)
    if ($pinned) { $s.note += " 고정 $pinned" }
    if (-not $list.Count) { [void]$noProduct.Add("$($r.name)($($s.note.Trim()))") }
    elseif ($s.note -match '깊게찾기|기억|고정') { Log "   $($r.name): $($list.Count)개 —$($s.note)" }
  }
  $withProd = @($itemsOut.Keys | Where-Object { $itemsOut[$_].Count -gt 0 }).Count
  $sumProd = ($itemsOut.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
  Log "품목별 상품: $($rules.items.Count)개 품목 중 $withProd 개에 상품 있음, 모두 $sumProd 개"
  if ($noProduct.Count) { Log "상품 없는 품목(앱에서 칸 숨김): $($noProduct -join ', ')" }

  # 상품 내용은 'byItem' 묶음에 한 번씩 넣어요. veg·fruit·meat·fish·grain·spice 묶음은 비워 둬요 (10/28 20시)
  #  - 새 앱(v0.5~): items의 상품 번호로 묶음에서 찾아요 (묶음 이름은 상관없음)
  #  - 예전 앱(v0.4): 모든 묶음에서 품목 이름으로 찾고, 못 찾으면 분류 묶음 상품을 대신 보여줬어요(피망→배추).
  #    분류 묶음을 비우면 못 찾은 품목은 칸이 숨겨져요.
  #  - 예전 앱은 앞에서부터 보여주니, 'B 이름으로 찾으면 A 상품도 걸리는' 경우 B 상품을 A보다 앞에 둬요
  $order = @($rules.items | ForEach-Object { [string]$_.id })
  if ($rules.oldAppOrder) { $order = @($rules.oldAppOrder | ForEach-Object { [string]$_ }) }
  $owners = @{}
  foreach ($iid in $order) { foreach ($pp in @($itemsOut[$iid])) { if (-not $pp) { continue }; if (-not $owners.ContainsKey($pp)) { $owners[$pp] = New-Object System.Collections.ArrayList }; [void]$owners[$pp].Add($iid) } }
  $before = @{}
  foreach ($iid in $order) { $before[$iid] = @{} }
  if ($rules.oldAppRe) {
    foreach ($b in $order) {
      $re = [string]$rules.oldAppRe.$b
      if (-not $re) { continue }
      foreach ($pp in @($owners.Keys)) {
        if ($owners[$pp] -contains $b) { continue }
        if ([string]$prodById[$pp].name -cmatch $re) { foreach ($a in $owners[$pp]) { if ($a -ne $b) { $before[$a][$b] = $true } } }
      }
    }
  }
  $left = New-Object System.Collections.ArrayList
  foreach ($iid in $order) { [void]$left.Add($iid) }
  $sorted = New-Object System.Collections.ArrayList
  while ($left.Count) {
    $pick = $null; $bestN = [int]::MaxValue
    foreach ($x in $left) {
      $n = @($before[$x].Keys | Where-Object { $left -contains $_ }).Count
      if ($n -eq 0) { $pick = $x; break }
      if ($n -lt $bestN) { $bestN = $n; $pick = $x }
    }
    [void]$sorted.Add($pick); $left.Remove($pick)
  }
  $byItem = New-Object System.Collections.ArrayList
  $gseen = @{}
  foreach ($iid in $sorted) {
    foreach ($pp in @($itemsOut[$iid])) {
      if (-not $pp -or $gseen.ContainsKey($pp)) { continue }
      $gseen[$pp] = $true
      [void]$byItem.Add($prodById[$pp])
    }
  }
  $newOut = [ordered]@{ byItem = @($byItem) }
  foreach ($k in @($out.Keys)) { $newOut[$k] = $out[$k] }
  foreach ($g in 'veg', 'fruit', 'meat', 'fish', 'grain', 'spice') { $newOut[$g] = @() }
  $out = $newOut
} else {
  Log '품목 규칙이 없어서 품목별 상품은 이번엔 건너뛰어요.'
}

Log "인기 상품 조회: 카테고리 $($BestState.Count)개, 모두 $(Best-Pages)쪽 (이번에 새로 받은 쪽 $($PageLog.fetched)개, 한도 때문에 못 받은 쪽 $($PageLog.budgetStop)번) · 오늘 조회 사용 $($Q.used)/10,000개"

# 지면 링크 (오아시스 신선식품, 특가)
$pages = [ordered]@{}
try { $pages.fresh = (Api 'POST' '/links' @{ landingType = 'FRESH_FOOD'; publisherId = $cfg.publisherId }).shortUrl } catch { Log "신선식품 지면 링크 실패: $_" }
try { $pages.deals = (Api 'POST' '/links' @{ landingType = 'SHOPPING_DEALS'; publisherId = $cfg.publisherId }).shortUrl } catch { Log "특가 지면 링크 실패: $_" }

Save-All

$total = ($out.Keys | Where-Object { $Shared -notcontains $_ } | ForEach-Object { $out[$_].Count } | Measure-Object -Sum).Sum
# 한도 때문에 ① 1쪽 조회부터 막힌 날은 품목 상품이 크게 줄어요 → 이럴 땐 올리지 않고 앱에 어제 상품을 그대로 둬요
if ($p1stop -gt 0 -and $withProd -lt 90) { Log "조회 한도 때문에 오늘 상품이 모자라요(품목 $withProd 개). 앱엔 어제 상품을 그대로 두고, 밤 12시 지나 다시 돌리면 돼요."; exit 1 }
if ($total -lt 5) { Log "상품이 너무 적어서($($total)개) 이번엔 올리지 않아요."; exit 1 }

$shop = [ordered]@{
  updatedAt  = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  disclosure = '토스쇼핑 쉐어링크 활동으로, 구매 시 일정액의 수수료를 받을 수 있어요'
  pages      = $pages
  groups     = $out
  items      = $itemsOut
  banchan    = $banchan
  # 앱은 안 쓰지만 규칙 만들 때 참고용 (장보기 관련 카테고리만 — 파일 크기 줄이기)
  categories = @($food | Where-Object { $_.path -match '신선식품|조미료|젓갈|액젓|소금|우유|반찬' } | ForEach-Object { [ordered]@{ id = $_.id; path = $_.path } })
}
$json = $shop | ConvertTo-Json -Depth 8 -Compress

# ── 5. GitHub에 올리기 ──
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
