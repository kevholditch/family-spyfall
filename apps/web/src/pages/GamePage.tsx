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
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Handle game updates
  useEffect(() => {
    if (gameUpdate) {
      debugLog('📡 GamePage received game update:', gameUpdate);
      updateGameState(gameUpdate);
      
      // Reset acknowledgment when informing_players starts
      if (gameUpdate.type === 'informing_players') {
        setHasAcknowledged(false);
      }
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
    debugLog('🔄 GamePage - Rejoin effect triggered:', { 
      isConnected, 
      gameId, 
      hasRejoined,
      serverUrl
    });
    
    if (isConnected && gameId && !hasRejoined) {
      const playerId = sessionStorage.getItem('playerId');
      const playerSecret = sessionStorage.getItem('playerSecret');
      const playerName = sessionStorage.getItem('playerName');
      
      debugLog('🔄 GamePage - Auto-rejoining game:', { 
        gameId, 
        playerId, 
        playerName,
        hasSecret: !!playerSecret,
        serverUrl
      });
      
      if (playerId && playerSecret) {
        debugLog('📡 GamePage - Emitting join_game for reconnection...');
        debugLog('📡 GamePage - Socket connected to:', serverUrl);
        debugLog('📡 GamePage - Credentials:', { playerId, playerName, hasSecret: !!playerSecret });
        
        emit('join_game', {
          gameId,
          playerName: playerName || 'Player',
          playerId,
          secret: playerSecret
        });
        setHasRejoined(true);
        debugLog('✅ GamePage - join_game emitted, fetching game state...');
        
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
    debugLog('⏳ GamePage - Waiting for game data:', { 
      hasGameState: !!gameState, 
      hasRoleAssignment: !!roleAssignment,
      gameState: gameState ? { status: gameState.status, roundNumber: gameState.roundNumber } : null
    });
    
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Waiting for Game to Start...</h2>
          <p className="text-gray-400">The host will start the game when ready</p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-500">
              <p>Debug: gameState={gameState ? '✓' : '✗'}, roleAssignment={roleAssignment ? '✓' : '✗'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentTurnPlayer?.id;

  const handleAcknowledgeRole = () => {
    emit('acknowledge_role_info');
    setHasAcknowledged(true);
  };

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
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#1e3a5f',
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
          url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")
        `,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: '#f5f5dc',
        overflow: 'auto'
      }}
    >
      <div className="max-w-4xl w-full">
        {/* Informing Players Phase */}
        {gameState.status === 'informing_players' && (
          <div style={{ textAlign: 'center' }}>
            {!hasAcknowledged ? (
              // Show role info with acknowledge button
              <div>
                {roleAssignment.role === 'spy' ? (
                  <div>
                    <h2 
                      style={{
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: 'bold',
                        color: '#f5f5dc',
                        marginBottom: '2rem'
                      }}
                    >
                      YOU ARE THE SPY!
                    </h2>
                    <p 
                      style={{
                        fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                        color: '#f5f5dc',
                        marginBottom: '3rem',
                        lineHeight: '1.6'
                      }}
                    >
                      Your mission is to figure out the secret location without revealing that you're the spy.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h2 
                      style={{
                        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                        fontWeight: 'bold',
                        color: '#f5f5dc',
                        marginBottom: '2rem'
                      }}
                    >
                      YOUR LOCATION
                    </h2>
                    <div 
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '2rem',
                        marginBottom: '3rem'
                      }}
                    >
                      <h3 
                        style={{
                          fontSize: 'clamp(2rem, 5vw, 3rem)',
                          fontWeight: 'bold',
                          color: '#f5f5dc'
                        }}
                      >
                        {roleAssignment.location}
                      </h3>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleAcknowledgeRole}
                  style={{
                    padding: '1rem 3rem',
                    fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                    fontWeight: 'bold',
                    backgroundColor: '#ff8c42',
                    color: '#f5f5dc',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 4px 16px rgba(255, 140, 66, 0.3)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff9f66'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff8c42'}
                >
                  Ready
                </button>
              </div>
            ) : (
              // Show waiting message after acknowledgment
              <div>
                <div 
                  style={{
                    width: '4rem',
                    height: '4rem',
                    border: '4px solid rgba(255, 140, 66, 0.3)',
                    borderTop: '4px solid #ff8c42',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 2rem'
                  }}
                ></div>
                <h2 
                  style={{
                    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                    fontWeight: 'bold',
                    color: '#f5f5dc',
                    marginBottom: '1rem'
                  }}
                >
                  Waiting for other players...
                </h2>
                <p 
                  style={{
                    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                    color: '#f5f5dc',
                    opacity: 0.8
                  }}
                >
                  Everyone needs to confirm they've seen their role before the round starts
                </p>
              </div>
            )}
          </div>
        )}

        {/* Question Phase */}
        {gameState.status === 'playing' && (
          <div style={{ textAlign: 'center' }}>
            {/* Top Info Bar */}
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '3rem',
                fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                fontWeight: 'bold',
                color: '#f5f5dc'
              }}
            >
              <div>R{gameState.roundNumber}</div>
              <div>{currentPlayer?.score || 0} Pts</div>
            </div>
            
            {/* Center Content */}
            <div style={{ marginBottom: '2rem' }}>
              {isMyTurn ? (
                <div>
                  <p 
                    style={{
                      fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                      fontWeight: 'bold',
                      color: '#f5f5dc',
                      marginBottom: '2rem'
                    }}
                  >
                    Ask a question
                  </p>
                  <button
                    onClick={handleNextTurn}
                    style={{
                      padding: '1rem 3rem',
                      fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                      fontWeight: 'bold',
                      backgroundColor: '#ff8c42',
                      color: '#f5f5dc',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      boxShadow: '0 4px 16px rgba(255, 140, 66, 0.3)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff9f66'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff8c42'}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <p 
                  style={{
                    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                    fontWeight: 'bold',
                    color: '#f5f5dc'
                  }}
                >
                  {currentTurnPlayer?.name || 'Unknown'} asking question
                </p>
              )}
            </div>
          </div>
        )}

        {/* Round Summary */}
        {gameState.status === 'round_summary' && gameState.roundResult && (
          <div style={{ textAlign: 'center' }}>
            <h2 
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 'bold',
                color: '#f5f5dc',
                marginBottom: '2rem'
              }}
            >
              Round Results!
            </h2>
            
            {/* Win/Loss Banner */}
            <div style={{ marginBottom: '2rem' }}>
              {gameState.roundResult.spyGuessedCorrectly && (
                <div 
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'rgba(255, 140, 66, 0.2)',
                    borderRadius: '12px',
                    marginBottom: '1rem'
                  }}
                >
                  <p 
                    style={{
                      fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                      fontWeight: 'bold',
                      color: '#f5f5dc',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Spy wins the round!
                  </p>
                  <p 
                    style={{
                      fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                      color: '#f5f5dc'
                    }}
                  >
                    Location: {gameState.roundResult.correctLocation}
                  </p>
                </div>
              )}
              
              {!gameState.roundResult.spyGuessedCorrectly && gameState.roundResult.civiliansWon && (
                <div 
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'rgba(255, 140, 66, 0.2)',
                    borderRadius: '12px',
                    marginBottom: '1rem'
                  }}
                >
                  <p 
                    style={{
                      fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                      fontWeight: 'bold',
                      color: '#f5f5dc',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Civilians win the round, {Object.values(gameState.roundResult.pointsAwarded).filter(p => p > 0).length}/{gameState.players.length - 1} civilians guessed correctly!
                  </p>
                  <p 
                    style={{
                      fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                      color: '#f5f5dc'
                    }}
                  >
                    Location: {gameState.roundResult.correctLocation}
                  </p>
                </div>
              )}
              
              {!gameState.roundResult.spyGuessedCorrectly && !gameState.roundResult.civiliansWon && (
                <div 
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'rgba(255, 140, 66, 0.2)',
                    borderRadius: '12px',
                    marginBottom: '1rem'
                  }}
                >
                  <p 
                    style={{
                      fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                      fontWeight: 'bold',
                      color: '#f5f5dc',
                      marginBottom: '0.5rem'
                    }}
                  >
                    No winner this round!
                  </p>
                  <p 
                    style={{
                      fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                      color: '#f5f5dc'
                    }}
                  >
                    Location: {gameState.roundResult.correctLocation}
                  </p>
                </div>
              )}
            </div>

            {/* Points Awarded */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 
                style={{
                  fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                  fontWeight: 'bold',
                  color: '#f5f5dc',
                  marginBottom: '1rem'
                }}
              >
                Points This Round:
              </h3>
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '1rem',
                  maxWidth: '600px',
                  margin: '0 auto'
                }}
              >
                {gameState.players.map(player => {
                  const pointsAwarded = gameState.roundResult?.pointsAwarded[player.id] || 0;
                  const isCurrentPlayer = player.id === currentPlayer?.id;
                  return (
                    <div 
                      key={player.id} 
                      style={{
                        padding: '1rem',
                        backgroundColor: isCurrentPlayer ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                        border: isCurrentPlayer ? '2px solid #ffd700' : '1px solid rgba(255, 140, 66, 0.3)',
                        borderRadius: '8px'
                      }}
                    >
                      <div 
                        style={{
                          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                          fontWeight: isCurrentPlayer ? 'bold' : 'normal',
                          color: '#f5f5dc',
                          marginBottom: '0.5rem'
                        }}
                      >
                        {player.name}
                      </div>
                      <div 
                        style={{
                          fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                          fontWeight: 'bold',
                          color: '#ffd700'
                        }}
                      >
                        {pointsAwarded > 0 ? `+${pointsAwarded}` : '0'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Countdown */}
            <div style={{ marginTop: '2rem' }}>
              <p 
                style={{
                  fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                  color: '#f5f5dc'
                }}
              >
                Next round starts in <strong style={{ color: '#ff8c42' }}>{countdown}s</strong>
              </p>
            </div>
          </div>
        )}

        {/* Accuse Mode */}
        {gameState.status === 'accusing' && (
          <div style={{ textAlign: 'center' }}>
            <h2 
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 'bold',
                color: '#f5f5dc',
                marginBottom: '2rem'
              }}
            >
              Accusation Phase!
            </h2>
            
            {roleAssignment.role === 'spy' ? (
              // Spy: Guess the location
              <div>
                <p 
                  style={{
                    fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                    color: '#f5f5dc',
                    marginBottom: '2rem'
                  }}
                >
                  Guess the location to win 3 points!
                </p>
                {!gameState.accuseMode?.spyLocationGuess && (
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem',
                      maxWidth: '600px',
                      margin: '0 auto'
                    }}
                  >
                    {SPYFALL_LOCATIONS.map(loc => (
                      <button
                        key={loc.name}
                        onClick={() => handleSpyGuess(loc.name)}
                        style={{
                          padding: '1rem',
                          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                          fontWeight: 'bold',
                          backgroundColor: '#ff8c42',
                          color: '#f5f5dc',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff9f66'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff8c42'}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                )}
                {gameState.accuseMode?.spyLocationGuess && (
                  <p 
                    style={{
                      fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                      color: '#f5f5dc'
                    }}
                  >
                    ✓ You've submitted your guess. Waiting for others...
                  </p>
                )}
              </div>
            ) : (
              // Civilian: Vote for who they think is the spy
              <div>
                <p 
                  style={{
                    fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                    color: '#f5f5dc',
                    marginBottom: '2rem'
                  }}
                >
                  Vote for who you think is the spy!
                </p>
                {!gameState.accuseMode?.playerVotes[currentPlayer?.id || ''] && (
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem',
                      maxWidth: '600px',
                      margin: '0 auto'
                    }}
                  >
                    {gameState.players
                      .filter(p => p.id !== currentPlayer?.id)
                      .map(player => (
                        <button
                          key={player.id}
                          onClick={() => handlePlayerVote(player.id)}
                          style={{
                            padding: '1rem',
                            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                            fontWeight: 'bold',
                            backgroundColor: '#ff8c42',
                            color: '#f5f5dc',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff9f66'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff8c42'}
                        >
                          {player.name}
                        </button>
                      ))}
                  </div>
                )}
                {gameState.accuseMode?.playerVotes[currentPlayer?.id || ''] && (
                  <p 
                    style={{
                      fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                      color: '#f5f5dc'
                    }}
                  >
                    ✓ You've cast your vote. Waiting for others...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Back Button */}
        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#f5f5dc',
              border: '1px solid rgba(255, 140, 66, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            <ArrowLeft style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }} />
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
}
