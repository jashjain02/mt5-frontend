import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FlaskConical, Play, Loader2, AlertCircle, ChevronDown, ChevronUp,
  History, ArrowLeft, Trash2, RefreshCw, CheckSquare, Square
} from 'lucide-react';
import api from '../services/api';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'H5', '5H+', 'D1', 'W1', 'MN1'];

const glassStyle = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.3)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

const fmtTs = (ts) => {
  if (!ts) return '—';
  // Display as-is from server — timestamps are in broker (MT5/EET) time.
  // Avoid new Date() which would convert to local/UTC and shift the time.
  return String(ts).replace('T', ' ').slice(0, 19);
};

const fmtNum = (v, decimals = 2) => {
  if (v == null) return '—';
  return Number(v).toFixed(decimals);
};

// ─── Views ───────────────────────────────────────────────────────────────────
const VIEWS = { CONFIG: 'config', RESULTS: 'results', HISTORY: 'history' };

export default function MergeTesting() {
  const [view, setView] = useState(VIEWS.CONFIG);

  // ── Config form state ──────────────────────────────────────────────────────
  const [symbol,    setSymbol]    = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [dbRules,       setDbRules]       = useState([]);
  const [rulesLoading,  setRulesLoading]  = useState(true);
  const [selectedRules, setSelectedRules] = useState(new Set());

  // ── Run state ──────────────────────────────────────────────────────────────
  const [running,   setRunning]   = useState(false);
  const [runError,  setRunError]  = useState(null);
  const [session,   setSession]   = useState(null);   // current session metadata
  const pollRef = useRef(null);

  // ── Results state ──────────────────────────────────────────────────────────
  const [rows,     setRows]     = useState([]);
  const [hasMore,  setHasMore]  = useState(false);
  const [afterId,  setAfterId]  = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── History state ──────────────────────────────────────────────────────────
  const [sessions,       setSessions]       = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Cleanup polls on unmount ───────────────────────────────────────────────
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Load merge rules from DB on mount ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.getMergeRules();
        const rules = resp?.rules || [];
        setDbRules(rules);
        setSelectedRules(new Set(rules.map(r => r.id)));
      } catch (e) {
        // silent — run button will show validation error if empty
      } finally {
        setRulesLoading(false);
      }
    })();
  }, []);

  // ── Rule toggle ────────────────────────────────────────────────────────────
  const toggleRule = (id) => {
    setSelectedRules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAllRules = () => {
    setSelectedRules(prev =>
      prev.size === dbRules.length ? new Set() : new Set(dbRules.map(r => r.id))
    );
  };

  // ── Run analysis ───────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!symbol || !timeframe || !startDate || !endDate) {
      setRunError('Please fill in all fields.');
      return;
    }
    if (selectedRules.size === 0) {
      setRunError('Select at least one merge rule.');
      return;
    }
    setRunning(true);
    setRunError(null);
    setSession(null);
    setRows([]);
    setHasMore(false);
    setAfterId(0);

    try {
      const resp = await api.runMergeAnalysis({
        symbol,
        timeframe,
        start_date: startDate,
        end_date:   endDate,
        rules:      Array.from(selectedRules).sort((a, b) => a - b),
      });

      if (!resp?.success) {
        setRunError(resp?.message || 'Failed to start analysis.');
        setRunning(false);
        return;
      }

      const sid = resp.session_id;
      setSession({ session_id: sid, status: 'pending', table_name: resp.table_name });

      // Poll for status
      pollRef.current = setInterval(async () => {
        try {
          const statusResp = await api.getMergeSession(sid);
          const s = statusResp?.session;
          if (!s) return;
          setSession(s);

          if (s.status === 'complete') {
            clearInterval(pollRef.current);
            await fetchResults(sid, 0, true);
            setRunning(false);
            setView(VIEWS.RESULTS);
          } else if (s.status === 'error') {
            clearInterval(pollRef.current);
            setRunError(s.error_detail || 'Analysis failed.');
            setRunning(false);
          }
        } catch (e) {
          // poll errors are silent; keep trying
        }
      }, 2000);

    } catch (e) {
      setRunError(e?.message || 'Network error.');
      setRunning(false);
    }
  };

  // ── Fetch result rows ──────────────────────────────────────────────────────
  const fetchResults = async (sid, after = 0, reset = false) => {
    setLoadingMore(true);
    try {
      const resp = await api.getMergeResults(sid, { limit: 100, afterId: after });
      if (resp?.success) {
        const newRows = resp.rows || [];
        setRows(prev => reset ? newRows : [...prev, ...newRows]);
        setHasMore(resp.has_more || false);
        setAfterId(resp.next_after_id || 0);
      }
    } catch (e) {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (session?.session_id) fetchResults(session.session_id, afterId, false);
  };

  // ── Load session history ───────────────────────────────────────────────────
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const resp = await api.getMergeSessions({});
      if (resp?.success) setSessions(resp.sessions || []);
    } catch (e) {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleHistoryView = () => {
    setView(VIEWS.HISTORY);
    loadHistory();
  };

  const handleLoadHistorySession = async (s) => {
    setSession(s);
    setRows([]);
    setHasMore(false);
    setAfterId(0);
    setView(VIEWS.RESULTS);
    await fetchResults(s.session_id, 0, true);
  };

  const handleDeleteSession = async (sid, e) => {
    e.stopPropagation();
    try {
      await api.deleteMergeSession(sid);
      setSessions(prev => prev.filter(s => s.session_id !== sid));
      if (session?.session_id === sid) {
        setSession(null);
        setRows([]);
      }
    } catch (err) {
      // silent
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-50">
            <FlaskConical size={20} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Merge Testing</h2>
            <p className="text-xs text-gray-500">
              Run retroactive merge simulations on historical data
            </p>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-2">
          {view === VIEWS.RESULTS && (
            <button
              onClick={() => setView(VIEWS.CONFIG)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={14} /> Back to config
            </button>
          )}
          <button
            onClick={handleHistoryView}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${view === VIEWS.HISTORY
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <History size={13} /> History
          </button>
        </div>
      </div>

      {/* ─── CONFIG VIEW ──────────────────────────────────────────────────── */}
      {view === VIEWS.CONFIG && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Form */}
          <div className="rounded-2xl p-5 space-y-5" style={glassStyle}>
            {/* Row 1: Symbol + Timeframe */}
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="XAUUSD"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono w-32 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={e => setTimeframe(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>

            {/* Rules multiselect */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Merge Rules ({selectedRules.size}/{dbRules.length} selected)
                </label>
                {dbRules.length > 0 && (
                  <button
                    onClick={toggleAllRules}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
                  >
                    {selectedRules.size === dbRules.length
                      ? <><CheckSquare size={13} /> Deselect all</>
                      : <><Square size={13} /> Select all</>}
                  </button>
                )}
              </div>
              {rulesLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                  <Loader2 size={13} className="animate-spin" /> Loading rules…
                </div>
              ) : dbRules.length === 0 ? (
                <div className="text-xs text-gray-400 py-3">
                  No merge rules defined yet. Create rules in the <strong>Merge Rules</strong> tab first.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dbRules.map(rule => {
                    const checked = selectedRules.has(rule.id);
                    return (
                      <button
                        key={rule.id}
                        onClick={() => toggleRule(rule.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all
                          ${checked
                            ? 'border-violet-300 bg-violet-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center
                          ${checked ? 'bg-violet-600 border-violet-600' : 'border-gray-300'}`}>
                          {checked && <span className="text-white text-xs leading-none">✓</span>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${checked ? 'text-violet-700' : 'text-gray-500'}`}>
                              #{rule.rule_order}
                            </span>
                            <span className="text-xs font-medium text-gray-700">{rule.name}</span>
                          </div>
                          {rule.description && (
                            <span className="text-xs text-gray-400">{rule.description}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Run button */}
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              {running
                ? <><Loader2 size={16} className="animate-spin" /> Running analysis…</>
                : <><Play size={16} /> Run Merge Analysis</>}
            </button>

            {/* Running status */}
            {running && session && (
              <div className="flex items-center gap-2 text-xs text-violet-600">
                <Loader2 size={12} className="animate-spin" />
                Status: <strong>{session.status}</strong>
                {session.table_name && (
                  <span className="font-mono text-gray-400">→ {session.table_name}</span>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {runError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} />
              {runError}
            </div>
          )}
        </motion.div>
      )}

      {/* ─── RESULTS VIEW ─────────────────────────────────────────────────── */}
      {view === VIEWS.RESULTS && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Session summary chips */}
          {session && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                {session.symbol} / {session.timeframe}
              </span>
              {session.start_date && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {session.start_date?.slice(0, 10)} → {session.end_date?.slice(0, 10)}
                </span>
              )}
              {session.total_input_bars != null && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {session.total_input_bars} input bars
                </span>
              )}
              {session.total_output_units != null && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {session.total_output_units} output units
                </span>
              )}
              {session.merged_units_count != null && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  {session.merged_units_count} merged
                </span>
              )}
              {Array.isArray(session.rules_applied) && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  Rules: {session.rules_applied.join(', ')}
                </span>
              )}
            </div>
          )}

          {/* Results table */}
          <div className="rounded-2xl overflow-hidden" style={glassStyle}>
            {rows.length === 0 && !loadingMore ? (
              <div className="p-8 text-center text-gray-400 text-sm">No rows to display.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Bar Start (MT5)</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Bar End (MT5)</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Bars</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Open</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">High</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Low</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Close</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Pat</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">JGD</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">JWD</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Cond #</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Trigger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const isMerged  = row.is_merged;
                      const hasAction = row.action_condition_no != null;
                      const rowBg = isMerged
                        ? 'rgba(251,191,36,0.10)'
                        : hasAction
                          ? 'rgba(59,130,246,0.07)'
                          : 'transparent';

                      return (
                        <tr
                          key={row.id ?? idx}
                          className="border-b border-gray-100 last:border-0 hover:brightness-95 transition-all"
                          style={{ background: rowBg }}
                        >
                          <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">
                            {fmtTs(row.bar_start_uk)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">
                            {isMerged ? fmtTs(row.bar_end_uk) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isMerged ? (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                                {row.bars_count}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">1</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-700">{fmtNum(row.open)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-green-700">{fmtNum(row.high)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-red-700">{fmtNum(row.low)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-700">{fmtNum(row.close)}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600">
                              {row.d_pat ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-600">{fmtNum(row.jgd)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-600">{fmtNum(row.jwd)}</td>
                          <td className="px-3 py-2 text-center">
                            {hasAction ? (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">
                                C{row.action_condition_no}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.trigger_level_name ? (
                              <span className={`text-xs font-mono ${
                                row.trigger_direction === 'ABOVE' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {row.trigger_level_name} {row.trigger_direction === 'ABOVE' ? '↑' : '↓'}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Load more */}
            {hasMore && (
              <div className="p-3 flex justify-center border-t border-gray-100">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  {loadingMore
                    ? <><Loader2 size={13} className="animate-spin" /> Loading…</>
                    : <><ChevronDown size={13} /> Load More</>}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── HISTORY VIEW ─────────────────────────────────────────────────── */}
      {view === VIEWS.HISTORY && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Past merge analysis sessions</p>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
            >
              <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading history…</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm rounded-2xl" style={glassStyle}>
              No past sessions found.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div
                  key={s.session_id}
                  className="rounded-2xl p-4 flex items-start justify-between gap-4 hover:shadow-md transition-all cursor-pointer"
                  style={glassStyle}
                  onClick={() => handleLoadHistorySession(s)}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-gray-800">
                        {s.symbol} / {s.timeframe}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${s.status === 'complete' ? 'bg-green-100 text-green-700'
                          : s.status === 'error'  ? 'bg-red-100 text-red-700'
                          : s.status === 'running' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.start_date?.slice(0, 10)} → {s.end_date?.slice(0, 10)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {Array.isArray(s.rules_applied) && (
                        <span className="text-xs text-gray-400">
                          Rules: {s.rules_applied.join(', ')}
                        </span>
                      )}
                      {s.total_input_bars != null && (
                        <span className="text-xs text-gray-400">
                          {s.total_input_bars} bars → {s.total_output_units} units
                          {s.merged_units_count != null && ` (${s.merged_units_count} merged)`}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-300 font-mono truncate">
                      {s.table_name}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleLoadHistorySession(s)}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-all"
                    >
                      Load Results
                    </button>
                    <button
                      onClick={(e) => handleDeleteSession(s.session_id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete session"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
