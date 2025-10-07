import React from 'react';
import { GameState } from '../types';
import { Clock, Users } from 'lucide-react';

interface TurnBannerProps {
  gameState: GameState;
  className?: string;
}

export function TurnBanner({ gameState, className = '' }: TurnBannerProps) {
  if (gameState.status !== 'playing' && gameState.status !== 'voting') {
    return null;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isVoting = gameState.status === 'voting';

  return (
    <div className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 shadow-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {isVoting ? (
            <Users className="w-6 h-6 mr-3" />
          ) : (
            <Clock className="w-6 h-6 mr-3" />
          )}
          <div>
            <h2 className="text-lg font-semibold">
              {isVoting ? 'Voting in Progress' : 'Current Turn'}
            </h2>
            {!isVoting && currentPlayer && (
              <p className="text-blue-100">
                {currentPlayer.name}'s turn
              </p>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-blue-100">Round {gameState.roundNumber}</p>
          <p className="text-xs text-blue-200">
            {gameState.players.filter(p => p.isConnected).length} players online
          </p>
        </div>
      </div>
    </div>
  );
}
