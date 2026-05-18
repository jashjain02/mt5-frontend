import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown, Play, Square, Clock, Info,
  TrendingUp, TrendingDown, Zap, BookOpen, BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell,
} from 'recharts';
import api from '../services/api';

/* ─── Option sets ──────────────────────────────────────────────────────────── */
const SYMBOLS = [
  'XAUUSD','EURUSD','GBPUSD','USDJPY','USDCHF',
  'AUDUSD','USDCAD','NZDUSD','EURJPY','GBPJPY',
  'XAGUSD','US30','NAS100','SPX500',
];
const TIMEFRAMES = ['M1','M5','M15','M30','H1','H4','D1','W1','MN1'];
const DATE_PERIODS = [
  'Last year','Last 6 months','Last 3 months',
  'Last month','Last week','Custom range',
];
const DELAYS_OPTS = [
  'Zero latency, ideal execution',
  '1 ms','5 ms','10 ms','20 ms','50 ms','100 ms','500 ms','1000 ms',
  'Random delay','Custom delay...',
];
const MODELLING_OPTS = [
  'Every tick','Every tick based on real ticks',
  'OHLC on M1','Open prices only','Math calculations',
];
const CURRENCIES  = ['USD','EUR','GBP','JPY','CHF','AUD','CAD'];
const LEVERAGES   = ['1:1','1:2','1:5','1:10','1:25','1:50','1:100','1:200','1:500','1:1000'];
const FORWARD_OPTS = ['No','1/4 of test range','1/3 of test range','1/2 of test range','From date'];

/* ─── Date helpers ─────────────────────────────────────────────────────────── */
const toYMD = (d) => d.toISOString().slice(0, 10);
const periodToDates = (period) => {
  const now = new Date();
  const end = toYMD(now);
  const map = {
    'Last year':      () => { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return toYMD(d); },
    'Last 6 months':  () => { const d = new Date(now); d.setMonth(d.getMonth() - 6);       return toYMD(d); },
    'Last 3 months':  () => { const d = new Date(now); d.setMonth(d.getMonth() - 3);       return toYMD(d); },
    'Last month':     () => { const d = new Date(now); d.setMonth(d.getMonth() - 1);       return toYMD(d); },
    'Last week':      () => { const d = new Date(now); d.setDate(d.getDate() - 7);         return toYMD(d); },
  };
  return map[period] ? { start: map[period](), end } : null;
};

/* ─── Formatters ───────────────────────────────────────────────────────────── */
const fmt      = (secs) => `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
const fmtPrice = (v)    => (v == null ? '—' : Number(v).toFixed(5));
const fmtPts   = (v)    => (v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(2));
const fmtCurr  = (v, c='USD') => v == null ? '—' : `${v >= 0 ? '+' : ''}$${Math.abs(Number(v)).toFixed(2)}`;
const fmtNum   = (v, dp=2)    => v == null ? '—' : Number(v).toFixed(dp);
const fmtPct   = (v)          => v == null ? '—' : `${Number(v).toFixed(2)}%`;

const DARK_TOOLTIP = {
  contentStyle: {
    background: '#0d1421', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', color: '#f9fafb', fontSize: '11px',
  },
  itemStyle: { color: '#f9fafb' },
};

/* ─── Shared primitives ────────────────────────────────────────────────────── */
const selectCls = 'input-dark appearance-none cursor-pointer pr-8 bg-no-repeat bg-[right_0.6rem_center]';

const Row = ({ label, children }) => (
  <div className="flex items-center gap-4 py-2.5 border-b border-white/[0.05] last:border-0">
    <span className="w-28 flex-shrink-0 text-sm font-medium text-white">{label}</span>
    <div className="flex flex-1 items-center gap-3 flex-wrap">{children}</div>
  </div>
);

const Sel = ({ value, onChange, children, className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className={`${selectCls} w-full`}
      style={{ background: '#0d1421', color: '#f9fafb', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      {children}
    </select>
    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
  </div>
);

const Check = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none group">
    <span
      onClick={onChange}
      className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors duration-150 ${
        checked ? 'bg-accent border-accent' : 'bg-white/[0.06] border-white/[0.15] group-hover:border-accent/50'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-navy-900">
          <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
    <span className="text-sm text-white group-hover:text-white transition-colors duration-150">{label}</span>
  </label>
);

const SubTab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 text-sm font-medium rounded-t-lg transition-all duration-150 ${
      active
        ? 'bg-white/[0.08] text-white border border-white/[0.10] border-b-transparent'
        : 'text-white/60 hover:text-white'
    }`}
  >
    {label}
  </button>
);

