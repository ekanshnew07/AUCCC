/**
 * Module: utils/imageUrl.js
 * Purpose: Supports the image Url module and keeps its responsibility isolated by file name.
 */
import { socketUrl } from './axiosConfig';

const DEFAULT_AUCTION_IMAGE = 'https://via.placeholder.com/900x600?text=AuctionPulse+Listing';

// Shared image fallback helpers keep the auction UI stable even with missing or broken URLs.
export const toSafeImageUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_AUCTION_IMAGE;
  const trimmed = rawUrl.trim();
  if (!trimmed) return DEFAULT_AUCTION_IMAGE;

  if (trimmed.startsWith('/uploads/')) {
    return `${socketUrl}${trimmed}`;
  }
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed)) {
    return `https://${trimmed.slice(7)}`;
  }
  return trimmed;
};

export const getAuctionImage = (images) => {
  if (Array.isArray(images) && images.length > 0) {
    const firstValid = images.find((item) => typeof item === 'string' && item.trim());
    if (firstValid) return toSafeImageUrl(firstValid);
  }
  return DEFAULT_AUCTION_IMAGE;
};

export const handleAuctionImageError = (event) => {
  // Apply the placeholder only once so repeated onError loops do not occur.
  const target = event?.currentTarget;
  if (!target) return;
  if (target.dataset?.fallbackApplied === 'true') return;
  target.dataset.fallbackApplied = 'true';
  target.src = DEFAULT_AUCTION_IMAGE;
};
