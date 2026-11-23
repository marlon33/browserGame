import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Character, WorldBootstrapResponse } from '@/types/game';

export function useWorld() {
  const queryClient = useQueryClient();

  const bootstrapQuery = useQuery({
    queryKey: ['world', 'bootstrap'],
    queryFn: async () => {
      const { data } = await api.get<WorldBootstrapResponse>('/world/bootstrap');
      return data;
    },
    staleTime: 1000 * 30,
  });

  const createCharacterMutation = useMutation({
    mutationFn: async (payload: {
      game_server_id: number;
      realm_id: number;
      name: string;
    }) => {
      const { data } = await api.post<{ message: string; character: Character }>(
        '/characters',
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['world', 'bootstrap'] });
      localStorage.setItem('rpg_server_id', String(data.character.game_server_id));
      localStorage.setItem('rpg_character_id', String(data.character.id));
      queryClient.setQueryData(['character', 'active', String(data.character.id)], data.character);
    },
  });

  return {
    servers: bootstrapQuery.data?.servers ?? [],
    realms: bootstrapQuery.data?.realms ?? [],
    characters: bootstrapQuery.data?.characters ?? [],
    initialRank: bootstrapQuery.data?.initial_rank ?? null,
    isLoadingWorld: bootstrapQuery.isLoading,
    createCharacterMutation,
  };
}

export function useActiveCharacter(characterId: string | null) {
  return useQuery({
    queryKey: ['character', 'active', characterId],
    queryFn: async () => {
      const { data } = await api.get<{ character: Character }>('/characters/active');
      return data.character;
    },
    enabled: Boolean(characterId),
    refetchInterval: 1000 * 60,
  });
}
