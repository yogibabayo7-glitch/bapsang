import { Storage, openURL, TossAds } from '@apps-in-toss/web-framework';
// 글씨체는 앱 안에 넣어 둬요 (0.1.1처럼 인터넷이 약해도 손글씨가 보이게)
import '@fontsource/gaegu/400.css';
import '@fontsource/gaegu/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
// 0.1.9: 나머지 손글씨도 전부 앱 안에 넣어요 (인터넷 없이도 5가지 다 나오게)
import '@fontsource/nanum-pen-script/400.css';
import '@fontsource/hi-melody/400.css';
import './fonts/kyobo.css';
window.TossAds = TossAds;

/* 토스 저장소 (0.1.1과 같음 — 토스 밖 미리보기에선 브라우저 저장소로 대신) */
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
let tossOK = true;
const store = {
  async get(k){ if(tossOK){ try { return await withTimeout(Storage.getItem(k), 1500); } catch(e){ tossOK = false; } } try { return localStorage.getItem(k); } catch(e){ return null; } },
  async set(k, v){ if(tossOK){ try { await withTimeout(Storage.setItem(k, v), 3000); return; } catch(e){ tossOK = false; } } try { localStorage.setItem(k, v); } catch(e){} },
  async del(k){ if(tossOK){ try { await withTimeout(Storage.removeItem(k), 3000); return; } catch(e){ tossOK = false; } } try { localStorage.removeItem(k); } catch(e){} },
};
/* 바깥 링크(구글 캘린더 📲) 열기 (0.1.1과 같음 — 토스 화면에선 openURL로만 열려요) */
function openExternal(url){ try { const r = openURL(url); if(r && r.catch) r.catch(() => window.open(url, '_blank')); } catch(e){ window.open(url, '_blank'); } }
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href]'); if(!a) return;
  const href = a.getAttribute('href') || ''; if(!/^https?:\/\//i.test(href)) return;
  e.preventDefault(); e.stopPropagation(); openExternal(href);
}, true);

"use strict";
/* ---------- utils ---------- */
const $ = (s, r=document) => r.querySelector(s);
const pad = n => String(n).padStart(2,'0');
const key = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y,m-1,d); };
const addDays = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const monday = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const w = (x.getDay()+6)%7; return addDays(x,-w); };
const sunday = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -x.getDay()); };
const clone = o => o == null ? null : JSON.parse(JSON.stringify(o));
const uid = () => Math.random().toString(36).slice(2,9);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DOW = ['일','월','화','수','목','금','토'];
const MON = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const WEATHER = ['☀️','⛅','☔','❄️','🌬️'];
const MOOD = ['🙂','😍','😌','😐','😟','😠'];
/* 공휴일·대체공휴일 (2025~2027: 우주항공청 월력요항 공식 발표 / 2028~2050: 아래에서 자동 계산) */
const HOLI = {
  '2025-01-01':'신정','2025-01-27':'임시공휴일','2025-01-28':'설 연휴','2025-01-29':'설날','2025-01-30':'설 연휴','2025-03-01':'삼일절','2025-03-03':'대체공휴일',
  '2025-05-05':'어린이날·부처님오신날','2025-05-06':'대체공휴일','2025-06-03':'대통령선거','2025-06-06':'현충일','2025-08-15':'광복절','2025-10-03':'개천절',
  '2025-10-05':'추석 연휴','2025-10-06':'추석','2025-10-07':'추석 연휴','2025-10-08':'대체공휴일','2025-10-09':'한글날','2025-12-25':'성탄절',
  '2026-01-01':'신정','2026-02-16':'설 연휴','2026-02-17':'설날','2026-02-18':'설 연휴','2026-03-01':'삼일절','2026-03-02':'대체공휴일','2026-05-01':'노동절',
  '2026-05-05':'어린이날','2026-05-24':'부처님오신날','2026-05-25':'대체공휴일','2026-06-03':'지방선거','2026-06-06':'현충일','2026-07-17':'제헌절','2026-08-15':'광복절',
  '2026-08-17':'대체공휴일','2026-09-24':'추석 연휴','2026-09-25':'추석','2026-09-26':'추석 연휴','2026-10-03':'개천절','2026-10-05':'대체공휴일','2026-10-09':'한글날','2026-12-25':'성탄절',
  '2027-01-01':'신정','2027-02-06':'설 연휴','2027-02-07':'설날','2027-02-08':'설 연휴','2027-02-09':'대체공휴일','2027-03-01':'삼일절','2027-05-01':'노동절','2027-05-03':'대체공휴일',
  '2027-05-05':'어린이날','2027-05-13':'부처님오신날','2027-06-06':'현충일','2027-07-17':'제헌절','2027-07-19':'대체공휴일','2027-08-15':'광복절','2027-08-16':'대체공휴일',
  '2027-09-14':'추석 연휴','2027-09-15':'추석','2027-09-16':'추석 연휴','2027-10-03':'개천절','2027-10-04':'대체공휴일','2027-10-09':'한글날','2027-10-11':'대체공휴일','2027-12-25':'성탄절','2027-12-27':'대체공휴일'
};
/* 공휴일 자동 계산 (2028~2050) — 공휴일법·대체공휴일 규정대로. 2025~2027년은 위의 공식 발표 표를 그대로 써요 */
const LUNAR = {"2025":["2025-01-29","2025-05-05","2025-10-06"],"2026":["2026-02-17","2026-05-24","2026-09-25"],"2027":["2027-02-07","2027-05-13","2027-09-15"],"2028":["2028-01-27","2028-05-02","2028-10-03"],"2029":["2029-02-13","2029-05-20","2029-09-22"],"2030":["2030-02-03","2030-05-09","2030-09-12"],"2031":["2031-01-23","2031-05-28","2031-10-01"],"2032":["2032-02-11","2032-05-16","2032-09-19"],"2033":["2033-01-31","2033-05-06","2033-09-08"],"2034":["2034-02-19","2034-05-25","2034-09-27"],"2035":["2035-02-08","2035-05-15","2035-09-16"],"2036":["2036-01-28","2036-05-03","2036-10-04"],"2037":["2037-02-15","2037-05-22","2037-09-24"],"2038":["2038-02-04","2038-05-11","2038-09-13"],"2039":["2039-01-24","2039-04-30","2039-10-02"],"2040":["2040-02-12","2040-05-18","2040-09-21"],"2041":["2041-02-01","2041-05-07","2041-09-10"],"2042":["2042-01-22","2042-05-26","2042-09-28"],"2043":["2043-02-10","2043-05-16","2043-09-17"],"2044":["2044-01-30","2044-05-05","2044-10-05"],"2045":["2045-02-17","2045-05-24","2045-09-25"],"2046":["2046-02-06","2046-05-13","2046-09-15"],"2047":["2047-01-26","2047-05-02","2047-10-04"],"2048":["2048-02-14","2048-05-20","2048-09-22"],"2049":["2049-02-02","2049-05-09","2049-09-11"],"2050":["2050-01-23","2050-05-28","2050-09-30"]}; // 연도: [설날, 부처님오신날, 추석] (한국천문연구원 음력 기준)
function autoHoli(y){
  const out = {}, k = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const P = s => { const [a,b,c] = s.split('-').map(Number); return new Date(a,b-1,c); };
  const add = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
  const put = (d,n) => { const s = k(d); out[s] = out[s] ? out[s]+'·'+n : n; };
  const L = LUNAR[y]; if(!L) return out;
  const fixed = [['01-01','신정',0],['03-01','삼일절',1],['05-01','노동절',1],['05-05','어린이날',1],['06-06','현충일',0],['07-17','제헌절',1],['08-15','광복절',1],['10-03','개천절',1],['10-09','한글날',1],['12-25','성탄절',1]];
  const subs = []; // [기준날짜들, 토요일도 대체?]
  fixed.forEach(([md,n,s]) => { const d = P(y+'-'+md); put(d,n); if(s) subs.push([[d], true]); });
  const seol = P(L[0]), chu = P(L[2]), bud = P(L[1]);
  put(add(seol,-1),'설 연휴'); put(seol,'설날'); put(add(seol,1),'설 연휴');
  put(add(chu,-1),'추석 연휴'); put(chu,'추석'); put(add(chu,1),'추석 연휴');
  put(bud,'부처님오신날'); subs.push([[bud], true]);
  subs.push([[add(seol,-1),seol,add(seol,1)], false], [[add(chu,-1),chu,add(chu,1)], false]);
  // 선거일: 임기만료일 전 N일 이후 첫 수요일
  const wed = d => { let x = new Date(d); while(x.getDay()!==3) x = add(x,1); return x; };
  if((y-2028)%4===0) put(wed(add(new Date(y,4,29),-50)),'국회의원선거');
  if((y-2030)%4===0) put(wed(add(new Date(y,5,30),-30)),'지방선거');
  if((y-2030)%5===0) put(wed(add(new Date(y,5,3),-70)),'대통령선거');
  // 대체공휴일: 겹친 날 다음의 첫 '쉬지 않는 날'
  const base = new Set(Object.keys(out)), taken = new Set();
  const overlap = d => (out[k(d)]||'').includes('·');
  subs.forEach(([ds, sat]) => {
    const hit = ds.some(d => d.getDay()===0 || (sat && d.getDay()===6) || overlap(d));
    if(!hit) return;
    let x = add(ds[ds.length-1], 1);
    while(base.has(k(x)) || taken.has(k(x)) || x.getDay()===0 || (sat && x.getDay()===6)) x = add(x,1);
    taken.add(k(x)); put(x,'대체공휴일');
  });
  return out;
}

