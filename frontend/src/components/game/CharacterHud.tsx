import { useState } from 'react';
import { useGameplay, type StatKey } from '@/hooks/useGameplay';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { Character, HuntResult } from '@/types/game';

interface CharacterHudProps {
  character: Character;
  onSwitchCharacter: () => void;
  onLogout: () => void;
}

type GameTab = 'cultivate' | 'hunt';

export function CharacterHud({
  character,
  onSwitchCharacter,
  onLogout,
}: CharacterHudProps) {
  const [activeTab, setActiveTab] = useState<GameTab>('cultivate');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastBattle, setLastBattle] = useState<HuntResult | null>(null);

  const {
    monsters,
    isLoadingMonsters,
    meditateMutation,
    allocateStatMutation,
    huntMutation,
  } = useGameplay(character.id);

  const hpPercent = Math.min(100, Math.round((character.hp / Math.max(1, character.max_hp)) * 100));
  const energyPercent = Math.min(
    100,
    Math.round((character.energy / Math.max(1, character.max_energy)) * 100)
  );
  const xpRequired = Math.round(100 * Math.pow(character.level, 1.45));
  const xpPercent = Math.min(100, Math.round((character.experience / Math.max(1, xpRequired)) * 100));

  const realmColor = character.realm?.primary_color || '#d4af37';
  const rankColor = character.cultivation_rank?.badge_color || '#cd7f32';

  const handleMeditate = () => {
    setToastMessage(null);
    meditateMutation.mutate(undefined, {
      onSuccess: (data) => {
        let msg = data.message;
        if (data.levels_gained > 0) {
          msg += ` 🎉 Subiu para o Nível ${data.character.level}!`;
        }
        if (data.rank_up_title) {
          msg += ` ⚡ Nova Patente: ${data.rank_up_title}!`;
        }
        setToastMessage(msg);
      },
    });
  };

  const handleAllocateStat = (stat: StatKey) => {
    setToastMessage(null);
    allocateStatMutation.mutate({ stat, amount: 1 });
  };

  const handleHunt = (monsterId: number) => {
    setToastMessage(null);
    huntMutation.mutate(monsterId, {
      onSuccess: (result) => {
        setLastBattle(result);
        if (result.rank_up_title) {
          setToastMessage(`⚡ Ascensão Espiritual! Você alcançou ${result.rank_up_title}!`);
        } else if (result.levels_gained > 0) {
          setToastMessage(`🎉 Vitória! Você avançou para o Nível ${result.character.level}!`);
        }
      },
    });
  };

  const activeError =
    meditateMutation.error || allocateStatMutation.error || huntMutation.error;

  const statList: { key: StatKey; label: string; value: number; desc: string }[] = [
    { key: 'strength', label: 'Força', value: character.strength, desc: 'Dano físico' },
    { key: 'agility', label: 'Agilidade', value: character.agility, desc: 'Crítico & iniciativa' },
    { key: 'constitution', label: 'Constituição', value: character.constitution, desc: '+12 HP Máx & defesa' },
    { key: 'spirit_power', label: 'Poder Espiritual', value: character.spirit_power, desc: 'Dano espiritual' },
  ];

  return (
    <div className="lobby-shell">
      {/* Topbar Compacta Mobile-First */}
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
            Servidores
          </button>
          <button type="button" className="btn-outline-danger" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="lobby-content">
        {/* COLUNA 1: FICHA VITAL & ATRIBUTOS */}
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
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Nível <strong>{character.level}</strong>
            </span>
          </div>

          {/* Barra de HP */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
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

          {/* Barra de Energia */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
              <span>Energia (+1 / 3min)</span>
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

          {/* Barra de Experiência */}
          <div style={{ marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
              <span>Experiência (XP)</span>
              <strong>
                {character.experience.toLocaleString('pt-BR')} / {xpRequired.toLocaleString('pt-BR')}
              </strong>
            </div>
            <div style={{ height: '8px', background: 'var(--bg-void)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${xpPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ca8a04, #eab308)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Moedas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.65rem',
              marginBottom: '1.1rem',
            }}
          >
            <div style={{ background: 'var(--bg-void)', padding: '0.65rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pedras Espirituais</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold-primary)' }}>
                {character.spirit_stones.toLocaleString('pt-BR')}
              </div>
            </div>
            <div style={{ background: 'var(--bg-void)', padding: '0.65rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Jades Celestiais</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--jade-accent)' }}>
                {character.jade_tokens.toLocaleString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Atributos & Distribuição de Pontos */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Atributos</h3>
            {character.stat_points > 0 && (
              <span className="auth-badge" style={{ marginBottom: 0 }}>
                +{character.stat_points} pts livres
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            {statList.map((item) => (
              <div
                key={item.key}
                style={{
                  background: 'var(--bg-void)',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{item.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{item.value}</div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>{item.desc}</div>
                </div>

                {character.stat_points > 0 && (
                  <button
                    type="button"
                    aria-label={`Aumentar ${item.label}`}
                    disabled={allocateStatMutation.isPending}
                    onClick={() => handleAllocateStat(item.key)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid var(--gold-primary)',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: 'var(--gold-primary)',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* COLUNA 2: AÇÕES DO MUNDO (MEDITAÇÃO & CAÇA PVE) */}
        <section className="auth-card" style={{ maxWidth: '100%' }}>
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'cultivate'}
              className={`auth-tab ${activeTab === 'cultivate' ? 'active' : ''}`}
              onClick={() => setActiveTab('cultivate')}
            >
              🧘 Meditar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'hunt'}
              className={`auth-tab ${activeTab === 'hunt' ? 'active' : ''}`}
              onClick={() => setActiveTab('hunt')}
            >
              ⚔️ Caçar Bestas
            </button>
          </div>

          {toastMessage && (
            <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
              {toastMessage}
            </div>
          )}

          {activeError && (
            <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
              {getErrorMessage(activeError)}
            </div>
          )}

          {/* ABA 1: MEDITAÇÃO ESPIRITUAL */}
          {activeTab === 'cultivate' && (
            <div className="form-stack">
              <h3 style={{ fontSize: '1.15rem' }}>Câmara de Cultivo Espiritual</h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Absorva a energia do céu e da terra para refinar sua alma, ganhar experiência segura e recuperar <strong>35% do HP</strong>.
              </p>

              <div
                style={{
                  background: 'var(--bg-void)',
                  padding: '0.9rem',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Custo de Energia:</span>
                <strong style={{ color: '#38bdf8' }}>10 Energia</strong>
              </div>

              <button
                type="button"
                className="btn-primary"
                disabled={meditateMutation.isPending || character.energy < 10}
                onClick={handleMeditate}
              >
                {meditateMutation.isPending
                  ? 'Canalizando Qi...'
                  : character.energy < 10
                  ? 'Energia Insuficiente (10)'
                  : 'Meditar Agora (-10 Energia)'}
              </button>
            </div>
          )}

          {/* ABA 2: CAÇA PVE */}
          {activeTab === 'hunt' && (
            <div className="form-stack">
              <h3 style={{ fontSize: '1.15rem' }}>Territórios de Caça</h3>

              {isLoadingMonsters ? (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Rastreando bestas demoníacas...
                </p>
              ) : (
                <div className="form-stack">
                  {monsters.map((monster) => {
                    const canAfford = character.energy >= monster.energy_cost && character.hp > 0;

                    return (
                      <div
                        key={monster.id}
                        style={{
                          background: 'var(--bg-void)',
                          padding: '0.9rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{monster.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gold-primary)', fontWeight: 700 }}>
                            Nv. Rec. {monster.recommended_level}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {monster.zone_name} • HP {monster.max_hp} • ATQ {monster.attack} • DEF {monster.defense}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '0.75rem',
                            gap: '0.5rem',
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                            +{monster.xp_reward} XP • +{monster.spirit_stones_reward} Pedras
                          </span>

                          <button
                            type="button"
                            disabled={huntMutation.isPending || !canAfford}
                            onClick={() => handleHunt(monster.id)}
                            style={{
                              minHeight: '38px',
                              padding: '0 0.9rem',
                              borderRadius: '8px',
                              border: 'none',
                              background: canAfford ? 'var(--gold-primary)' : '#374151',
                              color: canAfford ? '#090b10' : '#9ca3af',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              cursor: canAfford ? 'pointer' : 'not-allowed',
                            }}
                          >
                            Caçar (-{monster.energy_cost}⚡)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Relatório da Última Batalha */}
              {lastBattle && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.9rem',
                    borderRadius: '12px',
                    background: 'var(--bg-void)',
                    border:
                      lastBattle.outcome === 'victory'
                        ? '1px solid rgba(16, 185, 129, 0.45)'
                        : '1px solid rgba(239, 68, 68, 0.45)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong
                      style={{
                        color: lastBattle.outcome === 'victory' ? 'var(--jade-accent)' : '#fca5a5',
                      }}
                    >
                      {lastBattle.outcome === 'victory' ? '🏆 Vitória em Combate!' : '💀 Derrota!'}
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {lastBattle.rounds} rodadas
                    </span>
                  </div>

                  {lastBattle.outcome === 'victory' && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--gold-primary)', marginBottom: '0.5rem' }}>
                      Recompensas: +{lastBattle.xp_gained} XP • +{lastBattle.spirit_stones_gained} Pedras Espirituais
                    </div>
                  )}

                  <div
                    style={{
                      maxHeight: '140px',
                      overflowY: 'auto',
                      fontSize: '0.76rem',
                      color: '#d1d5db',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      paddingTop: '0.4rem',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {lastBattle.combat_log.map((entry, idx) => (
                      <div
                        key={idx}
                        style={{
                          color: entry.crit
                            ? '#fbbf24'
                            : entry.actor === 'monster'
                            ? '#fca5a5'
                            : '#d1d5db',
                        }}
                      >
                        {entry.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
