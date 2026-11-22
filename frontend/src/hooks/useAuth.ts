import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface User {
  id: number;
  name: string;
  email: string;
  created_at?: string;
}

interface AuthResponse {
  message: string;
  token: string;
  token_type: string;
  user: User;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const hasToken = Boolean(localStorage.getItem('rpg_token'));

  // Valida o token ativo ao carregar o app (/api/auth/me)
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ user: User }>('/auth/me');
      return data.user;
    },
    enabled: hasToken,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await api.post<AuthResponse>('/auth/login', payload);
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('rpg_token', data.token);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      password: string;
      password_confirmation: string;
    }) => {
      const { data } = await api.post<AuthResponse>('/auth/register', payload);
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('rpg_token', data.token);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => {
      localStorage.removeItem('rpg_token');
      localStorage.removeItem('rpg_server_id');
      localStorage.removeItem('rpg_character_id');
      queryClient.clear();
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (payload: {
      current_password: string;
      password: string;
      password_confirmation: string;
    }) => {
      const { data } = await api.put('/auth/password', payload);
      return data;
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post('/auth/forgot-password', { email });
      return data;
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: {
      token: string;
      email: string;
      password: string;
      password_confirmation: string;
    }) => {
      const { data } = await api.post('/auth/reset-password', payload);
      return data;
    },
  });

  return {
    user: meQuery.data ?? null,
    isAuthenticated: Boolean(meQuery.data),
    isLoadingUser: hasToken && meQuery.isLoading,
    loginMutation,
    registerMutation,
    logoutMutation,
    updatePasswordMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
  };
}
