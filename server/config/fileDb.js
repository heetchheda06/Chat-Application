const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return defaultValue;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Seed default users and group if empty
async function initFileDb() {
  const users = readJSON(USERS_FILE, []);
  if (users.length === 0) {
    console.log('[FileDB] Seeding default college project demo users...');
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);

    const defaultUsers = [
      {
        _id: 'user_heet_001',
        fullName: 'Heet Patel',
        username: 'heet',
        email: 'heet@wavechat.local',
        password: defaultPasswordHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=heet',
        statusMessage: 'Exploring Wireless Mobile Communication Protocols 📡',
        isOnline: false,
        lastSeen: new Date().toISOString(),
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'user_rahul_002',
        fullName: 'Rahul Sharma',
        username: 'rahul',
        email: 'rahul@wavechat.local',
        password: defaultPasswordHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=rahul',
        statusMessage: 'Testing Wi-Fi Client-Server Packet Flow 🚀',
        isOnline: false,
        lastSeen: new Date().toISOString(),
        role: 'user',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'user_om_003',
        fullName: 'Om Verma',
        username: 'om',
        email: 'om@wavechat.local',
        password: defaultPasswordHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=om',
        statusMessage: 'Connected via 5G Mobile Hotspot',
        isOnline: false,
        lastSeen: new Date().toISOString(),
        role: 'user',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'user_jay_004',
        fullName: 'Jay Mehta',
        username: 'jay',
        email: 'jay@wavechat.local',
        password: defaultPasswordHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=jay',
        statusMessage: 'Studying TCP/IP and WebSocket full-duplex',
        isOnline: false,
        lastSeen: new Date().toISOString(),
        role: 'user',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    writeJSON(USERS_FILE, defaultUsers);

    // Seed default WMC Project Study Group
    const defaultGroup = [
      {
        _id: 'group_wmc_001',
        name: 'WMC Project Team',
        description: 'Wireless Mobile Communication Real-Time Research Group',
        admin: 'user_heet_001',
        members: ['user_heet_001', 'user_rahul_002', 'user_om_003', 'user_jay_004'],
        avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=wmc_team',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    writeJSON(GROUPS_FILE, defaultGroup);

    // Seed initial welcome message
    const defaultMessages = [
      {
        _id: 'msg_init_001',
        sender: 'user_heet_001',
        receiver: null,
        group: 'group_wmc_001',
        text: 'Welcome everyone to WaveChat! This group demonstrates multi-client broadcasting over Wireless LAN / 5G.',
        messageType: 'text',
        status: 'delivered',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        _id: 'msg_init_002',
        sender: 'user_rahul_002',
        receiver: null,
        group: 'group_wmc_001',
        text: 'Socket.IO full-duplex connection confirmed on port 3000! Client-server packets are transmitting smoothly.',
        messageType: 'text',
        status: 'delivered',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
    writeJSON(MESSAGES_FILE, defaultMessages);
    console.log('[FileDB] Default users and group successfully seeded.');
  }
}

module.exports = {
  USERS_FILE,
  MESSAGES_FILE,
  GROUPS_FILE,
  readJSON,
  writeJSON,
  initFileDb,
};
