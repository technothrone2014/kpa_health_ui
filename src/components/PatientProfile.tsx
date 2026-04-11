import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  X, Activity, Heart, Scale, Droplets, AlertTriangle, CheckCircle, 
  Calendar, TrendingUp, TrendingDown, FileText, Download, Eye,
  User, Phone, MapPin, Briefcase, Anchor, Clock, Shield,
  ArrowUp, ArrowDown, Minus, Bell, HeartPulse, Thermometer, Syringe
} from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import * as XLSX from 'xlsx';
import api from '../api/client';

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

export default function PatientProfile({ patient, onClose }: PatientProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'history'>('overview');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch patient's tallies/visits
  const { data: visits, isLoading: visitsLoading, error: visitsError } = useQuery({
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
  
  // For BP and RBS: "NORMAL" is good, anything else is abnormal
  const abnormalReadings = {
    bp: visits?.filter((v: any) => v.bpstatus !== 'NORMAL').length || 0,
    rbs: visits?.filter((v: any) => v.rbsstatus !== 'NORMAL').length || 0,
  };
  
  // For BMI: "NORMAL" is good, "OVERWEIGHT" and "OBESE" are concerns
  const bmiAbnormal = visits?.filter((v: any) => v.bmistatus === 'OVERWEIGHT' || v.bmistatus === 'OBESE').length || 0;
  const bmiNormal = visits?.filter((v: any) => v.bmistatus === 'NORMAL').length || 0;
  const bmiUnderweight = visits?.filter((v: any) => v.bmistatus === 'UNDERWEIGHT').length || 0;
  
  const abnormalPercentage = {
    bp: totalVisits > 0 ? ((abnormalReadings.bp / totalVisits) * 100).toFixed(1) : '0',
    bmi: totalVisits > 0 ? ((bmiAbnormal / totalVisits) * 100).toFixed(1) : '0',
    rbs: totalVisits > 0 ? ((abnormalReadings.rbs / totalVisits) * 100).toFixed(1) : '0',
  };

  // For health status cards - different logic for each metric
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
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${oceanColors.mid}20`, background: '#f8fafc' }}>
          {['overview', 'trends', 'history'].map((tab) => (
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
                gap: '8px'
              }}
            >
              {tab === 'overview' && <Eye size={18} />}
              {tab === 'trends' && <TrendingUp size={18} />}
              {tab === 'history' && <FileText size={18} />}
              <span style={{ textTransform: 'capitalize' }}>{tab}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              margin: '8px 16px',
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
            Export History
          </button>
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

              {/* Health Status Cards - Updated with correct BMI logic */}
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

              {/* Latest Readings - Rest of the component remains the same */}
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
                      {visits?.slice(0, 5).map((visit: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${oceanColors.mid}20` }}>
                          <td style={{ padding: '12px' }}>{format(new Date(visit.date), 'MMM dd, yyyy')}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{visit.systolic}/{visit.diastolic}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              background: visit.bpstatus === 'NORMAL' ? `${oceanColors.success}20` : `${oceanColors.danger}20`,
                              color: visit.bpstatus === 'NORMAL' ? oceanColors.success : oceanColors.danger
                            }}>
                              {visit.bpstatus}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{visit.bmivalue}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              background: visit.bmistatus === 'NORMAL' ? `${oceanColors.success}20` : 
                                       visit.bmistatus === 'OVERWEIGHT' ? `${oceanColors.warning}20` : `${oceanColors.danger}20`,
                              color: visit.bmistatus === 'NORMAL' ? oceanColors.success : 
                                     visit.bmistatus === 'OVERWEIGHT' ? oceanColors.warning : oceanColors.danger
                            }}>
                              {visit.bmistatus}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{visit.rbsvalue}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              background: visit.rbsstatus === 'NORMAL' ? `${oceanColors.success}20` : `${oceanColors.danger}20`,
                              color: visit.rbsstatus === 'NORMAL' ? oceanColors.success : oceanColors.danger
                            }}>
                              {visit.rbsstatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Trends and History tabs remain the same as before */}
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
                  {visits?.map((visit: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${oceanColors.mid}20` }}>
                      <td style={{ padding: '12px' }}>{format(new Date(visit.date), 'PPP')}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{visit.systolic}/{visit.diastolic}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          background: visit.bpstatus === 'NORMAL' ? `${oceanColors.success}20` : `${oceanColors.danger}20`,
                          color: visit.bpstatus === 'NORMAL' ? oceanColors.success : oceanColors.danger
                        }}>
                          {visit.bpstatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{visit.bmivalue}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          background: visit.bmistatus === 'NORMAL' ? `${oceanColors.success}20` : `${oceanColors.danger}20`,
                          color: visit.bmistatus === 'NORMAL' ? oceanColors.success : oceanColors.danger
                        }}>
                          {visit.bmistatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{visit.rbsvalue}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          background: visit.rbsstatus === 'NORMAL' ? `${oceanColors.success}20` : `${oceanColors.danger}20`,
                          color: visit.rbsstatus === 'NORMAL' ? oceanColors.success : oceanColors.danger
                        }}>
                          {visit.rbsstatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{visit.weight} kg</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{visit.height} cm</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{visit.whratio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}