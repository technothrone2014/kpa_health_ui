import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Building2, Briefcase, Activity, TrendingUp, Award, Heart, Shield, 
  RefreshCw, ChevronRight, Calendar, ArrowUp, ArrowDown, Sparkles,
  Droplets, Thermometer, Wind, Eye, Gauge, CloudSun, Sun, Moon
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area
} from "recharts";
import { format, subDays } from "date-fns";
import { getDashboardOverview, getEmployeeBloodPressureResults, getEmployeeBMIResults } from "../api/analytics";
import LoadingSpinner from "../components/LoadingSpinner";

// KPA Theme Colors - Enhanced with gradients
const kpaColors = {
  primary: '#0033A0',
  primaryLight: '#1a47b0',
  primaryDark: '#002266',
  secondary: '#0055B8',
  accent: '#00A3E0',
  gold: '#FFD700',
  goldLight: '#FFED4A',
  dark: '#002266',
  light: '#E8F0FE',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  glass: 'rgba(255, 255, 255, 0.95)',
  glassDark: 'rgba(0, 51, 160, 0.95)',
};

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

  const statCards = [
    { title: "Total Employees", value: totalEmployees, formattedValue: formatNumber(totalEmployees), icon: Users, gradient: "from-blue-500 to-indigo-600", description: "Registered employees", trend: "+12%" },
    { title: "Total Dependants", value: totalDependants, formattedValue: formatNumber(totalDependants), icon: Shield, gradient: "from-cyan-500 to-blue-600", description: "Family members", trend: "+5%" },
    { title: "Port Users", value: totalPortUsers, formattedValue: formatNumber(totalPortUsers), icon: Building2, gradient: "from-sky-500 to-blue-500", description: "Active port users", trend: "+3%" },
    { title: "Total Visits", value: overview?.totalVisits || 0, formattedValue: formatNumber(overview?.totalVisits || 0), icon: Activity, gradient: "from-teal-500 to-green-600", description: "Health visits", trend: "+8%" },
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

  // Chart colors for pie charts
  const PIE_COLORS = [kpaColors.primary, kpaColors.secondary, kpaColors.accent, kpaColors.gold, kpaColors.success];
  const BP_PIE_COLORS = [kpaColors.success, kpaColors.warning, kpaColors.danger, '#9B2C2C', '#8B4513'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      
      {/* Animated Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Hero Section with Glossy Effect */}
      <div className="relative mx-6 mt-6 mb-8 overflow-hidden bg-gradient-to-r from-[#0033A0] via-[#0044CC] to-[#0055B8] rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -mr-32 -mt-32 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/20 rounded-full -ml-32 -mb-32 blur-2xl"></div>
        
        <div className="relative px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                  <span className="text-3xl">⚓</span>
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium tracking-wide">{currentTime}</p>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">{greeting}, Captain!</h1>
                </div>
              </div>
              <p className="text-white/80 text-base max-w-2xl leading-relaxed">
                Welcome to your EAP Health Week Intelligence Dashboard. Track employee health metrics, 
                monitor wellness programs, and gain insights into your organization's health status.
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="group flex items-center gap-3 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white font-semibold transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              Refresh Data
            </button>
          </div>
          
          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
            {statCards.map((stat, idx) => (
              <div 
                key={stat.title}
                className="group relative overflow-hidden bg-white/10 backdrop-blur-md rounded-2xl p-5 hover:bg-white/20 transition-all duration-500 hover:scale-105 cursor-pointer border border-white/20"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <stat.icon size={24} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-green-300 bg-green-500/20 px-2 py-1 rounded-lg">{stat.trend}</span>
                  </div>
                  <p className="text-3xl lg:text-4xl font-bold text-white">{stat.formattedValue}</p>
                  <p className="text-white/80 text-sm mt-1 font-medium">{stat.title}</p>
                  <p className="text-white/50 text-xs mt-1">{stat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        
        {/* Health Metrics Overview - Glossy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/80 text-sm font-medium">Normal BP</p>
                  <p className="text-4xl font-bold text-white">{normalBP.toLocaleString()}</p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Heart size={28} className="text-white" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-white/80 text-sm mb-2">
                  <span>of {totalBPReadings.toLocaleString()} readings</span>
                  <span className="font-bold">{((normalBP / totalBPReadings) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${(normalBP / totalBPReadings) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/80 text-sm font-medium">Pre-Hypertension</p>
                  <p className="text-4xl font-bold text-white">{preHypertension.toLocaleString()}</p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Activity size={28} className="text-white" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-white/80 text-sm mb-2">
                  <span>of {totalBPReadings.toLocaleString()} readings</span>
                  <span className="font-bold">{((preHypertension / totalBPReadings) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${(preHypertension / totalBPReadings) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/80 text-sm font-medium">Hypertension</p>
                  <p className="text-4xl font-bold text-white">{hypertensionBP.toLocaleString()}</p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={28} className="text-white" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-white/80 text-sm mb-2">
                  <span>of {totalBPReadings.toLocaleString()} readings</span>
                  <span className="font-bold">{((hypertensionBP / totalBPReadings) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${(hypertensionBP / totalBPReadings) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row - Glossy Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Blood Pressure Distribution */}
          <div className="group bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
            <div className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0033A0] to-[#0055B8] flex items-center justify-center shadow-lg">
                    <Heart size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">Blood Pressure Distribution</h3>
                    <p className="text-sm text-gray-500">Employee BP categories overview</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
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
                        label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                        labelLine={{ strokeWidth: 1, stroke: '#CBD5E1' }}
                      >
                        {bpData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BP_PIE_COLORS[index % BP_PIE_COLORS.length]} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: 'none' }} />
                      <Legend verticalAlign="bottom" height={50} formatter={(value) => <span className="text-sm text-gray-600">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-400">No blood pressure data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Client Categories Distribution */}
          <div className="group bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
            <div className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0033A0] to-[#0055B8] flex items-center justify-center shadow-lg">
                    <Users size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">Client Categories</h3>
                    <p className="text-sm text-gray-500">Distribution by client type</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
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
                        label={({ name, percent }) => `${name}${percent !== undefined ? ` (${(percent * 100).toFixed(0)}%)` : ''}`}
                        labelLine={{ strokeWidth: 1, stroke: '#CBD5E1' }}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: 'none' }} />
                      <Legend verticalAlign="bottom" height={50} formatter={(value) => <span className="text-sm text-gray-600">{value}</span>} />
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
        </div>

        {/* BMI Distribution - Full Width Glossy Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 mb-8">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0033A0] to-[#0055B8] flex items-center justify-center shadow-lg">
                <Activity size={22} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">BMI Distribution</h3>
                <p className="text-sm text-gray-500">Employee BMI categories breakdown</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {bmiData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={bmiData} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
                  <defs>
                    <linearGradient id="bmiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0033A0" />
                      <stop offset="100%" stopColor="#00A3E0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => value.toLocaleString()} />
                  <Tooltip contentStyle={{ borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: 'none' }} />
                  <Bar dataKey="value" fill="url(#bmiGradient)" radius={[8, 8, 0, 0]} label={{ position: 'top', fill: '#0033A0', fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-gray-400">No BMI data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity - Glossy Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0033A0] to-[#0055B8] flex items-center justify-center shadow-lg">
                <Sparkles size={22} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Recent Activity</h3>
                <p className="text-sm text-gray-500">Latest updates from your health data</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { message: "New employee health screening completed", date: subDays(new Date(), 1), icon: "🩺", bg: "from-emerald-500 to-green-500" },
                { message: "Blood pressure data synchronized", date: subDays(new Date(), 2), icon: "❤️", bg: "from-blue-500 to-cyan-500" },
                { message: "BMI records updated for 45 employees", date: subDays(new Date(), 3), icon: "📊", bg: "from-purple-500 to-indigo-500" },
                { message: "Health week report generated", date: subDays(new Date(), 4), icon: "📋", bg: "from-amber-500 to-orange-500" },
              ].map((activity, idx) => (
                <div 
                  key={idx}
                  className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${activity.bg} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-xl">{activity.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 group-hover:text-[#0033A0] transition-colors">{activity.message}</p>
                    <p className="text-sm text-gray-400">{format(activity.date, "PPP 'at' h:mm a")}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-[#0033A0] group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}