import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types/database';
import { useAuthStore } from '@/store/authStore';

const PAGE_SIZE = 20;

type SortOrder = 'popular' | 'recent';

async function fetchPosts(
  performanceId: string,
  sort: SortOrder,
  pageParam: number,
  blockedIds: string[],
) {
  let query = supabase
    .from('posts')
    .select('id, type, board, tag, title, content_blocks, user_id, likes_count, comments_count, created_at, profiles!inner(nickname)')
    .eq('performance_id', performanceId)
    .eq('board', 'performance')
    .eq('is_hidden', false)
    .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

  if (blockedIds.length > 0) {
    query = query.not('user_id', 'in', `(${blockedIds.join(',')})`);
  }

  if (sort === 'popular') {
    query = query.order('likes_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as (Post & { profiles: { nickname: string } })[];
}

export function usePerformancePosts(performanceId: string, sort: SortOrder) {
  const user = useAuthStore((s) => s.user);

  return useInfiniteQuery({
    queryKey: ['performance-posts', performanceId, sort],
    queryFn: async ({ pageParam }) => {
      let blockedIds: string[] = [];
      if (user) {
        const { data } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id);
        blockedIds = (data ?? []).map((b) => b.blocked_id);
      }
      return fetchPosts(performanceId, sort, pageParam, blockedIds);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    enabled: !!performanceId,
    staleTime: 1000 * 60 * 3,
  });
}
