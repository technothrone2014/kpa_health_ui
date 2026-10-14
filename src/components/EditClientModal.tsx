import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Activity, Save, X, Loader2, AlertCircle, CheckCircle,
  Calendar, MapPin, Pencil,
} from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const oceanColors = {
  deep: '#0B2F9E', mid: '#1A4D8C', light: '#2B7BA8', surface: '#4AA3C2',
  gold: '#FFD700', navy: '#0A1C40', success: '#10B981', warning: '#F59E0B',
  danger: '#EF4444', info: '#3B82F6', textDark: '#1F2937', textLight: '#6B7280',
  white: '#FFFFFF', foam: '#A8E6CF'
};

interface Props {
  isOpen: boolean;
  clientId: number | null;
  clientName?: string;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minWidth: 0,
  padding: '10px 12px',
  borderRadius: '8px',
  border: `1px solid ${oceanColors.mid}30`,
  fontSize: '14px',
  outline: 'none',
  background: 'white',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: '600', color: oceanColors.textDark,
  display: 'block', marginBottom: '6px',
};

// Unified notice — guarantees only one banner at a time
type Notice =
  | { kind: 'success-client'; label: string }
  | { kind: 'success-findings'; id: number; label: string }
  | { kind: 'error'; message: string };

export default function EditClientModal({ isOpen, clientId, clientName, onClose }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'client' | 'findings'>('client');
  const [notice, setNotice] = useState<Notice | null>(null);

  // --- Fetch client ---
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client-edit', clientId],
    queryFn: async () => {
      const res = await api.get(`/clients/${clientId}`);
      return res.data;
    },
    enabled: !!clientId && isOpen,
  });

  // --- Fetch tallies ---
  const { data: tallies, isLoading: talliesLoading } = useQuery({
    queryKey: ['client-tallies', clientId],
    queryFn: async () => {
      const res = await api.get(`/clients/${clientId}/tallies`);
      return (res.data?.data || []) as any[];
    },
    enabled: !!clientId && isOpen,
  });

  // --- Lookups for editing findings ---
  const { data: stations } = useQuery<any[]>({
    queryKey: ['stations'],
    queryFn: async () => (await api.get('/analytics/stations')).data.data || [],
    staleTime: 30 * 60 * 1000,
    enabled: isOpen,
  });

  const { data: bpRemarks } = useQuery<any[]>({
    queryKey: ['bp-remark-values'],
    queryFn: async () => (await api.get('/lookups/bp-remark-values')).data || [],
    staleTime: 30 * 60 * 1000,
    enabled: isOpen,
  });

  const { data: rbsRemarks } = useQuery<any[]>({
    queryKey: ['rbs-remark-values'],
    queryFn: async () => (await api.get('/lookups/rbs-remark-values')).data || [],
    staleTime: 30 * 60 * 1000,
    enabled: isOpen,
  });

  // Auto-dismiss SUCCESS notices after 5 s.
  // Errors stay until the user dismisses them or tries a new save —
  // the user needs time to read and act on them.
  useEffect(() => {
    if (!notice) return;
    if (notice.kind === 'error') return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Clear the notice when the modal closes or the tab changes
  useEffect(() => {
    if (!isOpen) setNotice(null);
  }, [isOpen]);

  useEffect(() => {
    setNotice(null);
  }, [tab]);

  if (!isOpen) return null;

  const justSavedId = notice?.kind === 'success-findings' ? notice.id : null;
  const clientJustSaved = notice?.kind === 'success-client';

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
        maxWidth: '960px', maxHeight: '92vh', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
          padding: '18px 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderBottom: `2px solid ${oceanColors.gold}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Pencil size={22} style={{ color: oceanColors.gold }} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                Edit Client Record
              </h2>
              <p style={{ fontSize: '12px', color: oceanColors.foam, marginTop: '2px' }}>
                {clientName || client?.FullName}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: '8px', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'white',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px', padding: '12px 24px 0',
          borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
        }}>
          <TabButton active={tab === 'client'} onClick={() => setTab('client')}>
            <User size={14} /> Client Details
          </TabButton>
          <TabButton active={tab === 'findings'} onClick={() => setTab('findings')}>
            <Activity size={14} /> Field Findings ({tallies?.length || 0})
          </TabButton>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* 🔔 Notice banner — success OR error */}
          {notice && (
            <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />
          )}

          {tab === 'client' && (
            <ClientDetailsTab
              client={client}
              loading={clientLoading}
              stations={stations || []}
              justSaved={clientJustSaved}
              onSaved={() => {
                setNotice({
                  kind: 'success-client',
                  label: `Saved at ${format(new Date(), 'HH:mm:ss')}`,
                });
                qc.invalidateQueries({ queryKey: ['client-edit', clientId] });
                qc.invalidateQueries({ queryKey: ['client', clientId] });
              }}
              onError={(message: string) => {
                setNotice({ kind: 'error', message });
              }}
            />
          )}
          {tab === 'findings' && (
            <FindingsTab
              tallies={tallies || []}
              loading={talliesLoading}
              bpRemarks={bpRemarks || []}
              rbsRemarks={rbsRemarks || []}
              justSavedId={justSavedId}
              onSaved={(id: number) => {
                setNotice({
                  kind: 'success-findings',
                  id,
                  label: `Saved at ${format(new Date(), 'HH:mm:ss')}`,
                });
                qc.invalidateQueries({ queryKey: ['client-tallies', clientId] });
              }}
              onError={(message: string) => {
                setNotice({ kind: 'error', message });
              }}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// Notice banner — renders success or error
// ============================================
function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const isError = notice.kind === 'error';
  const tone = isError ? oceanColors.danger : oceanColors.success;
  const title = isError
    ? 'Update failed'
    : notice.kind === 'success-client'
      ? 'Client details updated successfully'
      : 'Field findings updated successfully';
  const subtitle = isError
    ? notice.message
    : notice.label;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={{
        background: `${tone}15`,
        border: `1px solid ${tone}40`,
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {isError
        ? <AlertCircle size={20} style={{ color: tone, flexShrink: 0, marginTop: '2px' }} />
        : <CheckCircle  size={20} style={{ color: tone, flexShrink: 0, marginTop: '2px' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontWeight: 'bold',
          color: tone, fontSize: '14px',
        }}>
          {title}
        </p>
        <p style={{
          margin: '2px 0 0',
          color: isError ? oceanColors.textDark : oceanColors.textLight,
          fontSize: '12px', lineHeight: 1.5,
        }}>
          {subtitle}
        </p>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent', border: 'none',
          color: oceanColors.textLight, cursor: 'pointer',
          padding: '4px', display: 'flex',
        }}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ============================================
// Sub-component: tab button
// ============================================
function TabButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px', border: 'none', cursor: 'pointer',
        background: 'transparent', borderRadius: '10px 10px 0 0',
        fontSize: '13px', fontWeight: active ? 'bold' : 'normal',
        color: active ? oceanColors.deep : oceanColors.textLight,
        borderBottom: active ? `2px solid ${oceanColors.gold}` : '2px solid transparent',
        display: 'flex', alignItems: 'center', gap: '6px',
        marginBottom: '-1px',
      }}
    >
      {children}
    </button>
  );
}

