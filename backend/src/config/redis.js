const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: () => false,
    },
});

let attempted = false;
let warnedUnavailable = false;

redisClient.on('error', (err) => {
    if (!warnedUnavailable) {
        warnedUnavailable = true;
        console.warn('Redis unavailable, continuing without leaderboard cache:', err.message);
    }
});

redisClient.on('connect', () => {
    warnedUnavailable = false;
    console.log('Connected to Redis');
});

const ensureRedisConnection = async () => {
    if (redisClient.isOpen || redisClient.isReady) {
        return true;
    }

    if (attempted) {
        return redisClient.isReady;
    }

    attempted = true;

    try {
        await redisClient.connect();
        return true;
    } catch (err) {
        return false;
    }
};

// Attempt once at bootstrap.
ensureRedisConnection();

const isRedisReady = () => redisClient.isReady;

module.exports = {
    redisClient,
    ensureRedisConnection,
    isRedisReady,
};