// 공식 표에 없는 해(2028~2050)는 자동 계산해서 채워요 — 이미 있는 날짜는 건드리지 않아요
for(let y = 2028; y <= 2050; y++){ const a = autoHoli(y); Object.keys(a).forEach(d => { if(!HOLI[d]) HOLI[d] = a[d]; }); }
const hname = k => HOLI[k] ? `<span class="hname">${HOLI[k]}</span>` : '';
const todayKey = () => key(new Date());

/* ---------- state ---------- */
const LS = 'my-diary-v1'; // 0.1.1과 같은 저장 이름 (기존 일기 그대로 보이게)
let days = {};          // key -> doc
let view = 'day', cur = new Date(), tool = 'pen', doneStyle = 'hl';
let hist = [], redo = [];
let typing = null;      // {k, before, timer}
let db = null, col = null, online = false;
const dirty = new Set(), writing = new Set();
let renderLater = false;

let saveTimer = null;
function saveLocal(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveText, 250); }
function saveText(){
  const txt = {}; Object.keys(days).forEach(k => { if(!isPhoto(k)) txt[k] = days[k]; });
  store.set(LS, JSON.stringify({days: txt, view, doneStyle, fontId, hlColor}));
}
function savePhoto(k){
  const ids = Object.keys(days).filter(isPhoto);
  if(days[k]) store.set(LS + ':' + k, JSON.stringify(days[k])); else store.del(LS + ':' + k);
  store.set(LS + ':photo-ids', JSON.stringify(ids));
}
async function load(){
  try { const s = JSON.parse(await store.get(LS) || '{}'); days = s.days || {}; view = s.view || 'day'; doneStyle = s.doneStyle || 'hl';
    if(s.fontId) fontId = s.fontId; if(s.hlColor && HLC[s.hlColor]) hlColor = s.hlColor; } catch(e){}
  try {
    const ids = JSON.parse(await store.get(LS + ':photo-ids') || '[]');
    for(const pk of ids){ const v = await store.get(LS + ':' + pk); if(v) days[pk] = JSON.parse(v); }
  } catch(e){}
  // 0.1.2~0.1.5에서 쓴 기록(다른 이름으로 저장됨)도 빠짐없이 가져와요 — 이미 있는 날은 건드리지 않아요
  try {
    const old = JSON.parse(localStorage.getItem('spiralday-diary-v1') || '{}').days || {};
    const oldPh = JSON.parse(localStorage.getItem('spiralday-diary-v1-photos') || '{}');
    let moved = 0;
    Object.keys(old).forEach(k => { if(!days[k]){ days[k] = old[k]; moved++; } });
    Object.keys(oldPh).forEach(k => { if(!days[k]){ days[k] = oldPh[k]; savePhoto(k); moved++; } });
    if(moved) saveLocal();
  } catch(e){}
}
const isPhoto = k => k.startsWith('p-');

/* ---------- 손글씨 폰트 ---------- */
const FONTS = [
  {id:'gaegu',    name:'개구',                  fam:"'Gaegu'",            hs:1},
  {id:'nanumpen', name:'나눔손글씨 펜',          fam:"'Nanum Pen Script'", hs:1.22},
  {id:'himelody', name:'하이멜로디',            fam:"'Hi Melody'",        hs:1.1},
  {id:'kyobo24',  name:'교보 손글씨 2024 박서우', fam:"'KyoboPSW'",         hs:.92},
  {id:'kyobo25',  name:'교보 손글씨 2025 이유빈', fam:"'KyoboLYB'",         hs:.95}
];
let fontId = 'gaegu';
try { fontId = localStorage.getItem(LS+'-font') || 'gaegu'; } catch(e){}
function applyFont(){
  const f = FONTS.find(x=>x.id===fontId) || FONTS[0];
  const r = document.documentElement.style;
  r.setProperty('--hand', f.fam + ", 'Gaegu', cursive"); r.setProperty('--hs', f.hs);
}
applyFont();

