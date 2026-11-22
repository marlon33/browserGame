import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Injeta automaticamente Token, Servidor e Personagem ativo em todas as chamadas
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rpg_token');
  const serverId = localStorage.getItem('rpg_server_id');
  const characterId = localStorage.getItem('rpg_character_id');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (serverId) {
    config.headers['X-Server-Id'] = serverId;
  }
  if (characterId) {
    config.headers['X-Character-Id'] = characterId;
  }

  return config;
});

// Intercepta respostas 401 (Token inválido ou expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rpg_token');
      localStorage.removeItem('rpg_character_id');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);
