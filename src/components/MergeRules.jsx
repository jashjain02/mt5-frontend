import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal, Plus, Edit2, Trash2, ChevronUp, ChevronDown,
  ToggleLeft, ToggleRight, Loader2, AlertCircle, CheckCircle2,
  ArrowLeft, Eye, EyeOff,
} from 'lucide-react';
import api from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'H5', '5H+', 'D1', 'W1', 'MN1'];
const PATTERNS   = ['2+1', '2+2', '3+1'];

const ALL_RC_LEVELS = [
  { value: 'rc_14_60',  label: 'RC 14.6%' },
  { value: 'rc_23_60',  label: 'RC 23.6%' },
  { value: 'rc_38_20',  label: 'RC 38.2%' },
  { value: 'rc_61_80',  label: 'RC 61.8%' },
  { value: 'rc_100_00', label: 'RC 100%'  },
  { value: 'rc_138_20', label: 'RC 138.2%' },
  { value: 'rc_161_80', label: 'RC 161.8%' },
  { value: 'rc_261_80', label: 'RC 261.8%' },
];
const ALL_FC_LEVELS = ALL_RC_LEVELS.map(l => ({
  value: l.value.replace('rc_', 'fc_'),
  label: l.label.replace('RC ', 'FC '),
}));
const ALL_LEVELS = [...ALL_RC_LEVELS, ...ALL_FC_LEVELS];

// ─── Condition catalogue ──────────────────────────────────────────────────────

const CONDITION_GROUPS = [
  {
    label: 'Pattern',
    conditions: [
      { id: 'plan_d_pat_is',      label: 'Trading plan pattern is', hasPattern: true },
      { id: 'situation_d_pat_is', label: 'Current bar pattern is',  hasPattern: true },
    ],
  },
  {
    label: 'Price Action',
    conditions: [
      { id: 'new_high',           label: 'High exceeds prev high + buffer',        hasLevel: false },
      { id: 'new_low',            label: 'Low breaks below prev low \u2212 buffer', hasLevel: false },
      { id: 'new_high_pct',       label: 'New High (% of trading plan abs_range)',  hasNewHighPct: true },
      { id: 'new_low_pct',        label: 'New Low (% of trading plan abs_range)',   hasNewLowPct: true },
      { id: 'high_above_level',   label: 'High exceeds level',    hasLevel: true, levelOptions: ALL_LEVELS, hasBuffer: true, bufferLabel: '+ buffer' },
      { id: 'low_below_level',    label: 'Low breaks below level', hasLevel: true, levelOptions: ALL_LEVELS, hasBuffer: true, bufferLabel: '\u2212 buffer' },
      { id: 'close_above',        label: 'Close above',           hasLevel: true, levelOptions: ALL_LEVELS },
      { id: 'close_below',        label: 'Close below',           hasLevel: true, levelOptions: ALL_LEVELS },
      { id: 'close_outside_14_6', label: 'Close outside RC/FC 14.6% zone', hasLevel: false },
    ],
  },
  {
    label: 'Level Crossings',
    conditions: [
      { id: 'rc_crossed_above',      label: 'RC level crossed above (TVHS)',              hasLevel: true, levelOptions: ALL_RC_LEVELS },
      { id: 'fc_crossed_below',      label: 'FC level crossed below (TVLS)',              hasLevel: true, levelOptions: ALL_FC_LEVELS },
      { id: 'utp_bdp_trigger_above',    label: 'UTP BDP station trigger TVHS (3+1 plan)',        hasLevel: false },
      { id: 'utp_jgd_trigger_above',    label: 'JGD station trigger TVHS — RC 61.8% (3+1 plan)', hasLevel: false },
      { id: 'dtp_bdp_trigger_below',    label: 'DTP BDP station trigger TVLS (2+2 plan)',        hasLevel: false },
      { id: 'dtp_jwd_trigger_below',    label: 'JWD station trigger TVLS — FC 61.8% (2+2 plan)', hasLevel: false },
      { id: 'utp_bdp_trigger_above_21', label: 'UTP BDP station trigger TVHS (2+1 plan)',        hasLevel: false },
      { id: 'utp_jgd_trigger_above_21', label: 'JGD station trigger TVHS — RC 61.8% (2+1 plan)', hasLevel: false },
    ],
  },
];

