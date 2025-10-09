import React, { useState } from 'react';
import { GameState, Player } from '../types';
import { Vote, Check, X } from 'lucide-react';

interface VotingModalProps {
  gameState: GameState;
  currentPlayer: Player | null;
  onVote: (vote: boolean) => void;
  className?: string;
}

export function VotingModal({
  gameState,
  currentPlayer,
  onVote,
  className = ''
}: VotingModalProps) {
  const [hasVoted, setHasVoted] = useState(false);

  if (!gameState.accusation) {
    return null;
  }

  const accusedPlayer = gameState.players.find(p => p.id === gameState.accusation!.accusedPlayerId);
  if (!accusedPlayer) {
    return null;
  }

  const eligibleVoters = gameState.players.filter(p => p.id !== accusedPlayer.id);
  const votes = gameState.accusation.votes;
  const hasPlayerVoted = currentPlayer && Object.prototype.hasOwnProperty.call(votes, currentPlayer.id);

  const handleVote = (vote: boolean) => {
    onVote(vote);
    setHasVoted(true);
  };

  const guiltyVotes = Object.values(votes).filter(v => v).length;
  const innocentVotes = Object.values(votes).filter(v => !v).length;
  const totalVotes = Object.keys(votes).length;
  const totalEligible = eligibleVoters.length;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Vote className="w-5 h-5 mr-2" />
          Voting
        </h3>
        
        <p className="text-gray-600 mb-4">
          Is <strong>{accusedPlayer.name}</strong> the spy?
        </p>

        {!hasPlayerVoted && currentPlayer && !hasVoted && (
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleVote(true)}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <X className="w-5 h-5 mr-2" />
              Yes, they are the spy
            </button>
            
            <button
              onClick={() => handleVote(false)}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="w-5 h-5 mr-2" />
              No, they are innocent
            </button>
          </div>
        )}

        {(hasPlayerVoted || hasVoted) && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-blue-800 font-medium">
              ✓ You have voted
            </p>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Vote Results:</h4>
          <div className="flex justify-between text-sm">
            <span className="text-red-600">
              Guilty: {guiltyVotes}
            </span>
            <span className="text-green-600">
              Innocent: {innocentVotes}
            </span>
          </div>
          <div className="mt-2">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(totalVotes / totalEligible) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalVotes} of {totalEligible} votes cast
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
