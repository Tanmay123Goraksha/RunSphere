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
        socket.join(`user:${socket.user.id}`);

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

        socket.on('follow:subscribe', (payload = {}) => {
            const followedUserId = String(payload.followedUserId || '');
            if (followedUserId) {
                socket.join(`user:${followedUserId}:followers`);
            }
        });

        socket.on('run:nearby:subscribe', (payload = {}) => {
            const bucket = String(payload.bucket || 'default');
            socket.join(`geo:${bucket}`);
        });

        socket.on('run:nearby:unsubscribe', (payload = {}) => {
            const bucket = String(payload.bucket || 'default');
            socket.leave(`geo:${bucket}`);
        });
    });

    setIO(io);
    return io;
};

module.exports = {
    initSocket,
};
