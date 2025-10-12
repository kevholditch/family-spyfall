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
  hasAcknowledgedRole?: boolean;
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
  status: 'waiting' | 'informing_players' | 'playing' | 'accusing' | 'round_summary' | 'finished';
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
  type: 'player_joined' | 'player_left' | 'round_started' | 'informing_players' | 'player_acknowledged' | 'turn_advanced' | 'accuse_mode_started' | 'vote_cast' | 'spy_guess_submitted' | 'round_summary' | 'round_ended' | 'game_finished' | 'scores_updated';
  data: any;
}

export interface SocketEvents {
  // Client to Server
  join_game: (data: { gameId: string; playerName: string; playerId?: string; secret?: string; isHost?: boolean }) => void;
  start_round: () => void;
  acknowledge_role_info: () => void;
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
  image: string;
}

export const SPYFALL_LOCATIONS: Location[] = [
  { name: 'Airplane', image: 'assets/airplane.png' },
  { name: 'Bank', image: 'assets/bank.png' },
  { name: 'Beach', image: 'assets/beach.png' },
  { name: 'Casino', image: 'assets/casino.png' },
  { name: 'Circus', image: 'assets/circus.png' },
  { name: 'Party', image: 'assets/party.png' },
  { name: 'Cruise Ship', image: 'assets/cruise ship.png' },
  { name: 'Day Spa', image: 'assets/day spa.png' },
  { name: 'Hospital', image: 'assets/hospital.png' },
  { name: 'Hotel', image: 'assets/hotel.png' },
  { name: 'Military Base', image: 'assets/military base.png' },
  { name: 'Movie Studio', image: 'assets/movie studio.png' },
  { name: 'Train', image: 'assets/train.png' },
  { name: 'Pirate Ship', image: 'assets/pirate ship.png' },
  { name: 'Science Lab', image: 'assets/science lab.png' },
  { name: 'Police Station', image: 'assets/police station.png' },
  { name: 'Restaurant', image: 'assets/restaurant.png' },
  { name: 'School', image: 'assets/school.png' },
  { name: 'Petrol Station', image: 'assets/petrol station.png' },
  { name: 'Space Station', image: 'assets/space station.png' },
  { name: 'Submarine', image: 'assets/submarine.png' },
  { name: 'Supermarket', image: 'assets/supermarket.png' },
  { name: 'Theater', image: 'assets/theater.png' },
  { name: 'Wedding', image: 'assets/wedding.png' },
  { name: 'Zoo', image: 'assets/zoo.png' }
];
