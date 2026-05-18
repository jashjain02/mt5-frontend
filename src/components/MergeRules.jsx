import { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, ToggleLeft, ToggleRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

// ── Spec metadata (immutable per spec) ──────────────────────────────────────

const RULE_META = {
  1: { plan: '3+1', actor: 'DTP', situation: '3+1' },
  2: { plan: '3+1', actor: 'UTP', situation: '2+2' },
  3: { plan: '3+1', actor: 'JGD', situation: '2+2' },
  4: { plan: '2+2', actor: 'UTP', situation: '2+2' },
  5: { plan: '2+2', actor: 'DTP', situation: '3+1' },
  6: { plan: '2+2', actor: 'JWD', situation: '3+1' },
  7: { plan: '2+1', actor: 'UTP', situation: '2+2' },
  8: { plan: '2+1', actor: 'JGD', situation: '2+2' },
};

const RULE_GROUPS = [
  { label: 'PATTERN: 3+1', ruleOrders: [1, 2, 3], accentClass: 'border-blue-600' },
  { label: 'PATTERN: 2+2', ruleOrders: [4, 5, 6], accentClass: 'border-purple-600' },
  { label: 'PATTERN: 2+1', ruleOrders: [7, 8],    accentClass: 'border-amber-600'  },
];

const EXC_LABELS = ['Main', 'Exc A', 'Exc B', 'Exc C'];

// ── Sub-components ──────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={enabled ? 'Disable' : 'Enable'}
      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors
        ${enabled
          ? 'text-green-400 hover:text-green-300'
          : 'text-gray-500 hover:text-gray-400'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {enabled
        ? <ToggleRight size={16} className="shrink-0" />
        : <ToggleLeft  size={16} className="shrink-0" />
      }
      <span>{enabled ? 'On' : 'Off'}</span>
    </button>
  );
}

function ExceptionRow({ exc, label, onToggle, toggling }) {
  return (
    <div className={`flex items-start gap-3 py-2 px-3 rounded
      ${exc.is_enabled ? 'bg-gray-800/40' : 'bg-gray-900/30 opacity-60'}`}>
      <span className="shrink-0 text-xs font-mono text-gray-400 w-12 pt-0.5">{label}</span>
      <p className="flex-1 text-xs text-gray-300 leading-relaxed">{exc.description}</p>
      <Toggle
        enabled={exc.is_enabled}
        onToggle={() => onToggle(exc.id)}
        disabled={toggling === exc.id}
      />
    </div>
  );
}

function RuleCard({ rule, meta, onToggle, toggling }) {
  const exceptions = (rule.exceptions || []).slice().sort(
    (a, b) => (a.exception_order ?? 0) - (b.exception_order ?? 0)
  );

  return (
    <div className={`rounded-lg border ${rule.is_enabled ? 'border-gray-700' : 'border-gray-800 opacity-70'}
      bg-gray-900 overflow-hidden`}>

      {/* Rule header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/60 border-b border-gray-700/50">
        <span className="text-xs font-bold text-white/90 whitespace-nowrap">
          Rule {rule.rule_order}
        </span>
        <span className="text-xs text-gray-400">—</span>
        <div className="flex items-center gap-1.5 text-xs text-gray-300 flex-wrap">
          <span className="font-mono text-blue-400">{meta.plan}</span>
          <span className="text-gray-500">plan</span>
          <span className="text-gray-600">|</span>
          <span className="font-mono font-semibold text-amber-300">{meta.actor}</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">Outcome:</span>
          <span className="font-mono text-emerald-400">{meta.situation}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:block text-xs text-gray-500 italic truncate max-w-xs">
            {rule.action_description_template}
          </span>
          <Toggle
            enabled={rule.is_enabled}
            onToggle={() => onToggle(rule.id)}
            disabled={toggling === rule.id}
          />
        </div>
      </div>

      {/* Exception rows */}
      <div className="divide-y divide-gray-800/60 px-2 py-1.5 space-y-1">
        {exceptions.map((exc) => {
          const order = exc.exception_order ?? 0;
          const label = EXC_LABELS[order] ?? `Exc ${order}`;
          return (
            <ExceptionRow
              key={exc.id}
              exc={exc}
              label={label}
              onToggle={onToggle}
              toggling={toggling}
            />
          );
        })}
        {exceptions.length === 0 && (
          <p className="text-xs text-gray-600 italic px-3 py-2">No exception rows found.</p>
        )}
      </div>
    </div>
  );
}