/* ---------- 형광펜 색 ---------- */
const HLC = {
  yellow:['노랑','rgba(240,222,40,.78)'], red:['빨강','rgba(240,65,100,.55)'], orange:['주황','rgba(255,150,40,.68)'],
  green:['초록','rgba(110,212,90,.66)'], blue:['파랑','rgba(40,180,240,.58)'], navy:['남색','rgba(55,85,215,.48)'], purple:['보라','rgba(190,75,230,.5)']
};
let hlColor = 'yellow';
try { hlColor = localStorage.getItem(LS+'-hlc') || 'yellow'; if(!HLC[hlColor]) hlColor = 'yellow'; } catch(e){}
const hlCss = c => (HLC[c] || HLC.yellow)[1];
const hlStyle = it => it.mark === 'hl' ? ` style="--hl:${hlCss(it.hc)}"` : '';
function setMark(x, m){
  if(m === 'hl'){ if(x.mark === 'hl' && (x.hc || 'yellow') === hlColor){ x.mark = null; delete x.hc; } else { x.mark = 'hl'; x.hc = hlColor; } }
  else { x.mark = x.mark === m ? null : m; delete x.hc; }
}
function drawHlc(){
  document.documentElement.style.setProperty('--hl', hlCss(hlColor));
  const el = $('#hlc'); if(!el) return;
  el.innerHTML = Object.keys(HLC).map(c => `<button class="dot${c===hlColor?' on':''}" data-hlc="${c}" title="${HLC[c][0]} 형광펜" aria-label="${HLC[c][0]} 형광펜" style="background-color:${HLC[c][1]}"></button>`).join('');
}
function fontModal(ok){
  const off = f => ok && ok[f.id] === false;
  const fl = $('#fly'); if(!fl) return;
  fl.innerHTML = `<div class="flyh">✍️ 글씨체<span>누르면 바로 바뀌어요</span></div>
    <div class="fonts">${FONTS.map(f=>`<button class="fopt${f.id===fontId?' on':''}" data-font="${f.id}" ${off(f)?'disabled':''}>
      <span class="fname">${f.name}${off(f)?' · 준비 중':''}</span>
      <span class="fprev" style="font-family:${f.fam}, cursive;font-size:${Math.round(23*f.hs)}px">오늘도 수고했어! 내일 3시 약속</span></button>`).join('')}</div>`;
}
function closeFly(){ const fl = $('#fly'); if(fl) fl.classList.remove('show'); }
function flyOpen(mode){ const fl = $('#fly'); return !!fl && fl.classList.contains('show') && fl.dataset.mode === mode; }
function placeFly(fl, btn, mode){
  fl.dataset.mode = mode;
  const r = btn.getBoundingClientRect(), bar = $('#bar').getBoundingClientRect();
  const top = Math.max(8, Math.min(r.top - 6, innerHeight - 300));
  fl.style.left = (bar.right + 8) + 'px'; fl.style.top = top + 'px'; fl.style.maxHeight = (innerHeight - top - 12) + 'px';
  fl.classList.add('show');
}
function openHl(){
  const fl = $('#fly'), hb = $('#bar [data-tool="hl"]'); if(!fl || !hb) return;
  fl.innerHTML = `<div class="flyh">🖍 형광펜 색<span>고른 뒤 끝낸 일정을 누르세요</span></div>
    <div class="hlgrid">${Object.keys(HLC).map(c => `<button class="hlopt${c===hlColor?' on':''}" data-hlc="${c}"><span class="hls" style="--hl:${HLC[c][1]}">${HLC[c][0]}</span></button>`).join('')}</div>`;
  placeFly(fl, hb, 'hl');
}
function openFonts(){
  const fl = $('#fly'), pb = $('#bar [data-tool="pen"]'); if(!fl || !pb) return;
  fontModal(null);
  placeFly(fl, pb, 'font');
  const late = new Promise(r => setTimeout(() => r(null), 4000));
  Promise.all(FONTS.map(f => Promise.race([
    document.fonts.load('20px ' + f.fam, '오늘도').then(a => a.length > 0, () => false), late
  ]).then(v => [f.id, v]))).then(list => {
    if(!flyOpen('font')) return;
    fontModal(Object.fromEntries(list));
  });
}
const photosOf = k => Object.keys(days).filter(x => isPhoto(x) && days[x].date === k).map(x => ({k:x, ...days[x]})).sort((a,b)=>a.ts-b.ts);

const blankDoc = () => ({title:'', weather:'', mood:'', items:[], line:''});
function get(k){ return days[k] || blankDoc(); }
function ensure(k){ if(!days[k]) days[k] = blankDoc(); if(!days[k].items) days[k].items = []; return days[k]; }

/* ---------- history (undo/redo) ---------- */
function flushTyping(){
  if(!typing) return;
  clearTimeout(typing.timer);
  const after = clone(days[typing.k]);
  if(JSON.stringify(after) !== JSON.stringify(typing.before)) { hist.push({k:typing.k, before:typing.before, after}); redo = []; trim(); }
  typing = null;
}
function trim(){ if(hist.length > 300) hist.shift(); }
function mutate(k, fn, noRender){
  flushTyping();
  const before = clone(days[k] || null);
  fn(ensure(k));
  hist.push({k, before, after: clone(days[k])}); redo = []; trim();
  commit(k);
  if(!noRender) render();
}
function startTyping(k){
  if(typing && typing.k !== k) flushTyping();
  if(!typing) typing = {k, before: clone(days[k] || null)};
  clearTimeout(typing.timer);
  typing.timer = setTimeout(flushTyping, 800);
}
function applySnap(k, doc){ if(doc) days[k] = clone(doc); else delete days[k]; commit(k); }
function undo(){
  flushTyping();
  const h = hist.pop(); if(!h){ toast('더 되돌릴 게 없어요'); return; }
  applySnap(h.k, h.before); redo.push(h); render(true); toast('↶ 한 단계 되돌렸어요');
}
function doRedo(){
  flushTyping();
  const h = redo.pop(); if(!h){ toast('다시 할 게 없어요'); return; }
  applySnap(h.k, h.after); hist.push(h); render(true); toast('↷ 다시 적용했어요');
}

/* ---------- persistence (cloud: same diary on PC & phone) ---------- */
function commit(k){ saveLocal(); if(isPhoto(k)) savePhoto(k); if(col){ dirty.add(k); setTimeout(()=>pushDoc(k), 400); } } // 0.1.6 수정: 빠졌던 PC로 올리기 다시 넣음 (0.1.5와 같음)
async function pushDoc(k){
  if(!col || writing.has(k) || !dirty.has(k)) return;
  dirty.delete(k); writing.add(k);
  try {
    const ref = col.doc(k);
    if(days[k]) await ref.set(clone(days[k])); else await ref.delete();
  } catch(e){
    if(e && e.code === 'unavailable'){ dirty.add(k); setTimeout(()=>{writing.delete(k); pushDoc(k);}, 1500 + Math.random()*1000); return; }
    if(e && e.code === 'invalid_argument'){ setSync('⚠️ 저장 권한이 없어 이 기기에만 저장돼요'); col = null; }
    else if(e && e.code === 'quota_exceeded'){ toast('저장 공간이 가득 찼어요'); }
  }
  writing.delete(k);
  if(dirty.has(k)) pushDoc(k);
}
function setSync(t){ $('#sync').textContent = t; }

async function connect(){
  if(!window.claude || !window.claude.use){ setSync('💾 이 기기(브라우저)에만 저장 중'); return; }
  const timer = setTimeout(()=>{ if(!online) setSync('☁️ 연결 대기 중… (이 기기에 먼저 저장됨)'); }, 10000);
  try {
    const [d, u] = await Promise.all([claude.use('db'), claude.use('user')]);
    const id = u ? await u.id() : null;
    if(!d || !id){ clearTimeout(timer); setSync('💾 이 기기(브라우저)에만 저장 중'); return; }
    db = d; col = db.collection('data/users/' + id);
    let first = true;
    col.onSnapshot(snap => {
      if(!snap.metadata.fromCache){ clearTimeout(timer); online = true; setSync('☁️ PC·폰 자동 동기화 중 (같은 Claude 계정)'); }
      const remote = {};
      snap.docs.forEach(s => { if(s.exists) remote[s.id] = s.data(); });
      if(first && !snap.metadata.fromCache){
        first = false;
        // 처음 연결: 이 기기에만 있던 기록은 클라우드로 올림
        Object.keys(days).forEach(k => { if(!remote[k]) { dirty.add(k); pushDoc(k); } });
      }
      let changed = false;
      Object.keys(remote).forEach(k => {
        if(dirty.has(k) || writing.has(k) || (typing && typing.k === k)) return;
        if(JSON.stringify(days[k]) !== JSON.stringify(remote[k])){ days[k] = clone(remote[k]); changed = true; }
      });
      if(changed){ saveLocal(); render(); }
    }, err => { clearTimeout(timer); setSync('💾 동기화 끊김 — 이 기기에 저장 중'); });
  } catch(e){ clearTimeout(timer); setSync('💾 이 기기(브라우저)에만 저장 중'); }
}

