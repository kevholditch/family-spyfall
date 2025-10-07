import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents, GameUpdate, RoleAssignment } from '../types';

interface UseSocketReturn {
  socket: Socket<SocketEvents> | null;
  isConnected: boolean;
  error: string | null;
  gameUpdate: GameUpdate | null;
  roleAssignment: RoleAssignment | null;
  emit: <K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>) => void;
}

export function useSocket(serverUrl: string = 'http://localhost:4000'): UseSocketReturn {
  const [socket, setSocket] = useState<Socket<SocketEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameUpdate, setGameUpdate] = useState<GameUpdate | null>(null);
  const [roleAssignment, setRoleAssignment] = useState<RoleAssignment | null>(null);
  const socketRef = useRef<Socket<SocketEvents> | null>(null);

  useEffect(() => {
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('error', (data) => {
      setError(data.message);
    });

    newSocket.on('game_update', (update) => {
      console.log('🔌 useSocket - Received game_update event:', update);
      setGameUpdate(update);
    });

    newSocket.on('role_assignment', (data) => {
      setRoleAssignment(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [serverUrl]);

  const emit = <K extends keyof SocketEvents>(
    event: K,
    ...args: Parameters<SocketEvents[K]>
  ) => {
    if (socketRef.current) {
      socketRef.current.emit(event, ...args);
    }
  };

  return {
    socket,
    isConnected,
    error,
    gameUpdate,
    roleAssignment,
    emit
  };
}
