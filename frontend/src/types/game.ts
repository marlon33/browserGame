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
