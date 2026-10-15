import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Settings, Activity, Beaker, Plus, Loader2, Power, PowerOff,
  AlertCircle, ChevronLeft, CheckCircle2, Info, Pencil, Save,
  TrendingUp, FlaskConical, ShieldCheck,
} from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';

const oceanColors = {
  deep: '#0B2F9E', mid: '#1A4D8C', light: '#2B7BA8', surface: '#4AA3C2',
  wave: '#6EC8D9', foam: '#A8E6CF', gold: '#FFD700', navy: '#0A1C40',
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
  info: '#3B82F6', textDark: '#1F2937', textLight: '#6B7280', white: '#FFFFFF',
};

interface ConfigItem {
  Id: number;
  Title: string;
  Deleted: boolean;
  Status: boolean;
  PostedOn: string;
  UpdatedOn: string;
  usageCount: number | null;
  StartIndex?: number | null;
  StopIndex?: number | null;
}

type RangeConfigType =
  | 'bmi' | 'bp' | 'rbs'
  | 'fbs' | 'hba1c' | 'microalbumin' | 'psa' | 'bmd';

type SimpleConfigType =
  | 'referrals' | 'bp-remarks' | 'rbs-remarks'
  | 'breast-exam' | 'pap-smear' | 'via-villi'
  | 'hepatitis-b' | 'hepatitis-c' | 'lipid';

type ConfigType = RangeConfigType | SimpleConfigType;

type ViewState =
  | 'menu'
  | 'referrals'
  | 'remarks'
  | 'field-interpretations'
  | 'lab-interpretations'
  | 'oncology-screening'
  | 'lab-results';

type RemarkTab = 'bp-remarks' | 'rbs-remarks';

// ─── Static tab metadata ────────────────────────────────────────────
const FIELD_INTERPRETATIONS: { key: RangeConfigType; label: string; subtitle: string }[] = [
  { key: 'bmi', label: 'BMI', subtitle: 'Body Mass Index ranges' },
  { key: 'bp', label: 'Blood Pressure', subtitle: 'BP interpretation ranges' },
  { key: 'rbs', label: 'Random Blood Sugar', subtitle: 'RBS interpretation ranges' },
];

const LAB_INTERPRETATIONS: { key: RangeConfigType; label: string; subtitle: string }[] = [
  { key: 'fbs', label: 'FBS', subtitle: 'Fasting Blood Sugar ranges' },
  { key: 'hba1c', label: 'HbA1c', subtitle: 'Glycated haemoglobin ranges' },
  { key: 'microalbumin', label: 'Microalbumin', subtitle: 'Urine microalbumin ranges' },
  { key: 'psa', label: 'PSA', subtitle: 'Prostate-specific antigen ranges' },
  { key: 'bmd', label: 'BMD', subtitle: 'Bone Mineral Density T-scores' },
];

// Oncology screening results (female-only fields live here too)
const ONCOLOGY_SCREENING: { key: SimpleConfigType; label: string; subtitle: string }[] = [
  { key: 'breast-exam', label: 'Breast Exam', subtitle: 'Breast exam result options' },
  { key: 'pap-smear',   label: 'PAP Smear',   subtitle: 'PAP smear result options' },
  { key: 'via-villi',   label: 'VIA Villi',   subtitle: 'VIA Villi result options' },
];

// Lab result option lists (non-range lookups)
const LAB_RESULTS: { key: SimpleConfigType; label: string; subtitle: string }[] = [
  { key: 'lipid',       label: 'Lipids',       subtitle: 'Lipid profile result options' },
  { key: 'hepatitis-b', label: 'Hepatitis B',  subtitle: 'Hepatitis B screening results' },
  { key: 'hepatitis-c', label: 'Hepatitis C',  subtitle: 'Hepatitis C screening results' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Shared: cache invalidation after any mutation ──────────────────
function useInvalidateConfig(qc: ReturnType<typeof useQueryClient>, type: string) {
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ['admin-config', type] });
    // Also refresh any live lookup caches (used by capture forms)
    qc.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        typeof q.queryKey[0] === 'string' &&
        q.queryKey[0].endsWith('-values'),
    });
  }, [qc, type]);
}

