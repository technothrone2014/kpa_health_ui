import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Activity, Heart, Scale, Droplets, Save, Loader2 } from 'lucide-react';
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

interface FieldFindingsProps {
  clientId: number;
  clientName: string;
  stationId: number;
  onSuccess?: () => void;
}

export default function FieldFindings({ clientId, clientName, stationId, onSuccess }: FieldFindingsProps) {
  const [formData, setFormData] = useState({
    Age: '',
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

  // Fetch BMI interpretation values
  const { data: bmiValues } = useQuery({
    queryKey: ['bmi-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/bmi-values');
      return response.data;
    },
  });

  // Fetch BP interpretation values
  const { data: bpValues } = useQuery({
    queryKey: ['bp-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/bp-values');
      return response.data;
    },
  });

  // Fetch RBS interpretation values
  const { data: rbsValues } = useQuery({
    queryKey: ['rbs-values'],
    queryFn: async () => {
      const response = await api.get('/lookups/rbs-values');
      return response.data;
    },
  });

  // Calculate BMI
  const calculateBMI = (weight: number, height: number): number => {
    if (weight && height && height > 0) {
      const heightInMeters = height / 100;
      return weight / (heightInMeters * heightInMeters);
    }
    return 0;
  };

  // Calculate Waist-Hip Ratio
  const calculateWHR = (waist: number, hip: number): number => {
    if (waist && hip && hip > 0) {
      return waist / hip;
    }
    return 0;
  };

  // Get BMI interpretation
  const getBMIInterpretation = (bmi: number): number => {
    if (bmiValues) {
      if (bmi < 18.5) return bmiValues.find((v: any) => v.Title === 'UNDERWEIGHT')?.Id || 1;
      if (bmi < 25) return bmiValues.find((v: any) => v.Title === 'NORMAL')?.Id || 2;
      if (bmi < 30) return bmiValues.find((v: any) => v.Title === 'OVERWEIGHT')?.Id || 3;
      return bmiValues.find((v: any) => v.Title === 'OBESE')?.Id || 4;
    }
    return 2;
  };

  // Get BP interpretation
  const getBPInterpretation = (systolic: number, diastolic: number): number => {
    if (bpValues) {
      if (systolic < 120 && diastolic < 80) return bpValues.find((v: any) => v.Title === 'NORMAL')?.Id || 1;
      if (systolic < 130 && diastolic < 80) return bpValues.find((v: any) => v.Title === 'ELEVATED')?.Id || 2;
      if (systolic < 140 || diastolic < 90) return bpValues.find((v: any) => v.Title === 'STAGE I HYPERTENSION')?.Id || 3;
      return bpValues.find((v: any) => v.Title === 'STAGE II HYPERTENSION')?.Id || 4;
    }
    return 1;
  };

  // Save field findings
  const saveFindings = useMutation({
    mutationFn: async (data: any) => {
      const bmi = calculateBMI(parseFloat(data.Weight), parseFloat(data.Height));
      const whr = calculateWHR(parseFloat(data.Waist), parseFloat(data.Hip));
      
      const payload = {
        ClientId: clientId,
        StationId: stationId,
        Age: parseInt(data.Age),
        Weight: parseFloat(data.Weight),
        Height: parseFloat(data.Height),
        BMIValue: bmi,
        BMIINTValueId: getBMIInterpretation(bmi),
        Waist: parseFloat(data.Waist),
        Hip: parseFloat(data.Hip),
        WHRatio: whr,
        Systolic: parseInt(data.Systolic),
        Diastolic: parseInt(data.Diastolic),
        BPINTValueId: getBPInterpretation(parseInt(data.Systolic), parseInt(data.Diastolic)),
        RBSValue: parseFloat(data.RBSValue),
        RBSINTValueId: 1, // Calculate based on value
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

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '900px',
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
          Field Findings
        </h2>
        <p style={{ fontSize: '13px', color: oceanColors.textLight, marginTop: '4px' }}>
          Patient: {clientName} | Station ID: {stationId}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Anthropometric Measurements */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={18} /> Anthropometric Measurements
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Age (years)</label>
              <input
                type="number"
                value={formData.Age}
                onChange={(e) => setFormData({ ...formData, Age: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.Weight}
                onChange={(e) => setFormData({ ...formData, Weight: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Height (cm)</label>
              <input
                type="number"
                step="0.1"
                value={formData.Height}
                onChange={(e) => setFormData({ ...formData, Height: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Waist (cm)</label>
              <input
                type="number"
                step="0.1"
                value={formData.Waist}
                onChange={(e) => setFormData({ ...formData, Waist: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Hip (cm)</label>
              <input
                type="number"
                step="0.1"
                value={formData.Hip}
                onChange={(e) => setFormData({ ...formData, Hip: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
          </div>
        </div>

        {/* Blood Pressure */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={18} /> Blood Pressure
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Systolic (mmHg)</label>
              <input
                type="number"
                value={formData.Systolic}
                onChange={(e) => setFormData({ ...formData, Systolic: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>Diastolic (mmHg)</label>
              <input
                type="number"
                value={formData.Diastolic}
                onChange={(e) => setFormData({ ...formData, Diastolic: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
                required
              />
            </div>
          </div>
        </div>

        {/* Random Blood Sugar */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Droplets size={18} /> Random Blood Sugar
          </h3>
          <div>
            <label style={{ fontSize: '13px', color: oceanColors.textDark, display: 'block', marginBottom: '4px' }}>RBS Value (mg/dL)</label>
            <input
              type="number"
              step="0.1"
              value={formData.RBSValue}
              onChange={(e) => setFormData({ ...formData, RBSValue: e.target.value })}
              style={{ width: '100%', padding: '8px', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px' }}
              required
            />
          </div>
        </div>

        {/* Referrals */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.deep, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> Referrals
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.BMD} onChange={(e) => setFormData({ ...formData, BMD: e.target.checked })} />
              BMD
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.CancerSCN} onChange={(e) => setFormData({ ...formData, CancerSCN: e.target.checked })} />
              Cancer Screening
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.DentalSCN} onChange={(e) => setFormData({ ...formData, DentalSCN: e.target.checked })} />
              Dental Screening
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.ECG} onChange={(e) => setFormData({ ...formData, ECG: e.target.checked })} />
              ECG
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.EyeSCN} onChange={(e) => setFormData({ ...formData, EyeSCN: e.target.checked })} />
              Eye Screening
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.FBS} onChange={(e) => setFormData({ ...formData, FBS: e.target.checked })} />
              FBS
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.HBA1C} onChange={(e) => setFormData({ ...formData, HBA1C: e.target.checked })} />
              HbA1c
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.HepatitisBC} onChange={(e) => setFormData({ ...formData, HepatitisBC: e.target.checked })} />
              Hepatitis B/C
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.Lipid} onChange={(e) => setFormData({ ...formData, Lipid: e.target.checked })} />
              Lipid Profile
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.Microalbumin} onChange={(e) => setFormData({ ...formData, Microalbumin: e.target.checked })} />
              Microalbumin
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.NutritionCounselling} onChange={(e) => setFormData({ ...formData, NutritionCounselling: e.target.checked })} />
              Nutrition Counselling
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.PSA} onChange={(e) => setFormData({ ...formData, PSA: e.target.checked })} />
              PSA
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saveFindings.isPending}
          style={{
            width: '100%',
            padding: '12px',
            background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
            border: 'none',
            borderRadius: '8px',
            color: oceanColors.mid,
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: saveFindings.isPending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: saveFindings.isPending ? 0.7 : 1
          }}
        >
          {saveFindings.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Save Field Findings
        </button>
      </form>
    </div>
  );
}
