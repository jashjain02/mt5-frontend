const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    // Set this from App.jsx to receive a callback when any authenticated
    // request gets a 401 (expired/revoked token). The callback should clear
    // auth state and redirect to login.
    this.onAuthFailure = null;
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

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // Response wasn't valid JSON
        throw {
          status: response.status,
          message: `Server error (${response.status}): Invalid response format`,
          data: null,
        };
      }

      // Global 401 interceptor — fires on token expiry or revocation.
      // skipAuth endpoints (login, register, otp) are excluded so they
      // can return their own auth-related error messages cleanly.
      if (response.status === 401 && !options.skipAuth) {
        if (typeof this.onAuthFailure === 'function') {
          this.onAuthFailure();
        }
        throw {
          status: 401,
          message: data.detail || 'Session expired. Please log in again.',
          data,
        };
      }

      if (!response.ok) {
        const detail = data.detail;
        const message = Array.isArray(detail)
          ? detail.map(e => e.msg || JSON.stringify(e)).join('; ')
          : (detail || 'An error occurred');
        throw { status: response.status, message, data };
      }

      return data;
    } catch (error) {
      if (error.status) {
        throw error;
      }
      // Actual network error (server unreachable, CORS, etc.)
      console.error('Fetch error:', error);
      throw {
        status: 0,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Authentication endpoints
  async register(userData) {
    const payload = {
      first_name: userData.firstName,
      last_name: userData.lastName,
      email_id: userData.email,
      password: userData.password,
      contact: userData.contact || null,
    };

    // Include MT5 credentials if provided
    if (userData.mt5AccountNumber) {
      payload.mt5_account_number = userData.mt5AccountNumber;
      payload.mt5_account_name = userData.mt5AccountName;
      payload.mt5_broker_server = userData.mt5BrokerServer;
      payload.mt5_account_password = userData.mt5AccountPassword;
    }

    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async login(email, password) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email_id: email, password: password }),
    });
  }

  async verifyOTP(email, otpCode) {
    return this.request('/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email_id: email,
        otp_code: otpCode,
      }),
    });
  }

  async resendOTP(email) {
    return this.request('/resend-otp', {
      method: 'POST',
      body: JSON.stringify({
        email_id: email,
      }),
    });
  }

  async forgotPassword(email) {
    return this.request('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email_id: email,
      }),
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

  async getCurrentUser(options = {}) {
    return this.request('/me', options);
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
    });
  }

  async getAvailableSymbols(timeframe = null) {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request(`/ohlcv/symbols${params}`, {
      method: 'GET',
    });
  }

  // Dashboard endpoints
  async getDashboard() {
    return this.request('/dashboard', {
      method: 'GET',
    });
  }

  // MT5 Account endpoints
  async getMT5Accounts() {
    return this.request('/mt5-accounts', {
      method: 'GET',
    });
  }

  async getMT5Trades() {
    return this.request('/mt5-accounts/trades', {
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

  // Calculated Values endpoints
  async getCalculatedValues(symbol, timeframe, options = {}) {
    const params = new URLSearchParams({
      symbol,
      timeframe,
      limit: options.limit || 1,
      offset: options.offset || 0,
    });

    // Add optional date filtering
    if (options.startDate) {
      params.append('start_date', options.startDate);
    }
    if (options.endDate) {
      params.append('end_date', options.endDate);
    }

    return this.request(`/calculated-values?${params.toString()}`, {
      method: 'GET',
    });
  }

  async getCalculatedValuesTimestamps(symbol, timeframe, date = null) {
    const params = new URLSearchParams({ symbol, timeframe, limit: 200 });
    if (date) params.append('date', date);
    return this.request(`/calculated-values/timestamps?${params.toString()}`, { method: 'GET' });
  }

  async getTradeLogs(symbol, timeframe, barTimestamp) {
    const params = new URLSearchParams({ symbol, timeframe, bar_timestamp: barTimestamp });
    return this.request(`/calculated-values/trade-logs?${params.toString()}`, {
      method: 'GET',
    });
  }

  async getCandleMerges(symbol, timeframe, options = {}) {
    const params = new URLSearchParams({ symbol, timeframe });
    if (options.limit !== undefined)   params.append('limit',       options.limit);
    if (options.offset !== undefined)  params.append('offset',      options.offset);
    if (options.sort)                  params.append('sort',        options.sort);
    if (options.startDate)             params.append('start_date',  options.startDate);
    if (options.endDate)               params.append('end_date',    options.endDate);
    if (options.actionOnly !== undefined && options.actionOnly !== null)
                                       params.append('action_only', options.actionOnly);
    return this.request(`/candle-merges?${params.toString()}`, {
      method: 'GET',
    });
  }

  async getMergedBars(symbol, timeframe, options = {}) {
    const params = new URLSearchParams({ symbol, timeframe, limit: options.limit || 50, offset: options.offset || 0 });
    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate)   params.append('end_date',   options.endDate);
    return this.request(`/merged-bars?${params.toString()}`, { method: 'GET' });
  }

  // ── Merge Testing endpoints ──────────────────────────────────────────────

  async runMergeAnalysis(payload) {
    return this.request('/merge-analysis/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMergeSession(sessionId) {
    return this.request(`/merge-analysis/session/${sessionId}`, {
      method: 'GET',
    });
  }

  async getMergeResults(sessionId, options = {}) {
    const params = new URLSearchParams({
      limit:    options.limit    || 100,
      after_id: options.afterId  || 0,
    });
    return this.request(`/merge-analysis/results/${sessionId}?${params.toString()}`, {
      method: 'GET',
    });
  }

  async getMergeSessions(options = {}) {
    const params = new URLSearchParams();
    if (options.symbol)    params.append('symbol',    options.symbol);
    if (options.timeframe) params.append('timeframe', options.timeframe);
    if (options.limit)     params.append('limit',     options.limit);
    return this.request(`/merge-analysis/sessions?${params.toString()}`, {
      method: 'GET',
    });
  }

  async deleteMergeSession(sessionId) {
    return this.request(`/merge-analysis/session/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getConstituentBars(symbol, timeframe, barTs) {
    const params = new URLSearchParams({ symbol, timeframe, bar_ts: barTs });
    return this.request(`/merge-analysis/constituent-bars?${params.toString()}`, { method: 'GET' });
  }

  // ── Merge Rules CRUD ──────────────────────────────────────────────────────

  async getMergeRules() {
    return this.request('/merge-rules/', { method: 'GET' });
  }

  async getMergeRule(id) {
    return this.request(`/merge-rules/${id}`, { method: 'GET' });
  }

  async createMergeRule(payload) {
    return this.request('/merge-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateMergeRule(id, payload) {
    return this.request(`/merge-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteMergeRule(id) {
    return this.request(`/merge-rules/${id}`, { method: 'DELETE' });
  }

  async toggleMergeRule(id) {
    return this.request(`/merge-rules/${id}/toggle`, { method: 'PATCH' });
  }

  async reorderMergeRules(items) {
    // items: [{id, rule_order}, ...]
    return this.request('/merge-rules/reorder', {
      method: 'POST',
      body: JSON.stringify(items),
    });
  }

  async validateMergeExpression(expression) {
    return this.request('/merge-rules/validate', {
      method: 'POST',
      body: JSON.stringify({ expression }),
    });
  }

  async getMergeRuleVariables() {
    return this.request('/merge-rules/variables', { method: 'GET' });
  }

  async runBacktest(params) {
    return this.request('/backtest/run', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async startExecutor(params) {
    return this.request('/execute/start', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async stopExecutor(executorId) {
    return this.request(`/execute/stop/${executorId}`, { method: 'POST' });
  }

  async listExecutors(limit = 50) {
    return this.request(`/execute/list?limit=${limit}`, { method: 'GET' });
  }

  async getExecutorTrades(executorId, limit = 200) {
    return this.request(`/execute/trades/${executorId}?limit=${limit}`, { method: 'GET' });
  }

  async getTradeJournal(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params.append(k, v); });
    return this.request(`/execute/journal?${params.toString()}`, { method: 'GET' });
  }

  async getMT5History(accountId, fromDate, toDate) {
    const params = new URLSearchParams({ account_id: accountId, from_date: fromDate, to_date: toDate });
    return this.request(`/execute/mt5-history?${params.toString()}`, { method: 'GET' });
  }

  async placeManualTrade(params) {
    return this.request('/execute/manual-trade', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async closeManualTrade(ticket, accountId, symbol, lotSize, direction) {
    const params = new URLSearchParams({ account_id: accountId, symbol, lot_size: lotSize, direction });
    return this.request(`/execute/manual-close/${ticket}?${params}`, { method: 'POST' });
  }

  async getOpenPositions(accountId) {
    return this.request(`/execute/positions?account_id=${accountId}`, { method: 'GET' });
  }
}

export const api = new ApiService();
export default api;
