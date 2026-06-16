import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type GenreFilter = 'all' | 'musical' | 'play';

export function useWatchLogs(genre: GenreFilter = 'all') {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['watch-logs', user?.id, genre],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('watch_logs')
        .select('*, performances!inner(title, genre)')
        .eq('user_id', user.id)
        .order('watch_date', { ascending: false });

      if (genre === 'musical') {
        query = query.eq('performances.genre', 'musical');
      } else if (genre === 'play') {
        query = query.eq('performances.genre', 'play');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 3,
  });
}

export function useWatchLogStats() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['watch-log-stats', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, thisMonth: 0, favoriteActor: null };

      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth() + 1;

      const { data, error } = await supabase
        .from('watch_logs')
        .select('watch_date, casting, performances!inner(title, genre)')
        .eq('user_id', user.id)
        .gte('watch_date', `${thisYear}-01-01`);

      if (error) throw error;

      const logs = data ?? [];
      const total = logs.length;
      const monthStr = `${thisYear}-${String(thisMonth).padStart(2, '0')}`;
      const thisMonthCount = logs.filter((l) => l.watch_date?.startsWith(monthStr)).length;

      // 최애 배우: casting 문자열에서 가장 많이 등장한 이름 추출
      const actorCount: Record<string, number> = {};
      logs.forEach((l) => {
        if (l.casting) {
          l.casting.split(/[·,·&\s]+/).forEach((name: string) => {
            const n = name.trim();
            if (n) actorCount[n] = (actorCount[n] ?? 0) + 1;
          });
        }
      });
      const favoriteActor =
        Object.keys(actorCount).length > 0
          ? Object.entries(actorCount).sort((a, b) => b[1] - a[1])[0][0]
          : null;

      return { total, thisMonth: thisMonthCount, favoriteActor };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

interface AddWatchLogInput {
  performance_id: string;
  watch_date: string;
  seat?: string;
  casting?: string;
  rating?: number;
  memo?: string;
}

export function useAddWatchLog() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddWatchLogInput) => {
      if (!user) throw new Error('로그인이 필요합니다');
      const { error } = await supabase.from('watch_logs').insert({
        user_id: user.id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-logs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['watch-log-stats', user?.id] });
    },
  });
}

export function useDeleteWatchLog() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase.from('watch_logs').delete().eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-logs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['watch-log-stats', user?.id] });
    },
  });
}
