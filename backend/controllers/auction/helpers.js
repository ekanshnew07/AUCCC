/**
 * Module: backend/controllers/auction/helpers.js
 * Purpose: Provides controller-level coordination logic for this backend feature area.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('../../config/cloudinary');
const {
  REGISTRATION_WINDOWS,
  REGISTRATION_DAYS,
  TEST_REGISTRATION_MINUTES,
  ROOM_OPEN_TIMEOUT_SECONDS,
} = require('./constants');

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const uploadAuctionImages = async (files) => {
  if (!files?.length) return [];

  if (!hasCloudinaryConfig() || process.env.LOCAL_MEDIA_STORAGE === 'true') {
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'auctions');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const port = process.env.PORT || 5000;
    const baseUrl = (
      process.env.PUBLIC_API_URL ||
      process.env.BACKEND_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      `http://localhost:${port}`
    ).replace(/\/+$/, '');

    return files.map((file) => {
      const mime = file.mimetype || 'image/png';
      const ext = mime.includes('jpeg') || mime.includes('jpg')
        ? 'jpg'
        : mime.includes('webp')
        ? 'webp'
        : 'png';
      const filename = `auction_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
      return `${baseUrl}/uploads/auctions/${filename}`;
    });
  }

  const folder = process.env.CLOUDINARY_FOLDER || 'AuctionPulse';
  const uploads = files.map(
    (file) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${folder}/auctions`,
            resource_type: 'image',
            transformation: [{ width: 1280, height: 1280, crop: 'limit', quality: 'auto:best' }],
          },
          (error, result) => {
            if (error) return reject(error);
            return resolve(result.secure_url);
          }
        );
        stream.end(file.buffer);
      })
  );

  return Promise.all(uploads);
};

const getRegistrationEndAt = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000);

const resolveRegistrationWindowHours = ({ registrationWindowHours, registrationWindowDays, registrationWindowMinutes }) => {
  if (
    registrationWindowMinutes !== undefined &&
    registrationWindowMinutes !== null &&
    registrationWindowMinutes !== ''
  ) {
    const parsedMinutes = Number(registrationWindowMinutes);
    if (!TEST_REGISTRATION_MINUTES.includes(parsedMinutes)) return null;
    return parsedMinutes / 60;
  }

  if (registrationWindowDays !== undefined && registrationWindowDays !== null && registrationWindowDays !== '') {
    const parsedDays = Number(registrationWindowDays);
    if (!REGISTRATION_DAYS.includes(parsedDays)) return null;
    return parsedDays * 24;
  }

  const parsedWindow = Number(registrationWindowHours);
  if (!REGISTRATION_WINDOWS.includes(parsedWindow)) return null;
  return parsedWindow;
};

const ensureTurnDefaults = (auction) => {
  if (!auction.turnDurationSeconds || auction.turnDurationSeconds < 1 || auction.turnDurationSeconds === 10) {
    auction.turnDurationSeconds = 25;
  }
};

const appendNextBidder = (auction) => {
  while (auction.activeBidders.length < 2 && auction.waitingBidders.length > 0) {
    const nextBidder = auction.waitingBidders.shift();
    auction.activeBidders.push(nextBidder);
  }
};

const startTurnClock = (auction, bidderId, bonusSeconds = 0) => {
  ensureTurnDefaults(auction);
  auction.currentTurnBidder = bidderId;
  const totalSeconds = auction.turnDurationSeconds + bonusSeconds;
  auction.turnExpiresAt = new Date(Date.now() + totalSeconds * 1000);
};

const clearRoomActivation = (auction) => {
  auction.roomActivation = {
    isActive: false,
    currentBidder: null,
    currentSequence: null,
    expiresAt: null,
    lastAssignedAt: null,
    openedBy: null,
    openedAt: null,
  };
};

const assignNextRoomActivator = (auction, sortedRegistrations, now = new Date()) => {
  const currentSequence = Number(auction.roomActivation?.currentSequence || 0);
  const nextEntry = sortedRegistrations.find((entry) => entry.sequence > currentSequence) || sortedRegistrations[0];

  auction.roomActivation = {
    isActive: true,
    currentBidder: nextEntry.bidder,
    currentSequence: nextEntry.sequence,
    expiresAt: new Date(now.getTime() + ROOM_OPEN_TIMEOUT_SECONDS * 1000),
    lastAssignedAt: now,
    openedBy: null,
    openedAt: null,
  };
};

module.exports = {
  uploadAuctionImages,
  getRegistrationEndAt,
  resolveRegistrationWindowHours,
  ensureTurnDefaults,
  appendNextBidder,
  startTurnClock,
  clearRoomActivation,
  assignNextRoomActivator,
};
