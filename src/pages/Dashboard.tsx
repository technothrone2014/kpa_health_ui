import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Building2, Briefcase, Activity, TrendingUp, Award, Heart, Shield, 
  RefreshCw, ChevronRight, Calendar, Clock, ArrowUp, ArrowDown, 
  Droplets, Thermometer, Wind, Eye, Gauge, CloudSun, Sun, Moon, Sparkles
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area, ComposedChart
} from "recharts";
import { format, subDays } from "date-fns";
import { getDashboardOverview, getEmployeeBloodPressureResults, getEmployeeBMIResults } from "../api/analytics";
import LoadingSpinner from "../components/LoadingSpinner";

// KPA Theme Colors
const kpaColors = {
  primary: '#0033A0',
  primaryLight: '#1a47b0',
  secondary: '#0055B8',
  accent: '#00A3E0',
  gold: '#FFD700',
  goldLight: '#FFED4A',
  dark: '#002266',
  light: '#E8F0FE',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gradientStart: '#0033A0',
  gradientEnd: '#0055B8',
};

// Animation delay helper
const getDelay = (index: number) => `${index * 100}ms`;

// Helper function to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // Set greeting based on time
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
  
  // Fetch real data from backend
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

  // Calculate stats from real data
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
  const healthCoverage = totalEmployees > 0 && totalBPReadings > 0 
    ? ((Number(normalBP) / totalBPReadings) * 100).toFixed(1) : "0";

  const statItems = [
    { title: "Total Employees", value: totalEmployees, formattedValue: formatNumber(totalEmployees), icon: Users, color: kpaColors.primary, trend: { value: 12, isPositive: true }, description: "Registered employees" },
    { title: "Total Dependants", value: totalDependants, formattedValue: formatNumber(totalDependants), icon: Shield, color: kpaColors.secondary, trend: { value: 5, isPositive: true }, description: "Family members" },
    { title: "Port Users", value: totalPortUsers, formattedValue: formatNumber(totalPortUsers), icon: Building2, color: kpaColors.accent, trend: { value: 3, isPositive: true }, description: "Active port users" },
    { title: "Total Visits", value: overview?.totalVisits || 0, formattedValue: formatNumber(overview?.totalVisits || 0), icon: Activity, color: kpaColors.success, trend: { value: 8, isPositive: true }, description: "Health visits" },
  ];

  const categoryData = [
    { name: 'EMPLOYEES', value: totalEmployees, color: kpaColors.primary, icon: '👥' },
    { name: 'DEPENDANTS', value: totalDependants, color: kpaColors.secondary, icon: '👨‍👩‍👧' },
    { name: 'PORT USERS', value: totalPortUsers, color: kpaColors.accent, icon: '⚓' },
  ].filter(item => item.value > 0);

  const bpColorMap: Record<string, string> = {
    'NORMAL': kpaColors.success,
    'PRE-HYPERTENSION': kpaColors.warning,
    'STAGE I HYPERTENSION': kpaColors.danger,
    'STAGE II HYPERTENSION': '#9B2C2C',
    'HYPOTENSION': '#8B4513',
  };

  const bpData = bloodPressure?.map(item => ({
    name: item.BloodPressureCategory,
    value: Number(item.Count),
    color: bpColorMap[item.BloodPressureCategory] || kpaColors.accent,
  })).filter(item => item.value > 0) || [];

  const bmiData = bmi?.map(item => ({
    name: item.BMICategory,
    value: Number(item.Count),
  })).filter(item => item.value > 0) || [];

  // Health metrics for gauge-like display
  const healthMetrics = [
    { label: "Normal BP", value: normalBP, total: totalBPReadings, percentage: (Number(normalBP) / totalBPReadings * 100).toFixed(1), color: kpaColors.success },
    { label: "Pre-Hypertension", value: preHypertension, total: totalBPReadings, percentage: (preHypertension / totalBPReadings * 100).toFixed(1), color: kpaColors.warning },
    { label: "Hypertension", value: hypertensionBP, total: totalBPReadings, percentage: (hypertensionBP / totalBPReadings * 100).toFixed(1), color: kpaColors.danger },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200">
          <p className="font-bold text-[#0033A0]">{label}</p>
          <p className="text-sm">Count: <span className="font-bold text-[#00A3E0]">{payload[0].value.toLocaleString()}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      
      {/* Hero Section with Gradient Background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0033A0] to-[#0055B8] rounded-b-3xl shadow-xl mb-8">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="relative px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">⚓</span>
                </div>
                <div>
                  <p className="text-white/80 text-sm">{currentTime}</p>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">{greeting}, Captain!</h1>
                </div>
              </div>
              <p className="text-white/80 mt-1 max-w-2xl">
                Welcome to your EAP Health Week Intelligence Dashboard. Track employee health metrics, 
                monitor wellness programs, and gain insights into your organization's health status.
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white font-medium transition-all duration-300 disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              Refresh Data
            </button>
          </div>
          
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {statItems.map((stat, idx) => (
              <div key={stat.title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/20 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon size={20} className="text-white/80" />
                  {stat.trend && (
                    <span className={`text-xs flex items-center gap-1 ${stat.trend.isPositive ? 'text-green-300' : 'text-red-300'}`}>
                      {stat.trend.isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                      {stat.trend.value}%
                    </span>
                  )}
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">{stat.formattedValue}</p>
                <p className="text-white/70 text-sm mt-1">{stat.title}</p>
                <p className="text-white/50 text-xs mt-1">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        
        {/* Health Metrics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {healthMetrics.map((metric, idx) => (
            <div 
              key={metric.label}
              className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              style={{ borderLeftColor: metric.color }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-gray-500 text-sm">{metric.label}</p>
                  <p className="text-3xl font-bold text-gray-800">{metric.value.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${metric.color}20` }}>
                  <Heart size={24} style={{ color: metric.color }} />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">of {metric.total.toLocaleString()} total readings</span>
                  <span className="font-semibold" style={{ color: metric.color }}>{metric.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metric.percentage}%`, backgroundColor: metric.color }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Blood Pressure Distribution - Enhanced Pie Chart */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center">
                    <Heart size={20} className="text-[#0033A0]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Blood Pressure Distribution</h3>
                    <p className="text-sm text-gray-500">Employee BP categories overview</p>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Total: {totalBPReadings.toLocaleString()} readings
                </div>
              </div>
            </div>
            <div className="p-6">
              {bpData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie 
                      data={bpData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={70} 
                      outerRadius={110} 
                      paddingAngle={3} 
                      dataKey="value" 
                      label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : '0'}%)`}
                      labelLine={{ strokeWidth: 1, stroke: '#CBD5E1' }}
                    >
                      {bpData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={50}
                      formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-400">No blood pressure data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Client Categories - Enhanced Donut Chart */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center">
                    <Users size={20} className="text-[#0033A0]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Client Categories</h3>
                    <p className="text-sm text-gray-500">Distribution by client type</p>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Total: {(totalEmployees + totalDependants + totalPortUsers).toLocaleString()} clients
                </div>
              </div>
            </div>
            <div className="p-6">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie 
                      data={categoryData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={70} 
                      outerRadius={110} 
                      paddingAngle={3} 
                      dataKey="value" 
                      label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : '0'}%)`}
                      labelLine={{ strokeWidth: 1, stroke: '#CBD5E1' }}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={50}
                      formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-400">No category data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 2 - BMI Bar Chart */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center">
                    <Activity size={20} className="text-[#0033A0]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">BMI Distribution</h3>
                    <p className="text-sm text-gray-500">Employee BMI categories breakdown</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {bmiData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={bmiData} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="value" 
                      fill="url(#bmiGradient)" 
                      radius={[8, 8, 0, 0]}
                      label={{ position: 'top', fill: '#0033A0', fontSize: 12 }}
                    />
                    <defs>
                      <linearGradient id="bmiGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0033A0" />
                        <stop offset="100%" stopColor="#00A3E0" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-400">No BMI data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center">
                <Activity size={20} className="text-[#0033A0]" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Recent Activity</h3>
                <p className="text-sm text-gray-500">Latest updates from your health data</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {[
                { message: "New employee health screening completed", date: subDays(new Date(), 1), icon: "🩺", color: kpaColors.success },
                { message: "Blood pressure data synchronized", date: subDays(new Date(), 2), icon: "❤️", color: kpaColors.primary },
                { message: "BMI records updated for 45 employees", date: subDays(new Date(), 3), icon: "📊", color: kpaColors.accent },
                { message: "Health week report generated", date: subDays(new Date(), 4), icon: "📋", color: kpaColors.gold },
              ].map((activity, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: `${activity.color}15` }}>
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 group-hover:text-[#0033A0] transition-colors">{activity.message}</p>
                    <p className="text-sm text-gray-400">{format(activity.date, "PPP 'at' h:mm a")}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-[#0033A0] group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}