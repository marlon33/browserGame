export interface GameServer {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: 'online' | 'maintenance' | 'full';
  max_players: number;
  characters_count?: number;
  xp_multiplier: number;
  drop_multiplier: number;
}

export interface Realm {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  primary_color: string;
  passive_bonuses: Record<string, number> | null;
}

export interface CultivationRank {
  id: number;
  tier_order: number;
  realm_tier: string;
  stars: number;
  title: string;
  badge_color: string;
  required_xp: number;
  stat_multiplier: number;
  bonus_max_energy: number;
}

export interface NextRankInfo {
  id: number;
  title: string;
  required_xp: number;
  stat_multiplier: number;
}

export interface MeditationStatus {
  cooldown_remaining_seconds: number;
  cooldown_until: string | null;
  fatigue_pct: number;
  efficiency_pct: number;
  is_saturated: boolean;
}

export interface EffectiveStats {
  strength: number;
  agility: number;
  constitution: number;
  spirit_power: number;
  max_hp: number;
  bonus_strength: number;
  bonus_agility: number;
  bonus_constitution: number;
  bonus_spirit_power: number;
  bonus_max_hp: number;
}

export interface CombatSummary {
  attack: number;
  defense: number;
  crit_chance_pct: number;
  combat_power: number;
}

export interface Character {
  id: number;
  user_id: number;
  game_server_id: number;
  realm_id: number;
  cultivation_rank_id: number;
  name: string;
  level: number;
  experience: number;
  cultivation_xp: number;
  next_level_xp?: number;
  next_rank_info?: NextRankInfo | null;
  meditation_status?: MeditationStatus;
  hp: number;
  max_hp: number;
  energy: number;
  max_energy: number;
  last_energy_sync_at: string;
  spirit_stones: number;
  jade_tokens: number;
  strength: number;
  agility: number;
  constitution: number;
  spirit_power: number;
  stat_points: number;
  effective_stats?: EffectiveStats;
  combat_summary?: CombatSummary;
  server?: GameServer;
  realm?: Realm;
  cultivation_rank?: CultivationRank;
}

export interface WorldBootstrapResponse {
  servers: GameServer[];
  realms: Realm[];
  characters: Character[];
  initial_rank: CultivationRank | null;
}

export interface MonsterDropPreview {
  id: number;
  monster_id: number;
  item_id: number;
  drop_chance_pct: number;
  min_quantity: number;
  max_quantity: number;
  item?: {
    id: number;
    name: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    type: 'weapon' | 'armor' | 'accessory' | 'consumable';
  };
}

export interface MonsterMastery {
  tier: number;
  label: string;
  damage_bonus_pct: number;
  drop_bonus_pct: number;
  next_target: number | null;
}

export interface MonsterBestiaryInfo {
  kills_count: number;
  mastery: MonsterMastery;
  can_sweep: boolean;
  boss_cooldown_until: string | null;
  boss_cooldown_remaining: number;
}

export interface Monster {
  id: number;
  slug: string;
  region_slug: string;
  region_order: number;
  name: string;
  zone_name: string;
  recommended_level: number;
  is_boss: boolean;
  boss_cooldown_seconds: number;
  energy_cost: number;
  max_hp: number;
  attack: number;
  defense: number;
  agility: number;
  xp_reward: number;
  spirit_stones_reward: number;
  cultivation_qi_reward: number;
  drops?: MonsterDropPreview[];
  bestiary?: MonsterBestiaryInfo;
}

export interface CombatLogEntry {
  round: number;
  actor: 'player' | 'monster' | 'system';
  damage: number;
  crit: boolean;
  target_hp?: number;
  text: string;
}

export interface DroppedItemSummary {
  item_id: number;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  quantity: number;
}

export interface HuntResult {
  outcome: 'victory' | 'defeat';
  fights_completed: number;
  rounds: number;
  xp_gained: number;
  spirit_stones_gained: number;
  qi_gained: number;
  items_dropped?: DroppedItemSummary[];
  levels_gained: number;
  rank_up_title: string | null;
  combat_log: CombatLogEntry[];
  battle_id: number;
  bestiary?: {
    monster_id: number;
    kills_count: number;
    mastery: MonsterMastery;
    boss_cooldown_until: string | null;
  };
  character: Character;
}

export type TacticalActionType = 'heal' | 'buff' | 'debuff' | 'physical' | 'magic' | 'pass';

export interface ActiveBattle {
  id: number;
  character_id: number;
  monster_id: number;
  status: 'active' | 'victory' | 'defeat';
  current_turn: 'player' | 'monster';
  round: number;
  player_hp: number;
  player_max_hp: number;
  monster_hp: number;
  monster_max_hp: number;
  turn_actions_used: {
    heal?: boolean;
    support?: boolean;
  };
  active_effects: {
    player_buff_turns?: number;
    monster_debuff_turns?: number;
  };
  combat_log: CombatLogEntry[];
  rewards_summary?: {
    outcome: 'victory' | 'defeat';
    xp_gained: number;
    spirit_stones_gained: number;
    qi_gained: number;
    levels_gained: number;
    items_dropped: DroppedItemSummary[];
  } | null;
  turn_expires_at: string | null;
  turn_remaining_seconds: number;
  monster?: Monster;
}

export interface BattleHistoryEntry {
  id: number;
  outcome: 'victory' | 'defeat';
  rounds: number;
  xp_gained: number;
  spirit_stones_gained: number;
  created_at: string;
  monster?: {
    id: number;
    name: string;
    zone_name: string;
    recommended_level: number;
    is_boss?: boolean;
  };
}

export interface Item {
  id: number;
  slug: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  required_level: number;
  buy_price: number;
  sell_price: number;
  is_purchasable: boolean;
  bonus_strength: number;
  bonus_agility: number;
  bonus_constitution: number;
  bonus_spirit_power: number;
  bonus_max_hp: number;
  heal_hp: number;
  restore_energy: number;
}

export interface CharacterItem {
  id: number;
  character_id: number;
  item_id: number;
  quantity: number;
  is_equipped: boolean;
  item: Item;
}

export interface QuestDefinition {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: 'story' | 'daily';
  min_level: number;
  sort_order: number;
  objective_type: 'visit_region' | 'kill_monster' | 'kill_any' | 'reach_level' | 'collect_item';
  target_region_slug: string | null;
  target_monster_id: number | null;
  target_item_id: number | null;
  target_count: number;
  reward_xp: number;
  reward_spirit_stones: number;
  reward_cultivation_qi: number;
  reward_jade_tokens: number;
  reward_item_id: number | null;
  reward_item_quantity: number;
  target_monster?: {
    id: number;
    name: string;
    zone_name: string;
  } | null;
  target_item?: {
    id: number;
    name: string;
    rarity: Item['rarity'];
  } | null;
  reward_item?: {
    id: number;
    name: string;
    rarity: Item['rarity'];
  } | null;
}

export interface CharacterQuestEntry {
  id: number;
  character_id: number;
  quest_id: number;
  daily_date: string | null;
  current_count: number;
  status: 'in_progress' | 'completed' | 'claimed';
  completed_at: string | null;
  claimed_at: string | null;
  quest: QuestDefinition;
}
