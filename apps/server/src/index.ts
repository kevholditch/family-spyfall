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

dotenv.config();

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
      console.log(`Player attempting to join game ${gameId}:`, { playerName, playerId, secret, isHost });
      console.log('Socket connected:', socket.connected);
      console.log('Socket ID:', socket.id);

      // Validate inputs
      const gameIdValidation = validateGameId(gameId);
      if (!gameIdValidation.isValid) {
        console.log('Game ID validation failed:', gameIdValidation.error);
        socket.emit('error', { message: gameIdValidation.error });
        return;
      }

      const nameValidation = validatePlayerName(playerName);
      if (!nameValidation.isValid) {
        console.log('Player name validation failed:', nameValidation.error);
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
          if (game.status === 'playing' || game.status === 'voting') {
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
        console.log(`🎮 Server - TV Host joining game ${gameId} (not added to players)`);
        const hostId = uuidv4();
        const hostSecret = uuidv4();
        
        currentGameId = gameId;
        currentPlayerId = hostId;
        
        // Join the game room to receive updates
        socket.join(gameId);
        socket.join(hostId);
        console.log(`🔗 Server - TV Host socket ${socket.id} joined rooms: [${gameId}, ${hostId}]`);
        
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
      console.log(`🎮 Server - Adding player "${sanitizedName}" to game ${gameId}. Current players: ${game.players.length}, isHost: ${isFirstPlayer}`);
      
      const result = gameManager.addPlayer(gameId, sanitizedName, isFirstPlayer);

      if (!result) {
        if (game.players.some(p => p.name.toLowerCase() === sanitizedName.toLowerCase())) {
          console.log(`❌ Server - Name "${sanitizedName}" already taken`);
          socket.emit('error', { message: 'Name already taken' });
        } else {
          console.log(`❌ Server - Game ${gameId} is full`);
          socket.emit('error', { message: 'Game is full' });
        }
        return;
      }

      console.log(`✅ Server - Player "${sanitizedName}" added successfully. Player ID: ${result.playerId}`);

      currentGameId = gameId;
      currentPlayerId = result.playerId;

      // Join both the game room and player-specific room
      socket.join(gameId);
      socket.join(result.playerId);
      console.log(`🔗 Server - Socket ${socket.id} joined rooms: [${gameId}, ${result.playerId}]`);

      // Broadcast player joined to others (not to self) - send the complete player object
      const newPlayer = game.players.find(p => p.id === result.playerId);
      if (!newPlayer) {
        console.error('❌ Server - Could not find newly added player in game');
        return;
      }
      
      const updateData = {
        type: 'player_joined',
        data: newPlayer // Send the complete Player object
      };
      console.log('Broadcasting player_joined:', updateData);
      console.log(`📊 Server - Current game state after adding player:`, {
        totalPlayers: game.players.length,
        players: game.players.map(p => ({ name: p.name, id: p.id, isConnected: p.isConnected }))
      });
      // Broadcast to others in the room (excluding sender)
      socket.to(gameId).emit('game_update', updateData);
      
      // Send join confirmation to the sender
      socket.emit('game_update', updateData);

    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // Start round
  socket.on('start_round', () => {
    console.log('🎮 start_round called');
    console.log('  currentGameId:', currentGameId);
    console.log('  currentPlayerId:', currentPlayerId);
    
    if (!currentGameId || !currentPlayerId) {
      console.log('  ❌ Missing gameId or playerId, returning');
      return;
    }

    const game = gameManager.getGame(currentGameId);
    if (!game) {
      console.log('  ❌ Game not found, returning');
      return;
    }

    console.log('  📊 Game players:', game.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })));
    
    // Note: TV Host is not in the players array, so player will be undefined for TV Host
    // Only block if we found a player (not TV Host) AND that player is not a host
    const player = game.players.find(p => p.id === currentPlayerId);
    console.log('  👤 Player lookup result:', player ? { id: player.id, name: player.name, isHost: player.isHost } : 'undefined (TV Host)');
    console.log('  🔍 Condition check: player =', !!player, ', player.isHost =', player?.isHost);
    console.log('  🔍 Will block?', player && !player.isHost);
    
    if (player && !player.isHost) {
      console.log('  ❌ BLOCKING: Player found but is not host');
      socket.emit('error', { message: 'Only the host can start a round' });
      return;
    }
    
    console.log('  ✅ Permission check passed, continuing...');

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

    console.log(`🎮 Server - Starting round for game ${currentGameId}`);
    console.log(`📊 Server - Game state after startRound:`, {
      totalPlayers: game.players.length,
      players: game.players.map(p => ({ name: p.name, id: p.id, isConnected: p.isConnected, role: p.role })),
      status: game.status,
      roundNumber: game.roundNumber
    });

    // Send role assignments to all players
    game.players.forEach(player => {
      console.log(`📤 Server - Sending role assignment to player ${player.name} (${player.id})`);
      const socketsInPlayerRoom = io.sockets.adapter.rooms.get(player.id);
      console.log(`  📤 Sockets in room ${player.id}:`, socketsInPlayerRoom ? Array.from(socketsInPlayerRoom) : 'NONE - THIS IS THE PROBLEM!');
      io.to(player.id).emit('role_assignment', {
        role: player.role,
        location: player.location
      });
    });

    // Broadcast round started
    console.log(`📡 Server - Broadcasting round_started to game ${currentGameId}`);
    const socketsInRoom = io.sockets.adapter.rooms.get(currentGameId);
    console.log(`📡 Server - Sockets in room ${currentGameId}:`, socketsInRoom ? Array.from(socketsInRoom) : 'none');
    console.log(`📡 Server - Total sockets in room: ${socketsInRoom?.size || 0}`);
    
    io.to(currentGameId).emit('game_update', {
      type: 'round_started',
      data: {
        roundNumber: game.roundNumber,
        currentPlayerIndex: game.currentPlayerIndex
      }
    });
    console.log(`📡 Server - round_started broadcast complete`);
  });

  // Advance turn
  socket.on('advance_turn', () => {
    if (!currentGameId || !currentPlayerId) return;

    const game = gameManager.getGame(currentGameId);
    if (!game) return;

    const player = game.players.find(p => p.id === currentPlayerId);
    if (player && !player.isHost) {
      socket.emit('error', { message: 'Only the host can advance turns' });
      return;
    }

    const success = gameManager.advanceTurn(currentGameId);
    if (!success) {
      socket.emit('error', { message: 'Failed to advance turn' });
      return;
    }

    io.to(currentGameId).emit('game_update', {
      type: 'turn_advanced',
      data: { currentPlayerIndex: game.currentPlayerIndex }
    });
  });

  // Accuse player
  socket.on('accuse_player', (data: { accusedPlayerId: string }) => {
    if (!currentGameId || !currentPlayerId) return;

    const { accusedPlayerId } = data;
    const game = gameManager.getGame(currentGameId);
    if (!game) return;

    const player = game.players.find(p => p.id === currentPlayerId);
    if (player && !player.isHost) {
      socket.emit('error', { message: 'Only the host can start accusations' });
      return;
    }

    // Rate limiting for accusations
    const clientIP = socket.handshake.address;
    if (!accusationRateLimiter.isAllowed(clientIP)) {
      socket.emit('error', { message: 'Too many accusations. Please wait before trying again.' });
      return;
    }

    const success = gameManager.startAccusation(currentGameId, accusedPlayerId);
    if (!success) {
      socket.emit('error', { message: 'Failed to start accusation' });
      return;
    }

    io.to(currentGameId).emit('game_update', {
      type: 'accusation_started',
      data: { accusedPlayerId }
    });
  });

  // Cast vote
  socket.on('vote', (data: { vote: boolean }) => {
    if (!currentGameId || !currentPlayerId) return;

    const { vote } = data;
    const success = gameManager.castVote(currentGameId, currentPlayerId, vote);
    
    if (!success) {
      socket.emit('error', { message: 'Failed to cast vote' });
      return;
    }

    const game = gameManager.getGame(currentGameId);
    if (game?.accusation) {
      io.to(currentGameId).emit('game_update', {
        type: 'vote_cast',
        data: { voterId: currentPlayerId, vote }
      });
    }
  });

  // Cancel accusation
  socket.on('cancel_accusation', () => {
    if (!currentGameId || !currentPlayerId) return;

    const game = gameManager.getGame(currentGameId);
    if (!game) return;

    const player = game.players.find(p => p.id === currentPlayerId);
    if (player && !player.isHost) {
      socket.emit('error', { message: 'Only the host can cancel accusations' });
      return;
    }

    const success = gameManager.cancelAccusation(currentGameId);
    if (!success) {
      socket.emit('error', { message: 'Failed to cancel accusation' });
      return;
    }

    io.to(currentGameId).emit('game_update', {
      type: 'accusation_cancelled',
      data: {}
    });
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
    console.log(`🔌 Socket disconnected: ${socket.id}, gameId: ${currentGameId}, playerId: ${currentPlayerId}`);
    if (currentGameId && currentPlayerId) {
      const game = gameManager.getGame(currentGameId);
      if (game) {
        const player = game.players.find(p => p.id === currentPlayerId);
        if (player) {
          player.isConnected = false;
          console.log(`👋 Player ${player.name} disconnected from game ${currentGameId}`);
          
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
    console.log(`Cleaned up ${cleaned} expired games`);
  }
}, 300000); // Check every 5 minutes

const PORT = parseInt(process.env.SERVER_PORT || '4000');
server.listen(PORT, () => {
  console.log(`Spyfall server running on port ${PORT}`);
  console.log(`Web origin: ${process.env.WEB_ORIGIN || 'http://localhost:5173'}`);
});
