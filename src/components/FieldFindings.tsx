import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Activity, Heart, Scale, Droplets, Save, Loader2, Calendar, 
  Ruler, AlertCircle, CheckCircle, AlertTriangle, Minus, MapPin
} from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
  white: '#FFFFFF',
};

// ============================================
// VALIDATION RULES
// ============================================
const FIELD_LIMITS = {
  Weight:   { min: 5,  max: 300, unit: 'kg' },
  Height:   { min: 30, max: 250, unit: 'cm' },
  Waist:    { min: 30, max: 200, unit: 'cm' },
  Hip:      { min: 30, max: 200, unit: 'cm' },
  Systolic: { min: 60, max: 250, unit: 'mmHg' },
  Diastolic:{ min: 30, max: 150, unit: 'mmHg' },
  RBSValue: { min: 1,  max: 40, unit: 'mmol/L' },
} as const;

type FieldKey = keyof typeof FIELD_LIMITS;

function validateField(field: FieldKey, value: string): string | null {
  if (!value || value.trim() === '') return null; // empty is allowed (handled by `required`)
  const num = parseFloat(value);
  if (Number.isNaN(num)) return 'Must be a valid number';
  const limit = FIELD_LIMITS[field];
  if (num < limit.min) return `Minimum is ${limit.min} ${limit.unit}`;
  if (num > limit.max) return `Maximum is ${limit.max} ${limit.unit}`;
  return null;
}

interface FieldFindingsProps {
  clientId: number;
  clientName: string;
  stationId: number;
  onSuccess?: () => void;
  /** Optional: when provided, renders an editable station dropdown */
  onStationChange?: (newStationId: number) => void;
}

interface StationOption {
  Id: number;
  Title: string;
}

interface InterpretationValue {
  Id: number;
  Title: string;
  StartIndex: number;
  StopIndex: number;
}

interface InterpretationResult {
  id: number;
  label: string;
  status: 'normal' | 'warning' | 'danger' | 'info';
  color: string;
  icon: React.ReactNode;
}

// ✅ Stable StatusBadge component (memoized)
const StatusBadge = React.memo(({ result }: { result: InterpretationResult | null }) => {
  if (!result || result.status === 'info') {
    return (
      <span style={{
        fontSize: '11px',
        color: oceanColors.textLight,
        background: '#f3f4f6',
        padding: '2px 10px',
        borderRadius: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {result?.icon || <Minus size={14} />} {result?.label || 'N/A'}
      </span>
    );
  }
  
  const bgColors = {
    normal: `${oceanColors.success}15`,
    warning: `${oceanColors.warning}15`,
    danger: `${oceanColors.danger}15`,
    info: `${oceanColors.info}15`,
  };
  
  const textColors = {
    normal: oceanColors.success,
    warning: oceanColors.warning,
    danger: oceanColors.danger,
    info: oceanColors.info,
  };
  
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 'bold',
      color: textColors[result.status],
      background: bgColors[result.status],
      padding: '2px 10px',
      borderRadius: '12px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      border: `1px solid ${textColors[result.status]}30`
    }}>
      {result.icon} {result.label}
    </span>
  );
});

// Map backend status → icon (colour is applied in StatusBadge via `status`)
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

function mapHitToResult(hit: {
  Id: number;
  Title: string;
  status: InterpretationResult['status'];
} | null): InterpretationResult | null {
  if (!hit) return null;
  return {
    id: hit.Id,
    label: hit.Title,
    status: hit.status,
    color: STATUS_COLORS[hit.status],
    icon: STATUS_ICONS[hit.status],
  };
}

