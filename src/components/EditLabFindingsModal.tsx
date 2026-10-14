import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FlaskConical, Save, X, Loader2, Pencil, MapPin, CheckCircle,
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
  fontSize: '12px',
  fontWeight: '600',
  color: oceanColors.textDark,
  display: 'block',
  marginBottom: '6px',
};

export default function EditLabFindingsModal({ isOpen, clientId, clientName, onClose }: Props) {
  const qc = useQueryClient();

  const { data: client } = useQuery({
    queryKey: ['client-edit', clientId],
    queryFn: async () => (await api.get(`/clients/${clientId}`)).data,
    enabled: !!clientId && isOpen,
  });

  const { data: findings, isLoading } = useQuery({
    queryKey: ['client-findings', clientId],
    queryFn: async () => {
      const res = await api.get(`/clients/${clientId}/findings`);
      return (res.data?.data || []) as any[];
    },
    enabled: !!clientId && isOpen,
  });

  // Lookups for the dropdown fields
  const { data: lipidValues } = useQuery<any[]>({
    queryKey: ['lipid-values'],
    queryFn: async () => (await api.get('/lookups/lipid-values')).data || [],
    staleTime: 30 * 60 * 1000,
    enabled: isOpen,
  });
  const { data: hbvValues } = useQuery<any[]>({
    queryKey: ['hepatitis-b-values'],
    queryFn: async () => (await api.get('/lookups/hepatitis-b-values')).data || [],
    staleTime: 30 * 60 * 1000,
    enabled: isOpen,
  });
  const { data: hcvValues } = useQuery<any[]>({
    queryKey: ['hepatitis-c-values'],
    queryFn: async () => (await api.get('/lookups/hepatitis-c-values')).data || [],
    staleTime: 30 * 60 * 1000,
    enabled: isOpen,
  });

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
            <FlaskConical size={22} style={{ color: oceanColors.gold }} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                Edit Lab Findings
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <FindingsList
            findings={findings || []}
            loading={isLoading}
            lipidValues={lipidValues || []}
            hbvValues={hbvValues || []}
            hcvValues={hcvValues || []}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ['client-findings', clientId] });
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// List of findings
// ============================================
function FindingsList({ findings, loading, lipidValues, hbvValues, hcvValues, onSaved }: any) {
  const [editingId, setEditingId] = useState<number | null>(null);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: oceanColors.deep }} />
    </div>;
  }

  if (!findings || findings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: oceanColors.textLight }}>
        <FlaskConical size={40} style={{ opacity: 0.4 }} />
        <p style={{ marginTop: '12px' }}>This client has no lab findings yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {findings.map((f: any) => (
        <FindingRow
          key={f.Id}
          finding={f}
          editing={editingId === f.Id}
          lipidValues={lipidValues}
          hbvValues={hbvValues}
          hcvValues={hcvValues}
          onStartEdit={() => setEditingId(f.Id)}
          onCancel={() => setEditingId(null)}
          onSaved={() => { setEditingId(null); onSaved?.(); }}
        />
      ))}
    </div>
  );
}

