// 이모지로는 실제 모습과 다른 품목을 직접 그린 그림 (viewBox 0 0 40 40)

// 생선 기본형: 몸통색, 배색, 무늬
function fish(back: string, belly: string, extra = '', slim = false): string {
  const h = slim ? 7 : 10; // 몸 두께
  const top = 20 - h, bot = 20 + h;
  return `
  <path d="M30 20 L38 ${slim ? 14 : 12} Q36 20 38 ${slim ? 26 : 28} Z" fill="${back}"/>
  <path d="M2 20 Q14 ${top} 32 20 Q14 ${bot} 2 20 Z" fill="${belly}" stroke="${back}" stroke-width=".8"/>
  <path d="M2 20 Q14 ${top} 32 20 Q16 ${20 - h * 0.15} 2 20 Z" fill="${back}"/>
  <path d="M16 ${top + h * 0.35} q4 -4 8 -1" fill="${back}"/>
  ${extra}
  <circle cx="7" cy="${19 - h * 0.12}" r="1.7" fill="#fff"/><circle cx="7" cy="${19 - h * 0.12}" r="0.95" fill="#1d1d1d"/>
  <path d="M11 ${20 - h * 0.45} q2 ${h * 0.45} 0 ${h * 0.9}" stroke="${back}" stroke-width="1" fill="none" opacity=".55"/>`;
}

const leafStroke = '#2E7D46';

