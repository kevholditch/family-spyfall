import { useState, useEffect } from 'react';
import { GameState, Player, GameUpdate } from '../types';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerSecret, setPlayerSecret] = useState<string | null>(null);

  const updateGameState = (update: GameUpdate) => {
    setGameState(prev => {
      if (!prev) return prev;

      switch (update.type) {
        case 'player_joined':
          return {
            ...prev,
            players: [...prev.players, update.data],
            lastActivity: Date.now()
          };

        case 'player_left':
        case 'player_disconnected':
          return {
            ...prev,
            players: prev.players.filter(p => p.id !== update.data.playerId),
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
