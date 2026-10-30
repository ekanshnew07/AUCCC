/**
 * Module: features/support/useSupportRoom.js
 * Purpose: Contains the state, effects, and event handlers that drive the use Support Room flow.
 */
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { socketUrl } from '../../utils/axiosConfig';

export const createSupportWelcomeMessage = () => ({
  id: 'support-welcome',
  role: 'system',
  name: 'AuctionPulse Bot',
  message: 'Welcome to live support. Send a message and our team can reply from the help desk.',
  createdAt: new Date().toISOString(),
});

export const useSupportRoom = ({ enabled = true, user, initialMessages = [] }) => {
  const socketRef = useRef(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState(initialMessages);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    const joinPayload = {
      name: user?.name || 'Guest User',
      role: user?.role || 'user',
    };

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('support:join', joinPayload);
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('support:message', (payload) => setChatMessages((prev) => [...prev, payload]));
    socket.on('support:system', (payload) => setChatMessages((prev) => [...prev, { ...payload, role: 'system' }]));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('support:message');
      socket.off('support:system');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, user?.name, user?.role]);

  const sendLiveMessage = (event) => {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    socketRef.current?.emit('support:message', {
      name: user?.name || 'Guest User',
      role: user?.role || 'user',
      message: trimmed,
    });
    setChatInput('');
  };

  return {
    socketRef,
    chatInput,
    setChatInput,
    chatMessages,
    setChatMessages,
    isConnected,
    sendLiveMessage,
  };
};