export const ICONS: Record<string, string> = {
  // ── 채소 ──
  radish: `
    <path d="M17 9 q-6 -6 -3 -8 q5 2 5 8z" fill="#3DB36B"/><path d="M20 9 q0 -8 4 -9 q3 4 -2 9z" fill="#2E9E5B"/><path d="M23 10 q5 -6 9 -5 q-1 5 -7 6z" fill="#3DB36B"/>
    <path d="M12 11 q8 -3 16 0 q2 17 -8 28 q-10 -11 -8 -28z" fill="#FAFAF5" stroke="#D9DCCF" stroke-width="1"/>
    <path d="M12 11 q8 -3 16 0 q0.6 5 -0.3 8 q-7.7 -3 -15.4 0 q-0.9 -3 -0.3 -8z" fill="#BFE6C6"/>`,
  'young-radish': `
    <path d="M12 26 q-8 -10 -4 -24 q6 8 6 24z" fill="#3DB36B"/><path d="M17 26 q-1 -14 6 -24 q4 12 -4 24z" fill="#2E9E5B"/><path d="M21 26 q6 -12 14 -16 q-2 12 -12 16z" fill="#4CC07A"/>
    <path d="M13 26 h9 l-1.5 3 h-6z" fill="#D6EFD9"/>
    <path d="M14 29 q0 6 2 9 M16.5 29 q1 6 1 10 M19 29 q1 5 3 8" stroke="#F1F1E8" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M14 29 q0 6 2 9 M16.5 29 q1 6 1 10 M19 29 q1 5 3 8" stroke="#DADBCF" stroke-width="0.6" fill="none"/>`,
  'cabbage-head': `
    <circle cx="20" cy="21" r="16" fill="#CDEBB3"/>
    <path d="M6 23 q4 -14 14 -16 q10 2 14 16" fill="#B6DE97"/>
    <path d="M20 7 v28 M20 14 q-7 3 -10 12 M20 14 q7 3 10 12 M20 22 q-5 3 -6 10 M20 22 q5 3 6 10" stroke="#8DC56A" stroke-width="1.3" fill="none"/>
    <circle cx="20" cy="21" r="16" fill="none" stroke="#9ACF7A" stroke-width="1.2"/>`,
  spinach: `
    <path d="M20 30 q-14 -2 -16 -16 q10 -2 16 12z" fill="#2F8A4A"/><path d="M20 30 q14 -2 16 -16 q-10 -2 -16 12z" fill="#2F8A4A"/>
    <path d="M20 30 q-6 -12 -4 -26 q8 8 4 26z" fill="#3BA55C"/><path d="M20 30 q6 -12 4 -26 q-8 8 -4 26z" fill="#2F9952"/>
    <path d="M20 29 v-20 M20 28 l-11 -12 M20 28 l11 -12" stroke="#1F6B37" stroke-width="0.8" fill="none"/>
    <path d="M17 29 q3 -1 6 0 l-1 4 q-2 1 -4 0z" fill="#E86A8A"/><path d="M19 33 q1 4 0 6 M21 33 q0 3 1 5" stroke="#D8B5A0" stroke-width="1" fill="none"/>`,
  lettuce: `
    <path d="M20 37 q-16 -4 -15 -20 q1 -12 15 -14 q14 2 15 14 q1 16 -15 20z" fill="#7CC46A"/>
    <path d="M5 17 q2 -3 4 0 q2 -3 4 0 q2 -3 4 0 q2 -3 3 0 q1 -3 3 0 q2 -3 4 0 q2 -3 4 0 q2 -3 4 0 q-1 -12 -15 -14 q-14 2 -15 14z" fill="#B2445C"/>
    <path d="M20 37 V9 M20 30 l-9 -9 M20 30 l9 -9 M20 22 l-6 -6 M20 22 l6 -6" stroke="#E6F5DF" stroke-width="1.4" fill="none"/>`,
  perilla: `
    <path d="M20 37 q-17 -8 -15 -22 q4 -11 15 -12 q11 1 15 12 q2 14 -15 22z" fill="#3E8E4E"/>
    <path d="M5 15 l2 -1 l0 2 l2 -2 l0.5 2 M35 15 l-2 -1 l0 2 l-2 -2 l-0.5 2 M8 25 l2 -1 l0 2 M32 25 l-2 -1 l0 2" stroke="#2C6B39" stroke-width="1" fill="none"/>
    <path d="M20 37 V5 M20 30 l-10 -8 M20 30 l10 -8 M20 22 l-8 -7 M20 22 l8 -7 M20 14 l-5 -4 M20 14 l5 -4" stroke="#7BBF7F" stroke-width="1.1" fill="none"/>`,
  chives: `
    <g stroke-linecap="round" fill="none">
      <path d="M12 38 Q11 20 6 3" stroke="#3DA35A" stroke-width="3"/><path d="M16 38 Q16 20 13 2" stroke="#4CB86A" stroke-width="3"/>
      <path d="M20 38 Q20 20 20 2" stroke="#3DA35A" stroke-width="3"/><path d="M24 38 Q24 20 27 2" stroke="#4CB86A" stroke-width="3"/>
      <path d="M28 38 Q29 20 34 3" stroke="#3DA35A" stroke-width="3"/>
    </g>
    <rect x="10" y="27" width="20" height="4" rx="2" fill="#E9C46A"/>`,
  'water-parsley': `
    <g stroke-linecap="round" fill="none">
      <path d="M14 39 Q13 24 9 12" stroke="#8CCB7E" stroke-width="2.4"/><path d="M20 39 V10" stroke="#9AD38C" stroke-width="2.4"/><path d="M26 39 Q27 24 31 12" stroke="#8CCB7E" stroke-width="2.4"/>
    </g>
    <g fill="#3E9E57">
      <path d="M9 12 l-5 -3 l3 -3 l2 2 l1 -5 l3 3 l1 -2 l2 4z"/>
      <path d="M20 10 l-4 -4 l3 -2 l1 2 l1 -5 l2 4 l2 -1 l-1 5z"/>
      <path d="M31 12 l5 -3 l-3 -3 l-2 2 l-1 -5 l-3 3 l-1 -2 l-2 4z"/>
      <path d="M12 22 l-4 -1 l2 -3 l3 2z"/><path d="M28 22 l4 -1 l-2 -3 l-3 2z"/>
    </g>`,
  'green-onion': `
    <g stroke-linecap="round" fill="none">
      <path d="M30 11 L36 2" stroke="#2E9E5B" stroke-width="4"/>
      <path d="M30 11 L39 7" stroke="#3DB36B" stroke-width="4"/>
      <path d="M7.5 33.5 L22 19" stroke="#D6DCCB" stroke-width="10"/>
      <path d="M7.5 33.5 L22 19" stroke="#FBFBF4" stroke-width="8.4"/>
      <path d="M21 20 L31 10" stroke="#45B36B" stroke-width="8.4"/>
      <path d="M19 22 L23 18" stroke="#9BD49A" stroke-width="8.4" stroke-linecap="butt"/>
      <path d="M10 33 L21 22" stroke="#ECEFE2" stroke-width="1"/>
    </g>
    <path d="M5 35 l-3 1 M5.5 36 l-2 3 M7 36.5 l0 3.5 M8.5 36 l2 3" stroke="#CFC4A0" stroke-width="1.2" stroke-linecap="round"/>`,
  scallion: `
    <g stroke-linecap="round" fill="none">
      <path d="M13 34 Q12 18 8 3" stroke="#3DB36B" stroke-width="2.6"/><path d="M20 34 V2" stroke="#4CC07A" stroke-width="2.6"/><path d="M27 34 Q28 18 32 3" stroke="#3DB36B" stroke-width="2.6"/>
      <path d="M13 34 v-6 M20 34 v-6 M27 34 v-6" stroke="#F5F5EC" stroke-width="2.6"/>
    </g>
    <ellipse cx="13" cy="35.5" rx="2.6" ry="2.4" fill="#F3F0E4" stroke="#D8D0B8" stroke-width=".6"/>
    <ellipse cx="20" cy="35.5" rx="2.6" ry="2.4" fill="#F3F0E4" stroke="#D8D0B8" stroke-width=".6"/>
    <ellipse cx="27" cy="35.5" rx="2.6" ry="2.4" fill="#F3F0E4" stroke="#D8D0B8" stroke-width=".6"/>`,
  'green-pepper': `
    <path d="M27 7 q4 -3 6 -1 q-3 0 -4 3z" fill="#4E7D2D"/>
    <path d="M26 8 q4 2 3 6 q-4 14 -21 22 q-3 1 -1 -2 q14 -9 15 -24 q1 -3 4 -2z" fill="#3E9B3A"/>
    <path d="M24 12 q-2 12 -12 20" stroke="#7CCB5E" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  cheongyang: `
    <path d="M18 6 q3 -3 5 -1 q-3 0 -3 3z" fill="#4E7D2D"/><path d="M17 7 q3 1 2 5 q-3 12 -12 24 q-2 1 -1 -2 q7 -12 8 -25 q1 -3 3 -2z" fill="#2F8A2E"/>
    <path d="M30 8 q3 -3 5 -1 q-3 0 -3 3z" fill="#4E7D2D"/><path d="M29 9 q3 1 2 5 q-2 12 -9 23 q-2 1 -1 -2 q5 -12 5 -24 q1 -3 3 -2z" fill="#3E9B3A"/>
    <path d="M16 11 q-1 10 -6 18 M28 13 q-1 10 -4 18" stroke="#6FC253" stroke-width="1.1" fill="none" stroke-linecap="round"/>`,
  zucchini: `
    <path d="M30 6 q4 -3 6 0 q-3 1 -4 3z" fill="#5D8B3A"/>
    <path d="M29 8 q5 3 2 9 L14 34 q-6 5 -9 1 q-3 -4 3 -8 L23 9 q3 -3 6 -1z" fill="#A8D07A"/>
    <path d="M27 11 L10 30" stroke="#C8E3A6" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M29 8 q5 3 2 9 L14 34 q-6 5 -9 1 q-3 -4 3 -8 L23 9 q3 -3 6 -1z" fill="none" stroke="#7DAF52" stroke-width="1"/>
    <circle cx="6.5" cy="33.5" r="1.8" fill="#E9C46A"/>`,
  // ── 버섯·견과 ──
  'oyster-mushroom': `
    <path d="M18 38 q-1 -8 2 -16 l4 1 q-2 7 -2 15z" fill="#EFE9DE"/>
    <path d="M22 23 q-16 4 -18 -7 q4 -9 16 -9 q14 0 15 8 q-2 10 -13 8z" fill="#9A9488"/>
    <path d="M22 23 q-10 -2 -14 -8 M22 23 q-2 -8 -2 -15 M22 23 q6 -6 11 -11" stroke="#7D776B" stroke-width="0.9" fill="none"/>
    <path d="M8 24 q-6 -1 -6 -6 q3 -5 9 -4 q6 2 4 8 q-2 3 -7 2z" fill="#B0AA9E"/>`,
  enoki: `
    <g stroke="#F4F1E8" stroke-width="2" stroke-linecap="round" fill="none">
      <path d="M13 37 Q11 22 8 8"/><path d="M16 37 Q15 20 14 5"/><path d="M19 37 V4"/><path d="M22 37 Q23 20 25 5"/><path d="M25 37 Q27 22 31 8"/><path d="M28 37 Q31 24 35 12"/>
    </g>
    <g fill="#F7EFD6" stroke="#D9CBA4" stroke-width=".5">
      <ellipse cx="8" cy="7" rx="2.2" ry="1.6"/><ellipse cx="14" cy="4.3" rx="2.2" ry="1.6"/><ellipse cx="19" cy="3.4" rx="2.2" ry="1.6"/><ellipse cx="25" cy="4.3" rx="2.2" ry="1.6"/><ellipse cx="31" cy="7" rx="2.2" ry="1.6"/><ellipse cx="35" cy="11" rx="2.2" ry="1.6"/>
    </g>
    <path d="M10 31 h20 l-1 7 h-18z" fill="#E7DFC9"/>`,
  'king-oyster': `
    <path d="M14 15 q6 -2 12 0 q1 13 -1 21 q-5 3 -10 0 q-2 -8 -1 -21z" fill="#F6F1E6" stroke="#DCD3C0" stroke-width="0.8"/>
    <path d="M7 15 q2 -10 13 -11 q11 1 13 11 q-6 3 -13 3 q-7 0 -13 -3z" fill="#A47A50"/>
    <path d="M10 15 q10 3 20 0" stroke="#C79C6F" stroke-width="1.2" fill="none"/>`,
  walnut: `
    <ellipse cx="20" cy="21" rx="15" ry="14" fill="#B98552"/>
    <path d="M20 7 v28" stroke="#8A5C33" stroke-width="1.6"/>
    <path d="M9 14 q4 3 1 6 q4 3 0 7 M31 14 q-4 3 -1 6 q-4 3 0 7 M14 10 q2 4 -1 6 M26 10 q-2 4 1 6 M14 31 q2 -3 -1 -5 M26 31 q-2 -3 1 -5" stroke="#8A5C33" stroke-width="1.2" fill="none"/>`,
  almond: `
    <path d="M20 4 C28 12 31 22 28 30 C26 36 14 36 12 30 C9 22 12 12 20 4 Z" fill="#B57B48"/>
    <path d="M20 7 C25 14 27 22 25 29 M17 10 C15 17 15 24 17 31 M21 12 v20" stroke="#8C5A30" stroke-width="1" fill="none" opacity=".8"/>`,
  sesame: `
    <g fill="#EBD39A" stroke="#A9813B" stroke-width="1.8" stroke-linejoin="round">
      <path d="M11 6 C14 10 16 16 15.5 21 C15 26 7 26 6.5 21 C6 16 8 10 11 6 Z" transform="rotate(-28 11 16)"/>
      <path d="M29 7 C32 11 34 17 33.5 22 C33 27 25 27 24.5 22 C24 17 26 11 29 7 Z" transform="rotate(26 29 17)"/>
      <path d="M20 13 C23.5 18 25.5 25 25 30.5 C24.5 36 15.5 36 15 30.5 C14.5 25 16.5 18 20 13 Z"/>
    </g>`,
  'mung-bean': `
    <g fill="#6FAE3E" stroke="#4D8A26" stroke-width=".8">
      <ellipse cx="13" cy="15" rx="5" ry="3.6" transform="rotate(-20 13 15)"/><ellipse cx="25" cy="13" rx="5" ry="3.6" transform="rotate(15 25 13)"/>
      <ellipse cx="19" cy="22" rx="5" ry="3.6"/><ellipse cx="10" cy="27" rx="5" ry="3.6" transform="rotate(25 10 27)"/>
      <ellipse cx="28" cy="25" rx="5" ry="3.6" transform="rotate(-25 28 25)"/><ellipse cx="20" cy="31" rx="5" ry="3.6" transform="rotate(10 20 31)"/>
    </g>
    <g fill="#F2F7E6"><circle cx="13" cy="14" r=".9"/><circle cx="25" cy="12" r=".9"/><circle cx="19" cy="21" r=".9"/><circle cx="10" cy="26" r=".9"/><circle cx="28" cy="24" r=".9"/><circle cx="20" cy="30" r=".9"/></g>`,
  // ── 과일 ──
  pear: `
    <path d="M20 9 q1 -5 3 -6" stroke="#6B4A2B" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M22 6 q6 -2 8 2 q-5 2 -8 -2z" fill="#5FA845"/>
    <circle cx="20" cy="23" r="15" fill="#D9A84E"/>
    <circle cx="20" cy="23" r="15" fill="url(#pearShade)"/>
    <g fill="#B98738" opacity=".7"><circle cx="13" cy="19" r=".8"/><circle cx="17" cy="15" r=".8"/><circle cx="24" cy="17" r=".8"/><circle cx="27" cy="24" r=".8"/><circle cx="14" cy="27" r=".8"/><circle cx="21" cy="30" r=".8"/><circle cx="26" cy="31" r=".8"/><circle cx="10" cy="23" r=".8"/></g>
    <defs><radialGradient id="pearShade" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#F3D58A" stop-opacity=".9"/><stop offset="1" stop-color="#C08A33" stop-opacity="0"/></radialGradient></defs>`,
  persimmon: `
    <ellipse cx="20" cy="23" rx="16" ry="13" fill="#F28C28"/>
    <ellipse cx="15" cy="19" rx="5" ry="3" fill="#F7AE5C" opacity=".8"/>
    <path d="M20 12 l-8 -1 l5 -3 z M20 12 l8 -1 l-5 -3 z M20 12 l-5 4 l1 -5 z M20 12 l5 4 l-1 -5 z" fill="#4E7A2E"/>
    <rect x="19" y="6" width="2" height="5" rx="1" fill="#5B4127"/>`,
  // ── 고기·계란·우유 ──
  milk: `
    <path d="M10 13 L15 5 H25 L30 13 Z" fill="#E8EEF7" stroke="#B8C6DA" stroke-width=".8"/>
    <rect x="15" y="2" width="10" height="3.5" rx=".8" fill="#E8EEF7" stroke="#B8C6DA" stroke-width=".8"/>
    <rect x="10" y="13" width="20" height="25" rx="1.5" fill="#FFFFFF" stroke="#B8C6DA" stroke-width=".8"/>
    <path d="M10 22 q5 -3 10 0 t10 0 V38 H10z" fill="#3D7BE0"/>
    <text x="20" y="20" text-anchor="middle" font-size="5.5" font-weight="700" fill="#3D7BE0" font-family="sans-serif">우유</text>
    <path d="M14 30 q2 -3 4 0 t4 0" stroke="#fff" stroke-width="1.2" fill="none"/>`,
  'pork-cut': `
    <path d="M5 16 q2 -8 14 -9 q14 0 17 9 q2 10 -9 16 q-12 5 -19 -2 q-5 -6 -3 -14z" fill="#F4A7A7"/>
    <path d="M5 16 q2 -8 14 -9 q14 0 17 9 q2 10 -9 16 q-12 5 -19 -2 q-5 -6 -3 -14z" fill="none" stroke="#FBEFE6" stroke-width="3"/>
    <path d="M10 15 q6 4 9 -1 q4 -4 9 0 M9 23 q7 2 11 -2 q5 -2 9 2" stroke="#FFF3EC" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  chicken: `
    <path d="M27 24 Q37 16 36 6 Q31 12 29 12 Q33 6 30 2 Q27 9 25 12 Z" fill="#E9E4DA" stroke="#C9C2B5" stroke-width=".8"/>
    <path d="M7 24 Q6 36 20 36 Q31 36 32 26 Q32 17 24 17 Q19 17 16 12 L14 9 Q10 9 9 13 Q8 18 7 24 Z" fill="#FFFFFF" stroke="#CFC8BC" stroke-width="1"/>
    <path d="M12 26 Q18 30 26 26 Q22 32 14 30 Z" fill="#EFEAE1"/>
    <path d="M11 6 q1 -3 3 -1 q1 -3 3 0 q2 -2 2 2 q-3 1 -8 -1z" fill="#E53935"/>
    <path d="M9 12 L5 13.5 L9 15 Z" fill="#F4A21C"/>
    <path d="M10 15 q-1 4 1.5 5 q1.5 -2 0 -5z" fill="#E53935"/>
    <circle cx="12" cy="11.5" r="1.1" fill="#1d1d1d"/>
    <path d="M17 36 v3 M23 36 v3 M15.5 39 h3 M21.5 39 h3" stroke="#F4A21C" stroke-width="1.4" stroke-linecap="round"/>`,
  // ── 수산 ──
  hairtail: `
    <path d="M3 33 Q14 31 24 21 Q31 13 38 3 Q36 13 28 22 Q17 34 4 36.5 Z" fill="#E6ECF2" stroke="#8D9CAE" stroke-width="1"/>
    <path d="M6 33.5 Q16 30 25 21.5 Q31 14.5 36 7" stroke="#FFFFFF" stroke-width="1.6" fill="none"/>
    <path d="M1 34.5 L6 31.5 L6.5 36.5 Z" fill="#B7C3D1"/>
    <circle cx="6.8" cy="33.6" r="1.4" fill="#1d1d1d"/>
    <path d="M12 31 L30 13" stroke="#C3CEDB" stroke-width=".8" stroke-dasharray="1.2 1.2"/>`,
  saury: fish('#2F4F7F', '#E3E9F0', '<path d="M3 20 L0 19.5 L3 19z" fill="#E7B53A"/>', true),
  mackerel: fish('#2E6E8E', '#EAF0F4', '<path d="M8 15 q3 2 5 0 q3 2 5 0 q3 2 5 0 q3 2 5 0" stroke="#1D3F55" stroke-width="1.1" fill="none"/>'),
  'spanish-mackerel': fish('#4E6E8E', '#EEF2F5', '<g fill="#2F4A63"><circle cx="13" cy="16" r=".9"/><circle cx="18" cy="15" r=".9"/><circle cx="23" cy="16" r=".9"/><circle cx="28" cy="17" r=".9"/><circle cx="16" cy="18" r=".9"/><circle cx="21" cy="18" r=".9"/><circle cx="26" cy="19" r=".9"/></g>', true),
  pollack: fish('#8A7A62', '#E9E2D4', '<g fill="#6E604B"><circle cx="15" cy="16" r=".8"/><circle cx="20" cy="15" r=".8"/><circle cx="25" cy="16.5" r=".8"/></g>'),
  croaker: fish('#B9953A', '#F4D97A'),
  'mackerel-fillet': `
    <path d="M4 14 q16 -8 32 0 q2 8 -2 14 q-14 6 -28 0 q-4 -6 -2 -14z" fill="#F2B79A"/>
    <path d="M4 14 q16 -8 32 0 q-1 3 -2 4 q-14 -6 -28 0 q-1 -1 -2 -4z" fill="#3E6E8C"/>
    <path d="M8 13 q3 2 5 0 q3 2 5 0 q3 2 5 0 q3 2 5 0" stroke="#1D3F55" stroke-width="1" fill="none"/>
    <path d="M9 22 q11 3 22 0" stroke="#E79A7A" stroke-width="1.4" fill="none"/>`,
  abalone: `
    <ellipse cx="20" cy="21" rx="16" ry="12" fill="#7F8C6F"/>
    <ellipse cx="20" cy="21" rx="16" ry="12" fill="none" stroke="#5E6A50" stroke-width="1.2"/>
    <path d="M8 18 q10 -6 24 0 M7 23 q12 -5 26 1" stroke="#A3AE8E" stroke-width="1.3" fill="none"/>
    <g fill="#3D4535"><circle cx="9" cy="15" r="1.3"/><circle cx="13" cy="12" r="1.3"/><circle cx="17.5" cy="10.3" r="1.3"/><circle cx="22" cy="10" r="1.3"/></g>
    <path d="M27 28 q5 -2 7 -6" stroke="#C9A7B8" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  clam: `
    <path d="M20 33 L5 18 Q8 6 20 5 Q32 6 35 18 Z" fill="#D8C3A1"/>
    <path d="M20 33 L5 18 Q8 6 20 5 Q32 6 35 18 Z" fill="none" stroke="#9F8662" stroke-width="1.2"/>
    <path d="M9 14 q11 -6 22 0 M7 19 q13 -6 26 0 M12 24 q8 -4 16 0" stroke="#8B6F4A" stroke-width="1.6" fill="none" opacity=".7"/>
    <path d="M14 10 l3 3 M24 9 l-2 4 M19 16 l2 2" stroke="#6D5536" stroke-width="1.2"/>
    <rect x="17" y="31" width="6" height="3.5" rx="1.5" fill="#9F8662"/>`,
  cockle: `
    <path d="M20 35 Q4 32 4 18 Q6 6 20 5 Q34 6 36 18 Q36 32 20 35 Z" fill="#E9E1D3"/>
    <g stroke="#8E7457" stroke-width="2.2" fill="none">
      <path d="M20 34 L8 13"/><path d="M20 34 L12 9"/><path d="M20 34 L16 7"/><path d="M20 34 V6"/><path d="M20 34 L24 7"/><path d="M20 34 L28 9"/><path d="M20 34 L32 13"/><path d="M20 34 L35 18"/><path d="M20 34 L5 18"/>
    </g>
    <path d="M20 35 Q4 32 4 18 Q6 6 20 5 Q34 6 36 18 Q36 32 20 35 Z" fill="none" stroke="#6E583F" stroke-width="1.2"/>`,
  mussel: `
    <path d="M6 32 Q4 22 14 12 Q24 3 33 5 Q37 8 34 16 Q26 30 12 35 Q7 36 6 32 Z" fill="#26283A"/>
    <path d="M9 30 Q12 20 20 13 Q27 8 31 8" stroke="#4A4F6E" stroke-width="1.6" fill="none"/>
    <path d="M13 31 Q18 24 26 18" stroke="#3B3F5A" stroke-width="1.2" fill="none"/>`,
  oyster: `
    <path d="M2 21 Q3 13 10 12 Q14 8 20 10 Q26 7 31 11 Q38 12 38 19 Q39 26 32 28 Q26 32 19 30 Q12 32 7 29 Q1 27 2 21 Z" fill="#A9A595" stroke="#7E7A6B" stroke-width="1"/>
    <path d="M5 21 Q6 15 12 15 Q16 12 21 13.5 Q27 11 31 14.5 Q35 16 35 20 Q35 25 30 26 Q24 28.5 18 27 Q11 28.5 8 26 Q4 24.5 5 21 Z" fill="#F1EDE3"/>
    <path d="M9 21 Q10 17 15 17 Q20 15 25 16.5 Q31 16.5 31 20.5 Q31 24 26 24.5 Q20 26 15 24.5 Q9 25 9 21 Z" fill="#B7B2AA"/>
    <path d="M12 21 Q17 19 22 20 Q26 19.5 28 21" stroke="#8C8780" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M3 18 q3 -2 5 -1 M33 12 q3 1 4 4 M14 31 q4 1 7 0" stroke="#8E8A79" stroke-width="1" fill="none"/>`,
  scallop: `
    <path d="M20 34 L4 16 Q10 4 20 4 Q30 4 36 16 Z" fill="#F29A6B"/>
    <g stroke="#D46E3E" stroke-width="1.6" fill="none"><path d="M20 34 L7 12"/><path d="M20 34 L11 8"/><path d="M20 34 L15.5 5.5"/><path d="M20 34 V4.5"/><path d="M20 34 L24.5 5.5"/><path d="M20 34 L29 8"/><path d="M20 34 L33 12"/></g>
    <path d="M14 34 L16 30 H24 L26 34 Q20 38 14 34 Z" fill="#E07D4E"/>`,
  anchovy: `
    <g transform="translate(0 -8)"><path d="M28 20 L36 15.5 L35 24.5 Z" fill="#7F8C99"/><path d="M2 20 Q15 12 30 20 Q15 26 2 20 Z" fill="#C3CCD5" stroke="#7F8C99" stroke-width=".8"/><path d="M2 20 Q15 14 30 20 Q15 18 2 20Z" fill="#8E9AA7"/><circle cx="6" cy="19.2" r="1.2" fill="#1d1d1d"/></g>
    <g transform="translate(4 6)"><path d="M28 20 L36 15.5 L35 24.5 Z" fill="#7F8C99"/><path d="M2 20 Q15 12 30 20 Q15 26 2 20 Z" fill="#C3CCD5" stroke="#7F8C99" stroke-width=".8"/><path d="M2 20 Q15 14 30 20 Q15 18 2 20Z" fill="#8E9AA7"/><circle cx="6" cy="19.2" r="1.2" fill="#1d1d1d"/></g>`,
  seaweed: `
    <path d="M5 30 Q3 22 9 19 Q8 12 15 11 Q18 5 25 8 Q32 7 33 14 Q38 18 35 25 Q37 32 29 34 Q22 38 15 35 Q7 36 5 30 Z" fill="#1F3A28"/>
    <path d="M9 27 q4 -6 9 -3 q4 -6 10 -2 M11 19 q5 -3 9 1 q4 -5 9 -1 M14 31 q5 -2 9 1 q4 -3 8 -1" stroke="#3E6B4C" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  kelp: `
    <path d="M6 8 Q20 3 34 8 L33 33 Q20 38 7 33 Z" fill="#4A5A35"/>
    <path d="M8 14 Q20 10 32 14 M8 22 Q20 18 32 22 M8 29 Q20 26 32 29" stroke="#5E7046" stroke-width="1.6" fill="none"/>
    <g fill="#E8E6D8" opacity=".8"><circle cx="12" cy="11" r=".8"/><circle cx="25" cy="17" r=".8"/><circle cx="16" cy="26" r=".8"/><circle cx="29" cy="30" r=".8"/><circle cx="21" cy="9" r=".6"/></g>`,
  'dried-squid': `
    <path d="M20 2 L30 10 Q32 22 27 26 L13 26 Q8 22 10 10 Z" fill="#E8B27A" stroke="#C98D52" stroke-width="1"/>
    <path d="M13 8 Q20 5 27 8 L30 10 Q20 6 10 10 Z" fill="#D9985C"/>
    <path d="M20 8 V25" stroke="#C98D52" stroke-width=".9"/>
    <g stroke="#D9985C" stroke-width="2.2" stroke-linecap="round" fill="none">
      <path d="M14 26 Q12 32 9 37"/><path d="M17 26 Q16 32 15 38"/><path d="M20 26 V38"/><path d="M23 26 Q24 32 25 38"/><path d="M26 26 Q28 32 31 37"/>
    </g>`,
  'cherry-tomato': `
    <g>
      <ellipse cx="14" cy="24" rx="8" ry="10" fill="#E8352B" transform="rotate(-12 14 24)"/>
      <ellipse cx="11.5" cy="20" rx="2.2" ry="3.4" fill="#FF8A80" opacity=".7" transform="rotate(-12 11.5 20)"/>
      <path d="M12.5 14.5 l-4 -2 l3.5 -0.3 l-0.8 -3.2 l2.6 2.4 l2.2 -2.6 l-0.2 3.4 l3.6 0.2 l-3.6 1.8 z" fill="#3E8E3A"/>
      <ellipse cx="27" cy="27" rx="7.5" ry="9.5" fill="#D92E24" transform="rotate(14 27 27)"/>
      <ellipse cx="25" cy="23.5" rx="2" ry="3" fill="#FF8A80" opacity=".65" transform="rotate(14 25 23.5)"/>
      <path d="M28.5 18 l-3.6 -2.2 l3.4 -0.1 l-0.4 -3.2 l2.4 2.6 l2.4 -2.4 l-0.4 3.4 l3.4 0.4 l-3.6 1.6 z" fill="#3E8E3A"/>
    </g>`,
  'korean-melon': `
    <ellipse cx="20" cy="21" rx="13" ry="17" fill="#F7C51E" transform="rotate(-20 20 21)"/>
    <g stroke="#FFF6D2" stroke-width="2" fill="none" stroke-linecap="round" transform="rotate(-20 20 21)">
      <path d="M20 5 V37"/><path d="M13.5 6.5 Q10 21 13.5 35.5"/><path d="M26.5 6.5 Q30 21 26.5 35.5"/><path d="M9 10 Q6 21 9 32"/><path d="M31 10 Q34 21 31 32"/>
    </g>
    <ellipse cx="20" cy="21" rx="13" ry="17" fill="none" stroke="#E0A800" stroke-width="1" transform="rotate(-20 20 21)"/>
    <path d="M25.5 4.5 q2 -3 4 -3" stroke="#6B8E3A" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  'shine-muscat': `
    <path d="M20 6 q1 -4 4 -5" stroke="#7A5A2E" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M22 4 q7 -3 11 1 q-6 3 -11 -1z" fill="#6FA43C"/>
    <g fill="#C8E68A" stroke="#93BF4E" stroke-width=".9">
      <circle cx="13" cy="11" r="4.6"/><circle cx="21" cy="10" r="4.6"/><circle cx="29" cy="12" r="4.6"/>
      <circle cx="9.5" cy="18.5" r="4.6"/><circle cx="17.5" cy="18" r="4.6"/><circle cx="25.5" cy="18.5" r="4.6"/><circle cx="32" cy="20" r="4.2"/>
      <circle cx="13" cy="26" r="4.6"/><circle cx="21" cy="26" r="4.6"/><circle cx="28.5" cy="27" r="4.4"/>
      <circle cx="17" cy="33" r="4.4"/><circle cx="24.5" cy="34" r="4.2"/>
    </g>
    <g fill="#F2FADF" opacity=".9"><circle cx="11.5" cy="9.5" r="1.2"/><circle cx="19.5" cy="8.5" r="1.2"/><circle cx="16" cy="16.5" r="1.2"/><circle cx="24" cy="17" r="1.2"/><circle cx="19.5" cy="24.5" r="1.2"/><circle cx="15.5" cy="31.5" r="1.2"/></g>`,
  'pork-leg': `
    <path d="M6 10 Q4 4 12 3 Q22 2 27 9 L33 25 Q35 30 33 33 L25 34 Q24 30 21 27 Q14 22 9 17 Q6 14 6 10 Z" fill="#E9A07A"/>
    <path d="M6 10 Q4 4 12 3 Q22 2 27 9" stroke="#C97852" stroke-width="1" fill="none"/>
    <ellipse cx="11" cy="8" rx="5" ry="4" fill="#F7E6D8" stroke="#DCC1AC" stroke-width=".8"/>
    <circle cx="11" cy="8" r="1.8" fill="#E8C8B0"/>
    <path d="M14 12 Q20 13 25 18 M16 17 Q22 19 27 24" stroke="#F6C3A6" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M24 34 L25 38 Q27 39.5 29 38 L29 34 Z M29.5 34 L30 38 Q32 39.5 34 38 L33.5 33 Z" fill="#8B5A3C"/>
    <path d="M24.5 34 H33.5" stroke="#B9774F" stroke-width="1.2"/>`,
  laver: `
    <rect x="9" y="5" width="25" height="25" rx="1.5" fill="#1F2B22" transform="rotate(8 21 17)"/>
    <rect x="6" y="9" width="25" height="25" rx="1.5" fill="#26352A"/>
    <path d="M9 15 h19 M9 21 h19 M9 27 h19" stroke="#34493A" stroke-width=".8"/>`,
};

