// WaveChat Main Dashboard Controller
document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();

  const currentUser = Auth.getUser();
  if (!currentUser) return;

  // Initialize Socket.IO connection
  SocketService.init(currentUser);

  // State
  let allUsers = [];
  let allGroups = [];
  let activeTab = 'chats'; // 'chats' or 'groups'
  let activeChat = null; // { type: 'user' | 'group', id: string, data: object }
  let typingTimeout = null;

  // DOM Elements
  const currentUserNameEl = document.getElementById('currentUserName');
  const currentUserAvatarEl = document.getElementById('currentUserAvatar');
  const currentUserStatusMsgEl = document.getElementById('currentUserStatusMsg');
  const sidebarConversationsEl = document.getElementById('sidebarConversations');
  const searchInputEl = document.getElementById('sidebarSearch');
  const tabChatsBtn = document.getElementById('tabChatsBtn');
  const tabGroupsBtn = document.getElementById('tabGroupsBtn');

  const chatHeaderArea = document.getElementById('chatHeaderArea');
  const chatMessagesList = document.getElementById('chatMessagesList');
  const chatEmptyState = document.getElementById('chatEmptyState');
  const chatActiveState = document.getElementById('chatActiveState');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const typingIndicatorBox = document.getElementById('typingIndicatorBox');
  const typingTextEl = document.getElementById('typingText');

  const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
  const chatSidebar = document.getElementById('chatSidebar');
  const chatSidebarBackdrop = document.getElementById('chatSidebarBackdrop');

  // Set Profile info in Sidebar
  if (currentUserNameEl) currentUserNameEl.textContent = currentUser.fullName;
  if (currentUserAvatarEl) currentUserAvatarEl.src = currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`;
  if (currentUserStatusMsgEl) currentUserStatusMsgEl.textContent = currentUser.statusMessage || 'Available';

  // Format timestamp helper (Requirement 8)
  function formatMessageTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return timeStr;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}, ${timeStr}`;
  }

  // Load Users & Groups from Backend
  async function loadSidebarData() {
    const [usersRes, groupsRes] = await Promise.all([
      Auth.apiRequest('/api/users'),
      Auth.apiRequest('/api/groups'),
    ]);

    if (usersRes.ok && usersRes.data.users) {
      allUsers = usersRes.data.users;
    }
    if (groupsRes.ok && groupsRes.data.groups) {
      allGroups = groupsRes.data.groups;
      // Auto join socket rooms for all user groups
      allGroups.forEach((g) => SocketService.joinGroup(g._id));
    }

    renderSidebar();
  }

  // Render Sidebar based on active tab and search query
  function renderSidebar() {
    const query = (searchInputEl?.value || '').toLowerCase().trim();
    sidebarConversationsEl.innerHTML = '';

    if (activeTab === 'chats') {
      const filteredUsers = allUsers.filter(
        (u) =>
          u.fullName.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );

      if (filteredUsers.length === 0) {
        sidebarConversationsEl.innerHTML = `
          <div class="text-center py-4 text-muted small">
            <i class="bi bi-people mb-2 d-block fs-3"></i>
            No users found
          </div>`;
        return;
      }

      filteredUsers.forEach((user) => {
        const isOnline = SocketService.isUserOnline(user._id) || user.isOnline;
        const isActive = activeChat && activeChat.type === 'user' && activeChat.id === user._id;

        const item = document.createElement('div');
        item.className = `conversation-item ${isActive ? 'active' : ''}`;
        item.dataset.userId = user._id;
        item.innerHTML = `
          <div class="user-avatar-wrapper">
            <img src="${user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}" class="user-avatar-img" alt="${user.fullName}">
            <span class="avatar-status-badge ${isOnline ? 'online' : 'offline'}" id="status-badge-${user._id}"></span>
          </div>
          <div class="conversation-info">
            <div class="conversation-title">
              <span>${user.fullName}</span>
              <span class="conversation-time">${isOnline ? 'online' : 'offline'}</span>
            </div>
            <div class="conversation-preview">${user.statusMessage || '@' + user.username}</div>
          </div>
        `;

        item.addEventListener('click', () => {
          openDirectChat(user);
          closeMobileSidebar();
        });

        sidebarConversationsEl.appendChild(item);
      });
    } else {
      // Groups Tab
      const filteredGroups = allGroups.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          (g.description && g.description.toLowerCase().includes(query))
      );

      if (filteredGroups.length === 0) {
        sidebarConversationsEl.innerHTML = `
          <div class="text-center py-4 text-muted small">
            <i class="bi bi-collection mb-2 d-block fs-3"></i>
            No groups found.<br>Click "+ New Group" to create one!
          </div>`;
        return;
      }

      filteredGroups.forEach((group) => {
        const isActive = activeChat && activeChat.type === 'group' && activeChat.id === group._id;
        const memberCount = group.members ? group.members.length : 0;

        const item = document.createElement('div');
        item.className = `conversation-item ${isActive ? 'active' : ''}`;
        item.dataset.groupId = group._id;
        item.innerHTML = `
          <div class="user-avatar-wrapper">
            <img src="${group.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(group.name)}`}" class="user-avatar-img" alt="${group.name}">
          </div>
          <div class="conversation-info">
            <div class="conversation-title">
              <span>${group.name}</span>
              <span class="badge bg-light text-dark border small">${memberCount} members</span>
            </div>
            <div class="conversation-preview">${group.description || 'Group conversation'}</div>
          </div>
        `;

        item.addEventListener('click', () => {
          openGroupChat(group);
          closeMobileSidebar();
        });

        sidebarConversationsEl.appendChild(item);
      });
    }
  }

  // Open Direct 1-to-1 Chat
  async function openDirectChat(user) {
    activeChat = { type: 'user', id: user._id, data: user };
    renderSidebar(); // refresh active styling

    chatEmptyState.classList.add('d-none');
    chatActiveState.classList.remove('d-none');

    const isOnline = SocketService.isUserOnline(user._id) || user.isOnline;

    chatHeaderArea.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-sm btn-light d-lg-none" id="mobileBackBtn">
          <i class="bi bi-arrow-left"></i>
        </button>
        <div class="user-avatar-wrapper">
          <img src="${user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}" class="user-avatar-img" alt="${user.fullName}">
          <span class="avatar-status-badge ${isOnline ? 'online' : 'offline'}" id="chat-header-status-dot"></span>
        </div>
        <div>
          <h6 class="mb-0 fw-bold">${user.fullName}</h6>
          <div class="small text-muted d-flex align-items-center gap-1" id="chat-header-status-text">
            <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
            <span>${isOnline ? 'Online (Connected via Wireless)' : 'Offline'}</span>
          </div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="badge bg-primary-subtle text-primary border border-primary-subtle py-1 px-2">
          <i class="bi bi-wifi me-1"></i> Direct P2P/TCP
        </span>
      </div>
    `;

    document.getElementById('mobileBackBtn')?.addEventListener('click', openMobileSidebar);

    // Fetch message history from REST API
    chatMessagesList.innerHTML = `<div class="text-center py-5"><div class="spinner-border spinner-border-sm text-primary"></div><p class="text-muted small mt-2">Loading wireless message packets...</p></div>`;

    const res = await Auth.apiRequest(`/api/messages/${user._id}`);
    chatMessagesList.innerHTML = '';

    if (res.ok && res.data.messages) {
      if (res.data.messages.length === 0) {
        chatMessagesList.innerHTML = `
          <div class="text-center my-auto py-5 text-muted">
            <i class="bi bi-chat-heart fs-1 text-primary opacity-50 mb-3 d-block"></i>
            <h6 class="fw-bold">No messages yet with ${user.fullName}</h6>
            <p class="small">Send the first packet to initiate client-server transmission!</p>
          </div>`;
      } else {
        res.data.messages.forEach((msg) => renderMessage(msg));
      }
      scrollToBottom();
    }
  }

  // Open Group Chat
  async function openGroupChat(group) {
    activeChat = { type: 'group', id: group._id, data: group };
    renderSidebar();

    chatEmptyState.classList.add('d-none');
    chatActiveState.classList.remove('d-none');

    const memberCount = group.members ? group.members.length : 0;

    chatHeaderArea.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-sm btn-light d-lg-none" id="mobileBackBtn">
          <i class="bi bi-arrow-left"></i>
        </button>
        <div class="user-avatar-wrapper">
          <img src="${group.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(group.name)}`}" class="user-avatar-img" alt="${group.name}">
        </div>
        <div>
          <h6 class="mb-0 fw-bold">${group.name}</h6>
          <div class="small text-muted">
            <i class="bi bi-people me-1"></i> ${memberCount} members · Multicast Room
          </div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="badge bg-info-subtle text-info border border-info-subtle py-1 px-2">
          <i class="bi bi-broadcast me-1"></i> Group Broadcast
        </span>
      </div>
    `;

    document.getElementById('mobileBackBtn')?.addEventListener('click', openMobileSidebar);

    chatMessagesList.innerHTML = `<div class="text-center py-5"><div class="spinner-border spinner-border-sm text-primary"></div><p class="text-muted small mt-2">Loading group history...</p></div>`;

    const res = await Auth.apiRequest(`/api/groups/${group._id}/messages`);
    chatMessagesList.innerHTML = '';

    if (res.ok && res.data.messages) {
      if (res.data.messages.length === 0) {
        chatMessagesList.innerHTML = `
          <div class="text-center my-auto py-5 text-muted">
            <i class="bi bi-chat-square-quote fs-1 text-primary opacity-50 mb-3 d-block"></i>
            <h6 class="fw-bold">Welcome to ${group.name}</h6>
            <p class="small">Messages sent here are broadcast to all online group members in real time.</p>
          </div>`;
      } else {
        res.data.messages.forEach((msg) => renderMessage(msg));
      }
      scrollToBottom();
    }
  }

  // Render a Single Message Bubble
  function renderMessage(message) {
    const senderId = message.sender._id ? message.sender._id.toString() : message.sender.toString();
    const isSentByMe = senderId === currentUser._id.toString();

    const row = document.createElement('div');
    row.className = `message-row ${isSentByMe ? 'sent' : 'received'}`;

    const formattedTime = formatMessageTime(message.createdAt);
    const senderName = message.sender.fullName || (isSentByMe ? currentUser.fullName : 'User');

    let showSenderHeader = '';
    if (!isSentByMe && activeChat && activeChat.type === 'group') {
      showSenderHeader = `<div class="message-sender-name">${senderName}</div>`;
    }

    row.innerHTML = `
      <div class="message-bubble">
        ${showSenderHeader}
        <div class="message-text">${escapeHtml(message.text)}</div>
        <div class="message-meta">
          <span>${formattedTime}</span>
          ${isSentByMe ? '<i class="bi bi-check2-all text-light"></i>' : ''}
        </div>
      </div>
    `;

    chatMessagesList.appendChild(row);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
  }

  function scrollToBottom() {
    chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
  }

  // Send Message Event
  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeChat) return;

    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';

    // Stop typing indicator immediately
    SocketService.sendStopTyping({
      senderId: currentUser._id,
      receiverId: activeChat.type === 'user' ? activeChat.id : null,
      groupId: activeChat.type === 'group' ? activeChat.id : null,
    });

    if (activeChat.type === 'user') {
      // 1-to-1 message via Socket.IO
      const payload = {
        senderId: currentUser._id,
        receiverId: activeChat.id,
        text,
      };

      SocketService.sendPrivateMessage(payload, (response) => {
        if (response && response.success && response.message) {
          renderMessage(response.message);
          scrollToBottom();
        } else {
          // Fallback to REST API if socket callback fails
          Auth.apiRequest('/api/messages', 'POST', payload).then((res) => {
            if (res.ok && res.data.data) {
              renderMessage(res.data.data);
              scrollToBottom();
            }
          });
        }
      });
    } else {
      // Group message via Socket.IO
      const payload = {
        senderId: currentUser._id,
        groupId: activeChat.id,
        text,
      };

      SocketService.sendGroupMessage(payload, (response) => {
        if (response && response.success && response.message) {
          // Group broadcast will also arrive via socket event, or fallback render
        } else {
          Auth.apiRequest(`/api/groups/${activeChat.id}/messages`, 'POST', { text }).then((res) => {
            if (res.ok && res.data.data) {
              renderMessage(res.data.data);
              scrollToBottom();
            }
          });
        }
      });
    }
  });

  // Typing Input Detection
  messageInput.addEventListener('input', () => {
    if (!activeChat) return;

    SocketService.sendTyping({
      senderId: currentUser._id,
      senderName: currentUser.fullName,
      receiverId: activeChat.type === 'user' ? activeChat.id : null,
      groupId: activeChat.type === 'group' ? activeChat.id : null,
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      SocketService.sendStopTyping({
        senderId: currentUser._id,
        receiverId: activeChat.type === 'user' ? activeChat.id : null,
        groupId: activeChat.type === 'group' ? activeChat.id : null,
      });
    }, 1500);
  });

  // Incoming Socket Event Listeners
  // 1. Private Message received
  SocketService.onMessage((msg) => {
    const senderId = msg.sender._id ? msg.sender._id.toString() : msg.sender.toString();
    const receiverId = msg.receiver ? (msg.receiver._id ? msg.receiver._id.toString() : msg.receiver.toString()) : '';

    if (
      activeChat &&
      activeChat.type === 'user' &&
      (activeChat.id === senderId || (senderId === currentUser._id.toString() && activeChat.id === receiverId))
    ) {
      renderMessage(msg);
      scrollToBottom();
    }
  });

  // 2. Group Message received
  SocketService.onGroupMessage((data) => {
    if (activeChat && activeChat.type === 'group' && activeChat.id === data.groupId) {
      renderMessage(data.message);
      scrollToBottom();
    }
  });

  // 3. Status Changed (Online / Offline)
  SocketService.onStatusChange((userId, isOnline) => {
    // Update badge in sidebar
    const badge = document.getElementById(`status-badge-${userId}`);
    if (badge) {
      badge.className = `avatar-status-badge ${isOnline ? 'online' : 'offline'}`;
    }

    // Update active chat header if current chat is with this user
    if (activeChat && activeChat.type === 'user' && activeChat.id === userId) {
      const headerDot = document.getElementById('chat-header-status-dot');
      const headerText = document.getElementById('chat-header-status-text');
      if (headerDot) headerDot.className = `avatar-status-badge ${isOnline ? 'online' : 'offline'}`;
      if (headerText) {
        headerText.innerHTML = `
          <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
          <span>${isOnline ? 'Online (Connected via Wireless)' : 'Offline'}</span>
        `;
      }
    }
  });

  // 4. Typing indicator events
  SocketService.onTyping((data) => {
    if (
      activeChat &&
      ((activeChat.type === 'user' && activeChat.id === data.senderId) ||
        (activeChat.type === 'group' && activeChat.id === data.groupId && data.senderId !== currentUser._id))
    ) {
      typingTextEl.textContent = `${data.senderName} is typing...`;
      typingIndicatorBox.classList.remove('d-none');
      scrollToBottom();
    }
  });

  SocketService.onStopTyping((data) => {
    if (
      activeChat &&
      ((activeChat.type === 'user' && activeChat.id === data.senderId) ||
        (activeChat.type === 'group' && activeChat.id === data.groupId))
    ) {
      typingIndicatorBox.classList.add('d-none');
    }
  });

  // Tabs Switching
  tabChatsBtn?.addEventListener('click', () => {
    activeTab = 'chats';
    tabChatsBtn.classList.add('active');
    tabGroupsBtn.classList.remove('active');
    renderSidebar();
  });

  tabGroupsBtn?.addEventListener('click', () => {
    activeTab = 'groups';
    tabGroupsBtn.classList.add('active');
    tabChatsBtn.classList.remove('active');
    renderSidebar();
  });

  // Search filter
  searchInputEl?.addEventListener('input', () => {
    renderSidebar();
  });

  // Mobile sidebar controls
  function openMobileSidebar() {
    chatSidebar.classList.add('mobile-open');
    chatSidebarBackdrop.classList.add('active');
  }

  function closeMobileSidebar() {
    chatSidebar.classList.remove('mobile-open');
    chatSidebarBackdrop.classList.remove('active');
  }

  mobileSidebarToggle?.addEventListener('click', openMobileSidebar);
  chatSidebarBackdrop?.addEventListener('click', closeMobileSidebar);

  // Logout button
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    Auth.logout();
  });

  // Initial data load
  await loadSidebarData();
});
