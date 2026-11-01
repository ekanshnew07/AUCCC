/**
 * Module: backend/config/seedDemoData.js
 * Purpose: Seeds initial verified users, live ongoing auctions, upcoming auctions, and escrow orders.
 */
const User = require('../models/User');
const Auction = require('../models/Auction');
const SupportTicket = require('../models/SupportTicket');

const seedDemoData = async () => {
  try {
    const demoUsersData = [
      {
        name: 'Alex Vance',
        email: 'alex@bidpulse.io',
        password: 'Password@123',
        role: 'user',
        emailVerified: true,
        profileVerifiedAt: new Date(Date.now() - 14 * 86400000),
        dob: new Date('1994-06-15'),
        location: 'United States',
        cityState: 'San Francisco, CA',
        mobile: '+1 415 890 2311',
        emergencyContact: '+1 415 890 9900',
        idType: 'passport',
        idNumber: 'US-88492019',
        occupation: 'Venture Collector',
        avatarEmoji: '⚡',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      },
      {
        name: 'Maya Lin',
        email: 'maya@bidpulse.io',
        password: 'Password@123',
        role: 'user',
        emailVerified: true,
        profileVerifiedAt: new Date(Date.now() - 30 * 86400000),
        dob: new Date('1991-11-04'),
        location: 'Singapore',
        cityState: 'Marina Bay',
        mobile: '+65 8123 4567',
        emergencyContact: '+65 8999 1122',
        idType: 'nid',
        idNumber: 'SG-9920184A',
        occupation: 'Luxury Horology & Tech Curator',
        avatarEmoji: '💎',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      },
      {
        name: 'Liam Sterling',
        email: 'liam@bidpulse.io',
        password: 'Password@123',
        role: 'user',
        emailVerified: true,
        profileVerifiedAt: new Date(Date.now() - 10 * 86400000),
        dob: new Date('1989-03-22'),
        location: 'United Kingdom',
        cityState: 'London',
        mobile: '+44 7700 900412',
        emergencyContact: '+44 7700 900999',
        idType: 'passport',
        idNumber: 'UK-44109283',
        occupation: 'Archive Specialist',
        avatarEmoji: '🔥',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      },
    ];

    const usersByEmail = {};
    for (const data of demoUsersData) {
      let existing = await User.findOne({ email: data.email });
      if (!existing) {
        existing = await User.create(data);
        console.log(`Created demo user: ${data.email}`);
      }
      usersByEmail[data.email] = existing;
    }

    const alex = usersByEmail['alex@bidpulse.io'];
    const maya = usersByEmail['maya@bidpulse.io'];
    const liam = usersByEmail['liam@bidpulse.io'];

    const existingAuctions = await Auction.countDocuments();
    if (existingAuctions > 0) {
      return;
    }

    console.log('Seeding initial AuctionPulse / BidPulse demo dataset...');

    const now = Date.now();

    await Auction.insertMany([
      {
        title: 'Patek Philippe Nautilus 5711/1A Stainless Chronograph',
        description:
          'Vault-kept collector timepiece featuring box, original Geneva certificate of origin, and full horological inspection report. Protected by full multi-stage escrow and soft-close anti-sniping timer.',
        category: 'Fashion',
        startingPrice: 4200,
        currentPrice: 4650,
        registrationWindowHours: 24,
        registrationStartAt: new Date(now - 26 * 3600000),
        registrationEndAt: new Date(now - 2 * 3600000),
        biddingStartedAt: new Date(now - 10 * 60000),
        turnDurationSeconds: 25,
        turnExpiresAt: new Date(now + 24 * 1000),
        currentTurnBidder: alex._id,
        softCloseExtensionCount: 2,
        lastSoftCloseAt: new Date(now - 35000),
        images: [
          'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=1200&auto=format&fit=crop&q=80',
        ],
        seller: maya._id,
        winner: liam._id,
        status: 'ongoing',
        verificationStatus: 'approved',
        verifiedAt: new Date(now - 25 * 3600000),
        registrations: [
          { bidder: alex._id, sequence: 1, registeredAt: new Date(now - 20 * 3600000) },
          { bidder: liam._id, sequence: 2, registeredAt: new Date(now - 18 * 3600000) },
        ],
        activeBidders: [alex._id, liam._id],
        waitingBidders: [],
        bids: [
          { bidder: alex._id, amount: 4350, time: new Date(now - 180000), softCloseTriggered: false },
          { bidder: liam._id, amount: 4500, time: new Date(now - 95000), softCloseTriggered: true },
          { bidder: alex._id, amount: 4600, time: new Date(now - 60000), softCloseTriggered: false },
          { bidder: liam._id, amount: 4650, time: new Date(now - 30000), softCloseTriggered: true },
        ],
      },
      {
        title: 'Apple Vision Pro M3 Developer Edition + Spatial Flight Case',
        description:
          'Complete spatial computing developer bundle with 1TB storage, developer strap for direct Mac telemetry, dual Zeiss optical inserts, and Pelican carbon-fiber transit vault.',
        category: 'Electronics',
        startingPrice: 2100,
        currentPrice: 2450,
        registrationWindowHours: 24,
        registrationStartAt: new Date(now - 30 * 3600000),
        registrationEndAt: new Date(now - 6 * 3600000),
        biddingStartedAt: new Date(now - 15 * 60000),
        turnDurationSeconds: 25,
        turnExpiresAt: new Date(now + 22 * 1000),
        currentTurnBidder: alex._id,
        softCloseExtensionCount: 1,
        lastSoftCloseAt: new Date(now - 50000),
        images: [
          'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=1200&auto=format&fit=crop&q=80',
        ],
        seller: maya._id,
        winner: liam._id,
        status: 'ongoing',
        verificationStatus: 'approved',
        verifiedAt: new Date(now - 28 * 3600000),
        registrations: [
          { bidder: alex._id, sequence: 1, registeredAt: new Date(now - 24 * 3600000) },
          { bidder: liam._id, sequence: 2, registeredAt: new Date(now - 22 * 3600000) },
        ],
        activeBidders: [alex._id, liam._id],
        waitingBidders: [],
        bids: [
          { bidder: alex._id, amount: 2250, time: new Date(now - 120000), softCloseTriggered: false },
          { bidder: liam._id, amount: 2450, time: new Date(now - 45000), softCloseTriggered: true },
        ],
      },
      {
        title: 'Leica M11 Monochrom Brass Limited Edition Camera Body',
        description:
          'Hand-assembled in Wetzlar with a full-frame BSI monochrome sensor, triple resolution technology (60/36/18 MP), sapphire glass monitor cover, and 256GB internal memory.',
        category: 'Electronics',
        startingPrice: 3100,
        currentPrice: 3100,
        registrationWindowHours: 24,
        registrationStartAt: new Date(now - 2 * 3600000),
        registrationEndAt: new Date(now + 18 * 3600000),
        turnDurationSeconds: 25,
        images: [
          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&auto=format&fit=crop&q=80',
        ],
        seller: maya._id,
        status: 'future',
        verificationStatus: 'approved',
        verifiedAt: new Date(now - 2 * 3600000),
        registrations: [
          { bidder: liam._id, sequence: 1, registeredAt: new Date(now - 3600000) },
        ],
      },
      {
        title: '1967 Porsche 911S 1:8 Amalgam Wind-Tunnel Sculpture',
        description:
          'Bespoke 1:8 scale museum piece crafted from original Stuttgart CAD scans. Number 14 of 50 worldwide, mounted on brushed anodized aluminum plinth with acrylic dust dome.',
        category: 'Collectibles',
        startingPrice: 1450,
        currentPrice: 1450,
        registrationWindowHours: 120,
        registrationStartAt: new Date(now - 4 * 3600000),
        registrationEndAt: new Date(now + 44 * 3600000),
        turnDurationSeconds: 25,
        images: [
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80',
        ],
        seller: liam._id,
        status: 'future',
        verificationStatus: 'approved',
        verifiedAt: new Date(now - 4 * 3600000),
        registrations: [],
      },
      {
        title: 'Sony Alpha A9 III Global Shutter Cinema Package',
        description:
          '120fps blackout-free global shutter full-frame camera paired with FE 24-70mm f/2.8 GM II lens, dual CFexpress Type A cards, and rugged studio hardcase.',
        category: 'Electronics',
        startingPrice: 3200,
        currentPrice: 3850,
        registrationWindowHours: 24,
        registrationStartAt: new Date(now - 48 * 3600000),
        registrationEndAt: new Date(now - 24 * 3600000),
        biddingStartedAt: new Date(now - 24 * 3600000),
        biddingEndedAt: new Date(now - 23 * 3600000),
        turnDurationSeconds: 25,
        images: [
          'https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=1200&auto=format&fit=crop&q=80',
        ],
        seller: maya._id,
        winner: alex._id,
        status: 'completed',
        verificationStatus: 'approved',
        verifiedAt: new Date(now - 48 * 3600000),
        registrations: [
          { bidder: alex._id, sequence: 1, registeredAt: new Date(now - 36 * 3600000) },
          { bidder: liam._id, sequence: 2, registeredAt: new Date(now - 35 * 3600000) },
        ],
        bids: [
          { bidder: liam._id, amount: 3500, time: new Date(now - 23.5 * 3600000), softCloseTriggered: false },
          { bidder: alex._id, amount: 3850, time: new Date(now - 23.1 * 3600000), softCloseTriggered: true },
        ],
      },
      {
        title: 'Herman Miller Eames Lounge Chair & Ottoman (Palisander)',
        description:
          'Authentic studio-grade Eames Lounge Chair and Ottoman in oiled Santos Palisander veneer and black MCL leather. Submitted by seller and awaiting Admin Moderation.',
        category: 'Home & Garden',
        startingPrice: 2800,
        currentPrice: 2800,
        registrationWindowHours: 24,
        registrationStartAt: new Date(now),
        registrationEndAt: new Date(now + 24 * 3600000),
        turnDurationSeconds: 25,
        images: [
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&auto=format&fit=crop&q=80',
        ],
        seller: maya._id,
        status: 'pending_verification',
        verificationStatus: 'pending',
        registrations: [],
      },
    ]);

    await SupportTicket.insertMany([
      {
        name: 'Alex Vance',
        email: 'alex@bidpulse.io',
        subject: 'Escrow Insurance Tier Inquiry for High-Value Horology',
        message: 'Does the 5% platform escrow fee include insured armored courier transit for items above $4,000?',
        status: 'open',
        user: alex._id,
      },
      {
        name: 'Maya Lin',
        email: 'maya@bidpulse.io',
        subject: 'Fast-Track Listing Moderation Request',
        message: 'Just submitted the Herman Miller Eames Lounge Chair listing—ready for admin verification!',
        status: 'in_progress',
        user: maya._id,
      },
    ]);

    console.log('Demo dataset seeded successfully! Demo Logins:');
    console.log('  Bidder/Winner: alex@bidpulse.io / Password@123');
    console.log('  Seller:        maya@bidpulse.io / Password@123');
    console.log('  Rival Bidder:  liam@bidpulse.io / Password@123');
    console.log('  Admin:         admin@bidpulse.io / Admin@1234');
  } catch (error) {
    console.error('Demo seed error:', error.message);
  }
};

module.exports = { seedDemoData };
