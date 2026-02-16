import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertCircle, ChevronDown, Clock, FileText, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { transformApiDataToTradingPlan } from '../utils/tradingPlanTransformer';

const FIB_LEVELS = [
  '14.60%', '23.60%', '38.20%', '61.80%', '100.00%',
  '138.20%', '161.80%', '261.80%', '423.60%'
];

const TIMEFRAME_DISPLAY_NAMES = {
  H1: '1 Hour', H4: '4 Hours', H5: '5 Hours', D1: 'Daily', W1: 'Weekly'
};
const getTimeframeDisplayName = (tf) => TIMEFRAME_DISPLAY_NAMES[tf] || tf;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

const TradingPlan = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('H1');
  const [selectedTimestamp, setSelectedTimestamp] = useState('');
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);
  const [isTimestampDropdownOpen, setIsTimestampDropdownOpen] = useState(false);
  const [availableTimestamps, setAvailableTimestamps] = useState([]);
  const [planData, setPlanData] = useState(null);
  const [error, setError] = useState('');

  // API integration state
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [apiData, setApiData] = useState(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastFormingBarTimestampRef = useRef(null);  // Track forming bar timestamp to detect new bar

  const timeframes = ['H1', 'H4', 'H5', 'D1', 'W1'];

  // Generate available timestamps based on timeframe
  useEffect(() => {
    if (selectedDate && selectedTimeframe) {
      const intervals = { H1: 1, H4: 4, H5: 5, D1: 24, W1: 168 };
      const hours = intervals[selectedTimeframe] || 1;
      const timestamps = [];
      for (let h = 0; h + hours <= 24; h += hours) {
        const start = `${String(h).padStart(2, '0')}:00:00`;
        const end = `${String(h + hours - 1).padStart(2, '0')}:59:59`;
        timestamps.push(`${start} - ${end}`);
      }
      if (timestamps.length === 0) timestamps.push('00:00:00 - 23:59:59');
      setAvailableTimestamps(timestamps);
      if (!timestamps.includes(selectedTimestamp)) {
        setSelectedTimestamp(timestamps[0]);
      }
    } else {
      setAvailableTimestamps([]);
      setSelectedTimestamp('');
    }
  }, [selectedDate, selectedTimeframe]);

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  };

  // Format display date with timestamp
  const getDisplayDateTime = () => {
    if (!selectedDate) return '';
    if (!selectedTimestamp) return selectedDate;
    // Extract start time from timestamp (e.g., "00:00:00" from "00:00:00 - 00:59:59")
    const startTime = selectedTimestamp.split(' - ')[0];
    return `${selectedDate} ${startTime}`;
  };

  const handleLoadPlan = async () => {
    setError('');

    // Validate inputs
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
    if (!selectedTimeframe) {
      setError('Please select a timeframe');
      return;
    }
    if (!selectedTimestamp) {
      setError('Please select a timestamp');
      return;
    }

    // SWITCH TO HISTORICAL MODE
    setIsLiveMode(false);

    // Fetch from API with date filtering
    setIsLoadingApi(true);
    try {
      // Construct the full datetime string for filtering
      const startTime = selectedTimestamp.split(' - ')[0]; // Extract "HH:MM:SS" from "HH:MM:SS - HH:MM:SS"
      const startDateTime = `${selectedDate} ${startTime}`;

      // For end_date, use the same date with the end time from timestamp range
      const endTime = selectedTimestamp.split(' - ')[1]; // Extract end time
      const endDateTime = `${selectedDate} ${endTime}`;

      // Fetch 2 bars ending at the selected time
      // Trade logs were detected using the PREVIOUS bar's RC/FC levels
      const response = await api.getCalculatedValues('XAUUSD', selectedTimeframe, {
        limit: 2,
        endDate: endDateTime,  // Get bars up to and including the selected time
      });

      if (response.success && response.data.length > 0) {
        // response.data[0] = selected bar (the monitoring period, where trade logs are stored)
        // response.data[1] = previous bar (whose RC/FC levels were used for crossing detection)
        const selectedBar = response.data[0];
        const previousBar = response.data.length > 1 ? response.data[1] : response.data[0];

        // Use PREVIOUS bar's RC/FC levels for display (matches what trade logs used)
        const transformedData = transformApiDataToTradingPlan(previousBar);
        setApiData(transformedData);

        // Store the selected bar's timestamp as the monitoring period
        transformedData.formingBarTimestamp = selectedBar.timestamp_uk_formatted;

        // Fetch trade logs for the SELECTED bar (that's where logs are stored)
        try {
          const barTs = selectedBar.timestamp_uk_formatted;
          if (barTs) {
            const logsResp = await api.getTradeLogs('XAUUSD', selectedTimeframe, barTs);
            if (logsResp.success && logsResp.logs) {
              transformedData.tradeLogs = logsResp.logs;
            }
          }
        } catch (logErr) {
          console.debug('Could not fetch trade logs:', logErr);
        }

        setPlanData(transformedData);
      } else {
        setError(`No data available for ${getDisplayDateTime()} at ${getTimeframeDisplayName(selectedTimeframe)}`);
        setPlanData(null);
      }
    } catch (err) {
      console.error('API error:', err);
      setError('Failed to load data. Please check your connection.');
      setPlanData(null);
    } finally {
      setIsLoadingApi(false);
    }
  };

  // Derive the forming bar's timestamp from the completed bar's timestamp
  // by adding one timeframe period. This avoids client-side timezone guessing
  // since the completed bar's timestamp comes directly from the backend DB.
  const getNextBarTimestamp = (completedTimestamp, timeframe) => {
    if (!completedTimestamp) return null;
    const date = new Date(completedTimestamp.replace(' ', 'T'));
    const hours = { H1: 1, H4: 4, H5: 5, D1: 24, W1: 168 }[timeframe] || 1;
    date.setHours(date.getHours() + hours);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  };

  // Fetch latest trading plan data (for live mode)
  const loadLatestPlan = async () => {
    setIsLoadingApi(true);
    setError('');

    try {
      // Fetch latest COMPLETED bar for RC/FC levels display
      // During 08:00 hour, this returns 07:00 bar (whose levels are used for crossing detection)
      const response = await api.getCalculatedValues('XAUUSD', selectedTimeframe, {
        limit: 1,
        offset: 0,
      });

      if (response.success && response.data.length > 0) {
        const completedBar = response.data[0];

        // Display the completed bar's RC/FC levels (matches what backend uses for crossing detection)
        const transformedData = transformApiDataToTradingPlan(completedBar);
        setApiData(transformedData);

        // Derive the FORMING bar's timestamp from the completed bar's timestamp
        // Trade logs are stored with this timestamp (the bar where crossings occur)
        const formingBarTs = getNextBarTimestamp(completedBar.timestamp_uk_formatted, selectedTimeframe);

        // Store the forming bar timestamp for display (the monitoring period)
        transformedData.formingBarTimestamp = formingBarTs;

        // Fetch trade logs for the FORMING bar (crossings happening NOW)
        try {
          if (formingBarTs) {
            const logsResp = await api.getTradeLogs('XAUUSD', selectedTimeframe, formingBarTs);
            if (logsResp.success && logsResp.logs) {
              transformedData.tradeLogs = logsResp.logs;
            } else {
              transformedData.tradeLogs = [];
            }
          } else {
            transformedData.tradeLogs = [];
          }
        } catch (logErr) {
          console.debug('Could not fetch trade logs for forming bar:', logErr);
          transformedData.tradeLogs = [];
        }

        setPlanData(transformedData);
        setIsLiveMode(true);
      } else {
        setError('No trading plan data available. If markets are closed, the last active plan will appear once data has been recorded.');
        setPlanData(null);
      }
    } catch (err) {
      console.error('Failed to load latest data:', err);
      if (err.status === 0) {
        setError('Failed to connect to the server. Please check that the backend is running.');
      } else {
        setError(err.message || `Server error (${err.status}). Please try again.`);
      }
    } finally {
      setIsLoadingApi(false);
    }
  };

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BASE_URL}/calculated-values/ws`);

    ws.onopen = () => {
      console.log('Trading Plan WebSocket connected');
      setWsConnected(true);

      // Subscribe to calculated values for selected timeframe
      ws.send(JSON.stringify({
        action: 'subscribe',
        symbol: 'XAUUSD',
        timeframe: selectedTimeframe
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'calculated_values') {
        // Pass is_forming flag from the WebSocket message into the data for the transformer
        const dataWithFormingFlag = { ...message.data, is_forming: message.is_forming, tick: message.tick };
        const transformedData = transformApiDataToTradingPlan(dataWithFormingFlag);
        setApiData(transformedData);

        // Detect new bar by comparing forming bar timestamp (not displayed plan timestamp)
        const formingBarTimestamp = transformedData.timestamp;
        const isNewBar = lastFormingBarTimestampRef.current &&
                         lastFormingBarTimestampRef.current !== formingBarTimestamp;
        lastFormingBarTimestampRef.current = formingBarTimestamp;

        // Only update the displayed plan when in live mode
        // Don't overwrite historical data the user is viewing
        setIsLiveMode((prev) => {
          if (prev) {
            setPlanData((currentPlan) => {
              if (!currentPlan) return currentPlan;

              if (isNewBar) {
                // New bar: update the FULL plan from WebSocket data immediately
                // The backend now sends complete calculated values (RC/FC + abs_range, buffer, jgd, jwd, d_pat, close)
                // This ensures the UI always shows correct data even if the DB is stale
                return {
                  ...transformedData,
                  formingBarTimestamp: currentPlan.formingBarTimestamp,
                  tradeLogs: [],  // Reset for new bar
                };
              }

              const d = message.data;
              const highChanged = d.high !== currentPlan.marketData?.high;
              const lowChanged = d.low !== currentPlan.marketData?.low;

              if (highChanged || lowChanged) {
                // Update marketData from current forming bar, not RC/FC levels
                return {
                  ...currentPlan,
                  marketData: {
                    ...currentPlan.marketData,
                    open: transformedData.marketData?.open,
                    high: transformedData.marketData?.high,
                    low: transformedData.marketData?.low,
                    close: transformedData.marketData?.last,  // Forming bar's close = last price
                    bid: transformedData.marketData?.bid,
                    ask: transformedData.marketData?.ask,
                    last: transformedData.marketData?.last,
                    spread: transformedData.marketData?.spread,
                  },
                  tradeLogs: currentPlan.tradeLogs || [],
                };
              }
              // Only update tick-driven fields without re-rendering the whole plan
              return {
                ...currentPlan,
                marketData: {
                  ...currentPlan.marketData,
                  close: transformedData.marketData?.last,  // Forming bar's close = last price
                  bid: transformedData.marketData?.bid,
                  ask: transformedData.marketData?.ask,
                  last: transformedData.marketData?.last,
                  spread: transformedData.marketData?.spread,
                },
              };
            });
          }
          // Never auto-switch to live mode from WebSocket; preserve current mode
          return prev;
        });

        // If new bar started, also reload from API as backup (for trade logs)
        if (isNewBar) {
          loadLatestPlan();
        }
      } else if (message.type === 'trade_log') {
        // Only append live trade logs when in live mode
        setIsLiveMode((prev) => {
          if (prev) {
            setPlanData((prevPlan) => {
              if (!prevPlan) return prevPlan;
              const existingLogs = prevPlan.tradeLogs || [];
              const newLogs = message.logs || [];

              // Deduplicate by creating a unique key from time + type + message
              const existingKeys = new Set(
                existingLogs.map((log) => `${log.time}|${log.type}|${log.message}`)
              );
              const uniqueNewLogs = newLogs.filter(
                (log) => !existingKeys.has(`${log.time}|${log.type}|${log.message}`)
              );

              if (uniqueNewLogs.length === 0) return prevPlan;
              return { ...prevPlan, tradeLogs: [...existingLogs, ...uniqueNewLogs] };
            });
          }
          return prev;
        });
      } else if (message.type === 'calculated_values_subscribed') {
        console.log('Subscribed to calculated values:', message);
      }
    };

    ws.onerror = (error) => {
      console.error('Trading Plan WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('Trading Plan WebSocket disconnected');
      setWsConnected(false);
      wsRef.current = null;

      // Auto-reconnect if live mode is still enabled
      if (isLiveMode) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      }
    };

    wsRef.current = ws;
  }, [selectedTimeframe, isLiveMode]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  }, []);

  // Effect: Always keep WebSocket connected when we have plan data.
  // isLiveMode is a display-only flag — set to true only when we receive
  // actual forming bar data from the WebSocket (i.e., markets are open).
  // When markets are closed, WS stays connected but no forming data arrives,
  // so isLiveMode stays false. When markets open, data auto-flows and isLiveMode
  // flips to true — no human intervention needed.
  useEffect(() => {
    if (planData) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [planData, connectWebSocket, disconnectWebSocket]);

  // Auto-load latest data on component mount and when timeframe changes
  useEffect(() => {
    // Only auto-load if we're in live mode or on initial mount (no planData yet)
    if (isLiveMode || !planData) {
      loadLatestPlan();
    }
  }, [selectedTimeframe]); // Re-run when timeframe changes

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Trading Plan
        </h1>
        <p className="text-gray-500">
          View the {getTimeframeDisplayName(selectedTimeframe)} XAUUSD trading plan diagram by date
        </p>
      </div>

      {/* Selectors */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 rounded-2xl relative z-50"
        style={glassStyle}
      >
        {/* Date Input */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-900 text-sm font-medium min-w-[180px] hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
          />
        </div>

        {/* Timeframe Dropdown */}
        <div className="relative z-[100]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Select Timeframe
          </label>
          <button
            onClick={() => setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen)}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-900 text-sm font-medium min-w-[130px] hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
          >
            <span>{getTimeframeDisplayName(selectedTimeframe)}</span>
            <ChevronDown size={18} className={`transition-transform ${isTimeframeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTimeframeDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl z-[9999] max-h-60 overflow-y-auto">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setSelectedTimeframe(tf);
                    setIsTimeframeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                    selectedTimeframe === tf ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {getTimeframeDisplayName(tf)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp Dropdown */}
        <div className="relative z-[90]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Select Time
          </label>
          <button
            onClick={() => setIsTimestampDropdownOpen(!isTimestampDropdownOpen)}
            disabled={availableTimestamps.length === 0}
            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-900 text-sm font-medium min-w-[200px] hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors ${
              availableTimestamps.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-gray-400" />
              <span className="truncate">{selectedTimestamp || 'Select time...'}</span>
            </div>
            <ChevronDown size={18} className={`transition-transform flex-shrink-0 ${isTimestampDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTimestampDropdownOpen && availableTimestamps.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl z-[9999] max-h-60 overflow-y-auto">
              {availableTimestamps.map((ts) => (
                <button
                  key={ts}
                  onClick={() => {
                    setSelectedTimestamp(ts);
                    setIsTimestampDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl font-mono ${
                    selectedTimestamp === ts ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {ts}
                </button>
              ))}
            </div>
          )}
        </div>

        <motion.button
          onClick={handleLoadPlan}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-sm font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Calendar size={18} />
          {isLoadingApi ? 'Loading...' : 'Load Plan'}
        </motion.button>

        {/* Mode Indicator - Shows Live or Historical status */}
        {planData && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm ${
            isLiveMode
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'bg-blue-50 text-blue-600 border border-blue-200'
          }`}>
            {isLiveMode ? (
              <>
                {wsConnected ? <Wifi size={18} className="animate-pulse" /> : <WifiOff size={18} />}
                <span className="font-semibold">LIVE MODE</span>
                {wsConnected && <span className="text-xs text-green-500">• Connected</span>}
                {planData?.formingBarTimestamp && <span className="text-xs text-green-600 ml-1">| Monitoring: {planData.formingBarTimestamp}</span>}
              </>
            ) : (
              <>
                <Clock size={18} />
                <span className="font-semibold">HISTORICAL</span>
                <span className="text-xs text-blue-500">• {getDisplayDateTime() || planData?.timestamp || 'Last available'}</span>
              </>
            )}
          </div>
        )}

        {/* Back to Live Button - Only show when in historical mode */}
        {planData && !isLiveMode && (
          <motion.button
            onClick={() => {
              // Clear filters
              setSelectedDate('');
              setSelectedTimestamp('');
              // Load latest data and enable live mode
              loadLatestPlan();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-sm font-medium border border-green-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={18} />
            Back to Live
          </motion.button>
        )}

        {/* Show available info */}
        {selectedDate && (
          <div className="text-xs text-gray-400 sm:ml-auto">
            {availableTimestamps.length} timestamps available
          </div>
        )}
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Market Data Row */}
      {planData && <MarketDataRow data={planData.marketData} />}

      {/* Trade Activity Logs */}
      {planData && <TradeLogsSection logs={planData.tradeLogs} />}

      {/* Trading Plan Diagram */}
      {planData && <TradingPlanDiagram data={planData} />}

      {/* Loading state */}
      {!planData && !error && isLoadingApi && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 text-center">
            Loading latest trading plan...
          </p>
        </div>
      )}

      {/* Empty state if initial load fails */}
      {!planData && !error && !isLoadingApi && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center min-h-[300px]">
          <Calendar className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-center">
            Failed to load latest data. Use filters to load historical data.
          </p>
        </div>
      )}
    </div>
  );
};

