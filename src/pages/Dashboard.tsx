import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Shield, Anchor, Activity, HeartPulse, ActivitySquare, Heart,
  RefreshCw, ChevronRight, Ship, Compass, Navigation, Scale,
  Droplets, Thermometer, Calendar, Clock, TrendingUp, Award,
  AlertTriangle, Filter, Download, FileText
} from "lucide-react";
import { 
  PieChart, Pie, Cell, BarChart, Bar, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid, XAxis, YAxis, LineChart, Line
} from "recharts";
import { format, subDays, subHours } from "date-fns";
import api from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import * as XLSX from 'xlsx';

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
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: 'all',
    station: 'all',
    gender: 'all'
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
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), "EEEE, MMMM do, yyyy 'at' h:mm a"));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch stations and categories for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [stationsRes, categoriesRes, dateRangeRes] = await Promise.all([
          api.get('/analytics/stations'),
          api.get('/analytics/categories'),
          api.get('/analytics/data-date-range')
        ]);
        setAvailableStations(stationsRes.data.data || []);
        setAvailableCategories(categoriesRes.data.data || []);
        if (dateRangeRes.data.data) {
          setDateRange({
            earliest: format(new Date(dateRangeRes.data.data.earliest), 'yyyy-MM-dd'),
            latest: format(new Date(dateRangeRes.data.data.latest), 'yyyy-MM-dd')
          });
          setFilters(prev => ({
            ...prev,
            startDate: format(new Date(dateRangeRes.data.data.earliest), 'yyyy-MM-dd'),
            endDate: format(new Date(dateRangeRes.data.data.latest), 'yyyy-MM-dd')
          }));
        }
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
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

  // Fetch summary metrics
  const { data: metrics, refetch: refetchMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['summary-metrics', filters],
    queryFn: async () => {
      const response = await api.get(`/analytics/summary-metrics?${paramString}`);
      return response.data.data;
    },
    enabled: !!filters.startDate,
  });

  // Fetch abnormal readings
  const { data: abnormalReadings, refetch: refetchAbnormal, isLoading: abnormalLoading } = useQuery({
    queryKey: ['abnormal-readings', filters],
    queryFn: async () => {
      const response = await api.get(`/analytics/abnormal-readings?${paramString}`);
      return response.data.data;
    },
    enabled: !!filters.startDate,
  });

  // Fetch high-risk patients
  const { data: highRiskPatients, refetch: refetchHighRisk, isLoading: highRiskLoading } = useQuery({
    queryKey: ['high-risk-patients', filters],
    queryFn: async () => {
      const response = await api.get(`/analytics/high-risk-patients?${paramString}`);
      return response.data.data || [];
    },
    enabled: !!filters.startDate,
  });

  // Fetch multi-visit abnormal patients
  const { data: multiVisitAbnormal, refetch: refetchMultiVisit, isLoading: multiVisitLoading } = useQuery({
    queryKey: ['multi-visit-abnormal', filters],
    queryFn: async () => {
      const response = await api.get(`/analytics/multi-visit-abnormal?${paramString}&minVisits=2`);
      return response.data.data || [];
    },
    enabled: !!filters.startDate,
  });

  // Fetch blood pressure data for charts
  const { data: bloodPressure, refetch: refetchBP, isLoading: bpLoading } = useQuery({
    queryKey: ['blood-pressure', filters],
    queryFn: async () => {
      const response = await api.get(`/analytics/employees/blood-pressure?${paramString}`);
      return response.data;
    },
    enabled: !!filters.startDate,
  });

  // Fetch BMI data for charts
  const { data: bmi, refetch: refetchBMI, isLoading: bmiLoading } = useQuery({
    queryKey: ['bmi', filters],
    queryFn: async () => {
      const response = await api.get(`/analytics/employees/bmi?${paramString}`);
      return response.data;
    },
    enabled: !!filters.startDate,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchMetrics(),
      refetchAbnormal(),
      refetchHighRisk(),
      refetchMultiVisit(),
      refetchBP(),
      refetchBMI()
    ]);
    setLastUpdated(new Date());
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleExport = () => {
    const exportData = highRiskPatients?.map((patient: any) => ({
      'Full Name': patient.fullname,
      'ID Number': patient.idnumber,
      'Phone Number': patient.phonenumber,
      'Category': patient.category,
      'Station': patient.station,
      'Total Visits': patient.total_visits,
      'Abnormal BP Visits': patient.abnormal_bp_count,
      'Abnormal BMI Visits': patient.abnormal_bmi_count,
      'Abnormal RBS Visits': patient.abnormal_rbs_count,
      'Risk Level': patient.risk_level,
      'Last Visit Date': patient.last_visit_date ? format(new Date(patient.last_visit_date), 'PPP') : 'N/A'
    })) || [];
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'High Risk Patients');
    XLSX.writeFile(wb, `high_risk_patients_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const isLoading = metricsLoading || abnormalLoading || highRiskLoading || multiVisitLoading || bpLoading || bmiLoading;

  // Prepare chart data
  const bpData = bloodPressure?.map((item: any) => ({
    name: item.BloodPressureCategory,
    value: Number(item.Count),
    color: item.BloodPressureCategory === 'NORMAL' ? oceanColors.success :
           item.BloodPressureCategory === 'PRE-HYPERTENSION' ? oceanColors.warning : oceanColors.danger,
  })).filter((item: any) => item.value > 0) || [];

  const bmiData = bmi?.map((item: any) => ({
    name: item.BMICategory,
    value: Number(item.Count),
  })).filter((item: any) => item.value > 0) || [];

  // Health metrics for summary cards
  const summaryCards = [
    { title: "Total Visits", value: metrics?.totalOutstandingVisits || 0, icon: Activity, color: "from-blue-500 to-cyan-500", description: "Total health visits recorded" },
    { title: "Clients Seen", value: metrics?.totalClientsSeen || 0, icon: Users, color: "from-emerald-500 to-teal-500", description: "Unique clients" },
    { title: "High Risk", value: highRiskPatients?.length || 0, icon: AlertTriangle, color: "from-red-500 to-rose-500", description: "Patients needing follow-up" },
    { title: "Multi-Visit", value: multiVisitAbnormal?.length || 0, icon: TrendingUp, color: "from-purple-500 to-pink-500", description: "Patients with >1 visit" },
  ];

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
                  <p style={{ color: '#A8E6CF', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Compass size={14} /> {currentTime}
                  </p>
                  <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 'bold', color: 'white' }}>
                    {greeting}, Captain! <span style={{ color: '#FFD700' }}>⚓</span>
                  </h1>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: '600px', lineHeight: '1.625' }}>
                Welcome aboard the EAP Health Week Intelligence Dashboard. Navigate through employee health metrics, 
                monitor wellness programs, and chart your organization's health course.
              </p>
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
                  cursor: 'pointer'
                }}
              >
                <Filter size={18} />
                Filters
              </button>
              <button
                onClick={handleExport}
                disabled={highRiskPatients?.length === 0}
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
                  cursor: highRiskPatients?.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: highRiskPatients?.length === 0 ? 0.5 : 1
                }}
              >
                <Download size={18} />
                Export
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 24px',
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '12px',
                  color: 'white',
                  fontWeight: '600',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  opacity: refreshing ? 0.5 : 1
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <RefreshCw size={20} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div style={{ margin: '0 24px 24px 24px', padding: '20px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: oceanColors.foam, display: 'block', marginBottom: '4px' }}>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                min={dateRange.earliest}
                max={dateRange.latest}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: oceanColors.foam, display: 'block', marginBottom: '4px' }}>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                min={dateRange.earliest}
                max={dateRange.latest}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: oceanColors.foam, display: 'block', marginBottom: '4px' }}>Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white' }}
              >
                <option value="all">All Categories</option>
                {availableCategories.map((cat: any) => (
                  <option key={cat.Id} value={cat.Title}>{cat.Title}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: oceanColors.foam, display: 'block', marginBottom: '4px' }}>Station</label>
              <select
                value={filters.station}
                onChange={(e) => setFilters({ ...filters, station: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white' }}
              >
                <option value="all">All Stations</option>
                {availableStations.map((station: any) => (
                  <option key={station.Id} value={station.Title}>{station.Title}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: oceanColors.foam, display: 'block', marginBottom: '4px' }}>Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white' }}
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '0 24px 32px 24px' }}>
        
        {/* Summary Cards Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {summaryCards.map((card) => (
            <div 
              key={card.title}
              style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                borderRadius: '16px',
                padding: '20px',
                transition: 'all 0.3s',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: `linear-gradient(135deg, ${card.color.split(' ')[1]}, ${card.color.split(' ')[3]})`,
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <card.icon size={24} style={{ color: 'white' }} />
                </div>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>{formatNumber(card.value)}</p>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '4px', fontWeight: '500' }}>{card.title}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>{card.description}</p>
            </div>
          ))}
        </div>

        {/* Charts Row - 2 Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '32px' }}>
          
          {/* Blood Pressure Distribution */}
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <HeartPulse size={22} style={{ color: oceanColors.gold }} />
                <div>
                  <h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '18px' }}>Blood Pressure Distribution</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Employee BP categories overview</p>
                </div>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              {bpData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart>
                    <Pie 
                      data={bpData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={100} 
                      paddingAngle={3} 
                      dataKey="value" 
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1, stroke: 'rgba(255,255,255,0.3)' }}
                    >
                      {bpData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: 'white' }} />
                    <Legend verticalAlign="bottom" height={50} formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.8)' }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>No blood pressure data available</p>
                </div>
              )}
            </div>
          </div>

          {/* BMI Distribution */}
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Scale size={22} style={{ color: oceanColors.gold }} />
                <div>
                  <h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '18px' }}>BMI Distribution</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Employee BMI categories breakdown</p>
                </div>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              {bmiData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={bmiData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" tick={{ fill: 'white' }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'white', fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: 'white' }} />
                    <Bar dataKey="value" fill={oceanColors.gold} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>No BMI data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* High Risk Patients Table */}
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '24px' }}>
          <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={22} style={{ color: oceanColors.gold }} />
              <div>
                <h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '18px' }}>High Risk Patients</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Patients requiring immediate attention</p>
              </div>
            </div>
          </div>
          <div style={{ padding: '20px', overflow: 'auto', maxHeight: '400px' }}>
            {highRiskLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading high-risk patients...</div>
            ) : highRiskPatients?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: oceanColors.gold }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: oceanColors.gold }}>ID Number</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: oceanColors.gold }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: oceanColors.gold }}>Station</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: oceanColors.gold }}>Visits</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: oceanColors.gold }}>Risk Level</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: oceanColors.gold }}>Last Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {highRiskPatients.map((patient: any) => (
                    <tr key={patient.client_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '12px', color: 'white' }}>{patient.fullname}</td>
                      <td style={{ padding: '12px', color: 'rgba(255,255,255,0.8)' }}>{patient.idnumber}</td>
                      <td style={{ padding: '12px', color: 'rgba(255,255,255,0.8)' }}>{patient.category}</td>
                      <td style={{ padding: '12px', color: 'rgba(255,255,255,0.8)' }}>{patient.station}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'white' }}>{patient.total_visits}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: patient.risk_level === 'HIGH' ? `${oceanColors.danger}30` :
                                     patient.risk_level === 'MEDIUM' ? `${oceanColors.warning}30` : `${oceanColors.success}30`,
                          color: patient.risk_level === 'HIGH' ? oceanColors.danger :
                                 patient.risk_level === 'MEDIUM' ? oceanColors.warning : oceanColors.success
                        }}>
                          {patient.risk_level}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                        {patient.last_visit_date ? format(new Date(patient.last_visit_date), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                No high-risk patients found for the selected criteria
              </div>
            )}
          </div>
        </div>

        {/* Multi-Visit Abnormal Patients Table */}
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <TrendingUp size={22} style={{ color: oceanColors.gold }} />
              <div>
                <h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '18px' }}>Multi-Visit Abnormal Patients</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Patients with multiple abnormal readings</p>
              </div>
            </div>
          </div>
          <div style={{ padding: '20px', overflow: 'auto', maxHeight: '400px' }}>
            {multiVisitLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading multi-visit patients...</div>
            ) : multiVisitAbnormal?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: oceanColors.gold }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: oceanColors.gold }}>ID Number</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: oceanColors.gold }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: oceanColors.gold }}>Visits</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: oceanColors.gold }}>Abnormal BP</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: oceanColors.gold }}>Abnormal BMI</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: oceanColors.gold }}>Abnormal RBS</th>
                  </tr>
                </thead>
                <tbody>
                  {multiVisitAbnormal.map((patient: any) => (
                    <tr key={patient.client_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '12px', color: 'white' }}>{patient.fullname}</td>
                      <td style={{ padding: '12px', color: 'rgba(255,255,255,0.8)' }}>{patient.idnumber}</td>
                      <td style={{ padding: '12px', color: 'rgba(255,255,255,0.8)' }}>{patient.category}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'white' }}>{patient.total_visits}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: oceanColors.danger }}>{patient.abnormal_bp_visits || 0}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: oceanColors.warning }}>{patient.abnormal_bmi_visits || 0}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: oceanColors.danger }}>{patient.abnormal_rbs_visits || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                No multi-visit abnormal patients found for the selected criteria
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