// ============================================
// Tab 1 — Client Details
// ============================================
function ClientDetailsTab({
  client, loading, stations, onSaved, justSaved, onError,
}: any) {
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (client) {
      setForm({
        IDNumber: client.IDNumber || '',
        FirstName: client.FirstName || '',
        LastName: client.LastName || '',
        PhoneNumber: client.PhoneNumber || '',
        GenderId: client.GenderId || 1,
        CategoryId: client.CategoryId || 1,
        StationId: client.StationId || 1,
        DateOfBirth: client.DateOfBirth
          ? format(new Date(client.DateOfBirth), 'yyyy-MM-dd')
          : '',
      });
    }
  }, [client]);

  const saveMut = useMutation({
    mutationFn: async (body: any) => (await api.put(`/clients/${client.Id}`, body)).data,
    onSuccess: () => {
      toast.success('Client details updated successfully', {
        icon: '✅',
        duration: 5000,
      });
      onSaved?.();
    },
    onError: (e: any) => {
      const message = e.response?.data?.message || 'Failed to update client';
      toast.error(message, { duration: 6000 });
      onError?.(message);
    },
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/analytics/categories')).data.data || [],
    staleTime: 30 * 60 * 1000,
  });

  if (loading || !form) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: oceanColors.deep }} />
    </div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.IDNumber || !form.FirstName || !form.LastName || !form.DateOfBirth || !form.PhoneNumber) {
      toast.error('Please fill all required fields');
      return;
    }
    saveMut.mutate(form);
  };

  return (
    <div
      style={{
        padding: '8px',
        borderRadius: '14px',
        background: justSaved ? `${oceanColors.success}08` : 'transparent',
        boxShadow: justSaved ? `0 0 0 3px ${oceanColors.success}40` : 'none',
        transition: 'background 0.4s ease, box-shadow 0.4s ease',
      }}
    >
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>ID Number *</label>
            <input type="text" value={form.IDNumber}
              onChange={(e) => setForm({ ...form, IDNumber: e.target.value })}
              style={inputStyle} required />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Phone Number *</label>
            <input type="tel" value={form.PhoneNumber}
              onChange={(e) => setForm({ ...form, PhoneNumber: e.target.value })}
              style={inputStyle} required />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>First Name *</label>
            <input type="text" value={form.FirstName}
              onChange={(e) => setForm({ ...form, FirstName: e.target.value })}
              style={inputStyle} required />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Last Name *</label>
            <input type="text" value={form.LastName}
              onChange={(e) => setForm({ ...form, LastName: e.target.value })}
              style={inputStyle} required />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Date of Birth *</label>
            <input type="date" value={form.DateOfBirth}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setForm({ ...form, DateOfBirth: e.target.value })}
              style={inputStyle} required />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Gender</label>
            <select value={form.GenderId}
              onChange={(e) => setForm({ ...form, GenderId: parseInt(e.target.value) })}
              style={inputStyle}>
              <option value={1}>Male</option>
              <option value={2}>Female</option>
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Category</label>
            <select value={form.CategoryId}
              onChange={(e) => setForm({ ...form, CategoryId: parseInt(e.target.value) })}
              style={inputStyle}>
              {categories?.length
                ? categories.map((c: any) => <option key={c.Id} value={c.Id}>{c.Title}</option>)
                : <option value={form.CategoryId}>Category {form.CategoryId}</option>}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Station</label>
            <select value={form.StationId}
              onChange={(e) => setForm({ ...form, StationId: parseInt(e.target.value) })}
              style={inputStyle}>
              {stations.map((s: any) => (
                <option key={s.Id} value={s.Id}>{s.Title}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
          <button type="submit" disabled={saveMut.isPending} style={{
            padding: '12px 24px',
            background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
            border: 'none', borderRadius: '10px',
            color: oceanColors.navy, fontWeight: 'bold',
            cursor: saveMut.isPending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            opacity: saveMut.isPending ? 0.7 : 1,
          }}>
            {saveMut.isPending
              ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
              : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// Tab 2 — Field Findings list + edit
// ============================================
function FindingsTab({
  tallies, loading, bpRemarks, rbsRemarks, onSaved, onError, justSavedId,
}: any) {
  const [editingId, setEditingId] = useState<number | null>(null);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: oceanColors.deep }} />
    </div>;
  }

  if (!tallies || tallies.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: oceanColors.textLight }}>
        <Activity size={40} style={{ opacity: 0.4 }} />
        <p style={{ marginTop: '12px' }}>This client has no field findings yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {tallies.map((t: any) => (
        <TallyRow
          key={t.Id}
          tally={t}
          editing={editingId === t.Id}
          justSaved={justSavedId === t.Id}
          bpRemarks={bpRemarks}
          rbsRemarks={rbsRemarks}
          onStartEdit={() => setEditingId(t.Id)}
          onCancel={() => setEditingId(null)}
          onSaved={(id: number) => { setEditingId(null); onSaved?.(id); }}
          onError={onError}
        />
      ))}
    </div>
  );
}

