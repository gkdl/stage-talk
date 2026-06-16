import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useBookmark(performanceId: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: isBookmarked = false } = useQuery({
    queryKey: ['bookmark', performanceId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('performance_id', performanceId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!performanceId,
  });

  const { mutate: toggleBookmark, isPending } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다');
      if (isBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('performance_id', performanceId);
      } else {
        await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, performance_id: performanceId });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['bookmark', performanceId, user?.id] });
      const prev = queryClient.getQueryData(['bookmark', performanceId, user?.id]);
      queryClient.setQueryData(['bookmark', performanceId, user?.id], !isBookmarked);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['bookmark', performanceId, user?.id], context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark', performanceId, user?.id] });
    },
  });

  return { isBookmarked, toggleBookmark, isPending };
}
