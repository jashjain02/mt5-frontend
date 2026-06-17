import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Play, Loader2, AlertCircle, ChevronDown,
  History, ArrowLeft, Trash2, RefreshCw, CheckSquare, Square,
  X, BarChart2,
} from 'lucide-react';
import api from '../services/api';
import { TradingPlanDiagram } from './TradingPlan';
import { transformApiDataToTradingPlan } from '../utils/tradingPlanTransformer';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'H5', '5H+', 'D1', 'W1', 'MN1'];

const RC_CLOSE_LEVELS = [
  { value: 'RC_14_60',  label: 'Close > RC 14.6%' },
  { value: 'RC_23_60',  label: 'Close > RC 23.6%' },
  { value: 'RC_38_20',  label: 'Close > RC 38.2%' },
  { value: 'RC_61_80',  label: 'Close > RC 61.8%' },
  { value: 'RC_100_00', label: 'Close > RC 100%'  },
  { value: 'RC_138_20', label: 'Close > RC 138.2%'},
  { value: 'RC_161_80', label: 'Close > RC 161.8%'},
  { value: 'RC_261_80', label: 'Close > RC 261.8%'},
];
const FC_CLOSE_LEVELS = [
  { value: 'FC_14_60',  label: 'Close < FC 14.6%' },
  { value: 'FC_23_60',  label: 'Close < FC 23.6%' },
  { value: 'FC_38_20',  label: 'Close < FC 38.2%' },
  { value: 'FC_61_80',  label: 'Close < FC 61.8%' },
  { value: 'FC_100_00', label: 'Close < FC 100%'  },
  { value: 'FC_138_20', label: 'Close < FC 138.2%'},
  { value: 'FC_161_80', label: 'Close < FC 161.8%'},
  { value: 'FC_261_80', label: 'Close < FC 261.8%'},
];

const glassStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.06)',
};

const darkInput = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#f3f4f6',
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

