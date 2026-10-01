const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  createUser,
  findUserByUsernameOrEmail,
  findUserById,
  updateUserOnlineStatus,
  updateUserProfile,
  sanitizeUser,
} = require('../services/dbService');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Generate JWT Helper
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { fullName, username, email, password, confirmPassword } = req.body;

    // Validation
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // Check duplicate username or email
    const existingUser = await findUserByUsernameOrEmail(username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken. Please choose another.',
      });
    }

    const existingEmail = await findUserByUsernameOrEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered. Please log in.',
      });
    }

    // Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate random friendly avatar based on username
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

    const user = await createUser({
      fullName: fullName.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      avatar,
      statusMessage: 'Ready for real-time wireless communication 📡',
      role: 'user',
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to WaveChat.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password.',
      });
    }

    const user = await findUserByUsernameOrEmail(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account has been disabled by administrator.',
      });
    }

    // Verify password with bcryptjs
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    // Update status to online
    await updateUserOnlineStatus(user._id, true);

    const token = generateToken(user);

    return res.json({
      success: true,
      message: `Welcome back, ${user.fullName}!`,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
      error: error.message,
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get currently authenticated user
router.get('/me', authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

// @route   PUT /api/auth/profile
// @desc    Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, statusMessage, avatar } = req.body;
    const updates = {};
    if (fullName) updates.fullName = fullName.trim();
    if (statusMessage) updates.statusMessage = statusMessage.trim();
    if (avatar) updates.avatar = avatar.trim();

    const updated = await updateUserProfile(req.user._id, updates);
    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Log out current user
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await updateUserOnlineStatus(req.user._id, false);
    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error logging out.',
    });
  }
});

// @route   GET /api/auth/demo-users
// @desc    Convenient endpoint for college viva demonstrations
router.get('/demo-users', (req, res) => {
  res.json({
    success: true,
    message: 'Pre-configured test accounts for instant college viva evaluation',
    users: [
      { username: 'heet', name: 'Heet Patel (Admin)', password: 'password123', role: 'admin' },
      { username: 'rahul', name: 'Rahul Sharma (Student)', password: 'password123', role: 'user' },
      { username: 'om', name: 'Om Verma (Student)', password: 'password123', role: 'user' },
      { username: 'jay', name: 'Jay Mehta (Student)', password: 'password123', role: 'user' },
    ],
  });
});

module.exports = router;
