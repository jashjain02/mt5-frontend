import { useState, Fragment } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, RefreshCw, ChevronDown, ChevronUp, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'H5', 'D1', 'W1', 'MN1'];
const RC_FC_LEVELS = ['14.60%', '23.60%', '38.20%', '61.80%', '100.00%', '138.20%', '161.80%', '261.80%', '423.60%'];
const ABOVE_BELOW_LEVELS = ['14.60%', '23.60%', '38.20%', '61.80%', '100.00%', '138.20%', '161.80%', '261.80%'];
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

function DPatBadge({ value }) {
  if (!value) return <span className="text-text-muted text-xs">—</span>;
  const styles = {
    '3+1': { bg: 'rgba(16,185,129,0.18)',  text: '#10b981', border: 'rgba(16,185,129,0.40)' },
    '2+2': { bg: 'rgba(59,130,246,0.18)',  text: '#3b82f6', border: 'rgba(59,130,246,0.40)' },
    '2+1': { bg: 'rgba(249,115,22,0.18)',  text: '#f97316', border: 'rgba(249,115,22,0.40)' },
  };
  const s = styles[value] || { bg: 'rgba(107,114,128,0.18)', text: '#9ca3af', border: 'rgba(107,114,128,0.40)' };
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
          className="px-2 py-0.5 rounded text-xs font-mono font-semibold">
      {value}
    </span>
  );
}

function Delta({ raw, merged }) {
  if (raw == null || merged == null || Math.abs(merged - raw) < 0.001) return null;
  return (
    <span className={`text-xs ml-1 ${merged > raw ? 'text-emerald-400' : 'text-red-400'}`}>
      {merged > raw ? '▲' : '▼'}
    </span>
  );
}

function SectionHeader({ label, textColor = '#10b981', bgColor = 'rgba(16,185,129,0.15)' }) {
  return (
    <tr>
      <td colSpan={3} className="pt-3 pb-1 px-3">
        <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: bgColor, color: textColor }}>
          {label}
        </span>
      </td>
    </tr>
  );
}

function CompareRow({ label, raw, merged, isText = false }) {
  const fmt = (v) => v == null ? '—' : isText ? v : Number(v).toFixed(1);
  const changed = !isText && raw != null && merged != null && Math.abs(merged - raw) >= 0.001;
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
      <td className="py-1.5 px-3 text-xs text-text-muted w-28">{label}</td>
      <td className="py-1.5 px-3 text-xs font-mono text-text-base">{fmt(raw)}</td>
      <td className={`py-1.5 px-3 text-xs font-mono ${changed ? 'text-emerald-300 font-semibold' : 'text-text-base'}`}>
        {fmt(merged)}
        {!isText && <Delta raw={raw} merged={merged} />}
      </td>
    </tr>
  );
}