/* ---------- rendering ---------- */
function lineHTML(k, it){
  const cls = it.mark ? ' ' + it.mark : '';
  return `<div class="line" data-k="${k}" data-id="${it.id}">
    <button class="bul${it.mark?' done':''}" data-bul aria-label="완료"></button>
    <button class="tm${it.time?' set':''}" data-time title="시간 선택">${it.time||'--:--'}</button>
    <div class="txt${cls}"${hlStyle(it)} contenteditable="${tool==='pen'?'plaintext-only':'false'}" spellcheck="false" data-ph="">${esc(it.text)}</div><span class="fill"></span>
    ${view==='day' && it.text ? `<a class="gcal" href="${gcalURL(k,it)}" target="_blank" rel="noopener" title="구글 캘린더(폰)에 추가">📲</a>` : ''}
  </div>`;
}
function linesHTML(k, minLines){
  const doc = get(k);
  let h = doc.items.map(it => lineHTML(k, it)).join('');
  h += `<div class="line blank" data-k="${k}" data-new="1"><button class="bul" tabindex="-1"></button><span class="tm ghost">--:--</span><div class="txt" contenteditable="${tool==='pen'?'plaintext-only':'false'}" spellcheck="false" data-ph="${doc.items.length? '' : '할 일을 적어 보세요'}"></div></div>`;
  for(let i = doc.items.length + 1; i < minLines; i++) h += `<div class="line blank deco" data-k="${k}"><span class="fill"></span></div>`;
  return `<div class="lines">${h}</div>`;
}

const CLIP = '<svg class="clip" viewBox="0 0 18 40" fill="none" stroke="#8d939b" stroke-width="2.2" stroke-linecap="round"><path d="M12 14V6a3.5 3.5 0 0 0-7 0v24a5 5 0 0 0 10 0V10"/><path d="M8.5 9v19"/></svg>';
function photosHTML(k){
  const ps = photosOf(k);
  return `<div class="pins">${ps.map((p,i)=>`<figure class="pol" data-photo="${p.k}" style="left:${((p.x ?? .6)*100).toFixed(2)}%;top:${p.y ?? 240}px;--r:${[-3,2,-1.5,3,-2.5,1][i%6]}deg">${CLIP}<img src="${p.data}" alt="${esc(k)} 다이어리 사진" draggable="false"></figure>`).join('')}</div>`;
}

function renderMonth(){
  const y = cur.getFullYear(), m = cur.getMonth();
  const start = sunday(new Date(y,m,1));
  let cells = '';
  ['일','월','화','수','목','금','토'].forEach(d => cells += `<div class="dow ${d==='토'?'sat':d==='일'?'sun':''}">${d}</div>`);
  for(let i=0;i<42;i++){
    const d = addDays(start,i), k = key(d);
    if(i===35 && d.getMonth()!==m) break;
    const doc = get(k), dw = d.getDay();
    const items = doc.items.filter(x=>x.text);
    let li = items.slice(0,4).map(x=>`<li><span class="${x.mark||''}"${hlStyle(x)}>${x.time?`<b style="font:700 10px Nunito;color:#6b6189">${x.time}</b> `:''}${esc(x.text)}</span></li>`).join('');
    if(items.length>4) li += `<li class="more">+${items.length-4}개 더</li>`;
    cells += `<div class="cell ${d.getMonth()!==m?'out':''} ${HOLI[k]?'hol':''} ${dw===6?'sat':dw===0?'sun':''} ${k===todayKey()?'today':''}" data-open="${k}">
      <span class="d">${d.getDate()}</span>${hname(k)}${photosOf(k).length?` <span class="pc">📎${photosOf(k).length}</span>`:''}${doc.title?` <span style="font-family:var(--hand);font-size:15px;color:#777">${esc(doc.title)}</span>`:''}<ul>${li}</ul></div>`;
  }
  return `<div class="monhead"><h1 class="mon">${MON[m]}</h1><div><div class="num">★</div><div class="yr" data-yearpick="${y}" role="button" title="1~12월 한눈에 보기">${y}년<span class="yrdn">▾</span></div></div>
    <div class="nav"><button data-nav="-1">‹ 이전 달</button><button data-nav="0">오늘</button><button data-nav="1">다음 달 ›</button></div></div>
    <div class="mgrid">${cells}</div>
    <p style="font-size:12px;color:var(--muted);margin:10px 0 24px">날짜를 누르면 그날의 다이어리(뒷장)로 넘어가요.</p>`;
}

function renderWeek(){
  const s = sunday(cur), e = addDays(s,6);
  let boxes = '';
  for(let i=0;i<7;i++){
    const d = addDays(s,i), k = key(d), dw = d.getDay();
    boxes += `<div class="wbox ${HOLI[k]?'hol':''} ${dw===6?'sat':dw===0?'sun':''} ${k===todayKey()?'today':''}">
      <div class="top" data-open="${k}"><span class="dd">${d.getMonth()+1}.${d.getDate()}</span><span class="dw">${DOW[dw]}요일</span>${hname(k)}${photosOf(k).length?`<span class="pc">📎${photosOf(k).length}</span>`:''}<span class="go">하루 ›</span></div>
      ${linesHTML(k, 7)}</div>`;
  }
  const wk = 'w-' + key(addDays(s,1)); // 주간 메모는 예전처럼 그 주 월요일로 저장
  boxes += `<div class="wbox note"><h3>이번 주 메모</h3><div class="notet" contenteditable="plaintext-only" data-field="line" data-k="${wk}">${esc(get(wk).line||'')}</div></div>`;
  return `<div class="whead"><h2>주간 다이어리</h2>
    <div class="nav"><button data-nav="-1">‹</button><button data-nav="0">이번 주</button><button data-nav="1">›</button></div>
    <span class="rng" style="margin-left:8px">${s.getFullYear()} ${s.getMonth()+1}.${s.getDate()} – ${e.getMonth()+1}.${e.getDate()}</span></div>
    <div class="wgrid">${boxes}</div>`;
}

function renderDay(){
  const k = key(cur), doc = get(k), dw = cur.getDay();
  const w = WEATHER.map(x=>`<button class="ico ${doc.weather===x?'on':''}" data-set="weather" data-v="${x}">${x}</button>`).join('');
  const md = MOOD.map(x=>`<button class="ico ${doc.mood===x?'on':''}" data-set="mood" data-v="${x}">${x}</button>`).join('');
  return `<div class="day">
    <div class="dtop"><span class="lab">다이어리</span>
      <div class="nav" style="margin-left:14px"><button data-nav="-1">‹ 어제</button><button data-nav="0">오늘</button><button data-nav="1">내일 ›</button></div>
      <span class="date" style="${dw===0||HOLI[k]?'':dw===6?'color:var(--blue)':''}">${cur.getFullYear()}.${pad(cur.getMonth()+1)}.${pad(cur.getDate())} ${DOW[dw]}요일${HOLI[k]?' · '+HOLI[k]:''}</span></div>
    <div class="title"><span class="lab">제목</span><div class="t" contenteditable="plaintext-only" data-field="title" data-k="${k}">${esc(doc.title||'')}</div></div>
    <div class="wm"><span class="lab">날씨</span>${w}<span class="gap"></span><span class="lab">기분</span>${md}</div>
    <div class="dtools">${photosOf(k).length?'<span class="pinhint">📎 사진은 손가락으로 끌어서 원하는 곳에 붙이세요</span>':''}<button class="btn" data-act="photo">📎 사진 붙이기</button><button class="btn" data-act="carry">↩ 어제 못 끝낸 일 가져오기</button></div>
    ${linesHTML(k, 16)}
    ${photosHTML(k)}
  </div>`;
}
function fitDay(){
  const d = $('.day'); if(!d) return;
  let max = 0; d.querySelectorAll('.pins .pol').forEach(p => max = Math.max(max, p.offsetTop + p.offsetHeight + 20));
  d.style.minHeight = max ? max + 'px' : '';
}

