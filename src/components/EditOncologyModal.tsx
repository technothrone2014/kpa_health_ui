import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Shield, Save, X, Loader2, AlertCircle, CheckCircle,
  MapPin, Pencil, Heart, Activity, AlertTriangle, Info,
} from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const oceanColors = {
  deep: '#0B2F9E', mid: '#1A4D8C', light: '#2B7BA8', surface: '#4AA3C2',
  gold: '#FFD700', navy: '#0A1C40', success: '#10B981', warning: '#F59E0B',
  danger: '#EF4444', info: '#3B82F6', textDark: '#1F2937', textLight: '#6B7280',
  white: '#FFFFFF', foam: '#A8E6CF',
};

interface Props {
  isOpen: boolean;
  clientId: number | null;
  clientName?: string;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', minWidth: 0,
  padding: '10px 12px', borderRadius: '8px',
  border: `1px solid ${oceanColors.mid}30`,
  fontSize: '14px', outline: 'none', background: 'white',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: '600', color: oceanColors.textDark,
  display: 'block', marginBottom: '6px',
};

type Notice =
  | { kind: 'success-client'; label: string }
  | { kind: 'success-findings'; id: number; label: string }
  | { kind: 'error'; message: string };

export default function EditOncologyModal({ isOpen, clientId, clientName, onClose }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'client' | 'oncology'>('client');
  const [notice, setNotice] = useState<Notice | null>(null);

  // --- Client ---
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client-edit', clientId],
    queryFn: async () => (await api.get(`/clients/${clientId}`)).data,
    enabled: !!clientId && isOpen,
  });

  // --- Oncology records for this client ---
  const { data: oncologies, isLoading: oncologiesLoading } = useQuery<any[]>({
    queryKey: ['client-oncologies', clientId],
    queryFn: async () => {
      const res = await api.get(`/clients/${clientId}/oncologies`);
      return (res.data?.data || []) as any[];
    },
    enabled: !!clientId && isOpen,
  });

  // --- Lookups ---
  const { data: stations } = useQuery<any[]>({
    queryKey: ['stations'],
    queryFn: async () => (await api.get('/analytics/stations')).data.data || [],
    staleTime: 30 * 60 * 1000,
    enabled: isOpen,
  });

  const { data: breastExamValues } = useQuery<any[]>({
    queryKey: ['breast-exam-values'],
    queryFn: async () => (await api.get('/lookups/breast-exam-values')).data || [],
    staleTime: 30 * 60 * 1000,
    enabled: isOpen,
  });
  const { data: papSmearValues } = useQuery<any[]>({
    queryKey: ['pap-smear-values'],
    queryFn: async () => (await api.get('/lookups/pap-smear-values')).data || [],
    staleTime: 30 * 60 * 1000,
    enabled: isOpen,
  });
  const { data: viaVilliValues } = useQuery<any[]>({
    queryKey: ['via-villi-values'],
    queryFn: async () => (await api.get('/lookups/via-villi-values')).data || [],
    staleTime: 30 * 60 * 1000,
    enabled: isOpen,
  });

  // Auto-dismiss success after 5 s; errors persist until user clears them
  useEffect(() => {
    if (!notice || notice.kind === 'error') return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => { if (!isOpen) setNotice(null); }, [isOpen]);
  useEffect(() => { setNotice(null); }, [tab]);

  if (!isOpen) return null;

  const justSavedId = notice?.kind === 'success-findings' ? notice.id : null;
  const clientJustSaved = notice?.kind === 'success-client';

  // Gender helpers — used by both tabs
  const genderTitle = (client?.GenderTitle || '').toLowerCase();
  const isMale = client?.GenderId === 1 || genderTitle === 'male';
  const isFemale = client?.GenderId === 2 || genderTitle === 'female';

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
                Edit Oncology Record
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
          <TabButton active={tab === 'oncology'} onClick={() => setTab('oncology')}>
            <Shield size={14} /> Oncology Screenings ({oncologies?.length || 0})
          </TabButton>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

          {tab === 'client' && (
            <ClientDetailsTab
              client={client}
              loading={clientLoading}
              stations={stations || []}
              isMale={isMale}
              justSaved={clientJustSaved}
              onSaved={() => {
                setNotice({
                  kind: 'success-client',
                  label: `Saved at ${format(new Date(), 'HH:mm:ss')}. ` +
                    `Oncology tab updated to reflect the new demographics.`,
                });
                qc.invalidateQueries({ queryKey: ['client-edit', clientId] });
                qc.invalidateQueries({ queryKey: ['client', clientId] });
                // Refresh oncology tab (gender drives which fields are enabled)
                qc.invalidateQueries({ queryKey: ['client-oncologies', clientId] });
              }}
              onError={(message: string) => setNotice({ kind: 'error', message })}
            />
          )}

          {tab === 'oncology' && (
            <OncologyTab
              oncologies={oncologies || []}
              loading={oncologiesLoading}
              client={client}
              isMale={isMale}
              isFemale={isFemale}
              breastExamValues={breastExamValues || []}
              papSmearValues={papSmearValues || []}
              viaVilliValues={viaVilliValues || []}
              justSavedId={justSavedId}
              onSaved={(id: number) => {
                setNotice({
                  kind: 'success-findings',
                  id,
                  label: `Saved at ${format(new Date(), 'HH:mm:ss')}`,
                });
                qc.invalidateQueries({ queryKey: ['client-oncologies', clientId] });
              }}
              onError={(message: string) => setNotice({ kind: 'error', message })}
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
// Notice banner (success / error)
// ============================================
function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const isError = notice.kind === 'error';
  const tone = isError ? oceanColors.danger : oceanColors.success;
  const title = isError
    ? 'Update failed'
    : notice.kind === 'success-client'
      ? 'Client details updated successfully'
      : 'Oncology screening updated successfully';
  const subtitle = isError ? notice.message : notice.label;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={{
        background: `${tone}15`, border: `1px solid ${tone}40`,
        borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {isError
        ? <AlertCircle size={20} style={{ color: tone, flexShrink: 0, marginTop: '2px' }} />
        : <CheckCircle size={20} style={{ color: tone, flexShrink: 0, marginTop: '2px' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: tone, fontSize: '14px' }}>{title}</p>
        <p style={{
          margin: '2px 0 0',
          color: isError ? oceanColors.textDark : oceanColors.textLight,
          fontSize: '12px', lineHeight: 1.5,
        }}>{subtitle}</p>
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
// Tab button
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
// Tab 1 — Client Details (with gender emphasis)
// ============================================
function ClientDetailsTab({
  client, loading, stations, isMale, onSaved, justSaved, onError,
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

  const { data: categories } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/analytics/categories')).data.data || [],
    staleTime: 30 * 60 * 1000,
  });

  const saveMut = useMutation({
    mutationFn: async (body: any) => (await api.put(`/clients/${client.Id}`, body)).data,
    onSuccess: () => {
      toast.success('Client details updated successfully', { icon: '✅', duration: 5000 });
      onSaved?.();
    },
    onError: (e: any) => {
      const message = e.response?.data?.message || 'Failed to update client';
      toast.error(message, { duration: 6000 });
      onError?.(message);
    },
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
        padding: '8px', borderRadius: '14px',
        background: justSaved ? `${oceanColors.success}08` : 'transparent',
        boxShadow: justSaved ? `0 0 0 3px ${oceanColors.success}40` : 'none',
        transition: 'background 0.4s ease, box-shadow 0.4s ease',
      }}
    >
      {/* Gender correction hint — only when the client is currently male.
          This directly addresses the mis-captured-gender scenario. */}
      {isMale && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          padding: '10px 14px', marginBottom: '16px',
          background: `${oceanColors.info}12`,
          border: `1px solid ${oceanColors.info}40`,
          borderRadius: '10px',
        }}>
          <Info size={18} style={{ color: oceanColors.info, flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: oceanColors.info, fontSize: '13px' }}>
              Gender correction
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: oceanColors.textDark, lineHeight: 1.5 }}>
              This client is currently recorded as <strong>Male</strong>. If that is incorrect,
              change the gender below and save. PAP Smear and VIA Villi will then become editable
              on the Oncology Screenings tab.
            </p>
          </div>
        </div>
      )}

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

          {/* Gender — visually emphasised because oncology flows depend on it */}
          <div style={{ minWidth: 0 }}>
            <label style={{ ...labelStyle, color: oceanColors.deep }}>
              Gender *
            </label>
            <select
              value={form.GenderId}
              onChange={(e) => setForm({ ...form, GenderId: parseInt(e.target.value) })}
              style={{
                ...inputStyle,
                borderColor: oceanColors.gold,
                boxShadow: `0 0 0 3px ${oceanColors.gold}25`,
              }}
            >
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
// Tab 2 — Oncology Screenings list + inline edit
// ============================================
function OncologyTab({
  oncologies, loading, client, isMale, isFemale,
  breastExamValues, papSmearValues, viaVilliValues,
  justSavedId, onSaved, onError,
}: any) {
  const [editingId, setEditingId] = useState<number | null>(null);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: oceanColors.deep }} />
    </div>;
  }

  if (!oncologies || oncologies.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: oceanColors.textLight }}>
        <Shield size={40} style={{ opacity: 0.4 }} />
        <p style={{ marginTop: '12px' }}>This client has no oncology screenings yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Gender context banner — explains what is and isn't editable */}
      {isMale && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          padding: '10px 14px',
          background: `${oceanColors.warning}12`,
          border: `1px solid ${oceanColors.warning}40`,
          borderRadius: '10px',
        }}>
          <AlertTriangle size={18} style={{ color: oceanColors.warning, flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: oceanColors.warning, fontSize: '13px' }}>
              Female-only screenings are disabled
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: oceanColors.textDark, lineHeight: 1.5 }}>
              This client is recorded as <strong>Male</strong>. Only Breast Exam can be edited here.
              If the client is actually female, correct the gender on the <strong>Client Details</strong> tab first.
            </p>
          </div>
        </div>
      )}

      {oncologies.map((o: any) => (
        <OncologyRow
          key={o.Id}
          record={o}
          client={client}
          isMale={isMale}
          isFemale={isFemale}
          editing={editingId === o.Id}
          justSaved={justSavedId === o.Id}
          breastExamValues={breastExamValues}
          papSmearValues={papSmearValues}
          viaVilliValues={viaVilliValues}
          onStartEdit={() => setEditingId(o.Id)}
          onCancel={() => setEditingId(null)}
          onSaved={(id: number) => { setEditingId(null); onSaved?.(id); }}
          onError={onError}
        />
      ))}
    </div>
  );
}

