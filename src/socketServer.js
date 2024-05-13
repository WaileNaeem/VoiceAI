class WSService {
  constructor() {
    this.socket = null;
    this.events = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5; // Maximum number of reconnection attempts
    this.reconnectInterval = 5000; // Interval between reconnection attempts in milliseconds
  }

  initializeSocket = accessToken => {
    const SOCKET_URL = `wss://api.hume.ai/v0/evi/chat?access_token=${accessToken}`;
    console.log(`Attempting to connect to WebSocket at: ${SOCKET_URL}`);

    this.socket = new WebSocket(SOCKET_URL);

    this.socket.onopen = () => {
      console.log('WebSocket connection successfully opened.');
      this.emit('open');
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    };

    this.socket.onmessage = event => {
      console.log('Received message:', event.data);
      this.emit('message', event.data);
    };

    this.socket.onclose = event => {
      console.log(
        `WebSocket connection closed with code: ${event.code}, reason: ${event}`,
      );
      this.emit('close', event.code, event.reason);
      if (
        event.code === 1006 &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        console.log(
          `Attempting to reconnect... Attempt: ${this.reconnectAttempts + 1}`,
        );
        setTimeout(
          () => this.initializeSocket(accessToken),
          this.reconnectInterval,
        );
        this.reconnectAttempts++;
      } else {
        console.log(
          'Max reconnection attempts reached. Not attempting to reconnect.',
        );
      }
    };

    this.socket.onerror = event => {
      console.error('WebSocket error:', event.message);
      this.emit('error', event.message);
    };
  };

  on = (eventName, handler) => {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(handler);
  };

  emit = (eventName, data) => {
    const handlers = this.events[eventName];
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  };

  sendAudio = audioData => {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(audioData));
      console.log('Audio data sent');
    } else {
      console.error('WebSocket is not open. Cannot send audio data.');
    }
  };

  processMessage = data => {
    try {
      const message = JSON.parse(data);
      if (message.type) {
        this.emit(message.type, message);
      } else {
        console.error('Message type is undefined');
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  };

  closeConnection = () => {
    if (this.socket) {
      console.log('Closing WebSocket connection.');
      this.socket.close();
    }
  };
}

const socketService = new WSService();
export default socketService;
