import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  History,
  Wallet,
  ArrowLeftRight,
  PieChart,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  Loader2,
  RefreshCw,
  TrendingUp,
  Wifi,
  WifiOff,
  Activity,
  Calculator,
} from 'lucide-react';
import api from '../services/api';
import MarketWatch from '../components/MarketWatch';
import TicksModal from '../components/TicksModal';
import ValuesPage from '../components/ValuesPage';

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mt5Status, setMt5Status] = useState({ connected: false, checking: true });

  // Check MT5 connection status on mount
  useEffect(() => {
    const checkMT5Status = async () => {
      try {
        const response = await api.getMT5Accounts();
        if (response.success && response.accounts && response.accounts.length > 0) {
          const hasConnected = response.accounts.some(acc => acc.is_connected);
          setMt5Status({ connected: hasConnected, checking: false });
        } else {
          setMt5Status({ connected: false, checking: false });
        }
      } catch (err) {
        console.error('Failed to check MT5 status:', err);
        setMt5Status({ connected: false, checking: false });
      }
    };

    checkMT5Status();

    // Check every 30 seconds
    const interval = setInterval(checkMT5Status, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'market-watch', label: 'Market Watch', icon: TrendingUp },
    { id: 'historical', label: 'Data', icon: History },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent />;
      case 'market-watch':
        return <MarketWatch />;
      case 'historical':
        return <HistoricalDataContent />;
      case 'wallet':
        return <PlaceholderContent title="Wallet" description="Manage your digital assets" />;
      case 'transactions':
        return <PlaceholderContent title="Transactions" description="View your transaction history" />;
      case 'analytics':
        return <PlaceholderContent title="Analytics" description="Track your portfolio performance" />;
      case 'settings':
        return <PlaceholderContent title="Settings" description="Customize your preferences" />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-md"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/20 z-30"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-40
          flex items-center p-4 lg:p-6
          transition-transform duration-300 lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-[calc(100vh-32px)] lg:h-[calc(100vh-48px)] w-[260px] flex flex-col py-8 px-5 bg-white rounded-2xl border border-gray-200 shadow-lg">
          <div className="mb-6 px-2">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-white"
                style={{ backgroundColor: '#2563eb' }}
              >
                F
              </span>
              FinFlow
            </h1>
          </div>

          {/* MT5 Connection Status */}
          <div className="mb-4 px-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              mt5Status.checking
                ? 'bg-gray-50 text-gray-600'
                : mt5Status.connected
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
            }`}>
              {mt5Status.checking ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Checking MT5...</span>
                </>
              ) : mt5Status.connected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span className="font-medium">MT5 Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span className="font-medium">MT5 Disconnected</span>
                </>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-2xl
                    text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                  style={isActive ? {
                    background: 'rgba(59, 130, 246, 0.15)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.1)',
                  } : {}}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Icon size={20} />
                  {tab.label}
                </motion.button>
              );
            })}
          </nav>

          <motion.button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <LogOut size={20} />
            Logout
          </motion.button>
        </div>
      </motion.aside>

      <main className="flex-1 p-4 lg:p-8 lg:pl-4 overflow-auto">
        <div className="max-w-7xl mx-auto pt-12 lg:pt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const DashboardContent = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      const data = await api.getDashboard();
      setDashboardData(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      const response = await api.getMT5Trades();
      if (response.success && response.trades && response.trades.length > 0) {
        setTrades(response.trades.slice(0, 6)); // Show only last 6 trades
      } else {
        // Show dummy trades if no real trades available
        setTrades(dummyTrades);
      }
    } catch (err) {
      console.error('Failed to load trades:', err);
      // Show dummy trades on error
      setTrades(dummyTrades);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchTrades();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchTrades();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  };

  const dummyTrades = [
    { ticket: 12345678, symbol: 'EURUSD', type: 0, volume: 0.10, time_setup: Date.now() / 1000 - 86400, profit: 15.50 },
    { ticket: 12345679, symbol: 'GBPUSD', type: 1, volume: 0.05, time_setup: Date.now() / 1000 - 172800, profit: -8.25 },
    { ticket: 12345680, symbol: 'XAUUSD', type: 0, volume: 0.02, time_setup: Date.now() / 1000 - 259200, profit: 42.80 },
    { ticket: 12345681, symbol: 'USDJPY', type: 1, volume: 0.15, time_setup: Date.now() / 1000 - 345600, profit: 12.30 },
    { ticket: 12345682, symbol: 'AUDUSD', type: 0, volume: 0.08, time_setup: Date.now() / 1000 - 432000, profit: -5.60 },
    { ticket: 12345683, symbol: 'EURJPY', type: 1, volume: 0.12, time_setup: Date.now() / 1000 - 518400, profit: 22.15 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
        {error}
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { account_info, dashboard_metrics } = dashboardData;

  // Prepare stats for glassmorphic boxes
  const statsRow1 = [
    {
      label: dashboard_metrics.balance.label,
      value: dashboard_metrics.balance.formatted,
      change: account_info.is_connected ? 'Connected' : 'Disconnected',
      positive: account_info.is_connected
    },
    {
      label: dashboard_metrics.equity.label,
      value: dashboard_metrics.equity.formatted,
      change: dashboard_metrics.profit.percentage
        ? `${dashboard_metrics.profit.percentage > 0 ? '+' : ''}${dashboard_metrics.profit.percentage.toFixed(2)}%`
        : '+0%',
      positive: typeof dashboard_metrics.profit.value === 'number' && dashboard_metrics.profit.value >= 0
    },
    {
      label: dashboard_metrics.margin.label,
      value: dashboard_metrics.margin.formatted,
      change: dashboard_metrics.margin_level.formatted,
      positive: true
    },
    {
      label: dashboard_metrics.free_margin.label,
      value: dashboard_metrics.free_margin.formatted,
      change: account_info.broker_server,
      positive: true
    },
  ];

  const statsRow2 = [
    {
      label: dashboard_metrics.profit.label,
      value: dashboard_metrics.profit.formatted,
      change: dashboard_metrics.profit.percentage
        ? `${dashboard_metrics.profit.percentage > 0 ? '+' : ''}${dashboard_metrics.profit.percentage.toFixed(2)}%`
        : '0%',
      positive: typeof dashboard_metrics.profit.value === 'number' && dashboard_metrics.profit.value >= 0
    },
    {
      label: dashboard_metrics.leverage.label,
      value: dashboard_metrics.leverage.formatted,
      change: `Account: ${account_info.account_number}`,
      positive: true
    },
    {
      label: dashboard_metrics.currency.label,
      value: dashboard_metrics.currency.formatted,
      change: account_info.account_name,
      positive: true
    },
    {
      label: dashboard_metrics.margin_level.label,
      value: dashboard_metrics.margin_level.formatted,
      change: new Date(account_info.last_connected_at).toLocaleTimeString(),
      positive: true
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-500">Here's your MT5 trading account overview</p>
      </div>

      {/* First Row of KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsRow1.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-2xl"
            style={glassStyle}
          >
            <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
            <p className={`text-lg font-bold mb-1 ${
              stat.positive !== undefined
                ? (stat.positive ? 'text-green-600' : 'text-red-600')
                : 'text-gray-900'
            }`}>
              {stat.value}
            </p>
            <span className={`text-xs ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
              {stat.change}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Second Row of KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsRow2.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 4) * 0.05 }}
            className="p-4 rounded-2xl"
            style={glassStyle}
          >
            <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
            <p className={`text-lg font-bold mb-1 ${
              stat.positive !== undefined
                ? (stat.positive ? 'text-green-600' : 'text-red-600')
                : 'text-gray-900'
            }`}>
              {stat.value}
            </p>
            <span className="text-xs text-gray-500">{stat.change}</span>
          </motion.div>
        ))}
      </div>

      {/* Recent Trades Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl overflow-hidden"
        style={glassStyle}
      >
        <div className="p-4 border-b border-gray-200/50">
          <h2 className="text-lg font-semibold text-gray-900">Recent MT5 Trades</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Volume</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Profit</th>
              </tr>
            </thead>
            <tbody>
              {trades.length > 0 ? (
                trades.map((trade, index) => (
                  <tr key={trade.ticket || index} className="border-b border-gray-100/50 last:border-0 hover:bg-white/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600 font-mono">#{trade.ticket}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          trade.type === 'BUY' || trade.type === 0
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          <ArrowLeftRight size={14} />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{trade.symbol}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        trade.type === 'BUY' || trade.type === 0
                          ? 'text-green-700 bg-green-100'
                          : 'text-red-700 bg-red-100'
                      }`}>
                        {trade.type === 0 || trade.type === 'BUY' ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{trade.volume}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(trade.time_setup * 1000 || trade.time_setup).toLocaleDateString()}
                    </td>
                    <td className={`py-3 px-4 text-sm font-semibold text-right ${
                      trade.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit?.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500">
                    No trades available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

const HistoricalDataContent = () => {
  const [activeTimeframe, setActiveTimeframe] = useState('M1');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [symbols, setSymbols] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTicksModal, setShowTicksModal] = useState(false);
  const [showValuesPage, setShowValuesPage] = useState(false);

  // Cache all timeframe data - key is `${symbol}_${timeframe}`
  const [dataCache, setDataCache] = useState({});
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [lastRefreshTime, setLastRefreshTime] = useState(null);

  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'H5', 'D1', 'W1', 'MN1'];

  // Helper to process OHLCV data with change calculation
  const processOHLCVData = (data) => {
    return data.map((row, index, arr) => {
      const prevClose = index < arr.length - 1 ? arr[index + 1].close : row.open;
      const change = ((row.close - prevClose) / prevClose) * 100;
      return {
        ...row,
        change: change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`,
        changePositive: change >= 0,
      };
    });
  };

  // Fetch all timeframes for a symbol in parallel
  const fetchAllTimeframesForSymbol = async (symbol) => {
    setIsLoading(true);
    setLoadingProgress({ current: 0, total: timeframes.length });
    setError('');

    try {
      // Fetch all timeframes in parallel
      const promises = timeframes.map(tf =>
        api.getOHLCVData(symbol, tf, { limit: 100, offset: 0, sort: 'desc' })
      );

      const results = await Promise.all(promises);

      // Build cache object
      const newCache = {};
      results.forEach((response, index) => {
        const tf = timeframes[index];
        const cacheKey = `${symbol}_${tf}`;
        if (response.success) {
          newCache[cacheKey] = {
            data: processOHLCVData(response.data),
            total: response.total,
            offset: response.offset,
            limit: response.limit,
          };
        }
        setLoadingProgress(prev => ({ ...prev, current: index + 1 }));
      });

      setDataCache(prev => ({ ...prev, ...newCache }));
      setLastRefreshTime(new Date());
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
      setLoadingProgress({ current: 0, total: 0 });
    }
  };

  // Fetch symbols and all data on mount
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        const symbolsResponse = await api.getAvailableSymbols();
        if (symbolsResponse.success && symbolsResponse.symbols && symbolsResponse.symbols.length > 0) {
          setSymbols(symbolsResponse.symbols);
          const firstSymbol = symbolsResponse.symbols[0].symbol;
          setSelectedSymbol(firstSymbol);

          // Fetch all timeframes for the first symbol
          await fetchAllTimeframesForSymbol(firstSymbol);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize data:', err);
        setError('Failed to load data');
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Auto-refresh data every 60 seconds (1 minute)
  useEffect(() => {
    if (!selectedSymbol) return;

    const refreshInterval = setInterval(() => {
      // Silently refresh current symbol data in background
      const keysToRemove = Object.keys(dataCache).filter(k => k.startsWith(`${selectedSymbol}_`));
      setDataCache(prev => {
        const newCache = { ...prev };
        keysToRemove.forEach(k => delete newCache[k]);
        return newCache;
      });

      // Fetch fresh data
      fetchAllTimeframesForSymbol(selectedSymbol);
    }, 60000); // 60 seconds

    return () => clearInterval(refreshInterval);
  }, [selectedSymbol, dataCache]);

  // When symbol changes, fetch all timeframes for that symbol (if not cached)
  const handleSymbolChange = async (symbol) => {
    setSelectedSymbol(symbol);
    setIsSymbolDropdownOpen(false);

    // Check if we have cached data for this symbol
    const cacheKey = `${symbol}_${activeTimeframe}`;
    if (!dataCache[cacheKey]) {
      await fetchAllTimeframesForSymbol(symbol);
    }
  };

  const handleRefresh = () => {
    if (selectedSymbol) {
      // Clear cache for current symbol and refetch
      const keysToRemove = Object.keys(dataCache).filter(k => k.startsWith(`${selectedSymbol}_`));
      setDataCache(prev => {
        const newCache = { ...prev };
        keysToRemove.forEach(k => delete newCache[k]);
        return newCache;
      });
      fetchAllTimeframesForSymbol(selectedSymbol);
    }
  };

  const handleTimeframeChange = (tf) => {
    setActiveTimeframe(tf);
  };

  // Get current data from cache
  const cacheKey = `${selectedSymbol}_${activeTimeframe}`;
  const currentData = dataCache[cacheKey] || { data: [], total: 0, offset: 0, limit: 100 };
  const ohlcvData = currentData.data;
  const pagination = { total: currentData.total, offset: currentData.offset, limit: currentData.limit };

  const formatTimestamp = (row) => {
    // Use pre-formatted timestamp from API if available (no timezone conversion)
    if (row.timestamp_formatted) {
      return row.timestamp_formatted;
    }

    // Fallback: format the timestamp as-is (broker time)
    const date = new Date(row.timestamp);
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatPrice = (price) => {
    if (price >= 100) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(5);
  };

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  };

  const activeButtonStyle = {
    background: 'rgba(59, 130, 246, 0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.1)',
  };

  const filteredData = ohlcvData.filter((row) =>
    searchQuery === '' ||
    formatTimestamp(row).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show Values Page if toggled
  if (showValuesPage) {
    return (
      <ValuesPage
        onBack={() => setShowValuesPage(false)}
        initialSymbol={selectedSymbol || 'XAUUSD'}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Data</h1>
          <p className="text-gray-500">
            View historical OHLCV data across different timeframes.
            <span className="ml-2 text-xs text-gray-400">
              All times displayed in UK timezone (GMT/BST)
            </span>
          </p>
          {lastRefreshTime && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastRefreshTime.toLocaleTimeString('en-GB', {
                timeZone: 'Europe/London',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })} • Auto-refresh: Every 60s
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowTicksModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Activity size={18} />
            Ticks
          </motion.button>
          <motion.button
            onClick={() => setShowValuesPage(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Calculator size={18} />
            Values
          </motion.button>
          <motion.button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Symbol Selector & Filters Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 p-4 rounded-2xl"
        style={glassStyle}
      >
        {/* Top Row: Symbol Dropdown & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Symbol Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-900 text-sm font-medium min-w-[180px] hover:border-blue-400 transition-colors"
            >
              <span>{selectedSymbol || 'Select Symbol'}</span>
              <ChevronDown size={18} className={`transition-transform ${isSymbolDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSymbolDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto">
                {symbols.map((sym) => (
                  <button
                    key={sym.symbol}
                    onClick={() => handleSymbolChange(sym.symbol)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                      selectedSymbol === sym.symbol ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {sym.symbol}
                  </button>
                ))}
                {symbols.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">No symbols available</div>
                )}
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by timestamp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
            />
          </div>

          {/* Data Info */}
          <div className="text-sm text-gray-500 lg:ml-auto">
            {pagination.total > 0 && (
              <span>Showing {Math.min(filteredData.length, pagination.limit)} of {pagination.total} records</span>
            )}
          </div>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex flex-wrap gap-2">
          {timeframes.map((tf) => (
            <motion.button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTimeframe === tf
                  ? 'text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
              }`}
              style={activeTimeframe === tf ? activeButtonStyle : {}}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {tf}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden"
        style={glassStyle}
      >
        <div className="p-4 border-b border-gray-200/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedSymbol} - {activeTimeframe} Timeframe
          </h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <span className="mt-3 text-gray-500">
                {loadingProgress.total > 0
                  ? `Loading timeframes... ${loadingProgress.current}/${loadingProgress.total}`
                  : 'Loading data...'}
              </span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="text-4xl mb-3">📊</span>
              <p>No data available for {selectedSymbol} - {activeTimeframe}</p>
              <p className="text-sm mt-1">Try selecting a different symbol or timeframe</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Open</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">High</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Low</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Close</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Volume</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Change %</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100/50 last:border-0 hover:bg-white/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-600 font-mono">{formatTimestamp(row)}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">{formatPrice(row.open)}</td>
                    <td className="py-3 px-4 text-sm text-green-600 text-right font-medium">{formatPrice(row.high)}</td>
                    <td className="py-3 px-4 text-sm text-red-600 text-right font-medium">{formatPrice(row.low)}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">{formatPrice(row.close)}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 text-right">{row.volume?.toLocaleString() || '-'}</td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${
                      row.changePositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {row.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      <TicksModal
        isOpen={showTicksModal}
        onClose={() => setShowTicksModal(false)}
        initialSymbol={selectedSymbol}
      />
    </div>
  );
};

const PlaceholderContent = ({ title, description }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500">{description}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">🚧</span>
        </div>
        <p className="text-gray-500 text-center">This section is under development.</p>
      </div>
    </div>
  );
};

export default Dashboard;
