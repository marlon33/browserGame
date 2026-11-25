import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  tItemName,
  tMonsterName,
  tMonsterZone,
  tRegionName,
} from '@/utils/translateDb';
import type {
  ActiveBattle,
  Character,
  HuntResult,
  Item,
  Monster,
  TacticalActionType,
} from '@/types/game';

interface HuntArenaProps {
  character: Character;
  monsters: Monster[];
  isLoadingMonsters: boolean;
  isHunting: boolean;
  lastBattle: HuntResult | null;
  activeBattle: ActiveBattle | null;
  isStartingBattle: boolean;
  isExecutingAction: boolean;
  initialRegionSlug?: string | null;
  onSelectRegion?: (regionSlug: string) => void;
  onStartTacticalBattle: (monsterId: number) => void;
  onTacticalAction: (battleId: number, action: TacticalActionType) => void;
  onTacticalMonsterTurn: (battleId: number) => void;
  onSweepHunt: (monsterId: number, times: number) => void;
}

const RARITY_COLORS: Record<Item['rarity'], string> = {
  common: '#9ca3af',
  rare: '#38bdf8',
  epic: '#c084fc',
  legendary: '#f59e0b',
};

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

export function HuntArena({
  character,
  monsters,
  isLoadingMonsters,
  isHunting,
  lastBattle,
  activeBattle,
  isStartingBattle,
  isExecutingAction,
  initialRegionSlug,
  onSelectRegion,
  onStartTacticalBattle,
  onTacticalAction,
  onTacticalMonsterTurn,
  onSweepHunt,
}: HuntArenaProps) {
  const { t } = useTranslation();
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegionSlug || 'all');
  const [inspectedMonsterId, setInspectedMonsterId] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const autoTurnTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialRegionSlug) {
      setSelectedRegion(initialRegionSlug);
      onSelectRegion?.(initialRegionSlug);
    }
  }, [initialRegionSlug]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const turnSecondsLeft = useMemo(() => {
    if (!activeBattle || activeBattle.status !== 'active' || !activeBattle.turn_expires_at) {
      return 0;
    }
    const diff = (new Date(activeBattle.turn_expires_at).getTime() - nowTick) / 1000;
    return Math.max(0, Math.ceil(diff));
  }, [activeBattle, nowTick]);

  useEffect(() => {
    if (!activeBattle || activeBattle.status !== 'active' || isExecutingAction) return;

    const turnKey = `${activeBattle.id}-${activeBattle.round}-${activeBattle.current_turn}`;

    if (turnSecondsLeft === 0 && autoTurnTriggeredRef.current !== turnKey) {
      autoTurnTriggeredRef.current = turnKey;
      if (activeBattle.current_turn === 'monster') {
        onTacticalMonsterTurn(activeBattle.id);
      } else if (activeBattle.current_turn === 'player') {
        onTacticalAction(activeBattle.id, 'pass');
      }
    }
  }, [
    activeBattle,
    turnSecondsLeft,
    isExecutingAction,
    onTacticalMonsterTurn,
    onTacticalAction,
  ]);

  const inspectedMonster = useMemo(
    () => monsters.find((m) => m.id === inspectedMonsterId) ?? null,
    [monsters, inspectedMonsterId]
  );

  const regions = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; order: number; minLevel: number }>();
    for (const m of monsters) {
      const existing = map.get(m.region_slug);
      if (!existing) {
        map.set(m.region_slug, {
          slug: m.region_slug,
          name: tRegionName(t, m.region_slug, m.zone_name),
          order: m.region_order,
          minLevel: m.recommended_level,
        });
      } else {
        existing.minLevel = Math.min(existing.minLevel, m.recommended_level);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [monsters, t]);

  const visibleMonsters = useMemo(() => {
    if (selectedRegion === 'all') return monsters;
    return monsters.filter((m) => m.region_slug === selectedRegion);
  }, [monsters, selectedRegion]);

  const handleRegionClick = (slug: string) => {
    setSelectedRegion(slug);
    if (slug !== 'all') {
      onSelectRegion?.(slug);
    }
  };

  if (activeBattle && activeBattle.status === 'active') {
    const monster = activeBattle.monster;
    const monsterLabel = monster ? tMonsterName(t, monster) : t('cultivate.beastFallback');
    const isPlayerTurn = activeBattle.current_turn === 'player';
    const maxTurnTime = isPlayerTurn ? 15 : 3;
    const timerPct = Math.min(100, Math.round((turnSecondsLeft / maxTurnTime) * 100));

    const playerHpPct = Math.min(
      100,
      Math.round((activeBattle.player_hp / Math.max(1, activeBattle.player_max_hp)) * 100)
    );
    const monsterHpPct = Math.min(
      100,
      Math.round((activeBattle.monster_hp / Math.max(1, activeBattle.monster_max_hp)) * 100)
    );

    const healUsed = Boolean(activeBattle.turn_actions_used?.heal);
    const supportUsed = Boolean(activeBattle.turn_actions_used?.support);
    const actionsRemaining = 1 + (healUsed ? 0 : 1) + (supportUsed ? 0 : 1);

    const buffTurns = activeBattle.active_effects?.player_buff_turns ?? 0;
    const debuffTurns = activeBattle.active_effects?.monster_debuff_turns ?? 0;

    return (
      <div className="form-stack">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-void)',
            padding: '0.75rem 0.9rem',
            borderRadius: '12px',
            border: isPlayerTurn
              ? '1px solid rgba(212, 175, 55, 0.55)'
              : '1px solid rgba(239, 68, 68, 0.55)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {t('hunt.roundLabel', { round: activeBattle.round })}
            </div>
            <strong
              style={{
                fontSize: '0.95rem',
                color: isPlayerTurn ? 'var(--gold-primary)' : '#f87171',
              }}
            >
              {isPlayerTurn
                ? t('hunt.yourTurn', { count: actionsRemaining })
                : t('hunt.enemyTurn', { name: monsterLabel })}
            </strong>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: isPlayerTurn && turnSecondsLeft <= 5 ? '#f87171' : '#38bdf8',
              }}
            >
              {turnSecondsLeft}s
            </div>
            <div style={{ width: '76px', height: '6px', background: '#111827', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${timerPct}%`,
                  height: '100%',
                  background: isPlayerTurn ? 'var(--gold-primary)' : '#ef4444',
                  transition: 'width 0.25s linear',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <div
            style={{
              background: 'var(--bg-void)',
              padding: '0.8rem',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.35)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--jade-accent)', fontWeight: 700 }}>
              🧘 {character.name} ({t('common.levelShort', { level: character.level })})
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, margin: '0.25rem 0' }}>
              {activeBattle.player_hp} / {activeBattle.player_max_hp} HP
            </div>
            <div style={{ height: '9px', background: '#111827', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${playerHpPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #059669, #10b981)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            {buffTurns > 0 && (
              <div style={{ fontSize: '0.68rem', color: '#fbbf24', marginTop: '0.35rem' }}>
                {t('hunt.spiritualAura', { turns: buffTurns })}
              </div>
            )}
          </div>

          <div
            style={{
              background: 'var(--bg-void)',
              padding: '0.8rem',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.35)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700 }}>
              {monster?.is_boss ? '👑 ' : '👹 '}
              {monsterLabel}
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, margin: '0.25rem 0' }}>
              {activeBattle.monster_hp} / {activeBattle.monster_max_hp} HP
            </div>
            <div style={{ height: '9px', background: '#111827', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${monsterHpPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #b91c1c, #ef4444)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            {debuffTurns > 0 && (
              <div style={{ fontSize: '0.68rem', color: '#c084fc', marginTop: '0.35rem' }}>
                {t('hunt.weakened', { turns: debuffTurns })}
              </div>
            )}
          </div>
        </div>

        {isPlayerTurn ? (
          <div
            style={{
              background: 'var(--bg-void)',
              padding: '0.85rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <strong>{t('hunt.step12Title')}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
              <button
                type="button"
                disabled={isExecutingAction || healUsed || activeBattle.player_hp >= activeBattle.player_max_hp}
                onClick={() => onTacticalAction(activeBattle.id, 'heal')}
                style={{
                  padding: '0.55rem 0.35rem',
                  borderRadius: '8px',
                  border: '1px solid var(--jade-accent)',
                  background: healUsed ? 'transparent' : 'rgba(16, 185, 129, 0.14)',
                  color: healUsed ? '#4b5563' : 'var(--jade-accent)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: healUsed ? 'not-allowed' : 'pointer',
                }}
              >
                💚 {healUsed ? t('hunt.healed') : t('hunt.healHp')}
              </button>

              <button
                type="button"
                disabled={isExecutingAction || supportUsed}
                onClick={() => onTacticalAction(activeBattle.id, 'buff')}
                style={{
                  padding: '0.55rem 0.35rem',
                  borderRadius: '8px',
                  border: '1px solid #f59e0b',
                  background: supportUsed ? 'transparent' : 'rgba(245, 158, 11, 0.14)',
                  color: supportUsed ? '#4b5563' : '#fbbf24',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: supportUsed ? 'not-allowed' : 'pointer',
                }}
              >
                🔥 {supportUsed ? t('hunt.supportUsed') : t('hunt.buffBtn')}
              </button>

              <button
                type="button"
                disabled={isExecutingAction || supportUsed}
                onClick={() => onTacticalAction(activeBattle.id, 'debuff')}
                style={{
                  padding: '0.55rem 0.35rem',
                  borderRadius: '8px',
                  border: '1px solid #a855f7',
                  background: supportUsed ? 'transparent' : 'rgba(168, 85, 247, 0.14)',
                  color: supportUsed ? '#4b5563' : '#d8b4fe',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: supportUsed ? 'not-allowed' : 'pointer',
                }}
              >
                🌀 {supportUsed ? t('hunt.supportUsed') : t('hunt.debuffBtn')}
              </button>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              <strong>{t('hunt.step3Title')}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.45rem' }}>
              <button
                type="button"
                disabled={isExecutingAction}
                onClick={() => onTacticalAction(activeBattle.id, 'physical')}
                style={{
                  minHeight: '42px',
                  padding: '0 0.65rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--gold-primary)',
                  color: '#090b10',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {t('hunt.physicalAttack')}
              </button>

              <button
                type="button"
                disabled={isExecutingAction}
                onClick={() => onTacticalAction(activeBattle.id, 'magic')}
                style={{
                  minHeight: '42px',
                  padding: '0 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid #38bdf8',
                  background: 'rgba(56, 189, 248, 0.18)',
                  color: '#38bdf8',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {t('hunt.magicAttack')}
              </button>

              <button
                type="button"
                disabled={isExecutingAction}
                onClick={() => onTacticalAction(activeBattle.id, 'pass')}
                title={t('hunt.passTitle')}
                style={{
                  minHeight: '42px',
                  padding: '0 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                }}
              >
                {t('hunt.passBtn')}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              padding: '0.9rem',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#fca5a5',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {t('hunt.enemyCounterAttack', { name: monsterLabel, seconds: turnSecondsLeft })}
          </div>
        )}

        <div
          style={{
            background: 'var(--bg-void)',
            padding: '0.75rem',
            borderRadius: '10px',
            maxHeight: '155px',
            overflowY: 'auto',
            fontSize: '0.76rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
          }}
        >
          {activeBattle.combat_log.slice().reverse().map((entry, idx) => (
            <div
              key={idx}
              style={{
                color: entry.crit
                  ? '#fbbf24'
                  : entry.actor === 'monster'
                  ? '#fca5a5'
                  : entry.actor === 'system'
                  ? '#38bdf8'
                  : '#d1d5db',
              }}
            >
              {entry.text}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (inspectedMonster) {
    const monsterName = tMonsterName(t, inspectedMonster);
    const monsterZone = tMonsterZone(t, inspectedMonster);
    const bestiary = inspectedMonster.bestiary;
    const kills = bestiary?.kills_count ?? 0;
    const mastery = bestiary?.mastery;

    let bossCooldownSec = 0;
    if (inspectedMonster.is_boss && bestiary?.boss_cooldown_until) {
      bossCooldownSec = Math.max(
        0,
        Math.ceil((new Date(bestiary.boss_cooldown_until).getTime() - nowTick) / 1000)
      );
    }

    const canStart =
      character.energy >= inspectedMonster.energy_cost &&
      character.hp > 0 &&
      bossCooldownSec === 0;

    const eff = character.effective_stats;
    const combat = character.combat_summary;
    const playerMaxHp = eff?.max_hp ?? character.max_hp;
    const playerAttack =
      combat?.attack ??
      Math.round(
        (eff?.strength ?? character.strength) * 2.2 +
          (eff?.spirit_power ?? character.spirit_power) * 1.1
      );
    const playerDefense =
      combat?.defense ??
      Math.round(
        (eff?.constitution ?? character.constitution) * 1.4 +
          (eff?.agility ?? character.agility) * 0.5
      );
    const playerAgility = eff?.agility ?? character.agility;

    const comparisonRows = [
      { label: t('hunt.maxHpStat'), playerVal: playerMaxHp, mobVal: inspectedMonster.max_hp },
      { label: t('stats.attack'), playerVal: playerAttack, mobVal: inspectedMonster.attack },
      { label: t('stats.defense'), playerVal: playerDefense, mobVal: inspectedMonster.defense },
      { label: t('stats.agility'), playerVal: playerAgility, mobVal: inspectedMonster.agility },
    ];

    const playerAttacksFirst = playerAgility >= inspectedMonster.agility;

    return (
      <div className="form-stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setInspectedMonsterId(null)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--text-muted)',
              borderRadius: '8px',
              padding: '0.35rem 0.7rem',
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            {t('hunt.backToRegions')}
          </button>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {monsterZone}
          </span>
        </div>

        <div
          style={{
            background: 'var(--bg-void)',
            padding: '1rem',
            borderRadius: '14px',
            border: inspectedMonster.is_boss
              ? '1px solid rgba(245, 158, 11, 0.5)'
              : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--jade-accent)', fontWeight: 700 }}>
                {t('hunt.youLabel')} • {t('common.levelShort', { level: character.level })}
              </div>
              <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>
                🧘 {character.name}
              </strong>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {t('hunt.currentHp', { hp: character.hp, max: playerMaxHp })}
              </div>
            </div>

            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                padding: '0.25rem 0.55rem',
                borderRadius: '999px',
                background: 'rgba(212, 175, 55, 0.14)',
                color: 'var(--gold-primary)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
              }}
            >
              VS
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: inspectedMonster.is_boss ? '#fbbf24' : '#f87171',
                  fontWeight: 700,
                }}
              >
                {inspectedMonster.is_boss ? t('hunt.bossLabel') : t('hunt.enemyLabel')} •{' '}
                {t('common.levelShort', { level: inspectedMonster.recommended_level })}
              </div>
              <strong
                style={{
                  fontSize: '0.98rem',
                  color: inspectedMonster.is_boss ? '#fbbf24' : 'var(--text-main)',
                }}
              >
                {inspectedMonster.is_boss ? '👑 ' : '👹 '}
                {monsterName}
              </strong>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {t('hunt.costLabel', { energy: inspectedMonster.energy_cost })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.85rem' }}>
            {comparisonRows.map((row) => {
              const diff = row.playerVal - row.mobVal;
              const playerWins = diff > 0;
              const tie = diff === 0;

              return (
                <div
                  key={row.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.2fr 1fr',
                    alignItems: 'center',
                    background: '#111827',
                    padding: '0.5rem 0.7rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <strong
                      style={{
                        fontSize: '0.98rem',
                        color: playerWins ? 'var(--jade-accent)' : tie ? '#e5e7eb' : '#9ca3af',
                      }}
                    >
                      {row.playerVal}
                    </strong>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {row.label}
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: playerWins ? '#34d399' : tie ? '#9ca3af' : '#f87171',
                      }}
                    >
                      {diff > 0
                        ? t('hunt.advantage', { diff })
                        : diff < 0
                        ? t('hunt.disadvantage', { diff })
                        : t('hunt.tie')}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <strong
                      style={{
                        fontSize: '0.98rem',
                        color: !playerWins && !tie ? '#f87171' : tie ? '#e5e7eb' : '#9ca3af',
                      }}
                    >
                      {row.mobVal}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              marginBottom: '0.8rem',
              background: playerAttacksFirst ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: playerAttacksFirst
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)',
              color: playerAttacksFirst ? '#6ee7b7' : '#fca5a5',
            }}
          >
            {playerAttacksFirst
              ? t('hunt.initiativePlayer')
              : t('hunt.initiativeEnemy', { name: monsterName })}
          </div>

          <div style={{ fontSize: '0.78rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>{t('hunt.baseRewards')} </span>
              <strong style={{ color: 'var(--gold-primary)' }}>
                +{inspectedMonster.xp_reward} XP • +{inspectedMonster.spirit_stones_reward}{' '}
                {t('common.stonesShort')}
              </strong>
              {inspectedMonster.cultivation_qi_reward > 0 && (
                <strong style={{ color: '#c084fc' }}> • +{inspectedMonster.cultivation_qi_reward} Qi</strong>
              )}
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>{t('hunt.bestiaryRecord')} </span>
              <strong style={{ color: '#d8b4fe' }}>
                {t('hunt.killsCount', { count: kills })} ({mastery?.label ?? t('hunt.novice')})
              </strong>
            </div>
          </div>

          {inspectedMonster.drops && inspectedMonster.drops.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                {t('hunt.possibleDrops')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {inspectedMonster.drops.map((d) =>
                  d.item ? (
                    <span
                      key={d.id}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        color: RARITY_COLORS[d.item.rarity],
                      }}
                    >
                      🎁 {tItemName(t, d.item)} ({d.drop_chance_pct}%)
                    </span>
                  ) : null
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-primary"
            disabled={isStartingBattle || !canStart}
            onClick={() => {
              onStartTacticalBattle(inspectedMonster.id);
              setInspectedMonsterId(null);
            }}
          >
            {isStartingBattle
              ? t('hunt.enteringArena')
              : bossCooldownSec > 0
              ? t('hunt.bossRecharging', { time: formatSeconds(bossCooldownSec) })
              : character.hp <= 0
              ? t('hunt.hpExhausted')
              : character.energy < inspectedMonster.energy_cost
              ? t('hunt.noEnergy', { energy: inspectedMonster.energy_cost })
              : t('hunt.attackEnemyBtn', { energy: inspectedMonster.energy_cost })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
        <h3 style={{ fontSize: '1.15rem' }}>{t('hunt.title')}</h3>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          {t('hunt.subtitle')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => handleRegionClick('all')}
          style={{
            padding: '0.32rem 0.7rem',
            borderRadius: '999px',
            border: 'none',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: selectedRegion === 'all' ? 'var(--gold-primary)' : 'var(--bg-void)',
            color: selectedRegion === 'all' ? '#090b10' : 'var(--text-muted)',
          }}
        >
          {t('hunt.allRegions')}
        </button>

        {regions.map((reg) => (
          <button
            key={reg.slug}
            type="button"
            onClick={() => handleRegionClick(reg.slug)}
            style={{
              padding: '0.32rem 0.7rem',
              borderRadius: '999px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: selectedRegion === reg.slug ? 'var(--gold-primary)' : 'var(--bg-void)',
              color: selectedRegion === reg.slug ? '#090b10' : 'var(--text-muted)',
            }}
          >
            {reg.name} ({t('common.levelShort', { level: reg.minLevel })}+)
          </button>
        ))}
      </div>

      {isLoadingMonsters ? (
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{t('hunt.loadingMonsters')}</p>
      ) : (
        <div className="form-stack">
          {visibleMonsters.map((monster) => {
            const bestiary = monster.bestiary;
            const kills = bestiary?.kills_count ?? 0;
            const mastery = bestiary?.mastery;
            const canSweep = Boolean(bestiary?.can_sweep);

            let bossCooldownSec = 0;
            if (monster.is_boss && bestiary?.boss_cooldown_until) {
              bossCooldownSec = Math.max(
                0,
                Math.ceil((new Date(bestiary.boss_cooldown_until).getTime() - nowTick) / 1000)
              );
            }

            const canAfford3 =
              canSweep &&
              character.energy >= monster.energy_cost * 3 &&
              character.hp > 0;

            const levelDiff = monster.recommended_level - character.level;
            const diffBadge = monster.is_boss
              ? { label: t('hunt.bossBadge'), color: '#f59e0b' }
              : levelDiff <= 0
              ? { label: t('hunt.easy'), color: 'var(--jade-accent)' }
              : levelDiff <= 2
              ? { label: t('hunt.balanced'), color: '#fbbf24' }
              : { label: t('hunt.dangerous'), color: '#f87171' };

            return (
              <div
                key={monster.id}
                style={{
                  background: monster.is_boss
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.09), var(--bg-void))'
                    : 'var(--bg-void)',
                  padding: '0.9rem',
                  borderRadius: '12px',
                  border: monster.is_boss
                    ? '1px solid rgba(245, 158, 11, 0.45)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.96rem', color: monster.is_boss ? '#fbbf24' : 'var(--text-main)' }}>
                    {monster.is_boss ? '👑 ' : ''}
                    {tMonsterName(t, monster)}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: diffBadge.color, fontWeight: 800 }}>
                    {t('common.levelShort', { level: monster.recommended_level })} • {diffBadge.label}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {tMonsterZone(t, monster)} • HP {monster.max_hp} • {t('stats.attack')}{' '}
                  {monster.attack} • {t('stats.defense')} {monster.defense}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    marginTop: '0.45rem',
                    fontSize: '0.72rem',
                  }}
                >
                  <span
                    style={{
                      padding: '0.12rem 0.45rem',
                      borderRadius: '6px',
                      background: 'rgba(168, 85, 247, 0.14)',
                      color: '#d8b4fe',
                      fontWeight: 600,
                    }}
                  >
                    📖 {t('hunt.bestiary', { count: kills })}
                    {mastery && mastery.tier > 0 ? ` (${mastery.label})` : ''}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.75rem',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.76rem', color: '#9ca3af' }}>
                    +{monster.xp_reward} XP • +{monster.spirit_stones_reward} {t('common.stonesShort')}
                  </span>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {canSweep && (
                      <button
                        type="button"
                        disabled={isHunting || !canAfford3}
                        onClick={() => onSweepHunt(monster.id, 3)}
                        title={t('hunt.sweepTitle')}
                        style={{
                          minHeight: '38px',
                          padding: '0 0.7rem',
                          borderRadius: '8px',
                          border: '1px solid var(--jade-accent)',
                          background: canAfford3 ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                          color: canAfford3 ? 'var(--jade-accent)' : '#6b7280',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: canAfford3 ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {t('hunt.sweepBtn', { energy: monster.energy_cost * 3 })}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setInspectedMonsterId(monster.id)}
                      style={{
                        minHeight: '38px',
                        padding: '0 0.85rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: bossCooldownSec > 0 ? '#374151' : 'var(--gold-primary)',
                        color: bossCooldownSec > 0 ? '#9ca3af' : '#090b10',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {bossCooldownSec > 0
                        ? t('hunt.cooldownBtn', { time: formatSeconds(bossCooldownSec) })
                        : t('hunt.inspectBtn')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastBattle && (
        <div
          style={{
            marginTop: '0.4rem',
            padding: '0.85rem',
            borderRadius: '12px',
            background: 'var(--bg-void)',
            border:
              lastBattle.outcome === 'victory'
                ? '1px solid rgba(16, 185, 129, 0.45)'
                : '1px solid rgba(239, 68, 68, 0.45)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <strong style={{ color: lastBattle.outcome === 'victory' ? 'var(--jade-accent)' : '#fca5a5' }}>
              {lastBattle.outcome === 'victory'
                ? lastBattle.fights_completed > 1
                  ? t('hunt.sweepVictory', { count: lastBattle.fights_completed })
                  : t('hunt.battleVictory')
                : t('hunt.battleDefeat')}
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {t('common.rounds', { count: lastBattle.rounds })}
            </span>
          </div>

          {lastBattle.outcome === 'victory' && (
            <div style={{ fontSize: '0.8rem', color: 'var(--gold-primary)', marginBottom: '0.45rem' }}>
              +{lastBattle.xp_gained} XP • +{lastBattle.spirit_stones_gained} {t('common.stonesShort')}
              {lastBattle.qi_gained > 0 && (
                <span style={{ color: '#c084fc' }}> • +{lastBattle.qi_gained} Qi</span>
              )}
              {lastBattle.items_dropped && lastBattle.items_dropped.length > 0 && (
                <div style={{ color: '#38bdf8', marginTop: '0.2rem' }}>
                  {t('hunt.lootLabel')}{' '}
                  {lastBattle.items_dropped
                    .map((d) => `${d.quantity}x ${d.name}`)
                    .join(', ')}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              maxHeight: '140px',
              overflowY: 'auto',
              fontSize: '0.75rem',
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
  );
}