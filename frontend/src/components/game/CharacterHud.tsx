import type { Character } from '@/types/game';

interface CharacterHudProps {
  character: Character;
  onSwitchCharacter: () => void;
  onLogout: () => void;
}

export function CharacterHud({
  character,
  onSwitchCharacter,
  onLogout,
}: CharacterHudProps) {
  const hpPercent = Math.min(100, Math.round((character.hp / Math.max(1, character.max_hp)) * 100));
  const energyPercent = Math.min(
    100,
    Math.round((character.energy / Math.max(1, character.max_energy)) * 100)
  );

  const realmColor = character.realm?.primary_color || '#d4af37';
  const rankColor = character.cultivation_rank?.badge_color || '#cd7f32';

  return (
    <div className="lobby-shell">
      <header className="topbar" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="topbar-brand">{character.name}</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.18rem 0.55rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.06)',
              color: rankColor,
              border: `1px solid ${rankColor}55`,
            }}
          >
            {character.cultivation_rank?.title ?? 'Bronze 1 Estrela'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-ghost"
            style={{
              padding: '0 0.75rem',
              minHeight: '38px',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
            }}
            onClick={onSwitchCharacter}
          >
            Trocar Servidor
          </button>
          <button type="button" className="btn-outline-danger" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="lobby-content">
        <section className="auth-card" style={{ maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: realmColor,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {character.realm?.name} • {character.server?.code}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Nível <strong>{character.level}</strong>
            </span>
          </div>

          <div style={{ marginBottom: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
              <span>Vitalidade (HP)</span>
              <strong>
                {character.hp} / {character.max_hp}
              </strong>
            </div>
            <div style={{ height: '10px', background: 'var(--bg-void)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${hpPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
              <span>Energia Espiritual (+1 / 3min)</span>
              <strong>
                {character.energy} / {character.max_energy}
              </strong>
            </div>
            <div style={{ height: '10px', background: 'var(--bg-void)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${energyPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div style={{ background: 'var(--bg-void)', padding: '0.7rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Pedras Espirituais</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gold-primary)' }}>
                {character.spirit_stones.toLocaleString('pt-BR')}
              </div>
            </div>
            <div style={{ background: 'var(--bg-void)', padding: '0.7rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Jades Celestiais</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--jade-accent)' }}>
                {character.jade_tokens.toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card" style={{ maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Atributos de Combate</h3>
            {character.stat_points > 0 && (
              <span className="auth-badge" style={{ marginBottom: 0 }}>
                +{character.stat_points} pts disponíveis
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ background: 'var(--bg-void)', padding: '0.75rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Força</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{character.strength}</div>
            </div>
            <div style={{ background: 'var(--bg-void)', padding: '0.75rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Agilidade</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{character.agility}</div>
            </div>
            <div style={{ background: 'var(--bg-void)', padding: '0.75rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Constituição</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{character.constitution}</div>
            </div>
            <div style={{ background: 'var(--bg-void)', padding: '0.75rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Poder Espiritual</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{character.spirit_power}</div>
            </div>
          </div>

          <div
            style={{
              padding: '0.9rem',
              borderRadius: '10px',
              background: 'var(--bg-void)',
              border: '1px dashed var(--border-subtle)',
              fontSize: '0.84rem',
              color: 'var(--text-muted)',
            }}
          >
            <strong style={{ color: 'var(--gold-primary)', display: 'block', marginBottom: '0.25rem' }}>
              Pronto para a Etapa 3: Treino & Combate PvE
            </strong>
            A ficha acima já está sincronizada com o banco via <code>X-Character-Id</code> e regeneração lazy de energia.
          </div>
        </section>
      </main>
    </div>
  );
}