// Debounced server-side interpretation hook
function useInterpretation(type: 'bmi' | 'bp' | 'rbs', value: number) {
  const [result, setResult] = useState<InterpretationResult | null>(null);

  useEffect(() => {
    if (!value || value <= 0) {
      setResult(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/lookups/interpret/${type}`, {
          params: { value },
          signal: controller.signal,
        });
        setResult(mapHitToResult(res.data?.interpretation ?? null));
      } catch (err: any) {
        if (err?.name !== 'CanceledError' && err?.name !== 'AbortError') {
          console.error(`Interpretation fetch failed for ${type}:`, err);
        }
      }
    }, 300); // debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [type, value]);

  return result;
}

// ✅ Stable InputWithInterpretation component (memoized)
const InputWithInterpretation = React.memo(({ 
  label, 
  value, 
  onChange, 
  unit, 
  result,
  required = true,
  step = '1',
  type = 'number',
  readOnly = false,
  id,
  min,
  max,
  error,
}: any) => {
  const inputId = id || `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const hasError = !!error;

  return (
    <div style={{ marginBottom: '0' }}>
      <label htmlFor={inputId} style={{ 
        fontSize: '12px', 
        fontWeight: '500', 
        color: oceanColors.textDark, 
        display: 'block', 
        marginBottom: '4px' 
      }}>
        {label} {unit && <span style={{ color: oceanColors.textLight, fontSize: '10px' }}>({unit})</span>}
        {required && !readOnly && <span style={{ color: oceanColors.danger, marginLeft: '2px' }}>*</span>}
        {readOnly && <span style={{ color: oceanColors.success, fontSize: '10px', marginLeft: '4px' }}>● Auto</span>}
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {readOnly ? (
          <div style={{
            flex: 1,
            padding: '10px 12px',
            background: '#f3f4f6',
            borderRadius: '8px',
            border: `1px solid ${oceanColors.mid}20`,
            fontSize: '14px',
            fontWeight: 'bold',
            color: oceanColors.textDark,
            minHeight: '42px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {value || '—'}
          </div>
        ) : (
          <input
            id={inputId}
            type={type}
            step={step}
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            aria-invalid={hasError}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${hasError ? oceanColors.danger : `${oceanColors.mid}30`}`,
              fontSize: '14px',
              outline: 'none',
              minWidth: '0',
              width: '100%',
              background: hasError ? `${oceanColors.danger}08` : 'white'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = hasError ? oceanColors.danger : oceanColors.gold}
            onBlur={(e) => e.currentTarget.style.borderColor = hasError ? oceanColors.danger : `${oceanColors.mid}30`}
            required={required}
          />
        )}
        {result && (
          <div style={{ flexShrink: 0, minWidth: '80px', textAlign: 'right' }}>
            <StatusBadge result={result} />
          </div>
        )}
      </div>
      {hasError && (
        <p style={{
          fontSize: '11px',
          color: oceanColors.danger,
          margin: '4px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
});

export default function FieldFindings({
  clientId,
  clientName,
  stationId,
  onSuccess,
  onStationChange,
}: FieldFindingsProps) {
  const [formData, setFormData] = useState({
    Weight: '',
    Height: '',
    Waist: '',
    Hip: '',
    Systolic: '',
    Diastolic: '',
    RBSValue: '',
    BPRemarkId: '' as string | number,
    RBSRemarkId: '' as string | number,
    BMD: false,
    CancerSCN: false,
    DentalSCN: false,
    ECG: false,
    EyeSCN: false,
    FBS: false,
    HBA1C: false,
    HepatitisBC: false,
    Lipid: false,
    Microalbumin: false,
    NutritionCounselling: false,
    PSA: false,
  });

  // ✅ Use useCallback for stable onChange handlers
  const handleInputChange = useCallback((field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleCheckboxChange = useCallback((field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.checked }));
  }, []);

  // ✅ Fetch client details
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}`);
      return response.data;
    },
    enabled: !!clientId,
  });

  // ✅ Fetch stations for the dropdown (shared cache key with parent)
  const { data: stations } = useQuery<StationOption[]>({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await api.get('/analytics/stations');
      return response.data.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min — stations rarely change
  });

  const { data: bpRemarks } = useQuery<StationOption[]>({
    queryKey: ['bp-remark-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/bp-remark-values');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: rbsRemarks } = useQuery<StationOption[]>({
    queryKey: ['rbs-remark-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/rbs-remark-values');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentStationName = useMemo(() => {
    return stations?.find((s) => s.Id === stationId)?.Title ?? `Station ${stationId}`;
  }, [stations, stationId]);

  // ✅ Calculate age
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);

  useEffect(() => {
    if (clientData?.DateOfBirth) {
      const age = calculateAgeFromDOB(clientData.DateOfBirth);
      setCalculatedAge(age);
    }
  }, [clientData]);

  const calculateAgeFromDOB = (dob: string): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDOB = (dob: string): string => {
    if (!dob) return 'Not set';
    return format(new Date(dob), 'dd MMM yyyy');
  };


  // ============================================
  // COMPUTED VALUES - Memoized
  // ============================================

  const weight = parseFloat(formData.Weight) || 0;
  const height = parseFloat(formData.Height) || 0;
  const waist = parseFloat(formData.Waist) || 0;
  const hip = parseFloat(formData.Hip) || 0;
  const systolic = parseInt(formData.Systolic) || 0;
  const diastolic = parseInt(formData.Diastolic) || 0;
  const rbs = parseFloat(formData.RBSValue) || 0;

  const bmi = useMemo(() => {
    if (!weight || !height) return 0;
    if (height < 50 || height > 250) return 0; // sanity: reject absurd heights
    if (weight < 1 || weight > 400) return 0;  // sanity: reject absurd weights
    return weight / ((height / 100) * (height / 100));
  }, [weight, height]);

  const whr = useMemo(() => {
    return (waist && hip && hip > 0) ? (waist / hip) : 0;
  }, [waist, hip]);

  // ============================================
  // VALIDATION
  // ============================================
  const errors = useMemo(() => {
    const e: Record<string, string | null> = {
      Weight:    validateField('Weight',    formData.Weight),
      Height:    validateField('Height',    formData.Height),
      Waist:     validateField('Waist',     formData.Waist),
      Hip:       validateField('Hip',       formData.Hip),
      Systolic:  validateField('Systolic',  formData.Systolic),
      Diastolic: validateField('Diastolic', formData.Diastolic),
      RBSValue:  validateField('RBSValue',  formData.RBSValue),
    };

    // Cross-field: systolic must be strictly greater than diastolic
    if (systolic > 0 && diastolic > 0 && systolic <= diastolic) {
      e.Systolic  = 'Systolic must be greater than Diastolic';
      e.Diastolic = 'Diastolic must be less than Systolic';
    }

    // Required remarks (medication status must be recorded)
    if (!formData.BPRemarkId) e.BPRemarkId = 'Please select a remark';
    if (!formData.RBSRemarkId) e.RBSRemarkId = 'Please select a remark';

    return e;
  }, [formData, systolic, diastolic]);
  const hasErrors = useMemo(
    () => Object.values(errors).some((msg) => !!msg),
    [errors]
  );

  // ✅ Memoized interpretations
  const bmiInterpretation = useInterpretation('bmi', bmi);
  const bpInterpretation  = useInterpretation('bp',  diastolic);
  const rbsInterpretation = useInterpretation('rbs', rbs);


  // ============================================
  // SAVE MUTATION
  // ============================================

  const saveFindings = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ClientId: clientId,
        StationId: stationId,
        Weight: weight,
        Height: height,
        BMIValue: bmi,
        Waist: waist,
        Hip: hip,
        WHRatio: whr,
        Systolic: systolic,
        Diastolic: diastolic,
        RBSValue: rbs,
        BPRemarkId: formData.BPRemarkId || null,
        RBSRemarkId: formData.RBSRemarkId || null,
        BMD: data.BMD,
        CancerSCN: data.CancerSCN,
        DentalSCN: data.DentalSCN,
        ECG: data.ECG,
        EyeSCN: data.EyeSCN,
        FBS: data.FBS,
        HBA1C: data.HBA1C,
        HepatitisBC: data.HepatitisBC,
        Lipid: data.Lipid,
        Microalbumin: data.Microalbumin,
        NutritionCounselling: data.NutritionCounselling,
        PSA: data.PSA,
      };
      
      const response = await api.post('/tallies', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Field findings saved successfully!');
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save findings');
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

  // ============================================
  // RENDER
  // ============================================

  if (clientLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: oceanColors.deep }} />
        <p style={{ marginTop: '16px', color: oceanColors.textLight }}>Loading client data...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '16px',
      maxWidth: '100%',
      margin: '0 auto',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
          Field Findings
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: oceanColors.textLight, flexWrap: 'wrap' }}>
            <span>{clientName}</span>
            <span style={{ color: oceanColors.mid }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={12} style={{ color: oceanColors.deep }} />
              Station:
              {onStationChange && stations && stations.length > 0 ? (
                <select
                  value={stationId}
                  onChange={(e) => onStationChange(Number(e.target.value))}
                  title="Change station for this session — applies to all subsequent clients"
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: `1px solid ${oceanColors.mid}40`,
                    background: '#f8fafc',
                    color: oceanColors.textDark,
                    fontWeight: '600',
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '220px',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = oceanColors.gold)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = `${oceanColors.mid}40`)}
                >
                  {stations.map((s) => (
                    <option key={s.Id} value={s.Id}>
                      {s.Title}
                    </option>
                  ))}
                </select>
              ) : (
                <strong style={{ color: oceanColors.textDark }}>{currentStationName}</strong>
              )}
            </span>
          </div>
          {clientData?.DateOfBirth && (
            <p style={{ fontSize: '11px', color: oceanColors.deep, background: '#f0f7ff', padding: '2px 10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
              <Calendar size={12} />
              DOB: {formatDOB(clientData.DateOfBirth)} • Age: <strong>{calculatedAge !== null ? calculatedAge : '...'}</strong>
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Age */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} /> Age
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px'
          }}>
            <InputWithInterpretation
              id="age"
              label="Age"
              unit="years"
              value={calculatedAge !== null ? calculatedAge : 'Calculating...'}
              readOnly={true}
              required={false}
            />
          </div>
        </div>

        {/* BMI */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={16} /> BMI
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px'
          }}>
            <InputWithInterpretation
              id="weight"
              label="Weight"
              unit="kg"
              value={formData.Weight}
              onChange={handleInputChange('Weight')}
              step="0.1"
              min={FIELD_LIMITS.Weight.min}
              max={FIELD_LIMITS.Weight.max}
              error={errors.Weight}
            />

            <InputWithInterpretation
              id="height"
              label="Height"
              unit="cm"
              value={formData.Height}
              onChange={handleInputChange('Height')}
              step="0.1"
              min={FIELD_LIMITS.Height.min}
              max={FIELD_LIMITS.Height.max}
              error={errors.Height}
            />

            <div style={{ gridColumn: 'span 2' }}>
              <InputWithInterpretation
                id="bmi"
                label="BMI"
                unit="kg/m²"
                value={bmi > 0 ? bmi.toFixed(1) : '—'}
                readOnly={true}
                required={false}
                result={bmiInterpretation}
              />
            </div>
          </div>
        </div>

        {/* Waist & Hip */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ruler size={16} /> Hip & Waist
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px'
          }}>
            <InputWithInterpretation
              id="hip"
              label="Hip"
              unit="cm"
              value={formData.Hip}
              onChange={handleInputChange('Hip')}
              step="0.1"
              min={FIELD_LIMITS.Hip.min}
              max={FIELD_LIMITS.Hip.max}
              error={errors.Hip}
            />

            <InputWithInterpretation
              id="waist"
              label="Waist"
              unit="cm"
              value={formData.Waist}
              onChange={handleInputChange('Waist')}
              step="0.1"
              min={FIELD_LIMITS.Waist.min}
              max={FIELD_LIMITS.Waist.max}
              error={errors.Waist}
            />

            <div style={{ gridColumn: 'span 2' }}>
              <InputWithInterpretation
                id="whr"
                label="Waist-Hip Ratio"
                unit=""
                value={whr > 0 ? whr.toFixed(2) : '—'}
                readOnly={true}
                required={false}
              />
            </div>
          </div>
        </div>

        {/* Blood Pressure */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={16} /> Blood Pressure
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px'
          }}>
            <InputWithInterpretation
              id="systolic"
              label="Systolic"
              unit="mmHg"
              value={formData.Systolic}
              onChange={handleInputChange('Systolic')}
              min={FIELD_LIMITS.Systolic.min}
              max={FIELD_LIMITS.Systolic.max}
              error={errors.Systolic}
            />

            <InputWithInterpretation
              id="diastolic"
              label="Diastolic"
              unit="mmHg"
              value={formData.Diastolic}
              onChange={handleInputChange('Diastolic')}
              min={FIELD_LIMITS.Diastolic.min}
              max={FIELD_LIMITS.Diastolic.max}
              error={errors.Diastolic}
            />

            <div style={{ gridColumn: 'span 2' }}>
              <InputWithInterpretation
                id="bp-interpretation"
                label="BP Interpretation"
                unit=""
                value={systolic > 0 && diastolic > 0 ? `${systolic}/${diastolic} mmHg` : '—'}
                readOnly={true}
                required={false}
                result={bpInterpretation}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="bp-remark" style={{
                fontSize: '12px',
                fontWeight: '500',
                color: oceanColors.textDark,
                display: 'block',
                marginBottom: '4px'
              }}>
                Remark <span style={{ color: oceanColors.textLight, fontSize: '10px' }}>(medication status)</span>
                <span style={{ color: oceanColors.danger, marginLeft: '2px' }}>*</span>
              </label>
              <select
                id="bp-remark"
                value={formData.BPRemarkId}
                onChange={(e) => setFormData(prev => ({ ...prev, BPRemarkId: e.target.value ? Number(e.target.value) : '' }))}
                aria-invalid={!!errors.BPRemarkId}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${errors.BPRemarkId ? oceanColors.danger : `${oceanColors.mid}30`}`,
                  fontSize: '14px',
                  outline: 'none',
                  background: errors.BPRemarkId ? `${oceanColors.danger}08` : 'white',
                  cursor: 'pointer'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = errors.BPRemarkId ? oceanColors.danger : oceanColors.gold}
                onBlur={(e) => e.currentTarget.style.borderColor = errors.BPRemarkId ? oceanColors.danger : `${oceanColors.mid}30`}
              >
                <option value="">Select remark…</option>
                {bpRemarks?.map((r) => (
                  <option key={r.Id} value={r.Id}>{r.Title}</option>
                ))}
              </select>
              {errors.BPRemarkId && (
                <p style={{ fontSize: '11px', color: oceanColors.danger, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {errors.BPRemarkId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Random Blood Sugar */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Droplets size={16} /> Random Blood Sugar
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px'
          }}>
            <InputWithInterpretation
              id="rbs"
              label="RBS Value"
              unit="mmol/L"
              value={formData.RBSValue}
              onChange={handleInputChange('RBSValue')}
              step="0.1"
              min={FIELD_LIMITS.RBSValue.min}
              max={FIELD_LIMITS.RBSValue.max}
              error={errors.RBSValue}
              result={rbsInterpretation}
            />

            <div>
              <label htmlFor="rbs-remark" style={{
                fontSize: '12px',
                fontWeight: '500',
                color: oceanColors.textDark,
                display: 'block',
                marginBottom: '4px'
              }}>
                Remark <span style={{ color: oceanColors.textLight, fontSize: '10px' }}>(medication status)</span>
                <span style={{ color: oceanColors.danger, marginLeft: '2px' }}>*</span>
              </label>
              <select
                id="rbs-remark"
                value={formData.RBSRemarkId}
                onChange={(e) => setFormData(prev => ({ ...prev, RBSRemarkId: e.target.value ? Number(e.target.value) : '' }))}
                aria-invalid={!!errors.RBSRemarkId}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${errors.RBSRemarkId ? oceanColors.danger : `${oceanColors.mid}30`}`,
                  fontSize: '14px',
                  outline: 'none',
                  background: errors.RBSRemarkId ? `${oceanColors.danger}08` : 'white',
                  cursor: 'pointer'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = errors.RBSRemarkId ? oceanColors.danger : oceanColors.gold}
                onBlur={(e) => e.currentTarget.style.borderColor = errors.RBSRemarkId ? oceanColors.danger : `${oceanColors.mid}30`}
              >
                <option value="">Select remark…</option>
                {rbsRemarks?.map((r) => (
                  <option key={r.Id} value={r.Id}>{r.Title}</option>
                ))}
              </select>
              {errors.RBSRemarkId && (
                <p style={{ fontSize: '11px', color: oceanColors.danger, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {errors.RBSRemarkId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Referrals */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} /> Referrals
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '8px',
            background: '#f8fafc',
            padding: '12px',
            borderRadius: '12px'
          }}>
            {[
              { key: 'BMD', label: 'BMD' },
              { key: 'CancerSCN', label: 'Cancer Screen' },
              { key: 'DentalSCN', label: 'Dental Screen' },
              { key: 'ECG', label: 'ECG' },
              { key: 'EyeSCN', label: 'Eye Screen' },
              { key: 'FBS', label: 'FBS' },
              { key: 'HBA1C', label: 'HbA1c' },
              { key: 'HepatitisBC', label: 'Hep B/C' },
              { key: 'Lipid', label: 'Lipid Profile' },
              { key: 'Microalbumin', label: 'Microalbumin' },
              { key: 'NutritionCounselling', label: 'Nutrition' },
              { key: 'PSA', label: 'PSA' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input 
                  type="checkbox" 
                  checked={formData[key as keyof typeof formData] as boolean} 
                  onChange={handleCheckboxChange(key)} 
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saveFindings.isPending || hasErrors}
          style={{
            width: '100%',
            padding: '14px',
            background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
            border: 'none',
            borderRadius: '12px',
            color: oceanColors.deep,
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: (saveFindings.isPending || hasErrors) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            opacity: (saveFindings.isPending || hasErrors) ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          {saveFindings.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {saveFindings.isPending ? 'Saving...' : 'Save Field Findings'}
        </button>
      </form>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 480px) {
          input, select, button {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
