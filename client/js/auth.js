// WaveChat Client Authentication Helper
const Auth = {
  TOKEN_KEY: 'wavechat_token',
  USER_KEY: 'wavechat_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  saveAuth(token, user) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
    }
  },

  checkAlreadyLoggedIn() {
    if (this.isLoggedIn()) {
      window.location.href = 'chat.html';
    }
  },

  async apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json();

      if (response.status === 401) {
        this.clearAuth();
        window.location.href = 'login.html';
      }

      return { status: response.status, ok: response.ok, data };
    } catch (error) {
      console.error(`API Request to ${endpoint} failed:`, error);
      return {
        status: 500,
        ok: false,
        data: { success: false, message: 'Network or server error. Check connection.' },
      };
    }
  },

  async logout() {
    try {
      await this.apiRequest('/api/auth/logout', 'POST');
    } catch (e) {
      // Ignore network errors on logout
    }
    this.clearAuth();
    window.location.href = 'login.html';
  },

  // Helper for college project demo quick-logins
  fillDemoCredentials(username, password = 'password123') {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput && passwordInput) {
      usernameInput.value = username;
      passwordInput.value = password;
      const loginForm = document.getElementById('loginForm');
      if (loginForm) {
        loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }
  },
};
