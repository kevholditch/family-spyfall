import { v4 as uuidv4 } from 'uuid';
import { Player, GameState, SPYFALL_LOCATIONS } from '../types';

export class GameManager {
  private games = new Map<string, GameState>();

  createGame(): string {
    const gameId = this.generateGameId();
    const gameState: GameState = {
      id: gameId,
      players: [],
      currentPlayerIndex: 0,
      roundNumber: 0,
      status: 'waiting',
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.games.set(gameId, gameState);
    return gameId;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  addPlayer(gameId: string, playerName: string, isHost: boolean = false): { playerId: string; secret: string } | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    // Check if game is full (max 12 players)
    if (game.players.length >= 12) return null;

    // Check if name is already taken
    if (game.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
      return null;
    }

    const playerId = uuidv4();
    const secret = uuidv4();

    const player: Player = {
      id: playerId,
      name: playerName,
      secret,
      isHost,
      isConnected: true
    };

    game.players.push(player);
    game.lastActivity = Date.now();

    return { playerId, secret };
  }

  removePlayer(gameId: string, playerId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;

    const player = game.players[playerIndex];
    game.players.splice(playerIndex, 1);

    // If the removed player was the current player, adjust the index
    if (game.currentPlayerIndex >= game.players.length) {
      game.currentPlayerIndex = 0;
    } else if (game.currentPlayerIndex > playerIndex) {
      game.currentPlayerIndex--;
    }

    // If no players left, remove the game
    if (game.players.length === 0) {
      this.games.delete(gameId);
      return true;
    }

    // If the host left, assign a new host
    if (player.isHost && game.players.length > 0) {
      game.players[0].isHost = true;
    }

    game.lastActivity = Date.now();
    return true;
  }

  startRound(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.players.length < 1) return false;

    // Reset game state
    game.currentPlayerIndex = 0;
    game.roundNumber++;
    game.status = 'playing';
    game.currentLocation = undefined;
    game.accusation = undefined;

    // Select random location
    const randomIndex = Math.floor(Math.random() * SPYFALL_LOCATIONS.length);
    const selectedLocation = SPYFALL_LOCATIONS[randomIndex].name;

    // Select random spy
    const spyIndex = Math.floor(Math.random() * game.players.length);

    // Assign roles
    game.players.forEach((player, index) => {
      if (index === spyIndex) {
        player.role = 'spy';
        player.location = undefined; // Spy doesn't know the location
      } else {
        player.role = 'civilian';
        player.location = selectedLocation;
      }
    });

    game.currentLocation = selectedLocation;
    game.lastActivity = Date.now();

    return true;
  }

  advanceTurn(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'playing') return false;

    // Find next connected player
    let attempts = 0;
    do {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      attempts++;
    } while (!game.players[game.currentPlayerIndex].isConnected && attempts < game.players.length);

    game.lastActivity = Date.now();
    return true;
  }

  startAccusation(gameId: string, accusedPlayerId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'playing') return false;

    const accusedPlayer = game.players.find(p => p.id === accusedPlayerId);
    if (!accusedPlayer) return false;

    game.status = 'voting';
    game.accusation = {
      accusedPlayerId,
      votes: {}
    };

    game.lastActivity = Date.now();
    return true;
  }

  castVote(gameId: string, voterId: string, vote: boolean): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'voting' || !game.accusation) return false;

    // Can't vote if you're the accused player
    if (game.accusation.accusedPlayerId === voterId) return false;

    game.accusation.votes[voterId] = vote;
    game.lastActivity = Date.now();

    // Check if voting is complete
    const eligibleVoters = game.players.filter(p => p.id !== game.accusation!.accusedPlayerId);
    if (Object.keys(game.accusation.votes).length >= eligibleVoters.length) {
      this.finishVoting(game);
    }

    return true;
  }

  cancelAccusation(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'voting') return false;

    game.status = 'playing';
    game.accusation = undefined;
    game.lastActivity = Date.now();

    return true;
  }

  endRound(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    game.status = 'waiting';
    game.currentLocation = undefined;
    game.accusation = undefined;
    game.currentPlayerIndex = 0;

    // Clear roles
    game.players.forEach(player => {
      player.role = undefined;
      player.location = undefined;
    });

    game.lastActivity = Date.now();
    return true;
  }

  getCurrentPlayer(gameId: string): Player | null {
    const game = this.games.get(gameId);
    if (!game || game.players.length === 0) return null;

    return game.players[game.currentPlayerIndex] || null;
  }

  getVotingResult(gameId: string): { isGuilty: boolean; votes: { guilty: number; innocent: number } } | null {
    const game = this.games.get(gameId);
    if (!game || !game.accusation) return null;

    const votes = game.accusation.votes;
    const guilty = Object.values(votes).filter(v => v).length;
    const innocent = Object.values(votes).filter(v => !v).length;

    return {
      isGuilty: guilty > innocent,
      votes: { guilty, innocent }
    };
  }

  cleanupExpiredGames(maxAge: number): number {
    const now = Date.now();
    const expiredGames: string[] = [];

    for (const [gameId, game] of this.games.entries()) {
      if (now - game.lastActivity > maxAge) {
        expiredGames.push(gameId);
      }
    }

    for (const gameId of expiredGames) {
      this.games.delete(gameId);
    }

    return expiredGames.length;
  }

  private generateGameId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private finishVoting(game: GameState): void {
    if (!game.accusation) return;

    const result = this.getVotingResult(game.id);
    if (!result) return;

    if (result.isGuilty) {
      // Check if the accused is actually the spy
      const accusedPlayer = game.players.find(p => p.id === game.accusation!.accusedPlayerId);
      const isSpy = accusedPlayer?.role === 'spy';

      if (isSpy) {
        game.status = 'finished';
      } else {
        // Wrong accusation, spies win
        game.status = 'finished';
      }
    }

    game.lastActivity = Date.now();
  }
}
