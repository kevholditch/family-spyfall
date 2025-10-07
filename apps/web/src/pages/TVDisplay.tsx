import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGameState } from '../hooks/useGameState';
import { PlayerList } from '../components/PlayerList';
import { TurnBanner } from '../components/TurnBanner';
import { GameControls } from '../components/GameControls';
import { VotingModal } from '../components/VotingModal';
import { RoleDisplay } from '../components/RoleDisplay';
import { Users, Clock, Eye, EyeOff, Gamepad2 } from 'lucide-react';

export function TVDisplay() {
  const { gameId } = useParams<{ gameId: string }>();
  // Use the same host as the web app but port 4000 for the server
  const serverUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
  const { emit, gameUpdate, error, isConnected } = useSocket(serverUrl);
  const { gameState, currentPlayer, setGame, updateGameState } = useGameState();
  const [hostName, setHostName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Handle game updates
  useEffect(() => {
    if (gameUpdate) {
      updateGameState(gameUpdate);
    }
  }, [gameUpdate, updateGameState]);

  // Join as host for TV display
  useEffect(() => {
    if (gameId && !gameState) {
      const tvHostName = `TV Display - ${new Date().toLocaleTimeString()}`;
      setHostName(tvHostName);
      setIsJoining(true);
      
      emit('join_game', {
        gameId,
        playerName: tvHostName
      });
    }
  }, [gameId, gameState, emit]);

  // Handle successful join
  useEffect(() => {
    if (gameUpdate?.type === 'player_joined' && gameUpdate.data.playerId && isJoining) {
      const { playerId, secret } = gameUpdate.data;
      
      // Store credentials for reconnection
      localStorage.setItem('tv_playerId', playerId);
      localStorage.setItem('tv_playerSecret', secret);
      localStorage.setItem('tv_gameId', gameId);
      
      setIsJoining(false);
      
      // Set up game state
      if (gameState) {
        setGame(gameState, playerId, secret);
      }
    }
  }, [gameUpdate, isJoining, gameId, gameState, setGame]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Connecting to Server...</h2>
          <p className="text-gray-400">Setting up TV display</p>
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
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Joining Game...</h2>
          <p className="text-gray-400">Connecting to game: {gameId}</p>
        </div>
      </div>
    );
  }

  const currentPlayerInfo = gameState.players[gameState.currentPlayerIndex];
  const connectedPlayers = gameState.players.filter(p => p.isConnected);
  const spyCount = gameState.players.filter(p => p.role === 'spy').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            FAMILY SPYFALL
          </h1>
          <div className="flex items-center justify-center space-x-8 text-2xl">
            <div className="flex items-center space-x-2">
              <Gamepad2 className="w-8 h-8 text-blue-400" />
              <span>Game ID: <strong className="text-yellow-400">{gameState.id}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-8 h-8 text-green-400" />
              <span>Players: <strong className="text-green-400">{connectedPlayers.length}</strong></span>
            </div>
            {gameState.status === 'playing' && (
              <div className="flex items-center space-x-2">
                <span className="text-purple-400">Round {gameState.roundNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Game Status Banner */}
        {gameState.status === 'playing' && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <Clock className="w-12 h-12" />
                <h2 className="text-4xl font-bold">CURRENT TURN</h2>
              </div>
              {currentPlayerInfo && (
                <div className="text-3xl">
                  <span className="text-yellow-300">{currentPlayerInfo.name}</span>
                  <span className="text-white"> is asking questions</span>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState.status === 'voting' && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <Eye className="w-12 h-12" />
                <h2 className="text-4xl font-bold">VOTING IN PROGRESS</h2>
              </div>
              {gameState.accusation && (
                <div className="text-3xl">
                  <span className="text-yellow-300">
                    {gameState.players.find(p => p.id === gameState.accusation?.accusedPlayerId)?.name}
                  </span>
                  <span className="text-white"> is being accused of being the spy!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState.status === 'waiting' && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <Users className="w-12 h-12" />
                <h2 className="text-4xl font-bold">WAITING FOR PLAYERS</h2>
              </div>
              <div className="text-2xl text-green-200">
                Need at least 3 players to start
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Players */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-3xl font-bold mb-6 flex items-center">
                <Users className="w-8 h-8 mr-3 text-blue-400" />
                PLAYERS ({connectedPlayers.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameState.players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${index === gameState.currentPlayerIndex 
                        ? 'border-yellow-400 bg-yellow-400/10' 
                        : 'border-gray-600 bg-gray-700'
                      }
                      ${!player.isConnected ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-4 h-4 rounded-full
                          ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}
                        `} />
                        <span className="text-xl font-semibold">{player.name}</span>
                      </div>
                      
                      {index === gameState.currentPlayerIndex && (
                        <div className="px-3 py-1 bg-yellow-400 text-black text-sm font-bold rounded-full">
                          CURRENT TURN
                        </div>
                      )}
                      
                      {player.isHost && (
                        <div className="px-3 py-1 bg-purple-600 text-white text-sm font-bold rounded-full">
                          HOST
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Info */}
            {gameState.status === 'playing' && (
              <div className="mt-6 bg-gray-800 rounded-xl p-6 shadow-xl">
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <EyeOff className="w-6 h-6 mr-3 text-orange-400" />
                  GAME INFO
                </h3>
                <div className="text-lg space-y-2">
                  <div>• One player is the <span className="text-red-400 font-bold">SPY</span></div>
                  <div>• All others know the <span className="text-green-400 font-bold">LOCATION</span></div>
                  <div>• Ask questions to find the spy!</div>
                  <div>• Don't reveal the location to the spy!</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Controls */}
          <div className="space-y-6">
            {/* Host Controls */}
            <GameControls
              gameState={gameState}
              currentPlayer={currentPlayer}
              onStartRound={() => emit('start_round')}
              onAdvanceTurn={() => emit('advance_turn')}
              onAccusePlayer={(playerId) => emit('accuse_player', { accusedPlayerId: playerId })}
              onCancelAccusation={() => emit('cancel_accusation')}
              onEndRound={() => emit('end_round')}
            />

            {/* Connection Status */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                CONNECTION STATUS
              </h3>
              <div className="text-sm space-y-2">
                <div>Server: <span className={isConnected ? 'text-green-400' : 'text-red-400'}>{isConnected ? 'Connected' : 'Disconnected'}</span></div>
                <div>Game: <span className="text-green-400">Active</span></div>
                <div>Last Update: <span className="text-blue-400">{new Date().toLocaleTimeString()}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Voting Modal */}
        {gameState.status === 'voting' && (
          <VotingModal
            gameState={gameState}
            currentPlayer={currentPlayer}
            onVote={(vote) => emit('vote', { vote })}
          />
        )}
      </div>
    </div>
  );
}