const DEFAULT_CONDITIONS = {
  // Pattern
  plan_d_pat_is:        { enabled: false, pattern: '3+1' },
  situation_d_pat_is:   { enabled: false, pattern: '2+2' },
  // Price Action
  new_high:             { enabled: false },
  new_low:              { enabled: false },
  new_high_pct:         { enabled: false, pct: '7.3' },
  new_low_pct:          { enabled: false, pct: '7.3' },
  high_above_level:     { enabled: false, level: 'rc_38_20', with_buffer: false },
  low_below_level:      { enabled: false, level: 'fc_38_20', with_buffer: false },
  close_above:          { enabled: false, level: 'rc_14_60' },
  close_below:          { enabled: false, level: 'fc_14_60' },
  close_outside_14_6:   { enabled: false },
  // Level Crossings
  rc_crossed_above:      { enabled: false, level: 'rc_38_20' },
  fc_crossed_below:      { enabled: false, level: 'fc_38_20' },
  utp_bdp_trigger_above:    { enabled: false },
  utp_jgd_trigger_above:    { enabled: false },
  dtp_bdp_trigger_below:    { enabled: false },
  dtp_jwd_trigger_below:    { enabled: false },
  utp_bdp_trigger_above_21: { enabled: false },
  utp_jgd_trigger_above_21: { enabled: false },
};

const LEGACY_TEMPLATES = new Set([
  'rising_channel_cross', 'falling_channel_cross', 'price_extreme', 'zone_crossover',
]);

// ─── Expression builder ───────────────────────────────────────────────────────

