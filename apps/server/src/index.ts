import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { GameManager } from './game/GameManager';
import { SocketEvents } from './types';
import { joinRateLimiter, accusationRateLimiter } from './utils/rateLimiter';
import { validatePlayerName, validateGameId, validatePlayerId, validateSecret, sanitizePlayerName } from './utils/validation';
import { debugLog, debugError, infoLog, errorLog } from './utils/debug';

dotenv.config();

const ROUND_SUMMARY_TIMEOUT = parseInt(process.env.ROUND_SUMMARY_TIMEOUT || '60000', 10);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://192.168.1.51:5173',
      /^http:\/\/192\.168\.\d+\.\d+:5173$/, // Allow any 192.168.x.x:5173
      /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,  // Allow any 10.x.x.x:5173
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/ // Allow any 172.16-31.x.x:5173
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const gameManager = new GameManager();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for Socket.IO compatibility
}));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://192.168.1.51:5173',
    /^http:\/\/192\.168\.\d+\.\d+:5173$/, // Allow any 192.168.x.x:5173
    /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,  // Allow any 10.x.x.x:5173
    /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/ // Allow any 172.16-31.x.x:5173
  ],
  credentials: true
}));

app.use(express.json());

// Rate limiting removed - not needed for this use case

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create game endpoint
app.post('/api/games', (req, res) => {
  const gameId = gameManager.createGame();
  res.json({ gameId });
});

