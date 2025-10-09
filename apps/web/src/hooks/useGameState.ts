import { useState, useMemo, useCallback } from 'react';
import { GameState, Player, GameUpdate } from '../types';
import { debugLog, debugError } from '../utils/debug';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerSecret, setPlayerSecret] = useState<string | null>(null);

  const updateGameState = useCallback((update: GameUpdate) => {
    debugLog('🔄 useGameState - Received update:', update);
    setGameState(prev => {
      if (!prev) {
        debugLog('❌ useGameState - No previous state, ignoring update');
        return prev;
      }

      debugLog('📊 useGameState - Current state before update:', {
        totalPlayers: prev.players.length,
        players: prev.players.map(p => ({ name: p.name, id: p.id, isConnected: p.isConnected }))
      });

      switch (update.type) {
        case 'player_joined':
          debugLog('🔍 useGameState - Player joined data structure:', {
            updateData: update.data,
            updateDataType: typeof update.data,
            updateDataKeys: Object.keys(update.data || {}),
            newPlayerId: update.data.id,
            newPlayerName: update.data.name,
            existingPlayerIds: prev.players.map(p => p.id),
            existingPlayerNames: prev.players.map(p => p.name),
            existingPlayers: prev.players.map(p => ({ id: p.id, name: p.name, isConnected: p.isConnected }))
          });
          
          // Skip TV Host - it's not a real player
          if (update.data.name === 'TV Host') {
            debugLog('⚠️ useGameState - Skipping TV Host, not a real player');
            return prev;
          }
          
          // Check if player already exists to prevent duplicates
          const playerExists = prev.players.some(p => p.id === update.data.id);
          if (playerExists) {
            debugLog('⚠️ useGameState - Player already exists, skipping duplicate:', update.data.name);
            return prev;
          }
          
          // Safety check - prevent memory leaks
          if (prev.players.length > 20) {
            debugError('🚨 useGameState - Too many players detected, possible memory leak. Resetting state.');
            return {
              ...prev,
              players: prev.players.slice(-10), // Keep only last 10 players
              lastActivity: Date.now()
            };
          }
          
          const newState = {
            ...prev,
            players: [...prev.players, update.data],
            lastActivity: Date.now()
          };
          debugLog('✅ useGameState - Player joined, new state:', {
            totalPlayers: newState.players.length,
            players: newState.players.map(p => ({ name: p.name, id: p.id, isConnected: p.isConnected }))
          });
          return newState;

        case 'player_left':
        case 'player_disconnected':
          // Don't remove players, just mark as disconnected
          return {
            ...prev,
            players: prev.players.map(p => 
              p.id === update.data.playerId 
                ? { ...p, isConnected: false }
                : p
            ),
            lastActivity: Date.now()
          };

        case 'player_reconnected':
          return {
            ...prev,
            players: prev.players.map(p => 
              p.id === update.data.playerId 
                ? { ...p, isConnected: true }
                : p
            ),
            lastActivity: Date.now()
          };

        case 'round_started':
          return {
            ...prev,
            status: 'playing',
            roundNumber: update.data.roundNumber,
            currentPlayerIndex: update.data.currentPlayerIndex,
            lastActivity: Date.now()
          };

        case 'turn_advanced':
          return {
            ...prev,
            currentPlayerIndex: update.data.currentPlayerIndex,
            lastActivity: Date.now()
          };

        case 'accuse_mode_started':
          return {
            ...prev,
            status: 'accusing',
            accuseMode: {
              playerVotes: {}
            },
            lastActivity: Date.now()
          };

        case 'vote_cast':
          if (prev.accuseMode) {
            return {
              ...prev,
              accuseMode: {
                ...prev.accuseMode,
                playerVotes: {
                  ...prev.accuseMode.playerVotes,
                  [update.data.voterId]: update.data.accusedPlayerId || ''
                }
              },
              lastActivity: Date.now()
            };
          }
          return prev;

        case 'spy_guess_submitted':
          if (prev.accuseMode) {
            return {
              ...prev,
              accuseMode: {
                ...prev.accuseMode,
                spyLocationGuess: update.data.locationGuess
              },
              lastActivity: Date.now()
            };
          }
          return prev;

        case 'round_summary':
          console.log('🎯 round_summary update received:', {
            roundResult: update.data.roundResult,
            hasSpyName: !!update.data.roundResult?.spyName,
            hasTotalCiviliansCount: update.data.roundResult?.totalCiviliansCount !== undefined
          });
          return {
            ...prev,
            status: 'round_summary',
            roundResult: update.data.roundResult,
            players: prev.players.map(p => {
              const updated = update.data.players?.find((up: any) => up.id === p.id);
              return updated ? { ...p, score: updated.score } : p;
            }),
            lastActivity: Date.now()
          };

        case 'scores_updated':
          return {
            ...prev,
            status: update.data.status || prev.status,
            players: prev.players.map(p => {
              const updated = update.data.players?.find((up: any) => up.id === p.id);
              return updated ? { ...p, score: updated.score } : p;
            }),
            lastActivity: Date.now()
          };

        case 'round_ended':
          return {
            ...prev,
            status: 'waiting',
            accusation: undefined,
            currentPlayerIndex: 0,
            lastActivity: Date.now()
          };

        case 'game_finished':
          return {
            ...prev,
            status: 'finished',
            lastActivity: Date.now()
          };

        default:
          return prev;
      }
    });
  }, []); // Empty dependency array since we only use setGameState which is stable

  const setGame = useCallback((game: GameState, playerId: string, secret: string) => {
    setGameState(game);
    setPlayerId(playerId);
    setPlayerSecret(secret);
  }, []);

  // Derive currentPlayer from gameState and playerId using useMemo
  const currentPlayer = useMemo(() => {
    if (gameState && playerId) {
      return gameState.players.find(p => p.id === playerId) || null;
    }
    return null;
  }, [gameState?.players, playerId]);

  return {
    gameState,
    currentPlayer,
    playerId,
    playerSecret,
    setGame,
    updateGameState
  };
}
