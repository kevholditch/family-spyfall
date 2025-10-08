import { useState, useEffect } from 'react';
import { GameState, Player, GameUpdate } from '../types';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerSecret, setPlayerSecret] = useState<string | null>(null);

  const updateGameState = (update: GameUpdate) => {
    console.log('🔄 useGameState - Received update:', update);
    setGameState(prev => {
      if (!prev) {
        console.log('❌ useGameState - No previous state, ignoring update');
        return prev;
      }

      console.log('📊 useGameState - Current state before update:', {
        totalPlayers: prev.players.length,
        players: prev.players.map(p => ({ name: p.name, id: p.id, isConnected: p.isConnected }))
      });

      switch (update.type) {
        case 'player_joined':
          console.log('🔍 useGameState - Player joined data structure:', {
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
            console.log('⚠️ useGameState - Skipping TV Host, not a real player');
            return prev;
          }
          
          // Check if player already exists to prevent duplicates
          const playerExists = prev.players.some(p => p.id === update.data.id);
          if (playerExists) {
            console.log('⚠️ useGameState - Player already exists, skipping duplicate:', update.data.name);
            return prev;
          }
          
          // Safety check - prevent memory leaks
          if (prev.players.length > 20) {
            console.error('🚨 useGameState - Too many players detected, possible memory leak. Resetting state.');
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
          console.log('✅ useGameState - Player joined, new state:', {
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

        case 'accusation_started':
          return {
            ...prev,
            status: 'voting',
            accusation: {
              accusedPlayerId: update.data.accusedPlayerId,
              votes: {}
            },
            lastActivity: Date.now()
          };

        case 'vote_cast':
          if (prev.accusation) {
            return {
              ...prev,
              accusation: {
                ...prev.accusation,
                votes: {
                  ...prev.accusation.votes,
                  [update.data.voterId]: update.data.vote
                }
              },
              lastActivity: Date.now()
            };
          }
          return prev;

        case 'accusation_cancelled':
          return {
            ...prev,
            status: 'playing',
            accusation: undefined,
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
  };

  const setGame = (game: GameState, playerId: string, secret: string) => {
    setGameState(game);
    setPlayerId(playerId);
    setPlayerSecret(secret);
    setCurrentPlayer(game.players.find(p => p.id === playerId) || null);
  };

  useEffect(() => {
    if (gameState && playerId) {
      setCurrentPlayer(gameState.players.find(p => p.id === playerId) || null);
    }
  }, [gameState, playerId]);

  return {
    gameState,
    currentPlayer,
    playerId,
    playerSecret,
    setGame,
    updateGameState
  };
}
