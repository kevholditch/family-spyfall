import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { GameManager } from '../../src/game/GameManager';

describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    gameManager = new GameManager();
  });

  describe('createGame', () => {
    it('should create a game with valid ID format', () => {
      const gameId = gameManager.createGame();
      expect(gameId).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should create unique game IDs', () => {
      const gameIds = new Set();
      for (let i = 0; i < 100; i++) {
        const gameId = gameManager.createGame();
        expect(gameIds.has(gameId)).toBe(false);
        gameIds.add(gameId);
      }
    });
  });

  describe('addPlayer', () => {
    it('should add first player as host', () => {
      const gameId = gameManager.createGame();
      const result = gameManager.addPlayer(gameId, 'Alice', false);
      
      expect(result).toBeTruthy();
      expect(result?.playerId).toBeTruthy();
      expect(result?.secret).toBeTruthy();
      
      const game = gameManager.getGame(gameId);
      expect(game?.players).toHaveLength(1);
      expect(game?.players[0].name).toBe('Alice');
      expect(game?.players[0].isHost).toBe(true); // First player becomes host
    });

    it('should not add player with duplicate name', () => {
      const gameId = gameManager.createGame();
      gameManager.addPlayer(gameId, 'Alice');
      const result = gameManager.addPlayer(gameId, 'Alice');
      
      expect(result).toBeNull();
    });

    it('should not add player with duplicate name (case insensitive)', () => {
      const gameId = gameManager.createGame();
      gameManager.addPlayer(gameId, 'Alice');
      const result = gameManager.addPlayer(gameId, 'alice');
      
      expect(result).toBeNull();
    });

    it('should enforce maximum player limit', () => {
      const gameId = gameManager.createGame();
      
      // Add 12 players (max limit)
      for (let i = 0; i < 12; i++) {
        const result = gameManager.addPlayer(gameId, `Player${i}`);
        expect(result).toBeTruthy();
      }
      
      // 13th player should be rejected
      const result = gameManager.addPlayer(gameId, 'Player13');
      expect(result).toBeNull();
    });
  });

  describe('startRound', () => {
    it('should require at least 3 players to start', () => {
      const gameId = gameManager.createGame();
      
      // Add only 2 players
      gameManager.addPlayer(gameId, 'Alice');
      gameManager.addPlayer(gameId, 'Bob');
      
      const result = gameManager.startRound(gameId);
      expect(result).toBe(false);
    });

    it('should assign exactly one spy', () => {
      const gameId = gameManager.createGame();
      
      // Add 5 players
      for (let i = 0; i < 5; i++) {
        gameManager.addPlayer(gameId, `Player${i}`);
      }
      
      const result = gameManager.startRound(gameId);
      expect(result).toBe(true);
      
      const game = gameManager.getGame(gameId);
      const spies = game?.players.filter(p => p.role === 'spy');
      expect(spies).toHaveLength(1);
    });

    it('should assign location to all civilians', () => {
      const gameId = gameManager.createGame();
      
      // Add 5 players
      for (let i = 0; i < 5; i++) {
        gameManager.addPlayer(gameId, `Player${i}`);
      }
      
      gameManager.startRound(gameId);
      const game = gameManager.getGame(gameId);
      
      const civilians = game?.players.filter(p => p.role === 'civilian');
      civilians?.forEach(civilian => {
        expect(civilian.location).toBeTruthy();
      });
    });

    it('should not assign location to spy', () => {
      const gameId = gameManager.createGame();
      
      // Add 5 players
      for (let i = 0; i < 5; i++) {
        gameManager.addPlayer(gameId, `Player${i}`);
      }
      
      gameManager.startRound(gameId);
      const game = gameManager.getGame(gameId);
      
      const spy = game?.players.find(p => p.role === 'spy');
      expect(spy?.location).toBeUndefined();
    });
  });

  describe('advanceTurn', () => {
    it('should advance to next player', () => {
      const gameId = gameManager.createGame();
      
      gameManager.addPlayer(gameId, 'Alice');
      gameManager.addPlayer(gameId, 'Bob');
      gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      const game = gameManager.getGame(gameId);
      expect(game?.currentPlayerIndex).toBe(0);
      
      gameManager.advanceTurn(gameId);
      expect(game?.currentPlayerIndex).toBe(1);
      
      gameManager.advanceTurn(gameId);
      expect(game?.currentPlayerIndex).toBe(2);
      
      gameManager.advanceTurn(gameId);
      expect(game?.currentPlayerIndex).toBe(0); // Wrap around
    });

    it('should skip disconnected players', () => {
      const gameId = gameManager.createGame();
      
      gameManager.addPlayer(gameId, 'Alice');
      gameManager.addPlayer(gameId, 'Bob');
      gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      const game = gameManager.getGame(gameId);
      if (game) {
        game.players[1].isConnected = false; // Bob is disconnected
      }
      
      gameManager.advanceTurn(gameId);
      expect(game?.currentPlayerIndex).toBe(2); // Skip Bob, go to Charlie
    });
  });

  describe('accusation and voting', () => {
    it('should start accusation', () => {
      const gameId = gameManager.createGame();
      
      gameManager.addPlayer(gameId, 'Alice');
      gameManager.addPlayer(gameId, 'Bob');
      gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      const game = gameManager.getGame(gameId);
      const result = gameManager.startAccusation(gameId, game?.players[1].id || '');
      
      expect(result).toBe(true);
      expect(game?.status).toBe('voting');
      expect(game?.accusation?.accusedPlayerId).toBe(game?.players[1].id);
    });

    it('should not allow accused player to vote', () => {
      const gameId = gameManager.createGame();
      
      gameManager.addPlayer(gameId, 'Alice');
      gameManager.addPlayer(gameId, 'Bob');
      gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      const game = gameManager.getGame(gameId);
      const accusedId = game?.players[1].id || '';
      gameManager.startAccusation(gameId, accusedId);
      
      const result = gameManager.castVote(gameId, accusedId, true);
      expect(result).toBe(false);
    });

    it('should determine voting result correctly', () => {
      const gameId = gameManager.createGame();
      
      gameManager.addPlayer(gameId, 'Alice');
      gameManager.addPlayer(gameId, 'Bob');
      gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      const game = gameManager.getGame(gameId);
      const accusedId = game?.players[1].id || '';
      const voter1Id = game?.players[0].id || '';
      const voter2Id = game?.players[2].id || '';
      
      gameManager.startAccusation(gameId, accusedId);
      gameManager.castVote(gameId, voter1Id, true);  // Guilty
      gameManager.castVote(gameId, voter2Id, false); // Innocent
      
      const result = gameManager.getVotingResult(gameId);
      expect(result?.isGuilty).toBe(false); // Tie goes to innocent
    });
  });

  describe('property-based testing with fast-check', () => {
    it('should maintain game invariants', () => {
      fc.assert(fc.property(
        fc.integer({ min: 3, max: 12 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 12 }),
        (playerCount, playerNames) => {
          const gameManager = new GameManager();
          const gameId = gameManager.createGame();
          
          // Add players
          for (let i = 0; i < playerCount; i++) {
            const result = gameManager.addPlayer(gameId, playerNames[i] || `Player${i}`);
            expect(result).toBeTruthy();
          }
          
          // Start round
          const startResult = gameManager.startRound(gameId);
          expect(startResult).toBe(true);
          
          const game = gameManager.getGame(gameId);
          expect(game).toBeTruthy();
          expect(game?.players).toHaveLength(playerCount);
          expect(game?.status).toBe('playing');
          
          // Exactly one spy
          const spies = game?.players.filter(p => p.role === 'spy');
          expect(spies).toHaveLength(1);
          
          // All civilians have location
          const civilians = game?.players.filter(p => p.role === 'civilian');
          civilians?.forEach(civilian => {
            expect(civilian.location).toBeTruthy();
          });
          
          // Spy has no location
          const spy = game?.players.find(p => p.role === 'spy');
          expect(spy?.location).toBeUndefined();
        }
      ));
    });

    it('should handle turn advancement correctly', () => {
      fc.assert(fc.property(
        fc.integer({ min: 3, max: 8 }),
        (playerCount) => {
          const gameManager = new GameManager();
          const gameId = gameManager.createGame();
          
          // Add players
          for (let i = 0; i < playerCount; i++) {
            gameManager.addPlayer(gameId, `Player${i}`);
          }
          
          gameManager.startRound(gameId);
          
          // Advance turns and verify wrap-around
          for (let i = 0; i < playerCount * 2; i++) {
            const game = gameManager.getGame(gameId);
            const expectedIndex = i % playerCount;
            expect(game?.currentPlayerIndex).toBe(expectedIndex);
            gameManager.advanceTurn(gameId);
          }
        }
      ));
    });
  });
});
