import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const KOPIS_BASE_URL = 'http://www.kopis.or.kr/openApi/restful/pblprfr';
const PAGE_SIZE = 100;

interface KopisPerformance {
  mt20id: string;
  prfnm: string;
  fcltynm: string;
  prfpdfrom: string;
  prfpdto: string;
  genrenm: string;
  prfstate: string;
  prfcast: string;
}

serve(async () => {
  const apiKey = Deno.env.get('KOPIS_API_KEY')!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const genres = [
    { code: 'GGGA', type: 'musical' },
    { code: 'AAAA', type: 'play' },
  ];

  for (const genre of genres) {
    const today = new Date();
    const stdate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      .toISOString().slice(0, 10).replace(/-/g, '');
    const eddate = new Date(today.getFullYear(), today.getMonth() + 3, 0)
      .toISOString().slice(0, 10).replace(/-/g, '');

    const MAX_PAGES = 30; // 안전 상한 (장르당 최대 3000건)
    for (let cpage = 1; cpage <= MAX_PAGES; cpage++) {
    const url = `${KOPIS_BASE_URL}?service=${apiKey}&stdate=${stdate}&eddate=${eddate}&rows=${PAGE_SIZE}&cpage=${cpage}&shcate=${genre.code}&newsql=Y`;
    const res = await fetch(url);
    const xml = await res.text();

    const items = xml.match(/<db>([\s\S]*?)<\/db>/g) || [];
    console.log(`[${genre.type}] page=${cpage} status=${res.status} items=${items.length}`);
    if (items.length === 0) break;
    for (const item of items) {
      const get = (tag: string) => {
        const m = item.match(new RegExp(`<${tag}><!\\[CDATA\\[([^\\]]*?)\\]\\]><\/${tag}>`));
        if (m) return m[1].trim();
        const m2 = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
        return m2 ? m2[1].trim() : '';
      };

      const kopis_id = get('mt20id');
      const title = get('prfnm');
      const venue = get('fcltynm');
      const start_date = formatDate(get('prfpdfrom')) || null;
      const end_date = formatDate(get('prfpdto')) || null;
      const stateStr = get('prfstate');
      const castStr = get('prfcast');
      // 포스터 URL — https로 올리고, www는 301 리다이렉트가 있어 직접 200을 주는 non-www로 정규화
      const posterRaw = get('poster');
      const poster_url = posterRaw
        ? posterRaw.replace(/^http:/, 'https:').replace('://www.kopis.or.kr', '://kopis.or.kr')
        : null;

      const status = stateStr.includes('공연중') ? 'ongoing'
        : stateStr.includes('공연예정') ? 'upcoming' : 'ended';

      const { data: perf, error: perfErr } = await supabase
        .from('performances')
        .upsert({ kopis_id, title, venue, start_date, end_date, genre: genre.type, status, poster_url }, { onConflict: 'kopis_id' })
        .select('id')
        .single();

      if (perfErr) {
        console.error(`upsert 실패 kopis_id=${kopis_id} title=${title}:`, perfErr.message);
        continue;
      }
      if (!perf || !castStr) continue;

      const actorNames = castStr.split(',').map((n: string) => n.trim()).filter(Boolean);
      for (const name of actorNames) {
        const { data: actor } = await supabase
          .from('actors')
          .upsert({ name }, { onConflict: 'name' })
          .select('id')
          .single();
        if (actor) {
          await supabase
            .from('performance_actors')
            .upsert({ performance_id: perf.id, actor_id: actor.id }, { onConflict: 'performance_id,actor_id' });
        }
      }
    }
      if (items.length < PAGE_SIZE) break; // 마지막 페이지면 중단
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function formatDate(s: string): string | null {
  if (!s) return null;
  // KOPIS는 "YYYY.MM.DD" 형식으로 반환 (구분자 없는 "YYYYMMDD"도 대응)
  const m = s.match(/(\d{4})[.\-/]?(\d{1,2})[.\-/]?(\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
