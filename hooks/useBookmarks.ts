import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useBookmarks() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['bookmarks-list', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*, performances!inner(id, title, genre)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 3,
  });
}

export function useActorFollows() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['actor-follows-list', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('actor_follows')
        .select('*, actors!inner(id, name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 3,
  });
}
