import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const PAGE_SIZE = 20;

type SortType = 'likes_count' | 'created_at';

export function useActorPosts(search: string, sort: SortType) {
  const user = useAuthStore((s) => s.user);

  return useInfiniteQuery({
    queryKey: ['actor-posts-feed', search, sort],
    queryFn: async ({ pageParam = 0 }) => {
      let blockedIds: string[] = [];
      if (user) {
        const { data } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id);
        blockedIds = (data ?? []).map((b) => b.blocked_id);
      }

      let query = supabase
        .from('posts')
        .select(
          '*, profiles!inner(nickname, avatar_url), actors(name)',
          { count: 'exact' },
        )
        .eq('board', 'actor')
        .eq('is_hidden', false)
        .order(sort, { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.ilike('actors.name', `%${search.trim()}%`);
      }

      if (blockedIds.length > 0) {
        query = query.not('user_id', 'in', `(${blockedIds.join(',')})`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        items: data ?? [],
        nextPage: (data?.length ?? 0) === PAGE_SIZE ? pageParam + 1 : undefined,
        total: count ?? 0,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 1000 * 60 * 2,
  });
}
