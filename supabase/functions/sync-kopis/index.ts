import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const KOPIS_BASE_URL = 'http://www.kopis.or.kr/openApi/restful/pblprfr';
const PAGE_SIZE = 100;

function getTag(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([^\\]]*?)\\]\\]><\\/${tag}>`));
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = xml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`));
  return plainMatch ? plainMatch[1].trim() : '';
}

function formatKopisDate(s: string): string {
  if (!s || s.length < 8) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

serve(async () => {
  const apiKey = Deno.env.get('KOPIS_API_KEY')!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date();
  const stdate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString().slice(0, 10).replace(/-/g, '');
  const eddate = new Date(today.getFullYear(), today.getMonth() + 3, 0)
    .toISOString().slice(0, 10).replace(/-/g, '');

  const genres = [
    { code: 'GGGA', type: 'musical' },
    { code: 'AAAA', type: 'play' },
  ];

  let totalSynced = 0;

  for (const genre of genres) {
    const url =
      `${KOPIS_BASE_URL}?service=${apiKey}&stdate=${stdate}&eddate=${eddate}` +
      `&rows=${PAGE_SIZE}&cpage=1&genrenm=${genre.code}&newsql=Y`;

    const res = await fetch(url);
    const xml = await res.text();
    const items = xml.match(/<db>([\s\S]*?)<\/db>/g) ?? [];

    for (const item of items) {
      const kopis_id = getTag(item, 'mt20id');
      const title = getTag(item, 'prfnm');
      const venue = getTag(item, 'fcltynm');
      const start_date = formatKopisDate(getTag(item, 'prfpdfrom'));
      const end_date = formatKopisDate(getTag(item, 'prfpdto'));
      const castStr = getTag(item, 'prfcast');
      const stateStr = getTag(item, 'prfstate');

      const status = stateStr.includes('공연중')
        ? 'ongoing'
        : stateStr.includes('공연예정')
        ? 'upcoming'
        : 'ended';

      const { data: perf } = await supabase
        .from('performances')
        .upsert(
          { kopis_id, title, venue, start_date, end_date, genre: genre.type, status },
          { onConflict: 'kopis_id' },
        )
        .select('id')
        .single();

      if (!perf || !castStr) continue;

      const actorNames = castStr
        .split(',')
        .map((n: string) => n.trim())
        .filter(Boolean);

      for (const name of actorNames) {
        const { data: actor } = await supabase
          .from('actors')
          .upsert({ name }, { onConflict: 'name' })
          .select('id')
          .single();

        if (actor) {
          await supabase
            .from('performance_actors')
            .upsert(
              { performance_id: perf.id, actor_id: actor.id },
              { onConflict: 'performance_id,actor_id' },
            );
        }
      }
      totalSynced++;
    }
  }

  return new Response(JSON.stringify({ ok: true, totalSynced }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
