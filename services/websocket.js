const { WebSocketServer } = require('ws');
const { verifyToken } = require('../middleware/auth');

let wss = null;
const videoRooms = new Map(); // videoId -> Set of ws clients
const connectedUsers = new Map(); // ws -> { userId, videoId }
const userSockets = new Map(); // userId -> Set of ws clients

function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');

    connectedUsers.set(ws, { userId: null, videoId: null });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      const info = connectedUsers.get(ws);
      if (info) {
        if (info.videoId) {
          const room = videoRooms.get(info.videoId);
          if (room) {
            room.delete(ws);
            if (room.size === 0) videoRooms.delete(info.videoId);
          }
        }
        if (info.userId) {
          const sockets = userSockets.get(info.userId);
          if (sockets) {
            sockets.delete(ws);
            if (sockets.size === 0) userSockets.delete(info.userId);
          }
        }
      }
      connectedUsers.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WS error:', err);
    });
  });

  console.log('WebSocket server initialized');
}

function handleMessage(ws, message) {
  const info = connectedUsers.get(ws) || {};

  switch (message.type) {
    case 'auth':
      try {
        const decoded = verifyToken(message.token);
        info.userId = decoded.userId;
        connectedUsers.set(ws, info);

        if (!userSockets.has(decoded.userId)) {
          userSockets.set(decoded.userId, new Set());
        }
        userSockets.get(decoded.userId).add(ws);

        send(ws, { type: 'auth:success' });
      } catch (err) {
        send(ws, { type: 'auth:error', error: 'Invalid token' });
      }
      break;

    case 'join_video':
      if (message.videoId) {
        if (info.videoId && info.videoId !== message.videoId) {
          const oldRoom = videoRooms.get(info.videoId);
          if (oldRoom) oldRoom.delete(ws);
        }

        info.videoId = message.videoId;
        connectedUsers.set(ws, info);

        if (!videoRooms.has(message.videoId)) {
          videoRooms.set(message.videoId, new Set());
        }
        videoRooms.get(message.videoId).add(ws);
      }
      break;

    case 'leave_video':
      if (message.videoId) {
        const room = videoRooms.get(message.videoId);
        if (room) room.delete(ws);
        if (info.videoId === message.videoId) {
          info.videoId = null;
          connectedUsers.set(ws, info);
        }
      }
      break;

    case 'ping':
      send(ws, { type: 'pong' });
      break;
  }
}

function send(ws, message) {
  if (ws.readyState === ws.OPEN) {
    try {
      ws.send(JSON.stringify(message));
    } catch (err) {
      console.error('WS send error:', err);
    }
  }
}

function broadcastToRoom(videoId, message) {
  const room = videoRooms.get(videoId);
  if (!room) return;
  const data = JSON.stringify(message);
  room.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(data); } catch (err) {}
    }
  });
}

function broadcastToAll(message) {
  if (!wss) return;
  const data = JSON.stringify(message);
  wss.clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(data); } catch (err) {}
    }
  });
}

function sendToUser(userId, message) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const data = JSON.stringify(message);
  sockets.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(data); } catch (err) {}
    }
  });
}

module.exports = { initWebSocket, broadcastToRoom, broadcastToAll, sendToUser };
