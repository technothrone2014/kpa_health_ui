import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Filter, Calendar, Download, Search, TrendingUp, AlertTriangle,
  Users, Activity, Heart, Scale, FileText, X, ChevronDown,
  BarChart3, PieChart, LineChart, FileSpreadsheet, FileJson
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const oceanColors = {
  deep: '#0B2F9E',
  mid: '#1A4D8C',
  gold: '#FFD700',
  navy: '#0A1C40',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

interface FilterState {
  startDate: string;
  endDate: string;
  category: string;
  station: string;
  condition: string;
  consecutiveTests: number;
  threshold: number;
}

export default function AdvancedAnalytics() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: format(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    category: 'all',
    station: 'all',
    condition: 'hypertension',
    consecutiveTests: 2,
    threshold: 50,
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'xlsx'>('json');

  // Fetch trends with filters
  const { data: trends, refetch: refetchTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['health-trends', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.station !== 'all') params.append('station', filters.station);
      const response = await fetch(`/api/v1/analytics/trends?${params}`);
      return response.json();
    },
  });

  // Fetch high-risk patients
  const { data: highRiskPatients, refetch: refetchHighRisk } = useQuery({
    queryKey: ['high-risk', filters.condition, filters.consecutiveTests, filters.threshold],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('condition', filters.condition);
      params.append('consecutiveCount', filters.consecutiveTests.toString());
      params.append('threshold', filters.threshold.toString());
      const response = await fetch(`/api/v1/analytics/high-risk-patients?${params}`);
      return response.json();
    },
  });

  // AI Query handler
  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/v1/analytics/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery, userId: 'current-user' })
      });
      const data = await response.json();
      setAiResponse(data);
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
    
    window.open(`/api/v1/analytics/export?${params}`, '_blank');
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ 
        background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BarChart3 size={28} style={{ color: oceanColors.navy }} />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', margin: 0 }}>
              Advanced Health Analytics
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
              Dynamic reporting, AI-powered insights, and risk detection
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: oceanColors.mid,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <Filter size={18} />
            Filters
            <ChevronDown size={16} style={{ transform: showFilters ? 'rotate(180deg)' : 'none' }} />
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${oceanColors.mid}30`,
                borderRadius: '8px',
                background: 'white'
              }}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (XLSX)</option>
            </select>
            <button
              onClick={handleExport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: oceanColors.success,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Download size={18} />
              Export Report
            </button>
          </div>
        </div>

        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="all">All Categories</option>
                <option value="EMPLOYEE">Employees</option>
                <option value="DEPENDENT">Dependants</option>
                <option value="PORT USER">Port Users</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Station</label>
              <select
                value={filters.station}
                onChange={(e) => setFilters({ ...filters, station: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="all">All Stations</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
        
        {/* Health Trends Chart */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <TrendingUp size={20} style={{ color: oceanColors.deep }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Health Trends</h3>
          </div>
          {trendsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading trends...</div>
          ) : (
            <div style={{ height: '300px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Normal BP</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Pre-HTN</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Hypertension</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {trends?.map((day: any) => (
                    <tr key={day.date} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{format(new Date(day.date), 'MMM dd')}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: oceanColors.success }}>{day.normal_bp}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: oceanColors.warning }}>{day.pre_hypertension}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: oceanColors.danger }}>{day.hypertension}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{day.total_readings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* High Risk Patients */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={20} style={{ color: oceanColors.danger }} />
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>High Risk Patients</h3>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={filters.condition}
                onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }}
              >
                <option value="hypertension">Hypertension</option>
                <option value="pre_hypertension">Pre-Hypertension</option>
                <option value="obesity">Obesity</option>
              </select>
              <button
                onClick={() => refetchHighRisk()}
                style={{
                  padding: '4px 12px',
                  background: oceanColors.deep,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
            </div>
          </div>
          
          {highRiskPatients?.length > 0 ? (
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {highRiskPatients.map((patient: any) => (
                <div key={patient.client_id} style={{
                  padding: '12px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{patient.FullName}</p>
                    <p style={{ fontSize: '12px', color: '#666' }}>ID: {patient.IDNumber}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: oceanColors.danger, fontWeight: 'bold' }}>
                      {patient.abnormal_percentage}% abnormal
                    </p>
                    <p style={{ fontSize: '11px', color: '#888' }}>{patient.abnormal_count}/{patient.total_readings} readings</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              No high-risk patients found
            </div>
          )}
        </div>
      </div>

      {/* AI Natural Language Query Section */}
      <div style={{
        background: `linear-gradient(135deg, ${oceanColors.navy}, ${oceanColors.deep})`,
        borderRadius: '16px',
        padding: '24px',
        marginTop: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Search size={24} style={{ color: oceanColors.gold }} />
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
            AI Health Assistant
          </h3>
          <span style={{
            background: 'rgba(255,215,0,0.2)',
            color: oceanColors.gold,
            padding: '2px 8px',
            borderRadius: '20px',
            fontSize: '11px'
          }}>
            Experimental
          </span>
        </div>
        
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '16px' }}>
          Ask natural language questions about your health data. Example: "Show me all employees with high blood pressure" or "List obese patients"
        </p>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="Ask a question about your health data..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              outline: 'none',
              fontSize: '14px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleAiQuery()}
          />
          <button
            onClick={handleAiQuery}
            disabled={isAiLoading}
            style={{
              padding: '12px 24px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              border: 'none',
              borderRadius: '12px',
              fontWeight: 'bold',
              cursor: isAiLoading ? 'not-allowed' : 'pointer',
              opacity: isAiLoading ? 0.6 : 1
            }}
          >
            {isAiLoading ? 'Thinking...' : 'Ask AI'}
          </button>
        </div>
        
        {aiResponse && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(4px)'
          }}>
            <p style={{ color: oceanColors.gold, fontWeight: 'bold', marginBottom: '8px' }}>
              Insight: {aiResponse.insight}
            </p>
            {aiResponse.result && aiResponse.result.length > 0 && (
              <div style={{ maxHeight: '200px', overflow: 'auto', marginTop: '12px' }}>
                <table style={{ width: '100%', fontSize: '12px', color: 'white' }}>
                  <thead>
                    <tr>
                      {Object.keys(aiResponse.result[0]).map(key => (
                        <th key={key} style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aiResponse.result.slice(0, 10).map((row: any, idx: number) => (
                      <tr key={idx}>
                        {Object.values(row).map((val: any, i: number) => (
                          <td key={i} style={{ padding: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            {String(val).substring(0, 50)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {aiResponse.result.length > 10 && (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '8px' }}>
                    Showing 10 of {aiResponse.result.length} results
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
