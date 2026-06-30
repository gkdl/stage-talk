// 무한스크롤(offset 페이징)에서 페이지 경계 중복으로 같은 id가 두 번 들어오는 것을 방지.
// FlatList의 "two children with the same key" 경고를 막는다.
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (item?.id && !seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}
