import axios from 'axios';

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    // Erros de validação do Laravel (422)
    if (data?.errors && typeof data.errors === 'object') {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey && Array.isArray(data.errors[firstKey])) {
        return data.errors[firstKey][0];
      }
    }

    if (typeof data?.message === 'string') {
      return data.message;
    }
  }

  return 'Não foi possível conectar ao servidor. Tente novamente.';
}
