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

export type StatsPeriod = 'year' | 'all';

export function useWatchLogStats(period: StatsPeriod = 'year') {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['watch-log-stats', user?.id, period],
    queryFn: async () => {
      if (!user) return { total: 0, thisMonth: 0, favoriteActor: null };

      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth() + 1;
      const fromDate = period === 'year' ? `${thisYear}-01-01` : null;

      let logQuery = supabase
        .from('watch_logs')
        .select('watch_date')
        .eq('user_id', user.id);
      if (fromDate) logQuery = logQuery.gte('watch_date', fromDate);

      const { data, error } = await logQuery;
      if (error) throw error;

      const logs = data ?? [];
      const total = logs.length;
      const monthStr = `${thisYear}-${String(thisMonth).padStart(2, '0')}`;
      const thisMonthCount = logs.filter((l) => l.watch_date?.startsWith(monthStr)).length;

      // 최애 배우: DB 집계(RPC) — watch_log_actors group by, 텍스트 파싱 없음
      const { data: fav } = await supabase.rpc('favorite_actor', { p_from: fromDate });
      const favoriteActor = fav && fav.length > 0 ? fav[0].name : null;

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
  actor_ids?: string[];
}

export function useAddWatchLog() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddWatchLogInput) => {
      if (!user) throw new Error('로그인이 필요합니다');
      const { actor_ids, ...logFields } = input;
      const { data: log, error } = await supabase
        .from('watch_logs')
        .insert({ user_id: user.id, ...logFields })
        .select('id')
        .single();
      if (error) throw error;

      // 선택한 배우들을 join 테이블에 연결 (최애 배우 집계용)
      if (log && actor_ids && actor_ids.length > 0) {
        const rows = actor_ids.map((actor_id) => ({ watch_log_id: log.id, actor_id }));
        const { error: linkErr } = await supabase.from('watch_log_actors').insert(rows);
        if (linkErr) throw linkErr;
      }
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
