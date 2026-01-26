import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TicksModal = ({ isOpen, onClose, initialSymbol = 'XAUUSD' }) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [tickType, setTickType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ticks, setTicks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [symbols, setSymbols] = useState([]);

  // Set default dates (last 1 minute)
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      setEndDate(formatDateTimeLocal(now));
      setStartDate(formatDateTimeLocal(oneMinuteAgo));

      fetchSymbols();
    }
  }, [isOpen]);

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

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

  const handleRequest = async () => {
    if (!symbol || !startDate || !endDate) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setTicks([]);

    try {
      // Convert to ISO format for API
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate).toISOString();

      const response = await fetch(
        `${API_BASE_URL}/symbols/${symbol}/ticks?start_time=${startISO}&end_time=${endISO}&tick_type=${tickType}`
      );
      const data = await response.json();

      if (data.success && data.ticks) {
        setTicks(data.ticks);
      } else {
        setError(data.message || 'No ticks data available');
      }
    } catch (err) {
      console.error('Error fetching ticks:', err);
      setError('Failed to fetch ticks data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportTicks = () => {
    if (ticks.length === 0) {
      alert('No ticks data to export');
      return;
    }

    // Create CSV content
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

    // Download CSV
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              height: '85vh',
              zIndex: 9999,
            }}
            className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-300">
              <h2 className="text-base font-semibold text-gray-900">
                {symbol}: {ticks.length} ticks
              </h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-300">
              {/* Symbol Dropdown */}
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Symbol</option>
                {symbols.map((sym) => (
                  <option key={sym.name} value={sym.name}>
                    {sym.name}
                  </option>
                ))}
              </select>

              {/* Tick Type Dropdown */}
              <select
                value={tickType}
                onChange={(e) => setTickType(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All ticks</option>
                <option value="bid_ask">Bid/Ask ticks</option>
                <option value="last_volume">Last/Volume ticks</option>
              </select>

              {/* Start Date */}
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                step="1"
                className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* End Date */}
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                step="1"
                className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Request Button */}
              <button
                onClick={handleRequest}
                disabled={isLoading}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Request'}
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

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-300">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportTicks}
                  disabled={ticks.length === 0}
                  className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export Ticks
                </button>
                <button
                  disabled
                  className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded opacity-50 cursor-not-allowed"
                >
                  Import Ticks
                </button>
                <button
                  disabled
                  className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded opacity-50 cursor-not-allowed"
                >
                  Create Custom Symbol
                </button>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TicksModal;
