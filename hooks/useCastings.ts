import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Casting } from '@/types/database';

export function useCastings(performanceId: string) {
  return useQuery({
    queryKey: ['castings', performanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('castings')
        .select('*')
        .eq('performance_id', performanceId)
        .order('cast_date', { ascending: true })
        .order('time_slot', { ascending: true });
      if (error) throw error;
      return data as Casting[];
    },
    enabled: !!performanceId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCastingsByDate(performanceId: string, date: string) {
  return useQuery({
    queryKey: ['castings', performanceId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('castings')
        .select('*')
        .eq('performance_id', performanceId)
        .eq('cast_date', date)
        .order('time_slot', { ascending: true });
      if (error) throw error;
      return data as Casting[];
    },
    enabled: !!performanceId && !!date,
    staleTime: 1000 * 60 * 5,
  });
}

interface AddCastingInput {
  performance_id: string;
  cast_date: string;
  time_slot: '14:00' | '19:30' | 'other';
  roles: { role: string; actor: string }[];
  reported_by: string;
}

export function useAddCasting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddCastingInput) => {
      const { error } = await supabase.from('castings').insert(input);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['castings', variables.performance_id] });
    },
  });
}
