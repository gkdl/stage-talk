import { supabase } from '@/lib/supabase';

// 배우 이름으로 기존 배우를 찾고, 없으면 생성해 actor_id를 반환.
// 글쓰기·관람기록 등에서 공용으로 사용.
export async function resolveActorId(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { data: found } = await supabase
    .from('actors')
    .select('id')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle();
  if (found) return found.id;
  const { data: created, error } = await supabase
    .from('actors')
    .upsert({ name: trimmed }, { onConflict: 'name' })
    .select('id')
    .single();
  if (error) throw error;
  return created?.id ?? null;
}

// 이름 일부로 배우 검색 (자동완성용)
export async function searchActors(query: string, limit = 6): Promise<{ id: string; name: string }[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from('actors')
    .select('id, name')
    .ilike('name', `%${q}%`)
    .limit(limit);
  return data ?? [];
}
