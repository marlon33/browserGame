import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AccountLobby } from '@/components/lobby/AccountLobby';
import { CharacterHud } from '@/components/game/CharacterHud';
import { renderWithClient } from '@/test/test-utils';
import { api } from '@/lib/api';
import type { Character } from '@/types/game';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const mockCharacter: Character = {
  id: 10,
  user_id: 1,
  game_server_id: 1,
  realm_id: 1,
  cultivation_rank_id: 1,
  name: 'NieLi',
  level: 1,
  experience: 0,
  hp: 126,
  max_hp: 126,
  energy: 85,
  max_energy: 100,
  last_energy_sync_at: new Date().toISOString(),
  spirit_stones: 150,
  jade_tokens: 0,
  strength: 11,
  agility: 10,
  constitution: 10,
  spirit_power: 10,
  stat_points: 2,
  server: {
    id: 1,
    code: 'S1',
    name: 'Vale do Dragão Celestial',
    description: null,
    status: 'online',
    max_players: 5000,
    xp_multiplier: 1,
    drop_multiplier: 1,
  },
  realm: {
    id: 1,
    slug: 'solar_empire',
    name: 'Império Solar',
    tagline: 'Ordem e Glória',
    description: 'Guerreiros solares',
    primary_color: '#eab308',
    passive_bonuses: { strength_pct: 5 },
  },
  cultivation_rank: {
    id: 1,
    tier_order: 1,
    realm_tier: 'Bronze',
    stars: 1,
    title: 'Bronze 1 Estrela',
    badge_color: '#cd7f32',
    required_xp: 0,
    stat_multiplier: 1,
    bonus_max_energy: 0,
  },
};

describe('AccountLobby e CharacterHud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega servidores/reinos e permite criar personagem', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        servers: [mockCharacter.server],
        realms: [mockCharacter.realm],
        characters: [],
        initial_rank: mockCharacter.cultivation_rank,
      },
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        message: 'Personagem criado com sucesso!',
        character: mockCharacter,
      },
    });

    const onEnterWorld = vi.fn();
    renderWithClient(<AccountLobby onEnterWorld={onEnterWorld} />);

    await waitFor(() => {
      expect(screen.getByText(/Vale do Dragão Celestial/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Nome do Personagem/i), {
      target: { value: 'NieLi' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Criar Personagem e Entrar/i }));

    await waitFor(() => {
      expect(onEnterWorld).toHaveBeenCalledWith(mockCharacter);
    });
  });

  it('exibe patente, recursos e atributos no CharacterHud', () => {
    const onSwitch = vi.fn();
    const onLogout = vi.fn();

    renderWithClient(
      <CharacterHud
        character={mockCharacter}
        onSwitchCharacter={onSwitch}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText('NieLi')).toBeInTheDocument();
    expect(screen.getByText('Bronze 1 Estrela')).toBeInTheDocument();
    expect(screen.getByText('126 / 126')).toBeInTheDocument();
    expect(screen.getByText('85 / 100')).toBeInTheDocument();
    expect(screen.getByText('+2 pts disponíveis')).toBeInTheDocument();
  });
});
