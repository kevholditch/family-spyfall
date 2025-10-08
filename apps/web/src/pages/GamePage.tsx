import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGameState } from '../hooks/useGameState';
import { Eye, EyeOff, Users, Clock, ArrowLeft } from 'lucide-react';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const serverUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
  const { emit, gameUpdate, error, isConnected, roleAssignment } = useSocket(serverUrl);
  const { gameState, currentPlayer, setGame, updateGameState } = useGameState();
  const [hasRejoined, setHasRejoined] = useState(false);

  // Handle game updates
  useEffect(() => {
    if (gameUpdate) {
      console.log('📡 GamePage received game update:', gameUpdate);
      updateGameState(gameUpdate);
    }
  }, [gameUpdate, updateGameState]);

  // Handle role assignments
  useEffect(() => {
    if (roleAssignment) {
      console.log('🎭 GamePage - Role assignment received:', roleAssignment);
    }
  }, [roleAssignment]);

  // Auto-rejoin the game when the page loads (only once!)
  useEffect(() => {
    if (isConnected && gameId && !hasRejoined) {
      const playerId = sessionStorage.getItem('playerId');
      const playerSecret = sessionStorage.getItem('playerSecret');
      
      console.log('🔄 GamePage - Auto-rejoining game:', { gameId, playerId, hasSecret: !!playerSecret });
      
      if (playerId && playerSecret) {
        emit('join_game', {
          gameId,
          playerName: sessionStorage.getItem('playerName') || 'Player',
          playerId,
          secret: playerSecret
        });
        setHasRejoined(true);
        
        // Fetch game state from API
        fetch(`${serverUrl}/api/games/${gameId}`)
          .then(res => res.json())
          .then(serverGameState => {
            console.log('✅ GamePage - Fetched game state from API:', serverGameState);
            setGame(serverGameState, playerId, playerSecret);
          })
          .catch(err => console.error('❌ GamePage - Failed to fetch game state:', err));
      } else {
        console.error('❌ GamePage - No saved credentials, redirecting to join page');
        window.location.href = `/join/${gameId}`;
      }
    }
  }, [isConnected, gameId, hasRejoined, emit, serverUrl, setGame]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Connecting to Game...</h2>
          <p className="text-gray-400">Joining game {gameId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Connection Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!gameState || !roleAssignment) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Waiting for Game to Start...</h2>
          <p className="text-gray-400">The host will start the game when ready</p>
        </div>
      </div>
    );
  }

  // Game is active - show role-specific content
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            FAMILY SPYFALL
          </h1>
          <div className="flex items-center justify-center space-x-8 text-lg">
            <div className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-blue-400" />
              <span>Game ID: <strong className="text-yellow-400">{gameId}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-6 h-6 text-green-400" />
              <span>Round: <strong className="text-yellow-400">{gameState.roundNumber}</strong></span>
            </div>
          </div>
        </div>

        {/* Role Display */}
        <div className="bg-gray-800 rounded-xl p-8 shadow-xl text-center">
          {roleAssignment.role === 'spy' ? (
            // Spy Screen
            <div>
              <div className="mb-6">
                <EyeOff className="w-24 h-24 mx-auto mb-4 text-red-400" />
                <h2 className="text-3xl font-bold text-red-400 mb-2">YOU ARE THE SPY!</h2>
                <p className="text-gray-300 text-lg">
                  Your mission is to figure out the secret location without revealing that you're the spy.
                </p>
              </div>
              
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-red-400 mb-4">Spy Instructions:</h3>
                <ul className="text-left text-gray-300 space-y-2">
                  <li>• Listen carefully to other players' questions and answers</li>
                  <li>• Ask vague questions that could apply to many locations</li>
                  <li>• Try to figure out the location from context clues</li>
                  <li>• Don't reveal that you don't know the location</li>
                </ul>
              </div>
            </div>
          ) : (
            // Civilian Screen
            <div>
              <div className="mb-6">
                <Eye className="w-24 h-24 mx-auto mb-4 text-green-400" />
                <h2 className="text-3xl font-bold text-green-400 mb-2">YOUR LOCATION</h2>
                <p className="text-gray-300 text-lg">
                  You know the secret location. Help others figure it out, but watch out for the spy!
                </p>
              </div>
              
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-8">
                <h3 className="text-4xl font-bold text-green-400 mb-4">
                  {roleAssignment.location}
                </h3>
                <p className="text-gray-300">
                  Ask questions that help others guess this location, but be careful not to be too obvious!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Game Info */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Game Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">{gameState.players.length}</div>
              <div className="text-gray-400">Players</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{gameState.status}</div>
              <div className="text-gray-400">Status</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {gameState.players[gameState.currentPlayerIndex]?.name || 'Unknown'}
              </div>
              <div className="text-gray-400">Current Turn</div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
}
