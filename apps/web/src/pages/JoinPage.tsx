import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGameState } from '../hooks/useGameState';
import { ArrowLeft, Users } from 'lucide-react';

export function JoinPage() {
  const { gameId } = useParams<{ gameId: string }>();
  // Use the same host as the web app but port 4000 for the server
  const serverUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
  const { emit, gameUpdate, error, isConnected } = useSocket(serverUrl);
  const { gameState, currentPlayer, setGame, updateGameState } = useGameState();
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  // Handle game updates
  useEffect(() => {
    if (gameUpdate) {
      console.log('📡 JoinPage received game update:', gameUpdate);
      updateGameState(gameUpdate);
      
      // If game starts and we've joined, redirect to game page
      if (gameUpdate.type === 'round_started' && hasJoined) {
        console.log('🎮 JoinPage - Game started, redirecting to game page');
        window.location.href = `/game/${gameId}`;
      }
    }
  }, [gameUpdate, updateGameState, hasJoined]);

  // Handle game state changes (like when game starts)
  useEffect(() => {
    if (gameState && gameState.status === 'playing' && hasJoined) {
      console.log('🎮 JoinPage - Game status changed to playing, redirecting to game page');
      window.location.href = `/game/${gameId}`;
    }
  }, [gameState, hasJoined, gameId]);

  // Handle successful join
  useEffect(() => {
    console.log('🔍 JoinPage - Checking for successful join:', {
      gameUpdateType: gameUpdate?.type,
      gameUpdateData: gameUpdate?.data,
      gameUpdateDataType: typeof gameUpdate?.data,
      gameUpdateDataKeys: gameUpdate?.data ? Object.keys(gameUpdate.data) : [],
      hasId: !!gameUpdate?.data?.id,
      playerId: gameUpdate?.data?.id,
      playerName: gameUpdate?.data?.name,
      isJoining,
      hasJoined
    });
    
    if (gameUpdate?.type === 'player_joined' && gameUpdate.data.id && isJoining) {
      const { id: playerId, secret, name } = gameUpdate.data;
      
      // Only process this join event if it's for the current player
      if (name === playerName) {
        console.log('✅ JoinPage - Player successfully joined:', { playerId, playerName: name });
        setIsJoining(false);
        setHasJoined(true);
      } else {
        console.log('⏭️ JoinPage - Ignoring join event for different player:', { 
          eventPlayerName: name, 
          currentPlayerName: playerName 
        });
        return;
      }
      
      // Store credentials for reconnection
      sessionStorage.setItem('playerId', playerId);
      sessionStorage.setItem('playerSecret', secret);
      sessionStorage.setItem('gameId', gameId || '');
      sessionStorage.setItem('playerName', playerName);
      
      // Set up game state
      if (gameState) {
        setGame(gameState, playerId, secret);
      }
    }
  }, [gameUpdate, isJoining, gameId, gameState, setGame]);

  const handleJoinGame = () => {
    if (!gameId || !playerName.trim()) {
      return;
    }

    console.log('🎮 JoinPage - Join button clicked:', { gameId, playerName: playerName.trim() });
    console.log('🔄 JoinPage - Setting isJoining to true');
    setIsJoining(true);
    
    // Try to reconnect first if we have stored credentials
    const storedPlayerId = sessionStorage.getItem('playerId');
    const storedSecret = sessionStorage.getItem('playerSecret');
    const storedGameId = sessionStorage.getItem('gameId');
    const storedPlayerName = sessionStorage.getItem('playerName');
    
    // Only use stored credentials if they exist, are not 'undefined', 
    // match the current game, AND match the current player name
    if (storedPlayerId && storedSecret && 
        storedPlayerId !== 'undefined' && storedSecret !== 'undefined' &&
        gameId === storedGameId && playerName.trim() === storedPlayerName) {
      console.log('📡 JoinPage - Emitting join_game with credentials:', { gameId, playerName: playerName.trim(), playerId: storedPlayerId });
      emit('join_game', {
        gameId,
        playerName: playerName.trim(),
        playerId: storedPlayerId,
        secret: storedSecret
      });
    } else {
      // Clear any invalid stored credentials
      sessionStorage.removeItem('playerId');
      sessionStorage.removeItem('playerSecret');
      sessionStorage.removeItem('gameId');
      sessionStorage.removeItem('playerName');
      
      console.log('📡 JoinPage - Emitting join_game without credentials:', { gameId, playerName: playerName.trim() });
      emit('join_game', {
        gameId,
        playerName: playerName.trim()
      });
    }
  };

  console.log('🔌 JoinPage - Socket connection status:', { isConnected, serverUrl, gameId });
  
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setHasJoined(false);
              setIsJoining(false);
              window.location.href = '/';
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!gameId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">Invalid game ID</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (gameState) {
    // Redirect to main game page
    window.location.href = '/';
    return null;
  }

  if (hasJoined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to the game, {playerName}!
            </h1>
            <p className="text-gray-600 mb-6">
              Waiting for game to start, please stand by...
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Connected to game {gameId}</span>
            </div>
            
            <div className="text-xs text-gray-400">
              The host will start the game when ready
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
        <div className="mb-6">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
          <h1 className="text-2xl font-bold text-center">Join Game</h1>
          <p className="text-center text-gray-600 mt-2">
            Game ID: <strong>{gameId}</strong>
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={20}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoinGame();
                }
              }}
            />
          </div>

          <button
            onClick={handleJoinGame}
            disabled={!playerName.trim() || isJoining}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Users className="w-5 h-5 mr-2" />
            {isJoining ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
