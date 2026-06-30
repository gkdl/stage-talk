import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Performance } from '@/types/database';

const PAGE_SIZE = 20;

export type Genre = 'all' | 'musical' | 'play';
export type PerfStatus = 'all' | 'ongoing' | 'upcoming' | 'ended';
export type PerfSort = 'imminent' | 'latest' | 'title';

interface FetchParams {
  genre: Genre;
  status: PerfStatus;
  sort: PerfSort;
  search: string;
  pageParam: number;
}

function applySort<T>(query: T, sort: PerfSort): T {
  const q = query as any;
  switch (sort) {
    case 'latest': // 최신 등록순
      return q.order('created_at', { ascending: false }).order('id', { ascending: false });
    case 'title': // 가나다순
      return q.order('title', { ascending: true }).order('id', { ascending: true });
    case 'imminent': // 공연 임박순 (공연중 → 공연예정 → 종료, 그 안에서 시작일 빠른 순)
    default:
      return q
        .order('status_rank', { ascending: true })
        .order('start_date', { ascending: true })
        .order('id', { ascending: true });
  }
}

async function fetchPerformances({ genre, status, sort, search, pageParam }: FetchParams) {
  let query = supabase
    .from('performances')
    .select('id, kopis_id, title, venue, start_date, end_date, genre, status, poster_url, created_at');

  if (genre !== 'all') query = query.eq('genre', genre);
  if (status !== 'all') query = query.eq('status', status);
  if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);

  query = applySort(query, sort).range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data as Performance[];
}

export function usePerformances(
  genre: Genre,
  status: PerfStatus,
  sort: PerfSort,
  search: string,
) {
  return useInfiniteQuery({
    queryKey: ['performances', genre, status, sort, search],
    queryFn: ({ pageParam }) => fetchPerformances({ genre, status, sort, search, pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    staleTime: 1000 * 60 * 10,
  });
}
