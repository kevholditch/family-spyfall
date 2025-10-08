import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGameState } from '../hooks/useGameState';
import { Eye, EyeOff, Users, Clock, ArrowLeft } from 'lucide-react';
import { debugLog, debugError } from '../utils/debug';
import { SPYFALL_LOCATIONS } from '../types';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const serverUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
  const { emit, gameUpdate, error, isConnected, roleAssignment } = useSocket(serverUrl);
  const { gameState, currentPlayer, setGame, updateGameState } = useGameState();
  const [hasRejoined, setHasRejoined] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Handle game updates
  useEffect(() => {
    if (gameUpdate) {
      debugLog('📡 GamePage received game update:', gameUpdate);
      updateGameState(gameUpdate);
    }
  }, [gameUpdate, updateGameState]);

  // Handle role assignments
  useEffect(() => {
    if (roleAssignment) {
      debugLog('🎭 GamePage - Role assignment received:', roleAssignment);
    }
  }, [roleAssignment]);

  // Countdown timer for round summary
  useEffect(() => {
    if (gameState?.status === 'round_summary') {
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState?.status]);

  // Auto-rejoin the game when the page loads (only once!)
  useEffect(() => {
    if (isConnected && gameId && !hasRejoined) {
      const playerId = sessionStorage.getItem('playerId');
      const playerSecret = sessionStorage.getItem('playerSecret');
      
      debugLog('🔄 GamePage - Auto-rejoining game:', { gameId, playerId, hasSecret: !!playerSecret });
      
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
            debugLog('✅ GamePage - Fetched game state from API:', serverGameState);
            setGame(serverGameState, playerId, playerSecret);
          })
          .catch(err => debugError('❌ GamePage - Failed to fetch game state:', err));
      } else {
        debugError('❌ GamePage - No saved credentials, redirecting to join page');
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

  const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentTurnPlayer?.id;

  const handleNextTurn = () => {
    emit('next_turn');
  };

  const handleSpyGuess = (locationGuess: string) => {
    emit('submit_spy_guess', { locationGuess });
  };

  const handlePlayerVote = (accusedPlayerId: string) => {
    emit('submit_player_vote', { accusedPlayerId });
  };

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

        {/* Question Phase */}
        {gameState.status === 'playing' && (
          <div className="mb-8 bg-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-center mb-4">Question Round</h2>
            <div className="text-center mb-6">
              <p className="text-xl text-gray-300 mb-2">Current Turn:</p>
              <p className="text-3xl font-bold text-yellow-400">{currentTurnPlayer?.name || 'Unknown'}</p>
            </div>
            {isMyTurn && (
              <div className="text-center">
                <p className="text-lg text-gray-300 mb-4">It's your turn! Ask your question, then click Next.</p>
                <button
                  onClick={handleNextTurn}
                  className="px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Round Summary */}
        {gameState.status === 'round_summary' && gameState.roundResult && (
          <div className="mb-8 bg-gray-800 rounded-xl p-8 shadow-xl">
            <h2 className="text-3xl font-bold text-center mb-6 text-yellow-400">Round Results!</h2>
            
            {/* Result Summary */}
            <div className="mb-6 space-y-4">
              <div className={`p-4 rounded-lg ${gameState.roundResult.spyGuessedCorrectly ? 'bg-red-900/30 border border-red-500' : 'bg-gray-700'}`}>
                <p className="text-lg">
                  <strong>Spy's Guess:</strong> {gameState.roundResult.spyGuess || 'No guess'} 
                  {gameState.roundResult.spyGuessedCorrectly && <span className="text-green-400 ml-2">✓ Correct! (+3 points)</span>}
                  {!gameState.roundResult.spyGuessedCorrectly && gameState.roundResult.spyGuess && <span className="text-red-400 ml-2">✗ Wrong</span>}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${gameState.roundResult.civiliansWon && !gameState.roundResult.spyGuessedCorrectly ? 'bg-green-900/30 border border-green-500' : 'bg-gray-700'}`}>
                <p className="text-lg">
                  <strong>Correct Location:</strong> {gameState.roundResult.correctLocation}
                </p>
                {gameState.roundResult.civiliansWon && !gameState.roundResult.spyGuessedCorrectly && (
                  <p className="text-green-400 mt-2">✓ Civilians found the spy! (+1 point each to correct voters)</p>
                )}
              </div>
            </div>

            {/* Points Awarded */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Points This Round:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {gameState.players.map(player => {
                  const pointsAwarded = gameState.roundResult?.pointsAwarded[player.id] || 0;
                  return (
                    <div 
                      key={player.id} 
                      className={`p-3 rounded-lg ${pointsAwarded > 0 ? 'bg-green-900/50 border-2 border-green-500' : 'bg-gray-700'} ${player.id === currentPlayer?.id ? 'ring-2 ring-blue-400' : ''}`}
                    >
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-2xl font-bold text-yellow-400">
                        {pointsAwarded > 0 ? `+${pointsAwarded}` : '0'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Countdown */}
            <div className="text-center">
              <p className="text-xl text-gray-300">
                Next round starts in: <strong className="text-yellow-400 text-2xl">{countdown}s</strong>
              </p>
            </div>
          </div>
        )}

        {/* Accuse Mode */}
        {gameState.status === 'accusing' && (
          <div className="mb-8 bg-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-center mb-6 text-red-400">Accusation Phase!</h2>
            
            {roleAssignment.role === 'spy' ? (
              // Spy: Guess the location
              <div>
                <p className="text-lg text-gray-300 mb-4 text-center">
                  Guess the location to win 3 points!
                </p>
                {!gameState.accuseMode?.spyLocationGuess && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {SPYFALL_LOCATIONS.map(loc => (
                      <button
                        key={loc.name}
                        onClick={() => handleSpyGuess(loc.name)}
                        className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                )}
                {gameState.accuseMode?.spyLocationGuess && (
                  <p className="text-center text-green-400 text-xl">
                    ✓ You've submitted your guess. Waiting for others...
                  </p>
                )}
              </div>
            ) : (
              // Civilian: Vote for who they think is the spy
              <div>
                <p className="text-lg text-gray-300 mb-4 text-center">
                  Vote for who you think is the spy!
                </p>
                {!gameState.accuseMode?.playerVotes[currentPlayer?.id || ''] && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {gameState.players
                      .filter(p => p.id !== currentPlayer?.id)
                      .map(player => (
                        <button
                          key={player.id}
                          onClick={() => handlePlayerVote(player.id)}
                          className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          {player.name}
                        </button>
                      ))}
                  </div>
                )}
                {gameState.accuseMode?.playerVotes[currentPlayer?.id || ''] && (
                  <p className="text-center text-green-400 text-xl">
                    ✓ You've cast your vote. Waiting for others...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Role Display */}
        <div className="bg-gray-800 rounded-xl p-8 shadow-xl text-center mb-8">
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
            </div>
          ) : (
            // Civilian Screen
            <div>
              <div className="mb-6">
                <Eye className="w-24 h-24 mx-auto mb-4 text-green-400" />
                <h2 className="text-3xl font-bold text-green-400 mb-2">YOUR LOCATION</h2>
              </div>
              
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-8">
                <h3 className="text-4xl font-bold text-green-400 mb-4">
                  {roleAssignment.location}
                </h3>
              </div>
            </div>
          )}
        </div>

        {/* Player Scores */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Scores</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gameState.players.map(player => (
              <div key={player.id} className={`p-4 rounded-lg ${player.id === currentPlayer?.id ? 'bg-blue-900/50 border-2 border-blue-500' : 'bg-gray-700'}`}>
                <div className="font-semibold text-white">{player.name}</div>
                <div className="text-2xl font-bold text-yellow-400">{player.score || 0}</div>
              </div>
            ))}
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
