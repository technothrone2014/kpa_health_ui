import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FlaskConical, Microscope, Beaker, Save, Loader2, AlertTriangle, CheckCircle, AlertCircle, Minus, Activity } from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';

const oceanColors = {
  deep: '#0B2F9E',
  mid: '#1A4D8C',
  gold: '#FFD700',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  textDark: '#1F2937',
  textLight: '#6B7280',
};

// ============================================
// INTERPRETATION — matches FieldFindings pattern
// ============================================
interface InterpretationResult {
  id: number;
  label: string;
  status: 'normal' | 'warning' | 'danger' | 'info';
  color: string;
  icon: React.ReactNode;
}

const STATUS_ICONS: Record<InterpretationResult['status'], React.ReactNode> = {
  normal: <CheckCircle size={14} />,
  warning: <AlertTriangle size={14} />,
  danger: <AlertCircle size={14} />,
  info: <Minus size={14} />,
};

const STATUS_COLORS: Record<InterpretationResult['status'], string> = {
  normal: oceanColors.success,
  warning: oceanColors.warning,
  danger: oceanColors.danger,
  info: oceanColors.info,
};

function classifyTitle(title: string): InterpretationResult['status'] {
  const t = (title || '').toUpperCase();
  if (t.includes('N/A')) return 'info';
  if (t.includes('NORMAL') || t.includes('HEALTHY')) return 'normal';
  if (
    t.includes('PRE') || t.includes('ELEVATED') || t.includes('OVERWEIGHT') ||
    t.includes('STAGE I') || t.includes('BORDERLINE') ||
    t.includes('IMPAIRED') || t.includes('OSTEOPENIA')
  ) return 'warning';
  if (
    t.includes('HYPERTENSION') || t.includes('HYPOTENSION') ||
    t.includes('HYPOGLYCEMIA') || t.includes('DIABETES') ||
    t.includes('DIABETIC') || t.includes('OBESE') || t.includes('CRISIS') ||
    t.includes('MICROALBUMINURIA') || t.includes('MACROALBUMINURIA') ||
    t.includes('OSTEOPOROSIS')
  ) return 'danger';
  return 'info';
}

function mapHitToResult(hit: any | null): InterpretationResult | null {
  if (!hit) return null;
  const status = classifyTitle(hit.Title);
  return {
    id: hit.Id,
    label: hit.Title,
    status,
    color: STATUS_COLORS[status],
    icon: STATUS_ICONS[status],
  };
}

/** Client-side interpretation using cached ranges (mirrors FieldFindings). */
function interpretLocally(
  ranges: any[] | undefined,
  value: number,
  allowNegative = false
): InterpretationResult | null {
  if (!ranges || ranges.length === 0) return null;
  if (Number.isNaN(value)) return null;
  if (!allowNegative && value <= 0) return null;

  const hit = ranges.find((r: any) =>
    Number(r.StartIndex) <= value && Number(r.StopIndex) > value
  );
  return mapHitToResult(hit);
}

// Small badge component
const StatusBadge = React.memo(({ result }: { result: InterpretationResult | null }) => {
  if (!result || result.status === 'info') {
    return (
      <span style={{
        fontSize: '11px', color: oceanColors.textLight,
        background: '#f3f4f6', padding: '2px 10px', borderRadius: '12px',
        display: 'inline-flex', alignItems: 'center', gap: '4px',
      }}>
        {result?.icon || <Minus size={14} />} {result?.label || 'N/A'}
      </span>
    );
  }

  return (
    <span style={{
      fontSize: '11px', fontWeight: 'bold',
      color: STATUS_COLORS[result.status],
      background: `${STATUS_COLORS[result.status]}15`,
      padding: '2px 10px', borderRadius: '12px',
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      border: `1px solid ${STATUS_COLORS[result.status]}30`,
    }}>
      {result.icon} {result.label}
    </span>
  );
});

