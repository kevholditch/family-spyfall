import React from 'react';
import { RoleAssignment, SPYFALL_LOCATIONS } from '../types';
import { Eye, EyeOff } from 'lucide-react';

interface RoleDisplayProps {
  roleAssignment: RoleAssignment | null;
  className?: string;
}

export function RoleDisplay({ roleAssignment, className = '' }: RoleDisplayProps) {
  if (!roleAssignment) {
    return null;
  }

  const { role, location } = roleAssignment;

  return (
    <div className={`bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg p-6 shadow-lg ${className}`}>
      <div className="text-center">
        <div className="mb-4">
          {role === 'spy' ? (
            <Eye className="w-16 h-16 mx-auto mb-2" />
          ) : (
            <EyeOff className="w-16 h-16 mx-auto mb-2" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold mb-2">
          You are the {role === 'spy' ? 'SPY' : 'CIVILIAN'}
        </h2>
        
        {role === 'civilian' && location ? (
          <div className="bg-white/20 rounded-lg p-4 mt-4">
            <p className="text-lg font-semibold mb-2">Your Location:</p>
            <p className="text-2xl font-bold">{location}</p>
          </div>
        ) : role === 'spy' ? (
          <div className="bg-white/20 rounded-lg p-4 mt-4">
            <p className="text-lg font-semibold mb-2">You don't know the location!</p>
            <p className="text-sm opacity-90">
              Try to figure it out by asking questions, but don't get caught!
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LocationList({ className = '' }: { className?: string }) {
  const locationsByCategory = SPYFALL_LOCATIONS.reduce((acc, location) => {
    if (!acc[location.category]) {
      acc[location.category] = [];
    }
    acc[location.category].push(location.name);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">All Possible Locations</h3>
      <div className="space-y-4">
        {Object.entries(locationsByCategory).map(([category, locations]) => (
          <div key={category}>
            <h4 className="font-medium text-gray-700 mb-2">{category}</h4>
            <div className="grid grid-cols-2 gap-2">
              {locations.map((location) => (
                <div
                  key={location}
                  className="px-3 py-2 bg-gray-100 rounded text-sm text-gray-700"
                >
                  {location}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
