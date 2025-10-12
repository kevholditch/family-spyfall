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
      const result = gameManager.addPlayer(gameId, 'Alice', true);
      
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
    it('should require at least 1 player to start', () => {
      const gameId = gameManager.createGame();
      
      // Add no players
      const resultNoPlayers = gameManager.startRound(gameId);
      expect(resultNoPlayers).toBe(false);
      
      // Add 1 player
      gameManager.addPlayer(gameId, 'Alice');
      const resultOnePlayer = gameManager.startRound(gameId);
      expect(resultOnePlayer).toBe(true);
    });

    it('should set status to informing_players when round starts', () => {
      const gameId = gameManager.createGame();
      gameManager.addPlayer(gameId, 'Alice');
      gameManager.addPlayer(gameId, 'Bob');
      
      gameManager.startRound(gameId);
      const game = gameManager.getGame(gameId);
      
      expect(game?.status).toBe('informing_players');
    });

    it('should reset hasAcknowledgedRole for all players when round starts', () => {
      const gameId = gameManager.createGame();
      gameManager.addPlayer(gameId, 'Alice');
      gameManager.addPlayer(gameId, 'Bob');
      
      gameManager.startRound(gameId);
      const game = gameManager.getGame(gameId);
      
      game?.players.forEach(player => {
        expect(player.hasAcknowledgedRole).toBe(false);
      });
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

  describe('acknowledgeRoleInfo', () => {
    it('should mark player as acknowledged when they acknowledge', () => {
      const gameId = gameManager.createGame();
      const alice = gameManager.addPlayer(gameId, 'Alice');
      gameManager.addPlayer(gameId, 'Bob');
      
      gameManager.startRound(gameId);
      const game = gameManager.getGame(gameId);
      
      expect(game?.players[0].hasAcknowledgedRole).toBe(false);
      
      if (alice) {
        gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      }
      
      expect(game?.players[0].hasAcknowledgedRole).toBe(true);
    });

    it('should transition to playing when all players acknowledge', () => {
      const gameId = gameManager.createGame();
      const alice = gameManager.addPlayer(gameId, 'Alice');
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      
      gameManager.startRound(gameId);
      const game = gameManager.getGame(gameId);
      
      expect(game?.status).toBe('informing_players');
      
      // First player acknowledges - still informing
      if (alice) {
        gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      }
      expect(game?.status).toBe('informing_players');
      
      // Second player acknowledges - still informing
      if (bob) {
        gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      }
      expect(game?.status).toBe('informing_players');
      
      // Third player acknowledges - now playing
      if (charlie) {
        gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      }
      expect(game?.status).toBe('playing');
    });

    it('should not acknowledge if game is not in informing_players state', () => {
      const gameId = gameManager.createGame();
      const alice = gameManager.addPlayer(gameId, 'Alice');
      
      // Game is in waiting state
      const result = alice ? gameManager.acknowledgeRoleInfo(gameId, alice.playerId) : false;
      expect(result).toBe(false);
    });

    it('should not acknowledge if player does not exist', () => {
      const gameId = gameManager.createGame();
      gameManager.addPlayer(gameId, 'Alice');
      
      gameManager.startRound(gameId);
      
      const result = gameManager.acknowledgeRoleInfo(gameId, 'invalid-player-id');
      expect(result).toBe(false);
    });
  });

  describe('nextTurn', () => {
    it('should advance to next player', () => {
      const gameId = gameManager.createGame();
      
      const alice = gameManager.addPlayer(gameId, 'Alice');
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      
      const game = gameManager.getGame(gameId);
      expect(game?.currentPlayerIndex).toBe(0);
      
      if (alice) gameManager.nextTurn(gameId, alice.playerId);
      expect(game?.currentPlayerIndex).toBe(1);
      
      if (bob) gameManager.nextTurn(gameId, bob.playerId);
      expect(game?.currentPlayerIndex).toBe(2);
      
      // After all players have asked questions, should transition to accusing mode
      if (charlie) gameManager.nextTurn(gameId, charlie.playerId);
      expect(game?.status).toBe('accusing');
    });

    it('should skip disconnected players', () => {
      const gameId = gameManager.createGame();
      
      const alice = gameManager.addPlayer(gameId, 'Alice');
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      
      const game = gameManager.getGame(gameId);
      if (game) {
        game.players[1].isConnected = false; // Bob is disconnected
      }
      
      if (alice) gameManager.nextTurn(gameId, alice.playerId);
      expect(game?.currentPlayerIndex).toBe(2); // Skip Bob, go to Charlie
    });

    it('should not allow wrong player to advance turn', () => {
      const gameId = gameManager.createGame();
      
      const alice = gameManager.addPlayer(gameId, 'Alice');
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      
      const game = gameManager.getGame(gameId);
      expect(game?.currentPlayerIndex).toBe(0); // Alice's turn
      
      // Bob tries to advance the turn when it's Alice's turn
      if (bob) {
        const result = gameManager.nextTurn(gameId, bob.playerId);
        expect(result).toBe(false);
        expect(game?.currentPlayerIndex).toBe(0); // Still Alice's turn
      }
      
      // Alice can advance her own turn
      if (alice) {
        const result = gameManager.nextTurn(gameId, alice.playerId);
        expect(result).toBe(true);
        expect(game?.currentPlayerIndex).toBe(1); // Now Bob's turn
      }
    });

    it('should prevent double turn advance from same player', () => {
      const gameId = gameManager.createGame();
      
      const alice = gameManager.addPlayer(gameId, 'Alice');
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      
      const game = gameManager.getGame(gameId);
      expect(game?.currentPlayerIndex).toBe(0); // Alice's turn
      
      // Alice advances her turn
      if (alice) {
        const firstResult = gameManager.nextTurn(gameId, alice.playerId);
        expect(firstResult).toBe(true);
        expect(game?.currentPlayerIndex).toBe(1); // Now Bob's turn
        
        // Alice tries to advance again immediately (simulating double-click)
        const secondResult = gameManager.nextTurn(gameId, alice.playerId);
        expect(secondResult).toBe(false);
        expect(game?.currentPlayerIndex).toBe(1); // Still Bob's turn, no skip
      }
    });

    it('should not allow invalid player id to advance turn', () => {
      const gameId = gameManager.createGame();
      
      const alice = gameManager.addPlayer(gameId, 'Alice');
      const bob = gameManager.addPlayer(gameId, 'Bob');
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      
      const game = gameManager.getGame(gameId);
      expect(game?.currentPlayerIndex).toBe(0); // Alice's turn
      
      // Try to advance with invalid player id
      const result = gameManager.nextTurn(gameId, 'invalid-player-id');
      expect(result).toBe(false);
      expect(game?.currentPlayerIndex).toBe(0); // Still Alice's turn
    });
  });

  describe('accusation and voting', () => {
    it('should allow spy to submit location guess', () => {
      const gameId = gameManager.createGame();
      
      const alice = gameManager.addPlayer(gameId, 'Alice');
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      
      const game = gameManager.getGame(gameId);
      
      // Advance through all turns to reach accusing mode
      if (alice) gameManager.nextTurn(gameId, alice.playerId);
      if (bob) gameManager.nextTurn(gameId, bob.playerId);
      if (charlie) gameManager.nextTurn(gameId, charlie.playerId);
      
      expect(game?.status).toBe('accusing');
      
      // Find the spy
      const spy = game?.players.find(p => p.role === 'spy');
      expect(spy).toBeTruthy();
      
      if (spy && game?.currentLocation) {
        const result = gameManager.submitSpyGuess(gameId, spy.id, game.currentLocation);
        expect(result).toBe(true);
      }
    });

    it('should allow civilians to vote for suspected spy', () => {
      const gameId = gameManager.createGame();
      
      const alice = gameManager.addPlayer(gameId, 'Alice');
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      
      const game = gameManager.getGame(gameId);
      
      // Advance through all turns to reach accusing mode
      if (alice) gameManager.nextTurn(gameId, alice.playerId);
      if (bob) gameManager.nextTurn(gameId, bob.playerId);
      if (charlie) gameManager.nextTurn(gameId, charlie.playerId);
      
      expect(game?.status).toBe('accusing');
      
      // Find civilians and spy
      const spy = game?.players.find(p => p.role === 'spy');
      const civilians = game?.players.filter(p => p.role === 'civilian');
      
      expect(spy).toBeTruthy();
      expect(civilians).toBeTruthy();
      expect(civilians?.length).toBeGreaterThan(0);
      
      if (spy && civilians && civilians.length > 0) {
        // Civilian should be able to vote
        const result = gameManager.submitPlayerVote(gameId, civilians[0].id, spy.id);
        expect(result).toBe(true);
      }
    });

    it('should not allow spy to vote for players', () => {
      const gameId = gameManager.createGame();
      
      const alice = gameManager.addPlayer(gameId, 'Alice');
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      
      const game = gameManager.getGame(gameId);
      
      // Advance through all turns to reach accusing mode
      if (alice) gameManager.nextTurn(gameId, alice.playerId);
      if (bob) gameManager.nextTurn(gameId, bob.playerId);
      if (charlie) gameManager.nextTurn(gameId, charlie.playerId);
      
      expect(game?.status).toBe('accusing');
      
      // Find the spy and a civilian
      const spy = game?.players.find(p => p.role === 'spy');
      const civilian = game?.players.find(p => p.role === 'civilian');
      
      expect(spy).toBeTruthy();
      expect(civilian).toBeTruthy();
      
      if (spy && civilian) {
        // Spy should NOT be able to vote for players
        const result = gameManager.submitPlayerVote(gameId, spy.id, civilian.id);
        expect(result).toBe(false);
      }
    });
  });

  describe('property-based testing with fast-check', () => {
    it('should maintain game invariants', () => {
      fc.assert(fc.property(
        fc.integer({ min: 3, max: 12 }),
        fc.array(fc.stringOf(fc.char().filter(c => c.trim() !== ''), { minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 12 }),
        (playerCount, playerNames) => {
          const gameManager = new GameManager();
          const gameId = gameManager.createGame();
          
          // Ensure unique player names (case-insensitive) to avoid duplicate name rejections
          const uniqueNames = new Set<string>();
          const actualPlayerNames: string[] = [];
          for (let i = 0; i < playerCount; i++) {
            let name = (playerNames[i] && playerNames[i].trim()) || `Player${i}`;
            // Ensure uniqueness (case-insensitive)
            while (uniqueNames.has(name.toLowerCase())) {
              name = `${name}${i}`;
            }
            uniqueNames.add(name.toLowerCase());
            actualPlayerNames.push(name);
          }
          
          // Add players with valid, unique names
          for (const name of actualPlayerNames) {
            const result = gameManager.addPlayer(gameId, name);
            expect(result).toBeTruthy();
          }
          
          // Start round
          const startResult = gameManager.startRound(gameId);
          expect(startResult).toBe(true);
          
          const game = gameManager.getGame(gameId);
          expect(game).toBeTruthy();
          expect(game?.players).toHaveLength(playerCount);
          expect(game?.status).toBe('informing_players');
          
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
          const playerIds: string[] = [];
          for (let i = 0; i < playerCount; i++) {
            const result = gameManager.addPlayer(gameId, `Player${i}`);
            if (result) {
              playerIds.push(result.playerId);
            }
          }
          
          gameManager.startRound(gameId);
          
          // Acknowledge all players to transition to playing
          playerIds.forEach(playerId => {
            gameManager.acknowledgeRoleInfo(gameId, playerId);
          });
          
          // Advance turns - note that after all players have asked questions, 
          // the game transitions to 'accusing' mode, so we can only go through one full round
          for (let i = 0; i < playerCount - 1; i++) {
            const game = gameManager.getGame(gameId);
            expect(game?.currentPlayerIndex).toBe(i);
            gameManager.nextTurn(gameId, playerIds[i]);
          }
          
          // After last player's turn, game should transition to accusing mode
          const game = gameManager.getGame(gameId);
          gameManager.nextTurn(gameId, playerIds[playerCount - 1]);
          expect(game?.status).toBe('accusing');
        }
      ));
    });
  });

  describe('Round Summary Calculation', () => {
    it('should correctly calculate when all civilians vote for spy and spy guesses wrong', () => {
      const gameId = gameManager.createGame();
      const alice = gameManager.addPlayer(gameId, 'Alice', true);
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      
      const game = gameManager.getGame(gameId)!;
      
      // Complete question round
      game.players.forEach(player => gameManager.nextTurn(gameId, player.id));
      
      const spy = game.players.find(p => p.role === 'spy')!;
      const civilians = game.players.filter(p => p.role === 'civilian');
      
      // Spy guesses wrong location
      gameManager.submitSpyGuess(gameId, spy.id, 'Wrong Location');
      
      // All civilians vote for spy
      civilians.forEach(c => {
        gameManager.submitPlayerVote(gameId, c.id, spy.id);
      });
      
      const updatedGame = gameManager.getGame(gameId)!;
      
      expect(updatedGame.status).toBe('round_summary');
      expect(updatedGame.roundResult).toBeDefined();
      expect(updatedGame.roundResult?.civiliansWon).toBe(true);
      expect(updatedGame.roundResult?.spyGuessedCorrectly).toBe(false);
      
      // All civilians should get points
      civilians.forEach(c => {
        const player = updatedGame.players.find(p => p.id === c.id)!;
        expect(player.score).toBe(1);
        expect(updatedGame.roundResult?.pointsAwarded[c.id]).toBe(1);
      });
      
      // Spy should get no points
      const spyPlayer = updatedGame.players.find(p => p.id === spy.id)!;
      expect(spyPlayer.score).toBe(0);

      // Verify computed display fields are set
      expect(updatedGame.roundResult?.spyName).toBe(spy.name);
      expect(updatedGame.roundResult?.spyId).toBe(spy.id);
      expect(updatedGame.roundResult?.correctVotersCount).toBe(2); // Both civilians voted correctly
      expect(updatedGame.roundResult?.totalCiviliansCount).toBe(2);
      expect(updatedGame.roundResult?.correctVoterNames).toEqual(expect.arrayContaining(civilians.map(c => c.name)));
    });

    it('should correctly calculate when minority of civilians vote for spy and spy guesses wrong', () => {
      const gameId = gameManager.createGame();
      // Add 5 players (4 civilians, 1 spy) to test minority scenario
      const alice = gameManager.addPlayer(gameId, 'Alice', true);
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      const dave = gameManager.addPlayer(gameId, 'Dave');
      const eve = gameManager.addPlayer(gameId, 'Eve');
      
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      if (dave) gameManager.acknowledgeRoleInfo(gameId, dave.playerId);
      if (eve) gameManager.acknowledgeRoleInfo(gameId, eve.playerId);
      
      const game = gameManager.getGame(gameId)!;
      
      // Complete question round
      game.players.forEach(player => gameManager.nextTurn(gameId, player.id));
      
      const spy = game.players.find(p => p.role === 'spy')!;
      const civilians = game.players.filter(p => p.role === 'civilian');
      
      // Spy guesses wrong location
      gameManager.submitSpyGuess(gameId, spy.id, 'Wrong Location');
      
      // Only 1 out of 4 civilians votes for spy (majority = ceil(4/2) = 2, so 1 is not enough)
      gameManager.submitPlayerVote(gameId, civilians[0].id, spy.id);
      gameManager.submitPlayerVote(gameId, civilians[1].id, civilians[0].id);
      gameManager.submitPlayerVote(gameId, civilians[2].id, civilians[1].id);
      gameManager.submitPlayerVote(gameId, civilians[3].id, civilians[2].id);
      
      const updatedGame = gameManager.getGame(gameId)!;
      
      // When nobody wins, game continues with new question round (not round_summary)
      expect(updatedGame.status).toBe('playing');
      expect(updatedGame.roundResult).toBeUndefined(); // No round result when nobody wins
      
      // No one gets points when nobody wins
      updatedGame.players.forEach(p => {
        expect(p.score).toBe(0);
      });
    });

    it('should correctly calculate when spy guesses correct location', () => {
      const gameId = gameManager.createGame();
      const alice = gameManager.addPlayer(gameId, 'Alice', true);
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      
      const game = gameManager.getGame(gameId)!;
      
      // Complete question round
      game.players.forEach(player => gameManager.nextTurn(gameId, player.id));
      
      const spy = game.players.find(p => p.role === 'spy')!;
      const civilians = game.players.filter(p => p.role === 'civilian');
      
      // Spy guesses correct location
      gameManager.submitSpyGuess(gameId, spy.id, game.currentLocation!);
      
      // All civilians vote for spy
      civilians.forEach(c => {
        gameManager.submitPlayerVote(gameId, c.id, spy.id);
      });
      
      const updatedGame = gameManager.getGame(gameId)!;
      
      expect(updatedGame.status).toBe('round_summary');
      expect(updatedGame.roundResult).toBeDefined();
      expect(updatedGame.roundResult?.spyGuessedCorrectly).toBe(true);
      expect(updatedGame.roundResult?.civiliansWon).toBe(true); // Civilians identified spy, but spy wins anyway
      
      // Spy gets 3 points (spy win takes precedence)
      const spyPlayer = updatedGame.players.find(p => p.id === spy.id)!;
      expect(spyPlayer.score).toBe(3);
      expect(updatedGame.roundResult?.pointsAwarded[spy.id]).toBe(3);
      
      // Civilians get no points (spy win takes precedence)
      civilians.forEach(c => {
        const player = updatedGame.players.find(p => p.id === c.id)!;
        expect(player.score).toBe(0);
        expect(updatedGame.roundResult?.pointsAwarded[c.id]).toBeUndefined();
      });
    });

    it('should correctly calculate when majority of civilians vote for spy', () => {
      const gameId = gameManager.createGame();
      // Add 4 players to test majority (3 civilians, 1 spy)
      const alice = gameManager.addPlayer(gameId, 'Alice', true);
      const bob = gameManager.addPlayer(gameId, 'Bob');
      const charlie = gameManager.addPlayer(gameId, 'Charlie');
      const dave = gameManager.addPlayer(gameId, 'Dave');
      
      gameManager.startRound(gameId);
      
      // Acknowledge all players to transition to playing
      if (alice) gameManager.acknowledgeRoleInfo(gameId, alice.playerId);
      if (bob) gameManager.acknowledgeRoleInfo(gameId, bob.playerId);
      if (charlie) gameManager.acknowledgeRoleInfo(gameId, charlie.playerId);
      if (dave) gameManager.acknowledgeRoleInfo(gameId, dave.playerId);
      
      const game = gameManager.getGame(gameId)!;
      
      // Complete question round
      game.players.forEach(player => gameManager.nextTurn(gameId, player.id));
      
      const spy = game.players.find(p => p.role === 'spy')!;
      const civilians = game.players.filter(p => p.role === 'civilian');
      
      // Spy guesses wrong location
      gameManager.submitSpyGuess(gameId, spy.id, 'Wrong Location');
      
      // 2 out of 3 civilians vote for spy (majority = ceil(3/2) = 2)
      gameManager.submitPlayerVote(gameId, civilians[0].id, spy.id);
      gameManager.submitPlayerVote(gameId, civilians[1].id, spy.id);
      gameManager.submitPlayerVote(gameId, civilians[2].id, civilians[0].id);
      
      const updatedGame = gameManager.getGame(gameId)!;
      
      expect(updatedGame.status).toBe('round_summary');
      expect(updatedGame.roundResult?.civiliansWon).toBe(true);
      
      // Only the 2 civilians who voted correctly get points
      expect(updatedGame.players.find(p => p.id === civilians[0].id)!.score).toBe(1);
      expect(updatedGame.players.find(p => p.id === civilians[1].id)!.score).toBe(1);
      expect(updatedGame.players.find(p => p.id === civilians[2].id)!.score).toBe(0);
    });
  });
});
