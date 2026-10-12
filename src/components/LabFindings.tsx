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

// ============================================
// VALIDATION — generous bounds that tolerate table changes
// ============================================
const LAB_LIMITS = {
  FBSValue:          { min: 10,  max: 1000, unit: 'mg/dL' },
  HBA1CValue:        { min: 2,   max: 25,   unit: '%' },
  MicroalbuminValue: { min: 0,   max: 5000, unit: 'mg/L' },
  BMDValue:          { min: -10, max: 5,    unit: '' },
  PSAValue:          { min: 0,   max: 500,  unit: 'ng/mL' },
} as const;

type LabFieldKey = keyof typeof LAB_LIMITS;

function validateLabField(field: LabFieldKey, value: string): string | null {
  if (!value || value.trim() === '') return null;
  const num = parseFloat(value);
  if (Number.isNaN(num)) return 'Must be a valid number';
  const limit = LAB_LIMITS[field];
  if (num < limit.min) return `Minimum is ${limit.min}${limit.unit ? ' ' + limit.unit : ''}`;
  if (num > limit.max) return `Maximum is ${limit.max}${limit.unit ? ' ' + limit.unit : ''}`;
  return null;
}

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
  if (!allowNegative && value < 0) return null;

  // 1) Range match — StartIndex <= v < StopIndex
  const hit = ranges.find((r: any) => {
    const s = Number(r.StartIndex);
    const e = Number(r.StopIndex);
    if (s === e) return false;                    // skip sentinel rows here
    return s <= value && e > value;
  });
  if (hit) return mapHitToResult(hit);

  // 2) Fallback — first row where StartIndex === StopIndex (N/A sentinel)
  const sentinel = ranges.find((r: any) => Number(r.StartIndex) === Number(r.StopIndex));
  return sentinel ? mapHitToResult(sentinel) : null;
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

const InputWithBadge = React.memo(({
  label, unit, value, onChange, result, error,
  step = '0.1', min, max, required = true, id, placeholder,
}: any) => {
  const inputId = id || `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const hasError = !!error;

  return (
    <div>
      <label htmlFor={inputId} style={{
        fontSize: '13px', color: oceanColors.textDark,
        display: 'block', marginBottom: '4px',
      }}>
        {label} {unit && <span style={{ color: oceanColors.textLight, fontSize: '11px' }}>({unit})</span>}
        {required && <span style={{ color: oceanColors.danger, marginLeft: '2px' }}>*</span>}
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          id={inputId}
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={onChange}
          aria-invalid={hasError}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: '8px',
            border: `1px solid ${hasError ? oceanColors.danger : `${oceanColors.mid}30`}`,
            fontSize: '14px',
            outline: 'none',
            minWidth: '0',
            background: hasError ? `${oceanColors.danger}08` : 'white',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = hasError ? oceanColors.danger : oceanColors.gold)}
          onBlur={(e) => (e.currentTarget.style.borderColor = hasError ? oceanColors.danger : `${oceanColors.mid}30`)}
          required={required}
        />
        {result && (
          <div style={{ flexShrink: 0, minWidth: '80px', textAlign: 'right' }}>
            <StatusBadge result={result} />
          </div>
        )}
      </div>
      {hasError && (
        <p style={{
          fontSize: '11px', color: oceanColors.danger,
          margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
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

  const errors = React.useMemo(() => {
    const e: Record<string, string | null> = {
      FBSValue:          validateLabField('FBSValue',          formData.FBSValue),
      HBA1CValue:        validateLabField('HBA1CValue',        formData.HBA1CValue),
      MicroalbuminValue: validateLabField('MicroalbuminValue', formData.MicroalbuminValue),
      BMDValue:          validateLabField('BMDValue',          formData.BMDValue),
      PSAValue:          validateLabField('PSAValue',          formData.PSAValue),
    };
    return e;
  }, [formData]);

  const hasErrors = React.useMemo(
    () => Object.values(errors).some((msg) => !!msg),
    [errors]
  );

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
    if (hasErrors) {
      toast.error('Please fix the highlighted errors before saving.');
      return;
    }
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
          <InputWithBadge
            id="fbs"
            label="FBS Value"
            unit="mg/dL"
            value={formData.FBSValue}
            onChange={(e: any) => setFormData({ ...formData, FBSValue: e.target.value })}
            step="0.1"
            min={LAB_LIMITS.FBSValue.min}
            max={LAB_LIMITS.FBSValue.max}
            error={errors.FBSValue}
            result={interpretLocally(fbsValues, parseFloat(formData.FBSValue) || 0)}
          />
        </div>

        {/* HbA1c Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Microscope size={18} /> HbA1c (Glycated Hemoglobin)
          </h3>
          <InputWithBadge
            id="hba1c"
            label="HbA1c Value"
            unit="%"
            value={formData.HBA1CValue}
            onChange={(e: any) => setFormData({ ...formData, HBA1CValue: e.target.value })}
            step="0.1"
            min={LAB_LIMITS.HBA1CValue.min}
            max={LAB_LIMITS.HBA1CValue.max}
            error={errors.HBA1CValue}
            result={interpretLocally(hba1cValues, parseFloat(formData.HBA1CValue) || 0)}
          />
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
          <InputWithBadge
            id="microalbumin"
            label="Microalbumin Value"
            unit="mg/L"
            value={formData.MicroalbuminValue}
            onChange={(e: any) => setFormData({ ...formData, MicroalbuminValue: e.target.value })}
            step="0.1"
            min={LAB_LIMITS.MicroalbuminValue.min}
            max={LAB_LIMITS.MicroalbuminValue.max}
            error={errors.MicroalbuminValue}
            result={interpretLocally(microalbuminValues, parseFloat(formData.MicroalbuminValue) || 0)}
          />
        </div>

        {/* BMD */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> Bone Mineral Density (BMD)
          </h3>
          <InputWithBadge
            id="bmd"
            label="T-Score"
            value={formData.BMDValue}
            onChange={(e: any) => setFormData({ ...formData, BMDValue: e.target.value })}
            step="0.01"
            min={LAB_LIMITS.BMDValue.min}
            max={LAB_LIMITS.BMDValue.max}
            error={errors.BMDValue}
            result={interpretLocally(bmdValues, parseFloat(formData.BMDValue) || 0, true)}
          />
        </div>

        {/* PSA */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Beaker size={18} /> PSA (Prostate Specific Antigen)
          </h3>
          <InputWithBadge
            id="psa"
            label="PSA Value"
            unit="ng/mL"
            value={formData.PSAValue}
            onChange={(e: any) => setFormData({ ...formData, PSAValue: e.target.value })}
            step="0.01"
            min={LAB_LIMITS.PSAValue.min}
            max={LAB_LIMITS.PSAValue.max}
            error={errors.PSAValue}
            required={false}
            result={interpretLocally(psaValues, parseFloat(formData.PSAValue) || 0)}
          />
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
            disabled={saveFindings.isPending || hasErrors}
            style={{
              flex: 2,
              padding: '12px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              border: 'none',
              borderRadius: '8px',
              color: oceanColors.mid,
              fontWeight: 'bold',
              cursor: (saveFindings.isPending || hasErrors) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (saveFindings.isPending || hasErrors) ? 0.6 : 1,
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
