const {
  updateUserOnlineStatus,
  createMessage,
  findUserById,
} = require('./services/dbService');

// In-memory mapping of active user connections:
// userId -> Set of socketIds (supports multiple tabs / mobile + laptop simultaneously)
const userSocketsMap = new Map();
const socketToUserMap = new Map();

function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.IO] New client connected: ${socket.id} | Transport: ${socket.conn.transport.name}`);

    // Transport upgrade logging (e.g. HTTP long-polling -> WebSocket)
    socket.conn.on('upgrade', (transport) => {
      console.log(`🚀 [Socket.IO] Transport upgraded to: ${transport.name} for socket: ${socket.id}`);
    });

    // 1. User joins / announces presence
    socket.on('user_online', async (data) => {
      try {
        const userId = typeof data === 'object' ? data.userId : data;
        if (!userId) return;

        // Associate socket with user
        socketToUserMap.set(socket.id, userId);

        if (!userSocketsMap.has(userId)) {
          userSocketsMap.set(userId, new Set());
        }
        userSocketsMap.get(userId).add(socket.id);

        // Join personal room for direct messages
        socket.join(`user_${userId}`);

        // Update database status
        await updateUserOnlineStatus(userId, true);

        // Broadcast to all other clients that this user is now online
        socket.broadcast.emit('user_status_changed', {
          userId,
          isOnline: true,
          lastSeen: new Date().toISOString(),
        });

        // Send current list of online users back to the newly connected user
        const onlineUserIds = Array.from(userSocketsMap.keys());
        socket.emit('initial_online_users', onlineUserIds);

        console.log(`🟢 [Presence] User ${userId} is ONLINE (${userSocketsMap.get(userId).size} active socket(s))`);
      } catch (err) {
        console.error('Error handling user_online:', err);
      }
    });

    // 2. Private 1-to-1 Chat Message
    socket.on('private_message', async (data, callback) => {
      try {
        const { senderId, receiverId, text, messageType } = data;

        if (!senderId || !receiverId || !text || !text.trim()) {
          if (typeof callback === 'function') {
            return callback({ success: false, error: 'Invalid message payload' });
          }
          return;
        }

        // Save message in database (MongoDB or local JSON fallback)
        const savedMessage = await createMessage({
          sender: senderId,
          receiver: receiverId,
          text: text.trim(),
          messageType: messageType || 'text',
        });

        // Send real-time packet to the receiver's personal room
        io.to(`user_${receiverId}`).emit('receive_message', savedMessage);

        // Also echo back to any other active sessions of the sender
        socket.to(`user_${senderId}`).emit('receive_message', savedMessage);

        console.log(`💬 [Private Msg] From ${senderId} -> ${receiverId}: "${text.substring(0, 30)}..."`);

        if (typeof callback === 'function') {
          callback({ success: true, message: savedMessage });
        }
      } catch (err) {
        console.error('Error handling private_message:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Failed to deliver message' });
        }
      }
    });

    // 3. Group Chat Message
    socket.on('group_message', async (data, callback) => {
      try {
        const { senderId, groupId, text, messageType } = data;

        if (!senderId || !groupId || !text || !text.trim()) {
          if (typeof callback === 'function') {
            return callback({ success: false, error: 'Invalid group message payload' });
          }
          return;
        }

        // Persist group message in database
        const savedMessage = await createMessage({
          sender: senderId,
          receiver: null,
          group: groupId,
          text: text.trim(),
          messageType: messageType || 'text',
        });

        // Broadcast to everyone inside the group room
        io.to(`group_${groupId}`).emit('group_message', {
          groupId,
          message: savedMessage,
        });

        console.log(`👥 [Group Msg] Group ${groupId} by ${senderId}: "${text.substring(0, 30)}..."`);

        if (typeof callback === 'function') {
          callback({ success: true, message: savedMessage });
        }
      } catch (err) {
        console.error('Error handling group_message:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Failed to deliver group message' });
        }
      }
    });

    // 4. Join Group Room
    socket.on('join_group', (groupId) => {
      if (groupId) {
        socket.join(`group_${groupId}`);
        console.log(`📥 [Socket Room] Socket ${socket.id} joined room: group_${groupId}`);
      }
    });

    // 5. Leave Group Room
    socket.on('leave_group', (groupId) => {
      if (groupId) {
        socket.leave(`group_${groupId}`);
        console.log(`📤 [Socket Room] Socket ${socket.id} left room: group_${groupId}`);
      }
    });

    // 6. Real-Time Typing Indicators
    socket.on('typing', (data) => {
      // data: { senderId, senderName, receiverId, groupId }
      if (data.groupId) {
        socket.to(`group_${data.groupId}`).emit('user_typing', data);
      } else if (data.receiverId) {
        io.to(`user_${data.receiverId}`).emit('user_typing', data);
      }
    });

    socket.on('stop_typing', (data) => {
      if (data.groupId) {
        socket.to(`group_${data.groupId}`).emit('user_stop_typing', data);
      } else if (data.receiverId) {
        io.to(`user_${data.receiverId}`).emit('user_stop_typing', data);
      }
    });

    // 7. Ping / Latency test via WebSocket
    socket.on('ping_test', (clientTime, callback) => {
      if (typeof callback === 'function') {
        callback({
          clientTime,
          serverTime: Date.now(),
        });
      }
    });

    // 8. Disconnect Event
    socket.on('disconnect', async (reason) => {
      const userId = socketToUserMap.get(socket.id);
      socketToUserMap.delete(socket.id);

      console.log(`❌ [Socket.IO] Client disconnected: ${socket.id} (Reason: ${reason})`);

      if (userId && userSocketsMap.has(userId)) {
        const socketSet = userSocketsMap.get(userId);
        socketSet.delete(socket.id);

        // If no more active sockets for this user, mark as offline
        if (socketSet.size === 0) {
          userSocketsMap.delete(userId);
          await updateUserOnlineStatus(userId, false);

          // Broadcast offline event to all clients
          io.emit('user_status_changed', {
            userId,
            isOnline: false,
            lastSeen: new Date().toISOString(),
          });

          console.log(`⚫ [Presence] User ${userId} is now OFFLINE`);
        }
      }
    });
  });

  return {
    getOnlineUsersCount: () => userSocketsMap.size,
    isUserOnline: (userId) => userSocketsMap.has(userId.toString()),
  };
}

module.exports = { initSocket };
