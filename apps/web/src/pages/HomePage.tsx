import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameState } from '../hooks/useGameState';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { debugLog, errorLog } from '../utils/debug';

// Countdown hook for round summary
function useRoundCountdown(isRoundSummary: boolean) {
  const [countdown, setCountdown] = useState(50);

  useEffect(() => {
    if (isRoundSummary) {
      setCountdown(50); // Reset to 50 when entering round summary
      const interval = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRoundSummary]);

  return countdown;
}

export function HomePage() {
  // Use the same host as the web app but port 4000 for the server
  const serverUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
  const { emit, gameUpdate, error, isConnected } = useSocket(serverUrl);
  const { gameState, setGame, updateGameState } = useGameState();
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  
  // Countdown timer for round summary
  const countdown = useRoundCountdown(gameState?.status === 'round_summary');

  // Handle game updates
  useEffect(() => {
    if (gameUpdate) {
      console.log('📡 HomePage received game update:', gameUpdate);
      debugLog('📡 HomePage received game update:', gameUpdate);
      
      // Skip TV Host player_joined events - TV Host is not a real player
      if (gameUpdate.type === 'player_joined' && gameUpdate.data?.name === 'TV Host') {
        console.log('⚠️ HomePage - Skipping TV Host player_joined event');
        debugLog('⚠️ HomePage - Skipping TV Host player_joined event');
        return;
      }
      
      if (gameUpdate.type === 'round_started') {
        console.log('🎮 HomePage - Game started!', gameUpdate.data);
        debugLog('🎮 HomePage - Game started!', gameUpdate.data);
      }
      
      if (gameUpdate.type === 'round_summary') {
        console.log('🎯 HomePage - Round summary received!', gameUpdate.data);
        debugLog('🎯 HomePage - Round summary received!', gameUpdate.data);
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
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1e3a5f', // Dark teal
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")
          `,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
      >
        {/* Title - Make it much larger and more proportional */}
        <div className="text-center mb-16">
          <div 
            style={{
              fontFamily: 'Brush Script MT, cursive',
              color: '#ff7f50', // Coral orange
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
              fontSize: 'clamp(4rem, 8vw, 8rem)',
              fontWeight: 'normal',
              marginBottom: '1rem'
            }}
          >
            Family
          </div>
          <div 
            style={{
              fontFamily: 'Times New Roman, serif',
              color: '#f5f5dc', // Cream
              textShadow: '3px 3px 6px rgba(0, 0, 0, 0.4)',
              letterSpacing: '0.1em',
              fontSize: 'clamp(6rem, 12vw, 16rem)',
              fontWeight: 'bold'
            }}
          >
            SPYFALL
          </div>
        </div>

        {/* Create Game Button - Make it larger too */}
        <button
          onClick={handleCreateGame}
          disabled={isCreatingGame}
          className="px-16 py-8 text-3xl md:text-4xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          style={{
            backgroundColor: '#ff8c42', // Golden orange
            color: '#f5f5dc', // Cream
            boxShadow: '0 8px 32px rgba(255, 140, 66, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)',
            border: 'none',
            borderRadius: '12px',
            padding: '32px 64px',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            if (!isCreatingGame) {
              e.currentTarget.style.backgroundColor = '#ff9f66';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 140, 66, 0.4), 0 6px 20px rgba(0, 0, 0, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isCreatingGame) {
              e.currentTarget.style.backgroundColor = '#ff8c42';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 140, 66, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)';
            }
          }}
        >
          {isCreatingGame ? (
            <>
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-4"></div>
              Creating Game...
            </>
          ) : (
            'Create New Game'
          )}
        </button>
      </div>
    );
  }

  // Game exists - show TV control center
  const actualPlayers = gameState.players;
  const connectedPlayers = actualPlayers.filter(p => p.isConnected);
  
  // Debug logging for player updates
  console.log('🎮 HomePage - Current game state:', {
    totalPlayers: actualPlayers.length,
    connectedPlayers: connectedPlayers.length,
    allPlayers: actualPlayers.map(p => ({ name: p.name, id: p.id, isConnected: p.isConnected })),
    connectedPlayersList: connectedPlayers.map(p => ({ name: p.name, id: p.id, isConnected: p.isConnected }))
  });

  // Get sorted scoreboard
  const getSortedScoreboard = () => {
    return [...actualPlayers].sort((a, b) => {
      // First sort by score (descending)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // If tied, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  // Get current player name
  const getCurrentPlayerName = () => {
    if (gameState.status === 'waiting') return '';
    const currentPlayer = actualPlayers[gameState.currentPlayerIndex];
    return currentPlayer?.name || '';
  };

  // Get players left in round
  const getPlayersLeftInRound = () => {
    if (gameState.status === 'waiting') return { current: 0, total: 0 };
    
    const playersWhoAsked = actualPlayers.filter(p => p.hasAskedQuestion).length;
    const total = actualPlayers.length;
    const current = total - playersWhoAsked;
    
    return { current, total };
  };

  const isGameInProgress = gameState.status === 'playing' || 
                          gameState.status === 'accusing' || 
                          gameState.status === 'round_summary';

  // If game is in progress, show game state with scoreboard
  if (isGameInProgress) {
    const currentPlayerName = getCurrentPlayerName();
    const { current } = getPlayersLeftInRound();
    const sortedPlayers = getSortedScoreboard();

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1e3a5f', // Dark teal
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")
          `,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem',
          color: '#f5f5dc'
        }}
      >
        {/* Header - Family SPYFALL Logo */}
        <div className="text-center mb-12">
          <div 
            style={{
              fontFamily: 'Brush Script MT, cursive',
              color: '#ff7f50', // Coral orange
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 'normal',
              marginBottom: '0.5rem'
            }}
          >
            Family
          </div>
          <div 
            style={{
              fontFamily: 'Times New Roman, serif',
              color: '#f5f5dc', // Cream
              textShadow: '3px 3px 6px rgba(0, 0, 0, 0.4)',
              letterSpacing: '0.1em',
              fontSize: 'clamp(3.5rem, 7vw, 6rem)',
              fontWeight: 'bold'
            }}
          >
            SPYFALL
          </div>
        </div>

        {/* Main Content Area - Two Column Layout */}
        <div 
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            gap: '20px'
          }}
        >
          {/* Left Side - Scoreboard */}
          <div 
            data-testid="tv-scoreboard"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '2rem',
              minWidth: '300px',
              border: '2px solid rgba(255, 140, 66, 0.3)'
            }}
          >
            <h3 
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: 'bold',
                color: '#f5f5dc',
                textAlign: 'center',
                marginBottom: '1.5rem'
              }}
            >
              Scoreboard
            </h3>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  data-testid="scoreboard-player"
                  style={{
                    backgroundColor: index === 0 && player.score > 0 
                      ? 'rgba(255, 215, 0, 0.3)' // Gold tint for leader
                      : 'rgba(255, 140, 66, 0.2)',
                    borderRadius: '10px',
                    padding: '0.8rem 1.2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: index === 0 && player.score > 0 
                      ? '1px solid rgba(255, 215, 0, 0.5)' 
                      : '1px solid rgba(255, 140, 66, 0.4)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span 
                      style={{
                        fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)',
                        fontWeight: 'bold',
                        color: '#ff7f50', // Coral orange
                        minWidth: '1.5rem'
                      }}
                    >
                      #{index + 1}
                    </span>
                    <span 
                      style={{
                        fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                        fontWeight: 'bold',
                        color: '#f5f5dc'
                      }}
                      data-testid="player-name"
                    >
                      {player.name}
                    </span>
                  </div>
                  <span 
                    style={{
                      fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
                      fontWeight: 'bold',
                      color: player.score > 0 ? '#ffd700' : '#f5f5dc' // Gold for positive scores
                    }}
                    data-testid="player-score"
                  >
                    {player.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Vertical Divider Line */}
          <div 
            style={{
              width: '4px',
              height: '400px',
              backgroundColor: '#ff7f50', // Coral orange - same as Family text
              borderRadius: '2px'
            }}
          ></div>

          {/* Right Side - Game Status Information or Round Summary */}
          {gameState.status === 'round_summary' ? (
            // Round Summary Display
           
            <div 
              data-testid="tv-round-summary"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '2rem',
                minWidth: '300px',
                border: '2px solid rgba(255, 140, 66, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '1.5rem'
              }}
            >
              <div style={{ color: '#f5f5dc', textAlign: 'center', fontSize: '1.5rem' }}>
                Round Summary
              </div>
              {(() => {
                const roundResult = gameState.roundResult;
                
                if (!roundResult) {
                  return (
                    <div style={{ color: '#ff7f50', textAlign: 'center' }}>
                      Waiting for round results...
                    </div>
                  );
                }

                // Defensive check: ensure we have the computed fields from server
                if (!roundResult.spyName || roundResult.totalCiviliansCount === undefined) {
                  return (
                    <div style={{ color: '#ff7f50', textAlign: 'center' }}>
                      Loading round results...
                    </div>
                  );
                }
                
                if (roundResult.spyGuessedCorrectly) {
                  // Spy won
                  return (
                    <>
                      <div 
                        style={{
                          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                          fontWeight: 'bold',
                          color: '#ff7f50',
                          textAlign: 'center',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        Spy won!
                      </div>
                      
                      <div 
                        style={{
                          fontSize: 'clamp(1rem, 2vw, 1.3rem)',
                          color: '#f5f5dc',
                          textAlign: 'center'
                        }}
                      >
                        The spy was {roundResult.spyName}, they correctly guessed the location was {roundResult.spyGuess}
                      </div>

                      <div 
                        style={{
                          fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
                          fontWeight: 'bold',
                          color: '#ffd700',
                          textAlign: 'center'
                        }}
                      >
                        +3 {roundResult.spyName}
                      </div>

                      <div 
                        style={{
                          fontSize: 'clamp(1rem, 2vw, 1.3rem)',
                          color: '#f5f5dc',
                          textAlign: 'center',
                          marginTop: '1rem'
                        }}
                      >
                        {countdown}s until next round
                      </div>
                    </>
                  );
                } else if (roundResult.civiliansWon) {
                  // Civilians won
                  return (
                    <>
                      <div 
                        style={{
                          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                          fontWeight: 'bold',
                          color: '#ff7f50',
                          textAlign: 'center',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        Civilians won!
                      </div>
                      
                      <div 
                        style={{
                          fontSize: 'clamp(1rem, 2vw, 1.3rem)',
                          color: '#f5f5dc',
                          textAlign: 'center'
                        }}
                      >
                        {roundResult.correctVotersCount}/{roundResult.totalCiviliansCount} civilians guessed the spy was {roundResult.spyName}
                      </div>

                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          alignItems: 'center'
                        }}
                      >
                        {roundResult.correctVoterNames.map(voterName => (
                          <div
                            key={voterName}
                            style={{
                              fontSize: 'clamp(1.1rem, 2.2vw, 1.5rem)',
                              fontWeight: 'bold',
                              color: '#ffd700'
                            }}
                          >
                            +1 {voterName}
                          </div>
                        ))}
                      </div>

                      <div 
                        style={{
                          fontSize: 'clamp(1rem, 2vw, 1.3rem)',
                          color: '#f5f5dc',
                          textAlign: 'center',
                          marginTop: '1rem'
                        }}
                      >
                        {countdown}s until next round
                      </div>
                    </>
                  );
                }
                
                return null;
              })()}
            </div>
          ) : (
            // Normal Game Status Display
            <div 
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '2rem',
                minWidth: '300px',
                border: '2px solid rgba(255, 140, 66, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '1.5rem'
              }}
            >
              <div 
                style={{
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: 'bold',
                  color: '#f5f5dc',
                  textAlign: 'center',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
                }}
              >
                Game in progress
              </div>

              {gameState.status === 'playing' && currentPlayerName && (
                <>
                  <div 
                    style={{
                      fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
                      fontWeight: 'bold',
                      color: '#ff7f50', // Coral orange
                      textAlign: 'center',
                      textShadow: '1px 1px 3px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {currentPlayerName} is asking a question
                  </div>
                  <div 
                    style={{
                      fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
                      fontWeight: 'bold',
                      color: '#f5f5dc',
                      textAlign: 'center',
                      opacity: 0.9
                    }}
                  >
                    {current} player{current !== 1 ? 's' : ''} left to ask questions
                  </div>
                </>
              )}

              {gameState.status === 'accusing' && (
                <div 
                  style={{
                    fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
                    fontWeight: 'bold',
                    color: '#ff7f50', // Coral orange
                    textAlign: 'center',
                    textShadow: '1px 1px 3px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  Voting in progress
                </div>
              )}
            </div>
          )}
        </div>

        {/* Round indicator (subtle) */}
        <div className="absolute top-8 right-8 text-sm opacity-60" style={{ color: '#f5f5dc' }}>
          Round {gameState.roundNumber}
        </div>
      </div>
    );
  }

  // Otherwise show waiting state with QR code and start button
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#1e3a5f', // Dark teal
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
          url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")
        `,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem',
        color: '#f5f5dc'
      }}
    >
      {/* Header - Family SPYFALL Logo */}
      <div className="text-center mb-12">
        <div 
          style={{
            fontFamily: 'Brush Script MT, cursive',
            color: '#ff7f50', // Coral orange
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 'normal',
            marginBottom: '0.5rem'
          }}
        >
          Family
        </div>
        <div 
          style={{
            fontFamily: 'Times New Roman, serif',
            color: '#f5f5dc', // Cream
            textShadow: '3px 3px 6px rgba(0, 0, 0, 0.4)',
            letterSpacing: '0.1em',
            fontSize: 'clamp(3.5rem, 7vw, 6rem)',
            fontWeight: 'bold'
          }}
        >
          SPYFALL
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          gap: '20px'
        }}
      >
        {/* Left Side - Players Box */}
        <div 
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '2rem',
            minWidth: '300px',
            border: '2px solid rgba(255, 140, 66, 0.3)'
          }}
        >
          <h3 
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 'bold',
              color: '#f5f5dc',
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}
          >
            Joined Players ({connectedPlayers.length})
          </h3>
          
          {connectedPlayers.length === 0 ? (
            <div 
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.3rem)',
                color: '#ff7f50',
                fontStyle: 'italic',
                textAlign: 'center'
              }}
            >
              No players yet...
            </div>
          ) : (
            <div className="space-y-3">
              {connectedPlayers.map((player) => (
                <div
                  key={player.id}
                  style={{
                    backgroundColor: 'rgba(255, 140, 66, 0.2)',
                    borderRadius: '10px',
                    padding: '0.8rem 1.2rem',
                    textAlign: 'center',
                    border: '1px solid rgba(255, 140, 66, 0.4)',
                    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                    fontWeight: 'bold',
                    color: '#f5f5dc'
                  }}
                >
                  {player.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vertical Divider Line */}
        <div 
          style={{
            width: '4px',
            height: '400px',
            backgroundColor: '#ff7f50', // Coral orange - same as Family text
            borderRadius: '2px'
          }}
        ></div>

        {/* Right Side - QR Code */}
        <div 
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            minWidth: '300px'
          }}
        >
          <h3 
            style={{
              fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
              fontWeight: 'bold',
              color: '#1e3a5f',
              textAlign: 'center',
              marginBottom: '1rem'
            }}
          >
            Scan to Join Game
          </h3>
          <QRCodeDisplay gameId={gameState.id} />
        </div>
      </div>

      {/* Start Game Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => {
            console.log('🎮 HomePage - Start Game button clicked');
            console.log('🎮 HomePage - Game state:', gameState);
            
            // Re-authenticate as TV Host before starting round
            if (gameState?.id) {
              console.log('🎮 HomePage - Re-authenticating as TV Host for game:', gameState.id);
              emit('join_game', {
                gameId: gameState.id,
                playerName: 'TV Host',
                isHost: true
              });
              
              // Wait a moment then start the round
              setTimeout(() => {
                console.log('🎮 HomePage - Starting round after authentication');
                emit('start_round');
              }, 100);
            } else {
              console.error('❌ HomePage - No game ID available');
            }
          }}
          disabled={connectedPlayers.length < 1} // Changed from 3 to 1 for testing
          className="px-16 py-8 rounded-xl text-3xl md:text-4xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          style={{
            backgroundColor: connectedPlayers.length >= 1 ? '#ff8c42' : '#666666', // Golden orange when enabled, gray when disabled
            color: '#f5f5dc', // Cream
            boxShadow: connectedPlayers.length >= 1 
              ? '0 8px 32px rgba(255, 140, 66, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)'
              : '0 4px 16px rgba(0, 0, 0, 0.2)',
            border: 'none',
            borderRadius: '12px',
            padding: '32px 64px',
            cursor: connectedPlayers.length >= 1 ? 'pointer' : 'not-allowed'
          }}
          onMouseEnter={(e) => {
            if (connectedPlayers.length >= 1) {
              e.currentTarget.style.backgroundColor = '#ff9f66';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 140, 66, 0.4), 0 6px 20px rgba(0, 0, 0, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (connectedPlayers.length >= 1) {
              e.currentTarget.style.backgroundColor = '#ff8c42';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 140, 66, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)';
            }
          }}
        >
          {connectedPlayers.length >= 1 ? 'Start Game' : `Need ${1 - connectedPlayers.length} more player(s)`}
        </button>
      </div>
    </div>
  );
}