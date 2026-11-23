import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { renderWithClient } from '@/test/test-utils';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza formulário de login por padrão e alterna para Criar Conta', () => {
    renderWithClient(<AuthScreen />);

    expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar no Reino/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Criar Conta/i }));

    expect(screen.getByLabelText(/Nome da Conta/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar Conta/i })).toBeInTheDocument();
  });

  it('exibe mensagem de erro da API quando o login falha', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          message: 'Credenciais inválidas. Verifique seu e-mail e senha.',
        },
      },
    });

    renderWithClient(<AuthScreen />);

    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'erro@reino.com' },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: 'senhaerrada' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Entrar no Reino/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Credenciais inválidas\. Verifique seu e-mail e senha\./i)
      ).toBeInTheDocument();
    });
  });

  it('alterna para recuperação de senha e envia solicitação', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { message: 'Instruções enviadas com sucesso!' },
    });

    renderWithClient(<AuthScreen />);

    fireEvent.click(screen.getByRole('button', { name: /Esqueceu a senha\?/i }));
    fireEvent.change(screen.getByLabelText(/E-mail cadastrado/i), {
      target: { value: 'cultivador@reino.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar Token de Recuperação/i }));

    await waitFor(() => {
      expect(screen.getByText(/Instruções enviadas com sucesso!/i)).toBeInTheDocument();
    });
  });
});
