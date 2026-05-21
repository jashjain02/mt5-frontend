import { useState } from 'react';
import { motion } from 'framer-motion';
import { GitMerge, RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../services/api';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'H5', 'D1', 'W1', 'MN1'];
const LIMIT = 50;

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.06)',
};

const darkInput = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#f3f4f6',
};

export default function MergeHistory() {
  const [symbol, setSymbol]       = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [filter, setFilter]       = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [offset, setOffset]       = useState(0);

  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [loaded, setLoaded]     = useState(false);
  const [expanded, setExpanded] = useState(null);

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

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
        <div className="p-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.15)' }}>
          <GitMerge size={20} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-100">Merge History</h2>
          <p className="text-xs text-gray-400">Bar-close merge decisions — action fired vs bars merged</p>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 space-y-3"
        style={glass}
      >
        {/* Row 1: Symbol + Timeframe + Status filter */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol"
            className="px-3 py-1.5 rounded-lg text-sm font-mono w-28 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-600"
            style={darkInput}
          />
          <select
            value={timeframe}
            onChange={e => setTimeframe(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            style={darkInput}
          >
            {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {['all', 'merged', 'action'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                  ${filter === f ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-100'}`}
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
            className="px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            style={darkInput}
          />
          <span className="text-gray-500 text-sm">→</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            style={darkInput}
          />
          <button
            onClick={handleLoad}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-red-400 text-sm"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Summary chips */}
      {loaded && !loading && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-300"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            {rows.length} rows (page)
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium text-emerald-300"
            style={{ background: 'rgba(16,185,129,0.15)' }}>
            {mergedCount} merged
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium text-orange-300"
            style={{ background: 'rgba(249,115,22,0.15)' }}>
            {actionCount} action
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-400"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
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
        style={glass}
      >
        {!loaded && !loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Set filters above and click <strong className="text-gray-300">Load</strong> to view merge history.
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No records found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 whitespace-nowrap">Bar Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Plan → Sit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Cond #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Trigger</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 max-w-xs">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Merged H</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Merged L</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Merged C</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isExpanded = expanded === (row.id ?? idx);
                  const rowBg = isExpanded
                    ? 'rgba(16,185,129,0.08)'
                    : row.action_occurred
                      ? 'rgba(249,115,22,0.05)'
                      : 'transparent';
                  return (
                  <>
                  <tr
                    key={row.id ?? idx}
                    onClick={() => toggleExpand(row.id ?? idx)}
                    className="transition-colors cursor-pointer hover:brightness-125"
                    style={{ background: rowBg, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    {/* Bar Timestamp */}
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-300 whitespace-nowrap">
                      {row.new_bar_timestamp_broker ?? '—'}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-2.5">
                      {row.action_occurred ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold text-orange-300"
                          style={{ background: 'rgba(249,115,22,0.18)' }}>ACTION</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold text-emerald-300"
                          style={{ background: 'rgba(16,185,129,0.18)' }}>MERGED</span>
                      )}
                    </td>

                    {/* Plan → Situation */}
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-300 whitespace-nowrap">
                      {row.prev_d_pat || row.d_pat
                        ? <>{row.prev_d_pat ?? '—'} <span className="text-gray-600">→</span> {row.d_pat ?? '—'}</>
                        : <span className="text-gray-600">—</span>}
                    </td>

                    {/* Condition # */}
                    <td className="px-4 py-2.5">
                      {row.action_condition_no != null ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold text-emerald-300"
                          style={{ background: 'rgba(16,185,129,0.18)' }}>
                          {row.action_condition_no}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Trigger level */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {row.trigger_level_name ? (
                        <span className="font-mono text-xs text-gray-200">
                          {row.trigger_level_name}
                          <span className={`ml-1 font-bold ${row.trigger_direction === 'ABOVE' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {row.trigger_direction === 'ABOVE' ? '↑' : '↓'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-2.5 max-w-xs">
                      <span
                        title={row.action_description}
                        className="text-xs text-gray-400 line-clamp-1 block truncate max-w-[280px]"
                      >
                        {row.action_description ?? '—'}
                      </span>
                    </td>

                    {/* Merged H / L / C */}
                    <td className="px-4 py-2.5 font-mono text-xs text-emerald-400">
                      {row.merged_high ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-emerald-400">
                      {row.merged_low ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-emerald-400">
                      {row.merged_close ?? <span className="text-gray-600">—</span>}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr key={`${row.id ?? idx}-detail`}
                      style={{ background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.12)' }}>
                      <td colSpan={9} className="px-6 py-4">
                        {row.action_occurred ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-xs">
                            {[
                              { label: 'Bar H / L', value: `${row.bar_high ?? '—'} / ${row.bar_low ?? '—'}` },
                              { label: 'Base H / L', value: `${row.base_high ?? '—'} / ${row.base_low ?? '—'}` },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <span className="text-gray-500 uppercase tracking-wide text-[10px]">{label}</span>
                                <p className="font-mono text-gray-200 mt-0.5">{value}</p>
                              </div>
                            ))}
                            <div>
                              <span className="text-gray-500 uppercase tracking-wide text-[10px]">New High Target</span>
                              <p className={`font-mono font-semibold mt-0.5 ${row.bar_high != null && row.new_high_target != null && row.bar_high >= row.new_high_target ? 'text-emerald-400' : 'text-gray-200'}`}>
                                {row.new_high_target ?? '—'}
                                {row.bar_high != null && row.new_high_target != null && (
                                  <span className="ml-1">{row.bar_high >= row.new_high_target ? '✓' : '✗'}</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 uppercase tracking-wide text-[10px]">New Low Target</span>
                              <p className={`font-mono font-semibold mt-0.5 ${row.bar_low != null && row.new_low_target != null && row.bar_low <= row.new_low_target ? 'text-emerald-400' : 'text-gray-200'}`}>
                                {row.new_low_target ?? '—'}
                                {row.bar_low != null && row.new_low_target != null && (
                                  <span className="ml-1">{row.bar_low <= row.new_low_target ? '✓' : '✗'}</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 uppercase tracking-wide text-[10px]">Trigger Level Value</span>
                              <p className="font-mono text-gray-200 mt-0.5">{row.trigger_level_value ?? '—'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 uppercase tracking-wide text-[10px]">TVHS</span>
                              <p className={`font-mono font-semibold mt-0.5 ${row.bar_high != null && row.tvhs != null && row.bar_high >= row.tvhs ? 'text-emerald-400' : 'text-gray-200'}`}>
                                {row.tvhs ?? '—'}
                                {row.bar_high != null && row.tvhs != null && (
                                  <span className="ml-1">{row.bar_high >= row.tvhs ? '✓' : '✗'}</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 uppercase tracking-wide text-[10px]">TVLS</span>
                              <p className={`font-mono font-semibold mt-0.5 ${row.bar_low != null && row.tvls != null && row.bar_low <= row.tvls ? 'text-emerald-400' : 'text-gray-200'}`}>
                                {row.tvls ?? '—'}
                                {row.bar_low != null && row.tvls != null && (
                                  <span className="ml-1">{row.bar_low <= row.tvls ? '✓' : '✗'}</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 uppercase tracking-wide text-[10px]">UTP Station</span>
                              <p className="font-mono text-gray-200 mt-0.5">{row.utp_trigger ?? '—'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 uppercase tracking-wide text-[10px]">DTP Station</span>
                              <p className="font-mono text-gray-200 mt-0.5">{row.dtp_trigger ?? '—'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-xs">
                            <div>
                              <span className="text-gray-500 uppercase tracking-wide text-[10px]">Merged H / L / C</span>
                              <p className="font-mono text-emerald-400 mt-0.5">
                                {row.merged_high ?? '—'} / {row.merged_low ?? '—'} / {row.merged_close ?? '—'}
                              </p>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </>
                  );
                })}
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
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="text-xs text-gray-500">
            Showing {offset + 1}–{offset + rows.length}
          </span>
          <button
            onClick={handleNext}
            disabled={rows.length < LIMIT || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
