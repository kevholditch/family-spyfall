export interface Player {
  id: string;
  name: string;
  secret: string;
  isHost: boolean;
  isConnected: boolean;
  role?: 'spy' | 'civilian';
  location?: string;
  score: number;
  hasAskedQuestion?: boolean;
}

export interface RoundResult {
  spyGuessedCorrectly: boolean;
  civiliansWon: boolean;
  spyGuess?: string;
  correctLocation: string;
  pointsAwarded: Record<string, number>; // playerId -> points awarded this round
  // Computed display data (server calculates these for frontend to display)
  spyName: string;
  spyId: string;
  correctVotersCount: number; // How many civilians voted correctly
  totalCiviliansCount: number; // Total number of civilians
  correctVoterNames: string[]; // Names of civilians who voted correctly
}

export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  roundNumber: number;
  status: 'waiting' | 'playing' | 'accusing' | 'round_summary' | 'finished';
  currentLocation?: string;
  accuseMode?: {
    spyLocationGuess?: string;
    playerVotes: Record<string, string>; // voterId -> accused playerId
  };
  roundResult?: RoundResult;
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
  type: 'player_joined' | 'player_left' | 'round_started' | 'turn_advanced' | 'accuse_mode_started' | 'vote_cast' | 'spy_guess_submitted' | 'round_summary' | 'round_ended' | 'game_finished' | 'scores_updated';
  data: any;
}

export interface SocketEvents {
  // Client to Server
  join_game: (data: { gameId: string; playerName: string; playerId?: string; secret?: string; isHost?: boolean }) => void;
  start_round: () => void;
  next_turn: () => void;
  submit_spy_guess: (data: { locationGuess: string }) => void;
  submit_player_vote: (data: { accusedPlayerId: string }) => void;
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