// Get game state endpoint (for debugging/admin)
app.get('/api/games/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = gameManager.getGame(gameId);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Return public game state (without secrets)
  const publicGameState = {
    id: game.id,
    players: game.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isConnected: p.isConnected,
      role: game.status === 'finished' ? p.role : undefined,
      location: game.status === 'finished' ? p.location : undefined
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    roundNumber: game.roundNumber,
    status: game.status,
    createdAt: game.createdAt
  };

  res.json(publicGameState);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  let currentGameId: string | null = null;
  let currentPlayerId: string | null = null;

  // Join game
  socket.on('join_game', (data: { gameId: string; playerName: string; playerId?: string; secret?: string; isHost?: boolean }) => {
    try {
      const { gameId, playerName, playerId, secret, isHost } = data;
      debugLog(`Player attempting to join game ${gameId}:`, { playerName, playerId, secret, isHost });
      debugLog('Socket connected:', socket.connected);
      debugLog('Socket ID:', socket.id);

      // Validate inputs
      const gameIdValidation = validateGameId(gameId);
      if (!gameIdValidation.isValid) {
        debugLog('Game ID validation failed:', gameIdValidation.error);
        socket.emit('error', { message: gameIdValidation.error });
        return;
      }

      const nameValidation = validatePlayerName(playerName);
      if (!nameValidation.isValid) {
        debugLog('Player name validation failed:', nameValidation.error);
        socket.emit('error', { message: nameValidation.error });
        return;
      }

      // Rate limiting removed - not needed for this use case

      const sanitizedName = sanitizePlayerName(playerName);
      const game = gameManager.getGame(gameId);

      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Check if this is a reconnection
      if (playerId && secret) {
        // Only validate credentials if they exist and are not empty strings
        if (playerId.trim() && secret.trim()) {
          const playerIdValidation = validatePlayerId(playerId);
          const secretValidation = validateSecret(secret);
          
          if (!playerIdValidation.isValid || !secretValidation.isValid) {
            socket.emit('error', { message: 'Invalid player credentials' });
            return;
          }
        }

        const existingPlayer = game.players.find(p => p.id === playerId && p.secret === secret);
        if (existingPlayer) {
          // Reconnection
          existingPlayer.isConnected = true;
          currentGameId = gameId;
          currentPlayerId = playerId;
          
          // Join both the game room and player-specific room
          socket.join(gameId);
          socket.join(playerId);
          
          // Send role assignment if game is active
          if (game.status === 'playing' || game.status === 'accusing') {
            socket.emit('role_assignment', {
              role: existingPlayer.role,
              location: existingPlayer.location
            });
          }

          // Broadcast player reconnected
          socket.to(gameId).emit('game_update', {
            type: 'player_reconnected',
            data: { playerId, playerName: existingPlayer.name }
          });

          return;
        }
      }

      // If this is the TV Host (isHost flag and named "TV Host"), just join the room without creating a player
      if (isHost && sanitizedName === 'TV Host') {
        debugLog(`🎮 Server - TV Host joining game ${gameId} (not added to players)`);
        const hostId = uuidv4();
        const hostSecret = uuidv4();
        
        currentGameId = gameId;
        currentPlayerId = hostId;
        
        // Join the game room to receive updates
        socket.join(gameId);
        socket.join(hostId);
        debugLog(`🔗 Server - TV Host socket ${socket.id} joined rooms: [${gameId}, ${hostId}]`);
        
        // Send success response to the host
        socket.emit('game_update', {
          type: 'player_joined',
          data: {
            id: hostId,
            name: sanitizedName,
            secret: hostSecret,
            isHost: true,
            isConnected: true
          }
        });
        
        return;
      }

      // New player joining
      const isFirstPlayer = game.players.length === 0;
      debugLog(`🎮 Server - Adding player "${sanitizedName}" to game ${gameId}. Current players: ${game.players.length}, isHost: ${isFirstPlayer}`);
      
      const result = gameManager.addPlayer(gameId, sanitizedName, isFirstPlayer);

      if (!result) {
        if (game.players.some(p => p.name.toLowerCase() === sanitizedName.toLowerCase())) {
          debugLog(`❌ Server - Name "${sanitizedName}" already taken`);
          socket.emit('error', { message: 'Name already taken' });
        } else {
          debugLog(`❌ Server - Game ${gameId} is full`);
          socket.emit('error', { message: 'Game is full' });
        }
        return;
      }

      debugLog(`✅ Server - Player "${sanitizedName}" added successfully. Player ID: ${result.playerId}`);

      currentGameId = gameId;
      currentPlayerId = result.playerId;

      // Join both the game room and player-specific room
      socket.join(gameId);
      socket.join(result.playerId);
      debugLog(`🔗 Server - Socket ${socket.id} joined rooms: [${gameId}, ${result.playerId}]`);

      // Broadcast player joined to others (not to self) - send the complete player object
      const newPlayer = game.players.find(p => p.id === result.playerId);
      if (!newPlayer) {
        debugError('❌ Server - Could not find newly added player in game');
        return;
      }
      
      const updateData = {
        type: 'player_joined',
        data: newPlayer // Send the complete Player object
      };
      debugLog('Broadcasting player_joined:', updateData);
      debugLog(`📊 Server - Current game state after adding player:`, {
        totalPlayers: game.players.length,
        players: game.players.map(p => ({ name: p.name, id: p.id, isConnected: p.isConnected }))
      });
      // Broadcast to others in the room (excluding sender)
      socket.to(gameId).emit('game_update', updateData);
      
      // Send join confirmation to the sender
      socket.emit('game_update', updateData);

    } catch (error) {
      errorLog('Error joining game:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // Start round
  socket.on('start_round', () => {
    debugLog('🎮 start_round called');
    debugLog('  currentGameId:', currentGameId);
    debugLog('  currentPlayerId:', currentPlayerId);
    
    if (!currentGameId || !currentPlayerId) {
      debugLog('  ❌ Missing gameId or playerId, returning');
      return;
    }

    const game = gameManager.getGame(currentGameId);
    if (!game) {
      debugLog('  ❌ Game not found, returning');
      return;
    }

    debugLog('  📊 Game players:', game.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })));
    
    // Note: TV Host is not in the players array, so player will be undefined for TV Host
    // Only block if we found a player (not TV Host) AND that player is not a host
    const player = game.players.find(p => p.id === currentPlayerId);
    debugLog('  👤 Player lookup result:', player ? { id: player.id, name: player.name, isHost: player.isHost } : 'undefined (TV Host)');
    debugLog('  🔍 Condition check: player =', !!player, ', player.isHost =', player?.isHost);
    debugLog('  🔍 Will block?', player && !player.isHost);
    
    if (player && !player.isHost) {
      debugLog('  ❌ BLOCKING: Player found but is not host');
      socket.emit('error', { message: 'Only the host can start a round' });
      return;
    }
    
    debugLog('  ✅ Permission check passed, continuing...');

    // TV Host is no longer in the players array, so just count all players
    if (game.players.length < 1) {
      socket.emit('error', { message: 'Need at least 1 player to start' });
      return;
    }

    const success = gameManager.startRound(currentGameId);
    if (!success) {
      socket.emit('error', { message: 'Failed to start round' });
      return;
    }

    debugLog(`🎮 Server - Starting round for game ${currentGameId}`);
    debugLog(`📊 Server - Game state after startRound:`, {
      totalPlayers: game.players.length,
      players: game.players.map(p => ({ name: p.name, id: p.id, isConnected: p.isConnected, role: p.role })),
      status: game.status,
      roundNumber: game.roundNumber
    });

    // Send role assignments to all players
    game.players.forEach(player => {
      debugLog(`📤 Server - Sending role assignment to player ${player.name} (${player.id})`);
      const socketsInPlayerRoom = io.sockets.adapter.rooms.get(player.id);
      debugLog(`  📤 Sockets in room ${player.id}:`, socketsInPlayerRoom ? Array.from(socketsInPlayerRoom) : 'NONE - THIS IS THE PROBLEM!');
      io.to(player.id).emit('role_assignment', {
        role: player.role,
        location: player.location
      });
    });

    // Broadcast round started
    debugLog(`📡 Server - Broadcasting round_started to game ${currentGameId}`);
    const socketsInRoom = io.sockets.adapter.rooms.get(currentGameId);
    debugLog(`📡 Server - Sockets in room ${currentGameId}:`, socketsInRoom ? Array.from(socketsInRoom) : 'none');
    debugLog(`📡 Server - Total sockets in room: ${socketsInRoom?.size || 0}`);
    
    io.to(currentGameId).emit('game_update', {
      type: 'round_started',
      data: {
        roundNumber: game.roundNumber,
        currentPlayerIndex: game.currentPlayerIndex
      }
    });
    debugLog(`📡 Server - round_started broadcast complete`);
  });

  // Next turn (player clicked "Next" button after asking question)
  socket.on('next_turn', () => {
    if (!currentGameId || !currentPlayerId) return;

    const game = gameManager.getGame(currentGameId);
    if (!game) return;

    // Only the current player can advance their own turn
    if (game.currentPlayerIndex >= 0 && game.currentPlayerIndex < game.players.length) {
      const currentPlayer = game.players[game.currentPlayerIndex];
      if (currentPlayer.id !== currentPlayerId) {
        socket.emit('error', { message: 'Only the current player can advance the turn' });
        return;
      }
    }

    const success = gameManager.nextTurn(currentGameId);
    if (!success) {
      socket.emit('error', { message: 'Failed to advance turn' });
      return;
    }

    // Check if game transitioned to accuse mode
    if (game.status === 'accusing') {
      io.to(currentGameId).emit('game_update', {
        type: 'accuse_mode_started',
        data: {}
      });
    } else {
      io.to(currentGameId).emit('game_update', {
        type: 'turn_advanced',
        data: { currentPlayerIndex: game.currentPlayerIndex }
      });
    }
  });

  // Submit spy's location guess
  socket.on('submit_spy_guess', (data: { locationGuess: string }) => {
    if (!currentGameId || !currentPlayerId) return;

    const { locationGuess } = data;
    const game = gameManager.getGame(currentGameId);
    if (!game) return;

    const success = gameManager.submitSpyGuess(currentGameId, currentPlayerId, locationGuess);
    if (!success) {
      socket.emit('error', { message: 'Failed to submit guess' });
      return;
    }

    // Broadcast that spy has submitted (without revealing the guess)
    io.to(currentGameId).emit('game_update', {
      type: 'spy_guess_submitted',
      data: {}
    });

    // Check if game transitioned back to playing (nobody won)
    if (game.status === 'playing') {
      io.to(currentGameId).emit('game_update', {
        type: 'round_started',
        data: {
          roundNumber: game.roundNumber,
          currentPlayerIndex: game.currentPlayerIndex
        }
      });
    }

    // Check if results need to be sent
    if (game.status === 'round_summary') {
      // Broadcast round summary
      io.to(currentGameId).emit('game_update', {
        type: 'round_summary',
        data: {
          roundResult: game.roundResult,
          players: game.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
        }
      });

      // Auto-restart round after configured timeout
      const gameIdForTimeout = currentGameId;
      setTimeout(() => {
        if (!gameIdForTimeout) return;
        const updatedGame = gameManager.getGame(gameIdForTimeout);
        if (updatedGame && updatedGame.status === 'round_summary') {
          const success = gameManager.startRound(gameIdForTimeout);
          if (success) {
            // Send role assignments
            updatedGame.players.forEach(player => {
              io.to(player.id).emit('role_assignment', {
                role: player.role,
                location: player.location
              });
            });

            // Broadcast round started
            io.to(gameIdForTimeout).emit('game_update', {
              type: 'round_started',
              data: {
                roundNumber: updatedGame.roundNumber,
                currentPlayerIndex: updatedGame.currentPlayerIndex
              }
            });
          }
        }
      }, ROUND_SUMMARY_TIMEOUT);
    } else if (game.status === 'playing') {
      // Question round restarted
      io.to(currentGameId).emit('game_update', {
        type: 'turn_advanced',
        data: { currentPlayerIndex: game.currentPlayerIndex }
      });
    }
  });

  // Submit player vote (civilians voting for who they think is the spy)
  socket.on('submit_player_vote', (data: { accusedPlayerId: string }) => {
    if (!currentGameId || !currentPlayerId) return;

    const { accusedPlayerId } = data;
    const game = gameManager.getGame(currentGameId);
    if (!game) return;

    const success = gameManager.submitPlayerVote(currentGameId, currentPlayerId, accusedPlayerId);
    if (!success) {
      socket.emit('error', { message: 'Failed to submit vote' });
      return;
    }

    io.to(currentGameId).emit('game_update', {
      type: 'vote_cast',
      data: { voterId: currentPlayerId }
    });

    // Check if game transitioned back to playing (nobody won)
    if (game.status === 'playing') {
      io.to(currentGameId).emit('game_update', {
        type: 'round_started',
        data: {
          roundNumber: game.roundNumber,
          currentPlayerIndex: game.currentPlayerIndex
        }
      });
    }

    // Check if results need to be sent
    if (game.status === 'round_summary') {
      // Broadcast round summary
      io.to(currentGameId).emit('game_update', {
        type: 'round_summary',
        data: {
          roundResult: game.roundResult,
          players: game.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
        }
      });

      // Auto-restart round after configured timeout
      const gameIdForTimeout = currentGameId;
      setTimeout(() => {
        if (!gameIdForTimeout) return;
        const updatedGame = gameManager.getGame(gameIdForTimeout);
        if (updatedGame && updatedGame.status === 'round_summary') {
          const success = gameManager.startRound(gameIdForTimeout);
          if (success) {
            // Send role assignments
            updatedGame.players.forEach(player => {
              io.to(player.id).emit('role_assignment', {
                role: player.role,
                location: player.location
              });
            });

            // Broadcast round started
            io.to(gameIdForTimeout).emit('game_update', {
              type: 'round_started',
              data: {
                roundNumber: updatedGame.roundNumber,
                currentPlayerIndex: updatedGame.currentPlayerIndex
              }
            });
          }
        }
      }, ROUND_SUMMARY_TIMEOUT);
    } else if (game.status === 'playing') {
      // Question round restarted
      io.to(currentGameId).emit('game_update', {
        type: 'turn_advanced',
        data: { currentPlayerIndex: game.currentPlayerIndex }
      });
    }
  });

  // End round
  socket.on('end_round', () => {
    if (!currentGameId || !currentPlayerId) return;

    const game = gameManager.getGame(currentGameId);
    if (!game) return;

    const player = game.players.find(p => p.id === currentPlayerId);
    if (player && !player.isHost) {
      socket.emit('error', { message: 'Only the host can end rounds' });
      return;
    }

    const success = gameManager.endRound(currentGameId);
    if (!success) {
      socket.emit('error', { message: 'Failed to end round' });
      return;
    }

    io.to(currentGameId).emit('game_update', {
      type: 'round_ended',
      data: {}
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    debugLog(`🔌 Socket disconnected: ${socket.id}, gameId: ${currentGameId}, playerId: ${currentPlayerId}`);
    if (currentGameId && currentPlayerId) {
      const game = gameManager.getGame(currentGameId);
      if (game) {
        const player = game.players.find(p => p.id === currentPlayerId);
        if (player) {
          player.isConnected = false;
          debugLog(`👋 Player ${player.name} disconnected from game ${currentGameId}`);
          
          socket.to(currentGameId).emit('game_update', {
            type: 'player_disconnected',
            data: { playerId: currentPlayerId, playerName: player.name }
          });
        }
      }
    }
  });
});

// Cleanup expired games periodically
setInterval(() => {
  const maxAge = parseInt(process.env.ROOM_TTL_MS || '7200000'); // 2 hours default
  const cleaned = gameManager.cleanupExpiredGames(maxAge);
  if (cleaned > 0) {
    infoLog(`Cleaned up ${cleaned} expired games`);
  }
}, 300000); // Check every 5 minutes

const PORT = parseInt(process.env.SERVER_PORT || '4000');
server.listen(PORT, () => {
  console.log(`Spyfall server running on port ${PORT}`);
  console.log(`Web origin: ${process.env.WEB_ORIGIN || 'http://localhost:5173'}`);
});
