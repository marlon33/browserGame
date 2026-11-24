import { useEffect, useMemo, useState } from 'react';
import { useGameplay, type StatKey } from '@/hooks/useGameplay';
import { useInventory } from '@/hooks/useInventory';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { Toast, type ToastData } from '@/components/ui/Toast';
import type { Character, HuntResult, Item } from '@/types/game';

interface CharacterHudProps {
  character: Character;
  onSwitchCharacter: () => void;
  onLogout: () => void;
}

type GameTab = 'cultivate' | 'hunt' | 'bag' | 'shop';
type ItemFilter = 'all' | 'weapon' | 'armor' | 'accessory' | 'consumable';

const RARITY_COLORS: Record<Item['rarity'], string> = {
  common: '#9ca3af',
  rare: '#38bdf8',
  epic: '#c084fc',
  legendary: '#f59e0b',
};

const TYPE_LABELS: Record<Item['type'], string> = {
  weapon: 'Arma',
  armor: 'Armadura',
  accessory: 'Acessório',
  consumable: 'Consumível',
};

function formatItemStats(item: Item): string {
  const parts: string[] = [];
  if (item.bonus_strength) parts.push(`+${item.bonus_strength} FOR`);
  if (item.bonus_agility) parts.push(`+${item.bonus_agility} AGI`);
  if (item.bonus_constitution) parts.push(`+${item.bonus_constitution} CON`);
  if (item.bonus_spirit_power) parts.push(`+${item.bonus_spirit_power} ESP`);
  if (item.bonus_max_hp) parts.push(`+${item.bonus_max_hp} HP`);
  if (item.heal_hp) parts.push(`Cura ${item.heal_hp} HP`);
  if (item.restore_energy) parts.push(`+${item.restore_energy} Energia`);
  return parts.join(' • ');
}

