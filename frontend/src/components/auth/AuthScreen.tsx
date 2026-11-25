import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

export function AuthScreen() {
  const [view, setView] = useState<AuthView>('login');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Campos compartilhados
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [resetToken, setResetToken] = useState('');

  const {
    loginMutation,
    registerMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
  } = useAuth();

  const switchView = (next: AuthView) => {
    setFeedback(null);
    loginMutation.reset();
    registerMutation.reset();
    forgotPasswordMutation.reset();
    resetPasswordMutation.reset();
    setView(next);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    loginMutation.mutate({ email, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    registerMutation.mutate({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    forgotPasswordMutation.mutate(email, {
      onSuccess: (data) => {
        setFeedback(
          data.message ||
            'Instruções enviadas! Verifique seu e-mail (ou storage/logs/laravel.log em dev).'
        );
      },
    });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    resetPasswordMutation.mutate(
      {
        token: resetToken,
        email,
        password,
        password_confirmation: passwordConfirmation,
      },
      {
        onSuccess: (data) => {
          setPassword('');
          setPasswordConfirmation('');
          setResetToken('');
          switchView('login');
          setFeedback(data.message || 'Senha redefinida com sucesso!');
        },
      }
    );
  };

  const activeError =
    loginMutation.error ||
    registerMutation.error ||
    forgotPasswordMutation.error ||
    resetPasswordMutation.error;

  return (
    <div className="auth-shell">
      {/* Painel Hero: Compacto no Mobile, Coluna Institucional no Desktop */}
      <aside className="auth-hero">
        <span className="auth-badge">Crônicas do Cultivo • Server-Authoritative</span>
        <h1 className="auth-title">Ascensão dos Dois Reinos</h1>
        <p className="auth-subtitle">
          Forje sua linhagem espiritual, domine técnicas ancestrais e dispute o controle dos reinos em tempo real.
        </p>

        <div className="auth-features">
          <div className="feature-item">
            <strong>Reinos em Conflito</strong>
            <span>Escolha sua facção e participe de guerras territoriais entre servidores.</span>
          </div>
          <div className="feature-item">
            <strong>Cultivo & Progressão Real</strong>
            <span>Evolua do Reino Bronze até o Reino Lendário com cálculo 100% validado no servidor.</span>
          </div>
          <div className="feature-item">
            <strong>Multiplataforma Sincronizada</strong>
            <span>Jogue no navegador do PC, tablet ou celular com a mesma conta.</span>
          </div>
        </div>
      </aside>

      {/* Painel de Formulário */}
      <main className="auth-main">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.6rem' }}>
            <LanguageSwitcher />
          </div>
          {(view === 'login' || view === 'register') && (
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'login'}
                className={`auth-tab ${view === 'login' ? 'active' : ''}`}
                onClick={() => switchView('login')}
              >
                Entrar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'register'}
                className={`auth-tab ${view === 'register' ? 'active' : ''}`}
                onClick={() => switchView('register')}
              >
                Criar Conta
              </button>
            </div>
          )}

          {feedback && (
            <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
              {feedback}
            </div>
          )}

          {activeError && (
            <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
              {getErrorMessage(activeError)}
            </div>
          )}

          {/* FORMULÁRIO DE LOGIN */}
          {view === 'login' && (
            <form className="form-stack" onSubmit={handleLogin}>
              <div className="field-group">
                <label className="field-label" htmlFor="login-email">
                  E-mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="field-input"
                  placeholder="cultivador@reino.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field-group">
                <div className="field-header">
                  <label className="field-label" htmlFor="login-password">
                    Senha
                  </label>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => switchView('forgot')}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  className="field-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Invocando sessão...' : 'Entrar no Reino'}
              </button>
            </form>
          )}

          {/* FORMULÁRIO DE REGISTRO */}
          {view === 'register' && (
            <form className="form-stack" onSubmit={handleRegister}>
              <div className="field-group">
                <label className="field-label" htmlFor="reg-name">
                  Nome da Conta (Apelido)
                </label>
                <input
                  id="reg-name"
                  type="text"
                  className="field-input"
                  placeholder="Ex: NieLi_99"
                  minLength={3}
                  maxLength={30}
                  autoComplete="username"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="reg-email">
                  E-mail
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className="field-input"
                  placeholder="cultivador@reino.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="reg-password">
                  Senha (mínimo 8 caracteres)
                </label>
                <input
                  id="reg-password"
                  type="password"
                  className="field-input"
                  placeholder="••••••••"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="reg-password-confirm">
                  Confirmar Senha
                </label>
                <input
                  id="reg-password-confirm"
                  type="password"
                  className="field-input"
                  placeholder="••••••••"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Forjando conta...' : 'Criar Conta'}
              </button>
            </form>
          )}

          {/* FORMULÁRIO DE ESQUECI A SENHA */}
          {view === 'forgot' && (
            <form className="form-stack" onSubmit={handleForgot}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Recuperar Acesso</h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Informe o e-mail da sua conta para gerar o token de redefinição de senha.
              </p>

              <div className="field-group">
                <label className="field-label" htmlFor="forgot-email">
                  E-mail cadastrado
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  className="field-input"
                  placeholder="cultivador@reino.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? 'Enviando...' : 'Enviar Token de Recuperação'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" onClick={() => switchView('login')}>
                  ← Voltar ao login
                </button>
                <button type="button" className="btn-ghost" onClick={() => switchView('reset')}>
                  Já tenho o token →
                </button>
              </div>
            </form>
          )}

          {/* FORMULÁRIO DE REDEFINIR SENHA COM TOKEN */}
          {view === 'reset' && (
            <form className="form-stack" onSubmit={handleReset}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Redefinir Senha</h2>

              <div className="field-group">
                <label className="field-label" htmlFor="reset-token">
                  Token de Recuperação
                </label>
                <input
                  id="reset-token"
                  type="text"
                  className="field-input"
                  placeholder="Cole o token recebido"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="reset-email">
                  E-mail
                </label>
                <input
                  id="reset-email"
                  type="email"
                  className="field-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="reset-password">
                  Nova Senha
                </label>
                <input
                  id="reset-password"
                  type="password"
                  className="field-input"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="reset-password-confirm">
                  Confirmar Nova Senha
                </label>
                <input
                  id="reset-password-confirm"
                  type="password"
                  className="field-input"
                  minLength={8}
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>

              <button type="button" className="btn-ghost" onClick={() => switchView('login')}>
                ← Voltar ao login
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