const formFromTally = (t: any) => ({
  Weight: t.Weight ?? '',
  Height: t.Height ?? '',
  Waist: t.Waist ?? '',
  Hip: t.Hip ?? '',
  Systolic: t.Systolic ?? '',
  Diastolic: t.Diastolic ?? '',
  BPRemarkId: t.BPRemarkId ?? '',
  RBSValue: t.RBSValue ?? '',
  RBSRemarkId: t.RBSRemarkId ?? '',
  ReferralIds: [] as number[],
});

function TallyRow({
  tally, editing, justSaved,
  bpRemarks, rbsRemarks,
  onStartEdit, onCancel, onSaved, onError,
}: any) {
  const [form, setForm] = useState(formFromTally(tally));

  useEffect(() => {
    if (editing) {
      setForm(formFromTally(tally));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const saveMut = useMutation({
    mutationFn: async (body: any) =>
      (await api.put(`/tallies/${tally.Id}`, body)).data,
    onSuccess: () => {
      toast.success('Field findings updated successfully', {
        icon: '✅',
        duration: 5000,
      });
      onSaved?.(tally.Id);
    },
    onError: (e: any) => {
      const message = e.response?.data?.message || 'Failed to update findings';
      toast.error(message, { duration: 6000 });
      onError?.(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate({
      Weight: parseFloat(form.Weight) || 0,
      Height: parseFloat(form.Height) || 0,
      Waist: parseFloat(form.Waist) || 0,
      Hip: parseFloat(form.Hip) || 0,
      Systolic: parseInt(form.Systolic as any) || 0,
      Diastolic: parseInt(form.Diastolic as any) || 0,
      BPRemarkId: form.BPRemarkId || null,
      RBSValue: parseFloat(form.RBSValue) || 0,
      RBSRemarkId: form.RBSRemarkId || null,
    });
  };

  if (!editing) {
    return (
      <div style={{
        border: justSaved
          ? `2px solid ${oceanColors.success}`
          : '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px 16px',
        background: justSaved ? `${oceanColors.success}08` : 'white',
        boxShadow: justSaved ? `0 0 0 4px ${oceanColors.success}20` : 'none',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: oceanColors.textDark }}>
              {format(new Date(tally.PostedOn), 'dd MMM yyyy • HH:mm')}
            </div>
            <div style={{ fontSize: '11px', color: oceanColors.textLight, marginTop: '2px' }}>
              <MapPin size={10} style={{ verticalAlign: 'middle' }} /> {tally.StationTitle || `Station ${tally.StationId}`}
              {' • '}Age {tally.Age}
            </div>
          </div>
          <button onClick={onStartEdit} style={{
            padding: '6px 12px', background: `${oceanColors.info}10`,
            border: `1px solid ${oceanColors.info}40`, borderRadius: '8px',
            color: oceanColors.info, cursor: 'pointer', fontSize: '12px',
            fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <Pencil size={12} /> Edit
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px', marginTop: '12px', fontSize: '12px',
        }}>
          <div><strong>BMI:</strong> {tally.BMIValue?.toFixed?.(1) ?? '—'} <span style={{ color: oceanColors.textLight }}>({tally.BMIInterpretation || 'N/A'})</span></div>
          <div><strong>BP:</strong> {tally.Systolic}/{tally.Diastolic} <span style={{ color: oceanColors.textLight }}>({tally.BPInterpretation || 'N/A'})</span></div>
          <div><strong>RBS:</strong> {tally.RBSValue} <span style={{ color: oceanColors.textLight }}>({tally.RBSInterpretation || 'N/A'})</span></div>
          <div><strong>WHR:</strong> {tally.WHRatio?.toFixed?.(2) ?? '—'}</div>
          <div><strong>Waist:</strong> {tally.Waist} cm</div>
          <div><strong>Hip:</strong> {tally.Hip} cm</div>
        </div>

        {tally.Referrals?.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {tally.Referrals.map((r: string, i: number) => (
              <span key={i} style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                background: `${oceanColors.info}15`, color: oceanColors.info,
              }}>{r}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      border: `2px solid ${oceanColors.gold}`, borderRadius: '12px',
      padding: '16px', background: '#fffef7',
    }}>
      <div style={{ marginBottom: '12px', fontWeight: 'bold', color: oceanColors.deep }}>
        Editing findings from {format(new Date(tally.PostedOn), 'dd MMM yyyy • HH:mm')}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
      }}>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Weight (kg)</label>
          <input type="number" step="0.1" value={form.Weight}
            onChange={(e) => setForm({ ...form, Weight: e.target.value })}
            style={inputStyle} />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Height (cm)</label>
          <input type="number" step="0.1" value={form.Height}
            onChange={(e) => setForm({ ...form, Height: e.target.value })}
            style={inputStyle} />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Waist (cm)</label>
          <input type="number" step="0.1" value={form.Waist}
            onChange={(e) => setForm({ ...form, Waist: e.target.value })}
            style={inputStyle} />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Hip (cm)</label>
          <input type="number" step="0.1" value={form.Hip}
            onChange={(e) => setForm({ ...form, Hip: e.target.value })}
            style={inputStyle} />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Systolic (mmHg)</label>
          <input type="number" value={form.Systolic}
            onChange={(e) => setForm({ ...form, Systolic: e.target.value })}
            style={inputStyle} />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Diastolic (mmHg)</label>
          <input type="number" value={form.Diastolic}
            onChange={(e) => setForm({ ...form, Diastolic: e.target.value })}
            style={inputStyle} />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>BP Remark</label>
          <select value={form.BPRemarkId}
            onChange={(e) => setForm({ ...form, BPRemarkId: e.target.value ? Number(e.target.value) : '' })}
            style={inputStyle}>
            <option value="">Select…</option>
            {bpRemarks.map((r: any) => <option key={r.Id} value={r.Id}>{r.Title}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>RBS Value (mmol/L)</label>
          <input type="number" step="0.1" value={form.RBSValue}
            onChange={(e) => setForm({ ...form, RBSValue: e.target.value })}
            style={inputStyle} />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>RBS Remark</label>
          <select value={form.RBSRemarkId}
            onChange={(e) => setForm({ ...form, RBSRemarkId: e.target.value ? Number(e.target.value) : '' })}
            style={inputStyle}>
            <option value="">Select…</option>
            {rbsRemarks.map((r: any) => <option key={r.Id} value={r.Id}>{r.Title}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button type="button" onClick={onCancel} style={{
          flex: 1, padding: '10px', background: 'white',
          border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px',
          cursor: 'pointer', color: oceanColors.textDark,
        }}>Cancel</button>
        <button type="submit" disabled={saveMut.isPending} style={{
          flex: 2, padding: '10px',
          background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
          border: 'none', borderRadius: '8px',
          color: oceanColors.navy, fontWeight: 'bold',
          cursor: saveMut.isPending ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          opacity: saveMut.isPending ? 0.7 : 1,
        }}>
          {saveMut.isPending
            ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
            : <><CheckCircle size={16} /> Save Correction</>}
        </button>
      </div>
    </form>
  );
}
