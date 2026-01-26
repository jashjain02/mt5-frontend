import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, AlertCircle, TrendingUp, TrendingDown, BarChart3, FileText, Activity } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SymbolsModal = ({ isOpen, onClose, symbol: initialSymbol = 'XAUUSD', initialTab = 'ticks' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [symbols, setSymbols] = useState([]);

  // Reset symbol when modal opens with new symbol
  useEffect(() => {
    if (isOpen && initialSymbol) {
      setSymbol(initialSymbol);
    }
  }, [isOpen, initialSymbol]);

  // Fetch symbols list
  useEffect(() => {
    if (isOpen) {
      fetchSymbols();
    }
  }, [isOpen]);

  const fetchSymbols = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/symbols`);
      const data = await response.json();
      if (data.success && data.symbols) {
        setSymbols(data.symbols);
      }
    } catch (err) {
      console.error('Error fetching symbols:', err);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'ticks', label: 'Ticks', icon: Activity },
    { id: 'bars', label: 'Bars', icon: BarChart3 },
    { id: 'specification', label: 'Specification', icon: FileText }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              height: '85vh',
              zIndex: 9999,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden h-full"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-300">
              <h2 className="text-base font-semibold text-gray-900">
                {symbol}
              </h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-300">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }
                    `}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'ticks' && (
                <TicksTab symbol={symbol} symbols={symbols} onSymbolChange={setSymbol} />
              )}
              {activeTab === 'bars' && (
                <BarsTab symbol={symbol} symbols={symbols} onSymbolChange={setSymbol} />
              )}
              {activeTab === 'specification' && (
                <SpecificationTab symbol={symbol} />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-4 py-2 bg-gray-50 border-t border-gray-300">
              <button
                onClick={onClose}
                className="px-5 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// Ticks Tab Component
// ============================================================================

const TicksTab = ({ symbol, symbols, onSymbolChange }) => {
  const [tickType, setTickType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ticks, setTicks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Set default dates (last 30 days for better data availability)
  useEffect(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    setEndDate(formatDateTimeLocal(now));
    setStartDate(formatDateTimeLocal(thirtyDaysAgo));
  }, []);

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const handleRequest = async () => {
    if (!symbol || !startDate || !endDate) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setTicks([]);

    try {
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate).toISOString();

      console.log('Requesting ticks:', { symbol, tickType, startISO, endISO });

      const response = await fetch(
        `${API_BASE_URL}/symbols/${symbol}/ticks?start_time=${startISO}&end_time=${endISO}&tick_type=${tickType}`
      );
      const data = await response.json();

      console.log('Ticks API response:', data);

      if (data.success && data.ticks && data.ticks.length > 0) {
        console.log('First tick sample:', data.ticks[0]);
        console.log('Total ticks received:', data.ticks.length);
        setTicks(data.ticks);
      } else {
        const errorMsg = data.error || data.message || 'No ticks data available for the selected date range';
        console.error('No ticks data:', errorMsg);
        setError(`${errorMsg}. Ensure MT5 is connected and try selecting a recent date range when markets were open.`);
      }
    } catch (err) {
      console.error('Error fetching ticks:', err);
      setError(`Failed to fetch ticks data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportTicks = () => {
    if (ticks.length === 0) {
      alert('No ticks data to export');
      return;
    }

    const headers = ['Date', 'Bid', 'Ask', 'Last', 'Volume', 'Flags'];
    const csvContent = [
      headers.join(','),
      ...ticks.map(tick => [
        tick.time_uk_formatted || new Date(tick.time * 1000).toISOString(),
        tick.bid || '',
        tick.ask || '',
        tick.last || '',
        tick.volume || '',
        tick.flags || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${symbol}_ticks_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-300">
        <select
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Symbol</option>
          {symbols.map((sym) => (
            <option key={sym.name} value={sym.name}>
              {sym.name}
            </option>
          ))}
        </select>

        <select
          value={tickType}
          onChange={(e) => setTickType(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All ticks</option>
          <option value="bid_ask">Bid/Ask ticks</option>
          <option value="last_volume">Last/Volume ticks</option>
        </select>

        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          step="1"
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          step="1"
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleRequest}
          disabled={isLoading}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Request'}
        </button>

        <button
          onClick={handleExportTicks}
          disabled={ticks.length === 0}
          className="ml-auto px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export Ticks
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Ticks Table */}
      <div className="flex-1 overflow-auto bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-3" />
            <span className="text-gray-500">Loading ticks data...</span>
          </div>
        ) : ticks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
            <span className="text-gray-500">No ticks data available</span>
            <span className="text-gray-400 text-sm mt-2">Select symbol and time range, then click Request</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Bid</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Ask</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Last</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Volume</th>
                <th className="text-center py-2 px-4 font-semibold text-gray-700">Flags</th>
              </tr>
            </thead>
            <tbody>
              {ticks.map((tick, index) => {
                const prevTick = index > 0 ? ticks[index - 1] : null;
                const bidChange = prevTick ? tick.bid - prevTick.bid : 0;
                const askChange = prevTick ? tick.ask - prevTick.ask : 0;

                return (
                  <tr
                    key={index}
                    className="border-b border-gray-200 hover:bg-blue-50 transition-colors"
                  >
                    <td className="py-1.5 px-4 text-gray-900 font-mono text-xs">
                      {tick.time_uk_formatted || new Date(tick.time * 1000).toLocaleString('en-GB')}
                    </td>
                    <td className="py-1.5 px-4 text-right text-gray-900 font-mono">
                      <div className="flex items-center justify-end gap-1">
                        {tick.bid ? tick.bid.toFixed(5) : '-'}
                        {bidChange > 0 && <TrendingUp size={12} className="text-green-600" />}
                        {bidChange < 0 && <TrendingDown size={12} className="text-red-600" />}
                      </div>
                    </td>
                    <td className="py-1.5 px-4 text-right text-gray-900 font-mono">
                      <div className="flex items-center justify-end gap-1">
                        {tick.ask ? tick.ask.toFixed(5) : '-'}
                        {askChange > 0 && <TrendingUp size={12} className="text-green-600" />}
                        {askChange < 0 && <TrendingDown size={12} className="text-red-600" />}
                      </div>
                    </td>
                    <td className="py-1.5 px-4 text-right text-gray-900 font-mono">
                      {tick.last ? tick.last.toFixed(5) : '-'}
                    </td>
                    <td className="py-1.5 px-4 text-right text-gray-900">
                      {tick.volume || '-'}
                    </td>
                    <td className="py-1.5 px-4 text-center text-gray-900">
                      {tick.flags || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Bars Tab Component
// ============================================================================

const BarsTab = ({ symbol, symbols, onSymbolChange }) => {
  const [timeframe, setTimeframe] = useState('H1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bars, setBars] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'H5', 'D1', 'W1', 'MN1'];

  // Set default dates (last 7 days to ensure we get data even if markets are closed)
  useEffect(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    setEndDate(formatDateTimeLocal(now));
    setStartDate(formatDateTimeLocal(sevenDaysAgo));
  }, []);

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const handleRequest = async () => {
    if (!symbol || !startDate || !endDate) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setBars([]);

    try {
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate).toISOString();

      console.log('Requesting bars:', { symbol, timeframe, startISO, endISO });

      const response = await fetch(
        `${API_BASE_URL}/symbols/${symbol}/bars?timeframe=${timeframe}&start_time=${startISO}&end_time=${endISO}`
      );
      const data = await response.json();

      console.log('Bars API response:', data);

      if (data.success && data.bars && data.bars.length > 0) {
        console.log('First bar sample:', data.bars[0]);
        console.log('Total bars received:', data.bars.length);
        setBars(data.bars);
      } else {
        // If date range returns no data, show detailed error
        const errorMsg = data.error || data.message || 'No bars data available for the selected date range';
        console.error('No bars data:', errorMsg);
        setError(`${errorMsg}. Try selecting a different date range or check if markets were open during this period.`);
      }
    } catch (err) {
      console.error('Error fetching bars:', err);
      setError(`Failed to fetch bars data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportBars = () => {
    if (bars.length === 0) {
      alert('No bars data to export');
      return;
    }

    const headers = ['Time', 'Open', 'High', 'Low', 'Close', 'Volume', 'Spread'];
    const csvContent = [
      headers.join(','),
      ...bars.map(bar => [
        new Date(bar.time * 1000).toISOString(),
        bar.open || '',
        bar.high || '',
        bar.low || '',
        bar.close || '',
        bar.tick_volume || '',
        bar.spread || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${symbol}_bars_${timeframe}_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-300">
        <select
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Symbol</option>
          {symbols.map((sym) => (
            <option key={sym.name} value={sym.name}>
              {sym.name}
            </option>
          ))}
        </select>

        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {timeframes.map((tf) => (
            <option key={tf} value={tf}>
              {tf}
            </option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          step="1"
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          step="1"
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleRequest}
          disabled={isLoading}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Request'}
        </button>

        <button
          onClick={handleExportBars}
          disabled={bars.length === 0}
          className="ml-auto px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export Bars
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Bars Table */}
      <div className="flex-1 overflow-auto bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-3" />
            <span className="text-gray-500">Loading bars data...</span>
          </div>
        ) : bars.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
            <span className="text-gray-500">No bars data available</span>
            <span className="text-gray-400 text-sm mt-2">Select symbol and timeframe, then click Request</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Time</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Open</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">High</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Low</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Close</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Volume</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Spread</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((bar, index) => {
                // Handle different timestamp formats
                let timeStr = '-';
                try {
                  if (bar.time) {
                    // Check if time is a number (Unix timestamp)
                    const timestamp = typeof bar.time === 'number' ? bar.time * 1000 :
                                    // Check if it's a string that looks like Unix timestamp
                                    !isNaN(bar.time) ? parseInt(bar.time) * 1000 :
                                    // Otherwise try to parse as ISO string
                                    new Date(bar.time).getTime();

                    if (!isNaN(timestamp)) {
                      timeStr = new Date(timestamp).toLocaleString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      });
                    }
                  }
                } catch (e) {
                  console.error('Error formatting bar time:', e, bar);
                }

                return (
                <tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-blue-50 transition-colors"
                >
                  <td className="py-1.5 px-4 text-gray-900 font-mono text-xs">
                    {timeStr}
                  </td>
                  <td className="py-1.5 px-4 text-right text-gray-900 font-mono">
                    {bar.open ? bar.open.toFixed(5) : '-'}
                  </td>
                  <td className="py-1.5 px-4 text-right text-green-600 font-mono font-semibold">
                    {bar.high ? bar.high.toFixed(5) : '-'}
                  </td>
                  <td className="py-1.5 px-4 text-right text-red-600 font-mono font-semibold">
                    {bar.low ? bar.low.toFixed(5) : '-'}
                  </td>
                  <td className="py-1.5 px-4 text-right text-gray-900 font-mono">
                    {bar.close ? bar.close.toFixed(5) : '-'}
                  </td>
                  <td className="py-1.5 px-4 text-right text-gray-900">
                    {bar.tick_volume || bar.volume || '-'}
                  </td>
                  <td className="py-1.5 px-4 text-right text-gray-900">
                    {bar.spread || '-'}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Specification Tab Component
// ============================================================================

const SpecificationTab = ({ symbol }) => {
  const [specData, setSpecData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (symbol) {
      fetchSpecification();
    }
  }, [symbol]);

  const fetchSpecification = async () => {
    setIsLoading(true);
    setError('');
    setSpecData(null);

    try {
      const response = await fetch(`${API_BASE_URL}/symbols/${symbol}`);
      const data = await response.json();

      console.log('Specification API response:', data);

      if (data.success && data.symbol) {
        console.log('Symbol data:', data.symbol);
        setSpecData(data.symbol);
      } else {
        setError(data.message || data.error || 'No specification data available');
      }
    } catch (err) {
      console.error('Error fetching specification:', err);
      setError('Failed to fetch specification data');
    } finally {
      setIsLoading(false);
    }
  };

  const SpecRow = ({ label, value }) => {
    // Display the value, handling 0 as valid, but null/undefined as '-'
    let displayValue = '-';
    if (value !== null && value !== undefined) {
      displayValue = value;
    }

    return (
      <div className="flex items-center py-2 px-4 border-b border-gray-200 hover:bg-gray-50">
        <div className="w-1/3 text-sm font-medium text-gray-600">{label}</div>
        <div className="w-2/3 text-sm text-gray-900 font-mono">{displayValue}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-3" />
          <span className="text-gray-500">Loading specification...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <span className="text-red-600">{error}</span>
        </div>
      ) : !specData ? (
        <div className="flex flex-col items-center justify-center h-full">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
          <span className="text-gray-500">No specification data available</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white">
          {/* General Information */}
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-300">
            <h3 className="text-sm font-semibold text-gray-700">General Information</h3>
          </div>
          <SpecRow label="Symbol" value={specData.name} />
          <SpecRow label="Description" value={specData.description} />
          <SpecRow label="Path" value={specData.path} />
          <SpecRow label="Currency Base" value={specData.currency_base} />
          <SpecRow label="Currency Profit" value={specData.currency_profit} />
          <SpecRow label="Currency Margin" value={specData.currency_margin} />

          {/* Trading Information */}
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-300 mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Trading Information</h3>
          </div>
          <SpecRow label="Trade Mode" value={specData.trade_mode} />
          <SpecRow label="Trade Contract Size" value={specData.trade_contract_size} />
          <SpecRow label="Digits" value={specData.digits} />
          <SpecRow label="Point" value={specData.point} />
          <SpecRow label="Spread" value={specData.spread} />
          <SpecRow label="Stops Level" value={specData.trade_stops_level} />
          <SpecRow label="Freeze Level" value={specData.trade_freeze_level} />

          {/* Volume Information */}
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-300 mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Volume</h3>
          </div>
          <SpecRow label="Volume Min" value={specData.volume_min} />
          <SpecRow label="Volume Max" value={specData.volume_max} />
          <SpecRow label="Volume Step" value={specData.volume_step} />
          <SpecRow label="Volume Limit" value={specData.volume_limit} />

          {/* Swap Information */}
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-300 mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Swap</h3>
          </div>
          <SpecRow label="Swap Long" value={specData.swap_long} />
          <SpecRow label="Swap Short" value={specData.swap_short} />
          <SpecRow label="Swap Mode" value={specData.swap_mode} />
          <SpecRow label="Swap Rollover 3 Days" value={specData.swap_rollover3days} />

          {/* Margin Information */}
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-300 mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Margin</h3>
          </div>
          <SpecRow label="Margin Initial" value={specData.margin_initial} />
          <SpecRow label="Margin Maintenance" value={specData.margin_maintenance} />
          <SpecRow label="Margin Long" value={specData.margin_long} />
          <SpecRow label="Margin Short" value={specData.margin_short} />
          <SpecRow label="Margin Limit" value={specData.margin_limit} />
          <SpecRow label="Margin Stop" value={specData.margin_stop} />
          <SpecRow label="Margin Stop Limit" value={specData.margin_stoplimit} />

          {/* Session Information */}
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-300 mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Session</h3>
          </div>
          <SpecRow label="Session Deals" value={specData.session_deals} />
          <SpecRow label="Session Buy Orders" value={specData.session_buy_orders} />
          <SpecRow label="Session Sell Orders" value={specData.session_sell_orders} />
          <SpecRow label="Session Turnover" value={specData.session_turnover} />
          <SpecRow label="Session Interest" value={specData.session_interest} />

          {/* Price Information */}
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-300 mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Current Prices</h3>
          </div>
          <SpecRow label="Bid" value={specData.bid} />
          <SpecRow label="Ask" value={specData.ask} />
          <SpecRow label="Last" value={specData.last} />
          <SpecRow label="Volume" value={specData.volume} />
        </div>
      )}
    </div>
  );
};

export default SymbolsModal;
