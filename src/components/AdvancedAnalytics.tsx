import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Filter, Calendar, Download, Search, TrendingUp, 
  BarChart3, ChevronDown, RefreshCw, Activity, Heart,
  Scale, Droplets, FileSpreadsheet, FileJson
} from 'lucide-react';
import { format, subMonths, subYears } from 'date-fns';
import * as XLSX from 'xlsx';
import api from '../api/client';

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

interface FilterState {
  startDate: string;
  endDate: string;
  category: string;
  station: string;
}

// Date presets for quick selection
const datePresets = [
  { label: 'All Data (2021-Present)', start: '2021-03-01', end: format(new Date(), 'yyyy-MM-dd') },
  { label: 'Last 6 Months', start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
  { label: 'Last Year', start: format(subYears(new Date(), 1), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
  { label: '2025', start: '2025-01-01', end: '2025-12-31' },
  { label: '2024', start: '2024-01-01', end: '2024-12-31' },
  { label: '2023', start: '2023-01-01', end: '2023-12-31' },
  { label: '2022', start: '2022-01-01', end: '2022-12-31' },
  { label: '2021 (Mar-Dec)', start: '2021-03-01', end: '2021-12-31' },
];

export default function AdvancedAnalytics() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    category: 'all',
    station: 'all',
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'xlsx'>('xlsx');
  const [activeMetric, setActiveMetric] = useState<'bp' | 'bmi' | 'rbs'>('bp');

  // Fetch stations for filter dropdown
  const { data: stations } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await api.get('/analytics/stations');
      return response.data.data || [];
    },
  });

  // Fetch categories for filter dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/analytics/categories');
      return response.data.data || [];
    },
  });

  // Fetch health trends with filters
  const { data: trends, isLoading: trendsLoading, refetch: refetchTrends } = useQuery({
    queryKey: ['health-trends', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.station !== 'all') params.append('station', filters.station);
      const response = await api.get(`/analytics/trends?${params}`);
      return response.data;
    },
  });

  // Apply date preset
  const applyDatePreset = (preset: typeof datePresets[0]) => {
    setFilters({ ...filters, startDate: preset.start, endDate: preset.end });
  };

  // AI Query handler
  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    try {
      const response = await api.post('/analytics/ai-query', { 
        query: aiQuery,
        filters: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          category: filters.category,
          station: filters.station
        }
      });
      setAiResponse(response.data);
    } catch (error) {
      console.error('AI Query failed:', error);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Export handler
  const handleExport = async () => {
    const params = new URLSearchParams();
    params.append('format', exportFormat);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.category !== 'all') params.append('category', filters.category);
    if (filters.station !== 'all') params.append('station', filters.station);
    
    try {
      const response = await api.get(`/analytics/export?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `health_analytics_${format(new Date(), 'yyyyMMdd')}.${exportFormat === 'xlsx' ? 'xlsx' : exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Calculate summary statistics
  const totalReadings = trends?.reduce((sum: number, day: any) => {
    const dayTotal = parseInt(day.total_readings) || 0;
    return sum + dayTotal;
  }, 0) || 0;

  const avgReadingsPerDay = trends?.length ? Math.round(totalReadings / trends.length) : 0;
  const uniqueDates = trends?.length || 0;

  // Also calculate totals per category for additional insights
  const totalNormalBP = trends?.reduce((sum: number, day: any) => sum + (parseInt(day.normal_bp) || 0), 0) || 0;
  const totalPreHTN = trends?.reduce((sum: number, day: any) => sum + (parseInt(day.pre_hypertension) || 0), 0) || 0;
  const totalHypertension = trends?.reduce((sum: number, day: any) => sum + (parseInt(day.hypertension) || 0), 0) || 0;

  return (
    <div style={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid}, ${oceanColors.light})`,
      padding: '24px',
      fontFamily: 'Verdana, Geneva, sans-serif'
    }}>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Hero Header */}
        <div style={{ 
          position: 'relative',
          marginBottom: '32px',
          overflow: 'hidden',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}>
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: `linear-gradient(90deg, ${oceanColors.navy}, ${oceanColors.deep}, ${oceanColors.mid})` 
          }} />
          
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: `repeating-linear-gradient(0deg, transparent, transparent 8px, ${oceanColors.surface}15 8px, ${oceanColors.surface}25 16px)`,
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  <BarChart3 size={32} style={{ color: oceanColors.navy }} />
                </div>
                <div>
                  <h1 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 'bold', color: oceanColors.white, margin: 0 }}>
                    Advanced Health Analytics
                    <span style={{ color: oceanColors.gold, marginLeft: '12px' }}>📊</span>
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '8px', fontSize: '15px' }}>
                    Deep dive into health trends, export data, and AI-powered insights
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => refetchTrends()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: '12px',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '20px', 
          marginBottom: '24px' 
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '20px',
            border: `1px solid ${oceanColors.wave}30`,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Activity size={20} style={{ color: oceanColors.gold }} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: oceanColors.textDark, margin: 0 }}>Total Readings</h3>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: oceanColors.deep, margin: 0 }}>
              {trendsLoading ? '...' : totalReadings.toLocaleString()}
            </p>
            <p style={{ fontSize: '13px', color: oceanColors.textLight, marginTop: '4px' }}>
              Across {uniqueDates} screening days
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '20px',
            border: `1px solid ${oceanColors.wave}30`,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${oceanColors.success}, ${oceanColors.wave})`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={20} style={{ color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: oceanColors.textDark, margin: 0 }}>Avg Daily Readings</h3>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: oceanColors.success, margin: 0 }}>
              {trendsLoading ? '...' : avgReadingsPerDay.toLocaleString()}
            </p>
            <p style={{ fontSize: '13px', color: oceanColors.textLight, marginTop: '4px' }}>
              Per screening day
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '20px',
            border: `1px solid ${oceanColors.wave}30`,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${oceanColors.warning}, ${oceanColors.gold})`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Heart size={20} style={{ color: oceanColors.navy }} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: oceanColors.textDark, margin: 0 }}>Normal BP</h3>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: oceanColors.success, margin: 0 }}>
              {trendsLoading ? '...' : totalNormalBP.toLocaleString()}
            </p>
            <p style={{ fontSize: '13px', color: oceanColors.textLight, marginTop: '4px' }}>
              {totalReadings > 0 ? `${((totalNormalBP / totalReadings) * 100).toFixed(1)}% of readings` : 'No data'}
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '20px',
            border: `1px solid ${oceanColors.wave}30`,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${oceanColors.danger}, ${oceanColors.warning})`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={20} style={{ color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: oceanColors.textDark, margin: 0 }}>Hypertension</h3>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: oceanColors.danger, margin: 0 }}>
              {trendsLoading ? '...' : totalHypertension.toLocaleString()}
            </p>
            <p style={{ fontSize: '13px', color: oceanColors.textLight, marginTop: '4px' }}>
              {totalReadings > 0 ? `${((totalHypertension / totalReadings) * 100).toFixed(1)}% of readings` : 'No data'}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          border: `1px solid ${oceanColors.wave}30`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                color: oceanColors.navy
              }}
            >
              <Filter size={18} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
              <ChevronDown size={16} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                style={{
                  padding: '10px 16px',
                  border: `1px solid ${oceanColors.surface}40`,
                  borderRadius: '10px',
                  background: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="json">JSON Format</option>
                <option value="csv">CSV Format</option>
                <option value="xlsx">Excel (XLSX)</option>
              </select>
              <button
                onClick={handleExport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: oceanColors.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                <Download size={18} />
                Export Data
              </button>
            </div>
          </div>

          {/* Date Presets */}
          <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {datePresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => applyDatePreset(preset)}
                style={{
                  padding: '6px 14px',
                  background: filters.startDate === preset.start && filters.endDate === preset.end 
                    ? oceanColors.deep 
                    : '#f1f5f9',
                  color: filters.startDate === preset.start && filters.endDate === preset.end 
                    ? 'white' 
                    : oceanColors.textDark,
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: filters.startDate === preset.start && filters.endDate === preset.end ? '600' : '400'
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {showFilters && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px', 
              marginTop: '16px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px'
            }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    border: `1px solid ${oceanColors.surface}40`,
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    border: `1px solid ${oceanColors.surface}40`,
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    border: `1px solid ${oceanColors.surface}40`,
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="all">All Categories</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.Id} value={cat.Title}>{cat.Title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
                  Station
                </label>
                <select
                  value={filters.station}
                  onChange={(e) => setFilters({ ...filters, station: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    border: `1px solid ${oceanColors.surface}40`,
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="all">All Stations</option>
                  {stations?.map((station: any) => (
                    <option key={station.Id} value={station.Title}>{station.Title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Health Trends Table - Full Width */}
        <div style={{ 
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          border: `1px solid ${oceanColors.wave}30`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={20} style={{ color: oceanColors.gold }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
                Daily Health Trends
              </h3>
            </div>
            
            {/* Metric Toggle */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { value: 'bp', label: 'Blood Pressure', icon: Heart },
                { value: 'bmi', label: 'BMI', icon: Scale },
                { value: 'rbs', label: 'Blood Sugar', icon: Droplets }
              ].map((metric) => (
                <button
                  key={metric.value}
                  onClick={() => setActiveMetric(metric.value as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: activeMetric === metric.value ? oceanColors.deep : '#f1f5f9',
                    color: activeMetric === metric.value ? 'white' : oceanColors.textDark,
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <metric.icon size={14} />
                  {metric.label}
                </button>
              ))}
            </div>
          </div>
          
          {trendsLoading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(11, 47, 158, 0.2)',
                borderTop: `3px solid ${oceanColors.deep}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p style={{ color: oceanColors.textLight }}>Loading trend data...</p>
            </div>
          ) : trends && trends.length > 0 ? (
            <div style={{ overflow: 'auto', maxHeight: '400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                  <tr style={{ borderBottom: `2px solid ${oceanColors.surface}30` }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: oceanColors.textDark }}>Date</th>
                    {activeMetric === 'bp' && (
                      <>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Normal BP</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Pre-HTN</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Hypertension</th>
                      </>
                    )}
                    {activeMetric === 'bmi' && (
                      <>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Normal BMI</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Overweight</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Obese</th>
                      </>
                    )}
                    {activeMetric === 'rbs' && (
                      <>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Normal RBS</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Hypoglycemia</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Pre-Diabetic</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Diabetic</th>
                      </>
                    )}
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: oceanColors.textDark }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((day: any, idx: number) => (
                    <tr key={day.date} style={{ 
                      borderBottom: `1px solid ${oceanColors.surface}20`,
                      background: idx % 2 === 0 ? 'white' : '#fafafa'
                    }}>
                      <td style={{ padding: '10px 12px', fontWeight: '500' }}>
                        {format(new Date(day.date), 'MMM dd, yyyy')}
                      </td>
                      {activeMetric === 'bp' && (
                        <>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: oceanColors.success }}>
                            {day.normal_bp || 0}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: oceanColors.warning }}>
                            {day.pre_hypertension || 0}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: oceanColors.danger }}>
                            {day.hypertension || 0}
                          </td>
                        </>
                      )}
                      {activeMetric === 'bmi' && (
                        <>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: oceanColors.success }}>
                            {day.normal_bmi || 0}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: oceanColors.warning }}>
                            {day.overweight || 0}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: oceanColors.danger }}>
                            {day.obese || 0}
                          </td>
                        </>
                      )}
                      {activeMetric === 'rbs' && (
                        <>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: oceanColors.success }}>
                            {day.normal_rbs || 0}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: oceanColors.info }}>
                            {day.hypoglycemia || 0}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: oceanColors.warning }}>
                            {day.pre_diabetic || 0}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: oceanColors.danger }}>
                            {day.diabetic || 0}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 'bold' }}>
                        {day.total_readings || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: oceanColors.textLight }}>
              <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>No data available for the selected date range</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* AI Natural Language Query Section */}
        <div style={{
          background: `linear-gradient(135deg, ${oceanColors.navy}, ${oceanColors.deep})`,
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Search size={22} style={{ color: oceanColors.navy }} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                AI Health Assistant
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '2px' }}>
                Ask natural language questions about your health data
              </p>
            </div>
            <span style={{
              background: 'rgba(255,215,0,0.2)',
              color: oceanColors.gold,
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '500',
              marginLeft: 'auto'
            }}>
              AI-Powered
            </span>
          </div>
          
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '20px' }}>
            Example: "Show me all employees with high blood pressure" or "List patients with abnormal BMI"
          </p>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ask a question about your health data..."
              style={{
                flex: 1,
                padding: '14px 18px',
                borderRadius: '14px',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                background: 'white'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleAiQuery()}
            />
            <button
              onClick={handleAiQuery}
              disabled={isAiLoading}
              style={{
                padding: '14px 28px',
                background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                border: 'none',
                borderRadius: '14px',
                fontWeight: 'bold',
                color: oceanColors.navy,
                cursor: isAiLoading ? 'not-allowed' : 'pointer',
                opacity: isAiLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isAiLoading ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Thinking...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Ask AI
                </>
              )}
            </button>
          </div>
          
          {aiResponse && (
            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '16px',
              backdropFilter: 'blur(8px)'
            }}>
              <p style={{ color: oceanColors.gold, fontWeight: 'bold', marginBottom: '12px', fontSize: '16px' }}>
                💡 Insight: {aiResponse.insight}
              </p>
              {aiResponse.result && aiResponse.result.length > 0 && (
                <div style={{ maxHeight: '250px', overflow: 'auto', marginTop: '16px' }}>
                  <table style={{ width: '100%', fontSize: '13px', color: 'white' }}>
                    <thead>
                      <tr>
                        {Object.keys(aiResponse.result[0]).map(key => (
                          <th key={key} style={{ 
                            padding: '10px 8px', 
                            textAlign: 'left', 
                            borderBottom: '1px solid rgba(255,255,255,0.2)',
                            fontWeight: '600'
                          }}>
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {aiResponse.result.slice(0, 10).map((row: any, idx: number) => (
                        <tr key={idx}>
                          {Object.values(row).map((val: any, i: number) => (
                            <td key={i} style={{ 
                              padding: '8px', 
                              borderBottom: '1px solid rgba(255,255,255,0.1)' 
                            }}>
                              {String(val).substring(0, 50)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {aiResponse.result.length > 10 && (
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '12px', textAlign: 'center' }}>
                      Showing 10 of {aiResponse.result.length} results
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
