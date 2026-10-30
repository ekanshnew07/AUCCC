/**
 * Module: features/auctionDetails/useAuctionDetails.js
 * Purpose: Manages Socket.IO real-time bidding, soft-close telemetry, rival simulation, and free escrow checkout.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

import axios, { socketUrl } from '../../utils/axiosConfig';

export const useAuctionDetails = (id) => {
  const { user } = useSelector((state) => state.auth);
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [timeNow, setTimeNow] = useState(Date.now());
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [relistAmount, setRelistAmount] = useState('');
  const [shippingDetails, setShippingDetails] = useState({
    name: user?.name || '',
    address: '742 Evergreen Terrace, Suite 4B',
    city: 'San Francisco',
    postalCode: '94107',
    country: 'United States',
    phone: '+1 415 890 2311',
  });
  const socketRef = useRef(null);
  const prevSoftCloseCountRef = useRef(0);

  const fetchAuction = useCallback(async () => {
    try {
      const res = await axios.get(`/auctions/${id}`);
      const nextAuction = res.data;

      if (
        prevSoftCloseCountRef.current > 0 &&
        (nextAuction.softCloseExtensionCount || 0) > prevSoftCloseCountRef.current
      ) {
        toast.warning('⚡ Anti-Snipe Shield Activated! Turn timer extended by +15s', {
          toastId: `soft-close-${nextAuction.softCloseExtensionCount}`,
        });
      }
      prevSoftCloseCountRef.current = nextAuction.softCloseExtensionCount || 0;

      setAuction(nextAuction);
      setBidAmount(String((nextAuction.currentPrice || 0) + 50));
      setRelistAmount(String(Math.max((nextAuction.startingPrice || 1) - 50, 1)));
    } catch {
      toast.error('Error fetching listing');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setTimeNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAuction();

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: user?.token ? { token: user.token } : undefined,
    });
    socketRef.current = socket;

    socket.emit('joinAuction', id);
    socket.on('bidUpdated', (payload) => {
      if (!payload?.auctionId || payload.auctionId === id || payload._id === id) {
        if (payload?._id === id && payload?.title) {
          if (
            prevSoftCloseCountRef.current > 0 &&
            (payload.softCloseExtensionCount || 0) > prevSoftCloseCountRef.current
          ) {
            toast.warning('⚡ Anti-Snipe Shield Activated! Turn clock extended +15s!', {
              toastId: `soft-close-${payload.softCloseExtensionCount}`,
            });
          }
          prevSoftCloseCountRef.current = payload.softCloseExtensionCount || 0;
          setAuction(payload);
          setBidAmount(String((payload.currentPrice || 0) + 50));
        } else {
          fetchAuction();
        }
      }
    });

    return () => {
      socket.off('bidUpdated');
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [fetchAuction, id, user?.token]);

  useEffect(() => {
    setShippingDetails((prev) => ({
      ...prev,
      name: user?.name || prev.name || '',
    }));
  }, [user?.name]);

  const registrationRemainingMs = useMemo(() => {
    if (!auction?.registrationEndAt) return 0;
    return Math.max(new Date(auction.registrationEndAt).getTime() - timeNow, 0);
  }, [auction?.registrationEndAt, timeNow]);

  const turnRemainingMs = useMemo(() => {
    if (!auction?.turnExpiresAt) return 0;
    return Math.max(new Date(auction.turnExpiresAt).getTime() - timeNow, 0);
  }, [auction?.turnExpiresAt, timeNow]);

  const roomActivationRemainingMs = useMemo(() => {
    if (!auction?.roomActivation?.expiresAt) return 0;
    return Math.max(new Date(auction.roomActivation.expiresAt).getTime() - timeNow, 0);
  }, [auction?.roomActivation?.expiresAt, timeNow]);

  const handleRegister = async () => {
    if (!user?.token) {
      toast.error('Please sign in first');
      return;
    }

    try {
      const { data } = await axios.post(
        `/auctions/${id}/register`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      toast.success(`Slot claimed as Participant #${data.registrationNumber}`);
      fetchAuction();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  };

  const handleOpenAuctionRoom = async () => {
    if (!user?.token) {
      toast.error('Please sign in first');
      return;
    }

    try {
      const { data } = await axios.post(
        `/auctions/${id}/open-room`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setAuction(data);
      toast.success('Live bidding arena is now open for all participants!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open auction room');
      fetchAuction();
    }
  };

  const submitBidAmount = async (numericAmount, simulateRival = false) => {
    if (!user?.token) {
      toast.error('Please sign in to place offers');
      return;
    }

    try {
      await axios.post(
        `/auctions/${id}/bid`,
        { amount: Number(numericAmount), simulateRival },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (simulateRival) {
        toast.info(`🔥 Rival placed counter-offer of $${numericAmount}! Your turn to respond.`);
      } else {
        toast.success(`Offer of $${numericAmount} broadcast to live arena!`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bid failed');
    }
  };

  const handlePlaceBid = async (event) => {
    event.preventDefault();
    await submitBidAmount(Number(bidAmount), false);
  };

  const handleQuickBid = async (increment) => {
    const nextPrice = Number(auction?.currentPrice || 0) + Number(increment);
    setBidAmount(String(nextPrice));
    await submitBidAmount(nextPrice, false);
  };

  const handleSimulateRivalBid = async () => {
    const nextPrice = Number(auction?.currentPrice || 0) + 50;
    await submitBidAmount(nextPrice, true);
  };

  const handleGiveUp = async () => {
    if (!user?.token) return;

    try {
      await axios.post(
        `/auctions/${id}/give-up`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      toast.info('You passed this round.');
      fetchAuction();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to pass round');
    }
  };

  const handleConcludeNow = async () => {
    if (!user?.token) {
      toast.error('Please sign in first');
      return;
    }

    try {
      await axios.post(
        `/auctions/${id}/give-up`,
        { concludeWithWinner: true },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      toast.success('🔨 Hammer down! Auction concluded — ready for Escrow Checkout.');
      fetchAuction();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to conclude auction');
    }
  };

  const handleNoRegistrationDecision = async (action) => {
    try {
      await axios.post(
        `/auctions/${id}/no-registration-decision`,
        { action, reducedStartingPrice: action === 'relist' ? Number(relistAmount) : undefined },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      toast.success(action === 'withdraw' ? 'Lot withdrawn' : 'Lot re-listed with updated reserve');
      fetchAuction();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    try {
      const { data } = await axios.post(
        `/payment/checkout/${id}`,
        { shippingAddress: shippingDetails },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      if (data.url) window.location.href = data.url;
      else toast.error('Payment Error: No redirect URL found.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Escrow initiation failed');
    }
  };

  const handleConfirmReceived = async () => {
    if (!window.confirm('Confirm that you received the item in expected condition and release escrow funds to the seller?')) {
      return;
    }

    try {
      await axios.post(
        `/payment/confirm-received/${id}`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      toast.success('Product receipt confirmed! Escrow payout released to seller.');
      fetchAuction();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm product receipt');
    }
  };

  return {
    user,
    auction,
    loading,
    bidAmount,
    setBidAmount,
    isShippingModalOpen,
    setIsShippingModalOpen,
    relistAmount,
    setRelistAmount,
    shippingDetails,
    setShippingDetails,
    registrationRemainingMs,
    turnRemainingMs,
    roomActivationRemainingMs,
    handleRegister,
    handleOpenAuctionRoom,
    handlePlaceBid,
    handleQuickBid,
    handleSimulateRivalBid,
    handleGiveUp,
    handleConcludeNow,
    handleNoRegistrationDecision,
    handlePayment,
    handleConfirmReceived,
  };
};
