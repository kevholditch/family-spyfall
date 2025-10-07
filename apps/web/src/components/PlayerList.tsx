import React from 'react';
import { Player } from '../types';
import { Users, Crown, Wifi, WifiOff } from 'lucide-react';

interface PlayerListProps {
  players: Player[];
  currentPlayerIndex: number;
  className?: string;
}

export function PlayerList({ players, currentPlayerIndex, className = '' }: PlayerListProps) {
  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2" />
        Players ({players.length})
      </h3>
      
      <div className="space-y-2">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`
              flex items-center justify-between p-3 rounded-lg border-2 transition-all
              ${index === currentPlayerIndex 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center">
              <div className="flex items-center mr-3">
                {player.isHost && (
                  <Crown className="w-4 h-4 text-yellow-500 mr-1" />
                )}
                {player.isConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
              </div>
              
              <span className={`font-medium ${!player.isConnected ? 'text-gray-500' : ''}`}>
                {player.name}
              </span>
              
              {index === currentPlayerIndex && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Current Turn
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
