const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Group = require('../models/Group');
const { getDbMode } = require('../config/database');
const { USERS_FILE, MESSAGES_FILE, GROUPS_FILE, readJSON, writeJSON } = require('../config/fileDb');

// Helper to sanitize safe user object
function sanitizeUser(user) {
  if (!user) return null;
  const u = user.toObject ? user.toObject() : { ...user };
  delete u.password;
  return u;
}

// ---------------- USER OPERATIONS ----------------

async function findUserById(id) {
  if (getDbMode() === 'mongodb') {
    return await User.findById(id);
  }
  const users = readJSON(USERS_FILE, []);
  return users.find((u) => u._id.toString() === id.toString()) || null;
}

async function findUserByUsernameOrEmail(identifier) {
  const cleanId = (identifier || '').trim().toLowerCase();
  if (getDbMode() === 'mongodb') {
    return await User.findOne({
      $or: [{ username: cleanId }, { email: cleanId }],
    });
  }
  const users = readJSON(USERS_FILE, []);
  return (
    users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId)
    ) || null
  );
}

async function getAllUsers(excludeUserId = null, query = '') {
  const q = (query || '').toLowerCase().trim();

  if (getDbMode() === 'mongodb') {
    const filter = {};
    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    const users = await User.find(filter).select('-password').sort({ isOnline: -1, fullName: 1 });
    return users;
  }

  let users = readJSON(USERS_FILE, []);
  if (excludeUserId) {
    users = users.filter((u) => u._id.toString() !== excludeUserId.toString());
  }
  if (q) {
    users = users.filter(
      (u) =>
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }
  return users
    .map(sanitizeUser)
    .sort((a, b) => (b.isOnline === a.isOnline ? a.fullName.localeCompare(b.fullName) : b.isOnline ? 1 : -1));
}

async function createUser(userData) {
  if (getDbMode() === 'mongodb') {
    const user = new User(userData);
    return await user.save();
  }
  const users = readJSON(USERS_FILE, []);
  const newUser = {
    _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    ...userData,
    isOnline: false,
    lastSeen: new Date().toISOString(),
    role: userData.role || 'user',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeJSON(USERS_FILE, users);
  return newUser;
}

async function updateUserOnlineStatus(userId, isOnline) {
  if (getDbMode() === 'mongodb') {
    return await User.findByIdAndUpdate(
      userId,
      { isOnline, lastSeen: new Date() },
      { new: true }
    );
  }
  const users = readJSON(USERS_FILE, []);
  const index = users.findIndex((u) => u._id.toString() === userId.toString());
  if (index !== -1) {
    users[index].isOnline = isOnline;
    users[index].lastSeen = new Date().toISOString();
    writeJSON(USERS_FILE, users);
    return users[index];
  }
  return null;
}

async function updateUserProfile(userId, updateData) {
  if (getDbMode() === 'mongodb') {
    return await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
  }
  const users = readJSON(USERS_FILE, []);
  const index = users.findIndex((u) => u._id.toString() === userId.toString());
  if (index !== -1) {
    users[index] = { ...users[index], ...updateData, updatedAt: new Date().toISOString() };
    writeJSON(USERS_FILE, users);
    return sanitizeUser(users[index]);
  }
  return null;
}

async function deleteUser(userId) {
  if (getDbMode() === 'mongodb') {
    return await User.findByIdAndDelete(userId);
  }
  let users = readJSON(USERS_FILE, []);
  const beforeLen = users.length;
  users = users.filter((u) => u._id.toString() !== userId.toString());
  writeJSON(USERS_FILE, users);
  return users.length < beforeLen;
}

// ---------------- MESSAGE OPERATIONS ----------------

async function createMessage({ sender, receiver = null, group = null, text, messageType = 'text' }) {
  if (getDbMode() === 'mongodb') {
    const msg = new Message({
      sender,
      receiver,
      group,
      text,
      messageType,
      status: 'sent',
    });
    await msg.save();
    return await Message.findById(msg._id).populate('sender', 'fullName username avatar');
  }

  const messages = readJSON(MESSAGES_FILE, []);
  const users = readJSON(USERS_FILE, []);
  const senderUser = users.find((u) => u._id.toString() === sender.toString());

  const newMsg = {
    _id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    sender: {
      _id: senderUser ? senderUser._id : sender,
      fullName: senderUser ? senderUser.fullName : 'User',
      username: senderUser ? senderUser.username : 'user',
      avatar: senderUser ? senderUser.avatar : '',
    },
    receiver: receiver || null,
    group: group || null,
    text,
    messageType,
    status: 'delivered',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  messages.push(newMsg);
  writeJSON(MESSAGES_FILE, messages);
  return newMsg;
}

async function getDirectMessages(userId1, userId2) {
  if (getDbMode() === 'mongodb') {
    return await Message.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    })
      .populate('sender', 'fullName username avatar')
      .sort({ createdAt: 1 });
  }

  const messages = readJSON(MESSAGES_FILE, []);
  const filtered = messages.filter((m) => {
    if (m.group) return false;
    const sId = m.sender._id ? m.sender._id.toString() : m.sender.toString();
    const rId = m.receiver ? (m.receiver._id ? m.receiver._id.toString() : m.receiver.toString()) : '';
    return (
      (sId === userId1.toString() && rId === userId2.toString()) ||
      (sId === userId2.toString() && rId === userId1.toString())
    );
  });

  return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function getGroupMessages(groupId) {
  if (getDbMode() === 'mongodb') {
    return await Message.find({ group: groupId })
      .populate('sender', 'fullName username avatar')
      .sort({ createdAt: 1 });
  }

  const messages = readJSON(MESSAGES_FILE, []);
  const filtered = messages.filter(
    (m) => m.group && m.group.toString() === groupId.toString()
  );

  return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function getTotalMessagesCount() {
  if (getDbMode() === 'mongodb') {
    return await Message.countDocuments();
  }
  const messages = readJSON(MESSAGES_FILE, []);
  return messages.length;
}

// ---------------- GROUP OPERATIONS ----------------

async function createGroup({ name, description = '', admin, members = [] }) {
  const memberList = Array.from(new Set([admin.toString(), ...members.map((m) => m.toString())]));

  if (getDbMode() === 'mongodb') {
    const group = new Group({
      name,
      description,
      admin,
      members: memberList,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
    });
    return await group.save();
  }

  const groups = readJSON(GROUPS_FILE, []);
  const newGroup = {
    _id: 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name,
    description,
    admin,
    members: memberList,
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  groups.push(newGroup);
  writeJSON(GROUPS_FILE, groups);
  return newGroup;
}

async function findGroupById(groupId) {
  if (getDbMode() === 'mongodb') {
    return await Group.findById(groupId)
      .populate('admin', 'fullName username avatar')
      .populate('members', 'fullName username avatar isOnline');
  }

  const groups = readJSON(GROUPS_FILE, []);
  const group = groups.find((g) => g._id.toString() === groupId.toString());
  if (!group) return null;

  const users = readJSON(USERS_FILE, []);
  const adminObj = users.find((u) => u._id.toString() === group.admin.toString());
  const memberObjs = users.filter((u) => group.members.some((m) => m.toString() === u._id.toString()));

  return {
    ...group,
    admin: sanitizeUser(adminObj),
    members: memberObjs.map(sanitizeUser),
  };
}

async function getUserGroups(userId) {
  if (getDbMode() === 'mongodb') {
    return await Group.find({ members: userId })
      .populate('admin', 'fullName username avatar')
      .populate('members', 'fullName username avatar isOnline')
      .sort({ updatedAt: -1 });
  }

  const groups = readJSON(GROUPS_FILE, []);
  const users = readJSON(USERS_FILE, []);
  const userGroups = groups.filter((g) =>
    g.members.some((m) => m.toString() === userId.toString())
  );

  return userGroups.map((g) => {
    const adminObj = users.find((u) => u._id.toString() === g.admin.toString());
    const memberObjs = users.filter((u) => g.members.some((m) => m.toString() === u._id.toString()));
    return {
      ...g,
      admin: sanitizeUser(adminObj),
      members: memberObjs.map(sanitizeUser),
    };
  });
}

async function addMemberToGroup(groupId, userId) {
  if (getDbMode() === 'mongodb') {
    return await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: userId } },
      { new: true }
    );
  }
  const groups = readJSON(GROUPS_FILE, []);
  const group = groups.find((g) => g._id.toString() === groupId.toString());
  if (group) {
    if (!group.members.includes(userId.toString())) {
      group.members.push(userId.toString());
      group.updatedAt = new Date().toISOString();
      writeJSON(GROUPS_FILE, groups);
    }
    return group;
  }
  return null;
}

async function removeMemberFromGroup(groupId, userId) {
  if (getDbMode() === 'mongodb') {
    return await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: userId } },
      { new: true }
    );
  }
  const groups = readJSON(GROUPS_FILE, []);
  const group = groups.find((g) => g._id.toString() === groupId.toString());
  if (group) {
    group.members = group.members.filter((m) => m.toString() !== userId.toString());
    group.updatedAt = new Date().toISOString();
    writeJSON(GROUPS_FILE, groups);
    return group;
  }
  return null;
}

async function getAllGroups() {
  if (getDbMode() === 'mongodb') {
    return await Group.find().populate('admin', 'fullName username').populate('members', 'fullName');
  }
  const groups = readJSON(GROUPS_FILE, []);
  return groups;
}

module.exports = {
  sanitizeUser,
  findUserById,
  findUserByUsernameOrEmail,
  getAllUsers,
  createUser,
  updateUserOnlineStatus,
  updateUserProfile,
  deleteUser,
  createMessage,
  getDirectMessages,
  getGroupMessages,
  getTotalMessagesCount,
  createGroup,
  findGroupById,
  getUserGroups,
  addMemberToGroup,
  removeMemberFromGroup,
  getAllGroups,
};