// ============================================
// Single finding row — collapsed / expanded
// ============================================
function FindingRow({ finding, editing, lipidValues, hbvValues, hcvValues, onStartEdit, onCancel, onSaved }: any) {
  const [form, setForm] = useState({
    FBSValue:          finding.FBSValue          ?? '',
    HBA1CValue:        finding.HBA1CValue        ?? '',
    LipidId:           finding.LipidId           ?? 0,
    MicroalbuminValue: finding.MicroalbuminValue ?? '',
    BMDValue:          finding.BMDValue          ?? '',
    PSAValue:          finding.PSAValue          ?? '',
    HepatitisBValueId: finding.HepatitisBValueId ?? 0,
    HepatitisCValueId: finding.HepatitisCValueId ?? 0,
  });

  const saveMut = useMutation({
    mutationFn: async (body: any) =>
      (await api.put(`/findings/${finding.Id}`, body)).data,
    onSuccess: () => {
      toast.success('Lab findings updated', { icon: '✅' });
      onSaved?.();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || 'Failed to update lab findings'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate({
      FBSValue:          parseFloat(form.FBSValue)          || 0,
      HBA1CValue:        parseFloat(form.HBA1CValue)        || 0,
      LipidId:           parseInt(form.LipidId as any)      || 0,
      MicroalbuminValue: parseFloat(form.MicroalbuminValue) || 0,
      BMDValue:          parseFloat(form.BMDValue)          || 0,
      PSAValue:          parseFloat(form.PSAValue)          || 0,
      HepatitisBValueId: parseInt(form.HepatitisBValueId as any) || 0,
      HepatitisCValueId: parseInt(form.HepatitisCValueId as any) || 0,
    });
  };

  // ---- Collapsed ----
  if (!editing) {
    return (
      <div style={{
        border: '1px solid #e2e8f0', borderRadius: '12px',
        padding: '14px 16px', background: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: oceanColors.textDark }}>
              {format(new Date(finding.PostedOn), 'dd MMM yyyy • HH:mm')}
            </div>
            <div style={{ fontSize: '11px', color: oceanColors.textLight, marginTop: '2px' }}>
              <MapPin size={10} style={{ verticalAlign: 'middle' }} />{' '}
              {finding.StationTitle || `Station ${finding.StationId}`}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px', fontSize: '12px' }}>
          <div><strong>FBS:</strong> {finding.FBSValue ?? '—'} <span style={{ color: oceanColors.textLight }}>({finding.FBSInterpretation || 'N/A'})</span></div>
          <div><strong>HbA1c:</strong> {finding.HBA1CValue ?? '—'} <span style={{ color: oceanColors.textLight }}>({finding.HBA1CInterpretation || 'N/A'})</span></div>
          <div><strong>Lipid:</strong> {finding.LipidTitle || '—'}</div>
          <div><strong>Microalbumin:</strong> {finding.MicroalbuminValue ?? '—'} <span style={{ color: oceanColors.textLight }}>({finding.MicroalbuminInterpretation || 'N/A'})</span></div>
          <div><strong>BMD:</strong> {finding.BMDValue ?? '—'} <span style={{ color: oceanColors.textLight }}>({finding.BMDInterpretation || 'N/A'})</span></div>
          <div><strong>PSA:</strong> {finding.PSAValue ?? '—'} <span style={{ color: oceanColors.textLight }}>({finding.PSAInterpretation || 'N/A'})</span></div>
          <div><strong>Hep B:</strong> {finding.HepatitisBTitle || '—'}</div>
          <div><strong>Hep C:</strong> {finding.HepatitisCTitle || '—'}</div>
        </div>
      </div>
    );
  }

  // ---- Expanded edit ----
  return (
    <form onSubmit={handleSubmit} style={{
      border: `2px solid ${oceanColors.gold}`, borderRadius: '12px',
      padding: '16px', background: '#fffef7',
    }}>
      <div style={{ marginBottom: '12px', fontWeight: 'bold', color: oceanColors.deep }}>
        Editing lab findings from {format(new Date(finding.PostedOn), 'dd MMM yyyy • HH:mm')}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
      }}>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>FBS (mmol/L)</label>
          <input
            type="number"
            step="0.1"
            value={form.FBSValue}
            onChange={(e) => setForm({ ...form, FBSValue: e.target.value })}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              fontSize: '14px',
              outline: 'none',
              background: 'white',
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>HbA1c (%)</label>
          <input
            type="number"
            step="0.1"
            value={form.HBA1CValue}
            onChange={(e) => setForm({ ...form, HBA1CValue: e.target.value })}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              fontSize: '14px',
              outline: 'none',
              background: 'white',
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Lipid Profile</label>
          <select
            value={form.LipidId}
            onChange={(e) => setForm({ ...form, LipidId: parseInt(e.target.value) })}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              fontSize: '14px',
              outline: 'none',
              background: 'white',
            }}
          >
            <option value={0}>Not tested</option>
            {lipidValues.map((r: any) => (
              <option key={r.Id} value={r.Id}>{r.Title}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Microalbumin (mg/L)</label>
          <input
            type="number"
            step="0.1"
            value={form.MicroalbuminValue}
            onChange={(e) => setForm({ ...form, MicroalbuminValue: e.target.value })}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              fontSize: '14px',
              outline: 'none',
              background: 'white',
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>BMD T-Score</label>
          <input
            type="number"
            step="0.01"
            value={form.BMDValue}
            onChange={(e) => setForm({ ...form, BMDValue: e.target.value })}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              fontSize: '14px',
              outline: 'none',
              background: 'white',
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>PSA (ng/mL)</label>
          <input
            type="number"
            step="0.01"
            value={form.PSAValue}
            onChange={(e) => setForm({ ...form, PSAValue: e.target.value })}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              fontSize: '14px',
              outline: 'none',
              background: 'white',
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Hepatitis B</label>
          <select
            value={form.HepatitisBValueId}
            onChange={(e) => setForm({ ...form, HepatitisBValueId: parseInt(e.target.value) })}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              fontSize: '14px',
              outline: 'none',
              background: 'white',
            }}
          >
            <option value={0}>Not tested</option>
            {hbvValues.map((r: any) => (
              <option key={r.Id} value={r.Id}>{r.Title}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Hepatitis C</label>
          <select
            value={form.HepatitisCValueId}
            onChange={(e) => setForm({ ...form, HepatitisCValueId: parseInt(e.target.value) })}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              fontSize: '14px',
              outline: 'none',
              background: 'white',
            }}
          >
            <option value={0}>Not tested</option>
            {hcvValues.map((r: any) => (
              <option key={r.Id} value={r.Id}>{r.Title}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            background: 'white',
            border: `1px solid ${oceanColors.mid}30`,
            borderRadius: '8px',
            cursor: 'pointer',
            color: oceanColors.textDark,
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saveMut.isPending}
          style={{
            flex: 2,
            padding: '10px',
            background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
            border: 'none',
            borderRadius: '8px',
            color: oceanColors.navy,
            fontWeight: 'bold',
            cursor: saveMut.isPending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: saveMut.isPending ? 0.7 : 1,
          }}
        >
          {saveMut.isPending
            ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
            : <><CheckCircle size={16} /> Save Correction</>}
        </button>
      </div>
    </form>
  );
}
