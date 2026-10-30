/**
 * Module: app/useAppRuntimeEffects.js
 * Purpose: Contains the state, effects, and event handlers that drive the use App Runtime Effects flow.
 */
import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';

import { fetchCurrentUser, forceLogout } from '../redux/authSlice';
import { addNotification, setNotificationOwner } from '../redux/notificationSlice';
import { socketUrl } from '../utils/axiosConfig';

const GLOBAL_NOTIFY_EVENTS = ['AuctionPulse:notify', 'BidPulse:notify', 'rizbid:notify'];
const AUTH_EXPIRED_EVENTS = ['AuctionPulse:auth-expired', 'BidPulse:auth-expired', 'RiZBiD:auth-expired'];
const SESSION_RECHECK_INTERVAL_MS = 3 * 60 * 1000;

// Global runtime side effects are grouped here so App.jsx can stay focused on composition.
export const useAppRuntimeEffects = (user) => {
  const dispatch = useDispatch();
  const lastSessionCheckRef = useRef(0);

  useEffect(() => {
    dispatch(setNotificationOwner(user || null));
  }, [dispatch, user?._id, user?.id, user?.email, user?.role]);

  useEffect(() => {
    if (!user?.token) return;
    lastSessionCheckRef.current = Date.now();
    dispatch(fetchCurrentUser());
  }, [dispatch, user?.token]);

  useEffect(() => {
    if (!user?.token) return undefined;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: { token: user.token },
    });

    socket.on('notification', (payload) => {
      dispatch(addNotification({
        id: payload?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: payload?.title || 'Live Update',
        message: payload?.message || 'New platform activity detected',
        type: payload?.type || 'info',
      }));
    });

    return () => socket.disconnect();
  }, [dispatch, user?.token]);

  useEffect(() => {
    const handleGlobalNotify = (event) => {
      const detail = event.detail || {};
      if (!detail.message) return;
      dispatch(addNotification(detail));
    };

    GLOBAL_NOTIFY_EVENTS.forEach((eventName) => window.addEventListener(eventName, handleGlobalNotify));
    return () =>
      GLOBAL_NOTIFY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, handleGlobalNotify));
  }, [dispatch]);

  useEffect(() => {
    const handleAuthExpired = () => {
      dispatch(forceLogout('Your session ended. Please log in again.'));
      dispatch(addNotification({
        id: 'auth-expired',
        title: 'Session Ended',
        message: 'Your session ended. Please log in again.',
        type: 'warning',
      }));
      toast.error('Your session ended. Please log in again.', { toastId: 'auth-expired-toast' });
    };

    AUTH_EXPIRED_EVENTS.forEach((eventName) => window.addEventListener(eventName, handleAuthExpired));
    return () =>
      AUTH_EXPIRED_EVENTS.forEach((eventName) => window.removeEventListener(eventName, handleAuthExpired));
  }, [dispatch]);

  useEffect(() => {
    const handleOnline = () => {
      toast.success('Back online', { toastId: 'network-online' });
      dispatch(addNotification({
        id: 'network-online',
        title: 'Network Restored',
        message: 'Back online',
        type: 'success',
      }));
    };

    const handleOffline = () => {
      toast.error('You are offline. Some actions may fail.', { toastId: 'network-offline' });
      dispatch(addNotification({
        id: 'network-offline',
        title: 'Network Offline',
        message: 'You are offline. Some actions may fail.',
        type: 'warning',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  useEffect(() => {
    const handleVisibility = () => {
      const now = Date.now();
      const enoughTimePassed = now - lastSessionCheckRef.current > SESSION_RECHECK_INTERVAL_MS;

      if (document.visibilityState === 'visible' && user?.token && enoughTimePassed) {
        lastSessionCheckRef.current = now;
        dispatch(fetchCurrentUser());
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [dispatch, user?.token]);
};
