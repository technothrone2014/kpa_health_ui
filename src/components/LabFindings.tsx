import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FlaskConical, Microscope, Beaker, Save, Loader2, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';

const oceanColors = {
  deep: '#0B2F9E',
  mid: '#1A4D8C',
  gold: '#FFD700',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textDark: '#1F2937',
  textLight: '#6B7280',
};

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
    FBSINTValueId: 0,
    // HbA1c
    HBA1CValue: '',
    HBA1CINTValueId: 0,
    // Lipid Profile
    LipidId: 0,
    // Microalbumin
    MicroalbuminValue: '',
    MicroalbuminINTValueId: 0,
    // BMD (Bone Mineral Density)
    BMDValue: '',
    BMDINTValueId: 0,
    // PSA (Prostate Specific Antigen)
    PSAValue: '',
    PSAINTValueId: 0,
    // Hepatitis B
    HepatitisBValueId: 0,
    // Hepatitis C
    HepatitisCValueId: 0,
  });

  const [validationStatus, setValidationStatus] = useState<{
    hasFieldFindings: boolean;
    message?: string;
  }>({ hasFieldFindings: true });

  // Check if client has field findings (required before lab findings)
  const { data: hasFieldFindings, isLoading: checkingFindings } = useQuery({
    queryKey: ['client-has-field-findings', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}/has-field-findings`);
      const hasFindings = response.data.hasFindings;
      if (!hasFindings) {
        setValidationStatus({
          hasFieldFindings: false,
          message: 'Client must have field findings recorded before lab findings can be captured.'
        });
      }
      return hasFindings;
    },
  });

  // Fetch interpretation values
  const { data: fbsValues } = useQuery({
    queryKey: ['fbs-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/fbs-values');
      return response.data;
    },
  });

  const { data: hba1cValues } = useQuery({
    queryKey: ['hba1c-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/hba1c-values');
      return response.data;
    },
  });

  const { data: lipidValues } = useQuery({
    queryKey: ['lipid-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/lipid-values');
      return response.data;
    },
  });

  const { data: microalbuminValues } = useQuery({
    queryKey: ['microalbumin-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/microalbumin-values');
      return response.data;
    },
  });

  const { data: bmdValues } = useQuery({
    queryKey: ['bmd-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/bmd-values');
      return response.data;
    },
  });

  const { data: psaValues } = useQuery({
    queryKey: ['psa-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/psa-values');
      return response.data;
    },
  });

  const { data: hepatitisBValues } = useQuery({
    queryKey: ['hepatitis-b-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/hepatitis-b-values');
      return response.data;
    },
  });

  const { data: hepatitisCValues } = useQuery({
    queryKey: ['hepatitis-c-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/hepatitis-c-values');
      return response.data;
    },
  });

  // Get interpretation ID based on value and reference ranges
  const getInterpretationId = (value: number, referenceRanges: any[]): number => {
    for (const range of referenceRanges) {
      if (range.MinValue !== undefined && range.MaxValue !== undefined) {
        if (value >= range.MinValue && value <= range.MaxValue) {
          return range.Id;
        }
      } else if (range.MinValue !== undefined && value >= range.MinValue) {
        return range.Id;
      } else if (range.MaxValue !== undefined && value <= range.MaxValue) {
        return range.Id;
      }
    }
    return referenceRanges[0]?.Id || 1;
  };

  // Get FBS interpretation
  const getFBSInterpretation = (value: number): number => {
    if (fbsValues) {
      if (value < 100) return fbsValues.find((v: any) => v.Title === 'NORMAL')?.Id || 1;
      if (value < 126) return fbsValues.find((v: any) => v.Title === 'IMPAIRED FASTING GLUCOSE')?.Id || 2;
      return fbsValues.find((v: any) => v.Title === 'DIABETES')?.Id || 3;
    }
    return 1;
  };

  // Get HbA1c interpretation
  const getHBA1CInterpretation = (value: number): number => {
    if (hba1cValues) {
      if (value < 5.7) return hba1cValues.find((v: any) => v.Title === 'NORMAL')?.Id || 1;
      if (value < 6.5) return hba1cValues.find((v: any) => v.Title === 'PREDIABETES')?.Id || 2;
      return hba1cValues.find((v: any) => v.Title === 'DIABETES')?.Id || 3;
    }
    return 1;
  };

  // Get PSA interpretation (gender-specific)
  const getPSAInterpretation = (value: number): number => {
    if (psaValues) {
      if (value < 4) return psaValues.find((v: any) => v.Title === 'NORMAL')?.Id || 1;
      if (value < 10) return psaValues.find((v: any) => v.Title === 'BORDERLINE')?.Id || 2;
      return psaValues.find((v: any) => v.Title === 'ELEVATED')?.Id || 3;
    }
    return 1;
  };

  // Save lab findings
  const saveFindings = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ClientId: clientId,
        StationId: stationId,
        FBSValue: parseFloat(data.FBSValue),
        FBSINTValueId: getFBSInterpretation(parseFloat(data.FBSValue)),
        HBA1CValue: parseFloat(data.HBA1CValue),
        HBA1CINTValueId: getHBA1CInterpretation(parseFloat(data.HBA1CValue)),
        LipidId: parseInt(data.LipidId),
        MicroalbuminValue: parseFloat(data.MicroalbuminValue),
        MicroalbuminINTValueId: parseInt(data.MicroalbuminINTValueId),
        BMDValue: parseFloat(data.BMDValue),
        BMDINTValueId: parseInt(data.BMDINTValueId),
        PSAValue: parseFloat(data.PSAValue),
        PSAINTValueId: getPSAInterpretation(parseFloat(data.PSAValue)),
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
    
    if (!hasFieldFindings) {
      toast.error('Client must have field findings recorded first');
      return;
    }
    
    saveFindings.mutate(formData);
  };

  if (checkingFindings) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: oceanColors.deep }} />
        <p style={{ marginTop: '16px', color: oceanColors.textLight }}>Verifying client records...</p>
      </div>
    );
  }

  if (!hasFieldFindings) {
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
          Field Findings Required
        </h3>
        <p style={{ color: oceanColors.textLight, marginBottom: '16px' }}>
          {validationStatus.message || 'This client must complete field findings before lab results can be recorded.'}
        </p>
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
          Go Back
        </button>
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
            background: `${oceanColors.success}15`,
            borderRadius: '20px',
            fontSize: '12px',
            color: oceanColors.success,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CheckCircle size={14} />
            Field Findings Complete
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
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ 
                    ...formData, 
                    FBSValue: value,
                    FBSINTValueId: value ? getFBSInterpretation(parseFloat(value)) : 0
                  });
                }}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Interpretation</label>
              <input
                type="text"
                value={fbsValues?.find((v: any) => v.Id === formData.FBSINTValueId)?.Title || ''}
                readOnly
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: `1px solid ${oceanColors.mid}30`, 
                  borderRadius: '8px',
                  background: '#f8fafc',
                  color: oceanColors.textDark
                }}
              />
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
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ 
                    ...formData, 
                    HBA1CValue: value,
                    HBA1CINTValueId: value ? getHBA1CInterpretation(parseFloat(value)) : 0
                  });
                }}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Interpretation</label>
              <input
                type="text"
                value={hba1cValues?.find((v: any) => v.Id === formData.HBA1CINTValueId)?.Title || ''}
                readOnly
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: `1px solid ${oceanColors.mid}30`, 
                  borderRadius: '8px',
                  background: '#f8fafc'
                }}
              />
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
              <select
                value={formData.MicroalbuminINTValueId}
                onChange={(e) => setFormData({ ...formData, MicroalbuminINTValueId: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              >
                <option value="0">Select Interpretation</option>
                {microalbuminValues?.map((value: any) => (
                  <option key={value.Id} value={value.Id}>{value.Title}</option>
                ))}
              </select>
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
              <select
                value={formData.BMDINTValueId}
                onChange={(e) => setFormData({ ...formData, BMDINTValueId: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              >
                <option value="0">Select Interpretation</option>
                {bmdValues?.map((value: any) => (
                  <option key={value.Id} value={value.Id}>{value.Title}</option>
                ))}
              </select>
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
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ 
                    ...formData, 
                    PSAValue: value,
                    PSAINTValueId: value ? getPSAInterpretation(parseFloat(value)) : 0
                  });
                }}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Interpretation</label>
              <input
                type="text"
                value={psaValues?.find((v: any) => v.Id === formData.PSAINTValueId)?.Title || ''}
                readOnly
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: `1px solid ${oceanColors.mid}30`, 
                  borderRadius: '8px',
                  background: '#f8fafc'
                }}
              />
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
