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

  // Handle game updates
  useEffect(() => {
    if (gameUpdate) {
      updateGameState(gameUpdate);
    }
  }, [gameUpdate, updateGameState]);

  // Handle successful join
  useEffect(() => {
    if (gameUpdate?.type === 'player_joined' && gameUpdate.data.playerId && isJoining) {
      const { playerId, secret } = gameUpdate.data;
      setIsJoining(false);
      
      // Store credentials for reconnection
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerSecret', secret);
      localStorage.setItem('gameId', gameId || '');
      
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

    setIsJoining(true);
    
    // Try to reconnect first if we have stored credentials
    const storedPlayerId = localStorage.getItem('playerId');
    const storedSecret = localStorage.getItem('playerSecret');
    
    // Only use stored credentials if they exist and are not the string 'undefined'
    if (storedPlayerId && storedSecret && 
        storedPlayerId !== 'undefined' && storedSecret !== 'undefined' &&
        gameId === localStorage.getItem('gameId')) {
      emit('join_game', {
        gameId,
        playerName: playerName.trim(),
        playerId: storedPlayerId,
        secret: storedSecret
      });
    } else {
      // Clear any invalid stored credentials
      localStorage.removeItem('playerId');
      localStorage.removeItem('playerSecret');
      localStorage.removeItem('gameId');
      
      emit('join_game', {
        gameId,
        playerName: playerName.trim()
      });
    }
  };

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
            onClick={() => window.location.href = '/'}
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
