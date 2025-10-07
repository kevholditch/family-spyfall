import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io, Socket } from 'socket.io-client';

// Mock server setup - in a real test environment, you'd start the actual server
const SERVER_URL = 'http://localhost:4000';

describe('Socket.IO Integration Tests', () => {
  let client1: Socket;
  let client2: Socket;
  let client3: Socket;
  let gameId: string;

  beforeEach(async () => {
    // Create a game via HTTP API
    const response = await fetch(`${SERVER_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    gameId = data.gameId;

    // Create socket connections
    client1 = io(SERVER_URL, { transports: ['websocket'] });
    client2 = io(SERVER_URL, { transports: ['websocket'] });
    client3 = io(SERVER_URL, { transports: ['websocket'] });
  });

  afterEach(() => {
    client1?.disconnect();
    client2?.disconnect();
    client3?.disconnect();
  });

  describe('Game Creation and Joining', () => {
    it('should allow multiple players to join a game', (done) => {
      let joinedCount = 0;
      
      const checkAllJoined = () => {
        joinedCount++;
        if (joinedCount === 3) {
          done();
        }
      };

      client1.on('game_update', (update) => {
        if (update.type === 'player_joined') {
          checkAllJoined();
        }
      });

      client2.on('game_update', (update) => {
        if (update.type === 'player_joined') {
          checkAllJoined();
        }
      });

      client3.on('game_update', (update) => {
        if (update.type === 'player_joined') {
          checkAllJoined();
        }
      });

      // Join players
      client1.emit('join_game', { gameId, playerName: 'Alice' });
      client2.emit('join_game', { gameId, playerName: 'Bob' });
      client3.emit('join_game', { gameId, playerName: 'Charlie' });
    });

    it('should assign host role to first player', (done) => {
      client1.on('game_update', (update) => {
        if (update.type === 'player_joined' && update.data.isHost) {
          expect(update.data.isHost).toBe(true);
          done();
        }
      });

      client1.emit('join_game', { gameId, playerName: 'Alice' });
    });

    it('should reject duplicate player names', (done) => {
      client1.emit('join_game', { gameId, playerName: 'Alice' });
      
      client2.on('error', (error) => {
        expect(error.message).toBe('Name already taken');
        done();
      });

      // Wait a bit for first player to join, then try duplicate name
      setTimeout(() => {
        client2.emit('join_game', { gameId, playerName: 'Alice' });
      }, 100);
    });
  });

  describe('Game Flow', () => {
    beforeEach((done) => {
      // Join all players first
      let joinedCount = 0;
      
      const checkAllJoined = () => {
        joinedCount++;
        if (joinedCount === 3) {
          done();
        }
      };

      client1.on('game_update', (update) => {
        if (update.type === 'player_joined') {
          checkAllJoined();
        }
      });

      client2.on('game_update', (update) => {
        if (update.type === 'player_joined') {
          checkAllJoined();
        }
      });

      client3.on('game_update', (update) => {
        if (update.type === 'player_joined') {
          checkAllJoined();
        }
      });

      client1.emit('join_game', { gameId, playerName: 'Alice' });
      client2.emit('join_game', { gameId, playerName: 'Bob' });
      client3.emit('join_game', { gameId, playerName: 'Charlie' });
    });

    it('should start round and assign roles', (done) => {
      let roleAssignments = 0;
      
      client1.on('role_assignment', (data) => {
        roleAssignments++;
        expect(data.role).toBeOneOf(['spy', 'civilian']);
        if (roleAssignments === 3) {
          done();
        }
      });

      client2.on('role_assignment', (data) => {
        roleAssignments++;
        expect(data.role).toBeOneOf(['spy', 'civilian']);
        if (roleAssignments === 3) {
          done();
        }
      });

      client3.on('role_assignment', (data) => {
        roleAssignments++;
        expect(data.role).toBeOneOf(['spy', 'civilian']);
        if (roleAssignments === 3) {
          done();
        }
      });

      client1.emit('start_round');
    });

    it('should advance turns correctly', (done) => {
      client1.emit('start_round');
      
      setTimeout(() => {
        client1.on('game_update', (update) => {
          if (update.type === 'turn_advanced') {
            expect(update.data.currentPlayerIndex).toBe(1);
            done();
          }
        });
        
        client1.emit('advance_turn');
      }, 100);
    });

    it('should handle accusations and voting', (done) => {
      let accusationStarted = false;
      let voteCast = false;
      
      client1.emit('start_round');
      
      setTimeout(() => {
        client1.on('game_update', (update) => {
          if (update.type === 'accusation_started') {
            accusationStarted = true;
          } else if (update.type === 'vote_cast' && accusationStarted) {
            voteCast = true;
            done();
          }
        });
        
        // Start accusation
        client1.emit('accuse_player', { accusedPlayerId: 'some-player-id' });
        
        // Cast vote
        setTimeout(() => {
          client2.emit('vote', { vote: true });
        }, 50);
      }, 100);
    });
  });

  describe('Reconnection', () => {
    it('should allow player to reconnect with credentials', (done) => {
      let playerId: string;
      let secret: string;
      
      client1.on('game_update', (update) => {
        if (update.type === 'player_joined') {
          playerId = update.data.playerId;
          secret = update.data.secret;
          
          // Disconnect and reconnect
          client1.disconnect();
          
          setTimeout(() => {
            const newClient = io(SERVER_URL, { transports: ['websocket'] });
            newClient.emit('join_game', { 
              gameId, 
              playerName: 'Alice',
              playerId,
              secret
            });
            
            newClient.on('game_update', (update) => {
              if (update.type === 'player_reconnected') {
                newClient.disconnect();
                done();
              }
            });
          }, 100);
        }
      });
      
      client1.emit('join_game', { gameId, playerName: 'Alice' });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid game IDs', (done) => {
      client1.on('error', (error) => {
        expect(error.message).toBe('Invalid game ID format');
        done();
      });
      
      client1.emit('join_game', { gameId: 'invalid', playerName: 'Alice' });
    });

    it('should handle invalid player names', (done) => {
      client1.on('error', (error) => {
        expect(error.message).toBe('Player name contains invalid characters');
        done();
      });
      
      client1.emit('join_game', { gameId, playerName: 'Alice<script>' });
    });

    it('should prevent non-hosts from starting rounds', (done) => {
      client1.emit('join_game', { gameId, playerName: 'Alice' }); // Host
      
      setTimeout(() => {
        client2.on('error', (error) => {
          expect(error.message).toBe('Only the host can start a round');
          done();
        });
        
        client2.emit('join_game', { gameId, playerName: 'Bob' });
        
        setTimeout(() => {
          client2.emit('start_round');
        }, 50);
      }, 100);
    });
  });
});

// Helper to extend expect with custom matcher
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}

// Custom matcher implementation
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});
