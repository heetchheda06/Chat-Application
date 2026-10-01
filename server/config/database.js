const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { initFileDb } = require('./fileDb');

let isConnectedToMongo = false;

async function seedMongo() {
  try {
    const User = require('../models/User');
    const Group = require('../models/Group');
    const Message = require('../models/Message');

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);

    // Seed Heet
    let heet = await User.findOne({ username: 'heet' });
    if (!heet) {
      heet = await User.create({
        fullName: 'Heet Patel',
        username: 'heet',
        email: 'heet@wavechat.local',
        password: defaultPasswordHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=heet',
        statusMessage: 'Exploring Wireless Mobile Communication Protocols 📡',
        isOnline: false,
        role: 'admin',
      });
    }

    // Seed Rahul
    let rahul = await User.findOne({ username: 'rahul' });
    if (!rahul) {
      rahul = await User.create({
        fullName: 'Rahul Sharma',
        username: 'rahul',
        email: 'rahul@wavechat.local',
        password: defaultPasswordHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=rahul',
        statusMessage: 'Testing Wi-Fi Client-Server Packet Flow 🚀',
        isOnline: false,
        role: 'user',
      });
    }

    // Seed Om
    let om = await User.findOne({ username: 'om' });
    if (!om) {
      om = await User.create({
        fullName: 'Om Verma',
        username: 'om',
        email: 'om@wavechat.local',
        password: defaultPasswordHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=om',
        statusMessage: 'Connected via 5G Mobile Hotspot',
        isOnline: false,
        role: 'user',
      });
    }

    // Seed Jay
    let jay = await User.findOne({ username: 'jay' });
    if (!jay) {
      jay = await User.create({
        fullName: 'Jay Mehta',
        username: 'jay',
        email: 'jay@wavechat.local',
        password: defaultPasswordHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=jay',
        statusMessage: 'Studying TCP/IP and WebSocket full-duplex',
        isOnline: false,
        role: 'user',
      });
    }

    // Seed Default Group
    let wmcGroup = await Group.findOne({ name: 'WMC Project Team' });
    if (!wmcGroup && heet && rahul && om && jay) {
      wmcGroup = await Group.create({
        name: 'WMC Project Team',
        description: 'Wireless Mobile Communication Real-Time Research Group',
        admin: heet._id,
        members: [heet._id, rahul._id, om._id, jay._id],
        avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=wmc_team',
      });

      await Message.create({
        sender: heet._id,
        receiver: null,
        group: wmcGroup._id,
        text: 'Welcome everyone to WaveChat! This group demonstrates multi-client broadcasting over Wireless LAN / 5G.',
        messageType: 'text',
        status: 'delivered',
      });

      await Message.create({
        sender: rahul._id,
        receiver: null,
        group: wmcGroup._id,
        text: 'Socket.IO full-duplex connection confirmed on port 3000! Client-server packets are transmitting smoothly.',
        messageType: 'text',
        status: 'delivered',
      });
      console.log('✅ [MongoDB] WMC multicast group and welcome messages seeded.');
    }
    console.log('✅ [MongoDB] All 4 demo users verified.');
  } catch (err) {
    console.error('Error seeding MongoDB:', err.message);
  }
}

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wavechat';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2500,
    });
    isConnectedToMongo = true;
    console.log('----------------------------------------------------');
    console.log('✅ [Database] Successfully connected to MongoDB Database');
    console.log(`📡 [Database URI] ${mongoUri}`);
    console.log('----------------------------------------------------');
    await seedMongo();
  } catch (error) {
    isConnectedToMongo = false;
    console.log('----------------------------------------------------');
    console.log('⚠️  [Database Warning] Could not connect to MongoDB server.');
    console.log(`ℹ️  [Reason] ${error.message}`);
    console.log('🔄 [Auto-Fallback] Engaging Built-in Local File Database (JSON)');
    console.log('⚡ All user accounts, chat history & groups will be persisted locally!');
    console.log('----------------------------------------------------');
    await initFileDb();
  }
};

const getDbMode = () => (isConnectedToMongo ? 'mongodb' : 'filedb');

module.exports = { connectDB, getDbMode };
