const express = require('express');
const router = express.Router();
const { getAllUsers, findUserById, sanitizeUser } = require('../services/dbService');
const { authenticateToken } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users (searchable, excludes self)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q || '';
    const users = await getAllUsers(req.user._id, query);
    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.',
      error: error.message,
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user profile by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    return res.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching user details.',
      error: error.message,
    });
  }
});

module.exports = router;
