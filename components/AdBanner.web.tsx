// 웹에서는 AdMob을 지원하지 않으므로 아무것도 렌더하지 않음.
// (Metro가 웹 번들에서 이 파일을 사용 → 네이티브 광고 라이브러리를 import하지 않음)
export function AdBanner() {
  return null;
}