function render(force){
  const a = document.activeElement;
  if(!force && a && a.isContentEditable && $('#app').contains(a)){ renderLater = true; return; }
  renderLater = false;
  $('#app').innerHTML = view==='month' ? renderMonth() : view==='week' ? renderWeek() : renderDay();
  document.querySelectorAll('#bar [data-view]').forEach(b=>b.classList.toggle('on', b.dataset.view===view));
  document.querySelectorAll('#bar [data-tool]').forEach(b=>b.classList.toggle('on', b.dataset.tool===tool));
  document.body.className = 't-' + tool;
  drawHlc();
  fitDay();
  $('#dsIc').textContent = doneStyle==='hl' ? '🖍' : '➖';
  $('#dsTx').textContent = doneStyle==='hl' ? '완료=형광' : '완료=줄';
  document.title = (view==='month'?'월간':view==='week'?'주간':'하루') + ' · my 다이어리';
}

/* ---------- interactions ---------- */
function focusLine(k, id, atEnd){
  const el = id ? $(`.line[data-k="${k}"][data-id="${id}"] .txt`) : $(`.line[data-k="${k}"][data-new] .txt`);
  if(!el) return; el.focus();
  if(atEnd !== false){ const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
}
function itemOf(line){ const doc = get(line.dataset.k); return doc.items.find(x=>x.id===line.dataset.id); }

document.addEventListener('mousedown', e => {
  if(tool !== 'pen' && e.target.closest('.line .txt')) e.preventDefault();
});

document.addEventListener('click', e => {
  const t = e.target;
  if(!t.closest('#fly') && !t.closest('[data-tool="pen"],[data-tool="hl"]')) closeFly();
  const hc = t.closest('[data-hlc]');
  if(hc){ flushTyping(); hlColor = hc.dataset.hlc; tool = 'hl'; saveLocal();
    render(true); document.querySelectorAll('.hlopt').forEach(b => b.classList.toggle('on', b.dataset.hlc===hlColor));
    setTimeout(closeFly, 250); toast(HLC[hlColor][0] + ' 형광펜: 끝낸 일정을 누르세요'); return; }
  const fo = t.closest('[data-font]');
  if(fo){ if(fo.disabled) return; fontId = fo.dataset.font; saveLocal();
    applyFont(); document.querySelectorAll('.fopt').forEach(b => b.classList.toggle('on', b.dataset.font===fontId));
    toast('✍️ ' + (FONTS.find(x=>x.id===fontId)||{}).name + ' 글씨로 바꿨어요'); setTimeout(closeFly, 250); return; }
  const v = t.closest('[data-view]'); if(v){ flushTyping(); view = v.dataset.view; saveLocal(); render(true); return; }
  const n = t.closest('[data-nav]');
  if(n){ flushTyping(); const dir = +n.dataset.nav;
    if(dir===0) cur = new Date();
    else if(view==='month') cur = new Date(cur.getFullYear(), cur.getMonth()+dir, 1);
    else if(view==='week') cur = addDays(cur, 7*dir);
    else cur = addDays(cur, dir);
    render(true); return; }
  const tl = t.closest('[data-tool]'); if(tl){ flushTyping(); tool = tl.dataset.tool; render(true);
    if(tool==='pen'){ flyOpen('font') ? closeFly() : openFonts(); return; }
    if(tool==='hl'){ flyOpen('hl') ? closeFly() : openHl(); return; }
    closeFly(); toast({pen:'✏️ 펜: 글을 쓰세요', hl:'형광펜: 끝낸 일정을 누르세요', strike:'줄긋기: 끝낸 일정을 누르세요', erase:'🧽 지우개: 지울 줄을 누르세요'}[tool]); return; }
  const ac = t.closest('[data-act]');
  if(ac){ const a = ac.dataset.act;
    if(a==='undo') undo(); else if(a==='redo') doRedo();
    else if(a==='donestyle'){ doneStyle = doneStyle==='hl'?'strike':'hl'; saveLocal(); render(true); toast(doneStyle==='hl'?'완료 표시: 형광펜':'완료 표시: 가운데 줄'); }
    else if(a==='ics') exportICS();
    else if(a==='font') openFonts();
    else if(a==='carry') carry();
    else if(a==='photo'){ if(view!=='day'){ view='day'; render(true); } $('#pick').click(); }
    else if(a==='delphoto'){ const pk = ac.dataset.k, before = clone(days[pk]); flushTyping(); delete days[pk]; hist.push({k:pk, before, after:null}); redo=[]; commit(pk); $('#modal').classList.remove('show'); render(true); toast('사진을 뗐어요 (Ctrl+Z로 복구)'); }
    else if(a==='close') $('#modal').classList.remove('show');
    else if(a==='copy'){ const ta = $('#modal textarea'); navigator.clipboard.writeText(ta.value).then(()=>toast('복사했어요'), ()=>{ ta.select(); toast('Ctrl+C로 복사하세요'); }); }
    return; }
  const tmb = t.closest('[data-time]');
  if(tmb){ const line = tmb.closest('.line'); openTimePicker(line.dataset.k, line.dataset.id); return; }
  const tpb = t.closest('[data-tp]');
  if(tpb){ const [kind, v] = tpb.dataset.tp.split(':');
    if(kind==='h'){ tp.h = +v; if(tp.m==null) tp.m = 0; }
    else if(kind==='m'){ tp.m = +v; if(tp.h==null) tp.h = new Date().getHours(); }
    else if(kind==='ok' || kind==='clear'){
      const val = kind==='clear' || tp.h==null ? '' : pad(tp.h)+':'+pad(tp.m||0);
      $('#modal').classList.remove('show');
      mutate(tp.k, d => { const x = d.items.find(i=>i.id===tp.id); if(x) x.time = val; });
      return; }
    drawTimePicker(); return; }
  const op = t.closest('[data-open]'); if(op){ flushTyping(); cur = parse(op.dataset.open); view = 'day'; saveLocal(); render(true); return; }
  const st = t.closest('[data-set]');
  if(st){ const k = key(cur), f = st.dataset.set, val = st.dataset.v; mutate(k, d => { d[f] = d[f]===val ? '' : val; }); return; }

  const line = t.closest('.line');
  if(line){
    if(line.classList.contains('deco')){ if(tool==='pen') focusLine(line.dataset.k); return; }
    const it = itemOf(line);
    if(t.classList.contains('fill') && it && tool==='pen'){ focusLine(line.dataset.k, it.id); return; }
    if(t.closest('[data-bul]') && it){ mutate(line.dataset.k, d => { const x = d.items.find(i=>i.id===it.id); if(x.mark){ x.mark = null; delete x.hc; } else setMark(x, doneStyle); }); return; }
    if(t.closest('.txt') && it && tool !== 'pen'){
      if(tool==='erase'){ mutate(line.dataset.k, d => { d.items = d.items.filter(i=>i.id!==it.id); }); toast('🧽 지웠어요 (Ctrl+Z로 복구)'); }
      else mutate(line.dataset.k, d => { const x = d.items.find(i=>i.id===it.id); setMark(x, tool); });
      return;
    }
  }
  if(!t.closest('#modal .box') && t.id==='modal') $('#modal').classList.remove('show');
});

document.addEventListener('input', e => {
  const el = e.target;
  if(el.dataset && el.dataset.field){ const k = el.dataset.k; startTyping(k); ensure(k)[el.dataset.field] = el.textContent; commit(k); return; }
  const line = el.closest && el.closest('.line'); if(!line || !el.classList.contains('txt')) return;
  const k = line.dataset.k; startTyping(k); const doc = ensure(k);
  if(line.dataset.new){
    const id = uid(); doc.items.push({id, text: el.textContent, mark: null});
    delete line.dataset.new; line.dataset.id = id; line.classList.remove('blank');
    const b = line.querySelector('.bul'); b.setAttribute('data-bul',''); b.tabIndex = 0; const g = line.querySelector('.tm.ghost'); if(g){ const tb = document.createElement('button'); tb.className = 'tm'; tb.setAttribute('data-time',''); tb.textContent = '--:--'; g.replaceWith(tb); } renderLater = true;
  } else { const it = doc.items.find(x=>x.id===line.dataset.id); if(it) it.text = el.textContent; }
  commit(k);
});

document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if(mod && !e.shiftKey && (e.key==='z'||e.key==='Z')){ e.preventDefault(); undo(); return; }
  if(mod && ((e.key==='y'||e.key==='Y') || (e.shiftKey && (e.key==='z'||e.key==='Z')))){ e.preventDefault(); doRedo(); return; }
  const el = e.target; if(!el.classList || !el.classList.contains('txt')) { if(el.dataset && el.dataset.field==='title' && e.key==='Enter'){ e.preventDefault(); el.blur(); } return; }
  const line = el.closest('.line'), k = line.dataset.k;
  if(e.key==='Enter' && !e.isComposing){
    e.preventDefault(); flushTyping();
    if(!el.textContent.trim()){ return; }
    const doc = get(k), idx = doc.items.findIndex(x=>x.id===line.dataset.id);
    if(idx === doc.items.length-1 || idx<0){ render(true); focusLine(k); return; }
    const id = uid(); mutate(k, d => d.items.splice(idx+1, 0, {id, text:'', mark:null}), true); render(true); focusLine(k, id);
  } else if(e.key==='Backspace' && !el.textContent && line.dataset.id){
    e.preventDefault(); const doc = get(k), idx = doc.items.findIndex(x=>x.id===line.dataset.id);
    const prev = doc.items[idx-1];
    mutate(k, d => { d.items = d.items.filter(x=>x.id!==line.dataset.id); }, true); render(true);
    prev ? focusLine(k, prev.id) : focusLine(k);
  } else if(e.key==='ArrowDown' || e.key==='ArrowUp'){
    const all = [...line.parentNode.querySelectorAll('.line:not(.deco) .txt')]; const i = all.indexOf(el);
    const nx = all[i + (e.key==='ArrowDown'?1:-1)]; if(nx){ e.preventDefault(); nx.focus(); }
  }
});

