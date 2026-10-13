import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Activity, Heart, Shield, Save, Loader2, AlertTriangle, ShieldCheck, User } from 'lucide-react';
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

interface OncologyFormProps {
  clientId: number;
  clientName: string;
  clientIdNumber: string;
  genderId: number;
  genderTitle?: string;
  stationId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OncologyForm({
  clientId,
  clientName,
  clientIdNumber,
  genderId,
  genderTitle,
  stationId,
  onSuccess,
  onCancel,
}: OncologyFormProps) {
  const [formData, setFormData] = useState({
    BreastExamId: 0,
    PAPSmearId: 0,
    ViaVilliId: 0,
  });

  // Verify client exists
  const { data: clientCheck, isLoading: checkingClient } = useQuery({
    queryKey: ['client-existence', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}`);
      return response.data;
    },
    enabled: !!clientId,
  });

  // Station name lookup
  const { data: stations } = useQuery<any[]>({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await api.get('/analytics/stations');
      return response.data.data || [];
    },
    staleTime: 30 * 60 * 1000,
  });
  const currentStationName = React.useMemo(() => {
    return stations?.find((s: any) => s.Id === stationId)?.Title ?? `Station ${stationId}`;
  }, [stations, stationId]);

  // Lookups
  const { data: breastExamValues } = useQuery({
    queryKey: ['breast-exam-values'],
    queryFn: async () => (await api.get('/lookups/breast-exam-values')).data,
    staleTime: 30 * 60 * 1000,
  });
  const { data: papSmearValues } = useQuery({
    queryKey: ['pap-smear-values'],
    queryFn: async () => (await api.get('/lookups/pap-smear-values')).data,
    staleTime: 30 * 60 * 1000,
  });
  const { data: viaVilliValues } = useQuery({
    queryKey: ['via-villi-values'],
    queryFn: async () => (await api.get('/lookups/via-villi-values')).data,
    staleTime: 30 * 60 * 1000,
  });

  // Gender detection — prefer title over ID
  const gender = (genderTitle || '').toLowerCase();
  const isFemale = gender === 'female' || genderId === 2;
  const isMale = gender === 'male' || genderId === 1;

  // At least one screening must be recorded
  const hasAnyValue = React.useMemo(
    () =>
      formData.BreastExamId > 0 ||
      formData.PAPSmearId > 0 ||
      formData.ViaVilliId > 0,
    [formData]
  );

  // Draft persistence
  useEffect(() => {
    const key = `draft:oncology:${clientId}`;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(formData));
      } catch {
        /* ignore quota */
      }
    }, 800);
    return () => clearTimeout(t);
  }, [formData, clientId]);

  useEffect(() => {
    const key = `draft:oncology:${clientId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) setFormData((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
  }, [clientId]);

  // Save
  const saveFindings = useMutation({
    mutationFn: async (data: any) => {
      const toFk = (v: any): number | null => {
        const n = parseInt(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      const payload = {
        ClientId: clientId,
        StationId: stationId,
        BreastExamId: toFk(data.BreastExamId),
        PAPSmearId: toFk(data.PAPSmearId),
        ViaVilliId: toFk(data.ViaVilliId),
      };
      const response = await api.post('/oncologies', payload);
      return response.data;
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    onSuccess: () => {
      try {
        localStorage.removeItem(`draft:oncology:${clientId}`);
      } catch {
        /* ignore */
      }
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          'Save failed after 3 attempts. Please check your connection and retry.',
        { duration: 6000 }
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyValue) {
      toast.error('Please record at least one screening result before saving.');
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
      <div
        style={{
          background: `${oceanColors.danger}10`,
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          border: `1px solid ${oceanColors.danger}30`,
        }}
      >
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
              cursor: 'pointer',
            }}
          >
            Back to Search
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: oceanColors.textDark,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Shield size={20} style={{ color: oceanColors.deep }} />
              Oncology / Cancer Screening
            </h2>
            <p style={{ fontSize: '13px', color: oceanColors.textLight, marginTop: '4px' }}>
              Patient: {clientName} (ID: {clientIdNumber}) • Station:{' '}
              <strong style={{ color: oceanColors.textDark }}>{currentStationName}</strong>
            </p>
          </div>
          <div
            style={{
              padding: '4px 12px',
              background: `${oceanColors.mid}15`,
              borderRadius: '20px',
              fontSize: '12px',
              color: oceanColors.mid,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={14} />
            Oncology Capture
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Gender info banner — corrected medical note */}
        <div
          style={{
            background: `${oceanColors.gold}15`,
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          {isFemale ? (
            <>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: oceanColors.deep,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: 'white', fontSize: '16px' }}>♀</span>
              </div>
              <div>
                <strong style={{ color: oceanColors.deep }}>Female Patient</strong>
                <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>
                  All three screenings are applicable — Breast Exam, PAP Smear, and VIA Villi.
                </p>
              </div>
            </>
          ) : isMale ? (
            <>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: oceanColors.deep,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: 'white', fontSize: '16px' }}>♂</span>
              </div>
              <div>
                <strong style={{ color: oceanColors.deep }}>Male Patient</strong>
                <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>
                  Breast Exam is applicable to both males and females. PAP Smear and VIA Villi are for female patients only.
                </p>
              </div>
            </>
          ) : (
            <>
              <User size={24} style={{ color: oceanColors.deep, flexShrink: 0 }} />
              <div>
                <strong style={{ color: oceanColors.deep }}>Patient</strong>
                <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>
                  Record appropriate screening based on gender.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Breast Exam — applicable to both sexes */}
        <div style={{ marginBottom: '24px' }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: oceanColors.deep,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Heart size={18} /> Breast Exam
          </h3>
          <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>
            Result
          </label>
          <select
            value={formData.BreastExamId}
            onChange={(e) => setFormData({ ...formData, BreastExamId: parseInt(e.target.value) })}
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              borderRadius: '8px',
            }}
          >
            <option value="0">Not performed</option>
            {breastExamValues?.map((v: any) => (
              <option key={v.Id} value={v.Id}>
                {v.Title}
              </option>
            ))}
          </select>
        </div>

        {/* PAP Smear — female only */}
        <div style={{ marginBottom: '24px', opacity: isFemale ? 1 : 0.6 }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: oceanColors.deep,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Activity size={18} /> PAP Smear
          </h3>
          <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>
            Result
          </label>
          <select
            value={formData.PAPSmearId}
            onChange={(e) => setFormData({ ...formData, PAPSmearId: parseInt(e.target.value) })}
            disabled={!isFemale}
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              borderRadius: '8px',
            }}
          >
            <option value="0">Not performed</option>
            {papSmearValues?.map((v: any) => (
              <option key={v.Id} value={v.Id}>
                {v.Title}
              </option>
            ))}
          </select>
          {!isFemale && (
            <p style={{ fontSize: '11px', color: oceanColors.warning, marginTop: '4px' }}>
              PAP Smear is for female patients only.
            </p>
          )}
        </div>

        {/* VIA Villi — female only */}
        <div style={{ marginBottom: '24px', opacity: isFemale ? 1 : 0.6 }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: oceanColors.deep,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Activity size={18} /> VIA Villi
          </h3>
          <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>
            Result
          </label>
          <select
            value={formData.ViaVilliId}
            onChange={(e) => setFormData({ ...formData, ViaVilliId: parseInt(e.target.value) })}
            disabled={!isFemale}
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${oceanColors.mid}30`,
              borderRadius: '8px',
            }}
          >
            <option value="0">Not performed</option>
            {viaVilliValues?.map((v: any) => (
              <option key={v.Id} value={v.Id}>
                {v.Title}
              </option>
            ))}
          </select>
          {!isFemale && (
            <p style={{ fontSize: '11px', color: oceanColors.warning, marginTop: '4px' }}>
              VIA Villi is for female patients only.
            </p>
          )}
        </div>

        {/* Action buttons */}
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
                color: oceanColors.textDark,
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saveFindings.isPending || !hasAnyValue}
            style={{
              flex: 2,
              padding: '12px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              border: 'none',
              borderRadius: '8px',
              color: oceanColors.mid,
              fontWeight: 'bold',
              cursor: saveFindings.isPending || !hasAnyValue ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: saveFindings.isPending || !hasAnyValue ? 0.6 : 1,
            }}
          >
            {saveFindings.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {saveFindings.isPending ? 'Saving…' : 'Save Oncology Screening'}
          </button>
        </div>

        {!hasAnyValue && (
          <p
            style={{
              fontSize: '12px',
              color: oceanColors.textLight,
              textAlign: 'center',
              marginTop: '12px',
              fontStyle: 'italic',
            }}
          >
            Record at least one screening result to enable Save
          </p>
        )}
      </form>
    </div>
  );
}
