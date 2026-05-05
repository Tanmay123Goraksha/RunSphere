const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { setIO } = require('./socketManager');

const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    // JWT authentication middleware for WebSocket connections
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                return next(new Error('Unauthorized socket: missing token'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = { id: decoded.id };
            return next();
        } catch (error) {
            return next(new Error('Unauthorized socket'));
        }
    });

    io.on('connection', (socket) => {
        // Auto-join user's personal room for targeted events
        socket.join(`user:${socket.user.id}`);
        console.log(`Socket connected: user ${socket.user.id}`);

        // ─── Club Room Management ──────────────────────────────────────

        socket.on('club:join', (payload = {}) => {
            const clubId = String(payload.clubId || '');
            if (clubId) {
                socket.join(`club:${clubId}`);
            }
        });

        socket.on('club:leave', (payload = {}) => {
            const clubId = String(payload.clubId || '');
            if (clubId) {
                socket.leave(`club:${clubId}`);
            }
        });

        // ─── Follow Subscription ──────────────────────────────────────

        socket.on('follow:subscribe', (payload = {}) => {
            const followedUserId = String(payload.followedUserId || '');
            if (followedUserId) {
                socket.join(`user:${followedUserId}:followers`);
            }
        });

        // ─── Nearby Runners — Live GPS Broadcasting ────────────────────

        socket.on('run:nearby:subscribe', (payload = {}) => {
            const bucket = String(payload.bucket || 'default');
            socket.join(`geo:${bucket}`);
        });

        socket.on('run:nearby:unsubscribe', (payload = {}) => {
            const bucket = String(payload.bucket || 'default');
            socket.leave(`geo:${bucket}`);
        });

        // Live location broadcast: client sends their position, server
        // rebroadcasts to everyone in the same geo bucket so nearby
        // runners appear as moving dots on the idle map.
        socket.on('run:location:broadcast', (payload = {}) => {
            const { bucket, latitude, longitude, heading } = payload;
            const geoBucket = String(bucket || 'default');

            // Broadcast to everyone in the geo bucket except the sender
            socket.to(`geo:${geoBucket}`).emit('run:nearby', {
                eventType: 'run:nearby',
                userId: socket.user.id,
                point: {
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    heading: Number(heading || 0),
                },
                timestamp: new Date().toISOString(),
            });
        });

        // ─── Disconnect ───────────────────────────────────────────────

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: user ${socket.user.id}`);
        });
    });

    setIO(io);
    return io;
};

module.exports = {
    initSocket,
};
