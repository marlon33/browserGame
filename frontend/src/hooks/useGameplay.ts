import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ActiveBattle,
  BattleHistoryEntry,
  Character,
  HuntResult,
  Monster,
  TacticalActionType,
} from '@/types/game';

export type StatKey = 'strength' | 'agility' | 'constitution' | 'spirit_power';

export function useGameplay(characterId: number) {
  const queryClient = useQueryClient();
  const charQueryKey = ['character', 'active', String(characterId)];
  const invQueryKey = ['inventory', String(characterId)];
  const historyQueryKey = ['gameplay', 'history', String(characterId)];
  const monstersQueryKey = ['gameplay', 'monsters', String(characterId)];
  const activeBattleQueryKey = ['gameplay', 'battle', 'active', String(characterId)];

  const monstersQuery = useQuery({
    queryKey: monstersQueryKey,
    queryFn: async () => {
      const { data } = await api.get<{ monsters: Monster[] }>('/gameplay/monsters');
      return data.monsters;
    },
    staleTime: 1000 * 60,
  });

  const historyQuery = useQuery({
    queryKey: historyQueryKey,
    queryFn: async () => {
      const { data } = await api.get<{ history: BattleHistoryEntry[] }>('/gameplay/history');
      return data.history;
    },
    staleTime: 1000 * 30,
  });

  const activeBattleQuery = useQuery({
    queryKey: activeBattleQueryKey,
    queryFn: async () => {
      const { data } = await api.get<{ battle: ActiveBattle | null }>('/gameplay/battle/active');
      return data.battle;
    },
    staleTime: 1000 * 10,
  });

  const meditateMutation = useMutation({
    mutationFn: async (stones: number = 1) => {
      const { data } = await api.post<{
        message: string;
        qi_gained: number;
        stones_spent: number;
        energy_spent: number;
        cooldown_seconds: number;
        efficiency_pct: number;
        rank_up_title: string | null;
        character: Character;
      }>('/gameplay/meditate', { stones });
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
    mutationFn: async (payload: { monsterId: number; times?: number }) => {
      const { data } = await api.post<HuntResult>('/gameplay/hunt', {
        monster_id: payload.monsterId,
        times: payload.times ?? 1,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(charQueryKey, data.character);
      queryClient.invalidateQueries({ queryKey: historyQueryKey });
      queryClient.invalidateQueries({ queryKey: monstersQueryKey });
      if (data.items_dropped && data.items_dropped.length > 0) {
        queryClient.invalidateQueries({ queryKey: invQueryKey });
      }
    },
  });

  const startBattleMutation = useMutation({
    mutationFn: async (monsterId: number) => {
      const { data } = await api.post<{ battle: ActiveBattle; character: Character }>(
        '/gameplay/battle/start',
        { monster_id: monsterId }
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(charQueryKey, data.character);
      queryClient.setQueryData(activeBattleQueryKey, data.battle);
    },
  });

  const tacticalActionMutation = useMutation({
    mutationFn: async (payload: { battleId: number; action: TacticalActionType }) => {
      const { data } = await api.post<{ battle: ActiveBattle; character: Character }>(
        '/gameplay/battle/action',
        { battle_id: payload.battleId, action: payload.action }
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(charQueryKey, data.character);
      if (data.battle.status === 'active') {
        queryClient.setQueryData(activeBattleQueryKey, data.battle);
      } else {
        queryClient.setQueryData(activeBattleQueryKey, null);
        queryClient.invalidateQueries({ queryKey: historyQueryKey });
        queryClient.invalidateQueries({ queryKey: monstersQueryKey });
        if (data.battle.rewards_summary?.items_dropped?.length) {
          queryClient.invalidateQueries({ queryKey: invQueryKey });
        }
      }
    },
  });

  const tacticalMonsterTurnMutation = useMutation({
    mutationFn: async (battleId: number) => {
      const { data } = await api.post<{ battle: ActiveBattle; character: Character }>(
        '/gameplay/battle/monster-turn',
        { battle_id: battleId }
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(charQueryKey, data.character);
      if (data.battle.status === 'active') {
        queryClient.setQueryData(activeBattleQueryKey, data.battle);
      } else {
        queryClient.setQueryData(activeBattleQueryKey, null);
        queryClient.invalidateQueries({ queryKey: historyQueryKey });
        queryClient.invalidateQueries({ queryKey: monstersQueryKey });
      }
    },
  });

  return {
    monsters: monstersQuery.data ?? [],
    isLoadingMonsters: monstersQuery.isLoading,
    battleHistory: historyQuery.data ?? [],
    activeBattle: activeBattleQuery.data ?? null,
    meditateMutation,
    allocateStatMutation,
    huntMutation,
    startBattleMutation,
    tacticalActionMutation,
    tacticalMonsterTurnMutation,
  };
}
