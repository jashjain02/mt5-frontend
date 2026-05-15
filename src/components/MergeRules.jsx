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
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.06)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChipMultiSelect({ options, value, onChange, label }) {
  const toggle = (v) => {
    const next = value.includes(v) ? value.filter(x => x !== v) : [...value, v];
    onChange(next);
  };
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label} <span className="text-gray-500">(empty = all)</span></p>
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
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-blue-400 hover:text-gray-200'
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
      className="ml-1 px-1.5 py-0.5 text-xs border border-white/10 rounded bg-white/8 text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40 cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.08)', color: '#e5e7eb' }}
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
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
                  <span className={`text-sm select-none ${state.enabled ? 'text-gray-100' : 'text-gray-500'}`}>
                    {cond.label}
                  </span>
                  {cond.hasPattern && (
                    <select
                      value={state.pattern || '3+1'}
                      onChange={e => set(cond.id, 'pattern', e.target.value)}
                      disabled={!state.enabled}
                      onClick={e => e.stopPropagation()}
                      className="ml-1 px-1.5 py-0.5 text-xs border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40 cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.08)', color: '#e5e7eb' }}
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
                          className="ml-1 px-1.5 py-0.5 text-xs border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40 cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.08)', color: '#e5e7eb' }}
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
                              className="w-16 px-1.5 py-0.5 text-xs border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
                              style={{ background: 'rgba(255,255,255,0.08)', color: '#e5e7eb' }}
                              placeholder="e.g. 21.9"
                            />
                            <span className="text-xs text-gray-400 ml-0.5">%</span>
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
                      <span className="text-xs text-gray-400">{cond.bufferLabel}</span>
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

  // Exception mode state
  const [formParentRuleId,   setFormParentRuleId]   = useState(null);
  const [formParentRuleName, setFormParentRuleName] = useState('');
  const [formExcOrder,       setFormExcOrder]       = useState(1);
  const [excDeleteId,        setExcDeleteId]        = useState(null);

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
    setFormParentRuleId(null);
    setFormParentRuleName('');
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

  const openAddException = (parentRule) => {
    setEditingRule(null);
    setFormParentRuleId(parentRule.id);
    setFormParentRuleName(parentRule.name);
    setFormExcOrder((parentRule.exceptions?.length ?? 0) + 1);
    setFormName('');
    setFormDesc('');
    setFormEnabled(true);
    setFormConditions({ ...DEFAULT_CONDITIONS });
    setShowExpr(false);
    setSaveMsg(null);
    setView(VIEWS.EDIT);
  };

  const openEditException = async (exc, parentRule) => {
    try {
      const res = await api.getMergeRule(exc.id);
      if (!res.success) return;
      const full = res.rule;
      setEditingRule(full);
      setFormParentRuleId(full.parent_rule_id ?? parentRule.id);
      setFormParentRuleName(parentRule.name);
      setFormExcOrder(full.exception_order ?? exc.exception_order ?? 1);
      setFormName(full.name);
      setFormDesc(full.description || '');
      setFormEnabled(full.is_enabled);
      const tc = full.template_config || {};
      if (tc.conditions) {
        const restored = { ...DEFAULT_CONDITIONS, ...tc.conditions };
        if (full.new_high_threshold != null) {
          const pctStr = String(parseFloat((full.new_high_threshold * 100).toPrecision(6)));
          if (restored.new_high_pct?.enabled) restored.new_high_pct = { ...restored.new_high_pct, pct: pctStr };
          if (restored.new_low_pct?.enabled)  restored.new_low_pct  = { ...restored.new_low_pct,  pct: pctStr };
        }
        setFormConditions(restored);
      } else {
        setFormConditions({ ...DEFAULT_CONDITIONS });
      }
      setShowExpr(false);
      setSaveMsg(null);
      setView(VIEWS.EDIT);
    } catch (e) {
      setError('Failed to load exception.');
    }
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setFormParentRuleId(null);
    setFormParentRuleName('');
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

    const isException = formParentRuleId != null;

    const payload = {
      name:        formName.trim(),
      description: formDesc.trim() || null,
      rule_order:  isException ? 0 : formOrder,
      is_enabled:  formEnabled,
      rule_template:   'custom',
      template_config: { conditions: formConditions },
      expression:  currentExpression,
      applies_to_timeframes: isException ? [] : formTFs,
      applies_to_patterns:   isException ? [] : formPats,
      trigger_level_expr,
      trigger_direction,
      new_high_threshold,
      ...(isException ? { parent_rule_id: formParentRuleId, exception_order: formExcOrder } : {}),
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
        const label = isException ? 'Exception' : 'Rule';
        setSaveMsg({ type: 'success', text: editingRule ? `${label} updated.` : `${label} created.` });
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
        // Parent rule: update in-place; exception: reload to update nested array
        if (!rule.parent_rule_id) {
          setRules(prev => prev.map(r => r.id === rule.id ? { ...res.rule, exceptions: r.exceptions } : r));
        } else {
          await loadRules();
        }
      }
    } catch (e) {
      setError('Toggle failed.');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id, isException = false) => {
    try {
      const res = await api.deleteMergeRule(id);
      if (res.success) {
        if (isException) {
          setExcDeleteId(null);
          await loadRules();
        } else {
          setRules(prev => prev.filter(r => r.id !== id));
          setDeleteId(null);
        }
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <SlidersHorizontal className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">Merge Rules</h1>
            <p className="text-sm text-gray-400">Define conditions that prevent candle merging</p>
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
            onClick={() => { setFormParentRuleId(null); setView(VIEWS.LIST); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/10 hover:border-blue-400 transition-colors text-gray-300 hover:text-gray-100"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to list
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-red-400 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
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
              <div className="flex items-center justify-center py-16 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading rules…
              </div>
            ) : rules.length === 0 ? (
              <div style={glass} className="rounded-2xl p-12 text-center">
                <SlidersHorizontal className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-300 font-medium">No merge rules yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  Click <strong className="text-gray-300">Add Rule</strong> to create your first condition.
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
                        className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 transition-colors">
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      </button>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-blue-400" style={{ background: 'rgba(59,130,246,0.15)' }}>
                        {rule.rule_order}
                      </div>
                      <button onClick={() => moveRule(idx, 1)} disabled={idx === rules.length - 1}
                        className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 transition-colors">
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${rule.is_enabled ? 'text-gray-100' : 'text-gray-500 line-through'}`}>
                          {rule.name}
                        </span>
                        {LEGACY_TEMPLATES.has(rule.rule_template) && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium text-amber-400" style={{ background: 'rgba(245,158,11,0.15)' }}>
                            legacy
                          </span>
                        )}
                        {!rule.is_enabled && (
                          <span className="px-2 py-0.5 rounded-full text-xs text-gray-500" style={{ background: 'rgba(255,255,255,0.06)' }}>disabled</span>
                        )}
                        {(rule.exceptions || []).length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs text-violet-400" style={{ background: 'rgba(139,92,246,0.15)' }}>
                            {rule.exceptions.length} exception{rule.exceptions.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{rule.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(rule.applies_to_timeframes || []).length > 0
                          ? rule.applies_to_timeframes.map(tf => (
                              <span key={tf} className="px-1.5 py-0.5 rounded text-xs text-blue-300" style={{ background: 'rgba(59,130,246,0.15)' }}>{tf}</span>
                            ))
                          : <span className="px-1.5 py-0.5 rounded text-xs text-gray-400" style={{ background: 'rgba(255,255,255,0.06)' }}>All TFs</span>
                        }
                        {(rule.applies_to_patterns || []).length > 0
                          ? rule.applies_to_patterns.map(p => (
                              <span key={p} className="px-1.5 py-0.5 rounded text-xs text-emerald-300" style={{ background: 'rgba(16,185,129,0.15)' }}>{p}</span>
                            ))
                          : <span className="px-1.5 py-0.5 rounded text-xs text-gray-400" style={{ background: 'rgba(255,255,255,0.06)' }}>All Patterns</span>
                        }
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleToggle(rule)} title={rule.is_enabled ? 'Disable' : 'Enable'}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        {rule.is_enabled
                          ? <ToggleRight className="w-5 h-5 text-blue-400" />
                          : <ToggleLeft  className="w-5 h-5 text-gray-500" />
                        }
                      </button>
                      <button onClick={() => openEdit(rule)} title="Edit"
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                      {deleteId === rule.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-400">Delete?</span>
                          <button onClick={() => handleDelete(rule.id)}
                            className="px-2 py-0.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700">
                            Yes
                          </button>
                          <button onClick={() => setDeleteId(null)}
                            className="px-2 py-0.5 rounded text-xs font-medium text-gray-300 hover:text-gray-100" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            No
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteId(rule.id)} title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Exceptions sub-section ──────────────────────────── */}
                  <div className="mt-3 ml-11 space-y-1.5">
                    {(rule.exceptions || []).length > 0 && (
                      <p className="text-xs text-gray-500 mb-1">Exceptions — click to toggle individually:</p>
                    )}
                    {(rule.exceptions || []).map(exc => (
                      <div key={exc.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${exc.is_enabled ? 'bg-violet-400' : 'bg-gray-600'}`} />
                        <span className="text-xs text-gray-400 flex-shrink-0 font-mono">#{exc.exception_order}</span>
                        <span className={`text-xs flex-1 truncate ${exc.is_enabled ? 'text-gray-200' : 'text-gray-500 line-through'}`}>
                          {exc.name}
                        </span>
                        {exc.description && (
                          <span className="text-xs text-gray-500 truncate hidden sm:block max-w-[200px]">{exc.description}</span>
                        )}
                        {/* Exception actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleToggle(exc)}
                            title={exc.is_enabled ? 'Disable exception' : 'Enable exception'}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                              exc.is_enabled
                                ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                                : 'bg-gray-700/40 text-gray-500 hover:bg-gray-700/60'
                            }`}
                          >
                            {exc.is_enabled
                              ? <><ToggleRight className="w-3.5 h-3.5" /> Enabled</>
                              : <><ToggleLeft  className="w-3.5 h-3.5" /> Disabled</>
                            }
                          </button>
                          <button onClick={() => openEditException(exc, rule)} title="Edit exception"
                            className="p-1 rounded hover:bg-white/10 transition-colors">
                            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          {excDeleteId === exc.id ? (
                            <div className="flex items-center gap-1 ml-1">
                              <span className="text-xs text-red-400">Delete?</span>
                              <button onClick={() => handleDelete(exc.id, true)}
                                className="px-1.5 py-0.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700">Yes</button>
                              <button onClick={() => setExcDeleteId(null)}
                                className="px-1.5 py-0.5 rounded text-xs text-gray-300" style={{ background: 'rgba(255,255,255,0.08)' }}>No</button>
                            </div>
                          ) : (
                            <button onClick={() => setExcDeleteId(exc.id)} title="Delete exception"
                              className="p-1 rounded hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Add exception button */}
                    <button
                      onClick={() => openAddException(rule)}
                      className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors py-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Exception
                    </button>
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
              {/* Exception breadcrumb */}
              {formParentRuleId && (
                <div className="flex items-center gap-2 text-xs text-violet-400 pb-1 border-b border-violet-500/20">
                  <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(139,92,246,0.15)' }}>Exception</span>
                  <span className="text-gray-500">of rule:</span>
                  <span className="text-violet-300 font-medium truncate">{formParentRuleName}</span>
                </div>
              )}

              <h2 className="font-semibold text-gray-100 text-sm">
                {editingRule
                  ? `Edit: ${editingRule.name}`
                  : formParentRuleId ? 'New Exception' : 'New Rule'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    {formParentRuleId ? 'Exception name *' : 'Rule name *'}
                  </label>
                  <input value={formName} onChange={e => setFormName(e.target.value)}
                    placeholder={formParentRuleId ? 'e.g. JGD trigger TVHS' : 'e.g. JGD crossed RC 38.2%'}
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-100 placeholder-gray-600"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
                {formParentRuleId ? (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Exception order</label>
                    <input type="number" value={formExcOrder} onChange={e => setFormExcOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-100"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Rule order</label>
                    <input type="number" value={formOrder} onChange={e => setFormOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-100"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Description</label>
                <input value={formDesc} onChange={e => setFormDesc(e.target.value)}
                  placeholder="Optional — shown in the rule list"
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-100 placeholder-gray-600"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formEnabled} onChange={e => setFormEnabled(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500" />
                  <span className="text-sm text-gray-300">Enabled</span>
                </label>
              </div>

              {/* Scope filters — hidden for exceptions (they inherit from parent) */}
              {!formParentRuleId && (
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
              )}
            </div>

            {/* Legacy rule notice */}
            {isLegacyRule && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-amber-400 text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
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
                <h2 className="font-semibold text-gray-100 text-sm">Conditions</h2>
                <span className="text-xs text-gray-500">All checked conditions must be true (AND)</span>
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
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
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
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-sm"
                style={saveMsg.type === 'success'
                  ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }
                  : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }
                }
              >
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
                className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors ${formParentRuleId ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? 'Saving…' : formParentRuleId ? 'Save Exception' : 'Save Rule'}
              </button>
              <button onClick={() => { setFormParentRuleId(null); setView(VIEWS.LIST); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-white/10 hover:border-white/20 text-gray-300 hover:text-gray-100 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
