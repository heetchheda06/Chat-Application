const express = require('express');
const router = express.Router();
const os = require('os');
const {
  getAllUsers,
  getTotalMessagesCount,
  getAllGroups,
  updateUserProfile,
  deleteUser,
  findUserById,
} = require('../services/dbService');
const { getDbMode } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/admin/stats
// @desc    Get dashboard metrics for administrative oversight
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const users = await getAllUsers();
    const onlineCount = users.filter((u) => u.isOnline).length;
    const offlineCount = users.length - onlineCount;
    const totalMessages = await getTotalMessagesCount();
    const groups = await getAllGroups();

    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);

    return res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        onlineUsers: onlineCount,
        offlineUsers: offlineCount,
        totalMessages,
        totalGroups: groups.length,
        serverUptime: `${hours}h ${minutes}m ${seconds}s`,
        dbEngine: getDbMode() === 'mongodb' ? 'MongoDB + Mongoose' : 'Local JSON File Database (Standalone Mode)',
        nodeVersion: process.version,
        platform: `${os.type()} (${os.arch()})`,
        freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
        totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin stats.',
      error: error.message,
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get complete list of registered users for admin review
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await getAllUsers();
    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user list.',
    });
  }
});

// @route   PUT /api/admin/users/:id/toggle
// @desc    Toggle user active/inactive status
router.put('/users/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const currentStatus = user.isActive !== false;
    const updated = await updateUserProfile(req.params.id, { isActive: !currentStatus });

    return res.json({
      success: true,
      message: `User account has been ${!currentStatus ? 'activated' : 'disabled'}.`,
      user: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to toggle user status.' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own active admin account.',
      });
    }

    await deleteUser(req.params.id);
    return res.json({
      success: true,
      message: 'User removed successfully from the network.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

module.exports = router;
