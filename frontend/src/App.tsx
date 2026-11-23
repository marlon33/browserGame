import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/auth/AuthScreen';
import { AccountLobby } from './components/lobby/AccountLobby';

export function App() {
  const { isAuthenticated, isLoadingUser } = useAuth();
  const queryClient = useQueryClient();

  // Escuta evento global de token expirado (401) disparado pelo interceptor do Axios
  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.setQueryData(['auth', 'me'], null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [queryClient]);

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

  return isAuthenticated ? <AccountLobby /> : <AuthScreen />;
}

export default App;
