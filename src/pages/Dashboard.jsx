import { useState, useEffect, useRef, useCallback } from 'react';
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
  TrendingUp,
  WifiOff,
  Activity,
  FileSpreadsheet,
  GitMerge,
  FlaskConical,
  SlidersHorizontal,
  Bell,
  Zap,
  TestTube2,
  BookOpen,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import api from '../services/api';
import MarketWatch from '../components/MarketWatch';
import TicksModal from '../components/TicksModal';
import CalculatedValuesTable from '../components/CalculatedValuesTable';
import TradingPlan from '../components/TradingPlan';
import MergeHistory from '../components/MergeHistory';
import MergeTesting from '../components/MergeTesting';
import MergeRules from '../components/MergeRules';
import Backtest from '../components/Backtest';
import Execute from '../components/Execute';
import TradeJournal from '../components/TradeJournal';

/* ─────────────────────────────────────────────────────────
   P&L Chart Data
───────────────────────────────────────────────────────── */
const PNL_DATA = {
  '1W': [
    { period: 'Mon', pnl: 45.2 },
    { period: 'Tue', pnl: -12.8 },
    { period: 'Wed', pnl: 78.5 },
    { period: 'Thu', pnl: 23.1 },
    { period: 'Fri', pnl: -5.4 },
    { period: 'Sat', pnl: 91.3 },
    { period: 'Sun', pnl: 18.7 },
  ],
  '1M': [
    { period: 'W1', pnl: 124.5 },
    { period: 'W2', pnl: -43.2 },
    { period: 'W3', pnl: 201.8 },
    { period: 'W4', pnl: 88.4 },
  ],
  '1Y': [
    { period: 'Jan', pnl: 420 },
    { period: 'Feb', pnl: -180 },
    { period: 'Mar', pnl: 650 },
    { period: 'Apr', pnl: 310 },
    { period: 'May', pnl: -90 },
    { period: 'Jun', pnl: 780 },
    { period: 'Jul', pnl: 540 },
    { period: 'Aug', pnl: -220 },
    { period: 'Sep', pnl: 890 },
    { period: 'Oct', pnl: 430 },
    { period: 'Nov', pnl: -110 },
    { period: 'Dec', pnl: 990 },
  ],
};

const DUMMY_ALERTS = [
  { id: 1, message: 'EURUSD BUY order filled at 1.0842',  time: '2m ago',  positive: true  },
  { id: 2, message: 'Margin level dropped below 200%',     time: '15m ago', positive: false },
  { id: 3, message: 'XAUUSD SELL closed +$42.80',          time: '1h ago',  positive: true  },
  { id: 4, message: 'MT5 connection re-established',        time: '2h ago',  positive: true  },
  { id: 5, message: 'GBPUSD approaching stop loss level',   time: '3h ago',  positive: false },
  { id: 6, message: 'USDJPY SELL order placed 0.15 lot',   time: '5h ago',  positive: true  },
];

/* ─────────────────────────────────────────────────────────
   Top Bar
───────────────────────────────────────────────────────── */
const TAB_SUBTITLES = {
  dashboard:       'Your MT5 account at a glance',
  'market-watch':  'Live market prices and ticks',
  'trading-plan':  'Daily analysis and Fibonacci levels',
  historical:      'OHLCV data with calculated values',
  'merge-history': 'Merged trade history records',
  'merge-rules':   'Configure merge rule logic',
  'merge-testing': 'Test merge rule configurations',
  wallet:          'Manage your digital assets',
  transactions:    'View your transaction history',
  analytics:       'Track your portfolio performance',
  settings:        'Customize your preferences',
  backtest:        'Test trading strategies with historical market data',
  execute:         'Run live strategies on your MT5 account',
  journal:         'Complete trade history and performance analytics',
};