document.addEventListener('focusout', () => {
  setTimeout(() => {
    const a = document.activeElement;
    if(a && a.isContentEditable && $('#app').contains(a)) return;
    // 빈 줄 정리
    Object.keys(days).forEach(k => { const d = days[k]; if(d.items && d.items.some(x=>!x.text.trim())){ flushTyping(); const before = clone(d); d.items = d.items.filter(x=>x.text.trim()); hist.push({k, before, after: clone(d)}); commit(k); renderLater = true; } });
    if(renderLater) render();
  }, 60);
});

function carry(){
  const k = key(cur), pk = key(addDays(cur,-1)), prev = get(pk).items.filter(x=>x.text.trim() && !x.mark);
  if(!prev.length){ toast('어제 못 끝낸 일이 없어요 👍'); return; }
  const have = new Set(get(k).items.map(x=>x.text.trim()));
  const add = prev.filter(x=>!have.has(x.text.trim()));
  if(!add.length){ toast('이미 다 가져왔어요'); return; }
  mutate(k, d => add.forEach(x => d.items.push({id:uid(), text:x.text, mark:null})));
  toast(`${add.length}개를 오늘로 가져왔어요`);
}

/* ---------- phone calendar ---------- */
function timeOf(text){ const m = text.match(/(\d{1,2})\s*[:시]\s*(\d{2})?/); if(!m) return null; const h = +m[1], mi = +(m[2]||0); if(h>23||mi>59) return null; return [h,mi]; }
function stamp(k, hm){ return k.replace(/-/g,'') + (hm ? 'T'+pad(hm[0])+pad(hm[1])+'00' : ''); }
function hmOf(it){ if(it.time){ const [h,m] = it.time.split(':').map(Number); return [h,m]; } return timeOf(it.text); }
function gcalURL(k, it){
  const text = (it.time ? it.time + ' ' : '') + it.text;
  const hm = hmOf(it);
  let dates;
  if(hm){ const end = new Date(parse(k).setHours(hm[0]+1, hm[1])); dates = stamp(k,hm)+'/'+stamp(key(end),[end.getHours(),end.getMinutes()]); }
  else dates = stamp(k)+'/'+stamp(key(addDays(parse(k),1)));
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&ctz=Asia%2FSeoul&text=' + encodeURIComponent(text.trim()) + '&dates=' + dates + '&details=' + encodeURIComponent('my 다이어리에서 보냄');
}
async function exportICS(){
  flushTyping();
  let s, e, label;
  if(view==='month'){ s = new Date(cur.getFullYear(), cur.getMonth(), 1); e = new Date(cur.getFullYear(), cur.getMonth()+1, 0); label = `${cur.getFullYear()}-${pad(cur.getMonth()+1)}`; }
  else if(view==='week'){ s = sunday(cur); e = addDays(s,6); label = 'week-'+key(s); }
  else { s = new Date(cur); e = new Date(cur); label = key(cur); }
  const icsEsc = t => t.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
  const L = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//my-diary//KO','CALSCALE:GREGORIAN','X-WR-TIMEZONE:Asia/Seoul'];
  let n = 0; const list = []; const now = new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
  for(let d = new Date(s); d <= e; d = addDays(d,1)){
    const k = key(d);
    get(k).items.filter(x=>x.text.trim()).forEach(x => {
      const hm = hmOf(x); n++; list.push({k, x});
      L.push('BEGIN:VEVENT','UID:'+k+'-'+x.id+'@my-diary','DTSTAMP:'+now);
      if(hm){ const end = new Date(parse(k).setHours(hm[0]+1,hm[1])); L.push('DTSTART;TZID=Asia/Seoul:'+stamp(k,hm),'DTEND;TZID=Asia/Seoul:'+stamp(key(end),[end.getHours(),end.getMinutes()])); }
      else L.push('DTSTART;VALUE=DATE:'+stamp(k),'DTEND;VALUE=DATE:'+stamp(key(addDays(d,1))));
      L.push('SUMMARY:'+icsEsc((x.mark?'✔ ':'')+x.text.trim()),'END:VEVENT');
    });
  }
  L.push('END:VCALENDAR');
  if(!n){ toast('이 기간에 적힌 할 일이 없어요'); return; }
  const data = L.join('\r\n'), filename = 'diary-'+label+'.ics';
  let dl = null; try { dl = window.claude && await claude.use('downloads'); } catch(e){}
  const guide = `<p><b>${n}개 일정</b>을 폰 캘린더 파일(.ics)로 만들었어요.</p>
    <ul><li><b>구글 캘린더(안드로이드·아이폰)</b>: PC에서 <a href="https://calendar.google.com/calendar/r/settings/export" target="_blank" rel="noopener">calendar.google.com → 설정 → 가져오기/내보내기</a> → 파일 선택 → 가져오기. 폰의 구글 캘린더에 바로 나타나요.</li>
    <li><b>아이폰 기본 캘린더</b>: 파일을 아이폰으로 보내 열면 "모두 추가"가 떠요.</li>
    <li>한 개만 보낼 땐 하루 보기에서 줄 끝의 📲 버튼을 누르세요.</li></ul>`;
  if(dl){
    try { await dl.save({filename, data}); modal(`<h3>📲 폰 캘린더로 보내기</h3>${guide}<div class="acts"><button class="btn" data-act="close">닫기</button></div>`); return; }
    catch(err){ /* 거절 시 아래 복사 방식 */ }
  }
  const rows = list.map(({k, x}) => `<li style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #eee">
      <span style="flex:none;font:700 12px Nunito;color:#6b6189;min-width:74px">${k.slice(5).replace('-','/')} ${x.time||'하루종일'}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.text)}</span>
      <a class="btn" style="flex:none;text-decoration:none" href="${gcalURL(k, x)}" target="_blank" rel="noopener">📲 추가</a></li>`).join('');
  modal(`<h3>📲 폰 캘린더에 넣기</h3><p>넣고 싶은 일정의 <b>추가</b>를 누르면 구글 캘린더가 열려요. 저장을 누르면 폰 일정에 들어가요.</p>
    <ul style="list-style:none;margin:0;padding:0">${rows}</ul>
    <div class="acts"><button class="btn" data-act="close">닫기</button></div>`);
}

