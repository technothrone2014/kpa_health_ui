import React, { useState, useRef } from 'react';
import { 
  Search, Download, FileText, FileSpreadsheet, FileJson,
  Send, Sparkles, RefreshCw, Filter, X, Calendar,
  Users, MapPin, ChevronDown, ChevronRight, Database,
  Copy, CheckCircle, TrendingUp, Activity, Heart, Scale,
  Droplets, AlertTriangle, Award, Clock, BarChart3
} from 'lucide-react';
import { format, subMonths, subYears } from 'date-fns';
import * as XLSX from 'xlsx';
import api from '../api/client';
import toast from 'react-hot-toast';

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

// Pre-defined query templates for quick access
const queryTemplates = [
  {
    icon: Users,
    title: 'High Risk Clients',
    description: 'Clients with 2+ abnormal conditions requiring follow-up',
    query: 'Show me all high risk clients with their current health status and risk factors',
    color: oceanColors.danger
  },
  {
    icon: Activity,
    title: 'Hypertension Patients',
    description: 'Clients with elevated blood pressure readings',
    query: 'List all clients with hypertension or pre-hypertension, including their BP trends',
    color: '#F97316'
  },
  {
    icon: Scale,
    title: 'BMI Concerns',
    description: 'Overweight and obese clients requiring intervention',
    query: 'Show me clients with abnormal BMI (overweight, obese, very obese) and their visit history',
    color: oceanColors.warning
  },
  {
    icon: Droplets,
    title: 'Blood Sugar Issues',
    description: 'Pre-diabetic and diabetic clients',
    query: 'List all clients with abnormal blood sugar readings (pre-diabetic or diabetic)',
    color: oceanColors.danger
  },
  {
    icon: Award,
    title: 'Healthy Clients',
    description: 'Clients with all normal readings across visits',
    query: 'Show me all healthy clients with completely normal BP, BMI, and RBS readings',
    color: oceanColors.success
  },
  {
    icon: TrendingUp,
    title: 'Multi-Visit Trends',
    description: 'Clients with 3+ visits and their health progression',
    query: 'List clients with 3 or more visits, showing their health trends over time',
    color: oceanColors.info
  },
];

// Available report fields for custom selection
const availableFields = [
  { group: 'Client Info', fields: ['FullName', 'IDNumber', 'PhoneNumber', 'Gender', 'Category', 'Station'] },
  { group: 'Visit Info', fields: ['TotalVisits', 'FirstVisitDate', 'LastVisitDate', 'DaysSinceLastVisit'] },
  { group: 'BP Status', fields: ['BPStatus', 'BPClassification', 'BPAbnormalCount', 'BPNormalCount'] },
  { group: 'BMI Status', fields: ['BMIStatus', 'BMIClassification', 'BMIAbnormalCount', 'BMINormalCount'] },
  { group: 'RBS Status', fields: ['RBSStatus', 'RBSClassification', 'RBSAbnormalCount', 'RBSNormalCount'] },
  { group: 'Risk Assessment', fields: ['RiskLevel', 'ConditionsCount', 'AbnormalConditions', 'RiskScore'] },
];