export function CharacterHud({
  character,
  onSwitchCharacter,
  onLogout,
}: CharacterHudProps) {
  const [activeTab, setActiveTab] = useState<GameTab>('cultivate');
  const [bagFilter, setBagFilter] = useState<ItemFilter>('all');
  const [shopFilter, setShopFilter] = useState<ItemFilter>('all');
  const [stonesBatch, setStonesBatch] = useState<number>(1);
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [lastBattle, setLastBattle] = useState<HuntResult | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ id: Date.now(), type, message });
  };

  const {
    monsters,
    isLoadingMonsters,
    battleHistory,
    meditateMutation,
    allocateStatMutation,
    huntMutation,
  } = useGameplay(character.id);

  const {
    shopItems,
    inventory,
    isLoadingInventory,
    buyMutation,
    equipMutation,
    useItemMutation,
    sellMutation,
  } = useInventory(character.id);

  // Sincroniza cronômetro regressivo de cooldown da meditação
  useEffect(() => {
    const until = character.meditation_status?.cooldown_until;
    if (!until) {
      setCooldownLeft(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 1000));
      setCooldownLeft(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [character.meditation_status?.cooldown_until]);

  const eff = character.effective_stats;
  const combat = character.combat_summary;
  const displayMaxHp = eff?.max_hp ?? character.max_hp;
  const hpPercent = Math.min(100, Math.round((character.hp / Math.max(1, displayMaxHp)) * 100));
  const energyPercent = Math.min(
    100,
    Math.round((character.energy / Math.max(1, character.max_energy)) * 100)
  );
  const xpRequired = character.next_level_xp ?? Math.round(100 * Math.pow(character.level, 1.45));
  const xpPercent = Math.min(100, Math.round((character.experience / Math.max(1, xpRequired)) * 100));

  // Progresso da Patente (Qi de Cultivo)
  const currentRankBase = character.cultivation_rank?.required_xp ?? 0;
  const nextRankTarget = character.next_rank_info?.required_xp ?? null;
  const cultivationXp = character.cultivation_xp ?? 0;
  const rankProgressPct = nextRankTarget
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((cultivationXp - currentRankBase) / Math.max(1, nextRankTarget - currentRankBase)) * 100
          )
        )
      )
    : 100;

  // Cálculos de pré-visualização da Meditação
  const fatiguePct = character.meditation_status?.fatigue_pct ?? 0;
  const efficiencyPct = character.meditation_status?.efficiency_pct ?? 100;
  const isSaturated = character.meditation_status?.is_saturated ?? false;

  const previewEnergyCost = 4 + stonesBatch * 2 + Math.floor(character.level * 0.5);
  const previewCooldownSec = stonesBatch * 5 + character.level * 2;
  const xpMult = character.server?.xp_multiplier ?? 1.0;
  const previewQiGain = Math.max(
    5,
    Math.round(stonesBatch * (32 + character.level * 4) * (efficiencyPct / 100) * xpMult)
  );

  const canMeditate =
    cooldownLeft === 0 &&
    !isSaturated &&
    character.spirit_stones >= stonesBatch &&
    character.energy >= previewEnergyCost;

  const realmColor = character.realm?.primary_color || '#d4af37';
  const rankColor = character.cultivation_rank?.badge_color || '#cd7f32';

  const healingPotionEntry = useMemo(
    () => inventory.find((i) => i.item.type === 'consumable' && i.item.heal_hp > 0 && i.quantity > 0),
    [inventory]
  );

  const equippedSlots = useMemo(() => {
    const weapon = inventory.find((i) => i.is_equipped && i.item.type === 'weapon');
    const armor = inventory.find((i) => i.is_equipped && i.item.type === 'armor');
    const accessory = inventory.find((i) => i.is_equipped && i.item.type === 'accessory');
    return [
      { slot: 'weapon' as const, label: '⚔️ Arma', equipped: weapon },
      { slot: 'armor' as const, label: '🛡️ Armadura', equipped: armor },
      { slot: 'accessory' as const, label: '📿 Acessório', equipped: accessory },
    ];
  }, [inventory]);

  const filteredInventory = useMemo(
    () => (bagFilter === 'all' ? inventory : inventory.filter((i) => i.item.type === bagFilter)),
    [inventory, bagFilter]
  );

  const filteredShop = useMemo(
    () => (shopFilter === 'all' ? shopItems : shopItems.filter((i) => i.type === shopFilter)),
    [shopItems, shopFilter]
  );

  const handleMeditate = () => {
    meditateMutation.mutate(stonesBatch, {
      onSuccess: (data) => {
        let msg = data.message;
        if (data.rank_up_title) {
          msg = `⚡ Ascensão de Patente! Você alcançou ${data.rank_up_title}!`;
        }
        showToast('success', msg);
      },
      onError: (err) => showToast('error', getErrorMessage(err)),
    });
  };

  const handleAllocateStat = (stat: StatKey, amount: number) => {
    allocateStatMutation.mutate(
      { stat, amount },
      {
        onSuccess: (data) => showToast('success', data.message),
        onError: (err) => showToast('error', getErrorMessage(err)),
      }
    );
  };

  const handleHunt = (monsterId: number) => {
    huntMutation.mutate(monsterId, {
      onSuccess: (result) => {
        setLastBattle(result);
        if (result.levels_gained > 0) {
          showToast('success', `🎉 Vitória! Você avançou para o Nível ${result.character.level}!`);
        } else if (result.outcome === 'victory') {
          showToast('success', `🏆 Vitória! +${result.xp_gained} XP de Combate e +${result.spirit_stones_gained} Pedras.`);
        } else {
          showToast('error', '💀 Você foi derrotado! Recupere seu HP antes de caçar novamente.');
        }
      },
      onError: (err) => showToast('error', getErrorMessage(err)),
    });
  };

  const statList: { key: StatKey; label: string; total: number; bonus: number; desc: string }[] = [
    {
      key: 'strength',
      label: 'Força',
      total: eff?.strength ?? character.strength,
      bonus: eff?.bonus_strength ?? 0,
      desc: 'Dano físico',
    },
    {
      key: 'agility',
      label: 'Agilidade',
      total: eff?.agility ?? character.agility,
      bonus: eff?.bonus_agility ?? 0,
      desc: 'Crítico & iniciativa',
    },
    {
      key: 'constitution',
      label: 'Constituição',
      total: eff?.constitution ?? character.constitution,
      bonus: eff?.bonus_constitution ?? 0,
      desc: '+12 HP & defesa',
    },
    {
      key: 'spirit_power',
      label: 'Poder Espiritual',
      total: eff?.spirit_power ?? character.spirit_power,
      bonus: eff?.bonus_spirit_power ?? 0,
      desc: 'Dano espiritual',
    },
  ];

  const filterOptions: { key: ItemFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'weapon', label: 'Armas' },
    { key: 'armor', label: 'Armaduras' },
    { key: 'accessory', label: 'Acessórios' },
    { key: 'consumable', label: 'Pílulas' },
  ];

  return (
    <div className="lobby-shell">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <header className="topbar" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
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
          {combat && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.18rem 0.55rem',
                borderRadius: '999px',
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
              }}
            >
              CP {combat.combat_power.toLocaleString('pt-BR')}
            </span>
          )}
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
        {/* COLUNA 1: FICHA VITAL, STATUS DERIVADOS & ATRIBUTOS */}
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

          {/* HP + Botão de Cura Rápida */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
              <span>Vitalidade (HP)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong>
                  {character.hp} / {displayMaxHp}
                </strong>
                {healingPotionEntry && character.hp < displayMaxHp && (
                  <button
                    type="button"
                    disabled={useItemMutation.isPending}
                    onClick={() => {
                      useItemMutation.mutate(healingPotionEntry.id, {
                        onSuccess: (d) => showToast('success', d.message),
                        onError: (err) => showToast('error', getErrorMessage(err)),
                      });
                    }}
                    title={`Usar ${healingPotionEntry.item.name}`}
                    style={{
                      padding: '0.12rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--jade-accent)',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--jade-accent)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    +Curar ({healingPotionEntry.quantity})
                  </button>
                )}
              </div>
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

          {/* Energia */}
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

          {/* XP de Nível (Combate) */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
              <span>XP de Nível (Combate)</span>
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

          {/* Qi de Cultivo (Patente do Reino) */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
              <span style={{ color: '#c084fc' }}>Qi de Patente ({character.cultivation_rank?.title})</span>
              <strong>
                {cultivationXp.toLocaleString('pt-BR')}
                {nextRankTarget ? ` / ${nextRankTarget.toLocaleString('pt-BR')}` : ' (MÁX)'}
              </strong>
            </div>
            <div style={{ height: '8px', background: 'var(--bg-void)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${rankProgressPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #7e22ce, #c084fc)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Status Derivados de Combate */}
          {combat && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginBottom: '0.9rem',
                background: 'var(--bg-void)',
                padding: '0.6rem',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Ataque</div>
                <strong style={{ fontSize: '0.92rem', color: '#f87171' }}>{combat.attack}</strong>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Defesa</div>
                <strong style={{ fontSize: '0.92rem', color: '#60a5fa' }}>{combat.defense}</strong>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Crítico</div>
                <strong style={{ fontSize: '0.92rem', color: '#fbbf24' }}>{combat.crit_chance_pct}%</strong>
              </div>
            </div>
          )}

          {/* Moedas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.1rem' }}>
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

          {/* Atributos & Alocação (+1 / +5) */}
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
                  gap: '0.35rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{item.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {item.total}{' '}
                    {item.bonus > 0 && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--jade-accent)' }}>
                        (+{item.bonus})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>{item.desc}</div>
                </div>

                {character.stat_points > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button
                      type="button"
                      aria-label={`Aumentar ${item.label}`}
                      disabled={allocateStatMutation.isPending}
                      onClick={() => handleAllocateStat(item.key, 1)}
                      style={{
                        minWidth: '34px',
                        height: '30px',
                        borderRadius: '6px',
                        border: '1px solid var(--gold-primary)',
                        background: 'rgba(212, 175, 55, 0.15)',
                        color: 'var(--gold-primary)',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      +1
                    </button>
                    {character.stat_points >= 5 && (
                      <button
                        type="button"
                        aria-label={`Aumentar ${item.label} em 5`}
                        disabled={allocateStatMutation.isPending}
                        onClick={() => handleAllocateStat(item.key, 5)}
                        style={{
                          minWidth: '34px',
                          height: '24px',
                          borderRadius: '6px',
                          border: '1px solid rgba(56, 189, 248, 0.5)',
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                      >
                        +5
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* COLUNA 2: ABAS DO MUNDO */}
        <section className="auth-card" style={{ maxWidth: '100%' }}>
          <div
            className="auth-tabs"
            role="tablist"
            style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.2rem' }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'cultivate'}
              className={`auth-tab ${activeTab === 'cultivate' ? 'active' : ''}`}
              style={{ fontSize: '0.8rem', padding: '0 0.25rem' }}
              onClick={() => setActiveTab('cultivate')}
            >
              🧘 Cultivo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'hunt'}
              className={`auth-tab ${activeTab === 'hunt' ? 'active' : ''}`}
              style={{ fontSize: '0.8rem', padding: '0 0.25rem' }}
              onClick={() => setActiveTab('hunt')}
            >
              ⚔️ Caça
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'bag'}
              className={`auth-tab ${activeTab === 'bag' ? 'active' : ''}`}
              style={{ fontSize: '0.8rem', padding: '0 0.25rem' }}
              onClick={() => setActiveTab('bag')}
            >
              🎒 Mochila ({inventory.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'shop'}
              className={`auth-tab ${activeTab === 'shop' ? 'active' : ''}`}
              style={{ fontSize: '0.8rem', padding: '0 0.25rem' }}
              onClick={() => setActiveTab('shop')}
            >
              🏛️ Mercado
            </button>
          </div>

          {/* ABA 1: CULTIVO DE PATENTE (REFINO DE PEDRAS + COOLDOWN + FADIGA) */}
          {activeTab === 'cultivate' && (
            <div className="form-stack">
              <h3 style={{ fontSize: '1.15rem' }}>Câmara de Refino Espiritual</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Refine <strong>Pedras Espirituais</strong> para absorver <strong>Qi de Cultivo</strong> e ascender sua{' '}
                <strong>Patente do Reino</strong> (multiplicador de atributos). O nível de combate evolui apenas na Caça.
              </p>

              {/* Barra de Fadiga Espiritual */}
              <div
                style={{
                  background: 'var(--bg-void)',
                  padding: '0.8rem',
                  borderRadius: '10px',
                  border: isSaturated
                    ? '1px solid rgba(239, 68, 68, 0.5)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  <span>Fadiga Mental (-1% / 2min)</span>
                  <strong style={{ color: fatiguePct >= 70 ? '#f87171' : '#c084fc' }}>
                    {fatiguePct}% (Eficiência {efficiencyPct}%)
                  </strong>
                </div>
                <div style={{ height: '7px', background: '#111827', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${fatiguePct}%`,
                      height: '100%',
                      background:
                        fatiguePct >= 85
                          ? '#ef4444'
                          : fatiguePct >= 50
                          ? '#f59e0b'
                          : '#a855f7',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Seletor de Lote de Pedras */}
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Quantidade de Pedras para Refinar:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {[1, 3, 5, 10].map((qty) => {
                    const selected = stonesBatch === qty;
                    return (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setStonesBatch(qty)}
                        style={{
                          padding: '0.45rem 0.25rem',
                          borderRadius: '8px',
                          border: selected
                            ? '1px solid var(--gold-primary)'
                            : '1px solid rgba(255,255,255,0.1)',
                          background: selected ? 'rgba(212, 175, 55, 0.16)' : 'var(--bg-void)',
                          color: selected ? 'var(--gold-primary)' : 'var(--text-main)',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        {qty} {qty === 1 ? 'Pedra' : 'Pedras'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resumo de Custo vs Retorno */}
              <div
                style={{
                  background: 'var(--bg-void)',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.45rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Custo Pedras: </span>
                  <strong style={{ color: 'var(--gold-primary)' }}>{stonesBatch}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Custo Energia: </span>
                  <strong style={{ color: '#38bdf8' }}>{previewEnergyCost}⚡</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Cooldown: </span>
                  <strong>{previewCooldownSec}s</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Ganho Qi: </span>
                  <strong style={{ color: '#c084fc' }}>+{previewQiGain} Qi</strong>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                disabled={meditateMutation.isPending || !canMeditate}
                onClick={handleMeditate}
              >
                {meditateMutation.isPending
                  ? 'Refinando Pedras Espirituais...'
                  : cooldownLeft > 0
                  ? `Estabilizando Meridianos (${cooldownLeft}s)`
                  : isSaturated
                  ? 'Fadiga Crítica (Aguarde Descanso)'
                  : character.spirit_stones < stonesBatch
                  ? `Pedras Insuficientes (${stonesBatch})`
                  : character.energy < previewEnergyCost
                  ? `Energia Insuficiente (${previewEnergyCost}⚡)`
                  : `Meditar & Refinar (-${stonesBatch} Pedras | -${previewEnergyCost}⚡)`}
              </button>

              {battleHistory.length > 0 && (
                <div style={{ marginTop: '0.6rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Últimas Expedições
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {battleHistory.slice(0, 5).map((h) => (
                      <div
                        key={h.id}
                        style={{
                          background: 'var(--bg-void)',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>
                          {h.outcome === 'victory' ? '🏆' : '💀'} {h.monster?.name ?? 'Besta'}
                        </span>
                        <span style={{ color: h.outcome === 'victory' ? 'var(--jade-accent)' : '#fca5a5' }}>
                          {h.outcome === 'victory' ? `+${h.xp_gained} XP` : 'Derrota'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: CAÇA PVE COM PREVIEW DE DROPS E DIFICULDADE */}
          {activeTab === 'hunt' && (
            <div className="form-stack">
              <h3 style={{ fontSize: '1.15rem' }}>Territórios de Caça</h3>

              {isLoadingMonsters ? (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Rastreando bestas...</p>
              ) : (
                <div className="form-stack">
                  {monsters.map((monster) => {
                    const canAfford = character.energy >= monster.energy_cost && character.hp > 0;
                    const levelDiff = monster.recommended_level - character.level;
                    const diffBadge =
                      levelDiff <= 0
                        ? { label: 'Fácil', color: 'var(--jade-accent)' }
                        : levelDiff <= 2
                        ? { label: 'Equilibrado', color: '#fbbf24' }
                        : { label: 'Perigoso', color: '#f87171' };

                    return (
                      <div
                        key={monster.id}
                        style={{
                          background: 'var(--bg-void)',
                          padding: '0.85rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                          <strong style={{ fontSize: '0.94rem' }}>{monster.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: diffBadge.color, fontWeight: 700 }}>
                            Nv.{monster.recommended_level} • {diffBadge.label}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {monster.zone_name} • HP {monster.max_hp} • ATQ {monster.attack} • DEF {monster.defense}
                        </div>

                        {monster.drops && monster.drops.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' }}>
                            {monster.drops.map((d) =>
                              d.item ? (
                                <span
                                  key={d.id}
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '6px',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: RARITY_COLORS[d.item.rarity],
                                  }}
                                >
                                  🎁 {d.item.name} ({d.drop_chance_pct}%)
                                </span>
                              ) : null
                            )}
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '0.7rem',
                          }}
                        >
                          <span style={{ fontSize: '0.76rem', color: '#9ca3af' }}>
                            +{monster.xp_reward} XP • +{monster.spirit_stones_reward} Pedras
                          </span>

                          <button
                            type="button"
                            disabled={huntMutation.isPending || !canAfford}
                            onClick={() => handleHunt(monster.id)}
                            style={{
                              minHeight: '38px',
                              padding: '0 0.85rem',
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
                      {lastBattle.outcome === 'victory' ? '🏆 Vitória em Combate!' : '💀 Derrota!'}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {lastBattle.rounds} rodadas
                    </span>
                  </div>

                  {lastBattle.outcome === 'victory' && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--gold-primary)', marginBottom: '0.45rem' }}>
                      +{lastBattle.xp_gained} XP • +{lastBattle.spirit_stones_gained} Pedras
                      {lastBattle.items_dropped && lastBattle.items_dropped.length > 0 && (
                        <div style={{ color: '#38bdf8', marginTop: '0.2rem' }}>
                          🎁 Espólio:{' '}
                          {lastBattle.items_dropped
                            .map((d) => `${d.quantity}x ${d.name}`)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      maxHeight: '130px',
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
          )}

          {/* ABA 3: MOCHILA COM SLOTS EQUIPADOS & FILTROS */}
          {activeTab === 'bag' && (
            <div className="form-stack">
              <h3 style={{ fontSize: '1.15rem' }}>Equipamentos Ativos</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {equippedSlots.map(({ slot, label, equipped }) => (
                  <div
                    key={slot}
                    style={{
                      background: 'var(--bg-void)',
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: equipped
                        ? `1px solid ${RARITY_COLORS[equipped.item.rarity]}66`
                        : '1px dashed rgba(255,255,255,0.12)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '84px',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</div>
                    {equipped ? (
                      <>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: RARITY_COLORS[equipped.item.rarity],
                            margin: '0.2rem 0',
                          }}
                        >
                          {equipped.item.name}
                        </div>
                        <button
                          type="button"
                          disabled={equipMutation.isPending}
                          onClick={() =>
                            equipMutation.mutate(equipped.id, {
                              onSuccess: (d) => showToast('success', d.message),
                              onError: (err) => showToast('error', getErrorMessage(err)),
                            })
                          }
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          Remover
                        </button>
                      </>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '0.3rem' }}>
                        Vazio
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {filterOptions.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setBagFilter(f.key)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '999px',
                      border: 'none',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: bagFilter === f.key ? 'var(--gold-primary)' : 'var(--bg-void)',
                      color: bagFilter === f.key ? '#090b10' : 'var(--text-muted)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {isLoadingInventory ? (
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Abrindo anel espacial...</p>
              ) : filteredInventory.length === 0 ? (
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                  Nenhum item nesta categoria.
                </p>
              ) : (
                <div className="form-stack">
                  {filteredInventory.map((entry) => {
                    const { item } = entry;
                    const rColor = RARITY_COLORS[item.rarity];

                    return (
                      <div
                        key={entry.id}
                        style={{
                          background: 'var(--bg-void)',
                          padding: '0.85rem',
                          borderRadius: '12px',
                          border: entry.is_equipped
                            ? '1px solid var(--gold-primary)'
                            : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: rColor, fontSize: '0.94rem' }}>
                            {item.name} {entry.quantity > 1 ? `(x${entry.quantity})` : ''}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {entry.is_equipped ? '✅ Equipado' : TYPE_LABELS[item.type]}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.76rem', color: 'var(--jade-accent)', marginTop: '0.2rem' }}>
                          {formatItemStats(item)}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                          {item.type === 'consumable' ? (
                            <button
                              type="button"
                              disabled={useItemMutation.isPending}
                              onClick={() => {
                                useItemMutation.mutate(entry.id, {
                                  onSuccess: (d) => showToast('success', d.message),
                                  onError: (err) => showToast('error', getErrorMessage(err)),
                                });
                              }}
                              style={{
                                minHeight: '36px',
                                padding: '0 0.85rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'var(--jade-accent)',
                                color: '#090b10',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                              }}
                            >
                              Usar
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={equipMutation.isPending}
                              onClick={() => {
                                equipMutation.mutate(entry.id, {
                                  onSuccess: (d) => showToast('success', d.message),
                                  onError: (err) => showToast('error', getErrorMessage(err)),
                                });
                              }}
                              style={{
                                minHeight: '36px',
                                padding: '0 0.85rem',
                                borderRadius: '8px',
                                border: '1px solid var(--gold-primary)',
                                background: entry.is_equipped ? 'transparent' : 'var(--gold-primary)',
                                color: entry.is_equipped ? 'var(--gold-primary)' : '#090b10',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                              }}
                            >
                              {entry.is_equipped ? 'Desequipar' : `Equipar (Nv.${item.required_level})`}
                            </button>
                          )}

                          {!entry.is_equipped && (
                            <button
                              type="button"
                              disabled={sellMutation.isPending}
                              onClick={() => {
                                sellMutation.mutate(entry.id, {
                                  onSuccess: (d) => showToast('success', d.message),
                                  onError: (err) => showToast('error', getErrorMessage(err)),
                                });
                              }}
                              style={{
                                minHeight: '36px',
                                padding: '0 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                              }}
                            >
                              Vender (+{item.sell_price})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 4: MERCADO COM FILTROS & COMPRA EM LOTE */}
          {activeTab === 'shop' && (
            <div className="form-stack">
              <h3 style={{ fontSize: '1.15rem' }}>Pavilhão de Tesouros</h3>

              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {filterOptions.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setShopFilter(f.key)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '999px',
                      border: 'none',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: shopFilter === f.key ? 'var(--gold-primary)' : 'var(--bg-void)',
                      color: shopFilter === f.key ? '#090b10' : 'var(--text-muted)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {isLoadingInventory ? (
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Carregando catálogo...</p>
              ) : (
                <div className="form-stack">
                  {filteredShop.map((item) => {
                    const canBuy1 = character.spirit_stones >= item.buy_price;
                    const canBuy5 = character.spirit_stones >= item.buy_price * 5;
                    const rColor = RARITY_COLORS[item.rarity];

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: 'var(--bg-void)',
                          padding: '0.85rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: rColor, fontSize: '0.94rem' }}>{item.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {TYPE_LABELS[item.type]} • Nv.{item.required_level}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {item.description}
                        </p>

                        <div style={{ fontSize: '0.76rem', color: 'var(--jade-accent)', marginTop: '0.25rem' }}>
                          {formatItemStats(item)}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '0.65rem',
                            gap: '0.4rem',
                          }}
                        >
                          <strong style={{ fontSize: '0.82rem', color: 'var(--gold-primary)' }}>
                            {item.buy_price} Pedras
                          </strong>

                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              disabled={buyMutation.isPending || !canBuy1}
                              onClick={() => {
                                buyMutation.mutate(
                                  { item_id: item.id, quantity: 1 },
                                  {
                                    onSuccess: (d) => showToast('success', d.message),
                                    onError: (err) => showToast('error', getErrorMessage(err)),
                                  }
                                );
                              }}
                              style={{
                                minHeight: '36px',
                                padding: '0 0.85rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: canBuy1 ? 'var(--gold-primary)' : '#374151',
                                color: canBuy1 ? '#090b10' : '#9ca3af',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: canBuy1 ? 'pointer' : 'not-allowed',
                              }}
                            >
                              Comprar x1
                            </button>

                            {item.type === 'consumable' && (
                              <button
                                type="button"
                                disabled={buyMutation.isPending || !canBuy5}
                                onClick={() => {
                                  buyMutation.mutate(
                                    { item_id: item.id, quantity: 5 },
                                    {
                                      onSuccess: (d) => showToast('success', d.message),
                                      onError: (err) => showToast('error', getErrorMessage(err)),
                                    }
                                  );
                                }}
                                style={{
                                  minHeight: '36px',
                                  padding: '0 0.7rem',
                                  borderRadius: '8px',
                                  border: '1px solid var(--gold-primary)',
                                  background: 'transparent',
                                  color: canBuy5 ? 'var(--gold-primary)' : '#6b7280',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  cursor: canBuy5 ? 'pointer' : 'not-allowed',
                                }}
                              >
                                x5
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
