import React, { useEffect, useState, CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Shield, Anchor, Activity, HeartPulse, ActivitySquare, Heart,
  RefreshCw, ChevronRight, Ship, Compass, Navigation, Scale,
  Droplets, Thermometer, Calendar, Clock, TrendingUp, Award,
  AlertTriangle, Filter, Download, FileText, X, Printer,
  Search, ChevronDown, ChevronUp, Settings, Sliders, Info,
  MapPin, PieChart as PieChartIcon, BarChart3
} from "lucide-react";
import { 
  PieChart, Pie, Cell, BarChart, Bar, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid, XAxis, YAxis, RadialBarChart, RadialBar
} from "recharts";
import { format } from "date-fns";
import api from "../api/client";
import * as XLSX from 'xlsx';
import PatientProfile from "../components/PatientProfile";

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
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  textDark: '#1F2937',
  textLight: '#6B7280',
  white: '#FFFFFF',
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const formatPercentage = (value: number | undefined): string => {
  if (value === undefined || value === null) return '0';
  return `${Math.round(value)}%`;
};

// Station Distribution Colors
const stationColors = [
  oceanColors.deep, oceanColors.mid, oceanColors.light, 
  oceanColors.surface, oceanColors.wave, oceanColors.info,
  '#4F46E5', '#7C3AED', '#DB2777', '#EA580C'
];

// Category Distribution Colors
const categoryColors = [oceanColors.success, oceanColors.warning, oceanColors.info, oceanColors.danger];

