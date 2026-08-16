import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Activity, Heart, Scale, Droplets, Save, Loader2, Calendar, 
  Ruler, AlertCircle, CheckCircle, AlertTriangle, Minus
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

interface FieldFindingsProps {
  clientId: number;
  clientName: string;
  stationId: number;
  onSuccess?: () => void;
}

interface InterpretationValue {
  Id: number;
  Title: string;
  StartIndex: number;
  StopIndex: number;
}

// Interpretation result interface
interface InterpretationResult {
  id: number;
  label: string;
  status: 'normal' | 'warning' | 'danger' | 'info';
  color: string;
  icon: React.ReactNode;
}

export default function FieldFindings({ clientId, clientName, stationId, onSuccess }: FieldFindingsProps) {
  const [formData, setFormData] = useState({
    Weight: '',
    Height: '',
    Waist: '',
    Hip: '',
    Systolic: '',
    Diastolic: '',
    RBSValue: '',
    // Referrals
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

  // ✅ Fetch client details including DateOfBirth
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}`);
      return response.data;
    },
    enabled: !!clientId,
  });

  // ✅ Fetch BMI interpretation values from database
  const { data: bmiValues } = useQuery({
    queryKey: ['bmi-int-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/bmi-values');
      return response.data || [];
    },
  });

  // ✅ Fetch BP interpretation values from database
  const { data: bpValues } = useQuery({
    queryKey: ['bp-int-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/bp-values');
      return response.data || [];
    },
  });

  // ✅ Fetch RBS interpretation values from database
  const { data: rbsValues } = useQuery({
    queryKey: ['rbs-int-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/rbs-values');
      return response.data || [];
    },
  });

  // ✅ Calculate age from client's DateOfBirth
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
  // INTERPRETATION FUNCTIONS (Using Database Values)
  // ============================================

  // Find interpretation from database values
  const findInterpretation = (values: InterpretationValue[], numericValue: number): InterpretationResult | null => {
    if (!values || values.length === 0 || !numericValue || numericValue <= 0) {
      return null;
    }

    // Find the matching range
    const matched = values.find(v => 
      numericValue >= v.StartIndex && numericValue < v.StopIndex
    );

    if (!matched) return null;

    // Determine status based on title
    const title = matched.Title.toUpperCase();
    let status: 'normal' | 'warning' | 'danger' | 'info' = 'info';
    let color = oceanColors.info;

    if (title.includes('NORMAL') || title.includes('HEALTHY')) {
      status = 'normal';
      color = oceanColors.success;
    } else if (title.includes('PRE') || title.includes('ELEVATED') || title.includes('OVERWEIGHT') || title.includes('STAGE I')) {
      status = 'warning';
      color = oceanColors.warning;
    } else if (title.includes('HYPERTENSION') || title.includes('OBESE') || title.includes('DIABETIC') || title.includes('CRISIS')) {
      status = 'danger';
      color = oceanColors.danger;
    }

    const icons = {
      normal: <CheckCircle size={14} />,
      warning: <AlertTriangle size={14} />,
      danger: <AlertCircle size={14} />,
      info: <Minus size={14} />,
    };

    return {
      id: matched.Id,
      label: matched.Title,
      status,
      color,
      icon: icons[status],
    };
  };

  // Get BMI interpretation from database
  const getBMIInterpretation = (bmi: number): InterpretationResult | null => {
    return findInterpretation(bmiValues || [], bmi);
  };

  // Get BP interpretation from database
  const getBPInterpretation = (systolic: number, diastolic: number): InterpretationResult | null => {
    // Use systolic for BP interpretation (as per database ranges)
    return findInterpretation(bpValues || [], systolic);
  };

  // Get RBS interpretation from database
  const getRBSInterpretation = (rbs: number): InterpretationResult | null => {
    return findInterpretation(rbsValues || [], rbs);
  };

  // Calculate Waist-Hip Ratio (straightforward calculation)
  const calculateWHR = (waist: number, hip: number): number => {
    if (waist && hip && hip > 0) {
      return waist / hip;
    }
    return 0;
  };

  // Interpret WHR (simple calculation)
  const interpretWHR = (whr: number, gender: string): InterpretationResult => {
    if (whr <= 0) {
      return { 
        id: 0, 
        label: 'N/A', 
        status: 'info', 
        color: oceanColors.info, 
        icon: <Minus size={14} /> 
      };
    }
    
    const isFemale = gender?.toLowerCase() === 'female';
    const threshold = isFemale ? 0.80 : 0.90;
    
    if (whr < threshold) {
      return { 
        id: 1, 
        label: 'Normal', 
        status: 'normal', 
        color: oceanColors.success, 
        icon: <CheckCircle size={14} /> 
      };
    }
    return { 
      id: 2, 
      label: 'Increased Risk', 
      status: 'danger', 
      color: oceanColors.danger, 
      icon: <AlertCircle size={14} /> 
    };
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const weight = parseFloat(formData.Weight) || 0;
  const height = parseFloat(formData.Height) || 0;
  const waist = parseFloat(formData.Waist) || 0;
  const hip = parseFloat(formData.Hip) || 0;
  const systolic = parseInt(formData.Systolic) || 0;
  const diastolic = parseInt(formData.Diastolic) || 0;
  const rbs = parseFloat(formData.RBSValue) || 0;

  const bmi = weight && height ? (weight / ((height / 100) * (height / 100))) : 0;
  const whr = calculateWHR(waist, hip);
  
  const bmiInterpretation = getBMIInterpretation(bmi);
  const bpInterpretation = getBPInterpretation(systolic, diastolic);
  const rbsInterpretation = getRBSInterpretation(rbs);
  const whrInterpretation = interpretWHR(whr, clientData?.GenderTitle || '');

  // ============================================
  // SAVE MUTATION
  // ============================================

  const saveFindings = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ClientId: clientId,
        StationId: stationId,
        Age: calculatedAge || 0,
        Weight: weight,
        Height: height,
        BMIValue: bmi,
        BMIINTValueId: bmiInterpretation?.id || 1,
        Waist: waist,
        Hip: hip,
        WHRatio: whr,
        Systolic: systolic,
        Diastolic: diastolic,
        BPINTValueId: bpInterpretation?.id || 1,
        RBSValue: rbs,
        RBSINTValueId: rbsInterpretation?.id || 1,
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
    saveFindings.mutate(formData);
  };

  // ============================================
  // UI COMPONENTS
  // ============================================

  // Status Badge Component
  const StatusBadge = ({ result }: { result: InterpretationResult | null }) => {
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
  };

  // Input with interpretation
  const InputWithInterpretation = ({ 
    label, 
    value, 
    onChange, 
    unit, 
    result,
    required = true,
    step = '1',
    type = 'number',
    readOnly = false
  }: any) => (
    <div style={{ marginBottom: '0' }}>
      <label style={{ fontSize: '12px', fontWeight: '500', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>
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
            type={type}
            step={step}
            value={value}
            onChange={onChange}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              fontSize: '14px',
              outline: 'none',
              minWidth: '0',
              width: '100%',
              background: 'white'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = oceanColors.gold}
            onBlur={(e) => e.currentTarget.style.borderColor = `${oceanColors.mid}30`}
            required={required}
          />
        )}
        {result && (
          <div style={{ flexShrink: 0, minWidth: '80px', textAlign: 'right' }}>
            <StatusBadge result={result} />
          </div>
        )}
      </div>
    </div>
  );

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px', gap: '8px' }}>
          <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>
            {clientName} • Station: {stationId}
          </p>
          {clientData?.DateOfBirth && (
            <p style={{ fontSize: '11px', color: oceanColors.deep, background: '#f0f7ff', padding: '2px 10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
              <Calendar size={12} />
              DOB: {formatDOB(clientData.DateOfBirth)} • Age: <strong>{calculatedAge !== null ? calculatedAge : '...'}</strong>
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Anthropometric Measurements */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={16} /> Anthropometric
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px'
          }}>
            {/* Age - Read-only */}
            <InputWithInterpretation
              label="Age"
              unit="years"
              value={calculatedAge !== null ? calculatedAge : 'Calculating...'}
              readOnly={true}
              required={false}
            />

            {/* Weight */}
            <InputWithInterpretation
              label="Weight"
              unit="kg"
              value={formData.Weight}
              onChange={(e: any) => setFormData({ ...formData, Weight: e.target.value })}
              step="0.1"
            />

            {/* Height */}
            <InputWithInterpretation
              label="Height"
              unit="cm"
              value={formData.Height}
              onChange={(e: any) => setFormData({ ...formData, Height: e.target.value })}
              step="0.1"
            />

            {/* BMI - Read-only with interpretation */}
            <InputWithInterpretation
              label="BMI"
              unit=""
              value={bmi > 0 ? bmi.toFixed(1) : '—'}
              readOnly={true}
              required={false}
              result={bmiInterpretation}
            />
          </div>
        </div>

        {/* Waist & Hip */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ruler size={16} /> Waist & Hip
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px'
          }}>
            <InputWithInterpretation
              label="Waist"
              unit="cm"
              value={formData.Waist}
              onChange={(e: any) => setFormData({ ...formData, Waist: e.target.value })}
              step="0.1"
            />

            <InputWithInterpretation
              label="Hip"
              unit="cm"
              value={formData.Hip}
              onChange={(e: any) => setFormData({ ...formData, Hip: e.target.value })}
              step="0.1"
            />

            {/* WHR - Read-only with interpretation */}
            <div style={{ gridColumn: 'span 2' }}>
              <InputWithInterpretation
                label="Waist-Hip Ratio"
                unit=""
                value={whr > 0 ? whr.toFixed(2) : '—'}
                readOnly={true}
                required={false}
                result={whrInterpretation}
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
              label="Systolic"
              unit="mmHg"
              value={formData.Systolic}
              onChange={(e: any) => setFormData({ ...formData, Systolic: e.target.value })}
            />

            <InputWithInterpretation
              label="Diastolic"
              unit="mmHg"
              value={formData.Diastolic}
              onChange={(e: any) => setFormData({ ...formData, Diastolic: e.target.value })}
            />

            {/* BP Interpretation - Full width */}
            <div style={{ gridColumn: 'span 2' }}>
              <InputWithInterpretation
                label="BP Interpretation"
                unit=""
                value={systolic > 0 && diastolic > 0 ? `${systolic}/${diastolic} mmHg` : '—'}
                readOnly={true}
                required={false}
                result={bpInterpretation}
              />
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
            gridTemplateColumns: '1fr', 
            gap: '12px'
          }}>
            <InputWithInterpretation
              label="RBS Value"
              unit="mg/dL"
              value={formData.RBSValue}
              onChange={(e: any) => setFormData({ ...formData, RBSValue: e.target.value })}
              step="0.1"
              result={rbsInterpretation}
            />
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.BMD} onChange={(e) => setFormData({ ...formData, BMD: e.target.checked })} />
              BMD
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.CancerSCN} onChange={(e) => setFormData({ ...formData, CancerSCN: e.target.checked })} />
              Cancer Screen
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.DentalSCN} onChange={(e) => setFormData({ ...formData, DentalSCN: e.target.checked })} />
              Dental Screen
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.ECG} onChange={(e) => setFormData({ ...formData, ECG: e.target.checked })} />
              ECG
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.EyeSCN} onChange={(e) => setFormData({ ...formData, EyeSCN: e.target.checked })} />
              Eye Screen
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.FBS} onChange={(e) => setFormData({ ...formData, FBS: e.target.checked })} />
              FBS
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.HBA1C} onChange={(e) => setFormData({ ...formData, HBA1C: e.target.checked })} />
              HbA1c
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.HepatitisBC} onChange={(e) => setFormData({ ...formData, HepatitisBC: e.target.checked })} />
              Hep B/C
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.Lipid} onChange={(e) => setFormData({ ...formData, Lipid: e.target.checked })} />
              Lipid Profile
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.Microalbumin} onChange={(e) => setFormData({ ...formData, Microalbumin: e.target.checked })} />
              Microalbumin
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.NutritionCounselling} onChange={(e) => setFormData({ ...formData, NutritionCounselling: e.target.checked })} />
              Nutrition
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={formData.PSA} onChange={(e) => setFormData({ ...formData, PSA: e.target.checked })} />
              PSA
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saveFindings.isPending}
          style={{
            width: '100%',
            padding: '14px',
            background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
            border: 'none',
            borderRadius: '12px',
            color: oceanColors.deep,
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: saveFindings.isPending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            opacity: saveFindings.isPending ? 0.7 : 1,
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
