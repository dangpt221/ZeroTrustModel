import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: string;
  room: string;
  reactions?: { emoji: string; count: number }[];
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: string;
  isPinned?: boolean;
  unread: number;
  departmentId?: string;
}

const SOCKET_URL = ''; // Use relative URL to allow Vite proxy or same-host connection

export function useChat() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string>('');
  const activeRoomRef = useRef(activeRoom);
  const pendingRoomRef = useRef<string | null>(null);

  // Keep ref in sync for socket callbacks
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // Connect socket
  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_user_room', user.id);
      // Rejoin pending room once socket is ready
      if (pendingRoomRef.current) {
        newSocket.emit('join_room', pendingRoomRef.current);
        setActiveRoom(pendingRoomRef.current);
        pendingRoomRef.current = null;
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('receive_message', (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const joinRoom = useCallback((roomId: string) => {
    if (!roomId) return;
    setActiveRoom(roomId);
    if (socket && isConnected) {
      socket.emit('join_room', roomId);
    } else {
      // Queue for when socket connects
      pendingRoomRef.current = roomId;
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((text: string, roomId: string) => {
    if (socket && isConnected && user) {
      socket.emit('send_message', {
        userId: user.id,
        userName: user.name,
        text,
        room: roomId,
      });
    }
  }, [socket, isConnected, user]);

  return {
    socket,
    isConnected,
    messages,
    setMessages,
    activeRoom,
    joinRoom,
    sendMessage,
  };
}