const TopBar = ({ activeTab, tabs }) => {
  const currentTab = tabs.find(t => t.id === activeTab);
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between px-6 lg:px-8 py-4 border-b border-white/[0.08] bg-navy-900/80 backdrop-blur-sm">
      <div>
        <h1 className="text-lg font-semibold text-text-base">{currentTab?.label || 'Dashboard'}</h1>
        <p className="text-xs text-text-muted mt-0.5">{TAB_SUBTITLES[activeTab] || ''}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/[0.08] bg-white/[0.04] text-text-muted hover:text-text-base hover:border-accent/30 transition-all duration-200">
          <Bell size={16} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-semibold text-sm select-none">
          U
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   P&L Chart
───────────────────────────────────────────────────────── */
const PnLChart = () => {
  const [period, setPeriod] = useState('1M');
  const data = PNL_DATA[period];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card-dark p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-text-base font-semibold text-sm">P&amp;L Performance</h2>
          <p className="text-text-muted text-xs mt-0.5">Profit &amp; Loss over time</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.05] border border-white/[0.08]">
          {['1W', '1M', '1Y'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                period === p
                  ? 'bg-accent text-navy-900 shadow-accent-sm'
                  : 'text-text-muted hover:text-text-base'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[220px]">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                background: '#0d1421',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                color: '#f9fafb',
                fontSize: '12px',
              }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              formatter={(value) => [`$${value.toFixed(2)}`, 'P&L']}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                  style={{
                    filter: entry.pnl >= 0
                      ? 'drop-shadow(0 0 6px rgba(16,185,129,0.4))'
                      : 'drop-shadow(0 0 6px rgba(239,68,68,0.3))',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────
   Alerts Stream
───────────────────────────────────────────────────────── */
const AlertsStream = () => (
  <div className="card-dark p-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-text-base font-semibold text-sm">Alerts &amp; Activity</h3>
      <span className="flex items-center gap-1.5 text-xs text-accent">
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        Live
      </span>
    </div>
    <div className="space-y-2.5">
      {DUMMY_ALERTS.map((alert) => (
        <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
            alert.positive ? 'bg-accent' : 'bg-negative'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-text-base text-xs leading-snug">{alert.message}</p>
            <p className="text-text-muted text-xs mt-1">{alert.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────
   Upgrade Panel Card (right panel)
───────────────────────────────────────────────────────── */
const UpgradePanelCard = () => (
  <div
    className="card-dark p-5 text-center"
    style={{ background: 'linear-gradient(160deg, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.02) 100%)' }}
  >
    <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center mx-auto mb-4">
      <Zap size={20} className="text-accent" />
    </div>
    <h3 className="text-text-base font-semibold mb-2 text-sm">Upgrade to Pro</h3>
    <p className="text-text-muted text-xs mb-4 leading-relaxed">
      Get unlimited data access, advanced analytics, and priority support.
    </p>
    <ul className="space-y-2 mb-5 text-left">
      {['Unlimited historical data', 'Real-time alerts', 'Advanced P&L reports', 'API access'].map((feature) => (
        <li key={feature} className="flex items-center gap-2 text-xs text-text-muted">
          <span className="text-accent font-bold">✓</span>
          {feature}
        </li>
      ))}
    </ul>
    <button className="btn-accent w-full">Get Started</button>
  </div>
);

/* ─────────────────────────────────────────────────────────
   Root Dashboard Component
───────────────────────────────────────────────────────── */
const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mt5Status, setMt5Status] = useState({ connected: false, checking: true });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    // mounted flag prevents setState after the 401 interceptor unmounts this component
    let mounted = true;

    const checkMT5Status = async () => {
      try {
        const response = await api.getMT5Accounts();
        if (!mounted) return;

        if (!response.success || !response.accounts?.length) {
          setMt5Status({ connected: false, checking: false });
          return;
        }

        const hasConnected = response.accounts.some(acc => acc.is_connected);

        if (hasConnected) {
          setMt5Status({ connected: true, checking: false });
          return;
        }

        // None are connected — try refreshing each account to force a reconnect
        setMt5Status({ connected: false, checking: true });
        const refreshResults = await Promise.allSettled(
          response.accounts.map(acc => api.refreshMT5Account(acc.id))
        );
        if (!mounted) return;
        const anyReconnected = refreshResults.some(
          r => r.status === 'fulfilled' && r.value?.account?.is_connected
        );
        setMt5Status({ connected: anyReconnected, checking: false });
      } catch (err) {
        if (!mounted) return;
        setMt5Status({ connected: false, checking: false });
      }
    };

    checkMT5Status();
    const interval = setInterval(checkMT5Status, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const tabs = [
    { id: 'dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
    { id: 'market-watch',  label: 'Market Watch', icon: TrendingUp },
    { id: 'trading-plan',  label: 'Trading Plan', icon: FileSpreadsheet },
    { id: 'historical',    label: 'Data',          icon: History },
    { id: 'merge-history', label: 'Merge History',icon: GitMerge },
    { id: 'merge-rules',   label: 'Merge Rules',  icon: SlidersHorizontal },
    { id: 'merge-testing', label: 'Merge Testing',icon: FlaskConical },
    { id: 'backtest',      label: 'Backtest',      icon: TestTube2 },
    { id: 'execute',       label: 'Execute',       icon: Zap },
    { id: 'journal',       label: 'Trade Journal', icon: BookOpen },
    { id: 'wallet',        label: 'Wallet',        icon: Wallet },
    { id: 'transactions',  label: 'Transactions', icon: ArrowLeftRight },
    { id: 'analytics',     label: 'Analytics',    icon: PieChart },
    { id: 'settings',      label: 'Settings',     icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':     return <DashboardContent />;
      case 'market-watch':  return <MarketWatch />;
      case 'trading-plan':  return <TradingPlan />;
      case 'historical':    return <HistoricalDataContent />;
      case 'merge-history': return <MergeHistory />;
      case 'merge-rules':   return <MergeRules />;
      case 'merge-testing': return <MergeTesting />;
      case 'backtest':      return <Backtest />;
      case 'execute':       return <Execute />;
      case 'journal':       return <TradeJournal />;
      case 'wallet':        return <PlaceholderContent title="Wallet" description="Manage your digital assets" />;
      case 'transactions':  return <PlaceholderContent title="Transactions" description="View your transaction history" />;
      case 'analytics':     return <PlaceholderContent title="Analytics" description="Track your portfolio performance" />;
      case 'settings':      return <PlaceholderContent title="Settings" description="Customize your preferences" />;
      default:              return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-navy-900">
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-navy-800 border border-white/[0.08] text-text-muted shadow-card"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-40 w-[260px]
          bg-navy-800 border-r border-white/[0.08]
          flex flex-col py-8 px-5
          transition-transform duration-300 lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="mb-8 px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-navy-900 font-bold text-sm shadow-accent-sm">
              F
            </div>
            <span className="text-text-base font-bold text-lg tracking-tight">FinFlow</span>
          </div>
        </div>

        {/* MT5 Connection Status */}
        <div className="mb-6 px-1">
          {mt5Status.checking ? (
            <div className="badge-checking">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Checking MT5...</span>
            </div>
          ) : mt5Status.connected ? (
            <div className="badge-connected">
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
              <span className="font-medium">MT5 Connected</span>
            </div>
          ) : (
            <div className="badge-disconnected">
              <WifiOff className="w-3 h-3" />
              <span className="font-medium">MT5 Disconnected</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
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
                  w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                  text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'text-accent border border-accent/20 shadow-accent-sm'
                    : 'text-text-muted hover:text-text-base hover:bg-white/[0.05]'
                  }
                `}
                style={isActive ? {
                  background: 'rgba(16,185,129,0.10)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                } : {}}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Icon size={17} className={isActive ? 'text-accent' : ''} />
                {tab.label}
              </motion.button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="pt-4 mt-4 border-t border-white/[0.08]">
          <motion.button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-negative hover:bg-negative/10 transition-all duration-200"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <LogOut size={17} />
            Logout
          </motion.button>
        </div>
      </motion.aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <TopBar activeTab={activeTab} tabs={tabs} />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
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
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   Dashboard Content
───────────────────────────────────────────────────────── */
const DashboardContent = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dummyTrades = [
    { ticket: 12345678, symbol: 'EURUSD', type: 0, volume: 0.10, time_setup: Date.now() / 1000 - 86400,  profit: 15.50  },
    { ticket: 12345679, symbol: 'GBPUSD', type: 1, volume: 0.05, time_setup: Date.now() / 1000 - 172800, profit: -8.25  },
    { ticket: 12345680, symbol: 'XAUUSD', type: 0, volume: 0.02, time_setup: Date.now() / 1000 - 259200, profit: 42.80  },
    { ticket: 12345681, symbol: 'USDJPY', type: 1, volume: 0.15, time_setup: Date.now() / 1000 - 345600, profit: 12.30  },
    { ticket: 12345682, symbol: 'AUDUSD', type: 0, volume: 0.08, time_setup: Date.now() / 1000 - 432000, profit: -5.60  },
    { ticket: 12345683, symbol: 'EURJPY', type: 1, volume: 0.12, time_setup: Date.now() / 1000 - 518400, profit: 22.15  },
  ];

  useEffect(() => {
    // mounted flag prevents setState after the global 401 interceptor
    // unmounts this component and navigates to login.
    let mounted = true;

    const fetchDashboardData = async () => {
      try {
        const data = await api.getDashboard();
        if (!mounted) return;
        setDashboardData(data);
        setError('');
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchTrades = async () => {
      try {
        const response = await api.getMT5Trades();
        if (!mounted) return;
        if (response.success && response.trades && response.trades.length > 0) {
          setTrades(response.trades.slice(0, 6));
        } else {
          setTrades(dummyTrades);
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load trades:', err);
        setTrades(dummyTrades);
      }
    };

    fetchDashboardData();
    fetchTrades();
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchTrades();
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-negative/10 border border-negative/20 text-negative px-6 py-4 rounded-xl text-sm">
        {error}
      </div>
    );
  }

  if (!dashboardData) return null;

  const { account_info, dashboard_metrics } = dashboardData;
  const profitPositive = typeof dashboard_metrics.profit.value === 'number' && dashboard_metrics.profit.value >= 0;
  const profitPct = dashboard_metrics.profit.percentage
    ? `${dashboard_metrics.profit.percentage > 0 ? '+' : ''}${dashboard_metrics.profit.percentage.toFixed(2)}%`
    : '0%';

  const featuredStats = [
    {
      label: dashboard_metrics.balance.label,
      value: dashboard_metrics.balance.formatted,
      sub: account_info.is_connected ? 'Connected' : 'Disconnected',
      positive: account_info.is_connected,
      icon: Wallet,
    },
    {
      label: dashboard_metrics.profit.label,
      value: dashboard_metrics.profit.formatted,
      sub: profitPct,
      positive: profitPositive,
      icon: TrendingUp,
    },
    {
      label: 'Active Trades',
      value: String(trades.length),
      sub: 'Live positions',
      positive: true,
      icon: Activity,
    },
  ];

  const secondaryStats = [
    { label: dashboard_metrics.equity.label,       value: dashboard_metrics.equity.formatted,       sub: profitPct,                           positive: profitPositive },
    { label: dashboard_metrics.margin.label,        value: dashboard_metrics.margin.formatted,        sub: dashboard_metrics.margin_level.formatted, positive: true },
    { label: dashboard_metrics.free_margin.label,   value: dashboard_metrics.free_margin.formatted,   sub: account_info.broker_server,             positive: true },
    { label: dashboard_metrics.leverage.label,      value: dashboard_metrics.leverage.formatted,      sub: `Account: ${account_info.account_number}`, positive: true },
    { label: dashboard_metrics.currency.label,      value: dashboard_metrics.currency.formatted,      sub: account_info.account_name,              positive: true },
    { label: dashboard_metrics.margin_level.label,  value: dashboard_metrics.margin_level.formatted,  sub: new Date(account_info.last_connected_at).toLocaleTimeString(), positive: true },
  ];

  return (
    <div className="space-y-5">
      {/* Row 1: Featured KPIs + Upgrade CTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {featuredStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-dark p-5 hover:border-accent/20 transition-all duration-300 group cursor-default"
            >
              <div className="flex items-start justify-between mb-4">
                <p className="text-text-muted text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:shadow-accent-sm transition-all">
                  <Icon size={15} className="text-accent" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-base mb-1">{stat.value}</p>
              <span className={`text-xs font-medium ${stat.positive ? 'text-accent' : 'text-negative'}`}>
                {stat.sub}
              </span>
            </motion.div>
          );
        })}

        {/* Inline Upgrade CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-dark p-5 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.03) 100%)' }}
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center mb-3">
              <Zap size={15} className="text-accent" />
            </div>
            <p className="text-text-base font-semibold text-sm mb-1">Upgrade to Pro</p>
            <p className="text-text-muted text-xs leading-relaxed">Unlock advanced algorithms and real-time insights.</p>
          </div>
          <button className="btn-accent w-full mt-4">Get Started</button>
        </motion.div>
      </div>

      {/* Row 2: two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Left: secondary KPIs + chart + trade logs */}
        <div className="space-y-5">
          {/* Secondary KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {secondaryStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.04 }}
                className="card-dark p-4 cursor-default"
              >
                <p className="text-text-muted text-xs mb-2 uppercase tracking-wider">{stat.label}</p>
                <p className={`font-bold text-base ${stat.positive !== undefined ? (stat.positive ? 'text-text-base' : 'text-negative') : 'text-text-base'}`}>
                  {stat.value}
                </p>
                {stat.sub && (
                  <p className="text-text-muted text-xs mt-1 truncate">{stat.sub}</p>
                )}
              </motion.div>
            ))}
          </div>

          {/* P&L Chart */}
          <PnLChart />

          {/* Trade Logs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-dark overflow-hidden"
          >
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-base">Trade Logs</h2>
              <span className="text-xs text-text-muted">Last {trades.length} trades</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Ticket</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Asset</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Volume</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length > 0 ? (
                    trades.map((trade, index) => {
                      const isBuy = trade.type === 'BUY' || trade.type === 0;
                      return (
                        <tr
                          key={trade.ticket || index}
                          className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-text-muted font-mono">#{trade.ticket}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                isBuy ? 'bg-accent/10 text-accent' : 'bg-negative/10 text-negative'
                              }`}>
                                <ArrowLeftRight size={12} />
                              </div>
                              <span className="text-sm font-medium text-text-base">{trade.symbol}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
                              isBuy
                                ? 'text-accent bg-accent/10 border-accent/20'
                                : 'text-negative bg-negative/10 border-negative/20'
                            }`}>
                              {isBuy ? 'BUY' : 'SELL'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-text-muted">{trade.volume}</td>
                          <td className="py-3 px-4 text-sm text-text-muted">
                            {new Date(trade.time_setup * 1000 || trade.time_setup).toLocaleDateString()}
                          </td>
                          <td className={`py-3 px-4 text-sm font-semibold text-right ${
                            trade.profit >= 0 ? 'text-accent' : 'text-negative'
                          }`}>
                            {trade.profit >= 0 ? '+' : ''}{trade.profit?.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-text-muted text-sm">No trades available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <UpgradePanelCard />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <AlertsStream />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   Historical Data Content
───────────────────────────────────────────────────────── */
const HistoricalDataContent = () => {
  const [activeTimeframe, setActiveTimeframe] = useState('D1');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [symbols, setSymbols] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTicksModal, setShowTicksModal] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dataCache, setDataCache] = useState({});

  const [wsConnected, setWsConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'H5', 'D1', 'W1', 'MN1'];

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

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

  const normalizeTimestamp = (ts) => {
    if (!ts) return '';
    return ts.replace('T', ' ').substring(0, 19);
  };

  const mergeData = (ohlcvData, valuesData) => {
    if (!valuesData || valuesData.length === 0) return ohlcvData;
    const valuesMap = {};
    valuesData.forEach(v => {
      const key = v.timestamp_formatted || v.timestamp_broker_formatted || normalizeTimestamp(v.timestamp_broker);
      valuesMap[key] = v;
    });
    return ohlcvData.map(row => {
      const tsUk = row.timestamp_broker_formatted || normalizeTimestamp(row.timestamp_broker);
      const tsBroker = row.timestamp_formatted || normalizeTimestamp(row.timestamp);
      const calcValues = valuesMap[tsUk] || valuesMap[tsBroker];
      if (calcValues) return { ...row, ...calcValues };
      return row;
    });
  };

  const handleSearch = async () => {
    if (!selectedSymbol) { setError('Please select a symbol'); return; }
    if (!startDate || !endDate) { setError('Please enter both start and end dates'); return; }
    setIsLoading(true);
    setError('');
    try {
      const formatDateParam = (dt) => dt.replace('T', ' ') + ':00';
      const [ohlcvResponse, valuesResponse] = await Promise.all([
        api.getOHLCVData(selectedSymbol, activeTimeframe, {
          startDate: formatDateParam(startDate),
          endDate: formatDateParam(endDate),
          limit: 10000,
          offset: 0,
          sort: 'desc',
        }),
        api.getCalculatedValues(selectedSymbol, activeTimeframe, {
          startDate: formatDateParam(startDate),
          endDate: formatDateParam(endDate),
          limit: 10000,
        }).catch(() => ({ success: false, data: [] })),
      ]);
      if (ohlcvResponse.success) {
        const processedOhlcv = processOHLCVData(ohlcvResponse.data);
        const valuesData = valuesResponse.success ? valuesResponse.data || [] : [];
        const merged = mergeData(processedOhlcv, valuesData);
        const cacheKey = `${selectedSymbol}_${activeTimeframe}`;
        setDataCache(prev => ({ ...prev, [cacheKey]: { data: merged, total: ohlcvResponse.total } }));
      } else {
        setError('Failed to fetch data');
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const symbolsResponse = await api.getAvailableSymbols();
        if (symbolsResponse.success && symbolsResponse.symbols && symbolsResponse.symbols.length > 0) {
          setSymbols(symbolsResponse.symbols);
          setSelectedSymbol(symbolsResponse.symbols[0].symbol);
        }
      } catch (err) {
        console.error('Failed to fetch symbols:', err);
        setError('Failed to load symbols');
      }
    };
    fetchSymbols();
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus('connecting');
    try {
      const wsToken = api.getToken();
      const ws = new WebSocket(`${WS_BASE_URL}/calculated-values/ws${wsToken ? `?token=${wsToken}` : ''}`);
      ws.onopen = () => {
        setWsConnected(true);
        setWsStatus('connected');
        ws.send(JSON.stringify({ action: 'subscribe', symbol: selectedSymbol, timeframe: activeTimeframe }));
      };
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'calculated_values') {
            const newCalcData = message.data;
            setDataCache(prev => {
              const key = `${selectedSymbol}_${activeTimeframe}`;
              const existing = prev[key];
              if (!existing) return prev;
              const exists = existing.data.some(d =>
                (d.timestamp_broker || d.timestamp_formatted) === (newCalcData.timestamp_broker_formatted || newCalcData.timestamp_broker)
              );
              if (exists) return prev;
              const newRow = { ...newCalcData, _isNew: true };
              const updatedData = [newRow, ...existing.data.map(r => ({ ...r, _isNew: false }))];
              return { ...prev, [key]: { ...existing, data: updatedData, total: existing.total + 1 } };
            });
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      ws.onclose = () => {
        setWsConnected(false);
        setWsStatus('disconnected');
        wsRef.current = null;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => connectWebSocket(), 3000);
      };
      ws.onerror = () => setWsStatus('error');
      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setWsStatus('error');
    }
  }, [selectedSymbol, activeTimeframe]);

  useEffect(() => {
    connectWebSocket();
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);
    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe', symbol: selectedSymbol, timeframe: activeTimeframe }));
    }
  }, [selectedSymbol, activeTimeframe]);

  const handleSymbolChange = (symbol) => {
    setSelectedSymbol(symbol);
    setIsSymbolDropdownOpen(false);
  };

  const cacheKey = `${selectedSymbol}_${activeTimeframe}`;
  const currentData = dataCache[cacheKey] || { data: [], total: 0 };
  const ohlcvData = currentData.data;

  const activeButtonStyle = {
    background: 'rgba(16,185,129,0.10)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };

  const formatTimestamp = (row) => {
    if (row.timestamp_formatted) return row.timestamp_formatted;
    if (row.timestamp_broker_formatted) return row.timestamp_broker_formatted;
    const ts = row.timestamp || row.timestamp_broker;
    if (!ts) return '-';
    return new Date(ts).toLocaleString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  };

  const formatPrice = (price) => {
    if (price >= 100) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(5);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-text-muted text-sm">
          OHLCV data with calculated values across different timeframes.
          <span className="ml-2 text-xs text-text-dim">All times in broker time (EET/UTC+2)</span>
        </p>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowTicksModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/15 transition-colors text-sm font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Activity size={16} />
            Ticks
          </motion.button>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
            wsConnected ? 'badge-connected' : wsStatus === 'connecting' ? 'badge-checking' : 'badge-disconnected'
          }`}>
            {wsConnected ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-accent" /><span className="font-medium">Live</span></>
            ) : wsStatus === 'connecting' ? (
              <><Loader2 size={12} className="animate-spin" /><span className="font-medium">Connecting...</span></>
            ) : (
              <><WifiOff size={12} /><span className="font-medium">Offline</span></>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-dark p-4 flex flex-col gap-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* Symbol */}
          <div className="relative">
            <label className="block text-xs font-medium text-text-muted mb-1">Symbol</label>
            <button
              onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-text-base text-sm font-medium min-w-[180px] hover:border-accent/30 transition-colors"
            >
              <span>{selectedSymbol || 'Select Symbol'}</span>
              <ChevronDown size={16} className={`transition-transform text-text-muted ${isSymbolDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSymbolDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-full bg-navy-800 rounded-xl border border-white/[0.08] shadow-card z-50 max-h-60 overflow-y-auto">
                {symbols.map((sym) => (
                  <button
                    key={sym.symbol}
                    onClick={() => handleSymbolChange(sym.symbol)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.05] transition-colors ${
                      selectedSymbol === sym.symbol ? 'bg-accent/10 text-accent' : 'text-text-muted'
                    }`}
                  >
                    {sym.symbol}
                  </button>
                ))}
                {symbols.length === 0 && (
                  <div className="px-4 py-3 text-sm text-text-muted">No symbols available</div>
                )}
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Start Date</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-dark"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">End Date</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-dark"
            />
          </div>

          <motion.button
            onClick={handleSearch}
            disabled={isLoading}
            className="btn-accent flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </motion.button>

          <div className="text-sm text-text-muted lg:ml-auto">
            {currentData.total > 0 && (
              <span>{ohlcvData.length} of {currentData.total} records</span>
            )}
          </div>
        </div>

        {/* Timeframes */}
        <div className="flex flex-wrap gap-2">
          {timeframes.map((tf) => (
            <motion.button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTimeframe === tf
                  ? 'text-accent border border-accent/30'
                  : 'text-text-muted hover:text-text-base hover:bg-white/[0.05] border border-transparent'
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

      {error && (
        <div className="p-4 rounded-xl bg-negative/10 border border-negative/20 text-negative text-sm">
          {error}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-dark overflow-hidden"
      >
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-base">
            {selectedSymbol} — {activeTimeframe} Timeframe
          </h2>
          {ohlcvData.length > 0 && (
            <span className="text-xs text-text-muted">
              {ohlcvData.length} records {wsConnected && <span className="text-accent ml-1">• Live</span>}
            </span>
          )}
        </div>
        <CalculatedValuesTable
          data={ohlcvData}
          isLoading={isLoading}
          symbol={selectedSymbol}
          timeframe={activeTimeframe}
          formatTimestamp={formatTimestamp}
          formatPrice={formatPrice}
        />
      </motion.div>

      <TicksModal
        isOpen={showTicksModal}
        onClose={() => setShowTicksModal(false)}
        initialSymbol={selectedSymbol}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   Placeholder Content
───────────────────────────────────────────────────────── */
const PlaceholderContent = ({ title, description }) => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-text-muted text-sm">{description}</p>
      </div>
      <div className="card-dark p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-16 h-16 bg-white/[0.05] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">🚧</span>
        </div>
        <p className="text-text-muted text-sm text-center">This section is under development.</p>
      </div>
    </div>
  );
};

export default Dashboard;
