export interface Player {
  id: string;
  name: string;
  secret: string;
  isHost: boolean;
  isConnected: boolean;
  role?: 'spy' | 'civilian';
  location?: string;
}

export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  roundNumber: number;
  status: 'waiting' | 'playing' | 'voting' | 'finished';
  currentLocation?: string;
  accusation?: {
    accusedPlayerId: string;
    votes: Record<string, boolean>;
  };
  createdAt: number;
  lastActivity: number;
}

export interface JoinRequest {
  playerName: string;
  isHost?: boolean;
}

export interface JoinResponse {
  success: boolean;
  playerId?: string;
  secret?: string;
  error?: string;
}

export interface GameUpdate {
  type: 'player_joined' | 'player_left' | 'round_started' | 'turn_advanced' | 'accusation_started' | 'vote_cast' | 'round_ended' | 'game_finished';
  data: any;
}

export interface SocketEvents {
  // Client to Server
  join_game: (data: { gameId: string; playerName: string; playerId?: string; secret?: string }) => void;
  start_round: () => void;
  advance_turn: () => void;
  accuse_player: (data: { accusedPlayerId: string }) => void;
  vote: (data: { vote: boolean }) => void;
  cancel_accusation: () => void;
  end_round: () => void;
  
  // Server to Client
  game_update: (update: GameUpdate) => void;
  role_assignment: (data: { role: 'spy' | 'civilian'; location?: string }) => void;
  error: (data: { message: string }) => void;
}

export interface Location {
  name: string;
  category: string;
}

export const SPYFALL_LOCATIONS: Location[] = [
  { name: 'Airplane', category: 'Transportation' },
  { name: 'Bank', category: 'Business' },
  { name: 'Beach', category: 'Leisure' },
  { name: 'Casino', category: 'Entertainment' },
  { name: 'Circus', category: 'Entertainment' },
  { name: 'Corporate Party', category: 'Business' },
  { name: 'Cruise Ship', category: 'Transportation' },
  { name: 'Day Spa', category: 'Leisure' },
  { name: 'Embassy', category: 'Government' },
  { name: 'Hospital', category: 'Public Service' },
  { name: 'Hotel', category: 'Business' },
  { name: 'Military Base', category: 'Government' },
  { name: 'Movie Studio', category: 'Entertainment' },
  { name: 'Ocean Liner', category: 'Transportation' },
  { name: 'Passenger Train', category: 'Transportation' },
  { name: 'Pirate Ship', category: 'Transportation' },
  { name: 'Polar Station', category: 'Research' },
  { name: 'Police Station', category: 'Public Service' },
  { name: 'Restaurant', category: 'Business' },
  { name: 'School', category: 'Education' },
  { name: 'Service Station', category: 'Business' },
  { name: 'Space Station', category: 'Research' },
  { name: 'Submarine', category: 'Transportation' },
  { name: 'Supermarket', category: 'Business' },
  { name: 'Theater', category: 'Entertainment' },
  { name: 'University', category: 'Education' },
  { name: 'Wedding', category: 'Social' },
  { name: 'Zoo', category: 'Leisure' }
];
