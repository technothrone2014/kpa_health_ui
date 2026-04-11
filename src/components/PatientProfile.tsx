import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  X, Activity, Heart, Scale, Droplets, AlertTriangle, CheckCircle, 
  Calendar, TrendingUp, TrendingDown, FileText, Download, Eye,
  User, Phone, MapPin, Briefcase, Anchor, Clock, Shield,
  ArrowUp, ArrowDown, Minus, Bell, HeartPulse, Thermometer, Syringe,
  Bot, Sparkles, Brain, Lightbulb, Loader2, Stethoscope, ClipboardList,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import * as XLSX from 'xlsx';
import api from '../api/client';
import aiService from '../api/aiService';
import AIAssistant from './AIAssistant';

// Oceanic Theme Colors
const oceanColors = {
  deep: '#0B2F9E',
  mid: '#1A4D8C',
  light: '#2B7BA8',
  surface: '#4AA3C2',
  wave: '#6EC8D9',
  foam: '#A8E6CF',
  gold: '#FFD700',
  navy: '#0A1C40',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  textDark: '#1F2937',
  textLight: '#6B7280',
};

interface PatientProfileProps {
  patient: {
    Id: number;
    FullName: string;
    IDNumber: string;
    PhoneNumber: string;
    GenderTitle: string;
    CategoryTitle: string;
    StationTitle: string;
    Status: boolean;
  };
  onClose: () => void;
}

// Helper function to get status color for display
const getStatusColor = (status: string, type: 'bp' | 'bmi' | 'rbs') => {
  if (type === 'bmi') {
    if (status === 'NORMAL') return { bg: `${oceanColors.success}20`, color: oceanColors.success, text: 'Normal' };
    if (status === 'OVERWEIGHT') return { bg: `${oceanColors.warning}20`, color: oceanColors.warning, text: 'Overweight' };
    if (status === 'OBESE') return { bg: `${oceanColors.danger}20`, color: oceanColors.danger, text: 'Obese' };
    if (status === 'UNDERWEIGHT') return { bg: `${oceanColors.info}20`, color: oceanColors.info, text: 'Underweight' };
    return { bg: `${oceanColors.textLight}20`, color: oceanColors.textLight, text: status };
  } else {
    if (status === 'NORMAL') return { bg: `${oceanColors.success}20`, color: oceanColors.success, text: 'Normal' };
    if (status === 'PRE-HYPERTENSION') return { bg: `${oceanColors.warning}20`, color: oceanColors.warning, text: 'Pre-Hypertension' };
    if (status.includes('HYPERTENSION')) return { bg: `${oceanColors.danger}20`, color: oceanColors.danger, text: status };
    if (status === 'HIGH' || status === 'ELEVATED') return { bg: `${oceanColors.danger}20`, color: oceanColors.danger, text: status };
    return { bg: `${oceanColors.textLight}20`, color: oceanColors.textLight, text: status };
  }
};