const DirBadge = ({ dir }) => {
  if (dir === 'BUY')  return <span className="flex items-center gap-1 text-xs font-semibold text-green-400"><TrendingUp size={12}/>BUY</span>;
  if (dir === 'SELL') return <span className="flex items-center gap-1 text-xs font-semibold text-red-400"><TrendingDown size={12}/>SELL</span>;
  return <span className="text-xs text-text-dim">—</span>;
};

/* ─── MT5-style statistics table ───────────────────────────────────────────── */
const MetricsSection = ({ title, rows }) => (
  <div className="flex flex-col gap-0">
    <div className="px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.06]">
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</span>
    </div>
    {rows.map(({ label, value, color }) => (
      <div key={label} className="flex items-center border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
        <span className="flex-1 px-3 py-1.5 text-xs text-white">{label}</span>
        <span className={`px-3 py-1.5 text-xs font-mono font-medium ${color || 'text-text-base'}`}>{value}</span>
      </div>
    ))}
  </div>
);

const MetricsTable = ({ metrics }) => {
  if (!metrics) return null;
  const { results: r, drawdown: d, trading: t, meta: m } = metrics;

  const pnlColor   = (v) => v == null ? 'text-text-dim' : v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-text-base';
  const pfColor    = (v) => v == null ? 'text-text-dim' : v >= 1 ? 'text-green-400' : 'text-red-400';
  const ratioColor = (v) => v == null ? 'text-text-dim' : v >= 1 ? 'text-green-400' : v >= 0 ? 'text-yellow-400' : 'text-red-400';

  const resultRows = [
    { label: 'Total Net Profit',   value: r?.total_net_profit != null ? fmtCurr(r.total_net_profit) : '—',  color: pnlColor(r?.total_net_profit) },
    { label: 'Gross Profit',       value: r?.gross_profit != null ? fmtCurr(r.gross_profit) : '—',          color: 'text-green-400' },
    { label: 'Gross Loss',         value: r?.gross_loss != null ? fmtCurr(r.gross_loss) : '—',              color: 'text-red-400' },
    { label: 'Profit Factor',      value: r?.profit_factor != null ? fmtNum(r.profit_factor, 2) : '∞',      color: pfColor(r?.profit_factor) },
    { label: 'Expected Payoff',    value: r?.expected_payoff != null ? fmtCurr(r.expected_payoff) : '—',    color: pnlColor(r?.expected_payoff) },
    { label: 'Recovery Factor',    value: r?.recovery_factor != null ? fmtNum(r.recovery_factor, 2) : '—', color: ratioColor(r?.recovery_factor) },
    { label: 'Sharpe Ratio',       value: r?.sharpe_ratio != null ? fmtNum(r.sharpe_ratio, 4) : '—',        color: ratioColor(r?.sharpe_ratio) },
    { label: 'AHPR',               value: r?.ahpr != null ? fmtNum(r.ahpr * 100, 4) + '%' : '—',            color: pnlColor(r?.ahpr) },
    { label: 'GHPR',               value: r?.ghpr != null ? fmtNum(r.ghpr * 100, 4) + '%' : '—',            color: pnlColor(r?.ghpr) },
    { label: 'LR Correlation',     value: r?.lr_correlation != null ? fmtNum(r.lr_correlation, 4) : '—',    color: ratioColor(r?.lr_correlation) },
    { label: 'LR Standard Error',  value: r?.lr_std_error != null ? fmtCurr(r.lr_std_error).replace('+','') : '—', color: 'text-text-base' },
    { label: 'Z-Score',            value: r?.z_score != null ? `${fmtNum(r.z_score, 2)} (${fmtNum(r.z_score_probability, 1)}%)` : '—', color: ratioColor(r?.z_score) },
  ];

  const drawdownRows = [
    { label: 'Balance Drawdown Absolute',    value: d?.balance_dd_absolute != null ? `$${fmtNum(d.balance_dd_absolute)}` : '—', color: 'text-red-400' },
    { label: 'Balance Drawdown Maximal',     value: d?.balance_dd_maximal_abs != null ? `$${fmtNum(d.balance_dd_maximal_abs)} (${fmtPct(d.balance_dd_maximal_pct)})` : '—', color: 'text-red-400' },
    { label: 'Balance Drawdown Relative',    value: d?.balance_dd_relative_pct != null ? `${fmtPct(d.balance_dd_relative_pct)} ($${fmtNum(d.balance_dd_relative_abs)})` : '—', color: 'text-red-400' },
    { label: 'Equity Drawdown Absolute',     value: d?.equity_dd_absolute != null ? `$${fmtNum(d.equity_dd_absolute)}` : '—', color: 'text-red-400' },
    { label: 'Equity Drawdown Maximal',      value: d?.equity_dd_maximal_abs != null ? `$${fmtNum(d.equity_dd_maximal_abs)} (${fmtPct(d.equity_dd_maximal_pct)})` : '—', color: 'text-red-400' },
    { label: 'Equity Drawdown Relative',     value: d?.equity_dd_relative_pct != null ? `${fmtPct(d.equity_dd_relative_pct)} ($${fmtNum(d.equity_dd_relative_abs)})` : '—', color: 'text-red-400' },
  ];

  const tradingRows = [
    { label: 'Total Deals',                 value: t?.total_deals ?? '—' },
    { label: 'Short Trades (won)',           value: t != null ? `${t.short_trades} (${t.short_trades_won})` : '—' },
    { label: 'Short Win Rate',              value: t?.short_trades_won_pct != null ? fmtPct(t.short_trades_won_pct) : '—', color: ratioColor(t?.short_trades_won_pct - 50) },
    { label: 'Long Trades (won)',            value: t != null ? `${t.long_trades} (${t.long_trades_won})` : '—' },
    { label: 'Long Win Rate',               value: t?.long_trades_won_pct != null ? fmtPct(t.long_trades_won_pct) : '—', color: ratioColor(t?.long_trades_won_pct - 50) },
    { label: 'Profit Trades',               value: t?.profit_trades_count != null ? `${t.profit_trades_count} (${fmtPct(t.profit_trades_pct)})` : '—', color: 'text-green-400' },
    { label: 'Loss Trades',                 value: t?.loss_trades_count != null ? `${t.loss_trades_count} (${fmtPct(t.loss_trades_pct)})` : '—', color: 'text-red-400' },
    { label: 'Largest Profit Trade',        value: t?.largest_profit_trade != null ? fmtCurr(t.largest_profit_trade) : '—', color: 'text-green-400' },
    { label: 'Largest Loss Trade',          value: t?.largest_loss_trade != null ? fmtCurr(t.largest_loss_trade) : '—', color: 'text-red-400' },
    { label: 'Average Profit Trade',        value: t?.avg_profit_trade != null ? fmtCurr(t.avg_profit_trade) : '—', color: 'text-green-400' },
    { label: 'Average Loss Trade',          value: t?.avg_loss_trade != null ? fmtCurr(t.avg_loss_trade) : '—', color: 'text-red-400' },
    { label: 'Max Consecutive Wins',        value: t?.max_consecutive_wins != null ? `${t.max_consecutive_wins} ($${fmtNum(t.max_consecutive_wins_profit)})` : '—', color: 'text-green-400' },
    { label: 'Max Consecutive Losses',      value: t?.max_consecutive_losses != null ? `${t.max_consecutive_losses} ($${fmtNum(Math.abs(t.max_consecutive_losses_loss))})` : '—', color: 'text-red-400' },
    { label: 'Avg Consecutive Wins',        value: t?.avg_consecutive_wins != null ? fmtNum(t.avg_consecutive_wins, 1) : '—' },
    { label: 'Avg Consecutive Losses',      value: t?.avg_consecutive_losses != null ? fmtNum(t.avg_consecutive_losses, 1) : '—' },
  ];

  const metaRows = [
    { label: 'History Quality',   value: m?.history_quality != null ? `${m.history_quality}%` : '—' },
    { label: 'Bars',              value: m?.bars ?? '—' },
    { label: 'Ticks Simulated',   value: m?.ticks_simulated?.toLocaleString() ?? '—' },
    { label: 'Initial Deposit',   value: m?.initial_deposit != null ? `$${fmtNum(m.initial_deposit)}` : '—' },
    { label: 'Currency',          value: m?.currency ?? '—' },
    { label: 'Leverage',          value: m?.leverage ?? '—' },
    { label: 'Lot Size',          value: m?.lot_size ?? '—' },
    { label: 'Modelling',         value: m?.modelling ?? '—' },
    { label: 'Symbol / TF',       value: m != null ? `${m.symbol} ${m.timeframe}` : '—' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        <MetricsSection title="Results" rows={resultRows} />
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <MetricsSection title="Drawdown" rows={drawdownRows} />
        </div>
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <MetricsSection title="Simulation" rows={metaRows} />
        </div>
      </div>
      <div className="rounded-xl border border-white/[0.08] overflow-hidden lg:col-span-2">
        <MetricsSection title="Trades" rows={tradingRows} />
      </div>
    </div>
  );
};

/* ─── Trade & deal tables ───────────────────────────────────────────────────── */
const TradeTable = ({ trades }) => {
  if (!trades || trades.length === 0) {
    return <p className="text-sm text-text-dim text-center py-8">No trades generated.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.03]">
            {['#','Entry Time','Dir','Entry','SL','Exit Time','Exit','Exit Reason','P&L (pts)','P&L ($)'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-medium text-white whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t, idx) => {
            const pnl = t.pnl_currency;
            const pnlPts = t.pnl_points;
            const rowColor = pnl == null ? 'bg-yellow-400/[0.03]' : pnl > 0 ? 'bg-green-400/[0.03]' : 'bg-red-400/[0.03]';
            const pnlColor = pnl == null ? 'text-yellow-400' : pnl > 0 ? 'text-green-400' : 'text-red-400';
            return (
              <tr key={idx} className={`border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${rowColor}`}>
                <td className="px-3 py-2 font-mono text-white">{idx + 1}</td>
                <td className="px-3 py-2 font-mono text-white whitespace-nowrap">{t.entry_time?.slice(0,16) ?? '—'}</td>
                <td className="px-3 py-2"><DirBadge dir={t.direction} /></td>
                <td className="px-3 py-2 font-mono text-white">{fmtPrice(t.entry_price)}</td>
                <td className="px-3 py-2 font-mono text-white">{fmtPrice(t.sl)}</td>
                <td className="px-3 py-2 font-mono text-white whitespace-nowrap">{t.exit_time?.slice(0,16) ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-white">{fmtPrice(t.exit_price)}</td>
                <td className="px-3 py-2">
                  {t.exit_reason === 'SL'
                    ? <span className="text-red-400">SL hit</span>
                    : t.exit_reason === 'opposite_signal'
                      ? <span className="text-blue-400">Opposite signal</span>
                      : <span className="text-yellow-400">Open</span>}
                </td>
                <td className={`px-3 py-2 font-mono ${pnlColor}`}>{fmtPts(pnlPts)}</td>
                <td className={`px-3 py-2 font-mono font-semibold ${pnlColor}`}>{fmtCurr(pnl)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const DealTable = ({ deals }) => {
  if (!deals || deals.length === 0) {
    return <p className="text-sm text-text-dim text-center py-8">No deals recorded.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.03]">
            {['Ticket','Time','Type','Dir','Volume','Price','Commission','Swap','Profit','Balance'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-medium text-white whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((d, idx) => {
            const profitColor = d.type === 'IN' ? 'text-text-dim'
              : d.profit > 0 ? 'text-green-400' : d.profit < 0 ? 'text-red-400' : 'text-text-dim';
            return (
              <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                <td className="px-3 py-2 font-mono text-white">{d.ticket}</td>
                <td className="px-3 py-2 font-mono text-white whitespace-nowrap">{d.time?.slice(0,16)}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    d.type === 'IN' ? 'bg-blue-400/10 text-blue-400' : 'bg-orange-400/10 text-orange-400'
                  }`}>{d.type}</span>
                </td>
                <td className="px-3 py-2"><DirBadge dir={d.direction} /></td>
                <td className="px-3 py-2 font-mono text-white">{d.volume}</td>
                <td className="px-3 py-2 font-mono text-white">{fmtPrice(d.price)}</td>
                <td className="px-3 py-2 font-mono text-white">{d.commission !== 0 ? fmtNum(d.commission, 4) : '0'}</td>
                <td className="px-3 py-2 font-mono text-white">{d.swap !== 0 ? fmtNum(d.swap, 4) : '0'}</td>
                <td className={`px-3 py-2 font-mono ${profitColor}`}>{d.type === 'IN' ? '—' : fmtCurr(d.profit)}</td>
                <td className="px-3 py-2 font-mono text-white">${fmtNum(d.balance)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const BacktestTab = ({ trades, deals }) => {
  const [inner, setInner] = useState('trades');
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1">
        {[['trades','Trades'],['deals','Deals']].map(([k, label]) => (
          <button key={k} onClick={() => setInner(k)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              inner === k ? 'bg-white/[0.08] text-text-base border border-white/[0.10]' : 'text-text-dim hover:text-text-muted'
            }`}>{label}
          </button>
        ))}
      </div>
      {inner === 'trades' ? <TradeTable trades={trades} /> : <DealTable deals={deals} />}
    </div>
  );
};

/* ─── Graph tab ────────────────────────────────────────────────────────────── */
const tickFmt = (v) => {
  try { return new Date(v).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }); }
  catch { return ''; }
};

const WHITE_TICK = { fontSize: 10, fill: '#ffffff' };
const WHITE_TICK_SM = { fontSize: 9, fill: '#ffffff' };
const LEGEND_STYLE = { fontSize: '11px', color: '#ffffff' };

const EquityBalanceChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-white mb-2 font-medium">Balance & Equity</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="time" tickFormatter={tickFmt} tick={WHITE_TICK} minTickGap={60} />
          <YAxis tick={WHITE_TICK} tickFormatter={v => `$${v.toLocaleString()}`} width={72} />
          <Tooltip {...DARK_TOOLTIP} labelFormatter={tickFmt} formatter={(v, n) => [`$${Number(v).toFixed(2)}`, n]} />
          <Legend wrapperStyle={LEGEND_STYLE} />
          <Line type="monotone" dataKey="balance" stroke="#22c55e" dot={false} name="Balance" strokeWidth={1.5} />
          <Line type="monotone" dataKey="equity"  stroke="#3b82f6" dot={false} name="Equity"  strokeWidth={1} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const DrawdownChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-white mb-2 font-medium">Equity Drawdown %</p>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="time" tickFormatter={tickFmt} tick={WHITE_TICK} minTickGap={60} />
          <YAxis tick={WHITE_TICK} tickFormatter={v => `${v.toFixed(1)}%`} width={52} />
          <Tooltip {...DARK_TOOLTIP} labelFormatter={tickFmt} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Drawdown']} />
          <Area type="monotone" dataKey="dd_pct" stroke="#ef4444" fill="#ef444420" strokeWidth={1} name="Drawdown %" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const TimeBarChart = ({ data, title, labelKey = 'label', profitKey = 'profit', countKey = 'count' }) => {
  if (!data || data.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-white mb-2 font-medium">{title}</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey={labelKey} tick={WHITE_TICK_SM} />
          <YAxis tick={WHITE_TICK_SM} tickFormatter={v => `$${v}`} width={48} />
          <Tooltip {...DARK_TOOLTIP} formatter={(v, n) => [`$${Number(v).toFixed(2)}`, n]} />
          <Bar dataKey={profitKey} name="Profit" radius={[2, 2, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={(entry[profitKey] || 0) >= 0 ? '#22c55e' : '#ef4444'} opacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const GraphTab = ({ equityCurve, drawdownCurve, timeAnalytics }) => (
  <div className="flex flex-col gap-6">
    <EquityBalanceChart data={equityCurve} />
    <DrawdownChart data={drawdownCurve} />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <TimeBarChart data={timeAnalytics?.by_hour}    title="P&L by Hour"    />
      <TimeBarChart data={timeAnalytics?.by_weekday} title="P&L by Weekday" />
      <TimeBarChart data={timeAnalytics?.by_month}   title="P&L by Month"   />
    </div>
  </div>
);

/* ─── Agents placeholder ───────────────────────────────────────────────────── */
const AgentsTab = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center py-12">
    <Zap size={28} className="text-text-dim opacity-40" />
    <p className="text-sm text-text-muted">Optimization not yet supported.</p>
    <p className="text-xs text-text-dim max-w-xs">
      Parameter optimization (genetic / grid search across strategy inputs) will be available in a future release.
    </p>
  </div>
);

/* ─── Journal tab ───────────────────────────────────────────────────────────── */
const JournalTab = ({ journal }) => {
  if (!journal || journal.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center py-12">
        <BookOpen size={28} className="text-text-dim opacity-40" />
        <p className="text-sm text-text-muted">No journal entries yet. Run a backtest to see logs.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col overflow-auto h-full font-mono text-xs">
      {journal.map((entry, i) => (
        <div key={i} className="flex gap-3 px-3 py-1.5 border-b border-white/[0.03] hover:bg-white/[0.02]">
          <span className="text-white flex-shrink-0 w-36">{entry.time?.slice(0,16)}</span>
          <span className={`flex-shrink-0 w-10 font-bold ${
            entry.level === 'ERROR' ? 'text-red-400' : entry.level === 'WARN' ? 'text-yellow-400' : 'text-blue-400'
          }`}>{entry.level}</span>
          <span className={`flex-1 break-words ${
            entry.level === 'ERROR' ? 'text-red-300' : entry.level === 'WARN' ? 'text-yellow-200' : 'text-white'
          }`}>{entry.message}</span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════════ */
export default function Backtest() {
  const [strategy,    setStrategy]    = useState('strategy_1');
  const [symbol,      setSymbol]      = useState('XAUUSD');
  const [timeframe,   setTimeframe]   = useState('H1');
  const [datePeriod,  setDatePeriod]  = useState('Last 3 months');
  const [startDate,   setStartDate]   = useState(() => toYMD((() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d; })()));
  const [endDate,     setEndDate]     = useState(() => toYMD(new Date()));
  const [forward,     setForward]     = useState('No');
  const [forwardDate, setForwardDate] = useState('');
  const [delays,      setDelays]      = useState('Zero latency, ideal execution');
  const [customDelay, setCustomDelay] = useState('50');
  const [modelling,   setModelling]   = useState('OHLC on M1');
  const [profitInPips,setProfitInPips]= useState(false);
  const [deposit,     setDeposit]     = useState('10000');
  const [currency,    setCurrency]    = useState('USD');
  const [leverage,    setLeverage]    = useState('1:100');
  const [lotSize,     setLotSize]     = useState('0.01');
  const [commission,  setCommission]  = useState('0.0');
  const [spread,      setSpread]      = useState('3.0');
  const [swapLong,    setSwapLong]    = useState('-6.4');
  const [swapShort,   setSwapShort]   = useState('-0.6');

  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [isRunning,   setIsRunning]   = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [results,     setResults]     = useState(null);
  const [error,       setError]       = useState(null);

  const timerRef = useRef(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (datePeriod === 'Custom range') return;
    const dates = periodToDates(datePeriod);
    if (dates) { setStartDate(dates.start); setEndDate(dates.end); }
  }, [datePeriod]);

  const handleStartStop = async () => {
    if (isRunning) {
      abortRef.current = true;
      clearInterval(timerRef.current);
      setIsRunning(false);
      return;
    }

    if (!strategy) { setError('Please select a strategy first.'); return; }

    setResults(null);
    setError(null);
    setElapsed(0);
    setIsRunning(true);
    setActiveSubTab('overview');
    abortRef.current = false;
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    try {
      const data = await api.runBacktest({
        strategy, symbol, timeframe,
        start_date: startDate, end_date: endDate,
        deposit:  parseFloat(deposit)    || 10000,
        currency, leverage, modelling,
        lot_size:           parseFloat(lotSize)    || 0.01,
        commission_per_lot: parseFloat(commission) || 0,
        spread:             parseFloat(spread)     || 3,
        swap_long:          parseFloat(swapLong)   || -6.4,
        swap_short:         parseFloat(swapShort)  || -0.6,
      });
      if (!abortRef.current) setResults(data);
    } catch (err) {
      if (!abortRef.current) setError(err.message || 'Backtest failed. Check backend logs.');
    } finally {
      clearInterval(timerRef.current);
      setIsRunning(false);
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const isCustomDate    = datePeriod === 'Custom range';
  const showForwardDate = forward === 'From date';
  const showCustomDelay = delays === 'Custom delay...';

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'backtest', label: 'Backtest' },
    { key: 'graph',    label: 'Graph' },
    { key: 'agents',   label: 'Agents' },
    { key: 'journal',  label: 'Journal' },
  ];

  const renderContent = () => {
    // Loading state
    if (isRunning) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">
            Running backtest on <span className="text-text-base font-medium">{symbol}</span> ({timeframe})…
          </p>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-3 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      );
    }

    // Empty state
    if (!results) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-3 text-center">
          <BarChart2 size={28} className="text-text-dim opacity-40" />
          <p className="text-sm text-text-muted">
            Configure settings above and click <span className="text-text-base font-medium">Start</span> to run the backtest.
          </p>
        </div>
      );
    }

    // Results ready
    switch (activeSubTab) {
      case 'overview':
        return (
          <div className="flex flex-col gap-4">
            {results.metrics && <MetricsTable metrics={results.metrics} />}
            {results.summary && (
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="text-green-400 font-medium">{results.summary.winning_trades} wins</span>
                <span>/</span>
                <span className="text-red-400 font-medium">{results.summary.losing_trades} losses</span>
                <span>/</span>
                <span className="text-yellow-400 font-medium">{results.summary.open_trades} open</span>
              </div>
            )}
          </div>
        );
      case 'backtest':
        return <BacktestTab trades={results.trades} deals={results.deals} />;
      case 'graph':
        return (
          <GraphTab
            equityCurve={results.equity_curve}
            drawdownCurve={results.drawdown_curve}
            timeAnalytics={results.time_analytics}
          />
        );
      case 'agents':
        return <AgentsTab />;
      case 'journal':
        return <JournalTab journal={results.journal} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 flex flex-col gap-4 h-full"
    >
      {/* ── Config card ──────────────────────────────────────────────────── */}
      <div className="card-dark p-6 flex flex-col gap-0.5">

        <Row label="Strategy">
          <Sel value={strategy} onChange={setStrategy} className="flex-1 max-w-md">
            <option value="strategy_1">Strategy 1 — UTP/DTP Cross</option>
          </Sel>
        </Row>

        <Row label="Symbol">
          <Sel value={symbol} onChange={setSymbol} className="w-40">
            {SYMBOLS.map(s => <option key={s}>{s}</option>)}
          </Sel>
          <Sel value={timeframe} onChange={setTimeframe} className="w-28">
            {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
          </Sel>
        </Row>

        <Row label="Date">
          <Sel value={datePeriod} onChange={setDatePeriod} className="w-44">
            {DATE_PERIODS.map(d => <option key={d}>{d}</option>)}
          </Sel>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            disabled={!isCustomDate}
            className={`input-dark w-40 ${!isCustomDate ? 'opacity-50 cursor-not-allowed' : ''}`} />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            disabled={!isCustomDate}
            className={`input-dark w-40 ${!isCustomDate ? 'opacity-50 cursor-not-allowed' : ''}`} />
        </Row>

        <Row label="Forward">
          <Sel value={forward} onChange={setForward} className="w-44">
            {FORWARD_OPTS.map(o => <option key={o}>{o}</option>)}
          </Sel>
          {showForwardDate && (
            <input type="date" value={forwardDate} onChange={e => setForwardDate(e.target.value)} className="input-dark w-40" />
          )}
        </Row>

        <Row label="Delays">
          <Sel value={delays} onChange={setDelays} className="flex-1 max-w-xs">
            {DELAYS_OPTS.map(o => <option key={o}>{o}</option>)}
          </Sel>
          {showCustomDelay && (
            <div className="flex items-center gap-2">
              <input type="number" min="1" max="9999" value={customDelay} onChange={e => setCustomDelay(e.target.value)}
                className="input-dark w-24 text-right" />
              <span className="text-sm text-text-muted">ms</span>
            </div>
          )}
          <span className="flex items-center gap-1.5 text-xs text-white">
            <Info size={12} className="flex-shrink-0" />
            emulates slippage and requotes
          </span>
        </Row>

        <Row label="Modelling">
          <Sel value={modelling} onChange={setModelling} className="flex-1 max-w-xs">
            {MODELLING_OPTS.map(o => <option key={o}>{o}</option>)}
          </Sel>
          <Check checked={profitInPips} onChange={() => setProfitInPips(v => !v)} label="profit in pips for faster calculations" />
        </Row>

        <Row label="Deposit">
          <input type="number" value={deposit} onChange={e => setDeposit(e.target.value)}
            className="input-dark w-32 text-right" min="1" />
          <Sel value={currency} onChange={setCurrency} className="w-24">
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </Sel>
          <Sel value={leverage} onChange={setLeverage} className="w-28">
            {LEVERAGES.map(l => <option key={l}>{l}</option>)}
          </Sel>
          <span className="text-sm text-white">leverage</span>
          <input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)}
            className="input-dark w-20 text-right" step="0.01" min="0.01" placeholder="0.01" />
          <span className="text-sm text-white">lot</span>
        </Row>

        {/* Commission / Spread / Swap — collapsed into a single row */}
        <Row label="Costs">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white">Commission:</span>
            <input type="number" value={commission} onChange={e => setCommission(e.target.value)}
              className="input-dark w-20 text-right text-xs" step="0.1" />
            <span className="text-xs text-white">$/lot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white">Spread:</span>
            <input type="number" value={spread} onChange={e => setSpread(e.target.value)}
              className="input-dark w-20 text-right text-xs" step="0.1" />
            <span className="text-xs text-white">pts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white">Swap L/S:</span>
            <input type="number" value={swapLong} onChange={e => setSwapLong(e.target.value)}
              className="input-dark w-20 text-right text-xs" step="0.1" />
            <span className="text-xs text-white">/</span>
            <input type="number" value={swapShort} onChange={e => setSwapShort(e.target.value)}
              className="input-dark w-20 text-right text-xs" step="0.1" />
          </div>
        </Row>

      </div>

      {/* ── Results panel ─────────────────────────────────────────────────── */}
      <div className="card-dark flex flex-col flex-1 min-h-0">

        {/* Tab bar + controls */}
        <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b border-white/[0.06]">
          <div className="flex items-end gap-1">
            {TABS.map(({ key, label }) => (
              <SubTab key={key} label={label}
                active={activeSubTab === key}
                onClick={() => !isRunning && setActiveSubTab(key)} />
            ))}
          </div>

          <div className="flex items-center gap-3 pb-2">
            <div className="flex items-center gap-1.5 text-sm font-mono text-text-muted bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5">
              <Clock size={13} className="text-text-dim" />
              <span>{fmt(elapsed)}</span>
            </div>
            <button
              onClick={handleStartStop}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isRunning
                  ? 'bg-red-500/90 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                  : 'btn-accent'
              }`}
            >
              {isRunning ? <Square size={14} /> : <Play size={14} />}
              {isRunning ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 p-5 overflow-auto">
          {renderContent()}
        </div>
      </div>
    </motion.div>
  );
}