interface LabFindingsProps {
  clientId: number;
  clientName: string;
  clientIdNumber: string;
  stationId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LabFindings({ clientId, clientName, clientIdNumber, stationId, onSuccess, onCancel }: LabFindingsProps) {
  const [formData, setFormData] = useState({
    // FBS (Fasting Blood Sugar)
    FBSValue: '',
    // HbA1c
    HBA1CValue: '',
    // Lipid Profile
    LipidId: 0,
    // Microalbumin
    MicroalbuminValue: '',
    // BMD (Bone Mineral Density)
    BMDValue: '',
    // PSA (Prostate Specific Antigen)
    PSAValue: '',
    // Hepatitis B
    HepatitisBValueId: 0,
    // Hepatitis C
    HepatitisCValueId: 0,
  });

  // Verify the client exists (lab findings can be captured with or without field findings)
  const { data: clientCheck, isLoading: checkingClient } = useQuery({
    queryKey: ['client-existence', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}`);
      return response.data;
    },
    enabled: !!clientId,
  });

  // Fetch interpretation values
  const { data: fbsValues } = useQuery({
    queryKey: ['fbs-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/fbs-values');
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: hba1cValues } = useQuery({
    queryKey: ['hba1c-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/hba1c-values');
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: lipidValues } = useQuery({
    queryKey: ['lipid-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/lipid-values');
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: microalbuminValues } = useQuery({
    queryKey: ['microalbumin-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/microalbumin-values');
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: bmdValues } = useQuery({
    queryKey: ['bmd-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/bmd-values');
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: psaValues } = useQuery({
    queryKey: ['psa-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/psa-values');
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: hepatitisBValues } = useQuery({
    queryKey: ['hepatitis-b-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/hepatitis-b-values');
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: hepatitisCValues } = useQuery({
    queryKey: ['hepatitis-c-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/hepatitis-c-values');
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  // Save lab findings
  const saveFindings = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ClientId: clientId,
        StationId: stationId,
        FBSValue:          parseFloat(data.FBSValue),
        HBA1CValue:        parseFloat(data.HBA1CValue),
        LipidId:           parseInt(data.LipidId),
        MicroalbuminValue: parseFloat(data.MicroalbuminValue),
        BMDValue:          parseFloat(data.BMDValue),
        PSAValue:          parseFloat(data.PSAValue),
        HepatitisBValueId: parseInt(data.HepatitisBValueId),
        HepatitisCValueId: parseInt(data.HepatitisCValueId),
      };
      
      const response = await api.post('/findings', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Lab findings saved successfully!');
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save lab findings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveFindings.mutate(formData);
  };

  if (checkingClient) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: oceanColors.deep }} />
        <p style={{ marginTop: '16px', color: oceanColors.textLight }}>Loading client…</p>
      </div>
    );
  }

  if (!clientCheck) {
    return (
      <div style={{
        background: `${oceanColors.danger}10`,
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center',
        border: `1px solid ${oceanColors.danger}30`
      }}>
        <AlertTriangle size={48} style={{ color: oceanColors.danger, marginBottom: '16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: oceanColors.danger, marginBottom: '8px' }}>
          Client Not Found
        </h3>
        <p style={{ color: oceanColors.textLight, marginBottom: '16px' }}>
          This client record could not be located. Please search again.
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              background: oceanColors.deep,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Back to Search
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '900px',
      margin: '0 auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FlaskConical size={20} style={{ color: oceanColors.deep }} />
              Lab Findings
            </h2>
            <p style={{ fontSize: '13px', color: oceanColors.textLight, marginTop: '4px' }}>
              Patient: {clientName} (ID: {clientIdNumber}) | Station ID: {stationId}
            </p>
          </div>
          <div style={{
            padding: '4px 12px',
            background: `${oceanColors.mid}15`,
            borderRadius: '20px',
            fontSize: '12px',
            color: oceanColors.mid,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Beaker size={14} />
            Lab Capture
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* FBS Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Beaker size={18} /> Fasting Blood Sugar (FBS)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>FBS Value (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={formData.FBSValue}
                onChange={(e) => setFormData({ ...formData, FBSValue: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Interpretation</label>
              <div style={{
                minHeight: '36px', padding: '8px',
                background: '#f8fafc',
                border: `1px solid ${oceanColors.mid}20`,
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                {interpretLocally(fbsValues, parseFloat(formData.FBSValue) || 0) ? (
                  <StatusBadge result={interpretLocally(fbsValues, parseFloat(formData.FBSValue) || 0)} />
                ) : (
                  <span style={{ fontSize: '12px', color: oceanColors.textLight }}>Enter a value to see interpretation</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* HbA1c Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Microscope size={18} /> HbA1c (Glycated Hemoglobin)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>HbA1c Value (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.HBA1CValue}
                onChange={(e) => setFormData({ ...formData, HBA1CValue: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Interpretation</label>
              <div style={{
                minHeight: '36px', padding: '8px',
                background: '#f8fafc',
                border: `1px solid ${oceanColors.mid}20`,
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                {interpretLocally(hba1cValues, parseFloat(formData.HBA1CValue) || 0) ? (
                  <StatusBadge result={interpretLocally(hba1cValues, parseFloat(formData.HBA1CValue) || 0)} />
                ) : (
                  <span style={{ fontSize: '12px', color: oceanColors.textLight }}>Enter a value to see interpretation</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lipid Profile */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> Lipid Profile
          </h3>
          <div>
            <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Result</label>
            <select
              value={formData.LipidId}
              onChange={(e) => setFormData({ ...formData, LipidId: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
              required
            >
              <option value="0">Select Result</option>
              {lipidValues?.map((lipid: any) => (
                <option key={lipid.Id} value={lipid.Id}>{lipid.Title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Microalbumin */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Beaker size={18} /> Microalbumin
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Value (mg/L)</label>
              <input
                type="number"
                step="0.1"
                value={formData.MicroalbuminValue}
                onChange={(e) => setFormData({ ...formData, MicroalbuminValue: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Interpretation</label>
              <div style={{
                minHeight: '36px', padding: '8px',
                background: '#f8fafc',
                border: `1px solid ${oceanColors.mid}20`,
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                {interpretLocally(microalbuminValues, parseFloat(formData.MicroalbuminValue) || 0) ? (
                  <StatusBadge result={interpretLocally(microalbuminValues, parseFloat(formData.MicroalbuminValue) || 0)} />
                ) : (
                  <span style={{ fontSize: '12px', color: oceanColors.textLight }}>Enter a value to see interpretation</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BMD (Bone Mineral Density) */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> Bone Mineral Density (BMD)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>T-Score</label>
              <input
                type="number"
                step="0.01"
                value={formData.BMDValue}
                onChange={(e) => setFormData({ ...formData, BMDValue: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Interpretation</label>
              <div style={{
                minHeight: '36px', padding: '8px',
                background: '#f8fafc',
                border: `1px solid ${oceanColors.mid}20`,
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                {interpretLocally(bmdValues, parseFloat(formData.BMDValue), true) ? (
                  <StatusBadge result={interpretLocally(bmdValues, parseFloat(formData.BMDValue), true)} />
                ) : (
                  <span style={{ fontSize: '12px', color: oceanColors.textLight }}>Enter a T-score to see interpretation</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PSA (Prostate Specific Antigen) */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Beaker size={18} /> PSA (Prostate Specific Antigen)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>PSA Value (ng/mL)</label>
              <input
                type="number"
                step="0.01"
                value={formData.PSAValue}
                onChange={(e) => setFormData({ ...formData, PSAValue: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Interpretation</label>
              <div style={{
                minHeight: '36px', padding: '8px',
                background: '#f8fafc',
                border: `1px solid ${oceanColors.mid}20`,
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                {interpretLocally(psaValues, parseFloat(formData.PSAValue) || 0) ? (
                  <StatusBadge result={interpretLocally(psaValues, parseFloat(formData.PSAValue) || 0)} />
                ) : (
                  <span style={{ fontSize: '12px', color: oceanColors.textLight }}>Enter a value to see interpretation</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hepatitis Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Microscope size={18} /> Hepatitis Screening
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Hepatitis B</label>
              <select
                value={formData.HepatitisBValueId}
                onChange={(e) => setFormData({ ...formData, HepatitisBValueId: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              >
                <option value="0">Select Result</option>
                {hepatitisBValues?.map((value: any) => (
                  <option key={value.Id} value={value.Id}>{value.Title}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Hepatitis C</label>
              <select
                value={formData.HepatitisCValueId}
                onChange={(e) => setFormData({ ...formData, HepatitisCValueId: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              >
                <option value="0">Select Result</option>
                {hepatitisCValues?.map((value: any) => (
                  <option key={value.Id} value={value.Id}>{value.Title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px',
                background: 'white',
                border: `1px solid ${oceanColors.mid}30`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: oceanColors.textDark
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saveFindings.isPending}
            style={{
              flex: 2,
              padding: '12px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              border: 'none',
              borderRadius: '8px',
              color: oceanColors.mid,
              fontWeight: 'bold',
              cursor: saveFindings.isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: saveFindings.isPending ? 0.7 : 1
            }}
          >
            {saveFindings.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            Save Lab Findings
          </button>
        </div>
      </form>
    </div>
  );
}
