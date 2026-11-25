import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tItemName, tQuestDesc, tQuestTitle } from '@/utils/translateDb';
import type { CharacterQuestEntry } from '@/types/game';

interface QuestsPanelProps {
  quests: CharacterQuestEntry[];
  isLoading: boolean;
  isClaiming: boolean;
  onClaim: (characterQuestId: number) => void;
  onGoToHuntRegion?: (regionSlug: string) => void;
}

type QuestFilter = 'all' | 'story' | 'daily';

export function QuestsPanel({
  quests,
  isLoading,
  isClaiming,
  onClaim,
  onGoToHuntRegion,
}: QuestsPanelProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<QuestFilter>('all');

  const visibleQuests =
    filter === 'all' ? quests : quests.filter((q) => q.quest.category === filter);

  return (
    <div className="form-stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
        <h3 style={{ fontSize: '1.15rem' }}>{t('quests.title')}</h3>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          {t('quests.resetNote')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {(
          [
            { key: 'all', label: t('quests.filterAll') },
            { key: 'daily', label: t('quests.filterDaily') },
            { key: 'story', label: t('quests.filterStory') },
          ] as { key: QuestFilter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '0.32rem 0.7rem',
              borderRadius: '999px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: filter === tab.key ? 'var(--gold-primary)' : 'var(--bg-void)',
              color: filter === tab.key ? '#090b10' : 'var(--text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>{t('quests.loading')}</p>
      ) : visibleQuests.length === 0 ? (
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>{t('quests.empty')}</p>
      ) : (
        <div className="form-stack">
          {visibleQuests.map((entry) => {
            const { quest } = entry;
            const isDaily = quest.category === 'daily';
            const isCompleted = entry.status === 'completed';
            const isClaimed = entry.status === 'claimed';
            const pct = Math.min(
              100,
              Math.round((entry.progress / Math.max(1, quest.target_count)) * 100)
            );

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
                  <strong
                    style={{
                      fontSize: '0.95rem',
                      color: isCompleted
                        ? 'var(--jade-accent)'
                        : isDaily
                        ? '#38bdf8'
                        : 'var(--gold-primary)',
                    }}
                  >
                    {tQuestTitle(t, quest)}
                  </strong>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {t(`quests.badges.${quest.objective_type}`, {
                      defaultValue: quest.objective_type,
                    })}
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {tQuestDesc(t, quest)}
                </p>

                <div style={{ marginTop: '0.55rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.22rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('quests.progress')}</span>
                    <strong style={{ color: isCompleted || isClaimed ? 'var(--jade-accent)' : '#e5e7eb' }}>
                      {entry.progress} / {quest.target_count}
                    </strong>
                  </div>
                  <div style={{ height: '7px', background: '#111827', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background:
                          isCompleted || isClaimed
                            ? 'var(--jade-accent)'
                            : 'linear-gradient(90deg, #ca8a04, #eab308)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.7rem',
                    gap: '0.4rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {quest.reward_xp > 0 && (
                      <strong style={{ color: '#fbbf24' }}>+{quest.reward_xp} XP</strong>
                    )}
                    {quest.reward_spirit_stones > 0 && (
                      <strong style={{ color: 'var(--gold-primary)' }}>
                        +{quest.reward_spirit_stones} {t('common.stonesShort')}
                      </strong>
                    )}
                    {quest.reward_cultivation_qi > 0 && (
                      <strong style={{ color: '#c084fc' }}>+{quest.reward_cultivation_qi} Qi</strong>
                    )}
                    {quest.reward_jade_tokens > 0 && (
                      <strong style={{ color: 'var(--jade-accent)' }}>
                        +{quest.reward_jade_tokens} {t('common.jadesShort')}
                      </strong>
                    )}
                    {quest.reward_item && quest.reward_item_quantity > 0 && (
                      <strong style={{ color: '#38bdf8' }}>
                        🎁 {quest.reward_item_quantity}x {tItemName(t, quest.reward_item)}
                      </strong>
                    )}
                  </div>

                  {isClaimed ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--jade-accent)', fontWeight: 700 }}>
                      {t('quests.claimed')}
                    </span>
                  ) : isCompleted ? (
                    <button
                      type="button"
                      disabled={isClaiming}
                      onClick={() => onClaim(entry.id)}
                      style={{
                        minHeight: '36px',
                        padding: '0 0.85rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--jade-accent)',
                        color: '#090b10',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      {t('quests.claimBtn')}
                    </button>
                  ) : quest.objective_type === 'visit_region' && quest.target_region_slug ? (
                    <button
                      type="button"
                      onClick={() => onGoToHuntRegion?.(quest.target_region_slug!)}
                      style={{
                        minHeight: '34px',
                        padding: '0 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #38bdf8',
                        background: 'rgba(56, 189, 248, 0.14)',
                        color: '#38bdf8',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                      }}
                    >
                      {t('quests.travelBtn')}
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