const formatPrice = (price) => {
  if (price === null || price === undefined) return '';
  return price.toFixed(2);
};

// Glass style for components
const glassStyleShared = {
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
};

// Market Data Row Component with 15 columns
const MarketDataRow = ({ data }) => {
  const fields = [
    { key: 'symbol', label: 'SYMBOL', format: (v) => v || '-' },
    { key: 'bid', label: 'BID' },
    { key: 'ask', label: 'ASK' },
    { key: 'last', label: 'LAST' },
    { key: 'high', label: 'HIGH' },
    { key: 'low', label: 'LOW' },
    { key: 'bidHigh', label: 'BID HIGH' },
    { key: 'bidLow', label: 'BID LOW' },
    { key: 'askHigh', label: 'ASK HIGH' },
    { key: 'askLow', label: 'ASK LOW' },
    { key: 'open', label: 'OPEN' },
    { key: 'close', label: 'CLOSE', format: (v) => v === null ? 'LIVE' : v?.toFixed(2) },
    { key: 'prevClose', label: 'PREV CLOSE' },
    { key: 'spread', label: 'SPREAD' },
    { key: 'change', label: 'CHA', format: (v) => v !== null && v !== undefined ? (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) : '-' },
  ];

  const formatValue = (field, value) => {
    if (field.format) return field.format(value);
    if (value === null || value === undefined) return '-';
    return value.toFixed(2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={glassStyleShared}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="border-b border-gray-200">
              {fields.map((field) => (
                <th
                  key={field.key}
                  className="px-2 py-3 text-[9px] font-semibold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap"
                >
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {fields.map((field) => (
                <td
                  key={field.key}
                  className={`px-2 py-3 text-sm font-mono font-medium text-center whitespace-nowrap ${
                    field.key === 'symbol' ? 'text-gray-900 font-bold' :
                    field.key === 'close' && data?.[field.key] === null ? 'text-blue-600 font-bold' :
                    field.key === 'change' ? (data?.[field.key] >= 0 ? 'text-green-600' : 'text-red-600') :
                    'text-gray-700'
                  }`}
                >
                  {formatValue(field, data?.[field.key])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// Trade Activity Logs Component
const TradeLogsSection = ({ logs }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl overflow-hidden"
    style={glassStyleShared}
  >
    <div className="p-4 border-b border-gray-200 flex items-center gap-2">
      <FileText size={18} className="text-gray-500" />
      <h3 className="font-semibold text-gray-900">Trade Activity Logs</h3>
    </div>
    <div className="max-h-[200px] overflow-y-auto">
      {logs && logs.length > 0 ? (
        logs.map((log, idx) => (
          <div key={idx} className="flex items-start gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
            <span className="text-xs font-mono text-gray-400 whitespace-nowrap mt-0.5">{log.time}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
              log.type === 'CROSS_ABOVE' || log.type === 'BUY' ? 'bg-green-100 text-green-700' :
              log.type === 'CROSS_BELOW' || log.type === 'SELL' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>{log.type}</span>
            <span className="text-sm text-gray-700">{log.message}</span>
          </div>
        ))
      ) : (
        <div className="p-4 text-center text-gray-400 text-sm">No trade activity logs</div>
      )}
    </div>
  </motion.div>
);

/**
 * Calculate which row index should be highlighted for each column
 * @param {Array} rows - Array of row objects with `values` arrays
 * @param {number} numColumns - Number of Fibonacci columns
 * @returns {Array<number>} - Array where index is column and value is the row to highlight (-1 if none)
 */
const calculateMiddleValueRows = (rows, numColumns) => {
  const middleRows = [];

  for (let colIdx = 0; colIdx < numColumns; colIdx++) {
    // Collect all non-null values and their row indices for this column
    const valuesWithIndices = [];
    rows.forEach((row, rowIdx) => {
      if (row.values[colIdx] !== null && row.values[colIdx] !== undefined) {
        valuesWithIndices.push({ rowIdx, value: row.values[colIdx] });
      }
    });

    // Find the middle index
    if (valuesWithIndices.length > 0) {
      const middleIndex = Math.floor(valuesWithIndices.length / 2);
      middleRows[colIdx] = valuesWithIndices[middleIndex].rowIdx;
    } else {
      middleRows[colIdx] = -1; // No values in this column
    }
  }

  return middleRows;
};

// The spreadsheet-style diagram
const TradingPlanDiagram = ({ data }) => {
  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  };

  const totalCols = FIB_LEVELS.length; // 9

  // Calculate which rows should be highlighted for RC and FC sections
  const rcMiddleRows = calculateMiddleValueRows(data.rc.rows, FIB_LEVELS.length);
  const fcMiddleRows = calculateMiddleValueRows(data.fc.rows, FIB_LEVELS.length);

  // Helper to render UTP/DTP price marker row
  const renderPriceMarker = (marker, key) => {
    if (!marker?.price) return null;

    return (
      <tr key={key}>
        {FIB_LEVELS.map((_, colIdx) => {
          const isCenter = marker.section === 'center';
          const isMarkerStart = marker.column >= 0 && colIdx === marker.column;
          const isMarkerEnd = marker.column >= 0 && colIdx === marker.column + 1;

          // Skip the second yellow cell — it's merged via colSpan on the first
          if (isMarkerEnd) return null;

          return (
            <td
              key={`${key}-${colIdx}`}
              colSpan={isMarkerStart ? 2 : 1}
              className={`text-[11px] font-mono text-center p-1 ${
                isMarkerStart ? 'bg-yellow-200 text-yellow-900 font-bold' :
                (isCenter && colIdx === 0) ? 'bg-yellow-200 text-yellow-900 font-bold' : ''
              }`}
            >
              {isMarkerStart || (isCenter && colIdx === 0)
                ? `${marker.label}: ${formatPrice(marker.price)}`
                : ''}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl overflow-hidden"
      style={glassStyle}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          <table className="w-full" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <colgroup>
              {/* Fib level columns */}
              {FIB_LEVELS.map((_, i) => (
                <col key={i} style={{ width: `${100 / totalCols}%` }} />
              ))}
            </colgroup>

            {/* ===== HEADER ROWS ===== */}
            <thead>
              {/* Title row */}
              <tr>
                <th
                  colSpan={totalCols}
                  className="text-center text-sm font-bold text-gray-900 p-2"
                  style={{ background: 'linear-gradient(to right, #fbbf24, #f59e0b)' }}
                >
                  {data.formingBarTimestamp ? `${data.formingBarTimestamp.slice(11, 16)}` : ''} {data.timeframe} TRADING PLAN
                </th>
              </tr>

              {/* Fib levels row */}
              <tr>
                {FIB_LEVELS.map((level) => (
                  <th
                    key={level}
                    className="text-[10px] font-bold text-white p-1.5 text-center whitespace-nowrap"
                    style={{ background: '#dc2626' }}
                  >
                    {level}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* ===== UTP/MUTP MARKERS (above RC if in RC section) ===== */}
              {data.utp?.section === 'rc' && renderPriceMarker(data.utp, 'utp-rc')}
              {data.mutp?.section === 'rc' && renderPriceMarker(data.mutp, 'mutp-rc')}

              {/* ===== RC (Rising Channel) SECTION ===== */}
              {data.rc.rows.map((row, rowIdx) => (
                <tr key={`rc-${rowIdx}`}>
                  {/* Fib value cells */}
                  {row.values.map((val, colIdx) => {
                    const isHighlighted = rcMiddleRows[colIdx] === rowIdx;
                    return (
                      <td
                        key={`rc-${rowIdx}-${colIdx}`}
                        className={`text-[11px] font-mono text-center p-1 ${
                          val !== null
                            ? isHighlighted
                              ? 'bg-green-300 text-green-950 font-bold'
                              : 'text-gray-900'
                            : ''
                        }`}
                      >
                        {val !== null ? formatPrice(val) : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* ===== DTP/MDTP MARKERS (below RC if in RC section) ===== */}
              {data.dtp?.section === 'rc' && renderPriceMarker(data.dtp, 'dtp-rc')}
              {data.mdtp?.section === 'rc' && renderPriceMarker(data.mdtp, 'mdtp-rc')}

              {/* ===== SPACER ROW AFTER RC ===== */}
              <tr>
                <td colSpan={9} className="bg-white h-6" />
              </tr>

              {/* ===== CENTER MARKERS (UTP/DTP/MUTP/MDTP if in center) ===== */}
              {data.utp?.section === 'center' && renderPriceMarker(data.utp, 'utp-center')}
              {data.mutp?.section === 'center' && renderPriceMarker(data.mutp, 'mutp-center')}
              {data.dtp?.section === 'center' && renderPriceMarker(data.dtp, 'dtp-center')}
              {data.mdtp?.section === 'center' && renderPriceMarker(data.mdtp, 'mdtp-center')}

              {/* ===== SPACER ROW BEFORE MIDDLE SECTION ===== */}
              <tr>
                <td colSpan={9} className="bg-white h-6" />
              </tr>

              {/* ===== MIDDLE REFERENCE SECTION ===== */}
              {/* Header row: ABS-RANGE (combined, cols 1-2), BUFFER (col 3), PREV CLOSE (col 4), empty (cols 5-7), BDP-WDP/2+2 (cols 8-9) */}
              <tr>
                {/* ABS-RANGE combined header (spans 2 cols) */}
                <td colSpan={2} className="bg-green-300 text-[10px] font-bold text-gray-900 p-1 text-center">ABS-RANGE</td>
                <td className="bg-green-300 text-[10px] font-bold text-gray-900 p-1 text-center">BUFFER</td>
                <td className="bg-green-300 text-[10px] font-bold text-gray-900 p-1 text-center">PREV CLOSE</td>
                {/* Empty cols - adjusts based on number of reference columns */}
                <td colSpan={5 - data.referenceLevels.headers.length} className="bg-white p-0.5" />
                {/* Reference headers (BDP-WDP, d_pat columns) */}
                {data.referenceLevels.headers.map((header) => (
                  <td key={header} className="bg-green-300 text-[10px] font-bold text-gray-900 p-1 text-center">
                    {header}
                  </td>
                ))}
              </tr>

              {/* Values row - new values on left, first row of BDP-WDP/2+2 on right */}
              <tr>
                {/* ABS-RANGE combined value (spans 2 cols) */}
                <td colSpan={2} className="bg-green-100 text-[11px] font-mono font-bold text-center p-1 text-green-900">
                  {formatPrice(data.middleValues?.absRange)}
                </td>
                <td className="bg-green-100 text-[11px] font-mono font-bold text-center p-1 text-green-900">
                  {formatPrice(data.middleValues?.buffer)}
                </td>
                <td className="bg-green-100 text-[11px] font-mono font-bold text-center p-1 text-green-900">
                  {formatPrice(data.middleValues?.prevClose)}
                </td>
                {/* Empty cols - adjusts based on number of reference columns */}
                <td colSpan={5 - data.referenceLevels.headers.length} className="bg-white p-0.5" />
                {/* First row values for reference columns */}
                {data.referenceLevels.rows[0].map((val, i) => (
                  <td
                    key={`ref-0-${i}`}
                    className="bg-green-100 text-[11px] font-mono font-bold text-center p-1 text-green-900"
                  >
                    {val !== null ? formatPrice(val) : ''}
                  </td>
                ))}
              </tr>

              {/* Second row for BDP-WDP/2+2 only */}
              <tr>
                {/* Empty cols - adjusts based on number of reference columns */}
                <td colSpan={9 - data.referenceLevels.headers.length} className="bg-white p-0.5" />
                {/* Second row values for reference columns */}
                {data.referenceLevels.rows[1].map((val, i) => (
                  <td
                    key={`ref-1-${i}`}
                    className="bg-green-100 text-[11px] font-mono font-bold text-center p-1 text-green-900"
                  >
                    {val !== null ? formatPrice(val) : ''}
                  </td>
                ))}
              </tr>

              {/* ===== SPACER ROW BEFORE FC ===== */}
              <tr>
                <td colSpan={9} className="bg-white h-12" />
              </tr>

              {/* ===== FC (Falling Channel) SECTION ===== */}
              {data.fc.rows.map((row, rowIdx) => (
                <tr key={`fc-${rowIdx}`}>
                  {/* Fib value cells */}
                  {row.values.map((val, colIdx) => {
                    const isHighlighted = fcMiddleRows[colIdx] === rowIdx;
                    return (
                      <td
                        key={`fc-${rowIdx}-${colIdx}`}
                        className={`text-[11px] font-mono text-center p-1 ${
                          val !== null
                            ? isHighlighted
                              ? 'bg-red-100 text-red-700 font-bold'
                              : 'text-red-600'
                            : ''
                        }`}
                      >
                        {val !== null ? formatPrice(val) : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* ===== UTP/MUTP MARKERS (below FC if in FC section) ===== */}
              {data.utp?.section === 'fc' && renderPriceMarker(data.utp, 'utp-fc')}
              {data.mutp?.section === 'fc' && renderPriceMarker(data.mutp, 'mutp-fc')}

              {/* ===== DTP/MDTP MARKERS (below FC if in FC section) ===== */}
              {data.dtp?.section === 'fc' && renderPriceMarker(data.dtp, 'dtp-fc')}
              {data.mdtp?.section === 'fc' && renderPriceMarker(data.mdtp, 'mdtp-fc')}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default TradingPlan;
