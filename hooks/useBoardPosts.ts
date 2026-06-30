import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 20;

export type BoardGenre = 'all' | 'musical' | 'play';
export type BoardSort = 'likes_count' | 'created_at';

// 공연(연극·뮤지컬) 게시글 전체 피드 — 배우 게시판(board='actor')은 제외.
// 숨김/차단 글은 posts RLS가 이미 걸러주므로 별도 필터 불필요.
export function useBoardPosts(genre: BoardGenre, sort: BoardSort) {
  return useInfiniteQuery({
    queryKey: ['board-posts', genre, sort],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('posts')
        .select('id, board, tag, title, likes_count, comments_count, created_at, performances!inner(title, genre), profiles!inner(nickname, avatar_url)')
        .eq('board', 'performance')
        .eq('is_hidden', false)
        .order(sort, { ascending: false })
        .order('id', { ascending: false }) // 페이징 안정화
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (genre !== 'all') {
        query = query.eq('performances.genre', genre);
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
  });
}