function ExpandedDetail({ row, showAdvanced, onToggleAdvanced }) {
  const { raw, merged } = row;
  if (!merged) return null;

  return (
    <div style={{ background: 'rgba(0,0,0,0.20)', borderTop: '1px solid rgba(255,255,255,0.06)' }} className="px-4 py-4">
      {/* Column headers shared */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* OHLC + Indicators */}
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium w-28">Field</th>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Raw</th>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Merged</th>
            </tr>
          </thead>
          <tbody>
            <SectionHeader label="OHLC" />
            <CompareRow label="High"      raw={raw?.high}      merged={merged.high} />
            <CompareRow label="Low"       raw={raw?.low}       merged={merged.low} />
            <CompareRow label="Close"     raw={raw?.close}     merged={merged.close} />
            <SectionHeader label="Indicators" textColor="#3b82f6" bgColor="rgba(59,130,246,0.15)" />
            <CompareRow label="JGD"       raw={raw?.jgd}       merged={merged.jgd} />
            <CompareRow label="JWD"       raw={raw?.jwd}       merged={merged.jwd} />
            <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
              <td className="py-1.5 px-3 text-xs text-text-muted w-28">d_pat</td>
              <td className="py-1.5 px-3"><DPatBadge value={raw?.d_pat} /></td>
              <td className="py-1.5 px-3"><DPatBadge value={merged.d_pat} /></td>
            </tr>
            <CompareRow label="abs_range" raw={raw?.abs_range} merged={merged.abs_range} />
            <CompareRow label="buffer"    raw={raw?.buffer}    merged={merged.buffer} />
          </tbody>
        </table>

        {/* Reference levels */}
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium w-28">Field</th>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Raw</th>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Merged</th>
            </tr>
          </thead>
          <tbody>
            <SectionHeader label="Reference Levels" textColor="#f59e0b" bgColor="rgba(245,158,11,0.15)" />
            {Object.entries(merged.ref || {}).map(([k, v]) => (
              <CompareRow key={k} label={k} raw={raw?.ref?.[k]} merged={v} />
            ))}
          </tbody>
        </table>
      </div>

      {/* RC + FC */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium w-24">Level</th>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Raw</th>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Merged</th>
            </tr>
          </thead>
          <tbody>
            <SectionHeader label="Rising Channel" />
            {RC_FC_LEVELS.map(lvl => (
              <CompareRow key={lvl} label={lvl} raw={raw?.rc?.[lvl]} merged={merged.rc?.[lvl]} />
            ))}
          </tbody>
        </table>

        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium w-24">Level</th>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Raw</th>
              <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Merged</th>
            </tr>
          </thead>
          <tbody>
            <SectionHeader label="Falling Channel" textColor="#ef4444" bgColor="rgba(239,68,68,0.15)" />
            {RC_FC_LEVELS.map(lvl => (
              <CompareRow key={lvl} label={lvl} raw={raw?.fc?.[lvl]} merged={merged.fc?.[lvl]} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Above / Below toggle */}
      <button onClick={onToggleAdvanced}
              className="mt-4 flex items-center gap-1 text-xs text-text-muted hover:text-text-base transition-colors">
        {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showAdvanced ? 'Hide' : 'Show'} above / below rows
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-3">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium w-24">Level</th>
                <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Raw</th>
                <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Merged</th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader label="RC Above" />
              {ABOVE_BELOW_LEVELS.map(lvl => (
                <CompareRow key={lvl} label={lvl} raw={raw?.rc_above?.[lvl]} merged={merged.rc_above?.[lvl]} />
              ))}
              <SectionHeader label="RC Below" textColor="#6ee7b7" bgColor="rgba(16,185,129,0.08)" />
              {ABOVE_BELOW_LEVELS.map(lvl => (
                <CompareRow key={lvl} label={lvl} raw={raw?.rc_below?.[lvl]} merged={merged.rc_below?.[lvl]} />
              ))}
            </tbody>
          </table>

          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium w-24">Level</th>
                <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Raw</th>
                <th className="text-left py-1.5 px-3 text-xs text-text-muted font-medium">Merged</th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader label="FC Above" textColor="#ef4444" bgColor="rgba(239,68,68,0.15)" />
              {ABOVE_BELOW_LEVELS.map(lvl => (
                <CompareRow key={lvl} label={lvl} raw={raw?.fc_above?.[lvl]} merged={merged.fc_above?.[lvl]} />
              ))}
              <SectionHeader label="FC Below" textColor="#fca5a5" bgColor="rgba(239,68,68,0.08)" />
              {ABOVE_BELOW_LEVELS.map(lvl => (
                <CompareRow key={lvl} label={lvl} raw={raw?.fc_below?.[lvl]} merged={merged.fc_below?.[lvl]} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MergedData() {
  const [symbol, setSymbol]       = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [loaded, setLoaded]       = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [offset, setOffset]       = useState(0);
  const [hasMore, setHasMore]     = useState(false);

  const toggleExpand = (ts) => {
    setExpanded(prev => prev === ts ? null : ts);
    setShowAdvanced(false);
  };

  const fetchData = async (newOffset = 0) => {
    if (!symbol || !timeframe) return;
    setLoading(true);
    setError(null);
    try {
      const opts = { limit: LIMIT, offset: newOffset };
      if (startDate) opts.startDate = startDate;
      if (endDate)   opts.endDate   = endDate;
      const resp = await api.getMergedBars(symbol, timeframe, opts);
      if (resp?.success) {
        setRows(resp.data || []);
        setHasMore((resp.data || []).length === LIMIT);
        setOffset(newOffset);
        setLoaded(true);
        setExpanded(null);
        setShowAdvanced(false);
      } else {
        setError(resp?.message || 'Failed to load merged bars');
      }
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
                className="p-6 space-y-5 max-w-full">

      {/* Filter bar */}
      <div style={glass} className="rounded-2xl p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Symbol</label>
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
                   style={darkInput}
                   className="rounded-lg px-3 py-2 text-sm w-28 outline-none focus:border-accent/50 transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Timeframe</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)}
                    style={darkInput}
                    className="rounded-lg px-3 py-2 text-sm w-24 outline-none focus:border-accent/50 transition-colors">
              {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                   style={darkInput}
                   className="rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50 transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                   style={darkInput}
                   className="rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50 transition-colors" />
          </div>
          <button onClick={() => fetchData(0)} disabled={loading}
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.30)', color: '#10b981' }}
                  className="rounded-lg px-5 py-2 text-sm font-medium flex items-center gap-2 hover:bg-accent/20 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Load
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Results table */}
      {loaded && (
        <div style={glass} className="rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
            <GitCompare size={15} className="text-accent" />
            <span className="text-sm text-text-muted">
              <span className="text-emerald-400 font-semibold">{rows.length}</span> merged bar{rows.length !== 1 ? 's' : ''} loaded
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="px-5 py-14 text-center text-text-muted text-sm">
              No merged bars found for the selected filters.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-text-muted">Timestamp</th>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-text-muted">Base Bar</th>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-text-muted">d_pat change</th>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-text-muted">Merged H / L / C</th>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-text-muted">Rule</th>
                      <th className="py-2.5 px-4 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const isExp = expanded === row.timestamp;
                      return (
                        <Fragment key={row.timestamp}>
                          <tr onClick={() => toggleExpand(row.timestamp)}
                              className="border-b border-white/[0.04] cursor-pointer transition-colors duration-150"
                              style={{ background: isExp ? 'rgba(16,185,129,0.06)' : undefined }}
                              onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                              onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = ''; }}>
                            <td className="py-2.5 px-4 text-xs font-mono text-text-base whitespace-nowrap">{row.timestamp}</td>
                            <td className="py-2.5 px-4 text-xs font-mono text-text-muted whitespace-nowrap">{row.base_bar_ts || '—'}</td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <DPatBadge value={row.raw?.d_pat} />
                                <span className="text-text-dim text-xs">→</span>
                                <DPatBadge value={row.merged?.d_pat} />
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-xs font-mono text-text-base whitespace-nowrap">
                              {row.merged_high} / {row.merged_low} / {row.merged_close}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-text-muted">{row.rule_matched || '—'}</td>
                            <td className="py-2.5 px-4 text-text-muted">
                              {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </td>
                          </tr>
                          {isExp && (
                            <tr>
                              <td colSpan={6} className="p-0">
                                <ExpandedDetail row={row}
                                                showAdvanced={showAdvanced}
                                                onToggleAdvanced={() => setShowAdvanced(p => !p)} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
                <button onClick={() => fetchData(offset - LIMIT)}
                        disabled={offset === 0 || loading}
                        className="flex items-center gap-1 text-xs text-text-muted hover:text-text-base disabled:opacity-40 transition-colors">
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-xs text-text-muted">
                  Showing {offset + 1}–{offset + rows.length}
                </span>
                <button onClick={() => fetchData(offset + LIMIT)}
                        disabled={!hasMore || loading}
                        className="flex items-center gap-1 text-xs text-text-muted hover:text-text-base disabled:opacity-40 transition-colors">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state before first load */}
      {!loaded && !loading && !error && (
        <div style={glass} className="rounded-2xl px-5 py-14 text-center">
          <GitCompare size={32} className="text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-text-muted text-sm">Select filters and click Load to view merged bar comparisons.</p>
        </div>
      )}
    </motion.div>
  );
}
