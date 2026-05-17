import AsyncStorage from '@react-native-async-storage/async-storage';

// Socket.io client for real-time events
// Using a lazy import pattern so the app works even without socket.io-client
let io = null;
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;

const SOCKET_URL = 'http://localhost:5001';

const listeners = new Map();

export const initSocket = async () => {
    if (socket?.connected) return;

    try {
        // Dynamic import so the app doesn't crash if socket.io-client isn't installed
        const { io: socketIO } = await import('socket.io-client');
        io = socketIO;
    } catch {
        console.warn('socket.io-client not available — real-time features disabled');
        return;
    }

    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false, // We handle reconnection manually
    });

    socket.on('connect', () => {
        console.log('[Socket] Connected');
        reconnectAttempts = 0;
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        if (reason !== 'io server disconnect') {
            scheduleReconnect();
        }
    });

    socket.on('connect_error', () => {
        console.warn('[Socket] Connection error');
        scheduleReconnect();
    });

    // Re-register all active listeners
    for (const [event, handlers] of listeners) {
        for (const handler of handlers) {
            socket.on(event, handler);
        }
    }
};

const scheduleReconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
    reconnectAttempts++;
    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
    setTimeout(() => {
        initSocket().catch(() => {});
    }, Math.min(delay, 30000));
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const onSocketEvent = (event, handler) => {
    if (!listeners.has(event)) {
        listeners.set(event, new Set());
    }
    listeners.get(event)!.add(handler);

    if (socket?.connected) {
        socket.on(event, handler);
    }

    // Return cleanup function
    return () => {
        listeners.get(event)?.delete(handler);
        if (socket) {
            socket.off(event, handler);
        }
    };
};

export const emitSocketEvent = (event, data) => {
    if (socket?.connected) {
        socket.emit(event, data);
    }
};

// ─── Convenience methods ────────────────────────────────────────────────────

export const joinClubRoom = (clubId) => {
    emitSocketEvent('club:join', { clubId });
};

export const leaveClubRoom = (clubId) => {
    emitSocketEvent('club:leave', { clubId });
};

export const subscribeNearbyRunners = (bucket) => {
    emitSocketEvent('run:nearby:subscribe', { bucket });
};

export const unsubscribeNearbyRunners = (bucket) => {
    emitSocketEvent('run:nearby:unsubscribe', { bucket });
};

export const broadcastLocation = (bucket, latitude, longitude, heading = 0) => {
    emitSocketEvent('run:location:broadcast', { bucket, latitude, longitude, heading });
};
