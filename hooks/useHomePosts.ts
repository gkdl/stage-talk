import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const PAGE_SIZE = 20;

export type HomeSort = 'likes_count' | 'created_at' | 'following';

export function useHomePosts(sort: HomeSort) {
  const user = useAuthStore((s) => s.user);

  return useInfiniteQuery({
    queryKey: ['home-posts', sort, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      let blockedIds: string[] = [];
      if (user) {
        const { data } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id);
        blockedIds = (data ?? []).map((b) => b.blocked_id);
      }

      // "내 관심" — posts from followed actors or bookmarked performances
      if (sort === 'following' && user) {
        const [{ data: follows }, { data: bookmarks }] = await Promise.all([
          supabase.from('actor_follows').select('actor_id').eq('user_id', user.id),
          supabase.from('bookmarks').select('performance_id').eq('user_id', user.id),
        ]);

        const actorIds = (follows ?? []).map((f) => f.actor_id);
        const perfIds = (bookmarks ?? []).map((b) => b.performance_id);

        if (actorIds.length === 0 && perfIds.length === 0) {
          return { items: [], nextPage: undefined };
        }

        let query = supabase
          .from('posts')
          .select('*, profiles!inner(nickname, avatar_url), performances(title), actors(name)')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false }) // 페이징 안정화용 고유 tiebreaker
          .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

        if (blockedIds.length > 0) {
          query = query.not('user_id', 'in', `(${blockedIds.join(',')})`);
        }

        // Filter by followed actors OR bookmarked performances
        const orFilters: string[] = [];
        if (actorIds.length > 0) orFilters.push(`actor_id.in.(${actorIds.join(',')})`);
        if (perfIds.length > 0) orFilters.push(`performance_id.in.(${perfIds.join(',')})`);
        query = query.or(orFilters.join(','));

        const { data, error } = await query;
        if (error) throw error;

        return {
          items: data ?? [],
          nextPage: (data?.length ?? 0) === PAGE_SIZE ? pageParam + 1 : undefined,
        };
      }

      // 인기글 / 최신글
      let query = supabase
        .from('posts')
        .select('*, profiles!inner(nickname, avatar_url), performances(title), actors(name)')
        .eq('is_hidden', false)
        .order(sort === 'likes_count' ? 'likes_count' : 'created_at', { ascending: false })
        .order('id', { ascending: false }) // 페이징 안정화용 고유 tiebreaker
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (blockedIds.length > 0) {
        query = query.not('user_id', 'in', `(${blockedIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        items: data ?? [],
        nextPage: (data?.length ?? 0) === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 1000 * 60 * 2,
    enabled: sort !== 'following' || !!user,
  });
}
