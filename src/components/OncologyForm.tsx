import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Activity, Heart, Shield, Save, Loader2, AlertTriangle, CheckCircle, User, UserRound } from 'lucide-react';
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

interface OncologyFormProps {
  clientId: number;
  clientName: string;
  clientIdNumber: string;
  genderId: number;
  stationId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OncologyForm({ clientId, clientName, clientIdNumber, genderId, stationId, onSuccess, onCancel }: OncologyFormProps) {
  const [formData, setFormData] = useState({
    BreastExamId: 0,
    PAPSmearId: 0,
    ViaVilliId: 0,
  });

  const [validationStatus, setValidationStatus] = useState<{
    hasFieldFindings: boolean;
    message?: string;
  }>({ hasFieldFindings: true });

  // Check if client has field findings (required before oncology screening)
  const { data: hasFieldFindings, isLoading: checkingFindings } = useQuery({
    queryKey: ['client-has-field-findings', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}/has-field-findings`);
      const hasFindings = response.data.hasFindings;
      if (!hasFindings) {
        setValidationStatus({
          hasFieldFindings: false,
          message: 'Client must have field findings recorded before oncology screening can be captured.'
        });
      }
      return hasFindings;
    },
  });

  // Fetch breast exam values
  const { data: breastExamValues } = useQuery({
    queryKey: ['breast-exam-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/breast-exam-values');
      return response.data;
    },
  });

  // Fetch PAP smear values
  const { data: papSmearValues } = useQuery({
    queryKey: ['pap-smear-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/pap-smear-values');
      return response.data;
    },
  });

  // Fetch Via Villi values
  const { data: viaVilliValues } = useQuery({
    queryKey: ['via-villi-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/via-villi-values');
      return response.data;
    },
  });

  // Save oncology findings
  const saveFindings = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ClientId: clientId,
        StationId: stationId,
        BreastExamId: parseInt(data.BreastExamId),
        PAPSmearId: parseInt(data.PAPSmearId),
        ViaVilliId: parseInt(data.ViaVilliId),
      };
      
      const response = await api.post('/oncologies', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Oncology screening saved successfully!');
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save oncology screening');
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

  const isFemale = genderId === 2; // Assuming 2 = Female
  const isMale = genderId === 1; // Assuming 1 = Male

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
          {validationStatus.message || 'This client must complete field findings before oncology screening can be recorded.'}
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
      maxWidth: '800px',
      margin: '0 auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} style={{ color: oceanColors.deep }} />
              Oncology / Cancer Screening
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
        {/* Gender-specific screening information */}
        <div style={{
          background: `${oceanColors.gold}15`,
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {isFemale ? (
            <>
              <div style={{
                width: '32px',
                height: '32px',
                background: oceanColors.deep,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: 'white', fontSize: '16px' }}>♀</span>
              </div>
              <div>
                <strong style={{ color: oceanColors.deep }}>Female Patient</strong>
                <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>
                  Breast Exam, PAP Smear, and VIA Villi screening will be recorded.
                </p>
              </div>
            </>
          ) : isMale ? (
            <>
              <div style={{
                width: '32px',
                height: '32px',
                background: oceanColors.deep,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: 'white', fontSize: '16px' }}>♂</span>
              </div>
              <div>
                <strong style={{ color: oceanColors.deep }}>Male Patient</strong>
                <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>
                  Note: Breast Exam and PAP Smear are typically for female patients only.
                </p>
              </div>
            </>
          ) : (
            <>
              <User size={24} style={{ color: oceanColors.deep }} />
              <div>
                <strong style={{ color: oceanColors.deep }}>Patient</strong>
                <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>
                  Please select appropriate screening based on gender.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Breast Exam */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={18} /> Breast Exam
          </h3>
          <div>
            <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Result</label>
            <select
              value={formData.BreastExamId}
              onChange={(e) => setFormData({ ...formData, BreastExamId: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
              required
            >
              <option value="0">Select Result</option>
              {breastExamValues?.map((value: any) => (
                <option key={value.Id} value={value.Id}>{value.Title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* PAP Smear (Female only) */}
        <div style={{ marginBottom: '24px', opacity: isFemale ? 1 : 0.6 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> PAP Smear
          </h3>
          <div>
            <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Result</label>
            <select
              value={formData.PAPSmearId}
              onChange={(e) => setFormData({ ...formData, PAPSmearId: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
              required={isFemale}
              disabled={!isFemale}
            >
              <option value="0">Select Result</option>
              {papSmearValues?.map((value: any) => (
                <option key={value.Id} value={value.Id}>{value.Title}</option>
              ))}
            </select>
            {!isFemale && (
              <p style={{ fontSize: '11px', color: oceanColors.warning, marginTop: '4px' }}>
                Note: PAP Smear is typically performed on female patients only.
              </p>
            )}
          </div>
        </div>

        {/* VIA Villi */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> VIA Villi
          </h3>
          <div>
            <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Result</label>
            <select
              value={formData.ViaVilliId}
              onChange={(e) => setFormData({ ...formData, ViaVilliId: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
              required
            >
              <option value="0">Select Result</option>
              {viaVilliValues?.map((value: any) => (
                <option key={value.Id} value={value.Id}>{value.Title}</option>
              ))}
            </select>
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
            Save Oncology Screening
          </button>
        </div>
      </form>
    </div>
  );
}
