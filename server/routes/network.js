const express = require('express');
const router = express.Router();
const os = require('os');
const { getDbMode } = require('../config/database');

// Helper to get local network IPv4 address (e.g. 192.168.1.5 or 10.0.0.2)
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' || net.family === 4) {
        addresses.push({
          interface: name,
          address: net.address,
          isInternal: net.internal,
          mac: net.mac,
          netmask: net.netmask,
        });
      }
    }
  }
  return addresses;
}

function getBestWirelessIp(ipList) {
  // 1. Wi-Fi
  const wifi = ipList.find((i) => !i.isInternal && i.interface.toLowerCase().includes('wi-fi'));
  if (wifi) return wifi;

  // 2. Physical adapter (not vmware/virtual)
  const physical = ipList.find(
    (i) =>
      !i.isInternal &&
      !i.interface.toLowerCase().includes('vmware') &&
      !i.interface.toLowerCase().includes('virtual')
  );
  if (physical) return physical;

  // 3. Any external
  const ext = ipList.find((i) => !i.isInternal);
  return ext || { address: '127.0.0.1', interface: 'Loopback' };
}

// @route   GET /api/network/info
// @desc    Get real-time network and server diagnostics for WMC demonstration
router.get('/info', (req, res) => {
  const io = req.app.get('io');
  const connectedSocketsCount = io ? io.engine.clientsCount : 0;
  const port = process.env.PORT || 3000;
  const ipList = getLocalIpAddresses();
  const primary = getBestWirelessIp(ipList);

  return res.json({
    success: true,
    server: {
      status: 'Online',
      serverPort: port,
      hostName: os.hostname(),
      primaryIp: primary.address,
      interfaceName: primary.interface,
      allNetworkInterfaces: ipList,
      databaseMode: getDbMode() === 'mongodb' ? 'MongoDB (Mongoose)' : 'Local File Storage (JSON fallback)',
      connectedClientsCount: connectedSocketsCount,
      protocol: req.protocol.toUpperCase(),
      httpVersion: req.httpVersion,
      socketTransport: 'WebSocket / Engine.IO v4',
      lanAccessUrl: `http://${primary.address}:${port}`,
      loopbackUrl: `http://localhost:${port}`,
    },
    wmcConcepts: {
      layer4: 'TCP (Transmission Control Protocol) on Port ' + port,
      layer7Http: 'HTTP/1.1 REST API for stateless resource management',
      layer7Ws: 'WebSocket for bidirectional, low-latency, full-duplex framing',
      wirelessMedia: 'IEEE 802.11 Wi-Fi (2.4GHz / 5GHz) or 4G/5G Cellular Data Network',
    },
  });
});

// @route   GET /api/network/ping
// @desc    Lightweight endpoint for testing Round Trip Time (RTT) / latency
router.get('/ping', (req, res) => {
  return res.json({
    pong: true,
    timestamp: Date.now(),
  });
});

module.exports = router;