// High Risk Patients Modal Component (unchanged from previous, omitted for brevity but keep as is)
function HighRiskModal({ isOpen, onClose, patients, filters, onFilterChange, onExport, availableStations, availableCategories }: any) {
  // ... (keep the existing HighRiskModal implementation unchanged)
  // This component remains exactly as it was in the previous version
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('riskScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  const [riskCriteria, setRiskCriteria] = useState({
    minVisits: 1,
    minConditions: 1,
    riskLevel: 'all' as 'all' | 'HIGH' | 'MEDIUM' | 'LOW'
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    category: filters.category,
    station: filters.station,
    gender: filters.gender
  });

  const transformToPatientProfile = (patient: any) => {
    return {
      Id: patient.clientId || patient.client_id,
      FullName: patient.fullName || patient.fullname,
      IDNumber: patient.idNumber || patient.idnumber,
      PhoneNumber: patient.phoneNumber || patient.phonenumber || '',
      GenderTitle: patient.gender || 'N/A',
      CategoryTitle: patient.category || 'N/A',
      StationTitle: patient.station || 'N/A',
      Status: true,
    };
  };

  if (!isOpen) return null;

  const filteredPatients = patients?.filter((patient: any) => {
    const meetsVisitRequirement = patient.totalVisits >= riskCriteria.minVisits;
    const meetsConditionRequirement = patient.conditionsCount >= riskCriteria.minConditions;
    const matchesRiskLevel = riskCriteria.riskLevel === 'all' || patient.riskLevel === riskCriteria.riskLevel;
    
    const matchesSearch = searchTerm === '' || 
      (patient.fullName || patient.fullname)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.idNumber || patient.idnumber)?.includes(searchTerm);
    const matchesCategory = localFilters.category === 'all' || patient.category === localFilters.category;
    const matchesStation = localFilters.station === 'all' || patient.station === localFilters.station;
    const matchesGender = localFilters.gender === 'all' || patient.gender === localFilters.gender;
    
    return meetsVisitRequirement && meetsConditionRequirement && matchesRiskLevel &&
           matchesSearch && matchesCategory && matchesStation && matchesGender;
  }) || [];

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleApplyFilters = () => onFilterChange(localFilters);

  const modalSelectStyleInline: React.CSSProperties = {
    width: '100%', padding: '8px 36px 8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0',
    background: 'white', color: oceanColors.textDark, fontSize: '14px', cursor: 'pointer', outline: 'none',
    WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%231F2937' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px',
  } as React.CSSProperties;

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflow: 'auto', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '20px', width: '95%', maxWidth: '1400px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
          <div style={{ background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${oceanColors.gold}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={24} style={{ color: oceanColors.gold }} />
              <div><h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>High Risk Clients</h2><p style={{ fontSize: '13px', color: oceanColors.foam, marginTop: '4px' }}>{sortedPatients.length} clients meeting criteria</p></div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}><X size={18} /></button>
          </div>
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Sliders size={18} style={{ color: oceanColors.deep }} /><strong style={{ color: oceanColors.deep }}>Filter Configuration</strong></div>
              <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'white', border: `1px solid ${oceanColors.mid}30`, borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}><Settings size={14} />{showAdvancedFilters ? 'Hide' : 'Show'} Filters</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Minimum Visits</label><input type="number" min="1" max="20" value={riskCriteria.minVisits} onChange={(e) => setRiskCriteria({ ...riskCriteria, minVisits: parseInt(e.target.value) || 1 })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Min Conditions</label><input type="number" min="1" max="3" value={riskCriteria.minConditions} onChange={(e) => setRiskCriteria({ ...riskCriteria, minConditions: parseInt(e.target.value) || 1 })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Risk Level</label><select value={riskCriteria.riskLevel} onChange={(e) => setRiskCriteria({ ...riskCriteria, riskLevel: e.target.value as any })} style={modalSelectStyleInline}><option value="all">All</option><option value="HIGH">High Only</option><option value="MEDIUM">Medium Only</option><option value="LOW">Low Only</option></select></div>
            </div>
          </div>
          {showAdvancedFilters && (
            <div style={{ padding: '16px 24px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ minWidth: '150px' }}><label style={{ fontSize: '12px', color: '#64748b' }}>Category</label><select value={localFilters.category} onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })} style={modalSelectStyleInline}><option value="all">All</option>{availableCategories?.map((cat: any) => (<option key={cat.Id} value={cat.Title}>{cat.Title}</option>))}</select></div>
              <div style={{ minWidth: '150px' }}><label style={{ fontSize: '12px', color: '#64748b' }}>Station</label><select value={localFilters.station} onChange={(e) => setLocalFilters({ ...localFilters, station: e.target.value })} style={modalSelectStyleInline}><option value="all">All</option>{availableStations?.map((s: any) => (<option key={s.Id} value={s.Title}>{s.Title}</option>))}</select></div>
              <div style={{ minWidth: '150px' }}><label style={{ fontSize: '12px', color: '#64748b' }}>Gender</label><select value={localFilters.gender} onChange={(e) => setLocalFilters({ ...localFilters, gender: e.target.value })} style={modalSelectStyleInline}><option value="all">All</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
              <button onClick={handleApplyFilters} style={{ padding: '8px 16px', background: oceanColors.deep, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Filter size={14} /> Apply</button>
            </div>
          )}
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} /><input type="text" placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} /></div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}><th style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('fullName')}>Name</th><th style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('idNumber')}>ID</th><th style={{ padding: '12px', textAlign: 'left' }}>Category</th><th style={{ padding: '12px', textAlign: 'left' }}>Station</th><th style={{ padding: '12px', textAlign: 'center' }}>Visits</th><th style={{ padding: '12px', textAlign: 'center' }}>BP</th><th style={{ padding: '12px', textAlign: 'center' }}>BMI</th><th style={{ padding: '12px', textAlign: 'center' }}>RBS</th><th style={{ padding: '12px', textAlign: 'center' }}>Cond</th><th style={{ padding: '12px', textAlign: 'center' }}>Risk</th></tr></thead>
              <tbody>{sortedPatients.map((p: any) => (
                <tr key={p.clientId || p.client_id} style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => setSelectedPatient(transformToPatientProfile(p))} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{p.fullName || p.fullname}</td><td style={{ padding: '12px', color: '#64748b' }}>{p.idNumber || p.idnumber}</td><td style={{ padding: '12px' }}>{p.category}</td><td style={{ padding: '12px' }}>{p.station}</td><td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{p.totalVisits}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}><span style={{ padding: '4px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', background: p.bpStatus === 'NORMAL' ? `${oceanColors.success}20` : `${oceanColors.danger}20`, color: p.bpStatus === 'NORMAL' ? oceanColors.success : oceanColors.danger }}>{p.bpStatus === 'NORMAL' ? 'Normal' : p.bpStatus || 'N/A'}</span></td>
                  <td style={{ padding: '12px', textAlign: 'center' }}><span style={{ padding: '4px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', background: p.bmiStatus === 'NORMAL' ? `${oceanColors.success}20` : p.bmiStatus === 'OVERWEIGHT' ? `${oceanColors.warning}20` : `${oceanColors.danger}20`, color: p.bmiStatus === 'NORMAL' ? oceanColors.success : p.bmiStatus === 'OVERWEIGHT' ? oceanColors.warning : oceanColors.danger }}>{p.bmiStatus || 'N/A'}</span></td>
                  <td style={{ padding: '12px', textAlign: 'center' }}><span style={{ padding: '4px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', background: p.rbsStatus === 'NORMAL' ? `${oceanColors.success}20` : p.rbsStatus === 'PRE-DIABETIC' ? `${oceanColors.warning}20` : `${oceanColors.danger}20`, color: p.rbsStatus === 'NORMAL' ? oceanColors.success : p.rbsStatus === 'PRE-DIABETIC' ? oceanColors.warning : oceanColors.danger }}>{p.rbsStatus || 'N/A'}</span></td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{p.conditionsCount || 0}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}><span style={{ padding: '4px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', background: p.riskLevel === 'HIGH' ? `${oceanColors.danger}20` : p.riskLevel === 'MEDIUM' ? `${oceanColors.warning}20` : `${oceanColors.success}20`, color: p.riskLevel === 'HIGH' ? oceanColors.danger : p.riskLevel === 'MEDIUM' ? oceanColors.warning : oceanColors.success }}>{p.riskLevel || 'LOW'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
      {selectedPatient && <PatientProfile patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}
    </>
  );
}

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showHighRiskModal, setShowHighRiskModal] = useState(false);
  
  const [filters, setFilters] = useState({
    startDate: '', endDate: '', category: 'all', station: 'all', gender: 'all'
  });
  
  const [availableStations, setAvailableStations] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{ earliest: string; latest: string }>({ earliest: '', latest: '' });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    setCurrentTime(format(new Date(), "EEEE, MMMM do, yyyy 'at' h:mm a"));
    const timer = setInterval(() => setCurrentTime(format(new Date(), "EEEE, MMMM do, yyyy 'at' h:mm a")), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [stationsRes, categoriesRes, dateRangeRes] = await Promise.all([
          api.get('/analytics/stations'), api.get('/analytics/categories'), api.get('/analytics/data-date-range')
        ]);
        setAvailableStations(stationsRes.data.data || []);
        setAvailableCategories(categoriesRes.data.data || []);
        if (dateRangeRes.data.data) {
          setDateRange({ earliest: format(new Date(dateRangeRes.data.data.earliest), 'yyyy-MM-dd'), latest: format(new Date(dateRangeRes.data.data.latest), 'yyyy-MM-dd') });
          setFilters(prev => ({ ...prev, startDate: format(new Date(dateRangeRes.data.data.earliest), 'yyyy-MM-dd'), endDate: format(new Date(dateRangeRes.data.data.latest), 'yyyy-MM-dd') }));
        }
      } catch (error) { console.error('Error fetching filter data:', error); }
    };
    fetchFilterData();
  }, []);

  // Build query params for API calls
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.category !== 'all') queryParams.append('category', filters.category);
  if (filters.station !== 'all') queryParams.append('station', filters.station);
  if (filters.gender !== 'all') queryParams.append('gender', filters.gender);
  const paramString = queryParams.toString();

  // For station distribution - DO NOT filter by station (we're grouping by it)
  const stationParams = new URLSearchParams();
  if (filters.startDate) stationParams.append('startDate', filters.startDate);
  if (filters.endDate) stationParams.append('endDate', filters.endDate);
  if (filters.category !== 'all') stationParams.append('category', filters.category);
  if (filters.gender !== 'all') stationParams.append('gender', filters.gender);
  const stationParamString = stationParams.toString();

  // For category distribution - DO NOT filter by category (we're grouping by it)
  const categoryParams = new URLSearchParams();
  if (filters.startDate) categoryParams.append('startDate', filters.startDate);
  if (filters.endDate) categoryParams.append('endDate', filters.endDate);
  if (filters.station !== 'all') categoryParams.append('station', filters.station);
  if (filters.gender !== 'all') categoryParams.append('gender', filters.gender);
  const categoryParamString = categoryParams.toString();

  // Fetch client health status
  const { data: healthStatus, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['client-health-status', filters],
    queryFn: async () => (await api.get(`/analytics/clients/health-status?${paramString}`)).data.data,
    enabled: !!filters.startDate,
  });

  // Fetch high risk clients
  const { data: highRiskClients, refetch: refetchHighRisk } = useQuery({
    queryKey: ['high-risk-clients', filters],
    queryFn: async () => (await api.get(`/analytics/clients/high-risk?${paramString}`)).data.data || [],
    enabled: !!filters.startDate,
  });

  // Fetch station distribution - using stationParamString (without station filter)
  const { data: stationDistribution, refetch: refetchStation } = useQuery({
    queryKey: ['station-distribution', filters],
    queryFn: async () => {
      const response = await api.get(`/analytics/clients/station-distribution?${stationParamString}`);
      console.log('Station Distribution Response:', response.data);
      return response.data.data || [];
    },
    enabled: !!filters.startDate,
  });

  // Fetch category distribution - using categoryParamString (without category filter)
  const { data: categoryDistribution, refetch: refetchCategory } = useQuery({
    queryKey: ['category-distribution', filters],
    queryFn: async () => {
      const response = await api.get(`/analytics/clients/category-distribution?${categoryParamString}`);
      console.log('Category Distribution Response:', response.data);
      return response.data.data || [];
    },
    enabled: !!filters.startDate,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchHealth(), 
      refetchHighRisk(),
      refetchStation(),
      refetchCategory()
    ]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const isLoading = healthLoading;

  // Chart Data
  const healthScoreData = React.useMemo(() => {
    if (!healthStatus?.healthScore) return [];
    return [
      { name: 'Healthy', value: healthStatus.healthScore.healthy, percentage: healthStatus.healthScore.healthyPercentage, color: oceanColors.success },
      { name: 'Intermediate', value: healthStatus.healthScore.intermediate, percentage: healthStatus.healthScore.intermediatePercentage, color: oceanColors.warning },
      { name: 'High Risk', value: healthStatus.healthScore.highRisk, percentage: healthStatus.healthScore.highRiskPercentage, color: oceanColors.danger }
    ];
  }, [healthStatus]);

  const bpChartData = React.useMemo(() => {
    if (!healthStatus?.bloodPressure) return [];
    const bp = healthStatus.bloodPressure;
    return [{ name: 'Blood Pressure', Normal: bp.normal || 0, 'Pre-HTN': bp.preHypertension || 0, 'Stage I': bp.stage1Hypertension || 0, 'Stage II': bp.stage2Hypertension || 0, Hypotension: bp.hypotension || 0, Mixed: bp.mixed || 0 }];
  }, [healthStatus]);

  const bpStackColors = { Normal: oceanColors.success, 'Pre-HTN': oceanColors.warning, 'Stage I': '#F97316', 'Stage II': oceanColors.danger, Hypotension: oceanColors.info, Mixed: '#94a3b8' };

  const bmiData = React.useMemo(() => {
    if (!healthStatus?.bmi) return [];
    const bmi = healthStatus.bmi;
    return [
      { name: 'Underweight', value: bmi.underweight || 0 }, { name: 'Normal', value: bmi.normal || 0 },
      { name: 'Overweight', value: bmi.overweight || 0 }, { name: 'Obese', value: bmi.obese || 0 },
      { name: 'Very Obese', value: bmi.veryObese || 0 }, { name: 'Mixed', value: bmi.mixed || 0 }
    ].filter(item => item.value > 0);
  }, [healthStatus]);

  const rbsData = React.useMemo(() => {
    if (!healthStatus?.rbs) return [];
    const rbs = healthStatus.rbs;
    return [
      { name: 'Normal', value: rbs.normal || 0, color: oceanColors.success },
      { name: 'Hypoglycemia', value: rbs.hypoglycemia || 0, color: '#06B6D4' },
      { name: 'Pre-Diabetic', value: rbs.preDiabetic || 0, color: '#F59E0B' },
      { name: 'Diabetic', value: rbs.diabetic || 0, color: oceanColors.danger },
      { name: 'Mixed', value: rbs.mixed || 0, color: '#6B7280' }
    ].filter(item => item.value > 0);
  }, [healthStatus]);

  const stationData = React.useMemo(() => {
    if (!stationDistribution) return [];
    return stationDistribution.map((s: any, idx: number) => ({ ...s, color: stationColors[idx % stationColors.length] }));
  }, [stationDistribution]);

  const categoryData = React.useMemo(() => {
    if (!categoryDistribution) return [];
    return categoryDistribution.map((c: any, idx: number) => ({ ...c, color: categoryColors[idx % categoryColors.length] }));
  }, [categoryDistribution]);

  const summaryCards = [
    { title: "Total Visits", value: healthStatus?.totalVisits || 0, icon: Activity, color: "from-blue-500 to-cyan-500", description: "All active screenings", tooltip: "Total health screenings recorded." },
    { title: "Clients Seen", value: healthStatus?.totalClients || 0, icon: Users, color: "from-emerald-500 to-teal-500", description: "Unique active clients", tooltip: "Active clients with ≥1 screening." },
    { title: "High Risk", value: healthStatus?.healthScore?.highRisk || 0, icon: AlertTriangle, color: "from-red-500 to-rose-500", description: `${formatPercentage(healthStatus?.healthScore?.highRiskPercentage)} of clients`, tooltip: "Clients with 2+ abnormal conditions.", isClickable: true, onClick: () => setShowHighRiskModal(true) },
    { title: "Health Score", value: Math.round(healthStatus?.healthScore?.healthyPercentage || 0), icon: Award, color: "from-purple-500 to-pink-500", description: `${healthStatus?.healthScore?.healthy || 0} healthy`, tooltip: "Percentage of healthy clients.", suffix: "%" },
  ];

  const filterSelectStyle: React.CSSProperties = { width: '100%', padding: '8px 36px 8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '14px', cursor: 'pointer', outline: 'none', backdropFilter: 'blur(4px)', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' } as React.CSSProperties;
  const filterInputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '14px', outline: 'none', backdropFilter: 'blur(4px)' } as React.CSSProperties;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0B2F9E, #1A4D8C, #2B7BA8)', fontFamily: 'Verdana, Geneva, sans-serif' }}>
      
      {/* Hero Section */}
      <div style={{ position: 'relative', margin: '24px 24px 32px 24px', overflow: 'hidden', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #0A1C40, #0B2F9E, #1A4D8C)' }}></div>
        <div style={{ position: 'relative', padding: '32px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #FFD700, #FFA500)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'float 3s ease-in-out infinite' }}>
                  <Ship size={32} style={{ color: '#0A1C40' }} />
                </div>
                <div>
                  <p style={{ color: '#A8E6CF', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}><Compass size={14} /> {currentTime}</p>
                  <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 'bold', color: 'white' }}>{greeting}, Captain! <span style={{ color: '#FFD700' }}>⚓</span></h1>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: '600px', lineHeight: '1.625' }}>Welcome aboard the EAP Health Week Intelligence Dashboard.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowFilters(!showFilters)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', borderRadius: '12px', color: 'white', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}><Filter size={18} /> Filters</button>
              <button onClick={handleRefresh} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', borderRadius: '12px', color: 'white', fontWeight: '600', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', opacity: refreshing ? 0.5 : 1 }}><RefreshCw size={20} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh</button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div style={{ margin: '0 24px 24px 24px', padding: '20px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div><label style={{ fontSize: '12px', color: oceanColors.foam }}>Start Date</label><input type="date" value={filters.startDate} min={dateRange.earliest} max={dateRange.latest} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} style={filterInputStyle} /></div>
            <div><label style={{ fontSize: '12px', color: oceanColors.foam }}>End Date</label><input type="date" value={filters.endDate} min={dateRange.earliest} max={dateRange.latest} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} style={filterInputStyle} /></div>
            <div><label style={{ fontSize: '12px', color: oceanColors.foam }}>Category</label><select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} style={filterSelectStyle}><option value="all" style={{ color: oceanColors.textDark }}>All</option>{availableCategories.map((c: any) => (<option key={c.Id} value={c.Title} style={{ color: oceanColors.textDark }}>{c.Title}</option>))}</select></div>
            <div><label style={{ fontSize: '12px', color: oceanColors.foam }}>Station</label><select value={filters.station} onChange={(e) => setFilters({ ...filters, station: e.target.value })} style={filterSelectStyle}><option value="all" style={{ color: oceanColors.textDark }}>All</option>{availableStations.map((s: any) => (<option key={s.Id} value={s.Title} style={{ color: oceanColors.textDark }}>{s.Title}</option>))}</select></div>
            <div><label style={{ fontSize: '12px', color: oceanColors.foam }}>Gender</label><select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })} style={filterSelectStyle}><option value="all" style={{ color: oceanColors.textDark }}>All</option><option value="Male" style={{ color: oceanColors.textDark }}>Male</option><option value="Female" style={{ color: oceanColors.textDark }}>Female</option></select></div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {(filters.category !== 'all' || filters.station !== 'all' || filters.gender !== 'all') && (
        <div style={{ margin: '0 24px 16px 24px', padding: '8px 16px', background: 'rgba(255,215,0,0.15)', backdropFilter: 'blur(8px)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Filter size={14} style={{ color: oceanColors.gold }} /><span style={{ color: 'white', fontSize: '13px' }}>Active:</span>
          {filters.category !== 'all' && <span style={{ background: oceanColors.deep, color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>Category: {filters.category}<X size={14} style={{ cursor: 'pointer' }} onClick={() => setFilters({...filters, category: 'all'})} /></span>}
          {filters.station !== 'all' && <span style={{ background: oceanColors.deep, color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>Station: {filters.station}<X size={14} style={{ cursor: 'pointer' }} onClick={() => setFilters({...filters, station: 'all'})} /></span>}
          {filters.gender !== 'all' && <span style={{ background: oceanColors.deep, color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>Gender: {filters.gender}<X size={14} style={{ cursor: 'pointer' }} onClick={() => setFilters({...filters, gender: 'all'})} /></span>}
          <button onClick={() => setFilters({...filters, category: 'all', station: 'all', gender: 'all'})} style={{ marginLeft: 'auto', padding: '4px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', color: 'white', fontSize: '12px', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      <div style={{ padding: '0 24px 32px 24px' }}>
        
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {summaryCards.map((card) => (
            <div key={card.title} onClick={card.isClickable ? card.onClick : undefined} style={{ position: 'relative', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.2)', cursor: card.isClickable ? 'pointer' : 'default', transition: 'all 0.3s' }}
              onMouseEnter={(e) => { if (card.isClickable) { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.02)'; } }}
              onMouseLeave={(e) => { if (card.isClickable) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; } }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '48px', height: '48px', background: `linear-gradient(135deg, ${card.color.split(' ')[1]}, ${card.color.split(' ')[3]})`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><card.icon size={24} style={{ color: 'white' }} /></div>
                {card.title === "High Risk" && healthStatus?.healthScore?.highRisk > 0 && <div style={{ background: oceanColors.danger, color: 'white', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' }}>{healthStatus.healthScore.highRisk}</div>}
              </div>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>{formatNumber(card.value)}{card.suffix || ''}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500' }}>{card.title}</p>
                <div title={card.tooltip}><Info size={14} style={{ color: 'rgba(255,255,255,0.5)', cursor: 'help' }} /></div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{card.description}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1 - Station & Category Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
          
          {/* Station Distribution - Horizontal Bar Chart */}
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><MapPin size={20} style={{ color: oceanColors.gold }} /><div><h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', margin: 0 }}>Clients per Station</h3><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>Active client distribution by station</p></div></div>
            </div>
            <div style={{ padding: '16px' }}>
              {isLoading ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={32} style={{ color: oceanColors.gold, animation: 'spin 1s linear infinite' }} /></div> :
              stationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stationData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" tick={{ fill: 'white', fontSize: '10px' }} />
                    <YAxis type="category" dataKey="station" width={100} tick={{ fill: 'white', fontSize: '10px' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: oceanColors.white, fontSize: '12px' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stationData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>No station data</p></div>}
            </div>
          </div>

          {/* Category Distribution - Pie Chart */}
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><PieChartIcon size={20} style={{ color: oceanColors.gold }} /><div><h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', margin: 0 }}>Clients per Category</h3><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>Active client distribution by category</p></div></div>
            </div>
            <div style={{ padding: '16px' }}>
              {isLoading ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={32} style={{ color: oceanColors.gold, animation: 'spin 1s linear infinite' }} /></div> :
              categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} paddingAngle={2} dataKey="count" label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`} labelLine={{ stroke: 'rgba(255,255,255,0.5)' }}>
                      {categoryData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: 'white', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>No category data</p></div>}
            </div>
          </div>
        </div>

        {/* Charts Row 2 - Health Score, BP, BMI, RBS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          
          {/* Health Score - Donut */}
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Award size={20} style={{ color: oceanColors.gold }} /><div><h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', margin: 0 }}>Health Score</h3><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>Client classification</p></div></div>
            </div>
            <div style={{ padding: '16px' }}>
              {isLoading ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={32} style={{ color: oceanColors.gold, animation: 'spin 1s linear infinite' }} /></div> :
              healthScoreData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={healthScoreData} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2} dataKey="value">
                      {healthScoreData.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', background: 'rgba(10,28,64,0.95)' }} formatter={(v, n, entry) => [`${v} (${Math.round(entry?.payload?.percentage || 0)}%)`, n]} />
                    <Legend verticalAlign="bottom" height={30} formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>No data</p></div>}
            </div>
          </div>

          {/* BP - Stacked Bar */}
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><HeartPulse size={20} style={{ color: oceanColors.gold }} /><div><h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', margin: 0 }}>Blood Pressure</h3><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>BP classification</p></div></div>
            </div>
            <div style={{ padding: '16px' }}>
              {isLoading ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={32} style={{ color: oceanColors.gold, animation: 'spin 1s linear infinite' }} /></div> :
              bpChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={bpChartData} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" tick={{ fill: 'white', fontSize: '9px' }} />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip contentStyle={{ borderRadius: '8px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: oceanColors.white, fontSize: '12px' }} />
                    {Object.keys(bpStackColors).map((key) => (<Bar key={key} dataKey={key} stackId="a" fill={bpStackColors[key as keyof typeof bpStackColors]} />))}
                    <Legend verticalAlign="bottom" height={40} formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '9px' }}>{v}</span>} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>No BP data</p></div>}
            </div>
          </div>

          {/* BMI - Horizontal Bar */}
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Scale size={20} style={{ color: oceanColors.gold }} /><div><h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', margin: 0 }}>BMI</h3><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>BMI classification</p></div></div>
            </div>
            <div style={{ padding: '16px' }}>
              {isLoading ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={32} style={{ color: oceanColors.gold, animation: 'spin 1s linear infinite' }} /></div> :
              bmiData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={bmiData} layout="vertical" margin={{ left: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" tick={{ fill: 'white', fontSize: '8px' }} />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fill: 'white', fontSize: '8px' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: oceanColors.white, fontSize: '12px' }} />
                    <Bar dataKey="value" fill={oceanColors.gold} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>No BMI data</p></div>}
            </div>
          </div>

          {/* RBS - Horizontal Bar Chart */}
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Droplets size={20} style={{ color: oceanColors.gold }} />
                <div>
                  <h3 style={{ fontWeight: 'bold', color: oceanColors.white, fontSize: '16px', margin: 0 }}>Blood Sugar</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>RBS classification</p>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px' }}>
              {isLoading ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={32} style={{ color: oceanColors.gold, animation: 'spin 1s linear infinite' }} />
                </div>
              ) : rbsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={rbsData} layout="vertical" margin={{ left: 85 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" tick={{ fill: oceanColors.white, fontSize: '10px' }} />
                    <YAxis type="category" dataKey="name" width={85} tick={{ fill: oceanColors.white, fontSize: '10px' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: oceanColors.white }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {rbsData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: oceanColors.white, fontSize: '12px' }}>No RBS data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <HighRiskModal isOpen={showHighRiskModal} onClose={() => setShowHighRiskModal(false)} patients={highRiskClients} filters={filters} onFilterChange={setFilters} availableStations={availableStations} availableCategories={availableCategories} />

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
