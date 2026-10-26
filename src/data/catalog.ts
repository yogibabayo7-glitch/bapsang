// 앱에 보여줄 품목 목록. 수집기(scripts/collect.ts)와 앱이 같이 써요.
// code: KAMIS 품목코드 / kind: 품종코드('*'면 그날 가장 많이 조사된 품종) / rank: 등급 우선순위
// season: 제철인 달 (1~12)

export type CategoryId = 'grain' | 'veg' | 'mush' | 'fruit' | 'meat' | 'fish' | 'spice';

export type CatalogEntry = {
  id: string;
  name: string;
  emoji: string;
  cat: CategoryId;
  code: string;
  kind: string;
  rank?: string[];
  season?: number[];
};

// KAMIS 부류코드 → 앱 카테고리
export const KAMIS_CATEGORY: Record<string, CategoryId> = {
  '100': 'grain',
  '200': 'veg',
  '300': 'mush',
  '400': 'fruit',
  '500': 'meat',
  '600': 'fish',
};

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  grain: '쌀·잡곡',
  veg: '채소',
  mush: '버섯·견과',
  fruit: '과일',
  meat: '고기·계란',
  fish: '수산',
  spice: '양념',
};

// 등급을 따로 안 정하면 이 순서로 고르기 (상품 → 한우 1+ → 일반란 → 기타)
export const DEFAULT_RANK = ['04', '02', '71', '00', '30', '21', '20', '24', '15', '28', '05', '03', '01', '16', '22', '25'];