// ============================================
// Simple lookup manager — Referrals, Remarks, Screening, Lab Options
// ============================================
function LookupManager({
  type, title, subtitle, showUsage = false,
}: {
  type: SimpleConfigType;
  title: string;
  subtitle: string;
  showUsage?: boolean;
}) {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);
  const invalidate = useInvalidateConfig(qc, type);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-config', type],
    queryFn: async () => {
      const r = await api.get(`/admin-config/${type}`);
      return (r.data?.items || []) as ConfigItem[];
    },
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: async (body: { Title: string; LegacyColumn?: string | null }) => {
      const r = await api.post(`/admin-config/${type}`, body);
      return r.data;
    },
    onSuccess: () => {
      toast.success(`"${newTitle}" added.`);
      setNewTitle('');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, Deleted }: { id: number; Deleted: boolean }) => {
      setPendingToggleId(id);
      const r = await api.patch(`/admin-config/${type}/${id}`, { Deleted });
      return r.data;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.Deleted ? 'Deactivated' : 'Reactivated');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
    onSettled: () => setPendingToggleId(null),
  });

  const handleCreate = () => {
    const t = newTitle.trim();
    if (t.length < 2) {
      toast.error('Title must be at least 2 characters');
      return;
    }
    createMut.mutate({ Title: t });
  };

  const items = data || [];
  const activeCount = items.filter(i => !i.Deleted).length;
  const inactiveCount = items.filter(i => i.Deleted).length;

  return (
    <div>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
      />

      {/* Add form */}
      <div style={{
        background: '#f8fafc', padding: '12px', borderRadius: '10px',
        marginBottom: '16px', border: `1px solid ${oceanColors.mid}15`,
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="New title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={50}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={inputStyle({ flex: 1, minWidth: '180px' })}
          />
          <button
            onClick={handleCreate}
            disabled={createMut.isPending || newTitle.trim().length < 2}
            style={primaryBtn(createMut.isPending || newTitle.trim().length < 2)}
          >
            {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyBlock text="No items yet. Add the first one above." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map((item) => (
            <SimpleRow
              key={item.Id}
              item={item}
              showUsage={showUsage}
              isPending={pendingToggleId === item.Id}
              onToggle={() => toggleMut.mutate({ id: item.Id, Deleted: !item.Deleted })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Range lookup manager — Interpretation tables
// ============================================
function RangeLookupManager({
  type, title, subtitle,
}: {
  type: RangeConfigType;
  title: string;
  subtitle: string;
}) {
  const qc = useQueryClient();
  const invalidate = useInvalidateConfig(qc, type);

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newStop, setNewStop] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-config', type],
    queryFn: async () => {
      const r = await api.get(`/admin-config/${type}`);
      return (r.data?.items || []) as ConfigItem[];
    },
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: async (body: { Title: string; StartIndex: number; StopIndex: number }) => {
      const r = await api.post(`/admin-config/${type}`, body);
      return r.data;
    },
    onSuccess: () => {
      toast.success('Interpretation added');
      setNewTitle(''); setNewStart(''); setNewStop(''); setAdding(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: async (body: { id: number; Title: string; StartIndex: number; StopIndex: number }) => {
      const r = await api.put(`/admin-config/${type}/${body.id}`, body);
      return r.data;
    },
    onSuccess: () => {
      toast.success('Interpretation updated');
      setEditingId(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, Deleted }: { id: number; Deleted: boolean }) => {
      setPendingToggleId(id);
      const r = await api.patch(`/admin-config/${type}/${id}`, { Deleted });
      return r.data;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.Deleted ? 'Deactivated' : 'Reactivated');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
    onSettled: () => setPendingToggleId(null),
  });

  const handleCreate = () => {
    const t = newTitle.trim();
    if (t.length < 2) return toast.error('Title must be at least 2 characters');
    if (newStart === '' || newStop === '') return toast.error('Start and Stop are required');
    const s = Number(newStart), e = Number(newStop);
    if (!Number.isFinite(s) || !Number.isFinite(e)) return toast.error('Start and Stop must be numeric');
    if (s !== e && s > e) return toast.error('Start must be ≤ Stop');
    createMut.mutate({ Title: t, StartIndex: s, StopIndex: e });
  };

  const items = data || [];
  const activeCount = items.filter(i => !i.Deleted).length;
  const inactiveCount = items.filter(i => i.Deleted).length;

  return (
    <div>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
      />

      {/* Add form / collapsed button */}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          style={{
            ...primaryBtn(false),
            marginBottom: '16px',
          }}
        >
          <Plus size={14} /> Add interpretation range
        </button>
      ) : (
        <div style={{
          background: '#f8fafc', padding: '12px', borderRadius: '10px',
          marginBottom: '16px', border: `1px solid ${oceanColors.mid}15`,
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Title (e.g. Normal)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={50}
              style={inputStyle({ flex: 2, minWidth: '160px' })}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Start"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              style={inputStyle({ width: '100px' })}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Stop"
              value={newStop}
              onChange={(e) => setNewStop(e.target.value)}
              style={inputStyle({ width: '100px' })}
            />
            <button
              onClick={handleCreate}
              disabled={createMut.isPending}
              style={primaryBtn(createMut.isPending)}
            >
              {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewTitle(''); setNewStart(''); setNewStop(''); }}
              style={ghostBtn()}
            >
              Cancel
            </button>
          </div>
          <p style={{
            fontSize: '11px', color: oceanColors.textLight,
            margin: '8px 0 0',
          }}>
            Range semantics: <b>Start ≤ value &lt; Stop</b>. Equal values create a sentinel ("N/A") row.
          </p>
        </div>
      )}

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyBlock text="No interpretation ranges yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map((item) => (
            <RangeRow
              key={item.Id}
              item={item}
              editing={editingId === item.Id}
              isPending={pendingToggleId === item.Id}
              onStartEdit={() => setEditingId(item.Id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(payload) => updateMut.mutate({ id: item.Id, ...payload })}
              saving={updateMut.isPending && editingId === item.Id}
              onToggle={() => toggleMut.mutate({ id: item.Id, Deleted: !item.Deleted })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Row renderers ──────────────────────────────────────────────────
function SimpleRow({
  item, showUsage, isPending, onToggle,
}: {
  item: ConfigItem;
  showUsage: boolean;
  isPending: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={rowShell(item.Deleted)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
        <span style={{
          fontWeight: '600', fontSize: '13px',
          color: item.Deleted ? oceanColors.textLight : oceanColors.textDark,
          textDecoration: item.Deleted ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.Title}
        </span>
        {item.Deleted && <InactiveBadge />}
        {showUsage && item.usageCount !== null && item.usageCount > 0 && (
          <span
            title="Historical records reference this item"
            style={{
              fontSize: '10px', background: `${oceanColors.info}15`,
              color: oceanColors.info, padding: '2px 8px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '3px',
            }}
          >
            <Info size={10} /> {item.usageCount} uses
          </span>
        )}
      </div>
      <ToggleButton deleted={item.Deleted} isPending={isPending} onClick={onToggle} />
    </div>
  );
}

function RangeRow({
  item, editing, isPending, onStartEdit, onCancelEdit, onSave, saving, onToggle,
}: {
  item: ConfigItem;
  editing: boolean;
  isPending: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (p: { Title: string; StartIndex: number; StopIndex: number }) => void;
  saving: boolean;
  onToggle: () => void;
}) {
  const [t, setT] = useState(item.Title);
  const [s, setS] = useState(String(item.StartIndex ?? ''));
  const [e, setE] = useState(String(item.StopIndex ?? ''));

  useEffect(() => {
    if (editing) {
      setT(item.Title);
      setS(String(item.StartIndex ?? ''));
      setE(String(item.StopIndex ?? ''));
    }
  }, [editing, item]);

  const isSentinel = item.StartIndex === item.StopIndex;

  if (editing) {
    return (
      <div style={{
        ...rowShell(false),
        border: `2px solid ${oceanColors.gold}`,
        background: '#fffef7',
        flexWrap: 'wrap',
      }}>
        <input
          type="text" value={t} maxLength={50}
          onChange={(ev) => setT(ev.target.value)}
          style={inputStyle({ flex: 2, minWidth: '140px' })}
        />
        <input
          type="number" step="0.01" value={s}
          onChange={(ev) => setS(ev.target.value)}
          style={inputStyle({ width: '90px' })}
        />
        <input
          type="number" step="0.01" value={e}
          onChange={(ev) => setE(ev.target.value)}
          style={inputStyle({ width: '90px' })}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => {
              const nT = t.trim();
              const nS = Number(s), nE = Number(e);
              if (nT.length < 2) return toast.error('Title must be ≥ 2 characters');
              if (!Number.isFinite(nS) || !Number.isFinite(nE)) return toast.error('Start/Stop must be numeric');
              if (nS !== nE && nS > nE) return toast.error('Start must be ≤ Stop');
              onSave({ Title: nT, StartIndex: nS, StopIndex: nE });
            }}
            disabled={saving}
            style={primaryBtn(saving)}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
          <button onClick={onCancelEdit} style={ghostBtn()}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={rowShell(item.Deleted)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
        <span style={{
          fontWeight: '600', fontSize: '13px',
          color: item.Deleted ? oceanColors.textLight : oceanColors.textDark,
          textDecoration: item.Deleted ? 'line-through' : 'none',
        }}>
          {item.Title}
        </span>
        <span style={{
          fontFamily: 'monospace', fontSize: '11px',
          background: isSentinel ? `${oceanColors.info}15` : `${oceanColors.mid}12`,
          color: isSentinel ? oceanColors.info : oceanColors.mid,
          padding: '2px 8px', borderRadius: '8px',
          fontWeight: 'bold',
        }}>
          {isSentinel
            ? `N/A (${item.StartIndex})`
            : `${item.StartIndex} ≤ x < ${item.StopIndex}`}
        </span>
        {item.Deleted && <InactiveBadge />}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {!item.Deleted && (
          <button
            onClick={onStartEdit}
            title="Edit title and range"
            style={{
              padding: '6px 10px', borderRadius: '8px',
              border: `1px solid ${oceanColors.info}40`,
              background: `${oceanColors.info}10`,
              color: oceanColors.info, cursor: 'pointer',
              fontSize: '11px', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <Pencil size={12} /> Edit
          </button>
        )}
        <ToggleButton deleted={item.Deleted} isPending={isPending} onClick={onToggle} />
      </div>
    </div>
  );
}

// ─── Small shared UI bits ───────────────────────────────────────────
function SectionHeader({
  title, subtitle, activeCount, inactiveCount,
}: {
  title: string; subtitle: string; activeCount: number; inactiveCount: number;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '16px', flexWrap: 'wrap', gap: '8px',
    }}>
      <div>
        <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
          {title}
        </h4>
        <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: '2px 0 0' }}>
          {subtitle}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
        <span style={{
          background: `${oceanColors.success}15`, color: oceanColors.success,
          padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold',
        }}>{activeCount} active</span>
        {inactiveCount > 0 && (
          <span style={{
            background: `${oceanColors.textLight}15`, color: oceanColors.textLight,
            padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold',
          }}>{inactiveCount} inactive</span>
        )}
      </div>
    </div>
  );
}

function ToggleButton({
  deleted, isPending, onClick,
}: { deleted: boolean; isPending: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={isPending}
      title={deleted ? 'Reactivate — show in clerk forms again' : 'Deactivate — hide from clerk forms (keeps history)'}
      style={{
        padding: '6px 12px', borderRadius: '8px',
        border: `1px solid ${deleted ? oceanColors.success + '40' : oceanColors.danger + '40'}`,
        background: deleted ? `${oceanColors.success}10` : `${oceanColors.danger}10`,
        color: deleted ? oceanColors.success : oceanColors.danger,
        fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '4px',
        flexShrink: 0,
      }}
    >
      {isPending
        ? <Loader2 size={12} className="animate-spin" />
        : deleted
          ? <><Power size={12} /> Reactivate</>
          : <><PowerOff size={12} /> Deactivate</>}
    </button>
  );
}

function InactiveBadge() {
  return (
    <span style={{
      fontSize: '10px', background: oceanColors.textLight,
      color: 'white', padding: '2px 8px', borderRadius: '8px',
      fontWeight: 'bold', textTransform: 'uppercase',
    }}>inactive</span>
  );
}

function LoadingBlock() {
  return (
    <div style={{ textAlign: 'center', padding: '32px' }}>
      <Loader2 size={24} className="animate-spin" style={{ color: oceanColors.deep }} />
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '32px',
      background: '#f8fafc', borderRadius: '12px',
      color: oceanColors.textLight, fontSize: '13px',
    }}>
      {text}
    </div>
  );
}

// ─── Style helpers ─────────────────────────────────────────────────
const inputStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  padding: '10px 12px',
  borderRadius: '8px',
  border: `1px solid ${oceanColors.mid}30`,
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  ...extra,
});

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '10px 18px',
  background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
  border: 'none', borderRadius: '8px',
  color: oceanColors.navy, fontWeight: 'bold', fontSize: '12px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', gap: '6px',
  opacity: disabled ? 0.6 : 1,
});

const ghostBtn = (): React.CSSProperties => ({
  padding: '10px 14px', background: 'transparent',
  border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px',
  color: oceanColors.textLight, fontSize: '12px', cursor: 'pointer',
});

const rowShell = (deleted: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 12px', background: deleted ? '#f8fafc' : 'white',
  border: `1px solid ${deleted ? '#e2e8f0' : `${oceanColors.mid}25`}`,
  borderRadius: '8px',
  opacity: deleted ? 0.7 : 1,
  gap: '8px',
});

// ============================================
// Tab container
// ============================================
function TabbedView<T extends string>({
  tabs, renderTab,
}: {
  tabs: { key: T; label: string }[];
  renderTab: (key: T) => React.ReactNode;
}) {
  const [active, setActive] = useState<T>(tabs[0]?.key);
  return (
    <>
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px',
        background: '#f1f5f9', padding: '4px', borderRadius: '10px',
        overflowX: 'auto',
      }}>
        {tabs.map(t => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                background: isActive ? oceanColors.deep : 'transparent',
                color: isActive ? 'white' : oceanColors.textLight,
                fontWeight: isActive ? 'bold' : 'normal',
                fontSize: '12px', cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {renderTab(active)}
    </>
  );
}

// ============================================
// Main modal
// ============================================
export default function TechnicalConfigModal({ isOpen, onClose }: Props) {
  const [view, setView] = useState<ViewState>('menu');
  const [remarkTab, setRemarkTab] = useState<RemarkTab>('bp-remarks');

  useEffect(() => {
    if (!isOpen) {
      setView('menu');
      setRemarkTab('bp-remarks');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1100, padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white', borderRadius: '20px', width: '100%',
        maxWidth: '820px', maxHeight: '90vh', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
          padding: '20px 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderBottom: `2px solid ${oceanColors.gold}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings size={24} style={{ color: oceanColors.gold }} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                Technical Configuration
              </h2>
              <p style={{ fontSize: '12px', color: oceanColors.foam, marginTop: '2px' }}>
                Manage dynamic lists used across data capture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: '8px', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

          {/* === MENU === */}
          {view === 'menu' && (
            <div>
              <p style={{ fontSize: '13px', color: oceanColors.textLight, marginBottom: '16px' }}>
                Select a configuration category to manage.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}>
                <MenuCard
                  icon={<Activity size={28} />}
                  title="Referrals"
                  description="Referral options shown on the field findings form"
                  onClick={() => setView('referrals')}
                />
                <MenuCard
                  icon={<Beaker size={28} />}
                  title="Remarks"
                  description="Medication-status remarks for BP and RBS"
                  onClick={() => setView('remarks')}
                />
                <MenuCard
                  icon={<TrendingUp size={28} />}
                  title="Field Interpretations"
                  description="BMI, BP and RBS value classification ranges"
                  onClick={() => setView('field-interpretations')}
                />
                <MenuCard
                  icon={<FlaskConical size={28} />}
                  title="Lab Interpretations"
                  description="FBS, HbA1c, Microalbumin, PSA and BMD ranges"
                  onClick={() => setView('lab-interpretations')}
                />
                <MenuCard
                  icon={<ShieldCheck size={28} />}
                  title="Oncology Screening"
                  description="Breast Exam, PAP Smear and VIA Villi result options"
                  onClick={() => setView('oncology-screening')}
                />
                <MenuCard
                  icon={<Beaker size={28} />}
                  title="Lab Results"
                  description="Lipid, Hepatitis B and Hepatitis C result options"
                  onClick={() => setView('lab-results')}
                />
              </div>
            </div>
          )}

          {/* === REFERRALS === */}
          {view === 'referrals' && (
            <div>
              <BackButton onClick={() => setView('menu')} />
              <InfoBanner>
                Existing referrals <strong>cannot be edited or deleted permanently</strong> — this preserves historical records.
                Deactivate to hide from clerk forms. Historical entries remain linked.
              </InfoBanner>
              <LookupManager
                type="referrals"
                title="Referrals"
                subtitle="Shown as checkboxes on the field findings form"
                showUsage
              />
            </div>
          )}

          {/* === REMARKS === */}
          {view === 'remarks' && (
            <div>
              <BackButton onClick={() => setView('menu')} />
              <InfoBanner>
                Remarks record whether a client is on medication. Deactivating only affects <strong>future</strong> data capture — historical entries stay linked.
              </InfoBanner>

              <div style={{
                display: 'flex', gap: '4px', marginBottom: '16px',
                background: '#f1f5f9', padding: '4px', borderRadius: '10px',
                width: 'fit-content',
              }}>
                {([
                  { key: 'bp-remarks' as const, label: 'Blood Pressure' },
                  { key: 'rbs-remarks' as const, label: 'Blood Sugar' },
                ]).map((tab) => {
                  const active = remarkTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setRemarkTab(tab.key)}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none',
                        background: active ? oceanColors.deep : 'transparent',
                        color: active ? 'white' : oceanColors.textLight,
                        fontWeight: active ? 'bold' : 'normal',
                        fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {remarkTab === 'bp-remarks' ? (
                <LookupManager
                  type="bp-remarks"
                  title="Blood Pressure Remarks"
                  subtitle="Medication status options for BP"
                />
              ) : (
                <LookupManager
                  type="rbs-remarks"
                  title="Blood Sugar Remarks"
                  subtitle="Medication status options for RBS"
                />
              )}
            </div>
          )}

          {/* === FIELD INTERPRETATIONS === */}
          {view === 'field-interpretations' && (
            <div>
              <BackButton onClick={() => setView('menu')} />
              <InfoBanner>
                Field interpretation ranges classify BMI, BP and RBS values. Ranges must not overlap —
                the system uses <strong>Start ≤ x &lt; Stop</strong> logic. Equal values create a sentinel ("N/A") row.
              </InfoBanner>
              <TabbedView
                tabs={FIELD_INTERPRETATIONS.map(t => ({ key: t.key, label: t.label }))}
                renderTab={(key) => {
                  const cfg = FIELD_INTERPRETATIONS.find(t => t.key === key)!;
                  return (
                    <RangeLookupManager
                      type={cfg.key}
                      title={`${cfg.label} Interpretations`}
                      subtitle={cfg.subtitle}
                    />
                  );
                }}
              />
            </div>
          )}

          {/* === LAB INTERPRETATIONS === */}
          {view === 'lab-interpretations' && (
            <div>
              <BackButton onClick={() => setView('menu')} />
              <InfoBanner>
                Lab interpretation ranges classify laboratory values. Ranges must not overlap —
                the system uses <strong>Start ≤ x &lt; Stop</strong> logic. BMD accepts negative T-scores.
              </InfoBanner>
              <TabbedView
                tabs={LAB_INTERPRETATIONS.map(t => ({ key: t.key, label: t.label }))}
                renderTab={(key) => {
                  const cfg = LAB_INTERPRETATIONS.find(t => t.key === key)!;
                  return (
                    <RangeLookupManager
                      type={cfg.key}
                      title={`${cfg.label} Interpretations`}
                      subtitle={cfg.subtitle}
                    />
                  );
                }}
              />
            </div>
          )}

          {/* === ONCOLOGY SCREENING === */}
          {view === 'oncology-screening' && (
            <div>
              <BackButton onClick={() => setView('menu')} />
              <InfoBanner>
                These are the result options shown in the Oncology capture form.
                Deactivating hides them from new captures — historical data stays intact.
              </InfoBanner>
              <TabbedView
                tabs={ONCOLOGY_SCREENING.map(t => ({ key: t.key, label: t.label }))}
                renderTab={(key) => {
                  const cfg = ONCOLOGY_SCREENING.find(t => t.key === key)!;
                  return (
                    <LookupManager
                      type={cfg.key}
                      title={cfg.label}
                      subtitle={cfg.subtitle}
                    />
                  );
                }}
              />
            </div>
          )}

          {/* === LAB RESULTS === */}
          {view === 'lab-results' && (
            <div>
              <BackButton onClick={() => setView('menu')} />
              <InfoBanner>
                These are the option lists shown in the Lab capture form.
                Deactivating hides them from new captures — historical data stays intact.
              </InfoBanner>
              <TabbedView
                tabs={LAB_RESULTS.map(t => ({ key: t.key, label: t.label }))}
                renderTab={(key) => {
                  const cfg = LAB_RESULTS.find(t => t.key === key)!;
                  return (
                    <LookupManager
                      type={cfg.key}
                      title={cfg.label}
                      subtitle={cfg.subtitle}
                    />
                  );
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Shared sub-components
// ============================================
function MenuCard({
  icon, title, description, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '20px', borderRadius: '14px',
        background: 'white', border: `1px solid ${oceanColors.mid}25`,
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        gap: '10px', transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = oceanColors.gold;
        e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(11,47,158,0.25)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${oceanColors.mid}25`;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: `linear-gradient(135deg, ${oceanColors.deep}15, ${oceanColors.mid}15)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: oceanColors.deep,
      }}>
        {icon}
      </div>
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
          {title}
        </h4>
        <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: '4px 0 0', lineHeight: 1.4 }}>
          {description}
        </p>
      </div>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'transparent', border: 'none',
        color: oceanColors.textLight, fontSize: '12px',
        cursor: 'pointer', padding: 0, marginBottom: '12px',
      }}
    >
      <ChevronLeft size={14} /> Back to configuration menu
    </button>
  );
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', gap: '10px', alignItems: 'flex-start',
      background: `${oceanColors.info}10`, border: `1px solid ${oceanColors.info}30`,
      borderRadius: '10px', padding: '12px', marginBottom: '16px',
    }}>
      <AlertCircle size={16} style={{ color: oceanColors.info, flexShrink: 0, marginTop: '2px' }} />
      <p style={{ fontSize: '12px', color: oceanColors.textDark, margin: 0, lineHeight: 1.5 }}>
        {children}
      </p>
    </div>
  );
}