function BatchTradingPlanModal({ ts, symbol, timeframe, mergedOhlc, onClose }) {
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState(null);

  useEffect(() => {
    if (!ts) return;
    setLoading(true);
    setError(null);
    setPlanData(null);
    const tsNorm = String(ts).replace('T', ' ').slice(0, 19);
    api.getCalculatedValues(symbol, timeframe, { startDate: tsNorm, endDate: tsNorm, limit: 1 })
      .then(res => {
        let record = res?.data?.[0];
        if (!record) { setError('No data found for this bar.'); return; }
        if (mergedOhlc) {
          record = {
            ...record,
            high:  mergedOhlc.high,
            low:   mergedOhlc.low,
            close: mergedOhlc.close,
            merged: true,
            merged_ohlc: {
              high: mergedOhlc.high,
              low:  mergedOhlc.low,
              close: mergedOhlc.close,
              current_bar_ts: tsNorm,
            },
          };
        }
        setPlanData(transformApiDataToTradingPlan(record));
      })
      .catch(e => setError(e.message || 'Failed to load trading plan.'))
      .finally(() => setLoading(false));
  }, [ts, symbol, timeframe, mergedOhlc]);

  return (
    <AnimatePresence>
      {ts && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="relative flex flex-col"
            style={{
              width: '92vw', height: '90vh',
              background: 'rgba(13,17,23,0.98)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', overflow: 'hidden',
            }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
              <span className="text-sm font-semibold text-text-base">
                Trading Plan —{' '}
                <span className="font-mono text-text-muted">
                  {String(ts).replace('T', ' ').slice(0, 19)}
                  {mergedOhlc ? ' (merged)' : ''}
                </span>
              </span>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-base transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              {loading  && <p className="text-gray-400 text-sm text-center py-10">Loading…</p>}
              {error    && <p className="text-red-400 text-sm text-center py-10">{error}</p>}
              {planData && <TradingPlanDiagram data={planData} />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function MergeTesting() {
  const [view, setView] = useState(VIEWS.CONFIG);

  // ── Config form state ──────────────────────────────────────────────────────
  const [symbol,    setSymbol]    = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [threshold, setThreshold] = useState('0.073');
  const [customThreshold, setCustomThreshold] = useState('');
  const [dbRules,            setDbRules]            = useState([]);
  const [rulesLoading,       setRulesLoading]       = useState(true);
  const [selectedRules,      setSelectedRules]      = useState(new Set());
  const [selectedExceptions, setSelectedExceptions] = useState(new Set());
  const [excCloseFilters,    setExcCloseFilters]    = useState({});  // {excId: levelName}

  // ── Run state ──────────────────────────────────────────────────────────────
  const [running,   setRunning]   = useState(false);
  const [runError,  setRunError]  = useState(null);
  const [session,   setSession]   = useState(null);   // current session metadata
  const pollRef   = useRef(null);
  const errorRef  = useRef(null);

  // ── Results state ──────────────────────────────────────────────────────────
  const [rows,       setRows]       = useState([]);
  const [hasMore,    setHasMore]    = useState(false);
  const [afterId,    setAfterId]    = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null); // row id that is expanded
  const [tradingPlan, setTradingPlan] = useState(null); // { ts, mergedOhlc }

  // ── History state ──────────────────────────────────────────────────────────
  const [sessions,       setSessions]       = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Cleanup polls on unmount ───────────────────────────────────────────────
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Scroll error into view whenever it appears ───────────────────────────
  useEffect(() => {
    if (runError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [runError]);

  // ── Load merge rules from DB on mount ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.getMergeRules();
        const rules = resp?.rules || [];
        setDbRules(rules);
        setSelectedRules(new Set(rules.map(r => r.id)));
        // Pre-select all exceptions
        const allExcIds = rules.flatMap(r => (r.exceptions || []).map(e => e.id));
        setSelectedExceptions(new Set(allExcIds));
      } catch (e) {
        // silent — run button will show validation error if empty
      } finally {
        setRulesLoading(false);
      }
    })();
  }, []);

  // ── Rule / exception toggles ───────────────────────────────────────────────
  const toggleRule = (rule) => {
    const excIds = (rule.exceptions || []).map(e => e.id);
    const isChecked = selectedRules.has(rule.id);
    setSelectedRules(prev => {
      const next = new Set(prev);
      isChecked ? next.delete(rule.id) : next.add(rule.id);
      return next;
    });
    setSelectedExceptions(prev => {
      const next = new Set(prev);
      if (isChecked) {
        excIds.forEach(id => next.delete(id));
      } else {
        excIds.forEach(id => next.add(id));
      }
      return next;
    });
    if (isChecked) {
      setExcCloseFilters(prev => {
        const next = { ...prev };
        excIds.forEach(id => delete next[id]);
        return next;
      });
    }
  };
  const toggleException = (excId) => {
    const willUncheck = selectedExceptions.has(excId);
    setSelectedExceptions(prev => {
      const next = new Set(prev);
      next.has(excId) ? next.delete(excId) : next.add(excId);
      return next;
    });
    if (willUncheck) {
      setExcCloseFilters(prev => {
        const next = { ...prev };
        delete next[excId];
        return next;
      });
    }
  };
  const setExcCloseFilter = (excId, level) => {
    setExcCloseFilters(prev => {
      const next = { ...prev };
      if (level) next[excId] = level;
      else delete next[excId];
      return next;
    });
  };
  const toggleAllRules = () => {
    const allSelected = selectedRules.size === dbRules.length;
    if (allSelected) {
      setSelectedRules(new Set());
      setSelectedExceptions(new Set());
      setExcCloseFilters({});
    } else {
      setSelectedRules(new Set(dbRules.map(r => r.id)));
      setSelectedExceptions(new Set(dbRules.flatMap(r => (r.exceptions || []).map(e => e.id))));
    }
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
      const parsedThreshold = threshold === 'custom'
        ? parseFloat(customThreshold) / 100
        : parseFloat(threshold);

      if (!parsedThreshold || parsedThreshold <= 0 || parsedThreshold > 1) {
        setRunError('Invalid threshold value.');
        setRunning(false);
        return;
      }

      // Compute all exception IDs across selected rules
      const allExcIds = dbRules
        .filter(r => selectedRules.has(r.id))
        .flatMap(r => (r.exceptions || []).map(e => e.id));
      const someExcluded = allExcIds.some(id => !selectedExceptions.has(id));

      const activeFilters = Object.keys(excCloseFilters).length > 0 ? excCloseFilters : null;

      const resp = await api.runMergeAnalysis({
        symbol,
        timeframe,
        start_date:              startDate.slice(0, 16),   // strip seconds if browser adds them
        end_date:                endDate.slice(0, 16),
        rules:                   Array.from(selectedRules).sort((a, b) => a - b),
        threshold:               parsedThreshold,
        // Only send selected_exceptions if some are excluded; null = all active
        selected_exceptions:     someExcluded
          ? Array.from(selectedExceptions).sort((a, b) => a - b)
          : null,
        exception_close_filters: activeFilters,
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
          <div className="p-2 rounded-xl" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <FlaskConical size={20} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-100">Merge Testing</h2>
            <p className="text-xs text-gray-400">
              Run retroactive merge simulations on historical data
            </p>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-2">
          {view === VIEWS.RESULTS && (
            <button
              onClick={() => setView(VIEWS.CONFIG)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-100 transition-colors"
            >
              <ArrowLeft size={14} /> Back to config
            </button>
          )}
          <button
            onClick={handleHistoryView}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${view === VIEWS.HISTORY
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:text-gray-100'}`}
            style={view !== VIEWS.HISTORY ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } : {}}
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
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="XAUUSD"
                  className="px-3 py-2 rounded-lg text-sm font-mono w-32 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                  style={darkInput}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={e => setTimeframe(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  style={darkInput}
                >
                  {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Start Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  style={darkInput}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">End Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  style={darkInput}
                />
              </div>
            </div>

            {/* Threshold selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                New High / Low Threshold
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {[['7.3%', '0.073'], ['14.6%', '0.146']].map(([label, val]) => (
                  <button
                    key={val}
                    onClick={() => setThreshold(val)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
                      ${threshold === val
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'text-gray-300 hover:text-gray-100 hover:border-violet-500'}`}
                    style={threshold !== val ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' } : {}}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setThreshold('custom')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
                    ${threshold === 'custom'
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'text-gray-300 hover:text-gray-100 hover:border-violet-500'}`}
                  style={threshold !== 'custom' ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' } : {}}
                >
                  Custom
                </button>
                {threshold === 'custom' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={customThreshold}
                      onChange={e => setCustomThreshold(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-24 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                      style={darkInput}
                    />
                    <span className="text-sm text-gray-400">%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rules multiselect */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Merge Rules ({selectedRules.size}/{dbRules.length} selected)
                  {(() => {
                    const totalExc = dbRules.reduce((n, r) => n + (r.exceptions?.length || 0), 0);
                    const activeExc = dbRules
                      .filter(r => selectedRules.has(r.id))
                      .reduce((n, r) => n + (r.exceptions || []).filter(e => selectedExceptions.has(e.id)).length, 0);
                    return totalExc > 0 ? ` · ${activeExc}/${totalExc} exceptions` : '';
                  })()}
                </label>
                {dbRules.length > 0 && (
                  <button
                    onClick={toggleAllRules}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium"
                  >
                    {selectedRules.size === dbRules.length
                      ? <><CheckSquare size={13} /> Deselect all</>
                      : <><Square size={13} /> Select all</>}
                  </button>
                )}
              </div>
              {rulesLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 py-3">
                  <Loader2 size={13} className="animate-spin" /> Loading rules…
                </div>
              ) : dbRules.length === 0 ? (
                <div className="text-xs text-gray-500 py-3">
                  No merge rules defined yet. Create rules in the <strong className="text-gray-300">Merge Rules</strong> tab first.
                </div>
              ) : (
                <div className="space-y-2">
                  {dbRules.map(rule => {
                    const ruleChecked = selectedRules.has(rule.id);
                    const exceptions  = rule.exceptions || [];
                    const activeExcs  = exceptions.filter(e => selectedExceptions.has(e.id));
                    const allExcsOff  = ruleChecked && exceptions.length > 0 && activeExcs.length === 0;
                    return (
                      <div key={rule.id}>
                        {/* ── Parent rule row ─────────────────────────────── */}
                        <button
                          onClick={() => toggleRule(rule)}
                          className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                          style={ruleChecked
                            ? { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)' }
                            : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center
                            ${ruleChecked ? 'bg-violet-600 border-violet-600' : 'border-white/20'}`}>
                            {ruleChecked && <span className="text-white text-xs leading-none">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${ruleChecked ? 'text-violet-400' : 'text-gray-500'}`}>
                                #{rule.rule_order}
                              </span>
                              <span className={`text-xs font-medium ${ruleChecked ? 'text-gray-100' : 'text-gray-400'}`}>{rule.name}</span>
                              {allExcsOff && (
                                <span className="text-xs text-amber-400 font-medium">(no exceptions active)</span>
                              )}
                            </div>
                            {rule.description && (
                              <span className="text-xs text-gray-500">{rule.description.split('\n')[0]}</span>
                            )}
                          </div>
                        </button>

                        {/* ── Exception rows (shown when parent is checked) ─ */}
                        {ruleChecked && exceptions.length > 0 && (
                          <div className="ml-7 mt-1 space-y-1">
                            {exceptions.map(exc => {
                              const excChecked = selectedExceptions.has(exc.id);
                              const closeLevels = exc.trigger_direction === 'ABOVE'
                                ? RC_CLOSE_LEVELS
                                : exc.trigger_direction === 'BELOW'
                                  ? FC_CLOSE_LEVELS
                                  : null;
                              return (
                                <div
                                  key={exc.id}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                  style={excChecked
                                    ? { background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }
                                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                  onClick={() => toggleException(exc.id)}
                                >
                                  <div className={`flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center
                                    ${excChecked ? 'bg-violet-500 border-violet-500' : 'border-white/20'}`}>
                                    {excChecked && <span className="text-white" style={{fontSize: 9, lineHeight: 1}}>✓</span>}
                                  </div>
                                  <span className={`text-xs flex-1 ${excChecked ? 'text-violet-300' : 'text-gray-500 line-through'}`}>
                                    {exc.name}
                                  </span>
                                  {excChecked && closeLevels && (
                                    <select
                                      value={excCloseFilters[exc.id] || ''}
                                      onClick={e => e.stopPropagation()}
                                      onChange={e => { e.stopPropagation(); setExcCloseFilter(exc.id, e.target.value); }}
                                      className="text-xs rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 max-w-[160px]"
                                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#d1d5db' }}
                                    >
                                      <option value="">No close filter</option>
                                      {closeLevels.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
              <div className="flex items-center gap-2 text-xs text-violet-400">
                <Loader2 size={12} className="animate-spin" />
                Status: <strong>{session.status}</strong>
                {session.table_name && (
                  <span className="font-mono text-gray-500">→ {session.table_name}</span>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {runError && (
            <div ref={errorRef} className="flex items-center gap-2 px-4 py-3 rounded-xl text-red-400 text-sm" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
              <AlertCircle size={16} />
              {String(runError)}
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
              <span className="px-3 py-1 rounded-full text-xs font-medium text-violet-300" style={{ background: 'rgba(139,92,246,0.15)' }}>
                {session.symbol} / {session.timeframe}
              </span>
              {session.start_date && (
                <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-300" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  {session.start_date?.slice(0, 10)} → {session.end_date?.slice(0, 10)}
                </span>
              )}
              {session.total_input_bars != null && (
                <span className="px-3 py-1 rounded-full text-xs font-medium text-blue-300" style={{ background: 'rgba(59,130,246,0.15)' }}>
                  {session.total_input_bars} input bars
                </span>
              )}
              {session.total_output_units != null && (
                <span className="px-3 py-1 rounded-full text-xs font-medium text-emerald-300" style={{ background: 'rgba(16,185,129,0.15)' }}>
                  {session.total_output_units} output units
                </span>
              )}
              {session.merged_units_count != null && (
                <span className="px-3 py-1 rounded-full text-xs font-medium text-amber-300" style={{ background: 'rgba(245,158,11,0.15)' }}>
                  {session.merged_units_count} merged
                </span>
              )}
              {session.standalone_units_count != null && session.standalone_units_count > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-medium text-blue-300" style={{ background: 'rgba(59,130,246,0.15)' }}>
                  {session.standalone_units_count} standalone
                </span>
              )}
              {Array.isArray(session.rules_applied) && (
                <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-400" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  Rules: {session.rules_applied.join(', ')}
                </span>
              )}
            </div>
          )}

          {/* Results table */}
          <div className="rounded-2xl overflow-hidden" style={glassStyle}>
            {rows.length === 0 && !loadingMore ? (
              <div className="p-8 text-center text-gray-500 text-sm">No rows to display.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 whitespace-nowrap">Bar (MT5)</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">Bars</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">Open</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">High</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">Low</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">Close</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">Pat</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">JGD</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">JWD</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 whitespace-nowrap">Cond #</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 whitespace-nowrap">Trigger</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const isMerged  = row.is_merged;
                      const hasAction = row.action_condition_no != null;
                      const rowBg = isMerged
                        ? 'rgba(251,191,36,0.08)'
                        : hasAction
                          ? 'rgba(59,130,246,0.07)'
                          : 'transparent';

                      const isExpanded = expandedRow === (row.id ?? idx);
                      return (
                        <React.Fragment key={row.id ?? idx}>
                        <tr
                          className="transition-all cursor-pointer hover:brightness-110"
                          style={{ background: rowBg, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                          onClick={() => setExpandedRow(isExpanded ? null : (row.id ?? idx))}
                        >
                          <td className="px-3 py-2 font-mono text-xs text-gray-300 whitespace-nowrap">
                            {fmtTs(row.bar_end_uk)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isMerged ? (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold text-amber-300" style={{ background: 'rgba(245,158,11,0.18)' }}>
                                {row.bars_count}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">1</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-200">{fmtNum(row.open)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-emerald-400">{fmtNum(row.high)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-red-400">{fmtNum(row.low)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-200">{fmtNum(row.close)}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-xs font-mono text-gray-300" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              {row.d_pat ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-300">{fmtNum(row.jgd)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-300">{fmtNum(row.jwd)}</td>
                          <td className="px-3 py-2 text-center">
                            {hasAction ? (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold text-blue-300" style={{ background: 'rgba(59,130,246,0.18)' }}>
                                C{row.action_condition_no}
                              </span>
                            ) : <span className="text-gray-600 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.trigger_level_name ? (
                              <span className={`text-xs font-mono ${
                                row.trigger_direction === 'ABOVE' ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {row.trigger_level_name} {row.trigger_direction === 'ABOVE' ? '↑' : '↓'}
                              </span>
                            ) : <span className="text-gray-600 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setTradingPlan({
                                  ts: row.bar_end_uk,
                                  mergedOhlc: row.is_merged
                                    ? { high: row.high, low: row.low, close: row.close }
                                    : null,
                                });
                              }}
                              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.30)', color: '#10b981' }}
                              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                            >
                              <BarChart2 size={11} /> Plan
                            </button>
                          </td>
                        </tr>
                        {isExpanded && Array.isArray(row.bar_details) && row.bar_details.length > 0 && (
                          <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                            <td colSpan={12} className="px-4 py-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                              <div className="text-xs font-semibold text-indigo-300 mb-2">
                                Bar-by-bar eval ({row.bar_details.length} bar{row.bar_details.length > 1 ? 's' : ''})
                              </div>
                              {(() => {
                                const planPat = row.bar_details[0]?.prev_d_pat;
                                const showMutp = planPat === '3+1' || planPat === '2+1';
                                const showMdtp = planPat === '2+2';
                                const n   = (v) => v != null ? Number(v).toFixed(2) : '—';
                                const chk = (v) => v == null
                                  ? <span className="text-gray-600">—</span>
                                  : v
                                    ? <span className="text-emerald-400 font-bold">✓</span>
                                    : <span className="text-red-400">✗</span>;
                                let runH = -Infinity, runL = Infinity;
                                const accOHLC = row.bar_details.map((bd, i) => {
                                  runH = Math.max(runH, bd.high ?? -Infinity);
                                  runL = Math.min(runL, bd.low  ??  Infinity);
                                  return {
                                    open:  i === 0 ? bd.open : row.bar_details[0].open,
                                    high:  runH,
                                    low:   runL,
                                    close: bd.close,
                                  };
                                });
                                return (
                                <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                  <thead>
                                    <tr className="text-left text-gray-500" style={{ borderBottom: '1px solid rgba(99,102,241,0.20)' }}>
                                      <th className="pr-3 py-1 font-semibold whitespace-nowrap">Time</th>
                                      <th className="pr-3 py-1 font-semibold">Plan</th>
                                      <th className="pr-3 py-1 font-semibold">Sit</th>
                                      <th className="pr-3 py-1 font-semibold">UTP</th>
                                      {showMutp && <th className="pr-3 py-1 font-semibold">MUTP</th>}
                                      <th className="pr-3 py-1 font-semibold">DTP</th>
                                      {showMdtp && <th className="pr-3 py-1 font-semibold">MDTP</th>}
                                      <th className="pr-3 py-1 font-semibold text-gray-500">O</th>
                                      <th className="pr-3 py-1 font-semibold text-emerald-500">H</th>
                                      <th className="pr-3 py-1 font-semibold text-red-500">L</th>
                                      <th className="pr-3 py-1 font-semibold text-gray-400">C</th>
                                      <th className="pr-3 py-1 font-semibold whitespace-nowrap">NH/NL Target</th>
                                      <th className="pr-3 py-1 font-semibold">NH ✓</th>
                                      <th className="pr-3 py-1 font-semibold whitespace-nowrap">Station</th>
                                      <th className="pr-3 py-1 font-semibold whitespace-nowrap">TVHS/TVLS</th>
                                      <th className="pr-3 py-1 font-semibold">TV ✓</th>
                                      <th className="pr-3 py-1 font-semibold">Fired?</th>
                                      <th className="pr-3 py-1 font-semibold">Plan</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.bar_details.map((bd, bi) => {
                                      const nhOk  = bd.new_high_cleared ?? bd.new_low_cleared;
                                      const tvOk  = bd.tvhs_cleared ?? bd.tvls_cleared;
                                      const fired = bd.fired;
                                      const acc   = accOHLC[bi];
                                      return (
                                        <tr key={bi} style={{ borderBottom: '1px solid rgba(99,102,241,0.10)', background: fired ? 'rgba(59,130,246,0.10)' : 'transparent' }}>
                                          <td className="pr-3 py-1 font-mono whitespace-nowrap text-gray-400">{bd.ts ? String(bd.ts).slice(0, 16).replace('T', ' ') : '—'}</td>
                                          <td className="pr-3 py-1 font-mono font-bold text-violet-400">{bd.prev_d_pat ?? '—'}</td>
                                          <td className="pr-3 py-1 font-mono text-gray-300">{bd.d_pat ?? '—'}</td>
                                          <td className="pr-3 py-1 font-mono text-blue-400">{n(bd.utp)}</td>
                                          {showMutp && <td className="pr-3 py-1 font-mono text-blue-300">{n(bd.mutp)}</td>}
                                          <td className="pr-3 py-1 font-mono text-red-400">{n(bd.dtp)}</td>
                                          {showMdtp && <td className="pr-3 py-1 font-mono text-red-300">{n(bd.mdtp)}</td>}
                                          <td className="pr-3 py-1 font-mono text-gray-500">{n(acc?.open)}</td>
                                          <td className="pr-3 py-1 font-mono text-emerald-400 font-medium">{n(acc?.high)}</td>
                                          <td className="pr-3 py-1 font-mono text-red-400 font-medium">{n(acc?.low)}</td>
                                          <td className="pr-3 py-1 font-mono text-gray-300">{n(acc?.close)}</td>
                                          <td className="pr-3 py-1 font-mono text-gray-400">{n(bd.new_high_target ?? bd.new_low_target)}</td>
                                          <td className="pr-3 py-1 text-center">{chk(nhOk)}</td>
                                          <td className="pr-3 py-1 font-mono text-indigo-400">{bd.utp_trigger || bd.dtp_trigger || '—'}</td>
                                          <td className="pr-3 py-1 font-mono text-gray-400">{n(bd.tvhs ?? bd.tvls)}</td>
                                          <td className="pr-3 py-1 text-center">{chk(tvOk)}</td>
                                          <td className="pr-3 py-1 text-center">{fired ? <span className="px-1.5 py-0.5 rounded text-blue-300 font-bold" style={{ background: 'rgba(59,130,246,0.18)' }}>C{bd.rule_no}</span> : <span className="text-gray-600">—</span>}</td>
                                          <td className="pr-3 py-1">
                                            <button
                                              onClick={() => setTradingPlan({ ts: bd.ts, mergedOhlc: null })}
                                              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}
                                              className="rounded px-1.5 py-0.5 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors"
                                            >
                                              Plan
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                                );
                              })()}
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Load more */}
            {hasMore && (
              <div className="p-3 flex justify-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
            <p className="text-sm text-gray-400">Past merge analysis sessions</p>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-100 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading history…</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm rounded-2xl" style={glassStyle}>
              No past sessions found.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div
                  key={s.session_id}
                  className="rounded-2xl p-4 flex items-start justify-between gap-4 transition-all cursor-pointer hover:brightness-110"
                  style={glassStyle}
                  onClick={() => handleLoadHistorySession(s)}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-gray-100">
                        {s.symbol} / {s.timeframe}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${s.status === 'complete' ? 'text-emerald-300'
                          : s.status === 'error'  ? 'text-red-400'
                          : s.status === 'running' ? 'text-blue-300'
                          : 'text-gray-400'}`}
                        style={{
                          background: s.status === 'complete' ? 'rgba(16,185,129,0.15)'
                            : s.status === 'error' ? 'rgba(239,68,68,0.15)'
                            : s.status === 'running' ? 'rgba(59,130,246,0.15)'
                            : 'rgba(255,255,255,0.06)'
                        }}>
                        {s.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {s.start_date?.slice(0, 10)} → {s.end_date?.slice(0, 10)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {Array.isArray(s.rules_applied) && (
                        <span className="text-xs text-gray-500">
                          Rules: {s.rules_applied.join(', ')}
                        </span>
                      )}
                      {s.total_input_bars != null && (
                        <span className="text-xs text-gray-500">
                          {s.total_input_bars} bars → {s.total_output_units} units
                          {s.merged_units_count != null && ` (${s.merged_units_count} merged, ${s.standalone_units_count ?? 0} standalone)`}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 font-mono truncate">
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
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
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

    <BatchTradingPlanModal
      ts={tradingPlan?.ts}
      symbol={symbol}
      timeframe={session?.timeframe || timeframe}
      mergedOhlc={tradingPlan?.mergedOhlc}
      onClose={() => setTradingPlan(null)}
    />
  );
}
