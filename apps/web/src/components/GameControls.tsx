import React, { useState } from 'react';
import { GameState, Player } from '../types';
import { Play, SkipForward, AlertTriangle, X, Square } from 'lucide-react';

interface GameControlsProps {
  gameState: GameState;
  currentPlayer: Player | null;
  onStartRound: () => void;
  onAdvanceTurn: () => void;
  onAccusePlayer: (playerId: string) => void;
  onCancelAccusation: () => void;
  onEndRound: () => void;
  className?: string;
}

export function GameControls({
  gameState,
  currentPlayer,
  onStartRound,
  onAdvanceTurn,
  onAccusePlayer,
  onCancelAccusation,
  onEndRound,
  className = ''
}: GameControlsProps) {
  const [showAccuseModal, setShowAccuseModal] = useState(false);

  // Note: TV Host is not in the players array, so we check if this is being rendered on HomePage
  // If there's no currentPlayer but we're on the host screen, we should still show controls
  // For now, we'll allow controls to show if currentPlayer is null (TV Host) or if they are a host
  if (currentPlayer && !currentPlayer.isHost) {
    return null;
  }

  const handleAccusePlayer = (playerId: string) => {
    onAccusePlayer(playerId);
    setShowAccuseModal(false);
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <h3 className="text-lg font-semibold mb-4">Host Controls</h3>
        
        <div className="space-y-3">
          {gameState.status === 'waiting' && (
            <button
              onClick={onStartRound}
              disabled={gameState.players.length < 1}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Round {gameState.roundNumber + 1}
            </button>
          )}

          {gameState.status === 'playing' && (
            <>
              <button
                onClick={onAdvanceTurn}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <SkipForward className="w-5 h-5 mr-2" />
                Advance Turn
              </button>
              
              <button
                onClick={() => setShowAccuseModal(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Accuse Player
              </button>
            </>
          )}

          {gameState.status === 'voting' && (
            <button
              onClick={onCancelAccusation}
              className="w-full flex items-center justify-center px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel Accusation
            </button>
          )}

          {(gameState.status === 'playing' || gameState.status === 'voting') && (
            <button
              onClick={onEndRound}
              className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Square className="w-5 h-5 mr-2" />
              End Round (Admin)
            </button>
          )}
        </div>
      </div>

      {/* Accusation Modal */}
      {showAccuseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Accuse a Player</h3>
            <p className="text-gray-600 mb-4">
              Who do you think is the spy?
            </p>
            
            <div className="space-y-2 mb-6">
              {gameState.players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleAccusePlayer(player.id)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {player.name}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowAccuseModal(false)}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