// 품목 → 그림 연결 (같은 그림을 여러 품목이 써요)
export const ICON_OF: Record<string, string> = {
  radish: 'radish',
  'young-radish': 'young-radish',
  'cabbage-head': 'cabbage-head',
  spinach: 'spinach',
  lettuce: 'lettuce',
  perilla: 'perilla',
  chives: 'chives',
  'water-parsley': 'water-parsley',
  'green-onion': 'green-onion',
  scallion: 'scallion',
  'green-pepper': 'green-pepper',
  cheongyang: 'cheongyang',
  zucchini: 'zucchini',
  'oyster-mushroom': 'oyster-mushroom',
  enoki: 'enoki',
  'king-oyster': 'king-oyster',
  walnut: 'walnut',
  almond: 'almond',
  sesame: 'sesame',
  'mung-bean': 'mung-bean',
  pear: 'pear',
  'shine-muscat': 'shine-muscat',
  'cherry-tomato': 'cherry-tomato',
  'korean-melon': 'korean-melon',
  persimmon: 'persimmon',
  milk: 'milk',
  'pork-neck': 'pork-cut',
  'pork-shoulder': 'pork-leg',
  chicken: 'chicken',
  hairtail: 'hairtail',
  saury: 'saury',
  mackerel: 'mackerel',
  'spanish-mackerel': 'spanish-mackerel',
  pollack: 'pollack',
  'yellow-croaker': 'croaker',
  gulbi: 'croaker',
  'imported-croaker': 'croaker',
  'mackerel-fillet-imp': 'mackerel-fillet',
  'mackerel-fillet-kr': 'mackerel-fillet',
  abalone: 'abalone',
  clam: 'clam',
  cockle: 'cockle',
  mussel: 'mussel',
  oyster: 'oyster',
  scallop: 'scallop',
  anchovy: 'anchovy',
  'dried-squid': 'dried-squid',
  seaweed: 'seaweed',
  kelp: 'kelp',
  laver: 'laver',
};
