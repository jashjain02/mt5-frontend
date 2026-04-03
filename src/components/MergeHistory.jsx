import { useState } from 'react';
import { motion } from 'framer-motion';
import { GitMerge, RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../services/api';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'H5', 'D1', 'W1', 'MN1'];
const LIMIT = 50;

const glassStyle = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.3)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

export default function MergeHistory() {
  const [symbol, setSymbol]       = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [filter, setFilter]       = useState('all');   // 'all' | 'merged' | 'action'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [offset, setOffset]       = useState(0);

  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [loaded, setLoaded] = useState(false);

  const actionOnly =
    filter === 'merged' ? false :
    filter === 'action' ? true  :
    null;

  const mergedCount = rows.filter(r => !r.action_occurred).length;
  const actionCount = rows.filter(r =>  r.action_occurred).length;

  const fetchData = async (newOffset = 0) => {
    if (!symbol || !timeframe) return;
    setLoading(true);
    setError(null);
    try {
      const opts = { limit: LIMIT, offset: newOffset, sort: 'desc' };
      if (startDate) opts.startDate = startDate;
      if (endDate)   opts.endDate   = endDate;
      if (actionOnly !== null) opts.actionOnly = actionOnly;

      const resp = await api.getCandleMerges(symbol, timeframe, opts);
      if (resp?.success) {
        setRows(resp.data || []);
        setOffset(newOffset);
        setLoaded(true);
      } else {
        setError(resp?.message || 'Failed to load merge history');
      }
    } catch (e) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = () => fetchData(0);
  const handlePrev = () => { if (offset > 0) fetchData(Math.max(0, offset - LIMIT)); };
  const handleNext = () => { if (rows.length === LIMIT) fetchData(offset + LIMIT); };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-blue-50">
          <GitMerge size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Merge History</h2>
          <p className="text-xs text-gray-500">Bar-close merge decisions — action fired vs bars merged</p>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 space-y-3"
        style={glassStyle}
      >
        {/* Row 1: Symbol + Timeframe + Status filter */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol"
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-mono w-28 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <select
            value={timeframe}
            onChange={e => setTimeframe(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {['all', 'merged', 'action'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                  ${filter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                {f === 'all' ? 'All' : f === 'merged' ? 'Merged' : 'Action'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Date range + Load button */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <span className="text-gray-400 text-sm">→</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={handleLoad}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Summary chips */}
      {loaded && !loading && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {rows.length} rows (page)
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            {mergedCount} merged
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            {actionCount} action
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            offset {offset}
          </span>
        </div>
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl overflow-hidden"
        style={glassStyle}
      >
        {!loaded && !loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Set filters above and click <strong>Load</strong> to view merge history.
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No records found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Bar Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Cond #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Trigger</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 max-w-xs">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Merged H</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Merged L</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Merged C</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.id ?? idx}
                    className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors"
                  >
                    {/* Bar Timestamp */}
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {row.new_bar_timestamp_uk ?? '—'}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-2.5">
                      {row.action_occurred ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">ACTION</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">MERGED</span>
                      )}
                    </td>

                    {/* Condition # */}
                    <td className="px-4 py-2.5">
                      {row.action_condition_no != null ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                          {row.action_condition_no}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Trigger level */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {row.trigger_level_name ? (
                        <span className="font-mono text-xs text-gray-700">
                          {row.trigger_level_name}
                          <span className={`ml-1 font-bold ${row.trigger_direction === 'ABOVE' ? 'text-green-600' : 'text-red-600'}`}>
                            {row.trigger_direction === 'ABOVE' ? '↑' : '↓'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-2.5 max-w-xs">
                      <span
                        title={row.action_description}
                        className="text-xs text-gray-600 line-clamp-1 block truncate max-w-[280px]"
                      >
                        {row.action_description ?? '—'}
                      </span>
                    </td>

                    {/* Merged H / L / C */}
                    <td className="px-4 py-2.5 font-mono text-xs text-green-700">
                      {row.merged_high ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-green-700">
                      {row.merged_low ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-green-700">
                      {row.merged_close ?? <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {loaded && rows.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={offset === 0 || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="text-xs text-gray-400">
            Showing {offset + 1}–{offset + rows.length}
          </span>
          <button
            onClick={handleNext}
            disabled={rows.length < LIMIT || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
