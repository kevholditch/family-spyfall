import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameState } from '../hooks/useGameState';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { GameControls } from '../components/GameControls';
import { VotingModal } from '../components/VotingModal';
import { Plus, Users, Settings, Gamepad2, Eye, EyeOff, Clock } from 'lucide-react';
import { debugLog, errorLog } from '../utils/debug';

export function HomePage() {
  // Use the same host as the web app but port 4000 for the server
  const serverUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
  const { emit, gameUpdate, error, isConnected } = useSocket(serverUrl);
  const { gameState, currentPlayer, setGame, updateGameState } = useGameState();
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);

  // Handle game updates
  useEffect(() => {
    if (gameUpdate) {
      debugLog('📡 HomePage received game update:', gameUpdate);
      
      // Skip TV Host player_joined events - TV Host is not a real player
      if (gameUpdate.type === 'player_joined' && gameUpdate.data?.name === 'TV Host') {
        debugLog('⚠️ HomePage - Skipping TV Host player_joined event');
        return;
      }
      
      if (gameUpdate.type === 'round_started') {
        debugLog('🎮 HomePage - Game started!', gameUpdate.data);
      }
      updateGameState(gameUpdate);
    }
  }, [gameUpdate, updateGameState]);

  const handleCreateGame = async () => {
    debugLog('🎮 HomePage - Create Game button clicked');
    debugLog('🌐 Server URL:', serverUrl);
    setIsCreatingGame(true);
    try {
      debugLog('📡 HomePage - Making API call to create game...');
      const response = await fetch(`${serverUrl}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create game');
      }
      
      const data = await response.json();
      debugLog('✅ HomePage - Game created successfully:', data);
      setCreatedGameId(data.gameId);
      
      // Auto-join as host
      const hostName = 'TV Host';
      debugLog('👤 HomePage - Auto-joining as host:', { gameId: data.gameId, playerName: hostName });
      emit('join_game', {
        gameId: data.gameId,
        playerName: hostName,
        isHost: true
      } as any);
      
    } catch (error) {
      errorLog('Error creating game:', error);
      alert('Failed to create game. Make sure the server is running on port 4000.');
    } finally {
      setIsCreatingGame(false);
    }
  };

  // Handle successful join - only for TV Host
  useEffect(() => {
    if (gameUpdate?.type === 'player_joined' && 
        gameUpdate.data.id && 
        gameUpdate.data.isHost && 
        gameUpdate.data.name === 'TV Host' && 
        !gameState) {  // Only run if we don't have a game state yet
      
      const { id: playerId, secret } = gameUpdate.data;
      
      // Store credentials for reconnection
      sessionStorage.setItem('tv_playerId', playerId);
      sessionStorage.setItem('tv_playerSecret', secret);
      sessionStorage.setItem('tv_gameId', createdGameId || '');
      
      // Fetch the game state from the server using the created game ID
      if (createdGameId) {
        const fetchGameState = async () => {
          try {
            const response = await fetch(`${serverUrl}/api/games/${createdGameId}`);
            if (response.ok) {
              const serverGameState = await response.json();
              setGame(serverGameState, playerId, secret);
            }
            } catch (error) {
            errorLog('Failed to fetch game state:', error);
          }
        };
        
        fetchGameState();
      }
    }
  }, [gameUpdate, createdGameId, setGame, gameState]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Connecting to Server...</h2>
          <p className="text-gray-400">Setting up TV control center</p>
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

  // If no game exists, show create game screen
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              FAMILY SPYFALL
            </h1>
            <h2 className="text-3xl font-semibold text-gray-300 mb-8">TV Control Center</h2>
          </div>

          <div className="bg-gray-800 rounded-xl p-8 shadow-xl text-center">
            <div className="mb-8">
              <Gamepad2 className="w-24 h-24 mx-auto mb-6 text-blue-400" />
              <h3 className="text-2xl font-bold mb-4">Ready to Start a Game?</h3>
              <p className="text-gray-400 text-lg mb-8">
                Create a new game and share the join link with players. 
                This screen will show all game activity in real-time.
              </p>
            </div>

            <button
              onClick={handleCreateGame}
              disabled={isCreatingGame}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white text-xl font-bold rounded-xl hover:from-green-700 hover:to-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {isCreatingGame ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Creating Game...
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 mr-3" />
                  Create New Game
                </>
              )}
            </button>

            <div className="mt-8 text-sm text-gray-500">
              <p>Once created, players can join using the QR code or join link</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Game exists - show TV control center
  const currentPlayerInfo = gameState.players[gameState.currentPlayerIndex];
  // TV Host is no longer in the players array
  const actualPlayers = gameState.players;
  const connectedPlayers = actualPlayers.filter(p => p.isConnected);

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
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="ml-4 p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
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
                Need at least 1 player to start (debug mode)
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
              
              {connectedPlayers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                  <p className="text-xl text-gray-400 mb-2">No players joined yet</p>
                  <p className="text-gray-500">Share the QR code or join link below to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {actualPlayers.filter((player, _index, arr) => 
                    // Remove duplicates by keeping only the first occurrence of each player ID
                    arr.findIndex(p => p.id === player.id) === _index
                  ).map((player) => {
                    // Find the original index in the full players array for turn checking
                    const originalIndex = gameState.players.findIndex(p => p.id === player.id);
                    const isCurrentTurn = originalIndex === gameState.currentPlayerIndex;
                    const isHost = player.isHost;
                    
                    return (
                      <div
                        key={player.id}
                        className={`
                          p-4 rounded-lg border-2 transition-all
                          ${isCurrentTurn 
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
                          
                          <div className="flex space-x-2">
                            {isHost && (
                              <div className="px-3 py-1 bg-purple-600 text-white text-sm font-bold rounded-full">
                                HOST
                              </div>
                            )}
                            
                            {isCurrentTurn && gameState.status === 'playing' && (
                              <div className="px-3 py-1 bg-yellow-400 text-black text-sm font-bold rounded-full">
                                CURRENT TURN
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

          {/* Right Column - Join Info & Controls */}
          <div className="space-y-6">
            {/* QR Code for Joining */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-center">JOIN GAME</h3>
              <QRCodeDisplay gameId={gameState.id} />
            </div>

            {/* Host Controls */}
            <GameControls
              gameState={gameState}
              currentPlayer={currentPlayer}
              onStartRound={() => {
                debugLog('🎮 HomePage - onStartRound called, emitting start_round event');
                emit('start_round');
              }}
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

        {/* Settings Panel */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Game Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Server URL
                  </label>
                  <input
                    type="text"
                    value={`${window.location.protocol}//${window.location.hostname}:4000`}
                    disabled
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                  />
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}