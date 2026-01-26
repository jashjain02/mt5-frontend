import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, ChevronDown, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

const ValuesPage = ({ onBack, initialSymbol = 'XAUUSD' }) => {
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [selectedTimeframe, setSelectedTimeframe] = useState('M1');
  const [timestampInput, setTimestampInput] = useState('');
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);
  const [valuesData, setValuesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'H5', 'D1', 'W1', 'MN1'];

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setWsStatus('connecting');

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/calculated-values/ws`);

      ws.onopen = () => {
        console.log('Calculated Values WebSocket connected');
        setWsConnected(true);
        setWsStatus('connected');

        // Subscribe to calculated values for the selected symbol/timeframe
        ws.send(JSON.stringify({
          action: 'subscribe',
          symbol: selectedSymbol,
          timeframe: selectedTimeframe
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'calculated_values') {
            // New calculated values received - prepend to the list
            setValuesData(prevData => {
              const newData = message.data;
              // Check if this timestamp already exists
              const exists = prevData.some(d => d.timestamp_uk === newData.timestamp_uk);
              if (exists) {
                return prevData;
              }
              // Prepend new data and keep only last 100 records
              return [newData, ...prevData].slice(0, 100);
            });

            console.log('Received calculated values update:', message.data.timestamp_uk);
          } else if (message.type === 'calculated_values_subscribed') {
            console.log('Subscribed to calculated values:', message.symbol, message.timeframe);
          } else if (message.type === 'connected') {
            console.log('WebSocket connected:', message.client_id);
          } else if (message.type === 'pong') {
            // Heartbeat response
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('Calculated Values WebSocket disconnected', event.code, event.reason);
        setWsConnected(false);
        setWsStatus('disconnected');
        wsRef.current = null;

        // Reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('error');
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setWsStatus('error');
    }
  }, [selectedSymbol, selectedTimeframe]);

  // Subscribe to new symbol/timeframe when they change
  const resubscribe = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'subscribe',
        symbol: selectedSymbol,
        timeframe: selectedTimeframe
      }));
    }
  }, [selectedSymbol, selectedTimeframe]);

  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket();

    // Ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Resubscribe when symbol or timeframe changes
  useEffect(() => {
    resubscribe();
  }, [selectedSymbol, selectedTimeframe, resubscribe]);

  // Fetch values data when timeframe changes
  useEffect(() => {
    if (selectedSymbol && selectedTimeframe) {
      fetchValuesData();
    }
  }, [selectedSymbol, selectedTimeframe]);

  const fetchValuesData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/calculated-values?symbol=${selectedSymbol}&timeframe=${selectedTimeframe}&limit=100`
      );
      const data = await response.json();

      if (data.success) {
        setValuesData(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch values data');
      }
    } catch (err) {
      console.error('Error fetching values:', err);
      setError('Failed to fetch values data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeframeChange = (tf) => {
    setSelectedTimeframe(tf);
    setIsTimeframeDropdownOpen(false);
  };

  const handleRefresh = () => {
    fetchValuesData();
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      return value.toFixed(5);
    }
    return value;
  };

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  };

  // Fibonacci levels for channels
  const fibLevels = ['14.60%', '23.60%', '38.20%', '61.80%', '100.00%', '138.20%', '161.80%', '261.80%', '423.60%'];

  return (
    <div className="space-y-5">
      {/* Header with Back Arrow */}
      <div className="flex items-center gap-4">
        <motion.button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Calculated Values</h1>
          <p className="text-gray-500 text-sm">
            Technical analysis values for {selectedSymbol} - {selectedTimeframe}
          </p>
        </div>
        {/* WebSocket Status Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
          wsConnected
            ? 'bg-green-50 text-green-700'
            : wsStatus === 'connecting'
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-red-50 text-red-700'
        }`}>
          {wsConnected ? (
            <>
              <Wifi className="w-3 h-3" />
              <span className="font-medium">Live</span>
            </>
          ) : wsStatus === 'connecting' ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="font-medium">Connecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span className="font-medium">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Filters Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-2xl"
        style={glassStyle}
      >
        {/* Timestamp Input */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Date / Timestamp</label>
          <input
            type="text"
            value={timestampInput}
            onChange={(e) => setTimestampInput(e.target.value)}
            placeholder="e.g., 2026-01-20 14:30:00"
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-900 text-sm font-medium min-w-[220px] hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
          />
        </div>

        {/* Timeframe Dropdown */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Timeframe</label>
          <button
            onClick={() => setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen)}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-900 text-sm font-medium min-w-[120px] hover:border-blue-400 transition-colors"
          >
            <span>{selectedTimeframe}</span>
            <ChevronDown size={18} className={`transition-transform ${isTimeframeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTimeframeDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                    selectedTimeframe === tf ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="lg:ml-auto">
          <label className="block text-xs font-medium text-gray-500 mb-1.5 invisible">Action</label>
          <motion.button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </motion.button>
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
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <span className="mt-3 text-gray-500">Loading calculated values...</span>
            </div>
          ) : valuesData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="text-4xl mb-3">📊</span>
              <p>No data available for {selectedSymbol} - {selectedTimeframe}</p>
              <p className="text-sm mt-1">Try selecting a different timeframe</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200/50 bg-gray-50/50">
                  {/* Basic Data Columns */}
                  <th className="text-left py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50/90 z-10">Date</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider">High</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider">Low</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider">Close</th>

                  {/* Calculated Fields */}
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">ATR</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">RANGE</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">JGD</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">JWD</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">D Pat</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">ABS RANGE</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">Buffer</th>

                  {/* Rising Channel */}
                  {fibLevels.map((level) => (
                    <th key={`rc-${level}`} className="text-right py-3 px-2 font-semibold text-green-700 uppercase tracking-wider bg-green-50/50 whitespace-nowrap">
                      RC {level}
                    </th>
                  ))}

                  {/* Falling Channel */}
                  {fibLevels.map((level) => (
                    <th key={`fc-${level}`} className="text-right py-3 px-2 font-semibold text-red-700 uppercase tracking-wider bg-red-50/50 whitespace-nowrap">
                      FC {level}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {valuesData.map((row, index) => (
                  <tr
                    key={row.timestamp_uk || index}
                    className={`border-b border-gray-100/50 last:border-0 hover:bg-white/50 transition-colors ${
                      index === 0 ? 'bg-green-50/30' : ''
                    }`}
                  >
                    {/* Basic Data */}
                    <td className={`py-2.5 px-3 text-gray-600 font-mono whitespace-nowrap sticky left-0 z-10 ${
                      index === 0 ? 'bg-green-50/90' : 'bg-white/90'
                    }`}>
                      {row.timestamp_uk_formatted || row.timestamp_uk}
                      {index === 0 && <span className="ml-2 text-green-600 text-xs font-semibold">NEW</span>}
                    </td>
                    <td className="py-2.5 px-3 text-green-600 text-right font-medium">{formatValue(row.high)}</td>
                    <td className="py-2.5 px-3 text-red-600 text-right font-medium">{formatValue(row.low)}</td>
                    <td className="py-2.5 px-3 text-gray-900 text-right font-medium">{formatValue(row.close)}</td>

                    {/* Calculated Fields */}
                    <td className="py-2.5 px-3 text-gray-700 text-right bg-blue-50/30">{formatValue(row.atr)}</td>
                    <td className="py-2.5 px-3 text-gray-700 text-right bg-blue-50/30">{formatValue(row.range)}</td>
                    <td className="py-2.5 px-3 text-gray-700 text-right bg-blue-50/30">{formatValue(row.jgd)}</td>
                    <td className="py-2.5 px-3 text-gray-700 text-right bg-blue-50/30">{formatValue(row.jwd)}</td>
                    <td className="py-2.5 px-3 text-gray-700 text-right bg-blue-50/30">{formatValue(row.d_pat)}</td>
                    <td className="py-2.5 px-3 text-gray-700 text-right bg-blue-50/30">{formatValue(row.abs_range)}</td>
                    <td className="py-2.5 px-3 text-gray-700 text-right bg-blue-50/30">{formatValue(row.buffer)}</td>

                    {/* Rising Channel Values */}
                    {fibLevels.map((level) => (
                      <td key={`rc-${level}-${index}`} className="py-2.5 px-2 text-green-700 text-right bg-green-50/30">
                        {formatValue(row.rising_channel?.[level])}
                      </td>
                    ))}

                    {/* Falling Channel Values */}
                    {fibLevels.map((level) => (
                      <td key={`fc-${level}-${index}`} className="py-2.5 px-2 text-red-700 text-right bg-red-50/30">
                        {formatValue(row.falling_channel?.[level])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Data Count */}
      {valuesData.length > 0 && (
        <div className="text-sm text-gray-500 text-right">
          Showing {valuesData.length} records {wsConnected && <span className="text-green-600">• Live updates enabled</span>}
        </div>
      )}
    </div>
  );
};

export default ValuesPage;
