// WaveChat Real-Time Socket.IO Manager
const SocketService = {
  socket: null,
  onlineUsers: new Set(),
  listeners: {
    messageReceived: [],
    groupMessageReceived: [],
    statusChanged: [],
    typing: [],
    stopTyping: [],
  },

  // Play subtle notification sound using Web Audio API (no external MP3 needed!)
  playNotificationChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // Audio autoplay policy might prevent sound before user interaction
    }
  },

  init(user) {
    if (!user || !user._id) return;
    if (this.socket && this.socket.connected) return;

    // Connect to same origin server
    this.socket = io({
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('📡 [Socket.IO] Connected to WaveChat Server. Socket ID:', this.socket.id);
      // Announce presence
      this.socket.emit('user_online', {
        userId: user._id,
        username: user.username,
        fullName: user.fullName,
      });

      this.updateNavbarSignal(true);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('⚠️ [Socket.IO] Connection error:', error.message);
      this.updateNavbarSignal(false);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ [Socket.IO] Disconnected:', reason);
      this.updateNavbarSignal(false);
    });

    // Initial list of online user IDs
    this.socket.on('initial_online_users', (userIds) => {
      this.onlineUsers = new Set(userIds);
      this.notifyStatusListeners();
    });

    // Real-time status update from server
    this.socket.on('user_status_changed', (data) => {
      const { userId, isOnline } = data;
      if (isOnline) {
        this.onlineUsers.add(userId);
      } else {
        this.onlineUsers.delete(userId);
      }
      this.notifyStatusListeners(userId, isOnline);
    });

    // Real-time direct message
    this.socket.on('receive_message', (message) => {
      this.playNotificationChime();
      this.listeners.messageReceived.forEach((cb) => cb(message));
    });

    // Real-time group message
    this.socket.on('group_message', (data) => {
      this.playNotificationChime();
      this.listeners.groupMessageReceived.forEach((cb) => cb(data));
    });

    // Typing indicators
    this.socket.on('user_typing', (data) => {
      this.listeners.typing.forEach((cb) => cb(data));
    });

    this.socket.on('user_stop_typing', (data) => {
      this.listeners.stopTyping.forEach((cb) => cb(data));
    });
  },

  updateNavbarSignal(isConnected) {
    const signalBadge = document.getElementById('navbarSignalStatus');
    if (signalBadge) {
      if (isConnected) {
        signalBadge.className = 'status-pill online';
        signalBadge.innerHTML = '<span class="status-dot online"></span> <span>Online</span>';
      } else {
        signalBadge.className = 'status-pill offline';
        signalBadge.innerHTML = '<span class="status-dot offline"></span> <span>Reconnecting...</span>';
      }
    }
  },

  isUserOnline(userId) {
    return this.onlineUsers.has(userId ? userId.toString() : '');
  },

  onMessage(callback) {
    this.listeners.messageReceived.push(callback);
  },

  onGroupMessage(callback) {
    this.listeners.groupMessageReceived.push(callback);
  },

  onStatusChange(callback) {
    this.listeners.statusChanged.push(callback);
  },

  onTyping(callback) {
    this.listeners.typing.push(callback);
  },

  onStopTyping(callback) {
    this.listeners.stopTyping.push(callback);
  },

  notifyStatusListeners(userId, isOnline) {
    this.listeners.statusChanged.forEach((cb) => cb(userId, isOnline, this.onlineUsers));
  },

  // Emitters
  sendPrivateMessage(payload, callback) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('private_message', payload, callback);
    }
  },

  sendGroupMessage(payload, callback) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('group_message', payload, callback);
    }
  },

  sendTyping(payload) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing', payload);
    }
  },

  sendStopTyping(payload) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('stop_typing', payload);
    }
  },

  joinGroup(groupId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_group', groupId);
    }
  },

  leaveGroup(groupId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_group', groupId);
    }
  },
};