export default function PatientProfile({ patient, onClose }: PatientProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'history' | 'insights'>('overview');
  const [isExporting, setIsExporting] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Fetch patient's tallies/visits
  const { data: visits, isLoading: visitsLoading, error: visitsError, refetch: refetchVisits } = useQuery({
    queryKey: ['patient-visits', patient.Id],
    queryFn: async () => {
      const response = await api.get(`/patients/${patient.Id}/visits`);
      return response.data;
    },
  });

  // Fetch patient's health trends
  const { data: trends, isLoading: trendsLoading, error: trendsError } = useQuery({
    queryKey: ['patient-trends', patient.Id],
    queryFn: async () => {
      const response = await api.get(`/patients/${patient.Id}/trends`);
      return response.data;
    },
  });

  // Generate AI Insights when insights tab is opened
  const generateInsights = async () => {
    if (!visits || visits.length === 0) {
      setInsightsError("No health data available for analysis");
      return;
    }

    setIsLoadingInsights(true);
    setInsightsError(null);
    setAiInsights(null);

    try {
      // Prepare patient data summary for AI - MASK PERSONAL INFO
      const patientSummary = {
        id: patient.IDNumber,  // Use ID number (Chk No) instead of name
        category: patient.CategoryTitle,
        station: patient.StationTitle,
        gender: patient.GenderTitle,
        totalVisits: visits.length,
        bloodPressureReadings: visits.map((v: any) => ({
          date: v.date,
          systolic: v.systolic,
          diastolic: v.diastolic,
          status: v.bpstatus
        })),
        bmiReadings: visits.map((v: any) => ({
          date: v.date,
          value: v.bmivalue,
          status: v.bmistatus
        })),
        rbsReadings: visits.map((v: any) => ({
          date: v.date,
          value: v.rbsvalue,
          status: v.rbsstatus
        })),
        metrics: {
          abnormalBP: visits.filter((v: any) => v.bpstatus !== 'NORMAL').length,
          abnormalBMI: visits.filter((v: any) => v.bmistatus === 'OVERWEIGHT' || v.bmistatus === 'OBESE').length,
          abnormalRBS: visits.filter((v: any) => v.rbsstatus !== 'NORMAL').length,
        }
      };

      const systemPrompt = `You are Unesi, a professional medical AI assistant for Kenya Ports Authority's EAP Health Week. 
  You are analyzing patient health data to provide "Sister's Insights" - a clinical summary for nurses and medical officers.

  Patient Reference: CHK-${patientSummary.id}
  Category: ${patientSummary.category}
  Station: ${patientSummary.station}
  Total Clinical Visits: ${patientSummary.totalVisits}

  Health Metrics Summary:
  - Abnormal Blood Pressure Readings: ${patientSummary.metrics.abnormalBP} out of ${patientSummary.totalVisits} visits
  - Concerning BMI Readings (Overweight/Obese): ${patientSummary.metrics.abnormalBMI} out of ${patientSummary.totalVisits} visits
  - Abnormal Random Blood Sugar Readings: ${patientSummary.metrics.abnormalRBS} out of ${patientSummary.totalVisits} visits

  Recent Clinical Data:
  Blood Pressure: ${JSON.stringify(patientSummary.bloodPressureReadings.slice(-3))}
  BMI: ${JSON.stringify(patientSummary.bmiReadings.slice(-3))}
  RBS: ${JSON.stringify(patientSummary.rbsReadings.slice(-3))}

  Provide a professional "Sister's Insights" clinical report that includes:

  1. CLINICAL SUMMARY - Brief objective assessment of the patient's health status based on available data

  2. KEY CLINICAL FINDINGS - Notable patterns, abnormalities, or concerns identified in the data

  3. TREND ANALYSIS - Observed changes or consistent patterns over the visit history

  4. CLINICAL RECOMMENDATIONS - Evidence-based suggestions for follow-up care

  5. RISK ASSESSMENT - Identify any elevated risk factors requiring attention

  Important Guidelines:
  - Use the patient reference CHK-${patientSummary.id} only, not their name
  - Maintain professional, objective clinical language
  - Base all observations solely on the provided data
  - Include appropriate medical disclaimers
  - Do not make definitive diagnoses; use suggestive language like "may indicate", "suggests", "requires investigation"
  - Focus on actionable insights for the clinical team

  Format the response with clear section headers for easy reading by medical staff.`;

      const response = await aiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please provide Sister's Insights for patient CHK-${patientSummary.id} (${patientSummary.category}) based on their ${patientSummary.totalVisits} clinical visits.` }
        ],
        temperature: 0.3,
        max_tokens: 2048,
      });

      setAiInsights(response.content);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setInsightsError('Unable to generate AI insights at this time. Please try again later.');
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Generate insights when insights tab is activated
  useEffect(() => {
    if (activeTab === 'insights' && visits && !aiInsights && !isLoadingInsights && !insightsError) {
      generateInsights();
    }
  }, [activeTab, visits]);

  if (visitsError || trendsError) {
    console.error('API Errors:', { visitsError, trendsError });
  }

  if (visitsLoading || trendsLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '40px' }}>
          Loading patient data...
        </div>
      </div>
    );
  }

  // Calculate health metrics
  const totalVisits = visits?.length || 0;
  
  const abnormalReadings = {
    bp: visits?.filter((v: any) => v.bpstatus !== 'NORMAL').length || 0,
    rbs: visits?.filter((v: any) => v.rbsstatus !== 'NORMAL').length || 0,
  };
  
  const bmiAbnormal = visits?.filter((v: any) => v.bmistatus === 'OVERWEIGHT' || v.bmistatus === 'OBESE').length || 0;
  const bmiNormal = visits?.filter((v: any) => v.bmistatus === 'NORMAL').length || 0;
  const bmiUnderweight = visits?.filter((v: any) => v.bmistatus === 'UNDERWEIGHT').length || 0;
  
  const abnormalPercentage = {
    bp: totalVisits > 0 ? ((abnormalReadings.bp / totalVisits) * 100).toFixed(1) : '0',
    bmi: totalVisits > 0 ? ((bmiAbnormal / totalVisits) * 100).toFixed(1) : '0',
    rbs: totalVisits > 0 ? ((abnormalReadings.rbs / totalVisits) * 100).toFixed(1) : '0',
  };

  const getBPStatusInfo = (percentage: string) => {
    const percent = parseInt(percentage);
    if (percent === 0) {
      return { color: oceanColors.success, icon: CheckCircle, text: 'Excellent' };
    } else if (percent < 30) {
      return { color: oceanColors.warning, icon: AlertTriangle, text: 'Monitor' };
    } else {
      return { color: oceanColors.danger, icon: AlertTriangle, text: 'Critical' };
    }
  };

  const getBMIStatusInfo = () => {
    if (bmiNormal === totalVisits && totalVisits > 0) {
      return { color: oceanColors.success, icon: CheckCircle, text: 'Excellent - All Normal' };
    } else if (bmiNormal > 0 && bmiAbnormal === 0 && bmiUnderweight === 0) {
      return { color: oceanColors.success, icon: CheckCircle, text: 'All Normal' };
    } else if (bmiAbnormal > 0 || bmiUnderweight > 0) {
      const percent = parseInt(abnormalPercentage.bmi);
      if (percent < 30) {
        return { color: oceanColors.warning, icon: AlertTriangle, text: 'Monitor - Some Concerns' };
      } else {
        return { color: oceanColors.danger, icon: AlertTriangle, text: 'Critical - High Risk' };
      }
    }
    return { color: oceanColors.info, icon: CheckCircle, text: 'No Data' };
  };

  const getRBSStatusInfo = (percentage: string) => {
    const percent = parseInt(percentage);
    if (percent === 0) {
      return { color: oceanColors.success, icon: CheckCircle, text: 'Excellent' };
    } else if (percent < 30) {
      return { color: oceanColors.warning, icon: AlertTriangle, text: 'Monitor' };
    } else {
      return { color: oceanColors.danger, icon: AlertTriangle, text: 'Critical' };
    }
  };

  const bpStatus = getBPStatusInfo(abnormalPercentage.bp);
  const bmiStatus = getBMIStatusInfo();
  const rbsStatus = getRBSStatusInfo(abnormalPercentage.rbs);

  const hasCriticalAlerts = 
    bpStatus.text === 'Critical' || 
    bmiStatus.text === 'Critical - High Risk' || 
    rbsStatus.text === 'Critical';

  // Prepare chart data
  const chartData = visits?.map((visit: any) => ({
    date: format(new Date(visit.date), 'MMM dd'),
    systolic: visit.systolic,
    diastolic: visit.diastolic,
    bmi: visit.bmivalue,
    rbs: visit.rbsvalue,
  })).reverse() || [];

  // Export function
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = visits?.map((visit: any) => ({
        'Date': format(new Date(visit.date), 'PPP'),
        'Systolic BP': visit.systolic,
        'Diastolic BP': visit.diastolic,
        'BP Status': visit.bpstatus,
        'BMI Value': visit.bmivalue,
        'BMI Status': visit.bmistatus,
        'RBS Value': visit.rbsvalue,
        'RBS Status': visit.rbsstatus,
        'Weight (kg)': visit.weight,
        'Height (cm)': visit.height,
        'Waist (cm)': visit.waist,
        'Hip (cm)': visit.hip,
        'Waist-Hip Ratio': visit.whratio,
      })) || [];

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${patient.FullName}_Health_History`);
      XLSX.writeFile(wb, `${patient.FullName}_${patient.IDNumber}_Health_History.xlsx`);
      
      // Also export insights if available
      if (aiInsights) {
        const insightsData = [{
          'Patient Name': patient.FullName,
          'Patient ID': patient.IDNumber,
          'Generated Date': format(new Date(), 'PPP'),
          'Sister\'s Insights': aiInsights
        }];
        const wsInsights = XLSX.utils.json_to_sheet(insightsData);
        XLSX.utils.book_append_sheet(wb, wsInsights, 'AI_Insights');
      }
      
      XLSX.writeFile(wb, `${patient.FullName}_${patient.IDNumber}_Complete_Health_Report.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      overflow: 'auto'
    }}>
      <div style={{
        width: '90%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        background: oceanColors.white,
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
          padding: '24px 32px',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '24px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px'
              }}>
                👨‍⚕️
              </div>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', margin: 0 }}>{patient.FullName}</h2>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span style={{ color: oceanColors.foam, fontSize: '14px' }}>
                    <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    ID: {patient.IDNumber}
                  </span>
                  <span style={{ color: oceanColors.foam, fontSize: '14px' }}>
                    <Phone size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {patient.PhoneNumber || 'N/A'}
                  </span>
                  <span style={{ color: oceanColors.foam, fontSize: '14px' }}>
                    <Briefcase size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {patient.CategoryTitle}
                  </span>
                  <span style={{ color: oceanColors.foam, fontSize: '14px' }}>
                    <Anchor size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {patient.StationTitle}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowAIAssistant(true)}
                style={{
                  padding: '8px 16px',
                  background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                  border: 'none',
                  borderRadius: '8px',
                  color: oceanColors.navy,
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Bot size={16} />
                Ask Unesi AI
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                style={{
                  padding: '8px 16px',
                  background: oceanColors.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  opacity: isExporting ? 0.6 : 1
                }}
              >
                <Download size={16} />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${oceanColors.mid}20`, background: '#f8fafc', overflowX: 'auto' }}>
          {['overview', 'trends', 'history', 'insights'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '16px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? `3px solid ${oceanColors.gold}` : 'none',
                color: activeTab === tab ? oceanColors.deep : oceanColors.textLight,
                fontWeight: activeTab === tab ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              {tab === 'overview' && <Eye size={18} />}
              {tab === 'trends' && <TrendingUp size={18} />}
              {tab === 'history' && <FileText size={18} />}
              {tab === 'insights' && <Brain size={18} />}
              <span style={{ textTransform: 'capitalize' }}>
                {tab === 'insights' ? "Sister's Insights" : tab}
              </span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px 32px', overflow: 'auto', flex: 1 }}>
          
          {activeTab === 'overview' && (
            <div>
              {/* Alert Banner for Critical Cases */}
              {hasCriticalAlerts && (
                <div style={{
                  background: `${oceanColors.danger}15`,
                  borderLeft: `4px solid ${oceanColors.danger}`,
                  padding: '16px 20px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <AlertTriangle size={24} style={{ color: oceanColors.danger }} />
                  <div>
                    <strong style={{ color: oceanColors.danger }}>Critical Health Alert!</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: oceanColors.textDark }}>
                      {abnormalReadings.bp > 0 && `${abnormalReadings.bp} abnormal BP readings (${abnormalPercentage.bp}%) `}
                      {bmiAbnormal > 0 && `${bmiAbnormal} concerning BMI readings (${abnormalPercentage.bmi}%) `}
                      {abnormalReadings.rbs > 0 && `${abnormalReadings.rbs} abnormal RBS readings (${abnormalPercentage.rbs}%)`}
                      requiring medical attention.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <div style={{
                  background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
                  padding: '20px',
                  borderRadius: '16px',
                  color: 'white'
                }}>
                  <Calendar size={24} style={{ opacity: 0.8, marginBottom: '8px' }} />
                  <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{totalVisits}</p>
                  <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>Total Visits</p>
                </div>
                
                <div style={{
                  background: `linear-gradient(135deg, ${oceanColors.success}30, ${oceanColors.success}10)`,
                  padding: '20px',
                  borderRadius: '16px',
                  border: `1px solid ${oceanColors.success}30`
                }}>
                  <Heart size={24} style={{ color: oceanColors.success, marginBottom: '8px' }} />
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
                    {abnormalReadings.bp}
                  </p>
                  <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>
                    Abnormal BP ({abnormalPercentage.bp}%)
                  </p>
                </div>

                <div style={{
                  background: `linear-gradient(135deg, ${bmiAbnormal > 0 ? oceanColors.warning : oceanColors.success}30, ${bmiAbnormal > 0 ? oceanColors.warning : oceanColors.success}10)`,
                  padding: '20px',
                  borderRadius: '16px',
                  border: `1px solid ${bmiAbnormal > 0 ? oceanColors.warning : oceanColors.success}30`
                }}>
                  <Scale size={24} style={{ color: bmiAbnormal > 0 ? oceanColors.warning : oceanColors.success, marginBottom: '8px' }} />
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
                    {bmiAbnormal}
                  </p>
                  <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>
                    Concerning BMI ({abnormalPercentage.bmi}%)
                  </p>
                </div>

                <div style={{
                  background: `linear-gradient(135deg, ${oceanColors.danger}30, ${oceanColors.danger}10)`,
                  padding: '20px',
                  borderRadius: '16px',
                  border: `1px solid ${oceanColors.danger}30`
                }}>
                  <Droplets size={24} style={{ color: oceanColors.danger, marginBottom: '8px' }} />
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
                    {abnormalReadings.rbs}
                  </p>
                  <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>
                    Abnormal RBS ({abnormalPercentage.rbs}%)
                  </p>
                </div>
              </div>

              {/* Health Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <div style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: `1px solid ${bpStatus.color}30`,
                  background: `${bpStatus.color}10`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <HeartPulse size={24} style={{ color: bpStatus.color }} />
                    <bpStatus.icon size={20} style={{ color: bpStatus.color }} />
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', color: oceanColors.textDark }}>Blood Pressure</h4>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: bpStatus.color, margin: 0 }}>
                    {abnormalReadings.bp}/{totalVisits}
                  </p>
                  <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: '4px 0 0 0' }}>
                    Status: <span style={{ color: bpStatus.color, fontWeight: 'bold' }}>{bpStatus.text}</span>
                  </p>
                </div>

                <div style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: `1px solid ${bmiStatus.color}30`,
                  background: `${bmiStatus.color}10`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <Scale size={24} style={{ color: bmiStatus.color }} />
                    <bmiStatus.icon size={20} style={{ color: bmiStatus.color }} />
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', color: oceanColors.textDark }}>BMI</h4>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: bmiStatus.color, margin: 0 }}>
                    {bmiNormal} Normal / {bmiAbnormal} Concern
                  </p>
                  <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: '4px 0 0 0' }}>
                    Status: <span style={{ color: bmiStatus.color, fontWeight: 'bold' }}>{bmiStatus.text}</span>
                  </p>
                </div>

                <div style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: `1px solid ${rbsStatus.color}30`,
                  background: `${rbsStatus.color}10`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <Droplets size={24} style={{ color: rbsStatus.color }} />
                    <rbsStatus.icon size={20} style={{ color: rbsStatus.color }} />
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', color: oceanColors.textDark }}>Random Blood Sugar</h4>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: rbsStatus.color, margin: 0 }}>
                    {abnormalReadings.rbs}/{totalVisits}
                  </p>
                  <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: '4px 0 0 0' }}>
                    Status: <span style={{ color: rbsStatus.color, fontWeight: 'bold' }}>{rbsStatus.text}</span>
                  </p>
                </div>
              </div>

              {/* Latest Readings */}
              <div>
                <h3 style={{ marginBottom: '16px', color: oceanColors.textDark }}>Latest Health Readings</h3>
                <div style={{ overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>BP (Systolic/Diastolic)</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>BP Status</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>BMI</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>BMI Status</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>RBS</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>RBS Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visits?.slice(0, 5).map((visit: any, idx: number) => {
                        const bpColorInfo = getStatusColor(visit.bpstatus, 'bp');
                        const bmiColorInfo = getStatusColor(visit.bmistatus, 'bmi');
                        const rbsColorInfo = getStatusColor(visit.rbsstatus, 'rbs');
                        
                        return (
                          <tr key={idx} style={{ borderBottom: `1px solid ${oceanColors.mid}20` }}>
                            <td style={{ padding: '12px' }}>{format(new Date(visit.date), 'MMM dd, yyyy')}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{visit.systolic}/{visit.diastolic}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                background: bpColorInfo.bg,
                                color: bpColorInfo.color
                              }}>
                                {bpColorInfo.text}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{visit.bmivalue}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                background: bmiColorInfo.bg,
                                color: bmiColorInfo.color
                              }}>
                                {bmiColorInfo.text}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{visit.rbsvalue}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                background: rbsColorInfo.bg,
                                color: rbsColorInfo.color
                              }}>
                                {rbsColorInfo.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div>
              {/* BP Trend Chart */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ marginBottom: '16px', color: oceanColors.textDark }}>
                  <Heart size={18} style={{ display: 'inline', marginRight: '8px' }} />
                  Blood Pressure Trends
                </h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" domain={[80, 200]} label={{ value: 'mmHg', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="systolic" stroke={oceanColors.danger} name="Systolic" strokeWidth={2} />
                      <Line yAxisId="left" type="monotone" dataKey="diastolic" stroke={oceanColors.warning} name="Diastolic" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* BMI Trend Chart */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ marginBottom: '16px', color: oceanColors.textDark }}>
                  <Scale size={18} style={{ display: 'inline', marginRight: '8px' }} />
                  BMI Trends
                </h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[15, 45]} label={{ value: 'BMI', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="bmi" stroke={oceanColors.deep} strokeWidth={2} />
                      <ReferenceLine y={18.5} stroke={oceanColors.warning} strokeDasharray="3 3" label="Underweight" />
                      <ReferenceLine y={25} stroke={oceanColors.warning} strokeDasharray="3 3" label="Overweight" />
                      <ReferenceLine y={30} stroke={oceanColors.danger} strokeDasharray="3 3" label="Obese" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RBS Trend Chart */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ marginBottom: '16px', color: oceanColors.textDark }}>
                  <Droplets size={18} style={{ display: 'inline', marginRight: '8px' }} />
                  Random Blood Sugar Trends
                </h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 300]} label={{ value: 'mg/dL', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="rbs" stroke={oceanColors.danger} strokeWidth={2} />
                      <ReferenceLine y={140} stroke={oceanColors.warning} strokeDasharray="3 3" label="Elevated" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>BP (Sys/Dia)</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>BP Status</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>BMI</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>BMI Status</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>RBS</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>RBS Status</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Weight</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Height</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Waist/Hip</th>
                  </tr>
                </thead>
                <tbody>
                  {visits?.map((visit: any, idx: number) => {
                    const bpColorInfo = getStatusColor(visit.bpstatus, 'bp');
                    const bmiColorInfo = getStatusColor(visit.bmistatus, 'bmi');
                    const rbsColorInfo = getStatusColor(visit.rbsstatus, 'rbs');
                    
                    return (
                      <tr key={idx} style={{ borderBottom: `1px solid ${oceanColors.mid}20` }}>
                        <td style={{ padding: '12px' }}>{format(new Date(visit.date), 'PPP')}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{visit.systolic}/{visit.diastolic}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            background: bpColorInfo.bg,
                            color: bpColorInfo.color
                          }}>
                            {bpColorInfo.text}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{visit.bmivalue}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            background: bmiColorInfo.bg,
                            color: bmiColorInfo.color
                          }}>
                            {bmiColorInfo.text}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{visit.rbsvalue}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            background: rbsColorInfo.bg,
                            color: rbsColorInfo.color
                          }}>
                            {rbsColorInfo.text}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{visit.weight} kg</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{visit.height} cm</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{visit.whratio}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'insights' && (
            <div>
              {/* Header with Patient Reference - Masked */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Brain size={24} style={{ color: oceanColors.gold }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
                      Sister's Insights
                    </h3>
                    <p style={{ fontSize: '13px', color: oceanColors.textLight, margin: '4px 0 0 0' }}>
                      AI-powered clinical analysis | Patient: CHK-{patient.IDNumber} | {patient.CategoryTitle}
                    </p>
                  </div>
                </div>
                
                {/* Patient Context Badges - Professional */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{
                    padding: '4px 12px',
                    background: oceanColors.light,
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: oceanColors.deep,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <User size={12} />
                    {patient.GenderTitle || 'Gender N/A'}
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    background: oceanColors.light,
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: oceanColors.deep,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Anchor size={12} />
                    {patient.StationTitle || 'Station N/A'}
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    background: oceanColors.light,
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: oceanColors.deep,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <ClipboardList size={12} />
                    {totalVisits} Visit(s)
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isLoadingInsights && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px',
                  background: '#f8fafc',
                  borderRadius: '16px'
                }}>
                  <Loader2 size={40} style={{ color: oceanColors.deep, animation: 'spin 1s linear infinite' }} />
                  <p style={{ marginTop: '16px', color: oceanColors.textLight }}>Unesi is analyzing clinical data...</p>
                </div>
              )}

              {/* Error State */}
              {insightsError && (
                <div style={{
                  padding: '20px',
                  background: `${oceanColors.danger}10`,
                  borderLeft: `4px solid ${oceanColors.danger}`,
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertTriangle size={20} style={{ color: oceanColors.danger }} />
                    <p style={{ color: oceanColors.danger, margin: 0 }}>{insightsError}</p>
                  </div>
                  <button
                    onClick={generateInsights}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      background: oceanColors.deep,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <RefreshCw size={14} />
                    Try Again
                  </button>
                </div>
              )}

              {/* AI Insights Display */}
              {aiInsights && !isLoadingInsights && (
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '24px',
                  lineHeight: 1.6,
                  border: `1px solid ${oceanColors.mid}20`
                }}>
                  {/* Professional Disclaimer */}
                  <div style={{
                    background: `${oceanColors.info}10`,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    fontSize: '12px',
                    color: oceanColors.textLight,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderLeft: `3px solid ${oceanColors.info}`
                  }}>
                    <Sparkles size={14} />
                    <span>AI-generated clinical insights based on available data. Not a substitute for professional medical judgment.</span>
                  </div>

                  <div style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '14px',
                    color: oceanColors.textDark,
                    fontFamily: 'Verdana, Geneva, sans-serif'
                  }}>
                    {aiInsights.split('\n').map((paragraph, idx) => {
                      // Handle markdown-style headers
                      if (paragraph.startsWith('# ')) {
                        return (
                          <h4 key={idx} style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: oceanColors.deep,
                            marginTop: '20px',
                            marginBottom: '12px',
                            borderLeft: `3px solid ${oceanColors.gold}`,
                            paddingLeft: '12px'
                          }}>
                            {paragraph.replace(/^#+\s*/, '')}
                          </h4>
                        );
                      } else if (paragraph.startsWith('## ')) {
                        return (
                          <h5 key={idx} style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: oceanColors.mid,
                            marginTop: '16px',
                            marginBottom: '8px'
                          }}>
                            {paragraph.replace(/^#+\s*/, '')}
                          </h5>
                        );
                      } else if (paragraph.startsWith('### ')) {
                        return (
                          <h6 key={idx} style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: oceanColors.surface,
                            marginTop: '12px',
                            marginBottom: '6px'
                          }}>
                            {paragraph.replace(/^#+\s*/, '')}
                          </h6>
                        );
                      } else if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('• ')) {
                        return (
                          <li key={idx} style={{
                            marginLeft: '20px',
                            marginBottom: '8px',
                            color: oceanColors.textDark
                          }}>
                            {paragraph.replace(/^[-•]\s*/, '')}
                          </li>
                        );
                      } else if (paragraph.trim().match(/^\d+\./)) {
                        return (
                          <li key={idx} style={{
                            marginLeft: '20px',
                            marginBottom: '8px',
                            color: oceanColors.textDark
                          }}>
                            {paragraph}
                          </li>
                        );
                      } else if (paragraph.trim() === '') {
                        return <div key={idx} style={{ height: '8px' }} />;
                      } else {
                        return (
                          <p key={idx} style={{ marginBottom: '12px', lineHeight: 1.6 }}>
                            {paragraph}
                          </p>
                        );
                      }
                    })}
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{
                    marginTop: '24px',
                    paddingTop: '16px',
                    borderTop: `1px solid ${oceanColors.mid}20`,
                    display: 'flex',
                    gap: '16px',
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={generateInsights}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: `1px solid ${oceanColors.deep}`,
                        borderRadius: '8px',
                        color: oceanColors.deep,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = oceanColors.light;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <RefreshCw size={14} />
                      Regenerate Insights
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiInsights);
                        // Optional: Add toast notification
                      }}
                      style={{
                        padding: '8px 16px',
                        background: oceanColors.deep,
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = oceanColors.mid;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = oceanColors.deep;
                      }}
                    >
                      <ClipboardList size={14} />
                      Copy to Clipboard
                    </button>
                  </div>
                </div>
              )}

              {/* Empty State - First Time */}
              {!aiInsights && !isLoadingInsights && !insightsError && (
                <div style={{
                  textAlign: 'center',
                  padding: '60px',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  border: `1px dashed ${oceanColors.mid}30`
                }}>
                  <Sparkles size={48} style={{ color: oceanColors.textLight, marginBottom: '16px' }} />
                  <p style={{ color: oceanColors.textLight, marginBottom: '8px' }}>
                    Click below to generate AI-powered clinical analysis
                  </p>
                  <p style={{ fontSize: '12px', color: oceanColors.textLight }}>
                    Unesi will analyze {totalVisits} health records for patient CHK-{patient.IDNumber}
                  </p>
                  <button
                    onClick={generateInsights}
                    style={{
                      marginTop: '20px',
                      padding: '10px 24px',
                      background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Brain size={18} />
                    Generate Sister's Insights
                  </button>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <AIAssistant 
          patientData={patient} 
          onClose={() => setShowAIAssistant(false)} 
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
