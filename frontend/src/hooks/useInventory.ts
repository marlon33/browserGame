import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Character, CharacterItem, Item } from '@/types/game';

export function useInventory(characterId: number) {
  const queryClient = useQueryClient();
  const charQueryKey = ['character', 'active', String(characterId)];
  const invQueryKey = ['inventory', String(characterId)];

  const inventoryQuery = useQuery({
    queryKey: invQueryKey,
    queryFn: async () => {
      const { data } = await api.get<{
        shop_items: Item[];
        inventory: CharacterItem[];
        character: Character;
      }>('/inventory');
      return data;
    },
    staleTime: 1000 * 30,
  });

  const syncAfterAction = (character: Character) => {
    queryClient.setQueryData(charQueryKey, character);
    queryClient.invalidateQueries({ queryKey: invQueryKey });
  };

  const buyMutation = useMutation({
    mutationFn: async (payload: { item_id: number; quantity?: number }) => {
      const { data } = await api.post<{ message: string; character: Character }>(
        '/inventory/buy',
        payload
      );
      return data;
    },
    onSuccess: (data) => syncAfterAction(data.character),
  });

  const equipMutation = useMutation({
    mutationFn: async (characterItemId: number) => {
      const { data } = await api.post<{ message: string; character: Character }>(
        `/inventory/${characterItemId}/equip`
      );
      return data;
    },
    onSuccess: (data) => syncAfterAction(data.character),
  });

  const useItemMutation = useMutation({
    mutationFn: async (characterItemId: number) => {
      const { data } = await api.post<{ message: string; character: Character }>(
        `/inventory/${characterItemId}/use`
      );
      return data;
    },
    onSuccess: (data) => syncAfterAction(data.character),
  });

  const sellMutation = useMutation({
    mutationFn: async (characterItemId: number) => {
      const { data } = await api.post<{ message: string; character: Character }>(
        `/inventory/${characterItemId}/sell`
      );
      return data;
    },
    onSuccess: (data) => syncAfterAction(data.character),
  });

  return {
    shopItems: inventoryQuery.data?.shop_items ?? [],
    inventory: inventoryQuery.data?.inventory ?? [],
    isLoadingInventory: inventoryQuery.isLoading,
    buyMutation,
    equipMutation,
    useItemMutation,
    sellMutation,
  };
}
