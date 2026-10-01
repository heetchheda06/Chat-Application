const express = require('express');
const router = express.Router();
const { getDirectMessages, createMessage, findUserById } = require('../services/dbService');
const { authenticateToken } = require('../middleware/auth');

// @route   GET /api/messages/:userId
// @desc    Retrieve 1-to-1 chat history with a specific user
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    const targetUser = await findUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found.',
      });
    }

    const messages = await getDirectMessages(currentUserId, targetUserId);

    return res.json({
      success: true,
      count: messages.length,
      recipient: {
        _id: targetUser._id,
        fullName: targetUser.fullName,
        username: targetUser.username,
        avatar: targetUser.avatar,
        isOnline: targetUser.isOnline,
        statusMessage: targetUser.statusMessage,
        lastSeen: targetUser.lastSeen,
      },
      messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve message history.',
      error: error.message,
    });
  }
});

// @route   POST /api/messages
// @desc    Send a message via HTTP REST endpoint
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiverId, text, messageType } = req.body;

    if (!receiverId || !text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and non-empty message text are required.',
      });
    }

    const receiver = await findUserById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver does not exist.',
      });
    }

    const message = await createMessage({
      sender: req.user._id,
      receiver: receiverId,
      text: text.trim(),
      messageType: messageType || 'text',
    });

    // If socket.io instance is available on req.app, emit to receiver room
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('receive_message', message);
    }

    return res.status(201).json({
      success: true,
      message: 'Message delivered successfully.',
      data: message,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while sending message.',
      error: error.message,
    });
  }
});

module.exports = router;
