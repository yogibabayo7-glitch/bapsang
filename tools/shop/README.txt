오늘밥상물가 - 토스쇼핑 추천 상품 자동 갱신 (내 컴퓨터에서 하루 한 번)

하는 일
  매일 아침 토스쇼핑 김장·채소·과일 등 카테고리 인기 상품을 가져와서
  내 쉐어링크를 만들고, 오늘밥상물가 앱이 읽는 목록(shop.json)을 GitHub에 올려요.

준비 1. 이 폴더를 원하는 곳에 둬요 (예: 문서\밥상물가\shop). 나중에 옮기면 1_install.bat을 다시 실행해요.

준비 2. shop-config.json 만들기
  - shop-config.json.example 파일을 복사해서 이름을 shop-config.json 으로 바꿔요.
  - 메모장으로 열어서 채워요.
      accessKey   : 쉐어링크 → 연동 → API 키 발급 → Access Key (복사 버튼)
      secretKey   : 같은 화면의 Secret Key
      publisherId : 이미 채워져 있어요 (회원 연동 ID)
      githubToken : 아래 준비 3에서 만든 토큰
  - 이 파일에는 비밀 키가 들어 있으니 다른 사람에게 보내거나 채팅에 올리지 마세요.

준비 3. GitHub 토큰 만들기 (앱 데이터 저장소에 파일 하나 올리는 권한)
  1) github.com 로그인 → 오른쪽 위 프로필 → Settings
  2) 왼쪽 맨 아래 Developer settings → Personal access tokens → Fine-grained tokens → Generate new token
  3) Token name: bapsang-shop / Expiration: 1 year
  4) Repository access: Only select repositories → bapsang
  5) Permissions → Repository permissions → Contents: Read and write
  6) Generate token → 나온 값(github_pat_...)을 복사해서 githubToken에 붙여넣기

준비 4. 1_install.bat 더블클릭
  - 매일 오전 9시 40분 자동 실행으로 등록하고, 지금 한 번 바로 돌려봐요.
  - "이 컴퓨터의 인터넷 주소는 ○○○ 예요" 라고 나오면:
    쉐어링크 → 연동 → API 키 발급 → 출발지 IP → 수정 → 그 주소를 추가하고 저장한 뒤
    2_run_now.bat 을 더블클릭해서 다시 돌려요.
  - "완료! 상품 ○○개를 올렸어요" 가 나오면 끝이에요.

그 뒤
  - 컴퓨터가 꺼져 있던 날은 다음에 켤 때 자동으로 돌아요. 못 돌아도 앱에는 전날 상품이 그대로 나와요.
  - 집 인터넷 주소가 바뀌면 shop-log.txt 에 새 주소가 적혀요. 그 주소를 출발지 IP에 추가하면 돼요.
  - 특정 상품을 빼야 하면(판매자 요청 등) shop-config.json 의 "block" 에 상품 번호를 넣어요. 예: "block": ["12345"]
  - 기록은 shop-log.txt 에 남아요.