function PatternGroup({ group, rulesByOrder, onToggle, toggling }) {
  return (
    <div className={`rounded-xl border-l-4 ${group.accentClass} bg-gray-900/50 p-4 space-y-3`}>
      <h3 className="text-sm font-bold tracking-widest text-gray-300 uppercase">
        {group.label}
      </h3>
      {group.ruleOrders.map((order) => {
        const rule = rulesByOrder[order];
        if (!rule) {
          return (
            <div key={order} className="text-xs text-red-400 italic px-2">
              Rule {order} not found in DB — run seed_merge_rules_v2.py
            </div>
          );
        }
        return (
          <RuleCard
            key={rule.id}
            rule={rule}
            meta={RULE_META[order]}
            onToggle={onToggle}
            toggling={toggling}
          />
        );
      })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function MergeRules() {
  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [toggling, setToggling] = useState(null); // id of rule/exc currently toggling

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMergeRules();
      setRules(data?.rules ?? []);
    } catch (err) {
      setError(err?.message ?? 'Failed to load merge rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleToggle = useCallback(async (id) => {
    setToggling(id);
    try {
      await api.toggleMergeRule(id);
      // Optimistic update
      setRules((prev) =>
        prev.map((r) => {
          if (r.id === id) return { ...r, is_enabled: !r.is_enabled };
          const updatedExcs = (r.exceptions || []).map((e) =>
            e.id === id ? { ...e, is_enabled: !e.is_enabled } : e
          );
          return { ...r, exceptions: updatedExcs };
        })
      );
    } catch (err) {
      setError(err?.message ?? 'Toggle failed.');
    } finally {
      setToggling(null);
    }
  }, []);

  // Build a map: rule_order → rule object
  const rulesByOrder = {};
  for (const r of rules) {
    if (r.rule_order != null && !r.parent_rule_id) {
      rulesByOrder[r.rule_order] = r;
    }
  }

  // Row counts for the status bar
  const parentCount = rules.filter((r) => !r.parent_rule_id).length;
  const excCount    = rules.reduce((n, r) => n + (r.exceptions?.length ?? 0), 0);

  return (
    <div className="p-6 space-y-6 text-white max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <SlidersHorizontal size={22} className="text-blue-400 shrink-0" />
          <div>
            <h1 className="text-xl font-bold">Merge Rules</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Canonical 8-rule spec • {parentCount} rules • {excCount} exceptions
            </p>
          </div>
        </div>
        <button
          onClick={fetchRules}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700
            border border-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Spec compliance badge */}
      {!loading && parentCount > 0 && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border
          ${parentCount === 8 && excCount === 27
            ? 'border-green-800 bg-green-950/30 text-green-400'
            : 'border-amber-800 bg-amber-950/30 text-amber-400'
          }`}>
          {parentCount === 8 && excCount === 27 ? (
            <>✓ Spec-compliant: exactly 8 rules + 27 exception rows loaded</>
          ) : (
            <>⚠ Expected 8 rules + 27 exceptions — got {parentCount} + {excCount}.
              Run <code className="font-mono">seed_merge_rules_v2.py</code> to reseed.</>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading merge rules…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-800 bg-red-950/30 text-red-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Rule groups */}
      {!loading && !error && (
        <div className="space-y-6">
          {RULE_GROUPS.map((group) => (
            <PatternGroup
              key={group.label}
              group={group}
              rulesByOrder={rulesByOrder}
              onToggle={handleToggle}
              toggling={toggling}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      {!loading && (
        <div className="border border-gray-800 rounded-lg p-4 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-400 mb-2">Legend</p>
          <p><span className="font-mono text-blue-400">3+1 / 2+2 / 2+1</span> — Trading plan pattern (prev bar)</p>
          <p><span className="font-mono text-amber-300">DTP / UTP / JGD / JWD</span> — Actor / trigger indicator</p>
          <p><span className="font-mono text-emerald-400">3+1 / 2+2</span> — Outcome situation (current bar d_pat)</p>
          <p><span className="font-mono">Main</span> — Primary action condition</p>
          <p><span className="font-mono">Exc A/B/C</span> — Alternative action conditions (OR-chained with Main)</p>
          <p className="pt-1 italic">All rules use 7.3% new-high/low threshold (covers both 7.3% and 14.6% spec thresholds).</p>
        </div>
      )}
    </div>
  );
}
