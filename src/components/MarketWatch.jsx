import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Circle,
  WifiOff,
  BarChart3,
  Activity,
  Layers,
  Settings,
  Eye,
  EyeOff,
  Download,
  CheckSquare,
  ArrowUpDown,
  Clock,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

// Memoized table row component for performance
const MarketWatchRow = memo(({ symbol, tick, index, onRemove, calculateDailyChange, formatPrice, onContextMenu }) => {
  const dailyChange = tick ? calculateDailyChange(tick) : null;
  const isPositive = dailyChange !== null && dailyChange >= 0;
  const digits = tick?.digits || 5;

  return (
    <motion.tr
      key={symbol}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer"
      onContextMenu={(e) => onContextMenu(e, symbol)}
    >
      {/* Symbol */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {tick && dailyChange !== null ? (
            isPositive ? (
              <TrendingUp size={16} className="text-green-500" />
            ) : (
              <TrendingDown size={16} className="text-red-500" />
            )
          ) : (
            <Circle size={8} className="text-gray-400" />
          )}
          <span className="text-sm font-semibold text-gray-900">{symbol}</span>
        </div>
      </td>

      {/* Bid */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono font-medium text-blue-600">
          {tick ? formatPrice(tick.bid, digits) : '-'}
        </span>
      </td>

      {/* Ask */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono font-medium text-red-600">
          {tick ? formatPrice(tick.ask, digits) : '-'}
        </span>
      </td>

      {/* Last */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono text-gray-900">
          {tick ? formatPrice(tick.last || tick.bid, digits) : '-'}
        </span>
      </td>

      {/* High */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono text-green-600">
          {tick && tick.daily_high ? formatPrice(tick.daily_high, digits) : '-'}
        </span>
      </td>

      {/* Low */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono text-red-600">
          {tick && tick.daily_low ? formatPrice(tick.daily_low, digits) : '-'}
        </span>
      </td>

      {/* Bid High */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono text-green-600">
          {tick && tick.bid_high ? formatPrice(tick.bid_high, digits) : '-'}
        </span>
      </td>

      {/* Bid Low */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono text-red-600">
          {tick && tick.bid_low ? formatPrice(tick.bid_low, digits) : '-'}
        </span>
      </td>

      {/* Ask High */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono text-green-600">
          {tick && tick.ask_high ? formatPrice(tick.ask_high, digits) : '-'}
        </span>
      </td>

      {/* Ask Low */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono text-red-600">
          {tick && tick.ask_low ? formatPrice(tick.ask_low, digits) : '-'}
        </span>
      </td>

      {/* Open */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono text-gray-700">
          {tick && tick.daily_open ? formatPrice(tick.daily_open, digits) : '-'}
        </span>
      </td>

      {/* Close */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono text-gray-700">
          {tick && tick.daily_close ? formatPrice(tick.daily_close, digits) : '-'}
        </span>
      </td>

      {/* Spread */}
      <td className="py-3 px-4 text-center">
        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
          {tick && tick.spread !== undefined ? tick.spread : '-'}
        </span>
      </td>

      {/* Change % */}
      <td className="py-3 px-4 text-right">
        {dailyChange !== null ? (
          <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{dailyChange.toFixed(2)}%
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>

      {/* Time */}
      <td className="py-3 px-4 text-center">
        <span className="text-xs font-mono text-blue-600">
          {tick && tick.time_uk_formatted ?
            tick.time_uk_formatted.split(' ').slice(1).join(' ') :
            '-'
          }
        </span>
      </td>

      {/* Remove Button */}
      <td className="py-3 px-4 text-center">
        <button
          onClick={() => onRemove(symbol)}
          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
          title="Remove from watchlist"
        >
          <X size={16} className="text-gray-400 group-hover:text-red-600" />
        </button>
      </td>
    </motion.tr>
  );
});

MarketWatchRow.displayName = 'MarketWatchRow';

const MarketWatch = () => {
  // Default symbols to show (XAUUSD, XAGUSD, WTI Crude, EURUSD)
  const DEFAULT_SYMBOLS = ['XAUUSD', 'XAGUSD', 'USOil', 'EURUSD'];

  // State
  const [watchlist, setWatchlist] = useState(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('marketWatchSymbols');
    return saved ? JSON.parse(saved) : DEFAULT_SYMBOLS;
  });
  const [tickData, setTickData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [marketStatus, setMarketStatus] = useState('unknown'); // open, closed, unknown
  const [error, setError] = useState('');
  const [contextMenu, setContextMenu] = useState(null); // { x, y, symbol }

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const tickBufferRef = useRef({});
  const renderFrameRef = useRef(null);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('marketWatchSymbols', JSON.stringify(watchlist));
  }, [watchlist]);

  // Optimized tick data update using requestAnimationFrame for smooth rendering
  useEffect(() => {
    const updateTickData = () => {
      // Only update if we have buffered data
      if (Object.keys(tickBufferRef.current).length > 0) {
        setTickData(prevData => {
          const newData = { ...prevData };

          // Merge buffered ticks
          Object.keys(tickBufferRef.current).forEach(symbol => {
            const tick = tickBufferRef.current[symbol];
            if (!tick.error) {
              newData[symbol] = {
                ...tick,
                lastUpdate: Date.now()
              };
            }
          });

          // Clear buffer after processing
          tickBufferRef.current = {};

          return newData;
        });
      }

      // Continue animation frame loop
      renderFrameRef.current = requestAnimationFrame(updateTickData);
    };

    // Start the animation frame loop
    renderFrameRef.current = requestAnimationFrame(updateTickData);

    return () => {
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
      }
    };
  }, []);

  // WebSocket connection management
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
      }
    };
  }, []);

  // Update symbols when watchlist changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Send updated symbol list
      wsRef.current.send(JSON.stringify({
        action: 'add_symbols',
        symbols: watchlist
      }));
    }
  }, [watchlist]);

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionStatus('connecting');
    setError('');

    try {
      const wsUrl = `${WS_BASE_URL}/market-watch/ws`;
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ Market Watch WebSocket connected successfully');
        setConnectionStatus('connected');
        setError('');

        // Subscribe to watchlist symbols
        console.log('📡 Subscribing to symbols:', watchlist);
        ws.send(JSON.stringify({
          action: 'add_symbols',
          symbols: watchlist
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'ticks') {
            // Buffer tick data instead of immediate state update
            // This prevents excessive re-renders from high-frequency updates (1ms interval)
            Object.keys(message.data).forEach(symbol => {
              const tick = message.data[symbol];
              if (!tick.error) {
                tickBufferRef.current[symbol] = tick;
              }
            });

            // Determine market status based on tick data
            const hasValidTick = Object.values(message.data).some(tick => !tick.error && tick.bid > 0);
            setMarketStatus(hasValidTick ? 'open' : 'closed');

          } else if (message.type === 'connected') {
            console.log('Connected to Market Watch:', message.message);
          } else if (message.type === 'symbols_added') {
            console.log('Symbols added:', message.symbols);
          } else if (message.type === 'error') {
            console.error('WebSocket error:', message.message);
            setError(message.message);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('WebSocket URL:', wsUrl);
        console.error('WebSocket state:', ws.readyState);
        setError(`Connection error: ${error.message || 'Unknown error'}`);
        setConnectionStatus('disconnected');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected');
        console.log('Close code:', event.code, 'Reason:', event.reason);
        console.log('Was clean:', event.wasClean);
        setConnectionStatus('disconnected');

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('❌ Failed to create WebSocket:', err);
      console.error('Error details:', err.message);
      console.error('WS_BASE_URL:', WS_BASE_URL);
      setError(`Failed to connect: ${err.message}`);
      setConnectionStatus('disconnected');

      // Try to reconnect after error
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Retrying connection after error...');
        connectWebSocket();
      }, 3000);
    }
  };

  // Memoized callbacks for performance
  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`${API_BASE_URL}/symbols`);
        const data = await response.json();

        if (data.success && data.symbols) {
          // Filter symbols by search query
          const filtered = data.symbols
            .filter(sym =>
              sym.name.toLowerCase().includes(query.toLowerCase()) ||
              (sym.description && sym.description.toLowerCase().includes(query.toLowerCase()))
            )
            .slice(0, 10) // Limit to 10 results
            .map(sym => ({
              name: sym.name,
              description: sym.description || sym.name
            }));

          setSearchResults(filtered);
          setShowSearchDropdown(filtered.length > 0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Add symbol to watchlist
  const addSymbol = useCallback((symbol) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist(prev => [...prev, symbol]);
    }
    setSearchQuery('');
    setShowSearchDropdown(false);
    setSearchResults([]);
  }, [watchlist]);

  // Remove symbol from watchlist
  const removeSymbol = useCallback((symbol) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));

    // Remove from WebSocket subscription
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'remove_symbols',
        symbols: [symbol]
      }));
    }

    // Remove from tick data
    setTickData(prev => {
      const newData = { ...prev };
      delete newData[symbol];
      return newData;
    });
  }, []);

  // Memoized utility functions for performance
  const formatPrice = useCallback((price, digits = 5) => {
    if (!price) return '-';
    return price.toFixed(digits);
  }, []);

  const calculateDailyChange = useCallback((tick) => {
    if (!tick || !tick.daily_open || !tick.last) return null;
    const change = ((tick.last - tick.daily_open) / tick.daily_open) * 100;
    return change;
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback((e, symbol) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      symbol
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, closeContextMenu]);

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Market Watch</h1>
          <p className="text-gray-500">Real-time market prices via WebSocket</p>
        </div>

        {/* Connection & Market Status */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Circle
              className={`w-2 h-2 ${
                connectionStatus === 'connected' ? 'text-green-500 fill-green-500 animate-pulse' :
                connectionStatus === 'connecting' ? 'text-yellow-500 fill-yellow-500 animate-pulse' :
                'text-red-500 fill-red-500'
              }`}
            />
            <span className="text-gray-600">
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               'Disconnected'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            {marketStatus === 'open' && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium">
                Market Open
              </span>
            )}
            {marketStatus === 'closed' && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md font-medium">
                Market Closed - Last Known Prices
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search symbols (e.g., XAUUSD, GBPUSD, AAPL)..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={18} />
          )}
        </div>

        {/* Search Dropdown */}
        <AnimatePresence>
          {showSearchDropdown && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-80 overflow-y-auto"
            >
              {searchResults.map((result) => (
                <div
                  key={result.name}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{result.name}</p>
                    <p className="text-xs text-gray-500">{result.description}</p>
                  </div>
                  {watchlist.includes(result.name) ? (
                    <span className="text-xs text-green-600 font-medium">Added</span>
                  ) : (
                    <button
                      onClick={() => addSymbol(result.name)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error Message */}
      {error && (
        <div className="flex flex-col gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="font-semibold">Connection Error</span>
          </div>
          <span>{error}</span>
          <div className="text-xs text-red-600 mt-1">
            <p>Trying to connect to: {WS_BASE_URL}/market-watch/ws</p>
            <p className="mt-1">Make sure backend is running on {API_BASE_URL}</p>
          </div>
        </div>
      )}

      {/* Debug Info (dev mode) */}
      {connectionStatus === 'disconnected' && !error && (
        <div className="flex flex-col gap-2 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="font-semibold">Connection Troubleshooting</span>
          </div>
          <div className="text-xs">
            <p>• WebSocket URL: {WS_BASE_URL}/market-watch/ws</p>
            <p>• API URL: {API_BASE_URL}</p>
            <p>• Check browser console (F12) for detailed error messages</p>
            <p>• Ensure backend is running: <code className="bg-yellow-100 px-1 rounded">python trading_main.py</code></p>
            <p>• Auto-reconnecting every 3 seconds...</p>
          </div>
        </div>
      )}

      {/* Market Watch Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden"
        style={glassStyle}
      >
        <div className="overflow-x-auto">
          {connectionStatus === 'connecting' && watchlist.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-3" />
              <span className="text-gray-500">Connecting to market data...</span>
            </div>
          ) : connectionStatus === 'disconnected' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <WifiOff className="w-12 h-12 text-red-500 mb-3" />
              <span className="text-red-600 font-semibold mb-2">Disconnected</span>
              <span className="text-gray-500 text-sm">Attempting to reconnect...</span>
            </div>
          ) : watchlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="w-12 h-12 text-gray-400 mb-3" />
              <span className="text-gray-600 font-semibold mb-1">No symbols in watchlist</span>
              <span className="text-gray-500 text-sm">Search and add symbols to start tracking</span>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-md">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Symbol</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Bid</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Ask</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Last</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">High</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Low</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Bid High</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Bid Low</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Ask High</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Ask Low</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Open</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Close</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Spread</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Change %</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Time (UK)</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {watchlist.map((symbol, index) => (
                  <MarketWatchRow
                    key={symbol}
                    symbol={symbol}
                    tick={tickData[symbol]}
                    index={index}
                    onRemove={removeSymbol}
                    calculateDailyChange={calculateDailyChange}
                    formatPrice={formatPrice}
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-4 text-xs text-gray-500">
        <div>
          <span className="font-medium text-gray-700">{watchlist.length}</span> symbol{watchlist.length !== 1 ? 's' : ''} tracking
          {marketStatus === 'closed' && (
            <span className="ml-2">• Showing last known prices</span>
          )}
        </div>
        <div>
          <span className="text-green-600 font-semibold">Ultra Low Latency:</span> 1ms polling • 60fps rendering
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 py-2 min-w-[200px] max-h-[80vh] overflow-y-auto"
            style={{
              left: `${Math.min(contextMenu.x, window.innerWidth - 220)}px`,
              top: `${Math.min(contextMenu.y, window.innerHeight - 500)}px`,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* New Order */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <Plus size={16} className="text-blue-600" />
              <span className="text-gray-700">New Order</span>
            </button>

            {/* Chart Window */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <BarChart3 size={16} className="text-blue-600" />
              <span className="text-gray-700">Chart Window</span>
            </button>

            {/* Tick Chart */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <Activity size={16} className="text-blue-600" />
              <span className="text-gray-700">Tick Chart</span>
            </button>

            {/* Depth of Market */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <Layers size={16} className="text-blue-600" />
              <span className="text-gray-700">Depth Of Market</span>
              <span className="ml-auto text-xs text-gray-400">Alt+B</span>
            </button>

            {/* Specification */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <Settings size={16} className="text-blue-600" />
              <span className="text-gray-700">Specification</span>
            </button>

            <div className="border-t border-gray-200 my-2"></div>

            {/* Hide */}
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors"
              onClick={() => {
                removeSymbol(contextMenu.symbol);
                closeContextMenu();
              }}
            >
              <EyeOff size={16} className="text-gray-600" />
              <span className="text-gray-700">Hide</span>
            </button>

            {/* Hide All */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <EyeOff size={16} className="text-gray-600" />
              <span className="text-gray-700">Hide All</span>
            </button>

            {/* Show All */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <Eye size={16} className="text-gray-600" />
              <span className="text-gray-700">Show All</span>
            </button>

            <div className="border-t border-gray-200 my-2"></div>

            {/* Symbols */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <Search size={16} className="text-blue-600" />
              <span className="text-gray-700">Symbols</span>
              <span className="ml-auto text-xs text-gray-400">Ctrl+U</span>
            </button>

            {/* Sort */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <ArrowUpDown size={16} className="text-gray-600" />
              <span className="text-gray-700">Sort</span>
            </button>

            {/* Export */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <Download size={16} className="text-gray-600" />
              <span className="text-gray-700">Export</span>
            </button>

            <div className="border-t border-gray-200 my-2"></div>

            {/* Show Milliseconds */}
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
              <CheckSquare size={16} className="text-blue-600" />
              <span className="text-gray-700">Show Milliseconds</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketWatch;
