import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Zap, Square, TrendingUp, TrendingDown,
  Circle, CheckCircle2, AlertCircle, Clock, MousePointerClick,
} from 'lucide-react';
import api from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL   = API_BASE.replace(/^http/, 'ws') + '/execute/ws';

/* ─── Option sets ────────────────────────────────────────────────────────── */
const SYMBOLS = [
  'XAUUSD','EURUSD','GBPUSD','USDJPY','USDCHF',
  'AUDUSD','USDCAD','NZDUSD','EURJPY','GBPJPY',
  'XAGUSD','US30','NAS100','SPX500',
];
const TIMEFRAMES = ['M1','M5','M15','M30','H1','H4','D1','W1','MN1'];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtPrice = (v) => (v == null ? '—' : Number(v).toFixed(5));
const fmtPts   = (v) => (v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(2));

function elapsed(startedAt) {
  if (!startedAt) return '';
  const secs = Math.floor((Date.now() - new Date(startedAt)) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ─── Manual Trade Panel ─────────────────────────────────────────────────── */
function ManualTradePanel({ accounts }) {
  const [open,       setOpen]       = useState(false);
  const [symbol,     setSymbol]     = useState('XAUUSD');
  const [direction,  setDirection]  = useState('BUY');
  const [lotSize,    setLotSize]    = useState('0.01');
  const [sl,         setSl]         = useState('');
  const [accountId,  setAccountId]  = useState('');
  const [placing,    setPlacing]    = useState(false);
  const [notice,     setNotice]     = useState(null);  // { ok, msg }
  const [positions,  setPositions]  = useState([]);
  const [closing,    setClosing]    = useState({});    // { [ticket]: true }

  // Set default account
  useEffect(() => {
    if (accounts.length > 0 && !accountId) setAccountId(String(accounts[0].id));
  }, [accounts]);

  // Poll open positions every 5s when panel is open
  const loadPositions = useCallback(async (accId) => {
    if (!accId) return;
    try {
      const res = await api.getOpenPositions(accId);
      setPositions(res?.positions || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!open || !accountId) return;
    loadPositions(accountId);
    const id = setInterval(() => loadPositions(accountId), 5000);
    return () => clearInterval(id);
  }, [open, accountId, loadPositions]);

  // Place order
  const handlePlace = async () => {
    if (!accountId) return;
    setPlacing(true);
    setNotice(null);
    try {
      const res = await api.placeManualTrade({
        account_id: parseInt(accountId),
        symbol, direction,
        lot_size: parseFloat(lotSize) || 0.01,
        sl: sl ? parseFloat(sl) : null,
      });
      setNotice({ ok: true, msg: `✓ ${direction} placed — Ticket #${res.ticket} | Fill: ${Number(res.fill_price).toFixed(5)}` });
      // Refresh positions after a short delay so MT5 registers it
      setTimeout(() => loadPositions(accountId), 1500);
    } catch (err) {
      setNotice({ ok: false, msg: `✗ ${err.message || 'Order failed'}` });
    } finally {
      setPlacing(false);
    }
  };

  // Close (square off) a position
  const handleClose = async (pos) => {
    setClosing(c => ({ ...c, [pos.ticket]: true }));
    setNotice(null);
    try {
      const res = await api.closeManualTrade(
        pos.ticket, parseInt(accountId),
        pos.symbol, pos.volume, pos.type
      );
      const profit = positions.find(p => p.ticket === pos.ticket)?.profit;
      setNotice({
        ok: true,
        msg: `✓ Position #${pos.ticket} closed at ${Number(res.price).toFixed(5)} | P&L: ${profit >= 0 ? '+' : ''}$${Number(profit).toFixed(2)}`
      });
      setTimeout(() => loadPositions(accountId), 1500);
    } catch (err) {
      setNotice({ ok: false, msg: `✗ Close failed: ${err.message}` });
    } finally {
      setClosing(c => ({ ...c, [pos.ticket]: false }));
    }
  };

  const selStyle = { background: '#0d1421', color: '#f9fafb', border: '1px solid rgba(255,255,255,0.10)' };

  return (
    <div className="card-dark overflow-hidden">
      {/* Header toggle */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-text-base">
          <MousePointerClick size={15} className="text-accent" />
          Manual Trade
          <span className="text-xs font-normal text-text-dim">(testing)</span>
          {positions.length > 0 && (
            <span className="text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
              {positions.length} open
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-text-dim" /> : <ChevronDown size={14} className="text-text-dim" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-5 pb-5 flex flex-col gap-4 border-t border-white/[0.06] pt-4">

              {/* ── Place order row ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                {/* Account */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-text-dim">Account</span>
                  <div className="relative">
                    <select value={accountId} onChange={e => { setAccountId(e.target.value); }}
                      className="input-dark appearance-none cursor-pointer pr-7 w-full text-sm" style={selStyle}>
                      {accounts.map(a => <option key={a.id} value={a.id}>#{a.account_number}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                  </div>
                </div>

                {/* Symbol */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-text-dim">Symbol</span>
                  <div className="relative">
                    <select value={symbol} onChange={e => setSymbol(e.target.value)}
                      className="input-dark appearance-none cursor-pointer pr-7 w-full text-sm" style={selStyle}>
                      {SYMBOLS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                  </div>
                </div>

                {/* Direction */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-text-dim">Direction</span>
                  <div className="flex gap-2 h-9">
                    <button onClick={() => setDirection('BUY')}
                      className={`flex-1 rounded-lg text-xs font-semibold transition-colors ${direction === 'BUY' ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-white/[0.04] border border-white/[0.08] text-text-dim'}`}>
                      ▲ BUY
                    </button>
                    <button onClick={() => setDirection('SELL')}
                      className={`flex-1 rounded-lg text-xs font-semibold transition-colors ${direction === 'SELL' ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-white/[0.04] border border-white/[0.08] text-text-dim'}`}>
                      ▼ SELL
                    </button>
                  </div>
                </div>

                {/* Lot size */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-text-dim">Lot Size</span>
                  <input type="number" min="0.01" step="0.01" value={lotSize}
                    onChange={e => setLotSize(e.target.value)} className="input-dark text-sm text-right" />
                </div>

                {/* SL optional */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-text-dim">Stop Loss <span className="opacity-50">(opt)</span></span>
                  <input type="number" step="0.01" value={sl} onChange={e => setSl(e.target.value)}
                    placeholder="0.00" className="input-dark text-sm text-right" />
                </div>

                {/* Place button */}
                <button onClick={handlePlace} disabled={placing || !accountId}
                  className={`h-9 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                    direction === 'BUY' ? 'bg-green-500/80 hover:bg-green-500 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'
                  }`}>
                  {placing
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : direction === 'BUY' ? '▲ Place BUY' : '▼ Place SELL'}
                </button>
              </div>

              {/* Notice bar */}
              {notice && (
                <div className={`text-xs px-3 py-2 rounded-lg ${notice.ok ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                  {notice.msg}
                </div>
              )}

              {/* ── Open positions ─────────────────────────────────────── */}
              {positions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">Open Positions</span>
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                          {['Ticket','Symbol','Type','Lots','Entry','Current P&L','SL','Action'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-medium text-text-dim whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map(pos => {
                          const pnl    = pos.profit ?? 0;
                          const pnlCol = pnl >= 0 ? 'text-green-400' : 'text-red-400';
                          return (
                            <tr key={pos.ticket} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                              <td className="px-3 py-2 font-mono text-text-dim">#{pos.ticket}</td>
                              <td className="px-3 py-2 font-medium text-text-base">{pos.symbol}</td>
                              <td className="px-3 py-2">
                                {pos.type === 'BUY'
                                  ? <span className="text-green-400 font-semibold">▲ BUY</span>
                                  : <span className="text-red-400 font-semibold">▼ SELL</span>}
                              </td>
                              <td className="px-3 py-2 font-mono text-text-muted">{pos.volume}</td>
                              <td className="px-3 py-2 font-mono text-text-base">{Number(pos.price_open).toFixed(5)}</td>
                              <td className={`px-3 py-2 font-mono font-semibold ${pnlCol}`}>
                                {pnl >= 0 ? '+' : ''}${Number(pnl).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 font-mono text-text-dim">{pos.sl ? Number(pos.sl).toFixed(5) : '—'}</td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => handleClose(pos)}
                                  disabled={closing[pos.ticket]}
                                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                  {closing[pos.ticket]
                                    ? <span className="w-3 h-3 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin inline-block" />
                                    : 'Square Off'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {positions.length === 0 && (
                <p className="text-xs text-text-dim italic">No open positions on this account.</p>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ─── Shared UI ──────────────────────────────────────────────────────────── */
const selectCls = 'input-dark appearance-none cursor-pointer pr-8 w-full';

const Sel = ({ value, onChange, children, className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={selectCls}
      style={{ background: '#0d1421', color: '#f9fafb', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      {children}
    </select>
    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
  </div>
);

const Label = ({ children }) => (
  <span className="text-xs text-text-dim mb-1 block">{children}</span>
);

const DirBadge = ({ dir }) => {
  if (dir === 'BUY')  return <span className="flex items-center gap-1 text-xs font-semibold text-green-400"><TrendingUp size={11}/>BUY</span>;
  if (dir === 'SELL') return <span className="flex items-center gap-1 text-xs font-semibold text-red-400"><TrendingDown size={11}/>SELL</span>;
  return null;
};

const StatusDot = ({ status }) => {
  if (status === 'running') return <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />;
  if (status === 'error')   return <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />;
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════════ */
export default function Execute() {
  /* Config state */
  const [strategy,   setStrategy]   = useState('strategy_1');
  const [symbol,     setSymbol]     = useState('XAUUSD');
  const [timeframe,  setTimeframe]  = useState('H1');
  const [lotSize,    setLotSize]    = useState('0.01');
  const [accountId,  setAccountId]  = useState('');

  /* Data state */
  const [accounts,   setAccounts]   = useState([]);
  const [executors,  setExecutors]  = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [trades,     setTrades]     = useState([]);
  const [error,      setError]      = useState('');
  const [launching,  setLaunching]  = useState(false);
  const [wsStatus,   setWsStatus]   = useState('disconnected');

  /* Elapsed ticker */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  /* ── Load accounts + executors on mount ─────────────────────────────────── */
  useEffect(() => {
    api.getMT5Accounts?.().then(res => {
      const accts = res?.accounts || res?.data || [];
      setAccounts(accts);
      if (accts.length > 0 && !accountId) setAccountId(String(accts[0].id));
    }).catch(() => {});
    loadExecutors();
  }, []);

  const loadExecutors = useCallback(async () => {
    try {
      const res = await api.listExecutors();
      const list = res?.executors || [];
      setExecutors(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].executor_id);
    } catch { /* ignore */ }
  }, [selectedId]);

  /* ── Load trades when selected executor changes ─────────────────────────── */
  useEffect(() => {
    if (!selectedId) { setTrades([]); return; }
    api.getExecutorTrades(selectedId).then(res => setTrades(res?.trades || [])).catch(() => {});
  }, [selectedId]);

  /* ── WebSocket ──────────────────────────────────────────────────────────── */
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus('connecting');
    const token = api.getToken();
    const ws = new WebSocket(WS_URL + (token ? `?token=${token}` : ''));

    ws.onopen = () => {
      setWsStatus('connected');
      clearTimeout(reconnectRef.current);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'executor_update') {
          setExecutors(prev => prev.map(e =>
            e.executor_id === msg.executor_id
              ? { ...e, status: msg.status, open_ticket: msg.open_ticket, open_trade: msg.open_trade }
              : e
          ));
        }
        if (msg.type === 'trade_opened' || msg.type === 'trade_closed') {
          // Reload trades for selected executor
          if (msg.executor_id === selectedId) {
            api.getExecutorTrades(selectedId).then(res => setTrades(res?.trades || [])).catch(() => {});
          }
          // Reload executor list to get updated open_trade info
          loadExecutors();
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      reconnectRef.current = setTimeout(connectWs, 4000);
    };

    ws.onerror = () => {
      setWsStatus('disconnected');
      ws.close();
    };

    wsRef.current = ws;
  }, [selectedId, loadExecutors]);

  useEffect(() => {
    connectWs();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  /* ── Start executor ─────────────────────────────────────────────────────── */
  const handleExecute = async () => {
    if (!accountId) { setError('Select an MT5 account first.'); return; }
    setError('');
    setLaunching(true);
    try {
      const res = await api.startExecutor({
        strategy,
        symbol,
        timeframe,
        lot_size:   parseFloat(lotSize) || 0.01,
        account_id: parseInt(accountId),
      });
      if (res?.success) {
        const newExec = res.executor;
        setExecutors(prev => [newExec, ...prev]);
        setSelectedId(newExec.executor_id);
      } else {
        setError(res?.detail || 'Failed to start executor.');
      }
    } catch (err) {
      setError(err.message || 'Failed to start executor.');
    } finally {
      setLaunching(false);
    }
  };

  /* ── Stop executor ──────────────────────────────────────────────────────── */
  const handleStop = async (execId) => {
    try {
      await api.stopExecutor(execId);
      setExecutors(prev => prev.map(e =>
        e.executor_id === execId ? { ...e, status: 'stopped' } : e
      ));
    } catch (err) {
      setError(err.message || 'Failed to stop executor.');
    }
  };

  const selectedExec = executors.find(e => e.executor_id === selectedId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 flex flex-col gap-5 h-full overflow-auto"
    >
      {/* ── Manual Trade panel ───────────────────────────────────────────── */}
      <ManualTradePanel accounts={accounts} />

      {/* ── Config card ───────────────────────────────────────────────────── */}
      <div className="card-dark p-5">
        <h3 className="text-sm font-semibold text-text-base mb-4">New Executor</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">

          <div>
            <Label>Strategy</Label>
            <Sel value={strategy} onChange={setStrategy}>
              <option value="strategy_1">Strategy 1 — UTP/DTP</option>
            </Sel>
          </div>

          <div>
            <Label>Symbol</Label>
            <Sel value={symbol} onChange={setSymbol}>
              {SYMBOLS.map(s => <option key={s}>{s}</option>)}
            </Sel>
          </div>

          <div>
            <Label>Timeframe</Label>
            <Sel value={timeframe} onChange={setTimeframe}>
              {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
            </Sel>
          </div>

          <div>
            <Label>Lot Size</Label>
            <input
              type="number" min="0.01" step="0.01" value={lotSize}
              onChange={e => setLotSize(e.target.value)}
              className="input-dark w-full text-right"
            />
          </div>

          <div>
            <Label>Account</Label>
            <Sel value={accountId} onChange={setAccountId}>
              {accounts.length === 0
                ? <option value="">No accounts</option>
                : accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      #{a.account_number} {a.account_name ? `(${a.account_name})` : ''}
                    </option>
                  ))
              }
            </Sel>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExecute}
              disabled={launching || !accountId}
              className="btn-accent flex items-center gap-2 w-full justify-center px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {launching
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Zap size={14} />
              }
              {launching ? 'Starting…' : 'Execute'}
            </button>
          </div>
        </div>

        {/* WS status + error */}
        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs flex items-center gap-1.5 ${
            wsStatus === 'connected' ? 'text-green-400' : 'text-text-dim'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-green-400' : 'bg-white/20'}`} />
            Live updates {wsStatus === 'connected' ? 'connected' : wsStatus}
          </span>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </div>

      {/* ── Executors list + trade detail ─────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left: executor list */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider">Executors</h3>
          {executors.length === 0 && (
            <p className="text-sm text-text-dim text-center py-8">No executors yet. Configure above and click Execute.</p>
          )}
          {executors.map(exec => {
            const isSelected = exec.executor_id === selectedId;
            const openTrade  = exec.open_trade;
            return (
              <button
                key={exec.executor_id}
                onClick={() => setSelectedId(exec.executor_id)}
                className={`w-full text-left rounded-xl border p-3 transition-all duration-150 ${
                  isSelected
                    ? 'border-accent/50 bg-accent/[0.06]'
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <StatusDot status={exec.status} />
                    <span className="text-sm font-semibold text-text-base">
                      {exec.symbol} {exec.timeframe}
                    </span>
                  </div>
                  {exec.status === 'running' && (
                    <button
                      onClick={e => { e.stopPropagation(); handleStop(exec.executor_id); }}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Square size={10} />Stop
                    </button>
                  )}
                </div>

                {/* Meta */}
                <div className="text-xs text-text-dim mb-1.5">
                  Strategy 1 · {exec.lot_size} lots
                  {exec.status === 'running' && exec.started_at &&
                    ` · ${elapsed(exec.started_at)}`
                  }
                </div>

                {/* Open trade */}
                {openTrade ? (
                  <div className="text-xs bg-white/[0.04] rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <DirBadge dir={openTrade.direction} />
                      <span className="text-text-muted">@ {fmtPrice(openTrade.entry_price)}</span>
                    </div>
                    <span className="text-text-dim">SL {fmtPrice(openTrade.sl)}</span>
                  </div>
                ) : (
                  <div className="text-xs text-text-dim italic">
                    {exec.status === 'running' ? 'Waiting for signal…' : exec.status === 'error' ? exec.error_detail : 'Stopped'}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: trade detail table */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider">
            {selectedExec ? `Trades — ${selectedExec.symbol} ${selectedExec.timeframe}` : 'Trades'}
          </h3>

          {!selectedId && (
            <div className="flex-1 flex items-center justify-center text-sm text-text-dim">
              Select an executor to view its trades.
            </div>
          )}

          {selectedId && trades.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-sm text-text-dim">
              No trades yet for this executor.
            </div>
          )}

          {trades.length > 0 && (() => {
            const closed  = trades.filter(t => t.pnl_points != null);
            const wins    = closed.filter(t => t.pnl_points > 0);
            const netPts  = closed.reduce((s, t) => s + t.pnl_points, 0);
            const netCur  = closed.reduce((s, t) => s + (t.pnl_currency ?? 0), 0);
            const winRate = closed.length ? (wins.length / closed.length * 100).toFixed(1) : '—';
            return (
              <>
                {/* Per-executor summary bar */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-dim bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2">
                  <span>Trades: <span className="text-text-base font-medium">{trades.length}</span></span>
                  <span>W: <span className="text-green-400">{wins.length}</span> / L: <span className="text-red-400">{closed.length - wins.length}</span></span>
                  <span>Win Rate: <span className={wins.length / (closed.length || 1) >= 0.5 ? 'text-green-400' : 'text-red-400'}>{winRate}%</span></span>
                  <span>Net P&L: <span className={`font-mono font-semibold ${netPts >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPts(netPts)} pts</span></span>
                  {netCur !== 0 && <span className={`font-mono ${netCur >= 0 ? 'text-green-400' : 'text-red-400'}`}>{netCur >= 0 ? '+' : ''}${netCur.toFixed(2)}</span>}
                </div>

                <div className="overflow-auto rounded-xl border border-white/[0.06]">
                  <table className="w-full text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                        {['#','Entry Time','Exit Time','Dir','Lots','Entry','Exit','SL','Duration','P&L pts','P&L $','Comm','Reason'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-medium text-text-dim">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...trades].reverse().map((t, idx) => {
                        const pnl      = t.pnl_points;
                        const isOpen   = t.exit_reason === 'open';
                        const rowBg    = isOpen ? 'bg-yellow-400/[0.04]' : pnl > 0 ? 'bg-green-400/[0.04]' : 'bg-red-400/[0.04]';
                        const pnlColor = isOpen ? 'text-yellow-400' : pnl > 0 ? 'text-green-400' : 'text-red-400';
                        const curColor = (t.pnl_currency ?? 0) >= 0 ? 'text-green-400' : 'text-red-400';
                        return (
                          <tr key={t.id} className={`border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${rowBg}`}>
                            <td className="px-3 py-2 font-mono text-text-dim">{idx + 1}</td>
                            <td className="px-3 py-2 font-mono text-text-muted">{t.entry_time?.slice(0, 16) ?? '—'}</td>
                            <td className="px-3 py-2 font-mono text-text-muted">{t.exit_time?.slice(0, 16) ?? '—'}</td>
                            <td className="px-3 py-2"><DirBadge dir={t.direction} /></td>
                            <td className="px-3 py-2 font-mono text-text-muted">{t.lot_size ?? '—'}</td>
                            <td className="px-3 py-2 font-mono text-text-base">{fmtPrice(t.entry_price)}</td>
                            <td className="px-3 py-2 font-mono text-text-muted">{fmtPrice(t.exit_price)}</td>
                            <td className="px-3 py-2 font-mono text-text-dim">{fmtPrice(t.sl)}</td>
                            <td className="px-3 py-2 text-text-dim">{t.duration_seconds != null ? (() => { const h=Math.floor(t.duration_seconds/3600),m=Math.floor((t.duration_seconds%3600)/60); return h>0?`${h}h ${m}m`:m>0?`${m}m`:`${t.duration_seconds}s`; })() : '—'}</td>
                            <td className={`px-3 py-2 font-mono font-semibold ${pnlColor}`}>{fmtPts(pnl)}</td>
                            <td className={`px-3 py-2 font-mono ${curColor}`}>{t.pnl_currency != null ? `${t.pnl_currency>=0?'+':''}$${Math.abs(t.pnl_currency).toFixed(2)}` : '—'}</td>
                            <td className="px-3 py-2 font-mono text-red-400/70">{t.commission != null ? `$${Math.abs(t.commission).toFixed(4)}` : '—'}</td>
                            <td className="px-3 py-2">
                              {t.exit_reason === 'SL' ? <span className="text-red-400">SL hit</span>
                                : t.exit_reason === 'opposite_signal' ? <span className="text-blue-400">Opposite</span>
                                : t.exit_reason === 'open' ? <span className="text-yellow-400">Open</span>
                                : <span className="text-text-dim">{t.exit_reason}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </motion.div>
  );
}
