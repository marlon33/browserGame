import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorld } from '@/hooks/useWorld';
import type { Character } from '@/types/game';
import { getErrorMessage } from '@/utils/getErrorMessage';

interface AccountLobbyProps {
  onEnterWorld: (character: Character) => void;
}

export function AccountLobby({ onEnterWorld }: AccountLobbyProps) {
  const { user, logoutMutation } = useAuth();
  const {
    servers,
    realms,
    characters,
    isLoadingWorld,
    createCharacterMutation,
  } = useWorld();

  const [selectedServerId, setSelectedServerId] = useState<number | null>(null);
  const [selectedRealmId, setSelectedRealmId] = useState<number | null>(null);
  const [charName, setCharName] = useState('');

  useEffect(() => {
    if (servers.length > 0 && selectedServerId === null) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers, selectedServerId]);

  useEffect(() => {
    if (realms.length > 0 && selectedRealmId === null) {
      setSelectedRealmId(realms[0].id);
    }
  }, [realms, selectedRealmId]);

  const existingCharacterOnServer = characters.find(
    (c) => c.game_server_id === selectedServerId
  );

  const handleCreateCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServerId || !selectedRealmId) return;

    createCharacterMutation.mutate(
      {
        game_server_id: selectedServerId,
        realm_id: selectedRealmId,
        name: charName.trim(),
      },
      {
        onSuccess: (data) => {
          onEnterWorld(data.character);
        },
      }
    );
  };

  return (
    <div className="lobby-shell">
      <header className="topbar">
        <span className="topbar-brand">⚔️ Ascensão dos Dois Reinos</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            {user?.name}
          </span>
          <button
            type="button"
            className="btn-outline-danger"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            {logoutMutation.isPending ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </header>

      <main className="lobby-content">
        <section className="auth-card" style={{ maxWidth: '100%' }}>
          <span className="auth-badge">Passo 1 • Escolha o Mundo</span>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Servidores Disponíveis</h2>

          {isLoadingWorld ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Consultando reinos celestiais...
            </p>
          ) : (
            <div className="form-stack">
              {servers.map((server) => {
                const isSelected = server.id === selectedServerId;
                const charInThisServer = characters.find((c) => c.game_server_id === server.id);

                return (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => {
                      createCharacterMutation.reset();
                      setSelectedServerId(server.id);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-void)',
                      border: isSelected
                        ? '1px solid var(--gold-primary)'
                        : '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: isSelected ? 'var(--gold-primary)' : '#fff' }}>
                        [{server.code}] {server.name}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: server.status === 'online' ? 'var(--jade-accent)' : '#f59e0b',
                        }}
                      >
                        ● {server.status}
                      </span>
                    </div>

                    {server.description && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        {server.description}
                      </p>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '0.6rem',
                        fontSize: '0.76rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>XP {server.xp_multiplier}x • Drop {server.drop_multiplier}x</span>
                      {charInThisServer ? (
                        <span style={{ color: 'var(--gold-primary)', fontWeight: 600 }}>
                          Personagem: {charInThisServer.name} (Nv. {charInThisServer.level})
                        </span>
                      ) : (
                        <span>Sem personagem</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="auth-card" style={{ maxWidth: '100%' }}>
          {existingCharacterOnServer ? (
            <div>
              <span className="auth-badge">Cultivador Encontrado</span>
              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>
                {existingCharacterOnServer.name}
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                {existingCharacterOnServer.realm?.name} •{' '}
                {existingCharacterOnServer.cultivation_rank?.title} • Nível{' '}
                {existingCharacterOnServer.level}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ background: 'var(--bg-void)', padding: '0.75rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Energia</div>
                  <strong>
                    {existingCharacterOnServer.energy} / {existingCharacterOnServer.max_energy}
                  </strong>
                </div>
                <div style={{ background: 'var(--bg-void)', padding: '0.75rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pedras Espirituais</div>
                  <strong style={{ color: 'var(--gold-primary)' }}>
                    {existingCharacterOnServer.spirit_stones}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => onEnterWorld(existingCharacterOnServer)}
              >
                Entrar no Mundo →
              </button>
            </div>
          ) : (
            <form className="form-stack" onSubmit={handleCreateCharacter}>
              <span className="auth-badge">Passo 2 • Linhagem & Facção</span>
              <h2 style={{ fontSize: '1.25rem' }}>Forjar Novo Cultivador</h2>

              {createCharacterMutation.error && (
                <div className="alert-box alert-error">
                  {getErrorMessage(createCharacterMutation.error)}
                </div>
              )}

              <div className="field-group">
                <label className="field-label">Escolha seu Reino</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
                  {realms.map((realm) => {
                    const active = realm.id === selectedRealmId;
                    return (
                      <button
                        key={realm.id}
                        type="button"
                        onClick={() => setSelectedRealmId(realm.id)}
                        style={{
                          textAlign: 'left',
                          padding: '0.85rem',
                          borderRadius: '10px',
                          background: active ? 'var(--bg-elevated)' : 'var(--bg-void)',
                          border: active
                            ? `1px solid ${realm.primary_color}`
                            : '1px solid rgba(255,255,255,0.08)',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: realm.primary_color }}>
                          {realm.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#d1d5db', marginTop: '0.15rem' }}>
                          {realm.tagline}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                          {realm.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="char-name">
                  Nome do Personagem (3 a 20 caracteres)
                </label>
                <input
                  id="char-name"
                  type="text"
                  className="field-input"
                  placeholder="Ex: XiaoYan"
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_]+"
                  title="Apenas letras, números e underline (_)"
                  required
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={createCharacterMutation.isPending || !selectedServerId || !selectedRealmId}
              >
                {createCharacterMutation.isPending
                  ? 'Despertando espírito...'
                  : 'Criar Personagem e Entrar'}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
