import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Character, CharacterQuestEntry } from '@/types/game';

export function useQuests(characterId: number) {
  const queryClient = useQueryClient();
  const questsQueryKey = ['quests', String(characterId)];
  const charQueryKey = ['character', 'active', String(characterId)];
  const invQueryKey = ['inventory', String(characterId)];

  const questsQuery = useQuery({
    queryKey: questsQueryKey,
    queryFn: async () => {
      const { data } = await api.get<{ quests: CharacterQuestEntry[] }>('/quests');
      return data.quests;
    },
    staleTime: 1000 * 20,
  });

  const visitRegionMutation = useMutation({
    mutationFn: async (regionSlug: string) => {
      const { data } = await api.post<{ quests: CharacterQuestEntry[] }>('/quests/visit-region', {
        region_slug: regionSlug,
      });
      return data.quests;
    },
    onSuccess: (quests) => {
      queryClient.setQueryData(questsQueryKey, quests);
    },
  });

  const claimRewardMutation = useMutation({
    mutationFn: async (characterQuestId: number) => {
      const { data } = await api.post<{
        message: string;
        character: Character;
        quests: CharacterQuestEntry[];
      }>(`/quests/${characterQuestId}/claim`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(charQueryKey, data.character);
      queryClient.setQueryData(questsQueryKey, data.quests);
      queryClient.invalidateQueries({ queryKey: invQueryKey });
    },
  });

  const quests = questsQuery.data ?? [];
  const claimableCount = quests.filter((q) => q.status === 'completed').length;

  return {
    quests,
    claimableCount,
    isLoadingQuests: questsQuery.isLoading,
    visitRegionMutation,
    claimRewardMutation,
  };
}
