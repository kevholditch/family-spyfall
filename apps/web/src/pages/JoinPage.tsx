import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGameState } from '../hooks/useGameState';
import { ArrowLeft, Users } from 'lucide-react';
import { debugLog } from '../utils/debug';

export function JoinPage() {
  const { gameId } = useParams<{ gameId: string }>();
  // Use the same host as the web app but port 4000 for the server
  const serverUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
  const { emit, gameUpdate, error, isConnected } = useSocket(serverUrl);
  const { gameState, setGame, updateGameState } = useGameState();
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  // Helper to add debug messages (console only)
  const addDebugMsg = useCallback((msg: string) => {
    debugLog(msg); // Only log to console
  }, []);

  // Handle game updates
  useEffect(() => {
    if (gameUpdate) {
      debugLog('📡 JoinPage received game update:', gameUpdate);
      addDebugMsg(`📡 Received: ${gameUpdate.type}`);
      if (gameUpdate.type === 'round_started') {
        addDebugMsg(`🎯 round_started data: ${JSON.stringify(gameUpdate.data)}`);
      }
      
      // If we receive player_reconnected, it means someone else reconnected
      // This might mean the game started while we were disconnected
      if (gameUpdate.type === 'player_reconnected' && hasJoined) {
        addDebugMsg('🔄 Someone reconnected - checking if game started');
        // Re-emit join_game to ensure we're in the right room
        const storedPlayerId = sessionStorage.getItem('playerId');
        const storedSecret = sessionStorage.getItem('playerSecret');
        if (storedPlayerId && storedSecret && storedPlayerId !== 'undefined') {
          addDebugMsg('🔄 Re-joining game to sync state');
          emit('join_game', {
            gameId: gameId || '',
            playerName: playerName.trim(),
            playerId: storedPlayerId,
            secret: storedSecret
          });
        }
      }
      
      updateGameState(gameUpdate);
      
      // If game starts and we've joined, redirect to game page
      if (gameUpdate.type === 'informing_players' || gameUpdate.type === 'round_started') {
        // Check both hasJoined state AND sessionStorage (more reliable)
        const storedPlayerId = sessionStorage.getItem('playerId');
        const storedGameId = sessionStorage.getItem('gameId');
        const hasStoredCredentials = storedPlayerId && storedPlayerId !== 'undefined' && 
                                     storedGameId && storedGameId !== 'undefined';
        
        addDebugMsg(`🎮 ${gameUpdate.type}! hasJoined=${hasJoined}, hasCreds=${hasStoredCredentials}`);
        
        if (hasJoined || hasStoredCredentials) {
          addDebugMsg('✅ Redirecting to game page...');
          // Use setTimeout to ensure state updates are processed
          setTimeout(() => {
            window.location.href = `/game/${gameId}`;
          }, 100);
        } else {
          addDebugMsg('❌ NOT redirecting! No join state or credentials');
        }
      }
    }
  }, [gameUpdate, updateGameState, hasJoined, gameId, addDebugMsg]);

  // Handle game state changes (like when game starts) - fallback redirect
  useEffect(() => {
    if (gameState && (gameState.status === 'informing_players' || gameState.status === 'playing')) {
      const storedPlayerId = sessionStorage.getItem('playerId');
      const hasStoredCredentials = storedPlayerId && storedPlayerId !== 'undefined';
      
      debugLog('🎮 JoinPage - Game status changed to:', gameState.status, {
        hasJoined,
        hasStoredCredentials
      });
      
      if (hasJoined || hasStoredCredentials) {
        debugLog('✅ JoinPage - Fallback redirect to game page');
        window.location.href = `/game/${gameId}`;
      }
    }
  }, [gameState, hasJoined, gameId]);

  // Handle successful join
  useEffect(() => {
    debugLog('🔍 JoinPage - Checking for successful join:', {
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
    
    if (gameUpdate?.type === 'player_joined' && gameUpdate.data.id) {
      const { id: playerId, secret, name } = gameUpdate.data;
      
      addDebugMsg(`📥 player_joined: "${name}" (me: "${playerName.trim()}")`);
      
      // Only process this join event if it's for the current player (compare trimmed names)
      if (name === playerName.trim()) {
        addDebugMsg('✅ That\'s me! Setting hasJoined=TRUE');
        setIsJoining(false);
        setHasJoined(true);
      } else {
        addDebugMsg(`⏭️ Ignoring, that's someone else`);
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
  }, [gameUpdate, playerName, gameId, gameState, setGame, addDebugMsg]);

  const handleJoinGame = () => {
    if (!gameId || !playerName.trim()) {
      return;
    }

    addDebugMsg(`🎮 Join button clicked: "${playerName.trim()}"`);
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
      addDebugMsg('📡 Emitting join_game (with saved credentials)');
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
      
      addDebugMsg('📡 Emitting join_game (new player)');
      emit('join_game', {
        gameId,
        playerName: playerName.trim()
      });
    }
  };

  debugLog('🔌 JoinPage - Socket connection status:', { isConnected, serverUrl, gameId });
  
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