export const CATALOG: CatalogEntry[] = [
  // 쌀·잡곡
  { id: 'rice', name: '쌀', emoji: '🍚', cat: 'grain', code: '111', kind: '01' },
  { id: 'glutinous-rice', name: '찹쌀', emoji: '🍙', cat: 'grain', code: '112', kind: '*' },
  { id: 'brown-rice', name: '현미', emoji: '🌾', cat: 'grain', code: '115', kind: '*' },
  { id: 'barley', name: '보리쌀', emoji: '🌾', cat: 'grain', code: '121', kind: '*' },
  { id: 'mixed-grain', name: '혼식곡', emoji: '🌾', cat: 'grain', code: '113', kind: '*' },
  { id: 'soybean', name: '콩', emoji: '🫘', cat: 'grain', code: '141', kind: '*' },
  { id: 'red-bean', name: '팥', emoji: '🫘', cat: 'grain', code: '142', kind: '*' },
  { id: 'mung-bean', name: '녹두', emoji: '🫛', cat: 'grain', code: '143', kind: '*' },
  { id: 'sweet-potato', name: '고구마', emoji: '🍠', cat: 'grain', code: '151', kind: '*', season: [9, 10, 11] },
  { id: 'potato', name: '감자', emoji: '🥔', cat: 'grain', code: '152', kind: '*', season: [6, 7, 8] },

  // 채소
  { id: 'cabbage', name: '배추', emoji: '🥬', cat: 'veg', code: '211', kind: '*', season: [11, 12] },
  { id: 'baby-cabbage', name: '알배기배추', emoji: '🥬', cat: 'veg', code: '279', kind: '*' },
  { id: 'young-cabbage', name: '얼갈이배추', emoji: '🥬', cat: 'veg', code: '215', kind: '*' },
  { id: 'radish', name: '무', emoji: '🤍', cat: 'veg', code: '231', kind: '*', season: [10, 11, 12] },
  { id: 'young-radish', name: '열무', emoji: '🌿', cat: 'veg', code: '233', kind: '*', season: [5, 6, 7] },
  { id: 'cabbage-head', name: '양배추', emoji: '🥬', cat: 'veg', code: '212', kind: '*' },
  { id: 'spinach', name: '시금치', emoji: '🥬', cat: 'veg', code: '213', kind: '*', season: [12, 1, 2] },
  { id: 'lettuce', name: '상추', emoji: '🥗', cat: 'veg', code: '214', kind: '01' },
  { id: 'perilla', name: '깻잎', emoji: '🌿', cat: 'veg', code: '253', kind: '*', season: [7, 8, 9] },
  { id: 'chives', name: '부추', emoji: '🌿', cat: 'veg', code: '254', kind: '*', season: [3, 4] },
  { id: 'water-parsley', name: '미나리', emoji: '🌿', cat: 'veg', code: '252', kind: '*', season: [2, 3, 4] },
  { id: 'onion', name: '양파', emoji: '🧅', cat: 'veg', code: '245', kind: '*', season: [5, 6] },
  { id: 'green-onion', name: '대파', emoji: '🌿', cat: 'veg', code: '246', kind: '00', season: [11, 12, 1] },
  { id: 'scallion', name: '쪽파', emoji: '🌱', cat: 'veg', code: '246', kind: '02' },
  { id: 'garlic', name: '깐마늘', emoji: '🧄', cat: 'spice', code: '258', kind: '*', season: [5, 6] },
  { id: 'ginger', name: '생강', emoji: '🫚', cat: 'spice', code: '247', kind: '*', season: [10, 11] },
  { id: 'carrot', name: '당근', emoji: '🥕', cat: 'veg', code: '232', kind: '*' },
  { id: 'cucumber', name: '오이', emoji: '🥒', cat: 'veg', code: '223', kind: '02', season: [5, 6, 7] },
  { id: 'zucchini', name: '애호박', emoji: '🥒', cat: 'veg', code: '224', kind: '01', season: [6, 7, 8] },
  { id: 'eggplant', name: '가지', emoji: '🍆', cat: 'veg', code: '251', kind: '*', season: [7, 8] },
  { id: 'tomato', name: '토마토', emoji: '🍅', cat: 'veg', code: '225', kind: '*', season: [5, 6, 7] },
  { id: 'cherry-tomato', name: '방울토마토', emoji: '🍅', cat: 'veg', code: '422', kind: '01' },
  { id: 'paprika', name: '파프리카', emoji: '🫑', cat: 'veg', code: '256', kind: '*' },
  { id: 'bell-pepper', name: '피망', emoji: '🫑', cat: 'veg', code: '255', kind: '*' },
  { id: 'broccoli', name: '브로콜리', emoji: '🥦', cat: 'veg', code: '280', kind: '*', season: [11, 12, 1, 2] },
  { id: 'green-pepper', name: '풋고추', emoji: '🌶️', cat: 'veg', code: '242', kind: '00', season: [7, 8] },
  { id: 'cheongyang', name: '청양고추', emoji: '🌶️', cat: 'veg', code: '242', kind: '03', season: [7, 8] },
  { id: 'red-pepper', name: '붉은고추', emoji: '🌶️', cat: 'veg', code: '243', kind: '*', season: [8, 9] },
  { id: 'dried-pepper', name: '건고추', emoji: '🌶️', cat: 'spice', code: '241', kind: '*', season: [8, 9] },
  { id: 'pepper-powder', name: '고춧가루', emoji: '🌶️', cat: 'spice', code: '248', kind: '00' },
  { id: 'watermelon', name: '수박', emoji: '🍉', cat: 'veg', code: '221', kind: '*', season: [6, 7, 8] },
  { id: 'korean-melon', name: '참외', emoji: '🍈', cat: 'veg', code: '222', kind: '*', season: [4, 5, 6] },
  { id: 'melon', name: '멜론', emoji: '🍈', cat: 'veg', code: '257', kind: '*' },
  { id: 'strawberry', name: '딸기', emoji: '🍓', cat: 'veg', code: '226', kind: '*', season: [12, 1, 2, 3, 4] },

  // 버섯·견과
  { id: 'oyster-mushroom', name: '느타리버섯', emoji: '🍄', cat: 'mush', code: '315', kind: '*', season: [9, 10] },
  { id: 'enoki', name: '팽이버섯', emoji: '🍄', cat: 'mush', code: '316', kind: '*' },
  { id: 'king-oyster', name: '새송이버섯', emoji: '🍄', cat: 'mush', code: '317', kind: '*' },
  { id: 'sesame', name: '참깨', emoji: '🌰', cat: 'spice', code: '312', kind: '01' },
  { id: 'peanut', name: '땅콩', emoji: '🥜', cat: 'mush', code: '314', kind: '01', season: [9, 10] },
  { id: 'walnut', name: '호두', emoji: '🌰', cat: 'mush', code: '318', kind: '*' },
  { id: 'almond', name: '아몬드', emoji: '🌰', cat: 'mush', code: '319', kind: '*' },

  // 과일
  { id: 'apple', name: '사과', emoji: '🍎', cat: 'fruit', code: '411', kind: '*', season: [9, 10, 11] },
  { id: 'pear', name: '배', emoji: '🍐', cat: 'fruit', code: '412', kind: '*', season: [9, 10, 11] },
  { id: 'persimmon', name: '단감', emoji: '🟠', cat: 'fruit', code: '416', kind: '*', season: [10, 11] },
  { id: 'tangerine', name: '감귤', emoji: '🍊', cat: 'fruit', code: '415', kind: '*', season: [11, 12, 1, 2] },
  { id: 'grape', name: '포도', emoji: '🍇', cat: 'fruit', code: '414', kind: '01', season: [8, 9] },
  { id: 'shine-muscat', name: '샤인머스켓', emoji: '🍇', cat: 'fruit', code: '414', kind: '12', season: [8, 9, 10] },
  { id: 'peach', name: '복숭아', emoji: '🍑', cat: 'fruit', code: '413', kind: '*', season: [7, 8] },
  { id: 'kiwi', name: '키위', emoji: '🥝', cat: 'fruit', code: '437', kind: '*' },
  { id: 'banana', name: '바나나', emoji: '🍌', cat: 'fruit', code: '418', kind: '*' },
  { id: 'pineapple', name: '파인애플', emoji: '🍍', cat: 'fruit', code: '420', kind: '*' },
  { id: 'orange', name: '오렌지', emoji: '🍊', cat: 'fruit', code: '421', kind: '*' },
  { id: 'lemon', name: '레몬', emoji: '🍋', cat: 'fruit', code: '424', kind: '*' },
  { id: 'cherry', name: '체리', emoji: '🍒', cat: 'fruit', code: '425', kind: '*' },
  { id: 'mango', name: '망고', emoji: '🥭', cat: 'fruit', code: '428', kind: '*' },
  { id: 'blueberry', name: '블루베리', emoji: '🫐', cat: 'fruit', code: '429', kind: '*' },
  { id: 'avocado', name: '아보카도', emoji: '🥑', cat: 'fruit', code: '430', kind: '*' },

  // 고기·계란
  { id: 'egg', name: '계란', emoji: '🥚', cat: 'meat', code: '9903', kind: '23' },
  { id: 'milk', name: '우유', emoji: '🥛', cat: 'meat', code: '9908', kind: '*' },
  { id: 'pork-belly', name: '삼겹살', emoji: '🥓', cat: 'meat', code: '4304', kind: '27' },
  { id: 'pork-neck', name: '돼지 목심', emoji: '🐷', cat: 'meat', code: '4304', kind: '68' },
  { id: 'pork-shoulder', name: '돼지 앞다리', emoji: '🐷', cat: 'meat', code: '4304', kind: '25' },
  { id: 'pork-rib', name: '돼지갈비', emoji: '🍖', cat: 'meat', code: '4304', kind: '28' },
  { id: 'beef-sirloin', name: '한우 등심', emoji: '🥩', cat: 'meat', code: '4301', kind: '22', rank: ['02', '03', '01'] },
  { id: 'beef-tenderloin', name: '한우 안심', emoji: '🥩', cat: 'meat', code: '4301', kind: '21', rank: ['02', '03', '01'] },
  { id: 'beef-brisket', name: '한우 양지', emoji: '🥩', cat: 'meat', code: '4301', kind: '40', rank: ['02', '03', '01'] },
  { id: 'beef-rib', name: '한우 갈비', emoji: '🍖', cat: 'meat', code: '4301', kind: '50', rank: ['02', '03', '01'] },
  { id: 'us-beef', name: '수입 소갈비살', emoji: '🥩', cat: 'meat', code: '4401', kind: '37', rank: ['81', '82'] },
  { id: 'imported-pork', name: '수입 삼겹살', emoji: '🥓', cat: 'meat', code: '4402', kind: '27' },
  { id: 'chicken', name: '닭고기', emoji: '🍗', cat: 'meat', code: '9901', kind: '99' },

  // 수산
  { id: 'mackerel', name: '고등어', emoji: '🐟', cat: 'fish', code: '611', kind: '05', rank: ['20', '21'], season: [9, 10, 11] },
  { id: 'hairtail', name: '갈치', emoji: '🐟', cat: 'fish', code: '613', kind: '03', rank: ['21', '20', '22'], season: [9, 10, 11] },
  { id: 'yellow-croaker', name: '참조기', emoji: '🐟', cat: 'fish', code: '614', kind: '06', rank: ['21', '22'] },
  { id: 'gulbi', name: '굴비', emoji: '🐟', cat: 'fish', code: '614', kind: '07' },
  { id: 'pollack', name: '명태', emoji: '🐟', cat: 'fish', code: '615', kind: '04', rank: ['20', '21'], season: [12, 1, 2] },
  { id: 'spanish-mackerel', name: '삼치', emoji: '🐟', cat: 'fish', code: '616', kind: '*', season: [11, 12, 1, 2] },
  { id: 'saury', name: '꽁치', emoji: '🐟', cat: 'fish', code: '612', kind: '*' },
  { id: 'squid', name: '오징어', emoji: '🦑', cat: 'fish', code: '619', kind: '03', rank: ['20', '21'], season: [7, 8, 9, 10] },
  { id: 'octopus', name: '낙지', emoji: '🐙', cat: 'fish', code: '664', kind: '*' },
  { id: 'shrimp', name: '새우', emoji: '🦐', cat: 'fish', code: '654', kind: '*', season: [9, 10, 11] },
  { id: 'crab', name: '꽃게', emoji: '🦀', cat: 'fish', code: '656', kind: '00', season: [4, 5, 9, 10] },
  { id: 'abalone', name: '전복', emoji: '🐚', cat: 'fish', code: '653', kind: '*' },
  { id: 'mussel', name: '홍합', emoji: '🦪', cat: 'fish', code: '658', kind: '02', season: [11, 12, 1, 2] },
  { id: 'clam', name: '바지락', emoji: '🐚', cat: 'fish', code: '661', kind: '*', season: [3, 4, 5] },
  { id: 'cockle', name: '꼬막', emoji: '🐚', cat: 'fish', code: '665', kind: '*', season: [12, 1, 2, 3] },
  { id: 'anchovy', name: '마른멸치', emoji: '🐟', cat: 'fish', code: '638', kind: '*', rank: ['28', '27', '29'] },
  { id: 'dried-squid', name: '마른오징어', emoji: '🦑', cat: 'fish', code: '640', kind: '*' },
  { id: 'laver', name: '김', emoji: '🍙', cat: 'fish', code: '641', kind: '00', season: [12, 1, 2] },
  { id: 'seaweed', name: '마른미역', emoji: '🌿', cat: 'fish', code: '642', kind: '*' },
  { id: 'kelp', name: '건다시마', emoji: '🌿', cat: 'fish', code: '660', kind: '*' },
  { id: 'salted-shrimp', name: '새우젓', emoji: '🦐', cat: 'spice', code: '650', kind: '*', season: [11] },
  { id: 'fish-sauce', name: '멸치액젓', emoji: '🫙', cat: 'spice', code: '651', kind: '*', season: [11] },
  { id: 'sea-salt', name: '천일염', emoji: '🧂', cat: 'spice', code: '652', kind: '*' },
];

