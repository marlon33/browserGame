import { useMemo, useState } from 'react';
import type { CharacterQuestEntry, Item, QuestDefinition } from '@/types/game';

interface QuestsPanelProps {
  quests: CharacterQuestEntry[];
  isLoading: boolean;
  isClaiming: boolean;
  onClaim: (characterQuestId: number) => void;
  onGoToHuntRegion: (regionSlug: string | null) => void;
}

const RARITY_COLORS: Record<Item['rarity'], string> = {
  common: '#9ca3af',
  rare: '#38bdf8',
  epic: '#c084fc',
  legendary: '#f59e0b',
};

const OBJECTIVE_BADGES: Record<QuestDefinition['objective_type'], string> = {
  visit_region: '🗺️ Exploração',
  kill_monster: '⚔️ Caça Específica',
  kill_any: '🔥 Extermínio',
  reach_level: '⬆️ Evolução',
  collect_item: '🎒 Coleta',
};

export function QuestsPanel({
  quests,
  isLoading,
  isClaiming,
  onClaim,
  onGoToHuntRegion,
}: QuestsPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'daily' | 'story'>('all');

  const filteredQuests = useMemo(() => {
    const list =
      categoryFilter === 'all'
        ? quests
        : quests.filter((entry) => entry.quest.category === categoryFilter);

    const weight: Record<CharacterQuestEntry['status'], number> = {
      completed: 0,
      in_progress: 1,
      claimed: 2,
    };

    return [...list].sort((a, b) => {
      if (weight[a.status] !== weight[b.status]) {
        return weight[a.status] - weight[b.status];
      }
      return (a.quest.sort_order ?? 99) - (b.quest.sort_order ?? 99);
    });
  }, [quests, categoryFilter]);

  return (
    <div className="form-stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
        <h3 style={{ fontSize: '1.15rem' }}>Pergaminhos & Missões Diárias</h3>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          Missões diárias renovam todo dia
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all' as const, label: 'Todas' },
          { key: 'daily' as const, label: '☀️ Diárias' },
          { key: 'story' as const, label: '📜 Principais' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setCategoryFilter(tab.key)}
            style={{
              padding: '0.32rem 0.75rem',
              borderRadius: '999px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: categoryFilter === tab.key ? 'var(--gold-primary)' : 'var(--bg-void)',
              color: categoryFilter === tab.key ? '#090b10' : 'var(--text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Consultando quadro de missões...</p>
      ) : filteredQuests.length === 0 ? (
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
          Nenhuma missão disponível nesta categoria.
        </p>
      ) : (
        <div className="form-stack">
          {filteredQuests.map((entry) => {
            const q = entry.quest;
            const pct = Math.min(100, Math.round((entry.current_count / Math.max(1, q.target_count)) * 100));
            const isCompleted = entry.status === 'completed';
            const isClaimed = entry.status === 'claimed';

            return (
              <div
                key={entry.id}
                style={{
                  background: isCompleted
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), var(--bg-void))'
                    : 'var(--bg-void)',
                  padding: '0.9rem',
                  borderRadius: '12px',
                  border: isCompleted
                    ? '1px solid rgba(16, 185, 129, 0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  opacity: isClaimed ? 0.65 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.95rem', color: q.category === 'daily' ? '#38bdf8' : 'var(--gold-primary)' }}>
                    {q.title}
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {OBJECTIVE_BADGES[q.objective_type]}
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {q.description}
                </p>

                <div style={{ marginTop: '0.55rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.2rem' }}>
                    <span style={{ color: '#9ca3af' }}>Progresso</span>
                    <strong style={{ color: isCompleted ? 'var(--jade-accent)' : 'var(--text-main)' }}>
                      {entry.current_count} / {q.target_count}
                    </strong>
                  </div>
                  <div style={{ height: '7px', background: '#111827', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: isCompleted
                          ? 'var(--jade-accent)'
                          : 'linear-gradient(90deg, #ca8a04, #eab308)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.55rem' }}>
                  {q.reward_xp > 0 && (
                    <span style={{ fontSize: '0.7rem', padding: '0.14rem 0.45rem', borderRadius: '6px', background: 'rgba(234, 179, 8, 0.12)', color: '#facc15' }}>
                      +{q.reward_xp} XP
                    </span>
                  )}
                  {q.reward_spirit_stones > 0 && (
                    <span style={{ fontSize: '0.7rem', padding: '0.14rem 0.45rem', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.12)', color: 'var(--gold-primary)' }}>
                      +{q.reward_spirit_stones} Pedras
                    </span>
                  )}
                  {q.reward_cultivation_qi > 0 && (
                    <span style={{ fontSize: '0.7rem', padding: '0.14rem 0.45rem', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.14)', color: '#d8b4fe' }}>
                      +{q.reward_cultivation_qi} Qi
                    </span>
                  )}
                  {q.reward_jade_tokens > 0 && (
                    <span style={{ fontSize: '0.7rem', padding: '0.14rem 0.45rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.14)', color: 'var(--jade-accent)' }}>
                      +{q.reward_jade_tokens} Jades
                    </span>
                  )}
                  {q.reward_item && q.reward_item_quantity > 0 && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.14rem 0.45rem',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        color: RARITY_COLORS[q.reward_item.rarity],
                      }}
                    >
                      🎁 {q.reward_item_quantity}x {q.reward_item.name}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.65rem' }}>
                  {isClaimed ? (
                    <span style={{ fontSize: '0.76rem', color: 'var(--jade-accent)', fontWeight: 700 }}>
                      ✅ Recompensa Resgatada
                    </span>
                  ) : isCompleted ? (
                    <button
                      type="button"
                      disabled={isClaiming}
                      onClick={() => onClaim(entry.id)}
                      style={{
                        minHeight: '36px',
                        padding: '0 0.9rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--jade-accent)',
                        color: '#090b10',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      🎁 Resgatar Recompensa
                    </button>
                  ) : q.objective_type === 'visit_region' ? (
                    <button
                      type="button"
                      onClick={() => onGoToHuntRegion(q.target_region_slug)}
                      style={{
                        minHeight: '34px',
                        padding: '0 0.8rem',
                        borderRadius: '8px',
                        border: '1px solid var(--gold-primary)',
                        background: 'rgba(212, 175, 55, 0.14)',
                        color: 'var(--gold-primary)',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                      }}
                    >
                      🗺️ Viajar até a Região
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
