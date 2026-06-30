// StageTalk 앱 아이콘 생성기 — 무대 커튼(Stage) + 말풍선(Talk) 콘셉트
// 실행: node scripts/gen-icons.js   (sharp 필요)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });

const PURPLE = '#7C3AED';

// 상단 발란스(주름 커튼) 스캘럽 경로 생성
function valance(W, baseline, dip, n) {
  let d = `M0,0 L${W},0 L${W},${baseline}`;
  const seg = W / n;
  for (let i = 1; i <= n; i++) {
    const ex = +(W - i * seg).toFixed(1);
    const cx = +(W - (i - 0.5) * seg).toFixed(1);
    d += ` Q${cx},${dip} ${ex},${baseline}`;
  }
  d += ' Z';
  return d;
}

// 커튼 + 말풍선 심볼 (배경 제외) — 1024 좌표계 기준 그룹
function symbol() {
  const W = 1024;
  return `
  <!-- 좌측 커튼 -->
  <path d="M0,0 L196,0 Q150,520 196,1024 L0,1024 Z" fill="url(#goldSide)"/>
  <path d="M70,40 Q40,520 70,990" stroke="#B45309" stroke-width="10" fill="none" opacity="0.45" stroke-linecap="round"/>
  <path d="M130,30 Q98,520 130,1000" stroke="#B45309" stroke-width="10" fill="none" opacity="0.35" stroke-linecap="round"/>
  <!-- 우측 커튼 -->
  <path d="M1024,0 L828,0 Q874,520 828,1024 L1024,1024 Z" fill="url(#goldSideR)"/>
  <path d="M954,40 Q984,520 954,990" stroke="#B45309" stroke-width="10" fill="none" opacity="0.45" stroke-linecap="round"/>
  <path d="M894,30 Q926,520 894,1000" stroke="#B45309" stroke-width="10" fill="none" opacity="0.35" stroke-linecap="round"/>
  <!-- 상단 발란스 -->
  <path d="${valance(W, 172, 258, 8)}" fill="url(#gold)"/>
  <path d="M0,150 L1024,150" stroke="#B45309" stroke-width="8" opacity="0.3"/>
  <!-- 말풍선 (Talk) -->
  <g filter="url(#shadow)">
    <path d="M344,372 H680 a44,44 0 0 1 44,44 V604 a44,44 0 0 1 -44,44 H520 L466,724 L460,648 H344 a44,44 0 0 1 -44,-44 V416 a44,44 0 0 1 44,-44 Z" fill="#FFFFFF"/>
  </g>
  <!-- 채팅 점 3개 -->
  <circle cx="422" cy="510" r="33" fill="${PURPLE}"/>
  <circle cx="512" cy="510" r="33" fill="${PURPLE}"/>
  <circle cx="602" cy="510" r="33" fill="${PURPLE}"/>`;
}

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8B5CF6"/>
      <stop offset="1" stop-color="#6D28D9"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FCD34D"/>
      <stop offset="1" stop-color="#F59E0B"/>
    </linearGradient>
    <linearGradient id="goldSide" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#D97706"/>
      <stop offset="0.5" stop-color="#FCD34D"/>
      <stop offset="1" stop-color="#F59E0B"/>
    </linearGradient>
    <linearGradient id="goldSideR" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#D97706"/>
      <stop offset="0.5" stop-color="#FCD34D"/>
      <stop offset="1" stop-color="#F59E0B"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="20" flood-color="#3B0764" flood-opacity="0.35"/>
    </filter>
  </defs>`;

// 1) 메인 아이콘 (풀블리드, iOS는 자동 마스킹)
const iconFull = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/>
  ${symbol()}
</svg>`;

// 2) Android 적응형 아이콘 (투명 배경, 심볼을 안전영역 ~70%로 축소 중앙배치)
const iconAdaptive = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <g transform="translate(512,512) scale(0.66) translate(-512,-512)">
    <rect x="0" y="0" width="1024" height="1024" rx="180" fill="url(#bg)"/>
    ${symbol()}
  </g>
</svg>`;

// 3) 스플래시 (투명 배경, 로고 심볼 중앙 — 배경 퍼플은 app.json splash 설정이 채움)
const splash = `<svg width="1242" height="1242" viewBox="0 0 1242 1242" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <g transform="translate(621,621) scale(0.62) translate(-512,-512)">
    <rect x="0" y="0" width="1024" height="1024" rx="200" fill="url(#bg)"/>
    ${symbol()}
  </g>
</svg>`;

// 4) 알림 아이콘 (안드로이드: 흰 실루엣 / 투명) — 말풍선만
const notif = `<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <path d="M44,40 H148 a26,26 0 0 1 26,26 V120 a26,26 0 0 1 -26,26 H96 L66,176 L62,146 H44 a26,26 0 0 1 -26,-26 V66 a26,26 0 0 1 26,-26 Z" fill="#FFFFFF"/>
  <circle cx="68" cy="96" r="13" fill="#000000" fill-opacity="0"/>
  <circle cx="68" cy="96" r="13" fill="#7C3AED" fill-opacity="0"/>
</svg>`;

async function render(svg, file, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(OUT, file));
  console.log('  ✅', file, `(${size}x${size})`);
}

(async () => {
  console.log('아이콘 생성 중...');
  await render(iconFull, 'icon.png', 1024);
  await render(iconAdaptive, 'adaptive-icon.png', 1024);
  await sharp(Buffer.from(splash)).png().toFile(path.join(OUT, 'splash.png'));
  console.log('  ✅ splash.png (1242x1242)');
  await render(notif, 'notification-icon.png', 96);
  console.log('완료. → assets/');
})();
