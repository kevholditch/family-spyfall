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
      isConnected: true,
      score: 0
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
    game.accuseMode = undefined;

    // Select random location
    const randomIndex = Math.floor(Math.random() * SPYFALL_LOCATIONS.length);
    const selectedLocation = SPYFALL_LOCATIONS[randomIndex].name;

    // Select random spy
    const spyIndex = Math.floor(Math.random() * game.players.length);

    // Assign roles and reset hasAskedQuestion
    game.players.forEach((player, index) => {
      player.hasAskedQuestion = false;
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

  nextTurn(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'playing') return false;

    // Mark current player as having asked a question
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer) {
      currentPlayer.hasAskedQuestion = true;
    }

    // Check if all players have asked a question
    const allPlayersAsked = game.players.every(p => p.hasAskedQuestion);
    
    if (allPlayersAsked) {
      // Transition to accuse mode
      game.status = 'accusing';
      game.accuseMode = {
        playerVotes: {}
      };
      game.lastActivity = Date.now();
      return true;
    }

    // Find next player who hasn't asked a question
    let attempts = 0;
    do {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      attempts++;
    } while (
      (game.players[game.currentPlayerIndex].hasAskedQuestion || !game.players[game.currentPlayerIndex].isConnected) 
      && attempts < game.players.length
    );

    game.lastActivity = Date.now();
    return true;
  }

  submitSpyGuess(gameId: string, playerId: string, locationGuess: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'accusing' || !game.accuseMode) return false;

    const player = game.players.find(p => p.id === playerId);
    if (!player || player.role !== 'spy') return false;

    game.accuseMode.spyLocationGuess = locationGuess;
    game.lastActivity = Date.now();

    // Check if voting is complete
    this.checkAccusePhaseComplete(game);

    return true;
  }

  submitPlayerVote(gameId: string, voterId: string, accusedPlayerId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'accusing' || !game.accuseMode) return false;

    const voter = game.players.find(p => p.id === voterId);
    if (!voter || voter.role === 'spy') return false;

    game.accuseMode.playerVotes[voterId] = accusedPlayerId;
    game.lastActivity = Date.now();

    // Check if voting is complete
    this.checkAccusePhaseComplete(game);

    return true;
  }

  private checkAccusePhaseComplete(game: GameState): void {
    if (!game.accuseMode) return;

    const spy = game.players.find(p => p.role === 'spy');
    const civilians = game.players.filter(p => p.role === 'civilian');

    // Check if spy has guessed and all civilians have voted
    const spyHasGuessed = !!game.accuseMode.spyLocationGuess;
    const allCiviliansVoted = civilians.every(c => !!game.accuseMode!.playerVotes[c.id]);

    if (spyHasGuessed && allCiviliansVoted) {
      this.processAccuseResults(game);
    }
  }

  private processAccuseResults(game: GameState): void {
    if (!game.accuseMode) return;

    const spy = game.players.find(p => p.role === 'spy');
    if (!spy) return;

    // Check if spy guessed the location correctly
    const spyWon = game.accuseMode.spyLocationGuess === game.currentLocation;

    // Count votes for each player
    const voteCounts: Record<string, number> = {};
    Object.values(game.accuseMode.playerVotes).forEach(accusedId => {
      voteCounts[accusedId] = (voteCounts[accusedId] || 0) + 1;
    });

    // Find player with most votes
    let maxVotes = 0;
    let mostAccusedId: string | null = null;
    Object.entries(voteCounts).forEach(([playerId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        mostAccusedId = playerId;
      }
    });

    const civilians = game.players.filter(p => p.role === 'civilian');
    const majorityVotes = Math.ceil(civilians.length / 2);
    const civiliansWon = mostAccusedId === spy.id && maxVotes >= majorityVotes;

    // Track points awarded this round
    const pointsAwarded: Record<string, number> = {};

    // Award points
    if (spyWon) {
      spy.score += 3;
      pointsAwarded[spy.id] = 3;
    }
    if (civiliansWon) {
      civilians.forEach(c => {
        if (game.accuseMode!.playerVotes[c.id] === spy.id) {
          c.score += 1;
          pointsAwarded[c.id] = 1;
        }
      });
    }

    game.lastActivity = Date.now();

    // If no one won, start a new question round
    if (!spyWon && !civiliansWon) {
      // Reset for new question round
      game.status = 'playing';
      game.currentPlayerIndex = 0;
      game.accuseMode = undefined;
      game.roundResult = undefined;
      game.players.forEach(p => {
        p.hasAskedQuestion = false;
      });
    } else {
      // Show round summary
      game.status = 'round_summary';
      game.roundResult = {
        spyGuessedCorrectly: spyWon,
        civiliansWon,
        spyGuess: game.accuseMode.spyLocationGuess,
        correctLocation: game.currentLocation || '',
        pointsAwarded
      };
    }
  }

  endRound(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    game.status = 'waiting';
    game.currentLocation = undefined;
    game.accuseMode = undefined;
    game.currentPlayerIndex = 0;

    // Clear roles but keep scores
    game.players.forEach(player => {
      player.role = undefined;
      player.location = undefined;
      player.hasAskedQuestion = false;
    });

    game.lastActivity = Date.now();
    return true;
  }

  getCurrentPlayer(gameId: string): Player | null {
    const game = this.games.get(gameId);
    if (!game || game.players.length === 0) return null;

    return game.players[game.currentPlayerIndex] || null;
  }

  getAccuseResults(gameId: string): { spyGuess?: string; voteCounts: Record<string, number> } | null {
    const game = this.games.get(gameId);
    if (!game || !game.accuseMode) return null;

    const voteCounts: Record<string, number> = {};
    Object.values(game.accuseMode.playerVotes).forEach(accusedId => {
      voteCounts[accusedId] = (voteCounts[accusedId] || 0) + 1;
    });

    return {
      spyGuess: game.accuseMode.spyLocationGuess,
      voteCounts
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

}
