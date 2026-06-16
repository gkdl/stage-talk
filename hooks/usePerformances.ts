import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Performance } from '@/types/database';

const PAGE_SIZE = 20;

interface FetchParams {
  genre: 'all' | 'musical' | 'play';
  search: string;
  pageParam: number;
}

async function fetchPerformances({ genre, search, pageParam }: FetchParams) {
  let query = supabase
    .from('performances')
    .select('id, kopis_id, title, venue, start_date, end_date, genre, status, created_at')
    .order('status', { ascending: true })
    .order('start_date', { ascending: true })
    .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

  if (genre !== 'all') {
    query = query.eq('genre', genre);
  }
  if (search.trim()) {
    query = query.ilike('title', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Performance[];
}

export function usePerformances(genre: 'all' | 'musical' | 'play', search: string) {
  return useInfiniteQuery({
    queryKey: ['performances', genre, search],
    queryFn: ({ pageParam }) => fetchPerformances({ genre, search, pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    staleTime: 1000 * 60 * 10,
  });
}
