import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Comment } from '@/types/database';

type SortOrder = 'created_at' | 'likes_count';

type CommentWithProfile = Comment & { profiles: { nickname: string; avatar_url: string | null } };

function buildTree(flat: CommentWithProfile[]): CommentWithProfile[] {
  const map = new Map<string, CommentWithProfile & { replies: any[] }>();
  const roots: any[] = [];

  flat.forEach((c) => map.set(c.id, { ...c, replies: [] }));

  flat.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function useComments(postId: string, sort: SortOrder = 'created_at') {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['comments', postId, sort],
    queryFn: async () => {
      let blockedIds: string[] = [];
      if (user) {
        const { data } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id);
        blockedIds = (data ?? []).map((b) => b.blocked_id);
      }

      let query = supabase
        .from('comments')
        .select('*, profiles!inner(nickname, avatar_url)')
        .eq('post_id', postId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: sort !== 'likes_count' });

      if (blockedIds.length > 0) {
        query = query.not('user_id', 'in', `(${blockedIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (sort === 'likes_count') {
        data?.sort((a, b) => b.likes_count - a.likes_count);
      }

      return buildTree(data as CommentWithProfile[]);
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 2,
  });
}

interface AddCommentInput {
  post_id: string;
  parent_id?: string;
  depth: number;
  content: string;
  user_id: string;
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddCommentInput) => {
      const { error } = await supabase.from('comments').insert({
        post_id: input.post_id,
        parent_id: input.parent_id ?? null,
        depth: input.depth,
        content: input.content,
        user_id: input.user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

export function useCommentLike(commentId: string, postId: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: isLiked = false } = useQuery({
    queryKey: ['comment-like', commentId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_type', 'comment')
        .eq('target_id', commentId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const { mutate: toggleLike } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다');
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_type', 'comment')
          .eq('target_id', commentId);
      } else {
        await supabase
          .from('likes')
          .insert({ user_id: user.id, target_type: 'comment', target_id: commentId });
      }
    },
    onMutate: async () => {
      const prevLiked = queryClient.getQueryData(['comment-like', commentId, user?.id]);
      queryClient.setQueryData(['comment-like', commentId, user?.id], !isLiked);

      // 댓글 목록 낙관적 업데이트
      const updateComments = (comments: any[]): any[] =>
        comments.map((c) => {
          if (c.id === commentId) {
            return { ...c, likes_count: c.likes_count + (isLiked ? -1 : 1) };
          }
          if (c.replies?.length) return { ...c, replies: updateComments(c.replies) };
          return c;
        });

      ['created_at', 'likes_count'].forEach((sort) => {
        const key = ['comments', postId, sort];
        const prev = queryClient.getQueryData<any[]>(key);
        if (prev) queryClient.setQueryData(key, updateComments(prev));
      });

      return { prevLiked };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['comment-like', commentId, user?.id], context?.prevLiked);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-like', commentId, user?.id] });
    },
  });

  return { isLiked, toggleLike };
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}
