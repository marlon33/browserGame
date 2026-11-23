import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCharacter } from '@/hooks/useWorld';
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

  const activeCharQuery = useActiveCharacter(
    isAuthenticated ? activeCharacterId : null
  );

  useEffect(() => {
    const handleUnauthorized = () => {
      setActiveCharacterId(null);
      queryClient.setQueryData(['auth', 'me'], null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [queryClient]);

  const handleEnterWorld = (character: Character) => {
    localStorage.setItem('rpg_server_id', String(character.game_server_id));
    localStorage.setItem('rpg_character_id', String(character.id));
    setActiveCharacterId(String(character.id));
    queryClient.setQueryData(['character', 'active', String(character.id)], character);
  };

  const handleSwitchCharacter = () => {
    localStorage.removeItem('rpg_character_id');
    setActiveCharacterId(null);
  };

  const handleLogout = () => {
    setActiveCharacterId(null);
    logoutMutation.mutate();
  };

  if (isLoadingUser) {
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

  if (activeCharacterId && activeCharQuery.data) {
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
