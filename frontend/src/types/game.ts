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

export interface Character {
  id: number;
  user_id: number;
  game_server_id: number;
  realm_id: number;
  cultivation_rank_id: number;
  name: string;
  level: number;
  experience: number;
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

export interface Monster {
  id: number;
  slug: string;
  name: string;
  zone_name: string;
  recommended_level: number;
  energy_cost: number;
  max_hp: number;
  attack: number;
  defense: number;
  agility: number;
  xp_reward: number;
  spirit_stones_reward: number;
}

export interface CombatLogEntry {
  round: number;
  actor: 'player' | 'monster';
  damage: number;
  crit: boolean;
  target_hp: number;
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
  rounds: number;
  xp_gained: number;
  spirit_stones_gained: number;
  items_dropped?: DroppedItemSummary[];
  levels_gained: number;
  rank_up_title: string | null;
  combat_log: CombatLogEntry[];
  battle_id: number;
  character: Character;
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