export default function AdvancedAnalytics() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; content: string; result?: any }>>([]);
  const [activeFilters, setActiveFilters] = useState({
    startDate: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    category: 'all',
    station: 'all',
    gender: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const queryEndRef = useRef<HTMLDivElement>(null);

  // Execute natural language query
  const executeQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    
    setIsLoading(true);
    
    // Add user message
    setConversation(prev => [...prev, { role: 'user', content: queryText }]);
    
    try {
      const response = await api.post('/analytics/intelligent-query', {
        query: queryText,
        filters: activeFilters,
        selectedFields: selectedFields.length > 0 ? selectedFields : undefined
      });
      
      const result = response.data;
      setQueryResult(result);
      
      // Add assistant response
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: result.insight || `Found ${result.count} records matching your query.`,
        result: result.data 
      }]);
      
      toast.success(`Query executed successfully! Found ${result.count} records.`);
    } catch (error) {
      console.error('Query failed:', error);
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your query. Please try rephrasing or check your filters.' 
      }]);
      toast.error('Query execution failed');
    } finally {
      setIsLoading(false);
      setQuery('');
      // Scroll to bottom
      setTimeout(() => queryEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // Export result data
  const exportData = async () => {
    if (!queryResult?.data || queryResult.data.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      const data = queryResult.data;
      
      if (exportFormat === 'json') {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'csv') {
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        data.forEach((row: any) => {
          const values = headers.map(h => {
            const val = row[h];
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
          });
          csvRows.push(values.join(','));
        });
        const csvStr = csvRows.join('\n');
        const blob = new Blob([csvStr], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Health Data');
        XLSX.writeFile(wb, `health_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
      }
      
      toast.success(`Report exported as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  // Copy results to clipboard
  const copyResults = () => {
    if (queryResult?.data) {
      navigator.clipboard.writeText(JSON.stringify(queryResult.data, null, 2));
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          marginBottom: '24px',
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
          
          <div style={{ position: 'relative', padding: '28px 32px' }}>
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
                  <Search size={32} style={{ color: oceanColors.navy }} />
                </div>
                <div>
                  <h1 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 'bold', color: oceanColors.white, margin: 0 }}>
                    Intelligent Query Engine
                    <span style={{ color: oceanColors.gold, marginLeft: '12px' }}>🔍</span>
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '8px', fontSize: '15px' }}>
                    Ask natural language questions to generate custom health reports for download
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
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
                  <Filter size={18} />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                  <ChevronDown size={16} style={{ transform: showFilters ? 'rotate(180deg)' : 'none' }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            border: `1px solid ${oceanColors.wave}30`
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark }}>Start Date</label>
                <input type="date" value={activeFilters.startDate} onChange={(e) => setActiveFilters({...activeFilters, startDate: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark }}>End Date</label>
                <input type="date" value={activeFilters.endDate} onChange={(e) => setActiveFilters({...activeFilters, endDate: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark }}>Category</label>
                <select value={activeFilters.category} onChange={(e) => setActiveFilters({...activeFilters, category: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px', background: 'white' }}>
                  <option value="all">All Categories</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="DEPENDENT">Dependant</option>
                  <option value="PORT USER">Port User</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark }}>Station</label>
                <select value={activeFilters.station} onChange={(e) => setActiveFilters({...activeFilters, station: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px', background: 'white' }}>
                  <option value="all">All Stations</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark }}>Gender</label>
                <select value={activeFilters.gender} onChange={(e) => setActiveFilters({...activeFilters, gender: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px', background: 'white' }}>
                  <option value="all">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: oceanColors.textLight, marginTop: '12px' }}>
              <Filter size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Filters apply to all queries. Active: {activeFilters.startDate} → {activeFilters.endDate}
            </p>
          </div>
        )}

        {/* Main Query Interface */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          border: `1px solid ${oceanColors.wave}30`,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
          
          {/* Conversation Area */}
          {conversation.length > 0 && (
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '20px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '16px'
            }}>
              {conversation.map((msg, idx) => (
                <div key={idx} style={{ marginBottom: '16px' }}>
                  {/* User Message */}
                  {msg.role === 'user' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{
                        maxWidth: '70%',
                        padding: '12px 16px',
                        background: oceanColors.deep,
                        color: 'white',
                        borderRadius: '20px 20px 4px 20px',
                        fontSize: '14px'
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  )}
                  
                  {/* Assistant Message */}
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{
                        maxWidth: '80%',
                        padding: '12px 16px',
                        background: '#e2e8f0',
                        color: oceanColors.textDark,
                        borderRadius: '20px 20px 20px 4px',
                        fontSize: '14px'
                      }}>
                        <Sparkles size={14} style={{ display: 'inline', marginRight: '6px', color: oceanColors.gold }} />
                        {msg.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={queryEndRef} />
            </div>
          )}

          {/* Query Input */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: oceanColors.textLight }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && executeQuery(query)}
                placeholder="Ask anything about your health data... e.g., 'Show me all high risk employees' or 'List clients with hypertension'"
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 48px',
                  borderRadius: '14px',
                  border: `1px solid ${oceanColors.surface}40`,
                  fontSize: '15px',
                  outline: 'none',
                  background: 'white'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = oceanColors.gold}
                onBlur={(e) => e.currentTarget.style.borderColor = `${oceanColors.surface}40`}
              />
            </div>
            <button
              onClick={() => executeQuery(query)}
              disabled={isLoading || !query.trim()}
              style={{
                padding: '16px 28px',
                background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                border: 'none',
                borderRadius: '14px',
                fontWeight: 'bold',
                color: oceanColors.navy,
                cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !query.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Execute
                </>
              )}
            </button>
          </div>

          {/* Query Templates */}
          <div>
            <p style={{ fontSize: '13px', color: oceanColors.textLight, marginBottom: '12px' }}>
              Quick queries:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {queryTemplates.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(template.query);
                    executeQuery(template.query);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: 'white',
                    border: `1px solid ${template.color}30`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${template.color}10`;
                    e.currentTarget.style.borderColor = template.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = `${template.color}30`;
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: `${template.color}20`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <template.icon size={16} style={{ color: template.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, margin: 0 }}>{template.title}</p>
                    <p style={{ fontSize: '11px', color: oceanColors.textLight, margin: '2px 0 0 0' }}>{template.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        {queryResult && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: '24px',
            border: `1px solid ${oceanColors.wave}30`,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            {/* Results Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: `linear-gradient(135deg, ${oceanColors.success}, ${oceanColors.wave})`,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Database size={20} style={{ color: 'white' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
                    Query Results
                  </h3>
                  <p style={{ fontSize: '13px', color: oceanColors.textLight, margin: '2px 0 0 0' }}>
                    {queryResult.count} records found • {queryResult.executionTime}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={copyResults}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    background: oceanColors.white,
                    border: `1px solid ${oceanColors.surface}40`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {copied ? <CheckCircle size={16} style={{ color: oceanColors.success }} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
                
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  style={{
                    padding: '10px 16px',
                    border: `1px solid ${oceanColors.surface}40`,
                    borderRadius: '10px',
                    background: 'white',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="csv">CSV (.csv)</option>
                  <option value="json">JSON (.json)</option>
                </select>
                
                <button
                  onClick={exportData}
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
                    fontWeight: '500',
                    fontSize: '13px'
                  }}
                >
                  <Download size={16} />
                  Download Report
                </button>
              </div>
            </div>

            {/* Insight Summary */}
            {queryResult.insight && (
              <div style={{
                padding: '16px',
                background: `${oceanColors.info}10`,
                borderLeft: `4px solid ${oceanColors.gold}`,
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ fontSize: '14px', color: oceanColors.textDark, margin: 0 }}>
                  <Sparkles size={16} style={{ display: 'inline', marginRight: '8px', color: oceanColors.gold }} />
                  <strong>AI Insight:</strong> {queryResult.insight}
                </p>
              </div>
            )}

            {/* Data Table */}
            {queryResult.data && queryResult.data.length > 0 && (
              <div style={{ overflow: 'auto', maxHeight: '400px', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9' }}>
                    <tr>
                      {Object.keys(queryResult.data[0]).map(key => (
                        <th key={key} style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: oceanColors.textDark, borderBottom: `2px solid ${oceanColors.surface}30`, whiteSpace: 'nowrap' }}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.data.slice(0, 50).map((row: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${oceanColors.surface}20`, background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                        {Object.values(row).map((val: any, i: number) => (
                          <td key={i} style={{ padding: '10px 12px', color: oceanColors.textDark }}>
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {queryResult.data.length > 50 && (
                  <p style={{ textAlign: 'center', padding: '16px', color: oceanColors.textLight, fontSize: '12px' }}>
                    Showing 50 of {queryResult.data.length} records. Export to see all.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
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
