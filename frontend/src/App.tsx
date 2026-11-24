import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCharacter, useWorld } from '@/hooks/useWorld';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { AccountLobby } from '@/components/lobby/AccountLobby';
import { CharacterHud } from '@/components/game/CharacterHud';
import type { Character } from '@/types/game';

export function App() {
  const { isAuthenticated, isLoadingUser, logoutMutation } = useAuth();
  const queryClient = useQueryClient();

  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(() =>
    localStorage.getItem('rpg_character_id')
  );
  const [isSwitchingServer, setIsSwitchingServer] = useState(false);

  // Busca os personagens da conta assim que estiver autenticado
  const { characters, isLoadingWorld } = useWorld();

  const activeCharQuery = useActiveCharacter(
    isAuthenticated && !isSwitchingServer ? activeCharacterId : null
  );

  useEffect(() => {
    const handleUnauthorized = () => {
      setActiveCharacterId(null);
      setIsSwitchingServer(false);
      queryClient.setQueryData(['auth', 'me'], null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [queryClient]);

  // Auto-seleciona o último personagem ativo da conta se não houver um ID salvo no localStorage
  useEffect(() => {
    if (!isAuthenticated || isSwitchingServer || isLoadingWorld) return;

    if (!activeCharacterId && characters.length > 0) {
      const lastActiveChar = characters[0]; // Já vem ordenado por last_active_at DESC do backend
      localStorage.setItem('rpg_server_id', String(lastActiveChar.game_server_id));
      localStorage.setItem('rpg_character_id', String(lastActiveChar.id));
      setActiveCharacterId(String(lastActiveChar.id));
      queryClient.setQueryData(['character', 'active', String(lastActiveChar.id)], lastActiveChar);
    }
  }, [isAuthenticated, isSwitchingServer, isLoadingWorld, activeCharacterId, characters, queryClient]);

  // Se o ID salvo no localStorage não existir mais (ex: reset de banco), limpa e deixa o auto-select agir
  useEffect(() => {
    if (activeCharQuery.isError) {
      localStorage.removeItem('rpg_character_id');
      setActiveCharacterId(null);
    }
  }, [activeCharQuery.isError]);

  const handleEnterWorld = (character: Character) => {
    localStorage.setItem('rpg_server_id', String(character.game_server_id));
    localStorage.setItem('rpg_character_id', String(character.id));
    setIsSwitchingServer(false);
    setActiveCharacterId(String(character.id));
    queryClient.setQueryData(['character', 'active', String(character.id)], character);
  };

  const handleSwitchCharacter = () => {
    setIsSwitchingServer(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('rpg_character_id');
    localStorage.removeItem('rpg_server_id');
    setActiveCharacterId(null);
    setIsSwitchingServer(false);
    logoutMutation.mutate();
  };

  if (isLoadingUser || (isAuthenticated && !activeCharacterId && isLoadingWorld)) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d4af37',
          fontWeight: 600,
        }}
      >
        Sincronizando selo espiritual...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (!isSwitchingServer && activeCharacterId && activeCharQuery.data) {
    return (
      <CharacterHud
        character={activeCharQuery.data}
        onSwitchCharacter={handleSwitchCharacter}
        onLogout={handleLogout}
      />
    );
  }

  return <AccountLobby onEnterWorld={handleEnterWorld} />;
}

export default App;