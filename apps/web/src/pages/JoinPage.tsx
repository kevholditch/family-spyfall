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
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{
              width: '4rem',
              height: '4rem',
              border: '4px solid rgba(255, 140, 66, 0.3)',
              borderTop: '4px solid #ff8c42',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem'
            }}
          ></div>
          <p style={{ color: '#f5f5dc', fontSize: '1.2rem' }}>Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: '#f5f5dc', fontSize: '1.2rem', marginBottom: '2rem' }}>{error}</p>
          <button
            onClick={() => {
              setHasJoined(false);
              setIsJoining(false);
              window.location.href = '/';
            }}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              backgroundColor: '#ff8c42',
              color: '#f5f5dc',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff9f66'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff8c42'}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!gameId) {
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
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: '#f5f5dc', fontSize: '1.2rem', marginBottom: '2rem' }}>Invalid game ID</p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              backgroundColor: '#ff8c42',
              color: '#f5f5dc',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff9f66'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff8c42'}
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
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div 
              style={{
                width: '4rem',
                height: '4rem',
                backgroundColor: 'rgba(255, 140, 66, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem'
              }}
            >
              <Users style={{ width: '2rem', height: '2rem', color: '#ff8c42' }} />
            </div>
            <h1 
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 'bold',
                color: '#f5f5dc',
                marginBottom: '1rem'
              }}
            >
              Welcome to the game, {playerName}!
            </h1>
            <p 
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                color: '#f5f5dc',
                opacity: 0.9,
                marginBottom: '2rem'
              }}
            >
              Waiting for game to start, please stand by...
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f5f5dc', opacity: 0.8 }}>
              <div 
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  backgroundColor: '#ff8c42',
                  borderRadius: '50%',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              ></div>
              <span>Connected to game {gameId}</span>
            </div>
            
            <div style={{ fontSize: '0.875rem', color: '#f5f5dc', opacity: 0.6 }}>
              The host will start the game when ready
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#ff8c42',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              marginBottom: '1.5rem',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            <ArrowLeft style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
            Back to Home
          </button>
          <h1 
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#f5f5dc',
              marginBottom: '0.5rem'
            }}
          >
            Join Game
          </h1>
          <p 
            style={{
              textAlign: 'center',
              color: '#f5f5dc',
              opacity: 0.8
            }}
          >
            Game ID: <strong>{gameId}</strong>
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label 
              htmlFor="playerName" 
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#f5f5dc',
                marginBottom: '0.5rem'
              }}
            >
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '2px solid rgba(255, 140, 66, 0.3)',
                borderRadius: '8px',
                fontSize: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#f5f5dc',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              maxLength={20}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoinGame();
                }
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#ff8c42'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 140, 66, 0.3)'}
            />
          </div>

          <button
            onClick={handleJoinGame}
            disabled={!playerName.trim() || isJoining}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.75rem 1rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              backgroundColor: !playerName.trim() || isJoining ? 'rgba(100, 100, 100, 0.5)' : '#ff8c42',
              color: '#f5f5dc',
              border: 'none',
              borderRadius: '8px',
              cursor: !playerName.trim() || isJoining ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              opacity: !playerName.trim() || isJoining ? 0.6 : 1
            }}
            onMouseOver={(e) => {
              if (playerName.trim() && !isJoining) {
                e.currentTarget.style.backgroundColor = '#ff9f66';
              }
            }}
            onMouseOut={(e) => {
              if (playerName.trim() && !isJoining) {
                e.currentTarget.style.backgroundColor = '#ff8c42';
              }
            }}
          >
            <Users style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }} />
            {isJoining ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
