const express = require('express');
const router = express.Router();
const {
  getUserGroups,
  createGroup,
  findGroupById,
  getGroupMessages,
  createMessage,
  addMemberToGroup,
  removeMemberFromGroup,
  findUserById,
} = require('../services/dbService');
const { authenticateToken } = require('../middleware/auth');

// @route   GET /api/groups
// @desc    Get all groups the logged-in user is a member of
router.get('/', authenticateToken, async (req, res) => {
  try {
    const groups = await getUserGroups(req.user._id);
    return res.json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve groups.',
      error: error.message,
    });
  }
});

// @route   POST /api/groups
// @desc    Create a new group
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required.',
      });
    }

    const members = Array.isArray(memberIds) ? memberIds : [];

    const newGroup = await createGroup({
      name: name.trim(),
      description: description ? description.trim() : '',
      admin: req.user._id,
      members,
    });

    // Notify connected members via Socket.IO
    const io = req.app.get('io');
    if (io) {
      newGroup.members.forEach((memId) => {
        io.to(`user_${memId}`).emit('group_created', newGroup);
      });
    }

    return res.status(201).json({
      success: true,
      message: `Group "${newGroup.name}" created successfully.`,
      group: newGroup,
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating group.',
      error: error.message,
    });
  }
});

// @route   GET /api/groups/:id
// @desc    Get group details with members
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const group = await findGroupById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.',
      });
    }

    // Check membership
    const isMember = group.members.some(
      (m) => (m._id ? m._id.toString() : m.toString()) === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group.',
      });
    }

    return res.json({
      success: true,
      group,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching group details.',
      error: error.message,
    });
  }
});

// @route   GET /api/groups/:id/messages
// @desc    Get group chat history
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.',
      });
    }

    const messages = await getGroupMessages(groupId);

    return res.json({
      success: true,
      count: messages.length,
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        admin: group.admin,
        members: group.members,
      },
      messages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve group messages.',
      error: error.message,
    });
  }
});

// @route   POST /api/groups/:id/messages
// @desc    Send a message to a group
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const { text, messageType } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be blank.',
      });
    }

    const group = await findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group does not exist.',
      });
    }

    const message = await createMessage({
      sender: req.user._id,
      receiver: null,
      group: groupId,
      text: text.trim(),
      messageType: messageType || 'text',
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`group_${groupId}`).emit('group_message', {
        groupId,
        message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Group message sent.',
      data: message,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error sending group message.',
      error: error.message,
    });
  }
});

// @route   POST /api/groups/:id/members
// @desc    Add member to group
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updated = await addMemberToGroup(req.params.id, userId);
    return res.json({
      success: true,
      message: `${user.fullName} added to the group.`,
      group: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add member.' });
  }
});

// @route   DELETE /api/groups/:id/members/:userId
// @desc    Remove member from group
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const updated = await removeMemberFromGroup(req.params.id, req.params.userId);
    return res.json({
      success: true,
      message: 'Member removed from group.',
      group: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove member.' });
  }
});

module.exports = router;