// KAMIS가 매일 소매가격을 조사하는 도시 (지역코드)
export const SURVEY_CITIES: Record<string, string> = {
  '1101': '서울', '2100': '부산', '2200': '대구', '2300': '인천', '2401': '광주', '2501': '대전',
  '2601': '울산', '2701': '세종', '3111': '수원', '3112': '성남', '3113': '의정부', '3138': '고양',
  '3145': '용인', '3211': '춘천', '3214': '강릉', '3311': '청주', '3411': '천안', '3511': '전주',
  '3613': '순천', '3711': '포항', '3714': '안동', '3814': '창원', '3818': '김해', '3911': '제주',
};

// 앱에서 고르는 지역.
// kind: all(전국) / sido(시·도) / city(도시)
// members: 이 지역 가격 = 이 도시들의 평균 (없으면 id가 곧 조사 도시)
export type Region = { id: string; name: string; kind: 'all' | 'sido' | 'city'; parent?: string; members?: string[] };

const GG = ['3111', '3112', '3113', '3138', '3145'];
export const REGIONS: Region[] = [
  { id: 'all', name: '전국', kind: 'all', members: Object.keys(SURVEY_CITIES) },
  { id: '1101', name: '서울', kind: 'sido' },
  { id: 'gyeonggi', name: '경기', kind: 'sido', members: GG },
  { id: '2300', name: '인천', kind: 'sido' },
  { id: '2100', name: '부산', kind: 'sido' },
  { id: '2200', name: '대구', kind: 'sido' },
  { id: '2401', name: '광주', kind: 'sido' },
  { id: '2501', name: '대전', kind: 'sido' },
  { id: '2601', name: '울산', kind: 'sido' },
  { id: '2701', name: '세종', kind: 'sido' },
  { id: 'gangwon', name: '강원', kind: 'sido', members: ['3211', '3214'] },
  { id: 'chungbuk', name: '충북', kind: 'sido', members: ['3311'] },
  { id: 'chungnam', name: '충남', kind: 'sido', members: ['3411'] },
  { id: 'jeonbuk', name: '전북', kind: 'sido', members: ['3511'] },
  { id: 'jeonnam', name: '전남', kind: 'sido', members: ['3613'] },
  { id: 'gyeongbuk', name: '경북', kind: 'sido', members: ['3711', '3714'] },
  { id: 'gyeongnam', name: '경남', kind: 'sido', members: ['3814', '3818'] },
  { id: '3911', name: '제주', kind: 'sido' },
  // 도시별 (도 안에 조사 도시가 2곳 이상인 곳만)
  ...GG.map((id) => ({ id, name: SURVEY_CITIES[id], kind: 'city' as const, parent: 'gyeonggi' })),
  { id: '3211', name: '춘천', kind: 'city', parent: 'gangwon' },
  { id: '3214', name: '강릉', kind: 'city', parent: 'gangwon' },
  { id: '3711', name: '포항', kind: 'city', parent: 'gyeongbuk' },
  { id: '3714', name: '안동', kind: 'city', parent: 'gyeongbuk' },
  { id: '3814', name: '창원', kind: 'city', parent: 'gyeongnam' },
  { id: '3818', name: '김해', kind: 'city', parent: 'gyeongnam' },
];

// 지역 이름 옆에 붙일 설명 (예: 수원·성남·의정부·고양·용인 평균)
export function regionNote(r: Region): string {
  if (r.kind !== 'sido' || !r.members) return '';
  const names = r.members.map((m) => SURVEY_CITIES[m]);
  return names.length > 1 ? `${names.join('·')} 평균` : `${names[0]} 기준`;
}
