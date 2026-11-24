import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Character, HuntResult, Monster } from '@/types/game';

export type StatKey = 'strength' | 'agility' | 'constitution' | 'spirit_power';

export function useGameplay(characterId: number) {
  const queryClient = useQueryClient();
  const charQueryKey = ['character', 'active', String(characterId)];
  const invQueryKey = ['inventory', String(characterId)];

  const monstersQuery = useQuery({
    queryKey: ['gameplay', 'monsters'],
    queryFn: async () => {
      const { data } = await api.get<{ monsters: Monster[] }>('/gameplay/monsters');
      return data.monsters;
    },
    staleTime: 1000 * 60 * 5,
  });

  const meditateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{
        message: string;
        xp_gained: number;
        spirit_stones_gained: number;
        levels_gained: number;
        rank_up_title: string | null;
        character: Character;
      }>('/gameplay/meditate');
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(charQueryKey, data.character);
    },
  });

  const allocateStatMutation = useMutation({
    mutationFn: async (payload: { stat: StatKey; amount?: number }) => {
      const { data } = await api.post<{ message: string; character: Character }>(
        '/gameplay/allocate-stat',
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(charQueryKey, data.character);
    },
  });

  const huntMutation = useMutation({
    mutationFn: async (monsterId: number) => {
      const { data } = await api.post<HuntResult>('/gameplay/hunt', {
        monster_id: monsterId,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(charQueryKey, data.character);
      if (data.items_dropped && data.items_dropped.length > 0) {
        queryClient.invalidateQueries({ queryKey: invQueryKey });
      }
    },
  });

  return {
    monsters: monstersQuery.data ?? [],
    isLoadingMonsters: monstersQuery.isLoading,
    meditateMutation,
    allocateStatMutation,
    huntMutation,
  };
}
