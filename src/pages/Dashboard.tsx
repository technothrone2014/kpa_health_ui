import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Shield, Anchor, Activity, HeartPulse, ActivitySquare, Heart,
  RefreshCw, ChevronRight, Ship, Compass, Navigation, Scale
} from "lucide-react";
import { 
  PieChart, Pie, Cell, BarChart, Bar, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid, XAxis, YAxis
} from "recharts";
import { format, subDays } from "date-fns";
import { getDashboardOverview, getEmployeeBloodPressureResults, getEmployeeBMIResults } from "../api/analytics";
import LoadingSpinner from "../components/LoadingSpinner";

// Oceanic Theme Colors
const oceanColors = {
  deep: '#0B2F9E',
  mid: '#1A4D8C',
  light: '#2B7BA8',
  surface: '#4AA3C2',
  gold: '#FFD700',
  navy: '#0A1C40',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
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
  
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => getDashboardOverview(),
  });

  const { data: bloodPressure, isLoading: bpLoading, refetch: refetchBP } = useQuery({
    queryKey: ["blood-pressure"],
    queryFn: () => getEmployeeBloodPressureResults(),
  });

  const { data: bmi, isLoading: bmiLoading, refetch: refetchBMI } = useQuery({
    queryKey: ["bmi"],
    queryFn: () => getEmployeeBMIResults(),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOverview(), refetchBP(), refetchBMI()]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (overviewLoading || bpLoading || bmiLoading) {
    return <LoadingSpinner />;
  }

  const categoryDist = overview?.categoryDistribution || [];
  const getCount = (item: any) => {
    if (!item) return 0;
    const count = item.Count !== undefined ? item.Count : item.count;
    return typeof count === 'string' ? parseInt(count, 10) : (count || 0);
  };
  
  const totalEmployees = getCount(categoryDist.find(c => c.Category === 'EMPLOYEE')) || 0;
  const totalDependants = getCount(categoryDist.find(c => c.Category === 'DEPENDENT')) || 0;
  const totalPortUsers = getCount(categoryDist.find(c => c.Category === 'PORT USER')) || 0;
  const totalBPReadings = bloodPressure?.reduce((sum, item) => sum + (Number(item.Count) || 0), 0) || 0;
  const normalBP = bloodPressure?.find(item => item.BloodPressureCategory === 'NORMAL')?.Count || 0;
  const hypertensionBP = bloodPressure?.find(item => item.BloodPressureCategory === 'STAGE I HYPERTENSION')?.Count || 0;
  const preHypertension = bloodPressure?.find(item => item.BloodPressureCategory === 'PRE-HYPERTENSION')?.Count || 0;

  const allStats = [
    { title: "Total Employees", value: totalEmployees, formattedValue: formatNumber(totalEmployees), icon: Users, iconBg: "from-blue-500 to-cyan-500", description: "Registered employees", trend: "+12%", trendUp: true },
    { title: "Total Dependants", value: totalDependants, formattedValue: formatNumber(totalDependants), icon: Shield, iconBg: "from-emerald-500 to-teal-500", description: "Family members", trend: "+5%", trendUp: true },
    { title: "Port Users", value: totalPortUsers, formattedValue: formatNumber(totalPortUsers), icon: Anchor, iconBg: "from-purple-500 to-pink-500", description: "Active port users", trend: "+3%", trendUp: true },
    { title: "Total Visits", value: overview?.totalVisits || 0, formattedValue: formatNumber(overview?.totalVisits || 0), icon: Activity, iconBg: "from-orange-500 to-red-500", description: "Health visits", trend: "+8%", trendUp: true },
    { title: "Normal BP", value: normalBP, formattedValue: normalBP.toLocaleString(), icon: HeartPulse, iconBg: "from-emerald-500 to-green-500", description: `${((normalBP / totalBPReadings) * 100).toFixed(1)}% of readings`, trend: "Healthy", trendUp: true },
    { title: "Pre-Hypertension", value: preHypertension, formattedValue: preHypertension.toLocaleString(), icon: ActivitySquare, iconBg: "from-amber-500 to-orange-500", description: `${((preHypertension / totalBPReadings) * 100).toFixed(1)}% of readings`, trend: "Monitor", trendUp: false },
    { title: "Hypertension", value: hypertensionBP, formattedValue: hypertensionBP.toLocaleString(), icon: Heart, iconBg: "from-red-500 to-rose-500", description: `${((hypertensionBP / totalBPReadings) * 100).toFixed(1)}% of readings`, trend: "Alert", trendUp: false },
  ];

  const categoryData = [
    { name: 'EMPLOYEES', value: totalEmployees, color: oceanColors.deep },
    { name: 'DEPENDANTS', value: totalDependants, color: oceanColors.mid },
    { name: 'PORT USERS', value: totalPortUsers, color: oceanColors.surface },
  ].filter(item => item.value > 0);

  const bpData = bloodPressure?.map(item => ({
    name: item.BloodPressureCategory,
    value: Number(item.Count),
    color: item.BloodPressureCategory === 'NORMAL' ? oceanColors.success :
           item.BloodPressureCategory === 'PRE-HYPERTENSION' ? oceanColors.warning : oceanColors.danger,
  })).filter(item => item.value > 0) || [];

  const bmiData = bmi?.map(item => ({
    name: item.BMICategory,
    value: Number(item.Count),
  })).filter(item => item.value > 0) || [];

  const PIE_COLORS = [oceanColors.deep, oceanColors.mid, oceanColors.surface, oceanColors.gold];

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

      <div style={{ padding: '0 24px 32px 24px' }}>
        
        {/* UNIFIED GRID - Using inline styles to guarantee grid layout */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {allStats.map((stat) => (
            <div 
              key={stat.title}
              style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    background: `linear-gradient(135deg, ${stat.iconBg.split(' ')[1]}, ${stat.iconBg.split(' ')[3]})`,
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                  }}>
                    <stat.icon size={28} style={{ color: 'white' }} />
                  </div>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    background: stat.trendUp ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                    color: stat.trendUp ? '#6EE7B7' : '#FCA5A5'
                  }}>
                    {stat.trend}
                  </span>
                </div>
                <p style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 'bold', color: 'white' }}>{stat.formattedValue}</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '4px', fontWeight: '500' }}>{stat.title}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>{stat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row - 2 Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '32px' }}>
          
          {/* Blood Pressure Distribution */}
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #FFD700, #FFA500)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                  <HeartPulse size={22} style={{ color: '#0A1C40' }} />
                </div>
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
                      innerRadius={70} 
                      outerRadius={110} 
                      paddingAngle={3} 
                      dataKey="value" 
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1, stroke: 'rgba(255,255,255,0.3)' }}
                    >
                      {bpData.map((entry, index) => (
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

          {/* Client Categories */}
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #FFD700, #FFA500)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                  <Anchor size={22} style={{ color: '#0A1C40' }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '18px' }}>Port Authority Categories</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Distribution by client type</p>
                </div>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart>
                    <Pie 
                      data={categoryData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={70} 
                      outerRadius={110} 
                      paddingAngle={3} 
                      dataKey="value" 
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1, stroke: 'rgba(255,255,255,0.3)' }}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: 'white' }} />
                    <Legend verticalAlign="bottom" height={50} formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.8)' }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>No category data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BMI Distribution */}
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #FFD700, #FFA500)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <Scale size={22} style={{ color: '#0A1C40' }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '18px' }}>BMI Navigation Chart</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Employee BMI categories breakdown</p>
              </div>
            </div>
          </div>
          <div style={{ padding: '24px' }}>
            {bmiData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={bmiData} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
                  <defs>
                    <linearGradient id="bmiOceanGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFD700" />
                      <stop offset="100%" stopColor="#FFA500" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 11, fill: 'white' }} />
                  <YAxis tickFormatter={(value) => value.toLocaleString()} tick={{ fill: 'white' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: 'white' }} />
                  <Bar dataKey="value" fill="url(#bmiOceanGradient)" radius={[8, 8, 0, 0]} label={{ position: 'top', fill: '#FFD700', fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>No BMI data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Ship's Log */}
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ background: 'linear-gradient(90deg, rgba(10,28,64,0.5), rgba(26,77,140,0.5))', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #FFD700, #FFA500)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <Navigation size={22} style={{ color: '#0A1C40' }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '18px' }}>Ship's Log</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Latest voyages in health data</p>
              </div>
            </div>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {[
                { message: "New crew member health screening completed", date: subDays(new Date(), 1), icon: "🩺", bg: "linear-gradient(135deg, #10B981, #059669)" },
                { message: "Blood pressure data synchronized with port authority", date: subDays(new Date(), 2), icon: "❤️", bg: "linear-gradient(135deg, #3B82F6, #06B6D4)" },
                { message: "BMI records updated for 45 employees", date: subDays(new Date(), 3), icon: "📊", bg: "linear-gradient(135deg, #8B5CF6, #6366F1)" },
                { message: "Health week report generated for command", date: subDays(new Date(), 4), icon: "📋", bg: "linear-gradient(135deg, #F59E0B, #EA580C)" },
              ].map((activity, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  }}
                >
                  <div style={{ width: '48px', height: '48px', background: activity.bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <span style={{ fontSize: '24px' }}>{activity.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', color: 'white' }}>{activity.message}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{format(activity.date, "PPP")}</p>
                  </div>
                  <ChevronRight size={20} style={{ color: 'rgba(255,255,255,0.3)' }} />
                </div>
              ))}
            </div>
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
      `}</style>
    </div>
  );
}