// ============================================
// Single oncology row (read + edit)
// ============================================
const formFromRecord = (r: any) => ({
  BreastExamId: r.BreastExamId ?? 0,
  PAPSmearId: r.PAPSmearId ?? 0,
  ViaVilliId: r.ViaVilliId ?? 0,
});

function OncologyRow({
  record, client, isMale, isFemale, editing, justSaved,
  breastExamValues, papSmearValues, viaVilliValues,
  onStartEdit, onCancel, onSaved, onError,
}: any) {
  const [form, setForm] = useState(formFromRecord(record));

  useEffect(() => {
    if (editing) setForm(formFromRecord(record));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const saveMut = useMutation({
    mutationFn: async (body: any) =>
      (await api.put(`/oncologies/${record.Id}`, body)).data,
    onSuccess: () => {
      toast.success('Oncology screening updated successfully', { icon: '✅', duration: 5000 });
      onSaved?.(record.Id);
    },
    onError: (e: any) => {
      const message = e.response?.data?.message || 'Failed to update oncology screening';
      toast.error(message, { duration: 6000 });
      onError?.(message);
    },
  });

  const titleOf = (arr: any[], id: number) =>
    arr?.find((x: any) => x.Id === id)?.Title ?? null;

  const breastTitle = titleOf(breastExamValues, record.BreastExamId);
  const papTitle = titleOf(papSmearValues, record.PAPSmearId);
  const viaTitle = titleOf(viaVilliValues, record.ViaVilliId);

  // Any value recorded on a female-only field while client is male → warn
  const femaleOnlySelectedOnMale =
    isMale && (form.PAPSmearId > 0 || form.ViaVilliId > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate({
      BreastExamId: form.BreastExamId || null,
      PAPSmearId: form.PAPSmearId || null,
      ViaVilliId: form.ViaVilliId || null,
    });
  };

  // ---- Read-only view ----
  if (!editing) {
    return (
      <div style={{
        border: justSaved ? `2px solid ${oceanColors.success}` : '1px solid #e2e8f0',
        borderRadius: '12px', padding: '14px 16px',
        background: justSaved ? `${oceanColors.success}08` : 'white',
        boxShadow: justSaved ? `0 0 0 4px ${oceanColors.success}20` : 'none',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: oceanColors.textDark }}>
              {format(new Date(record.PostedOn), 'dd MMM yyyy • HH:mm')}
            </div>
            <div style={{ fontSize: '11px', color: oceanColors.textLight, marginTop: '2px' }}>
              <MapPin size={10} style={{ verticalAlign: 'middle' }} />{' '}
              {record.StationTitle || `Station ${record.StationId}`}
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px', marginTop: '12px', fontSize: '12px',
        }}>
          <div>
            <Heart size={12} style={{ verticalAlign: 'middle', color: oceanColors.deep }} />{' '}
            <strong> Breast Exam:</strong>{' '}
            {breastTitle ?? <span style={{ color: oceanColors.textLight }}>Not performed</span>}
          </div>
          <div style={{ opacity: isFemale ? 1 : 0.55 }}>
            <Activity size={12} style={{ verticalAlign: 'middle', color: oceanColors.deep }} />{' '}
            <strong> PAP Smear:</strong>{' '}
            {papTitle ?? <span style={{ color: oceanColors.textLight }}>Not performed</span>}
          </div>
          <div style={{ opacity: isFemale ? 1 : 0.55 }}>
            <Activity size={12} style={{ verticalAlign: 'middle', color: oceanColors.deep }} />{' '}
            <strong> VIA Villi:</strong>{' '}
            {viaTitle ?? <span style={{ color: oceanColors.textLight }}>Not performed</span>}
          </div>
        </div>
      </div>
    );
  }

  // ---- Edit view ----
  return (
    <form onSubmit={handleSubmit} style={{
      border: `2px solid ${oceanColors.gold}`, borderRadius: '12px',
      padding: '16px', background: '#fffef7',
    }}>
      <div style={{ marginBottom: '12px', fontWeight: 'bold', color: oceanColors.deep }}>
        Editing screening from {format(new Date(record.PostedOn), 'dd MMM yyyy • HH:mm')}
      </div>

      {femaleOnlySelectedOnMale && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          padding: '10px 12px', marginBottom: '12px',
          background: `${oceanColors.danger}12`,
          border: `1px solid ${oceanColors.danger}40`,
          borderRadius: '10px',
        }}>
          <AlertTriangle size={16} style={{ color: oceanColors.danger, flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '12px', color: oceanColors.textDark, lineHeight: 1.5 }}>
            You have selected a female-only screening for a client recorded as <strong>Male</strong>.
            Verify the client's gender on the <strong>Client Details</strong> tab first.
            Saving now will still record these values.
          </p>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
      }}>
        {/* Breast Exam — always available */}
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>
            <Heart size={12} style={{ verticalAlign: 'middle' }} /> Breast Exam
          </label>
          <select
            value={form.BreastExamId}
            onChange={(e) => setForm({ ...form, BreastExamId: parseInt(e.target.value) })}
            style={inputStyle}
          >
            <option value={0}>Not performed</option>
            {breastExamValues.map((v: any) => (
              <option key={v.Id} value={v.Id}>{v.Title}</option>
            ))}
          </select>
        </div>

        {/* PAP Smear — female only, but editable here on purpose */}
        <div style={{ minWidth: 0, opacity: isFemale ? 1 : 0.75 }}>
          <label style={labelStyle}>
            <Activity size={12} style={{ verticalAlign: 'middle' }} /> PAP Smear
            {!isFemale && (
              <span style={{ color: oceanColors.warning, fontWeight: 'normal', marginLeft: '6px' }}>
                (female-only)
              </span>
            )}
          </label>
          <select
            value={form.PAPSmearId}
            onChange={(e) => setForm({ ...form, PAPSmearId: parseInt(e.target.value) })}
            style={inputStyle}
          >
            <option value={0}>Not performed</option>
            {papSmearValues.map((v: any) => (
              <option key={v.Id} value={v.Id}>{v.Title}</option>
            ))}
          </select>
        </div>

        {/* VIA Villi — female only, but editable here on purpose */}
        <div style={{ minWidth: 0, opacity: isFemale ? 1 : 0.75 }}>
          <label style={labelStyle}>
            <Activity size={12} style={{ verticalAlign: 'middle' }} /> VIA Villi
            {!isFemale && (
              <span style={{ color: oceanColors.warning, fontWeight: 'normal', marginLeft: '6px' }}>
                (female-only)
              </span>
            )}
          </label>
          <select
            value={form.ViaVilliId}
            onChange={(e) => setForm({ ...form, ViaVilliId: parseInt(e.target.value) })}
            style={inputStyle}
          >
            <option value={0}>Not performed</option>
            {viaVilliValues.map((v: any) => (
              <option key={v.Id} value={v.Id}>{v.Title}</option>
            ))}
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
