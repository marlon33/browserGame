import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/getErrorMessage';

export function AccountLobby() {
  const { user, logoutMutation, updatePasswordMutation } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccess(null);

    updatePasswordMutation.mutate(
      {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      },
      {
        onSuccess: (data) => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPassSuccess(data.message || 'Senha atualizada com sucesso!');
        },
      }
    );
  };

  return (
    <div className="lobby-shell">
      <header className="topbar">
        <span className="topbar-brand">⚔️ Ascensão dos Dois Reinos</span>
        <button
          type="button"
          className="btn-outline-danger"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          {logoutMutation.isPending ? 'Saindo...' : 'Sair'}
        </button>
      </header>

      <main className="lobby-content">
        {/* Card 1: Dados da Conta & Próxima Etapa (Seleção de Servidor/Personagem) */}
        <section className="auth-card" style={{ maxWidth: '100%' }}>
          <span className="auth-badge">Sessão Autenticada</span>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>
            Bem-vindo, {user?.name}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {user?.email} • ID da Conta #{user?.id}
          </p>

          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'var(--bg-void)',
              border: '1px dashed var(--border-subtle)',
            }}
          >
            <strong style={{ color: 'var(--gold-primary)', fontSize: '0.9rem' }}>
              Pronto para a Etapa 2: Seleção de Servidor & Personagem
            </strong>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Seu Bearer Token está ativo no armazenamento local e validado via <code>/api/auth/me</code>.
              No próximo passo, esta área exibirá a escolha de Servidor, Reino (A/B) e seus Personagens.
            </p>
          </div>
        </section>

        {/* Card 2: Segurança da Conta (Troca de Senha) */}
        <section className="auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Segurança da Conta</h3>

          {passSuccess && (
            <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
              {passSuccess}
            </div>
          )}

          {updatePasswordMutation.error && (
            <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
              {getErrorMessage(updatePasswordMutation.error)}
            </div>
          )}

          <form className="form-stack" onSubmit={handleUpdatePassword}>
            <div className="field-group">
              <label className="field-label" htmlFor="curr-pass">
                Senha Atual
              </label>
              <input
                id="curr-pass"
                type="password"
                className="field-input"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="new-pass">
                Nova Senha (mín. 8 caracteres)
              </label>
              <input
                id="new-pass"
                type="password"
                className="field-input"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="conf-pass">
                Confirmar Nova Senha
              </label>
              <input
                id="conf-pass"
                type="password"
                className="field-input"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={updatePasswordMutation.isPending}
            >
              {updatePasswordMutation.isPending ? 'Atualizando...' : 'Alterar Senha'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
