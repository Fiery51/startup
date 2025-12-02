const { WebSocketServer, WebSocket } = require('ws');

let serverRef = null;

function peerProxy(httpServer) {
  // Match the client URL `${protocol}://${host}:${port}/ws`
  const socketServer = new WebSocketServer({ server: httpServer, path: '/ws' });
  serverRef = socketServer;

  socketServer.on('connection', (socket) => {
    socket.isAlive = true;
    socket.lobbyId = null;

    socket.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed?.type === 'join') {
          socket.lobbyId = parsed.lobbyId?.toString() || null;
          return;
        }
        if (parsed?.type === 'chat' && socket.lobbyId) {
          broadcastToLobby(socket.lobbyId, parsed.payload, socket);
        }
      } catch {
        // ignore malformed messages
      }
    });

    socket.on('pong', () => {
      socket.isAlive = true;
    });
  });

  // Heartbeat to clean up dead sockets
  setInterval(() => {
    socketServer.clients.forEach((client) => {
      if (client.isAlive === false) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 10000);
}

function broadcastToLobby(lobbyId, payload, excludeSocket = null) {
  if (!serverRef) return;
  const message = JSON.stringify({ type: 'chat', lobbyId, payload });
  serverRef.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.lobbyId?.toString() === lobbyId?.toString() &&
      client !== excludeSocket
    ) {
      client.send(message);
    }
  });
}

module.exports = { peerProxy, broadcastToLobby };
