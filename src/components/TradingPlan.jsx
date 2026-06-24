import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, AlertCircle, ChevronDown, ChevronUp, Clock, FileText, Wifi, WifiOff, RefreshCw, X } from 'lucide-react';
import api from '../services/api';
import { transformApiDataToTradingPlan } from '../utils/tradingPlanTransformer';

const FIB_LEVELS = [
  '14.60%', '23.60%', '38.20%', '61.80%', '100.00%',
  '138.20%', '161.80%', '261.80%', '423.60%'
];

const TIMEFRAME_DISPLAY_NAMES = {
  M5: '5 Min', M15: '15 Min', M30: '30 Min',
  H1: '1 Hour', H4: '4 Hours', H5: '5 Hours', '5H+': '5H+',
  D1: 'Daily', W1: 'Weekly', MN1: 'Monthly',
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
  // Each entry: { value: "YYYY-MM-DD HH:MM:SS", display: "HH:MM:SS - HH:MM:SS" }
  const [availableTimestamps, setAvailableTimestamps] = useState([]);
  const [isLoadingTimestamps, setIsLoadingTimestamps] = useState(false);
  const [planData, setPlanData] = useState(null);
  const [error, setError] = useState('');

  // API integration state
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [apiData, setApiData] = useState(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const latestPlanReloadTimerRef = useRef(null);
  const lastFormingBarRef = useRef({ timeframe: null, timestamp: null });  // Track {timeframe, timestamp} — timeframe-aware to avoid false isNewBar on switch
  const isLiveModeRef = useRef(false);

  const timeframes = ['M5', 'M15', 'M30', 'H1', 'H4', 'H5', '5H+', 'D1', 'W1', 'MN1'];

  // Minutes per timeframe period
  const TF_MINUTES = {
    M5: 5, M15: 15, M30: 30,
    H1: 60, H4: 240, H5: 300, '5H+': 300,
    D1: 1440, W1: 10080, MN1: 43200,
  };

  // Fetch real DB timestamps when date or timeframe changes.
  // Only slots that exist in the database are shown — no synthetic generation.
  useEffect(() => {
    if (!selectedDate || !selectedTimeframe) {
      setAvailableTimestamps([]);
      setSelectedTimestamp('');
      return;
    }
    let cancelled = false;
    setIsLoadingTimestamps(true);
    setAvailableTimestamps([]);
    setSelectedTimestamp('');

    api.getCalculatedValuesTimestamps('XAUUSD', selectedTimeframe, selectedDate)
      .then(resp => {
        if (cancelled) return;
        if (resp.success && resp.timestamps.length > 0) {
          const tfMins = TF_MINUTES[selectedTimeframe] || 60;
          // Build display label "HH:MM:SS - HH:MM:SS" from the bar's broker timestamp
          const slots = resp.timestamps.map(ts => {
            const timePart = ts.label.split(' ')[1]; // "HH:MM:SS"
            const [h, m] = timePart.split(':').map(Number);
            const startMins = h * 60 + m;
            const endMins   = startMins + tfMins - 1;
            const eh  = String(Math.floor(Math.min(endMins, 1439) / 60)).padStart(2, '0');
            const em  = String(Math.min(endMins % 60, 59)).padStart(2, '0');
            return { value: ts.value, display: `${timePart} - ${eh}:${em}:59` };
          });
          setAvailableTimestamps(slots);
          setSelectedTimestamp(slots[0].display);
        } else {
          setAvailableTimestamps([]);
        }
      })
      .catch(() => { if (!cancelled) setAvailableTimestamps([]); })
      // Always clear the loading spinner — even if cancelled (superseded request) we
      // must not leave the button frozen. The new effect will re-set it to true if needed.
      .finally(() => setIsLoadingTimestamps(false));

    return () => { cancelled = true; };
  }, [selectedDate, selectedTimeframe]);

  const glassStyle = {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
  };

  // Return the actual DB bar timestamp for the currently selected slot.
  const getSelectedSlotValue = () => {
    if (!selectedTimestamp) return null;
    const slot = availableTimestamps.find(s => s.display === selectedTimestamp);
    return slot ? slot.value : null;
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

    // Fetch from API using the exact bar timestamp from the DB slot.
    setIsLoadingApi(true);
    try {
      const slotValue = getSelectedSlotValue(); // "YYYY-MM-DD HH:MM:SS" — exact broker bar timestamp
      if (!slotValue) {
        setError('Selected time slot not found. Please select again.');
        setIsLoadingApi(false);
        return;
      }

      // Use the exact bar timestamp as the end boundary (timestamp_broker <= slotValue returns this bar).
      const response = await api.getCalculatedValues('XAUUSD', selectedTimeframe, {
        limit: 2,
        endDate: slotValue,
      });

      if (response.success && response.data.length > 0) {
        // response.data[0] = selected bar (the monitoring period, where trade logs are stored)
        // response.data[1] = previous bar (whose RC/FC levels were used for crossing detection)
        const selectedBar = response.data[0];
        const previousBar = response.data.length > 1 ? response.data[1] : response.data[0];

        // Use PREVIOUS bar's RC/FC levels for display (matches what trade logs used)
        const transformedData = transformApiDataToTradingPlan(previousBar);

        // Market data row: show selected bar's values (like forming bar in live mode)
        transformedData.marketData.high      = selectedBar.high  ?? transformedData.marketData.high;
        transformedData.marketData.low       = selectedBar.low   ?? transformedData.marketData.low;
        transformedData.marketData.close     = selectedBar.close ?? transformedData.marketData.close;
        transformedData.marketData.last      = selectedBar.close ?? transformedData.marketData.last;
        transformedData.marketData.prevClose = previousBar.close ?? null;
        transformedData.marketData.d_pat     = selectedBar.d_pat  ?? transformedData.marketData.d_pat;

        setApiData(transformedData);

        // Store the selected bar's timestamp as the monitoring period (broker time for display)
        transformedData.formingBarTimestamp = selectedBar.timestamp_broker_formatted || selectedBar.timestamp_broker_formatted;

        // Fetch trade logs for the SELECTED bar (that's where logs are stored)
        try {
          const barTs = selectedBar.timestamp_broker_formatted;
          if (barTs) {
            const logsResp = await api.getTradeLogs('XAUUSD', selectedTimeframe, barTs);
            if (logsResp.success && logsResp.logs) {
              transformedData.tradeLogs = logsResp.logs;
            }
          }
        } catch (logErr) {
          console.warn('[TradeLogs] Fetch failed (historical):', logErr);
        }

        setPlanData(transformedData);
      } else {
        setError(`No data available for ${getSelectedSlotValue() || selectedTimestamp} at ${getTimeframeDisplayName(selectedTimeframe)}`);
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
  // Treat the broker timestamp string as UTC (append 'Z') so arithmetic is
  // performed in UTC regardless of the browser's local timezone.
  // Broker timestamps have no DST; UTC arithmetic preserves wall-clock values exactly.
  const getNextBarTimestamp = (completedTimestamp, timeframe) => {
    if (!completedTimestamp) return null;
    const date = new Date(completedTimestamp.replace(' ', 'T') + 'Z');
    const mins = TF_MINUTES[timeframe] || 60;
    date.setUTCMinutes(date.getUTCMinutes() + mins);
    const y   = date.getUTCFullYear();
    const m   = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d   = String(date.getUTCDate()).padStart(2, '0');
    const h   = String(date.getUTCHours()).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    const s   = String(date.getUTCSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  };

  const hasRcValues = (bar) => {
    const rc = bar?.rising_channel;
    return rc && Object.values(rc).some(v => v !== null && v !== undefined && v !== 0);
  };

  // Fetch latest trading plan data (for live mode)
  const loadLatestPlan = async () => {
    setIsLoadingApi(true);
    setError('');

    try {
      // Fetch 2 bars: offset-0 may be the forming bar (zeros), offset-1 is the completed bar
      const response = await api.getCalculatedValues('XAUUSD', selectedTimeframe, {
        limit: 2,
        offset: 0,
      });

      if (response.success && response.data.length > 0) {
        // Skip forming bar if it has no computed RC/FC values yet
        const completedBar =
          (response.data.length > 1 && !hasRcValues(response.data[0]))
            ? response.data[1]
            : response.data[0];

        // Display the completed bar's RC/FC levels (matches what backend uses for crossing detection)
        const transformedData = transformApiDataToTradingPlan(completedBar);
        setApiData(transformedData);

        // Derive the FORMING bar's timestamp from the completed bar's timestamp
        // Trade logs are stored with this timestamp (the bar where crossings occur) — keep in UTC for API calls
        const formingBarTs = getNextBarTimestamp(completedBar.timestamp_broker_formatted, selectedTimeframe);

        // For display, derive from broker time (UTC+3) so the label matches MT5
        const formingBarTs_display = getNextBarTimestamp(
          completedBar.timestamp_broker_formatted || completedBar.timestamp_broker_formatted,
          selectedTimeframe
        );
        transformedData.formingBarTimestamp = formingBarTs_display;

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
          console.warn('[TradeLogs] Fetch failed for forming bar:', logErr, '| timestamp:', formingBarTs);
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

    const wsToken = api.getToken();
    const ws = new WebSocket(`${WS_BASE_URL}/calculated-values/ws${wsToken ? `?token=${wsToken}` : ''}`);

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
        const dataWithFormingFlag = { ...message.data, is_forming: message.is_forming, tick: message.tick, forming_bar: message.forming_bar };
        const transformedData = transformApiDataToTradingPlan(dataWithFormingFlag);
        setApiData(transformedData);

        // Detect new bar: only trigger when the completed bar's timestamp changes
        // on the SAME timeframe — prevents false positives when switching timeframes.
        const formingBarTimestamp = transformedData.timestamp;
        const lastBar = lastFormingBarRef.current;
        const isNewBar = lastBar.timeframe === selectedTimeframe &&
                         lastBar.timestamp !== null &&
                         lastBar.timestamp !== formingBarTimestamp;
        lastFormingBarRef.current = { timeframe: selectedTimeframe, timestamp: formingBarTimestamp };

        // Only update the displayed plan when in live mode
        // Don't overwrite historical data the user is viewing
        if (isLiveModeRef.current) {
          setPlanData((currentPlan) => {
            if (!currentPlan) return currentPlan;

            if (isNewBar) {
              // New bar just opened — the forming bar has no RC/FC yet.
              // Keep the existing RC/FC levels (they're still valid for crossing detection)
              // and only reset market data + trade logs. loadLatestPlan() runs in parallel
              // and will overwrite with the completed bar's values once the DB is ready.
              return {
                ...currentPlan,
                marketData: transformedData.marketData,
                tradeLogs: [],
              };
            }

            // Forming bar only updates live price fields — RC/FC always come from the
            // previous completed bar loaded via loadLatestPlan, never from the WS.
            const md = transformedData.marketData;
            return {
              ...currentPlan,
              marketData: {
                ...currentPlan.marketData,
                open:   md?.open   ?? currentPlan.marketData?.open,
                high:   md?.high   ?? currentPlan.marketData?.high,
                low:    md?.low    ?? currentPlan.marketData?.low,
                last:   md?.last   ?? currentPlan.marketData?.last,
                close:  null,   // forming bar has no close yet
                bid:    md?.bid    ?? currentPlan.marketData?.bid,
                ask:    md?.ask    ?? currentPlan.marketData?.ask,
                spread: md?.spread ?? currentPlan.marketData?.spread,
                d_pat:  md?.d_pat  ?? currentPlan.marketData?.d_pat,
              },
            };
          });
        }

        // New bar: reload from API to get the just-closed bar's computed RC/FC values.
        // A single 3-second delay lets the backend finish computing CV before the
        // fetch, without scheduling a second speculative call 15 seconds later that
        // would overlap with the 60-second periodic refresh and generate redundant
        // API traffic on every bar boundary.
        if (isNewBar) {
          if (latestPlanReloadTimerRef.current) clearTimeout(latestPlanReloadTimerRef.current);
          latestPlanReloadTimerRef.current = setTimeout(() => {
            loadLatestPlan();
            latestPlanReloadTimerRef.current = null;
          }, 3000);
        }
      } else if (message.type === 'trade_log') {
        // Only append live trade logs when in live mode
        if (isLiveModeRef.current) {
          setPlanData((prevPlan) => {
            if (!prevPlan) return prevPlan;
            const newLogs = message.logs || [];

            // Check if logs belong to the current forming bar
            const messageBarTs = message.bar_timestamp_broker;
            const currentBarTs = prevPlan.formingBarTimestamp;

            // If bar timestamp changed, clear old logs and start fresh
            let existingLogs = prevPlan.tradeLogs || [];
            if (messageBarTs && currentBarTs && messageBarTs !== currentBarTs) {
              existingLogs = [];
            }

            // Deduplicate by creating a unique key from time + type + message
            const existingKeys = new Set(
              existingLogs.map((log) => `${log.time}|${log.type}|${log.message}`)
            );
            const uniqueNewLogs = newLogs.filter(
              (log) => !existingKeys.has(`${log.time}|${log.type}|${log.message}`)
            );

            if (uniqueNewLogs.length === 0 && existingLogs.length === (prevPlan.tradeLogs || []).length) return prevPlan;
            return { ...prevPlan, tradeLogs: [...existingLogs, ...uniqueNewLogs] };
          });
        }
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
      if (isLiveModeRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      }
    };

    wsRef.current = ws;
  }, [selectedTimeframe]);

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

  // Periodic refresh in live mode: every 60 s, re-fetch the latest plan so the
  // monitoring timestamp stays current even if a bar-completion WebSocket event
  // was missed (e.g. after a server restart or a brief connectivity gap).
  useEffect(() => {
    if (!isLiveMode) return;
    const intervalId = setInterval(() => {
      loadLatestPlan();
    }, 60_000);
    return () => clearInterval(intervalId);
  }, [isLiveMode, selectedTimeframe]);

  // Keep isLiveModeRef in sync so WebSocket callbacks can read the current value
  // without stale closures and without calling setState as a side effect.
  useEffect(() => {
    isLiveModeRef.current = isLiveMode;
  }, [isLiveMode]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-100 mb-2">
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
            className="input-dark min-w-[180px] focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
          />
        </div>

        {/* Timeframe Dropdown */}
        <div className="relative z-[100]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Select Timeframe
          </label>
          <button
            onClick={() => setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen)}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-white/[0.08] text-gray-100 text-sm font-medium min-w-[130px] hover:border-emerald-500/40 transition-colors focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <span>{getTimeframeDisplayName(selectedTimeframe)}</span>
            <ChevronDown size={18} className={`transition-transform text-gray-400 ${isTimeframeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTimeframeDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-full rounded-xl border border-white/[0.08] shadow-xl z-[9999] max-h-60 overflow-y-auto" style={{ background: '#0d1421' }}>
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setSelectedTimeframe(tf);
                    setIsTimeframeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
                    selectedTimeframe === tf ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-100'
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
            disabled={availableTimestamps.length === 0 || isLoadingTimestamps}
            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-white/[0.08] text-gray-100 text-sm font-medium min-w-[200px] hover:border-emerald-500/40 transition-colors focus:outline-none ${
              (availableTimestamps.length === 0 || isLoadingTimestamps) ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-gray-500" />
              <span className="truncate">
                {isLoadingTimestamps ? 'Loading...' : selectedTimestamp || 'Select time...'}
              </span>
            </div>
            <ChevronDown size={18} className={`transition-transform flex-shrink-0 text-gray-400 ${isTimestampDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTimestampDropdownOpen && availableTimestamps.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full rounded-xl border border-white/[0.08] shadow-xl z-[9999] max-h-60 overflow-y-auto" style={{ background: '#0d1421' }}>
              {availableTimestamps.map((slot) => (
                <button
                  key={slot.value}
                  onClick={() => {
                    setSelectedTimestamp(slot.display);
                    setIsTimestampDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl font-mono ${
                    selectedTimestamp === slot.display ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-100'
                  }`}
                >
                  {slot.display}
                </button>
              ))}
            </div>
          )}
        </div>

        <motion.button
          onClick={handleLoadPlan}
          className="btn-accent flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Calendar size={18} />
          {isLoadingApi ? 'Loading...' : 'Load Plan'}
        </motion.button>

        {/* Mode Indicator */}
        {planData && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm ${
            isLiveMode ? 'badge-connected' : 'badge-checking'
          }`}>
            {isLiveMode ? (
              <>
                {wsConnected ? <Wifi size={16} className="animate-pulse" /> : <WifiOff size={16} />}
                <span className="font-semibold">LIVE MODE</span>
                {wsConnected && <span className="text-xs opacity-80">• Connected</span>}
                {planData?.formingBarTimestamp && <span className="text-xs opacity-70 ml-1">| Monitoring: {planData.formingBarTimestamp}</span>}
              </>
            ) : (
              <>
                <Clock size={16} />
                <span className="font-semibold">HISTORICAL</span>
                <span className="text-xs opacity-80">• {planData?.formingBarTimestamp || planData?.timestamp || 'Last available'}</span>
              </>
            )}
          </div>
        )}

        {/* Back to Live Button */}
        {planData && !isLiveMode && (
          <motion.button
            onClick={() => {
              setSelectedDate('');
              setSelectedTimestamp('');
              loadLatestPlan();
            }}
            className="btn-ghost-dark flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={16} />
            Back to Live
          </motion.button>
        )}

        {selectedDate && (
          <div className="text-xs text-gray-500 sm:ml-auto">
            {isLoadingTimestamps
              ? 'Loading timestamps...'
              : availableTimestamps.length > 0
                ? `${availableTimestamps.length} timestamps available`
                : 'No data for this date'}
          </div>
        )}
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Market Data Row */}
      {planData && <MarketDataRow data={planData.marketData} />}

      {/* Trade Activity Logs */}
      {planData && <TradeLogsSection logs={planData.tradeLogs} formingBarTimestamp={planData.formingBarTimestamp} />}

      {/* Trading Plan Diagram */}
      {planData && <TradingPlanDiagram data={planData} />}

      {!planData && !error && isLoadingApi && (
        <div className="card-dark p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 text-center">Loading latest trading plan...</p>
        </div>
      )}

      {!planData && !error && !isLoadingApi && (
        <div className="card-dark p-8 flex flex-col items-center justify-center min-h-[300px]">
          <Calendar className="w-12 h-12 text-gray-600 mb-4" />
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

const glassStyleShared = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
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
    { key: 'd_pat', label: 'D_PAT', format: (v) => v || '-' },
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
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
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
                    field.key === 'symbol' ? 'text-gray-100 font-bold' :
                    field.key === 'close' && data?.[field.key] === null ? 'text-emerald-400 font-bold' :
                    field.key === 'change' ? (data?.[field.key] >= 0 ? 'text-emerald-400' : 'text-red-400') :
                    'text-gray-300'
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
const TradeLogsSection = ({ logs, formingBarTimestamp }) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={glassStyleShared}
    >
      <button onClick={() => setOpen(v => !v)}
        className="w-full p-4 flex items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-gray-500" />
          <h3 className="font-semibold text-gray-100">Trade Activity Logs</h3>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="max-h-[200px] overflow-y-auto">
              {logs && logs.length > 0 ? (
                logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 px-4 py-2.5 last:border-0 hover:bg-white/[0.03] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-xs font-mono text-gray-500 whitespace-nowrap mt-0.5">{log.time}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                      log.type === 'CROSS_ABOVE' || log.type === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' :
                      log.type === 'CROSS_BELOW' || log.type === 'SELL' ? 'bg-red-500/15 text-red-400' :
                      'bg-white/[0.06] text-gray-400'
                    }`}>{log.type}</span>
                    <span className="text-sm text-gray-300">{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No crossings detected yet
                  {formingBarTimestamp && (
                    <span className="block text-xs text-gray-600 mt-1">Monitoring: {formingBarTimestamp}</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * Calculate which row index should be highlighted for each column
 * @param {Array} rows - Array of row objects with `values` arrays
 * @param {number} numColumns - Number of Fibonacci columns
 * @returns {Array<number>} - Array where index is column and value is the row to highlight (-1 if none)
 */
const calculateMiddleValueRows = (rows, numColumns) => {
  const middleRows = [];

  for (let colIdx = 0; colIdx < numColumns; colIdx++) {
    // Row 1 (index 1) is always the actual computed Fibonacci level — rows 0
    // and 2 (above/below) are just auxiliary reference bands around it, and
    // are absent for levels with no ABOVE/BELOW formula (e.g. 423.60%). It
    // must always be the highlighted row when present, regardless of whether
    // the above/below rows happen to have a value for this column.
    const midVal = rows[1]?.values[colIdx];
    if (midVal !== null && midVal !== undefined) {
      middleRows[colIdx] = 1;
      continue;
    }

    // Mid row has no value for this column — fall back to whichever row does.
    const fallbackIdx = rows.findIndex(
      (row) => row.values[colIdx] !== null && row.values[colIdx] !== undefined
    );
    middleRows[colIdx] = fallbackIdx;
  }

  return middleRows;
};

// The spreadsheet-style diagram
export const TradingPlanDiagram = ({ data }) => {
  const [mergedModal, setMergedModal] = useState({ open: false, bars: [], loading: false, error: null });

  const handleOpenMergedModal = async () => {
    const barTs = data.merged_ohlc?.current_bar_ts;
    if (!barTs) return;
    setMergedModal({ open: true, bars: [], loading: true, error: null });
    try {
      const json = await api.getConstituentBars(data.symbol, data.timeframe, barTs);
      setMergedModal({ open: true, bars: json.bars || [], loading: false, error: null });
    } catch {
      setMergedModal({ open: true, bars: [], loading: false, error: 'Failed to load constituent bars' });
    }
  };

  const glassStyle = {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
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
    <>
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
                  className="text-sm font-bold text-gray-950 p-2"
                  style={{ background: 'linear-gradient(to right, #fbbf24, #f59e0b)' }}
                >
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span>
                      {data.formingBarTimestamp ? `${data.formingBarTimestamp.slice(11, 16)}` : ''} {data.timeframe} TRADING PLAN
                    </span>
                    {data.merged && (
                      <span
                        title={
                          data.merged_ohlc
                            ? `Merged candle  H: ${formatPrice(data.merged_ohlc.high)}  L: ${formatPrice(data.merged_ohlc.low)}  C: ${formatPrice(data.merged_ohlc.close)}  — Click to see all merged bars`
                            : 'This bar was merged with the previous bar — click to see details'
                        }
                        onClick={(e) => { e.stopPropagation(); handleOpenMergedModal(); }}
                        style={{
                          background: '#7c3aed',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        ⛓ MERGED
                        {data.merged_ohlc && (
                          <span style={{ fontWeight: 400, marginLeft: 6 }}>
                            H:{formatPrice(data.merged_ohlc.high)} L:{formatPrice(data.merged_ohlc.low)} C:{formatPrice(data.merged_ohlc.close)}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
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
                              : 'text-gray-200'
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
                <td colSpan={9} className="h-10" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </tr>

              {/* ===== CENTER MARKERS (UTP/DTP/MUTP/MDTP if in center) ===== */}
              {data.utp?.section === 'center' && renderPriceMarker(data.utp, 'utp-center')}
              {data.mutp?.section === 'center' && renderPriceMarker(data.mutp, 'mutp-center')}
              {data.dtp?.section === 'center' && renderPriceMarker(data.dtp, 'dtp-center')}
              {data.mdtp?.section === 'center' && renderPriceMarker(data.mdtp, 'mdtp-center')}

              {/* ===== MIDDLE REFERENCE SECTION ===== */}
              {/* Three compact panels on one centered row: ABS-RANGE/BUFFER/PREV CLOSE, the new
                  NEW HIGH/NEW LOW/ACTION/D_PAT panel, and the existing BDP-WDP reference levels panel. */}
              <tr>
                <td colSpan={9} className="p-0">
                  <div className="flex items-center justify-center gap-12 py-4">
                    {/* ABS-RANGE / BUFFER / PREV CLOSE — narrowed to fit its content */}
                    <table style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td colSpan={2} className="bg-green-300 text-[12px] font-bold text-gray-900 px-3 py-1.5 text-center whitespace-nowrap">ABS-RANGE</td>
                          <td className="bg-green-300 text-[12px] font-bold text-gray-900 px-3 py-1.5 text-center whitespace-nowrap">BUFFER</td>
                          <td className="bg-green-300 text-[12px] font-bold text-gray-900 px-3 py-1.5 text-center whitespace-nowrap">PREV CLOSE</td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="bg-green-100 text-[13px] font-mono font-bold text-center px-3 py-1.5 text-green-900">
                            {formatPrice(data.middleValues?.absRange)}
                          </td>
                          <td className="bg-green-100 text-[13px] font-mono font-bold text-center px-3 py-1.5 text-green-900">
                            {formatPrice(data.middleValues?.buffer)}
                          </td>
                          <td className="bg-green-100 text-[13px] font-mono font-bold text-center px-3 py-1.5 text-green-900">
                            {formatPrice(data.middleValues?.prevClose)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* NEW HIGH / NEW LOW / ACTION / D_PAT — compact 4-column panel */}
                    <table style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td className="bg-green-300 text-[12px] font-bold text-gray-900 px-3 py-1.5 text-center whitespace-nowrap">NEW HIGH</td>
                          <td className="bg-green-300 text-[12px] font-bold text-gray-900 px-3 py-1.5 text-center whitespace-nowrap">NEW LOW</td>
                          <td className="bg-green-300 text-[12px] font-bold text-gray-900 px-3 py-1.5 text-center whitespace-nowrap">ACTION</td>
                          <td className="bg-green-300 text-[12px] font-bold text-gray-900 px-3 py-1.5 text-center whitespace-nowrap">D_PAT</td>
                        </tr>
                        <tr>
                          <td className="bg-green-100 text-[13px] font-mono font-bold text-center px-3 py-1.5 text-green-900">
                            {formatPrice(data.actionPanel?.newHigh) || '-'}
                          </td>
                          <td className="bg-green-100 text-[13px] font-mono font-bold text-center px-3 py-1.5 text-green-900">
                            {formatPrice(data.actionPanel?.newLow) || '-'}
                          </td>
                          <td
                            className={`bg-green-100 text-[13px] font-mono font-bold text-center px-3 py-1.5 ${
                              data.actionPanel?.action === 'BUY' ? 'text-emerald-700' :
                              data.actionPanel?.action === 'SELL' ? 'text-red-700' :
                              data.actionPanel?.action === 'HOLD' ? 'text-amber-700' :
                              data.actionPanel?.action === 'MERGED' ? 'text-gray-500' :
                              'text-green-900'
                            }`}
                          >
                            {data.actionPanel?.action || '-'}
                          </td>
                          <td className="bg-green-100 text-[13px] font-mono font-bold text-center px-3 py-1.5 text-green-900">
                            {data.actionPanel?.dPat || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Existing BDP-WDP / pattern reference levels panel */}
                    <table style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          {data.referenceLevels.headers.map((header) => (
                            <td key={header} className="bg-green-300 text-[12px] font-bold text-gray-900 px-3 py-1.5 text-center whitespace-nowrap">
                              {header}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          {data.referenceLevels.rows[0].map((val, i) => (
                            <td key={`ref-0-${i}`} className="bg-green-100 text-[13px] font-mono font-bold text-center px-3 py-1.5 text-green-900">
                              {val !== null ? formatPrice(val) : ''}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          {data.referenceLevels.rows[1].map((val, i) => (
                            <td key={`ref-1-${i}`} className="bg-green-100 text-[13px] font-mono font-bold text-center px-3 py-1.5 text-green-900">
                              {val !== null ? formatPrice(val) : ''}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>

              {/* ===== SPACER ROW BEFORE FC ===== */}
              <tr>
                <td colSpan={9} className="h-20" style={{ background: 'rgba(255,255,255,0.04)' }} />
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

    {/* ── Merged bar constituent modal ──────────────────────────────────── */}
    <AnimatePresence>
      {mergedModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMergedModal(m => ({ ...m, open: false }))}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-4xl max-h-[80vh] overflow-y-auto rounded-xl"
            style={{ background: '#1a1528', border: '1px solid rgba(124,58,237,0.35)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(124,58,237,0.2)' }}>
              <div>
                <h3 className="text-sm font-bold text-violet-300">⛓ Merged Bar Breakdown</h3>
                {!mergedModal.loading && !mergedModal.error && (
                  <p className="text-xs text-gray-500 mt-0.5">{mergedModal.bars.length} bars merged together</p>
                )}
              </div>
              <button
                onClick={() => setMergedModal(m => ({ ...m, open: false }))}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {mergedModal.loading && (
                <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
                  Loading constituent bars…
                </div>
              )}
              {mergedModal.error && (
                <div className="flex items-center justify-center py-10 text-red-400 text-sm">
                  {mergedModal.error}
                </div>
              )}
              {!mergedModal.loading && !mergedModal.error && mergedModal.bars.length > 0 && (() => {
                const bars = mergedModal.bars;
                const mergedHigh = Math.max(...bars.map(b => b.high ?? -Infinity));
                const mergedLow  = Math.min(...bars.map(b => b.low  ??  Infinity));
                let runH = -Infinity, runL = Infinity;
                const acc = bars.map(b => {
                  runH = Math.max(runH, b.high ?? -Infinity);
                  runL = Math.min(runL, b.low  ??  Infinity);
                  return { high: runH, low: runL, close: b.close };
                });
                const n = (v) => v != null ? v.toFixed(2) : '—';
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(124,58,237,0.25)' }}>
                          {['Time', 'D_Pat', 'Open', 'High', 'Low', 'Close', 'JGD', 'JWD', 'Acc.H', 'Acc.L', 'Acc.C'].map(h => (
                            <th key={h} className="text-left py-2 pr-4 text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bars.map((bar, i) => {
                          const isHighBar = bar.high === mergedHigh;
                          const isLowBar  = bar.low  === mergedLow;
                          const isLastBar = i === bars.length - 1;
                          return (
                            <tr key={bar.ts} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">
                                {bar.ts ? bar.ts.slice(11, 16) : '—'}
                              </td>
                              <td className="py-2 pr-4 text-violet-400">{bar.d_pat ?? '—'}</td>
                              <td className="py-2 pr-4 text-gray-400">{n(bar.open)}</td>
                              <td className="py-2 pr-4 font-bold rounded"
                                style={isHighBar
                                  ? { color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '2px 8px' }
                                  : { color: '#6ee7b7' }}>
                                {n(bar.high)}
                              </td>
                              <td className="py-2 pr-4 font-bold rounded"
                                style={isLowBar
                                  ? { color: '#f87171', background: 'rgba(248,113,113,0.12)', padding: '2px 8px' }
                                  : { color: '#fca5a5' }}>
                                {n(bar.low)}
                              </td>
                              <td className="py-2 pr-4 font-bold rounded"
                                style={isLastBar
                                  ? { color: '#a78bfa', background: 'rgba(167,139,250,0.14)', padding: '2px 8px' }
                                  : { color: '#d1d5db' }}>
                                {n(bar.close)}
                              </td>
                              <td className="py-2 pr-4 text-blue-400">{n(bar.jgd)}</td>
                              <td className="py-2 pr-4 text-red-400">{n(bar.jwd)}</td>
                              <td className="py-2 pr-4 text-emerald-500 font-semibold">{n(acc[i].high)}</td>
                              <td className="py-2 pr-4 text-rose-500 font-semibold">{n(acc[i].low)}</td>
                              <td className="py-2 pr-4 text-gray-300">{n(acc[i].close)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Legend */}
                    <div className="flex items-center gap-5 mt-4 pt-3 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="flex items-center gap-1.5">
                        <span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(74,222,128,0.25)', border: '1px solid #4ade80', borderRadius: 2 }} />
                        <span className="text-gray-400">Source of group High</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(248,113,113,0.25)', border: '1px solid #f87171', borderRadius: 2 }} />
                        <span className="text-gray-400">Source of group Low</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(167,139,250,0.25)', border: '1px solid #a78bfa', borderRadius: 2 }} />
                        <span className="text-gray-400">Source of Close (last bar)</span>
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
};

export default TradingPlan;
