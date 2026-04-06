import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Shield, Anchor, Activity, HeartPulse, ActivitySquare, Heart,
  RefreshCw, ChevronRight, Ship, Compass, Navigation, Scale
} from "lucide-react";
import { 
  PieChart, Pie, Cell, BarChart, Bar, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid,
  XAxis,
  YAxis
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

  // ALL STATS IN ONE ARRAY for unified grid
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
    <div className="min-h-screen bg-gradient-to-br from-[#0B2F9E] via-[#1A4D8C] to-[#2B7BA8]" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      
      {/* Ocean Wave Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-10">
        <svg className="absolute bottom-0 w-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path fill="#A8E6CF" fillOpacity="0.5" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,261.3C672,256,768,224,864,208C960,192,1056,192,1152,197.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Hero Section */}
      <div className="relative mx-6 mt-6 mb-8 overflow-hidden rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1C40] via-[#0B2F9E] to-[#1A4D8C]"></div>
        <div className="relative px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-2xl flex items-center justify-center shadow-2xl animate-float">
                  <Ship size={32} className="text-[#0A1C40]" />
                </div>
                <div>
                  <p className="text-[#A8E6CF]/80 text-sm font-medium tracking-wide flex items-center gap-2">
                    <Compass size={14} />
                    {currentTime}
                  </p>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                    {greeting}, Captain! <span className="text-[#FFD700]">⚓</span>
                  </h1>
                </div>
              </div>
              <p className="text-white/80 text-base max-w-2xl leading-relaxed">
                Welcome aboard the EAP Health Week Intelligence Dashboard. Navigate through employee health metrics, 
                monitor wellness programs, and chart your organization's health course.
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="group flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white font-semibold transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl border border-white/20"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        
        {/* UNIFIED 4-COLUMN GRID - All stats evenly distributed */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
          {allStats.map((stat, idx) => (
            <div 
              key={stat.title}
              className="group relative overflow-hidden bg-white/10 backdrop-blur-md rounded-2xl p-5 hover:bg-white/20 transition-all duration-500 hover:scale-105 cursor-pointer border border-white/20"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-white/5 to-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon size={28} className="text-white" />
                  </div>
                  <span className={`text-sm font-semibold px-2 py-1 rounded-lg ${
                    stat.trendUp ? 'text-green-300 bg-green-500/20' : 'text-red-300 bg-red-500/20'
                  }`}>
                    {stat.trend}
                  </span>
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-white">{stat.formattedValue}</p>
                <p className="text-white/80 text-sm mt-1 font-medium">{stat.title}</p>
                <p className="text-white/50 text-xs mt-1">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row - 2 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Blood Pressure Distribution */}
          <div className="group bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border border-white/20">
            <div className="bg-gradient-to-r from-[#0A1C40]/50 to-[#1A4D8C]/50 px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg">
                  <HeartPulse size={22} className="text-[#0A1C40]" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Blood Pressure Distribution</h3>
                  <p className="text-white/70 text-sm">Employee BP categories overview</p>
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
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1, stroke: 'rgba(255,255,255,0.3)' }}
                    >
                      {bpData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: 'white' }} />
                    <Legend verticalAlign="bottom" height={50} formatter={(value) => <span className="text-white/80 text-sm">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-white/50">No blood pressure data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Client Categories */}
          <div className="group bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border border-white/20">
            <div className="bg-gradient-to-r from-[#0A1C40]/50 to-[#1A4D8C]/50 px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg">
                  <Anchor size={22} className="text-[#0A1C40]" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Port Authority Categories</h3>
                  <p className="text-white/70 text-sm">Distribution by client type</p>
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
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1, stroke: 'rgba(255,255,255,0.3)' }}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', background: 'rgba(10,28,64,0.95)', border: '1px solid rgba(255,215,0,0.3)', color: 'white' }} />
                    <Legend verticalAlign="bottom" height={50} formatter={(value) => <span className="text-white/80 text-sm">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-white/50">No category data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BMI Distribution */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 mb-8 border border-white/20">
          <div className="bg-gradient-to-r from-[#0A1C40]/50 to-[#1A4D8C]/50 px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg">
                <Scale size={22} className="text-[#0A1C40]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">BMI Navigation Chart</h3>
                <p className="text-white/70 text-sm">Employee BMI categories breakdown</p>
              </div>
            </div>
          </div>
          <div className="p-6">
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
              <div className="h-80 flex items-center justify-center">
                <p className="text-white/50">No BMI data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Ship's Log */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 border border-white/20">
          <div className="bg-gradient-to-r from-[#0A1C40]/50 to-[#1A4D8C]/50 px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg">
                <Navigation size={22} className="text-[#0A1C40]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Ship's Log</h3>
                <p className="text-white/70 text-sm">Latest voyages in health data</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { message: "New crew member health screening completed", date: subDays(new Date(), 1), icon: "🩺", bg: "from-emerald-500 to-green-500" },
                { message: "Blood pressure data synchronized with port authority", date: subDays(new Date(), 2), icon: "❤️", bg: "from-blue-500 to-cyan-500" },
                { message: "BMI records updated for 45 employees", date: subDays(new Date(), 3), icon: "📊", bg: "from-purple-500 to-indigo-500" },
                { message: "Health week report generated for command", date: subDays(new Date(), 4), icon: "📋", bg: "from-amber-500 to-orange-500" },
              ].map((activity, idx) => (
                <div 
                  key={idx}
                  className="group flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10 hover:border-white/20"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${activity.bg} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-xl">{activity.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white group-hover:text-[#FFD700] transition-colors line-clamp-1">{activity.message}</p>
                    <p className="text-sm text-white/50">{format(activity.date, "PPP")}</p>
                  </div>
                  <ChevronRight size={20} className="text-white/30 group-hover:text-[#FFD700] group-hover:translate-x-1 transition-all flex-shrink-0" />
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
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-spin { animation: spin 1s linear infinite; }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}