function buildExpressionFromConditions(conds) {
  if (!conds) return '';
  const parts = [];

  // Pattern
  if (conds.plan_d_pat_is?.enabled)
    parts.push(`prev_d_pat == '${conds.plan_d_pat_is.pattern || '3+1'}'`);
  if (conds.situation_d_pat_is?.enabled)
    parts.push(`d_pat == '${conds.situation_d_pat_is.pattern || '2+2'}'`);

  if (conds.new_high?.enabled)
    parts.push('high > base_high + buffer');
  if (conds.new_low?.enabled)
    parts.push('low < base_low - buffer');
  if (conds.new_high_pct?.enabled)
    parts.push('high > base_high + new_high_threshold * prev_abs_range');
  if (conds.high_above_level?.enabled)
    parts.push(conds.high_above_level.with_buffer
      ? `high > ${conds.high_above_level.level} + buffer`
      : `high > ${conds.high_above_level.level}`);
  if (conds.low_below_level?.enabled)
    parts.push(conds.low_below_level.with_buffer
      ? `low < ${conds.low_below_level.level} - buffer`
      : `low < ${conds.low_below_level.level}`);
  if (conds.close_above?.enabled)
    parts.push(`close > ${conds.close_above.level}`);
  if (conds.close_below?.enabled)
    parts.push(`close < ${conds.close_below.level}`);
  if (conds.close_outside_14_6?.enabled)
    parts.push('close_outside_14_6()');
  if (conds.rc_crossed_above?.enabled)
    parts.push(`rc_crossed_above("${conds.rc_crossed_above.level.toUpperCase()}")`);
  if (conds.fc_crossed_below?.enabled)
    parts.push(`fc_crossed_below("${conds.fc_crossed_below.level.toUpperCase()}")`);
  if (conds.utp_bdp_trigger_above?.enabled)
    parts.push('rc_crossed_above(utp_trigger_31_bdp)');
  if (conds.utp_jgd_trigger_above?.enabled)
    parts.push('rc_crossed_above(utp_trigger_31_jgd)');
  if (conds.dtp_bdp_trigger_below?.enabled)
    parts.push('fc_crossed_below(dtp_trigger_22_bdp)');
  if (conds.dtp_jwd_trigger_below?.enabled)
    parts.push('fc_crossed_below(dtp_trigger_22_jwd)');
  if (conds.utp_bdp_trigger_above_21?.enabled)
    parts.push('rc_crossed_above(utp_trigger_21_bdp)');
  if (conds.utp_jgd_trigger_above_21?.enabled)
    parts.push('rc_crossed_above(utp_trigger_21_jgd)');
  if (conds.new_low_pct?.enabled)
    parts.push('low < base_low - new_low_threshold * prev_abs_range');
  return parts.join(' and ');
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const glass = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.3)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChipMultiSelect({ options, value, onChange, label }) {
  const toggle = (v) => {
    const next = value.includes(v) ? value.filter(x => x !== v) : [...value, v];
    onChange(next);
  };
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label} <span className="text-gray-400">(empty = all)</span></p>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => {
          const sel = value.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                sel
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LevelSelect({ value, onChange, options, disabled }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      onClick={e => e.stopPropagation()}
      className="ml-1 px-1.5 py-0.5 text-xs border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40 cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function ConditionChecklist({ conditions, onChange }) {
  const set = (id, key, val) => {
    onChange({ ...conditions, [id]: { ...conditions[id], [key]: val } });
  };

  return (
    <div className="space-y-5">
      {CONDITION_GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {group.label}
          </p>
          <div className="space-y-2.5">
            {group.conditions.map(cond => {
              const state = conditions[cond.id] || { enabled: false };
              const levelVal = state.level || cond.levelOptions?.[0]?.value || '';
              return (
                <label
                  key={cond.id}
                  className="flex items-center gap-2 cursor-pointer flex-wrap"
                >
                  <input
                    type="checkbox"
                    checked={!!state.enabled}
                    onChange={e => set(cond.id, 'enabled', e.target.checked)}
                    className="w-4 h-4 accent-blue-600 flex-shrink-0"
                  />
                  <span className={`text-sm select-none ${state.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                    {cond.label}
                  </span>
                  {cond.hasPattern && (
                    <select
                      value={state.pattern || '3+1'}
                      onChange={e => set(cond.id, 'pattern', e.target.value)}
                      disabled={!state.enabled}
                      onClick={e => e.stopPropagation()}
                      className="ml-1 px-1.5 py-0.5 text-xs border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40 cursor-pointer"
                    >
                      {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}
                  {(cond.hasNewHighPct || cond.hasNewLowPct) && (() => {
                    const pctVal = state.pct || '7.3';
                    const isCustom = pctVal !== '7.3' && pctVal !== '14.6';
                    return (
                      <>
                        <select
                          value={isCustom ? 'custom' : pctVal}
                          onChange={e => set(cond.id, 'pct', e.target.value === 'custom' ? '' : e.target.value)}
                          disabled={!state.enabled}
                          onClick={e => e.stopPropagation()}
                          className="ml-1 px-1.5 py-0.5 text-xs border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40 cursor-pointer"
                        >
                          <option value="7.3">7.3%</option>
                          <option value="14.6">14.6%</option>
                          <option value="custom">Custom…</option>
                        </select>
                        {isCustom && (
                          <span className="flex items-center ml-1">
                            <input
                              type="number"
                              min="0.1"
                              max="100"
                              step="0.1"
                              value={pctVal}
                              onChange={e => set(cond.id, 'pct', e.target.value)}
                              disabled={!state.enabled}
                              onClick={e => e.stopPropagation()}
                              className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40"
                              placeholder="e.g. 21.9"
                            />
                            <span className="text-xs text-gray-500 ml-0.5">%</span>
                          </span>
                        )}
                      </>
                    );
                  })()}
                  {cond.hasLevel && (
                    <LevelSelect
                      value={levelVal}
                      onChange={v => set(cond.id, 'level', v)}
                      options={cond.levelOptions}
                      disabled={!state.enabled}
                    />
                  )}
                  {cond.hasBuffer && (
                    <label
                      className="flex items-center gap-1 ml-0.5"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={!!state.with_buffer}
                        onChange={e => set(cond.id, 'with_buffer', e.target.checked)}
                        disabled={!state.enabled}
                        className="w-3.5 h-3.5 accent-blue-600"
                      />
                      <span className="text-xs text-gray-500">{cond.bufferLabel}</span>
                    </label>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const VIEWS = { LIST: 'list', EDIT: 'edit' };

export default function MergeRules() {
  const [view,     setView]     = useState(VIEWS.LIST);
  const [rules,    setRules]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Edit form state
  const [editingRule, setEditingRule] = useState(null);
  const [formName,    setFormName]    = useState('');
  const [formDesc,    setFormDesc]    = useState('');
  const [formOrder,   setFormOrder]   = useState(10);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formTFs,     setFormTFs]     = useState([]);
  const [formPats,    setFormPats]    = useState([]);
  const [formConditions, setFormConditions] = useState({ ...DEFAULT_CONDITIONS });

  const [showExpr,  setShowExpr]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState(null);
  const [deleteId,  setDeleteId]  = useState(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMergeRules();
      if (res.success) setRules(res.rules || []);
    } catch (e) {
      setError('Failed to load rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRules(); }, []);

  // ── Open add/edit form ──────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingRule(null);
    setFormName('');
    setFormDesc('');
    setFormOrder(rules.length ? Math.max(...rules.map(r => r.rule_order)) + 10 : 10);
    setFormEnabled(true);
    setFormTFs([]);
    setFormPats([]);
    setFormConditions({ ...DEFAULT_CONDITIONS });
    setShowExpr(false);
    setSaveMsg(null);
    setView(VIEWS.EDIT);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDesc(rule.description || '');
    setFormOrder(rule.rule_order);
    setFormEnabled(rule.is_enabled);
    setFormTFs(rule.applies_to_timeframes || []);
    setFormPats(rule.applies_to_patterns || []);

    // New format: template_config has a "conditions" key
    // Legacy format: template_config has template-specific keys (no "conditions")
    const tc = rule.template_config || {};
    if (tc.conditions) {
      const restored = { ...DEFAULT_CONDITIONS, ...tc.conditions };
      // Restore pct selectors from the rule's stored new_high_threshold
      if (rule.new_high_threshold != null) {
        const pctStr = String(parseFloat((rule.new_high_threshold * 100).toPrecision(6)));
        if (restored.new_high_pct?.enabled)
          restored.new_high_pct = { ...restored.new_high_pct, pct: pctStr };
        if (restored.new_low_pct?.enabled)
          restored.new_low_pct  = { ...restored.new_low_pct,  pct: pctStr };
      }
      setFormConditions(restored);
    } else {
      // Legacy rule — start with blank conditions; user reconfigures
      setFormConditions({ ...DEFAULT_CONDITIONS });
    }

    setShowExpr(false);
    setSaveMsg(null);
    setView(VIEWS.EDIT);
  };

  // ── Derived expression ──────────────────────────────────────────────────────

  const currentExpression = buildExpressionFromConditions(formConditions);

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formName.trim()) {
      setSaveMsg({ type: 'error', text: 'Name is required.' });
      return;
    }
    if (!currentExpression) {
      setSaveMsg({ type: 'error', text: 'At least one condition must be enabled.' });
      return;
    }

    // Derive trigger metadata from conditions
    let trigger_level_expr = null;
    let trigger_direction  = null;
    if (formConditions.utp_bdp_trigger_above?.enabled) {
      trigger_level_expr = 'utp_trigger_31_bdp'; trigger_direction = 'ABOVE';
    } else if (formConditions.utp_jgd_trigger_above?.enabled) {
      trigger_level_expr = 'utp_trigger_31_jgd'; trigger_direction = 'ABOVE';
    } else if (formConditions.dtp_bdp_trigger_below?.enabled) {
      trigger_level_expr = 'dtp_trigger_22_bdp'; trigger_direction = 'BELOW';
    } else if (formConditions.dtp_jwd_trigger_below?.enabled) {
      trigger_level_expr = 'dtp_trigger_22_jwd'; trigger_direction = 'BELOW';
    } else if (formConditions.utp_bdp_trigger_above_21?.enabled) {
      trigger_level_expr = 'utp_trigger_21_bdp'; trigger_direction = 'ABOVE';
    } else if (formConditions.utp_jgd_trigger_above_21?.enabled) {
      trigger_level_expr = 'utp_trigger_21_jgd'; trigger_direction = 'ABOVE';
    } else if (formConditions.rc_crossed_above?.enabled) {
      trigger_level_expr = formConditions.rc_crossed_above.level; trigger_direction = 'ABOVE';
    } else if (formConditions.fc_crossed_below?.enabled) {
      trigger_level_expr = formConditions.fc_crossed_below.level; trigger_direction = 'BELOW';
    }

    // Derive new_high_threshold from whichever pct condition is enabled
    const activePct = formConditions.new_high_pct?.enabled
      ? formConditions.new_high_pct.pct
      : formConditions.new_low_pct?.enabled
        ? formConditions.new_low_pct.pct
        : null;
    const parsedPct = activePct != null ? parseFloat(activePct) : NaN;
    const new_high_threshold = !isNaN(parsedPct) && parsedPct > 0
      ? parsedPct / 100
      : null;

    const payload = {
      name:        formName.trim(),
      description: formDesc.trim() || null,
      rule_order:  formOrder,
      is_enabled:  formEnabled,
      rule_template:   'custom',
      template_config: { conditions: formConditions },
      expression:  currentExpression,
      applies_to_timeframes: formTFs,
      applies_to_patterns:   formPats,
      trigger_level_expr,
      trigger_direction,
      new_high_threshold,
    };

    try {
      setSaving(true);
      setSaveMsg(null);
      let res;
      if (editingRule) {
        res = await api.updateMergeRule(editingRule.id, payload);
      } else {
        res = await api.createMergeRule(payload);
      }
      if (res.success) {
        setSaveMsg({ type: 'success', text: editingRule ? 'Rule updated.' : 'Rule created.' });
        await loadRules();
        setTimeout(() => setView(VIEWS.LIST), 800);
      } else {
        setSaveMsg({ type: 'error', text: res.message || 'Save failed.' });
      }
    } catch (e) {
      setSaveMsg({ type: 'error', text: e.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle ──────────────────────────────────────────────────────────────────

  const handleToggle = async (rule) => {
    try {
      const res = await api.toggleMergeRule(rule.id);
      if (res.success) {
        setRules(prev => prev.map(r => r.id === rule.id ? res.rule : r));
      }
    } catch (e) {
      setError('Toggle failed.');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    try {
      const res = await api.deleteMergeRule(id);
      if (res.success) {
        setRules(prev => prev.filter(r => r.id !== id));
        setDeleteId(null);
      }
    } catch (e) {
      setError('Delete failed.');
    }
  };

  // ── Reorder ─────────────────────────────────────────────────────────────────

  const moveRule = async (index, direction) => {
    const next = [...rules];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= next.length) return;

    const orderA = next[index].rule_order;
    const orderB = next[swapIdx].rule_order;

    next[index]   = { ...next[index],   rule_order: orderB };
    next[swapIdx] = { ...next[swapIdx], rule_order: orderA };
    next.sort((a, b) => a.rule_order - b.rule_order);
    setRules(next);

    try {
      await api.reorderMergeRules([
        { id: next[index].id,   rule_order: next[index].rule_order },
        { id: next[swapIdx].id, rule_order: next[swapIdx].rule_order },
      ]);
    } catch (e) {
      loadRules();
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const isLegacyRule = editingRule && LEGACY_TEMPLATES.has(editingRule.rule_template);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Merge Rules</h1>
            <p className="text-sm text-gray-500">Define conditions that prevent candle merging</p>
          </div>
        </div>
        {view === VIEWS.LIST && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        )}
        {view === VIEWS.EDIT && (
          <button
            onClick={() => setView(VIEWS.LIST)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl text-sm font-medium border border-gray-300 hover:border-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to list
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
        {view === VIEWS.LIST && (
          <motion.div key="list"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading rules…
              </div>
            ) : rules.length === 0 ? (
              <div style={glass} className="rounded-2xl p-12 text-center">
                <SlidersHorizontal className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No merge rules yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Click <strong>Add Rule</strong> to create your first condition.
                  When the rules table is empty, all bars are merged by default.
                </p>
                <button
                  onClick={openAdd}
                  className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add your first rule
                </button>
              </div>
            ) : (
              rules.map((rule, idx) => (
                <motion.div key={rule.id}
                  style={glass} className="rounded-2xl p-4"
                  layout
                >
                  <div className="flex items-start gap-3">
                    {/* Order badge + arrows */}
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => moveRule(idx, -1)} disabled={idx === 0}
                        className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors">
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-700">
                        {rule.rule_order}
                      </div>
                      <button onClick={() => moveRule(idx, 1)} disabled={idx === rules.length - 1}
                        className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${rule.is_enabled ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          {rule.name}
                        </span>
                        {LEGACY_TEMPLATES.has(rule.rule_template) && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                            legacy
                          </span>
                        )}
                        {!rule.is_enabled && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">disabled</span>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{rule.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(rule.applies_to_timeframes || []).length > 0
                          ? rule.applies_to_timeframes.map(tf => (
                              <span key={tf} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs">{tf}</span>
                            ))
                          : <span className="px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 text-xs">All TFs</span>
                        }
                        {(rule.applies_to_patterns || []).length > 0
                          ? rule.applies_to_patterns.map(p => (
                              <span key={p} className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-xs">{p}</span>
                            ))
                          : <span className="px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 text-xs">All Patterns</span>
                        }
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleToggle(rule)} title={rule.is_enabled ? 'Disable' : 'Enable'}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        {rule.is_enabled
                          ? <ToggleRight className="w-5 h-5 text-blue-600" />
                          : <ToggleLeft  className="w-5 h-5 text-gray-400" />
                        }
                      </button>
                      <button onClick={() => openEdit(rule)} title="Edit"
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      {deleteId === rule.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-600">Delete?</span>
                          <button onClick={() => handleDelete(rule.id)}
                            className="px-2 py-0.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700">
                            Yes
                          </button>
                          <button onClick={() => setDeleteId(null)}
                            className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300">
                            No
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteId(rule.id)} title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* ── EDIT VIEW ─────────────────────────────────────────────────────── */}
        {view === VIEWS.EDIT && (
          <motion.div key="edit"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {/* Basic fields */}
            <div style={glass} className="rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-800 text-sm">
                {editingRule ? `Edit: ${editingRule.name}` : 'New Rule'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Rule name *</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. JGD crossed RC 38.2%"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white/80"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Rule order</label>
                  <input type="number" value={formOrder} onChange={e => setFormOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white/80"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Description</label>
                <input value={formDesc} onChange={e => setFormDesc(e.target.value)}
                  placeholder="Optional — shown in the rule list"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white/80"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formEnabled} onChange={e => setFormEnabled(e.target.checked)}
                    className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChipMultiSelect
                  label="Applies to timeframes"
                  options={TIMEFRAMES}
                  value={formTFs}
                  onChange={setFormTFs}
                />
                <ChipMultiSelect
                  label="Applies to patterns"
                  options={PATTERNS}
                  value={formPats}
                  onChange={setFormPats}
                />
              </div>
            </div>

            {/* Legacy rule notice */}
            {isLegacyRule && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  This rule was created with the old template system.
                  Configure conditions below and save to migrate it to the new format.
                </span>
              </div>
            )}

            {/* Condition checklist */}
            <div style={glass} className="rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 text-sm">Conditions</h2>
                <span className="text-xs text-gray-400">All checked conditions must be true (AND)</span>
              </div>
              <ConditionChecklist
                conditions={formConditions}
                onChange={setFormConditions}
              />
            </div>

            {/* Expression preview */}
            {currentExpression && (
              <div style={glass} className="rounded-2xl p-5">
                <button
                  onClick={() => setShowExpr(v => !v)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                  {showExpr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showExpr ? 'Hide' : 'Preview'} generated expression
                </button>
                {showExpr && (
                  <pre className="mt-3 p-3 rounded-xl bg-gray-900 text-green-400 text-xs font-mono whitespace-pre-wrap break-all">
                    {currentExpression}
                  </pre>
                )}
              </div>
            )}

            {/* Save message */}
            {saveMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
                saveMsg.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {saveMsg.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  : <AlertCircle  className="w-4 h-4 flex-shrink-0" />
                }
                {saveMsg.text}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Rule'}
              </button>
              <button onClick={() => setView(VIEWS.LIST)}
                className="px-5 py-2.5 bg-white text-gray-700 rounded-xl text-sm font-medium border border-gray-300 hover:border-gray-400 transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