async function shrink(file){
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    let max = 1000, q = .8, out = '';
    for(let n=0; n<8; n++){
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width*sc); c.height = Math.round(img.height*sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL('image/webp', q);
      if(!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', q);
      if(out.length < 200000) return out;
      max *= .82; q = Math.max(.5, q - .08);
    }
    return out.length < 240000 ? out : null;
  } finally { URL.revokeObjectURL(url); }
}
document.addEventListener('change', async e => {
  if(e.target.id !== 'pick') return;
  const files = [...e.target.files]; e.target.value = '';
  if(!files.length) return;
  const k = key(cur); let n = 0;
  toast('사진 붙이는 중…');
  for(const f of files.slice(0, 6)){
    let data = null; try { data = await shrink(f); } catch(err){}
    if(!data){ toast('이 사진은 열 수 없어요'); continue; }
    flushTyping();
    const pk = 'p-' + uid() + uid();
    const lines = $('.day .lines'), dayEl = $('.day');
    const baseY = lines ? lines.offsetTop + 10 : 240;
    const filled = get(k).items.length;
    days[pk] = {date:k, data, ts:Date.now()+n, x: dayEl && dayEl.offsetWidth < 500 ? .55 : .66, y: baseY + Math.min(filled, 6)*34 + n*28};
    hist.push({k:pk, before:null, after:clone(days[pk])}); redo=[]; commit(pk); n++;
  }
  if(files.length > 6) toast('한 번에 6장까지 붙일 수 있어요');
  else if(n) toast(`📎 사진 ${n}장을 붙였어요`);
  render(true);
});

let tp = {};
function openTimePicker(k, id){
  const it = get(k).items.find(x=>x.id===id); if(!it) return;
  const [h, m] = (it.time||'').split(':');
  tp = {k, id, h: it.time ? +h : null, m: it.time ? +m : null};
  drawTimePicker();
}
function drawTimePicker(){
  const nowH = new Date().getHours();
  let hb = ''; for(let h=0; h<24; h++) hb += `<button data-tp="h:${h}" class="${tp.h===h?'on':''} ${h===nowH?'now':''}">${pad(h)}</button>`;
  let mb = ''; for(let m=0; m<60; m+=10) mb += `<button data-tp="m:${m}" class="${tp.m===m?'on':''}">:${pad(m)}</button>`;
  modal(`<h3>⏰ 시간 선택 (0시 ~ 23시)</h3>
    <div class="tp-show">${tp.h==null?'--:--':pad(tp.h)+':'+pad(tp.m||0)}</div>
    <div class="tp-cap">시</div><div class="tp-h">${hb}</div>
    <div class="tp-cap">분</div><div class="tp-m">${mb}</div>
    <div class="acts"><button class="btn" data-tp="clear:0">시간 지우기</button><button class="btn" data-act="close">취소</button><button class="btn" data-tp="ok:0" style="background:#3b3054;color:#fff">확인</button></div>`);
}

