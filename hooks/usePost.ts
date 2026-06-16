import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function usePost(postId: string) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!inner(nickname, avatar_url)')
        .eq('id', postId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 3,
  });
}

export function usePostLike(postId: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: isLiked = false } = useQuery({
    queryKey: ['post-like', postId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_type', 'post')
        .eq('target_id', postId)
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
          .eq('target_type', 'post')
          .eq('target_id', postId);
      } else {
        await supabase
          .from('likes')
          .insert({ user_id: user.id, target_type: 'post', target_id: postId });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      await queryClient.cancelQueries({ queryKey: ['post-like', postId, user?.id] });

      const prevPost = queryClient.getQueryData<any>(['post', postId]);
      const prevLiked = queryClient.getQueryData(['post-like', postId, user?.id]);

      queryClient.setQueryData(['post-like', postId, user?.id], !isLiked);
      if (prevPost) {
        queryClient.setQueryData(['post', postId], {
          ...prevPost,
          likes_count: prevPost.likes_count + (isLiked ? -1 : 1),
        });
      }
      return { prevPost, prevLiked };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevPost) queryClient.setQueryData(['post', postId], context.prevPost);
      queryClient.setQueryData(['post-like', postId, user?.id], context?.prevLiked);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['post-like', postId, user?.id] });
    },
  });

  return { isLiked, toggleLike };
}

export function useDeletePost(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.removeQueries({ queryKey: ['post', postId] });
    },
  });
}
