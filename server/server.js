require('dotenv').config();
const http = require('http');
const path = require('path');
const os = require('os');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { connectDB } = require('./config/database');
const { initSocket } = require('./socket');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const adminRoutes = require('./routes/admin');
const networkRoutes = require('./routes/network');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Attach io to express app so routes can broadcast if needed
app.set('io', io);

// Initialize Socket.IO handler
const socketEngine = initSocket(io);
app.set('socketEngine', socketEngine);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend client static files
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/network', networkRoutes);

// Fallback route for SPA or root
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Helper to find local network IPv4 address for Wi-Fi testing
function getLocalWirelessIp() {
  const interfaces = os.networkInterfaces();
  let fallbackIp = 'localhost';

  // 1. Look for Wi-Fi or Wireless interface first
  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('wi-fi') || lowerName.includes('wireless') || lowerName.includes('wlan')) {
      for (const net of interfaces[name]) {
        if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
          return net.address;
        }
      }
    }
  }

  // 2. Look for non-virtual physical adapter
  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    if (!lowerName.includes('vmware') && !lowerName.includes('virtual') && !lowerName.includes('vbox')) {
      for (const net of interfaces[name]) {
        if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
          return net.address;
        }
      }
    }
  }

  // 3. Any non-internal IPv4
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
        return net.address;
      }
    }
  }

  return fallbackIp;
}

const PORT = process.env.PORT || 3000;

// Connect Database & Start Server
connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalWirelessIp();
    console.log('====================================================');
    console.log('       📡 WAVECHAT - WIRELESS CHAT APPLICATION       ');
    console.log('  Client-Server Real-Time Wireless Mobile Communication');
    console.log('====================================================');
    console.log(`🚀 [Local Access]      http://localhost:${PORT}`);
    console.log(`📶 [Wi-Fi/LAN Access]   http://${localIp}:${PORT}`);
    console.log(`💡 [Testing Tip] Open http://${localIp}:${PORT} on your mobile`);
    console.log(`   phone or a second PC connected to the same Wi-Fi!`);
    console.log('====================================================\n');
  });
});

module.exports = { app, server };
