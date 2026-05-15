import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import api from '../services/api';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtPrice  = (v) => (v == null ? '—' : Number(v).toFixed(5));
const fmtPts    = (v) => (v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(2));
const fmtCur    = (v) => (v == null ? '—' : (v >= 0 ? '+$' : '-$') + Math.abs(Number(v)).toFixed(2));
const fmtLots   = (v) => (v == null ? '—' : Number(v).toFixed(2));

function fmtDuration(secs) {
  if (secs == null) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return iso.slice(0, 16).replace('T', ' ');
}

/* ─── Shared UI ────────────────────────────────────────────────────────────── */
const Sel = ({ value, onChange, children, className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="input-dark appearance-none cursor-pointer pr-7 w-full text-sm"
      style={{ background: '#0d1421', color: '#f9fafb', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      {children}
    </select>
    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
  </div>
);

const StatCard = ({ label, value, sub, color }) => (
  <div className="flex flex-col gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 min-w-0">
    <span className="text-xs text-text-dim truncate">{label}</span>
    <span className={`text-base font-semibold font-mono truncate ${color || 'text-text-base'}`}>{value}</span>
    {sub && <span className="text-xs text-text-dim">{sub}</span>}
  </div>
);

const DirBadge = ({ dir }) => {
  if (dir === 'BUY')  return <span className="flex items-center gap-1 text-xs font-semibold text-green-400"><TrendingUp size={10}/>BUY</span>;
  if (dir === 'SELL') return <span className="flex items-center gap-1 text-xs font-semibold text-red-400"><TrendingDown size={10}/>SELL</span>;
  return <span className="text-xs text-text-dim">{dir || '—'}</span>;
};

const SourceBadge = ({ source }) =>
  source === 'mt5_history'
    ? <span className="text-[10px] font-medium text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">MT5</span>
    : <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">BOT</span>;

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════════ */
const TODAY     = new Date().toISOString().slice(0, 10);
const LAST_YEAR = new Date(Date.now() - 365 * 86400 * 1000).toISOString().slice(0, 10);

export default function TradeJournal() {
  const [trades,    setTrades]    = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [error,     setError]     = useState('');

  /* Filters */
  const [symbol,     setSymbol]     = useState('');
  const [fromDate,   setFromDate]   = useState(LAST_YEAR);
  const [toDate,     setToDate]     = useState(TODAY);

  /* MT5 import state */
  const [accounts,    setAccounts]    = useState([]);
  const [importAccId, setImportAccId] = useState('');
  const [importFrom,  setImportFrom]  = useState(LAST_YEAR);
  const [importTo,    setImportTo]    = useState(TODAY);
  const [showImport,  setShowImport]  = useState(false);

  /* All symbols seen (for filter dropdown) */
  const symbols = ['', ...Array.from(new Set(trades.map(t => t.symbol).filter(Boolean))).sort()];

  /* ── Load accounts ─────────────────────────────────────────────────────── */
  useEffect(() => {
    api.getMT5Accounts?.().then(res => {
      const list = res?.accounts || res?.data || [];
      setAccounts(list);
      if (list.length > 0) setImportAccId(String(list[0].id));
    }).catch(() => {});
  }, []);

  /* ── Load journal ──────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getTradeJournal({
        symbol:    symbol || undefined,
        from_date: fromDate,
        to_date:   toDate,
        limit:     1000,
      });
      setTrades(res?.trades || []);
      setSummary(res?.summary || null);
    } catch (err) {
      setError(err.message || 'Failed to load trades.');
    } finally {
      setLoading(false);
    }
  }, [symbol, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  /* ── Import MT5 history ────────────────────────────────────────────────── */
  const handleImport = async () => {
    if (!importAccId) return;
    setImporting(true);
    setError('');
    try {
      const res = await api.getMT5History(importAccId, importFrom, importTo);
      const mt5Trades = res?.trades || [];
      // Merge: prepend MT5 trades (tagged with source='mt5_history'), avoid duplicates by ticket
      const existingTickets = new Set(trades.map(t => t.ticket).filter(Boolean));
      const newTrades = mt5Trades.filter(t => !existingTickets.has(t.ticket));
      const merged = [...newTrades, ...trades].sort((a, b) =>
        (b.entry_time || '').localeCompare(a.entry_time || '')
      );
      setTrades(merged);
      // Recompute summary from merged list
      const closedMerged = merged.filter(t => t.pnl_points != null);
      const winsMerged   = closedMerged.filter(t => t.pnl_points > 0);
      setSummary(prev => ({
        ...(prev || {}),
        total_trades:    merged.length,
        winning_trades:  winsMerged.length,
        losing_trades:   closedMerged.length - winsMerged.length,
        net_pnl_points:  closedMerged.reduce((s, t) => s + (t.pnl_points || 0), 0),
        net_pnl_currency: closedMerged.reduce((s, t) => s + (t.pnl_currency || 0), 0),
      }));
      setShowImport(false);
    } catch (err) {
      setError(err.message || 'MT5 import failed.');
    } finally {
      setImporting(false);
    }
  };

  /* ── Filtered view (client-side symbol filter on MT5-imported rows) ──── */
  const visible = symbol ? trades.filter(t => t.symbol === symbol) : trades;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 flex flex-col gap-5 h-full overflow-auto"
    >
      {/* ── Summary cards ───────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label="Total Trades"    value={summary.total_trades} />
          <StatCard
            label="Win Rate"
            value={`${summary.win_rate ?? 0}%`}
            sub={`${summary.winning_trades}W / ${summary.losing_trades}L`}
            color={summary.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}
          />
          <StatCard
            label="Net P&L (pts)"
            value={fmtPts(summary.net_pnl_points)}
            color={summary.net_pnl_points >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <StatCard
            label="Net P&L ($)"
            value={summary.net_pnl_currency != null ? fmtCur(summary.net_pnl_currency) : '—'}
            color={(summary.net_pnl_currency ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <StatCard
            label="Profit Factor"
            value={summary.profit_factor ?? '—'}
            color={summary.profit_factor >= 1 ? 'text-green-400' : 'text-red-400'}
          />
          <StatCard label="Avg Duration"    value={fmtDuration(summary.avg_duration_seconds)} />
          <StatCard
            label="Best Trade"
            value={fmtPts(summary.best_trade_pts)}
            color="text-green-400"
          />
          <StatCard
            label="Worst Trade"
            value={fmtPts(summary.worst_trade_pts)}
            color="text-red-400"
          />
        </div>
      )}

      {/* ── Filters + actions ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-dim">Symbol</span>
          <Sel value={symbol} onChange={setSymbol} className="w-32">
            <option value="">All symbols</option>
            {symbols.filter(Boolean).map(s => <option key={s}>{s}</option>)}
          </Sel>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-dim">From</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="input-dark text-sm w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-dim">To</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="input-dark text-sm w-36" />
        </div>

        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.09] transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>

        <button onClick={() => setShowImport(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-300 transition-colors ml-auto">
          <Download size={13} />
          Import MT5 History
        </button>
      </div>

      {/* ── MT5 Import panel ────────────────────────────────────────────── */}
      {showImport && (
        <div className="flex flex-wrap items-end gap-3 bg-purple-500/[0.06] border border-purple-500/20 rounded-xl p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-dim">Account</span>
            <Sel value={importAccId} onChange={setImportAccId} className="w-48">
              {accounts.map(a => (
                <option key={a.id} value={a.id}>#{a.account_number} {a.account_name || ''}</option>
              ))}
            </Sel>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-dim">From</span>
            <input type="date" value={importFrom} onChange={e => setImportFrom(e.target.value)}
              className="input-dark text-sm w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-dim">To</span>
            <input type="date" value={importTo} onChange={e => setImportTo(e.target.value)}
              className="input-dark text-sm w-36" />
          </div>
          <button onClick={handleImport} disabled={importing || !importAccId}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-purple-500/80 hover:bg-purple-500 text-white transition-colors disabled:opacity-50">
            {importing
              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Download size={13} />
            }
            {importing ? 'Importing…' : 'Pull from MT5'}
          </button>
          <p className="text-xs text-text-dim w-full">
            Fetches closed deals from your MT5 terminal and merges them into the table below (purple rows).
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* ── Commission + swap totals ─────────────────────────────────────── */}
      {summary && (summary.total_commission !== 0 || summary.total_swap !== 0) && (
        <div className="flex items-center gap-4 text-xs text-text-dim">
          <span>Total commission: <span className="text-red-400 font-mono">{fmtCur(-(summary.total_commission || 0))}</span></span>
          <span>Total swap: <span className={`font-mono ${(summary.total_swap || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtCur(summary.total_swap || 0)}</span></span>
          <span>Open positions: <span className="text-yellow-400">{summary.open_trades}</span></span>
        </div>
      )}

      {/* ── Trade table ─────────────────────────────────────────────────── */}
      {loading && !trades.length && (
        <div className="flex items-center justify-center py-16 gap-3 text-text-muted text-sm">
          <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Loading trades…
        </div>
      )}

      {!loading && !visible.length && (
        <div className="flex items-center justify-center py-16 text-sm text-text-dim">
          No trades found for the selected filters.
        </div>
      )}

      {visible.length > 0 && (
        <div className="overflow-auto rounded-xl border border-white/[0.06] flex-1">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-white/[0.08] bg-[#0d1421]">
                {[
                  '#', 'Source', 'Entry Time', 'Exit Time', 'Symbol', 'TF',
                  'Dir', 'Lots', 'Entry', 'Exit', 'SL',
                  'Duration', 'P&L pts', 'P&L $', 'Commission', 'Swap',
                  'Reason', 'Strategy', 'Account',
                ].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-text-dim">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((t, idx) => {
                const pnl       = t.pnl_points;
                const isMT5     = t.source === 'mt5_history';
                const isOpen    = t.exit_reason === 'open';
                const rowBg     = isOpen
                  ? 'bg-yellow-400/[0.03]'
                  : pnl == null ? ''
                    : pnl > 0 ? 'bg-green-400/[0.03]' : 'bg-red-400/[0.03]';
                const pnlColor  = isOpen ? 'text-yellow-400'
                  : pnl == null ? 'text-text-dim'
                    : pnl > 0 ? 'text-green-400' : 'text-red-400';
                const curColor  = (t.pnl_currency ?? 0) >= 0 ? 'text-green-400' : 'text-red-400';

                return (
                  <tr key={`${t.id ?? t.ticket}-${idx}`}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${rowBg}`}>
                    <td className="px-3 py-2 font-mono text-text-dim">{idx + 1}</td>
                    <td className="px-3 py-2"><SourceBadge source={t.source} /></td>
                    <td className="px-3 py-2 font-mono text-text-muted">{fmtDate(t.entry_time)}</td>
                    <td className="px-3 py-2 font-mono text-text-muted">{fmtDate(t.exit_time)}</td>
                    <td className="px-3 py-2 font-medium text-text-base">{t.symbol || '—'}</td>
                    <td className="px-3 py-2 text-text-dim">{t.timeframe || '—'}</td>
                    <td className="px-3 py-2"><DirBadge dir={t.direction} /></td>
                    <td className="px-3 py-2 font-mono text-text-muted">{fmtLots(t.lot_size)}</td>
                    <td className="px-3 py-2 font-mono text-text-base">{fmtPrice(t.entry_price)}</td>
                    <td className="px-3 py-2 font-mono text-text-muted">{fmtPrice(t.exit_price)}</td>
                    <td className="px-3 py-2 font-mono text-text-dim">{fmtPrice(t.sl)}</td>
                    <td className="px-3 py-2 text-text-dim">{fmtDuration(t.duration_seconds)}</td>
                    <td className={`px-3 py-2 font-mono font-semibold ${pnlColor}`}>{fmtPts(pnl)}</td>
                    <td className={`px-3 py-2 font-mono font-semibold ${curColor}`}>
                      {t.pnl_currency != null ? fmtCur(t.pnl_currency) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-red-400/80">
                      {t.commission != null ? fmtCur(t.commission) : '—'}
                    </td>
                    <td className={`px-3 py-2 font-mono ${(t.swap ?? 0) >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
                      {t.swap != null ? fmtCur(t.swap) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {t.exit_reason === 'SL'
                        ? <span className="text-red-400">SL hit</span>
                        : t.exit_reason === 'opposite_signal'
                          ? <span className="text-blue-400">Opposite signal</span>
                          : t.exit_reason === 'open'
                            ? <span className="text-yellow-400">Open</span>
                            : <span className="text-text-dim">{t.exit_reason || '—'}</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-text-dim">{t.strategy || '—'}</td>
                    <td className="px-3 py-2 font-mono text-text-dim">
                      {t.account_number ? `#${t.account_number}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-dim">
        {visible.length} trade{visible.length !== 1 ? 's' : ''} shown.
        P&L in currency is approximate — actual amounts depend on lot size, instrument tick value, and broker charges.
      </p>
    </motion.div>
  );
}