/* 사진: 손가락(마우스)으로 끌어서 원하는 곳에 붙이기 */
let drag = null;
document.addEventListener('pointerdown', e => {
  const pol = e.target.closest('.pins .pol'); if(!pol) return;
  e.preventDefault();
  const day = $('.day'), r = day.getBoundingClientRect();
  drag = {pol, pk: pol.dataset.photo, sx: e.clientX, sy: e.clientY, ox: pol.offsetLeft, oy: pol.offsetTop, w: r.width, moved: false};
  pol.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', e => {
  if(!drag) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if(!drag.moved && Math.hypot(dx, dy) < 6) return;
  drag.moved = true; drag.pol.classList.add('drag');
  const x = Math.min(Math.max(drag.ox + dx, 0), drag.w - drag.pol.offsetWidth - 4);
  const y = Math.max(drag.oy + dy, 0);
  drag.pol.style.left = (x / drag.w * 100) + '%'; drag.pol.style.top = y + 'px';
  drag.x = x / drag.w; drag.y = Math.round(y);
});
function endDrag(){
  if(!drag) return; const d = drag; drag = null; d.pol.classList.remove('drag');
  if(!d.moved){ const pk = d.pk; modal(`<img class="big" src="${days[pk].data}" alt="사진"><div class="acts"><button class="btn" data-act="delphoto" data-k="${pk}">📎 사진 떼기</button><button class="btn" data-act="close">닫기</button></div>`); return; }
  mutate(d.pk, p => { p.x = +d.x.toFixed(4); p.y = d.y; }, true); fitDay();
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
addEventListener('scroll', closeFly, {passive:true});
addEventListener('resize', closeFly);


/* ---------- 0.1.7 추가: 연간 달력 창 (년도를 누르면 1~12월 한눈에, 화살표·손가락으로 해 넘기기) ---------- */
const yv = {y: 0, busy: false, drag: null, moved: false};
function yearDone(y){
  const s = new Set();
  Object.keys(days).forEach(k => {
    const d = days[k]; if(!d) return;
    if(isPhoto(k)){ if(d.date && d.date.startsWith(y+'-')) s.add(d.date); return; }
    if(!k.startsWith(y+'-')) return;
    if((d.items && d.items.some(x => x.text && x.text.trim())) || (d.title && d.title.trim())) s.add(k);
  });
  return s;
}
function miniMonth(y, m, has){
  const first = new Date(y, m, 1), last = new Date(y, m+1, 0).getDate(), tk = todayKey();
  let h = DOW.map((d,i) => `<i class="${i===0?'sun':i===6?'sat':''}">${d}</i>`).join('');
  for(let i=0; i<first.getDay(); i++) h += '<b class="no"></b>';
  for(let d=1; d<=last; d++){
    const k = y+'-'+pad(m+1)+'-'+pad(d), w = new Date(y, m, d).getDay();
    const c = [HOLI[k] || w===0 ? 'sun' : w===6 ? 'sat' : '', has.has(k) ? 'has' : '', k===tk ? 'tdy' : ''].join(' ');
    h += `<b class="${c}" data-yo="${k}"${HOLI[k]?` title="${HOLI[k]}"`:''}>${d}</b>`;
  }
  const now = new Date(), isCur = now.getFullYear()===y && now.getMonth()===m;
  return `<div class="ym"><div class="ymt${isCur?' cur':''}" data-ym="${y}-${m}">${m+1}월</div><div class="ymg">${h}</div></div>`;
}
function yearPanel(y){ const has = yearDone(y); let h = ''; for(let m=0; m<12; m++) h += miniMonth(y, m, has); return `<div class="ypanel"><div class="ytag">${y}년</div><div class="ygrid">${h}</div></div>`; }
function yearDraw(){
  const el = $('#yearv'); if(!el) return;
  el.querySelector('.yv-title').textContent = yv.y + '년';
  const tr = el.querySelector('.yv-track');
  tr.style.transition = 'none'; tr.style.transform = 'translateX(-100%)';
  tr.innerHTML = yearPanel(yv.y-1) + yearPanel(yv.y) + yearPanel(yv.y+1);
}
function yearOpen(y){
  let el = $('#yearv');
  if(!el){
    el = document.createElement('div'); el.id = 'yearv';
    el.innerHTML = `<div class="yv-box" role="dialog" aria-label="연간 달력">
      <div class="yv-head"><button class="yv-arw" data-ygo="-1" aria-label="이전 해">‹</button><span class="yv-title"></span><button class="yv-arw" data-ygo="1" aria-label="다음 해">›</button><button class="yv-x" data-yclose aria-label="닫기">✕</button></div>
      <div class="yv-hint">‹ › 또는 옆으로 밀어서 넘기기 · 달·날짜를 누르면 이동</div>
      <div class="yv-view"><div class="yv-track"></div></div></div>`;
    document.body.appendChild(el);
  }
  yv.y = y; yearDraw();
  el.classList.add('show');
}
function yearClose(){ const el = $('#yearv'); if(el) el.classList.remove('show'); }
function yearGo(dir, fromDrag){
  if(yv.busy) return; yv.busy = true;
  const tr = $('#yearv .yv-track');
  tr.style.transition = 'transform .34s cubic-bezier(.25,.8,.3,1)';
  tr.style.transform = `translateX(${dir > 0 ? -200 : 0}%)`;
  const done = () => { tr.removeEventListener('transitionend', done); clearTimeout(t); yv.y += dir; yearDraw(); yv.busy = false; };
  const t = setTimeout(done, 450); tr.addEventListener('transitionend', done);
}
function yearSnap(){ const tr = $('#yearv .yv-track'); tr.style.transition = 'transform .25s ease'; tr.style.transform = 'translateX(-100%)'; }
document.addEventListener('click', e => {
  const t = e.target;
  const yp = t.closest('[data-yearpick]'); if(yp){ flushTyping(); yearOpen(+yp.dataset.yearpick); return; }
  if(!t.closest('#yearv')) return;
  if(yv.moved){ yv.moved = false; return; }
  const g = t.closest('[data-ygo]'); if(g){ yearGo(+g.dataset.ygo); return; }
  if(t.closest('[data-yclose]') || t.id === 'yearv'){ yearClose(); return; }
  const mo = t.closest('[data-ym]'); if(mo){ const [y, m] = mo.dataset.ym.split('-').map(Number); cur = new Date(y, m, 1); view = 'month'; saveLocal(); yearClose(); render(true); return; }
  const dy = t.closest('[data-yo]'); if(dy){ cur = parse(dy.dataset.yo); view = 'day'; saveLocal(); yearClose(); render(true); return; }
});
document.addEventListener('keydown', e => {
  const el = $('#yearv'); if(!el || !el.classList.contains('show')) return;
  if(e.key === 'Escape') yearClose(); else if(e.key === 'ArrowLeft') yearGo(-1); else if(e.key === 'ArrowRight') yearGo(1);
});
// 손가락(터치)·마우스로 옆으로 밀어 해 넘기기 — 폰에서는 터치 이벤트로 직접 받아서, 옆으로 밀 때 화면(뒤로 가기·스크롤)이 가져가지 못하게 막아요
function yearDragStart(x, y, w){ if(yv.busy) return; yv.drag = {sx: x, sy: y, w, on: false, dx: 0}; yv.moved = false; }
function yearDragMove(x, y){
  const d = yv.drag; if(!d) return false;
  const dx = x - d.sx, dy = y - d.sy;
  if(!d.on){
    if(Math.abs(dx) < 6 && Math.abs(dy) < 6) return false;
    if(Math.abs(dy) > Math.abs(dx)){ yv.drag = null; return false; } // 위아래로 움직이면 스크롤에 양보
    d.on = true; yv.moved = true;
  }
  const tr = $('#yearv .yv-track'); tr.style.transition = 'none';
  tr.style.transform = `translateX(calc(-100% + ${dx}px))`; d.dx = dx;
  return true;
}
function yearDragEnd(){
  const d = yv.drag; yv.drag = null; if(!d || !d.on) return;
  if(Math.abs(d.dx) > Math.min(70, d.w * .16)) yearGo(d.dx < 0 ? 1 : -1, true); else yearSnap();
  setTimeout(() => { yv.moved = false; }, 80);
}
document.addEventListener('touchstart', e => {
  const v = e.target.closest && e.target.closest('#yearv .yv-view'); if(!v || e.touches.length !== 1) return;
  yearDragStart(e.touches[0].clientX, e.touches[0].clientY, v.offsetWidth);
}, {passive: true});
document.addEventListener('touchmove', e => {
  if(!yv.drag || e.touches.length !== 1) return;
  if(yearDragMove(e.touches[0].clientX, e.touches[0].clientY) && e.cancelable) e.preventDefault();
}, {passive: false});
document.addEventListener('touchend', yearDragEnd);
document.addEventListener('touchcancel', yearDragEnd);
document.addEventListener('pointerdown', e => {
  if(e.pointerType !== 'mouse') return; // 손가락은 위의 터치로 처리
  const v = e.target.closest('#yearv .yv-view'); if(!v) return;
  yearDragStart(e.clientX, e.clientY, v.offsetWidth);
});
document.addEventListener('pointermove', e => { if(e.pointerType === 'mouse') yearDragMove(e.clientX, e.clientY); });
document.addEventListener('pointerup', e => { if(e.pointerType === 'mouse') yearDragEnd(); });
document.addEventListener('pointercancel', e => { if(e.pointerType === 'mouse') yearDragEnd(); });

function modal(h){ $('#mbox').innerHTML = h; $('#modal').classList.add('show'); }
let tt; function toast(m){ const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(()=>el.classList.remove('show'), 1600); }

/* ---------- 하단 배너 광고 (토스 앱에서만) ---------- */
const AD_ID = 'ait.v2.live.a8524797061d4001'; // 토스 콘솔 배너(리스트형) 광고 ID — 번들 만들 때 넣음
// 글 쓰는 동안은 광고를 숨겨요 (11/5 사장님: 방해되면 안 됨 — 0.1.5 기능, 0.1.6 수정 때 다시 넣음)
function adHideWhileTyping(){
  const isInput = t => t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName));
  document.addEventListener('focusin', e => { if(isInput(e.target)) document.documentElement.classList.add('typing'); });
  document.addEventListener('focusout', () => setTimeout(() => { if(!isInput(document.activeElement)) document.documentElement.classList.remove('typing'); }, 50));
}
function initAds(){
  try {
    const T = window.TossAds, el = $('#adbar');
    if(!T || !AD_ID || !el || !(T.initialize && T.initialize.isSupported && T.initialize.isSupported())) return;
    const off = () => { el.hidden = true; document.documentElement.classList.remove('has-ad'); };
    T.initialize({callbacks:{onInitialized: () => {
      el.hidden = false; document.documentElement.classList.add('has-ad');
      T.attachBanner(AD_ID, el, {theme:'light', variant:'card', callbacks:{onNoFill: off, onAdFailedToRender: off}});
    }}});
  } catch(e){}
}

setSync('💾 이 폰(토스)에 저장돼요');
load().then(() => { applyFont(); render(true); connect(); }); // 0.1.6 수정: 빠졌던 PC·폰 동기화 켜기 다시 넣음 (0.1.5와 같음)
adHideWhileTyping();
initAds();
