const ChatEvent = {
  Chat: 'chat',
  System: 'system',
};

class ChatEventNotifier {
  events = [];
  handlers = [];
  lobbyId = null;

  constructor(lobbyId) {
    this.lobbyId = lobbyId?.toString() || null;
    const port = window.location.port;
    const protocol = window.location.protocol === 'http:' ? 'ws' : 'wss';
    this.socket = new WebSocket(`${protocol}://${window.location.hostname}:${port}/ws`);
    this.socket.onopen = () => {
      if (this.lobbyId) this.joinLobby(this.lobbyId);
      this.receiveEvent({ type: ChatEvent.System, payload: { msg: 'connected' } });
    };
    this.socket.onclose = () => {
      this.receiveEvent({ type: ChatEvent.System, payload: { msg: 'disconnected' } });
    };
    this.socket.onmessage = async (msg) => {
      try {
        const evt = JSON.parse(await msg.data.text());
        if (evt?.type === ChatEvent.Chat && evt?.lobbyId?.toString() === this.lobbyId) {
          this.receiveEvent({ type: ChatEvent.Chat, payload: evt.payload });
        }
      } catch {
        // ignore malformed events
      }
    };
  }

  joinLobby(lobbyId) {
    this.lobbyId = lobbyId?.toString() || null;
    if (this.socket.readyState === WebSocket.OPEN && this.lobbyId) {
      this.socket.send(JSON.stringify({ type: 'join', lobbyId: this.lobbyId }));
    }
  }

  sendChat(payload) {
    if (!this.lobbyId) return;
    this.socket.send(JSON.stringify({ type: 'chat', lobbyId: this.lobbyId, payload }));
  }

  addHandler(handler) {
    this.handlers.push(handler);
  }

  removeHandler(handler) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  receiveEvent(event) {
    this.events.push(event);
    this.handlers.forEach((handler) => handler(event));
  }
}

function createChatNotifier(lobbyId) {
  return new ChatEventNotifier(lobbyId);
}

export { ChatEvent, createChatNotifier };
