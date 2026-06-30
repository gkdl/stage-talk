// Play 스토어 그래픽 이미지(feature graphic) 1024x500 — 스포트라이트(무대 조명) 디자인
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'assets', 'store');
fs.mkdirSync(OUT, { recursive: true });

const W = 1024, H = 500;

// 골드 4각 반짝임
function sparkle(x, y, r, o) {
  return `<path d="M${x},${y - r} L${x + r * 0.28},${y - r * 0.28} L${x + r},${y} L${x + r * 0.28},${y + r * 0.28} L${x},${y + r} L${x - r * 0.28},${y + r * 0.28} L${x - r},${y} L${x - r * 0.28},${y - r * 0.28} Z" fill="#FCD34D" opacity="${o}"/>`;
}

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3B0A6B"/>
      <stop offset="0.55" stop-color="#5B21B6"/>
      <stop offset="1" stop-color="#7C3AED"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="38%" r="55%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FDE68A" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#FDE68A" stop-opacity="0"/>
    </linearGradient>
    <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#2E1065" flood-opacity="0.45"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- 스포트라이트 빔 (상단 중앙에서 퍼짐) -->
  <polygon points="512,-40 360,540 664,540" fill="url(#beam)"/>
  <polygon points="512,-40 250,540 470,540" fill="url(#beam)" opacity="0.5"/>
  <polygon points="512,-40 554,540 774,540" fill="url(#beam)" opacity="0.5"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- 반짝임 -->
  ${sparkle(150, 120, 14, 0.9)}
  ${sparkle(880, 150, 18, 0.85)}
  ${sparkle(820, 360, 11, 0.7)}
  ${sparkle(180, 360, 12, 0.7)}
  ${sparkle(930, 250, 8, 0.6)}

  <!-- 로고 마크: 말풍선 + 점3개 (상단 중앙) -->
  <g transform="translate(512,150) scale(0.8)" filter="url(#sh)">
    <path d="M-100,-78 H100 a28,28 0 0 1 28,28 V54 a28,28 0 0 1 -28,28 H-18 L-52,128 L-58,82 H-100 a28,28 0 0 1 -28,-28 V-50 a28,28 0 0 1 28,-28 Z" fill="#FFFFFF"/>
    <circle cx="-56" cy="2" r="20" fill="#7C3AED"/>
    <circle cx="0" cy="2" r="20" fill="#7C3AED"/>
    <circle cx="56" cy="2" r="20" fill="#7C3AED"/>
  </g>

  <!-- 워드마크 + 태그라인 (중앙 정렬) -->
  <text x="512" y="350" text-anchor="middle" font-family="Malgun Gothic, 'Apple SD Gothic Neo', sans-serif" font-size="86" font-weight="700" fill="#FFFFFF">스테이지톡</text>
  <rect x="437" y="372" width="150" height="4" rx="2" fill="#FCD34D"/>
  <text x="512" y="425" text-anchor="middle" font-family="Malgun Gothic, 'Apple SD Gothic Neo', sans-serif" font-size="28" font-weight="400" fill="#E9D5FF">뮤지컬·연극 관람 기록 &amp; 커뮤니티</text>
</svg>`;

(async () => {
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, 'feature-graphic.png'));
  console.log('✅ feature-graphic.png (1024x500) — 스포트라이트 디자인');
})();
