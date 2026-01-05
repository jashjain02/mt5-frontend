const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('access_token');
  }

  setToken(token) {
    localStorage.setItem('access_token', token);
  }

  removeToken() {
    localStorage.removeItem('access_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.detail || 'An error occurred',
          data,
        };
      }

      return data;
    } catch (error) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 0,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Authentication endpoints
  async register(userData) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify({
        first_name: userData.firstName,
        last_name: userData.lastName,
        email_id: userData.email,
        password: userData.password,
        contact: userData.contact || null,
      }),
      skipAuth: true,
    });
  }

  async login(email, password) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email_id: email,
        password: password,
      }),
      skipAuth: true,
    });
  }

  async verifyOTP(email, otpCode) {
    return this.request('/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email_id: email,
        otp_code: otpCode,
      }),
      skipAuth: true,
    });
  }

  async resendOTP(email) {
    return this.request('/resend-otp', {
      method: 'POST',
      body: JSON.stringify({
        email_id: email,
      }),
      skipAuth: true,
    });
  }

  async forgotPassword(email) {
    return this.request('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email_id: email,
      }),
      skipAuth: true,
    });
  }

  async resetPassword(email, resetToken, newPassword) {
    return this.request('/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email_id: email,
        reset_token: resetToken,
        new_password: newPassword,
      }),
      skipAuth: true,
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  async logout() {
    try {
      await this.request('/logout', {
        method: 'POST',
      });
    } finally {
      this.removeToken();
    }
  }

  async getCurrentUser() {
    return this.request('/me');
  }

  // Store user data in localStorage
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  removeUser() {
    localStorage.removeItem('user');
  }

  // Clear all auth data
  clearAuth() {
    this.removeToken();
    this.removeUser();
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  // OHLCV Data endpoints
  async getOHLCVData(symbol, timeframe, options = {}) {
    const params = new URLSearchParams({
      symbol,
      timeframe,
      limit: options.limit || 100,
      offset: options.offset || 0,
      sort: options.sort || 'desc',
    });

    if (options.startDate) {
      params.append('start_date', options.startDate);
    }
    if (options.endDate) {
      params.append('end_date', options.endDate);
    }

    return this.request(`/ohlcv?${params.toString()}`, {
      method: 'GET',
      skipAuth: true,
    });
  }

  async getAvailableSymbols(timeframe = null) {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request(`/ohlcv/symbols${params}`, {
      method: 'GET',
      skipAuth: true,
    });
  }

  // MT5 Account endpoints
  async getMT5Accounts() {
    return this.request('/mt5-accounts', {
      method: 'GET',
    });
  }

  async getMT5Account(accountId) {
    return this.request(`/mt5-accounts/${accountId}`, {
      method: 'GET',
    });
  }

  async connectMT5Account(accountData) {
    return this.request('/mt5-accounts/connect', {
      method: 'POST',
      body: JSON.stringify({
        account: accountData.account,
        password: accountData.password,
        server: accountData.server,
        account_name: accountData.accountName || null,
      }),
    });
  }

  async refreshMT5Account(accountId) {
    return this.request(`/mt5-accounts/${accountId}/refresh`, {
      method: 'POST',
    });
  }

  // Symbol/Market Watch endpoints
  async getSymbols() {
    return this.request('/symbols', {
      method: 'GET',
    });
  }

  async getSymbolInfo(symbolName) {
    return this.request(`/symbols/${symbolName}`, {
      method: 'GET',
    });
  }

  async getSymbolTick(symbolName) {
    return this.request(`/symbols/${symbolName}/tick`, {
      method: 'GET',
    });
  }

  async getMultipleSymbolTicks(symbols) {
    // Fetch ticks for multiple symbols in parallel
    const promises = symbols.map(symbol => this.getSymbolTick(symbol));
    const results = await Promise.allSettled(promises);

    return results.map((result, index) => ({
      symbol: symbols[index],
      success: result.status === 'fulfilled' && result.value?.success,
      tick: result.status === 'fulfilled' ? result.value?.tick : null,
      error: result.status === 'rejected' ? result.reason?.message : null,
    }));
  }
}

export const api = new ApiService();
export default api;
